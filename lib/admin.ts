// Administrator access.
// An administrator is a Firebase Authentication account (email + password,
// passwords are hashed by Firebase) whose uid has a document in the "admins"
// collection. Firestore security rules check that document (role-based access).
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  UserCredential,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// First administrator account. On the very first login with these credentials
// the account is created and registered as admin (one time only). The password
// itself is never stored in the code: only a double SHA-256 fingerprint, which
// the Firestore rules also verify.
export const BOOTSTRAP_ADMIN_EMAIL = "admin@careerpulse-ai.vercel.app";
const BOOTSTRAP_FINGERPRINT =
  "ed0f8d84f8581cf157669389399020103005eeff1ccb401b8d63b412a46b3df3";

async function sha256Hex(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isAdmin(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, "admins", uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export class AdminLoginError extends Error {}

export async function adminLogin(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  let credential: UserCredential;
  try {
    credential = await signInWithEmailAndPassword(auth, normalized, password);
  } catch (error: any) {
    const code = error?.code || "";
    const notFound =
      code === "auth/user-not-found" ||
      code === "auth/invalid-credential" ||
      code === "auth/invalid-login-credentials";
    if (notFound && normalized === BOOTSTRAP_ADMIN_EMAIL) {
      const proof = await sha256Hex(password);
      if ((await sha256Hex(proof)) === BOOTSTRAP_FINGERPRINT) {
        return bootstrapFirstAdmin(normalized, password, proof);
      }
    }
    if (code === "auth/too-many-requests") {
      throw new AdminLoginError("Too many attempts. Please wait and try again.");
    }
    throw new AdminLoginError("Invalid email or password.");
  }

  if (!(await isAdmin(credential.user.uid))) {
    await auth.signOut();
    throw new AdminLoginError("This account does not have administrator access.");
  }
  return credential.user;
}

async function bootstrapFirstAdmin(email: string, password: string, proof: string) {
  let credential: UserCredential;
  try {
    credential = await createUserWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    throw new AdminLoginError("Invalid email or password.");
  }
  const uid = credential.user.uid;
  const batch = writeBatch(db);
  batch.set(doc(db, "admins", uid), {
    email,
    createdAt: serverTimestamp(),
    addedBy: "bootstrap",
  });
  batch.set(doc(db, "config", "adminBootstrap"), {
    uid,
    proof,
    doneAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch (error) {
    console.error("Admin bootstrap failed", error);
    await auth.signOut();
    throw new AdminLoginError(
      "The administrator account could not be initialised. Check the Firestore rules.",
    );
  }
  return credential.user;
}

export async function changeAdminPassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("Not signed in");
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
}

// ---------- Data for the admin dashboard ----------

export interface AdminUserRow {
  uid: string;
  email: string;
  displayName: string;
  plan: string;
  blocked: boolean;
  deleted: boolean;
  createdAt?: any;
  lastLogin?: any;
  resumesAnalyzed: number;
  interviewsCompleted: number;
  coverLettersGenerated: number;
  preparednessScore: number;
  isAdmin: boolean;
}

export interface AdminEntry {
  id: string;
  email: string;
  legacy: boolean;
}

export async function loadAdmins(): Promise<AdminEntry[]> {
  const snap = await getDocs(collection(db, "admins"));
  const list: AdminEntry[] = [];
  for (const d of snap.docs) {
    const data = d.data() as any;
    // Old version stored usernames and plain-text passwords: remove them.
    if ("password" in data || "username" in data) {
      await deleteDoc(d.ref).catch(() => {});
      continue;
    }
    list.push({ id: d.id, email: data.email || d.id, legacy: false });
  }
  return list;
}

export async function loadUsers(adminIds: Set<string>): Promise<AdminUserRow[]> {
  const [usersSnap, statsSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "userStats")),
  ]);
  const stats = new Map<string, any>();
  statsSnap.docs.forEach((d) => stats.set(d.id, d.data()));
  const rows = new Map<string, AdminUserRow>();

  const makeRow = (uid: string, u: any): AdminUserRow => {
    const s = stats.get(uid) || {};
    return {
      uid,
      email: u.email || "",
      displayName: u.displayName || "",
      plan: u.plan || "free",
      blocked: !!u.blocked,
      deleted: !!u.deleted,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      resumesAnalyzed: s.resumesAnalyzed || 0,
      interviewsCompleted: s.interviewsCompleted || 0,
      coverLettersGenerated: s.coverLettersGenerated || 0,
      preparednessScore: s.preparednessScore || 0,
      isAdmin: adminIds.has(uid),
    };
  };

  usersSnap.docs.forEach((d) => rows.set(d.id, makeRow(d.id, d.data())));
  // Accounts created before profiles existed only have a userStats document
  stats.forEach((_, uid) => {
    if (!rows.has(uid)) rows.set(uid, makeRow(uid, {}));
  });
  return Array.from(rows.values());
}

export async function setUserBlocked(uid: string, blocked: boolean) {
  await setDoc(doc(db, "users", uid), { blocked }, { merge: true });
}

export async function setUserPlan(uid: string, plan: string) {
  // Set manually by an admin: no end date
  await setDoc(doc(db, "users", uid), { plan, planExpiresAt: null }, { merge: true });
}

/** Deletes all of a user's data and permanently disables the account. */
export async function deleteUserAccount(uid: string) {
  for (const sub of ["analyses", "interviews"]) {
    const snap = await getDocs(collection(db, "users", uid, sub));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }
  await deleteDoc(doc(db, "userStats", uid)).catch(() => {});
  await setDoc(
    doc(db, "users", uid),
    {
      deleted: true,
      blocked: true,
      deletedAt: serverTimestamp(),
      lastResumeText: "",
      displayName: "",
    },
    { merge: true },
  );
}

export async function grantAdmin(uid: string, email: string) {
  await setDoc(doc(db, "admins", uid), {
    email,
    createdAt: serverTimestamp(),
    addedBy: auth.currentUser?.uid || "",
  });
}

export async function revokeAdmin(uid: string) {
  await deleteDoc(doc(db, "admins", uid));
}

export async function touchAdmin(uid: string) {
  await updateDoc(doc(db, "admins", uid), { lastLogin: serverTimestamp() }).catch(() => {});
}

export interface PaymentRow {
  id: string;
  email: string;
  plan: string;
  billing: string;
  chargedAmount: number;
  status: string;
  operator: string;
  phone: string;
  createdAt?: any;
}

export async function loadPayments(): Promise<PaymentRow[]> {
  const snap = await getDocs(collection(db, "payments"));
  return snap.docs
    .map((d) => ({ ...(d.data() as any), id: d.id }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}
