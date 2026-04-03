import React, { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, Loader2, X, User as UserIcon, Eye, ShoppingBag, AlertCircle, Key } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../src/firebase';
import { collection, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { User, Order, OrderStatus } from '../../src/types';
import CustomerProfileModal from '../../src/components/admin/CustomerProfileModal';

const AdminCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [showDetails, setShowDetails] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch customers
      const qCustomers = query(collection(db, 'users'), where('role', '==', 'customer'));
      const snapCustomers = await getDocs(qCustomers).catch(e => handleFirestoreError(e, OperationType.LIST, 'users'));
      const fetchedCustomers = snapCustomers.docs.map(d => ({ uid: d.id, ...d.data() })) as User[];
      setCustomers(fetchedCustomers);

      // Fetch all orders to calculate stats
      try {
        const qOrders = query(collection(db, 'orders'));
        const snapOrders = await getDocs(qOrders).catch(e => handleFirestoreError(e, OperationType.LIST, 'orders'));
        setOrders(snapOrders.docs.map(d => ({ id: d.id, ...d.data() })) as Order[]);
      } catch (orderErr) {
        console.error("Error fetching orders for stats:", orderErr);
        // Don't fail the whole page if just order stats fail
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'permission-denied') {
        setError('ليس لديك صلاحية للوصول إلى هذه البيانات. يرجى التأكد من إعداد قواعد الحماية في Firebase.');
      } else {
        setError('حدث خطأ أثناء جلب البيانات.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      setCustomers(customers.filter(c => c.uid !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (customer: User) => {
    setEditForm(JSON.parse(JSON.stringify(customer)));
    setIsEditing(true);
  };

  const handleViewDetails = (customer: User) => {
    setSelectedCustomer(customer);
    setShowDetails(true);
  };

  const saveEdit = async () => {
    if (!editForm.uid) return;
    try {
      await updateDoc(doc(db, 'users', editForm.uid), {
        name: editForm.name,
        phone: editForm.phone,
        city: editForm.city,
        region: editForm.region,
        nearestPoint: editForm.nearestPoint,
        password: editForm.password // Note: Storing password in plain text is not recommended for production, but requested by user.
      });
      setIsEditing(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء التحديث');
    }
  };

  const getCustomerStats = (uid: string) => {
    const customerOrders = orders.filter(o => o.userId === uid);
    const completed = customerOrders.filter(o => o.status === OrderStatus.DELIVERED).length;
    const cancelled = customerOrders.filter(o => o.status === OrderStatus.CANCELLED).length;
    return { total: customerOrders.length, completed, cancelled };
  };

  return (
    <div className="space-y-8">
      <div><h2 className="text-2xl font-black text-white">إدارة العملاء</h2><p className="text-sm opacity-50">عرض وتعديل بيانات العملاء</p></div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
          <p className="font-bold">{error}</p>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
      ) : (
        <div className="bg-bg-card border border-primary/10 rounded-2xl overflow-hidden shadow-2xl">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-white/5 font-black text-primary uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-8 py-5">الاسم</th>
                  <th className="px-8 py-5">رقم الهاتف</th>
                  <th className="px-8 py-5">الطلبات (مكتملة/ملغية)</th>
                  <th className="px-8 py-5">المحافظة</th>
                  <th className="px-8 py-5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {customers.map(customer => {
                  const stats = getCustomerStats(customer.uid);
                  return (
                    <tr key={customer.uid} className="hover:bg-white/[0.02] transition-colors group">
                      <td 
                        className="px-8 py-5 font-bold flex items-center gap-3 cursor-pointer group/name"
                        onClick={() => handleViewDetails(customer)}
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover/name:bg-primary group-hover/name:text-white transition-all border border-primary/10">
                          <UserIcon className="w-5 h-5" />
                        </div>
                        <span className="group-hover/name:text-primary transition-colors text-white">{customer.name}</span>
                      </td>
                      <td className="px-8 py-5 dir-ltr text-right font-bold text-white/70">{customer.phone}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-white font-black bg-white/5 px-2 py-1 rounded-lg">{stats.total} كلي</span>
                          <span className="text-green-500 font-bold">({stats.completed} مكتمل)</span>
                          <span className="text-red-500 font-bold">({stats.cancelled} مرفوض)</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 font-bold text-white/70">{customer.city || '-'}</td>
                      <td className="px-8 py-5">
                         <div className="flex items-center justify-center gap-2">
                           <button onClick={() => handleViewDetails(customer)} className="p-2.5 bg-white/5 hover:bg-primary/20 text-primary rounded-xl transition-all" title="عرض التفاصيل"><Eye className="w-4 h-4" /></button>
                           <button onClick={() => handleEdit(customer)} className="p-2.5 bg-white/5 hover:bg-blue-500/20 text-blue-500 rounded-xl transition-all" title="تعديل"><Edit2 className="w-4 h-4" /></button>
                           <button onClick={() => handleDelete(customer.uid)} className="p-2.5 bg-white/5 hover:bg-red-500/20 text-red-500 rounded-xl transition-all" title="حذف"><Trash2 className="w-4 h-4" /></button>
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-white/5">
            {customers.map(customer => {
              const stats = getCustomerStats(customer.uid);
              return (
                <div key={customer.uid} className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                        <UserIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-white">{customer.name}</div>
                        <div className="text-[10px] opacity-40 dir-ltr">{customer.phone}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">المحافظة</div>
                      <div className="text-xs font-bold text-white">{customer.city || '-'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/5 p-2 rounded-xl text-center">
                      <div className="text-[8px] font-black text-white/30 uppercase">كلي</div>
                      <div className="text-sm font-black text-white">{stats.total}</div>
                    </div>
                    <div className="bg-green-500/5 p-2 rounded-xl text-center">
                      <div className="text-[8px] font-black text-green-500/30 uppercase">مكتمل</div>
                      <div className="text-sm font-black text-green-500">{stats.completed}</div>
                    </div>
                    <div className="bg-red-500/5 p-2 rounded-xl text-center">
                      <div className="text-[8px] font-black text-red-500/30 uppercase">مرفوض</div>
                      <div className="text-sm font-black text-red-500">{stats.cancelled}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button onClick={() => handleViewDetails(customer)} className="p-2.5 bg-white/5 text-primary rounded-xl">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEdit(customer)} className="p-2.5 bg-white/5 text-blue-500 rounded-xl">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(customer.uid)} className="p-2.5 bg-white/5 text-red-500 rounded-xl">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      <CustomerProfileModal 
        userId={selectedCustomer?.uid}
        customerData={selectedCustomer}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        allOrders={orders}
      />

      {/* Edit Customer Modal */}
      {isEditing && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
          <div className="bg-white/5 border border-white/10 w-full max-w-lg rounded-[2.5rem] p-10 space-y-8 relative shadow-2xl backdrop-blur-2xl">
            <button onClick={() => setIsEditing(false)} className="absolute top-8 left-8 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10"><X className="w-6 h-6" /></button>
            
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">تعديل بيانات العميل</h3>
              <p className="text-xs opacity-40 uppercase tracking-widest font-bold">نظام إدارة العملاء</p>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-2">
              <div className="space-y-2">
                <label className="text-xs opacity-40">الاسم الكامل</label>
                <input 
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary"
                  value={editForm.name || ''}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs opacity-40">رقم الهاتف</label>
                <input 
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary"
                  value={editForm.phone || ''}
                  onChange={e => setEditForm({...editForm, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs opacity-40">كلمة المرور</label>
                <div className="relative">
                  <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                  <input 
                    type="text"
                    className="w-full bg-bg-main border border-white/10 rounded-xl px-12 py-3 outline-none focus:border-primary"
                    value={editForm.password || ''}
                    onChange={e => setEditForm({...editForm, password: e.target.value})}
                    placeholder="كلمة المرور"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs opacity-40">المحافظة</label>
                <input 
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary"
                  value={editForm.city || ''}
                  onChange={e => setEditForm({...editForm, city: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs opacity-40">المنطقة</label>
                <input 
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary"
                  value={editForm.region || ''}
                  onChange={e => setEditForm({...editForm, region: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs opacity-40">أقرب نقطة دالة</label>
                <input 
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary"
                  value={editForm.nearestPoint || ''}
                  onChange={e => setEditForm({...editForm, nearestPoint: e.target.value})}
                />
              </div>
            </div>

            <button onClick={saveEdit} className="w-full py-4 bg-primary text-white font-black rounded-xl hover:bg-primary-dark transition-all">
              حفظ التغييرات
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;
