
import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, Minus, Plus } from 'lucide-react';
import { CartContext } from '../../src/App';
import { trackInitiateCheckout } from '../../src/lib/pixels';

const StoreCart: React.FC = () => {
  const { cart, removeFromCart, updateQty, total } = useContext(CartContext)!;
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-24 h-24 bg-[var(--color-bg-card)] rounded-full flex items-center justify-center mx-auto">
          <ShoppingBag className="w-12 h-12 opacity-20" />
        </div>
        <h2 className="text-3xl font-black text-white">سلة المشتريات فارغة</h2>
        <p className="opacity-60 max-w-md mx-auto">يبدو أنك لم تقم بإضافة أي منتجات للسلة بعد. ابدأ التسوق الآن واكتشف أقوى العروض.</p>
        <Link to="/products" className="inline-block px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all">
          تصفح المنتجات
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-black text-white mb-8">سلة المشتريات</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map(item => (
            <div key={item.productId} className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-[var(--color-bg-card)] rounded-3xl border border-white/5">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-bg-light shrink-0">
                <img src={item.image || 'https://via.placeholder.com/150'} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-grow text-center sm:text-right space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h3 className="font-bold text-white text-lg">{item.name}</h3>
                  {item.isDigital && (
                    <span className="bg-primary/20 text-primary text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">رقمي</span>
                  )}
                </div>
                <div className="text-primary font-black">{(item.price || 0).toLocaleString()} د.ع</div>
              </div>
              <div className="flex items-center bg-white/5 rounded-xl border border-white/10 h-10 overflow-hidden">
                <button onClick={() => updateQty(item.productId, item.qty - 1)} className="w-10 h-full flex items-center justify-center hover:bg-white/10"><Minus className="w-3 h-3" /></button>
                <span className="w-10 text-center font-bold">{item.qty}</span>
                <button onClick={() => updateQty(item.productId, item.qty + 1)} className="w-10 h-full flex items-center justify-center hover:bg-white/10"><Plus className="w-3 h-3" /></button>
              </div>
              <div className="text-white font-black text-lg min-w-[120px] text-center sm:text-left">
                {((item.price || 0) * item.qty).toLocaleString()} د.ع
              </div>
              <button onClick={() => removeFromCart(item.productId)} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Summary Card */}
        <div className="space-y-6">
          <div className="p-8 bg-[var(--color-bg-card)] rounded-3xl border border-primary/30 space-y-6">
             <h3 className="text-xl font-black text-white">ملخص الطلب</h3>
             <div className="space-y-3 pb-6 border-b border-white/10">
                <div className="flex justify-between text-sm">
                   <span className="opacity-60">المجموع الفرعي</span>
                   <span className="text-white">{(total || 0).toLocaleString()} د.ع</span>
                </div>
                <div className="flex justify-between text-sm">
                   <span className="opacity-60">رسوم التوصيل</span>
                   <span className="text-white/40 text-xs italic">تحدد عند إتمام الطلب</span>
                </div>
             </div>
             <div className="flex justify-between items-center text-xl font-black">
                <span className="text-white">الإجمالي النهائي</span>
                <span className="text-primary">{(total || 0).toLocaleString()} د.ع</span>
             </div>
             <button 
                onClick={() => {
                  trackInitiateCheckout(total, cart);
                  navigate('/checkout');
                }}
                className="w-full py-4 bg-primary text-white font-black rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
             >
                إتمام الطلب <ArrowRight className="w-5 h-5 rotate-180" />
             </button>
          </div>
          <p className="text-xs opacity-40 text-center">بالضغط على إتمام الطلب، أنت توافق على سياسة الاسترجاع والشروط الخاصة بنا.</p>
        </div>
      </div>
    </div>
  );
};

export default StoreCart;
