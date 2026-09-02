using System.Text.Json;
using Resumon.Api.Contracts.Analysis;
using Resumon.Api.Services.Evaluation;

namespace Resumon.Api.Tests.Evaluation;

/// <summary>
/// Locks the C# scoring engine to the output of the original Node engine.
/// <para>
/// The <c>*.expected.json</c> fixtures were produced by running <c>evaluateResume()</c> from the
/// pre-migration <c>api/evaluate.js</c> over the matching <c>*.txt</c> resume. If a refactor ever
/// changes a bucket, a regex or a rounding rule, these tests fail with the exact field that drifted.
/// </para>
/// </summary>
public sealed class LocalResumeEvaluatorParityTests
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly LocalResumeEvaluator _evaluator = new();

    [Theory]
    [InlineData("sample-resume")]   // saturates most dimensions
    [InlineData("moderate-resume")] // mid-range: where rounding and tie-breaking show up
    [InlineData("sparse-resume")]   // hits every "weak" feedback branch
    public void Matches_the_original_node_engine(string fixture)
    {
        var resumeText = ReadFixture($"{fixture}.txt");
        var expected = JsonSerializer.Deserialize<ResumeAnalysis>(ReadFixture($"{fixture}.expected.json"), SerializerOptions);

        Assert.NotNull(expected);

        var actual = _evaluator.Evaluate(resumeText);

        Assert.Equal(expected.OverallScore, actual.OverallScore);
        Assert.Equal(expected.Summary, actual.Summary);
        Assert.Equal(expected.TopStrengths, actual.TopStrengths);
        Assert.Equal(expected.Improvements, actual.Improvements);
        Assert.Equal(AnalysisSource.Local, actual.Source);

        // Flattened so a failure names the dimension that drifted.
        Assert.Equal(Flatten(expected.Scores), Flatten(actual.Scores));
    }

    private static List<(string Key, int Score, string Feedback, string Highlights)> Flatten(AnalysisScores scores)
        => [.. scores.InOrder().Select(d => (d.Key, d.Value.Score, d.Value.Feedback, string.Join(" | ", d.Value.Highlights)))];

    private static string ReadFixture(string name)
        => File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", name));
}
