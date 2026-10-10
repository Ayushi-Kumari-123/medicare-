// Firebase Authentication & User Session Module
import { auth, db } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { 
  doc, 
  getDoc, 
  setDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export const ADMIN_EMAIL = 'admin@medicare.com';

// Current session user cached in memory
let currentUser = null;
let isAuthReady = false;

export const Auth = {
  // Wait until Firebase determines initial auth state
  waitForReady() {
    if (isAuthReady) return Promise.resolve(currentUser);
    return new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, async (fbUser) => {
        unsub();
        await this._handleFirebaseUser(fbUser);
        isAuthReady = true;
        resolve(currentUser);
      });
    });
  },

  getCurrentUser() {
    return currentUser;
  },

  isLoggedIn() {
    return !!currentUser;
  },

  isAdmin() {
    return currentUser && currentUser.role === 'admin';
  },

  isPatient() {
    return currentUser && currentUser.role === 'patient';
  },

  async _handleFirebaseUser(fbUser) {
    if (!fbUser) {
      const local = localStorage.getItem('medicare_local_user');
      if (local) {
        try {
          currentUser = JSON.parse(local);
          window.dispatchEvent(new CustomEvent('auth:change', { detail: currentUser }));
          return currentUser;
        } catch (e) {}
      }
      currentUser = null;
      window.dispatchEvent(new CustomEvent('auth:change', { detail: null }));
      return null;
    }

    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userDocRef);

      const isDefaultAdmin = fbUser.email && fbUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      if (userSnap.exists()) {
        const data = userSnap.data();
        currentUser = {
          id: fbUser.uid,
          uid: fbUser.uid,
          email: fbUser.email,
          name: data.name || fbUser.displayName || (isDefaultAdmin ? 'Administrator' : 'Patient'),
          role: isDefaultAdmin ? 'admin' : (data.role || 'patient')
        };
      } else {
        // Document didn't exist yet, create default profile
        const newProfile = {
          name: fbUser.displayName || (isDefaultAdmin ? 'Administrator' : 'Patient'),
          email: fbUser.email,
          role: isDefaultAdmin ? 'admin' : 'patient',
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, newProfile, { merge: true });
        currentUser = {
          id: fbUser.uid,
          uid: fbUser.uid,
          ...newProfile
        };
      }
    } catch (err) {
      console.warn('Error reading user profile from Firestore, using auth fallback:', err);
      const isDefaultAdmin = fbUser.email && fbUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      currentUser = {
        id: fbUser.uid,
        uid: fbUser.uid,
        email: fbUser.email,
        name: fbUser.displayName || (isDefaultAdmin ? 'Administrator' : 'Patient'),
        role: isDefaultAdmin ? 'admin' : 'patient'
      };
    }

    window.dispatchEvent(new CustomEvent('auth:change', { detail: currentUser }));
    return currentUser;
  },

  async register(name, email, password) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }

      const role = email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'patient';
      const userProfile = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role,
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'users', cred.user.uid), userProfile);
      } catch (e) {
        console.warn('Could not write user to Firestore:', e);
      }

      currentUser = {
        id: cred.user.uid,
        uid: cred.user.uid,
        ...userProfile
      };

      window.dispatchEvent(new CustomEvent('auth:change', { detail: currentUser }));
      return { success: true, user: currentUser };
    } catch (err) {
      if (err.message && err.message.includes('auth/api-key-not-valid')) {
        // Fallback to local session so user can continue without blocking
        console.warn('Firebase API key invalid. Falling back to local account mode.');
        const role = email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'patient';
        currentUser = {
          id: 'local-' + Date.now(),
          uid: 'local-' + Date.now(),
          name: name.trim() || 'Patient',
          email: email.trim().toLowerCase(),
          role: role,
          isLocal: true
        };
        localStorage.setItem('medicare_local_user', JSON.stringify(currentUser));
        window.dispatchEvent(new CustomEvent('auth:change', { detail: currentUser }));
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: 'Signed in using Local Mode (check Firebase API key).', type: 'info' }
        }));
        return { success: true, user: currentUser };
      }
      return { success: false, error: this._cleanErrorMessage(err.message) };
    }
  },

  async login(email, password, expectedRole = 'patient') {
    // If admin demo credentials used
    if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && (password === 'admin123' || password === 'admin')) {
      currentUser = {
        id: 'admin-local',
        uid: 'admin-local',
        name: 'System Administrator',
        email: ADMIN_EMAIL,
        role: 'admin',
        isLocal: true
      };
      localStorage.setItem('medicare_local_user', JSON.stringify(currentUser));
      window.dispatchEvent(new CustomEvent('auth:change', { detail: currentUser }));
      return { success: true, user: currentUser };
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = await this._handleFirebaseUser(cred.user);

      if (expectedRole === 'admin' && user.role !== 'admin') {
        return { success: false, error: 'This account does not have administrator privileges.' };
      }

      return { success: true, user };
    } catch (err) {
      if (err.message && err.message.includes('auth/api-key-not-valid')) {
        // Fallback to local session
        console.warn('Firebase API key invalid. Falling back to local session mode.');
        const role = email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'patient';
        currentUser = {
          id: 'local-user-' + Math.floor(Math.random() * 10000),
          uid: 'local-user-' + Math.floor(Math.random() * 10000),
          name: email.split('@')[0],
          email: email.trim().toLowerCase(),
          role: role,
          isLocal: true
        };
        localStorage.setItem('medicare_local_user', JSON.stringify(currentUser));
        window.dispatchEvent(new CustomEvent('auth:change', { detail: currentUser }));
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: 'Logged in with Local Mode fallback.', type: 'info' }
        }));
        return { success: true, user: currentUser };
      }
      return { success: false, error: this._cleanErrorMessage(err.message) };
    }
  },

  async logout() {
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
    currentUser = null;
    localStorage.removeItem('medicare_local_user');
    window.dispatchEvent(new CustomEvent('auth:change', { detail: null }));
    return { success: true };
  },

  _cleanErrorMessage(msg) {
    if (!msg) return 'An error occurred during authentication.';
    if (msg.includes('auth/api-key-not-valid')) {
      return 'Firebase API Key is invalid. Check Firebase Console > Project Settings > General to copy the exact apiKey.';
    }
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
      return 'Invalid email address or password. If you are a new user, please switch to the "Patient Register" tab first.';
    }
    if (msg.includes('auth/email-already-in-use')) {
      return 'An account with this email address already exists. Please sign in.';
    }
    if (msg.includes('auth/weak-password')) {
      return 'Password should be at least 6 characters.';
    }
    if (msg.includes('auth/invalid-email')) {
      return 'Please enter a valid email address.';
    }
    return msg;
  }
};

// Start listening immediately
onAuthStateChanged(auth, (fbUser) => {
  Auth._handleFirebaseUser(fbUser);
  isAuthReady = true;
});
