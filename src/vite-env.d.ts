/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// SpeechRecognition shims
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((this: SpeechRecognition, ev: any) => any) | null;
  onerror: ((this: SpeechRecognition, ev: any) => any) | null;
  onend: ((this: SpeechRecognition, ev: any) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare var SpeechRecognition: { prototype: SpeechRecognition; new (): SpeechRecognition };

interface Window {
  SpeechRecognition?: typeof SpeechRecognition;
  webkitSpeechRecognition?: typeof SpeechRecognition;
}
