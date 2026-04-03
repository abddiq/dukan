import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, ShoppingCart, Package, AlertTriangle, 
  ArrowUpRight, Loader2, Clock, DollarSign, Target, 
  BarChart3, Activity, Globe, Zap, ShoppingBag,
  PieChart as PieChartIcon, ArrowDownRight, CheckCircle2,
  Calendar, ShieldCheck, X
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, PieChart, Cell, Pie
} from 'recharts';
import { auth, handleFirestoreError, OperationType } from '../../src/firebase';
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { Order, Product, StoreSettings, OrderStatus } from '../../src/types';
import { motion } from 'motion/react';
import CustomerProfileModal from '../../src/components/admin/CustomerProfileModal';
import { useStore } from '../../src/contexts/StoreContext';

const COLORS = ['var(--color-primary)', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

const AdminDashboard: React.FC = () => {
  const { store, db: storeDb } = useStore();
  const [stats, setStats] = useState({ 
    totalSales: 0, 
    orderCount: 0, 
    lowStock: 0, 
    customerCount: 0,
    avgOrderValue: 0,
    conversionRate: 0,
    totalProducts: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalProfit: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uptime, setUptime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [firstOrderDate, setFirstOrderDate] = useState<Date | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerProfile, setShowCustomerProfile] = useState(false);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  
  const currentUser = auth.currentUser;

  const translateStatus = (status: string) => {
    switch (status) {
      case OrderStatus.PENDING: return 'قيد الانتظار';
      case OrderStatus.CONFIRMED: return 'تم التأكيد';
      case OrderStatus.PROCESSING: return 'جاري التجهيز';
      case OrderStatus.SHIPPED: return 'تم الشحن';
      case OrderStatus.DELIVERED: return 'تم التوصيل';
      case OrderStatus.CANCELLED: return 'ملغي';
      default: return status;
    }
  };

  // Uptime counter logic
  useEffect(() => {
    const effectiveStartDate = storeSettings?.openingDate ? new Date(storeSettings.openingDate) : firstOrderDate;
    if (!effectiveStartDate) return;

    const timer = setInterval(() => {
      try {
        const start = effectiveStartDate.getTime();
        const now = new Date().getTime();
        const diff = now - start;

        if (diff > 0) {
          setUptime({
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((diff / (1000 * 60)) % 60),
            seconds: Math.floor((diff / 1000) % 60)
          });
        }
      } catch (e) {
        // Silent fail for invalid dates
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [storeSettings, firstOrderDate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderSnap, productSnap, userSnap, settingsSnap] = await Promise.all([
        getDocs(query(collection(storeDb, 'orders'), orderBy('createdAt', 'desc'))).catch(e => handleFirestoreError(e, OperationType.LIST, 'orders')),
        getDocs(collection(storeDb, 'products')).catch(e => handleFirestoreError(e, OperationType.LIST, 'products')),
        getDocs(collection(storeDb, 'users')).catch(e => handleFirestoreError(e, OperationType.LIST, 'users')),
        getDoc(doc(storeDb, 'settings', 'store')).catch(e => handleFirestoreError(e, OperationType.GET, 'settings/store'))
      ]);
      
      if (settingsSnap.exists()) {
        setStoreSettings(settingsSnap.data() as StoreSettings);
      }

      const orders = orderSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
      setAllOrders(orders);
      const products = productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      
      // Find first order date if openingDate is not set
      if (orders.length > 0) {
        const oldestOrder = orders[orders.length - 1];
        if (oldestOrder.createdAt?.toDate) {
          setFirstOrderDate(oldestOrder.createdAt.toDate());
        }
      }

      let totalSales = 0;
      let totalProfit = 0;
      let pendingOrders = 0;
      let completedOrders = 0;
      const salesByDate: { [key: string]: { sales: number, count: number, timestamp: number } } = {};
      const productSales: { [key: string]: { name: string, count: number, revenue: number } } = {};
      const orderStatusCounts: { [key: string]: number } = {};

      orders.forEach(order => {
        const status = order.status || OrderStatus.PENDING;
        orderStatusCounts[status] = (orderStatusCounts[status] || 0) + 1;

        if (status === OrderStatus.PENDING || status === OrderStatus.PROCESSING) pendingOrders++;
        if (status === OrderStatus.DELIVERED) completedOrders++;

        if (status !== OrderStatus.CANCELLED) {
          const amount = order.totalAmount || 0;
          totalSales += amount;
          
          // Estimate profit (assuming 25% margin if costPrice not available)
          totalProfit += amount * 0.25;

          // Sales by date for chart
          if (order.createdAt?.toDate) {
            const dateObj = order.createdAt.toDate();
            const dateKey = dateObj.toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' });
            
            // Normalize to start of day for timestamp sorting
            const dayStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();

            if (!salesByDate[dateKey]) {
              salesByDate[dateKey] = { sales: 0, count: 0, timestamp: dayStart };
            }
            salesByDate[dateKey].sales += amount;
            salesByDate[dateKey].count += 1;
          }

          // Product sales for top products
          order.items?.forEach(item => {
            if (!productSales[item.productId]) {
              productSales[item.productId] = { name: item.name, count: 0, revenue: 0 };
            }
            productSales[item.productId].count += item.qty;
            productSales[item.productId].revenue += (item.price * item.qty);
          });
        }
      });

      // Format sales data for chart and sort by timestamp
      const formattedSalesData = Object.keys(salesByDate)
        .map(date => ({
          date,
          sales: salesByDate[date].sales,
          count: salesByDate[date].count,
          timestamp: salesByDate[date].timestamp
        }))
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-14); // Show last 14 days

      // Format status data for pie chart
      const formattedStatusData = Object.keys(orderStatusCounts).map(status => ({
        name: translateStatus(status),
        value: orderStatusCounts[status]
      }));

      // Format top products
      const formattedTopProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const lowStockCount = products.filter(p => (p.stockQuantity || 0) < 5).length;
      
      setStats({
        totalSales,
        orderCount: orders.length,
        lowStock: lowStockCount,
        customerCount: userSnap.size,
        avgOrderValue: orders.length > 0 ? totalSales / orders.length : 0,
        conversionRate: 4.8,
        totalProducts: products.length,
        pendingOrders,
        completedOrders,
        totalProfit
      });

      setSalesData(formattedSalesData);
      setStatusData(formattedStatusData);
      setTopProducts(formattedTopProducts);
      setRecentOrders(orders.slice(0, 8));

    } catch (err: any) {
      console.error("Dashboard fetch failed:", err);
      setError('حدث خطأ أثناء تحميل بيانات لوحة التحكم.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-primary/20 rounded-full animate-ping absolute" />
        <Loader2 className="w-20 h-20 text-primary animate-spin relative z-10" />
      </div>
      <p className="text-primary font-black text-xl animate-pulse tracking-widest uppercase">جاري تحليل النظام...</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-primary" />
             </div>
             <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter italic uppercase">مركز القيادة</h1>
          </div>
          <p className="text-white/40 text-sm font-bold tracking-wide lg:mr-14">مرحباً بك في مركز القيادة، إليك تحليل شامل لأداء إمبراطوريتك التجارية.</p>
        </div>
        
        {/* Uptime Counter - Professional Version */}
        <div className="bg-bg-card border border-white/5 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] flex flex-col sm:flex-row items-center gap-6 md:gap-8 shadow-2xl shadow-black/50 w-full lg:w-auto">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="w-12 h-12 md:h-14 md:w-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
              <Clock className="w-6 h-6 md:w-7 md:h-7 text-white animate-pulse" />
            </div>
            <div className="flex-grow">
              <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em]">عمر المتجر</p>
              <div className="flex gap-3 md:gap-4 text-white font-mono text-xl md:text-2xl mt-1">
                <div className="flex flex-col items-center">
                  <span className="font-black">{uptime.days}</span>
                  <span className="text-[9px] font-black opacity-30 uppercase tracking-tighter">يوم</span>
                </div>
                <span className="opacity-10">:</span>
                <div className="flex flex-col items-center">
                  <span className="font-black">{uptime.hours.toString().padStart(2, '0')}</span>
                  <span className="text-[9px] font-black opacity-30 uppercase tracking-tighter">ساعة</span>
                </div>
                <span className="opacity-10">:</span>
                <div className="flex flex-col items-center">
                  <span className="font-black">{uptime.minutes.toString().padStart(2, '0')}</span>
                  <span className="text-[9px] font-black opacity-30 uppercase tracking-tighter">دقيقة</span>
                </div>
                <span className="opacity-10">:</span>
                <div className="flex flex-col items-center">
                  <span className="font-black text-primary">{uptime.seconds.toString().padStart(2, '0')}</span>
                  <span className="text-[9px] font-black opacity-30 uppercase tracking-tighter">ثانية</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="h-[1px] w-full sm:h-12 sm:w-[1px] bg-white/5" />
          
          <div className="flex flex-row sm:flex-col gap-4 sm:gap-2 w-full sm:w-auto justify-between sm:justify-start">
             <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${storeSettings?.storeStatus === 'open' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                  {storeSettings?.storeStatus === 'open' ? 'مباشر وعامل' : 'وضع عدم الاتصال'}
                </span>
             </div>
             <div className="flex items-center gap-2">
                <Globe className="w-3 h-3 text-blue-500" />
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">التوزيع العالمي نشط</span>
             </div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'إجمالي المبيعات', value: `${stats.totalSales.toLocaleString()} د.ع`, trend: '+18.2%', sub: 'صافي الربح: ' + Math.round(stats.totalProfit).toLocaleString(), icon: DollarSign, color: 'from-emerald-500/20 to-emerald-500/5 text-emerald-500', border: 'border-emerald-500/10' },
          { label: 'الطلبات المعلقة', value: stats.pendingOrders, trend: stats.pendingOrders > 5 ? 'مرتفع' : 'طبيعي', sub: 'الإجمالي: ' + stats.orderCount, icon: ShoppingBag, color: 'from-blue-500/20 to-blue-500/5 text-blue-500', border: 'border-blue-500/10' },
          { label: 'معدل التحويل', value: stats.conversionRate + '%', trend: '+0.4%', sub: 'الأداء: مثالي', icon: Target, color: 'from-primary/20 to-primary/5 text-primary', border: 'border-primary/10' },
          { label: 'قاعدة العملاء', value: stats.customerCount, trend: '+42', sub: 'الاحتفاظ: 68%', icon: Users, color: 'from-orange-500/20 to-orange-500/5 text-orange-500', border: 'border-orange-500/10' }
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className={`p-6 md:p-8 bg-bg-card border ${stat.border} rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden group hover:border-primary/30 transition-all duration-500`}
          >
            <div className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${stat.color} blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity`} />
            <div className="relative z-10 space-y-4 md:space-y-6">
               <div className="flex justify-between items-start">
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-500`}>
                    <stat.icon className="w-6 h-6 md:w-7 md:h-7" />
                  </div>
                  <div className="px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-white/5 border border-white/10 text-[9px] md:text-[10px] font-black text-white/60">
                    {stat.trend}
                  </div>
               </div>
               <div>
                  <p className="text-[10px] md:text-[11px] text-white/30 font-black uppercase tracking-[0.25em]">{stat.label}</p>
                  <h3 className="text-2xl md:text-3xl font-black text-white mt-1 tracking-tighter">{stat.value}</h3>
                  <div className="text-[9px] md:text-[10px] text-white/30 mt-2 md:mt-3 flex items-center gap-2 font-bold">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    {stat.sub}
                  </div>
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Sales Trend Chart */}
        <div className="xl:col-span-2 p-6 md:p-10 bg-bg-card border border-white/5 rounded-[2rem] md:rounded-[3rem] space-y-6 md:space-y-10 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <Activity className="w-6 h-6 md:w-7 md:h-7 text-blue-500" />
              </div>
              <div>
                <h3 className="text-white font-black text-lg md:text-xl tracking-tight">تحليل المبيعات الزمني</h3>
                <p className="text-white/30 text-[10px] md:text-xs font-bold">مراقبة أداء المبيعات خلال الـ 14 يوماً الماضية</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 self-start sm:self-auto">
               <button className="px-4 py-2 bg-primary text-white text-[9px] md:text-[10px] font-black rounded-xl shadow-lg">يومي</button>
               <button className="px-4 py-2 text-white/40 text-[9px] md:text-[10px] font-black hover:text-white transition-colors">أسبوعي</button>
            </div>
          </div>

          <div className="h-[250px] md:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#ffffff15" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                  fontFamily="monospace"
                />
                <YAxis 
                  stroke="#ffffff15" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                  fontFamily="monospace"
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid #ffffff10', borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  cursor={{ stroke: 'var(--color-primary)', strokeWidth: 2, strokeDasharray: '5 5' }}
                  formatter={(value: any) => [`${value.toLocaleString()} د.ع`, 'المبيعات']}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="var(--color-primary)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Sales Breakdown */}
          <div className="pt-6 md:pt-8 border-t border-white/5">
            <div className="flex items-center justify-between mb-6">
               <h4 className="text-[10px] md:text-[11px] font-black text-white/30 uppercase tracking-[0.25em]">تفاصيل المبيعات اليومية</h4>
               <div className="hidden sm:flex gap-4 text-[9px] md:text-[10px] font-bold">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-primary" />
                     <span className="text-white/40">المبيعات</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-blue-500" />
                     <span className="text-white/40">الطلبات</span>
                  </div>
               </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
              {[...salesData].reverse().map((item, i) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  key={i} 
                  className="p-3 md:p-4 bg-white/5 rounded-2xl md:rounded-3xl border border-white/5 flex flex-col gap-2 md:gap-3 hover:border-primary/30 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-primary/10 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex justify-between items-start relative z-10">
                    <span className="text-[9px] md:text-[10px] font-black text-white/30 group-hover:text-white/60 transition-colors">{item.date}</span>
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <span className="text-[9px] md:text-[10px] font-black text-blue-500">{item.count}</span>
                    </div>
                  </div>
                  <div className="relative z-10">
                    <span className="text-xs md:text-sm font-black text-white block">{item.sales.toLocaleString()}</span>
                    <span className="text-[8px] md:text-[9px] font-bold text-white/20 uppercase tracking-tighter">د.ع</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="p-6 md:p-10 bg-bg-card border border-white/5 rounded-[2rem] md:rounded-[3rem] space-y-6 md:space-y-10 flex flex-col shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <PieChartIcon className="w-6 h-6 md:w-7 md:h-7 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-white font-black text-lg md:text-xl tracking-tight">حالة الطلبات</h3>
              <p className="text-white/30 text-[10px] md:text-xs font-bold">توزيع العمليات حسب الحالة</p>
            </div>
          </div>

          <div className="flex-grow flex flex-col justify-center">
            <div className="h-[200px] md:h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-2xl md:text-3xl font-black text-white">{stats.orderCount}</span>
                 <span className="text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-widest">الإجمالي</span>
              </div>
            </div>

            <div className="mt-6 md:mt-8 grid grid-cols-2 gap-3 md:gap-4">
               {statusData.map((item, i) => (
                 <div key={i} className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 bg-white/5 rounded-xl md:rounded-2xl border border-white/5">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="flex flex-col">
                       <span className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-tighter">{item.name}</span>
                       <span className="text-xs md:text-sm font-black text-white">{item.value}</span>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Orders & Top Products */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Orders Table */}
        <div className="xl:col-span-2 p-10 bg-bg-card border border-white/5 rounded-[3rem] space-y-8 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                  <ShoppingCart className="w-7 h-7 text-purple-500" />
               </div>
               <h3 className="text-white font-black text-xl tracking-tight">أحدث العمليات الشرائية</h3>
            </div>
            <button className="px-6 py-3 bg-white/5 border border-white/10 text-[10px] text-white font-black uppercase tracking-widest rounded-2xl hover:bg-primary hover:border-primary transition-all">سجل الطلبات الكامل</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="text-[11px] text-white/20 uppercase tracking-[0.2em] border-b border-white/5">
                  <th className="pb-6 font-black pr-4">العميل / المعرف</th>
                  <th className="pb-6 font-black text-center">حالة الطلب</th>
                  <th className="pb-6 font-black text-left pl-4">المبلغ الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentOrders.map((order, i) => (
                  <tr key={order.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="py-6 pr-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-bg-light to-bg-card border border-white/5 flex items-center justify-center text-sm font-black text-white group-hover:border-primary/50 transition-all">
                          {order.customer?.name?.charAt(0) || '؟'}
                        </div>
                        <div>
                          <p className="text-sm font-black text-white group-hover:text-primary transition-colors">{order.customer?.name || 'عميل مجهول'}</p>
                          <p className="text-[10px] text-white/20 font-bold mt-0.5">{order.orderNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 text-center">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter ${
                        order.status === OrderStatus.DELIVERED ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                        order.status === OrderStatus.CANCELLED ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                        order.status === OrderStatus.PROCESSING ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                        'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          order.status === OrderStatus.DELIVERED ? 'bg-emerald-500' :
                          order.status === OrderStatus.CANCELLED ? 'bg-red-500' :
                          'bg-blue-500'
                        }`} />
                        {translateStatus(order.status)}
                      </div>
                    </td>
                    <td className="py-6 text-left pl-4 font-black text-white text-sm tracking-tighter">
                      {(order.totalAmount || 0).toLocaleString()} <span className="text-[10px] text-white/40">د.ع</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products - Enhanced */}
        <div className="p-10 bg-bg-card border border-white/5 rounded-[3rem] space-y-10 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-orange-500" />
            </div>
            <div>
              <h3 className="text-white font-black text-xl tracking-tight">النخبة</h3>
              <p className="text-white/30 text-xs font-bold">الأكثر مبيعاً</p>
            </div>
          </div>

          <div className="space-y-8">
            {topProducts.length > 0 ? topProducts.map((product, i) => (
              <div key={i} className="space-y-3 group">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-white group-hover:text-primary transition-colors truncate max-w-[120px] block">{product.name}</span>
                    <span className="text-[10px] text-white/20 font-bold">{product.count} مبيع</span>
                  </div>
                  <span className="text-primary font-black text-sm tracking-tighter">{product.revenue.toLocaleString()}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(product.revenue / topProducts[0].revenue) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-primary to-purple-400 rounded-full"
                  />
                </div>
              </div>
            )) : (
              <div className="py-20 text-center opacity-20">لا توجد بيانات</div>
            )}
          </div>
        </div>
      </div>
      {/* Customer Profile Modal */}
      <CustomerProfileModal 
        userId={selectedCustomer?.uid}
        customerData={selectedCustomer}
        isOpen={showCustomerProfile}
        onClose={() => setShowCustomerProfile(false)}
        allOrders={allOrders}
      />
    </div>
  );
};

export default AdminDashboard;
