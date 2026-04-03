
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../src/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Brand } from '../../src/types';
import { Loader2, Sparkles, X } from 'lucide-react';

const StoreBrands: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const q = query(collection(db, 'brands'), where('isActive', '==', true));
        const snap = await getDocs(q);
        setBrands(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Brand[]);
      } catch (err: any) {
        console.error("Error fetching brands:", err);
        if (err.code === 'permission-denied') {
          setError('Missing permissions for brands collection.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();
  }, []);

  if (loading) return <div className="flex justify-center py-40"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <X className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-white">خطأ في الصلاحيات</h2>
        <p className="text-white/40 max-w-md mx-auto">
          يبدو أن هناك مشكلة في صلاحيات الوصول إلى العلامات التجارية. يرجى التأكد من إعداد قواعد الحماية (Firebase Rules) للسماح بالقراءة العامة لمجموعة "brands".
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter">العلامات <span className="text-primary">التجارية</span></h1>
        <p className="text-white/40 max-w-2xl mx-auto">تصفح منتجات أفضل الماركات العالمية المتوفرة لدينا في PCTHRONE</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {brands.map(brand => (
          <Link 
            to={`/products?brandId=${brand.id}`} 
            key={brand.id}
            className="group relative bg-[var(--color-bg-card)] border border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-6 hover:border-primary/30 transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="w-32 h-32 bg-white/5 rounded-3xl flex items-center justify-center overflow-hidden border border-white/5 group-hover:scale-110 transition-transform relative z-10">
              {brand.logoUrl ? (
                <img src={brand.logoUrl} alt={brand.name} className="w-full h-full object-contain p-4" />
              ) : (
                <Sparkles className="w-10 h-10 opacity-20" />
              )}
            </div>
            
            <h3 className="text-xl font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors relative z-10">{brand.name}</h3>
            
            <div className="absolute bottom-0 left-0 w-full h-1 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-right"></div>
          </Link>
        ))}
      </div>

      {brands.length === 0 && (
        <div className="py-20 text-center space-y-4 opacity-20">
          <Sparkles className="w-20 h-20 mx-auto" />
          <h3 className="text-2xl font-bold">لا توجد علامات تجارية حالياً</h3>
        </div>
      )}
    </div>
  );
};

export default StoreBrands;
