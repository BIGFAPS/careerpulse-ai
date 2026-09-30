// Shared platform data managed by the administrator:
// - jobDescriptions: a library of job descriptions candidates can pick from
// - settings/interview: interview parameters used by the Interview Coach
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface JobDescription {
  id?: string;
  title: string;
  company: string;
  industry: string;
  description: string;
  active: boolean;
  createdAt?: any;
}

export interface InterviewSettings {
  numberOfQuestions: number;
  difficulty: "easy" | "medium" | "hard";
  questionMix: "balanced" | "technical" | "behavioral";
  voiceLanguage: string; // BCP-47 code used for speech-to-text
  webcamFeedback: boolean;
}

export const DEFAULT_INTERVIEW_SETTINGS: InterviewSettings = {
  numberOfQuestions: 5,
  difficulty: "medium",
  questionMix: "balanced",
  voiceLanguage: "en-US",
  webcamFeedback: true,
};

export async function getInterviewSettings(): Promise<InterviewSettings> {
  try {
    const snap = await getDoc(doc(db, "settings", "interview"));
    if (snap.exists()) {
      return { ...DEFAULT_INTERVIEW_SETTINGS, ...(snap.data() as InterviewSettings) };
    }
  } catch (error) {
    console.error("Could not load interview settings", error);
  }
  return DEFAULT_INTERVIEW_SETTINGS;
}

export async function saveInterviewSettings(settings: InterviewSettings) {
  await setDoc(doc(db, "settings", "interview"), {
    ...settings,
    updatedAt: serverTimestamp(),
  });
}

export async function listJobDescriptions(onlyActive = false): Promise<JobDescription[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "jobDescriptions"), orderBy("createdAt", "desc")),
    );
    const jobs = snap.docs.map((d) => ({ ...(d.data() as JobDescription), id: d.id }));
    return onlyActive ? jobs.filter((j) => j.active !== false) : jobs;
  } catch (error) {
    console.error("Could not load job descriptions", error);
    return [];
  }
}

export async function addJobDescription(job: Omit<JobDescription, "id" | "createdAt">) {
  await addDoc(collection(db, "jobDescriptions"), {
    ...job,
    createdAt: serverTimestamp(),
  });
}

export async function updateJobDescription(id: string, data: Partial<JobDescription>) {
  await updateDoc(doc(db, "jobDescriptions", id), data as any);
}

export async function deleteJobDescription(id: string) {
  await deleteDoc(doc(db, "jobDescriptions", id));
}
