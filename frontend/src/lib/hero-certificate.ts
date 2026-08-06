import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type HeroCertificateDetails = {
  certificateNumber: string;
  donorName: string;
  donorWalletAddress?: string | null;
  issuedAt: Date;
};

function pdfSafe(value: string) {
  return value.replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
}

function centeredX(text: string, font: { widthOfTextAtSize: (value: string, size: number) => number }, size: number, width: number) {
  return (width - font.widthOfTextAtSize(text, size)) / 2;
}

export async function generateHeroCertificatePdf({
  certificateNumber,
  donorName,
  donorWalletAddress,
  issuedAt,
}: HeroCertificateDetails) {
  const document = await PDFDocument.create();
  const page = document.addPage([842, 595]);
  const width = page.getWidth();
  const height = page.getHeight();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const italic = await document.embedFont(StandardFonts.HelveticaOblique);
  const orange = rgb(0.93, 0.36, 0.1);
  const violet = rgb(0.42, 0.24, 0.72);
  const ink = rgb(0.12, 0.1, 0.08);

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 0.98, 0.93) });
  page.drawRectangle({ x: 22, y: 22, width: width - 44, height: height - 44, borderColor: orange, borderWidth: 4 });
  page.drawRectangle({ x: 32, y: 32, width: width - 64, height: height - 64, borderColor: rgb(0.96, 0.73, 0.44), borderWidth: 1 });

  page.drawText("PAWCHAIN VERIFIED", {
    x: 170,
    y: 205,
    size: 58,
    font: bold,
    color: violet,
    rotate: degrees(28),
    opacity: 0.07,
  });

  try {
    const logoBytes = await readFile(join(process.cwd(), "public", "images", "logo.png"));
    const logo = await document.embedPng(logoBytes);
    page.drawImage(logo, { x: 48, y: 462, width: 88, height: 88 });
  } catch {
    // The certificate remains valid if the optional brand asset is unavailable.
  }

  page.drawText("PAWCHAIN", { x: centeredX("PAWCHAIN", bold, 20, width), y: 525, size: 20, font: bold, color: orange });
  page.drawText("CERTIFICATE OF RECOGNITION", { x: centeredX("CERTIFICATE OF RECOGNITION", bold, 30, width), y: 470, size: 30, font: bold, color: ink });
  page.drawText("This certificate is proudly presented to", { x: centeredX("This certificate is proudly presented to", regular, 15, width), y: 430, size: 15, font: regular, color: rgb(0.35, 0.31, 0.28) });

  const safeName = pdfSafe(donorName) || "Hero Donor";
  const nameSize = safeName.length > 35 ? 27 : 36;
  page.drawText(safeName, { x: centeredX(safeName, bold, nameSize, width), y: 370, size: nameSize, font: bold, color: violet });
  page.drawLine({ start: { x: 190, y: 355 }, end: { x: width - 190, y: 355 }, thickness: 1.5, color: rgb(0.78, 0.65, 0.42) });

  page.drawText("for achieving the highest PawChain donor distinction", { x: centeredX("for achieving the highest PawChain donor distinction", regular, 15, width), y: 320, size: 15, font: regular, color: ink });

  page.drawText("HERO DONOR", { x: centeredX("HERO DONOR", bold, 28, width), y: 245, size: 28, font: bold, color: violet });
  page.drawLine({ start: { x: 330, y: 229 }, end: { x: width - 330, y: 229 }, thickness: 2, color: rgb(0.95, 0.67, 0.22) });
  page.drawText("With gratitude for exceptional generosity and continued support for animal shelters.", { x: centeredX("With gratitude for exceptional generosity and continued support for animal shelters.", italic, 12, width), y: 194, size: 12, font: italic, color: rgb(0.35, 0.31, 0.28) });

  const issued = new Intl.DateTimeFormat("en-MY", { dateStyle: "long", timeZone: "Asia/Kuala_Lumpur" }).format(issuedAt);
  page.drawText(`Issued: ${issued}`, { x: 72, y: 76, size: 10, font: regular, color: ink });
  page.drawText(`Certificate: ${pdfSafe(certificateNumber)}`, { x: 72, y: 58, size: 9, font: regular, color: rgb(0.4, 0.36, 0.32) });
  if (donorWalletAddress) {
    page.drawText(`Wallet: ${pdfSafe(donorWalletAddress)}`, { x: width - 370, y: 76, size: 8, font: regular, color: rgb(0.4, 0.36, 0.32) });
  }
  page.drawText("PawChain Administration", { x: width - 255, y: 58, size: 10, font: bold, color: ink });

  document.setTitle(`PawChain Hero Donor Certificate - ${safeName}`);
  document.setAuthor("PawChain Administration");
  document.setSubject("Hero Donor recognition certificate");
  return Buffer.from(await document.save());
}
