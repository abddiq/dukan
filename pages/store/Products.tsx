
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Filter, Search, LayoutGrid, List as ListIcon, SlidersHorizontal, Loader2, Sparkles, Heart, Zap } from 'lucide-react';
import { db } from '../../src/firebase';
import { collection, query, getDocs, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { Product, Category, Brand, StoreSettings } from '../../src/types';
import WishlistButton from '../../components/WishlistButton';

const StoreProducts: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const brandIdFromUrl = queryParams.get('brandId');
  const onSaleFromUrl = queryParams.get('onSale') === 'true';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState(brandIdFromUrl || 'all');
  const [onlyOnSale, setOnlyOnSale] = useState(onSaleFromUrl);
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState('createdAt');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [catSnap, settingsSnap] = await Promise.all([
          getDocs(query(collection(db, 'categories'), where('isActive', '==', true), orderBy('order', 'asc'))),
          getDoc(doc(db, 'settings', 'store'))
        ]);

        setCategories(catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[]);
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as StoreSettings);
        }

        try {
          const brandSnap = await getDocs(query(collection(db, 'brands'), where('isActive', '==', true)));
          setBrands(brandSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Brand[]);
        } catch (brandErr: any) {
          console.warn("Could not fetch brands, likely permission issue:", brandErr);
        }

        const prodSnap = await getDocs(query(collection(db, 'products'), where('isActive', '==', true)));
        const allProducts = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
        setProducts(allProducts.filter(p => !p.isLandingPageOnly));
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

  useEffect(() => {
    if (brandIdFromUrl) {
      setSelectedBrand(brandIdFromUrl);
    }
  }, [brandIdFromUrl]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name_ar.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesBrand = selectedBrand === 'all' || p.brandId === selectedBrand;
    
    // Price logic
    const now = new Date();
    let effectivePrice = p.price;
    if (p.salePrice && p.salePrice > 0) {
      const expiry = p.discountExpiry ? new Date(p.discountExpiry) : null;
      if (!expiry || expiry > now) {
        effectivePrice = p.salePrice;
      }
    } else if (settings?.globalDiscount && settings.globalDiscount > 0) {
      const expiry = settings.globalDiscountExpiry ? new Date(settings.globalDiscountExpiry) : null;
      if (!expiry || expiry > now) {
        effectivePrice = p.price * (1 - settings.globalDiscount / 100);
      }
    }

    const matchesMinPrice = minPrice === '' || effectivePrice >= Number(minPrice);
    const matchesMaxPrice = maxPrice === '' || effectivePrice <= Number(maxPrice);
    
    const matchesOnSale = !onlyOnSale || (p.salePrice && p.salePrice > 0);

    return matchesSearch && matchesCategory && matchesBrand && matchesMinPrice && matchesMaxPrice && matchesOnSale;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedBrand('all');
    setMinPrice('');
    setMaxPrice('');
    setOnlyOnSale(false);
  };

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price') {
      // Get effective prices for comparison
      const getEffectivePrice = (p: Product) => {
        const now = new Date();
        let effectivePrice = p.price;
        if (p.salePrice && p.salePrice > 0) {
          const expiry = p.discountExpiry ? new Date(p.discountExpiry) : null;
          if (!expiry || expiry > now) {
            effectivePrice = p.salePrice;
          }
        } else if (settings?.globalDiscount && settings.globalDiscount > 0) {
          const expiry = settings.globalDiscountExpiry ? new Date(settings.globalDiscountExpiry) : null;
          if (!expiry || expiry > now) {
            effectivePrice = p.price * (1 - settings.globalDiscount / 100);
          }
        }
        return effectivePrice;
      };
      return getEffectivePrice(a) - getEffectivePrice(b);
    }
    // Default: createdAt (newest first)
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {error && (
        <div className="mb-8 bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-center text-sm font-bold">
          {error}
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0 space-y-8">
          <div>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Search className="w-4 h-4" /> البحث
            </h3>
            <input 
              type="text" 
              placeholder="ابحث عن منتج..." 
              className="w-full bg-[var(--color-bg-card)] border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4" /> السعر (د.ع)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="number" 
                placeholder="من" 
                className="w-full bg-[var(--color-bg-card)] border border-white/5 rounded-xl px-3 py-2 outline-none focus:border-primary/50 text-xs"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <input 
                type="number" 
                placeholder="إلى" 
                className="w-full bg-[var(--color-bg-card)] border border-white/5 rounded-xl px-3 py-2 outline-none focus:border-primary/50 text-xs"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" /> العروض
            </h3>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div 
                onClick={() => setOnlyOnSale(!onlyOnSale)}
                className={`w-10 h-5 rounded-full relative transition-colors ${onlyOnSale ? 'bg-primary' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${onlyOnSale ? 'left-6' : 'left-1'}`} />
              </div>
              <span className="text-sm text-white/60 group-hover:text-white transition-colors">عرض التخفيضات فقط</span>
            </label>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4" /> الأقسام
            </h3>
            <div className="space-y-2">
              <button 
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-right px-4 py-2 rounded-lg text-sm transition-colors ${selectedCategory === 'all' ? 'bg-primary text-white font-bold' : 'hover:bg-white/5'}`}
              >
                جميع الأقسام
              </button>
              {categories.map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-right px-4 py-2 rounded-lg text-sm transition-colors ${selectedCategory === cat.id ? 'bg-primary text-white font-bold' : 'hover:bg-white/5'}`}
                >
                  {cat.name_ar}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> العلامات التجارية
            </h3>
            <div className="space-y-2">
              <button 
                onClick={() => setSelectedBrand('all')}
                className={`w-full text-right px-4 py-2 rounded-lg text-sm transition-colors ${selectedBrand === 'all' ? 'bg-primary text-white font-bold' : 'hover:bg-white/5'}`}
              >
                جميع الماركات
              </button>
              {brands.map(brand => (
                <button 
                  key={brand.id}
                  onClick={() => setSelectedBrand(brand.id)}
                  className={`w-full text-right px-4 py-2 rounded-lg text-sm transition-colors ${selectedBrand === brand.id ? 'bg-primary text-white font-bold' : 'hover:bg-white/5'}`}
                >
                  {brand.name}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={clearFilters}
            className="w-full py-3 rounded-xl border border-primary/30 text-primary font-bold text-sm hover:bg-primary hover:text-white transition-all"
          >
            إعادة تعيين الفلاتر
          </button>
        </aside>

        <div className="flex-grow space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--color-bg-card)] p-4 rounded-2xl border border-white/5">
             <div className="text-sm opacity-60">
               {loading ? 'جاري التحميل...' : `عرض ${filteredProducts.length} منتج`}
             </div>
             <div className="flex items-center gap-4">
                <select 
                  className="bg-transparent text-sm font-bold outline-none cursor-pointer"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                   <option value="createdAt" className="bg-bg-card">الأحدث أولاً</option>
                   <option value="price" className="bg-bg-card">السعر: من الأقل</option>
                </select>
             </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProducts.map(product => {
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
                  <Link to={`/products/${product.id}`} key={product.id} className={`group bg-[var(--color-bg-card)] border border-white/5 rounded-2xl overflow-hidden hover:border-primary/50 transition-all flex flex-col relative ${isOutOfStock ? 'opacity-75' : ''}`}>
                    <div className="aspect-square bg-bg-light relative overflow-hidden">
                      <img src={product.images?.[0] || 'https://via.placeholder.com/600'} alt={product.name_ar} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-20">
                          <span className="bg-red-500 text-white px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-xl">نفذ المخزون</span>
                        </div>
                      )}
                      {hasDiscount && !isOutOfStock && (
                        <div className="absolute top-4 left-4 z-20 bg-emerald-500 text-white px-3 py-1 rounded-lg font-black text-[10px] shadow-lg">
                          خصم {Math.round(((originalPrice - displayPrice) / originalPrice) * 100)}%
                        </div>
                      )}
                      <div className="absolute top-4 right-4 z-10">
                        <WishlistButton productId={product.id} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border-white/10" />
                      </div>
                    </div>
                    <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                      <h3 className="font-bold text-white group-hover:text-primary transition-colors line-clamp-2">{product.name_ar}</h3>
                      <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            {hasDiscount && (
                              <div className="text-[10px] opacity-40 line-through">
                                {originalPrice.toLocaleString()} د.ع
                              </div>
                            )}
                            <div className="text-xl font-black text-primary">
                              {displayPrice.toLocaleString()} <span className="text-xs">د.ع</span>
                            </div>
                          </div>
                          <button className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${isOutOfStock ? 'bg-white/5 text-white/20' : 'bg-white/5 hover:bg-primary hover:text-white'}`}>
                            {isOutOfStock ? 'نفذت الكمية' : 'التفاصيل'}
                          </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {!loading && filteredProducts.length === 0 && (
            <div className="text-center py-20 bg-[var(--color-bg-card)] rounded-3xl border border-dashed border-white/10">
               <h3 className="text-xl font-bold text-white mb-2">لا توجد منتجات مطابقة</h3>
               <p className="opacity-60">جرب البحث بكلمات أخرى أو تغيير الفلتر.</p>
            </div>
          )}
        </div>
      </div>

      {/* Brand Promo Banner */}
      <section className="mt-20">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary to-primary-dark p-12 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="max-w-xl text-center md:text-right space-y-4">
              <h2 className="text-4xl font-black text-white">هل تبحث عن تجميعة مخصصة؟</h2>
              <p className="text-lg text-white/80">فريقنا المحترف جاهز لبناء جهاز أحلامك حسب ميزانيتك واحتياجاتك.</p>
              <Link to="/contact" className="inline-block bg-white text-primary px-8 py-3 rounded-xl font-black hover:bg-gray-100 transition-colors">تواصل معنا الآن</Link>
           </div>
           <div className="hidden lg:block relative">
              <div className="w-64 h-64 bg-white/20 rounded-full blur-3xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
              <SlidersHorizontal className="w-48 h-48 text-white opacity-40 relative z-10" />
           </div>
        </div>
      </section>
    </div>
  );
};

export default StoreProducts;
