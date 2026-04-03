
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Trash2, Loader2, X, Image as ImageIcon, Video, Calendar, Link as LinkIcon, Check, AlertCircle } from 'lucide-react';
import { db } from '../../src/firebase';
import { collection, getDocs, deleteDoc, doc, query, orderBy, updateDoc } from 'firebase/firestore';
import { Story } from '../../src/types';

const AdminStories: React.FC = () => {
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const storiesSnap = await getDocs(query(collection(db, 'stories'), orderBy('createdAt', 'desc')));
      setStories(storiesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Story[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الستوري؟')) return;
    try {
      await deleteDoc(doc(db, 'stories', id));
      setStories(stories.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleActive = async (story: Story) => {
    try {
      await updateDoc(doc(db, 'stories', story.id), { isActive: !story.isActive });
      setStories(stories.map(s => s.id === story.id ? { ...s, isActive: !s.isActive } : s));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">إدارة الستوريات</h2>
          <p className="text-sm opacity-50">أضف مقاطع فيديو وصور تظهر في الصفحة الرئيسية لفترة محدودة</p>
        </div>
        <Link 
          to="/admin/stories/add"
          className="px-8 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-all flex items-center gap-3 shadow-2xl shadow-primary/40 uppercase italic tracking-widest"
        >
          <Plus className="w-5 h-5" /> إضافة ستوري جديد
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stories.map(story => (
            <div key={story.id} className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden group hover:border-primary/50 transition-all relative">
              <div className="aspect-[9/16] relative bg-black">
                {story.type === 'video' ? (
                  <video src={story.url} className="w-full h-full object-cover opacity-60" muted playsInline />
                ) : (
                  <img src={story.url} alt="" className="w-full h-full object-cover opacity-60" />
                )}
                
                <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                  <div className="flex justify-between items-start">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${story.isActive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {story.isActive ? 'نشط' : 'معطل'}
                    </div>
                    <button onClick={() => handleDelete(story.id)} className="p-2 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {story.caption && <p className="text-xs text-white font-bold line-clamp-2">{story.caption}</p>}
                    <div className="flex items-center gap-2 text-[10px] text-white/60 font-bold uppercase">
                      <Calendar className="w-3 h-3" /> ينتهي في: {new Date(story.expiresAt).toLocaleDateString('ar-IQ')}
                    </div>
                  </div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
              </div>

              <div className="p-4 flex gap-2">
                <button 
                  onClick={() => toggleActive(story)}
                  className={`flex-grow py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${story.isActive ? 'bg-white/10 text-white hover:bg-red-500/20 hover:text-red-500' : 'bg-primary text-white hover:bg-primary-dark'}`}
                >
                  {story.isActive ? 'إيقاف الستوري' : 'تفعيل الستوري'}
                </button>
              </div>
            </div>
          ))}

          {stories.length === 0 && (
            <div className="col-span-full py-20 bg-white/5 border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center text-center">
              <ImageIcon className="w-16 h-16 opacity-10 mb-4" />
              <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">لا توجد ستوريات</h3>
              <p className="opacity-40 max-w-xs text-sm">ابدأ بإضافة أول ستوري لمتجرك ليظهر للعملاء بشكل دائري جذاب</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminStories;
