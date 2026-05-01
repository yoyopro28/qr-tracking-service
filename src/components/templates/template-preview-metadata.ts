export type PreviewMetadata = {
  pageCount: number;
  width: number | null;
  height: number | null;
};

export const DEFAULT_PAGE_WIDTH = 595;
export const DEFAULT_PAGE_HEIGHT = 842;

export function parsePdfMetadata(buffer: ArrayBuffer): PreviewMetadata {
  const pdfText = new TextDecoder("latin1").decode(buffer);
  const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);
  const mediaBoxMatch = pdfText.match(
    /\/MediaBox\s*\[\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\]/,
  );

  if (!mediaBoxMatch) {
    return {
      pageCount: Math.max(pageMatches?.length ?? 0, 1),
      width: null,
      height: null,
    };
  }

  const [, x1, y1, x2, y2] = mediaBoxMatch;
  const width = Number(x2) - Number(x1);
  const height = Number(y2) - Number(y1);

  return {
    pageCount: Math.max(pageMatches?.length ?? 0, 1),
    width: Number.isFinite(width) && width > 0 ? width : null,
    height: Number.isFinite(height) && height > 0 ? height : null,
  };
}
