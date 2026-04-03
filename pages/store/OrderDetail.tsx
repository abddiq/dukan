import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Package, Clock, MapPin, ChevronLeft, CheckCircle, Truck, PackageCheck, Loader2, CreditCard, Info, AlertCircle, ShoppingBag, Copy, Zap } from 'lucide-react';
import { db } from '../../src/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Order, OrderStatus } from '../../src/types';
import { motion, AnimatePresence } from 'motion/react';

const StoreOrderDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, 'orders', id));
        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
        } else {
          setError('الطلب غير موجود');
        }
      } catch (err) {
        console.error("Error fetching order:", err);
        setError('حدث خطأ أثناء تحميل تفاصيل الطلب');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatusStep = (status: OrderStatus) => {
    switch(status) {
      case OrderStatus.PENDING: return 1;
      case OrderStatus.CONFIRMED: return 2;
      case OrderStatus.SHIPPED: return 3;
      case OrderStatus.DELIVERED: return 4;
      default: return 1;
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    return status; // The enum values are already in Arabic
  };

  const getStatusColor = (status: OrderStatus) => {
    switch(status) {
      case OrderStatus.DELIVERED: return 'text-green-500 bg-green-500/10 border-green-500/20';
      case OrderStatus.CANCELLED: return 'text-red-500 bg-red-500/10 border-red-500/20';
      case OrderStatus.SHIPPED: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-primary bg-primary/10 border-primary/20';
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
    </div>
  );

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-bg-card/60 backdrop-blur-2xl border border-white/5 rounded-[3rem] p-12 text-center space-y-8 shadow-2xl"
        >
          <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-white italic tracking-tighter">{error || 'الطلب غير موجود'}</h2>
          <button 
            onClick={() => navigate('/profile')} 
            className="w-full py-5 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-all shadow-2xl shadow-primary/20 uppercase italic tracking-widest"
          >
            العودة لطلباتي
          </button>
        </motion.div>
      </div>
    );
  }

  const currentStep = getStatusStep(order.status);

  return (
    <div className="min-h-screen py-12 px-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-24 w-96 h-96 bg-primary/5 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full animate-pulse delay-700"></div>

      <div className="max-w-5xl mx-auto relative z-10 space-y-8">
        {/* Navigation */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center justify-between"
        >
          <button 
            onClick={() => navigate('/profile')} 
            className="group flex items-center gap-3 text-sm font-black text-white/40 hover:text-white transition-all uppercase tracking-widest"
          >
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all rotate-180">
              <ChevronLeft className="w-5 h-5" />
            </div>
            العودة لطلباتي
          </button>
          <div className="px-6 py-2 bg-white/5 rounded-full border border-white/5 text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">
            Order Details
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-card/60 backdrop-blur-2xl border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl"
        >
          {/* Header Section */}
          <div className="p-10 md:p-14 bg-gradient-to-br from-bg-light to-bg-card border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <ShoppingBag className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <div className="text-3xl font-black text-white italic uppercase tracking-tighter">{order.orderNumber}</div>
                  <div className="text-[10px] font-black text-white/30 flex items-center gap-2 uppercase tracking-widest mt-1">
                    <Clock className="w-3 h-3" /> 
                    {order.createdAt ? (typeof order.createdAt === 'string' ? new Date(order.createdAt).toLocaleString('ar-IQ') : new Date(order.createdAt.seconds * 1000).toLocaleString('ar-IQ')) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
            <div className={`px-8 py-3 rounded-full text-xs font-black border uppercase tracking-[0.2em] ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </div>
          </div>

          {/* Progress Tracker */}
          {order.status !== OrderStatus.CANCELLED && (
            <div className="p-10 md:p-14 border-b border-white/5 bg-white/[0.02]">
              <div className="relative flex justify-between items-center max-w-3xl mx-auto">
                {/* Progress Line */}
                <div className="absolute top-6 left-0 w-full h-1 bg-white/5 -z-10 rounded-full"></div>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="absolute top-6 left-0 h-1 bg-gradient-to-r from-primary to-blue-500 -z-10 rounded-full shadow-[0_0_15px_color-mix(in srgb, var(--color-primary) 50%, transparent)]"
                ></motion.div>

                {[
                  { step: 1, icon: <Clock className="w-5 h-5" />, label: 'المراجعة' },
                  { step: 2, icon: <CheckCircle className="w-5 h-5" />, label: 'التأكيد' },
                  { step: 3, icon: <Truck className="w-5 h-5" />, label: 'التوصيل' },
                  { step: 4, icon: <PackageCheck className="w-5 h-5" />, label: 'التسليم' }
                ].map((s) => (
                  <div key={s.step} className="flex flex-col items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 border ${
                      currentStep >= s.step 
                        ? 'bg-primary text-white border-primary shadow-[0_0_20px_color-mix(in srgb, var(--color-primary) 30%, transparent)] scale-110' 
                        : 'bg-bg-light text-white/10 border-white/5'
                    }`}>
                      {s.icon}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest transition-all duration-700 ${currentStep >= s.step ? 'text-white' : 'text-white/10'}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5">
            {/* Left Column: Items */}
            <div className="lg:col-span-3 p-10 md:p-14 border-l border-white/5 space-y-10">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                  <Package className="w-6 h-6 text-primary" /> المنتجات <span className="text-primary">المشتراة</span>
                </h3>
                <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">{order.items.length} Elements</div>
              </div>

              <div className="space-y-6">
                {order.items.map((item, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={idx} 
                    className="group bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-8 hover:border-primary/30 transition-all"
                  >
                    <div className="w-24 h-24 rounded-2xl bg-bg-light overflow-hidden shrink-0 border border-white/5 relative">
                      <img src={item.image || 'https://via.placeholder.com/150'} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute top-2 right-2 bg-primary text-white text-[10px] font-black w-6 h-6 rounded-lg flex items-center justify-center shadow-lg">
                        {item.qty}
                      </div>
                    </div>
                    
                    <div className="flex-grow min-w-0 space-y-4">
                      <div>
                        <div className="text-lg font-black text-white uppercase tracking-tighter group-hover:text-primary transition-colors truncate">{item.name}</div>
                        <div className="text-xs font-black text-primary mt-1">{(item.price || 0).toLocaleString()} <span className="text-[10px] uppercase">د.ع</span></div>
                      </div>

                      {item.assignedKeys && item.assignedKeys.length > 0 && (
                        <div className="space-y-3">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Digital Assets / Keys</div>
                          <div className="grid grid-cols-1 gap-3">
                            {item.assignedKeys.map((key, kIdx) => (
                              <div key={kIdx} className="bg-bg-main/50 border border-white/5 rounded-2xl px-5 py-4 flex items-center justify-between group/key">
                                <span className="font-mono text-xs text-white/60 tracking-wider truncate mr-4">{key}</span>
                                <button 
                                  onClick={() => handleCopy(key)}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    copiedKey === key ? 'bg-green-500 text-white' : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
                                  }`}
                                >
                                  {copiedKey === key ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  {copiedKey === key ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-2xl font-black text-white italic tracking-tighter">
                      {((item.price || 0) * item.qty).toLocaleString()} <span className="text-xs uppercase">د.ع</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Totals Section */}
              <div className="pt-10 border-t border-white/5 space-y-4">
                <div className="flex justify-between text-xs font-black text-white/30 uppercase tracking-[0.2em]">
                  <span>المجموع الفرعي</span>
                  <span className="text-white">{(order.subtotal || 0).toLocaleString()} <span className="text-[10px]">د.ع</span></span>
                </div>
                <div className="flex justify-between text-xs font-black text-white/30 uppercase tracking-[0.2em]">
                  <span>أجور التوصيل</span>
                  <span className="text-white">{(order.shippingCost || 0).toLocaleString()} <span className="text-[10px]">د.ع</span></span>
                </div>
                <div className="flex justify-between items-center pt-6">
                  <div className="text-sm font-black text-white uppercase tracking-[0.3em]">Total Amount</div>
                  <div className="text-4xl font-black text-primary italic tracking-tighter">
                    {(order.totalAmount || 0).toLocaleString()} <span className="text-sm uppercase">د.ع</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Info */}
            <div className="lg:col-span-2 p-10 md:p-14 space-y-12 bg-white/[0.01]">
              {/* Shipping Info */}
              <div className="space-y-8">
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                  <MapPin className="w-6 h-6 text-primary" /> معلومات <span className="text-primary">الشحن</span>
                </h3>
                <div className="bg-bg-main/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6 shadow-xl">
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">المستلم</div>
                    <div className="text-lg font-black text-white italic tracking-tighter">{order.customer.name}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">رقم التواصل</div>
                    <div className="text-lg font-black text-white dir-ltr text-right font-mono tracking-wider">{order.customer.phone}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">العنوان الكامل</div>
                    <div className="text-sm font-bold text-white/80 leading-relaxed">{order.customer.city} • {order.customer.address}</div>
                  </div>
                  {order.shippingCompany && (
                    <div className="space-y-1 pt-4 border-t border-white/5">
                      <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">الناقل</div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 rounded-xl text-xs font-black uppercase tracking-widest">
                        <Truck className="w-3 h-3" />
                        {order.shippingCompany}
                      </div>
                    </div>
                  )}
                  {order.customer.notes && (
                    <div className="space-y-2 pt-4 border-t border-white/5">
                      <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">ملاحظات إضافية</div>
                      <div className="text-xs text-white/40 italic leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5">
                        "{order.customer.notes}"
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Info */}
              <div className="space-y-8">
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                  <CreditCard className="w-6 h-6 text-primary" /> حالة <span className="text-primary">الدفع</span>
                </h3>
                <div className="bg-bg-main/50 border border-white/5 rounded-[2.5rem] p-8 flex items-center justify-between shadow-xl">
                  <div className="space-y-1">
                    <div className="text-lg font-black text-white italic tracking-tighter">
                      {order.paymentMethod === 'WAYL' ? 'Wayl Pay' : 'Cash On Delivery'}
                    </div>
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                      {order.paymentMethod === 'WAYL' ? 'Electronic Transaction' : 'Manual Payment'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {order.paymentStatus === 'Paid' ? (
                      <div className="px-4 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle className="w-3 h-3" /> Paid
                      </div>
                    ) : (
                      <div className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <AlertCircle className="w-3 h-3" /> Unpaid
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Support Info */}
              <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-[2.5rem] flex items-start gap-5">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center shrink-0">
                  <Info className="w-6 h-6 text-blue-400" />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-black text-blue-400 uppercase tracking-widest">Support Note</div>
                  <p className="text-xs text-blue-400/60 leading-relaxed font-bold">
                    سيتم التواصل معك هاتفياً من قبل فريقنا أو شركة التوصيل لتأكيد موعد التسليم. يرجى إبقاء هاتفك متاحاً.
                  </p>
                </div>
              </div>

              {/* Order History Timeline */}
              {order.statusHistory && order.statusHistory.length > 0 && (
                <div className="space-y-8">
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                    <Clock className="w-6 h-6 text-primary" /> سجل <span className="text-primary">حالات الطلب</span>
                  </h3>
                  <div className="bg-bg-main/50 border border-white/5 rounded-[2.5rem] p-8 space-y-8 shadow-xl">
                    <div className="relative space-y-8 before:absolute before:right-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5">
                      {order.statusHistory.slice().reverse().map((history, idx) => (
                        <div key={idx} className="relative pr-12 group">
                          <div className={`absolute right-2 top-1 w-4 h-4 rounded-full border-2 border-bg-main z-10 transition-all duration-500 ${
                            idx === 0 ? 'bg-primary scale-125 shadow-[0_0_10px_color-mix(in srgb, var(--color-primary) 50%, transparent)]' : 'bg-white/10'
                          }`}></div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-black italic uppercase tracking-tighter ${idx === 0 ? 'text-white' : 'text-white/40'}`}>
                                {history.status}
                              </span>
                              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                                {history.timestamp ? (typeof history.timestamp === 'string' ? new Date(history.timestamp).toLocaleString('ar-IQ') : new Date(history.timestamp.seconds * 1000).toLocaleString('ar-IQ')) : 'N/A'}
                              </span>
                            </div>
                            {history.notes && (
                              <p className="text-xs text-white/30 italic leading-relaxed">
                                {history.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StoreOrderDetail;
