// Initialisation Firebase pour le site SGES.
// Renseigne les variables d'environnement NEXT_PUBLIC_FIREBASE_* (voir .env.local.example).

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// getApps() évite de réinitialiser l'app lors du hot-reload de Next.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics : uniquement côté navigateur (window requis) et si l'environnement
// le supporte, pour ne pas casser le rendu serveur de Next.
export const analyticsPromise =
  typeof window !== 'undefined'
    ? isSupported().then((supported) => (supported ? getAnalytics(app) : null))
    : Promise.resolve(null);
