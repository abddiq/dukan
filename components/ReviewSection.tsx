
import React, { useState, useEffect } from 'react';
import { Star, User, Loader2, Send } from 'lucide-react';
import { db, auth } from '../src/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Review } from '../src/types';

interface ReviewSectionProps {
  productId: string;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({ productId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const user = auth.currentUser;

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'reviews'),
        where('productId', '==', productId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setReviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Review[]);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('يرجى تسجيل الدخول لكتابة مراجعة');
    if (!comment.trim()) return alert('يرجى كتابة تعليق');

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        productId,
        userId: user.uid,
        userName: user.displayName || 'عميل PCTHRONE',
        rating,
        comment,
        createdAt: serverTimestamp()
      });
      setComment('');
      setRating(5);
      fetchReviews();
    } catch (error) {
      console.error("Error adding review:", error);
      alert('حدث خطأ أثناء إضافة المراجعة');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">آراء <span className="text-[#7F3F98]">العملاء</span></h2>
        <div className="flex items-center gap-2">
          <div className="flex text-yellow-500">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`w-4 h-4 ${s <= (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length || 0) ? 'fill-current' : ''}`} />
            ))}
          </div>
          <span className="text-sm opacity-50">({reviews.length} مراجعة)</span>
        </div>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="bg-[#0D121F] border border-[#7F3F98]/20 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-white">تقييمك:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className={`p-1 transition-colors ${s <= rating ? 'text-yellow-500' : 'text-white/10'}`}
                >
                  <Star className={`w-6 h-6 ${s <= rating ? 'fill-current' : ''}`} />
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="اكتب تجربتك مع المنتج هنا..."
              className="w-full bg-[#05080F] border border-white/5 rounded-2xl p-4 text-white outline-none focus:border-[#7F3F98]/50 transition-all h-32 resize-none"
            />
          </div>
          <button
            disabled={submitting}
            type="submit"
            className="w-full py-4 bg-[#7F3F98] text-white font-black rounded-xl hover:bg-[#5B2C83] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            نشر المراجعة
          </button>
        </form>
      ) : (
        <div className="bg-[#0D121F] border border-white/5 rounded-3xl p-8 text-center space-y-4">
          <p className="opacity-50">يجب عليك تسجيل الدخول لتتمكن من إضافة مراجعة.</p>
          <button className="text-[#7F3F98] font-bold hover:underline">تسجيل الدخول</button>
        </div>
      )}

      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-[#7F3F98] animate-spin" /></div>
        ) : reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="bg-[#0D121F] border border-white/5 rounded-3xl p-6 space-y-4 hover:border-[#7F3F98]/20 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#7F3F98]/20 flex items-center justify-center text-[#7F3F98]">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{review.userName}</h4>
                    <p className="text-[10px] opacity-40 uppercase">Verified Purchase</p>
                  </div>
                </div>
                <div className="flex text-yellow-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'fill-current' : ''}`} />
                  ))}
                </div>
              </div>
              <p className="text-sm opacity-70 leading-relaxed">{review.comment}</p>
            </div>
          ))
        ) : (
          <div className="text-center py-10 opacity-20">
            <Star className="w-12 h-12 mx-auto mb-4" />
            <p>لا توجد مراجعات لهذا المنتج بعد. كن أول من يكتب مراجعة!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewSection;
