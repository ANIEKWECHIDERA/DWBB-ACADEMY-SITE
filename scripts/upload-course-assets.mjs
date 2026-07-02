import dotenv from "dotenv";

import { digitalCourseCatalog } from "../server/course-catalog.mjs";
import { uploadCourseAsset } from "../server/cloudinary.mjs";
import { ensureManagedCoursesSeeded } from "../server/admin-store.mjs";
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured } from "../server/firebase-admin.mjs";

dotenv.config();

async function main() {
  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase Admin credentials are required to write uploaded asset records to courses.");
  }

  await ensureManagedCoursesSeeded();
  const firestore = getFirebaseAdminFirestore();

  if (!firestore) {
    throw new Error("Firestore is not available.");
  }

  for (const course of digitalCourseCatalog) {
    const uploadedAsset = await uploadCourseAsset({
      courseTitle: course.title,
      fileName: course.fileName,
      filePath: course.filePath,
    });

    await firestore.collection("courses").doc(course.slug).set(
      {
        assets: [uploadedAsset],
        updatedAt: new Date().toISOString(),
        updatedBy: "system:cloudinary-seed",
      },
      { merge: true },
    );

    console.log(`Uploaded ${course.fileName} -> ${uploadedAsset.publicId}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
