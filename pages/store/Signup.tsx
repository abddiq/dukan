import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Phone, Lock, MapPin, Loader2, AlertCircle, ArrowLeft, UserPlus } from 'lucide-react';
import { auth, db } from '../../src/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDocs, query, collection, where, deleteDoc, getDoc, limit } from 'firebase/firestore';
import { CITIES } from '../../src/constants';
import { motion } from 'motion/react';
import { StoreSettings } from '../../src/types';

const OFFICIAL_LOGO = "https://image2url.com/r2/default/images/1771543308854-f7cc02e6-6d52-4704-b910-befd769b6131.png";

const StoreSignup: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    city: 'بغداد',
    region: '',
    nearestPoint: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logo, setLogo] = useState(OFFICIAL_LOGO);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'store'));
        if (docSnap.exists()) {
          const data = docSnap.data() as StoreSettings;
          if (data.logoUrl) setLogo(data.logoUrl);
        }
      } catch (error) {
        console.error("Error fetching logo:", error);
      }
    };
    fetchLogo();
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create user with fake email
      const email = `${formData.phone}@store.com`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);
      const user = userCredential.user;

      // Update profile
      await updateProfile(user, {
        displayName: formData.name
      });

      // Check if user already exists (e.g. created by Admin)
      let role = 'customer';
      const q = query(collection(db, 'users'), where('email', '==', email), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        const data = existingDoc.data();
        if (data.role) role = data.role;
        // Delete the old placeholder doc to avoid duplicates
        await deleteDoc(existingDoc.ref);
      }

      // Save additional user data to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: formData.name,
        phone: formData.phone,
        email: email,
        role: role,
        city: formData.city,
        region: formData.region,
        nearestPoint: formData.nearestPoint,
        createdAt: serverTimestamp()
      });

      navigate('/profile');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('رقم الهاتف هذا مسجل مسبقاً.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('خطأ في الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.');
      } else {
        setError('حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -right-24 w-96 h-96 bg-primary/10 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-1/4 -left-24 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full animate-pulse delay-700"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl w-full relative z-10"
      >
        <div className="bg-bg-card/60 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-black/50 space-y-10">
          <div className="text-center space-y-6">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-bg-light to-bg-card rounded-2xl border border-white/5 shadow-xl"
            >
              <img src={logo} alt="Logo" className="w-12 h-12 object-contain" />
            </motion.div>
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">إنشاء <span className="text-primary">حساب</span></h1>
              <p className="text-sm opacity-40 font-bold uppercase tracking-widest">انضم إلى مجتمع اللاعبين الأفضل</p>
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSignup} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3 md:col-span-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-2">الاسم الكامل</label>
              <div className="relative group">
                <User className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
                <input 
                  type="text" 
                  required
                  placeholder="الاسم الثلاثي"
                  className="w-full bg-bg-main/50 border border-white/5 rounded-2xl px-14 py-5 outline-none focus:border-primary/50 transition-all text-white"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-2">رقم الهاتف</label>
              <div className="relative group">
                <Phone className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
                <input 
                  type="tel" 
                  required
                  placeholder="07XXXXXXXXX"
                  className="w-full bg-bg-main/50 border border-white/5 rounded-2xl px-14 py-5 outline-none focus:border-primary/50 transition-all text-left dir-ltr font-mono text-white"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-2">كلمة المرور</label>
              <div className="relative group">
                <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full bg-bg-main/50 border border-white/5 rounded-2xl px-14 py-5 outline-none focus:border-primary/50 transition-all text-white"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            <div className="md:col-span-2 pt-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-white/5"></div>
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">بيانات التوصيل</span>
                <div className="h-px flex-1 bg-white/5"></div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-2">المحافظة</label>
              <div className="relative group">
                <MapPin className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
                <select 
                  className="w-full bg-bg-main/50 border border-white/5 rounded-2xl px-14 py-5 outline-none focus:border-primary/50 transition-all text-white appearance-none"
                  value={formData.city}
                  onChange={e => setFormData({...formData, city: e.target.value})}
                >
                  {CITIES.map(city => <option key={city} value={city} className="bg-bg-card">{city}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-2">المنطقة / الحي</label>
              <input 
                type="text" 
                required
                placeholder="مثال: الكرادة، المنصور..."
                className="w-full bg-bg-main/50 border border-white/5 rounded-2xl px-6 py-5 outline-none focus:border-primary/50 transition-all text-white"
                value={formData.region}
                onChange={e => setFormData({...formData, region: e.target.value})}
              />
            </div>

            <div className="space-y-3 md:col-span-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-2">أقرب نقطة دالة</label>
              <input 
                type="text" 
                required
                placeholder="مثال: قرب جامع الرحمن، مقابل مدرسة..."
                className="w-full bg-bg-main/50 border border-white/5 rounded-2xl px-6 py-5 outline-none focus:border-primary/50 transition-all text-white"
                value={formData.nearestPoint}
                onChange={e => setFormData({...formData, nearestPoint: e.target.value})}
              />
            </div>

            <div className="md:col-span-2 pt-8">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-5 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-all flex items-center justify-center gap-3 shadow-2xl shadow-primary/20 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <UserPlus className="w-6 h-6" />
                    <span className="uppercase italic tracking-widest">إنشاء الحساب</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="pt-6 border-t border-white/5 flex flex-col items-center gap-4">
            <p className="text-xs font-bold text-white/30 uppercase tracking-widest">لديك حساب بالفعل؟</p>
            <Link 
              to="/login" 
              className="w-full py-4 bg-white/5 border border-white/5 text-white font-black rounded-2xl hover:bg-white/10 transition-all text-center uppercase italic tracking-widest text-sm"
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>

        <Link to="/" className="flex items-center justify-center gap-2 mt-8 text-white/20 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">العودة للمتجر</span>
        </Link>
      </motion.div>
    </div>
  );
};

export default StoreSignup;
