
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Loader2, Image as ImageIcon, Video, Calendar, Link as LinkIcon, Check, X, ShoppingBag, Upload, Search } from 'lucide-react';
import { db } from '../../src/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { Story, Product } from '../../src/types';
import { compressImage } from '../../src/lib/imageUtils';
import { compressVideo } from '../../src/lib/videoUtils';

const AdminAddStory: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingProducts, setFetchingProducts] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductList, setShowProductList] = useState(false);
  const [postToTelegram, setPostToTelegram] = useState(false);
  const [form, setForm] = useState<Partial<Story>>({
    type: 'image',
    url: '',
    caption: '',
    productId: '',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    isActive: true
  });

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snap = await getDocs(collection(db, 'products'));
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[]);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setFetchingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (User requested 100MB limit)
    // Note: Firestore has a 1MB limit per document. 100MB will fail to save in Firestore.
    if (file.size > 100 * 1024 * 1024) {
      alert('حجم الملف كبير جداً (الحد الأقصى 100 ميجابايت).');
      return;
    }

    setUploading(true);
    try {
      let base64String = '';
      if (file.type.startsWith('video/')) {
        base64String = await compressVideo(file, 480);
      } else if (file.type.startsWith('image/')) {
        base64String = await compressImage(file, 800, 0.7);
      } else {
        // Fallback for other types
        base64String = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      
      // Check final size
      const sizeInBytes = Math.round((base64String.length * 3) / 4);
      if (sizeInBytes > 1 * 1024 * 1024) {
        console.warn("Compressed file size exceeds Firestore 1MB limit. This might fail to save.");
      }

      setForm({ ...form, url: base64String });
    } catch (err) {
      console.error("Error compressing file:", err);
      alert('حدث خطأ أثناء ضغط الملف. يرجى المحاولة مرة أخرى.');
    } finally {
      setUploading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.name_en?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedProduct = products.find(p => p.id === form.productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.url) {
      alert('يرجى إضافة رابط أو رفع ملف');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'stories'), {
        ...form,
        createdAt: new Date().toISOString()
      });

      if (postToTelegram) {
        try {
          const telegramMessage = `<b>✨ ستوري جديد!</b>\n\n${form.caption || ''}\n\n🔗 شاهد المزيد في المتجر:\n${window.location.origin}`;
          
          await fetch('/api/telegram/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: telegramMessage,
              type: form.type === 'video' ? 'video' : (form.url?.startsWith('http') ? 'photo' : 'text'),
              fileUrl: form.url?.startsWith('http') ? form.url : undefined
            })
          });
        } catch (teleErr) {
          console.error("Failed to post to Telegram:", teleErr);
        }
      }

      navigate('/admin/stories');
    } catch (err) {
      console.error("Error adding story:", err);
      alert('حدث خطأ أثناء إضافة الستوري. قد يكون حجم الملف كبيراً جداً على قاعدة البيانات.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">إضافة ستوري جديد</h2>
          <p className="text-sm opacity-50">قم بإنشاء محتوى مؤقت يظهر لعملائك في الصفحة الرئيسية</p>
        </div>
        <button 
          onClick={() => navigate('/admin/stories')}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 space-y-10 backdrop-blur-xl shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Media Type Selection */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">نوع المحتوى</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button"
                onClick={() => setForm({...form, type: 'image'})}
                className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${form.type === 'image' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/5 text-white/40'}`}
              >
                <ImageIcon className="w-8 h-8" />
                <span className="text-xs font-black uppercase tracking-widest">صورة</span>
              </button>
              <button 
                type="button"
                onClick={() => setForm({...form, type: 'video'})}
                className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${form.type === 'video' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/5 text-white/40'}`}
              >
                <Video className="w-8 h-8" />
                <span className="text-xs font-black uppercase tracking-widest">فيديو</span>
              </button>
            </div>
          </div>

          {/* Media Upload / URL */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">رفع ملف أو إضافة رابط</label>
            <div className="space-y-4">
              <div className="relative">
                <LinkIcon className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
                <input 
                  placeholder="https://example.com/media.mp4" 
                  className="w-full bg-bg-main border border-white/10 rounded-2xl px-14 py-5 text-white outline-none focus:border-primary transition-all dir-ltr" 
                  value={form.url} 
                  onChange={e => setForm({...form, url: e.target.value})} 
                />
              </div>
              
              <div className="relative">
                <input 
                  type="file" 
                  accept={form.type === 'video' ? 'video/*' : 'image/*'} 
                  onChange={handleFileChange}
                  className="hidden" 
                  id="file-upload" 
                />
                <label 
                  htmlFor="file-upload" 
                  className="w-full flex items-center justify-center gap-3 bg-white/5 border border-dashed border-white/10 rounded-2xl py-5 cursor-pointer hover:bg-white/10 transition-all text-sm font-bold"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  {form.url?.startsWith('data:') ? 'تم اختيار ملف' : 'رفع ملف من الجهاز'}
                </label>
              </div>
            </div>
            <p className="text-[10px] opacity-30 px-2 italic">ملاحظة: الحد الأقصى لحجم الملف المرفوع هو 700 كيلوبايت. للملفات الأكبر يرجى استخدام رابط خارجي.</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">نص توضيحي (Caption)</label>
          <textarea 
            placeholder="اكتب شيئاً يظهر أسفل الستوري..." 
            className="w-full bg-bg-main border border-white/10 rounded-3xl px-6 py-5 text-white outline-none focus:border-primary transition-all min-h-[120px] resize-none" 
            value={form.caption} 
            onChange={e => setForm({...form, caption: e.target.value})} 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">تاريخ الانتهاء</label>
            <div className="relative">
              <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
              <input 
                type="datetime-local" 
                required 
                className="w-full bg-bg-main border border-white/10 rounded-2xl px-14 py-5 text-white outline-none focus:border-primary transition-all" 
                value={form.expiresAt} 
                onChange={e => setForm({...form, expiresAt: e.target.value})} 
              />
            </div>
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">ربط بمنتج (اختياري)</label>
            <div className="relative">
              <div 
                onClick={() => setShowProductList(!showProductList)}
                className="w-full bg-bg-main border border-white/10 rounded-2xl px-14 py-5 text-white outline-none focus:border-primary transition-all cursor-pointer flex items-center justify-between"
              >
                <ShoppingBag className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
                <span className={selectedProduct ? 'text-white' : 'text-white/40'}>
                  {selectedProduct ? selectedProduct.name_ar : 'ابحث عن منتج لربطه...'}
                </span>
                <ChevronRight className={`w-5 h-5 opacity-30 transition-transform ${showProductList ? 'rotate-90' : ''}`} />
              </div>

              {showProductList && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-bg-card)] border border-white/10 rounded-2xl overflow-hidden z-[100] shadow-2xl backdrop-blur-xl">
                  <div className="p-4 border-bottom border-white/5">
                    <div className="relative">
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                      <input 
                        autoFocus
                        placeholder="اكتب اسم المنتج..." 
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-10 py-3 text-sm outline-none focus:border-primary transition-all"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="max-h-[250px] overflow-y-auto no-scrollbar">
                    <button 
                      type="button"
                      onClick={() => {
                        setForm({...form, productId: ''});
                        setShowProductList(false);
                        setSearchQuery('');
                      }}
                      className="w-full px-6 py-4 text-right hover:bg-white/5 transition-colors text-sm border-b border-white/5 flex items-center justify-between"
                    >
                      <span>بدون منتج</span>
                      {!form.productId && <Check className="w-4 h-4 text-primary" />}
                    </button>
                    {filteredProducts.map(p => (
                      <button 
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setForm({...form, productId: p.id});
                          setShowProductList(false);
                          setSearchQuery('');
                        }}
                        className="w-full px-6 py-4 text-right hover:bg-white/5 transition-colors text-sm border-b border-white/5 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <img src={p.images?.[0]} className="w-8 h-8 rounded-lg object-cover" alt="" />
                          <span className="line-clamp-1">{p.name_ar}</span>
                        </div>
                        {form.productId === p.id && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="p-8 text-center opacity-40 text-xs">لا توجد نتائج للبحث</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-6 space-y-4">
          <div className="flex items-center gap-4 p-4 bg-white/5 border border-blue-500/30 rounded-2xl">
            <input 
              type="checkbox" 
              className="w-5 h-5 rounded border-white/10 bg-transparent checked:bg-blue-500" 
              checked={postToTelegram} 
              onChange={e => setPostToTelegram(e.target.checked)} 
            />
            <span className="text-sm font-bold text-blue-400">نشر هذا الستوري في التليكرام أيضاً؟</span>
          </div>
          <button 
            type="submit" 
            disabled={loading || uploading} 
            className="w-full py-6 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark flex items-center justify-center gap-4 transition-all shadow-2xl shadow-primary/40 uppercase italic tracking-widest text-lg"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>نشر الستوري الآن <Check className="w-6 h-6" /></>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminAddStory;
