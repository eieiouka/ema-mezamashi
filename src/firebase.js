import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD1SsEXbl1ehfn9I3Jt8wIgUdpaFQd5WWo",
  authDomain: "ema-mezamashi.firebaseapp.com",
  projectId: "ema-mezamashi",
  storageBucket: "ema-mezamashi.firebasestorage.app",
  messagingSenderId: "838486684898",
  appId: "1:838486684898:web:516c332f70727259881abb",
  measurementId: "G-Y3FV2T4R94",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);