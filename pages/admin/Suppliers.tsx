import React, { useState, useEffect } from 'react';
import { db } from '../../src/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Supplier } from '../../src/types';
import { Plus, Trash2, Loader2, Phone, Globe, MapPin, Package, X } from 'lucide-react';

const AdminSuppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    website: '',
    phone: '',
    address: '',
    category: ''
  });

  const fetchSuppliers = async () => {
    try {
      const snap = await getDocs(collection(db, 'suppliers'));
      setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Supplier[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleEdit = (supplier: Supplier) => {
    setForm({
      name: supplier.name,
      website: supplier.website || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      category: supplier.category || ''
    });
    setEditingId(supplier.id);
    setIsEditing(true);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing && editingId) {
        await updateDoc(doc(db, 'suppliers', editingId), {
          ...form,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'suppliers'), {
          ...form,
          createdAt: new Date().toISOString()
        });
      }
      setForm({ name: '', website: '', phone: '', address: '', category: '' });
      setShowAddModal(false);
      setIsEditing(false);
      setEditingId(null);
      fetchSuppliers();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصدر؟')) return;
    try {
      await deleteDoc(doc(db, 'suppliers', id));
      fetchSuppliers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">مصادر الشراء</h2>
          <p className="text-sm opacity-50">إدارة الموردين ومصادر الحصول على المنتجات</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-primary-dark transition-all shadow-xl shadow-primary/20"
        >
          <Plus className="w-5 h-5" /> إضافة مصدر جديد
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map(supplier => (
            <div key={supplier.id} className="bg-bg-card border border-white/5 rounded-3xl p-6 space-y-4 group hover:border-primary/30 transition-all">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Package className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEdit(supplier)}
                    className="p-2 text-blue-500/40 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                    title="تعديل"
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                  <button onClick={() => handleDelete(supplier.id)} className="p-2 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-black text-white">{supplier.name}</h3>
                <p className="text-xs text-primary font-bold uppercase tracking-widest mt-1">{supplier.category}</p>
              </div>

              <div className="space-y-2 pt-2">
                {supplier.phone && (
                  <div className="flex items-center gap-3 text-sm opacity-60">
                    <Phone className="w-4 h-4" />
                    <span className="dir-ltr">{supplier.phone}</span>
                  </div>
                )}
                {supplier.website && (
                  <div className="flex items-center gap-3 text-sm opacity-60">
                    <Globe className="w-4 h-4" />
                    <a href={supplier.website} target="_blank" rel="noreferrer" className="hover:text-primary underline">المتجر الإلكتروني</a>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-3 text-sm opacity-60">
                    <MapPin className="w-4 h-4" />
                    <span>{supplier.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {suppliers.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
              <p className="opacity-40">لا توجد مصادر شراء مضافة حالياً</p>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-bg-card border border-white/10 rounded-[2.5rem] w-full max-w-lg p-8 space-y-8 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-white">{isEditing ? 'تعديل المصدر' : 'إضافة مصدر جديد'}</h3>
              <button onClick={() => { setShowAddModal(false); setIsEditing(false); setEditingId(null); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs opacity-40 px-2">اسم المورد / المصدر</label>
                <input required className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="مثال: شركة النور للتقنية" />
              </div>
              <div className="space-y-2">
                <label className="text-xs opacity-40 px-2">ماذا يبيع؟ (التخصص)</label>
                <input required className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="مثال: كروت شاشة، معالجات" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs opacity-40 px-2">رقم الهاتف</label>
                  <input className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 dir-ltr" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+964..." />
                </div>
                <div className="space-y-2">
                  <label className="text-xs opacity-40 px-2">الموقع الإلكتروني</label>
                  <input className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 dir-ltr" value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs opacity-40 px-2">العنوان</label>
                <input className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="بغداد، شارع الصناعة..." />
              </div>

              <button type="submit" disabled={submitting} className="w-full py-4 bg-primary text-white font-black rounded-xl hover:bg-primary-dark flex items-center justify-center gap-2 transition-all">
                {submitting ? <Loader2 className="animate-spin" /> : (isEditing ? 'تحديث المصدر' : 'حفظ المصدر')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSuppliers;
