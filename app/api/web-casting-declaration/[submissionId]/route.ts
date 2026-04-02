import { existsSync } from "fs";
import { readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { type NextRequest, NextResponse } from "next/server";

import type { WebCastingFormValues } from "@/lib/webCastingDeclarationTypes";
import type { StoredWebCastingDeclaration } from "@/lib/webCastingStoredDeclaration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = path.join(process.cwd(), "webcasting", "submissions");

function extFromType(file: File): string {
  const t = file.type?.toLowerCase() ?? "";
  if (t.includes("png")) return ".png";
  if (t.includes("webp")) return ".webp";
  return ".jpg";
}

async function writeFileFromUpload(
  file: File,
  destPathNoExt: string,
): Promise<string> {
  const ext = extFromType(file);
  const full = `${destPathNoExt}${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(full, buf);
  return path.basename(full);
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ submissionId: string }> },
) {
  try {
    const { submissionId } = await context.params;
    if (
      !submissionId ||
      submissionId.includes("..") ||
      submissionId.includes("/") ||
      submissionId.includes("\\")
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid id" },
        { status: 400 },
      );
    }

    const jsonPath = path.join(ROOT, submissionId, "declaration.json");
    const safeRoot = path.resolve(ROOT);
    const safeJson = path.resolve(jsonPath);
    if (
      !safeJson.startsWith(safeRoot + path.sep) &&
      safeJson !== safeRoot
    ) {
      return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
    }

    if (!existsSync(safeJson)) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const raw = await readFile(safeJson, "utf8");
    const data = JSON.parse(raw) as StoredWebCastingDeclaration;

    return NextResponse.json({ ok: true as const, data });
  } catch (e) {
    console.error("web-casting-declaration GET:", e);
    return NextResponse.json(
      {
        ok: false as const,
        error: e instanceof Error ? e.message : "Failed to load declaration",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ submissionId: string }> },
) {
  try {
    const { submissionId } = await context.params;
    if (
      !submissionId ||
      submissionId.includes("..") ||
      submissionId.includes("/") ||
      submissionId.includes("\\")
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid id" },
        { status: 400 },
      );
    }

    const safeRoot = path.resolve(ROOT);
    const dir = path.join(ROOT, submissionId);
    const safeDir = path.resolve(dir);
    if (
      !safeDir.startsWith(safeRoot + path.sep) &&
      safeDir !== safeRoot
    ) {
      return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
    }

    const jsonPath = path.join(dir, "declaration.json");
    if (!existsSync(jsonPath)) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const raw = formData.get("declaration");
    if (typeof raw !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing declaration JSON" },
        { status: 400 },
      );
    }

    let form: WebCastingFormValues;
    try {
      form = JSON.parse(raw) as WebCastingFormValues;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid declaration JSON" },
        { status: 400 },
      );
    }

    const aadhaarFront = formData.get("aadhaar_front");
    const aadhaarBack = formData.get("aadhaar_back");
    if (!(aadhaarFront instanceof File) || !(aadhaarBack instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Aadhaar front and back images are required" },
        { status: 400 },
      );
    }

    const passport = formData.get("passport");
    const voterFront = formData.get("voter_front");
    const voterBack = formData.get("voter_back");

    const existingRaw = await readFile(jsonPath, "utf8");
    const previous = JSON.parse(existingRaw) as StoredWebCastingDeclaration;

    const images: StoredWebCastingDeclaration["images"] = {
      passport: previous.images.passport,
      aadhaar_front: await writeFileFromUpload(
        aadhaarFront,
        path.join(dir, "aadhaar_front"),
      ),
      aadhaar_back: await writeFileFromUpload(
        aadhaarBack,
        path.join(dir, "aadhaar_back"),
      ),
      voter_front: previous.images.voter_front,
      voter_back: previous.images.voter_back,
    };

    if (passport instanceof File && passport.size > 0) {
      images.passport = await writeFileFromUpload(
        passport,
        path.join(dir, "passport"),
      );
    }

    if (voterFront instanceof File && voterBack instanceof File) {
      if (voterFront.size > 0 && voterBack.size > 0) {
        images.voter_front = await writeFileFromUpload(
          voterFront,
          path.join(dir, "voter_front"),
        );
        images.voter_back = await writeFileFromUpload(
          voterBack,
          path.join(dir, "voter_back"),
        );
      }
    }

    const payload: StoredWebCastingDeclaration = {
      version: 1,
      submissionId,
      savedAt: new Date().toISOString(),
      form,
      images,
    };

    await writeFile(
      jsonPath,
      JSON.stringify(payload, null, 2),
      "utf8",
    );

    return NextResponse.json({
      ok: true as const,
      submissionId,
      relativePath: path.join("webcasting", "submissions", submissionId),
    });
  } catch (e) {
    console.error("web-casting-declaration PUT:", e);
    return NextResponse.json(
      {
        ok: false as const,
        error: e instanceof Error ? e.message : "Failed to update declaration",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ submissionId: string }> },
) {
  try {
    const { submissionId } = await context.params;
    if (
      !submissionId ||
      submissionId.includes("..") ||
      submissionId.includes("/") ||
      submissionId.includes("\\")
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid id" },
        { status: 400 },
      );
    }

    const safeRoot = path.resolve(ROOT);
    const dir = path.join(ROOT, submissionId);
    const safeDir = path.resolve(dir);
    if (
      !safeDir.startsWith(safeRoot + path.sep) &&
      safeDir !== safeRoot
    ) {
      return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
    }

    const jsonPath = path.join(dir, "declaration.json");
    if (!existsSync(jsonPath)) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    await rm(dir, { recursive: true, force: true });

    return NextResponse.json({ ok: true as const });
  } catch (e) {
    console.error("web-casting-declaration DELETE:", e);
    return NextResponse.json(
      {
        ok: false as const,
        error: e instanceof Error ? e.message : "Failed to delete declaration",
      },
      { status: 500 },
    );
  }
}
