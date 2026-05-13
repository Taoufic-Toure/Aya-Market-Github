import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import amazone from '../assets/locations/amazone.jpg';
import bioGuera from '../assets/locations/bio-guera.jpg';
import porteNonRetour from '../assets/locations/porte-non-retour.jpg';
import ganvie from '../assets/locations/ganvie.jpg';
import sofitelMarina from '../assets/locations/sofitel-marina.jpg';
import dantokpa from '../assets/locations/dantokpa.jpg';

const SLIDES = [
  { src: amazone, name: "Statue de l'Amazone, Cotonou" },
  { src: bioGuera, name: 'Statue de Bio Guéra, Cotonou' },
  { src: porteNonRetour, name: 'Porte du Non-Retour, Ouidah' },
  { src: ganvie, name: 'Village lacustre de Ganvié' },
  { src: sofitelMarina, name: 'Sofitel Cotonou Marina & Spa' },
  { src: dantokpa, name: 'Marché Dantokpa, Cotonou' },
];

const INTERVAL_MS = 3000;

export default function LocationsCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || paused) return;
    const t = setInterval(() => {
      setIndex(i => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Lieux emblématiques du Bénin"
      className="relative w-full overflow-hidden bg-[#0f3d2e]"
      style={{ aspectRatio: '16 / 9' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {SLIDES.map((slide, i) => (
        <img
          key={slide.src}
          src={slide.src}
          alt={slide.name}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
          loading={i === 0 ? 'eager' : 'lazy'}
        />
      ))}

      {/* Bottom gradient for legibility */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none" />

      {/* Caption bottom-left */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 flex items-end justify-between gap-3">
        <div
          key={index}
          aria-live="polite"
          className="flex items-center gap-2 text-white animate-fade-in"
        >
          <MapPin className="w-4 h-4 text-[#EF9F27] flex-shrink-0" />
          <span className="font-semibold text-sm sm:text-base drop-shadow-md">
            {SLIDES[index].name}
          </span>
        </div>

        {/* Dots */}
        <div className="flex items-center gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Aller à l'image ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-6 bg-[#EF9F27]' : 'w-1.5 bg-white/60 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
