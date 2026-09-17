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

        // JPEG has no alpha channel — encoding a transparent image as JPEG
        // flattens transparent pixels to black. Detect real transparency
        // (not just MIME type) so opaque PNGs still get JPEG's compression,
        // and only images that actually use alpha keep lossless PNG output.
        const { data } = ctx.getImageData(0, 0, width, height);
        let hasTransparency = false;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            hasTransparency = true;
            break;
          }
        }
        const outputType = hasTransparency ? "image/png" : "image/jpeg";

        const dataUrl = canvas.toDataURL(outputType, quality);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
