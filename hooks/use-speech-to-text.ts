"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Speech-To-Text using the browser's Web Speech API (Chrome, Edge, Safari).
// Returns the live transcript while the user speaks.
export function useSpeechToText(lang = "en-US") {
  const recognitionRef = useRef<any>(null);
  const finalRef = useRef("");
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(!!SR);
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalRef.current += res[0].transcript + " ";
        else interim += res[0].transcript;
      }
      setTranscript((finalRef.current + interim).trim());
    };
    rec.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError(
          "Microphone access was refused. Allow the microphone in your browser, or type your answer instead.",
        );
      } else if (event.error === "no-speech") {
        setError("No speech was detected. Try again or type your answer.");
      } else if (event.error !== "aborted") {
        setError("Voice input stopped. You can try again or type your answer.");
      }
      setListening(false);
    };
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {}
    };
  }, [lang]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setError("");
    finalRef.current = "";
    setTranscript("");
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // already started
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    finalRef.current = "";
    setTranscript("");
  }, []);

  return { supported, listening, transcript, error, start, stop, reset };
}
