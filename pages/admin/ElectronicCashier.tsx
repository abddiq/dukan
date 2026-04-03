import React, { useState, useEffect } from 'react';
import { Wallet, CreditCard, ArrowDownCircle, ArrowUpCircle, Clock, Loader2, CheckCircle, Plus, Trash2, Key, Save, Edit2 } from 'lucide-react';
import { db } from '../../src/firebase';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, deleteDoc, doc, where, getDoc, setDoc } from 'firebase/firestore';
import { Order, PaymentStatus } from '../../src/types';

interface Settlement {
  id: string;
  amount: number;
  date: any;
  notes?: string;
}

const ElectronicCashier: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newSettlement, setNewSettlement] = useState({ amount: '', notes: '' });
  
  const DEFAULT_API_KEY = "UuMzpuP9mv71qHi3x5hxEQ==:AyMq3tNGWaZ7kjpAOIfi49ch1XcAyTwN8ejD12QkpUt/fV8H/cc8jl45ckA3Ncjk4zYh5jFCq64UOxB/PXB1z53SoI1Ii8M0akEZNKXKYHTcq41J12Plid14xAzwz8zN35CWT4f8sZNNZSDf86K0lBP4VT+WwSHV5eACx5CDmMk=";
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch WAYL orders
    try {
      const ordersSnap = await getDocs(query(
        collection(db, 'orders'), 
        where('paymentMethod', '==', 'WAYL'),
        where('paymentStatus', '==', 'Paid')
      ));
      const fetchedOrders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }

    // Fetch settlements
    try {
      const settlementsSnap = await getDocs(query(collection(db, 'gateway_settlements')));
      const fetchedSettlements = settlementsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Settlement));
      // Sort client-side to avoid index requirement
      fetchedSettlements.sort((a, b) => {
        const dateA = a.date?.toMillis ? a.date.toMillis() : 0;
        const dateB = b.date?.toMillis ? b.date.toMillis() : 0;
        return dateB - dateA; // descending
      });
      setSettlements(fetchedSettlements);
    } catch (error) {
      console.error("Error fetching settlements:", error);
    }

    // Fetch API Key
    try {
      const configDoc = await getDoc(doc(db, 'settings', 'wayl_config'));
      if (configDoc.exists() && configDoc.data().apiKey) {
        setApiKey(configDoc.data().apiKey);
      } else {
        setApiKey(DEFAULT_API_KEY);
      }
    } catch (error) {
      console.error("Error fetching API key config:", error);
      setApiKey(DEFAULT_API_KEY);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const WAYL_FEE_PERCENTAGE = 2.5; // 2.5% fee

  const totalReceivedByGateway = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
  const totalFees = totalReceivedByGateway * (WAYL_FEE_PERCENTAGE / 100);
  const totalNetByGateway = totalReceivedByGateway - totalFees;
  
  const totalSettledByGateway = settlements.reduce((acc, s) => acc + (s.amount || 0), 0);
  const amountOwedByGateway = totalNetByGateway - totalSettledByGateway;

  const handleAddSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSettlement.amount || isNaN(Number(newSettlement.amount))) return;

    try {
      await addDoc(collection(db, 'gateway_settlements'), {
        amount: Number(newSettlement.amount),
        notes: newSettlement.notes,
        date: serverTimestamp()
      });
      setNewSettlement({ amount: '', notes: '' });
      setIsAdding(false);
      fetchData();
    } catch (error) {
      console.error("Error adding settlement:", error);
      alert("حدث خطأ أثناء إضافة التسوية");
    }
  };

  const handleDeleteSettlement = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه التسوية؟')) return;
    try {
      await deleteDoc(doc(db, 'gateway_settlements', id));
      fetchData();
    } catch (error) {
      console.error("Error deleting settlement:", error);
    }
  };

  const handleSaveApiKey = async () => {
    setSavingApiKey(true);
    try {
      await setDoc(doc(db, 'settings', 'wayl_config'), { apiKey }, { merge: true });
      setIsEditingApiKey(false);
      alert('تم حفظ مفتاح الـ API بنجاح');
    } catch (error) {
      console.error("Error saving API key:", error);
      alert('حدث خطأ أثناء حفظ المفتاح');
    } finally {
      setSavingApiKey(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">القاصة الإلكترونية</h2>
          <p className="text-sm opacity-50">متابعة مستحقات المتجر لدى شركة بوابة الدفع (Wayl)</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsEditingApiKey(!isEditingApiKey)}
            className="px-6 py-3 bg-bg-card border border-white/10 text-white font-bold rounded-xl hover:bg-white/5 transition-all flex items-center gap-2"
          >
            <Key className="w-5 h-5 text-primary" /> إعدادات API
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="px-6 py-3 bg-primary text-white font-black rounded-xl hover:bg-primary-dark transition-all flex items-center gap-2 shadow-xl shadow-primary/20"
          >
            <Plus className="w-5 h-5" /> تسجيل تسوية جديدة
          </button>
        </div>
      </div>

      {isEditingApiKey && (
        <div className="p-8 bg-bg-card border border-primary/30 rounded-3xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">مفتاح الربط (API Key) لبوابة Wayl</h3>
              <p className="text-xs opacity-50">أدخل مفتاح الـ API الخاص بحسابك في بوابة الدفع الإلكتروني</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-bg-light p-5 rounded-2xl border border-white/5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${apiKey ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {apiKey ? <CheckCircle className="w-6 h-6" /> : <Loader2 className="w-6 h-6" />}
              </div>
              <div>
                <div className="text-sm opacity-50 mb-1">حالة الربط</div>
                <div className={`font-black ${apiKey ? 'text-emerald-500' : 'text-red-500'}`}>
                  {apiKey ? 'نشط ومتصل' : 'غير متصل (يرجى إدخال المفتاح)'}
                </div>
              </div>
            </div>

            <div className="bg-bg-light p-5 rounded-2xl border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm opacity-50 mb-1">العمليات الناجحة عبر الـ API</div>
                <div className="font-black text-white text-xl">
                  {orders.length} <span className="text-sm opacity-50 font-normal">عملية مكتملة</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <input 
              type="text" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="أدخل مفتاح API هنا..."
              className="flex-grow bg-bg-light border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary font-mono text-left"
              dir="ltr"
            />
            <button 
              onClick={handleSaveApiKey}
              disabled={savingApiKey}
              className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {savingApiKey ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} حفظ
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-8 bg-bg-card border border-white/5 rounded-3xl space-y-4">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs opacity-40 uppercase font-black tracking-widest">إجمالي المبيعات (الإجمالي)</div>
            <div className="text-2xl font-black text-white mt-1">{totalReceivedByGateway.toLocaleString()} <span className="text-sm opacity-40">د.ع</span></div>
          </div>
        </div>

        <div className="p-8 bg-bg-card border border-white/5 rounded-3xl space-y-4">
          <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center">
            <ArrowUpCircle className="w-6 h-6 rotate-180" />
          </div>
          <div>
            <div className="text-xs opacity-40 uppercase font-black tracking-widest">إجمالي الرسوم (الرسوم 2.5%)</div>
            <div className="text-2xl font-black text-red-500 mt-1">{totalFees.toLocaleString()} <span className="text-sm opacity-40">د.ع</span></div>
          </div>
        </div>

        <div className="p-8 bg-bg-card border border-white/5 rounded-3xl space-y-4">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs opacity-40 uppercase font-black tracking-widest">الصافي المستحق (الصافي)</div>
            <div className="text-2xl font-black text-emerald-500 mt-1">{totalNetByGateway.toLocaleString()} <span className="text-sm opacity-40">د.ع</span></div>
          </div>
        </div>

        <div className="p-8 bg-primary/10 border border-primary/20 rounded-3xl space-y-4">
          <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs opacity-40 uppercase font-black tracking-widest text-primary">المتبقي بذمة الشركة</div>
            <div className="text-2xl font-black text-white mt-1">{amountOwedByGateway.toLocaleString()} <span className="text-sm opacity-40">د.ع</span></div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs opacity-40 uppercase font-bold">إجمالي ما تم تسديده للمتجر</div>
            <div className="text-lg font-black text-white">{totalSettledByGateway.toLocaleString()} د.ع</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Settlements History */}
        <div className="bg-bg-card border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
            <h3 className="font-black text-white uppercase italic tracking-widest flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> سجل التسويات
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-white/5 text-[10px] font-black uppercase tracking-wider text-white/40">
                <tr>
                  <th className="px-6 py-4">التاريخ</th>
                  <th className="px-6 py-4">المبلغ</th>
                  <th className="px-6 py-4">ملاحظات</th>
                  <th className="px-6 py-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {settlements.length > 0 ? settlements.map(s => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-white/60">
                      {s.date ? new Date(s.date.seconds * 1000).toLocaleDateString('ar-IQ') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-black text-emerald-500">{s.amount.toLocaleString()} د.ع</td>
                    <td className="px-6 py-4 text-white/40 italic">{s.notes || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleDeleteSettlement(s.id)}
                        className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center opacity-30 italic">لا توجد تسويات مسجلة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Electronic Orders */}
        <div className="bg-bg-card border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
            <h3 className="font-black text-white uppercase italic tracking-widest flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-blue-500" /> آخر المبيعات الإلكترونية
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-white/5 text-[10px] font-black uppercase tracking-wider text-white/40">
                <tr>
                  <th className="px-6 py-4">رقم الطلب</th>
                  <th className="px-6 py-4">التاريخ</th>
                  <th className="px-6 py-4">المبلغ (الإجمالي)</th>
                  <th className="px-6 py-4">الرسوم (2.5%)</th>
                  <th className="px-6 py-4">الصافي (الصافي)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.slice(0, 10).map(o => {
                  const fee = (o.totalAmount || 0) * (WAYL_FEE_PERCENTAGE / 100);
                  const net = (o.totalAmount || 0) - fee;
                  return (
                    <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-bold text-white">#{o.orderNumber}</td>
                      <td className="px-6 py-4 text-white/60">
                        {o.createdAt ? new Date(o.createdAt.seconds * 1000).toLocaleDateString('ar-IQ') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 font-black text-blue-500">{(o.totalAmount || 0).toLocaleString()} د.ع</td>
                      <td className="px-6 py-4 text-red-400/60">{fee.toLocaleString()}</td>
                      <td className="px-6 py-4 font-black text-emerald-500">{net.toLocaleString()} د.ع</td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center opacity-30 italic">لا توجد مبيعات إلكترونية مدفوعة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Settlement Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
          <div className="bg-bg-card border border-white/10 w-full max-w-md rounded-[2.5rem] p-10 space-y-8 relative shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowUpCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">تسجيل تسوية</h3>
              <p className="text-sm opacity-40">قم بتسجيل المبلغ الذي استلمته من شركة بوابة الدفع</p>
            </div>

            <form onSubmit={handleAddSettlement} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider opacity-40 px-2">المبلغ المستلم (د.ع)</label>
                <input 
                  required
                  type="number"
                  placeholder="مثال: 500000"
                  className="w-full bg-bg-main border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-primary text-white font-bold"
                  value={newSettlement.amount}
                  onChange={e => setNewSettlement({...newSettlement, amount: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider opacity-40 px-2">ملاحظات</label>
                <textarea 
                  placeholder="رقم الحوالة، تاريخ الاستلام، إلخ..."
                  className="w-full bg-bg-main border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-primary text-white font-bold h-24 resize-none"
                  value={newSettlement.notes}
                  onChange={e => setNewSettlement({...newSettlement, notes: e.target.value})}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  className="flex-grow py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20"
                >
                  تأكيد التسجيل
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-8 py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-all"
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

export default ElectronicCashier;
