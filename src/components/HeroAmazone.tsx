import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import amazone from '../assets/locations/amazone.jpg';
import bioGuera from '../assets/locations/bio-guera.jpg';
import porteNonRetour from '../assets/locations/porte-non-retour.jpg';
import ganvie from '../assets/locations/ganvie.jpg';
import sofitelMarina from '../assets/locations/sofitel-marina.jpg';
import dantokpa from '../assets/locations/dantokpa.jpg';

interface HeroAmazoneProps {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onExplore?: () => void;
}

const SLIDES = [
  { src: amazone, name: "Statue de l'Amazone, Cotonou" },
  { src: bioGuera, name: 'Statue de Bio Guéra, Cotonou' },
  { src: porteNonRetour, name: 'Porte du Non-Retour, Ouidah' },
  { src: ganvie, name: 'Village lacustre de Ganvié' },
  { src: sofitelMarina, name: 'Sofitel Cotonou Marina & Spa' },
  { src: dantokpa, name: 'Marché Dantokpa, Cotonou' },
];

const INTERVAL_MS = 3000;

export default function HeroAmazone({ searchTerm, onSearchChange, onExplore }: HeroAmazoneProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const t = setInterval(() => {
      setIndex(i => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Lieux emblématiques du Bénin"
      className="relative w-full overflow-hidden bg-[#0f3d2e]"
      style={{ minHeight: '70vh' }}
    >
      {/* Background slides */}
      {SLIDES.map((slide, i) => (
        <img
          key={slide.src}
          src={slide.src}
          alt={slide.name}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
          loading={i === 0 ? 'eager' : 'lazy'}
          aria-hidden={i !== index}
        />
      ))}

      {/* Dark overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: 'rgba(15, 61, 46, 0.65)' }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-24 pb-12 min-h-[70vh]">
        <h1 className="font-display text-white text-4xl sm:text-5xl font-bold leading-tight drop-shadow-lg">
          AyaMarket
        </h1>
        <p className="mt-3 text-white/90 text-sm sm:text-base max-w-md drop-shadow">
          Le marché en ligne béninois — découvrez, achetez et vendez localement.
        </p>

        {/* Search */}
        <div className="mt-8 w-full max-w-md relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un produit, une boutique..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-11 pr-32 py-3.5 bg-white/95 backdrop-blur rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF9F27] shadow-xl"
          />
          <button
            type="button"
            onClick={onExplore}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#EF9F27] hover:bg-[#d97706] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors active:scale-95"
          >
            Explorer
          </button>
        </div>

        {/* Dots */}
        <div className="mt-8 flex items-center gap-1.5">
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
