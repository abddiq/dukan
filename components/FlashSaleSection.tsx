
import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShoppingCart, Star, Heart, Clock, Zap } from 'lucide-react';
import { db } from '../src/firebase';
import { collection, query, getDocs, where, limit, doc, getDoc } from 'firebase/firestore';
import { Product, StoreSettings } from '../src/types';
import { CartContext } from '../src/App';
import WishlistButton from './WishlistButton';
import { motion, AnimatePresence } from 'motion/react';

const FlashSaleSection: React.FC = () => {
  const [discountProducts, setDiscountProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [maxDiscount, setMaxDiscount] = useState(0);
  const cartContext = useContext(CartContext);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const [prodSnap, settingsSnap] = await Promise.all([
          getDocs(query(collection(db, 'products'), where('isActive', '==', true))),
          getDoc(doc(db, 'settings', 'store'))
        ]);

        const now = new Date();
        const settings = settingsSnap.exists() ? settingsSnap.data() as StoreSettings : null;
        const globalDiscount = settings?.globalDiscount || 0;
        const globalExpiry = settings?.globalDiscountExpiry ? new Date(settings.globalDiscountExpiry) : null;
        const isGlobalActive = globalDiscount > 0 && (!globalExpiry || globalExpiry > now);
        
        const products = prodSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Product))
          .filter(p => {
            if (p.isLandingPageOnly) return false;
            
            // Check individual sale
            const hasIndividualSale = p.salePrice && p.salePrice > 0;
            const individualExpiry = p.discountExpiry ? new Date(p.discountExpiry) : null;
            const isIndividualActive = hasIndividualSale && (!individualExpiry || individualExpiry > now);

            return isIndividualActive || isGlobalActive;
          });

        if (products.length > 0) {
          // Add effective sale price to products for display
          const productsWithEffectivePrice = products.map(p => {
            let effectivePrice = p.price;
            let hasSale = false;

            const individualExpiry = p.discountExpiry ? new Date(p.discountExpiry) : null;
            if (p.salePrice && p.salePrice > 0 && (!individualExpiry || individualExpiry > now)) {
              effectivePrice = p.salePrice;
              hasSale = true;
            } else if (isGlobalActive) {
              effectivePrice = p.price * (1 - globalDiscount / 100);
              hasSale = true;
            }

            return { ...p, salePrice: hasSale ? effectivePrice : undefined };
          }).filter(p => p.salePrice !== undefined);

          if (productsWithEffectivePrice.length > 0) {
            setDiscountProducts(productsWithEffectivePrice);
            
            // Calculate max discount
            let max = 0;
            productsWithEffectivePrice.forEach(p => {
              const disc = Math.round(((p.price - p.salePrice!) / p.price) * 100);
              if (disc > max) max = disc;
            });
            setMaxDiscount(max);

            // Find the earliest expiry
            const expiries = productsWithEffectivePrice
              .map(p => p.discountExpiry ? new Date(p.discountExpiry).getTime() : null)
              .filter(t => t !== null) as number[];
            
            if (isGlobalActive && globalExpiry) {
              expiries.push(globalExpiry.getTime());
            }

            if (expiries.length > 0) {
              const targetDate = Math.min(...expiries);
              updateCountdown(targetDate);
              const interval = setInterval(() => updateCountdown(targetDate), 1000);
              return () => clearInterval(interval);
            } else {
              const targetDate = now.getTime() + (2 * 24 * 60 * 60 * 1000);
              updateCountdown(targetDate);
              const interval = setInterval(() => updateCountdown(targetDate), 1000);
              return () => clearInterval(interval);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching flash sale products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDiscounts();
  }, []);

  const updateCountdown = (target: number) => {
    const now = new Date().getTime();
    const diff = target - now;

    if (diff <= 0) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    setTimeLeft({
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000)
    });
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (loading || discountProducts.length === 0) return null;

  return (
    <section className="bg-gradient-to-br from-[#7F3F98] to-[#5B2C83] py-10 overflow-hidden relative">
      <div className="max-w-[1400px] mx-auto px-4 flex flex-col lg:flex-row items-center gap-8">
        
        {/* Left Side: Product Carousel */}
        <div className="w-full lg:w-3/4 relative order-2 lg:order-1">
          <div 
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto no-scrollbar pb-4 snap-x snap-mandatory"
          >
            {discountProducts.map(product => {
              const discount = Math.round(((product.price - product.salePrice!) / product.price) * 100);
              return (
                <div 
                  key={product.id}
                  className="min-w-[260px] md:min-w-[280px] bg-[#05080F] rounded-2xl overflow-hidden border border-white/5 snap-start flex flex-col group"
                >
                  {/* Image Area */}
                  <div className="bg-white p-3 aspect-square relative">
                    <img 
                      src={product.images?.[0] || 'https://via.placeholder.com/400'} 
                      alt={product.name_ar} 
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3">
                      <WishlistButton productId={product.id} className="w-8 h-8 rounded-full bg-black/10 backdrop-blur-md border-black/5" />
                    </div>
                  </div>

                  {/* Details Area */}
                  <div className="p-5 flex-grow flex flex-col gap-3">
                    <div className="space-y-1">
                      <h3 className="text-white font-bold text-base line-clamp-1">{product.name_ar}</h3>
                      <p className="text-white/40 text-[10px] uppercase tracking-widest">{product.brand || 'Gaming Gear'}</p>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-2.5 h-2.5 ${i < (product.rating || 5) ? 'fill-yellow-500 text-yellow-500' : 'text-white/20'}`} />
                      ))}
                      <span className="text-[9px] text-white/40 mr-1">({product.reviewCount || 120})</span>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-end justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-red-500 text-xs line-through decoration-red-500/50">{product.price.toLocaleString()}</span>
                          <div className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5 fill-emerald-500" />
                            {discount}%
                          </div>
                        </div>
                        <div className="text-xl font-black text-white">
                          {product.salePrice?.toLocaleString()} <span className="text-[10px] font-normal opacity-60">د.ع</span>
                        </div>
                      </div>
                    </div>

                    {/* Add to Cart */}
                    <button 
                      onClick={() => cartContext?.addToCart({
                        productId: product.id,
                        name: product.name_ar,
                        price: product.salePrice!,
                        qty: 1,
                        image: product.images[0],
                        isDigital: product.isDigital
                      })}
                      className="w-full py-2.5 bg-[#7F3F98]/20 hover:bg-[#7F3F98] border border-[#7F3F98]/50 text-white rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 group/btn"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                      إضافة للسلة
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Arrows */}
          <button 
            onClick={() => scroll('left')}
            className="absolute top-1/2 -left-3 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-[#7F3F98] transition-all z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => scroll('right')}
            className="absolute top-1/2 -right-3 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-[#7F3F98] transition-all z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Right Side: Info & Countdown */}
        <div className="w-full lg:w-1/4 text-white text-center lg:text-right space-y-6 order-1 lg:order-2">
          <div className="space-y-1">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">تخفيضات حتى</h2>
            <div className="text-7xl font-black text-white leading-none">
              {maxDiscount}%
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-white/60 font-bold uppercase tracking-widest text-[10px]">المتبقي لنهاية العرض</p>
            <div className="flex items-center justify-center lg:justify-end gap-2">
              {[
                { label: 'ثانية', value: timeLeft.seconds },
                { label: 'دقيقة', value: timeLeft.minutes },
                { label: 'ساعة', value: timeLeft.hours },
                { label: 'يوم', value: timeLeft.days }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 bg-white text-[#7F3F98] rounded-lg flex items-center justify-center font-black text-lg shadow-lg">
                    {String(item.value).padStart(2, '0')}
                  </div>
                  <span className="text-[9px] font-bold opacity-60">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Link 
            to="/products?onSale=true" 
            className="inline-flex items-center gap-2 text-white font-black text-sm hover:gap-3 transition-all group"
          >
            مشاهدة الكل
            <ChevronLeft className="w-4 h-4 group-hover:translate-x-[-3px] transition-transform" />
          </Link>
        </div>

      </div>

      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
    </section>
  );
};

export default FlashSaleSection;
