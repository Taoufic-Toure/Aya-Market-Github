import { useState, useEffect, useRef } from 'react';
import { Plus, Search, CreditCard as Edit2, Trash2, Eye, EyeOff, ArrowLeft, Upload, X, ChevronDown, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Produit, Boutique, Categorie } from '../../lib/database.types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';

const CATEGORIES: Categorie[] = ['Alimentation', 'Vêtements', 'Électronique', 'Beauté', 'Maison', 'Agriculture', 'Artisanat', 'Téléphones', 'Informatique', 'Sport', 'Jouets', 'Livres', 'Autre'];
const PEXELS_PLACEHOLDER = 'https://images.pexels.com/photos/3965557/pexels-photo-3965557.jpeg?auto=compress&cs=tinysrgb&w=400';
const PRODUCT_IMAGES_BUCKET = 'produits';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface FormData {
  nom: string; description: string; prix: string; stock: string; seuil_alerte: string;
  categorie: Categorie; photos: string[]; actif: boolean;
}
const defaultForm: FormData = { nom: '', description: '', prix: '', stock: '', seuil_alerte: '5', categorie: 'Autre', photos: [], actif: true };

interface VendorProductsProps {
  onNavigate: (page: string) => void;
  onBack: () => void;
}

export default function VendorProducts({ onNavigate, onBack }: VendorProductsProps) {
  const [boutique, setBoutique] = useState<Boutique | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [filtered, setFiltered] = useState<Produit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => { if (user) loadData(); }, [user]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);
  useEffect(() => {
    const t = searchTerm.toLowerCase();
    setFiltered(produits.filter(p => p.nom.toLowerCase().includes(t) || p.categorie.toLowerCase().includes(t)));
  }, [searchTerm, produits]);

  const loadData = async () => {
    const { data: b } = await supabase.from('boutiques').select('*').eq('vendeur_id', user!.id).maybeSingle();
    if (!b) return;
    setBoutique(b);
    const { data: p } = await supabase.from('produits').select('*').eq('boutique_id', b.id).order('created_at', { ascending: false });
    if (p) { setProduits(p); setFiltered(p); }
  };

  const handleSave = async () => {
    if (!boutique || !form.nom || !form.prix) { showToast('Veuillez remplir les champs obligatoires', 'error'); return; }
    setLoading(true);
    const photos = form.photos.length > 0 ? form.photos : [PEXELS_PLACEHOLDER];
    const payload = {
      boutique_id: boutique.id,
      nom: form.nom,
      description: form.description,
      prix: Number(form.prix),
      stock: Number(form.stock) || 0,
      seuil_alerte: Number(form.seuil_alerte) || 5,
      categorie: form.categorie,
      photos,
      actif: form.actif,
    };
    if (editId) {
      await supabase.from('produits').update(payload).eq('id', editId);
      showToast('Produit mis à jour', 'success');
    } else {
      await supabase.from('produits').insert(payload);
      showToast('Produit ajouté', 'success');
    }
    setShowForm(false);
    setForm(defaultForm);
    setEditId(null);
    clearImageState();
    await loadData();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return;
    await supabase.from('produits').delete().eq('id', id);
    showToast('Produit supprimé', 'info');
    await loadData();
  };

  const toggleActive = async (p: Produit) => {
    await supabase.from('produits').update({ actif: !p.actif }).eq('id', p.id);
    await loadData();
  };

  const handleEdit = (p: Produit) => {
    setForm({ nom: p.nom, description: p.description, prix: p.prix.toString(), stock: p.stock.toString(), seuil_alerte: p.seuil_alerte.toString(), categorie: p.categorie, photos: p.photos || [], actif: p.actif });
    setEditId(p.id);
    setShowForm(true);
  };

  const addPhotoUrl = () => {
    if (!photoUrl.trim()) return;
    setForm(f => ({ ...f, photos: [...f.photos, photoUrl.trim()] }));
    setPhotoUrl('');
  };

  const clearImageState = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const safeFileName = (fileName: string) =>
    fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .toLowerCase();

  const validateImage = (file: File) => {
    // Validation cote client pour eviter les uploads inutiles depuis mobile.
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return 'Format non supporte. Utilisez JPG, PNG ou WebP.';
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return 'Image trop lourde. Taille maximale : 5 Mo.';
    }
    return null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !boutique) return;
    const localPreview = URL.createObjectURL(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(localPreview);
    setUploadError(null);

    const validationError = validateImage(file);
    if (validationError) {
      setUploadError(validationError);
      showToast(validationError, 'error');
      return;
    }

    setUploading(true);
    const path = `${boutique.id}/${Date.now()}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })
      .catch((error: Error) => ({ error }));
    if (error) {
      setUploadError(`Upload impossible : ${error.message}`);
      showToast('Erreur upload: ' + error.message, 'error');
      setForm(f => f.photos.length > 0 ? f : { ...f, photos: [PEXELS_PLACEHOLDER] });
    }
    else {
      const { data: url } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
      setForm(f => ({ ...f, photos: [...f.photos, url.publicUrl] }));
      URL.revokeObjectURL(localPreview);
      clearImageState();
      showToast('Photo uploadée', 'success');
    }
    setUploading(false);
  };

  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white px-4 pt-12 pb-4 shadow-sm sticky top-0 z-30 flex items-center gap-3">
          <button onClick={() => { setShowForm(false); setForm(defaultForm); setEditId(null); clearImageState(); }} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">{editId ? 'Modifier le produit' : 'Nouveau produit'}</h1>
        </div>
        <div className="px-4 py-4 space-y-4 pb-28">
          {[
            { label: 'Nom du produit *', key: 'nom', placeholder: 'Ex: Robe en wax', type: 'text' },
            { label: 'Prix (FCFA) *', key: 'prix', placeholder: 'Ex: 15000', type: 'number' },
            { label: 'Stock disponible', key: 'stock', placeholder: 'Ex: 50', type: 'number' },
            { label: "Seuil d'alerte stock", key: 'seuil_alerte', placeholder: 'Ex: 5', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input type={f.type} placeholder={f.placeholder} value={form[f.key as keyof FormData] as string}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="input-field" />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Décrivez votre produit..." rows={3} className="input-field resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <div className="relative">
              <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value as Categorie }))} className="input-field appearance-none pr-10">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>
            <div className="flex gap-2 mb-2">
              <input type="text" placeholder="URL d'une image (Pexels, etc.)" value={photoUrl}
                onChange={e => setPhotoUrl(e.target.value)} className="input-field flex-1" />
              <button onClick={addPhotoUrl} className="btn-primary px-3 py-2 text-sm flex-shrink-0">Ajouter</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 text-sm text-[#1D9E75] border border-[#1D9E75] rounded-xl px-3 py-2 hover:bg-[#1D9E75]/5">
              <Upload className="w-4 h-4" /> {uploading ? 'Upload...' : 'Uploader depuis mon téléphone'}
            </button>
            {previewUrl && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">Apercu avant upload</p>
                <img src={previewUrl} alt="Apercu de la photo produit" className="w-24 h-24 object-cover rounded-xl border border-gray-200" />
              </div>
            )}
            {uploadError && (
              <p className="mt-2 text-xs text-red-500">{uploadError} Une image par defaut sera utilisee si aucune autre photo n'est ajoutee.</p>
            )}
            {form.photos.length > 0 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {form.photos.map((url, i) => (
                  <div key={i} className="relative flex-shrink-0">
                    <img src={url} alt="" className="w-20 h-20 object-cover rounded-xl" />
                    <button onClick={() => setForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm">
            <span className="text-sm font-medium text-gray-700">Produit actif (visible)</span>
            <button onClick={() => setForm(f => ({ ...f, actif: !f.actif }))}
              className={`w-12 h-6 rounded-full transition-colors ${form.actif ? 'bg-[#1D9E75]' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ml-0.5 ${form.actif ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
          <button onClick={handleSave} disabled={loading} className="w-full btn-primary py-4 font-semibold disabled:opacity-60">
            {loading ? 'Enregistrement...' : editId ? 'Mettre à jour' : 'Ajouter le produit'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold text-gray-900">Mes produits ({produits.length})</h1>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none" />
          </div>
          <button onClick={() => { setForm(defaultForm); setEditId(null); setShowForm(true); }} className="btn-primary px-4 py-2.5 flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Aucun produit</p>
            <button onClick={() => setShowForm(true)} className="mt-4 btn-primary px-6 py-2.5 text-sm">Ajouter mon premier produit</button>
          </div>
        ) : (
          filtered.map(p => (
            <div key={p.id} className={`bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 ${!p.actif ? 'opacity-60' : ''}`}>
              <img src={p.photos?.[0] || PEXELS_PLACEHOLDER} alt={p.nom} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{p.nom}</p>
                <p className="text-xs text-[#1D9E75] font-bold mt-0.5">{p.prix.toLocaleString('fr-FR')} FCFA</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs ${p.stock <= p.seuil_alerte ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>Stock: {p.stock}</span>
                  <span className="text-xs text-gray-400">{p.categorie}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => handleEdit(p)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => toggleActive(p)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
                  {p.actif ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-[#1D9E75]" />}
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-2 rounded-xl hover:bg-red-50 text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
