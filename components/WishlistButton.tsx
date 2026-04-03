
import React, { useState, useEffect } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { db, auth } from '../src/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

interface WishlistButtonProps {
  productId: string;
  className?: string;
}

const WishlistButton: React.FC<WishlistButtonProps> = ({ productId, className = "" }) => {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkWishlist = async () => {
      if (!currentUser) {
        setChecking(false);
        setIsInWishlist(false);
        return;
      }
      try {
        const q = query(
          collection(db, 'wishlists'),
          where('userId', '==', currentUser.uid),
          where('productId', '==', productId)
        );
        const snap = await getDocs(q);
        setIsInWishlist(!snap.empty);
      } catch (error) {
        console.error("Error checking wishlist:", error);
      } finally {
        setChecking(false);
      }
    };
    checkWishlist();
  }, [productId, currentUser]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) return alert('يرجى تسجيل الدخول لإضافة المنتج إلى قائمة الرغبات');
    
    setLoading(true);
    try {
      if (isInWishlist) {
        const q = query(
          collection(db, 'wishlists'),
          where('userId', '==', currentUser.uid),
          where('productId', '==', productId)
        );
        const snap = await getDocs(q);
        const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'wishlists', d.id)));
        await Promise.all(deletePromises);
        setIsInWishlist(false);
      } else {
        await addDoc(collection(db, 'wishlists'), {
          userId: currentUser.uid,
          productId,
          addedAt: serverTimestamp()
        });
        setIsInWishlist(true);
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      alert('حدث خطأ أثناء تحديث قائمة الرغبات');
    } finally {
      setLoading(false);
    }
  };

  if (checking) return <div className={`w-10 h-10 flex items-center justify-center ${className}`}><Loader2 className="w-4 h-4 animate-spin opacity-20" /></div>;

  return (
    <button
      onClick={toggleWishlist}
      disabled={loading}
      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all border ${
        isInWishlist 
          ? 'bg-red-500/10 border-red-500/50 text-red-500' 
          : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/30'
      } ${className}`}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-current' : ''}`} />
      )}
    </button>
  );
};

export default WishlistButton;
