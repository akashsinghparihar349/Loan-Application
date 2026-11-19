/**
 * Client-Side Image Compression using Canvas API as per Section C4
 */

/**
 * Compresses an image file (JPEG/PNG) to max width 1200px and fits under 2MB.
 * @param {File} file - Original image file
 * @param {Object} options
 * @param {number} [options.maxWidth=1200] - Max width
 * @param {number} [options.maxSizeBytes=2 * 1024 * 1024] - 2MB limit
 * @param {number} [options.initialQuality=0.7] - 70% quality
 * @returns {Promise<{ compressedFile: File, originalSize: number, compressedSize: number, compressionRatio: number, previewUrl: string }>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1200,
    maxSizeBytes = 2 * 1024 * 1024,
    initialQuality = 0.7,
  } = options;

  // Only compress images, bypass for PDFs
  if (!file.type.startsWith('image/')) {
    return {
      compressedFile: file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 0,
      previewUrl: '',
    };
  }

  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      // Compute target dimensions (maintain aspect ratio)
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          compressedFile: file,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 0,
          previewUrl: '',
        });
        return;
      }

      // Draw onto canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Recursive compression until size is under maxSizeBytes or quality hits 0.3
      const attemptCompression = (quality) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({
                compressedFile: file,
                originalSize,
                compressedSize: originalSize,
                compressionRatio: 0,
                previewUrl: '',
              });
              return;
            }

            if (blob.size > maxSizeBytes && quality > 0.3) {
              // Recursively reduce quality by 0.1
              attemptCompression(Math.max(0.3, +(quality - 0.1).toFixed(1)));
            } else {
              const compressedFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
              const compressedFile = new File([blob], compressedFileName, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });

              const previewUrl = URL.createObjectURL(blob);
              const compressedSize = blob.size;
              const savedBytes = Math.max(0, originalSize - compressedSize);
              const compressionRatio = Math.round((savedBytes / originalSize) * 100);

              resolve({
                compressedFile,
                originalSize,
                compressedSize,
                compressionRatio,
                previewUrl,
              });
            }
          },
          'image/jpeg',
          quality
        );
      };

      attemptCompression(initialQuality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = objectUrl;
  });
}

/**
 * Converts File or Blob to Base64 string for persistent storage or recovery
 * @param {File|Blob} file
 * @returns {Promise<string>}
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Formats byte size into human readable string (KB / MB)
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
