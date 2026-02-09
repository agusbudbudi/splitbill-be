/**
 * Compresses an image file using the browser's Canvas API.
 *
 * @param {File} file - The image file to compress.
 * @param {number} maxWidth - The maximum width of the output image. Defaults to 1200px.
 * @param {number} quality - The quality of the output image (0 to 1). Defaults to 0.8.
 * @returns {Promise<string>} - A promise that resolves to the base64 string of the compressed image.
 */
export const compressImage = (file, maxWidth = 1080, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64
        // Prefer webp if supported for better compression, otherwise jpeg
        const mimeType = file.type === "image/png" ? "image/jpeg" : file.type;
        // Force jpeg for pngs to ensure compression if transparency isn't critical,
        // or just stick to original type if we want to be safe about transparency.
        // For banners, usually we want good compression. Let's stick to jpeg for best compression of photos
        // or keep original type if it's not huge.
        // Let's us JPEG for everything to ensure size reduction, unless it's SVG (which shouldn't be here really)

        const outputType = "image/jpeg";

        const dataUrl = canvas.toDataURL(outputType, quality);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
