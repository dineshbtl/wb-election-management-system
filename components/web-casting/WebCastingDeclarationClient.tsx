"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import html2canvas from "html2canvas";
import {
  Button,
  Divider,
  Form,
  Input,
  Select,
  Spin,
  Steps,
  message,
  Typography,
} from "antd";
import type jsPDF from "jspdf";
import {
  ArrowLeftOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import {
  ENGAGING_AGENCY_NAME,
  ZONAL_DESIGNATION,
  resolveZonalContact,
} from "@/lib/webCastingDistrictAgency";
import type { WebCastingFormValues } from "@/lib/webCastingDeclarationTypes";
import {
  putWebCastingDeclaration,
  saveWebCastingDeclaration,
} from "@/lib/webCastingSave";
import { fetchWebCastingSubmissionDetail } from "@/lib/webCastingSubmissionDetail";
import { buildWebCastingSubmissionFiles } from "@/lib/webCastingSubmissionFiles";
import { compressImage } from "@/lib/compress-image";
import api from "@/lib/api";
import bpi from "@/lib/bpi";
import {
  SurveyStylePhotoCard,
  type SurveyStylePhotoSlot,
} from "@/components/web-casting/SurveyStylePhotoCard";
import { initialWebCastingPhotoDocs } from "@/components/web-casting/webCastingPhotoState";

const { TextArea } = Input;
const { Title, Text } = Typography;

const initialValues: Partial<WebCastingFormValues> = {
  fullName: "",
  fatherName: "",
  motherName: "",
  districtId: "",
  district: "",
  assembly: "",
  pollingStation: "",
  village: "",
  phone: "",
  aadhaarNumber: "",
  address: "",
  pin: "",
  agencyName: ENGAGING_AGENCY_NAME,
  authorisedPersonName: "",
  designation: "",
  agencyMobile: "",
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function dataUrlFormat(dataUrl: string): "JPEG" | "PNG" {
  return dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\u0900-\u0FFF\- ]+/g, "_").trim() || "declaration";
}

/**
 * Label column width (px). Must fit two labels + two values in the photo
 * block (~452px): 130+130 leaves ~192px for both value cells (~96px each).
 */
const DECL_LABEL_W = 130;

/**
 * Dotted label/value row. Flex + block value cell (reliable for html2canvas;
 * avoids grid/inline quirks that stacked digits or misaligned dots).
 */
function DottedValueRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  /** Allow line breaks in value (e.g. district + assembly). */
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

export default function WebCastingDeclarationClient({
  editSubmissionId,
}: {
  editSubmissionId?: string;
} = {}) {
  const [form] = Form.useForm<WebCastingFormValues>();
  const [step, setStep] = useState(0);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [saving, setSaving] = useState(false);

  /** Fixed order: passport, Aadhaar front/back, Voter front/back — matches PDF pages. */
  const [photoDocs, setPhotoDocs] = useState<SurveyStylePhotoSlot[]>(() =>
    initialWebCastingPhotoDocs(),
  );

  const updatePhotoFile = useCallback(
    async (index: number, file: File | null) => {
      if (!file) {
        setPhotoDocs((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], file: null };
          return next;
        });
        return;
      }
      setPhotoDocs((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], file: null, compressing: true };
        return next;
      });
      try {
        const compressed = await compressImage(file);
        setPhotoDocs((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], file: compressed, compressing: false };
          return next;
        });
      } catch {
        setPhotoDocs((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], file, compressing: false };
          return next;
        });
      }
    },
    [],
  );

  const previewUrls = useMemo(() => {
    const m = (s: SurveyStylePhotoSlot | undefined) =>
      s?.file ? URL.createObjectURL(s.file) : null;
    return {
      passportPhoto: m(photoDocs[0]),
      aadharFront: m(photoDocs[1]),
      aadharBack: m(photoDocs[2]),
      voterFront: m(photoDocs[3]),
      voterBack: m(photoDocs[4]),
    };
  }, [photoDocs]);

  const anyCompressing = useMemo(
    () => photoDocs.some((p) => p.compressing),
    [photoDocs],
  );

  React.useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((u) => {
        if (u) URL.revokeObjectURL(u);
      });
    };
  }, [previewUrls]);

  const pdfRef = useRef<HTMLDivElement>(null);
  const [previewValues, setPreviewValues] = useState<WebCastingFormValues | null>(
    null,
  );

  const [districtRows, setDistrictRows] = useState<
    { id: string; district_name: string; state?: string | null }[]
  >([]);
  const [loadingDistricts, setLoadingDistricts] = useState(true);

  const [assemblies, setAssemblies] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [booths, setBooths] = useState<
    { documentId: string; PS_Name: string; PS_No: string }[]
  >([]);
  const [loadingAssemblies, setLoadingAssemblies] = useState(false);
  const [loadingBooths, setLoadingBooths] = useState(false);

  const watchedDistrictId = Form.useWatch("districtId", form);
  const watchedAssemblyDocumentId = Form.useWatch(
    "assemblyDocumentId",
    form,
  );

  /** True after a successful save for the current preview — prevents duplicate POSTs. */
  const [declarationSaved, setDeclarationSaved] = useState(false);

  const [loadingEdit, setLoadingEdit] = useState(!!editSubmissionId);

  const districtRowById = useCallback(
    (districtId: string) =>
      districtRows.find((d) => d.id === districtId) ?? null,
    [districtRows],
  );

  const fetchAssembliesForDistrict = useCallback(
    async (districtId: string) => {
      if (!districtId) {
        setAssemblies([]);
        return;
      }
      setLoadingAssemblies(true);
      try {
        const res = await bpi.get(
          `/assemblies?filters[district][documentId][$eq]=${encodeURIComponent(districtId)}&sort=Assembly_Name:asc`,
        );
        const rows = (res.data.data || [])
          .map((a: { documentId?: string; Assembly_Name?: string }) => ({
            id: String(a.documentId ?? ""),
            name: String(a.Assembly_Name ?? ""),
          }))
          .filter((x: { id: string }) => x.id);
        setAssemblies(rows);
      } catch (e) {
        console.error(e);
        message.error("Could not load assemblies for this district.");
        setAssemblies([]);
      } finally {
        setLoadingAssemblies(false);
      }
    },
    [],
  );

  const fetchBoothsForAssembly = useCallback(
    async (assemblyDocumentId: string) => {
      if (!assemblyDocumentId) {
        setBooths([]);
        return;
      }
      setLoadingBooths(true);
      try {
        const res = await bpi.get(
          `/locations?filters[assembly][documentId][$eq]=${encodeURIComponent(assemblyDocumentId)}&sort=PS_Name:asc`,
        );
        const rows = (res.data.data || [])
          .map(
            (b: {
              documentId?: string;
              PS_Name?: string;
              PS_No?: string | number;
            }) => ({
              documentId: String(b.documentId ?? ""),
              PS_Name: String(b.PS_Name ?? ""),
              PS_No: String(b.PS_No ?? ""),
            }),
          )
          .filter((x: { documentId: string }) => x.documentId);
        setBooths(rows);
      } catch (e) {
        console.error(e);
        message.error("Could not load polling stations for this assembly.");
        setBooths([]);
      } finally {
        setLoadingBooths(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!editSubmissionId) return;
    let cancelled = false;
    (async () => {
      setLoadingEdit(true);
      try {
        const d = await fetchWebCastingSubmissionDetail(editSubmissionId);
        if (cancelled) return;
        form.setFieldsValue(d.form);
        const f = d.form;
        if (f.districtId) {
          await fetchAssembliesForDistrict(f.districtId);
          if (f.assemblyDocumentId) {
            await fetchBoothsForAssembly(f.assemblyDocumentId);
          }
        }
        const files = await buildWebCastingSubmissionFiles(d);
        await updatePhotoFile(0, files.passportPhoto);
        await updatePhotoFile(1, files.aadharFront);
        await updatePhotoFile(2, files.aadharBack);
        if (files.voterFront && files.voterBack) {
          await updatePhotoFile(3, files.voterFront);
          await updatePhotoFile(4, files.voterBack);
        } else {
          await updatePhotoFile(3, null);
          await updatePhotoFile(4, null);
        }
        setDeclarationSaved(false);
      } catch (e) {
        console.error(e);
        message.error("Could not load this declaration for editing.");
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    editSubmissionId,
    form,
    updatePhotoFile,
    fetchAssembliesForDistrict,
    fetchBoothsForAssembly,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDistricts(true);
      try {
        const res = await api.get("/districts?pagination[pageSize]=1000");
        const raw = res.data.data || [];
        const rows = raw
          .map((d: any) => ({
            id: String(d.documentId ?? d.id ?? ""),
            district_name: d.district_name as string,
            state: d.state as string | null | undefined,
          }))
          .filter((d: { id: string }) => d.id)
          .sort((a: { district_name: string }, b: { district_name: string }) =>
            a.district_name.localeCompare(b.district_name),
          );
        if (!cancelled) setDistrictRows(rows);
      } catch {
        if (!cancelled) {
          message.error("Could not load districts. Sign in if required.");
          setDistrictRows([]);
        }
      } finally {
        if (!cancelled) setLoadingDistricts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDistrictSelected = (districtId: string) => {
    const row = districtRowById(districtId);
    const districtName = row?.district_name ?? "";
    const zonal = resolveZonalContact(districtName);
    form.setFieldsValue({
      district: districtName,
      agencyName: ENGAGING_AGENCY_NAME,
      authorisedPersonName: zonal.authorisedPersonName,
      designation: zonal.authorisedPersonName ? ZONAL_DESIGNATION : "",
      agencyMobile: zonal.mobile,
    });
  };

  const clearAssemblyAndPollingFields = () => {
    form.setFieldsValue({
      assemblyDocumentId: undefined,
      assembly: "",
      pollingStationDocumentId: undefined,
      pollingStation: "",
    });
    setAssemblies([]);
    setBooths([]);
  };

  const goPreview = async () => {
    try {
      const v = await form.validateFields();
      const [p, af, ab, vfSlot, vbSlot] = photoDocs;
      if (!p?.file) {
        message.error("Please upload a passport-size photo for the certificate.");
        return;
      }
      if (!af?.file || !ab?.file) {
        message.error("Please upload Aadhaar (front and back).");
        return;
      }
      const vf = vfSlot?.file ?? null;
      const vb = vbSlot?.file ?? null;
      if ((vf && !vb) || (!vf && vb)) {
        message.error(
          "Voter ID images: upload both front and back, or leave both empty.",
        );
        return;
      }
      setPreviewValues(v as WebCastingFormValues);
      setDeclarationSaved(false);
      setStep(1);
    } catch {
      /* validation message shown by form */
    }
  };

  const addTwoIdImagesPage = async (
    pdf: jsPDF,
    topFile: File,
    bottomFile: File,
    labelTop: string,
    labelBottom: string,
  ) => {
    const margin = 10;
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const colW = pageW - 2 * margin;

    const dataTop = await fileToDataUrl(topFile);
    const dataBottom = await fileToDataUrl(bottomFile);
    const fmtTop = dataUrlFormat(dataTop);
    const fmtBottom = dataUrlFormat(dataBottom);

    const propsTop = pdf.getImageProperties(dataTop);
    const propsBottom = pdf.getImageProperties(dataBottom);

    const labelBlock = 14;
    const gap = 6;
    const available = pageH - margin * 2 - labelBlock * 2 - gap;
    const slotH = available / 2;

    let y = margin;

    pdf.setFontSize(10);
    pdf.text(labelTop, margin, y + 6);
    y += labelBlock;

    let drawW = colW;
    let drawH = (drawW * propsTop.height) / propsTop.width;
    if (drawH > slotH) {
      drawH = slotH;
      drawW = (drawH * propsTop.width) / propsTop.height;
    }
    const xOff = margin + (colW - drawW) / 2;
    pdf.addImage(dataTop, fmtTop, xOff, y, drawW, drawH);
    y += drawH + gap;

    pdf.text(labelBottom, margin, y + 6);
    y += labelBlock;

    let drawW2 = colW;
    let drawH2 = (drawW2 * propsBottom.height) / propsBottom.width;
    const room = pageH - margin - y;
    if (drawH2 > room) {
      drawH2 = room;
      drawW2 = (drawH2 * propsBottom.width) / propsBottom.height;
    }
    const xOff2 = margin + (colW - drawW2) / 2;
    pdf.addImage(dataBottom, fmtBottom, xOff2, y, drawW2, drawH2);
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current || !previewValues) return;
    const af = photoDocs[1]?.file;
    const ab = photoDocs[2]?.file;
    if (!af || !ab) {
      message.error("Missing Aadhaar images.");
      return;
    }
    const vf = photoDocs[3]?.file ?? null;
    const vb = photoDocs[4]?.file ?? null;
    if ((vf && !vb) || (!vf && vb)) {
      message.error(
        "Voter ID: upload both front and back, or clear both before downloading.",
      );
      return;
    }

    setLoadingPdf(true);
    try {
      const el = pdfRef.current;
      const w = Math.max(794, Math.ceil(el.offsetWidth || 794));
      const h = Math.ceil(el.scrollHeight || el.offsetHeight);
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: w,
        height: h,
        windowWidth: w,
        windowHeight: h,
        scrollX: 0,
        scrollY: 0,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);

      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(imgData);
      const ratio = imgProps.width / imgProps.height;
      let drawH = pdfW / ratio;
      let drawW = pdfW;
      if (drawH > pdfH - 20) {
        drawH = pdfH - 20;
        drawW = drawH * ratio;
      }
      const x0 = (pdfW - drawW) / 2;
      pdf.addImage(imgData, "JPEG", x0, 10, drawW, drawH);

      pdf.addPage();
      await addTwoIdImagesPage(
        pdf,
        af,
        ab,
        "Aadhaar — Front",
        "Aadhaar — Back",
      );

      if (vf && vb) {
        pdf.addPage();
        await addTwoIdImagesPage(
          pdf,
          vf,
          vb,
          "Voter ID — Front",
          "Voter ID — Back",
        );
      }

      pdf.save(`${sanitizeFilename(previewValues.fullName)}.pdf`);
      message.success("PDF downloaded.");
    } catch (e) {
      console.error(e);
      message.error("Failed to generate PDF.");
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleSaveDeclaration = async () => {
    if (!previewValues || declarationSaved) return;
    const af = photoDocs[1]?.file;
    const ab = photoDocs[2]?.file;
    if (!af || !ab) {
      message.error("Aadhaar front and back are required to save.");
      return;
    }
    const vf = photoDocs[3]?.file ?? null;
    const vb = photoDocs[4]?.file ?? null;
    if ((vf && !vb) || (!vf && vb)) {
      message.error("Voter ID: upload both sides or leave both empty.");
      return;
    }
    setSaving(true);
    try {
      if (editSubmissionId) {
        await putWebCastingDeclaration(editSubmissionId, previewValues, {
          passportPhoto: photoDocs[0]?.file ?? null,
          aadharFront: af,
          aadharBack: ab,
          voterFront: vf,
          voterBack: vb,
        });
        message.success("Declaration updated on server.");
      } else {
        const { submissionId } = await saveWebCastingDeclaration(previewValues, {
          passportPhoto: photoDocs[0]?.file ?? null,
          aadharFront: af,
          aadharBack: ab,
          voterFront: vf,
          voterBack: vb,
        });
        message.success(
          `Saved under webcasting/submissions/${submissionId}/ (declaration.json + images).`,
        );
      }
      setDeclarationSaved(true);
    } catch (e) {
      console.error(e);
      message.error(
        "Save failed. Ensure the app server can write under webcasting/submissions/ and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  /** Never call `form.getFieldsValue()` during render — it runs before <Form> mounts and triggers rc-field-form's "not connected" warning. */
  const display: WebCastingFormValues =
    previewValues ?? (initialValues as WebCastingFormValues);

  /**
   * A4 at ~96dpi: fixed 794×1123px so html2canvas always captures full width.
   * (210mm + maxWidth:100% was shrinking in the preview card → ultra-narrow PDF text.)
   */
  const declarationBlock = (
    <div
      ref={step === 1 ? pdfRef : undefined}
      className="bg-white text-black mx-auto box-border text-[12pt] leading-[1.35]"
      style={{
        width: "794px",
        minWidth: "794px",
        maxWidth: "794px",
        minHeight: "1123px",
        padding: "68px 68px 76px",
        boxSizing: "border-box",
        fontFamily: '"Times New Roman", Times, serif',
        WebkitFontSmoothing: "antialiased",
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: "100%",
          textAlign: "center",
          marginBottom: "20px",
        }}
      >
        <span
          style={{
            display: "inline-block",
            fontSize: "13pt",
            fontWeight: 700,
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "2px",
            textTransform: "uppercase",
            letterSpacing: "normal",
            lineHeight: 1.25,
            whiteSpace: "nowrap",
          }}
        >
          DECLARATION BY WEB CASTING AGENTS
        </span>
      </div>

      {/* Names on one line; legal sentence on the next = full inner width (no 40% spans eating the line). */}
      <div className="mb-3" style={{ fontSize: "12pt", lineHeight: 1.45 }}>
        <div style={{ marginBottom: "10px" }}>
          <span>I, </span>
          <span
            style={{
              display: "inline-block",
              minWidth: "200px",
              borderBottom: "1px dotted black",
              paddingBottom: "2px",
              paddingLeft: "4px",
              paddingRight: "4px",
              verticalAlign: "bottom",
            }}
          >
            {display.fullName || ""}
          </span>
          <span>, S/o / D/o </span>
          <span
            style={{
              display: "inline-block",
              minWidth: "200px",
              borderBottom: "1px dotted black",
              paddingBottom: "2px",
              paddingLeft: "4px",
              paddingRight: "4px",
              verticalAlign: "bottom",
            }}
          >
            {display.fatherName || ""}
          </span>
        </div>
        <p style={{ margin: 0, textAlign: "left" }}>
          do hereby make a solemn declaration, in connection with the General
          Election to the Legislative Assembly of Assam, 2026, that:
        </p>
      </div>

      <div className="mb-5 space-y-2" style={{ fontSize: "12pt", textAlign: "left" }}>
        <p style={{ margin: 0 }}>
          <span style={{ fontWeight: 600, marginRight: "4px" }}>A.</span>
          I am not a close relative of any of the contesting candidate/leading
          political functionary of the state/district in the aforesaid election.
        </p>
        <p style={{ margin: 0 }}>
          <span style={{ fontWeight: 600, marginRight: "4px" }}>B.</span>
          No criminal case is pending against me in any court of law.
        </p>
      </div>

      <div
        className="mt-2 w-full"
        style={{
          display: "grid",
          gridTemplateColumns: "174px minmax(0, 1fr)",
          columnGap: "32px",
          alignItems: "start",
          justifyContent: "start",
          width: "100%",
        }}
      >
        <div
          style={{
            width: "174px",
            height: "212px",
            flexShrink: 0,
            boxSizing: "border-box",
            border: "2px solid #000",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            overflow: "hidden",
            padding: "6px",
            fontSize: "9pt",
            lineHeight: 1.2,
          }}
        >
          {previewUrls.passportPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrls.passportPhoto}
              alt="Passport"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <span>
              Self-Attested Passport Photo Of the Web Casting Agent
            </span>
          )}
        </div>

        <div
          style={{
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
            paddingTop: "4px",
            paddingLeft: "8px",
            alignSelf: "start",
          }}
        >
          <DottedValueRow label="Signature with date:" value="" />
          <DottedValueRow label="Name:" value={display.fullName || ""} />
          <DottedValueRow
            label="Father's Name:"
            value={display.fatherName || ""}
          />
          <DottedValueRow
            label="Mother's Name:"
            value={display.motherName || ""}
          />
          <DottedValueRow label="Address:" value={display.address || ""} />
          <DottedValueRow label="Village:" value={display.village || ""} />
          <DottedValueRow
            label="District & assembly:"
            value={
              [display.district?.trim(), display.assembly?.trim()]
                .filter(Boolean)
                .join("\n") || ""
            }
            multiline
          />
          <DottedValueRow
            label="Polling Station:"
            value={display.pollingStation || ""}
          />
          <DottedValueRow label="PIN:" value={display.pin || ""} />
          <DottedValueRow label="Mobile No:" value={display.phone || ""} />
          <DottedValueRow label="Aadhaar No:" value={display.aadhaarNumber || ""} />
        </div>
      </div>

      <hr className="border-0 border-t-2 border-black my-6" />

      <div className="text-left">
        <p
          className="font-semibold underline mb-4"
          style={{ fontSize: "12pt" }}
        >
          Engaging Agency:
        </p>
        <DottedValueRow
          label="Agency Name:"
          value={display.agencyName || ENGAGING_AGENCY_NAME}
        />
        <DottedValueRow
          label="Authorised Person Name:"
          value={display.authorisedPersonName || ""}
        />
        <DottedValueRow
          label="Designation:"
          value={
            display.authorisedPersonName
              ? display.designation || ZONAL_DESIGNATION
              : ""
          }
        />
        <DottedValueRow
          label="Mobile No:"
          value={display.agencyMobile || ""}
        />
      </div>
    </div>
  );

  const includeVoterInPdf = Boolean(
    photoDocs[3]?.file && photoDocs[4]?.file,
  );

  if (loadingEdit) {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center px-4">
        <Spin size="large" tip="Loading declaration…" />
      </div>
    );
  }

  return (
    <div className="flex w-full justify-center px-0 sm:px-2 md:px-4">
      <div className="w-full max-w-4xl rounded-xl border border-gray-200 p-4 sm:p-6 md:p-8">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <Title level={3} className="!mb-0">
            {editSubmissionId
              ? "Edit declaration — Web Casting Agent"
              : "Declaration by Web Casting Agent"}
          </Title>
          <Link
            href="/web-casting-declarations"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 normal-case"
          >
            View saved list →
          </Link>
        </div>

        <Steps
          current={step}
          className="mb-8"
          items={[
            { title: "Details & ID uploads" },
            { title: "Preview & download PDF" },
          ]}
        />

        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          className={step === 0 ? "mb-6" : "!mb-0"}
          style={
            step === 1
              ? {
                  position: "fixed",
                  left: "-200vw",
                  top: 0,
                  width: 794,
                  maxWidth: "100vw",
                  visibility: "hidden",
                  pointerEvents: "none",
                  zIndex: -1,
                }
              : undefined
          }
          aria-hidden={step === 1}
        >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <Form.Item
                  name="fullName"
                  label="Full name"
                  rules={[{ required: true, message: "Enter full name" }]}
                >
                  <Input placeholder="As per ID" />
                </Form.Item>
                <Form.Item
                  name="fatherName"
                  label="Father's name"
                  rules={[{ required: true, message: "Enter father's name" }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item name="motherName" label="Mother's name">
                  <Input />
                </Form.Item>
                <Form.Item name="district" hidden>
                  <Input />
                </Form.Item>
                <Form.Item name="assembly" hidden>
                  <Input />
                </Form.Item>
                <Form.Item name="pollingStation" hidden>
                  <Input />
                </Form.Item>
                <Form.Item
                  name="districtId"
                  label="District"
                  rules={[{ required: true, message: "Select district" }]}
                >
                  <Select
                    showSearch
                    allowClear
                    loading={loadingDistricts}
                    placeholder="Select district"
                    optionFilterProp="label"
                    options={districtRows.map((d) => ({
                      value: d.id,
                      label: d.district_name,
                    }))}
                    onChange={(id) => {
                      if (!id) {
                        form.setFieldsValue({
                          district: "",
                          agencyName: ENGAGING_AGENCY_NAME,
                          authorisedPersonName: "",
                          designation: "",
                          agencyMobile: "",
                        });
                        clearAssemblyAndPollingFields();
                        return;
                      }
                      handleDistrictSelected(id);
                      form.setFieldsValue({
                        assemblyDocumentId: undefined,
                        assembly: "",
                        pollingStationDocumentId: undefined,
                        pollingStation: "",
                      });
                      setBooths([]);
                      void fetchAssembliesForDistrict(id);
                    }}
                    notFoundContent={
                      loadingDistricts ? <Spin size="small" /> : null
                    }
                  />
                </Form.Item>
                <Form.Item
                  name="assemblyDocumentId"
                  label="Assembly (LAC) — optional"
                  tooltip="List loads after you choose a district"
                >
                  <Select
                    showSearch
                    allowClear
                    loading={loadingAssemblies}
                    placeholder={
                      watchedDistrictId
                        ? "Select assembly"
                        : "Select district first"
                    }
                    disabled={!watchedDistrictId}
                    optionFilterProp="label"
                    options={assemblies.map((a) => ({
                      value: a.id,
                      label: a.name,
                    }))}
                    onChange={(id) => {
                      if (!id) {
                        form.setFieldsValue({
                          assembly: "",
                          pollingStationDocumentId: undefined,
                          pollingStation: "",
                        });
                        setBooths([]);
                        return;
                      }
                      const row = assemblies.find((x) => x.id === id);
                      form.setFieldsValue({
                        assembly: row?.name ?? "",
                        pollingStationDocumentId: undefined,
                        pollingStation: "",
                      });
                      void fetchBoothsForAssembly(id);
                    }}
                    notFoundContent={
                      loadingAssemblies ? <Spin size="small" /> : null
                    }
                  />
                </Form.Item>
                <Form.Item
                  name="pollingStationDocumentId"
                  label="Polling station — optional"
                  tooltip="List loads after you choose an assembly"
                >
                  <Select
                    showSearch
                    allowClear
                    loading={loadingBooths}
                    placeholder={
                      watchedAssemblyDocumentId
                        ? "Select polling station (name / PS No.)"
                        : "Select assembly first"
                    }
                    disabled={!watchedAssemblyDocumentId}
                    optionFilterProp="label"
                    options={booths.map((b) => ({
                      value: b.documentId,
                      label: `${b.PS_Name} (PS No: ${b.PS_No})`,
                    }))}
                    onChange={(id) => {
                      if (!id) {
                        form.setFieldsValue({ pollingStation: "" });
                        return;
                      }
                      const b = booths.find((x) => x.documentId === id);
                      form.setFieldsValue({
                        pollingStation: b
                          ? `${b.PS_Name} (PS No: ${b.PS_No})`
                          : "",
                      });
                    }}
                    notFoundContent={
                      loadingBooths ? <Spin size="small" /> : null
                    }
                  />
                </Form.Item>
                <div className="sm:col-span-2 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                  <Form.Item
                    name="village"
                    label="Village"
                    tooltip="Enter after location, or if not listed above"
                  >
                    <Input placeholder="Village name" />
                  </Form.Item>
                  <Form.Item
                    name="pin"
                    label="PIN"
                    rules={[{ required: true, message: "Enter PIN" }]}
                  >
                    <Input inputMode="numeric" placeholder="PIN code" />
                  </Form.Item>
                </div>
                <div className="sm:col-span-2 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                  <Form.Item
                    name="phone"
                    label="Mobile No"
                    normalize={(v) =>
                      v == null ? "" : String(v).replace(/\D/g, "").slice(0, 10)
                    }
                    rules={[
                      { required: true, message: "Enter mobile number" },
                      {
                        validator: (_, val) => {
                          const s = val == null ? "" : String(val);
                          if (s.length !== 10) {
                            return Promise.reject(
                              new Error("Enter exactly 10 digits"),
                            );
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="aadhaarNumber"
                    label="Aadhaar number"
                    normalize={(v) =>
                      v == null ? "" : String(v).replace(/\D/g, "").slice(0, 12)
                    }
                    rules={[
                      { required: true, message: "Enter Aadhaar number" },
                      {
                        validator: (_, val) => {
                          const s = val == null ? "" : String(val);
                          if (s.length !== 12) {
                            return Promise.reject(
                              new Error("Enter all 12 digits of Aadhaar"),
                            );
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Input
                      inputMode="numeric"
                      placeholder="12-digit Aadhaar"
                      maxLength={12}
                      autoComplete="off"
                    />
                  </Form.Item>
                </div>
              </div>

              <Form.Item
                name="address"
                label="Address"
                rules={[{ required: true, message: "Enter address" }]}
              >
                <TextArea rows={3} placeholder="Full address" />
              </Form.Item>

              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 mb-4">
                <Text strong className="block mb-3">
                  Engaging Agency (auto-filled from district)
                </Text>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Form.Item name="agencyName" label="Agency Name">
                    <Input
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                    />
                  </Form.Item>
                  <Form.Item
                    name="authorisedPersonName"
                    label="Authorised Person Name"
                  >
                    <Input
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                      placeholder="Select district"
                    />
                  </Form.Item>
                  <Form.Item name="designation" label="Designation">
                    <Input
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                      placeholder="—"
                    />
                  </Form.Item>
                  <Form.Item name="agencyMobile" label="Mobile No">
                    <Input
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                      placeholder="—"
                    />
                  </Form.Item>
                </div>
              </div>

            <div className="mb-6 space-y-5 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
              <div>
                <Text strong className="block mb-1">
                  Photo documentation
                </Text>
                <Text type="secondary" className="text-xs">
                  Passport (certificate), Aadhaar (required), Voter ID (optional —
                  both sides together). Images are compressed before upload.
                </Text>
              </div>

              <div>
                <Text strong className="block mb-3">
                  1) Passport-size photo
                </Text>
                <SurveyStylePhotoCard
                  inputId="wc-passport"
                  heading="Passport-size photo (for certificate)"
                  slot={photoDocs[0]}
                  onFileChange={(file) =>
                    file && updatePhotoFile(0, file)
                  }
                />
              </div>

              <div className="space-y-4 rounded-lg border border-sky-200 bg-white p-4 md:p-5">
                <Text strong className="block text-sky-900">
                  2) Aadhaar — required
                </Text>
                <SurveyStylePhotoCard
                  inputId="wc-aadhaar-front"
                  heading="Front"
                  slot={photoDocs[1]}
                  onFileChange={(file) =>
                    file && updatePhotoFile(1, file)
                  }
                />
                <SurveyStylePhotoCard
                  inputId="wc-aadhaar-back"
                  heading="Back"
                  slot={photoDocs[2]}
                  onFileChange={(file) =>
                    file && updatePhotoFile(2, file)
                  }
                />
              </div>

              <Divider className="my-2 border-gray-300">
                <span className="text-gray-500 text-xs px-2">
                  Voter ID (optional)
                </span>
              </Divider>

              <div className="space-y-4 rounded-lg border border-amber-200 bg-white p-4 md:p-5">
                <Text strong className="block text-amber-900">
                  3) Voter ID — optional (both sides or neither)
                </Text>
                <SurveyStylePhotoCard
                  inputId="wc-voter-front"
                  heading="Front"
                  slot={photoDocs[3]}
                  onFileChange={(file) =>
                    file && updatePhotoFile(3, file)
                  }
                />
                <SurveyStylePhotoCard
                  inputId="wc-voter-back"
                  heading="Back"
                  slot={photoDocs[4]}
                  onFileChange={(file) =>
                    file && updatePhotoFile(4, file)
                  }
                />
              </div>
            </div>

            <Button
              type="primary"
              size="large"
              onClick={goPreview}
              disabled={anyCompressing}
            >
              Preview declaration
            </Button>
        </Form>

        {step === 1 && previewValues && (
          <>
            <div className="flex flex-wrap gap-3 mb-6">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => {
                  setDeclarationSaved(false);
                  setStep(0);
                }}
              >
                Edit details
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                loading={loadingPdf}
                onClick={handleDownloadPdf}
                className="bg-green-600 hover:bg-green-700"
              >
                Download PDF
              </Button>
              <Button
                icon={<CloudUploadOutlined />}
                loading={saving}
                disabled={declarationSaved}
                onClick={handleSaveDeclaration}
                title={
                  declarationSaved
                    ? "This preview was already saved. Use Edit details to change and save a new copy."
                    : undefined
                }
              >
                {declarationSaved ? "Saved to server" : "Save to server"}
              </Button>
            </div>

            <div className="overflow-x-auto">{declarationBlock}</div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <Text strong className="block mb-4">
                PDF: page 1 — declaration; page 2 — Aadhaar (front and back).
                {includeVoterInPdf
                  ? " Page 3 — Voter ID (front and back)."
                  : " Upload both Voter ID images to add page 3."}
              </Text>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  ["Aadhaar — Front", previewUrls.aadharFront],
                  ["Aadhaar — Back", previewUrls.aadharBack],
                  ["Voter ID — Front", previewUrls.voterFront],
                  ["Voter ID — Back", previewUrls.voterBack],
                ].map(([label, url]) => (
                  <div
                    key={label as string}
                    className="border rounded-lg overflow-hidden bg-white"
                  >
                    <div className="bg-gray-100 px-2 py-1 text-sm font-medium">
                      {label}
                    </div>
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={label as string}
                        className="h-52 w-full object-contain bg-white"
                      />
                    ) : (
                      <div className="p-4 text-gray-400 text-sm">No file</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
