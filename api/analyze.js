import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { evaluateResume } from './evaluate.js';
import { insertScan } from './db.js';

// Extract all text from a PDF buffer using pdfjs-dist (serverless-safe)
async function extractTextFromPDF(buffer) {
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(' ') + '\n';
  }
  return fullText;
}


// Helper: read raw body from the request stream
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Helper: parse multipart/form-data manually to extract the file buffer
function parseMultipart(buffer, boundary) {
  const boundaryBuffer = Buffer.from('--' + boundary);
  const parts = [];
  let start = 0;

  while (start < buffer.length) {
    const boundaryIndex = buffer.indexOf(boundaryBuffer, start);
    if (boundaryIndex === -1) break;

    const headerStart = boundaryIndex + boundaryBuffer.length + 2; // skip \r\n
    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;

    const headers = buffer.slice(headerStart, headerEnd).toString();
    const dataStart = headerEnd + 4; // skip \r\n\r\n
    const nextBoundary = buffer.indexOf(boundaryBuffer, dataStart);
    const dataEnd = nextBoundary === -1 ? buffer.length : nextBoundary - 2; // trim \r\n

    if (headers.includes('filename')) {
      parts.push({
        headers,
        data: buffer.slice(dataStart, dataEnd),
      });
    }

    start = nextBoundary === -1 ? buffer.length : nextBoundary;
  }

  return parts;
}

// Helper: extract plain text fields (non-file parts) from multipart
function parseTextFields(buffer, boundary) {
  const boundaryBuffer = Buffer.from('--' + boundary);
  const fields = {};
  let start = 0;

  while (start < buffer.length) {
    const boundaryIndex = buffer.indexOf(boundaryBuffer, start);
    if (boundaryIndex === -1) break;

    const headerStart = boundaryIndex + boundaryBuffer.length + 2;
    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;

    const headers = buffer.slice(headerStart, headerEnd).toString();
    const dataStart = headerEnd + 4;
    const nextBoundary = buffer.indexOf(boundaryBuffer, dataStart);
    const dataEnd = nextBoundary === -1 ? buffer.length : nextBoundary - 2;

    if (!headers.includes('filename')) {
      const nameMatch = headers.match(/name="([^"]+)"/);
      if (nameMatch) {
        fields[nameMatch[1]] = buffer.slice(dataStart, dataEnd).toString().trim();
      }
    }

    start = nextBoundary === -1 ? buffer.length : nextBoundary;
  }

  return fields;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)/);

    if (!boundaryMatch) {
      return res.status(400).json({ error: 'Invalid content type. Expected multipart/form-data.' });
    }

    const boundary = boundaryMatch[1];
    const rawBody = await getRawBody(req);
    const parts = parseMultipart(rawBody, boundary);
    const fields = parseTextFields(rawBody, boundary);

    const userId   = fields.userId   || null;
    const fileName = fields.fileName || 'resume.pdf';

    if (parts.length === 0) {
      return res.status(400).json({ error: 'No file found in the request.' });
    }

    // Extract text from PDF
    const pdfBuffer = parts[0].data;
    const resumeText = (await extractTextFromPDF(pdfBuffer)).trim();

    if (!resumeText || resumeText.length < 50) {
      return res.status(400).json({ error: 'Could not extract readable text from the PDF.' });
    }

    // ── Try Gemini first ────────────────────────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `You are an expert resume analyzer. Analyze the following resume text and return a JSON object with scores and feedback.

Return ONLY a valid JSON object in this exact format (no markdown, no extra text):
{
  "overallScore": <number 0-100>,
  "scores": {
    "keywords": {
      "score": <number 0-100>,
      "feedback": "<brief feedback>",
      "highlights": ["<item1>", "<item2>", "<item3>"]
    },
    "experience": {
      "score": <number 0-100>,
      "feedback": "<brief feedback>",
      "highlights": ["<item1>", "<item2>", "<item3>"]
    },
    "knowledgeDepth": {
      "score": <number 0-100>,
      "feedback": "<brief feedback>",
      "highlights": ["<item1>", "<item2>", "<item3>"]
    },
    "creativity": {
      "score": <number 0-100>,
      "feedback": "<brief feedback>",
      "highlights": ["<item1>", "<item2>", "<item3>"]
    }
  },
  "summary": "<2-3 sentence overall summary>",
  "topStrengths": ["<strength1>", "<strength2>", "<strength3>"],
  "improvements": ["<improvement1>", "<improvement2>", "<improvement3>"]
}

Scoring criteria:
- keywords (0-100): Industry-standard tech stacks, hard skills, certifications, tools
- experience (0-100): Impact statements with metrics vs. basic task descriptions
- knowledgeDepth (0-100): Technical sophistication, complexity of projects, depth of expertise
- creativity (0-100): Unique framing, lexical diversity, standout presentation

Resume text:
---
${resumeText}
---`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim();
        const analysis = JSON.parse(cleaned);
        analysis._source = 'gemini';

        if (userId) {
          try {
            await insertScan({ userId, fileName, scannedAt: new Date().toISOString(), analysis });
          } catch (dbErr) {
            console.error('DB insert failed (Gemini):', dbErr.message);
          }
        }

        return res.status(200).json({ success: true, analysis });

      } catch (geminiErr) {
        // Log the Gemini failure but don't surface it — fall through to local engine
        console.warn('Gemini unavailable, falling back to local engine:', geminiErr.message);
      }
    }

    // ── Fallback: local evaluation engine ────────────────────────────────────
    const analysis = evaluateResume(resumeText);

    if (userId) {
      try {
        await insertScan({ userId, fileName, scannedAt: new Date().toISOString(), analysis });
      } catch (dbErr) {
        console.error('DB insert failed (local):', dbErr.message);
      }
    }

    return res.status(200).json({ success: true, analysis, _usedFallback: true });

  } catch (err) {
    console.error('Error in /api/analyze:', err);

    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

