using System.Text;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace Resumon.Api.Services;

/// <summary>Pulls plain text out of an uploaded resume.</summary>
public interface IPdfTextExtractor
{
    /// <summary>
    /// Returns the document text, one page per block.
    /// </summary>
    /// <exception cref="ResumeProcessingException">
    /// The bytes are not a readable PDF, or the PDF is password protected.
    /// </exception>
    string Extract(byte[] content);
}

/// <summary>
/// PdfPig-based extractor. Fully managed, so it works unchanged in the Linux container Render
/// runs — no native binaries and no headless browser, unlike the JS <c>pdf-parse</c> chain the
/// Node version depended on.
/// </summary>
public sealed class PdfPigTextExtractor(ILogger<PdfPigTextExtractor> logger) : IPdfTextExtractor
{
    public string Extract(byte[] content)
    {
        try
        {
            using var document = PdfDocument.Open(content);
            var builder = new StringBuilder();

            foreach (var page in document.GetPages())
            {
                // Content-order extraction keeps reading order and line breaks, which the
                // scoring engine needs: it counts bullet lines and date ranges per line.
                builder.AppendLine(ContentOrderTextExtractor.GetText(page));
            }

            return builder.ToString();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "PDF text extraction failed.");

            throw new ResumeProcessingException(
                "That PDF could not be read. If it is password protected or a scanned image, try exporting a text-based PDF.",
                ex);
        }
    }
}
