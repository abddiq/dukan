import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Mail, Phone, MapPin, Send, MessageCircle, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../src/firebase';
import { StoreSettings } from '../../src/types';

const StoreContact: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isInstallment = queryParams.get('type') === 'installment';
  const productName = location.state?.productName;

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    subject: isInstallment ? 'طلب شراء بالأقساط' : 'استفسار عن تجميعة',
    message: isInstallment && productName ? `أرغب في شراء المنتج التالي بالأقساط: ${productName}` : ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'store'));
        if (docSnap.exists()) {
          setSettings(docSnap.data() as StoreSettings);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'tickets'), {
        name: formData.name,
        email: formData.contact.includes('@') ? formData.contact : '',
        phone: !formData.contact.includes('@') ? formData.contact : '',
        subject: formData.subject,
        message: formData.message,
        status: 'new',
        createdAt: serverTimestamp()
      });
      setSubmitted(true);
    } catch (error) {
      console.error("Error sending ticket:", error);
      alert("حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
       <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h1 className="text-4xl font-black text-white italic">تواصل مع <span className="text-primary">العرش</span></h1>
          <p className="opacity-60 text-lg">نحن هنا للإجابة على جميع تساؤلاتكم التقنية ومساعدتكم في اختيار أفضل القطع.</p>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Info Side */}
          <div className="space-y-6">
             {[
               { icon: <Phone />, title: 'الهاتف / واتساب', desc: settings?.phone || '07700000000', link: `tel:${settings?.phone}` },
               { icon: <Mail />, title: 'البريد الإلكتروني', desc: settings?.email || 'support@dukan.com', link: `mailto:${settings?.email}` },
               { icon: <MapPin />, title: 'الموقع', desc: settings?.address || 'بغداد - شارع الصناعة - مجمع النخيل', link: '#' }
             ].map((item, i) => (
               <a href={item.link} key={i} className="block p-6 bg-[var(--color-bg-card)] border border-white/5 rounded-3xl hover:border-primary/50 transition-all group">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        {item.icon}
                     </div>
                     <div>
                        <h3 className="text-sm font-bold text-white opacity-40 uppercase tracking-widest">{item.title}</h3>
                        <p className="text-lg font-black text-white">{item.desc}</p>
                     </div>
                  </div>
               </a>
             ))}

             <div className="p-8 bg-gradient-to-br from-primary to-primary-dark rounded-3xl text-white space-y-4 shadow-xl shadow-primary/20">
                <MessageCircle className="w-12 h-12" />
                <h3 className="text-2xl font-black">الدعم المباشر</h3>
                <p className="opacity-80">فريقنا متواجد يومياً من الساعة 10 صباحاً حتى 10 مساءً للرد على استفساراتكم.</p>
                <a 
                  href={`https://wa.me/${settings?.whatsapp?.replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="block w-full py-3 bg-white text-primary font-bold rounded-xl hover:bg-gray-100 transition-colors text-center"
                >
                  ابدأ دردشة الآن
                </a>
             </div>
          </div>

          {/* Form Side */}
          <div className="lg:col-span-2">
             {submitted ? (
                <div className="h-full bg-[var(--color-bg-card)] border border-green-500/20 rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-6">
                   <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center">
                      <Send className="w-10 h-10" />
                   </div>
                   <h2 className="text-3xl font-black text-white">تم الإرسال بنجاح</h2>
                   <p className="opacity-60 max-w-sm">شكراً لتواصلك معنا. سنقوم بالرد على رسالتك في أقرب وقت ممكن.</p>
                   <button onClick={() => setSubmitted(false)} className="text-primary font-bold hover:underline">إرسال رسالة أخرى</button>
                </div>
             ) : (
                <form onSubmit={handleSubmit} className="bg-[var(--color-bg-card)] border border-white/5 rounded-3xl p-8 md:p-12 space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-sm opacity-40 px-2">الاسم</label>
                         <input 
                           required 
                           type="text" 
                           className="w-full bg-bg-card border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-colors" 
                           placeholder="أدخل اسمك الكامل"
                           value={formData.name}
                           onChange={(e) => setFormData({...formData, name: e.target.value})}
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm opacity-40 px-2">رقم الهاتف / الإيميل</label>
                         <input 
                           required 
                           type="text" 
                           className="w-full bg-bg-card border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-colors" 
                           placeholder="كيف نتواصل معك؟"
                           value={formData.contact}
                           onChange={(e) => setFormData({...formData, contact: e.target.value})}
                         />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm opacity-40 px-2">الموضوع</label>
                      <select 
                        className="w-full bg-bg-card border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-colors appearance-none"
                        value={formData.subject}
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      >
                         <option>استفسار عن تجميعة</option>
                         <option>طلب شراء بالأقساط</option>
                         <option>طلب تجميعة مخصصة</option>
                         <option>مشكلة في طلب سابق</option>
                         <option>طلب قطعة غير متوفرة</option>
                         <option>أخرى</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm opacity-40 px-2">الرسالة</label>
                      <textarea 
                        required 
                        className="w-full bg-bg-card border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-colors h-40 resize-none" 
                        placeholder="اكتب استفسارك هنا بالتفصيل..."
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                      ></textarea>
                   </div>
                   <button 
                     type="submit" 
                     disabled={loading}
                     className="w-full py-5 bg-primary text-white font-black text-lg rounded-2xl hover:bg-primary-dark transition-all shadow-xl shadow-primary/10 flex items-center justify-center gap-3"
                   >
                      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>إرسال الرسالة <Send className="w-5 h-5 rotate-180" /></>}
                   </button>
                </form>
             )}
          </div>
       </div>
    </div>
  );
};

export default StoreContact;
