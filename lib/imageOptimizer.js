import sharp from "sharp";

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 75;

/**
 * Re-encodes a receipt photo as compressed WebP: auto-orients from EXIF
 * (then strips it), downscales to fit within MAX_DIMENSION, no upscaling.
 */
export async function optimizeReceiptImage(inputBuffer) {
  const { data, info } = await sharp(inputBuffer, { failOn: "none" })
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    width: info.width,
    height: info.height,
    mimeType: "image/webp",
  };
}

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const OG_JPEG_QUALITY = 85;

/**
 * Social share (Open Graph) image: center-cropped to exactly 1200×630 and
 * encoded as JPEG — WebP previews are still unreliable on some crawlers
 * (WhatsApp, LinkedIn, older Facebook scrapers). Transparency is flattened
 * onto white since JPEG has no alpha.
 */
export async function optimizeOgImage(inputBuffer) {
  const { data, info } = await sharp(inputBuffer, { failOn: "none" })
    .rotate()
    .resize({ width: OG_WIDTH, height: OG_HEIGHT, fit: "cover", position: "attention" })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: OG_JPEG_QUALITY, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    width: info.width,
    height: info.height,
    mimeType: "image/jpeg",
  };
}

const LANDING_MAX_DIMENSION = 2000;
const LANDING_WEBP_QUALITY = 82;

/**
 * Re-encodes a landing page image as WebP. Higher ceiling and quality than
 * receipts since these are marketing visuals (hero/LCP image); WebP keeps the
 * alpha channel, so transparent mockups stay transparent.
 */
export async function optimizeLandingImage(inputBuffer) {
  const { data, info } = await sharp(inputBuffer, { failOn: "none" })
    .rotate()
    .resize({
      width: LANDING_MAX_DIMENSION,
      height: LANDING_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: LANDING_WEBP_QUALITY, alphaQuality: 90 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    width: info.width,
    height: info.height,
    mimeType: "image/webp",
  };
}
