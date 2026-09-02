using System.Text.RegularExpressions;

namespace Resumon.Api.Services.Evaluation;

/// <summary>
/// Text primitives shared by the four scoring dimensions — the C# equivalents of the helper
/// functions at the top of the original <c>api/evaluate.js</c>.
/// </summary>
/// <remarks>
/// The regular expressions are kept character-for-character identical to the JavaScript
/// originals so the scores stay comparable. Source-generated regexes mean they are compiled
/// once at build time rather than on first use.
/// </remarks>
public static partial class TextHeuristics
{
    /// <summary>
    /// JavaScript's <c>Math.round</c> rounds halves up; .NET's <c>Math.Round</c> rounds to even.
    /// Every score in this engine goes through here so a value that landed on <c>x.5</c> in the
    /// Node implementation lands on the same integer now.
    /// </summary>
    public static int JsRound(double value) => (int)Math.Floor(value + 0.5);

    /// <summary>Rounds then clamps, in that order — same as the original <c>clamp()</c>.</summary>
    public static int Clamp(double value, int min = 0, int max = 100)
        => Math.Min(max, Math.Max(min, JsRound(value)));

    /// <summary>
    /// Lowercases and strips punctuation the keyword banks never contain, keeping the few
    /// characters that are part of real skill names (<c>.</c> <c>#</c> <c>+</c> <c>/</c> <c>-</c>).
    /// </summary>
    public static string Normalize(string text)
        => NonKeywordCharacters().Replace(text.ToLowerInvariant(), " ");

    /// <summary>Returns the entries of <paramref name="candidates"/> present in the text.</summary>
    public static List<string> FindMatches(string normalizedText, IReadOnlyList<string> candidates)
        => [.. candidates.Where(c => normalizedText.Contains(c, StringComparison.Ordinal))];

    public static int CountWords(string text)
        => text.Trim().Length == 0 ? 0 : WhitespaceRun().Split(text.Trim()).Count(w => w.Length > 0);

    /// <summary>Counts lines that open with a bullet glyph — a proxy for a scannable layout.</summary>
    public static int CountBullets(string text) => BulletLine().Count(text);

    /// <summary>
    /// Distinct numeric-impact phrases ("40%", "3x", "$1.2M", "10k users"). Duplicates are
    /// collapsed in first-seen order, matching <c>[...new Set(matches)]</c>.
    /// </summary>
    public static List<string> FindQuantifiedAchievements(string text) => DistinctMatches(text, QuantifiedPatterns);

    /// <summary>Distinct employment-period phrases ("Jan 2021 – Present", "2020 – 2023").</summary>
    public static List<string> FindDateRanges(string text) => DistinctMatches(text, DateRangePatterns);

    private static List<string> DistinctMatches(string text, IReadOnlyList<Regex> patterns)
    {
        var ordered = new List<string>();
        var seen = new HashSet<string>(StringComparer.Ordinal);

        foreach (var pattern in patterns)
        {
            foreach (var match in pattern.EnumerateMatches(text))
            {
                var value = text.Substring(match.Index, match.Length);
                if (seen.Add(value))
                {
                    ordered.Add(value);
                }
            }
        }

        return ordered;
    }

    private static readonly Regex[] QuantifiedPatterns =
    [
        Percentage(), Multiplier(), DollarAmount(), UserCount(), Throughput(),
        ReducedBy(), IncreasedBy(), ImprovedBy(), SavedAmount(), Latency(),
        RepositoryStats(), ProjectCounts(), MagnitudeSuffix(), TopPercentile(), AwardCount(),
    ];

    private static readonly Regex[] DateRangePatterns = [MonthYearRange(), YearRange(), SeasonYear()];

    // ─── Generated patterns ────────────────────────────────────────────────────

    [GeneratedRegex(@"[^a-z0-9\s.#+/-]")]
    private static partial Regex NonKeywordCharacters();

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespaceRun();

    [GeneratedRegex(@"^[\s]*[•\-–—*▸▹►✓✔✗→]\s+.+", RegexOptions.Multiline)]
    private static partial Regex BulletLine();

    // Quantified achievements, in the original pattern order.

    [GeneratedRegex(@"\d+\s*%")]
    private static partial Regex Percentage();

    [GeneratedRegex(@"\d+x\b", RegexOptions.IgnoreCase)]
    private static partial Regex Multiplier();

    [GeneratedRegex(@"\$\s*\d[\d,.]*")]
    private static partial Regex DollarAmount();

    [GeneratedRegex(@"\d+[\d,]*\s*(users?|customers?|clients?)\b", RegexOptions.IgnoreCase)]
    private static partial Regex UserCount();

    [GeneratedRegex(@"\d+[\d,]*\s*(requests?|transactions?|calls?)\s*(per|/)\s*(sec|min|hour|day)", RegexOptions.IgnoreCase)]
    private static partial Regex Throughput();

    [GeneratedRegex(@"reduced\s+by\s+\d+", RegexOptions.IgnoreCase)]
    private static partial Regex ReducedBy();

    [GeneratedRegex(@"increased\s+by\s+\d+", RegexOptions.IgnoreCase)]
    private static partial Regex IncreasedBy();

    [GeneratedRegex(@"improved\s+by\s+\d+", RegexOptions.IgnoreCase)]
    private static partial Regex ImprovedBy();

    [GeneratedRegex(@"saved\s+\$?\d+", RegexOptions.IgnoreCase)]
    private static partial Regex SavedAmount();

    [GeneratedRegex(@"\d+\s*(ms|milliseconds?|seconds?)\s*(latency|response|faster)", RegexOptions.IgnoreCase)]
    private static partial Regex Latency();

    [GeneratedRegex(@"\d+[\d,]*\s*(stars?|forks?|downloads?|installs?)\b", RegexOptions.IgnoreCase)]
    private static partial Regex RepositoryStats();

    [GeneratedRegex(@"\d+[\d,]*\s*(repos?|repositories|projects?|apps?)\b", RegexOptions.IgnoreCase)]
    private static partial Regex ProjectCounts();

    [GeneratedRegex(@"\d+[\d,]*\s*[kmb]\b", RegexOptions.IgnoreCase)]
    private static partial Regex MagnitudeSuffix();

    [GeneratedRegex(@"top\s+\d+\s*%", RegexOptions.IgnoreCase)]
    private static partial Regex TopPercentile();

    [GeneratedRegex(@"\d+\s*(?:award|prize|scholarship|honor)", RegexOptions.IgnoreCase)]
    private static partial Regex AwardCount();

    // Employment periods.

    [GeneratedRegex(@"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}\s*[-–—]\s*(present|current|now|\d{4})", RegexOptions.IgnoreCase)]
    private static partial Regex MonthYearRange();

    [GeneratedRegex(@"\b\d{4}\s*[-–—]\s*(present|current|now|\d{4})\b", RegexOptions.IgnoreCase)]
    private static partial Regex YearRange();

    [GeneratedRegex(@"\b(summer|fall|spring|winter)\s+\d{4}\b", RegexOptions.IgnoreCase)]
    private static partial Regex SeasonYear();

    // ─── Single-shot signals used by individual dimensions ─────────────────────

    [GeneratedRegex(@"(\d+)\+?\s*years?\s*(of\s*)?(professional\s*)?(experience|exp|work)", RegexOptions.IgnoreCase)]
    public static partial Regex YearsOfExperience();

    [GeneratedRegex(@"\bprojects?\b", RegexOptions.IgnoreCase)]
    public static partial Regex ProjectMention();

    [GeneratedRegex(@"\b(b\.?s\.?|b\.?e\.?|b\.?tech|bachelor|master|m\.?s\.?|m\.?e\.?|phd|ph\.d|mba|degree|university|college|institute)\b", RegexOptions.IgnoreCase)]
    public static partial Regex EducationSignal();

    [GeneratedRegex(@"github\.com/[a-z0-9_-]+", RegexOptions.IgnoreCase)]
    public static partial Regex GitHubProfile();

    [GeneratedRegex(@"github\.com", RegexOptions.IgnoreCase)]
    public static partial Regex GitHubMention();

    [GeneratedRegex(@"https?://(www\.)?[a-z0-9-]+\.[a-z]{2,}", RegexOptions.IgnoreCase)]
    public static partial Regex WebsiteLink();

    [GeneratedRegex(@"\b(publication|research paper|arxiv|ieee|acm|journal|conference|presented at)\b", RegexOptions.IgnoreCase)]
    public static partial Regex PublicationSignal();

    [GeneratedRegex(@"\b(award|prize|honor|honour|recognition|scholarship|fellowship|grant|nominated|nominee|won|winner)\b", RegexOptions.IgnoreCase)]
    public static partial Regex AwardSignal();

    [GeneratedRegex(@"\b(volunteer|community|mentor|teach|coach|nonprofit|non-profit|club|society|organiz)\b", RegexOptions.IgnoreCase)]
    public static partial Regex CommunitySignal();
}
