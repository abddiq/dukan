
import React, { useState, useEffect } from 'react';
import { db } from '../../src/firebase';
import { collection, query, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { Star, Trash2, Loader2, MessageSquare, Search, ExternalLink } from 'lucide-react';
import { Review, Product } from '../../src/types';
import { Link } from 'react-router-dom';

const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<(Review & { productName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all reviews
      const reviewsSnap = await getDocs(query(collection(db, 'reviews'), orderBy('createdAt', 'desc')));
      const reviewsData = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Review[];

      // Fetch all products to map names
      const productsSnap = await getDocs(collection(db, 'products'));
      const productsMap: Record<string, string> = {};
      productsSnap.docs.forEach(d => {
        const data = d.data() as Product;
        productsMap[d.id] = data.name_ar || 'منتج غير معروف';
      });

      const enrichedReviews = reviewsData.map(r => ({
        ...r,
        productName: productsMap[r.productId]
      }));

      setReviews(enrichedReviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الرأي؟')) return;
    
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'reviews', id));
      setReviews(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error("Error deleting review:", error);
      alert('حدث خطأ أثناء الحذف');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredReviews = reviews.filter(r => 
    r.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">آراء <span className="text-primary">العملاء</span></h1>
          <p className="text-sm opacity-50 mt-2">إدارة ومراجعة تعليقات وتقييمات العملاء على المنتجات</p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20" />
          <input 
            type="text"
            placeholder="بحث في الآراء، المنتجات، أو العملاء..."
            className="w-full bg-bg-card border border-white/5 rounded-2xl px-12 py-4 text-white outline-none focus:border-primary/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-sm opacity-40 animate-pulse">جاري تحميل الآراء...</p>
        </div>
      ) : filteredReviews.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {filteredReviews.map((review) => (
            <div key={review.id} className="bg-bg-card border border-white/5 rounded-[2rem] p-8 hover:border-primary/30 transition-all group relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 blur-[80px] rounded-full"></div>
              
              <div className="flex flex-col md:flex-row gap-8 relative z-10">
                {/* User Info */}
                <div className="md:w-64 shrink-0 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                      {review.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{review.userName}</h3>
                      <p className="text-[10px] opacity-40 uppercase tracking-wider">زبون</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 text-yellow-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'fill-current' : 'opacity-20'}`} />
                    ))}
                  </div>

                  <div className="text-[10px] opacity-30 font-bold uppercase tracking-widest">
                    {review.createdAt ? new Date(review.createdAt.seconds * 1000).toLocaleDateString('ar-IQ') : 'N/A'}
                  </div>
                </div>

                {/* Review Content */}
                <div className="flex-grow space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <Link 
                      to={`/products/${review.productId}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline group/link"
                    >
                      {review.productName}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                    </Link>
                    
                    <button 
                      onClick={() => handleDelete(review.id)}
                      disabled={deletingId === review.id}
                      className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                      title="حذف المراجعة"
                    >
                      {deletingId === review.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="bg-bg-main border border-white/5 rounded-2xl p-6 relative">
                    <MessageSquare className="absolute -top-3 -right-3 w-8 h-8 text-primary/10" />
                    <p className="text-white/70 leading-relaxed italic">"{review.comment}"</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-bg-card border border-dashed border-white/10 rounded-[3rem] py-32 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center">
            <Star className="w-12 h-12 opacity-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white">لا توجد آراء حالياً</h3>
            <p className="text-sm opacity-40 max-w-xs mx-auto">عندما يقوم العملاء بتقييم المنتجات، ستظهر آراؤهم هنا للإدارة.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
