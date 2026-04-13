/**
 * Extracts plain text from various document formats so it can be sent
 * to OpenAI for structured packing slip extraction.
 */

export type SupportedMimeType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'application/vnd.ms-excel'
  | 'text/csv';

const MIME_MAP: Record<string, SupportedMimeType> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  csv: 'text/csv',
};

export function isDocumentMime(mime: string): boolean {
  return Object.values(MIME_MAP).includes(mime as SupportedMimeType) || mime === 'text/csv';
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
  switch (mimeType) {
    case 'application/pdf':
      return extractPdf(buffer);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractDocx(buffer);
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.ms-excel':
      return extractExcel(buffer);
    case 'text/csv':
      return buffer.toString('utf-8');
    default:
      throw new Error(`Unsupported document type: ${mimeType}`);
  }
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // @ts-ignore - pdf-parse v1 has no type declarations
  const pdfParse = await import('pdf-parse');
  const parse = typeof pdfParse === 'function' ? pdfParse : (pdfParse as any).default;
  const result = await parse(buffer);
  return result.text;
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractExcel(buffer: Buffer): Promise<string> {
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
