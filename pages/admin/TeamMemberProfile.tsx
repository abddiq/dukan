import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Shield, Mail, Phone, Calendar, Clock, CheckCircle, 
  AlertCircle, ChevronRight, ArrowLeft, User as UserIcon,
  Activity, ShoppingCart, MessageSquare, Star, Zap,
  TrendingUp, Award, Target, BarChart3, LogOut
} from 'lucide-react';
import { motion } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../../src/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy, Timestamp } from 'firebase/firestore';
import { User, Order, OrderStatus } from '../../src/types';
import { getUserActivities, UserActivity, ActivityType } from '../../src/services/activityService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell
} from 'recharts';

const TeamMemberProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMemberData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch Member Info
      const memberDoc = await getDoc(doc(db, 'users', id));
      if (!memberDoc.exists()) {
        setError('عضو الفريق غير موجود');
        return;
      }
      const memberData = { uid: memberDoc.id, ...memberDoc.data() } as User;
      setMember(memberData);

      // Fetch Orders handled by this member
      // We query orders where statusHistory contains updatedBy == id
      // Since Firestore doesn't support array-contains on nested objects easily without specific indexing,
      // we might need to fetch a sample or use a different approach if the data is large.
      // For now, we'll fetch recent orders and filter in memory or assume a 'handledBy' field if we can.
      // Actually, let's try a query on statusHistory if possible, or just fetch recent orders.
      const ordersSnap = await getDocs(query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
        limit(100)
      ));
      
      const allOrders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Order[];
      const handledOrders = allOrders.filter(order => 
        order.statusHistory?.some(h => h.updatedBy === id)
      );
      
      setOrders(handledOrders);
      
      // Fetch User Activities (Login/Logout)
      const userActivities = await getUserActivities(id);
      setActivities(userActivities);

    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, 'users');
      setError('حدث خطأ أثناء جلب بيانات العضو');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberData();
  }, [id]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const confirmedOrders = orders.filter(o => o.status === OrderStatus.CONFIRMED || o.status === OrderStatus.DELIVERED).length;
    const successRate = totalOrders > 0 ? (confirmedOrders / totalOrders) * 100 : 0;
    
    // Group by status
    const statusCounts = orders.reduce((acc: any, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    return {
      totalOrders,
      confirmedOrders,
      successRate,
      chartData
    };
  }, [orders]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-white/40 animate-pulse uppercase tracking-widest">جاري تحميل الملف الشخصي...</p>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{error || 'عضو غير موجود'}</h2>
          <p className="text-sm opacity-50">يرجى التأكد من الرابط أو المحاولة لاحقاً</p>
        </div>
        <button onClick={() => navigate('/admin/team')} className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> العودة للفريق
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header & Navigation */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/team')} className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">ملف <span className="text-primary">العضو</span></h2>
            <div className="flex items-center gap-2 text-xs opacity-40 font-bold uppercase tracking-widest">
              <Activity className="w-3 h-3 text-emerald-500" /> الحالة: نشط الآن
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <Link to={`/admin/team/edit/${member.uid}`} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all flex items-center gap-2 border border-white/5">
             تعديل الصلاحيات
           </Link>
           <div className="px-6 py-3 bg-emerald-500/10 text-emerald-500 font-bold rounded-xl border border-emerald-500/20 flex items-center gap-2">
             <Shield className="w-5 h-5" /> {member.role === 'super_admin' ? 'مدير خارق' : member.role === 'admin' ? 'مدير' : 'عضو فريق'}
           </div>
        </div>
      </div>

      {/* Main Profile Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Info Card */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-bg-card border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full group-hover:bg-primary/20 transition-all"></div>
            
            <div className="flex flex-col items-center text-center gap-6 relative z-10">
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-black text-5xl shadow-2xl shadow-primary/30 border-2 border-white/10">
                {member.name.charAt(0).toUpperCase()}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white tracking-tight">{member.name}</h3>
                <p className="text-sm text-primary font-bold uppercase tracking-widest">{member.email}</p>
              </div>

              <div className="w-full grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                <div className="p-4 bg-white/5 rounded-2xl text-center">
                  <div className="text-[10px] opacity-40 font-black uppercase tracking-widest mb-1">تاريخ الانضمام</div>
                  <div className="text-sm font-bold text-white">
                    {member.createdAt ? new Date(member.createdAt).toLocaleDateString('ar-IQ') : 'N/A'}
                  </div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl text-center">
                  <div className="text-[10px] opacity-40 font-black uppercase tracking-widest mb-1">آخر ظهور</div>
                  <div className="text-sm font-bold text-white">اليوم</div>
                </div>
              </div>

              <div className="w-full space-y-4 pt-6">
                <div className="flex items-center gap-4 text-right">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] opacity-40 font-black uppercase tracking-widest">البريد الإلكتروني</div>
                    <div className="text-sm font-bold text-white">{member.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] opacity-40 font-black uppercase tracking-widest">رقم الهاتف</div>
                    <div className="text-sm font-bold text-white">{member.phone || 'غير متوفر'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Permissions Card */}
          <div className="bg-bg-card border border-white/5 rounded-[2.5rem] p-8 space-y-6">
            <h4 className="text-sm font-black text-white italic uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> الصلاحيات الممنوحة
            </h4>
            <div className="flex flex-wrap gap-2">
              {member.permissions?.map(p => (
                <div key={p} className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-xs text-white/60 font-bold flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-emerald-500" /> {p}
                </div>
              )) || <p className="text-xs opacity-40">لا توجد صلاحيات مخصصة</p>}
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Performance */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-bg-card border border-white/5 rounded-3xl p-6 flex items-center gap-6 group hover:border-primary/30 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-7 h-7" />
              </div>
              <div>
                <div className="text-[10px] opacity-40 font-black uppercase tracking-widest mb-1">طلبات تمت معالجتها</div>
                <div className="text-2xl font-black text-white font-mono">{stats.totalOrders}</div>
              </div>
            </div>
            
            <div className="bg-bg-card border border-white/5 rounded-3xl p-6 flex items-center gap-6 group hover:border-emerald-500/30 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                <Target className="w-7 h-7" />
              </div>
              <div>
                <div className="text-[10px] opacity-40 font-black uppercase tracking-widest mb-1">طلبات مؤكدة</div>
                <div className="text-2xl font-black text-white font-mono">{stats.confirmedOrders}</div>
              </div>
            </div>

            <div className="bg-bg-card border border-white/5 rounded-3xl p-6 flex items-center gap-6 group hover:border-amber-500/30 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7" />
              </div>
              <div>
                <div className="text-[10px] opacity-40 font-black uppercase tracking-widest mb-1">نسبة النجاح</div>
                <div className="text-2xl font-black text-white font-mono">{stats.successRate.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-bg-card border border-white/5 rounded-[2.5rem] p-8 space-y-6">
              <h4 className="text-sm font-black text-white italic uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> توزيع الحالات
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#A855F7', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#151619', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-bg-card border border-white/5 rounded-[2.5rem] p-8 space-y-6">
              <h4 className="text-sm font-black text-white italic uppercase tracking-widest flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" /> الإنجازات
              </h4>
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">دقة البيانات</div>
                      <div className="text-[10px] opacity-40 uppercase font-black tracking-widest">ممتاز</div>
                    </div>
                  </div>
                  <div className="text-emerald-500 font-black font-mono">98%</div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">سرعة المعالجة</div>
                      <div className="text-[10px] opacity-40 uppercase font-black tracking-widest">سريع جداً</div>
                    </div>
                  </div>
                  <div className="text-primary font-black font-mono">12m</div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                      <Star className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">تقييم الأداء</div>
                      <div className="text-[10px] opacity-40 uppercase font-black tracking-widest">عضو متميز</div>
                    </div>
                  </div>
                  <div className="text-amber-500 font-black font-mono">4.9</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="bg-bg-card border border-white/5 rounded-[2.5rem] overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h4 className="text-sm font-black text-white italic uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" /> سجل الدخول والخروج
              </h4>
              <div className="text-[10px] opacity-40 font-black uppercase tracking-widest">آخر 50 نشاط</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-white/5">
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">النشاط</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">التفاصيل</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">الوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {activities.map(activity => (
                    <tr key={activity.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            activity.type === ActivityType.LOGIN ? 'bg-emerald-500/10 text-emerald-500' :
                            activity.type === ActivityType.LOGOUT ? 'bg-red-500/10 text-red-500' :
                            'bg-primary/10 text-primary'
                          }`}>
                            {activity.type === ActivityType.LOGIN ? <CheckCircle className="w-4 h-4" /> : 
                             activity.type === ActivityType.LOGOUT ? <LogOut className="w-4 h-4" /> : 
                             <Activity className="w-4 h-4" />}
                          </div>
                          <span className="text-sm font-bold text-white">
                            {activity.type === ActivityType.LOGIN ? 'تسجيل دخول' : 
                             activity.type === ActivityType.LOGOUT ? 'تسجيل خروج' : 
                             activity.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <div className="text-xs text-white/60">{activity.details || '-'}</div>
                      </td>
                      <td className="px-8 py-4">
                        <div className="text-xs font-bold text-white/40">
                          {activity.timestamp ? (activity.timestamp instanceof Timestamp ? activity.timestamp.toDate().toLocaleString('ar-IQ') : new Date(activity.timestamp.seconds * 1000).toLocaleString('ar-IQ')) : 'جاري...'}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activities.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-8 py-12 text-center opacity-40 italic">لا توجد سجلات نشاط لهذا العضو</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity Table (Orders) */}
          <div className="bg-bg-card border border-white/5 rounded-[2.5rem] overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h4 className="text-sm font-black text-white italic uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" /> آخر النشاطات (الطلبات)
              </h4>
              <div className="text-[10px] opacity-40 font-black uppercase tracking-widest">آخر 100 طلب</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-white/5">
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">رقم الطلب</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">العميل</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">الحالة</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">التاريخ</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest opacity-40"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.slice(0, 10).map(order => (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-8 py-4">
                        <div className="text-sm font-black text-white font-mono">#{order.orderNumber}</div>
                      </td>
                      <td className="px-8 py-4">
                        <div className="text-sm font-bold text-white">{order.customer.name}</div>
                        <div className="text-[10px] opacity-40 font-mono">{order.customer.phone}</div>
                      </td>
                      <td className="px-8 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          order.status === OrderStatus.DELIVERED ? 'bg-emerald-500/20 text-emerald-500' :
                          order.status === OrderStatus.CANCELLED ? 'bg-red-500/20 text-red-500' :
                          'bg-primary/20 text-primary'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-8 py-4">
                        <div className="text-xs font-bold text-white/60">
                          {new Date(order.createdAt?.seconds * 1000).toLocaleDateString('ar-IQ')}
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <Link to={`/admin/orders/${order.id}`} className="p-2 bg-white/5 rounded-lg hover:bg-primary hover:text-white transition-all inline-flex">
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center opacity-40 italic">لا توجد نشاطات مسجلة لهذا العضو</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamMemberProfile;
