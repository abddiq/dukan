
import React, { useState, useEffect } from 'react';
import { db } from '../../src/firebase';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Product } from '../../src/types';
import { Loader2, Search, CreditCard, CheckCircle, XCircle } from 'lucide-react';

const AdminInstallments: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'products'));
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleInstallments = async (productId: string, currentStatus: boolean) => {
    setUpdatingId(productId);
    try {
      await updateDoc(doc(db, 'products', productId), {
        allowInstallments: !currentStatus,
        updatedAt: serverTimestamp()
      });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, allowInstallments: !currentStatus } : p));
    } catch (err) {
      console.error(err);
      alert('فشل تحديث الحالة');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name_ar.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white">إدارة نظام الأقساط</h2>
        <p className="text-sm opacity-50">تفعيل أو تعطيل خيار الشراء بالأقساط لكل منتج</p>
      </div>

      <div className="p-4 bg-bg-card border border-primary/10 rounded-2xl">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
          <input 
            type="text" 
            placeholder="ابحث عن اسم المنتج..." 
            className="w-full bg-bg-main border border-white/5 rounded-xl px-12 py-3 outline-none focus:border-primary/50 text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
      ) : (
        <div className="bg-bg-card border border-primary/10 rounded-2xl overflow-hidden">
          <table className="w-full text-right">
            <thead className="bg-white/5 text-xs font-black uppercase tracking-widest text-primary">
              <tr>
                <th className="px-6 py-4">المنتج</th>
                <th className="px-6 py-4">السعر</th>
                <th className="px-6 py-4 text-center">حالة الأقساط</th>
                <th className="px-6 py-4 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden">
                        <img src={p.images?.[0] || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-sm font-bold text-white">{p.name_ar}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-white text-sm">
                    {(p.price || 0).toLocaleString()} د.ع
                  </td>
                  <td className="px-6 py-4 text-center">
                    {p.allowInstallments ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-full uppercase">
                        <CheckCircle className="w-3 h-3" /> متاح بالأقساط
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/5 text-white/40 text-[10px] font-bold rounded-full uppercase">
                        <XCircle className="w-3 h-3" /> كاش فقط
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => toggleInstallments(p.id, !!p.allowInstallments)}
                      disabled={updatingId === p.id}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        p.allowInstallments 
                          ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' 
                          : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                      } disabled:opacity-50`}
                    >
                      {updatingId === p.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        p.allowInstallments ? 'إيقاف الأقساط' : 'تفعيل الأقساط'
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="p-12 text-center opacity-40">لا توجد منتجات مطابقة للبحث</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminInstallments;
