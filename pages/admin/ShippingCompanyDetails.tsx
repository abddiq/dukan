
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Truck, ChevronLeft, Package, Clock, CheckCircle, XCircle, Loader2, DollarSign, Filter, Search, Download, Calendar } from 'lucide-react';
import { db } from '../../src/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, orderBy } from 'firebase/firestore';
import { ShippingCompany, Order, OrderStatus } from '../../src/types';

const AdminShippingCompanyDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState<ShippingCompany | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'settled' | 'unsettled'>('all');

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const companyDoc = await getDoc(doc(db, 'shipping_companies', id));
      if (companyDoc.exists()) {
        const companyData = { id: companyDoc.id, ...companyDoc.data() } as ShippingCompany;
        setCompany(companyData);

        // Fetch orders for this company
        const ordersSnap = await getDocs(query(
          collection(db, 'orders'),
          where('shippingCompany', '==', companyData.name)
        ));
        const fetchedOrders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Order[];
        fetchedOrders.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        setOrders(fetchedOrders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const toggleSettlement = async (orderId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        isSettled: !currentStatus,
        settledAt: !currentStatus ? new Date().toISOString() : null
      });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تحديث حالة المحاسبة');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         order.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : 
                         statusFilter === 'settled' ? order.isSettled : !order.isSettled;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    settled: orders.filter(o => o.isSettled).length,
    unsettled: orders.filter(o => !o.isSettled).length,
    totalAmount: orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0),
    settledAmount: orders.filter(o => o.isSettled).reduce((acc, o) => acc + (o.totalAmount || 0), 0),
    unsettledAmount: orders.filter(o => !o.isSettled).reduce((acc, o) => acc + (o.totalAmount || 0), 0)
  };

  if (loading) return <div className="flex justify-center py-40"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>;

  if (!company) return <div className="text-center py-40 text-white font-bold">الشركة غير موجودة</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/admin/shipping')} className="flex items-center gap-2 text-sm opacity-60 hover:opacity-100 transition-opacity">
          <ChevronLeft className="w-4 h-4 rotate-180" /> العودة للشركات
        </button>
        <div className="text-xs opacity-40 uppercase tracking-widest font-bold">تفاصيل الشركة والطلبات</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Company Info Card */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-[var(--color-bg-card)] border border-white/5 rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Truck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase italic">{company.name}</h3>
                <div className={`text-[10px] font-black uppercase inline-block px-2 py-0.5 rounded ${company.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {company.isActive ? 'نشط' : 'متوقف'}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-xs opacity-40 font-bold uppercase">إجمالي الطلبات</span>
                <span className="text-sm font-black text-white">{stats.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs opacity-40 font-bold uppercase">تمت المحاسبة</span>
                <span className="text-sm font-black text-emerald-500">{stats.settled}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs opacity-40 font-bold uppercase">بانتظار المحاسبة</span>
                <span className="text-sm font-black text-red-500">{stats.unsettled}</span>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 space-y-4">
              <div className="bg-white/5 p-4 rounded-2xl">
                <div className="text-[10px] opacity-40 uppercase font-bold mb-1">إجمالي المبالغ</div>
                <div className="text-xl font-black text-white">{stats.totalAmount.toLocaleString()} د.ع</div>
              </div>
              <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                <div className="text-[10px] text-emerald-500/60 uppercase font-bold mb-1">المبالغ المحصلة</div>
                <div className="text-xl font-black text-emerald-500">{stats.settledAmount.toLocaleString()} د.ع</div>
              </div>
              <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/10">
                <div className="text-[10px] text-red-500/60 uppercase font-bold mb-1">المبالغ المتبقية</div>
                <div className="text-xl font-black text-red-500">{stats.unsettledAmount.toLocaleString()} د.ع</div>
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--color-bg-card)] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-full">
            <div className="p-8 border-b border-white/5 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-xl font-black text-white uppercase italic">سجل الطلبات</h3>
                <div className="flex items-center gap-2">
                  <button className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-white/60"><Download className="w-5 h-5" /></button>
                  <button className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-white/60"><Calendar className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-grow relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20" />
                  <input 
                    type="text"
                    placeholder="البحث برقم الطلب أو اسم العميل..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-bg-light border border-white/10 rounded-2xl pr-12 pl-4 py-3 text-white outline-none focus:border-primary"
                  />
                </div>
                <div className="flex items-center gap-2 bg-bg-light p-1 rounded-2xl border border-white/10">
                  <button 
                    onClick={() => setStatusFilter('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'opacity-40 hover:opacity-100'}`}
                  >الكل</button>
                  <button 
                    onClick={() => setStatusFilter('settled')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === 'settled' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'opacity-40 hover:opacity-100'}`}
                  >تمت المحاسبة</button>
                  <button 
                    onClick={() => setStatusFilter('unsettled')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === 'unsettled' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'opacity-40 hover:opacity-100'}`}
                  >بانتظار المحاسبة</button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto flex-grow">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-bg-light border-b border-white/5">
                    <th className="p-6 text-xs font-black uppercase tracking-widest opacity-40">الطلب</th>
                    <th className="p-6 text-xs font-black uppercase tracking-widest opacity-40">العميل</th>
                    <th className="p-6 text-xs font-black uppercase tracking-widest opacity-40">المبلغ</th>
                    <th className="p-6 text-xs font-black uppercase tracking-widest opacity-40">الحالة</th>
                    <th className="p-6 text-xs font-black uppercase tracking-widest opacity-40 text-left">المحاسبة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-20 text-center opacity-40 font-bold italic">لا توجد طلبات مطابقة للبحث</td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-white/5 transition-colors group">
                        <td className="p-6">
                          <div className="font-black text-primary">{order.orderNumber}</div>
                          <div className="text-[10px] opacity-40 uppercase font-bold">{order.createdAt ? (typeof order.createdAt === 'string' ? new Date(order.createdAt).toLocaleDateString('ar-IQ') : new Date(order.createdAt.seconds * 1000).toLocaleDateString('ar-IQ')) : 'N/A'}</div>
                        </td>
                        <td className="p-6">
                          <div className="font-bold text-white">{order.customer.name}</div>
                          <div className="text-[10px] opacity-40">{order.customer.city}</div>
                        </td>
                        <td className="p-6">
                          <div className="font-black text-white">{(order.totalAmount || 0).toLocaleString()} د.ع</div>
                        </td>
                        <td className="p-6">
                          <div className={`text-[10px] font-black uppercase inline-block px-2 py-0.5 rounded ${
                            order.status === OrderStatus.DELIVERED ? 'bg-emerald-500/10 text-emerald-500' : 
                            order.status === OrderStatus.CANCELLED ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'
                          }`}>
                            {order.status}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center justify-end">
                            <button 
                              onClick={() => toggleSettlement(order.id, !!order.isSettled)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                                order.isSettled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                              }`}
                            >
                              {order.isSettled ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {order.isSettled ? 'تمت المحاسبة' : 'غير محاسب'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
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

export default AdminShippingCompanyDetails;
