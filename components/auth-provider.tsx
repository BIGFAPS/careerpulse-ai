"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  BLOCKED_FLAG_KEY,
  BlockedAccountError,
  UserProfile,
  ensureUserProfile,
} from "@/lib/users";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const p = await ensureUserProfile(currentUser);
        setUser(currentUser);
        setProfile(p);
      } catch (error) {
        if (error instanceof BlockedAccountError) {
          try {
            sessionStorage.setItem(BLOCKED_FLAG_KEY, "1");
          } catch {}
          setUser(null);
          setProfile(null);
        } else {
          setUser(currentUser);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const p = await ensureUserProfile(auth.currentUser);
      setProfile(p);
    } catch {
      setUser(null);
      setProfile(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
