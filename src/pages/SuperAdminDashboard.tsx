import React, { useState, useEffect } from 'react';
import { 
  Globe, Users, ShoppingBag, TrendingUp, Plus, 
  Search, Filter, Edit2, Trash2, Shield, 
  CheckCircle2, AlertTriangle, Loader2, DollarSign,
  BarChart3, Activity, Zap, Settings
} from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { Store } from '../types';
import { motion } from 'motion/react';

const SuperAdminDashboard: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStore, setNewStore] = useState<Partial<Store>>({
    name: '',
    subdomain: '',
    status: 'active',
    plan: 'basic',
    databaseId: '(default)'
  });

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'stores'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      setStores(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Store[]);
    } catch (err) {
      console.error('Error fetching stores:', err);
      setError('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'stores'), {
        ...newStore,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      setShowAddModal(false);
      fetchStores();
    } catch (err) {
      console.error('Error creating store:', err);
      alert('Failed to create store');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black tracking-tighter italic uppercase flex items-center gap-3">
              <Shield className="text-primary w-10 h-10" />
              منصة دكان <span className="text-primary">SuperAdmin</span>
            </h1>
            <p className="text-white/40 font-bold mt-2">إدارة جميع المتاجر والاشتراكات في المنصة</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-8 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" /> إضافة متجر جديد
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'إجمالي المتاجر', value: stores.length, icon: ShoppingBag, color: 'text-blue-500' },
            { label: 'المتاجر النشطة', value: stores.filter(s => s.status === 'active').length, icon: CheckCircle2, color: 'text-emerald-500' },
            { label: 'إجمالي الإيرادات', value: '1,250,000 د.ع', icon: DollarSign, color: 'text-primary' },
            { label: 'مستخدمي المنصة', value: '1,420', icon: Users, color: 'text-orange-500' }
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group">
              <div className={`absolute -top-10 -right-10 w-32 h-32 bg-current blur-[60px] opacity-10 ${stat.color}`} />
              <div className="relative z-10 space-y-4">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{stat.label}</p>
                  <h3 className="text-3xl font-black mt-1">{stat.value}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stores Table */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden">
          <div className="p-8 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-xl font-black italic uppercase tracking-tight">قائمة المتاجر</h3>
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                <input 
                  type="text" 
                  placeholder="ابحث عن متجر..." 
                  className="bg-black/40 border border-white/10 rounded-xl px-12 py-3 outline-none focus:border-primary/50 text-sm"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                <tr>
                  <th className="px-8 py-6">المتجر</th>
                  <th className="px-8 py-6">النطاق</th>
                  <th className="px-8 py-6">قاعدة البيانات</th>
                  <th className="px-8 py-6">الخطة</th>
                  <th className="px-8 py-6">الحالة</th>
                  <th className="px-8 py-6">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stores.map(s => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center font-black text-primary border border-white/10 group-hover:border-primary/50 transition-all">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-white">{s.name}</p>
                          <p className="text-[10px] text-white/20 font-bold uppercase">ID: {s.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-blue-400">{s.subdomain}.dukan.com</p>
                        {s.customDomain && <p className="text-[10px] text-white/40">{s.customDomain}</p>}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-mono bg-white/5 px-2 py-1 rounded border border-white/10 text-white/60">
                        {s.databaseId || '(default)'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        s.plan === 'pro' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-white/10 text-white/60 border border-white/20'
                      }`}>
                        {s.plan}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{s.status === 'active' ? 'نشط' : 'معطل'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-primary/10 rounded-xl text-primary transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button className="p-2 hover:bg-red-500/10 rounded-xl text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        <button className="p-2 hover:bg-blue-500/10 rounded-xl text-blue-400 transition-colors"><Globe className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Store Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-xl rounded-[3rem] p-10 space-y-8 shadow-2xl">
            <h3 className="text-2xl font-black italic uppercase tracking-tight">إضافة متجر جديد للمنصة</h3>
            <form onSubmit={handleCreateStore} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30">اسم المتجر</label>
                  <input 
                    required 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary/50"
                    value={newStore.name}
                    onChange={e => setNewStore({...newStore, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30">النطاق الفرعي (Subdomain)</label>
                  <div className="relative">
                    <input 
                      required 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary/50"
                      value={newStore.subdomain}
                      onChange={e => setNewStore({...newStore, subdomain: e.target.value})}
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-30">.dukan.com</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30">قاعدة البيانات (Database ID)</label>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary/50"
                    placeholder="(default)"
                    value={newStore.databaseId}
                    onChange={e => setNewStore({...newStore, databaseId: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30">الخطة</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary/50"
                    value={newStore.plan}
                    onChange={e => setNewStore({...newStore, plan: e.target.value as any})}
                  >
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  className="flex-grow py-5 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                >
                  إنشاء المتجر
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-8 py-5 bg-white/5 text-white font-black rounded-2xl hover:bg-white/10 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
