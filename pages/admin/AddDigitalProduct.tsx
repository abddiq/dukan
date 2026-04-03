
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Image, Loader2, ChevronRight, Plus, X, Sparkles, Trash2, Upload, Zap } from 'lucide-react';
import { db, storage } from '../../src/firebase';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Category, Brand } from '../../src/types';
import { GoogleGenAI } from "@google/genai";

const AdminAddDigitalProduct: React.FC = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  
  const [form, setForm] = useState({
    name_ar: '',
    price: 0,
    costPrice: 0,
    categoryId: '',
    brandId: '',
    stockQuantity: 999, // Default high for digital
    isActive: true,
    isLandingPageOnly: false,
    isDigital: true,
    allowInstallments: false,
    description_ar: '',
    digitalContent: '',
    digitalKeys: '', // New field for keys input
    images: ['', ''] as string[],
  });

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...form.images];
    newImages[index] = value;
    setForm({ ...form, images: newImages });
  };

  const addImageField = () => {
    setForm({ ...form, images: [...form.images, ''] });
  };

  const removeImageField = (index: number) => {
    if (form.images.length <= 1) return;
    const newImages = form.images.filter((_, i) => i !== index);
    setForm({ ...form, images: newImages });
  };

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);
    try {
      const storageRef = ref(storage, `products/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      handleImageChange(index, url);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("فشل رفع الصورة");
    } finally {
      setUploadingIndex(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cSnap = await getDocs(collection(db, 'categories'));
        setCategories(cSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Category[]);
      } catch (err) {
        console.error("Categories fetch failed:", err);
      }
      
      try {
        const bSnap = await getDocs(collection(db, 'brands'));
        setBrands(bSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Brand[]);
      } catch (err) {
        console.error("Brands fetch failed:", err);
      }
    };
    fetchData();
  }, []);

  const handleGenerateAiDescription = async () => {
    if (!form.name_ar) return alert("يرجى إدخال اسم المنتج أولاً");
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a compelling, professional, and SEO-friendly product description in Arabic for a digital product (software, key, or service) named: "${form.name_ar}". The tone should be exciting and tech-savvy. Focus on instant delivery and quality.`,
      });
      if (response.text) {
        setForm(prev => ({ ...prev, description_ar: response.text || '' }));
      }
    } catch (err) {
      console.error("AI Generation failed:", err);
      alert("فشل توليد الوصف بالذكاء الاصطناعي.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleanedImages = form.images.filter(img => img.trim() !== '');
      const keysArray = form.digitalKeys.split('\n').map(k => k.trim()).filter(Boolean);
      
      await addDoc(collection(db, 'products'), {
        ...form,
        images: cleanedImages,
        digitalKeys: keysArray,
        stockQuantity: keysArray.length > 0 ? keysArray.length : form.stockQuantity,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      navigate('/admin/digital-products');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/digital-products')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white">إضافة منتج رقمي جديد</h2>
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm opacity-50">المنتجات الرقمية يتم تسليمها إلكترونياً ولا تتطلب شحن</p>
        </div>
      </div>

      <div className="bg-bg-card border border-primary/30 rounded-3xl p-8">
        <form onSubmit={handleSave} className="space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-xs opacity-40">اسم المنتج الرقمي</label>
                <input required className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.name_ar} onChange={e => setForm({...form, name_ar: e.target.value})} placeholder="مثال: كود تفعيل ويندوز 11" />
             </div>
             <div className="space-y-2">
                <label className="text-xs opacity-40">سعر البيع (IQD)</label>
                <input required type="number" className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} placeholder="0" />
             </div>
             <div className="space-y-2">
                <label className="text-xs opacity-40">سعر التكلفة (IQD)</label>
                <input type="number" className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.costPrice} onChange={e => setForm({...form, costPrice: Number(e.target.value)})} placeholder="0" />
             </div>
             <div className="space-y-2">
                <label className="text-xs opacity-40">القسم</label>
                <select required className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})}>
                  <option value="">اختر قسماً</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-xs opacity-40">العلامة التجارية (اختياري)</label>
                <select className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.brandId} onChange={e => setForm({...form, brandId: e.target.value})}>
                  <option value="">اختر علامة تجارية</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-xs opacity-40">الكمية المتوفرة (أدخل 999 للكمية غير المحدودة)</label>
                <input type="number" className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.stockQuantity} onChange={e => setForm({...form, stockQuantity: Number(e.target.value)})} placeholder="999" />
             </div>
           </div>

           <div className="space-y-2">
              <label className="text-xs opacity-40">محتوى المنتج الرقمي (رابط التحميل، أو تعليمات عامة)</label>
              <textarea 
                className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 h-24" 
                value={form.digitalContent} 
                onChange={e => setForm({...form, digitalContent: e.target.value})} 
                placeholder="سيتم إرسال هذا المحتوى للعميل بعد إتمام الدفع..."
              />
           </div>

           <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs opacity-40">أكواد التفعيل / الحسابات (كود واحد في كل سطر)</label>
                <span className="text-[10px] text-primary font-bold">
                  {form.digitalKeys.split('\n').filter(k => k.trim()).length} كود متوفر
                </span>
              </div>
              <textarea 
                className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 h-32 font-mono text-sm" 
                value={form.digitalKeys} 
                onChange={e => setForm({...form, digitalKeys: e.target.value})} 
                placeholder="أدخل الأكواد هنا، كود واحد لكل سطر...&#10;ABC-123&#10;XYZ-789"
              />
              <p className="text-[10px] opacity-40">سيتم استهلاك كود واحد لكل عملية شراء. سيتم تحديث المخزون تلقائياً بناءً على عدد الأكواد.</p>
           </div>

           <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-widest opacity-40">صور المنتج</label>
                <button 
                  type="button" 
                  onClick={addImageField}
                  className="text-xs flex items-center gap-1 text-primary hover:underline font-bold"
                >
                  <Plus className="w-3 h-3" /> إضافة حقل صورة إضافي
                </button>
              </div>
              
              <div className="space-y-3">
                {form.images.map((url, index) => (
                  <div key={index} className="space-y-2">
                    <label className="text-[10px] opacity-40 px-2">
                      {index === 0 ? 'الصورة الأساسية' : index === 1 ? 'الصورة الثانية' : `صورة إضافية ${index + 1}`}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-grow">
                        <Image className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
                        <input 
                          className="w-full bg-bg-main border border-white/10 rounded-xl px-12 py-3 text-sm text-left dir-ltr font-mono" 
                          placeholder="https://example.com/image.jpg"
                          value={url} 
                          onChange={e => handleImageChange(index, e.target.value)} 
                        />
                      </div>
                      <div className="relative">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          id={`file-upload-${index}`}
                          onChange={(e) => handleFileUpload(index, e)}
                        />
                        <label 
                          htmlFor={`file-upload-${index}`}
                          className={`p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all cursor-pointer flex items-center justify-center ${uploadingIndex === index ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {uploadingIndex === index ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        </label>
                      </div>
                      {index > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeImageField(index)}
                          className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
           </div>

           <div className="space-y-2">
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
              <textarea required className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 h-40" value={form.description_ar} onChange={e => setForm({...form, description_ar: e.target.value})} placeholder="وصف المنتج الرقمي..." />
           </div>

           <div className="flex items-center gap-4 pt-4 border-t border-white/5">
             <button type="submit" disabled={submitting} className="flex-grow py-4 bg-primary text-white font-black rounded-xl hover:bg-primary-dark flex items-center justify-center gap-2">
               {submitting ? <Loader2 className="animate-spin" /> : 'حفظ المنتج الرقمي'}
             </button>
             <button type="button" onClick={() => navigate('/admin/digital-products')} className="px-8 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10">
               إلغاء
             </button>
           </div>
        </form>
      </div>
    </div>
  );
};

export default AdminAddDigitalProduct;
