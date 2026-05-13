import { Star, MapPin, Store } from 'lucide-react';

interface PartnerStore {
  id: string;
  nom: string;
  photo: string;
  nombre_produits: number;
  note_moyenne?: number;
  localisation?: string;
  verified?: boolean;
}

interface PartnerStoresProps {
  stores: PartnerStore[];
  onStoreClick?: (storeId: string) => void;
}

export default function PartnerStores({ stores, onStoreClick }: PartnerStoresProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Boutiques Partenaires</h2>
        <button className="text-sm text-[#1D9E75] hover:text-[#16a34a] font-medium">
          Voir tout
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {stores.map((store) => (
          <div
            key={store.id}
            onClick={() => onStoreClick?.(store.id)}
            className="group cursor-pointer"
          >
            <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 mb-3">
              <img
                src={store.photo}
                alt={store.nom}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              {store.verified && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                  <Store className="w-3 h-3" />
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
                {store.nom}
              </h3>
              
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{store.localisation || 'Bénin'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-[#EF9F27] text-[#EF9F27]" />
                  <span className="text-xs text-gray-600">
                    {store.note_moyenne && store.note_moyenne > 0 ? store.note_moyenne.toFixed(1) : 'Nouveau'}
                  </span>
                </div>
                
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {store.nombre_produits} produits
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {stores.length === 0 && (
        <div className="text-center py-8">
          <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucune boutique partenaire pour le moment</p>
        </div>
      )}
    </div>
  );
}
