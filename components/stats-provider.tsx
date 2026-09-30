"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth-provider";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Activity {
  id: string;
  type: "resume" | "interview" | "coverletter";
  title: string;
  description: string;
  timestamp: string;
  content?: string;
}

export interface SkillAnalytics {
  technical: number;
  communication: number;
  formatting: number;
  keywords: number;
}

export interface UserStats {
  preparednessScore: number;
  resumesAnalyzed: number;
  interviewsCompleted: number;
  coverLettersGenerated: number;
  recentActivities: Activity[];
  skillAnalytics: SkillAnalytics;
}

interface StatsContextType {
  stats: UserStats;
  loading: boolean;
  incrementStat: (
    statName:
      | "resumesAnalyzed"
      | "interviewsCompleted"
      | "coverLettersGenerated",
  ) => Promise<void>;
  updatePreparednessScore: (score: number) => Promise<void>;
  addActivity: (activity: Omit<Activity, "id" | "timestamp">) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  updateSkillAnalytics: (updates: Partial<SkillAnalytics>) => Promise<void>;
}

const defaultStats: UserStats = {
  preparednessScore: 0,
  resumesAnalyzed: 0,
  interviewsCompleted: 0,
  coverLettersGenerated: 0,
  recentActivities: [],
  skillAnalytics: {
    technical: 0,
    communication: 0,
    formatting: 0,
    keywords: 0,
  },
};

const StatsContext = createContext<StatsContextType>({
  stats: defaultStats,
  loading: true,
  incrementStat: async () => {},
  updatePreparednessScore: async () => {},
  addActivity: async () => {},
  deleteActivity: async () => {},
  updateSkillAnalytics: async () => {},
});

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Fallback to local storage if not logged in
    if (!user) {
      const localStats = localStorage.getItem("career_pulse_stats");
      if (localStats && isMounted) {
        try {
          const parsed = JSON.parse(localStats);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setStats({ ...defaultStats, ...parsed });
        } catch (e) {}
      }
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const userRef = doc(db, "userStats", user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists() && isMounted) {
          setStats({ ...defaultStats, ...(docSnap.data() as UserStats) });
        } else if (isMounted) {
          // Initialize stats
          await setDoc(userRef, defaultStats);
          setStats(defaultStats);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
        // Fallback to local storage if firebase fails (e.g., rules issues)
        const localStats = localStorage.getItem("career_pulse_stats");
        if (localStats && isMounted) {
          try {
            setStats({ ...defaultStats, ...JSON.parse(localStats) });
          } catch (e) {}
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const saveToLocal = (newStats: UserStats) => {
    setStats(newStats);
    localStorage.setItem("career_pulse_stats", JSON.stringify(newStats));
  };

  const incrementStat = async (
    statName:
      | "resumesAnalyzed"
      | "interviewsCompleted"
      | "coverLettersGenerated",
  ) => {
    const newStats = { ...stats, [statName]: stats[statName] + 1 };

    // Recalculate preparedness
    const totalActivity =
      newStats.resumesAnalyzed +
      newStats.interviewsCompleted * 2 +
      newStats.coverLettersGenerated;
    const preparedness = Math.min(Math.floor(totalActivity * 5), 100);
    newStats.preparednessScore = preparedness;

    saveToLocal(newStats);

    if (user) {
      try {
        const userRef = doc(db, "userStats", user.uid);
        await updateDoc(userRef, {
          [statName]: increment(1),
          preparednessScore: preparedness,
        });
      } catch (error) {
        console.error("Failed to update Firebase stats:", error);
      }
    }
  };

  const updatePreparednessScore = async (score: number) => {
    const newStats = { ...stats, preparednessScore: score };
    saveToLocal(newStats);

    if (user) {
      try {
        const userRef = doc(db, "userStats", user.uid);
        await updateDoc(userRef, { preparednessScore: score });
      } catch (error) {
        console.error("Failed to update Firebase stats:", error);
      }
    }
  };

  const addActivity = async (activity: Omit<Activity, "id" | "timestamp">) => {
    const newActivity: Activity = {
      ...activity,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
    };

    const maxActivities = 10;
    const currentActivities = stats.recentActivities || [];
    const newActivities = [newActivity, ...currentActivities].slice(
      0,
      maxActivities,
    );

    const newStats = { ...stats, recentActivities: newActivities };
    saveToLocal(newStats);

    if (user) {
      try {
        const userRef = doc(db, "userStats", user.uid);
        await updateDoc(userRef, { recentActivities: newActivities });
      } catch (error) {
        console.error("Failed to update Firebase activities:", error);
      }
    }
  };

  const deleteActivity = async (id: string) => {
    const currentActivities = stats.recentActivities || [];
    const newActivities = currentActivities.filter((a) => a.id !== id);

    const newStats = { ...stats, recentActivities: newActivities };
    saveToLocal(newStats);

    if (user) {
      try {
        const userRef = doc(db, "userStats", user.uid);
        await updateDoc(userRef, { recentActivities: newActivities });
      } catch (error) {
        console.error("Failed to delete Firebase activity:", error);
      }
    }
  };

  const updateSkillAnalytics = async (updates: Partial<SkillAnalytics>) => {
    const currentAnalytics =
      stats.skillAnalytics || defaultStats.skillAnalytics;

    // Simple moving average for skill updates
    const updatedAnalytics = { ...currentAnalytics };
    if (updates.technical !== undefined)
      updatedAnalytics.technical = Math.round(
        (currentAnalytics.technical + updates.technical) /
          (currentAnalytics.technical === 0 ? 1 : 2),
      );
    if (updates.communication !== undefined)
      updatedAnalytics.communication = Math.round(
        (currentAnalytics.communication + updates.communication) /
          (currentAnalytics.communication === 0 ? 1 : 2),
      );
    if (updates.formatting !== undefined)
      updatedAnalytics.formatting = Math.round(
        (currentAnalytics.formatting + updates.formatting) /
          (currentAnalytics.formatting === 0 ? 1 : 2),
      );
    if (updates.keywords !== undefined)
      updatedAnalytics.keywords = Math.round(
        (currentAnalytics.keywords + updates.keywords) /
          (currentAnalytics.keywords === 0 ? 1 : 2),
      );

    const newStats = { ...stats, skillAnalytics: updatedAnalytics };
    saveToLocal(newStats);

    if (user) {
      try {
        const userRef = doc(db, "userStats", user.uid);
        await updateDoc(userRef, { skillAnalytics: updatedAnalytics });
      } catch (error) {
        console.error("Failed to update Firebase skill analytics:", error);
      }
    }
  };

  return (
    <StatsContext.Provider
      value={{
        stats,
        loading,
        incrementStat,
        updatePreparednessScore,
        addActivity,
        deleteActivity,
        updateSkillAnalytics,
      }}
    >
      {children}
    </StatsContext.Provider>
  );
}

export const useStats = () => useContext(StatsContext);
