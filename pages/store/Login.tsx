import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, Lock, Loader2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { auth, db } from '../../src/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { motion } from 'motion/react';
import { doc, getDoc } from 'firebase/firestore';
import { StoreSettings } from '../../src/types';

const OFFICIAL_LOGO = "https://image2url.com/r2/default/images/1771543308854-f7cc02e6-6d52-4704-b910-befd769b6131.png";

const StoreLogin: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Append domain to phone number to use email auth
      const email = `${phone}@store.com`;
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/profile');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/network-request-failed') {
        setError('خطأ في الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.');
      } else {
        setError('خطأ في تسجيل الدخول. يرجى التأكد من رقم الهاتف وكلمة المرور.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-24 w-96 h-96 bg-primary/10 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full animate-pulse delay-700"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-bg-card/60 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-black/50 space-y-10">
          <div className="text-center space-y-6">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-bg-light to-bg-card rounded-3xl border border-white/5 shadow-xl"
            >
              <img src={logo} alt="Logo" className="w-16 h-16 object-contain" />
            </motion.div>
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">مرحباً <span className="text-primary">بعودتك</span></h1>
              <p className="text-sm opacity-40 font-bold uppercase tracking-widest">سجل دخولك للوصول إلى حسابك</p>
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

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-2">رقم الهاتف</label>
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                <Phone className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
                <input 
                  type="tel" 
                  required
                  placeholder="07XXXXXXXXX"
                  className="w-full bg-bg-main/50 border border-white/5 rounded-2xl px-14 py-5 outline-none focus:border-primary/50 transition-all text-left dir-ltr font-mono text-white relative z-10"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">كلمة المرور</label>
                <Link to="/contact" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">نسيت كلمة المرور؟</Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full bg-bg-main/50 border border-white/5 rounded-2xl px-14 py-5 outline-none focus:border-primary/50 transition-all text-white relative z-10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-all flex items-center justify-center gap-3 shadow-2xl shadow-primary/20 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                  <ShieldCheck className="w-6 h-6" />
                  <span className="uppercase italic tracking-widest">دخول النظام</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-6 border-t border-white/5 flex flex-col items-center gap-4">
            <p className="text-xs font-bold text-white/30 uppercase tracking-widest">ليس لديك حساب؟</p>
            <Link 
              to="/signup" 
              className="w-full py-4 bg-white/5 border border-white/5 text-white font-black rounded-2xl hover:bg-white/10 transition-all text-center uppercase italic tracking-widest text-sm"
            >
              إنشاء حساب جديد
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

export default StoreLogin;
