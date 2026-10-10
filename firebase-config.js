// Firebase Modular SDK v10/v11 Configuration (ESM via CDN for plain browser JS)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Your verified web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCC8sdNJmcxuKjN9LfPRs_zXZ4hS5Z5wlw",
  authDomain: "medicare-pulse.firebaseapp.com",
  projectId: "medicare-pulse",
  storageBucket: "medicare-pulse.firebasestorage.app",
  messagingSenderId: "265040453901",
  appId: "1:265040453901:web:58379ad8c34a15ba751044"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize & Export Services
export const auth = getAuth(app);
export const db = getFirestore(app);