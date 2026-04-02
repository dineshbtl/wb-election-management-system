import type jsPDF from "jspdf";

export function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\u0900-\u0FFF\- ]+/g, "_").trim() || "declaration";
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function dataUrlFormat(dataUrl: string): "JPEG" | "PNG" {
  return dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
}

export async function addTwoIdImagesPage(
  pdf: jsPDF,
  topFile: File,
  bottomFile: File,
  labelTop: string,
  labelBottom: string,
): Promise<void> {
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
}
