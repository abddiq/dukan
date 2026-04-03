import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, Clock, MapPin, Settings, LogOut, ChevronRight, CheckCircle, Truck, PackageCheck, Loader2, User as UserIcon, Save, AlertCircle, Heart, Trash2, Zap } from 'lucide-react';
import { auth, db } from '../../src/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { Order, User, Product, WishlistItem } from '../../src/types';
import { CITIES } from '../../src/constants';

const StoreProfile: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'settings' | 'wishlist'>('orders');
  const [wishlistItems, setWishlistItems] = useState<(WishlistItem & { product: Product })[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: 'بغداد',
    region: '',
    nearestPoint: '',
    address: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Fetch user profile
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as User;
            setUserProfile(data);
            setFormData({
              name: data.name || currentUser.displayName || '',
              phone: data.phone || '',
              city: data.city || 'بغداد',
              region: data.region || '',
              nearestPoint: data.nearestPoint || '',
              address: data.address || ''
            });
          } else {
            // Fallback if user doc doesn't exist
            const fallback: User = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              name: currentUser.displayName || 'مستخدم',
              role: 'customer',
              createdAt: new Date().toISOString()
            };
            setUserProfile(fallback);
            setFormData(prev => ({ ...prev, name: fallback.name }));
          }

          // Fetch orders
          const q = query(
            collection(db, 'orders'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
          const querySnapshot = await getDocs(q);
          const fetchedOrders = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Order[];
          setOrders(fetchedOrders);
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      } else {
        navigate('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchWishlist = async () => {
      if (!auth.currentUser || activeTab !== 'wishlist') return;
      
      setWishlistLoading(true);
      try {
        const q = query(collection(db, 'wishlists'), where('userId', '==', auth.currentUser.uid));
        const snap = await getDocs(q);
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() })) as WishlistItem[];
        
        const itemsWithProducts = await Promise.all(
          items.map(async (item) => {
            const prodDoc = await getDoc(doc(db, 'products', item.productId));
            return { ...item, product: { id: prodDoc.id, ...prodDoc.data() } as Product };
          })
        );
        
        setWishlistItems(itemsWithProducts.filter(item => item.product.name_ar));
      } catch (error) {
        console.error("Error fetching wishlist:", error);
      } finally {
        setWishlistLoading(false);
      }
    };

    fetchWishlist();
  }, [activeTab]);

  const removeWishlistItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'wishlists', id));
      setWishlistItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("Error removing from wishlist:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setSaving(true);
    setMessage(null);
    try {
      // Update Firestore doc
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        ...formData,
        updatedAt: new Date().toISOString()
      });
      
      setUserProfile(prev => prev ? { ...prev, ...formData } : null);
      setMessage({ type: 'success', text: 'تم تحديث البيانات بنجاح' });
      
      // Update Auth display name
      await updateProfile(auth.currentUser, {
        displayName: formData.name
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء التحديث' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Shipped': return 'text-blue-400 bg-blue-400/10';
      case 'Delivered': return 'text-green-500 bg-green-500/10';
      case 'Pending': return 'text-orange-400 bg-orange-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'Shipped': return 'قيد التوصيل';
      case 'Delivered': return 'تم التسليم';
      case 'Pending': return 'قيد المراجعة';
      default: return status;
    }
  };

  if (loading) return <div className="flex justify-center py-40"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>;

  if (!userProfile) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full lg:w-80 shrink-0 space-y-4">
           <div className="p-8 bg-[var(--color-bg-card)] rounded-3xl border border-white/5 text-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-dark mx-auto flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-primary/20">
                 {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : <UserIcon />}
              </div>
              <div>
                 <h2 className="text-xl font-bold text-white">{userProfile.name}</h2>
                 <p className="text-sm opacity-40 dir-ltr">{userProfile.phone || userProfile.email}</p>
              </div>
              {userProfile.city && (
                <div className="text-xs opacity-60 bg-white/5 py-2 px-4 rounded-lg">
                  {userProfile.city} - {userProfile.region}
                </div>
              )}
           </div>

           <nav className="bg-[var(--color-bg-card)] border border-white/5 rounded-3xl overflow-hidden">
              <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full p-4 flex items-center gap-4 transition-all ${activeTab === 'orders' ? 'bg-primary/10 text-primary font-bold border-r-4 border-primary' : 'hover:bg-white/5 opacity-60'}`}
              >
                 <Package className="w-5 h-5" /> طلباتي
              </button>
              <button 
                onClick={() => setActiveTab('addresses')}
                className={`w-full p-4 flex items-center gap-4 transition-all ${activeTab === 'addresses' ? 'bg-primary/10 text-primary font-bold border-r-4 border-primary' : 'hover:bg-white/5 opacity-60'}`}
              >
                 <MapPin className="w-5 h-5" /> عناويني
              </button>
              <button 
                onClick={() => setActiveTab('wishlist')}
                className={`w-full p-4 flex items-center gap-4 transition-all ${activeTab === 'wishlist' ? 'bg-primary/10 text-primary font-bold border-r-4 border-primary' : 'hover:bg-white/5 opacity-60'}`}
              >
                 <Heart className="w-5 h-5" /> قائمة الرغبات
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`w-full p-4 flex items-center gap-4 transition-all ${activeTab === 'settings' ? 'bg-primary/10 text-primary font-bold border-r-4 border-primary' : 'hover:bg-white/5 opacity-60'}`}
              >
                 <Settings className="w-5 h-5" /> الإعدادات
              </button>
              <button onClick={handleLogout} className="w-full p-4 flex items-center gap-4 hover:bg-red-500/10 text-red-500 transition-colors">
                 <LogOut className="w-5 h-5" /> تسجيل الخروج
              </button>
           </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-grow space-y-8">
           {activeTab === 'orders' && (
             <>
               <h2 className="text-3xl font-black text-white">تاريخ الطلبات</h2>
               <div className="space-y-4">
                  {orders.map(order => (
                    <Link 
                      to={`/profile/orders/${order.id}`}
                      key={order.id} 
                      className="block bg-[var(--color-bg-card)] border border-white/5 rounded-3xl overflow-hidden hover:border-primary/20 transition-all group"
                    >
                       <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                <Package className="w-6 h-6 opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all" />
                             </div>
                             <div>
                                <div className="text-sm font-bold text-primary uppercase tracking-tighter">{order.orderNumber}</div>
                                <div className="text-xs opacity-40 flex items-center gap-2">
                                   <Clock className="w-3 h-3" /> {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('ar-IQ') : 'N/A'}
                                </div>
                             </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
                             <div className="text-center">
                                <div className="text-xs opacity-40 mb-1">عدد العناصر</div>
                                <div className="font-bold text-white">{order.items?.length || 0}</div>
                             </div>
                             <div className="text-center">
                                <div className="text-xs opacity-40 mb-1">الإجمالي</div>
                                <div className="font-bold text-primary">{(order.totalAmount || 0).toLocaleString()} د.ع</div>
                             </div>
                             <span className={`px-4 py-1.5 rounded-full text-xs font-black ${getStatusColor(order.status)}`}>
                                {getStatusLabel(order.status)}
                             </span>
                          </div>
                          <div className="p-2 hover:bg-white/5 rounded-full rotate-180 group-hover:translate-x-1 transition-transform">
                             <ChevronRight className="w-6 h-6 opacity-40 group-hover:opacity-100 group-hover:text-primary" />
                          </div>
                       </div>
                    </Link>
                  ))}
                  {orders.length === 0 && (
                    <div className="py-20 bg-[var(--color-bg-card)] border border-dashed border-white/10 rounded-3xl flex flex-col items-center text-center">
                       <Package className="w-16 h-16 opacity-10 mb-4" />
                       <h3 className="text-xl font-bold text-white mb-2">لا توجد طلبات سابقة</h3>
                       <p className="opacity-40 max-w-xs mb-6">لم تقم بشراء أي شيء بعد. ابدأ بناء تجميعتك الآن!</p>
                       <button onClick={() => navigate('/products')} className="px-8 py-3 bg-primary text-white font-bold rounded-xl">اكتشف المنتجات</button>
                    </div>
                  )}
               </div>
             </>
           )}

           {activeTab === 'addresses' && (
             <div className="space-y-8">
               <h2 className="text-3xl font-black text-white">عناويني</h2>
               <div className="bg-[var(--color-bg-card)] border border-white/5 rounded-3xl p-8 space-y-6">
                 <div className="flex items-center gap-4 text-primary mb-4">
                   <MapPin className="w-6 h-6" />
                   <h3 className="text-xl font-bold">عنوان الشحن الافتراضي</h3>
                 </div>
                 
                 <form onSubmit={handleUpdateProfile} className="space-y-6">
                    {message && (
                      <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {message.text}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs opacity-40 font-bold uppercase tracking-wider">المحافظة</label>
                        <select 
                          className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all"
                          value={formData.city}
                          onChange={e => setFormData({...formData, city: e.target.value})}
                        >
                          {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs opacity-40 font-bold uppercase tracking-wider">المنطقة / الحي</label>
                        <input 
                          className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all"
                          value={formData.region}
                          onChange={e => setFormData({...formData, region: e.target.value})}
                          placeholder="مثال: المنصور، حي الجامعة..."
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs opacity-40 font-bold uppercase tracking-wider">أقرب نقطة دالة</label>
                        <input 
                          className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all"
                          value={formData.nearestPoint}
                          onChange={e => setFormData({...formData, nearestPoint: e.target.value})}
                          placeholder="مثال: قرب صيدلية الامل، مقابل مدرسة..."
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={saving}
                      className="px-8 py-4 bg-primary text-white font-black rounded-xl hover:bg-primary-dark transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      حفظ العنوان
                    </button>
                 </form>
               </div>
             </div>
           )}

           {activeTab === 'settings' && (
             <div className="space-y-8">
               <h2 className="text-3xl font-black text-white">الإعدادات</h2>
               <div className="bg-[var(--color-bg-card)] border border-white/5 rounded-3xl p-8 space-y-6">
                 <div className="flex items-center gap-4 text-primary mb-4">
                   <UserIcon className="w-6 h-6" />
                   <h3 className="text-xl font-bold">المعلومات الشخصية</h3>
                 </div>
                 
                 <form onSubmit={handleUpdateProfile} className="space-y-6">
                    {message && (
                      <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {message.text}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs opacity-40 font-bold uppercase tracking-wider">الاسم الكامل</label>
                        <input 
                          required
                          className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all"
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs opacity-40 font-bold uppercase tracking-wider">رقم الهاتف</label>
                        <input 
                          required
                          className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all dir-ltr text-right"
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          placeholder="07XXXXXXXXX"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs opacity-40 font-bold uppercase tracking-wider">البريد الإلكتروني</label>
                        <input 
                          disabled
                          className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white/40 outline-none cursor-not-allowed dir-ltr text-right"
                          value={userProfile.email}
                        />
                        <p className="text-[10px] opacity-40 mt-1">لا يمكن تغيير البريد الإلكتروني حالياً.</p>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={saving}
                      className="px-8 py-4 bg-primary text-white font-black rounded-xl hover:bg-primary-dark transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      حفظ التغييرات
                    </button>
                 </form>
               </div>
             </div>
           )}

           {activeTab === 'wishlist' && (
              <div className="space-y-8">
                <h2 className="text-3xl font-black text-white">قائمة الرغبات</h2>
                {wishlistLoading ? (
                  <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
                ) : wishlistItems.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {wishlistItems.map(item => (
                      <div key={item.id} className="group bg-[var(--color-bg-card)] border border-white/5 rounded-3xl overflow-hidden hover:border-primary/20 transition-all flex flex-col">
                        <div className="aspect-video bg-bg-light relative overflow-hidden">
                          <img src={item.product.images?.[0] || 'https://via.placeholder.com/600'} alt={item.product.name_ar} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                          <h3 className="font-bold text-white group-hover:text-primary transition-colors line-clamp-1">{item.product.name_ar}</h3>
                          <div className="flex items-center justify-between">
                            <div className="text-xl font-black text-primary">
                              {(item.product.price || 0).toLocaleString()} <span className="text-xs">د.ع</span>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => removeWishlistItem(item.id)}
                                className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                              <Link 
                                to={`/products/${item.product.id}`}
                                className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                              >
                                <Zap className="w-5 h-5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 bg-[var(--color-bg-card)] border border-dashed border-white/10 rounded-3xl flex flex-col items-center text-center">
                    <Heart className="w-16 h-16 opacity-10 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">قائمة الرغبات فارغة</h3>
                    <p className="opacity-40 max-w-xs mb-6">لم تقم بإضافة أي منتجات للمفضلة بعد.</p>
                    <button onClick={() => navigate('/products')} className="px-8 py-3 bg-primary text-white font-bold rounded-xl">تصفح المنتجات</button>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default StoreProfile;
