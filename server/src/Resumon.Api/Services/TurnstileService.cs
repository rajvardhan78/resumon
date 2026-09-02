using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Resumon.Api.Options;

namespace Resumon.Api.Services;

/// <summary>Verifies Cloudflare Turnstile tokens.</summary>
public interface ITurnstileService
{
    Task<bool> VerifyAsync(string? token, string? remoteIp, CancellationToken cancellationToken = default);
}

public sealed class TurnstileService(
    HttpClient httpClient,
    IOptions<TurnstileOptions> options,
    ILogger<TurnstileService> logger) : ITurnstileService
{
    private readonly TurnstileOptions _settings = options.Value;

    public async Task<bool> VerifyAsync(string? token, string? remoteIp, CancellationToken cancellationToken)
    {
        if (!_settings.IsConfigured)
        {
            // Dev mode fallback.
            return true;
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        try
        {
            var content = new FormUrlEncodedContent([
                new KeyValuePair<string, string>("secret", _settings.SecretKey),
                new KeyValuePair<string, string>("response", token),
                new KeyValuePair<string, string>("remoteip", remoteIp ?? string.Empty)
            ]);

            var response = await httpClient.PostAsync(_settings.VerifyUrl, content, cancellationToken);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<TurnstileResponse>(cancellationToken: cancellationToken);
            return result?.Success ?? false;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to verify Turnstile token.");
            return false;
        }
    }

    private sealed class TurnstileResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }
    }
}
