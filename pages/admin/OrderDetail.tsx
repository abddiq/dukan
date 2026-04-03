import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Package, 
  User, 
  MapPin, 
  Phone, 
  CreditCard, 
  Truck, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  Printer,
  Trash2,
  Edit2,
  RefreshCw,
  Save,
  X,
  ChevronRight,
  Globe,
  ShoppingBag,
  Zap,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Smartphone,
  Monitor,
  MousePointer2,
  BarChart3,
  Target,
  Eye,
  Navigation,
  MessageSquare
} from 'lucide-react';
import { db } from '../../src/firebase';
import { CartContext } from '../../src/App';
import { doc, getDoc, updateDoc, deleteDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { Order, OrderStatus, PaymentStatus, LandingPageSession } from '../../src/types';
import { motion, AnimatePresence } from 'motion/react';

const AdminOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const context = React.useContext(CartContext);
  const user = context?.user;
  const [order, setOrder] = useState<Order | null>(null);
  const [session, setSession] = useState<LandingPageSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Order>>({});
  const [updating, setUpdating] = useState(false);
  const [shippingCompanies, setShippingCompanies] = useState<any[]>([]);
  const [selectedShippingCompany, setSelectedShippingCompany] = useState<string>('');
  const [sendingToApi, setSendingToApi] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    setLoading(true);
    const docRef = doc(db, 'orders', id);
    
    // Use onSnapshot for real-time updates
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const orderData = { id: docSnap.id, ...data } as Order;
        setOrder(orderData);
        setEditForm(orderData);

        // Fetch session if it exists (only once or if sessionId changes)
        if (orderData.sessionId) {
          const sessionRef = doc(db, 'landing_page_sessions', orderData.sessionId);
          getDoc(sessionRef).then(sessionSnap => {
            if (sessionSnap.exists()) {
              setSession({ id: sessionSnap.id, ...sessionSnap.data() } as LandingPageSession);
            }
          });
        }
        setError(null);
      } else {
        setError('الطلب غير موجود');
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('حدث خطأ أثناء جلب تفاصيل الطلب');
      setLoading(false);
    });

    fetchShippingCompanies();

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (order?.shippingCompany) {
      const company = shippingCompanies.find(c => c.name === order.shippingCompany);
      if (company) setSelectedShippingCompany(company.id);
    }
  }, [order?.shippingCompany, shippingCompanies]);

  const fetchShippingCompanies = async () => {
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const snap = await getDocs(query(collection(db, 'shipping_companies'), where('isActive', '==', true)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setShippingCompanies(list);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!id || !order) return;
    setUpdating(true);
    try {
      const historyEntry = {
        status: newStatus,
        timestamp: Timestamp.now(),
        updatedBy: user?.uid,
        notes: `تم تغيير الحالة من ${order.status} إلى ${newStatus}`
      };

      const updates: any = { 
        status: newStatus,
        updatedAt: Timestamp.now(),
        statusHistory: [...(order.statusHistory || []), historyEntry]
      };
      
      if (newStatus === OrderStatus.DELIVERED && order.paymentMethod === 'COD') {
        updates.paymentStatus = PaymentStatus.PAID;
      }

      await updateDoc(doc(db, 'orders', id), updates);
      setOrder(prev => prev ? { ...prev, ...updates } : null);
      alert('تم تحديث حالة الطلب بنجاح');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء التحديث');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePaymentStatus = async (newStatus: PaymentStatus) => {
    if (!id || !order) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'orders', id), { 
        paymentStatus: newStatus,
        updatedAt: Timestamp.now()
      });
      setOrder({ ...order, paymentStatus: newStatus });
      alert('تم تحديث حالة الدفع بنجاح');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء التحديث');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!id || !order) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'orders', id), {
        customer: editForm.customer,
        updatedAt: Timestamp.now()
      });
      setOrder({ ...order, customer: editForm.customer as any });
      setIsEditing(false);
      alert('تم حفظ التعديلات بنجاح');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    
    try {
      await deleteDoc(doc(db, 'orders', id));
      alert('تم حذف الطلب بنجاح');
      navigate('/admin/orders');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const getStatusConfig = (status: OrderStatus) => {
    switch(status) {
      case OrderStatus.PENDING: return { label: 'جديد', color: 'text-orange-500', bg: 'bg-orange-500/10', icon: Clock };
      case OrderStatus.CONFIRMED: return { label: 'مؤكد', color: 'text-purple-500', bg: 'bg-purple-500/10', icon: CheckCircle };
      case OrderStatus.PROCESSING: return { label: 'قيد التجهيز', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Package };
      case OrderStatus.SHIPPED: return { label: 'قيد التوصيل', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Truck };
      case OrderStatus.DELIVERED: return { label: 'تم التسليم', color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle };
      case OrderStatus.CANCELLED: return { label: 'ملغي', color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle };
      default: return { label: status, color: 'text-gray-500', bg: 'bg-gray-500/10', icon: AlertCircle };
    }
  };

  const getPlatformIcon = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('facebook') || s.includes('fb')) return <Facebook className="w-5 h-5 text-blue-600" />;
    if (s.includes('instagram') || s.includes('ig')) return <Instagram className="w-5 h-5 text-pink-600" />;
    if (s.includes('tiktok')) return <Zap className="w-5 h-5 text-black" />;
    if (s.includes('snapchat')) return <Zap className="w-5 h-5 text-yellow-400" />;
    if (s.includes('twitter') || s.includes('x')) return <Twitter className="w-5 h-5 text-blue-400" />;
    if (s.includes('youtube')) return <Youtube className="w-5 h-5 text-red-600" />;
    if (s.includes('google')) return <Globe className="w-5 h-5 text-blue-500" />;
    return <Navigation className="w-5 h-5 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-white/50 font-bold">جاري تحميل تفاصيل الطلب...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{error || 'الطلب غير موجود'}</h2>
          <p className="text-white/40">يرجى التحقق من رقم الطلب والمحاولة مرة أخرى</p>
        </div>
        <button 
          onClick={() => navigate('/admin/orders')}
          className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all font-bold flex items-center gap-2"
        >
          <ArrowRight className="w-5 h-5" /> العودة لقائمة الطلبات
        </button>
      </div>
    );
  }

  const statusInfo = getStatusConfig(order.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <button 
            onClick={() => navigate('/admin/orders')}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-bold mb-4"
          >
            <ArrowRight className="w-4 h-4" /> العودة للطلبات
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">الطلب #{order.orderNumber || order.id.slice(-8).toUpperCase()}</h2>
              <button 
                onClick={() => {
                  const num = order.orderNumber || order.id.slice(-8).toUpperCase();
                  navigator.clipboard.writeText(num);
                  alert('تم نسخ رقم الطلب');
                }}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                title="نسخ رقم الطلب"
              >
                <Copy className="w-4 h-4" />
              </button>
            <div className={`${statusInfo.bg} ${statusInfo.color} px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 border border-current/20`}>
              <StatusIcon className="w-4 h-4" />
              {statusInfo.label}
            </div>
            {order.source === 'landing_page' ? (
              <div className="bg-emerald-500/10 text-emerald-500 px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 border border-emerald-500/20">
                <Globe className="w-4 h-4" />
                صفحة هبوط
              </div>
            ) : (
              <div className="bg-blue-500/10 text-blue-500 px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 border border-blue-500/20">
                <ShoppingBag className="w-4 h-4" />
                طلب متجر عادي
              </div>
            )}
          </div>
          <p className="text-sm opacity-50 font-bold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            تاريخ الطلب: {order.createdAt ? (order.createdAt instanceof Timestamp ? order.createdAt.toDate().toLocaleString('ar-IQ') : new Date(order.createdAt.seconds * 1000).toLocaleString('ar-IQ')) : 'غير متوفر'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all"
            title="طباعة"
          >
            <Printer className="w-5 h-5" />
          </button>
          <button 
            onClick={handleDelete}
            className="p-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl border border-red-500/20 transition-all"
            title="حذف الطلب"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Landing Page Insights - Premium Dashboard Style */}
      {order.source === 'landing_page' && session && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-primary" /> إحصائيات رحلة العميل
            </h3>
            <div className="text-[10px] font-black text-white/30 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
              بيانات حية من صفحة الهبوط
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Source Card */}
            <div className="group relative bg-bg-card border border-white/5 rounded-[2.5rem] p-6 overflow-hidden transition-all hover:border-indigo-500/30">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] -z-10 group-hover:bg-indigo-500/20 transition-colors" />
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  {getPlatformIcon(session.utmSource || 'Direct')}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">المصدر</span>
                  <h4 className="text-2xl font-black text-white italic tracking-tighter truncate max-w-[120px]">
                    {session.utmSource || 'مباشر'}
                  </h4>
                </div>
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/30 uppercase">الوسيط</span>
                <span className="text-xs font-black text-white/60">{session.utmMedium || 'N/A'}</span>
              </div>
            </div>

            {/* Duration Card */}
            <div className="group relative bg-bg-card border border-white/5 rounded-[2.5rem] p-6 overflow-hidden transition-all hover:border-rose-500/30">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[60px] -z-10 group-hover:bg-rose-500/20 transition-colors" />
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-400 border border-rose-500/20">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block">وقت التصفح</span>
                  <h4 className="text-2xl font-black text-white italic tracking-tighter">
                    {session.duration ? `${Math.floor(session.duration / 60)}:${(session.duration % 60).toString().padStart(2, '0')}` : '0:00'}
                  </h4>
                </div>
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/30 uppercase">التفاعل</span>
                <span className="text-xs font-black text-white/60">{session.interactions?.length || 0} نقرة</span>
              </div>
            </div>

            {/* Scroll Card */}
            <div className="group relative bg-bg-card border border-white/5 rounded-[2.5rem] p-6 overflow-hidden transition-all hover:border-amber-500/30">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[60px] -z-10 group-hover:bg-amber-500/20 transition-colors" />
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 border border-amber-500/20">
                  <MousePointer2 className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">عمق التصفح</span>
                  <h4 className="text-2xl font-black text-white italic tracking-tighter">
                    {session.scrollDepth || 0}%
                  </h4>
                </div>
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/30 uppercase">الاهتمام</span>
                <div className="flex-grow mx-3 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${session.scrollDepth || 0}%` }} />
                </div>
              </div>
            </div>

            {/* Device Card */}
            <div className="group relative bg-bg-card border border-white/5 rounded-[2.5rem] p-6 overflow-hidden transition-all hover:border-emerald-500/30">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] -z-10 group-hover:bg-emerald-500/20 transition-colors" />
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  {session.deviceInfo?.userAgent?.toLowerCase().includes('mobile') ? <Smartphone className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">الجهاز</span>
                  <h4 className="text-2xl font-black text-white italic tracking-tighter truncate max-w-[120px]">
                    {session.deviceInfo?.userAgent?.toLowerCase().includes('mobile') ? 'هاتف محمول' : 'كمبيوتر'}
                  </h4>
                </div>
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/30 uppercase">الدقة</span>
                <span className="text-xs font-black text-white/60">{session.deviceInfo?.screenSize || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Campaign Details - If exists */}
          {session.utmCampaign && (
            <div className="bg-bg-card border border-white/5 rounded-[2rem] p-4 flex items-center justify-between group hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest block">الحملة الإعلانية النشطة</span>
                  <p className="text-sm font-black text-white italic">{session.utmCampaign}</p>
                </div>
              </div>
              <div className="px-4 py-1 bg-white/5 rounded-lg border border-white/5">
                <span className="text-[10px] font-bold text-white/40">معرف الجلسة: {session.id.slice(-6).toUpperCase()}</span>
              </div>
            </div>
          )}
        </motion.section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Customer & Shipping Section */}
          <section className="bg-bg-card border border-white/5 rounded-[2.5rem] p-8 md:p-10 space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -z-10 group-hover:bg-primary/10 transition-colors duration-700" />
            
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                <User className="w-6 h-6 text-primary" /> معلومات العميل والشحن
              </h3>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 text-white/60 hover:text-white"
              >
                {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
              </button>
            </div>

            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">الاسم الكامل</label>
                  <input 
                    type="text"
                    value={editForm.customer?.name}
                    onChange={(e) => setEditForm({ ...editForm, customer: { ...editForm.customer!, name: e.target.value } })}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-primary text-white font-bold transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">رقم الهاتف</label>
                  <input 
                    type="text"
                    value={editForm.customer?.phone}
                    onChange={(e) => setEditForm({ ...editForm, customer: { ...editForm.customer!, phone: e.target.value } })}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-primary text-white font-bold transition-all dir-ltr text-right"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">المدينة</label>
                  <input 
                    type="text"
                    value={editForm.customer?.city}
                    onChange={(e) => setEditForm({ ...editForm, customer: { ...editForm.customer!, city: e.target.value } })}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-primary text-white font-bold transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">العنوان</label>
                  <input 
                    type="text"
                    value={editForm.customer?.address}
                    onChange={(e) => setEditForm({ ...editForm, customer: { ...editForm.customer!, address: e.target.value } })}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-primary text-white font-bold transition-all"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button 
                    onClick={handleSaveEdit}
                    disabled={updating}
                    className="px-8 py-3 bg-primary text-white font-black rounded-2xl hover:bg-opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    حفظ التعديلات
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 text-primary">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] opacity-40 uppercase font-black tracking-widest block">العميل</span>
                    <p className="text-xl font-black text-white">{order.customer.name}</p>
                    <div className="flex items-center gap-2 text-white/60 font-bold">
                      <Phone className="w-3.5 h-3.5" />
                      <span className="dir-ltr">{order.customer.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 text-primary">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] opacity-40 uppercase font-black tracking-widest block">عنوان الشحن</span>
                    <p className="text-xl font-black text-white">{order.customer.city}</p>
                    <p className="text-sm text-white/60 font-bold">{order.customer.address}</p>
                  </div>
                </div>

                {order.customer.notes && (
                  <div className="md:col-span-2 p-6 bg-white/5 rounded-3xl border border-white/5 space-y-2">
                    <span className="text-[10px] opacity-40 uppercase font-black tracking-widest block">ملاحظات إضافية من العميل</span>
                    <p className="text-white/80 italic font-medium leading-relaxed">"{order.customer.notes}"</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Order Items Section */}
          <section className="space-y-6">
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
              <Package className="w-6 h-6 text-primary" /> المنتجات المطلوبة ({order.items.length})
            </h3>
            
            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-bg-card border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-8 group hover:border-primary/30 transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  
                  <div className="w-24 h-24 bg-black/40 rounded-2xl overflow-hidden shrink-0 border border-white/10 relative">
                    <img 
                      src={item.image || 'https://via.placeholder.com/150'} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 bg-primary text-white w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shadow-lg">
                      {item.qty}
                    </div>
                  </div>

                  <div className="flex-grow text-center md:text-right space-y-1">
                    <h4 className="text-xl font-black text-white group-hover:text-primary transition-colors">{item.name}</h4>
                    <p className="text-sm text-white/40 font-bold">معرف المنتج: {item.productId.slice(-8).toUpperCase()}</p>
                    {item.isDigital && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-purple-500/20 mt-2">
                        <Zap className="w-3 h-3" /> منتج رقمي
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center md:items-end gap-1">
                    <div className="text-2xl font-black text-white">
                      {(item.price * item.qty).toLocaleString()} <span className="text-xs opacity-30 font-bold">د.ع</span>
                    </div>
                    <div className="text-[10px] opacity-40 font-black uppercase tracking-widest">
                      {item.qty} × {item.price.toLocaleString()} د.ع
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Order History Timeline */}
          <section className="bg-bg-card border border-white/5 rounded-[2.5rem] p-8 md:p-10 space-y-8 relative overflow-hidden group">
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -z-10" />
            
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
              <Clock className="w-6 h-6 text-primary" /> سجل حالات الطلب
            </h3>

            <div className="relative space-y-8 before:absolute before:right-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-primary before:via-white/10 before:to-white/5">
              {order.statusHistory && order.statusHistory.length > 0 ? (
                order.statusHistory.slice().reverse().map((update, idx) => {
                  const config = getStatusConfig(update.status);
                  const Icon = config.icon;
                  return (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className="relative pr-14"
                    >
                      <div className={`absolute right-3 top-0 w-6 h-6 rounded-full ${config.bg} ${config.color} border border-current/20 flex items-center justify-center z-10 shadow-lg shadow-current/10`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-2 hover:border-primary/30 transition-all group/item">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`${config.color} font-black text-sm`}>{config.label}</span>
                            {idx === 0 && (
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded-full border border-emerald-500/20 uppercase">الحالة الحالية</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] opacity-40 font-bold">
                            <Clock className="w-3 h-3" />
                            {update.timestamp instanceof Timestamp ? update.timestamp.toDate().toLocaleString('ar-IQ') : new Date(update.timestamp.seconds * 1000).toLocaleString('ar-IQ')}
                          </div>
                        </div>
                        {update.notes && (
                          <p className="text-xs text-white/60 leading-relaxed italic border-r-2 border-white/5 pr-3 py-1">
                            {update.notes}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="pr-14 py-4 opacity-40 italic text-sm">
                  لا يوجد سجل حالات لهذا الطلب بعد.
                </div>
              )}
              
              {/* Initial Creation Entry */}
              <div className="relative pr-14">
                <div className="absolute right-3 top-0 w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 border border-current/20 flex items-center justify-center z-10">
                  <ShoppingBag className="w-3 h-3" />
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-500 font-black text-sm">تم إنشاء الطلب</span>
                    <div className="flex items-center gap-2 text-[10px] opacity-40 font-bold">
                      <Clock className="w-3 h-3" />
                      {order.createdAt instanceof Timestamp ? order.createdAt.toDate().toLocaleString('ar-IQ') : new Date(order.createdAt.seconds * 1000).toLocaleString('ar-IQ')}
                    </div>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">
                    تم استلام الطلب بنجاح من {order.source === 'landing_page' ? 'صفحة الهبوط' : 'المتجر'}.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Status Control */}
          <section className="bg-bg-card border border-white/5 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] -z-10" />
            
            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" /> تحديث الحالة
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">حالة الطلب</label>
                <select 
                  value={order.status}
                  onChange={(e) => handleUpdateStatus(e.target.value as OrderStatus)}
                  disabled={updating}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-primary text-white font-bold text-sm appearance-none cursor-pointer disabled:opacity-50"
                >
                  {Object.values(OrderStatus).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">حالة الدفع</label>
                <select 
                  value={order.paymentStatus}
                  onChange={(e) => handleUpdatePaymentStatus(e.target.value as PaymentStatus)}
                  disabled={updating}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-primary text-white font-bold text-sm appearance-none cursor-pointer disabled:opacity-50"
                >
                  {Object.values(PaymentStatus).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Payment Summary */}
          <section className="bg-bg-card border border-white/5 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group">
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 blur-[60px] -z-10" />
            
            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-primary" /> ملخص الفاتورة
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-white/40">المجموع الفرعي</span>
                <span className="text-white">{(order.subtotal || order.totalAmount).toLocaleString()} د.ع</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-white/40">تكلفة الشحن</span>
                <span className="text-white">{(order.shippingCost || 0).toLocaleString()} د.ع</span>
              </div>
              {order.paymentFee && order.paymentFee > 0 && (
                <div className="flex justify-between items-center text-sm font-bold text-amber-500">
                  <span>عمولة الدفع</span>
                  <span>{order.paymentFee.toLocaleString()} د.ع</span>
                </div>
              )}
              
              <div className="pt-6 border-t border-white/10 space-y-1">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-[10px] opacity-40 uppercase font-black tracking-widest block">الإجمالي الكلي</span>
                    <span className="text-4xl font-black text-primary italic tracking-tighter">{order.totalAmount.toLocaleString()}</span>
                  </div>
                  <span className="text-xs opacity-30 font-black mb-2">د.ع</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 mt-2">
                  <CreditCard className="w-3 h-3" />
                  طريقة الدفع: {order.paymentMethod === 'WAYL' ? 'دفع إلكتروني' : 'عند الاستلام'}
                </div>
              </div>
            </div>
          </section>

          {/* Shipping Info */}
          <section className="bg-bg-card border border-white/5 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 blur-[60px] -z-10" />
            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
              <Truck className="w-5 h-5 text-blue-500" /> شركة الشحن والربط
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">اختيار شركة الشحن</label>
                <select 
                  value={selectedShippingCompany || shippingCompanies.find(c => c.name === order.shippingCompany)?.id || ''}
                  onChange={async (e) => {
                    const companyId = e.target.value;
                    setSelectedShippingCompany(companyId);
                    const company = shippingCompanies.find(c => c.id === companyId);
                    if (company) {
                      await updateDoc(doc(db, 'orders', id!), {
                        shippingCompany: company.name
                      });
                      setOrder({ ...order, shippingCompany: company.name });
                    }
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-primary text-white font-bold text-sm appearance-none cursor-pointer"
                >
                  <option value="">اختر شركة شحن</option>
                  {shippingCompanies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {order.shippingCompany && (
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 mt-4">
                <p className="text-lg font-black text-white">{order.shippingCompany}</p>
                <p className="text-xs text-white/40 font-bold mt-1">الشركة المحددة حالياً</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetail;
