import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface SubCategory {
  id: string;
  nom: string;
  nombre_produits?: number;
  image?: string;
}

interface Category {
  id: string;
  nom: string;
  sous_categories: SubCategory[];
}

interface SubCategoriesProps {
  categories: Category[];
  onCategorySelect?: (categoryId: string) => void;
  onSubCategorySelect?: (subCategoryId: string) => void;
}

export default function SubCategories({ 
  categories, 
  onCategorySelect, 
  onSubCategorySelect 
}: SubCategoriesProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
    onCategorySelect?.(categoryId);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Catégories</h2>
      
      <div className="space-y-2">
        {categories.map((category) => (
          <div key={category.id} className="border-b border-gray-100 last:border-0">
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors duration-200"
            >
              <span className="font-medium text-gray-900">{category.nom}</span>
              <ChevronRight 
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                  expandedCategory === category.id ? 'rotate-90' : ''
                }`}
              />
            </button>
            
            {expandedCategory === category.id && category.sous_categories.length > 0 && (
              <div className="bg-gray-50 border-t border-gray-100">
                {category.sous_categories.map((subCategory) => (
                  <button
                    key={subCategory.id}
                    onClick={() => onSubCategorySelect?.(subCategory.id)}
                    className="w-full flex items-center justify-between p-3 pl-8 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <div className="flex items-center gap-3">
                      {subCategory.image && (
                        <img
                          src={subCategory.image}
                          alt={subCategory.nom}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                      )}
                      <span className="text-sm text-gray-700">{subCategory.nom}</span>
                    </div>
                    {subCategory.nombre_produits && (
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                        {subCategory.nombre_produits}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
