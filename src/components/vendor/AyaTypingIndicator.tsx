/** Indicateur « Aya écrit… » — léger, mobile-friendly */

export default function AyaTypingIndicator() {
  return (
    <div className="flex justify-start" aria-live="polite" aria-label="Aya est en train d'écrire">
      <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="sr-only">Aya écrit</span>
        <span className="w-2 h-2 rounded-full bg-[#1D9E75]/70 animate-pulse [animation-duration:1s]" />
        <span className="w-2 h-2 rounded-full bg-[#1D9E75]/70 animate-pulse [animation-duration:1s] [animation-delay:0.2s]" />
        <span className="w-2 h-2 rounded-full bg-[#1D9E75]/70 animate-pulse [animation-duration:1s] [animation-delay:0.4s]" />
      </div>
    </div>
  );
}
