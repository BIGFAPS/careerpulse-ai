import { auth } from "@/lib/firebase";
import { BLOCKED_FLAG_KEY, BlockedAccountError, ensureUserProfile } from "@/lib/users";

export function friendlyAuthError(error: any, fallback: string): string {
  if (error instanceof BlockedAccountError) return error.message;
  const code: string = error?.code || "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "Incorrect email or password.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/email-already-in-use":
      return "An account already exists with this email. Please log in instead.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "The sign-in window was closed before finishing.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups for this site and try again.";
    case "auth/unauthorized-domain":
      return "This sign-in method is not enabled for this website yet. Please use email and password.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using another sign-in method.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled. Please use another method.";
    default:
      return error?.message || fallback;
  }
}

/** Runs after any successful sign-in: creates the profile and rejects blocked accounts. */
export async function afterSignIn() {
  if (!auth.currentUser) return;
  await ensureUserProfile(auth.currentUser);
}

export function nextUrl(defaultPath = "/dashboard") {
  if (typeof window === "undefined") return defaultPath;
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : defaultPath;
}

export function consumeBlockedNotice(): boolean {
  try {
    if (sessionStorage.getItem(BLOCKED_FLAG_KEY)) {
      sessionStorage.removeItem(BLOCKED_FLAG_KEY);
      return true;
    }
  } catch {}
  return false;
}
