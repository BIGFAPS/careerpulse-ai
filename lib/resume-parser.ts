// Client-side resume/document parsing.
// - PDF: sent to Gemini as inline data (Gemini reads the PDF directly).
// - DOCX: unzipped in the browser (native DecompressionStream) and the text of
//   word/document.xml is extracted. No extra dependency needed.
// - TXT / MD: read as plain text.

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const ACCEPTED_RESUME_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
};

export interface ParsedDocument {
  fileName: string;
  kind: "pdf" | "docx" | "text";
  text: string; // extracted text (empty for PDF, Gemini reads it directly)
  base64?: string; // only for PDF
  mimeType?: string; // only for PDF
}

export class DocumentParseError extends Error {}

function extensionOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export function validateResumeFile(file: File): string | null {
  const ext = extensionOf(file.name);
  if (![".pdf", ".docx", ".txt", ".md"].includes(ext)) {
    if (ext === ".doc") {
      return "Old Word (.doc) files are not supported. Please save your resume as .docx or PDF and try again.";
    }
    return `"${file.name}" is not a valid resume. Please upload a .pdf or .docx file (or .txt / .md).`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return "The file is too large (maximum 5 MB). Please upload a smaller resume.";
  }
  if (file.size === 0) {
    return "The file is empty. Please upload a valid resume.";
  }
  return null;
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const DS = (globalThis as any).DecompressionStream;
  if (!DS) {
    throw new DocumentParseError(
      "Your browser cannot read .docx files. Please upload a PDF or paste the text.",
    );
  }
  const stream = new Blob([data as any]).stream().pipeThrough(new DS("deflate-raw"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

// Minimal ZIP reader: finds one entry by name using the central directory.
async function readZipEntry(
  buffer: ArrayBuffer,
  entryName: string,
): Promise<Uint8Array | null> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  // Find End Of Central Directory record (signature 0x06054b50)
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const entries = view.getUint16(eocd + 10, true);
  let ptr = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();

  for (let n = 0; n < entries; n++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) return null;
    const method = view.getUint16(ptr + 10, true);
    const compSize = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localOffset = view.getUint32(ptr + 42, true);
    const name = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));

    if (name === entryName) {
      const lNameLen = view.getUint16(localOffset + 26, true);
      const lExtraLen = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const data = bytes.subarray(start, start + compSize);
      if (method === 0) return data;
      if (method === 8) return inflateRaw(data);
      return null;
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

function decodeXmlEntities(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&");
}

export function docxXmlToText(xml: string): string {
  const paragraphs = xml.split(/<\/w:p>/);
  const lines: string[] = [];
  for (const p of paragraphs) {
    let line = "";
    const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(p))) {
      if (m[0] === "<w:tab/>") line += "\t";
      else if (m[0] === "<w:br/>") line += "\n";
      else line += decodeXmlEntities(m[1]);
    }
    const isListItem = /<w:numPr>/.test(p);
    if (line.trim()) lines.push((isListItem ? "- " : "") + line.trim());
  }
  return lines.join("\n");
}

export async function extractDocxText(file: File): Promise<string> {
  const buffer = await readAsArrayBuffer(file);
  const entry = await readZipEntry(buffer, "word/document.xml");
  if (!entry) {
    throw new DocumentParseError(
      "This .docx file could not be read. It may be damaged. Please upload a PDF or paste the text.",
    );
  }
  const xml = new TextDecoder().decode(entry);
  return docxXmlToText(xml);
}

export async function parseResumeFile(file: File): Promise<ParsedDocument> {
  const error = validateResumeFile(file);
  if (error) throw new DocumentParseError(error);

  const ext = extensionOf(file.name);
  if (ext === ".pdf") {
    const base64 = await readAsBase64(file);
    return {
      fileName: file.name,
      kind: "pdf",
      text: "",
      base64,
      mimeType: "application/pdf",
    };
  }

  const text = ext === ".docx" ? await extractDocxText(file) : await readAsText(file);
  if (!text.trim()) {
    throw new DocumentParseError(
      "No text could be extracted from this file. The resume was rejected. Please upload a text-based PDF/DOCX or paste the text.",
    );
  }
  return { fileName: file.name, kind: ext === ".docx" ? "docx" : "text", text };
}
