
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, GripVertical, X, Loader2 } from 'lucide-react';
import { useStore } from '../../src/contexts/StoreContext';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { Category } from '../../src/types';

const AdminCategories: React.FC = () => {
  const { db: storeDb } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<Category>>({ name_ar: '', order: 0, isActive: true });
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(storeDb, 'categories'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Category[]);
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

  useEffect(() => { fetchCategories(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(storeDb, 'categories', editingId), form);
      } else {
        await addDoc(collection(storeDb, 'categories'), form);
      }
      setShowModal(false);
      setForm({ name_ar: '', order: 0, isActive: true });
      setEditingId(null);
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا القسم؟')) return;
    try {
      await deleteDoc(doc(storeDb, 'categories', id));
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-black text-white">إدارة الأقسام</h2>
         <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-primary text-white font-bold rounded-xl flex items-center gap-2">
            <Plus className="w-5 h-5" /> إضافة قسم
         </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
          <p className="font-bold">{error}</p>
          <button 
            onClick={fetchCategories}
            className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
      ) : (
        <div className="bg-bg-card border border-primary/10 rounded-2xl divide-y divide-white/5">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-white/2">
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-xs font-bold">{cat.order}</span>
                <h3 className="font-bold text-white">{cat.name_ar}</h3>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded text-[10px] ${cat.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {cat.isActive ? 'نشط' : 'معطل'}
                </span>
                <button onClick={() => { setForm(cat); setEditingId(cat.id); setShowModal(true); }} className="text-primary"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(cat.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
          <form onSubmit={handleSave} className="bg-white/5 border border-white/10 w-full max-w-md rounded-[2rem] p-8 space-y-6 shadow-2xl backdrop-blur-2xl">
            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">{editingId ? 'تعديل قسم' : 'إضافة قسم'}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider opacity-40 px-2">اسم القسم</label>
                <input required placeholder="اسم القسم بالعربي" className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all" value={form.name_ar} onChange={e => setForm({...form, name_ar: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider opacity-40 px-2">الترتيب</label>
                <input required type="number" placeholder="الترتيب" className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all" value={form.order} onChange={e => setForm({...form, order: Number(e.target.value)})} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-white/5 rounded-xl border border-white/5 hover:border-primary/30 transition-all">
                <input type="checkbox" className="w-5 h-5 rounded border-white/10 bg-transparent checked:bg-primary" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
                <span className="text-sm font-bold">تفعيل القسم؟</span>
              </label>
            </div>
            <div className="flex gap-4 pt-4">
               <button type="submit" className="flex-grow py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-all shadow-xl shadow-primary/20">حفظ التغييرات</button>
               <button type="button" onClick={() => setShowModal(false)} className="flex-grow py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-all">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
