
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Truck, AlertCircle, CheckCircle, Loader2, ChevronDown } from 'lucide-react';
import { CartContext } from '../../src/App';
import { CITIES } from '../../src/constants';
import { db } from '../../src/firebase';
import { collection, addDoc, getDocs, serverTimestamp, doc, getDoc, writeBatch, increment, Timestamp } from 'firebase/firestore';
import { auth } from '../../src/firebase';
import { OrderStatus, User } from '../../src/types';
import { trackPurchase } from '../../src/lib/pixels';

const StoreCheckout: React.FC = () => {
  const { cart, total, clearCart } = useContext(CartContext)!;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [shippingCost, setShippingCost] = useState(5000);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'WAYL'>('COD');
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: 'بغداد',
    address: '',
    notes: ''
  });

  const isDigitalOnly = cart.length > 0 && cart.every(item => item.isDigital);
  const hasDigital = cart.some(item => item.isDigital);

  useEffect(() => {
    if (hasDigital && paymentMethod === 'COD') {
      setPaymentMethod('WAYL');
    }
  }, [hasDigital, paymentMethod]);

  // Fetch shipping data
  useEffect(() => {
    const fetchShipping = async () => {
      if (isDigitalOnly) {
        setShippingCost(0);
        return;
      }
      setError(null);
      try {
        const docRef = doc(db, 'settings', 'store');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const settings = docSnap.data() as any;
          const prices = settings.shippingPrices || {};
          setShippingCost(prices[formData.city] || 5000);
        } else {
          setShippingCost(5000);
        }
      } catch (err: any) {
        console.error("Error fetching shipping:", err);
        setShippingCost(5000);
      }
    };
    fetchShipping();
  }, [formData.city]);

  // Fetch user data on mount
  React.useEffect(() => {
    if (cart.length === 0) {
      navigate('/cart');
      return;
    }

    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setFormData(prev => ({
              ...prev,
              name: userData.name || '',
              phone: userData.phone || '',
              city: userData.city || 'بغداد',
              address: userData.region && userData.nearestPoint 
                ? `${userData.region} - ${userData.nearestPoint}` 
                : (userData.address || ''),
            }));
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // 1. Verify stock for all items first
      const stockChecks = await Promise.all(
        cart.map(item => getDoc(doc(db, 'products', item.productId)))
      );

      const insufficientStockItems = [];
      const updatedCart = [...cart];
      const productUpdates: { id: string, keys: string[], qty: number }[] = [];

      for (let i = 0; i < cart.length; i++) {
        const productSnap = stockChecks[i];
        const item = cart[i];
        if (!productSnap.exists()) {
          insufficientStockItems.push(`${item.name} (غير موجود)`);
          continue;
        }
        const productData = productSnap.data();
        if (productData.stockQuantity < item.qty) {
          insufficientStockItems.push(`${item.name} (المتوفر: ${productData.stockQuantity})`);
        }

        // Handle digital keys assignment
        if (productData.isDigital && productData.digitalKeys && productData.digitalKeys.length > 0) {
          const availableKeys = [...(productData.digitalKeys || [])];
          if (availableKeys.length < item.qty) {
            insufficientStockItems.push(`${item.name} (الأكواد المتوفرة: ${availableKeys.length})`);
          } else {
            const assignedKeys = availableKeys.splice(0, item.qty);
            updatedCart[i] = { ...item, assignedKeys };
            productUpdates.push({ id: item.productId, keys: availableKeys, qty: item.qty });
          }
        } else {
          productUpdates.push({ id: item.productId, keys: productData.digitalKeys || [], qty: item.qty });
        }
      }

      if (insufficientStockItems.length > 0) {
        setError(`عذراً، الكمية المطلوبة غير متوفرة للمنتجات التالية: ${insufficientStockItems.join('، ')}`);
        setLoading(false);
        return;
      }

      const orderNumber = `PCT-${Math.floor(100000 + Math.random() * 900000)}`;
      const paymentFee = paymentMethod === 'WAYL' ? Math.ceil((total + shippingCost) * 0.03) : 0;
      const totalAmount = total + shippingCost + paymentFee;
      
      const cleanCart = updatedCart.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        qty: item.qty,
        image: item.image || '',
        isDigital: item.isDigital || false,
        assignedKeys: item.assignedKeys || []
      }));

      const cleanCustomer = {
        name: formData.name || '',
        phone: formData.phone || '',
        city: formData.city || 'بغداد',
        address: formData.address || '',
        notes: formData.notes || ''
      };

      const orderData = {
        orderNumber,
        userId: auth.currentUser?.uid || null,
        customer: cleanCustomer,
        items: cleanCart,
        subtotal: total,
        shippingCost: shippingCost,
        paymentFee: paymentFee,
        totalAmount: totalAmount,
        shippingCompany: 'Heeiz',
        paymentMethod: paymentMethod,
        status: OrderStatus.PENDING,
        statusHistory: [{
          status: OrderStatus.PENDING,
          timestamp: Timestamp.now(),
          notes: 'تم إنشاء الطلب من المتجر'
        }],
        paymentStatus: paymentMethod === 'WAYL' ? 'pending' : 'unpaid',
        inventoryUpdated: hasDigital ? true : false, // Digital products are updated at checkout
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const batch = writeBatch(db);
      const newOrderRef = doc(collection(db, 'orders'));
      batch.set(newOrderRef, orderData);

      // Update products (stock and keys)
      productUpdates.forEach(update => {
        const productRef = doc(db, 'products', update.id);
        const item = cart.find(i => i.productId === update.id);
        
        if (item?.isDigital) {
          // Digital products are deducted at checkout
          batch.update(productRef, {
            stockQuantity: increment(-update.qty),
            digitalKeys: update.keys
          });
        } else {
          // Physical products: we only update keys if any (unlikely for physical)
          // Stock deduction is handled by shipping API response in OrderDetail
          if (update.keys && update.keys.length > 0) {
            batch.update(productRef, {
              digitalKeys: update.keys
            });
          }
        }
      });

      await batch.commit();

      // Track Purchase in Pixels
      trackPurchase({ id: newOrderRef.id, ...orderData });

      if (paymentMethod === 'WAYL') {
        // Fetch Wayl API Key from Firestore
        let apiKey = "UuMzpuP9mv71qHi3x5hxEQ==:AyMq3tNGWaZ7kjpAOIfi49ch1XcAyTwN8ejD12QkpUt/fV8H/cc8jl45ckA3Ncjk4zYh5jFCq64UOxB/PXB1z53SoI1Ii8M0akEZNKXKYHTcq41J12Plid14xAzwz8zN35CWT4f8sZNNZSDf86K0lBP4VT+WwSHV5eACx5CDmMk=";
        try {
          const configDoc = await getDoc(doc(db, 'settings', 'wayl_config'));
          if (configDoc.exists() && configDoc.data().apiKey) {
            apiKey = configDoc.data().apiKey;
          }
        } catch (e) {
          console.error("Error fetching Wayl API key from Firestore:", e);
        }

        const appUrl = window.location.origin;
        const lineItems = [
          {
            label: `Order ${orderNumber}`,
            amount: total + shippingCost,
            type: "increase",
          }
        ];

        if (paymentFee && paymentFee > 0) {
          lineItems.push({
            label: "رسوم الدفع الإلكتروني",
            amount: paymentFee,
            type: "increase",
          });
        }

        // Create Wayl Payment Link via PHP Proxy
        const response = await fetch('/wayl-proxy.php', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-WAYL-AUTHENTICATION': apiKey
          },
          body: JSON.stringify({
            env: "live",
            referenceId: newOrderRef.id,
            total: totalAmount,
            currency: "IQD",
            lineItem: lineItems,
            webhookUrl: `${appUrl}/api/wayl/webhook`, // This won't work on static hosting, but required by API
            webhookSecret: "secure_random_secret_123",
            redirectionUrl: `${appUrl}/order-success`,
          })
        });

        let waylData;
        const responseText = await response.text();
        try {
          waylData = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse Wayl response:", responseText);
          throw new Error(`خطأ في الاتصال ببوابة الدفع: ${response.status}`);
        }

        if (waylData.data?.url) {
          window.location.href = waylData.data.url;
          return;
        } else {
          throw new Error(waylData.message || 'فشل إنشاء رابط الدفع');
        }
      }
      
      clearCart();
      navigate('/order-success', { state: { order: { ...orderData, id: newOrderRef.id } } });
    } catch (err: any) {
      console.error("Error saving order:", err);
      setError(err.message || "حدث خطأ أثناء حفظ الطلب. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-black text-white mb-8">إتمام الطلب</h1>

      {error && (
        <div className="mb-8 bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-center text-sm font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
           <form id="checkout-form" onSubmit={handleSubmit} className="p-8 bg-[var(--color-bg-card)] rounded-3xl border border-white/5 space-y-6">
              <h3 className="text-xl font-bold text-white mb-4">بيانات العميل</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-sm opacity-60">الاسم الكامل</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-bg-card border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm opacity-60">رقم الهاتف</label>
                    <input 
                      required
                      type="tel" 
                      placeholder="07XXXXXXXXX"
                      className="w-full bg-bg-card border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm opacity-60">المحافظة</label>
                    <div className="relative">
                      <div 
                        className="w-full bg-bg-card border border-white/10 rounded-xl px-4 py-3 outline-none focus-within:border-primary cursor-pointer transition-all flex items-center justify-between"
                        onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                      >
                        <span className={formData.city ? 'text-white' : 'text-gray-500'}>{formData.city || 'اختر المحافظة'}</span>
                        <ChevronDown className={`w-5 h-5 opacity-40 transition-transform ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                      
                      {isCityDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsCityDropdownOpen(false)}></div>
                          <div className="absolute z-50 w-full mt-2 bg-[var(--color-bg-card)] border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                            {CITIES.map(city => (
                              <div 
                                key={city}
                                className={`px-4 py-3 hover:bg-primary/20 cursor-pointer transition-colors border-b border-white/5 last:border-0 ${formData.city === city ? 'bg-primary/10 text-primary font-bold' : 'text-white'}`}
                                onClick={() => {
                                  setFormData({...formData, city});
                                  setIsCityDropdownOpen(false);
                                }}
                              >
                                {city}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm opacity-60">العنوان بالتفصيل</label>
                    <input 
                      required
                      type="text" 
                      placeholder="المنطقة، الشارع، أقرب نقطة دالة"
                      className="w-full bg-bg-card border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary" 
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                 </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm opacity-60">ملاحظات إضافية (اختياري)</label>
                <textarea 
                  className="w-full bg-bg-card border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary h-24 resize-none"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                ></textarea>
              </div>
           </form>

           <div className="p-8 bg-[var(--color-bg-card)] rounded-3xl border border-white/5">
              <h3 className="text-xl font-bold text-white mb-6">طريقة الدفع</h3>
              <div className="space-y-4">
                {!hasDigital && (
                  <button 
                    type="button"
                    onClick={() => setPaymentMethod('COD')}
                    className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${paymentMethod === 'COD' ? 'bg-primary/5 border-primary' : 'bg-white/5 border-transparent hover:border-white/10'}`}
                  >
                     <div className="flex items-center gap-4 text-right">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${paymentMethod === 'COD' ? 'bg-primary' : 'bg-white/10'}`}>
                           <Truck />
                        </div>
                        <div>
                           <h4 className="font-bold text-white">الدفع عند الاستلام (COD)</h4>
                           <p className="text-xs opacity-60">ادفع نقداً عند وصول الطلب إلى باب منزلك</p>
                        </div>
                     </div>
                     {paymentMethod === 'COD' && <CheckCircle className="text-primary w-6 h-6" />}
                  </button>
                )}

                {hasDigital && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-500 text-sm flex items-center gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>سلتك تحتوي على منتجات رقمية، الدفع الإلكتروني مطلوب لإتمام الطلب.</span>
                  </div>
                )}

                <button 
                  type="button"
                  onClick={() => setPaymentMethod('WAYL')}
                  className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${paymentMethod === 'WAYL' ? 'bg-primary/5 border-primary' : 'bg-white/5 border-transparent hover:border-white/10'}`}
                >
                   <div className="flex items-center gap-4 text-right">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${paymentMethod === 'WAYL' ? 'bg-primary' : 'bg-white/10'}`}>
                         <CreditCard />
                      </div>
                      <div>
                         <h4 className="font-bold text-white">دفع إلكتروني</h4>
                         <p className="text-xs opacity-60">ادفع الآن باستخدام المحافظ الإلكترونية العراقية</p>
                      </div>
                   </div>
                   {paymentMethod === 'WAYL' && <CheckCircle className="text-primary w-6 h-6" />}
                </button>
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="p-8 bg-[var(--color-bg-card)] rounded-3xl border border-white/5 space-y-6 sticky top-24">
              <h3 className="text-xl font-black text-white">مراجعة الطلب</h3>
              <div className="max-h-60 overflow-y-auto space-y-4 pr-2">
                 {cart.map(item => (
                   <div key={item.productId} className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-lg bg-bg-light overflow-hidden shrink-0">
                         <img src={item.image || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-grow overflow-hidden">
                         <div className="text-sm font-bold text-white truncate">{item.name}</div>
                         <div className="text-xs opacity-50">{item.qty} × {(item.price || 0).toLocaleString()}</div>
                      </div>
                   </div>
                 ))}
              </div>
              <div className="pt-6 border-t border-white/10 space-y-3">
                 <div className="flex justify-between text-sm opacity-60">
                    <span>المجموع</span>
                    <span>{(total || 0).toLocaleString()} د.ع</span>
                 </div>
                 <div className="flex justify-between text-sm opacity-60">
                    <span>سعر التوصيل ({formData.city})</span>
                    <span>{shippingCost.toLocaleString()} د.ع</span>
                 </div>
                 {paymentMethod === 'WAYL' && (
                   <div className="flex justify-between text-sm text-amber-500">
                      <span>عمولة الدفع الإلكتروني (3%)</span>
                      <span>{Math.ceil((total + shippingCost) * 0.03).toLocaleString()} د.ع</span>
                   </div>
                 )}
                 <div className="flex justify-between text-xl font-black text-white">
                    <span>الإجمالي النهائي</span>
                    <span className="text-primary">{(total + shippingCost + (paymentMethod === 'WAYL' ? Math.ceil((total + shippingCost) * 0.03) : 0)).toLocaleString()} د.ع</span>
                 </div>
              </div>
              <button 
                form="checkout-form"
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-white font-black rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
              >
                 {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد الطلب الآن'}
              </button>
              <div className="flex items-start gap-2 text-[10px] opacity-40 bg-white/5 p-3 rounded-lg">
                 <AlertCircle className="w-4 h-4 shrink-0" />
                 <span>يرجى التأكد من صحة رقم الهاتف لنتمكن من التواصل معك لتأكيد الطلب قبل الشحن.</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StoreCheckout;
