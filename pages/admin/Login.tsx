
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle, ShieldCheck, ArrowRight, User } from 'lucide-react';
import { auth, db } from '../../src/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { StoreSettings } from '../../src/types';

const OFFICIAL_LOGO = "https://image2url.com/r2/default/images/1771543308854-f7cc02e6-6d52-4704-b910-befd769b6131.png";

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
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

  const handleInitializeAdmin = async () => {
    setInitLoading(true);
    setError('');
    try {
      const adminEmail = 'admin@dukan.com';
      const adminPass = 'password123';
      
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: 'مدير النظام',
        email: adminEmail,
        role: 'super_admin',
        createdAt: serverTimestamp()
      });

      alert('تم إنشاء حساب المسؤول بنجاح!\nالبريد: admin@dukan.com\nالباسورد: password123');
      setEmail(adminEmail);
      setPassword(adminPass);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('حساب المسؤول الافتراضي موجود بالفعل. يمكنك تسجيل الدخول بـ admin@dukan.com');
        setEmail('admin@dukan.com');
      } else {
        setError('فشل إنشاء الحساب. تأكد من إعداد Firebase Rules بشكل صحيح.');
      }
    } finally {
      setInitLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/admin');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/network-request-failed') {
        setError('خطأ في الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.');
      } else {
        setError('خطأ في تسجيل الدخول. يرجى التأكد من البريد وكلمة المرور.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center px-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-bg-card/80 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-10 md:p-14 shadow-2xl shadow-black/50 space-y-10">
          <div className="text-center space-y-6">
            <motion.div 
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-bg-light to-bg-card rounded-3xl border border-white/5 shadow-2xl relative group"
            >
              <div className="absolute inset-0 bg-primary/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <img src={logo} alt="Logo" className="w-16 h-16 object-contain relative z-10" />
            </motion.div>
            
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">لوحة <span className="text-primary">التحكم</span></h1>
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">نظام إدارة دكان</p>
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-2">البريد الإلكتروني</label>
              <div className="relative group">
                <User className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
                <input 
                  type="email" 
                  required
                  placeholder="admin@dukan.com"
                  className="w-full bg-bg-main/50 border border-white/5 rounded-2xl px-14 py-5 outline-none focus:border-primary/50 transition-all text-white font-medium"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
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
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                  <ShieldCheck className="w-6 h-6" />
                  <span className="uppercase italic tracking-widest">دخول النظام</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-8 border-t border-white/5 flex flex-col gap-4">
            <button 
              onClick={handleInitializeAdmin}
              disabled={initLoading}
              className="text-[10px] font-black text-white/20 hover:text-white transition-colors uppercase tracking-[0.2em]"
            >
              {initLoading ? 'جاري التهيئة...' : 'تهيئة حساب المسؤول الافتراضي'}
            </button>
            <div className="text-center">
              <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-black text-white/20 hover:text-primary transition-colors uppercase tracking-[0.2em] group">
                العودة للموقع الرئيسي
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center mt-10 text-[9px] font-black text-white/10 uppercase tracking-[0.5em]">
          &copy; 2024 دكان SECURE ACCESS
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
