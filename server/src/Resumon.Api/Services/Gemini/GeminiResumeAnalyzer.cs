using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Resumon.Api.Contracts.Analysis;
using Resumon.Api.Options;

namespace Resumon.Api.Services.Gemini;

/// <summary>Scores a resume with a large language model.</summary>
public interface IAiResumeAnalyzer
{
    /// <summary>
    /// Returns the model's analysis, or <c>null</c> when Gemini is unconfigured, unreachable or
    /// answers with something unusable. Never throws for an upstream failure: the caller is
    /// expected to fall back to the in-house engine, exactly as the Node version did.
    /// </summary>
    Task<ResumeAnalysis?> AnalyzeAsync(string resumeText, CancellationToken cancellationToken);
}

/// <summary>
/// Google AI Studio (Generative Language API) client built on <see cref="HttpClient"/> rather than
/// the Google SDK: one POST, a pinned response schema, and no extra dependency to keep patched.
/// </summary>
public sealed class GeminiResumeAnalyzer(
    HttpClient httpClient,
    IOptions<GeminiOptions> options,
    ILogger<GeminiResumeAnalyzer> logger) : IAiResumeAnalyzer
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly GeminiOptions _options = options.Value;

    public async Task<ResumeAnalysis?> AnalyzeAsync(string resumeText, CancellationToken cancellationToken)
    {
        if (!_options.IsConfigured)
        {
            logger.LogDebug("Gemini API key not configured; using the local scoring engine.");
            return null;
        }

        try
        {
            return await SendAsync(resumeText, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // The client hung up. Let the request pipeline unwind instead of scoring locally.
            throw;
        }
        catch (Exception ex)
        {
            // Matches the original behaviour: log the Gemini failure, don't surface it.
            logger.LogWarning(ex, "Gemini analysis failed; falling back to the local scoring engine.");
            return null;
        }
    }

    private async Task<ResumeAnalysis?> SendAsync(string resumeText, CancellationToken cancellationToken)
    {
        var prompt = GeminiPrompt.Build(Truncate(resumeText));
        var request = GeminiMessages.ForPrompt(prompt, _options.Temperature);
        var path = $"models/{_options.Model}:generateContent";

        using var response = await PostWithRetryAsync(path, request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            logger.LogWarning(
                "Gemini returned {StatusCode} for model {Model}: {Body}",
                (int)response.StatusCode,
                _options.Model,
                Excerpt(body));

            return null;
        }

        var payload = await response.Content.ReadFromJsonAsync<GeminiResponse>(SerializerOptions, cancellationToken);
        var json = payload?.Text();

        if (json is null)
        {
            logger.LogWarning("Gemini returned no usable candidate ({Diagnosis}).", payload?.Diagnose() ?? "empty body");
            return null;
        }

        var analysis = JsonSerializer.Deserialize<ResumeAnalysis>(json, SerializerOptions);

        if (analysis is null || !IsUsable(analysis))
        {
            logger.LogWarning("Gemini returned a response that did not satisfy the analysis schema.");
            return null;
        }

        Sanitize(analysis);
        analysis.Source = AnalysisSource.Gemini;

        return analysis;
    }

    /// <summary>
    /// One retry on the transient statuses AI Studio actually returns under load (429/503) and on
    /// 5xx. Without it a single busy moment would silently downgrade every scan to the local engine.
    /// </summary>
    private async Task<HttpResponseMessage> PostWithRetryAsync(
        string path,
        GeminiRequest request,
        CancellationToken cancellationToken)
    {
        HttpResponseMessage? response = null;

        for (var attempt = 1; ; attempt++)
        {
            response?.Dispose();
            response = await httpClient.PostAsJsonAsync(path, request, SerializerOptions, cancellationToken);

            if (attempt == 2 || !IsTransient(response.StatusCode))
            {
                return response;
            }

            logger.LogDebug("Gemini returned {StatusCode}; retrying once.", (int)response.StatusCode);

            await Task.Delay(TimeSpan.FromMilliseconds(750), cancellationToken);
        }
    }

    private static bool IsTransient(HttpStatusCode status)
        => status is HttpStatusCode.TooManyRequests or HttpStatusCode.RequestTimeout || (int)status >= 500;

    private string Truncate(string resumeText)
        => resumeText.Length <= _options.MaxResumeCharacters
            ? resumeText
            : resumeText[.._options.MaxResumeCharacters];

    /// <summary>The minimum the results page needs to render without blanks.</summary>
    private static bool IsUsable(ResumeAnalysis analysis)
        => !string.IsNullOrWhiteSpace(analysis.Summary)
            && analysis.TopStrengths.Count > 0
            && analysis.Improvements.Count > 0
            && analysis.Scores.InOrder().All(d => !string.IsNullOrWhiteSpace(d.Value.Feedback));

    /// <summary>
    /// Clamps anything the model got creative with. The schema pins types, not ranges, so a
    /// stray 105 would otherwise reach the progress rings in the UI.
    /// </summary>
    private static void Sanitize(ResumeAnalysis analysis)
    {
        analysis.OverallScore = Math.Clamp(analysis.OverallScore, 0, 100);
        analysis.TopStrengths = Trim(analysis.TopStrengths);
        analysis.Improvements = Trim(analysis.Improvements);

        foreach (var (_, dimension) in analysis.Scores.InOrder())
        {
            dimension.Score = Math.Clamp(dimension.Score, 0, 100);
            dimension.Highlights = Trim(dimension.Highlights);
        }
    }

    private static List<string> Trim(List<string> values)
        => [.. values.Where(v => !string.IsNullOrWhiteSpace(v)).Select(v => v.Trim()).Take(3)];

    private static string Excerpt(string body)
        => body.Length <= 500 ? body : body[..500];
}
