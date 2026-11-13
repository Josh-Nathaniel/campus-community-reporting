/**
 * STORAGE & IMAGE CLIENT (storage.js)
 * Project: Campus Community Reporting System
 * Role: Handles client-side image compression and direct upload to Supabase Storage.
 */

// =============================================================================
// SUPABASE STORAGE CONFIGURATION
// To configure, paste your Supabase Project URL and Anon Key below,
// or configure them dynamically via localStorage.setItem("supabase_url", "...")
// =============================================================================
const SUPABASE_CONFIG = {
  url: (localStorage.getItem("supabase_url") || "https://hnnwuftffcqtmhadlyla.supabase.co").replace(/\/+$/, ""),
  anonKey: localStorage.getItem("supabase_anon_key") || "sb_publishable_feLdgSCYFWy5CTd-aKnkkg_IVavJfik",
  bucket: localStorage.getItem("supabase_bucket") || "report-photos"
};

/**
 * Checks whether active Supabase credentials have been configured.
 * @returns {boolean}
 */
function isSupabaseConfigured() {
  return (
    SUPABASE_CONFIG.url &&
    !SUPABASE_CONFIG.url.includes("YOUR_PROJECT_REF") &&
    SUPABASE_CONFIG.anonKey &&
    !SUPABASE_CONFIG.anonKey.includes("YOUR_SUPABASE_ANON_KEY")
  );
}

/**
 * Saves dynamic Supabase credentials (convenient for setup without touching code).
 * @param {string} url - Supabase Project URL (e.g., https://xyz.supabase.co)
 * @param {string} anonKey - Supabase public/anon API key
 * @param {string} [bucket] - Bucket name (defaults to 'report-photos')
 */
function setSupabaseCredentials(url, anonKey, bucket = "report-photos") {
  if (url) localStorage.setItem("supabase_url", url.trim().replace(/\/+$/, ""));
  if (anonKey) localStorage.setItem("supabase_anon_key", anonKey.trim());
  if (bucket) localStorage.setItem("supabase_bucket", bucket.trim());
  SUPABASE_CONFIG.url = (localStorage.getItem("supabase_url") || "").replace(/\/+$/, "");
  SUPABASE_CONFIG.anonKey = localStorage.getItem("supabase_anon_key") || "";
  SUPABASE_CONFIG.bucket = localStorage.getItem("supabase_bucket") || "report-photos";
}

/**
 * Compresses an image file on the client using HTML5 Canvas.
 * Scales down large photos to a max dimension of 1200px while maintaining aspect ratio,
 * outputting an optimized JPEG (~200KB - 400KB).
 * @param {File} file
 * @param {number} [maxWidth=1200]
 * @param {number} [maxHeight=1200]
 * @param {number} [quality=0.82]
 * @returns {Promise<Blob>}
 */
function compressImage(file, maxWidth = 1920, maxHeight = 1920, quality = 0.90) {
  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Please select a valid image file (JPG, PNG, WebP)."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image preview."));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportionate dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas compression failed."));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a Blob to a base64 DataURL (used as graceful fallback in Mock/Dev mode).
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads an image to Supabase Storage and returns its permanent public CDN URL.
 * If Supabase credentials are not configured yet, falls back to a DataURL for testing/demo.
 * @param {File|Blob} imageFileOrBlob
 * @param {string} [folder="reports"]
 * @returns {Promise<{success: boolean, url?: string, message?: string}>}
 */
async function uploadImageToStorage(imageFileOrBlob, folder = "reports") {
  if (!imageFileOrBlob) {
    return { success: false, message: "No image file provided." };
  }

  // Graceful fallback if credentials have not been configured yet
  if (!isSupabaseConfigured()) {
    console.warn("Supabase Storage is not configured yet. Using local DataURL fallback for demo testing.");
    try {
      const dataUrl = await blobToDataUrl(imageFileOrBlob);
      return {
        success: true,
        url: dataUrl,
        isFallback: true
      };
    } catch (err) {
      return { success: false, message: "Failed to read image locally: " + err.message };
    }
  }

  try {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const fileName = `${folder}/${timestamp}-${randomSuffix}.jpg`;

    const uploadEndpoint = `${SUPABASE_CONFIG.url}/storage/v1/object/${SUPABASE_CONFIG.bucket}/${fileName}`;

    const response = await fetch(uploadEndpoint, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_CONFIG.anonKey,
        "Authorization": `Bearer ${SUPABASE_CONFIG.anonKey}`,
        "Content-Type": "image/jpeg"
      },
      body: imageFileOrBlob
    });

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = `Upload failed (Status ${response.status})`;
      try {
        const errJson = JSON.parse(errText);
        errorMsg = errJson.message || errJson.error || errorMsg;
      } catch (e) {
        if (errText) errorMsg += `: ${errText}`;
      }
      return { success: false, message: errorMsg };
    }

    // Construct permanent public URL
    const publicUrl = `${SUPABASE_CONFIG.url}/storage/v1/object/public/${SUPABASE_CONFIG.bucket}/${fileName}`;
    return { success: true, url: publicUrl };
  } catch (error) {
    console.error("Supabase Upload Error:", error);
    return {
      success: false,
      message: `Failed to upload photo: ${error.message || "Network error"}`
    };
  }
}
