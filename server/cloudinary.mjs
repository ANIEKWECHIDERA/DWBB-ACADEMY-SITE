import { v2 as cloudinary } from "cloudinary";

function isCloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export async function destroyCloudinaryAssets(publicIds = []) {
  if (!isCloudinaryConfigured() || publicIds.length === 0) {
    return;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

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
