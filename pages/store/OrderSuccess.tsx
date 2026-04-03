import React, { useEffect, useState, useContext } from 'react';
import { Link, useLocation, Navigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, Phone, Printer, Download, Loader2 } from 'lucide-react';
import { Order, PaymentStatus } from '../../src/types';
import { db } from '../../src/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { CartContext } from '../../src/App';

const StoreSuccess: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const referenceId = searchParams.get('referenceId');
  const { clearCart } = useContext(CartContext)!;
  
  const [order, setOrder] = useState<Order | null>(location.state?.order as Order || null);
  const [loading, setLoading] = useState(!!referenceId && !order);

  useEffect(() => {
    if (referenceId && !order) {
      clearCart(); // Clear cart for electronic payment success
      const fetchOrder = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'orders', referenceId));
          if (docSnap.exists()) {
            setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
          }
        } catch (error) {
          console.error("Error fetching order:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchOrder();
    }
  }, [referenceId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-white font-bold">جاري تأكيد طلبك...</p>
      </div>
    );
  }

  if (!order) {
    return <Navigate to="/" />;
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center space-y-8 mb-12 print:hidden">
        <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
           <CheckCircle className="w-12 h-12" />
        </div>
        <div className="space-y-2">
           <h1 className="text-4xl font-black text-white">شكراً لك يا {order.customer.name}!</h1>
           <p className="opacity-60 text-lg">تم استلام طلبك بنجاح. رقم الطلب هو <span className="text-primary font-bold">{order.orderNumber || `DKN-${order.id.slice(-6).toUpperCase()}`}</span></p>
           <p className="opacity-40 text-sm">سنقوم بالتواصل معك قريباً على الرقم {order.customer.phone} لتأكيد موعد التوصيل.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
           <button onClick={handlePrint} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-white flex items-center gap-2 transition-all">
              <Printer className="w-5 h-5" /> طباعة الفاتورة
           </button>
           <Link to="/products" className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all">
              متابعة التسوق
           </Link>
        </div>
      </div>

      {/* Invoice Section */}
      <div className="bg-white text-black p-8 rounded-3xl shadow-2xl print:shadow-none print:rounded-none print:w-full print:absolute print:top-0 print:left-0 print:bg-white">
        <div className="flex justify-between items-start border-b-2 border-black/10 pb-8 mb-8">
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2">دكان</h2>
            <p className="text-sm opacity-60">متجر دكان المتكامل</p>
            <p className="text-sm opacity-60">بغداد - شارع الصناعة</p>
            <p className="text-sm opacity-60">07700000000</p>
          </div>
          <div className="text-left">
            <h3 className="text-xl font-bold mb-1">فاتورة طلب</h3>
            <p className="text-sm opacity-60">رقم الفاتورة: #{order.orderNumber || `DKN-${order.id.slice(-6).toUpperCase()}`}</p>
            <p className="text-sm opacity-60">التاريخ: {new Date().toLocaleDateString('ar-IQ')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h4 className="font-bold mb-2 text-gray-500 text-xs uppercase">معلومات العميل</h4>
            <p className="font-bold text-lg">{order.customer.name}</p>
            <p className="text-sm">{order.customer.phone}</p>
            <p className="text-sm">{order.customer.city} - {order.customer.address}</p>
          </div>
          <div className="text-left">
            <h4 className="font-bold mb-2 text-gray-500 text-xs uppercase">طريقة الدفع</h4>
            <p className="font-bold">
              {order.paymentMethod === 'WAYL' ? 'دفع إلكتروني (Wayl)' : 'الدفع عند الاستلام (COD)'}
            </p>
            <p className={`text-sm font-bold ${order.paymentStatus === PaymentStatus.PAID ? 'text-green-600' : 'text-red-600'}`}>
              حالة الدفع: {order.paymentStatus === PaymentStatus.PAID ? 'مدفوع' : order.paymentStatus === PaymentStatus.REFUNDED ? 'مسترجع' : 'غير مدفوع'}
            </p>
          </div>
        </div>

        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-black/10 text-sm">
              <th className="text-right py-3 font-bold">المنتج</th>
              <th className="text-center py-3 font-bold">الكمية</th>
              <th className="text-left py-3 font-bold">السعر</th>
              <th className="text-left py-3 font-bold">الإجمالي</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {order.items.map((item, index) => (
              <React.Fragment key={index}>
                <tr className="border-b border-black/5">
                  <td className="py-4">
                    <div className="font-bold">{item.name}</div>
                  </td>
                  <td className="text-center py-4">{item.qty}</td>
                  <td className="text-left py-4">{(item.price || 0).toLocaleString()} د.ع</td>
                  <td className="text-left py-4 font-bold">{((item.price || 0) * item.qty).toLocaleString()} د.ع</td>
                </tr>
                {item.assignedKeys && item.assignedKeys.length > 0 && (
                  <tr className="bg-gray-50/50">
                    <td colSpan={4} className="px-4 py-3">
                      <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-primary">أكواد التفعيل / الحسابات:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.assignedKeys.map((key, kIdx) => (
                            <div key={kIdx} className="bg-white border border-black/10 rounded-lg px-3 py-2 font-mono text-xs flex items-center justify-between group">
                              <span>{key}</span>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(key);
                                  alert('تم نسخ الكود!');
                                }}
                                className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-bold"
                              >
                                نسخ
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="opacity-60">المجموع الفرعي</span>
              <span className="font-bold">{(order.totalAmount || 0).toLocaleString()} د.ع</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="opacity-60">الشحن</span>
              <span className="font-bold">{(order.shippingCost || 0).toLocaleString()} د.ع</span>
            </div>
            <div className="flex justify-between text-xl border-t-2 border-black/10 pt-3">
              <span className="font-black">الإجمالي الكلي</span>
              <span className="font-black text-primary">{(order.totalAmount || 0).toLocaleString()} د.ع</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-black/10 text-center text-xs opacity-40">
          <p>شكراً لتعاملك معنا! في حال وجود أي استفسار يرجى التواصل مع خدمة العملاء.</p>
          <p className="mt-1">www.dukan.com</p>
        </div>
      </div>
    </div>
  );
};

export default StoreSuccess;
