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
