import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Save, Image, Loader2, ChevronRight, Plus, X, Sparkles, Trash2, Upload, Filter } from 'lucide-react';
import { db, storage } from '../../src/firebase';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Category, Brand, ShippingCompany } from '../../src/types';
import { GoogleGenAI } from "@google/genai";
import { compressImage } from '../../src/lib/imageUtils';

const AdminAddProduct: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isLandingOnly = queryParams.get('landingOnly') === 'true';
  const isDigitalQuery = queryParams.get('isDigital') === 'true';

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [shippingCompanies, setShippingCompanies] = useState<ShippingCompany[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [postToTelegram, setPostToTelegram] = useState(false);
  const [form, setForm] = useState({
    name_ar: '',
    price: 0,
    costPrice: 0,
    categoryId: '',
    brandId: '',
    stockQuantity: 0,
    isActive: true,
    isLandingPageOnly: isLandingOnly,
    isDigital: isDigitalQuery,
    shippingCompanyId: '',
    allowInstallments: false,
    sku: '',
    description_ar: '',
    images: ['', ''] as string[],
    specs: [] as { key: string, value: string }[]
  });

  const generateSKU = () => {
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    setForm(prev => ({ ...prev, sku: `iq-pcth-${randomStr}-${timestamp}` }));
  };

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

  const toBase64 = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      handleImageChange(index, compressed);
    } catch (err) {
      console.error("Compression failed:", err);
      alert("فشل معالجة الصورة");
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

      try {
        const sSnap = await getDocs(collection(db, 'shipping_companies'));
        setShippingCompanies(sSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ShippingCompany[]);
      } catch (err) {
        console.error("Shipping companies fetch failed:", err);
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
        contents: `Generate a compelling, professional, and SEO-friendly product description in Arabic for a high-end gaming product named: "${form.name_ar}". The tone should be exciting and tech-savvy. Focus on performance and quality.`,
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

  const insertText = (text: string) => {
    const textarea = document.getElementById('description_ar') as HTMLTextAreaElement;
    if (!textarea) {
      setForm(prev => ({ ...prev, description_ar: prev.description_ar + text }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = form.description_ar;
    const newText = currentText.substring(0, start) + text + currentText.substring(end);
    
    setForm(prev => ({ ...prev, description_ar: newText }));
    
    // Reset focus and selection after state update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const handleToolbarImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiLoading(true); // Reuse aiLoading for toolbar upload
    try {
      const storageRef = ref(storage, `descriptions/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      insertText(`\n![image](${url})\n`);
    } catch (err) {
      console.error("Toolbar upload failed:", err);
      alert("فشل رفع الصورة للوصف");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.sku) {
      return alert("يرجى إدخال الـ SKU للمنتج");
    }

    if (!form.sku.startsWith('iq-pcth')) {
      return alert("يجب أن يبدأ الـ SKU بـ iq-pcth");
    }

    setSubmitting(true);
    try {
      const cleanedImages = form.images.filter(img => img.trim() !== '');
      const productData = {
        ...form,
        images: cleanedImages,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'products'), productData);

      if (postToTelegram) {
        try {
          const telegramMessage = `<b>🔥 منتج جديد متوفر الآن!</b>\n\n<b>${form.name_ar}</b>\n\nالسعر: ${form.price.toLocaleString()} د.ع\n\n🛒 اطلبه الآن من الرابط:\n${window.location.origin}/product/${docRef.id}`;
          
          await fetch('/api/telegram/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: telegramMessage,
              type: cleanedImages[0] ? 'photo' : 'text',
              fileUrl: cleanedImages[0] || undefined
            })
          });
        } catch (teleErr) {
          console.error("Failed to post to Telegram:", teleErr);
        }
      }

      navigate('/admin/products');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const currentCategory = categories.find(c => c.id === form.categoryId);
  const isGamingCategory = currentCategory?.name_ar.includes('جيمنج') || currentCategory?.name_ar.includes('العاب') || currentCategory?.name_ar.includes('Gaming');

  const addSpec = () => {
    setForm({ ...form, specs: [...form.specs, { key: '', value: '' }] });
  };

  const removeSpec = (index: number) => {
    const newSpecs = form.specs.filter((_, i) => i !== index);
    setForm({ ...form, specs: newSpecs });
  };

  const updateSpec = (index: number, field: 'key' | 'value', val: string) => {
    const newSpecs = [...form.specs];
    newSpecs[index][field] = val;
    setForm({ ...form, specs: newSpecs });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/products')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white">{isLandingOnly ? 'إضافة منتج لاندك بيج' : 'إضافة منتج جديد'}</h2>
              {form.isDigital && <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded-full border border-purple-500/30">رقمي</span>}
              {isGamingCategory && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-full border border-red-500/30">جيمنج</span>}
            </div>
            <p className="text-sm opacity-50">تخصيص المنتج بناءً على القسم المختار</p>
          </div>
        </div>
        
        {currentCategory && (
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white/60">
            القسم: <span className="text-primary">{currentCategory.name_ar}</span>
          </div>
        )}
      </div>

      <div className={`bg-bg-card border ${form.isDigital ? 'border-purple-500/30' : isGamingCategory ? 'border-red-500/30' : 'border-white/10'} rounded-[2.5rem] p-8 shadow-2xl transition-all duration-500`}>
        <form onSubmit={handleSave} className="space-y-8">
            {/* Section: Basic Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${form.isDigital ? 'bg-purple-500/20 text-purple-400' : isGamingCategory ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">المعلومات الأساسية</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-xs opacity-40">اسم المنتج</label>
                   <input required className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none transition-all" value={form.name_ar} onChange={e => setForm({...form, name_ar: e.target.value})} placeholder="اسم المنتج" />
                </div>
                <div className="space-y-2">
                   <label className="text-xs opacity-40 flex justify-between items-center">
                     <span>الـ SKU (كود المنتج)</span>
                     <button type="button" onClick={generateSKU} className="text-[10px] text-primary hover:underline font-bold">توليد تلقائي</button>
                   </label>
                   <input 
                     required 
                     className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none transition-all font-mono text-sm" 
                     value={form.sku} 
                     onChange={e => {
                       let val = e.target.value;
                       if (!val.startsWith('iq-pcth') && val.length > 0) {
                         if ('iq-pcth'.startsWith(val)) {
                           // User is typing the prefix
                         } else {
                           val = 'iq-pcth' + val;
                         }
                       }
                       setForm({...form, sku: val});
                     }} 
                     placeholder="iq-pcth-XXXX" 
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-xs opacity-40">سعر البيع (IQD)</label>
                   <input required type="number" className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none transition-all" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} placeholder="0" />
                </div>
                <div className="space-y-2">
                   <label className="text-xs opacity-40">سعر الشراء جملة (IQD)</label>
                   <input type="number" className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none transition-all" value={form.costPrice} onChange={e => setForm({...form, costPrice: Number(e.target.value)})} placeholder="0" />
                </div>
                <div className="space-y-2">
                   <label className="text-xs opacity-40">القسم</label>
                   <select required className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none transition-all" value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})}>
                     <option value="">اختر قسماً</option>
                     {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-xs opacity-40">العلامة التجارية</label>
                   <select className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none transition-all" value={form.brandId} onChange={e => setForm({...form, brandId: e.target.value})}>
                     <option value="">اختر علامة تجارية</option>
                     {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-xs opacity-40">{form.isDigital ? 'الكمية المتوفرة (أكواد التفعيل)' : 'المخزون'}</label>
                   <input type="number" className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none transition-all" value={form.stockQuantity} onChange={e => setForm({...form, stockQuantity: Number(e.target.value)})} placeholder="0" />
                </div>
              </div>
            </div>

            {/* Section: Settings */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Save className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">الإعدادات والظهور</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-xs opacity-40">الحالة</label>
                   <select className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.isActive ? 'true' : 'false'} onChange={e => setForm({...form, isActive: e.target.value === 'true'})}>
                     <option value="true">نشط</option>
                     <option value="false">معطل</option>
                   </select>
                </div>
                {!form.isDigital && (
                  <div className="space-y-2">
                     <label className="text-xs opacity-40">ظهور المنتج</label>
                     <select className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.isLandingPageOnly ? 'true' : 'false'} onChange={e => setForm({...form, isLandingPageOnly: e.target.value === 'true'})}>
                       <option value="false">يظهر في المتجر واللاندك بيج</option>
                       <option value="true">لاندك بيج فقط (مخفي من المتجر)</option>
                     </select>
                  </div>
                )}
                <div className="space-y-2">
                   <label className="text-xs opacity-40">نظام الأقساط</label>
                   <div className="flex items-center gap-4 p-4 bg-bg-main border border-white/10 rounded-xl">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-white/10 bg-transparent checked:bg-primary" 
                        checked={form.allowInstallments} 
                        onChange={e => setForm({...form, allowInstallments: e.target.checked})} 
                      />
                      <span className="text-sm font-bold">تفعيل الشراء بالأقساط؟</span>
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-xs opacity-40">نوع المنتج</label>
                   <div className="flex items-center gap-4 p-4 bg-bg-main border border-white/10 rounded-xl">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-white/10 bg-transparent checked:bg-primary" 
                        checked={form.isDigital} 
                        onChange={e => setForm({...form, isDigital: e.target.checked})} 
                      />
                      <span className="text-sm font-bold">هذا المنتج رقمي</span>
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-xs opacity-40">تليكرام</label>
                   <div className="flex items-center gap-4 p-4 bg-bg-main border border-blue-500/30 rounded-xl">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-white/10 bg-transparent checked:bg-blue-500" 
                        checked={postToTelegram} 
                        onChange={e => setPostToTelegram(e.target.checked)} 
                      />
                      <span className="text-sm font-bold text-blue-400">نشر في قناة التليكرام تلقائياً؟</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Section: Specs (Dynamic) */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Filter className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">المواصفات الفنية</h3>
                <button 
                  type="button" 
                  onClick={addSpec}
                  className="mr-auto text-[10px] flex items-center gap-1 text-primary hover:underline font-bold"
                >
                  <Plus className="w-3 h-3" /> إضافة خاصية
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {form.specs.map((spec, index) => (
                  <div key={index} className="flex gap-2 items-center p-3 bg-white/5 border border-white/10 rounded-xl">
                    <input 
                      className="flex-1 bg-transparent border-none outline-none text-xs text-white/60 font-bold" 
                      placeholder="الخاصية (مثلاً: المعالج)" 
                      value={spec.key}
                      onChange={e => updateSpec(index, 'key', e.target.value)}
                    />
                    <div className="w-px h-4 bg-white/10" />
                    <input 
                      className="flex-1 bg-transparent border-none outline-none text-xs text-white font-bold" 
                      placeholder="القيمة (مثلاً: i9-13900K)" 
                      value={spec.value}
                      onChange={e => updateSpec(index, 'value', e.target.value)}
                    />
                    <button type="button" onClick={() => removeSpec(index)} className="text-red-500/50 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {form.specs.length === 0 && (
                  <p className="col-span-2 text-center py-4 text-[10px] opacity-30 italic">لا توجد مواصفات مضافة حالياً</p>
                )}
              </div>
            </div>

            {/* Section: Images */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Image className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">صور المنتج</h3>
                <button 
                  type="button" 
                  onClick={addImageField}
                  className="mr-auto text-[10px] flex items-center gap-1 text-primary hover:underline font-bold"
                >
                  <Plus className="w-3 h-3" /> إضافة حقل صورة
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {form.images.map((url, index) => (
                  <div key={index} className="space-y-2 p-4 bg-white/5 border border-white/10 rounded-2xl relative group">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] opacity-40 uppercase font-bold">
                        {index === 0 ? 'الصورة الأساسية' : `صورة إضافية ${index + 1}`}
                      </label>
                      {index > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeImageField(index)}
                          className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-grow">
                        <input 
                          className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-xs text-left dir-ltr font-mono focus:border-primary outline-none" 
                          placeholder="رابط الصورة..."
                          value={url} 
                          onChange={e => handleImageChange(index, e.target.value)} 
                        />
                      </div>
                      <div className="flex gap-1">
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
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          id={`base64-upload-${index}`}
                          onChange={(e) => toBase64(index, e)}
                        />
                        <label 
                          htmlFor={`base64-upload-${index}`}
                          className="p-3 bg-purple-500/10 text-purple-400 rounded-xl hover:bg-purple-500 hover:text-white transition-all cursor-pointer flex items-center justify-center text-[10px] font-bold"
                        >
                          Base64
                        </label>
                      </div>
                    </div>
                    {url && (
                      <div className="mt-3 w-full aspect-video rounded-lg overflow-hidden border border-white/10 bg-black/40">
                        <img src={url} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section: Description */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">الوصف والمميزات</h3>
                <div className="flex items-center gap-2 mr-4">
                  <button 
                    type="button" 
                    onClick={() => insertText('\n• ')}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white hover:bg-white/10 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> إضافة نقطة
                  </button>
                  <button 
                    type="button" 
                    onClick={() => insertText('\n')}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white hover:bg-white/10 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> سطر جديد
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      const url = form.images.find(img => img.trim() !== '');
                      if (url) {
                        insertText(`\n![image](${url})\n`);
                      } else {
                        alert('يرجى رفع صورة أولاً أو استخدام زر الرفع المباشر');
                      }
                    }}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white hover:bg-white/10 transition-all flex items-center gap-1"
                    title="إدراج من صور المنتج"
                  >
                    <Image className="w-3 h-3" /> إدراج من الصور
                  </button>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      id="toolbar-image-upload"
                      onChange={handleToolbarImageUpload}
                    />
                    <label 
                      htmlFor="toolbar-image-upload"
                      className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-[10px] font-bold text-primary hover:bg-primary/20 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" /> رفع وإدراج صورة
                    </label>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={handleGenerateAiDescription}
                  disabled={aiLoading}
                  className="mr-auto text-[10px] flex items-center gap-1 text-primary hover:underline font-bold disabled:opacity-50"
                >
                  {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  توليد بالذكاء الاصطناعي
                </button>
              </div>
              <textarea id="description_ar" className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 h-60 focus:border-primary outline-none transition-all leading-relaxed" value={form.description_ar} onChange={e => setForm({...form, description_ar: e.target.value})} placeholder="وصف المنتج..." />
            </div>

            <div className="flex items-center gap-4 pt-8 border-t border-white/5">
              <button type="submit" disabled={submitting} className={`flex-grow py-4 ${isGamingCategory ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-primary hover:bg-primary-dark shadow-primary/20'} text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2`}>
                {submitting ? <Loader2 className="animate-spin" /> : <><Save className="w-5 h-5" /> حفظ المنتج</>}
              </button>
              <button type="button" onClick={() => navigate('/admin/products')} className="px-8 py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-all border border-white/10">
                إلغاء
              </button>
            </div>
         </form>
      </div>
    </div>
  );
};

export default AdminAddProduct;
