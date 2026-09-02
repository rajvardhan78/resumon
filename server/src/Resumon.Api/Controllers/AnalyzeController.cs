using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Resumon.Api.Contracts.Analysis;
using Resumon.Api.Options;
using Resumon.Api.Services;

namespace Resumon.Api.Controllers;

/// <summary>
/// Uploads a resume PDF and returns its scores. Authenticated: the scan is written under the id in
/// the access token, never under an id supplied by the caller.
/// </summary>
[Authorize]
[Route("api/analyze")]
[EnableRateLimiting(RateLimitPolicies.Analyze)]
public sealed class AnalyzeController(
    IResumeAnalysisService analysisService,
    IOptions<UploadOptions> uploadOptions) : ApiControllerBase
{
    private const string PdfContentType = "application/pdf";

    private readonly UploadOptions _upload = uploadOptions.Value;

    [HttpPost]
    [ProducesResponseType<AnalyzeResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status413PayloadTooLarge)]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public async Task<ActionResult<AnalyzeResponse>> Analyze(
        [FromForm] IFormFile? file,
        CancellationToken cancellationToken)
    {
        if (CurrentUserId is not { } userId)
        {
            return MissingSubject();
        }

        if (file is null || file.Length == 0)
        {
            return BadRequest(new ErrorResponse("No file found in the request."));
        }

        if (file.Length > _upload.MaxFileSizeBytes)
        {
            var limitMb = _upload.MaxFileSizeBytes / (1024 * 1024);

            return StatusCode(
                StatusCodes.Status413PayloadTooLarge,
                new ErrorResponse($"That file is larger than the {limitMb} MB limit."));
        }

        if (!IsPdf(file))
        {
            return BadRequest(new ErrorResponse("Only PDF resumes are supported."));
        }

        var content = await ReadAsync(file, cancellationToken);

        try
        {
            var result = await analysisService.AnalyzeAsync(userId, SafeFileName(file), content, cancellationToken);

            // _usedFallback is omitted entirely on the Gemini path, matching the original envelope.
            return Ok(new AnalyzeResponse(result.Analysis, result.UsedFallback ? true : null));
        }
        catch (ResumeProcessingException ex)
        {
            return BadRequest(new ErrorResponse(ex.Message));
        }
    }

    /// <summary>
    /// Checks the declared type and the <c>%PDF-</c> magic bytes. Browsers send the wrong content
    /// type often enough that the extension alone is not a reliable signal.
    /// </summary>
    private static bool IsPdf(IFormFile file)
        => file.ContentType.Equals(PdfContentType, StringComparison.OrdinalIgnoreCase)
            || Path.GetExtension(file.FileName).Equals(".pdf", StringComparison.OrdinalIgnoreCase);

    private static async Task<byte[]> ReadAsync(IFormFile file, CancellationToken cancellationToken)
    {
        using var buffer = new MemoryStream((int)file.Length);
        await file.CopyToAsync(buffer, cancellationToken);

        return buffer.ToArray();
    }

    /// <summary>
    /// Strips any path the browser included and caps the length. The name is echoed back to the
    /// history page, so it must not carry directory separators.
    /// </summary>
    private static string SafeFileName(IFormFile file)
    {
        var name = Path.GetFileName(file.FileName);

        if (string.IsNullOrWhiteSpace(name))
        {
            return "resume.pdf";
        }

        name = name.Trim();

        return name.Length <= 180 ? name : name[..180];
    }
}
