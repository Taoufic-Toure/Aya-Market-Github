import { useState } from 'react';
import SubCategories from './SubCategories';
import PartnerStores from './PartnerStores';
import Newsletter from './Newsletter';

// Données mockées - remplacer par vraies données
const mockCategories = [
  {
    id: '1',
    nom: 'Mode',
    sous_categories: [
      { id: '1-1', nom: 'Vêtements', nombre_produits: 156, image: '/categories/vetements.jpg' },
      { id: '1-2', nom: 'Chaussures', nombre_produits: 89, image: '/categories/chaussures.jpg' },
      { id: '1-3', nom: 'Bijoux', nombre_produits: 67, image: '/categories/bijoux.jpg' },
      { id: '1-4', nom: 'Pagnes', nombre_produits: 124, image: '/categories/pagnes.jpg' },
    ]
  },
  {
    id: '2',
    nom: 'Électronique',
    sous_categories: [
      { id: '2-1', nom: 'Téléphones', nombre_produits: 98 },
      { id: '2-2', nom: 'Ordinateurs', nombre_produits: 45 },
    ]
  },
  {
    id: '3',
    nom: 'Maison',
    sous_categories: [
      { id: '3-1', nom: 'Meubles', nombre_produits: 78 },
      { id: '3-2', nom: 'Décoration', nombre_produits: 92 },
    ]
  }
];

const mockPartnerStores = [
  {
    id: '1',
    nom: 'Boutique du Marché',
    photo: '/stores/store1.jpg',
    nombre_produits: 234,
    note_moyenne: 4.5,
    localisation: 'Cotonou',
    verified: true
  },
  {
    id: '2',
    nom: 'Style Africain',
    photo: '/stores/store2.jpg',
    nombre_produits: 189,
    note_moyenne: 4.8,
    localisation: 'Porto-Novo',
    verified: true
  },
  {
    id: '3',
    nom: 'Tissus Royaux',
    photo: '/stores/store3.jpg',
    nombre_produits: 156,
    note_moyenne: 4.2,
    localisation: 'Abomey',
    verified: true
  },
  {
    id: '4',
    nom: 'Mode Béninoise',
    photo: '/stores/store4.jpg',
    nombre_produits: 298,
    note_moyenne: 4.6,
    localisation: 'Parakou',
    verified: true
  }
];

interface HomeLayoutProps {
  children: React.ReactNode;
}

export default function HomeLayout({ children }: HomeLayoutProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    console.log('Catégorie sélectionnée:', categoryId);
  };

  const handleSubCategorySelect = (subCategoryId: string) => {
    setSelectedSubCategory(subCategoryId);
    console.log('Sous-catégorie sélectionnée:', subCategoryId);
    // TODO: Naviguer vers la page de la sous-catégorie
  };

  const handleStoreClick = (storeId: string) => {
    console.log('Boutique cliquée:', storeId);
    // TODO: Naviguer vers la page de la boutique
  };

  const handleNewsletterSubscribe = async (email: string) => {
    console.log('Inscription newsletter:', email);
    // TODO: Appeler l'API newsletter
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec catégories */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-8 overflow-x-auto">
            <SubCategories
              categories={mockCategories}
              onCategorySelect={handleCategorySelect}
              onSubCategorySelect={handleSubCategorySelect}
            />
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Boutiques Partenaires */}
        <section className="mb-8">
          <PartnerStores
            stores={mockPartnerStores}
            onStoreClick={handleStoreClick}
          />
        </section>

        {/* Contenu de la page */}
        <section>
          {children}
        </section>
      </main>

      {/* Newsletter en bas de page */}
      <footer className="bg-gray-900 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <Newsletter
              onSubscribe={handleNewsletterSubscribe}
              className="mb-8"
            />
          </div>
          
          {/* Footer additionnel */}
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2024 AyaMarket - Votre marketplace béninoise de confiance
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
