
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../../src/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, getDocs, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { Product, StoreSettings, LandingPageSession, OrderStatus } from '../../src/types';
import { Loader2, CheckCircle, Phone, MapPin, Truck, ShieldCheck, Zap, ChevronRight, Star, ChevronDown, ShoppingBag, ArrowLeft, Clock, Users, Flame, Award, Heart, Target } from 'lucide-react';
import { CITIES } from '../../src/constants';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { initPixels, trackAddToCart, trackPurchase } from '../../src/lib/pixels';

const LandingPage: React.FC = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>({
    id: '',
    name_ar: 'جاري التحميل...',
    name_en: '',
    description_ar: 'يرجى الانتظار...',
    description_en: '',
    price: 0,
    salePrice: 0,
    costPrice: 0,
    stockQuantity: 0,
    isActive: true,
    categoryId: '',
    brandId: '',
    images: ['https://placehold.co/600x600/151B2B/FFFFFF?text=Loading'],
    specs: [],
    createdAt: null as any,
    updatedAt: null as any
  });
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mainImage, setMainImage] = useState(0);
  const [shippingCompanies, setShippingCompanies] = useState<any[]>([]);
  const [shippingCost, setShippingCost] = useState(0);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 45, seconds: 0 });
  const [recentPurchase, setRecentPurchase] = useState<{ name: string, city: string, time: string } | null>(null);
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showWhatsAppTooltip, setShowWhatsAppTooltip] = useState(true);

  // WhatsApp tooltip animation
  useEffect(() => {
    const interval = setInterval(() => {
      setShowWhatsAppTooltip(false);
      setTimeout(() => {
        setShowWhatsAppTooltip(true);
      }, 1000); // Hidden for 1 second
    }, 5000); // Visible for 4 seconds (5000 - 1000)
    return () => clearInterval(interval);
  }, []);

  // Session tracking
  useEffect(() => {
    if (!product) return;
    
    const createSession = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const utmSource = urlParams.get('utm_source') || 'Direct';
        const utmMedium = urlParams.get('utm_medium') || '';
        const utmCampaign = urlParams.get('utm_campaign') || '';

        const sessionData = {
          productId: product.id,
          productName: product.name_ar,
          entryTime: serverTimestamp(),
          isConverted: false,
          scrollDepth: 0,
          interactions: [],
          utmSource,
          utmMedium,
          utmCampaign,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screenSize: `${window.innerWidth}x${window.innerHeight}`
          }
        };
        const docRef = await addDoc(collection(db, 'landing_page_sessions'), sessionData);
        setSessionId(docRef.id);
      } catch (err) {
        console.error("Error creating session:", err);
      }
    };

    createSession();
  }, [product]);

  const trackInteraction = async (type: string, element: string) => {
    if (!sessionId) return;
    try {
      await updateDoc(doc(db, 'landing_page_sessions', sessionId), {
        interactions: arrayUnion({
          type,
          element,
          timestamp: new Date().toISOString()
        })
      });
    } catch (err) {
      console.error("Error tracking interaction:", err);
    }
  };

  // Scroll tracking
  useEffect(() => {
    if (!sessionId) return;
    let maxScroll = 0;
    const handleScroll = () => {
      const winHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollPercent = Math.round((scrollTop / (docHeight - winHeight)) * 100);
      
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        updateDoc(doc(db, 'landing_page_sessions', sessionId), {
          scrollDepth: maxScroll
        });
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sessionId]);

  // Countdown logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Recent purchase notification logic
  useEffect(() => {
    const names = ['أحمد', 'سارة', 'محمد', 'نور', 'علي', 'زينب', 'عمر', 'مريم'];
    const cities = CITIES;
    
    const showNotification = () => {
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomCity = cities[Math.floor(Math.random() * cities.length)];
      setRecentPurchase({ name: randomName, city: randomCity, time: 'منذ دقيقتين' });
      
      setTimeout(() => setRecentPurchase(null), 5000);
    };

    const interval = setInterval(showNotification, 15000);
    return () => clearInterval(interval);
  }, []);

  // Sticky CTA visibility logic
  useEffect(() => {
    const handleScroll = () => {
      const orderForm = document.getElementById('order-form');
      if (orderForm) {
        const rect = orderForm.getBoundingClientRect();
        setShowStickyCTA(rect.top > window.innerHeight);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Form state
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    city: 'بغداد',
    address: '',
    notes: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [pSnap, sSnap, shipSnap] = await Promise.all([
          getDoc(doc(db, 'products', id)),
          getDoc(doc(db, 'settings', 'store')),
          getDocs(collection(db, 'shipping_companies'))
        ]);

        if (pSnap.exists()) {
          setProduct({ id: pSnap.id, ...pSnap.data() } as Product);
        } else {
          setError('المنتج غير موجود');
        }

        if (sSnap.exists()) {
          setSettings(sSnap.data() as StoreSettings);
        }

        const ships = shipSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((s: any) => s.isActive);
        setShippingCompanies(ships);
      } catch (err) {
        console.error(err);
        setError('حدث خطأ أثناء تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Update shipping cost when city changes
  useEffect(() => {
    if (!form.city || shippingCompanies.length === 0) {
      setShippingCost(0);
      return;
    }

    // Find the first active company that has a price for this city
    let cost = 0;
    if (product?.isDigital) {
      setShippingCost(0);
      return;
    }
    // Use the first active company as the default for Landing Page
    const defaultCompany = shippingCompanies[0];
    if (defaultCompany) {
      const provincePrice = defaultCompany.prices?.find((p: any) => p.city === form.city);
      if (provincePrice) {
        cost = provincePrice.price;
      }
    }
    setShippingCost(cost);
  }, [form.city, shippingCompanies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSubmitting(true);

    const basePrice = product.salePrice || product.price;
    const finalTotal = basePrice + shippingCost;
    const defaultCompany = shippingCompanies[0];
    const paymentMethod = product.isDigital ? 'WAYL' : 'COD';
    const orderNumber = `PCT-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      const orderData = {
        orderNumber,
        items: [{
          productId: product.id,
          name: product.name_ar,
          price: basePrice, // Store original product price
          qty: 1,
          image: product.images?.[0] || '',
          isDigital: product.isDigital || false,
          assignedKeys: []
        }],
        customer: {
          name: form.customerName || '',
          phone: form.phone || '',
          city: form.city || 'بغداد',
          address: form.address || '',
          notes: form.notes || ''
        },
        shippingCost: shippingCost,
        totalAmount: finalTotal,
        shippingCompany: defaultCompany?.name || 'Default',
        status: OrderStatus.PENDING,
        statusHistory: [{
          status: OrderStatus.PENDING,
          timestamp: Timestamp.now(),
          notes: 'تم إنشاء الطلب من صفحة الهبوط'
        }],
        paymentStatus: paymentMethod === 'WAYL' ? 'pending' : 'unpaid',
        paymentMethod: paymentMethod,
        inventoryUpdated: false, // Physical products from landing page are updated on shipping API response
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        source: 'landing_page',
        sessionId: sessionId
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Track Purchase in Pixels
      trackPurchase({ id: docRef.id, ...orderData });

      // Mark session as converted
      if (sessionId) {
        const entryTime = (await getDoc(doc(db, 'landing_page_sessions', sessionId))).data()?.entryTime?.toDate();
        const now = new Date();
        const duration = entryTime ? Math.floor((now.getTime() - entryTime.getTime()) / 1000) : 0;
        
        await updateDoc(doc(db, 'landing_page_sessions', sessionId), {
          isConverted: true,
          orderTime: serverTimestamp(),
          duration: duration,
          customerInfo: {
            name: form.customerName,
            phone: form.phone,
            city: form.city
          }
        });
      }

      if (paymentMethod === 'WAYL') {
        // Wayl Payment Logic
        let apiKey = "UuMzpuP9mv71qHi3x5hxEQ==:AyMq3tNGWaZ7kjpAOIfi49ch1XcAyTwN8ejD12QkpUt/fV8H/cc8jl45ckA3Ncjk4zYh5jFCq64UOxB/PXB1z53SoI1Ii8M0akEZNKXKYHTcq41J12Plid14xAzwz8zN35CWT4f8sZNNZSDf86K0lBP4VT+WwSHV5eACx5CDmMk=";
        try {
          const configDoc = await getDoc(doc(db, 'settings', 'wayl_config'));
          if (configDoc.exists() && configDoc.data().apiKey) {
            apiKey = configDoc.data().apiKey;
          }
        } catch (e) {
          console.error("Error fetching Wayl API key:", e);
        }

        const appUrl = window.location.origin;
        const lineItems = [
          {
            label: `Order ${product.name_ar}`,
            amount: finalTotal,
            type: "increase",
          }
        ];

        const response = await fetch('/wayl-proxy.php', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-WAYL-AUTHENTICATION': apiKey
          },
          body: JSON.stringify({
            env: "live",
            referenceId: docRef.id,
            total: finalTotal,
            currency: "IQD",
            lineItem: lineItems,
            webhookUrl: `${appUrl}/api/wayl/webhook`,
            webhookSecret: "secure_random_secret_123",
            redirectionUrl: `${appUrl}/order-success`,
          })
        });

        const waylData = await response.json();
        if (waylData.data?.url) {
          window.location.href = waylData.data.url;
          return;
        } else {
          throw new Error(waylData.message || 'فشل إنشاء رابط الدفع');
        }
      }

      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && (error || !product?.id)) return (
    <div className="min-h-screen bg-bg-main text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-md">
        <h2 className="text-2xl font-bold mb-4">{error || 'المنتج غير موجود'}</h2>
        <Link to="/" className="text-primary font-bold hover:underline">العودة للمتجر</Link>
      </div>
    </div>
  );

  const basePrice = product.salePrice || product.price;
  const displayPrice = basePrice + shippingCost;
  
  // Fake discount logic: if no salePrice, assume a 30,000 IQD discount from a fake original price
  const originalPrice = product.salePrice && product.salePrice < product.price 
    ? product.price 
    : (basePrice + 30000);
  const savingsAmount = originalPrice - basePrice;
  const hasDiscount = true; // Always show discount now

  if (success) {
    return (
      <div className="min-h-screen bg-bg-main text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-bg-card border border-primary/30 p-12 rounded-[40px] max-w-xl space-y-8 shadow-2xl shadow-primary/10">
          <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-12 h-12" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter">تم استلام طلبك بنجاح!</h2>
            <p className="text-lg opacity-60">شكراً لثقتك بنا. سيقوم فريقنا بالتواصل معك قريباً لتأكيد الطلب وترتيب التوصيل.</p>
          </div>
          <div className="pt-8 border-t border-white/5">
            <Link to="/" className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-all">
              العودة للمتجر <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main text-text-main dir-rtl font-sans pb-20 overflow-x-hidden">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-dark/10 blur-[120px] rounded-full" />
        
        {/* Floating Particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight,
              opacity: Math.random() * 0.5
            }}
            animate={{ 
              y: [null, Math.random() * -100, Math.random() * 100],
              x: [null, Math.random() * -50, Math.random() * 50],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{ 
              duration: 10 + Math.random() * 20, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute w-1 h-1 bg-white rounded-full"
          />
        ))}
      </div>

      {/* Simple Header */}
      <header className="bg-bg-card/80 backdrop-blur-xl border-b border-white/5 h-20 flex items-center justify-between px-6 sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
            <img src={settings?.logoUrl || "https://image2url.com/r2/default/images/1771543308854-f7cc02e6-6d52-4704-b910-befd769b6131.png"} alt="Logo" className="w-6 h-6 object-contain brightness-0 invert" />
          </div>
          <span className="text-xl font-black text-white italic uppercase tracking-tighter">PCTHRONE</span>
        </Link>
        <Link to="/" className="text-sm font-bold opacity-60 hover:opacity-100 flex items-center gap-2 transition-opacity">
          <ArrowLeft className="w-4 h-4" />
          العودة للمتجر
        </Link>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10 lg:py-20 space-y-24">
        {/* Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Images with 3D Effect */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-6 sticky top-32"
          >
            <div className="relative group perspective-1000">
              <motion.div 
                whileHover={{ rotateY: -5, rotateX: 5, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="aspect-square bg-bg-card rounded-[40px] overflow-hidden border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10"
              >
                <motion.img 
                  key={mainImage}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    y: [0, -10, 0] 
                  }}
                  transition={{ 
                    opacity: { duration: 0.5 },
                    scale: { duration: 0.5 },
                    y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                  }}
                  src={product.images?.[mainImage] || 'https://via.placeholder.com/600'} 
                  alt={product.name_ar} 
                  className="w-full h-full object-cover" 
                />
                
                {/* Floating Badge */}
                <div className="absolute top-6 right-6 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full z-20">
                  <span className="text-xs font-black text-white italic tracking-widest uppercase">Premium Edition</span>
                </div>
              </motion.div>
              
              {/* Background Glow */}
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-transparent blur-3xl rounded-[40px] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {product.images && product.images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-2">
                {product.images.map((img, i) => (
                  <motion.button 
                    key={i} 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMainImage(i)}
                    className={`w-24 h-24 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all ${mainImage === i ? 'border-primary shadow-lg shadow-primary/20' : 'border-transparent opacity-40 hover:opacity-100'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" />
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Info Section */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-10"
          >
            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-black italic uppercase tracking-widest"
                >
                  <Zap className="w-3 h-3 fill-current" />
                  وصل حديثاً
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-xs font-black italic uppercase tracking-widest"
                >
                  <Flame className="w-3 h-3 fill-current" />
                  الأكثر مبيعاً
                </motion.div>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tighter italic uppercase">
                {product.name_ar}
              </h1>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
                <span className="text-sm font-bold opacity-40">5.0 (أكثر من 500 تقييم حقيقي)</span>
              </div>
            </div>

            {/* Price & Scarcity Card */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary-dark rounded-[32px] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative p-8 bg-bg-card border border-white/5 rounded-[32px] space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-4">
                      <span className="text-6xl font-black text-white tracking-tighter italic">
                        {displayPrice.toLocaleString()} 
                        <span className="text-2xl mr-2 not-italic opacity-60">د.ع</span>
                      </span>
                      {hasDiscount && (
                        <span className="text-2xl opacity-30 line-through italic">{(originalPrice + shippingCost).toLocaleString()}</span>
                      )}
                    </div>
                    <p className="text-emerald-400 text-sm font-bold">وفر {savingsAmount.toLocaleString()} د.ع اليوم!</p>
                  </div>

                  {/* Countdown Timer */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 text-center">
                    <div>
                      <div className="text-xl font-black text-white">{timeLeft.hours.toString().padStart(2, '0')}</div>
                      <div className="text-[10px] opacity-40 uppercase">ساعة</div>
                    </div>
                    <div className="text-xl font-black opacity-20">:</div>
                    <div>
                      <div className="text-xl font-black text-white">{timeLeft.minutes.toString().padStart(2, '0')}</div>
                      <div className="text-[10px] opacity-40 uppercase">دقيقة</div>
                    </div>
                    <div className="text-xl font-black opacity-20">:</div>
                    <div>
                      <div className="text-xl font-black text-primary">{timeLeft.seconds.toString().padStart(2, '0')}</div>
                      <div className="text-[10px] opacity-40 uppercase">ثانية</div>
                    </div>
                  </div>
                </div>

                {/* Stock Progress */}
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-amber-500 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      12 شخص يشاهدون هذا المنتج الآن
                    </span>
                    <span className="opacity-40">بقي 7 قطع فقط في المخزن</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: "100%" }}
                      animate={{ width: "15%" }}
                      transition={{ duration: 2, delay: 1 }}
                      className="h-full bg-gradient-to-r from-primary to-amber-500"
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-400/10 px-4 py-2 rounded-xl text-sm">
                    <Truck className="w-4 h-4" />
                    <span>شحن مجاني وسريع</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-400 font-bold bg-amber-400/10 px-4 py-2 rounded-xl text-sm">
                    <ShieldCheck className="w-4 h-4" />
                    <span>ضمان استبدال حقيقي</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Why Choose Us Section */}
            <div className="space-y-10">
              <div className="space-y-4">
                <motion.h3 
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="text-2xl font-black text-white italic uppercase tracking-tight flex items-center gap-3"
                >
                  <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                    <Award className="w-7 h-7" />
                  </div>
                  لماذا تختار هذا المنتج؟
                </motion.h3>
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: 80 }}
                  viewport={{ once: true }}
                  className="h-1.5 bg-gradient-to-r from-primary to-transparent rounded-full mr-15"
                />
              </div>

              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-[40px] blur-xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                <div className="relative bg-bg-card/40 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 md:p-12 space-y-10 shadow-2xl">
                  <div className="text-xl text-white/70 leading-relaxed font-medium italic whitespace-pre-line prose prose-invert max-w-none">
                    <ReactMarkdown>{product.description_ar}</ReactMarkdown>
                  </div>

                  {/* Feature Grid with Points */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t border-white/5">
                    {[
                      { 
                        icon: <Zap className="w-6 h-6" />, 
                        title: "أداء استثنائي", 
                        desc: "تم تصميم هذا المنتج ليقدم لك أعلى مستويات الأداء في فئته، مع ضمان الكفاءة والسرعة في كل استخدام.",
                        color: "text-primary",
                        bgColor: "bg-primary/10"
                      },
                      { 
                        icon: <ShieldCheck className="w-6 h-6" />, 
                        title: "جودة واعتمادية", 
                        desc: "نستخدم أفضل المواد الأولية ونخضع منتجاتنا لاختبارات جودة صارمة لضمان طول العمر والاعتمادية الكاملة.",
                        color: "text-blue-400",
                        bgColor: "bg-blue-400/10"
                      },
                      { 
                        icon: <Target className="w-6 h-6" />, 
                        title: "دقة متناهية", 
                        desc: "اهتمام فائق بأدق التفاصيل في التصميم والتصنيع، مما يجعل المنتج ليس فقط عملياً بل قطعة فنية بحد ذاتها.",
                        color: "text-emerald-400",
                        bgColor: "bg-emerald-400/10"
                      },
                      { 
                        icon: <Award className="w-6 h-6" />, 
                        title: "ضمان حقيقي", 
                        desc: "نحن نقف خلف منتجاتنا بكل ثقة، ونقدم لك ضماناً حقيقياً وخدمة ما بعد البيع تليق بك كزبون مميز لدينا.",
                        color: "text-amber-500",
                        bgColor: "bg-amber-500/10"
                      }
                    ].map((feature, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="flex gap-6 group/item"
                      >
                        <div className={`w-14 h-14 rounded-2xl ${feature.bgColor} flex items-center justify-center ${feature.color} group-hover/item:scale-110 transition-all duration-500 shrink-0 shadow-inner`}>
                          {feature.icon}
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-lg font-black text-white group-hover/item:text-primary transition-colors flex items-center gap-2">
                            {feature.title}
                            <div className="w-1.5 h-1.5 rounded-full bg-primary opacity-0 group-hover/item:opacity-100 transition-opacity" />
                          </h4>
                          <p className="text-sm opacity-50 leading-relaxed font-bold">{feature.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Technical Specifications List */}
              {product.specs && product.specs.length > 0 && (
                <div className="space-y-8 pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-grow bg-gradient-to-l from-white/10 to-transparent" />
                    <h4 className="text-sm font-black text-white/40 uppercase tracking-[0.3em] italic">Technical Specifications</h4>
                    <div className="h-px flex-grow bg-gradient-to-r from-white/10 to-transparent" />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {product.specs.map((spec, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-5 bg-bg-card/60 border border-white/5 rounded-2xl hover:border-primary/30 transition-all group"
                      >
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 group-hover:text-primary/40 transition-colors">{spec.key}</span>
                          <span className="text-sm font-black text-white group-hover:translate-x-[-4px] transition-transform">{spec.value}</span>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight className="w-4 h-4 text-primary rotate-180" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trust & Satisfaction Banner */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-8 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-[32px] border border-primary/20 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full -mr-32 -mt-32 group-hover:bg-primary/20 transition-all duration-1000" />
                
                <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/40 relative z-10 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                  <Heart className="w-10 h-10 fill-current" />
                </div>
                
                <div className="space-y-2 text-center md:text-right relative z-10">
                  <h4 className="font-black text-white text-2xl italic tracking-tighter">رضا زبائننا هو سر نجاحنا</h4>
                  <p className="text-base opacity-60 font-bold">انضم لأكثر من <span className="text-white">10,000</span> زبون سعيد يثقون بجودة منتجاتنا وخدماتنا المميزة.</p>
                </div>

                <div className="mr-auto flex -space-x-4 space-x-reverse relative z-10">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-12 h-12 rounded-full border-4 border-bg-main bg-bg-light overflow-hidden">
                      <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <div className="w-12 h-12 rounded-full border-4 border-bg-main bg-primary flex items-center justify-center text-[10px] font-black text-white">
                    +10K
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                trackInteraction('click', 'order_now_button_top');
                document.getElementById('order-form')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full py-6 bg-gradient-to-r from-primary to-primary-dark text-white rounded-2xl font-black text-xl shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 group relative overflow-hidden"
            >
              <motion.div 
                className="absolute inset-0 bg-white/20"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
              <ShoppingBag className="w-6 h-6" />
              اطلب الآن قبل انتهاء العرض
              <ChevronRight className="w-6 h-6 group-hover:translate-x-[-4px] transition-transform" />
            </motion.button>
          </motion.div>
        </div>

        {/* Order Form Section */}
        <motion.div 
          id="order-form"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary-dark rounded-[48px] blur-2xl opacity-10"></div>
          <div className="relative bg-bg-card border border-white/5 rounded-[48px] p-8 md:p-16 space-y-12 shadow-2xl overflow-hidden">
            {/* Form Header */}
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter">
                معلومات <span className="text-primary">الطلب</span>
              </h2>
              <p className="text-lg opacity-50">
                {product.isDigital 
                  ? 'هذا المنتج رقمي، سيتم إرساله إليك بعد إتمام الدفع الإلكتروني' 
                  : 'يرجى ملء المعلومات أدناه بدقة لضمان وصول طلبك في أسرع وقت'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold opacity-40 mr-2">الاسم الكامل</label>
                  <input 
                    required
                    type="text" 
                    placeholder="مثال: علي محمد"
                    className="w-full bg-bg-main border border-white/5 rounded-2xl px-6 py-5 outline-none focus:border-primary focus:bg-bg-card transition-all text-lg text-white"
                    value={form.customerName}
                    onChange={e => setForm({...form, customerName: e.target.value})}
                    onFocus={() => {
                      trackInteraction('focus', 'customerName');
                      if (product) trackAddToCart(product);
                    }}
                    onBlur={() => trackInteraction('blur', 'customerName')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold opacity-40 mr-2">رقم الهاتف</label>
                  <div className="relative">
                    <Phone className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20" />
                    <input 
                      required
                      type="tel" 
                      placeholder="07XXXXXXXXX"
                      className="w-full bg-bg-main border border-white/5 rounded-2xl pr-14 pl-6 py-5 outline-none focus:border-primary focus:bg-bg-card transition-all text-lg text-white dir-ltr text-right"
                      value={form.phone}
                      onChange={e => setForm({...form, phone: e.target.value})}
                      onFocus={() => trackInteraction('focus', 'phone')}
                      onBlur={() => trackInteraction('blur', 'phone')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold opacity-40 mr-2">المحافظة</label>
                  <div className="relative">
                    <div 
                      className="w-full bg-bg-main border border-white/5 rounded-2xl pr-14 pl-6 py-5 outline-none focus-within:border-primary transition-all text-lg cursor-pointer flex items-center justify-between group"
                      onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                    >
                      <MapPin className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity" />
                      <span className={form.city ? 'text-white' : 'text-gray-500'}>{form.city || 'اختر المحافظة'}</span>
                      <ChevronDown className={`w-5 h-5 opacity-20 transition-transform ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    
                    <AnimatePresence>
                      {isCityDropdownOpen && (
                        <>
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40" 
                            onClick={() => setIsCityDropdownOpen(false)}
                          />
                          <motion.div 
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute z-50 w-full mt-2 bg-bg-card border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-h-64 overflow-y-auto scrollbar-hide"
                          >
                            {CITIES.map(city => (
                              <div 
                                key={city}
                                className={`px-6 py-4 hover:bg-primary/20 cursor-pointer transition-colors border-b border-white/5 last:border-0 ${form.city === city ? 'bg-primary/10 text-primary font-bold' : 'text-white/80'}`}
                                onClick={() => {
                                  setForm({...form, city});
                                  setIsCityDropdownOpen(false);
                                  trackInteraction('change', `city_${city}`);
                                }}
                              >
                                {city}
                              </div>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold opacity-40 mr-2">العنوان الكامل</label>
                  <div className="relative">
                    <MapPin className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20" />
                    <input 
                      required
                      type="text" 
                      placeholder="مثال: الكرادة - قرب ساحة كهرمانة"
                      className="w-full bg-bg-main border border-white/5 rounded-2xl pr-14 pl-6 py-5 outline-none focus:border-primary focus:bg-bg-card transition-all text-lg text-white"
                      value={form.address}
                      onChange={e => setForm({...form, address: e.target.value})}
                      onFocus={() => trackInteraction('focus', 'address')}
                      onBlur={() => trackInteraction('blur', 'address')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold opacity-40 mr-2">ملاحظات إضافية</label>
                  <textarea 
                    placeholder="أي ملاحظات إضافية للطلب..."
                    className="w-full bg-bg-main border border-white/5 rounded-2xl px-6 py-5 outline-none focus:border-primary focus:bg-bg-card transition-all text-lg h-[156px] resize-none text-white"
                    value={form.notes}
                    onChange={e => setForm({...form, notes: e.target.value})}
                    onFocus={() => trackInteraction('focus', 'notes')}
                    onBlur={() => trackInteraction('blur', 'notes')}
                  />
                </div>
              </div>

              <div className="md:col-span-2 pt-6">
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={submitting}
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-primary-dark text-white py-6 rounded-2xl font-black text-2xl shadow-[0_20px_40px_color-mix(in srgb, var(--color-primary) 30%, transparent)] flex items-center justify-center gap-4 group disabled:opacity-50"
                  onClick={() => trackInteraction('click', 'submit_order_final')}
                >
                  {submitting ? <Loader2 className="w-8 h-8 animate-spin" /> : (
                    <>
                      {product.isDigital ? 'ادفع الآن واستلم طلبك' : 'تأكيد الطلب الآن'}
                      <ChevronRight className="w-8 h-8 group-hover:translate-x-[-4px] transition-transform" />
                    </>
                  )}
                </motion.button>
                
                <div className="mt-8 flex flex-col items-center gap-6">
                  <div className="flex flex-wrap justify-center gap-6 opacity-40 grayscale hover:grayscale-0 transition-all">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Zain_Cash_Logo.png/1200px-Zain_Cash_Logo.png" alt="ZainCash" className="h-6 object-contain" />
                    <img src="https://asiahawala.com/wp-content/uploads/2021/04/asiahawala-logo.png" alt="AsiaHawala" className="h-6 object-contain" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" alt="Visa" className="h-4 object-contain" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" alt="Mastercard" className="h-6 object-contain" />
                  </div>
                  <div className="flex items-center gap-6 opacity-40">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-xs font-bold">تشفير آمن</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      <span className="text-xs font-bold">توصيل مضمون</span>
                    </div>
                  </div>
                  <p className="text-center text-[10px] opacity-30 max-w-md">
                    بالضغط على تأكيد الطلب، أنت توافق على شروط الخدمة وسياسة الخصوصية. سيتم معالجة بياناتك بأمان تام.
                  </p>
                </div>
              </div>
            </form>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Truck, title: 'توصيل سريع', desc: 'توصيل خلال 24-48 ساعة لجميع المحافظات' },
            { icon: ShieldCheck, title: 'فحص قبل الدفع', desc: 'افحص طلبك وتأكد منه قبل الدفع للمندوب' },
            { icon: Zap, title: 'دعم فني 24/7', desc: 'فريقنا جاهز لمساعدتك في أي وقت تحتاجه' }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 bg-white/5 rounded-[32px] border border-white/5 flex flex-col items-center text-center space-y-4 hover:bg-white/[0.08] transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <feature.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tight">{feature.title}</h3>
              <p className="text-sm opacity-50 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Purchase Notification */}
      <AnimatePresence>
        {recentPurchase && (
          <motion.div 
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed bottom-24 left-4 md:left-6 z-[60] bg-bg-card border border-primary/30 p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-xs"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">اشترى {recentPurchase.name} من {recentPurchase.city}</p>
              <p className="text-xs opacity-40">{recentPurchase.time}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Mobile CTA */}
      <AnimatePresence>
        {showStickyCTA && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 w-full p-4 bg-bg-card/80 backdrop-blur-xl border-t border-white/5 z-50 md:hidden"
          >
            <button 
              onClick={() => {
                trackInteraction('click', 'sticky_cta');
                document.getElementById('order-form')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full py-4 bg-primary text-white rounded-xl font-black text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              اطلب الآن - {displayPrice.toLocaleString()} د.ع
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp Floating Button */}
      {settings?.whatsapp && (
        <div className="fixed bottom-28 md:bottom-8 left-4 md:left-8 z-[60] flex items-center gap-4">
          <AnimatePresence>
            {showWhatsAppTooltip && (
              <motion.div 
                initial={{ opacity: 0, x: -20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="bg-white text-bg-main px-5 py-3 rounded-2xl shadow-2xl font-bold text-sm relative whitespace-nowrap border border-black/5"
              >
                تواصل معنا عبر وتساب
                <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-white rotate-45 border-l border-b border-black/5" />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {showWhatsAppTooltip && (
              <motion.a
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-16 h-16 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(37,211,102,0.4)] hover:scale-110 hover:shadow-[0_12px_40px_rgb(37,211,102,0.6)] transition-all duration-300 relative shrink-0 group"
              >
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-pulse shadow-sm" />
                <svg viewBox="0 0 24 24" className="w-9 h-9 fill-current group-hover:rotate-12 transition-transform duration-300" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
              </motion.a>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
