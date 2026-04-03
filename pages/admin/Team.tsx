import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Shield, User as UserIcon, Mail, Key, Check, ExternalLink, Edit } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../../src/firebase';
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { User } from '../../src/types';

const AdminTeam: React.FC = () => {
  const navigate = useNavigate();
  const [team, setTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'team_member', 'super_admin']));
      const snap = await getDocs(q);
      setTeam(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as User[]);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.LIST, 'users');
      console.error(err);
      if (err.code === 'permission-denied') {
        setError('ليس لديك صلاحية للوصول إلى هذه البيانات.');
      } else {
        setError('حدث خطأ أثناء جلب البيانات.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeam(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العضو؟')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      setTeam(team.filter(t => t.uid !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
         <div>
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">فريق <span className="text-primary">العمل</span></h2>
            <p className="text-sm opacity-50">إدارة صلاحيات الوصول والتحكم في لوحة الإدارة</p>
         </div>
         <Link 
           to="/admin/team/add"
           className="px-8 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-all flex items-center gap-3 shadow-2xl shadow-primary/40 uppercase italic tracking-widest"
         >
            <Plus className="w-5 h-5" /> إضافة عضو جديد
         </Link>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl text-center">
          <p className="font-bold">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.map(member => (
            <div key={member.uid} className="bg-bg-card border border-white/5 rounded-[2rem] p-8 flex flex-col gap-6 group hover:border-primary/30 transition-all relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 blur-[80px] rounded-full"></div>
              
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-primary/20 border border-white/10">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{member.name}</h3>
                    <div className="flex items-center gap-2 text-xs opacity-40">
                      <Mail className="w-3 h-3" /> {member.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate(`/admin/team/${member.uid}`)} className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all" title="عرض الملف الشخصي">
                    <UserIcon className="w-5 h-5" />
                  </button>
                  <button onClick={() => navigate(`/admin/team/edit/${member.uid}`)} className="p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all" title="تعديل">
                    <Edit className="w-5 h-5" />
                  </button>
                  {member.role !== 'super_admin' && (
                    <button onClick={() => handleDelete(member.uid)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all" title="حذف">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                    member.role === 'super_admin' ? 'bg-amber-500/20 text-amber-500' : 
                    member.role === 'admin' ? 'bg-blue-500/20 text-blue-500' : 'bg-emerald-500/20 text-emerald-500'
                  }`}>
                    <Shield className="w-3 h-3" />
                    {member.role === 'super_admin' ? 'مدير خارق' : member.role === 'admin' ? 'مدير' : 'عضو فريق'}
                  </div>
                  <div className="text-[10px] opacity-30 font-bold uppercase tracking-widest">
                    {member.createdAt ? new Date(member.createdAt['seconds'] * 1000).toLocaleDateString('ar-IQ') : 'N/A'}
                  </div>
                </div>

                {member.permissions && member.permissions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">الصلاحيات الممنوحة</p>
                    <div className="flex flex-wrap gap-2">
                      {member.permissions.map(p => (
                        <span key={p} className="px-2 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] text-white/60 font-bold">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {member.password && (
                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 text-[10px] opacity-40 uppercase font-bold">
                      <Key className="w-3 h-3" /> كلمة المرور
                    </div>
                    <code className="text-xs text-primary font-mono">{member.password}</code>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTeam;
