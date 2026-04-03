
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { db } from '../../src/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Brand } from '../../src/types';

const AdminBrands: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<Brand>>({ name: '', logoUrl: '', isActive: true });
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchBrands = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'brands'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      setBrands(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Brand[]);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'permission-denied') {
        setError('ليس لديك صلاحية للوصول إلى هذه البيانات. يرجى التأكد من إعداد قواعد الحماية في Firebase.');
      } else {
        setError('حدث خطأ أثناء جلب البيانات.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBrands(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'brands', editingId), {
          ...form,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'brands'), {
          ...form,
          createdAt: serverTimestamp()
        });
      }
      setShowModal(false);
      setForm({ name: '', logoUrl: '', isActive: true });
      setEditingId(null);
      fetchBrands();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذه العلامة التجارية؟')) return;
    try {
      await deleteDoc(doc(db, 'brands', id));
      fetchBrands();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
         <div>
            <h2 className="text-2xl font-black text-white">إدارة العلامات التجارية</h2>
            <p className="text-sm opacity-50">إضافة وتعديل الماركات العالمية المتوفرة في المتجر</p>
         </div>
         <button onClick={() => { setEditingId(null); setForm({ name: '', logoUrl: '', isActive: true }); setShowModal(true); }} className="px-6 py-3 bg-primary text-white font-bold rounded-xl flex items-center gap-2">
            <Plus className="w-5 h-5" /> إضافة علامة
         </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
          <p className="font-bold">{error}</p>
          <button 
            onClick={fetchBrands}
            className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map(brand => (
            <div key={brand.id} className="bg-bg-card border border-primary/10 rounded-3xl p-6 flex items-center justify-between hover:border-primary/30 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/5">
                  {brand.logoUrl ? (
                    <img src={brand.logoUrl} alt={brand.name} className="w-full h-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="w-6 h-6 opacity-20" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white">{brand.name}</h3>
                  <span className={`text-[10px] font-bold uppercase ${brand.isActive ? 'text-green-500' : 'text-red-500'}`}>
                    {brand.isActive ? 'نشط' : 'معطل'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setForm(brand); setEditingId(brand.id); setShowModal(true); }} className="p-2 hover:bg-primary/10 rounded-lg text-primary"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(brand.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {brands.length === 0 && (
            <div className="col-span-full py-20 bg-bg-card border border-dashed border-white/10 rounded-3xl flex flex-col items-center text-center">
              <ImageIcon className="w-16 h-16 opacity-10 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">لا توجد علامات تجارية</h3>
              <p className="opacity-40 max-w-xs">ابدأ بإضافة أول علامة تجارية لمتجرك الآن.</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
          <form onSubmit={handleSave} className="bg-white/5 border border-white/10 w-full max-w-md rounded-[2.5rem] p-10 space-y-8 shadow-2xl backdrop-blur-2xl relative">
            <button type="button" onClick={() => setShowModal(false)} className="absolute top-8 left-8 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10"><X className="w-6 h-6" /></button>
            
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{editingId ? 'تعديل علامة تجارية' : 'إضافة علامة تجارية'}</h3>
              <p className="text-xs opacity-40 uppercase tracking-widest font-bold">Brand Management System</p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider opacity-40 px-2">اسم العلامة</label>
                <input required placeholder="مثال: ASUS, MSI, NVIDIA..." className="w-full bg-bg-main border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-primary transition-all" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider opacity-40 px-2">رابط الشعار (Logo URL)</label>
                <input placeholder="https://example.com/logo.png" className="w-full bg-bg-main border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-primary transition-all" value={form.logoUrl} onChange={e => setForm({...form, logoUrl: e.target.value})} />
              </div>
 
              <label className="flex items-center gap-4 cursor-pointer p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-primary/30 transition-all group">
                <input type="checkbox" className="w-6 h-6 rounded-lg border-white/10 bg-transparent checked:bg-primary transition-all" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
                <span className="text-sm font-black uppercase tracking-tight text-white group-hover:text-primary transition-colors">تفعيل العلامة التجارية</span>
              </label>
            </div>
 
            <div className="flex gap-4 pt-4">
               <button type="submit" className="flex-grow py-5 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-all shadow-2xl shadow-primary/40 uppercase italic tracking-widest">حفظ البيانات</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminBrands;
