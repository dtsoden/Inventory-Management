/**
 * Extracts plain text from various document formats so it can be sent
 * to OpenAI for structured packing slip extraction.
 *
 * Follows the same OOP pattern as the rest of the application.
 * Each format has a dedicated parser class implementing a common interface.
 */

export type SupportedMimeType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'application/vnd.ms-excel'
  | 'text/csv';

interface DocumentParser {
  extract(buffer: Buffer): Promise<string>;
}

class PdfParser implements DocumentParser {
  async extract(buffer: Buffer): Promise<string> {
    const { default: PDFParser } = await import('pdf2json');
    return new Promise((resolve, reject) => {
      const parser = new PDFParser(null, true);
      parser.on('pdfParser_dataError', (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        reject(new Error(msg));
      });
      parser.on('pdfParser_dataReady', () => {
        resolve(parser.getRawTextContent());
      });
      parser.parseBuffer(buffer);
    });
  }
}

class DocxParser implements DocumentParser {
  async extract(buffer: Buffer): Promise<string> {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
}

class ExcelParser implements DocumentParser {
  async extract(buffer: Buffer): Promise<string> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const lines: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      lines.push(`--- Sheet: ${sheetName} ---\n${csv}`);
    }
    return lines.join('\n\n');
  }
}

class CsvParser implements DocumentParser {
  async extract(buffer: Buffer): Promise<string> {
    return buffer.toString('utf-8');
  }
}

const MIME_MAP: Record<string, SupportedMimeType> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  csv: 'text/csv',
};

const PARSERS: Record<string, DocumentParser> = {
  'application/pdf': new PdfParser(),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': new DocxParser(),
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': new ExcelParser(),
  'application/vnd.ms-excel': new ExcelParser(),
  'text/csv': new CsvParser(),
};

export function isDocumentMime(mime: string): boolean {
  return mime in PARSERS;
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

export function mimeFromExtension(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  return MIME_MAP[ext] || null;
}

export async function extractTextFromDocument(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const parser = PARSERS[mimeType];
  if (!parser) {
    throw new Error(`Unsupported document type: ${mimeType}`);
  }
  return parser.extract(buffer);
}
