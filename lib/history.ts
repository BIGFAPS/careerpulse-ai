import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ResumeAnalysisRecord {
  id?: string;
  fileName: string;
  fileType: "pdf" | "docx" | "text" | "pasted";
  parsedText: string;
  jobTitle?: string;
  jobDescription: string;
  score: number;
  status: "analyzed" | "rejected";
  analysis: string;
  createdAt?: any;
}

export interface InterviewMessage {
  role: "user" | "model";
  content: string;
}

export interface InterviewScores {
  overall: number;
  technical: number;
  communication: number;
  keywords: number;
}

export interface InterviewSessionRecord {
  id?: string;
  industry: string;
  role: string;
  jobDescription?: string;
  usedResume: boolean;
  answerMode: "voice" | "text" | "mixed";
  status: "in_progress" | "completed" | "abandoned";
  messages: InterviewMessage[];
  questionsAsked: number;
  scores?: InterviewScores;
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  createdAt?: any;
  endedAt?: any;
}

const MAX_TEXT = 20000;

function trim(text: string | undefined) {
  return (text || "").slice(0, MAX_TEXT);
}

export async function saveResumeAnalysis(uid: string, record: ResumeAnalysisRecord) {
  const ref = await addDoc(collection(db, "users", uid, "analyses"), {
    ...record,
    parsedText: trim(record.parsedText),
    jobDescription: trim(record.jobDescription),
    analysis: trim(record.analysis),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createInterviewSession(
  uid: string,
  record: Omit<InterviewSessionRecord, "status" | "createdAt">,
) {
  const ref = await addDoc(collection(db, "users", uid, "interviews"), {
    ...record,
    jobDescription: trim(record.jobDescription),
    status: "in_progress",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateInterviewSession(
  uid: string,
  id: string,
  data: Partial<InterviewSessionRecord>,
) {
  const payload: any = { ...data };
  if (data.status === "completed" || data.status === "abandoned") {
    payload.endedAt = serverTimestamp();
  }
  await updateDoc(doc(db, "users", uid, "interviews", id), payload);
}

export async function listResumeAnalyses(uid: string, max = 50) {
  const snap = await getDocs(
    query(collection(db, "users", uid, "analyses"), orderBy("createdAt", "desc"), limit(max)),
  );
  return snap.docs.map((d) => ({ ...(d.data() as ResumeAnalysisRecord), id: d.id }));
}

export async function listInterviewSessions(uid: string, max = 50) {
  const snap = await getDocs(
    query(collection(db, "users", uid, "interviews"), orderBy("createdAt", "desc"), limit(max)),
  );
  return snap.docs.map((d) => ({ ...(d.data() as InterviewSessionRecord), id: d.id }));
}

export async function deleteHistoryItem(
  uid: string,
  kind: "analyses" | "interviews",
  id: string,
) {
  await deleteDoc(doc(db, "users", uid, kind, id));
}

export function formatDate(value: any) {
  if (!value) return "";
  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function extractScore(text: string): number {
  const m = text.match(/Score:\s*\**\s*(\d{1,3})/i) || text.match(/(\d{1,3})\s*\/\s*100/);
  const n = m ? parseInt(m[1], 10) : 0;
  return Math.max(0, Math.min(100, n));
}
