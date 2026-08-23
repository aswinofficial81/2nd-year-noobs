import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface PDFExtractionResult {
  success: boolean;
  totalPages: number;
  pages: ExtractedPage[];
  fullText: string;
  requiresOcr?: boolean;
  error?: string;
}

export interface ArtifactChunk {
  id: string;
  artifactId: string;
  pageNumber?: number;
  text: string;
}

/**
 * Normalizes extracted text from a PDF page or document.
 * - Removes non-printable/control characters while preserving unicode and math notation
 * - Normalizes excessive newlines and indentation
 * - Preserves paragraph boundaries
 */
export function normalizeExtractedText(raw: string): string {
  if (!raw) return '';

  return raw
    // Remove null bytes and non-printable control characters (except newline, carriage return, tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize Windows/Mac line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove artificial PDF text extraction markers like "-- 1 of 5 --"
    .replace(/--\s*\d+\s+of\s+\d+\s*--/g, '')
    // Split into lines, trim each line
    .split('\n')
    .map(line => line.trim())
    // Collapse more than 2 consecutive blank lines into 1
    .filter((line, index, arr) => {
      if (line.length > 0) return true;
      // Keep at most one consecutive blank line
      return index > 0 && arr[index - 1].length > 0;
    })
    .join('\n')
    .trim();
}

/**
 * Checks if the text appears to be raw unparsed PDF binary stream gibberish.
 */
export function isRawPDFStream(text: string): boolean {
  if (!text) return false;
  // Raw PDF internal objects signature check
  const rawStreamPatterns = [
    /\/Filter\s*\/FlateDecode/i,
    /\/Type\s*\/Catalog/i,
    /\/Type\s*\/Pages/i,
    /\/Length\s*\d+/i,
    /endobj/i,
    /startxref/i,
    /%%EOF/i,
  ];

  let patternMatches = 0;
  for (const pattern of rawStreamPatterns) {
    if (pattern.test(text)) {
      patternMatches++;
    }
  }

  // If 2 or more internal PDF object keys are found in plain text, it's raw stream data
  return patternMatches >= 2;
}

/**
 * Extracts human-readable text page by page from a binary PDF buffer.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<PDFExtractionResult> {
  if (!buffer || buffer.length === 0) {
    return {
      success: false,
      totalPages: 0,
      pages: [],
      fullText: '',
      error: 'Empty PDF buffer provided.',
    };
  }

  let parser: any = null;

  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const totalPages = result.total || (result.pages ? result.pages.length : 0);
    const pages: ExtractedPage[] = [];

    if (result.pages && Array.isArray(result.pages)) {
      for (const page of result.pages) {
        const cleaned = normalizeExtractedText(page.text || '');
        if (cleaned.length > 0 && !isRawPDFStream(cleaned)) {
          pages.push({
            pageNumber: page.num || pages.length + 1,
            text: cleaned,
          });
        }
      }
    }

    // Combine all page texts
    let fullText = pages.map(p => p.text).filter(Boolean).join('\n\n').trim();

    // If result.text had content but pages was empty
    if (!fullText && result.text) {
      const cleaned = normalizeExtractedText(result.text);
      if (!isRawPDFStream(cleaned)) {
        fullText = cleaned;
        pages.push({
          pageNumber: 1,
          text: fullText,
        });
      }
    }

    // Check for scanned / image-only PDFs with zero or minimal extractable text
    const words = fullText.split(/\s+/).filter(w => w.length > 1);
    if (fullText.length === 0 || words.length < 5 || isRawPDFStream(fullText)) {
      return {
        success: false,
        totalPages: totalPages || 1,
        pages: [],
        fullText: '',
        requiresOcr: true,
        error: 'This PDF does not contain an extractable text layer (scanned or image-only PDF requires OCR).',
      };
    }

    return {
      success: true,
      totalPages: Math.max(totalPages, pages.length),
      pages,
      fullText,
    };
  } catch (err: any) {
    console.error('[PDF Parser] Error during PDF text extraction:', err);
    return {
      success: false,
      totalPages: 0,
      pages: [],
      fullText: '',
      error: `Failed to extract text from PDF: ${err.message || String(err)}`,
    };
  } finally {
    if (parser && typeof parser.destroy === 'function') {
      try {
        await parser.destroy();
      } catch {
        // ignore cleanup error
      }
    }
  }
}

/**
 * Splits extracted pages into structured chunks with page number tracking.
 */
export function chunkPDFPages(
  pages: ExtractedPage[],
  artifactId: string,
  maxChunkChars = 800
): ArtifactChunk[] {
  const chunks: ArtifactChunk[] = [];
  let chunkIndex = 1;

  for (const page of pages) {
    const paragraphs = page.text
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > maxChunkChars && currentChunk.length > 0) {
        chunks.push({
          id: `${artifactId}_p${page.pageNumber}_c${chunkIndex++}`,
          artifactId,
          pageNumber: page.pageNumber,
          text: currentChunk.trim(),
        });
        currentChunk = paragraph;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `${artifactId}_p${page.pageNumber}_c${chunkIndex++}`,
        artifactId,
        pageNumber: page.pageNumber,
        text: currentChunk.trim(),
      });
    }
  }

  // Fallback if pages was empty but text was provided
  if (chunks.length === 0 && pages.length > 0) {
    for (const page of pages) {
      if (page.text.trim()) {
        chunks.push({
          id: `${artifactId}_p${page.pageNumber}_c${chunkIndex++}`,
          artifactId,
          pageNumber: page.pageNumber,
          text: page.text.trim(),
        });
      }
    }
  }

  return chunks;
}
