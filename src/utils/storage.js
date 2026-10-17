import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root video directory in backend
export const VIDEO_ROOT_DIR = path.resolve(__dirname, "../../video");

/**
 * Ensures student video snapshot directory exists
 * Path: video/:studentId/allvideo/
 */
export const ensureStudentVideoDir = (studentId) => {
  const safeStudentId = String(studentId).replace(/[^a-zA-Z0-9_-]/g, "");
  const targetDir = path.join(VIDEO_ROOT_DIR, safeStudentId, "allvideo");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return { targetDir, safeStudentId };
};

/**
 * Saves a base64 or buffer snapshot into video/:studentId/allvideo/
 */
export const saveStudentSnapshot = async (studentId, base64Data, eventType = "snapshot") => {
  try {
    const { targetDir, safeStudentId } = ensureStudentVideoDir(studentId);

    // Strip data:image/...;base64, prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    const filename = `${Date.now()}-${eventType.toLowerCase().replace(/[^a-z0-9]/g, "_")}.jpg`;
    const filePath = path.join(targetDir, filename);

    await fs.promises.writeFile(filePath, buffer);

    // Return URL path accessible via static express route
    const relativeUrl = `/video/${safeStudentId}/allvideo/${filename}`;
    return {
      success: true,
      filename,
      relativeUrl,
      filePath,
    };
  } catch (error) {
    console.error("Error saving student snapshot:", error);
    return { success: false, error: error.message };
  }
};
