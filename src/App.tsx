
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, LayoutDashboard, Home as HomeIcon, Package, List, Users, Settings, User as UserIcon, LogOut, Menu, X, Plus, Search, Trash2, ChevronRight, CheckCircle, CreditCard, Info, Sparkles, Heart, Star, Palette, Moon, Snowflake, AlertTriangle, Clock, Zap, Wallet, ShoppingBag, ArrowUpRight, Globe } from 'lucide-react';
import { logActivity, ActivityType } from './services/activityService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Product, CartItem, Order, OrderStatus, Category, User, StoreSettings, Store } from './types';
import { initPixels, trackPageView } from './lib/pixels';
import { useLocation } from 'react-router-dom';
import { StoreProvider, useStore } from './contexts/StoreContext';

// Pages
import StoreHome from '../pages/store/Home';
import StoreProducts from '../pages/store/Products';
import StoreBrands from '../pages/store/Brands';
import StoreProductDetail from '../pages/store/ProductDetail';
import StoreCart from '../pages/store/Cart';
import StoreCheckout from '../pages/store/Checkout';
import StoreSuccess from '../pages/store/OrderSuccess';
import StoreProfile from '../pages/store/Profile';
import StoreOrderDetail from '../pages/store/OrderDetail';
import StoreContact from '../pages/store/Contact';
import StoreAboutUs from '../pages/store/AboutUs';
import StoreLogin from '../pages/store/Login';
import StoreSignup from '../pages/store/Signup';

import AdminLogin from '../pages/admin/Login';
import AdminSignup from '../pages/admin/Signup';
import AdminDashboard from '../pages/admin/Dashboard';
import AdminProducts from '../pages/admin/Products';
import AdminDigitalProducts from '../pages/admin/DigitalProducts';
import AdminBrands from '../pages/admin/Brands';
import AdminInstallments from '../pages/admin/Installments';
import AdminCategories from '../pages/admin/Categories';
import AdminOrders from '../pages/admin/Orders';
import AdminCustomers from '../pages/admin/Customers';
import AdminHero from '../pages/admin/Hero';
import AdminAddHero from '../pages/admin/AddHero';
import AdminEditHero from '../pages/admin/EditHero';
import AdminAddProduct from '../pages/admin/AddProduct';
import AdminAddDigitalProduct from '../pages/admin/AddDigitalProduct';
import AdminEditProduct from '../pages/admin/EditProduct';
import AdminReviews from '../pages/admin/Reviews';
import AdminThemes from '../pages/admin/Themes';
import AdminTeam from '../pages/admin/Team';
import AdminTickets from '../pages/admin/Tickets';
import AdminSettings from '../pages/admin/Settings';
import AdminStories from '../pages/admin/Stories';
import AdminShippingCompanies from '../pages/admin/ShippingCompanies';
import AdminShippingCompanyDetails from '../pages/admin/ShippingCompanyDetails';
import AdminCampaigns from '../pages/admin/Campaigns';
import AdminAddStory from '../pages/admin/AddStory';
import AdminAnalytics from '../pages/admin/Analytics';
import AdminSuppliers from '../pages/admin/Suppliers';
import AdminAddTeamMember from '../pages/admin/AddTeamMember';
import AdminEditTeamMember from '../pages/admin/EditTeamMember';
import AdminTeamMemberProfile from '../pages/admin/TeamMemberProfile';
import AdminAboutUsSettings from '../pages/admin/AboutUsSettings';
import AdminDiscounts from '../pages/admin/Discounts';
import AdminElectronicCashier from '../pages/admin/ElectronicCashier';
import AdminOrderDetail from '../pages/admin/OrderDetail';
import AdminTelegramManager from '../pages/admin/TelegramManager';
import AdminHeeizIntegration from '../pages/admin/HeeizIntegration';
import FacebookAdsManager from '../pages/admin/FacebookAdsManager';
import FacebookAdDetails from '../pages/admin/FacebookAdDetails';
import LandingPage from '../pages/store/LandingPage';
import AIAssistant from './components/AIAssistant';
import { Image as ImageIcon, Truck, MessageSquare, PlayCircle, BarChart3, BookOpen, Tag, Megaphone, Facebook, Send } from 'lucide-react';

const OFFICIAL_LOGO = "https://image2url.com/r2/default/images/1771543308854-f7cc02e6-6d52-4704-b910-befd769b6131.png";

// State Management (Simple Implementation)
export const CartContext = React.createContext<{
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  user: User | null;
} | null>(null);

const PixelTracker: React.FC = () => {
  const location = useLocation();
  const { store, isPlatform } = useStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (isPlatform) return;
    if (store?.settings) {
      initPixels(store.settings);
      setInitialized(true);
    }
  }, [store, isPlatform]);

  useEffect(() => {
    if (initialized) {
      trackPageView();
    }
  }, [location, initialized]);

  return null;
};

import SuperAdminDashboard from './pages/SuperAdminDashboard';

const PlatformLanding: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary selection:text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <ShoppingBag className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tighter italic uppercase">دكان</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-white/60">
            <a href="#features" className="hover:text-white transition-colors">المميزات</a>
            <a href="#pricing" className="hover:text-white transition-colors">الأسعار</a>
            <a href="#contact" className="hover:text-white transition-colors">اتصل بنا</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin/login" className="text-sm font-bold text-white/60 hover:text-white transition-colors">تسجيل الدخول</Link>
            <Link to="/admin/signup" className="px-6 py-3 bg-white text-black text-sm font-black rounded-xl hover:bg-primary hover:text-white transition-all">ابدأ الآن مجاناً</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[600px] bg-primary/20 blur-[120px] rounded-full -z-10 opacity-30" />
        <div className="max-w-5xl mx-auto text-center space-y-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-primary"
          >
            <Zap className="w-3 h-3" /> منصة التجارة الإلكترونية الأسرع في العراق
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] italic uppercase"
          >
            أنشئ متجرك <br /> <span className="text-primary">في دقائق</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-white/40 max-w-2xl mx-auto font-bold leading-relaxed"
          >
            دكان هي المنصة المتكاملة التي تمنحك كل ما تحتاجه لبيع منتجاتك عبر الإنترنت، من إدارة المخزون إلى الدفع الإلكتروني والشحن.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6"
          >
            <Link 
              to="/admin/signup"
              className="w-full sm:w-auto px-12 py-6 bg-primary text-white font-black text-xl rounded-2xl hover:bg-primary-dark transition-all shadow-2xl shadow-primary/40 flex items-center justify-center gap-3"
            >
              ابدأ متجرك الآن <ArrowUpRight className="w-6 h-6" />
            </Link>
            <button className="w-full sm:w-auto px-12 py-6 bg-white/5 border border-white/10 text-white font-black text-xl rounded-2xl hover:bg-white/10 transition-all">
              شاهد الديمو
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-40 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { title: 'نطاق خاص', desc: 'احصل على نطاق فرعي مجاني أو اربط نطاقك الخاص بمتجرك بسهولة.', icon: Globe },
          { title: 'إدارة ذكية', desc: 'لوحة تحكم احترافية لإدارة المنتجات، الطلبات، والعملاء في مكان واحد.', icon: BarChart3 },
          { title: 'دعم الذكاء الاصطناعي', desc: 'استخدم Gemini لتوليد أوصاف المنتجات وتحسين محركات البحث تلقائياً.', icon: Sparkles }
        ].map((f, i) => (
          <div key={i} className="p-10 bg-white/5 border border-white/10 rounded-[3rem] space-y-6 group hover:border-primary/30 transition-all">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <f.icon className="text-primary w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black italic uppercase tracking-tight">{f.title}</h3>
            <p className="text-white/40 font-bold leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
};

const App: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          let userData: User;
          if (userDoc.exists()) {
            userData = { uid: u.uid, ...userDoc.data() } as User;
          } else {
            userData = { uid: u.uid, email: u.email, role: 'customer' } as User;
          }
          setUser(userData);
          
          // Log login activity for admin/team members
          if (userData.role !== 'customer') {
            logActivity({
              userId: userData.uid,
              userName: userData.name || userData.email || 'Unknown',
              type: ActivityType.LOGIN,
              details: 'تم تسجيل الدخول للنظام'
            });
          }
        } catch (err: any) {
          // Silently fallback to basic user info on permission errors
          // This prevents the "Missing or insufficient permissions" error from appearing in the console
          // while the user document is being created or if rules are still propagating.
          setUser({ uid: u.uid, email: u.email, role: 'customer' } as User);
          
          if (err.code !== 'permission-denied') {
            console.error("Profile fetch error:", err);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === item.productId);
      if (existing) {
        return prev.map(i => i.productId === item.productId ? { ...i, qty: i.qty + item.qty } : i);
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.productId !== id));
  };

  const updateQty = (id: string, qty: number) => {
    setCart(prev => prev.map(i => i.productId === id ? { ...i, qty: Math.max(1, qty) } : i));
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  return (
    <StoreProvider>
      <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, total, user }}>
        <Router>
          <PixelTracker />
          <AppRoutes user={user} loading={loading} />
        </Router>
      </CartContext.Provider>
    </StoreProvider>
  );
};

const AppRoutes: React.FC<{ user: User | null, loading: boolean }> = ({ user: propUser, loading: authLoading }) => {
  const { store, db: storeDb, isPlatform, isSuperAdmin, loading: storeLoading, error: storeError } = useStore();
  const [user, setUser] = useState<User | null>(propUser);
  const [loading, setLoading] = useState(authLoading);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!auth.currentUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Use storeDb if in a store, otherwise use platformDb (which is the default storeDb when isPlatform is true)
        const userDoc = await getDoc(doc(storeDb, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUser({ uid: auth.currentUser.uid, ...userDoc.data() } as User);
        } else {
          setUser({ uid: auth.currentUser.uid, email: auth.currentUser.email, role: 'customer' } as User);
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setUser({ uid: auth.currentUser.uid, email: auth.currentUser.email, role: 'customer' } as User);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchUserProfile();
    }
  }, [authLoading, storeDb]);

  if (storeLoading || loading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (storeError) {
    return (
      <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-black mb-4">عذراً، المتجر غير موجود</h1>
        <p className="opacity-60 mb-8">يرجى التأكد من الرابط الصحيح.</p>
        <a href="https://dukan.com" className="px-8 py-3 bg-primary text-white font-bold rounded-xl">العودة للمنصة الرئيسية</a>
      </div>
    );
  }

  if (isPlatform) {
    return (
      <Routes>
        <Route path="/" element={<PlatformLanding />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/signup" element={<AdminSignup />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  if (isSuperAdmin) {
    return (
      <Routes>
        <Route path="/" element={<SuperAdminDashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Storefront Routes */}
      <Route path="/" element={<StoreLayout><StoreHome /></StoreLayout>} />
      <Route path="/login" element={<StoreLayout><StoreLogin /></StoreLayout>} />
      <Route path="/signup" element={<StoreLayout><StoreSignup /></StoreLayout>} />
      <Route path="/products" element={<StoreLayout><StoreProducts /></StoreLayout>} />
      <Route path="/brands" element={<StoreLayout><StoreBrands /></StoreLayout>} />
      <Route path="/products/:id" element={<StoreLayout><StoreProductDetail /></StoreLayout>} />
      <Route path="/cart" element={<StoreLayout><StoreCart /></StoreLayout>} />
      <Route path="/checkout" element={<StoreLayout><StoreCheckout /></StoreLayout>} />
      <Route path="/order-success" element={<StoreLayout><StoreSuccess /></StoreLayout>} />
      <Route path="/profile" element={<StoreLayout><StoreProfile /></StoreLayout>} />
      <Route path="/profile/orders/:id" element={<StoreLayout><StoreOrderDetail /></StoreLayout>} />
      <Route path="/contact" element={<StoreLayout><StoreContact /></StoreLayout>} />
      <Route path="/about" element={<StoreLayout><StoreAboutUs /></StoreLayout>} />
      <Route path="/lp/:id" element={<LandingPage />} />

      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/signup" element={<AdminSignup />} />
      <Route path="/admin" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
      <Route path="/admin/products" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminProducts /></AdminLayout></AdminRoute>} />
      <Route path="/admin/digital-products" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminDigitalProducts /></AdminLayout></AdminRoute>} />
      <Route path="/admin/installments" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminInstallments /></AdminLayout></AdminRoute>} />
      <Route path="/admin/brands" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminBrands /></AdminLayout></AdminRoute>} />
      <Route path="/admin/categories" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminCategories /></AdminLayout></AdminRoute>} />
      <Route path="/admin/orders" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminOrders /></AdminLayout></AdminRoute>} />
      <Route path="/admin/orders/:id" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminOrderDetail /></AdminLayout></AdminRoute>} />
      <Route path="/admin/customers" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminCustomers /></AdminLayout></AdminRoute>} />
      <Route path="/admin/hero" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminHero /></AdminLayout></AdminRoute>} />
      <Route path="/admin/hero/add" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminAddHero /></AdminLayout></AdminRoute>} />
      <Route path="/admin/hero/edit/:id" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminEditHero /></AdminLayout></AdminRoute>} />
      <Route path="/admin/products/add" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminAddProduct /></AdminLayout></AdminRoute>} />
      <Route path="/admin/digital-products/add" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminAddDigitalProduct /></AdminLayout></AdminRoute>} />
      <Route path="/admin/products/edit/:id" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminEditProduct /></AdminLayout></AdminRoute>} />
      <Route path="/admin/reviews" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminReviews /></AdminLayout></AdminRoute>} />
      <Route path="/admin/themes" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminThemes /></AdminLayout></AdminRoute>} />
      <Route path="/admin/team" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminTeam /></AdminLayout></AdminRoute>} />
      <Route path="/admin/team/add" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminAddTeamMember /></AdminLayout></AdminRoute>} />
      <Route path="/admin/team/edit/:id" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminEditTeamMember /></AdminLayout></AdminRoute>} />
      <Route path="/admin/team/:id" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminTeamMemberProfile /></AdminLayout></AdminRoute>} />
      <Route path="/admin/tickets" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminTickets /></AdminLayout></AdminRoute>} />
      <Route path="/admin/stories" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminStories /></AdminLayout></AdminRoute>} />
      <Route path="/admin/stories/add" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminAddStory /></AdminLayout></AdminRoute>} />
      <Route path="/admin/analytics" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminAnalytics /></AdminLayout></AdminRoute>} />
      <Route path="/admin/discounts" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminDiscounts /></AdminLayout></AdminRoute>} />
      <Route path="/admin/cashier" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminElectronicCashier /></AdminLayout></AdminRoute>} />
      <Route path="/admin/suppliers" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminSuppliers /></AdminLayout></AdminRoute>} />
      <Route path="/admin/shipping" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminShippingCompanies /></AdminLayout></AdminRoute>} />
      <Route path="/admin/shipping/:id" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminShippingCompanyDetails /></AdminLayout></AdminRoute>} />
      <Route path="/admin/campaigns" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminCampaigns /></AdminLayout></AdminRoute>} />
      <Route path="/admin/fb-ads" element={<AdminRoute user={user} loading={loading}><AdminLayout><FacebookAdsManager /></AdminLayout></AdminRoute>} />
      <Route path="/admin/fb-ads/:id" element={<AdminRoute user={user} loading={loading}><AdminLayout><FacebookAdDetails /></AdminLayout></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminSettings /></AdminLayout></AdminRoute>} />
      <Route path="/admin/heeiz" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminHeeizIntegration /></AdminLayout></AdminRoute>} />
      <Route path="/admin/telegram" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminTelegramManager /></AdminLayout></AdminRoute>} />
      <Route path="/admin/settings/about" element={<AdminRoute user={user} loading={loading}><AdminLayout><AdminAboutUsSettings /></AdminLayout></AdminRoute>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

// Layout Components
const StoreLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const context = React.useContext(CartContext);
  const { store } = useStore();
  const cart = context?.cart || [];
  const user = context?.user;
  const [mobileMenu, setMobileMenu] = useState(false);
  const settings = store?.settings;

  const themeClass = settings?.theme === 'ramadan' ? 'theme-ramadan' : settings?.theme === 'winter' ? 'theme-winter' : '';
  const storeStatus = settings?.storeStatus || 'open';

  const hasPermission = (permission: string) => {
    if (user?.role === 'super_admin' || user?.role === 'admin') return true;
    return user?.permissions?.includes(permission);
  };

  if (storeStatus !== 'open') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center bg-bg-main text-white p-6 text-center ${themeClass}`}>
        <div className="max-w-md space-y-8">
          <div className="w-32 h-32 mx-auto flex items-center justify-center">
            <img src={settings?.logoUrl || OFFICIAL_LOGO} alt="dukan logo" className="w-24 h-24 object-contain" />
          </div>
          
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary mb-4">
              {storeStatus === 'maintenance' ? <Settings className="w-10 h-10 animate-spin" /> : <AlertTriangle className="w-10 h-10" />}
            </div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">
              {storeStatus === 'maintenance' ? 'المتجر في صيانة' : 'المتجر مغلق حالياً'}
            </h1>
            <p className="text-lg opacity-60 leading-relaxed">
              {storeStatus === 'maintenance' 
                ? 'نحن نقوم ببعض التحديثات لتحسين تجربتكم. سنعود إليكم قريباً جداً.' 
                : 'المتجر مغلق حالياً لاستقبال الطلبات الجديدة. يرجى العودة في وقت لاحق.'}
            </p>
          </div>

          {storeStatus === 'maintenance' && settings?.openingDate && (
            <div className="bg-bg-card border border-primary/30 p-6 rounded-3xl flex items-center gap-4 text-right">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs opacity-40 font-bold uppercase tracking-widest">موعد الافتتاح المتوقع</div>
                <div className="text-lg font-black text-white">{settings.openingDate}</div>
              </div>
            </div>
          )}

          <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-4">
            <p className="text-sm opacity-40">تابعونا على مواقع التواصل لمعرفة آخر الأخبار</p>
            <div className="flex gap-4">
              {settings?.facebook && <a href={settings.facebook} className="p-3 bg-white/5 rounded-xl hover:bg-primary transition-all"><Settings className="w-5 h-5" /></a>}
              {settings?.instagram && <a href={settings.instagram} className="p-3 bg-white/5 rounded-xl hover:bg-primary transition-all"><Settings className="w-5 h-5" /></a>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col bg-bg-card text-text-main ${themeClass}`}>
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-bg-card/80 backdrop-blur-md border-b border-primary/20">
        <div className="max-w-7xl mx-auto px-4 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-4 group">
              <div className="w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform">
                <img src={settings?.logoUrl || OFFICIAL_LOGO} alt="dukan logo" className="w-14 h-14 object-contain" />
              </div>
              <span className="text-3xl font-black tracking-tighter text-white uppercase italic">دكان</span>
            </Link>
            
            {/* Theme Decorations */}
            {settings?.theme === 'ramadan' && (
              <div className="hidden lg:flex items-center gap-2 text-amber-500 animate-pulse">
                <Moon className="w-5 h-5 fill-current" />
                <span className="text-[10px] font-black uppercase tracking-widest">رمضان كريم</span>
              </div>
            )}
            {settings?.theme === 'winter' && (
              <div className="hidden lg:flex items-center gap-2 text-blue-400 animate-pulse">
                <Snowflake className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">شتاء سعيد</span>
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-8 font-bold text-sm">
            <Link to="/" className="hover:text-primary transition-colors">الرئيسية</Link>
            <Link to="/products" className="hover:text-primary transition-colors">المنتجات</Link>
            <Link to="/brands" className="hover:text-primary transition-colors">العلامات التجارية</Link>
            <Link to="/about" className="hover:text-primary transition-colors">من نحن</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">اتصل بنا</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/cart" className="relative p-3 hover:bg-primary/10 rounded-full transition-colors">
              <ShoppingCart className="w-7 h-7" />
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 bg-primary text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full font-bold ring-2 ring-bg-card">
                  {cart.reduce((a, b) => a + b.qty, 0)}
                </span>
              )}
            </Link>
            <Link to="/profile" className="hidden md:block p-3 hover:bg-primary/10 rounded-full transition-colors">
              <UserIcon className="w-7 h-7" />
            </Link>
            <button className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenu && (
          <div className="md:hidden bg-bg-card border-b border-primary/20 p-4 space-y-4">
            <Link to="/" className="block py-2 font-bold" onClick={() => setMobileMenu(false)}>الرئيسية</Link>
            <Link to="/products" className="block py-2 font-bold" onClick={() => setMobileMenu(false)}>المنتجات</Link>
            <Link to="/brands" className="block py-2 font-bold" onClick={() => setMobileMenu(false)}>العلامات التجارية</Link>
            <Link to="/about" className="block py-2 font-bold" onClick={() => setMobileMenu(false)}>من نحن</Link>
            <Link to="/contact" className="block py-2 font-bold" onClick={() => setMobileMenu(false)}>اتصل بنا</Link>
            <Link to="/profile" className="block py-2 font-bold" onClick={() => setMobileMenu(false)}>حسابي</Link>
          </div>
        )}
      </nav>

      <main className="flex-grow">
        {children}
      </main>

      <AIAssistant />

      {/* Footer */}
      <footer className="bg-bg-main border-t border-primary/10 py-16">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-right">
          <div>
            <Link to="/" className="flex items-center gap-4 justify-center md:justify-start mb-6">
              <div className="w-14 h-14 flex items-center justify-center">
                <img src={settings?.logoUrl || OFFICIAL_LOGO} alt="dukan logo" className="w-12 h-12 object-contain" />
              </div>
              <span className="text-2xl font-black text-white italic uppercase">دكان</span>
            </Link>
            <p className="text-sm opacity-60 leading-relaxed">متجرك المفضل لأجهزة البي سي والقطع الاحترافية في العراق. الجودة هي عنواننا.</p>
            
            {/* Social Links */}
            <div className="flex items-center gap-4 mt-6 justify-center md:justify-start">
              {settings?.facebook && (
                <a href={settings.facebook} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-primary transition-all">
                  <span className="sr-only">Facebook</span>
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              )}
              {settings?.instagram && (
                <a href={settings.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-primary transition-all">
                  <span className="sr-only">Instagram</span>
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              )}
              {settings?.tiktok && (
                <a href={settings.tiktok} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-primary transition-all">
                  <span className="sr-only">TikTok</span>
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.31-.75.42-1.24 1.21-1.35 2.06-.11.97.31 1.99 1.05 2.61.76.64 1.73.87 2.68.81 1.12-.07 2.15-.83 2.57-1.86.17-.41.25-.85.25-1.3.02-3.78-.02-7.56.02-11.34z"/></svg>
                </a>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">روابط سريعة</h4>
            <ul className="space-y-3 text-sm opacity-80">
              <li><Link to="/products" className="hover:text-primary transition-colors">جميع المنتجات</Link></li>
              <li><Link to="/brands" className="hover:text-primary transition-colors">العلامات التجارية</Link></li>
              <li><Link to="/profile" className="hover:text-primary transition-colors">تتبع طلبك</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">سياسة الاسترجاع</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">الدعم</h4>
            <ul className="space-y-3 text-sm opacity-80">
              <li>واتساب: {settings?.whatsapp || '07700000000'}</li>
              <li>الموقع: {settings?.address || 'بغداد - شارع الصناعة'}</li>
              <li>البريد: {settings?.email || 'support@dukan.com'}</li>
            </ul>
          </div>
          <div className="flex flex-col items-center md:items-end">
             {/* Newsletter removed as requested */}
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-16 pt-8 border-t border-primary/10 text-center text-xs opacity-50">
          جميع الحقوق محفوظة &copy; {new Date().getFullYear()} دكان - متجرك المتكامل
        </div>
      </footer>
    </div>
  );
};

const AdminLayout: React.FC<{ children: React.ReactNode, user?: User }> = ({ children, user: propUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { store } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const context = React.useContext(CartContext);
  const user = propUser || context?.user;
  const settings = store?.settings;

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setCollapsedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const hasPermission = (permission: string) => {
    if (user?.role === 'super_admin' || user?.role === 'admin') return true;
    return user?.permissions?.includes(permission);
  };

  const navGroups = [
    {
      title: 'الرئيسية',
      items: [
        { path: '/admin', icon: HomeIcon, label: 'لوحة المعلومات', permission: 'dashboard' },
        { path: '/admin/analytics', icon: BarChart3, label: 'التحليلات', permission: 'analytics' },
      ]
    },
    {
      title: 'المتجر',
      items: [
        { path: '/admin/products', icon: Package, label: 'المنتجات', permission: 'products' },
        { path: '/admin/digital-products', icon: Zap, label: 'الرقمية', permission: 'products' },
        { path: '/admin/orders', icon: ShoppingCart, label: 'الطلبات', permission: 'orders' },
        { path: '/admin/categories', icon: List, label: 'الأقسام', permission: 'categories' },
        { path: '/admin/brands', icon: Sparkles, label: 'الماركات', permission: 'brands' },
        { path: '/admin/installments', icon: CreditCard, label: 'الأقساط', permission: 'orders' },
        { path: '/admin/reviews', icon: Star, label: 'الملاحظات', permission: 'reviews' },
      ]
    },
    {
      title: 'التسويق',
      items: [
        { path: '/admin/fb-ads', icon: Facebook, label: 'ميتا', permission: 'analytics' },
        { path: '/admin/campaigns', icon: Megaphone, label: 'الحملات', permission: 'analytics' },
        { path: '/admin/discounts', icon: Tag, label: 'الخصومات', permission: 'discounts' },
        { path: '/admin/stories', icon: PlayCircle, label: 'الستوريات', permission: 'stories' },
        { path: '/admin/hero', icon: ImageIcon, label: 'الهيرو', permission: 'hero' },
      ]
    },
    {
      title: 'الإدارة',
      items: [
        { path: '/admin/customers', icon: Users, label: 'العملاء', permission: 'customers' },
        { path: '/admin/team', icon: Users, label: 'الفريق', permission: 'team' },
        { path: '/admin/tickets', icon: MessageSquare, label: 'الدعم', permission: 'tickets' },
        { path: '/admin/suppliers', icon: Users, label: 'الموردين', permission: 'suppliers' },
        { path: '/admin/shipping', icon: Truck, label: 'التوصيل', permission: 'orders' },
        { path: '/admin/cashier', icon: Wallet, label: 'القاصة', permission: 'analytics' },
      ]
    },
    {
      title: 'الإعدادات',
      items: [
        { path: '/admin/settings', icon: Settings, label: 'الإعدادات', permission: 'settings' },
        { path: '/admin/themes', icon: Palette, label: 'الثيمات', permission: 'settings' },
        { path: '/admin/telegram', icon: Send, label: 'تليكرام', permission: 'settings' },
      ]
    }
  ];

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-bg-main text-text-main dir-rtl font-sans overflow-x-hidden">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 bg-bg-card border-l border-white/5 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64 w-72'}
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        shadow-[0_0_50px_rgba(0,0,0,0.5)]
      `}>
        {/* Sidebar Header */}
        <div className={`p-6 flex items-center justify-between relative overflow-hidden group ${isCollapsed ? 'flex-col gap-4' : ''}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className={`flex items-center gap-4 relative z-10 ${isCollapsed ? 'flex-col' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-2xl shadow-primary/20 border border-white/10 group-hover:scale-110 transition-transform duration-500 shrink-0">
              <img src={settings?.logoUrl || OFFICIAL_LOGO} alt="Logo" className="w-6 h-6 object-contain brightness-0 invert" />
            </div>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <h2 className="text-base font-black text-white italic tracking-tighter leading-none mb-1 uppercase">دكان</h2>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[7px] text-white/30 font-black uppercase tracking-[0.2em]">Admin Panel</p>
                </div>
              </motion.div>
            )}
          </div>
          
          <div className="flex items-center gap-2 relative z-10">
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-white/40 hover:text-white"
            >
              <Menu className={`w-4 h-4 transition-transform duration-500 ${isCollapsed ? 'rotate-180' : ''}`} />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="lg:hidden p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-white/40 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className={`flex-grow p-4 space-y-6 overflow-y-auto custom-scrollbar ${isCollapsed ? 'px-2' : ''}`}>
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(item => item.permission === 'dashboard' || hasPermission(item.permission));
            if (visibleItems.length === 0) return null;
            const isCollapsedGroup = collapsedGroups[group.title];

            return (
              <div key={group.title} className="space-y-2">
                {!isCollapsed && (
                  <button 
                    onClick={() => toggleGroup(group.title)}
                    className="w-full flex items-center justify-between px-4 group/header"
                  >
                    <h3 className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] group-hover/header:text-primary transition-colors">
                      {group.title}
                    </h3>
                    <div className={`w-1 h-1 rounded-full bg-white/10 transition-all duration-300 ${isCollapsedGroup ? 'scale-x-[4] bg-primary' : ''}`} />
                  </button>
                )}
                
                <AnimatePresence initial={false}>
                  {(!isCollapsedGroup || isCollapsed) && (
                    <motion.div 
                      initial={isCollapsed ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="space-y-1 overflow-hidden"
                    >
                      {visibleItems.map((item) => (
                        <Link 
                          key={item.path}
                          to={item.path} 
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group relative ${
                            isActive(item.path) 
                              ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20' 
                              : 'hover:bg-white/[0.03] text-white/40 hover:text-white'
                          } ${isCollapsed ? 'justify-center px-0' : ''}`}
                          title={isCollapsed ? item.label : ''}
                        >
                          {isActive(item.path) && (
                            <motion.div 
                              layoutId="active-nav-indicator"
                              className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-l-full"
                            />
                          )}
                          <item.icon className={`w-4 h-4 transition-all duration-500 shrink-0 ${
                            isActive(item.path) ? 'scale-110' : 'group-hover:scale-110 group-hover:text-primary'
                          }`} />
                          {!isCollapsed && (
                            <>
                              <span className="font-bold text-[12px] tracking-tight whitespace-nowrap">{item.label}</span>
                              {!isActive(item.path) && (
                                <ChevronRight className="w-3 h-3 mr-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                              )}
                            </>
                          )}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className={`p-4 border-t border-white/5 bg-black/20 backdrop-blur-xl ${isCollapsed ? 'px-2' : ''}`}>
          <button 
            onClick={async () => {
              if (user) {
                await logActivity({
                  userId: user.uid,
                  userName: user.name || user.email || 'Unknown',
                  type: ActivityType.LOGOUT,
                  details: 'تم تسجيل الخروج من النظام'
                });
              }
              await auth.signOut();
              navigate('/admin/login');
            }}
            className={`w-full flex items-center gap-4 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 font-black group border border-transparent hover:border-red-500/20 ${isCollapsed ? 'justify-center px-0' : ''}`}
            title={isCollapsed ? 'تسجيل الخروج' : ''}
          >
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all duration-500 shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            {!isCollapsed && <span className="text-[10px] uppercase tracking-widest whitespace-nowrap">تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-grow flex flex-col min-h-screen w-full transition-all duration-500 ${isCollapsed ? 'lg:mr-20' : 'lg:mr-64'}`}>
        <header className="h-16 bg-bg-card/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 lg:px-10 sticky top-0 z-40">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 bg-white/5 rounded-xl text-white hover:bg-white/10 transition-all"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden sm:flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="text-[10px] font-black text-white uppercase tracking-widest opacity-60">النظام يعمل بشكل طبيعي</h1>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
             {user && (
               <Link to={`/admin/team/${user.uid}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                 <div className="hidden sm:block text-right">
                   <div className="text-xs font-bold text-white">{user.name || 'مستخدم'}</div>
                   <div className="text-[8px] text-primary font-black uppercase tracking-widest">
                     {user.role === 'super_admin' ? 'وصول كامل' : user.role === 'admin' ? 'مدير' : 'عضو'}
                   </div>
                 </div>
                 <div className="w-10 h-10 rounded-xl bg-bg-light border border-white/5 flex items-center justify-center font-black text-white shadow-xl group cursor-pointer hover:border-primary/50 transition-all">
                   <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-xs">
                     {user.name?.charAt(0) || 'U'}
                   </div>
                 </div>
               </Link>
             )}
           </div>
        </header>

        <main className="p-4 lg:p-8 flex-grow w-full max-w-[100vw] overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

const AdminRoute: React.FC<{ children: React.ReactNode, user: any, loading: boolean }> = ({ children, user, loading }) => {
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/admin/login" />;
  
  if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'team_member') {
    return (
      <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center p-4 text-center space-y-6">
        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
          <X className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">وصول مرفوض</h2>
          <p className="text-sm opacity-50 max-w-md">عذراً، ليس لديك صلاحيات كافية للوصول إلى لوحة التحكم. يرجى تسجيل الدخول بحساب مدير.</p>
        </div>
        <Link to="/admin/login" className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all">
          تسجيل الدخول كمدير
        </Link>
        <Link to="/" className="text-sm opacity-40 hover:opacity-100 transition-opacity">العودة للمتجر</Link>
      </div>
    );
  }

  // Permission check for team members
  const path = window.location.hash.replace('#', '');
  const permissionMap: Record<string, string> = {
    '/admin/products': 'products',
    '/admin/digital-products': 'products',
    '/admin/categories': 'categories',
    '/admin/brands': 'brands',
    '/admin/orders': 'orders',
    '/admin/shipping': 'orders',
    '/admin/analytics': 'analytics',
    '/admin/fb-ads': 'analytics',
    '/admin/cashier': 'analytics',
    '/admin/suppliers': 'suppliers',
    '/admin/customers': 'customers',
    '/admin/reviews': 'reviews',
    '/admin/hero': 'hero',
    '/admin/stories': 'stories',
    '/admin/team': 'team',
    '/admin/tickets': 'tickets',
    '/admin/themes': 'settings',
    '/admin/settings': 'settings',
  };

  if (user.role === 'team_member') {
    const requiredPermission = Object.keys(permissionMap).find(p => path.startsWith(p));
    if (requiredPermission && !user.permissions?.includes(permissionMap[requiredPermission])) {
       return (
        <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center p-4 text-center space-y-6">
          <div className="w-20 h-20 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">صلاحيات محدودة</h2>
            <p className="text-sm opacity-50 max-w-md">ليس لديك صلاحية للوصول إلى هذا القسم ({permissionMap[requiredPermission]}). يرجى التواصل مع المدير.</p>
          </div>
          <Link to="/admin" className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all">
            العودة للرئيسية
          </Link>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default App;
