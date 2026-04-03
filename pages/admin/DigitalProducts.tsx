
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Loader2 } from 'lucide-react';
import { db } from '../../src/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Product, Category, Brand } from '../../src/types';

const DigitalProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const pSnap = await getDocs(collection(db, 'products'));
      const cSnap = await getDocs(collection(db, 'categories'));
      
      const allProducts = pSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
      // Filter only digital products
      setProducts(allProducts.filter(p => p.isDigital === true));
      
      setCategories(cSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Category[]);

      try {
        const bSnap = await getDocs(collection(db, 'brands'));
        setBrands(bSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Brand[]);
      } catch (brandErr) {
        console.warn("Could not fetch brands in admin:", brandErr);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'permission-denied') {
        setError('ليس لديك صلاحية للوصول إلى هذه البيانات.');
      } else {
        setError('حدث خطأ أثناء جلب البيانات.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج الرقمي؟')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name_ar.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
         <div>
            <h2 className="text-2xl font-black text-white">إدارة المنتجات الرقمية</h2>
            <p className="text-sm opacity-50">عرض وتعديل وإضافة المنتجات الرقمية (بدون شحن، دفع إلكتروني فقط)</p>
         </div>
          <div className="flex gap-3">
            <button 
              onClick={() => navigate('/admin/digital-products/add')}
              className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all flex items-center gap-2"
            >
                <Plus className="w-5 h-5" /> إضافة منتج رقمي جديد
            </button>
          </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
          <p className="font-bold">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors">إعادة المحاولة</button>
        </div>
      )}

      <div className="p-4 bg-bg-card border border-primary/10 rounded-2xl flex flex-col md:flex-row gap-4">
         <div className="relative flex-grow">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
            <input 
              type="text" 
              placeholder="ابحث عن اسم المنتج الرقمي..." 
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
                    <th className="px-6 py-4">القسم</th>
                    <th className="px-6 py-4">السعر</th>
                    <th className="px-6 py-4">الحالة</th>
                    <th className="px-6 py-4">الإجراءات</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                 {filteredProducts.map(p => (
                   <tr key={p.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-white/5 overflow-hidden">
                               <img src={p.images?.[0] || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                            </div>
                            <div>
                               <div className="text-sm font-bold text-white flex items-center gap-2">
                                 {p.name_ar}
                               </div>
                               <div className="text-[10px] opacity-40">ID: {p.id.substring(0, 8)}</div>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-sm opacity-70">
                         {categories.find(c => c.id === p.categoryId)?.name_ar || 'غير محدد'}
                      </td>
                      <td className="px-6 py-4 font-bold text-white text-sm">
                         {(p.price || 0).toLocaleString()} د.ع
                      </td>
                      <td className="px-6 py-4">
                         <span className={`px-2 py-1 ${p.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} text-[10px] font-bold rounded uppercase`}>
                           {p.isActive ? 'نشط' : 'معطل'}
                         </span>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                             <button onClick={() => navigate(`/admin/products/edit/${p.id}`)} className="p-2 hover:bg-primary/10 rounded-lg text-primary"><Edit2 className="w-4 h-4" /></button>
                             <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                         </div>
                      </td>
                   </tr>
                 ))}
                 {filteredProducts.length === 0 && (
                   <tr>
                     <td colSpan={5} className="px-6 py-12 text-center opacity-40">لا توجد منتجات رقمية حالياً</td>
                   </tr>
                 )}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
};

export default DigitalProducts;
