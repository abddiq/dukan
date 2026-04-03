
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../src/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Story } from '../src/types';
import { X, ChevronLeft, ChevronRight, ShoppingBag, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const StoreStories: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(5000); // Default 5s
  const [viewedStories, setViewedStories] = useState<string[]>([]);
  const progressInterval = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Load viewed stories from localStorage
    const saved = localStorage.getItem('viewed_stories');
    if (saved) {
      try {
        setViewedStories(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing viewed stories", e);
      }
    }

    const fetchStories = async () => {
      try {
        const now = new Date().toISOString();
        const q = query(
          collection(db, 'stories'),
          where('isActive', '==', true),
          where('expiresAt', '>', now)
        );
        const snap = await getDocs(q);
        const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Story[];
        setStories(fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (err: any) {
        if (err.code === 'permission-denied') {
          console.warn("Firestore Rules: Please allow public read access to 'stories' collection.");
        } else {
          console.error("Error fetching stories:", err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStories();
  }, []);

  const markAsViewed = (id: string) => {
    if (!viewedStories.includes(id)) {
      const newViewed = [...viewedStories, id];
      setViewedStories(newViewed);
      localStorage.setItem('viewed_stories', JSON.stringify(newViewed));
    }
  };

  useEffect(() => {
    if (activeStoryIndex !== null) {
      const currentStory = stories[activeStoryIndex];
      markAsViewed(currentStory.id);

      setProgress(0);
      if (progressInterval.current) clearInterval(progressInterval.current);
      
      // If it's an image, we use the default 5s. 
      // If it's a video, we'll update duration once metadata is loaded.
      const initialDuration = currentStory.type === 'image' ? 5000 : duration;

      const step = 50;
      const increment = (step / initialDuration) * 100;

      progressInterval.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            handleNext();
            return 100;
          }
          return prev + increment;
        });
      }, step);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
    }

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [activeStoryIndex, duration]);

  const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoDuration = e.currentTarget.duration * 1000;
    if (videoDuration > 0) {
      setDuration(videoDuration);
    }
  };

  const handleNext = () => {
    if (activeStoryIndex === null) return;
    setDuration(5000); // Reset to default for next story
    if (activeStoryIndex < stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
    } else {
      setActiveStoryIndex(null);
    }
  };

  const handlePrev = () => {
    if (activeStoryIndex === null) return;
    setDuration(5000); // Reset to default for prev story
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    } else {
      setActiveStoryIndex(null);
    }
  };

  if (loading || stories.length === 0) return null;

  return (
    <div className="w-full py-12 bg-[#05080F]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
              قصص <span className="text-[#7F3F98]">المتجر</span>
            </h2>
            <p className="text-xs opacity-50 font-bold uppercase tracking-widest">Latest Updates & Highlights</p>
          </div>
        </div>

        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
          {stories.map((story, idx) => (
            <button 
              key={story.id}
              onClick={() => setActiveStoryIndex(idx)}
              className="flex-shrink-0 group flex flex-col items-center gap-3"
            >
              <div className={`w-20 h-28 md:w-28 md:h-40 rounded-[2rem] p-[3px] transition-all duration-500 shadow-2xl ${viewedStories.includes(story.id) ? 'bg-white/10 shadow-white/5' : 'bg-gradient-to-tr from-[#7F3F98] to-[#5B2C83] shadow-[#7F3F98]/30'} group-hover:scale-105 group-hover:-translate-y-1`}>
                <div className="w-full h-full rounded-[1.8rem] border-2 border-[#05080F] overflow-hidden bg-[#151B2B] relative">
                  {story.type === 'video' ? (
                    <video src={story.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={story.url} alt="" className="w-full h-full object-cover" />
                  )}
                  {/* Overlay for unviewed stories */}
                  {!viewedStories.includes(story.id) && (
                    <div className="absolute inset-0 bg-gradient-to-t from-[#7F3F98]/40 to-transparent pointer-events-none"></div>
                  )}
                </div>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${viewedStories.includes(story.id) ? 'text-white/30' : 'text-white/80'} group-hover:text-[#7F3F98]`}>
                {story.type === 'video' ? 'فيديو' : 'جديد'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {activeStoryIndex !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-0 md:p-4">
          <div className="relative w-full max-w-lg h-full md:h-[85vh] bg-black rounded-none md:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
            
            {/* Progress Bars */}
            <div className="absolute top-4 left-4 right-4 z-50 flex gap-1">
              {stories.map((_, idx) => (
                <div key={idx} className="h-1 flex-grow bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-100 ease-linear"
                    style={{ 
                      width: idx < activeStoryIndex ? '100%' : idx === activeStoryIndex ? `${progress}%` : '0%' 
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-8 left-6 right-6 z-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-[#7F3F98] p-0.5">
                  <div className="w-full h-full rounded-full bg-[#7F3F98]/20 flex items-center justify-center text-white font-black text-xs">P</div>
                </div>
                <div className="text-white">
                  <div className="text-xs font-black uppercase tracking-tighter italic">PCTHRONE</div>
                  <div className="text-[8px] opacity-60 uppercase font-bold">Official Store</div>
                </div>
              </div>
              <button onClick={() => setActiveStoryIndex(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Media Content */}
            <div className="flex-grow relative flex items-center justify-center">
              {stories[activeStoryIndex].type === 'video' ? (
                <video 
                  src={stories[activeStoryIndex].url} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-contain"
                  onEnded={handleNext}
                  onLoadedMetadata={handleVideoMetadata}
                  ref={videoRef}
                />
              ) : (
                <img src={stories[activeStoryIndex].url} alt="" className="w-full h-full object-contain" />
              )}

              {/* Navigation Areas (Invisible) */}
              <div className="absolute inset-0 flex">
                <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev}></div>
                <div className="w-1/3 h-full"></div>
                <div className="w-1/3 h-full cursor-pointer" onClick={handleNext}></div>
              </div>

              {/* Desktop Navigation Buttons */}
              <button onClick={handlePrev} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full items-center justify-center text-white transition-all">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={handleNext} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full items-center justify-center text-white transition-all">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Footer / Caption / Product Link */}
            <div className="p-8 bg-gradient-to-t from-black via-black/80 to-transparent space-y-6">
              {stories[activeStoryIndex].caption && (
                <p className="text-white text-sm font-bold text-center leading-relaxed">
                  {stories[activeStoryIndex].caption}
                </p>
              )}

              {stories[activeStoryIndex].productId && (
                <Link 
                  to={`/products/${stories[activeStoryIndex].productId}`}
                  onClick={() => setActiveStoryIndex(null)}
                  className="w-full py-4 bg-[#7F3F98] text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-[#5B2C83] transition-all shadow-2xl shadow-[#7F3F98]/40 uppercase italic tracking-widest"
                >
                  تسوق المنتج الآن <ShoppingBag className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreStories;
