import React, { useState, useEffect } from 'react';
import { db } from '../../src/firebase';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Product, StoreSettings } from '../../src/types';
import { heeizService } from '../../src/services/heeizService';
import { Zap, RefreshCw, Send, Package, Loader2, CheckCircle, AlertCircle, Search } from 'lucide-react';

const AdminHeeizIntegration: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [fetchingStock, setFetchingStock] = useState<string | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Settings
        const settingsSnap = await getDoc(doc(db, 'settings', 'store'));
        if (settingsSnap.exists()) {
          const s = settingsSnap.data() as StoreSettings;
          setSettings(s);
          if (s.heeizApiKey && s.heeizPartnerId) {
            heeizService.setCredentials(s.heeizApiKey, s.heeizPartnerId);
          }
        }

        // Fetch Products
        const productsSnap = await getDocs(collection(db, 'products'));
        setProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[]);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSyncProduct = async (product: Product) => {
    if (!settings?.heeizApiKey) {
      setStatus({ type: 'error', text: 'يرجى إعداد مفتاح الـ API في الإعدادات أولاً' });
      return;
    }

    setSyncing(product.id);
    try {
      await heeizService.sendProduct({
        name: product.name_ar,
        image: product.images[0] || '',
        sku: product.sku || product.id,
        price: product.salePrice || product.price
      });
      setStatus({ type: 'success', text: `تم إرسال المنتج ${product.name_ar} بنجاح` });
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || 'فشل إرسال المنتج' });
    } finally {
      setSyncing(null);
    }
  };

  const handleFetchStock = async (product: Product) => {
    if (!settings?.heeizApiKey) {
      setStatus({ type: 'error', text: 'يرجى إعداد مفتاح الـ API في الإعدادات أولاً' });
      return;
    }

    setFetchingStock(product.id);
    try {
      const stockData = await heeizService.getStock(product.sku || product.id);
      
      // Update local stock in Firestore
      await updateDoc(doc(db, 'products', product.id), {
        stockQuantity: stockData.stock,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stockQuantity: stockData.stock } : p));
      
      setStatus({ type: 'success', text: `تم تحديث المخزون للمنتج ${product.name_ar}: ${stockData.stock}` });
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || 'فشل جلب المخزون' });
    } finally {
      setFetchingStock(null);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name_ar.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">ربط حيز (Heeiz Integration)</h2>
          <p className="text-sm opacity-50">مزامنة المنتجات وتحديث المخزون تلقائياً عبر API حيز</p>
        </div>
        {!settings?.heeizApiKey && (
          <div className="bg-amber-500/10 text-amber-500 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> يرجى ضبط الإعدادات أولاً
          </div>
        )}
      </div>

      {status && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold animate-in fade-in slide-in-from-top-4 ${
          status.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
        }`}>
          {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {status.text}
          <button onClick={() => setStatus(null)} className="mr-auto opacity-50 hover:opacity-100">×</button>
        </div>
      )}

      <div className="bg-bg-card border border-white/5 rounded-3xl p-4 flex items-center gap-4">
        <Search className="w-5 h-5 opacity-40" />
        <input 
          type="text" 
          placeholder="ابحث عن منتج بالاسم أو الـ SKU..." 
          className="bg-transparent border-none outline-none flex-grow text-white font-bold"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-bg-card border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-primary/30 transition-all">
              <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="w-16 h-16 rounded-2xl bg-bg-main overflow-hidden border border-white/5">
                  <img src={product.images[0] || 'https://via.placeholder.com/150'} alt={product.name_ar} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{product.name_ar}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs opacity-40 font-bold uppercase tracking-widest">SKU: {product.sku || 'N/A'}</span>
                    <span className="text-xs text-primary font-bold">المخزون الحالي: {product.stockQuantity}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => handleSyncProduct(product)}
                  disabled={syncing === product.id}
                  className="flex-grow md:flex-grow-0 px-6 py-3 bg-white/5 hover:bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {syncing === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  إرسال لحيز
                </button>
                <button 
                  onClick={() => handleFetchStock(product)}
                  disabled={fetchingStock === product.id}
                  className="flex-grow md:flex-grow-0 px-6 py-3 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {fetchingStock === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  تحديث المخزون
                </button>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="py-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
              <Package className="w-12 h-12 mx-auto opacity-20 mb-4" />
              <p className="opacity-40">لا توجد منتجات مطابقة للبحث</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminHeeizIntegration;
