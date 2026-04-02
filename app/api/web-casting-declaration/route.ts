import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { type NextRequest, NextResponse } from "next/server";

import type { WebCastingFormValues } from "@/lib/webCastingDeclarationTypes";
import type { StoredWebCastingDeclaration } from "@/lib/webCastingStoredDeclaration";
import type { WebCastingListItem } from "@/lib/webCastingSubmissionList";

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

export async function GET() {
  try {
    if (!existsSync(ROOT)) {
      return NextResponse.json({ ok: true as const, items: [] });
    }

    const entries = await readdir(ROOT, { withFileTypes: true });
    const items: WebCastingListItem[] = [];

    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const jsonPath = path.join(ROOT, ent.name, "declaration.json");
      if (!existsSync(jsonPath)) continue;
      try {
        const raw = await readFile(jsonPath, "utf8");
        const parsed = JSON.parse(raw) as StoredWebCastingDeclaration;
        const form = parsed.form;
        const digits = form?.aadhaarNumber?.replace(/\D/g, "") ?? "";
        items.push({
          submissionId: parsed.submissionId ?? ent.name,
          savedAt: parsed.savedAt ?? new Date(0).toISOString(),
          fullName: form?.fullName?.trim() ?? "",
          district: form?.district?.trim() ?? "",
          districtDocumentId: form?.districtId?.trim() || undefined,
          assembly: form?.assembly?.trim() ?? "",
          assemblyDocumentId: form?.assemblyDocumentId?.trim() || undefined,
          pollingStation: form?.pollingStation?.trim() ?? "",
          village: form?.village?.trim() ?? "",
          phone: form?.phone?.trim() ?? "",
          aadhaarLast4: digits.length >= 4 ? digits.slice(-4) : digits,
        });
      } catch {
        /* skip invalid folders */
      }
    }

    items.sort(
      (a, b) =>
        new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
    );

    return NextResponse.json({ ok: true as const, items });
  } catch (e) {
    console.error("web-casting-declaration list:", e);
    return NextResponse.json(
      {
        ok: false as const,
        error: e instanceof Error ? e.message : "Failed to list declarations",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const submissionId = `${Date.now()}_${randomUUID().slice(0, 8)}`;
    const dir = path.join(ROOT, submissionId);
    await mkdir(dir, { recursive: true });

    const images: StoredWebCastingDeclaration["images"] = {
      passport: null,
      aadhaar_front: await writeFileFromUpload(
        aadhaarFront,
        path.join(dir, "aadhaar_front"),
      ),
      aadhaar_back: await writeFileFromUpload(
        aadhaarBack,
        path.join(dir, "aadhaar_back"),
      ),
      voter_front: null,
      voter_back: null,
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
      path.join(dir, "declaration.json"),
      JSON.stringify(payload, null, 2),
      "utf8",
    );

    return NextResponse.json({
      ok: true,
      submissionId,
      relativePath: path.join("webcasting", "submissions", submissionId),
    });
  } catch (e) {
    console.error("web-casting-declaration save:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Failed to save declaration",
      },
      { status: 500 },
    );
  }
}
