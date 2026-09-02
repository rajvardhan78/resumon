using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Resumon.Api.Contracts.Analysis;
using Resumon.Api.Services.Scans;

namespace Resumon.Api.Controllers;

/// <summary>
/// Scan history and aggregates. Routes keep the paths the React pages already call
/// (<c>/api/history</c>, <c>/api/stats</c>); the <c>userId</c> query parameter they used to send is
/// gone — the token decides whose rows come back.
/// </summary>
[Authorize]
public sealed class ScansController(IScanRepository scans) : ApiControllerBase
{
    /// <summary>Most recent scans, newest first.</summary>
    [HttpGet("/api/history")]
    [ProducesResponseType<HistoryResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<HistoryResponse>> History(
        [FromQuery] int? limit,
        CancellationToken cancellationToken)
    {
        if (CurrentUserId is not { } userId)
        {
            return MissingSubject();
        }

        var items = await scans.GetHistoryAsync(
            userId,
            limit ?? ScanRepository.DefaultHistoryLimit,
            cancellationToken);

        return Ok(new HistoryResponse(items));
    }

    /// <summary>Totals for the dashboard tiles. Returns zeroes rather than 404 for a new account.</summary>
    [HttpGet("/api/stats")]
    [ProducesResponseType<StatsResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<StatsResponse>> Stats(CancellationToken cancellationToken)
    {
        if (CurrentUserId is not { } userId)
        {
            return MissingSubject();
        }

        return Ok(new StatsResponse(await scans.GetStatsAsync(userId, cancellationToken)));
    }

    /// <summary>
    /// The full analysis from the latest scan. Lets the results page survive a refresh, which the
    /// Node version could not do — it kept the payload in memory only.
    /// </summary>
    [HttpGet("/api/scans/latest")]
    [ProducesResponseType<AnalyzeResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AnalyzeResponse>> Latest(CancellationToken cancellationToken)
    {
        if (CurrentUserId is not { } userId)
        {
            return MissingSubject();
        }

        var scan = await scans.GetLatestAsync(userId, cancellationToken);

        // Rows written by the legacy API stored only the flat scores, so Analysis can be null.
        if (scan?.Analysis is null)
        {
            return NotFound(new ErrorResponse("No scan found yet."));
        }

        return Ok(new AnalyzeResponse(scan.Analysis, null));
    }
}
