
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Shield, Mail, Lock, Check, ArrowRight, Loader2, Save } from 'lucide-react';
import { db } from '../../src/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { User as UserType } from '../../src/types';

const AdminEditTeamMember: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'team_member' as 'admin' | 'team_member' | 'super_admin' | 'customer',
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

  useEffect(() => {
    const fetchMember = async () => {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, 'users', id));
        if (docSnap.exists()) {
          const data = docSnap.data() as UserType;
          setFormData({
            name: data.name || '',
            email: data.email || '',
            password: data.password || '',
            role: data.role || 'team_member',
            permissions: data.permissions || []
          });
        } else {
          alert('العضو غير موجود');
          navigate('/admin/team');
        }
      } catch (error) {
        console.error("Error fetching team member:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMember();
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (formData.permissions.length === 0 && formData.role !== 'super_admin') {
      alert('يرجى اختيار صلاحية واحدة على الأقل');
      return;
    }

    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', id), {
        ...formData,
        updatedAt: serverTimestamp()
      });
      
      alert('تم تحديث بيانات العضو بنجاح');
      navigate('/admin/team');
    } catch (error: any) {
      console.error("Error updating team member:", error);
      alert('حدث خطأ أثناء تحديث العضو: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">تعديل <span className="text-primary">عضو الفريق</span></h2>
          <p className="text-sm opacity-50">تحديث المعلومات وصلاحيات الوصول لـ {formData.name}</p>
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
                  readOnly
                  type="email"
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white/50 outline-none dir-ltr text-left cursor-not-allowed"
                  value={formData.email}
                />
                <p className="text-[10px] text-orange-500/60 font-bold">لا يمكن تغيير البريد الإلكتروني بعد الإنشاء</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                  <input 
                    required
                    type="text"
                    className="w-full bg-bg-main border border-white/10 rounded-xl px-12 py-3 text-white outline-none focus:border-primary font-mono"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    placeholder="كلمة المرور الجديدة"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">الدور الوظيفي</label>
                <select 
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as any})}
                >
                  <option value="team_member">عضو فريق</option>
                  <option value="admin">مدير</option>
                  <option value="super_admin">مدير خارق</option>
                </select>
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
                  disabled={formData.role === 'super_admin'}
                  onClick={() => togglePermission(p.id)}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center ${
                    formData.role === 'super_admin' || formData.permissions.includes(p.id)
                      ? 'bg-primary/20 border-primary text-white'
                      : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'
                  } ${formData.role === 'super_admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    formData.role === 'super_admin' || formData.permissions.includes(p.id) ? 'bg-primary text-white' : 'bg-white/10'
                  }`}>
                    {formData.role === 'super_admin' || formData.permissions.includes(p.id) ? <Check className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  </div>
                  <span className="text-xs font-bold">{p.label}</span>
                </button>
              ))}
            </div>
            {formData.role === 'super_admin' && (
              <p className="text-xs text-amber-500 font-bold text-center">المدير الخارق لديه كافة الصلاحيات تلقائياً</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-primary/10 border border-primary/20 p-8 rounded-[2rem] space-y-6 sticky top-24">
            <h3 className="text-lg font-bold text-primary">حفظ التغييرات</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="opacity-50">الاسم:</span>
                <span className="text-white font-bold">{formData.name || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-50">الدور:</span>
                <span className="text-white font-bold">
                  {formData.role === 'super_admin' ? 'مدير خارق' : formData.role === 'admin' ? 'مدير' : 'عضو فريق'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-50">الصلاحيات:</span>
                <span className="text-white font-bold">{formData.role === 'super_admin' ? 'كاملة' : formData.permissions.length}</span>
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-primary text-white font-black rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-3 shadow-2xl shadow-primary/40 uppercase italic tracking-widest"
            >
              {submitting ? <Loader2 className="animate-spin" /> : <><Save className="w-5 h-5" /> حفظ البيانات</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminEditTeamMember;
