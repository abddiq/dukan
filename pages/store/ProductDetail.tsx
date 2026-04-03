
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, Heart, ShieldCheck, Truck, RotateCcw, Plus, Minus, ChevronLeft, Loader2, Zap, CheckCircle, AlertCircle, Star, CreditCard } from 'lucide-react';
import { db } from '../../src/firebase';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { Product, StoreSettings } from '../../src/types';
import { CartContext } from '../../src/App';
import WishlistButton from '../../components/WishlistButton';
import ReviewSection from '../../components/ReviewSection';
import ReactMarkdown from 'react-markdown';
import { trackAddToCart } from '../../src/lib/pixels';

const StoreProductDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext)!;
  const [product, setProduct] = useState<Product | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [mainImage, setMainImage] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const [docSnap, settingsSnap] = await Promise.all([
          getDoc(doc(db, 'products', id)),
          getDoc(doc(db, 'settings', 'store'))
        ]);

        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as StoreSettings);
        }

        if (docSnap.exists()) {
          const productData = { id: docSnap.id, ...docSnap.data() } as Product;
          setProduct(productData);
          
          // Fetch similar products
          const qSimilar = query(
            collection(db, 'products'),
            where('categoryId', '==', productData.categoryId),
            where('isActive', '==', true),
            limit(5)
          );
          const similarSnap = await getDocs(qSimilar);
          const fetchedSimilar = similarSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as Product))
            .filter(p => p.id !== id)
            .slice(0, 4);
          setSimilarProducts(fetchedSimilar);
        } else {
          setError('المنتج غير موجود');
        }
      } catch (err: any) {
        console.error(err);
        if (err.code === 'permission-denied') {
          setError('خطأ في الصلاحيات: يرجى تفعيل قواعد القراءة العامة في Firebase Rules.');
        } else {
          setError('حدث خطأ أثناء تحميل بيانات المنتج.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    setQty(1);
    setMainImage(0);
  }, [id]);

  if (loading) return <div className="flex justify-center py-40"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>;

  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-40 text-center space-y-6">
      <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-8 rounded-3xl inline-block max-w-md">
        <p className="font-bold mb-4">{error}</p>
        <button onClick={() => navigate('/products')} className="text-sm underline">العودة للمتجر</button>
      </div>
    </div>
  );

  if (!product) return <div className="text-center py-40"><h2 className="text-2xl font-bold">المنتج غير موجود</h2><button onClick={() => navigate('/products')} className="mt-4 text-primary font-bold">العودة للمتجر</button></div>;

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
    <div className="max-w-7xl mx-auto px-4 py-12">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm opacity-60 hover:opacity-100 mb-8 transition-opacity">
        <ChevronLeft className="w-4 h-4 rotate-180" /> العودة
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-4">
          <div className="aspect-square bg-[var(--color-bg-card)] rounded-3xl overflow-hidden border border-white/5 relative">
            <img src={product.images?.[mainImage] || 'https://via.placeholder.com/600'} alt={product.name_ar} className="w-full h-full object-cover" />
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-20">
                <span className="bg-red-500 text-white px-8 py-4 rounded-full font-black text-xl uppercase tracking-widest shadow-2xl">نفذ المخزون</span>
              </div>
            )}
            {hasDiscount && !isOutOfStock && (
              <div className="absolute top-6 left-6 z-20 bg-emerald-500 text-white px-4 py-2 rounded-xl font-black text-sm shadow-xl">
                خصم {Math.round(((originalPrice - displayPrice) / originalPrice) * 100)}%
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-4">
            {product.images?.map((img, i) => (
              <button key={i} onClick={() => setMainImage(i)} className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${mainImage === i ? 'border-primary' : 'border-transparent opacity-60'}`}>
                <img src={img || 'https://via.placeholder.com/150'} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white">{product.name_ar}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm">
               <div className="flex items-center gap-1 text-yellow-500">
                 <Star className="w-4 h-4 fill-current" />
                 <span className="font-bold">{product.rating || '5.0'}</span>
                 <span className="opacity-40 text-xs">({product.reviewCount || 0} مراجعة)</span>
               </div>
               <div className="w-1 h-1 rounded-full bg-white/20"></div>
               {!isOutOfStock ? (
                 <span className="text-green-500 font-bold flex items-center gap-1">
                   <CheckCircle className="w-4 h-4" /> متوفر في المخزن ({product.stockQuantity})
                 </span>
               ) : (
                 <span className="text-red-500 font-bold flex items-center gap-1">
                   <AlertCircle className="w-4 h-4" /> نفذت الكمية
                 </span>
               )}
            </div>
          </div>

          <div className="p-6 bg-[var(--color-bg-card)] rounded-3xl border border-white/5 space-y-4">
             <div className="space-y-1">
                {hasDiscount && (
                  <div className="text-lg opacity-40 line-through">
                    {originalPrice.toLocaleString()} د.ع
                  </div>
                )}
                <div className="text-4xl font-black text-primary">
                  {displayPrice.toLocaleString()} <span className="text-xl">د.ع</span>
                </div>
             </div>
             <div className="text-sm opacity-60 leading-relaxed prose prose-invert max-w-none">
               <ReactMarkdown>{product.description_ar}</ReactMarkdown>
             </div>
          </div>

          <div className="flex items-center gap-6">
            <div className={`flex items-center bg-[var(--color-bg-card)] border border-white/10 rounded-xl h-14 overflow-hidden ${isOutOfStock ? 'opacity-20 pointer-events-none' : ''}`}>
               <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-12 h-full flex items-center justify-center hover:bg-white/5"><Minus className="w-4 h-4" /></button>
               <span className="w-12 text-center font-black text-white">{qty}</span>
               <button onClick={() => setQty(q => Math.min(product.stockQuantity, q + 1))} className="w-12 h-full flex items-center justify-center hover:bg-white/5"><Plus className="w-4 h-4" /></button>
            </div>
            <button 
              disabled={isOutOfStock}
              onClick={() => {
                addToCart({ 
                  productId: product.id, 
                  name: product.name_ar, 
                  price: displayPrice, 
                  qty, 
                  image: product.images?.[0] || '',
                  isDigital: product.isDigital 
                });
                trackAddToCart(product);
              }}
              className="flex-grow bg-primary h-14 text-white font-black rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:bg-gray-600 disabled:shadow-none disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-5 h-5" /> {!isOutOfStock ? 'أضف للسلة' : 'نفذت الكمية'}
            </button>
            {product.allowInstallments && !isOutOfStock && (
              <Link 
                to="/contact?type=installment&product=" 
                state={{ productName: product.name_ar }}
                className="flex-grow bg-amber-500 h-14 text-white font-black rounded-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-amber-500/20"
              >
                <CreditCard className="w-5 h-5" /> شراء بالأقساط
              </Link>
            )}
            <WishlistButton productId={product.id} className="h-14 w-14" />
          </div>

          {product.specs && product.specs.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {product.specs.map((spec, i) => (
                 <div key={i} className="p-4 bg-white/5 rounded-2xl flex items-center gap-3 border border-white/5">
                    <CheckCircle className="w-6 h-6 text-primary" />
                    <div>
                      <div className="text-[10px] opacity-40 uppercase font-bold">{spec.key}</div>
                      <div className="text-sm font-bold text-white">{spec.value}</div>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-24 border-t border-white/5 pt-16">
        <ReviewSection productId={product.id} />
      </div>

      {/* Similar Products */}
      {similarProducts.length > 0 && (
        <div className="mt-24 space-y-8">
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">منتجات <span className="text-primary">مشابهة</span></h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similarProducts.map(p => (
              <Link to={`/products/${p.id}`} key={p.id} className="group bg-[var(--color-bg-card)] border border-white/5 rounded-2xl overflow-hidden hover:border-primary/50 transition-all">
                <div className="aspect-square overflow-hidden bg-bg-light">
                  <img src={p.images?.[0] || 'https://via.placeholder.com/600'} alt={p.name_ar} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="p-5 space-y-3">
                  <h3 className="font-bold text-white line-clamp-1">{p.name_ar}</h3>
                  <div className="flex items-center justify-between">
                     <div className="text-xl font-black text-primary">
                        {(p.price || 0).toLocaleString()} <span className="text-xs">د.ع</span>
                     </div>
                     <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                        <Zap className="w-5 h-5" />
                     </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreProductDetail;
