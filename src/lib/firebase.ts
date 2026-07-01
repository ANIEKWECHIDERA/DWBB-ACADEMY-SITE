import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredFirebaseKeys = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId,
];

export const firebaseEnabled = requiredFirebaseKeys.every((value) => String(value || "").trim().length > 0);

let firebaseAuthInstance = null;
let firebaseInitializationError = "";

try {
  if (firebaseEnabled) {
    const app = initializeApp(firebaseConfig);
    firebaseAuthInstance = getAuth(app);
  } else {
    firebaseInitializationError = "Firebase web configuration is incomplete.";
  }
} catch (error) {
  firebaseInitializationError = error instanceof Error ? error.message : "Firebase could not be initialized.";
}

export const firebaseAuth = firebaseAuthInstance;
export const firebaseInitError = firebaseInitializationError;
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});
