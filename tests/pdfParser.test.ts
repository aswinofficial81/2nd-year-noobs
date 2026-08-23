import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  extractTextFromPDF,
  normalizeExtractedText,
  isRawPDFStream,
  chunkPDFPages,
} from '../src/server/pdfParser.js';

describe('Phase 19: PDF Ingestion & Text Layer Extraction', () => {
  it('should normalize extracted text without destroying structure or math', () => {
    const raw = `
      Permutation & Combination Class 11

      Theorem 1: The number of permutations of n distinct objects is n!
      nPr = n! / (n - r)!

      -- 1 of 5 --
      Example: If n = 5, r = 3, then 5P3 = 60.
    `;

    const cleaned = normalizeExtractedText(raw);
    assert.ok(cleaned.includes('Permutation & Combination Class 11'));
    assert.ok(cleaned.includes('nPr = n! / (n - r)!'));
    assert.ok(cleaned.includes('5P3 = 60'));
    assert.ok(!cleaned.includes('-- 1 of 5 --'), 'Should strip internal page numbering markers');
  });

  it('should detect raw unparsed PDF binary streams and reject them', () => {
    const rawStreamSample = `
      /Filter /FlateDecode
      /Length 8975
      /Length1 41076
      /Type /Stream
      x ] | ?3 f y ...
      endobj
    `;

    assert.strictEqual(isRawPDFStream(rawStreamSample), true);

    const normalText = 'This is a genuine research paper about distributed consensus and CRDT algorithms.';
    assert.strictEqual(isRawPDFStream(normalText), false);
  });

  it('should chunk multi-page extracted text with page number metadata', () => {
    const pages = [
      {
        pageNumber: 1,
        text: 'Permutation and Combination Class 11.\n\nFundamental Principle of Counting explains multiplication rule.',
      },
      {
        pageNumber: 2,
        text: 'Combinations Formula: nCr = n! / (r! * (n - r)!).\n\nDifference between permutations (arrangements) and combinations (selections).',
      },
    ];

    const chunks = chunkPDFPages(pages, 'art-math-101');
    assert.ok(chunks.length >= 2, 'Should create chunks across both pages');
    assert.ok(chunks.some(c => c.pageNumber === 1 && c.text.includes('Principle of Counting')));
    assert.ok(chunks.some(c => c.pageNumber === 2 && c.text.includes('Combinations Formula')));
    assert.ok(chunks.every(c => !isRawPDFStream(c.text)));
  });

  it('should handle empty or scanned PDF buffers returning OCR requirement notice', async () => {
    // PDF with no text stream (empty canvas)
    const emptyPdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n206\n%%EOF'
    );

    const result = await extractTextFromPDF(emptyPdfBuffer);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.requiresOcr, true);
    assert.strictEqual(result.fullText, '');
    assert.ok(result.error?.includes('scanned or image-only PDF requires OCR'));
  });
});
