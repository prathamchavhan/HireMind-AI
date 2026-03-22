import { initializeApp, getApps, FirebaseOptions, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
    apiKey:
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
        process.env.FIREBASE_API_KEY,
    authDomain:
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
        process.env.FIREBASE_AUTH_DOMAIN,
    projectId:
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        process.env.FIREBASE_PROJECT_ID,
    storageBucket:
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId:
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
        process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId:
        process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
        process.env.FIREBASE_APP_ID,
    measurementId:
        process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
        process.env.FIREBASE_MEASUREMENT_ID,
};

// Avoid re-initializing Firebase on Next.js hot-reloads
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db: Firestore = getFirestore(app);

export default app;
