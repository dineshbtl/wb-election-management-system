import { createRef } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import html2canvas from "html2canvas";
import WebCastingDeclarationPdfDocument from "@/components/web-casting/WebCastingDeclarationPdfDocument";
import { fetchWebCastingSubmissionDetail } from "@/lib/webCastingSubmissionDetail";
import { buildWebCastingSubmissionFiles } from "@/lib/webCastingSubmissionFiles";
import {
  addTwoIdImagesPage,
  sanitizeFilename,
} from "@/lib/webCastingPdfHelpers";

/**
 * Downloads the same multi-page PDF as the detail page (declaration + ID images).
 */
export async function downloadWebCastingDeclarationPdf(
  submissionId: string,
): Promise<void> {
  const data = await fetchWebCastingSubmissionDetail(submissionId);

  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:-10000px;top:0;width:794px;z-index:-1;pointer-events:none;";
  document.body.appendChild(container);

  const root = createRoot(container);
  const surfaceRef = createRef<HTMLDivElement>();

  try {
    flushSync(() => {
      root.render(
        <WebCastingDeclarationPdfDocument ref={surfaceRef} data={data} />,
      );
    });

    const el = surfaceRef.current;
    if (!el) {
      throw new Error("Declaration surface not mounted");
    }

    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    );

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

    const files = await buildWebCastingSubmissionFiles(data);
    pdf.addPage();
    await addTwoIdImagesPage(
      pdf,
      files.aadharFront,
      files.aadharBack,
      "Aadhaar — Front",
      "Aadhaar — Back",
    );

    if (files.voterFront && files.voterBack) {
      pdf.addPage();
      await addTwoIdImagesPage(
        pdf,
        files.voterFront,
        files.voterBack,
        "Voter ID — Front",
        "Voter ID — Back",
      );
    }

    pdf.save(`${sanitizeFilename(data.form.fullName)}.pdf`);
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}
