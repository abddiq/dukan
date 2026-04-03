
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Edit2, Trash2, Eye, X, Loader2, Upload, Sparkles, ExternalLink } from 'lucide-react';
import { db, storage } from '../../src/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Product, Category, Brand } from '../../src/types';
// Fix: Implement Gemini API for AI-assisted product descriptions
import { GoogleGenAI } from "@google/genai";

const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Form State
  const [form, setForm] = useState<Partial<Product>>({
    name_ar: '',
    price: 0,
    categoryId: '',
    brandId: '',
    stockQuantity: 0,
    isActive: true,
    description_ar: '',
    specs: [],
    images: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const pSnap = await getDocs(collection(db, 'products'));
      const cSnap = await getDocs(collection(db, 'categories'));
      
      const allProducts = pSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
      // Filter out digital products from regular products list
      setProducts(allProducts.filter(p => !p.isDigital));
      setCategories(cSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Category[]);

      try {
        const bSnap = await getDocs(collection(db, 'brands'));
        setBrands(bSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Brand[]);
      } catch (brandErr) {
        console.warn("Could not fetch brands in admin:", brandErr);
      }
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

  const handleGenerateAiDescription = async () => {
    if (!form.name_ar) return alert("يرجى إدخال اسم المنتج أولاً");
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a compelling, professional, and SEO-friendly product description in Arabic for a high-end gaming product named: "${form.name_ar}". The tone should be exciting and tech-savvy. Focus on performance and quality.`,
      });
      if (response.text) {
        setForm(prev => ({ ...prev, description_ar: response.text }));
      }
    } catch (err) {
      console.error("AI Generation failed:", err);
      alert("فشل توليد الوصف بالذكاء الاصطناعي.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = {
        ...form,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await addDoc(collection(db, 'products'), data);
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
         <div className="w-full lg:w-auto">
            <h2 className="text-2xl font-black text-white">إدارة المنتجات</h2>
            <p className="text-sm opacity-50">عرض وتعديل وإضافة المنتجات الجديدة للمتجر</p>
         </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <button 
              onClick={() => navigate('/admin/products/add?landingOnly=true')}
              className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
            >
                <Plus className="w-5 h-5" /> إضافة منتج لاندك بيج
            </button>
            <button 
              onClick={() => navigate('/admin/products/add')}
              className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
            >
                <Plus className="w-5 h-5" /> إضافة منتج جديد
            </button>
          </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
          <p className="font-bold">{error}</p>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      <div className="p-4 bg-bg-card border border-primary/10 rounded-2xl flex flex-col md:flex-row gap-4">
         <div className="relative flex-grow">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
            <input 
              type="text" 
              placeholder="ابحث عن اسم المنتج، SKU أو الماركة..." 
              className="w-full bg-bg-main border border-white/5 rounded-xl px-12 py-3 outline-none focus:border-primary/50 text-sm"
            />
         </div>
         <select className="bg-bg-main border border-white/5 rounded-xl px-4 py-3 outline-none text-sm">
            <option>جميع الأقسام</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
         </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
      ) : (
        <div className="bg-bg-card border border-primary/10 rounded-2xl overflow-hidden">
           {/* Desktop Table View */}
           <div className="hidden md:block overflow-x-auto">
             <table className="w-full text-right min-w-[800px]">
              <thead className="bg-white/5 text-xs font-black uppercase tracking-widest text-primary">
                 <tr>
                    <th className="px-6 py-4">المنتج</th>
                    <th className="px-6 py-4">القسم</th>
                    <th className="px-6 py-4">السعر</th>
                    <th className="px-6 py-4">المخزون</th>
                    <th className="px-6 py-4">الحالة</th>
                    <th className="px-6 py-4">الإجراءات</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                 {products.map(p => (
                   <tr key={p.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-white/5 overflow-hidden">
                               <img src={p.images?.[0] || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                            </div>
                            <div>
                               <div className="text-sm font-bold text-white flex items-center gap-2">
                                 {p.name_ar}
                                 {p.isLandingPageOnly && (
                                   <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded uppercase tracking-tighter border border-emerald-500/20">صفحة هبوط فقط</span>
                                 )}
                               </div>
                               <div className="text-[10px] opacity-40">ID: {p.id.substring(0, 8)}</div>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-sm opacity-70">
                         {categories.find(c => c.id === p.categoryId)?.name_ar || 'غير محدد'}
                      </td>
                      <td className="px-6 py-4 font-bold text-white text-sm">
                         {(p.price || 0).toLocaleString()} د.ع
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${p.stockQuantity > 5 ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                            <span className="text-sm">{p.stockQuantity} قطعة</span>
                         </div>
                      </td>
                      <td className="px-6 py-4">
                         <span className={`px-2 py-1 ${p.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} text-[10px] font-bold rounded uppercase`}>
                           {p.isActive ? 'نشط' : 'معطل'}
                         </span>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                            <button 
                               onClick={() => {
                                 const url = `${window.location.origin}/#/lp/${p.id}`;
                                 navigator.clipboard.writeText(url);
                                 alert('تم نسخ رابط صفحة الهبوط: ' + url);
                               }} 
                               className="p-2 hover:bg-blue-500/10 rounded-lg text-blue-400"
                               title="نسخ رابط صفحة الهبوط"
                             >
                               <ExternalLink className="w-4 h-4" />
                             </button>
                             <button onClick={() => navigate(`/admin/products/edit/${p.id}`)} className="p-2 hover:bg-primary/10 rounded-lg text-primary"><Edit2 className="w-4 h-4" /></button>
                             <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                         </div>
                      </td>
                   </tr>
                 ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-white/5">
            {products.map(p => (
              <div key={p.id} className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white/5 overflow-hidden shrink-0">
                    <img src={p.images?.[0] || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="text-sm font-bold text-white truncate">{p.name_ar}</div>
                    <div className="text-[10px] opacity-40">ID: {p.id.substring(0, 8)}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-black text-primary">{(p.price || 0).toLocaleString()} د.ع</span>
                      {p.isLandingPageOnly && (
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded uppercase border border-emerald-500/20">هبوط</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${p.stockQuantity > 5 ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                      <span className="opacity-60">{p.stockQuantity} قطعة</span>
                    </div>
                    <span className={`px-1.5 py-0.5 ${p.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} font-bold rounded uppercase`}>
                      {p.isActive ? 'نشط' : 'معطل'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => {
                        const url = `${window.location.origin}/#/lp/${p.id}`;
                        navigator.clipboard.writeText(url);
                        alert('تم نسخ الرابط');
                      }} 
                      className="p-2 bg-white/5 rounded-lg text-blue-400"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => navigate(`/admin/products/edit/${p.id}`)} className="p-2 bg-white/5 rounded-lg text-primary">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 bg-white/5 rounded-lg text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-bg-card border border-primary/30 w-full max-w-2xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-white">إضافة منتج جديد</h3>
              <button onClick={() => setShowModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-xs opacity-40">اسم المنتج</label>
                  <input required className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.name_ar} onChange={e => setForm({...form, name_ar: e.target.value})} />
               </div>
               <div className="space-y-2">
                  <label className="text-xs opacity-40">السعر (IQD)</label>
                  <input required type="number" className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} />
               </div>
               <div className="space-y-2">
                  <label className="text-xs opacity-40">القسم</label>
                  <select required className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})}>
                    <option value="">اختر قسماً</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-xs opacity-40">العلامة التجارية</label>
                  <select className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.brandId} onChange={e => setForm({...form, brandId: e.target.value})}>
                    <option value="">بدون علامة</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-xs opacity-40">المخزون</label>
                  <input required type="number" className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.stockQuantity} onChange={e => setForm({...form, stockQuantity: Number(e.target.value)})} />
               </div>
               <div className="space-y-2">
                  <label className="text-xs opacity-40">روابط الصور (كل رابط في سطر)</label>
                  <textarea 
                    className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 h-24 text-left dir-ltr" 
                    placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                    value={form.images?.join('\n')} 
                    onChange={e => setForm({...form, images: e.target.value.split('\n').filter(Boolean)})} 
                  />
                  <p className="text-[10px] opacity-40">الصورة الأولى ستكون الصورة الأساسية للمنتج.</p>
               </div>
               <div className="md:col-span-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs opacity-40">الوصف</label>
                    <button 
                      type="button"
                      onClick={handleGenerateAiDescription}
                      disabled={aiLoading}
                      className="text-[10px] flex items-center gap-1 text-primary hover:underline font-bold disabled:opacity-50"
                    >
                      {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      توليد بالذكاء الاصطناعي
                    </button>
                  </div>
                  <textarea required className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 h-32" value={form.description_ar} onChange={e => setForm({...form, description_ar: e.target.value})} />
               </div>
               <div className="md:col-span-2">
                  <button type="submit" disabled={submitting} className="w-full py-4 bg-primary text-white font-black rounded-xl hover:bg-primary-dark flex items-center justify-center gap-2">
                    {submitting ? <Loader2 className="animate-spin" /> : 'حفظ المنتج'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
