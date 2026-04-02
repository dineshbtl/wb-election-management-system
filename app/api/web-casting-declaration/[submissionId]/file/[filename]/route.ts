import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = path.join(process.cwd(), "webcasting", "submissions");

function mimeFor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ submissionId: string; filename: string }> },
) {
  try {
    const { submissionId, filename } = await context.params;
    if (!submissionId || !filename) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    if (
      submissionId.includes("..") ||
      submissionId.includes("/") ||
      submissionId.includes("\\") ||
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const safeRoot = path.resolve(ROOT);
    const dir = path.resolve(path.join(ROOT, submissionId));
    if (!dir.startsWith(safeRoot + path.sep) && dir !== safeRoot) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const filePath = path.join(dir, filename);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(dir + path.sep) && resolved !== dir) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }

    if (!existsSync(resolved)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buf = await readFile(resolved);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": mimeFor(filename),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    console.error("web-casting file GET:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read file" },
      { status: 500 },
    );
  }
}
