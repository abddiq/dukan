
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Mail, Lock, Check, ArrowRight, Loader2 } from 'lucide-react';
import { db, firebaseConfig } from '../../src/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

const AdminAddTeamMember: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'team_member' as const,
    permissions: [] as string[]
  });

  const PERMISSIONS = [
    { id: 'dashboard', label: 'لوحة التحكم' },
    { id: 'products', label: 'المنتجات' },
    { id: 'orders', label: 'الطلبات' },
    { id: 'customers', label: 'العملاء' },
    { id: 'analytics', label: 'التحليلات' },
    { id: 'suppliers', label: 'الموردين' },
    { id: 'stories', label: 'الستوريات' },
    { id: 'shipping', label: 'الشحن' },
    { id: 'settings', label: 'الإعدادات' },
    { id: 'team', label: 'الفريق' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.permissions.length === 0) {
      alert('يرجى اختيار صلاحية واحدة على الأقل');
      return;
    }

    setLoading(true);
    let secondaryApp;
    try {
      // Create a secondary app instance to create the user in Auth without logging out the admin
      secondaryApp = initializeApp(firebaseConfig, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
      const uid = userCredential.user.uid;
      
      // Sign out and delete the secondary app
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      await setDoc(doc(db, 'users', uid), {
        ...formData,
        uid: uid,
        createdAt: serverTimestamp()
      });
      
      alert('تم إضافة العضو بنجاح. يمكن للعضو الآن تسجيل الدخول مباشرة.');
      navigate('/admin/team');
    } catch (error: any) {
      console.error("Error adding team member:", error);
      if (secondaryApp) await deleteApp(secondaryApp);
      
      if (error.code === 'auth/email-already-in-use') {
        alert('هذا البريد الإلكتروني مستخدم بالفعل');
      } else if (error.code === 'auth/weak-password') {
        alert('كلمة المرور ضعيفة جداً');
      } else {
        alert('حدث خطأ أثناء إضافة العضو: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (id: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(id)
        ? prev.permissions.filter(p => p !== id)
        : [...prev.permissions, id]
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">إضافة <span className="text-primary">عضو فريق</span></h2>
          <p className="text-sm opacity-50">قم بإنشاء حساب جديد وتحديد صلاحيات الوصول</p>
        </div>
        <button onClick={() => navigate('/admin/team')} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all">
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-bg-card border border-white/5 p-8 rounded-[2rem] space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> المعلومات الأساسية
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">الاسم الكامل</label>
                <input 
                  required
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">البريد الإلكتروني</label>
                <input 
                  required
                  type="email"
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary dir-ltr text-left"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">كلمة المرور المؤقتة</label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
                  <input 
                    required
                    className="w-full bg-bg-main border border-white/10 rounded-xl px-12 py-3 text-white outline-none focus:border-primary dir-ltr text-left"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-bg-card border border-white/5 p-8 rounded-[2rem] space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> صلاحيات الوصول
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {PERMISSIONS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePermission(p.id)}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center ${
                    formData.permissions.includes(p.id)
                      ? 'bg-primary/20 border-primary text-white'
                      : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    formData.permissions.includes(p.id) ? 'bg-primary text-white' : 'bg-white/10'
                  }`}>
                    {formData.permissions.includes(p.id) ? <Check className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  </div>
                  <span className="text-xs font-bold">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-primary/10 border border-primary/20 p-8 rounded-[2rem] space-y-6">
            <h3 className="text-lg font-bold text-primary">ملخص الحساب</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="opacity-50">الاسم:</span>
                <span className="text-white font-bold">{formData.name || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-50">الصلاحيات:</span>
                <span className="text-white font-bold">{formData.permissions.length}</span>
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-white font-black rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-3 shadow-2xl shadow-primary/40 uppercase italic tracking-widest"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'إضافة العضو'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminAddTeamMember;
