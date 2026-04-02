"use client";

import React, { forwardRef } from "react";
import type { StoredWebCastingDeclaration } from "@/lib/webCastingStoredDeclaration";
import { webCastingFileUrl } from "@/lib/webCastingFileUrl";
import {
  ENGAGING_AGENCY_NAME,
  ZONAL_DESIGNATION,
} from "@/lib/webCastingDistrictAgency";

const DECL_LABEL_W = 130;

function DottedValueRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: multiline ? "flex-start" : "flex-end",
        marginBottom: "10px",
        fontSize: "11pt",
        lineHeight: 1.35,
        width: "100%",
        minWidth: 0,
      }}
    >
      <span
        style={{
          width: DECL_LABEL_W,
          flexShrink: 0,
          paddingRight: 12,
          wordBreak: "break-word",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          borderBottom: "1px dotted #000",
          textAlign: multiline ? "left" : "right",
          paddingBottom: "3px",
          paddingLeft: "8px",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
          whiteSpace: multiline ? "pre-line" : "normal",
        }}
      >
        {value || "\u00a0"}
      </div>
    </div>
  );
}

export type WebCastingDeclarationPdfDocumentProps = {
  data: StoredWebCastingDeclaration;
};

/**
 * A4-sized declaration block for PDF capture (html2canvas) — same layout as
 * saved-detail preview.
 */
const WebCastingDeclarationPdfDocument = forwardRef<
  HTMLDivElement,
  WebCastingDeclarationPdfDocumentProps
>(function WebCastingDeclarationPdfDocument({ data }, ref) {
  const f = data.form;
  const imgs = data.images;

  return (
    <div
      ref={ref}
      className="mx-auto bg-white text-black"
      style={{
        width: "794px",
        minWidth: "794px",
        minHeight: "1123px",
        padding: "68px 68px 76px",
        fontFamily: '"Times New Roman", Times, serif',
      }}
    >
      <h2 className="mb-3 text-center text-[13pt] font-bold underline">
        DECLARATION BY WEB CASTING AGENTS
      </h2>

      <p className="mb-3 text-[12pt] leading-relaxed">
        I,{" "}
        <span className="border-b border-dotted border-black px-1">{f.fullName}</span>
        , S/o / D/o{" "}
        <span className="border-b border-dotted border-black px-1">
          {f.fatherName}
        </span>
        , do hereby make a solemn declaration, in connection with the General
        Election to the Legislative Assembly of Assam, 2026, that:
      </p>

      <p className="mb-2 text-[12pt]">
        <b>A.</b> I am not a close relative of any contesting candidate/leading
        political functionary.
      </p>
      <p className="mb-5 text-[12pt]">
        <b>B.</b> No criminal case is pending against me in any court of law.
      </p>

      <div className="grid grid-cols-[174px_minmax(0,1fr)] gap-7">
        <div className="h-[212px] w-[174px] overflow-hidden border-2 border-black p-1">
          {imgs.passport ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={webCastingFileUrl(data.submissionId, imgs.passport)}
              alt="Passport photo"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-center text-xs">
              Passport Photo
            </div>
          )}
        </div>
        <div>
          <DottedValueRow label="Signature with date:" value="" />
          <DottedValueRow label="Name:" value={f.fullName} />
          <DottedValueRow label="Father's Name:" value={f.fatherName} />
          <DottedValueRow label="Mother's Name:" value={f.motherName} />
          <DottedValueRow label="Address:" value={f.address} />
          <DottedValueRow label="Village:" value={f.village} />
          <DottedValueRow
            label="District & assembly:"
            value={
              [f.district?.trim(), f.assembly?.trim()]
                .filter(Boolean)
                .join("\n") || ""
            }
            multiline
          />
          <DottedValueRow
            label="Polling Station:"
            value={f.pollingStation || ""}
          />
          <DottedValueRow label="PIN:" value={f.pin} />
          <DottedValueRow label="Mobile No:" value={f.phone || ""} />
          <DottedValueRow label="Aadhaar No:" value={f.aadhaarNumber || ""} />
        </div>
      </div>

      <hr className="my-6 border-0 border-t-2 border-black" />

      <p className="mb-3 text-[12pt] font-semibold underline">Engaging Agency:</p>
      <DottedValueRow
        label="Agency Name:"
        value={f.agencyName || ENGAGING_AGENCY_NAME}
      />
      <DottedValueRow label="Authorised Person Name:" value={f.authorisedPersonName} />
      <DottedValueRow
        label="Designation:"
        value={
          f.authorisedPersonName ? f.designation || ZONAL_DESIGNATION : ""
        }
      />
      <DottedValueRow label="Mobile No:" value={f.agencyMobile} />
    </div>
  );
});

export default WebCastingDeclarationPdfDocument;
