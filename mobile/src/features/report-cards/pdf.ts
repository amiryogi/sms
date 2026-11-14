import { Directory, File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { ReportCard } from "@/types/api";
import { resolveAssetUrl } from "@/utils/assets";
import { reportCardHtml } from "./html/document";

/** A4 at 72 points per inch (expo-print's default is US Letter). */
const A4 = { width: 595, height: 842 };
/** 8 mm, the web's @page margin, in points (iOS takes margins as an option). */
const MARGIN = 23;

const MIME_BY_EXT: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml" };

/**
 * The school logo as a data: URI. Print renderers can't load local files on
 * iOS and remote images aren't reliable, so the PDF gets the bytes inline.
 * No logo (or no connection) prints no logo, as the web does.
 */
export const logoDataUri = async (logoUrl: string | null | undefined): Promise<string | null> => {
  const url = resolveAssetUrl(logoUrl);
  if (!url) return null;
  const dir = new Directory(Paths.cache, `rc-logo-${Date.now()}`);
  try {
    dir.create();
    const file = await File.downloadFileAsync(url, dir);
    const ext = (file.uri.split(".").pop() ?? "").toLowerCase();
    const mime = MIME_BY_EXT[ext] ?? "image/png";
    return `data:${mime};base64,${await file.base64()}`;
  } catch {
    return null;
  } finally {
    try {
      dir.delete();
    } catch {
      // cache is cleaned by the system anyway
    }
  }
};

/** Every PDF this app makes starts with this, so sign-out can find and delete them. */
const PDF_PREFIX = "Report card - ";

const fileNameFor = (card: ReportCard) =>
  `${PDF_PREFIX}${card.student.name} - ${card.examination.name}`.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();

/** Render the card to a PDF file in the cache, named after the student and exam. */
export const reportCardPdf = async (card: ReportCard): Promise<string> => {
  const html = reportCardHtml(card, { logoSrc: await logoDataUri(card.school.logoUrl ?? card.school.bannerUrl) });
  const { uri } = await Print.printToFileAsync({
    html,
    ...A4,
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
  });
  // Give the file a readable name for the share sheet.
  const named = new File(Paths.cache, `${fileNameFor(card)}.pdf`);
  try {
    if (named.exists) named.delete();
    new File(uri).move(named);
    return named.uri;
  } catch {
    return uri;
  }
};


/** Delete report-card PDFs this app made (sign-out: they name the student). */
export const clearGeneratedPdfs = () => {
  try {
    for (const entry of Paths.cache.list()) {
      if (entry instanceof File && entry.name.startsWith(PDF_PREFIX) && entry.name.endsWith(".pdf")) entry.delete();
    }
  } catch {
    // nothing to clean, or the cache is unavailable
  }
};

/** Share (save, send on WhatsApp/Viber, email…) the card as a PDF. */
export const shareReportCard = async (card: ReportCard) => {
  const uri = await reportCardPdf(card);
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this phone.");
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Share report card" });
};

/** Open the system print dialog for the card. */
export const printReportCard = async (card: ReportCard) => {
  const html = reportCardHtml(card, { logoSrc: await logoDataUri(card.school.logoUrl ?? card.school.bannerUrl) });
  await Print.printAsync({ html, ...A4 });
};
