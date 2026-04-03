import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

import { ChevronRight, Zap, Shield, Truck, Cpu, Loader2, Star, Quote } from 'lucide-react';
import { db } from '../../src/firebase';
import { collection, query, limit, getDocs, where, orderBy } from 'firebase/firestore';
import { Product, HeroSlide, StoreSettings } from '../../src/types';
import { doc, getDoc } from 'firebase/firestore';
import WishlistButton from '../../components/WishlistButton';
import StoreStories from '../../components/StoreStories';
import FlashSaleSection from '../../components/FlashSaleSection';

const StoreHome: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setError(null);
      try {
        // Fetch Settings
        const settingsSnap = await getDoc(doc(db, 'settings', 'store'));
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as StoreSettings);
        }

        // Fetch New Arrivals (Ordered by date, limit 20)
        const qNewArrivals = query(
          collection(db, 'products'),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        const newArrivalsSnap = await getDocs(qNewArrivals);
        const allNewArrivals = newArrivalsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
        setFeaturedProducts(allNewArrivals.filter(p => !p.isLandingPageOnly));

        // Fetch Hero Slides
        const qSlides = query(collection(db, 'hero_slides'), where('isActive', '==', true));
        const slidesSnap = await getDocs(qSlides);
        const fetchedSlides = slidesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HeroSlide[];
        setSlides(fetchedSlides.sort((a, b) => a.order - b.order));
      } catch (err: any) {
        console.error("Error fetching data:", err);
        if (err.code === 'permission-denied') {
          setError('خطأ في الصلاحيات: يرجى تفعيل قواعد القراءة العامة في Firebase Rules.');
        } else {
          setError('حدث خطأ أثناء تحميل البيانات.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-rotate slides
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="pb-16">
      {error && (
        <div className="max-w-7xl mx-auto px-4 pt-8 mb-8">
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-center text-sm font-bold">
            {error}
          </div>
        </div>
      )}
      {/* Hero Section */}
      <section className="bg-bg-main pt-8 pb-12">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="relative rounded-[20px] overflow-hidden shadow-2xl shadow-primary/10 bg-bg-card">
            {slides.length > 0 ? (
              <>
                {slides.map((slide, index) => (
                  <div 
                    key={slide.id}
                    className={`transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'}`}
                  >
                    <Link to={slide.link} className="block relative group">
                      <picture>
                        {slide.mobileImage && (
                          <source media="(max-width: 768px)" srcSet={slide.mobileImage} />
                        )}
                        <img 
                          src={slide.image} 
                          alt={slide.title} 
                          className="w-full h-auto display-block transition-transform duration-700 group-hover:scale-[1.02]"
                        />
                      </picture>
                      
                      {!slide.hideContent && (
                        <div className="absolute inset-0 bg-gradient-to-r from-bg-card/80 via-transparent to-transparent flex items-center px-8 md:px-16">
                          <div className="max-w-2xl space-y-4 md:space-y-6">
                            {slide.subtitle && (
                              <div className="inline-block px-4 py-1 rounded-full bg-primary/20 border border-primary/50 text-primary text-xs md:text-sm font-bold animate-pulse">
                                {slide.subtitle}
                              </div>
                            )}
                            <h1 className="text-2xl sm:text-4xl md:text-6xl font-black text-white leading-tight">
                              {slide.title}
                            </h1>
                          </div>
                        </div>
                      )}
                    </Link>
                  </div>
                ))}
                
                {/* Slide Indicators */}
                <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                  {slides.map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all ${idx === currentSlide ? 'bg-primary w-6 md:w-8' : 'bg-white/20 hover:bg-white/40'}`}
                    />
                  ))}
                </div>
              </>
            ) : (
              // Fallback
              <div className="relative">
                <img 
                  src={settings?.heroUrl || "https://image2url.com/r2/default/images/1771595213927-27f53994-b0e7-4c8a-bed4-00e272359a95.png"} 
                  alt="Hero Banner" 
                  className="w-full h-auto block"
                />
              </div>
            )}
          </div>

          {/* Action Button Below Hero - Full Width Thin Bar */}
          {slides[currentSlide]?.link && (
            <div className="mt-4">
              <Link 
                to={slides[currentSlide].link} 
                className="w-full py-2 border border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/5 text-white/60 hover:text-white rounded-xl transition-all flex items-center justify-center gap-2 group text-xs font-bold uppercase tracking-widest"
              >
                <span>تسوق الآن</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-[-2px] transition-transform" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <StoreStories />
      <FlashSaleSection />

      <div className="space-y-16 pt-16">
        {/* Features */}
        <section className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        {[
          { icon: <Zap />, title: 'توصيل سريع (شامل التوصيل)', desc: 'خلال 24-48 ساعة' },
          { icon: <Shield />, title: 'ضمان حقيقي', desc: 'ضمان لمدة سنة على القطع' },
          { icon: <Truck />, title: 'دفع عند الاستلام', desc: 'خدمة الدفع عند استلام طلبك' },
          { icon: <Cpu />, title: 'دعم فني', desc: 'خبراء جاهزون لمساعدتك' }
        ].map((f, i) => (
          <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center text-center group hover:border-primary/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              {f.icon}
            </div>
            <h3 className="text-white font-bold mb-1">{f.title}</h3>
            <p className="text-sm opacity-60">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">منتجات <span className="text-primary">وصلت حديثاً</span></h2>
            <p className="opacity-60">اكتشف أحدث القطع والتجهيزات التي وصلت لمتجرنا</p>
          </div>
          <Link to="/products" className="text-primary font-bold flex items-center gap-1 hover:underline">
            عرض الكل <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {featuredProducts.slice(0, 8).map((product, index) => {
              const isOutOfStock = product.stockQuantity <= 0;
              const now = new Date();
              let displayPrice = product.price;
              let hasDiscount = false;
              let originalPrice = product.price;

              if (product.salePrice && product.salePrice > 0) {
                const expiry = product.discountExpiry ? new Date(product.discountExpiry) : null;
                if (!expiry || expiry > now) {
                  displayPrice = product.salePrice;
                  hasDiscount = true;
                }
              } else if (settings?.globalDiscount && settings.globalDiscount > 0) {
                const expiry = settings.globalDiscountExpiry ? new Date(settings.globalDiscountExpiry) : null;
                if (!expiry || expiry > now) {
                  displayPrice = product.price * (1 - settings.globalDiscount / 100);
                  hasDiscount = true;
                }
              }

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="h-full"
                >
                  <Link to={`/products/${product.id}`} className={`group bg-gradient-to-b from-bg-light to-[var(--color-bg-card)] border border-white/5 rounded-3xl overflow-hidden hover:border-primary/50 hover:shadow-[0_0_30px_color-mix(in srgb, var(--color-primary) 15%, transparent)] transition-all duration-300 relative flex flex-col h-full ${isOutOfStock ? 'opacity-75' : ''}`}>
                    <div className="aspect-square overflow-hidden bg-bg-light relative">
                      <img src={product.images?.[0] || 'https://via.placeholder.com/600'} alt={product.name_ar} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-20">
                          <span className="bg-red-500 text-white px-4 py-2 rounded-full font-black text-sm uppercase tracking-widest shadow-xl">نفذ المخزون</span>
                        </div>
                      )}
                      
                      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                        {hasDiscount && !isOutOfStock && (
                          <div className="bg-emerald-500 text-white px-3 py-1 rounded-lg font-black text-xs shadow-lg">
                            خصم {Math.round(((originalPrice - displayPrice) / originalPrice) * 100)}%
                          </div>
                        )}
                        {index < 4 && !isOutOfStock && (
                          <div className="bg-primary text-white px-3 py-1 rounded-lg font-black text-xs shadow-lg animate-pulse w-fit">
                            جديد
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="absolute top-4 right-4 z-10">
                      <WishlistButton productId={product.id} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border-white/10" />
                    </div>
                    <div className="p-5 space-y-3 flex flex-col flex-grow justify-between">
                      <h3 className="font-bold text-white line-clamp-2 leading-snug">{product.name_ar}</h3>
                      <div className="flex items-center justify-between pt-2">
                         <div className="space-y-1">
                            {hasDiscount && (
                              <div className="text-xs opacity-40 line-through">
                                {originalPrice.toLocaleString()} د.ع
                              </div>
                            )}
                            <div className="text-xl font-black text-primary">
                               {displayPrice.toLocaleString()} <span className="text-xs">د.ع</span>
                            </div>
                         </div>
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isOutOfStock ? 'bg-white/5 text-white/20' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'}`}>
                            <Zap className="w-5 h-5" />
                         </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </section>

      {/* Testimonials Section */}
      <section className="max-w-7xl mx-auto px-4 relative mt-16 mb-16">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-64 bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="text-center mb-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4 text-primary"
          >
            <Star className="w-6 h-6 fill-current" />
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter">آراء <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[var(--color-primary-dark)]">عملائنا</span></h2>
          <p className="opacity-60 mt-4 text-lg">نفخر بخدمة أكثر من 5000 عميل سعيد في كافة أنحاء العراق</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {[
            { name: 'محمد علي', comment: 'أفضل متجر تعاملت معه في العراق، التوصيل سريع جداً والقطع أصلية 100%.', city: 'بغداد' },
            { name: 'سجاد حسين', comment: 'بنيت تجميعتي عندهم والخدمة كانت خرافية، الدعم الفني ساعدني باختيار القطع المناسبة لميزانيتي.', city: 'البصرة' },
            { name: 'نور الهدى', comment: 'الأسعار منافسة جداً والتغليف ممتاز، وصلتني القطع بدون أي ضرر.', city: 'أربيل' },
            { name: 'عمر فاروق', comment: 'سرعة في الرد ومصداقية عالية، أنصح الكل يتعاملون وياهم.', city: 'الموصل' }
          ].map((t, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              whileHover={{ y: -10 }}
              className="p-8 rounded-3xl bg-gradient-to-b from-bg-light to-[var(--color-bg-card)] border border-white/10 flex flex-col space-y-6 hover:border-primary/50 transition-colors group relative overflow-hidden shadow-2xl"
            >
              <div className="absolute -right-4 -top-4 text-primary/10 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                <Quote className="w-24 h-24" />
              </div>
              <div className="flex gap-1 relative z-10">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                ))}
              </div>
              <p className="text-base text-white/90 leading-relaxed italic relative z-10 flex-grow">"{t.comment}"</p>
              <div className="flex items-center gap-4 pt-6 border-t border-white/10 relative z-10">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold text-lg shadow-[0_0_15px_color-mix(in srgb, var(--color-primary) 40%, transparent)] group-hover:scale-110 transition-transform">
                  {t.name[0]}
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">{t.name}</h4>
                  <p className="text-xs text-primary font-medium mt-0.5">{t.city}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Brand Promo Banner */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary to-primary-dark p-12 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="max-w-xl text-center md:text-right space-y-4">
              <h2 className="text-4xl font-black text-white">هل تبحث عن تجميعة مخصصة؟</h2>
              <p className="text-lg text-white/80">فريقنا المحترف جاهز لبناء جهاز أحلامك حسب ميزانيتك واحتياجاتك.</p>
              <Link to="/contact" className="inline-block bg-white text-primary px-8 py-3 rounded-xl font-black hover:bg-gray-100 transition-colors">تواصل معنا الآن</Link>
           </div>
           <div className="hidden lg:block relative">
              <div className="w-64 h-64 bg-white/20 rounded-full blur-3xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
              <Cpu className="w-48 h-48 text-white opacity-40 relative z-10" />
           </div>
        </div>
      </section>
      </div>
    </div>
  );
};

export default StoreHome;
