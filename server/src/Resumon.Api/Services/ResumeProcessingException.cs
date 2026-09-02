namespace Resumon.Api.Services;

/// <summary>
/// A failure the caller can act on — an unreadable upload, a PDF with no extractable text.
/// Surfaces as a 400 with <see cref="Message"/> shown directly in the UI, so the text is written
/// for the person who uploaded the file rather than for a log.
/// </summary>
public sealed class ResumeProcessingException(string message, Exception? innerException = null)
    : Exception(message, innerException);
