import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Image, Link as LinkIcon, Loader2, ChevronRight, Upload, X } from 'lucide-react';
import { db, storage } from '../../src/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../../src/lib/imageUtils';

const AdminEditHero: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<'image' | 'mobileImage' | null>(null);
  const [form, setForm] = useState({
    image: '',
    mobileImage: '',
    title: '',
    subtitle: '',
    link: '/products',
    isActive: true,
    order: 0,
    hideContent: false
  });

  useEffect(() => {
    const fetchHero = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'hero_slides', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setForm({
            image: data.image || '',
            mobileImage: data.mobileImage || '',
            title: data.title || '',
            subtitle: data.subtitle || '',
            link: data.link || '/products',
            isActive: data.isActive ?? true,
            order: data.order || 0,
            hideContent: data.hideContent || false
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHero();
  }, [id]);

  const handleFileUpload = async (field: 'image' | 'mobileImage', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(field);
    try {
      const storageRef = ref(storage, `hero/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setForm(prev => ({ ...prev, [field]: url }));
    } catch (err) {
      console.error("Upload failed:", err);
      alert("فشل رفع الصورة");
    } finally {
      setUploading(null);
    }
  };

  const toBase64 = async (field: 'image' | 'mobileImage', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setForm(prev => ({ ...prev, [field]: compressed }));
    } catch (err) {
      console.error("Compression failed:", err);
      alert("فشل معالجة الصورة");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'hero_slides', id), {
        ...form,
        updatedAt: serverTimestamp()
      });
      navigate('/admin/hero');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/hero')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-white">تعديل الإعلان</h2>
          <p className="text-sm opacity-50">تعديل بيانات الإعلان الحالي</p>
        </div>
      </div>

      <div className="bg-bg-card border border-primary/30 rounded-3xl p-8">
        <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
               <label className="text-xs opacity-40">رابط الصورة (Desktop)</label>
               <div className="flex gap-2">
                 <div className="relative flex-grow">
                   <Image className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                   <input className="w-full bg-bg-main border border-white/10 rounded-xl px-12 py-3 dir-ltr text-left" value={form.image} onChange={e => setForm({...form, image: e.target.value})} placeholder="https://..." />
                 </div>
                 <div className="flex gap-1">
                   <input type="file" id="desktop-upload" className="hidden" onChange={e => handleFileUpload('image', e)} />
                   <label htmlFor="desktop-upload" className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all cursor-pointer flex items-center justify-center">
                     {uploading === 'image' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                   </label>
                   <input type="file" id="desktop-base64" className="hidden" onChange={e => toBase64('image', e)} />
                   <label htmlFor="desktop-base64" className="p-3 bg-purple-500/10 text-purple-400 rounded-xl hover:bg-purple-500 hover:text-white transition-all cursor-pointer flex items-center justify-center text-[10px] font-bold">
                     Base64
                   </label>
                 </div>
               </div>
            </div>
            <div className="space-y-2">
               <label className="text-xs opacity-40">رابط الصورة (Mobile) - اختياري</label>
               <div className="flex gap-2">
                 <div className="relative flex-grow">
                   <Image className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                   <input className="w-full bg-bg-main border border-white/10 rounded-xl px-12 py-3 dir-ltr text-left" value={form.mobileImage} onChange={e => setForm({...form, mobileImage: e.target.value})} placeholder="https://..." />
                 </div>
                 <div className="flex gap-1">
                   <input type="file" id="mobile-upload" className="hidden" onChange={e => handleFileUpload('mobileImage', e)} />
                   <label htmlFor="mobile-upload" className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all cursor-pointer flex items-center justify-center">
                     {uploading === 'mobileImage' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                   </label>
                   <input type="file" id="mobile-base64" className="hidden" onChange={e => toBase64('mobileImage', e)} />
                   <label htmlFor="mobile-base64" className="p-3 bg-purple-500/10 text-purple-400 rounded-xl hover:bg-purple-500 hover:text-white transition-all cursor-pointer flex items-center justify-center text-[10px] font-bold">
                     Base64
                   </label>
                 </div>
               </div>
            </div>
            <div className="space-y-2">
               <label className="text-xs opacity-40">العنوان الرئيسي</label>
               <input className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="عنوان الإعلان" />
            </div>
            <div className="space-y-2">
               <label className="text-xs opacity-40">العنوان الفرعي</label>
               <input className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3" value={form.subtitle} onChange={e => setForm({...form, subtitle: e.target.value})} placeholder="وصف قصير" />
            </div>
            <div className="space-y-2">
               <label className="text-xs opacity-40">رابط الزر</label>
               <div className="relative">
                 <LinkIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                 <input className="w-full bg-bg-main border border-white/10 rounded-xl px-12 py-3 dir-ltr text-left" value={form.link} onChange={e => setForm({...form, link: e.target.value})} placeholder="/products" />
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
  );
};

export default AdminEditHero;
