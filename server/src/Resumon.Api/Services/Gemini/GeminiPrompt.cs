namespace Resumon.Api.Services.Gemini;

/// <summary>
/// The analysis prompt, carried over verbatim from the Node implementation
/// (<c>api/analyze.js</c>). The JSON skeleton and the "return ONLY valid JSON" instruction are
/// redundant now that the request pins a <c>responseSchema</c>, but they are kept because they
/// also steer <em>what</em> the model writes — dropping them would change the scores and wording
/// this app has always produced.
/// </summary>
internal static class GeminiPrompt
{
    public static string Build(string resumeText) => $$"""
        You are an expert resume analyzer. Analyze the following resume text and return a JSON object with scores and feedback.

        Return ONLY a valid JSON object in this exact format (no markdown, no extra text):
        {
          "overallScore": <number 0-100>,
          "scores": {
            "keywords": {
              "score": <number 0-100>,
              "feedback": "<one or two sentence explanation>",
              "highlights": ["<short evidence chip>", "<short evidence chip>", "<short evidence chip>"]
            },
            "experience": {
              "score": <number 0-100>,
              "feedback": "<one or two sentence explanation>",
              "highlights": ["<short evidence chip>", "<short evidence chip>", "<short evidence chip>"]
            },
            "knowledgeDepth": {
              "score": <number 0-100>,
              "feedback": "<one or two sentence explanation>",
              "highlights": ["<short evidence chip>", "<short evidence chip>", "<short evidence chip>"]
            },
            "creativity": {
              "score": <number 0-100>,
              "feedback": "<one or two sentence explanation>",
              "highlights": ["<short evidence chip>", "<short evidence chip>", "<short evidence chip>"]
            }
          },
          "summary": "<2-3 sentence overall summary>",
          "topStrengths": ["<strength>", "<strength>", "<strength>"],
          "improvements": ["<improvement>", "<improvement>", "<improvement>"]
        }

        Scoring criteria:
        - keywords (0-100): Industry-standard tech stacks, hard skills, certifications, tools
        - experience (0-100): Impact statements with metrics vs. basic task descriptions
        - knowledgeDepth (0-100): Technical sophistication, complexity of projects, depth of expertise
        - creativity (0-100): Unique framing, lexical diversity, standout presentation

        Resume text:
        ---
        {{resumeText}}
        ---
        """;
}
