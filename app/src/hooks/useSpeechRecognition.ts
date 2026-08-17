import { useRef, useState, useCallback, useEffect } from 'react';
import { recordSpeaking } from '../services/api';

type SRInstance = any;

type UseSpeechRecognitionOptions = {
  lang?: string;
  onFinal?: (text: string) => void;
};

// Web Speech API: micrófono -> transcripción.
// - lang: idioma de escucha (ej. 'es-CO' para español colombiano, 'en-US' para inglés).
// - onFinal: se llama cuando el usuario termina de hablar (resultado final), útil para
//   conversación continua por voz (auto-enviar el turno).
export function useSpeechRecognition(options?: UseSpeechRecognitionOptions) {
  const recognition = useRef<SRInstance | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const langRef = useRef(options?.lang || 'es-CO');
  const onFinalRef = useRef(options?.onFinal);

  useEffect(() => {
    onFinalRef.current = options?.onFinal;
  }, [options?.onFinal]);

  useEffect(() => {
    if (options?.lang) langRef.current = options.lang;
  }, [options?.lang]);

  const setLang = useCallback((lang: string) => {
    langRef.current = lang;
  }, []);

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    recognition.current = new SR();
    recognition.current.lang = langRef.current;
    recognition.current.interimResults = true;
    recognition.current.continuous = false;
    recognition.current.onresult = (e: any) => {
      let text = '';
      let finalText = '';
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      }
      setTranscript(text);
      if (finalText) onFinalRef.current?.(finalText);
    };
    recognition.current.onend = () => {
      setListening(false);
    };
    recognition.current.onerror = () => {
      setListening(false);
    };
    setTranscript('');
    setListening(true);
    try {
      recognition.current.start();
    } catch {
      setListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    recognition.current?.stop();
    setListening(false);
  }, []);

  const submit = useCallback(async (day: number) => {
    const res = await recordSpeaking(day);
    return res;
  }, []);

  return { supported, listening, transcript, start, stop, submit, setTranscript, setLang };
}