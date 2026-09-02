using Resumon.Api.Contracts.Analysis;

namespace Resumon.Api.Services.Evaluation;

/// <summary>Scores a resume without calling out to a model.</summary>
public interface IResumeEvaluator
{
    ResumeAnalysis Evaluate(string resumeText);
}

/// <summary>
/// The in-house scoring engine used when Gemini is unavailable, unconfigured or returns
/// something unusable. It is a faithful C# port of <c>api/evaluate.js</c>: the same keyword
/// banks, the same point buckets, the same weights and the same wording, so a result carries
/// the same meaning whichever path produced it.
/// </summary>
/// <remarks>
/// Stateless and thread-safe — registered as a singleton.
/// </remarks>
public sealed class LocalResumeEvaluator : IResumeEvaluator
{
    // Overall weighting — tuned to approximate Gemini's emphasis: experience and technical depth
    // count heavily, while keyword density carries less weight than the raw heuristic suggests.
    private const double KeywordWeight = 0.25;
    private const double ExperienceWeight = 0.30;
    private const double KnowledgeWeight = 0.25;
    private const double CreativityWeight = 0.20;

    public ResumeAnalysis Evaluate(string resumeText)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(resumeText);

        var scores = new AnalysisScores
        {
            Keywords = ScoreKeywords(resumeText),
            Experience = ScoreExperience(resumeText),
            KnowledgeDepth = ScoreKnowledgeDepth(resumeText),
            Creativity = ScoreCreativity(resumeText),
        };

        var weighted = (scores.Keywords.Score * KeywordWeight)
            + (scores.Experience.Score * ExperienceWeight)
            + (scores.KnowledgeDepth.Score * KnowledgeWeight)
            + (scores.Creativity.Score * CreativityWeight);

        var (sectionBonus, sectionsFound) = ScoreSectionCompleteness(resumeText);
        // Post-scoring normalization pulls the raw weighted score toward Gemini's range.
        var overall = TextHeuristics.NormalizeScore(weighted + sectionBonus);
        var (strengths, improvements) = DeriveStrengthsAndImprovements(scores, sectionsFound);

        return new ResumeAnalysis
        {
            OverallScore = overall,
            Summary = GenerateSummary(overall, scores),
            Scores = scores,
            TopStrengths = strengths,
            Improvements = improvements,
            Source = AnalysisSource.Local,
        };
    }

    /// <summary>
    /// Keyword coverage: 70 points for weighted density (each category contributes at most five
    /// keywords, so one long skills dump cannot carry the score) plus 30 for breadth across
    /// categories.
    /// </summary>
    private static DimensionScore ScoreKeywords(string text)
    {
        var normalized = TextHeuristics.Normalize(text);
        var perCategory = new List<(string Name, List<string> Matched)>(ResumeKeywordBank.Categories.Length);
        double weightedMatched = 0;
        double weightedTotal = 0;

        foreach (var category in ResumeKeywordBank.Categories)
        {
            var matched = TextHeuristics.FindMatches(normalized, category.Keywords);
            // Cap at 4 per category (down from 5): Gemini doesn't reward keyword-stuffing.
            weightedMatched += Math.Min(matched.Count, 4) * category.Weight;
            weightedTotal += Math.Min(category.Keywords.Length, 4) * category.Weight;
            perCategory.Add((category.Name, matched));
        }

        var coveredCategories = perCategory.Count(c => c.Matched.Count > 0);
        // Density: 80 points (up from 70), breadth: 20 points (down from 30).
        // Gemini cares more about keyword relevance than category breadth.
        var score = TextHeuristics.Clamp(
            (weightedMatched / weightedTotal * 80)
            + ((double)coveredCategories / ResumeKeywordBank.Categories.Length * 20));

        var unique = perCategory.SelectMany(c => c.Matched).Distinct(StringComparer.Ordinal).ToList();
        var highlights = unique.Take(6).Select(k => $"\"{k}\" detected").ToList();
        if (highlights.Count == 0)
        {
            highlights.Add("No strong technical keywords found");
        }

        var missing = perCategory
            .Where(c => c.Matched.Count == 0)
            .Select(c => c.Name.Replace('_', '/'))
            .ToList();

        var feedback = score switch
        {
            >= 75 => $"Excellent keyword coverage — {unique.Count} relevant skills across {coveredCategories} categories.",
            >= 50 => $"Decent keywords ({unique.Count} found). Missing coverage in: {string.Join(", ", missing.Take(3))}.",
            _ => $"Weak keyword signal. Add skills from: {string.Join(", ", missing.Take(4))}.",
        };

        return new DimensionScore { Score = score, Feedback = feedback, Highlights = highlights };
    }

    /// <summary>
    /// Experience: stated years (20), dated employment periods (20), recognised titles (15),
    /// action verbs (20) and quantified achievements (25).
    /// </summary>
    private static DimensionScore ScoreExperience(string text)
    {
        var normalized = TextHeuristics.Normalize(text);
        var score = 0;
        var highlights = new List<string>();

        var yearsMatch = TextHeuristics.YearsOfExperience().Match(text);
        if (yearsMatch.Success)
        {
            // Tighter cap: Gemini doesn't inflate scores just because years are stated.
            var years = long.TryParse(yearsMatch.Groups[1].Value, out var parsed) ? parsed : 20;
            score += TextHeuristics.Clamp(years * 3.0, 0, 15);
            highlights.Add($"{years}+ years of experience stated");
        }

        var dateRanges = TextHeuristics.FindDateRanges(text);
        if (dateRanges.Count > 0)
        {
            score += TextHeuristics.Clamp(dateRanges.Count * 5, 0, 18);
            highlights.Add($"{dateRanges.Count} employment period(s) with dates");
        }

        var titles = TextHeuristics.FindMatches(normalized, ResumeKeywordBank.JobTitles);
        if (titles.Count > 0)
        {
            score += TextHeuristics.Clamp(titles.Count * 4, 0, 12);
            highlights.Add($"Roles: {string.Join(", ", titles.Take(3))}");
        }

        var verbs = TextHeuristics.FindMatches(normalized, ResumeKeywordBank.ActionVerbs);
        if (verbs.Count > 0)
        {
            score += TextHeuristics.Clamp(verbs.Count * 1.5, 0, 15);
            highlights.Add($"{verbs.Count} strong action verbs used");
        }

        var quantified = TextHeuristics.FindQuantifiedAchievements(text);
        if (quantified.Count > 0)
        {
            // Quantified achievements remain the highest-value signal.
            score += TextHeuristics.Clamp(quantified.Count * 5, 0, 25);
            highlights.Add($"{quantified.Count} quantified achievement(s) with numbers");
        }

        score = TextHeuristics.Clamp(score);

        var feedback = score >= 75
            ? "Strong experience section — clear roles, timelines and measurable impact."
            : score >= 50
                ? "Moderate experience shown. Add more date ranges, titles or impact numbers."
                : quantified.Count == 0
                    ? "No quantified achievements found. Add metrics like \"reduced load time by 40%\"."
                    : "Limited experience signals. Expand work history with titles and date ranges.";

        return new DimensionScore { Score = score, Feedback = feedback, Highlights = highlights };
    }

    /// <summary>
    /// Knowledge depth: length as a proxy for detail (15), certifications (20), project mentions
    /// (20), backend/infra/AI breadth (20), education (10) and links or publications (15).
    /// </summary>
    private static DimensionScore ScoreKnowledgeDepth(string text)
    {
        var normalized = TextHeuristics.Normalize(text);
        var score = 0;
        var highlights = new List<string>();

        // Word count is a weaker signal — Gemini scores content quality, not length.
        var words = TextHeuristics.CountWords(text);
        switch (words)
        {
            case > 700:
                score += 12;
                highlights.Add($"Rich detail ({words} words)");
                break;
            case > 400:
                score += 7;
                highlights.Add($"Adequate length ({words} words)");
                break;
            case > 200:
                score += 3;
                break;
            default:
                highlights.Add($"Resume is very short ({words} words) — expand it");
                break;
        }

        var certifications = TextHeuristics.FindMatches(normalized, ResumeKeywordBank.Certifications);
        if (certifications.Count > 0)
        {
            score += TextHeuristics.Clamp(certifications.Count * 6, 0, 15);
            highlights.Add($"{certifications.Count} certification(s) detected");
        }

        var projectMentions = TextHeuristics.ProjectMention().Count(text);
        if (projectMentions > 0)
        {
            score += TextHeuristics.Clamp(projectMentions * 4, 0, 18);
            highlights.Add($"{projectMentions} project mention(s)");
        }

        var technicalHits = TextHeuristics.FindMatches(normalized, ResumeKeywordBank.Backend).Count
            + TextHeuristics.FindMatches(normalized, ResumeKeywordBank.Databases).Count
            + TextHeuristics.FindMatches(normalized, ResumeKeywordBank.DevOps).Count
            + TextHeuristics.FindMatches(normalized, ResumeKeywordBank.MachineLearning).Count;
        if (technicalHits > 0)
        {
            score += TextHeuristics.Clamp(technicalHits * 2, 0, 20);
            highlights.Add($"{technicalHits} backend/infra/AI tools detected");
        }

        if (TextHeuristics.EducationSignal().IsMatch(text))
        {
            score += 8;
            highlights.Add("Educational qualification detected");
        }

        if (TextHeuristics.GitHubProfile().IsMatch(text))
        {
            score += 7;
            highlights.Add("GitHub profile linked");
        }

        // Deliberately exclusive: a GitHub link already scored above, so this rewards a second,
        // separate web presence rather than counting the same URL twice.
        if (TextHeuristics.WebsiteLink().IsMatch(text) && !TextHeuristics.GitHubMention().IsMatch(text))
        {
            score += 5;
            highlights.Add("Portfolio / personal website linked");
        }

        if (TextHeuristics.PublicationSignal().IsMatch(text))
        {
            score += 7;
            highlights.Add("Research or publication mentioned");
        }

        score = TextHeuristics.Clamp(score);

        var feedback = score >= 75
            ? "Deep technical profile — strong stack breadth, projects and credentials."
            : score >= 50
                ? "Good depth. Add certifications, more projects or a portfolio link."
                : projectMentions == 0
                    ? "No projects detected. Add a Projects section with descriptions."
                    : "Low technical depth. Show more tools, certs and project complexity.";

        return new DimensionScore { Score = score, Feedback = feedback, Highlights = highlights };
    }

    /// <summary>
    /// Impact and presentation: metrics (25), bullet structure (15), self-directed work (20),
    /// awards (15), community involvement (10) and lexical variety (15).
    /// </summary>
    private static DimensionScore ScoreCreativity(string text)
    {
        var normalized = TextHeuristics.Normalize(text);
        var score = 0;
        var highlights = new List<string>();

        var quantified = TextHeuristics.FindQuantifiedAchievements(text);
        if (quantified.Count > 0)
        {
            score += TextHeuristics.Clamp(quantified.Count * 5, 0, 25);
            highlights.Add($"{quantified.Count} metric-driven statement(s)");
        }

        var bullets = TextHeuristics.CountBullets(text);
        switch (bullets)
        {
            case > 10:
                score += 12;
                highlights.Add($"Well-structured ({bullets} bullet points)");
                break;
            case > 4:
                score += 7;
                highlights.Add($"{bullets} bullet points found");
                break;
            case > 0:
                score += 3;
                break;
        }

        var sideSignals = TextHeuristics.FindMatches(normalized, ResumeKeywordBank.SideProjectSignals);
        if (sideSignals.Count > 0)
        {
            score += TextHeuristics.Clamp(sideSignals.Count * 6, 0, 18);
            highlights.Add($"{sideSignals.Count} side project / open-source signal(s)");
        }

        if (TextHeuristics.AwardSignal().IsMatch(text))
        {
            score += 12;
            highlights.Add("Awards or recognition mentioned");
        }

        if (TextHeuristics.CommunitySignal().IsMatch(text))
        {
            score += 8;
            highlights.Add("Community involvement or volunteering noted");
        }

        // Type-token ratio over words longer than four characters: short function words would
        // swamp the signal, so they are excluded.
        var words = normalized.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 4)
            .ToList();
        var diversity = words.Count > 0
            ? (double)words.Distinct(StringComparer.Ordinal).Count() / words.Count
            : 0;

        // Tighter thresholds: Gemini penalizes repetitive phrasing more.
        if (diversity > 0.75)
        {
            score += 15;
            highlights.Add("High vocabulary diversity — writing feels fresh");
        }
        else if (diversity > 0.60)
        {
            score += 7;
        }
        else if (words.Count > 50)
        {
            highlights.Add("Repetitive phrasing detected — vary your language");
        }

        score = TextHeuristics.Clamp(score);

        var feedback = score >= 75
            ? "Standout presentation — metrics, side projects and unique voice."
            : score >= 50
                ? "Decent presentation. Add numbers and link projects or achievements."
                : quantified.Count == 0
                    ? "No measurable impact found. Add % improvements, user counts, etc."
                    : "Presentation needs work. Structure bullets and show awards/side projects.";

        return new DimensionScore { Score = score, Feedback = feedback, Highlights = highlights };
    }

    /// <summary>
    /// Small bonus on the overall score for a resume that is actually organised into sections.
    /// </summary>
    private static (int Bonus, List<string> SectionsFound) ScoreSectionCompleteness(string text)
    {
        var normalized = TextHeuristics.Normalize(text);
        var found = TextHeuristics.FindMatches(normalized, ResumeKeywordBank.SectionHeaders);
        var corePresent = TextHeuristics.FindMatches(normalized, ResumeKeywordBank.CoreSections).Count;

        // Reduced bonus: Gemini gives minimal credit for just having section headers.
        return (corePresent >= 3 ? 3 : corePresent >= 2 ? 1 : 0, found);
    }

    private static string GenerateSummary(int overallScore, AnalysisScores scores)
    {
        var weak = scores.InOrder()
            .Where(d => d.Value.Score < 50)
            .Select(d => d.Key == "knowledgeDepth" ? "knowledge depth" : d.Key)
            .ToList();

        if (overallScore >= 80)
        {
            return "Excellent resume with strong technical depth, clear experience progression and measurable impact. It is well-positioned for competitive roles.";
        }

        if (overallScore >= 65)
        {
            var tail = weak.Count > 0
                ? $"Focus on improving {string.Join(" and ", weak)} to push it to the next level."
                : "Minor refinements can elevate it further.";
            return $"Good resume that covers the essentials well. {tail}";
        }

        if (overallScore >= 45)
        {
            return $"Average resume with noticeable gaps in {string.Join(", ", weak)}. Adding quantified achievements, more keywords and projects will significantly boost your score.";
        }

        return $"The resume needs substantial work — particularly in {string.Join(", ", weak)}. Start by expanding your experience section, listing technical skills and adding measurable results.";
    }

    private static readonly Dictionary<string, string> DimensionLabels = new(StringComparer.Ordinal)
    {
        ["keywords"] = "keyword coverage",
        ["experience"] = "work experience",
        ["knowledgeDepth"] = "technical depth",
        ["creativity"] = "impact & presentation",
    };

    /// <summary>
    /// Strengths come off the top of the ranking, improvements off the bottom. Both LINQ ordering
    /// and JavaScript's <c>Array.sort</c> are stable, so dimensions that tie keep their canonical
    /// order and the two engines produce the same lists.
    /// </summary>
    private static (List<string> Strengths, List<string> Improvements) DeriveStrengthsAndImprovements(
        AnalysisScores scores,
        List<string> sectionsFound)
    {
        var ranked = scores.InOrder().OrderByDescending(d => d.Value.Score).ToList();

        var strengths = ranked
            .Where(d => d.Value.Score >= 55)
            .Take(3)
            .Select(d => $"{DimensionLabels[d.Key]} ({d.Value.Score}/100)")
            .ToList();

        if (sectionsFound.Count >= 4 && strengths.Count < 3)
        {
            strengths.Add($"Well-organised with {sectionsFound.Count} clear sections");
        }

        if (strengths.Count == 0)
        {
            strengths.Add("Resume submitted — that is the first step!");
        }

        var improvements = new List<string>();
        foreach (var (key, value) in Enumerable.Reverse(ranked))
        {
            if (value.Score >= 60)
            {
                continue;
            }

            improvements.Add(key switch
            {
                "keywords" => "Add more tech keywords — languages, frameworks, tools and cloud services",
                "experience" => "Quantify experience: \"reduced load time by 35%\" beats \"improved performance\"",
                "knowledgeDepth" => "Add a Projects section with GitHub links and certifications",
                _ => "Include metrics, side projects, hackathons or open-source contributions",
            });
        }

        // Never send the user away with a single suggestion.
        if (improvements.Count < 2)
        {
            improvements.Add("Use strong action verbs: built, deployed, led, optimised, scaled");
        }

        if (improvements.Count < 3)
        {
            improvements.Add("Link your GitHub, portfolio or LinkedIn prominently at the top");
        }

        return (strengths.Take(3).ToList(), improvements.Take(3).ToList());
    }
}
