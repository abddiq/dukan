import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Loader2, Save, Image, Link as LinkIcon, Edit2, X } from 'lucide-react';
import { db } from '../../src/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { HeroSlide } from '../../src/types';

const AdminHero: React.FC = () => {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Partial<HeroSlide>>({
    image: '',
    mobileImage: '',
    title: '',
    subtitle: '',
    link: '/products',
    isActive: true,
    order: 0,
    hideContent: false
  });

  const fetchSlides = async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(collection(db, 'hero_slides'));
      const fetchedSlides = snap.docs.map(d => ({ id: d.id, ...d.data() })) as HeroSlide[];
      setSlides(fetchedSlides.sort((a, b) => a.order - b.order));
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

  useEffect(() => { fetchSlides(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإعلان؟')) return;
    try {
      await deleteDoc(doc(db, 'hero_slides', id));
      setSlides(slides.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (form.id) {
        await updateDoc(doc(db, 'hero_slides', form.id), {
          image: form.image,
          mobileImage: form.mobileImage || '',
          title: form.title,
          subtitle: form.subtitle,
          link: form.link,
          isActive: form.isActive,
          order: form.order,
          hideContent: form.hideContent
        });
      } else {
        await addDoc(collection(db, 'hero_slides'), {
          ...form,
          createdAt: serverTimestamp()
        });
      }
      setShowModal(false);
      fetchSlides();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (slide: HeroSlide) => {
    setForm(slide);
    setShowModal(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
         <div>
            <h2 className="text-2xl font-black text-white">إعلانات الهيرو</h2>
            <p className="text-sm opacity-50">تخصيص الصور والنصوص في الصفحة الرئيسية</p>
         </div>
         <button 
           onClick={() => navigate('/admin/hero/add')}
           className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all flex items-center gap-2"
         >
            <Plus className="w-5 h-5" /> إضافة إعلان جديد
         </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
          <p className="font-bold">{error}</p>
          <button 
            onClick={fetchSlides}
            className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {slides.map(slide => (
            <div key={slide.id} className="group relative aspect-video bg-bg-card border border-white/10 rounded-3xl overflow-hidden">
              <img src={slide.image} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
                <h3 className="text-2xl font-black text-white">{slide.title}</h3>
                <p className="text-sm opacity-80 line-clamp-2">{slide.subtitle}</p>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${slide.isActive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    {slide.isActive ? 'نشط' : 'معطل'}
                  </span>
                  {slide.hideContent && (
                    <span className="bg-orange-500/20 text-orange-500 px-2 py-1 rounded text-[10px] font-bold">محتوى مخفي</span>
                  )}
                  {slide.mobileImage && (
                    <span className="bg-blue-500/20 text-blue-500 px-2 py-1 rounded text-[10px] font-bold">صورة موبايل</span>
                  )}
                  <span className="bg-white/10 px-2 py-1 rounded text-[10px]">الترتيب: {slide.order}</span>
                </div>
              </div>

              <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => navigate(`/admin/hero/edit/${slide.id}`)} className="p-2 bg-white/10 backdrop-blur-md hover:bg-primary rounded-xl text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(slide.id)} className="p-2 bg-white/10 backdrop-blur-md hover:bg-red-500 rounded-xl text-white transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-bg-card border border-primary/30 w-full max-w-lg rounded-3xl p-8 space-y-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-full"><X /></button>
            <h3 className="text-xl font-black text-white">{form.id ? 'تعديل الإعلان' : 'إضافة إعلان جديد'}</h3>
            
            <form onSubmit={handleSave} className="space-y-4">
               <div className="space-y-2">
                  <label className="text-xs opacity-40">رابط الصورة (Desktop)</label>
                  <div className="relative">
                    <Image className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                    <input required className="w-full bg-bg-main border border-white/10 rounded-xl px-12 py-3 dir-ltr text-left" value={form.image} onChange={e => setForm({...form, image: e.target.value})} placeholder="https://..." />
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-xs opacity-40">رابط الصورة (Mobile) - اختياري</label>
                  <div className="relative">
                    <Image className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                    <input className="w-full bg-bg-main border border-white/10 rounded-xl px-12 py-3 dir-ltr text-left" value={form.mobileImage} onChange={e => setForm({...form, mobileImage: e.target.value})} placeholder="https://..." />
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-xs opacity-40">العنوان الرئيسي</label>
                  <input required className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
               </div>
               <div className="space-y-2">
                  <label className="text-xs opacity-40">العنوان الفرعي</label>
                  <input required className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.subtitle} onChange={e => setForm({...form, subtitle: e.target.value})} />
               </div>
               <div className="space-y-2">
                  <label className="text-xs opacity-40">رابط الزر</label>
                  <div className="relative">
                    <LinkIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                    <input required className="w-full bg-bg-main border border-white/10 rounded-xl px-12 py-3 dir-ltr text-left" value={form.link} onChange={e => setForm({...form, link: e.target.value})} />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-xs opacity-40">الترتيب</label>
                    <input type="number" className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.order} onChange={e => setForm({...form, order: Number(e.target.value)})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs opacity-40">الحالة</label>
                    <select className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.isActive ? 'true' : 'false'} onChange={e => setForm({...form, isActive: e.target.value === 'true'})}>
                      <option value="true">نشط</option>
                      <option value="false">معطل</option>
                    </select>
                 </div>
               </div>

               <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                  <input 
                    type="checkbox" 
                    id="hideContent"
                    className="w-5 h-5 rounded border-white/10 bg-bg-main text-primary focus:ring-primary"
                    checked={form.hideContent} 
                    onChange={e => setForm({...form, hideContent: e.target.checked})} 
                  />
                  <label htmlFor="hideContent" className="text-sm font-bold text-white cursor-pointer select-none">
                    إخفاء النصوص والزر من فوق الصورة (عرض الصورة فقط)
                  </label>
               </div>

               <button type="submit" disabled={submitting} className="w-full py-4 bg-primary text-white font-black rounded-xl hover:bg-primary-dark flex items-center justify-center gap-2">
                 {submitting ? <Loader2 className="animate-spin" /> : 'حفظ التغييرات'}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHero;
