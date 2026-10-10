// Auth Guard Module - Protects routes and verifies patient & admin permissions
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// List of authorized administrator emails
export const ADMIN_EMAILS = [
  'admin@medicare.com',
  'admin@example.com'
];

/**
 * Checks if a user's email or Firestore role qualifies as Admin
 * @param {Object} user Firebase User object
 * @returns {Promise<boolean>}
 */
export async function isUserAdmin(user) {
  if (!user || !user.email) return false;

  // 1. Check if email is directly in authorized list
  const emailLower = user.email.toLowerCase();
  if (ADMIN_EMAILS.map(e => e.toLowerCase()).includes(emailLower)) {
    return true;
  }

  // 2. Check if Firestore users collection has role: 'admin'
  try {
    const userDocSnap = await getDoc(doc(db, 'users', user.uid));
    if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
      return true;
    }
  } catch (err) {
    console.warn('Could not verify admin role in Firestore:', err);
  }

  return false;
}

/**
 * Route Guard: Requires ANY logged-in user (Patients or Admins)
 * Redirects guests to login.html and remembers where they were going.
 * @param {Function} onUserReady Callback when user is authenticated
 */
export function requireAuth(onUserReady = null) {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      // Save current URL so login.html can redirect back
      sessionStorage.setItem('redirectAfterLogin', window.location.href);
      window.location.href = 'login.html';
    } else {
      if (typeof onUserReady === 'function') {
        onUserReady(user);
      }
    }
  });
}

/**
 * Route Guard: Requires an Administrator
 * If not logged in -> redirects to login.html
 * If logged in as patient/non-admin -> redirects away to index.html with an alert
 * @param {Function} onAdminReady Callback when admin is verified
 */
export function requireAdmin(onAdminReady = null) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      sessionStorage.setItem('redirectAfterLogin', window.location.href);
      window.location.href = 'login.html';
      return;
    }

    const isAdmin = await isUserAdmin(user);
    if (!isAdmin) {
      alert(`Access Denied: The account "${user.email}" does not have administrator privileges. Redirecting to home.`);
      window.location.href = 'index.html';
      return;
    }

    if (typeof onAdminReady === 'function') {
      onAdminReady(user);
    }
  });
}
