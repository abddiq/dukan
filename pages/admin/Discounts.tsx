
import React, { useState, useEffect } from 'react';
import { db } from '../../src/firebase';
import { collection, getDocs, doc, updateDoc, getDoc, query, where, limit } from 'firebase/firestore';
import { StoreSettings, Product } from '../../src/types';
import { Tag, Save, Loader2, Percent, Calendar, Search, Package, Trash2, AlertCircle } from 'lucide-react';

const AdminDiscounts: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [globalExpiry, setGlobalExpiry] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'store'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data() as StoreSettings;
          setSettings(data);
          setGlobalDiscount(data.globalDiscount || 0);
          setGlobalExpiry(data.globalDiscountExpiry || '');
        }

        // Fetch some products with discounts
        const q = query(collection(db, 'products'), where('salePrice', '>', 0), limit(20));
        const pSnap = await getDocs(q);
        setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const q = query(
        collection(db, 'products'),
        where('name_ar', '>=', searchQuery),
        where('name_ar', '<=', searchQuery + '\uf8ff'),
        limit(10)
      );
      const snap = await getDocs(q);
      setSearchResults(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[]);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleSaveGlobal = async () => {
    setSavingGlobal(true);
    try {
      await updateDoc(doc(db, 'settings', 'store'), {
        globalDiscount: globalDiscount,
        globalDiscountExpiry: globalExpiry
      });
      alert('تم حفظ الخصم العام بنجاح');
    } catch (error) {
      console.error("Error saving global discount:", error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSavingGlobal(false);
    }
  };

  const handleUpdateProductDiscount = async (productId: string, salePrice: number, expiry: string) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        salePrice: salePrice,
        discountExpiry: expiry,
        updatedAt: new Date().toISOString()
      });
      alert('تم تحديث خصم المنتج بنجاح');
      // Refresh list
      const updatedProducts = products.map(p => p.id === productId ? { ...p, salePrice, discountExpiry: expiry } : p);
      setProducts(updatedProducts);
    } catch (error) {
      console.error("Error updating product discount:", error);
      alert('حدث خطأ أثناء التحديث');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-6xl space-y-10">
      <div>
        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">إدارة <span className="text-primary">الخصومات</span></h1>
        <p className="opacity-40 text-sm mt-2">تحكم في الخصومات العامة والخاصة بالمنتجات</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* بطاقة الخصم العام */}
        <div className="lg:col-span-1 bg-bg-card border border-primary/30 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full"></div>
          <h3 className="text-xl font-bold text-white flex items-center gap-3 relative z-10">
            <Percent className="w-6 h-6 text-primary" />
            خصم عام للمتجر
          </h3>
          <p className="text-xs opacity-40 leading-relaxed relative z-10">
            سيتم تطبيق هذا الخصم على جميع المنتجات التي لا تملك خصماً خاصاً بها.
          </p>

          <div className="space-y-4 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">نسبة الخصم (%)</label>
              <div className="relative">
                <input 
                  type="number"
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                  min="0"
                  max="100"
                />
                <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">تاريخ انتهاء الخصم</label>
              <div className="relative">
                <input 
                  type="datetime-local"
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  value={globalExpiry}
                  onChange={(e) => setGlobalExpiry(e.target.value)}
                />
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
              </div>
            </div>

            <button 
              onClick={handleSaveGlobal}
              disabled={savingGlobal}
              className="w-full py-4 bg-primary text-white font-black rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50"
            >
              {savingGlobal ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              حفظ الخصم العام
            </button>

            <button 
              onClick={async () => {
                if (!globalDiscount || globalDiscount <= 0) {
                  alert('يرجى تحديد نسبة الخصم أولاً');
                  return;
                }
                if (!window.confirm(`هل أنت متأكد من تطبيق خصم ${globalDiscount}% على جميع المنتجات؟ سيؤدي هذا إلى تحديث كافة المنتجات في المتجر بشكل دائم.`)) return;
                
                setSavingGlobal(true);
                try {
                  const allProductsSnap = await getDocs(collection(db, 'products'));
                  const batchPromises = allProductsSnap.docs.map(productDoc => {
                    const p = productDoc.data() as Product;
                    const newSalePrice = p.price * (1 - globalDiscount / 100);
                    return updateDoc(doc(db, 'products', productDoc.id), {
                      salePrice: newSalePrice,
                      discountExpiry: globalExpiry,
                      updatedAt: new Date().toISOString()
                    });
                  });
                  await Promise.all(batchPromises);
                  alert('تم تطبيق الخصم على جميع المنتجات بنجاح');
                } catch (error) {
                  console.error("Error applying to all:", error);
                  alert('حدث خطأ أثناء التطبيق');
                } finally {
                  setSavingGlobal(false);
                }
              }}
              disabled={savingGlobal}
              className="w-full py-4 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-black rounded-xl hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {savingGlobal ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertCircle className="w-5 h-5" />}
              تطبيق على كافة المنتجات
            </button>
          </div>
        </div>

        {/* خصومات خاصة بالمنتجات */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-bg-card border border-white/5 rounded-[2.5rem] p-8 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Tag className="w-6 h-6 text-primary" />
              خصومات المنتجات
            </h3>

            <div className="flex gap-4">
              <div className="relative flex-grow">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20" />
                <input 
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-12 py-3 text-white outline-none focus:border-primary"
                  placeholder="ابحث عن منتج لتطبيق خصم خاص..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button 
                onClick={handleSearch}
                disabled={searching}
                className="px-6 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                بحث
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-4 border-t border-white/5 pt-6">
                <p className="text-xs font-bold text-primary uppercase tracking-widest">نتائج البحث:</p>
                <div className="grid grid-cols-1 gap-4">
                  {searchResults.map(p => (
                    <ProductDiscountRow key={p.id} product={p} onUpdate={handleUpdateProductDiscount} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-bg-card border border-white/5 rounded-[2.5rem] p-8 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-3">
              <Package className="w-5 h-5 text-primary" />
              المنتجات المخفضة حالياً
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {products.length > 0 ? products.map(p => (
                <ProductDiscountRow key={p.id} product={p} onUpdate={handleUpdateProductDiscount} />
              )) : (
                <div className="text-center py-10 opacity-40 italic text-sm">لا توجد منتجات مخفضة حالياً</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductDiscountRow: React.FC<{ product: Product, onUpdate: (id: string, price: number, expiry: string) => void }> = ({ product, onUpdate }) => {
  const [salePrice, setSalePrice] = useState(product.salePrice || 0);
  const [expiry, setExpiry] = useState(product.discountExpiry || '');

  return (
    <div className="flex flex-col md:flex-row items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-primary/30 transition-all">
      <div className="flex items-center gap-4 flex-grow w-full md:w-auto">
        <img src={product.images[0]} className="w-12 h-12 rounded-lg object-cover" alt="" />
        <div className="flex-grow">
          <p className="text-sm font-bold text-white line-clamp-1">{product.name_ar}</p>
          <p className="text-[10px] opacity-40">السعر الأصلي: {product.price.toLocaleString()} د.ع</p>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
        <div className="space-y-1">
          <label className="text-[8px] uppercase opacity-40 px-1">سعر الخصم</label>
          <input 
            type="number"
            className="w-32 bg-bg-main border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary"
            value={salePrice}
            onChange={(e) => setSalePrice(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[8px] uppercase opacity-40 px-1">تاريخ الانتهاء</label>
          <input 
            type="datetime-local"
            className="w-44 bg-bg-main border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
        </div>
        <button 
          onClick={() => onUpdate(product.id, salePrice, expiry)}
          className="p-2 bg-primary/20 text-primary rounded-lg hover:bg-primary hover:text-white transition-all"
        >
          <Save className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onUpdate(product.id, 0, '')}
          className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default AdminDiscounts;
