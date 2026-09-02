using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace Resumon.Api.Services.Gemini;

/// <summary>Request and response envelopes for the Gemini <c>generateContent</c> endpoint.</summary>
internal static class GeminiMessages
{
    /// <summary>One scoring dimension, as an OpenAPI schema fragment.</summary>
    private const string DimensionSchema = """
        {
          "type": "OBJECT",
          "properties": {
            "score": { "type": "INTEGER", "description": "0-100" },
            "feedback": { "type": "STRING", "description": "One or two sentences" },
            "highlights": {
              "type": "ARRAY",
              "items": { "type": "STRING" },
              "description": "Three short evidence chips drawn from the resume"
            }
          },
          "required": ["score", "feedback", "highlights"],
          "propertyOrdering": ["score", "feedback", "highlights"]
        }
        """;

    /// <summary>
    /// Constrains the model to the exact shape the React pages already render. This is why the
    /// C# client, unlike the Node original, never has to strip markdown fences or guess at
    /// malformed JSON — the API guarantees the response parses.
    /// </summary>
    public static JsonNode ResponseSchema { get; } = JsonNode.Parse($$"""
        {
          "type": "OBJECT",
          "properties": {
            "overallScore": { "type": "INTEGER", "description": "0-100" },
            "summary": { "type": "STRING", "description": "Two or three sentences" },
            "scores": {
              "type": "OBJECT",
              "properties": {
                "keywords": {{DimensionSchema}},
                "experience": {{DimensionSchema}},
                "knowledgeDepth": {{DimensionSchema}},
                "creativity": {{DimensionSchema}}
              },
              "required": ["keywords", "experience", "knowledgeDepth", "creativity"],
              "propertyOrdering": ["keywords", "experience", "knowledgeDepth", "creativity"]
            },
            "topStrengths": { "type": "ARRAY", "items": { "type": "STRING" } },
            "improvements": { "type": "ARRAY", "items": { "type": "STRING" } }
          },
          "required": ["overallScore", "summary", "scores", "topStrengths", "improvements"],
          "propertyOrdering": ["overallScore", "summary", "scores", "topStrengths", "improvements"]
        }
        """)!;

    /// <summary>Builds the single-turn request body.</summary>
    public static GeminiRequest ForPrompt(string prompt, double temperature) => new(
        [new GeminiContent([new GeminiPart(prompt)])],
        new GeminiGenerationConfig(
            temperature,
            ResponseMimeType: "application/json",
            ResponseSchema: ResponseSchema));
}

internal sealed record GeminiRequest(
    [property: JsonPropertyName("contents")] GeminiContent[] Contents,
    [property: JsonPropertyName("generationConfig")] GeminiGenerationConfig GenerationConfig);

internal sealed record GeminiContent(
    [property: JsonPropertyName("parts")] GeminiPart[] Parts);

internal sealed record GeminiPart(
    [property: JsonPropertyName("text")] string Text);

internal sealed record GeminiGenerationConfig(
    [property: JsonPropertyName("temperature")] double Temperature,
    [property: JsonPropertyName("responseMimeType")] string ResponseMimeType,
    [property: JsonPropertyName("responseSchema")] JsonNode ResponseSchema);

internal sealed record GeminiResponse(
    [property: JsonPropertyName("candidates")] GeminiCandidate[]? Candidates,
    [property: JsonPropertyName("promptFeedback")] GeminiPromptFeedback? PromptFeedback)
{
    /// <summary>
    /// The model's JSON payload, or <c>null</c> when the call produced no usable candidate
    /// (safety block, empty response, or a truncated <c>MAX_TOKENS</c> stop).
    /// </summary>
    public string? Text()
    {
        var parts = Candidates?.FirstOrDefault()?.Content?.Parts;

        if (parts is null or { Length: 0 })
        {
            return null;
        }

        // Long responses arrive split across parts; concatenating is what the official SDKs do.
        var text = string.Concat(parts.Select(p => p.Text));

        return string.IsNullOrWhiteSpace(text) ? null : text;
    }

    /// <summary>Why nothing usable came back, for the log line before the local fallback.</summary>
    public string Diagnose()
    {
        var candidate = Candidates?.FirstOrDefault();

        if (candidate is not null)
        {
            return $"finishReason={candidate.FinishReason ?? "none"}";
        }

        return PromptFeedback?.BlockReason is { } blocked
            ? $"blockReason={blocked}"
            : "no candidates returned";
    }
}

internal sealed record GeminiCandidate(
    [property: JsonPropertyName("content")] GeminiContent? Content,
    [property: JsonPropertyName("finishReason")] string? FinishReason);

internal sealed record GeminiPromptFeedback(
    [property: JsonPropertyName("blockReason")] string? BlockReason);
