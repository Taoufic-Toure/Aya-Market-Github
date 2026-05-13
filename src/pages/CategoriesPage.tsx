import { Search } from 'lucide-react';
import type { Categorie } from '../lib/database.types';

const CATEGORIES: { value: Categorie; emoji: string; label: string; color: string }[] = [
  { value: 'Alimentation', emoji: '🍚', label: 'Alimentation', color: 'bg-orange-50' },
  { value: 'Vêtements', emoji: '👗', label: 'Vêtements', color: 'bg-pink-50' },
  { value: 'Téléphones', emoji: '📱', label: 'Téléphones', color: 'bg-blue-50' },
  { value: 'Informatique', emoji: '💻', label: 'Informatique', color: 'bg-indigo-50' },
  { value: 'Beauté', emoji: '💄', label: 'Beauté', color: 'bg-fuchsia-50' },
  { value: 'Maison', emoji: '🏠', label: 'Maison', color: 'bg-amber-50' },
  { value: 'Agriculture', emoji: '🌾', label: 'Agriculture', color: 'bg-lime-50' },
  { value: 'Artisanat', emoji: '🎨', label: 'Artisanat', color: 'bg-violet-50' },
  { value: 'Sport', emoji: '⚽', label: 'Sport', color: 'bg-green-50' },
  { value: 'Jouets', emoji: '🧸', label: 'Jouets', color: 'bg-rose-50' },
  { value: 'Livres', emoji: '📚', label: 'Livres', color: 'bg-teal-50' },
  { value: 'Autre', emoji: '🔧', label: 'Autre', color: 'bg-gray-100' },
];

interface CategoriesPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export default function CategoriesPage({ onNavigate }: CategoriesPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-5 shadow-sm sticky top-0 z-30">
        <h1 className="text-xl font-bold text-gray-900">Catégories</h1>
        <p className="text-xs text-gray-500 mt-0.5">Parcourez par catégorie</p>
      </div>

      <div className="px-4 py-5">
        <div className="grid grid-cols-3 gap-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => onNavigate('category-products', { categorie: cat.value })}
              className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-white shadow-sm border border-gray-100 hover:border-[#1D9E75] hover:shadow-md transition-all active:scale-95"
            >
              <div className={`w-14 h-14 rounded-2xl ${cat.color} flex items-center justify-center`}>
                <span className="text-2xl">{cat.emoji}</span>
              </div>
              <span className="text-xs font-semibold text-gray-800 text-center leading-tight">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
