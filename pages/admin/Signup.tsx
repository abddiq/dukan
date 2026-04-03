import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, ShieldCheck, ArrowLeft, AlertCircle, Mail, Phone } from 'lucide-react';
import { auth, db } from '../../src/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs, deleteDoc, limit } from 'firebase/firestore';
import { StoreSettings } from '../../src/types';

const OFFICIAL_LOGO = "https://image2url.com/r2/default/images/1771543308854-f7cc02e6-6d52-4704-b910-befd769b6131.png";

const AdminSignup: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logo, setLogo] = useState(OFFICIAL_LOGO);

  React.useEffect(() => {
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
    if (formData.password !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: formData.name
      });

      // Check if user was pre-invited (exists in users collection by email)
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', formData.email), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // User was invited, update their existing doc with the new uid
        const existingDoc = querySnapshot.docs[0];
        const existingData = existingDoc.data();
        
        await setDoc(doc(db, 'users', user.uid), {
          ...existingData,
          uid: user.uid,
          name: formData.name, // Update with actual name from signup
          updatedAt: serverTimestamp()
        });
        
        // Delete the old doc if it had a different ID (like a random one from addDoc)
        if (existingDoc.id !== user.uid) {
          await deleteDoc(doc(db, 'users', existingDoc.id));
        }
      } else {
        // Create new admin user doc with super_admin role (first user case)
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: formData.name,
          email: formData.email,
          role: 'super_admin',
          createdAt: serverTimestamp()
        });
      }

      navigate('/admin');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('البريد الإلكتروني مسجل مسبقاً');
      } else if (err.code === 'auth/network-request-failed') {
        setError('خطأ في الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.');
      } else {
        setError('حدث خطأ أثناء إنشاء الحساب');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-10">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-32 h-32 transition-transform hover:scale-105 duration-500">
            <img src={logo} alt="dukan logo" className="w-28 h-28 object-contain" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Admin <span className="text-primary">Signup</span></h1>
            <p className="text-sm opacity-50 font-medium">إنشاء حساب مدير بصلاحيات كاملة</p>
          </div>
        </div>

        <form onSubmit={handleSignup} className="bg-bg-card border border-primary/30 p-8 rounded-[2rem] space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full"></div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-center gap-3 text-sm animate-shake">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="space-y-2 relative z-10">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 px-2">الاسم الكامل</label>
            <div className="relative">
              <User className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
              <input 
                required
                type="text" 
                className="w-full bg-bg-main border border-white/5 rounded-xl px-12 py-4 outline-none focus:border-primary transition-all text-white font-medium text-sm" 
                placeholder="الاسم الكامل"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2 relative z-10">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 px-2">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
              <input 
                required
                type="email" 
                className="w-full bg-bg-main border border-white/5 rounded-xl px-12 py-4 outline-none focus:border-primary transition-all text-white font-medium text-sm" 
                placeholder="admin@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2 relative z-10">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 px-2">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
              <input 
                required
                type="password" 
                className="w-full bg-bg-main border border-white/5 rounded-xl px-12 py-4 outline-none focus:border-primary transition-all text-white font-medium text-sm" 
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2 relative z-10">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 px-2">تأكيد كلمة المرور</label>
            <div className="relative">
              <ShieldCheck className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
              <input 
                required
                type="password" 
                className="w-full bg-bg-main border border-white/5 rounded-xl px-12 py-4 outline-none focus:border-primary transition-all text-white font-medium text-sm" 
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </div>
          </div>

          <button 
            disabled={loading}
            type="submit" 
            className="w-full py-4 bg-primary text-white font-black text-base rounded-xl hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 relative z-10 group overflow-hidden mt-4"
          >
            <span className="relative z-10">{loading ? 'جاري الإنشاء...' : 'إنشاء حساب مسؤول'}</span>
          </button>

          <div className="text-center pt-2">
            <Link to="/admin/login" className="text-xs text-white/40 hover:text-white transition-colors">
              لديك حساب بالفعل؟ تسجيل الدخول
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSignup;
