
import React from 'react';
import { 
  X, User as UserIcon, Phone, Mail, MapPin, 
  ShoppingBag, Calendar, Clock, TrendingUp,
  ChevronRight, ExternalLink, Package, CheckCircle2,
  AlertCircle, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Order, OrderStatus } from '../../types';

interface CustomerProfileModalProps {
  userId?: string;
  customerData: User | null;
  isOpen: boolean;
  onClose: () => void;
  allOrders: Order[];
}

const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  userId,
  customerData,
  isOpen,
  onClose,
  allOrders
}) => {
  if (!isOpen || !customerData) return null;

  const customerOrders = allOrders.filter(order => 
    order.userId === userId || order.customer?.phone === customerData.phone
  ).sort((a, b) => {
    const dateA = a.createdAt?.seconds || 0;
    const dateB = b.createdAt?.seconds || 0;
    return dateB - dateA;
  });

  const stats = {
    totalOrders: customerOrders.length,
    totalSpent: customerOrders
      .filter(o => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    avgOrderValue: customerOrders.length > 0 
      ? customerOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) / customerOrders.length 
      : 0,
    successRate: customerOrders.length > 0
      ? (customerOrders.filter(o => o.status === OrderStatus.DELIVERED).length / customerOrders.length) * 100
      : 0
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.DELIVERED: return 'text-emerald-500 bg-emerald-500/10';
      case OrderStatus.CANCELLED: return 'text-red-500 bg-red-500/10';
      case OrderStatus.PENDING: return 'text-orange-500 bg-orange-500/10';
      case OrderStatus.CONFIRMED: return 'text-blue-500 bg-blue-500/10';
      case OrderStatus.PROCESSING: return 'text-purple-500 bg-purple-500/10';
      case OrderStatus.SHIPPED: return 'text-cyan-500 bg-cyan-500/10';
      default: return 'text-white/40 bg-white/5';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-bg-main/80 backdrop-blur-xl"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl max-h-[90vh] bg-bg-card border border-white/5 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-2xl shadow-primary/20">
                <UserIcon className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">{customerData.name}</h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-black text-white/40 uppercase tracking-widest border border-white/5">
                    ID: {customerData.uid?.slice(0, 8)}
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                    <CheckCircle2 className="w-3 h-3" /> عميل نشط
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto custom-scrollbar p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Info & Stats */}
              <div className="space-y-8">
                {/* Contact Info */}
                <div className="p-8 bg-white/5 border border-white/5 rounded-[2.5rem] space-y-6">
                  <h3 className="text-xs font-black text-white/30 uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> معلومات التواصل
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-white/20 font-bold uppercase">رقم الهاتف</p>
                        <p className="text-sm font-bold text-white tracking-tighter">{customerData.phone || 'غير متوفر'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-white/20 font-bold uppercase">البريد الإلكتروني</p>
                        <p className="text-sm font-bold text-white tracking-tighter truncate max-w-[180px]">{customerData.email || 'غير متوفر'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-white/20 font-bold uppercase">العنوان</p>
                        <p className="text-sm font-bold text-white tracking-tighter">
                          {customerData.city} - {customerData.address || 'غير محدد'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-white/5 border border-white/5 rounded-[2rem] space-y-2">
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">إجمالي الطلبات</p>
                    <p className="text-2xl font-black text-white italic tracking-tighter">{stats.totalOrders}</p>
                  </div>
                  <div className="p-6 bg-white/5 border border-white/5 rounded-[2rem] space-y-2">
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">نسبة النجاح</p>
                    <p className="text-2xl font-black text-emerald-500 italic tracking-tighter">{stats.successRate.toFixed(1)}%</p>
                  </div>
                  <div className="p-6 bg-white/5 border border-white/5 rounded-[2rem] space-y-2 col-span-2">
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-widest text-center">إجمالي المشتريات</p>
                    <p className="text-3xl font-black text-primary italic tracking-tighter text-center">
                      {stats.totalSpent.toLocaleString()} <span className="text-xs not-italic opacity-40">د.ع</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Order History */}
              <div className="lg:col-span-2 space-y-8">
                <div className="p-8 bg-white/5 border border-white/5 rounded-[2.5rem] flex flex-col h-full min-h-[400px]">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black text-white/30 uppercase tracking-widest flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" /> سجل الطلبات
                    </h3>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                      {customerOrders.length} طلب
                    </span>
                  </div>

                  <div className="space-y-4">
                    {customerOrders.length > 0 ? customerOrders.map((order) => (
                      <div 
                        key={order.id}
                        className="p-6 bg-bg-main/50 border border-white/5 rounded-2xl hover:border-primary/30 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                              <Package className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-white tracking-tighter">#{order.orderNumber}</span>
                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${getStatusColor(order.status)}`}>
                                  {order.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-white/20 font-bold mt-1">
                                {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('ar-IQ') : 'تاريخ غير معروف'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-white tracking-tighter">
                              {order.totalAmount.toLocaleString()} <span className="text-[10px] opacity-40">د.ع</span>
                            </p>
                            <p className="text-[9px] text-white/20 font-bold mt-1">{order.items.length} منتجات</p>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="flex flex-col items-center justify-center py-20 opacity-20 italic">
                        <ShoppingBag className="w-12 h-12 mb-4" />
                        <p>لا توجد طلبات سابقة لهذا العميل</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 border-t border-white/5 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">تحديثات النظام فورية</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={onClose}
                className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CustomerProfileModal;
