import { v2 as cloudinary } from "cloudinary";
import path from "node:path";

function isCloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function configureCloudinary() {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured.");
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export async function destroyCloudinaryAssets(publicIds = []) {
  if (!isCloudinaryConfigured() || publicIds.length === 0) {
    return;
  }

  configureCloudinary();

  await Promise.all(
    publicIds
      .filter(Boolean)
      .map((publicId) =>
        cloudinary.uploader.destroy(publicId, {
          invalidate: true,
          resource_type: "image",
        }),
      ),
  );
}

function sanitizeFolderSegment(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function ensureFileExtension(fileName, format) {
  const trimmedName = String(fileName || "").trim();
  const trimmedFormat = String(format || "").trim().replace(/^\./, "");

  if (!trimmedName) {
    return trimmedFormat ? `dwbb-course-materials.${trimmedFormat}` : "dwbb-course-materials";
  }

  if (!trimmedFormat || path.extname(trimmedName)) {
    return trimmedName;
  }

  return `${trimmedName}.${trimmedFormat}`;
}

export async function uploadCourseAsset({ courseTitle, filePath, fileName, dataUri }) {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured.");
  }

  configureCloudinary();

  const uploadSource = dataUri || filePath;
  if (!uploadSource) {
    throw new Error("A file path or data URI is required for Cloudinary upload.");
  }

  const uploadResult = await cloudinary.uploader.upload(uploadSource, {
    asset_folder: `DWBB_ACADEMY/${sanitizeFolderSegment(courseTitle)}`,
    display_name: fileName,
    filename_override: fileName,
    overwrite: true,
    public_id: path.parse(fileName).name,
    resource_type: "raw",
    use_filename: true,
  });

  const format = uploadResult.format || path.parse(fileName).ext.replace(/^\./, "") || "txt";
  const normalizedFileName = ensureFileExtension(fileName, format);

  return {
    bytes: uploadResult.bytes || null,
    fileName: normalizedFileName,
    format,
    originalFilename: uploadResult.original_filename || path.parse(fileName).name,
    publicId: uploadResult.public_id,
    resourceType: uploadResult.resource_type || "raw",
    url: uploadResult.secure_url,
  };
}
