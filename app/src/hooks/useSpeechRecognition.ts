import { useRef, useState, useCallback } from 'react';
import { recordSpeaking } from '../services/api';

type SRInstance = any;

// Web Speech API: micrófono -> transcripción. V1 sin análisis IA de voz.
export function useSpeechRecognition() {
  const recognition = useRef<SRInstance | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    recognition.current = new SR();
    recognition.current.interimResults = true;
    recognition.current.onresult = (e: any) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTranscript(text);
    };
    recognition.current.onend = () => setListening(false);
    setTranscript('');
    setListening(true);
    recognition.current.start();
  }, []);

  const stop = useCallback(() => {
    recognition.current?.stop();
    setListening(false);
  }, []);

  const submit = useCallback(async (day: number) => {
    const res = await recordSpeaking(day);
    return res;
  }, []);

  return { supported, listening, transcript, start, stop, submit, setTranscript };
}
