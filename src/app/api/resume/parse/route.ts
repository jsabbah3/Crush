import { NextRequest, NextResponse } from "next/server";
// pdf-parse ESM types lack a default export — require() picks up the CJS build correctly
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
import mammoth from "mammoth";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const name = file.name.toLowerCase();

    let text = "";

    if (name.endsWith(".pdf")) {
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".txt") || name.endsWith(".md")) {
      text = buffer.toString("utf-8");
    } else {
      return NextResponse.json({ error: "Unsupported file type. Use PDF, DOCX, or TXT." }, { status: 400 });
    }

    // Clean up whitespace
    text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

    if (text.length < 50) {
      return NextResponse.json({ error: "Could not extract enough text from this file." }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch (e) {
    console.error("Resume parse error:", e);
    return NextResponse.json({ error: "Failed to parse file." }, { status: 500 });
  }
}
