/**
 * Academic AI Toolkit — Firebase Integration Client
 * Provides Cloud Firestore and Firebase Authentication integrations for:
 * 1. Community User Reviews & Admin Moderation
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDocFromServer
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Primary authorized admin from runtime environment
export const PRIMARY_ADMIN_EMAIL = "yadavritesh528@gmail.com";

// Operation types for standard error handling
export const OperationType = Object.freeze({
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
});

// Default Firebase Configuration (from firebase-applet-config.json)
export const firebaseConfig = {
  projectId: "fit-device-gxctm",
  appId: "1:822349377177:web:80217621f43dd7a8c49208",
  apiKey: "AIzaSyDD7INXtyeYiN6TOcQOo4QhfMkXEKvTBqg",
  authDomain: "fit-device-gxctm.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-academicaitoolki-73353313-35ce-4c59-a473-dd1ba591bfe5",
  storageBucket: "fit-device-gxctm.firebasestorage.app",
  messagingSenderId: "822349377177",
  measurementId: "",
  oAuthClientId: "822349377177-ovk3uih2es3q2jfpcmkpofospjv1aj9g.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// Initialize Firebase App & Services
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test server connection as per skill instructions
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("[Academic AI Toolkit] Firebase client offline, using cached/default state.");
    }
  }
}
testConnection();

/**
 * Standard Firestore Error Handler (skill compliant)
 */
export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(p => ({
        providerId: p.providerId,
        email: p.email
      })) || []
    },
    operationType,
    path
  };
  console.error('[Academic AI Toolkit] Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Sanitizes user input string against HTML injection (Anti-XSS)
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

/**
 * Validates whether the currently signed-in user is an authorized administrator
 */
export async function isCurrentUserAdmin(user) {
  if (!user || !user.email) return false;
  if (user.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    return adminDoc.exists();
  } catch {
    return false;
  }
}

/* ==========================================================================
   PART 1: PUBLIC REVIEW & COMMENT FUNCTIONS
   ========================================================================== */

/**
 * Submits a new user review. Automatically sets status = "pending" for moderation.
 */
export async function submitUserReview({ name, email, role, institution, rating, comment }) {
  const cleanName = sanitizeString(name);
  const cleanEmail = sanitizeString(email).toLowerCase();
  const cleanRole = sanitizeString(role || '');
  const cleanInstitution = sanitizeString(institution || '');
  const cleanComment = sanitizeString(comment);
  const numRating = Number(rating);

  // Input validation
  if (!cleanName || cleanName.length < 2 || cleanName.length > 100) {
    throw new Error('Please enter your full name (2–100 characters).');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail) || cleanEmail.length > 200) {
    throw new Error('Please enter a valid email address.');
  }
  if (!numRating || numRating < 1 || numRating > 5) {
    throw new Error('Please select a star rating between 1 and 5.');
  }
  if (!cleanComment || cleanComment.length < 10 || cleanComment.length > 1500) {
    throw new Error('Please enter a comment between 10 and 1,500 characters.');
  }

  const reviewId = 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const now = new Date().toISOString();

  const reviewPayload = {
    name: cleanName,
    email: cleanEmail,
    role: cleanRole,
    institution: cleanInstitution,
    rating: numRating,
    comment: cleanComment,
    status: 'pending', // Mandatory: all submissions are pending moderation
    verified: false,
    createdAt: now,
    updatedAt: now,
    adminNote: ''
  };

  try {
    await setDoc(doc(db, 'reviews', reviewId), reviewPayload);
    return { success: true, id: reviewId, status: 'pending' };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `reviews/${reviewId}`);
    throw new Error('Unable to submit review at this moment. Please try again shortly.');
  }
}

/**
 * Fetches approved reviews for public display
 */
export async function getApprovedReviews() {
  const path = 'reviews';
  try {
    const q = query(
      collection(db, path),
      where('status', '==', 'approved')
    );
    const snap = await getDocs(q);
    const list = [];
    snap.forEach(d => {
      list.push({ id: d.id, ...d.data() });
    });

    // Sort by createdAt descending
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/* ==========================================================================
   PART 2: ADMIN AUTHENTICATION & MODERATION FUNCTIONS
   ========================================================================== */

/**
 * Sign in Admin with Google popup
 */
export async function adminSignInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  const isAdmin = await isCurrentUserAdmin(result.user);
  if (!isAdmin) {
    await signOut(auth);
    throw new Error(`Access Denied: Account ${result.user.email} is not an authorized administrator.`);
  }
  return result.user;
}

/**
 * Sign in Admin with Email & Password
 */
export async function adminSignInWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const isAdmin = await isCurrentUserAdmin(result.user);
  if (!isAdmin) {
    await signOut(auth);
    throw new Error(`Access Denied: Account ${result.user.email} is not an authorized administrator.`);
  }
  return result.user;
}

/**
 * Sign out Admin
 */
export async function adminSignOut() {
  await signOut(auth);
}

/**
 * Fetches all reviews for the Admin Dashboard
 */
export async function getAllReviewsForAdmin() {
  const path = 'reviews';
  try {
    const snap = await getDocs(collection(db, path));
    const list = [];
    snap.forEach(d => {
      list.push({ id: d.id, ...d.data() });
    });
    // Sort by createdAt descending
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
}

/**
 * Updates review status (approve/reject), verified badge, or admin note
 */
export async function updateReviewAdminState(reviewId, { status, verified, adminNote }) {
  const path = `reviews/${reviewId}`;
  const updates = {
    updatedAt: new Date().toISOString()
  };
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    updates.status = status;
  }
  if (typeof verified === 'boolean') {
    updates.verified = verified;
  }
  if (typeof adminNote === 'string') {
    updates.adminNote = sanitizeString(adminNote);
  }

  try {
    await updateDoc(doc(db, 'reviews', reviewId), updates);
    return updates;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * Deletes a review from Firestore (Admin only)
 */
export async function deleteReviewById(reviewId) {
  const path = `reviews/${reviewId}`;
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Seeds initial demo reviews if database is currently empty
 */
export async function seedInitialDataIfEmpty() {
  try {
    // Check reviews
    const reviewsSnap = await getDocs(collection(db, 'reviews'));
    if (reviewsSnap.empty) {
      const sampleReviews = [
        {
          name: "Dr. Sarah Wilson",
          email: "sarah.wilson@university.edu",
          role: "PhD Researcher & Lecturer",
          institution: "Life Sciences Department",
          rating: 5,
          comment: "Cut my syllabus and lesson-prep time in half. Having 2,360 discipline-specific prompts already structured means I customize instead of starting every AI prompt from zero. An indispensable toolkit for faculty.",
          status: "approved",
          verified: true,
          isSample: true,
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          adminNote: "Sample approved review"
        },
        {
          name: "Prof. Michael Chen",
          email: "mchen@business-institute.ac.uk",
          role: "Associate Professor",
          institution: "School of Business & Economics",
          rating: 5,
          comment: "The Notion workspace and Google Sheets format make it effortless to organize prompts across grant applications, literature reviews, and journal submission responses. Genuinely built for academic work, not generic chatbot fluff.",
          status: "approved",
          verified: true,
          isSample: true,
          createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          adminNote: "Sample approved review"
        },
        {
          name: "Elena Rostova",
          email: "e.rostova@gradstudies.edu",
          role: "Teaching Assistant & Doctoral Candidate",
          institution: "Graduate School of Humanities",
          rating: 5,
          comment: "As a teaching assistant juggling course grading, student feedback, and dissertation writing, the assessment and feedback modules alone were worth tenfold. Clear prompt scaffolding, highly recommended!",
          status: "approved",
          verified: true,
          isSample: true,
          createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
          adminNote: "Sample approved review"
        }
      ];

      for (let i = 0; i < sampleReviews.length; i++) {
        await setDoc(doc(db, 'reviews', `sample_rev_${i + 1}`), sampleReviews[i]);
      }
      console.log('[Academic AI Toolkit] Initial sample reviews seeded.');
    }
  } catch (err) {
    console.warn('[Academic AI Toolkit] Seed check non-fatal error:', err);
  }
}
