import sharp from "sharp";
import { HttpError } from "./errors.js";

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
  await assertLandingInput(inputBuffer);
  const { data, info } = await sharp(inputBuffer, LANDING_SHARP_OPTIONS)
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

const LANDING_FORMATS = ["jpeg", "png", "webp"];
// ~50MP decodes to ~200MB of raw pixels; sharp's default (~268MP) lets a small,
// highly compressible PNG blow past the function's memory
const LANDING_MAX_INPUT_PIXELS = 50_000_000;
const LANDING_SHARP_OPTIONS = { failOn: "none", limitInputPixels: LANDING_MAX_INPUT_PIXELS };

/**
 * The upload's mime_type is only a client claim: check the decoded format and
 * pixel count before encoding, since sharp also reads GIF/TIFF/SVG/HEIF.
 */
async function assertLandingInput(inputBuffer) {
  const { format, width = 0, height = 0 } = await sharp(inputBuffer, LANDING_SHARP_OPTIONS).metadata();
  if (!LANDING_FORMATS.includes(format)) {
    throw new HttpError(400, "Format gambar harus JPG, PNG, atau WebP");
  }
  if (width * height > LANDING_MAX_INPUT_PIXELS) {
    throw new HttpError(400, "Resolusi gambar terlalu besar (maks ±50 megapiksel)");
  }
}

const LANDING_MAX_DIMENSION = 2000;
const LANDING_WEBP_QUALITY = 82;

/**
 * Re-encodes a landing page image as WebP. Higher ceiling and quality than
 * receipts since these are marketing visuals (hero/LCP image); WebP keeps the
 * alpha channel, so transparent mockups stay transparent.
 */
export async function optimizeLandingImage(inputBuffer) {
  await assertLandingInput(inputBuffer);
  const { data, info } = await sharp(inputBuffer, LANDING_SHARP_OPTIONS)
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
