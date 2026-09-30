import type { User } from "firebase/auth";
import { signOut } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  targetRole?: string;
  role: "candidate";
  plan: "free" | "pro" | "elite";
  blocked: boolean;
  deleted?: boolean;
  createdAt?: any;
  lastLogin?: any;
  lastResumeText?: string;
  lastResumeName?: string;
}

export class BlockedAccountError extends Error {
  constructor() {
    super(
      "This account has been blocked by an administrator. Please contact support.",
    );
    this.name = "BlockedAccountError";
  }
}

/**
 * Makes sure a users/{uid} profile exists for the signed-in account and that
 * the account is not blocked. Blocked or deleted accounts are signed out and a
 * BlockedAccountError is thrown.
 */
export async function ensureUserProfile(user: User): Promise<UserProfile | null> {
  const ref = doc(db, "users", user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      if (data.blocked || data.deleted) {
        await signOut(auth);
        throw new BlockedAccountError();
      }
      updateDoc(ref, {
        lastLogin: serverTimestamp(),
        email: user.email || data.email || "",
        displayName: user.displayName || data.displayName || "",
      }).catch(() => {});
      return { ...data, uid: user.uid };
    }
    const profile = {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "",
      targetRole: "",
      role: "candidate" as const,
      plan: "free" as const,
      blocked: false,
      deleted: false,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    };
    await setDoc(ref, profile);
    return profile;
  } catch (error) {
    if (error instanceof BlockedAccountError) throw error;
    console.error("Could not load user profile", error);
    return null;
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? ({ ...(snap.data() as UserProfile), uid }) : null;
  } catch (error) {
    console.error("Could not read user profile", error);
    return null;
  }
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, "displayName" | "targetRole" | "lastResumeText" | "lastResumeName">>,
) {
  await updateDoc(doc(db, "users", uid), data as any);
}

export const BLOCKED_FLAG_KEY = "cp_blocked_notice";
