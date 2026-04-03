import React, { useState, useEffect } from 'react';
import { db } from '../../src/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Order, Product, OrderStatus, LandingPageSession } from '../../src/types';
import { Loader2, TrendingUp, DollarSign, ShoppingCart, Package, ArrowUpRight, ArrowDownRight, Calendar, MousePointer2, Clock, BarChart2, Eye, Target, Smartphone, Monitor, Tablet, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, AreaChart, Area } from 'recharts';

const AdminAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'landing'>('general');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sessions, setSessions] = useState<LandingPageSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignStats, setCampaignStats] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalOrders: 0,
    deliveredOrders: 0,
    avgOrderValue: 0
  });

  const [selectedSession, setSelectedSession] = useState<LandingPageSession | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersSnap, productsSnap, sessionsSnap] = await Promise.all([
          getDocs(collection(db, 'orders')),
          getDocs(collection(db, 'products')),
          getDocs(query(collection(db, 'landing_page_sessions'), orderBy('entryTime', 'desc'), limit(1000)))
        ]);

        const fetchedOrders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Order[];
        const fetchedProducts = productsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
        const fetchedSessions = sessionsSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            entryTime: data.entryTime?.toDate() || new Date(),
            orderTime: data.orderTime?.toDate() || null,
            device: data.device || (data.deviceInfo?.userAgent?.toLowerCase().includes('mobile') ? 'mobile' : 'desktop')
          };
        }) as LandingPageSession[];
        
        setOrders(fetchedOrders);
        setProducts(fetchedProducts);
        setSessions(fetchedSessions);

        // Calculate Campaign Stats
        const campaignMap: Record<string, any> = {};
        
        fetchedSessions.forEach(session => {
          const source = session.utmSource || 'Direct';
          const campaign = session.utmCampaign || 'No Campaign';
          const key = `${source} | ${campaign}`;
          
          if (!campaignMap[key]) {
            campaignMap[key] = {
              source,
              campaign,
              sessions: 0,
              conversions: 0,
              revenue: 0,
              avgScroll: 0,
              totalScroll: 0,
              avgDuration: 0,
              totalDuration: 0,
              convertedSessions: 0
            };
          }
          
          const campaignData = campaignMap[key];
          campaignData.sessions += 1;
          campaignData.totalScroll += (session.scrollDepth || 0);
          
          if (session.isConverted) {
            campaignData.conversions += 1;
            campaignData.totalDuration += (session.duration || 0);
            campaignData.convertedSessions += 1;
            
            // Find associated order to get revenue
            const order = fetchedOrders.find(o => o.sessionId === session.id);
            if (order) {
              campaignData.revenue += order.totalAmount;
            }
          }
        });

        const calculatedCampaigns = Object.values(campaignMap).map(c => ({
          ...c,
          conversionRate: (c.conversions / c.sessions) * 100,
          avgScroll: c.totalScroll / c.sessions,
          avgDuration: c.convertedSessions > 0 ? c.totalDuration / c.convertedSessions : 0
        })).sort((a, b) => b.sessions - a.sessions);

        setCampaignStats(calculatedCampaigns);

        // Calculate Stats
        // User said: "Delivered" means "Paid"
        const delivered = fetchedOrders.filter(o => o.status === OrderStatus.DELIVERED);
        
        let revenue = 0;
        let profit = 0;

        delivered.forEach(order => {
          revenue += order.totalAmount;
          
          order.items.forEach(item => {
            const product = fetchedProducts.find(p => p.id === item.productId);
            const cost = product?.costPrice || 0;
            // Profit = (Selling Price - Cost Price) * Qty
            // Note: item.price is the price at the time of order
            profit += (item.price - cost) * item.qty;
          });
        });

        setStats({
          totalRevenue: revenue,
          totalProfit: profit,
          totalOrders: fetchedOrders.length,
          deliveredOrders: delivered.length,
          avgOrderValue: delivered.length > 0 ? revenue / delivered.length : 0
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getTopSellingProducts = () => {
    const productSales: Record<string, { name: string, qty: number, revenue: number }> = {};
    
    orders.filter(o => o.status === OrderStatus.DELIVERED).forEach(order => {
      order.items?.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.name, qty: 0, revenue: 0 };
        }
        productSales[item.productId].qty += item.qty;
        productSales[item.productId].revenue += item.price * item.qty;
      });
    });

    return Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  const data = [
    { name: 'إجمالي المبيعات', value: stats.totalRevenue, color: 'var(--color-primary)' },
    { name: 'إجمالي الأرباح', value: stats.totalProfit, color: '#10B981' },
  ];

  const topProducts = getTopSellingProducts();

  const renderGeneralStats = () => (
    <div className="space-y-10">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-bg-card border border-white/5 p-8 rounded-[2rem] space-y-4 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-all"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> 12%
            </span>
          </div>
          <div className="relative z-10">
            <p className="text-xs opacity-40 font-bold uppercase tracking-widest">إجمالي المبيعات</p>
            <h3 className="text-2xl font-black text-white mt-1">{stats.totalRevenue.toLocaleString()} <span className="text-xs opacity-40">د.ع</span></h3>
          </div>
        </div>

        <div className="bg-bg-card border border-white/5 p-8 rounded-[2rem] space-y-4 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full group-hover:bg-emerald-500/10 transition-all"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> 8%
            </span>
          </div>
          <div className="relative z-10">
            <p className="text-xs opacity-40 font-bold uppercase tracking-widest">صافي الأرباح</p>
            <h3 className="text-2xl font-black text-white mt-1">{stats.totalProfit.toLocaleString()} <span className="text-xs opacity-40">د.ع</span></h3>
          </div>
        </div>

        <div className="bg-bg-card border border-white/5 p-8 rounded-[2rem] space-y-4 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full group-hover:bg-blue-500/10 transition-all"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-xs opacity-40 font-bold uppercase tracking-widest">الطلبات المستلمة</p>
            <h3 className="text-2xl font-black text-white mt-1">{stats.deliveredOrders} <span className="text-xs opacity-40">طلب</span></h3>
          </div>
        </div>

        <div className="bg-bg-card border border-white/5 p-8 rounded-[2rem] space-y-4 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full group-hover:bg-orange-500/10 transition-all"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-xs opacity-40 font-bold uppercase tracking-widest">متوسط قيمة الطلب</p>
            <h3 className="text-2xl font-black text-white mt-1">{Math.round(stats.avgOrderValue).toLocaleString()} <span className="text-xs opacity-40">د.ع</span></h3>
          </div>
        </div>
      </div>

      {/* Charts & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-bg-card border border-white/5 p-8 rounded-[2.5rem] space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-white">مقارنة المبيعات والأرباح</h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid #ffffff10', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-bg-card border border-white/5 p-8 rounded-[2.5rem] space-y-6">
          <h3 className="text-xl font-black text-white">المنتجات الأكثر مبيعاً</h3>
          <div className="space-y-4">
            {topProducts.length > 0 ? topProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-primary/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                    #{i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white line-clamp-1">{p.name}</p>
                    <p className="text-[10px] opacity-40 uppercase font-bold">{p.qty} مبيعات</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-primary">{p.revenue.toLocaleString()}</p>
                  <p className="text-[10px] opacity-30">IQD</p>
                </div>
              </div>
            )) : (
              <div className="py-10 text-center opacity-40 text-sm italic">لا توجد بيانات مبيعات حالياً</div>
            )}
          </div>
        </div>
      </div>

      {/* Distribution Chart */}
      <div className="bg-bg-card border border-white/5 p-8 rounded-[2.5rem] grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <h3 className="text-2xl font-black text-white">توزيع الأرباح والمبيعات</h3>
          <p className="text-sm opacity-50 leading-relaxed">يوضح هذا الرسم البياني النسبة المئوية للأرباح مقارنة بإجمالي المبيعات المحققة من الطلبات التي تم تسليمها بنجاح.</p>
          <div className="flex flex-wrap gap-6 pt-4">
            {data.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: d.color }}></div>
                <div>
                  <p className="text-xs font-bold text-white">{d.name}</p>
                  <p className="text-[10px] opacity-40">{Math.round((d.value / (stats.totalRevenue || 1)) * 100)}% من الإجمالي</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="h-[300px] w-full flex items-center justify-center">
           <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid #ffffff10', borderRadius: '16px' }}
                />
              </PieChart>
           </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderLandingStats = () => {
    const totalSessions = sessions.length;
    const conversions = sessions.filter(s => s.isConverted).length;
    const conversionRate = totalSessions > 0 ? (conversions / totalSessions) * 100 : 0;
    
    const convertedSessions = sessions.filter(s => s.isConverted && s.duration);
    const avgTimeToPurchase = convertedSessions.length > 0 
      ? convertedSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / convertedSessions.length
      : 0;

    const deviceStats = sessions.reduce((acc: any, s) => {
      const ua = s.deviceInfo?.userAgent?.toLowerCase() || '';
      const device = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') ? 'Mobile' : 'Desktop';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {});

    const deviceData = Object.entries(deviceStats).map(([name, value]) => ({ name, value }));

    const interactionStats = sessions.reduce((acc: any, s) => {
      s.interactions?.forEach(i => {
        acc[i.element] = (acc[i.element] || 0) + 1;
      });
      return acc;
    }, {});

    const interactionData = Object.entries(interactionStats)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const scrollData = sessions.reduce((acc: any, s) => {
      const depth = Math.floor((s.scrollDepth || 0) / 10) * 10;
      acc[depth] = (acc[depth] || 0) + 1;
      return acc;
    }, {});

    const scrollChartData = Array.from({ length: 11 }, (_, i) => ({
      name: `${i * 10}%`,
      sessions: scrollData[i * 10] || 0
    }));

    const funnelData = [
      { name: 'إجمالي الزيارات', value: totalSessions, fill: '#6366F1' },
      { name: 'تصفح > 50%', value: sessions.filter(s => s.scrollDepth >= 50).length, fill: '#8B5CF6' },
      { name: 'تفاعل مع النموذج', value: sessions.filter(s => s.interactions?.some(i => i.element === 'customerName' || i.element === 'phone')).length, fill: '#EC4899' },
      { name: 'تم الشراء', value: conversions, fill: '#10B981' }
    ];

    return (
      <div className="space-y-10">
        {/* Campaign Performance Table - New Section */}
        <div className="bg-bg-card border border-white/5 p-8 rounded-[2.5rem] space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">أداء الحملات <span className="text-primary">الإعلانية</span></h3>
              <p className="text-sm opacity-50">تحليل مفصل للمصادر والحملات (UTM Tracking)</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-xl text-primary text-xs font-black">
              <Calendar className="w-4 h-4" />
              آخر 1000 جلسة
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-white/5 text-xs font-black uppercase tracking-widest opacity-40">
                  <th className="pb-4 pr-4">المصدر / الحملة</th>
                  <th className="pb-4">الزيارات</th>
                  <th className="pb-4">التحويلات</th>
                  <th className="pb-4">معدل التحويل</th>
                  <th className="pb-4">الإيرادات</th>
                  <th className="pb-4">متوسط التصفح</th>
                  <th className="pb-4 pl-4">العائد لكل زيارة</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {campaignStats.length > 0 ? campaignStats.map((c, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="py-6 pr-4">
                      <div className="flex flex-col">
                        <span className="font-black text-white text-base">{c.source}</span>
                        <span className="text-[10px] opacity-40 font-bold uppercase tracking-widest">{c.campaign}</span>
                      </div>
                    </td>
                    <td className="py-6">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-lg">{c.sessions}</span>
                        <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${(c.sessions / totalSessions) * 100}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-6">
                      <span className="font-bold text-emerald-500">{c.conversions}</span>
                    </td>
                    <td className="py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-white">{c.conversionRate.toFixed(1)}%</span>
                        <div className="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${c.conversionRate}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-primary">{c.revenue.toLocaleString()}</span>
                        <span className="text-[10px] opacity-30">IQD</span>
                      </div>
                    </td>
                    <td className="py-6">
                      <span className="font-bold opacity-60">{Math.round(c.avgScroll)}%</span>
                    </td>
                    <td className="py-6 pl-4">
                      <span className="font-black text-white">{Math.round(c.revenue / c.sessions).toLocaleString()} <span className="text-[10px] opacity-30">د.ع</span></span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="py-20 text-center opacity-40 italic">لا توجد بيانات حملات حالياً</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-bg-card border border-white/5 p-8 rounded-[2rem] space-y-4 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full group-hover:bg-indigo-500/10 transition-all"></div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center relative z-10">
              <Eye className="w-6 h-6" />
            </div>
            <div className="relative z-10">
              <p className="text-xs opacity-40 font-bold uppercase tracking-widest">إجمالي الزيارات</p>
              <h3 className="text-2xl font-black text-white mt-1">{totalSessions}</h3>
            </div>
          </div>
          <div className="bg-bg-card border border-white/5 p-8 rounded-[2rem] space-y-4 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full group-hover:bg-emerald-500/10 transition-all"></div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center relative z-10">
              <Target className="w-6 h-6" />
            </div>
            <div className="relative z-10">
              <p className="text-xs opacity-40 font-bold uppercase tracking-widest">معدل التحويل</p>
              <h3 className="text-2xl font-black text-white mt-1">{conversionRate.toFixed(1)}%</h3>
            </div>
          </div>
          <div className="bg-bg-card border border-white/5 p-8 rounded-[2rem] space-y-4 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full group-hover:bg-amber-500/10 transition-all"></div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center relative z-10">
              <Clock className="w-6 h-6" />
            </div>
            <div className="relative z-10">
              <p className="text-xs opacity-40 font-bold uppercase tracking-widest">متوسط وقت الشراء</p>
              <h3 className="text-2xl font-black text-white mt-1">{Math.round(avgTimeToPurchase)} <span className="text-xs opacity-40">ثانية</span></h3>
            </div>
          </div>
          <div className="bg-bg-card border border-white/5 p-8 rounded-[2rem] space-y-4 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-violet-500/5 blur-3xl rounded-full group-hover:bg-violet-500/10 transition-all"></div>
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center relative z-10">
              <MousePointer2 className="w-6 h-6" />
            </div>
            <div className="relative z-10">
              <p className="text-xs opacity-40 font-bold uppercase tracking-widest">إجمالي التفاعلات</p>
              <h3 className="text-2xl font-black text-white mt-1">{sessions.reduce((acc, s) => acc + (s.interactions?.length || 0), 0)}</h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-bg-card border border-white/5 p-8 rounded-[2.5rem] space-y-6">
            <h3 className="text-xl font-black text-white">قمع التحويل (مسار الشراء)</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                  <XAxis type="number" stroke="#ffffff40" fontSize={12} hide />
                  <YAxis dataKey="name" type="category" stroke="#ffffff40" fontSize={12} width={150} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid #ffffff10', borderRadius: '16px' }}
                  />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-bg-card border border-white/5 p-8 rounded-[2.5rem] space-y-6">
            <h3 className="text-xl font-black text-white">الأجهزة المستخدمة</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#6366F1" />
                    <Cell fill="#10B981" />
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid #ffffff10', borderRadius: '16px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold">كمبيوتر</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold">موبايل</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-bg-card border border-white/5 p-8 rounded-[2.5rem] space-y-6">
          <h3 className="text-xl font-black text-white">عمق التصفح (Scroll Depth)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scrollChartData}>
                <defs>
                  <linearGradient id="colorScroll" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} />
                <YAxis stroke="#ffffff40" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid #ffffff10', borderRadius: '16px' }}
                />
                <Area type="monotone" dataKey="sessions" stroke="#6366F1" fillOpacity={1} fill="url(#colorScroll)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-bg-card border border-white/5 p-8 rounded-[2.5rem] space-y-6">
          <h3 className="text-xl font-black text-white">أكثر العناصر تفاعلاً</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={interactionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                <XAxis type="number" stroke="#ffffff40" fontSize={12} hide />
                <YAxis dataKey="name" type="category" stroke="#ffffff40" fontSize={12} width={150} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid #ffffff10', borderRadius: '16px' }}
                />
                <Bar dataKey="value" fill="#8B5CF6" radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-bg-card border border-white/5 p-8 rounded-[2.5rem] space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">أحدث <span className="text-primary">الجلسات</span></h3>
              <p className="text-sm opacity-50">متابعة مباشرة لنشاط الزوار على صفحات الهبوط</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {sessions.slice(0, 10).map((session) => (
              <div 
                key={session.id} 
                onClick={() => setSelectedSession(session)}
                className="bg-bg-light border border-white/5 p-6 rounded-3xl hover:border-primary/30 transition-all group cursor-pointer"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${session.isConverted ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-white/40'}`}>
                      {session.isConverted ? <CheckCircle className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white">جلسة #{session.id.slice(-6)}</span>
                        {session.isConverted && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest rounded">تم التحويل</span>}
                      </div>
                      <div className="text-xs opacity-40 font-bold mt-1">
                        {session.entryTime.toLocaleString('ar-IQ')}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-[8px] opacity-30 font-black uppercase tracking-widest mb-1">المصدر</div>
                      <div className="text-xs font-bold text-white">{session.utmSource || 'مباشر'}</div>
                    </div>
                    <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-[8px] opacity-30 font-black uppercase tracking-widest mb-1">الحملة</div>
                      <div className="text-xs font-bold text-white">{session.utmCampaign || 'بدون حملة'}</div>
                    </div>
                    <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-[8px] opacity-30 font-black uppercase tracking-widest mb-1">الجهاز</div>
                      <div className="text-xs font-bold text-white uppercase">{session.device || 'غير معروف'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <div className="text-[8px] opacity-30 font-black uppercase tracking-widest mb-1">التصفح</div>
                      <div className="text-sm font-black text-white">{session.scrollDepth}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[8px] opacity-30 font-black uppercase tracking-widest mb-1">الوقت</div>
                      <div className="text-sm font-black text-white">{Math.floor((session.duration || 0) / 60)}د {Math.floor((session.duration || 0) % 60)}ث</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[8px] opacity-30 font-black uppercase tracking-widest mb-1">التفاعلات</div>
                      <div className="text-sm font-black text-primary">{session.interactions?.length || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session Details Modal */}
        {selectedSession && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedSession(null)} />
            <div className="relative bg-bg-card border border-white/10 w-full max-w-4xl max-h-full overflow-hidden rounded-[2.5rem] flex flex-col shadow-2xl">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white">تفاصيل الجلسة</h3>
                  <p className="text-sm opacity-50">تحليل كامل لسلوك الزبون خلال الزيارة</p>
                </div>
                <button onClick={() => setSelectedSession(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <ChevronLeft className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-2">
                    <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">وقت الدخول</p>
                    <p className="text-lg font-bold text-white">{selectedSession.entryTime.toLocaleString('ar-EG')}</p>
                  </div>
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-2">
                    <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">مدة الجلسة</p>
                    <p className="text-lg font-bold text-white">{selectedSession.duration ? `${selectedSession.duration} ثانية` : 'لا يزال يتصفح'}</p>
                  </div>
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-2">
                    <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">عمق التصفح</p>
                    <p className="text-lg font-bold text-white">{selectedSession.scrollDepth}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                    <h4 className="text-sm font-black text-white uppercase tracking-widest">معلومات الجهاز</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="opacity-40">نظام التشغيل:</span>
                        <span className="text-white font-bold">{selectedSession.deviceInfo?.platform || 'غير معروف'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="opacity-40">دقة الشاشة:</span>
                        <span className="text-white font-bold">{selectedSession.deviceInfo?.screenSize || 'غير معروف'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="opacity-40">المتصفح:</span>
                        <span className="text-white font-bold truncate max-w-[200px]">{selectedSession.deviceInfo?.userAgent || 'غير معروف'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                    <h4 className="text-sm font-black text-white uppercase tracking-widest">إحصائيات السلوك</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="opacity-40">عدد التفاعلات:</span>
                        <span className="text-white font-bold">{selectedSession.interactions?.length || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="opacity-40">وقت أول تفاعل:</span>
                        <span className="text-white font-bold">
                          {selectedSession.interactions && selectedSession.interactions.length > 0 
                            ? `${Math.floor((new Date(selectedSession.interactions[0].timestamp).getTime() - selectedSession.entryTime.getTime()) / 1000)} ثانية`
                            : 'لا توجد تفاعلات'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedSession.customerInfo && (
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-8 rounded-3xl space-y-4">
                    <h4 className="font-black text-emerald-500 flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      معلومات المشتري
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div>
                        <p className="text-[10px] font-black opacity-40 uppercase">الاسم</p>
                        <p className="text-white font-bold">{selectedSession.customerInfo.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black opacity-40 uppercase">الهاتف</p>
                        <p className="text-white font-bold">{selectedSession.customerInfo.phone}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black opacity-40 uppercase">المحافظة</p>
                        <p className="text-white font-bold">{selectedSession.customerInfo.city}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <h4 className="font-black text-white flex items-center gap-2">
                    <MousePointer2 className="w-5 h-5 text-primary" />
                    سجل التفاعلات (Timeline)
                  </h4>
                  <div className="space-y-4">
                    {selectedSession.interactions && selectedSession.interactions.length > 0 ? (
                      selectedSession.interactions.map((it, idx) => (
                        <div key={idx} className="flex items-start gap-4 relative">
                          {idx !== selectedSession.interactions.length - 1 && (
                            <div className="absolute top-8 bottom-0 right-4 w-0.5 bg-white/5" />
                          )}
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 relative z-10">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          </div>
                          <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                            <div>
                              <span className="text-xs font-black text-primary uppercase px-2 py-0.5 bg-primary/10 rounded-md ml-2">
                                {it.type === 'click' ? 'نقرة' : it.type === 'focus' ? 'تركيز' : it.type === 'blur' ? 'مغادرة' : it.type === 'change' ? 'تغيير' : it.type}
                              </span>
                              <span className="text-sm font-bold text-white">تفاعل مع: {it.element}</span>
                            </div>
                            <span className="text-[10px] opacity-40">{new Date(it.timestamp).toLocaleTimeString('ar-EG')}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-10 opacity-40 italic">لا توجد تفاعلات مسجلة</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">التحليلات <span className="text-primary">والتقارير</span></h2>
          <p className="text-sm opacity-50">نظرة شاملة على أداء المتجر وسلوك الزبائن</p>
        </div>
        
        <div className="flex bg-bg-card border border-white/5 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('general')}
            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'general' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'}`}
          >
            إحصائيات عامة
          </button>
          <button 
            onClick={() => setActiveTab('landing')}
            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'landing' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'}`}
          >
            إحصائيات لاندك بيج
          </button>
        </div>
      </div>

      {activeTab === 'general' ? renderGeneralStats() : renderLandingStats()}
    </div>
  );
};

export default AdminAnalytics;
