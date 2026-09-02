using Microsoft.Extensions.Options;
using Resumon.Api.Contracts.Analysis;
using Resumon.Api.Domain;
using Resumon.Api.Options;
using Resumon.Api.Services.Evaluation;
using Resumon.Api.Services.Gemini;
using Resumon.Api.Services.Scans;

namespace Resumon.Api.Services;

/// <summary>Turns an uploaded PDF into a persisted, scored analysis.</summary>
public interface IResumeAnalysisService
{
    /// <exception cref="ResumeProcessingException">
    /// The PDF is unreadable or holds too little text to score.
    /// </exception>
    Task<AnalyzeResult> AnalyzeAsync(
        string userId,
        string fileName,
        byte[] content,
        CancellationToken cancellationToken);
}

/// <param name="Analysis">The scores shown to the user.</param>
/// <param name="UsedFallback">True when Gemini was unavailable and the local engine scored it.</param>
public sealed record AnalyzeResult(ResumeAnalysis Analysis, bool UsedFallback);

/// <summary>
/// Extract → Gemini → local fallback → persist.
/// <para>
/// Two behaviours are inherited deliberately from the Node implementation: a Gemini failure is
/// never surfaced to the caller (the in-house engine answers instead), and a failed database
/// write is logged rather than returned, because losing a history row is not worth failing a scan
/// the user is waiting on.
/// </para>
/// </summary>
public sealed class ResumeAnalysisService(
    IPdfTextExtractor extractor,
    IAiResumeAnalyzer aiAnalyzer,
    IResumeEvaluator localEvaluator,
    IScanRepository scans,
    IOptions<UploadOptions> uploadOptions,
    TimeProvider timeProvider,
    ILogger<ResumeAnalysisService> logger) : IResumeAnalysisService
{
    private readonly UploadOptions _upload = uploadOptions.Value;

    public async Task<AnalyzeResult> AnalyzeAsync(
        string userId,
        string fileName,
        byte[] content,
        CancellationToken cancellationToken)
    {
        var resumeText = extractor.Extract(content);

        if (resumeText.Trim().Length < _upload.MinimumTextLength)
        {
            throw new ResumeProcessingException("Could not extract readable text from the PDF.");
        }

        var analysis = await aiAnalyzer.AnalyzeAsync(resumeText, cancellationToken);
        var usedFallback = analysis is null;

        analysis ??= localEvaluator.Evaluate(resumeText);

        var scannedAt = timeProvider.GetUtcNow().UtcDateTime;
        var stored = await scans.AddAsync(
            ScanDocument.FromAnalysis(userId, fileName, analysis, scannedAt),
            cancellationToken);

        logger.LogInformation(
            "Scored {FileName} for user {UserId}: {Score}/100 via {Source} (persisted={Persisted}).",
            fileName,
            userId,
            analysis.OverallScore,
            analysis.Source,
            stored);

        return new AnalyzeResult(analysis, usedFallback);
    }
}
