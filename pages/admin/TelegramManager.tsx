
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Image as ImageIcon, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  MessageSquare, 
  Info, 
  ExternalLink, 
  Bot, 
  Users, 
  Trash2, 
  History, 
  Video, 
  Type,
  RefreshCw,
  Eye,
  Settings,
  Check,
  Search,
  Package,
  ChevronDown,
  X as CloseIcon
} from 'lucide-react';
import { Product } from '../../src/types';

interface TelegramHistoryItem {
  id: string;
  messageId: number;
  text: string;
  photoUrl?: string;
  videoUrl?: string;
  type: 'text' | 'photo' | 'video';
  createdAt: any;
}

const TelegramManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'text' | 'photo' | 'video' | 'settings'>('text');
  const [message, setMessage] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [botInfo, setBotInfo] = useState<any>(null);
  const [history, setHistory] = useState<TelegramHistoryItem[]>([]);
  const [fetchingInfo, setFetchingInfo] = useState(true);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Settings state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    fetchData();
    fetchProducts();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchBotInfo(), fetchHistory()]);
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchBotInfo = async () => {
    try {
      setFetchingInfo(true);
      const response = await fetch('/api/telegram/info');
      const data = await response.json();
      if (response.ok) {
        setBotInfo(data);
        setNewTitle(data.channel?.title || '');
        setNewDescription(data.channel?.description || '');
      } else {
        console.error('Failed to fetch bot info:', data.message);
      }
    } catch (error) {
      console.error('Error fetching bot info:', error);
    } finally {
      setFetchingInfo(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setFetchingHistory(true);
      const response = await fetch('/api/telegram/history');
      const data = await response.json();
      if (response.ok) {
        setHistory(data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setFetchingHistory(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && activeTab === 'text') return;
    if (!fileUrl.trim() && (activeTab === 'photo' || activeTab === 'video')) return;

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          type: activeTab === 'settings' ? 'text' : activeTab,
          fileUrl: fileUrl.trim() || undefined,
          photoUrl: activeTab === 'photo' ? fileUrl.trim() : undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: 'تم إرسال المنشور بنجاح إلى القناة' });
        setMessage('');
        setFileUrl('');
        fetchHistory(); // Refresh history
      } else {
        setStatus({ type: 'error', message: data.description || data.message || 'فشل إرسال المنشور' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'حدث خطأ أثناء الاتصال بالخادم' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/telegram/update-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: newTitle !== botInfo?.channel?.title ? newTitle : undefined,
          description: newDescription !== botInfo?.channel?.description ? newDescription : undefined
        }),
      });

      if (response.ok) {
        setStatus({ type: 'success', message: 'تم تحديث معلومات القناة بنجاح' });
        fetchBotInfo();
      } else {
        const data = await response.json();
        setStatus({ type: 'error', message: data.message || 'فشل تحديث المعلومات' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'حدث خطأ أثناء الاتصال بالخادم' });
    } finally {
      setLoading(false);
    }
  };

  const useTemplate = (type: 'product' | 'discount' | 'welcome', selectedProduct?: Product) => {
    let text = '';
    const appUrl = window.location.origin;

    switch(type) {
      case 'product':
        if (selectedProduct) {
          text = `<b>🔥 منتج جديد متوفر الآن!</b>\n\nاسم المنتج: ${selectedProduct.name_ar}\nالسعر: ${selectedProduct.price.toLocaleString()} د.ع\n\n🛒 اطلبه الآن من الرابط:\n${appUrl}/product/${selectedProduct.id}`;
          if (selectedProduct.images && selectedProduct.images.length > 0) {
            setFileUrl(selectedProduct.images[0]);
            setActiveTab('photo');
          }
        } else {
          text = '<b>🔥 منتج جديد متوفر الآن!</b>\n\nاسم المنتج: [اسم المنتج]\nالسعر: [السعر] د.ع\n\n🛒 اطلبه الآن من الرابط:\n[رابط المنتج]';
        }
        break;
      case 'discount':
        text = '<b>🚨 عرض خاص لفترة محدودة!</b>\n\nخصم يصل إلى [النسبة]% على [القسم]\n\nاستخدم الكود: [الكود]\n\n🛍 تسوق الآن:\n[رابط المتجر]';
        break;
      case 'welcome':
        text = '<b>👋 أهلاً بكم في قناتنا الرسمية!</b>\n\nهنا ستجدون أحدث عروض ومنتجات [اسم المتجر].\n\n✅ منتجات أصلية\n✅ توصيل سريع\n✅ دعم فني متواصل';
        break;
    }
    setMessage(text);
    if (activeTab === 'settings') setActiveTab('text');
    setShowProductSelector(false);
  };

  const handleResend = (item: TelegramHistoryItem) => {
    setMessage(item.text || '');
    if (item.type === 'photo') {
      setFileUrl(item.photoUrl || '');
      setActiveTab('photo');
    } else if (item.type === 'video') {
      setFileUrl(item.videoUrl || '');
      setActiveTab('video');
    } else {
      setActiveTab('text');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteMessage = async (messageId: number, historyId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المنشور من القناة؟')) return;

    try {
      const response = await fetch('/api/telegram/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, historyId }),
      });

      if (response.ok) {
        setHistory(prev => prev.filter(item => item.id !== historyId));
      } else {
        const data = await response.json();
        alert(data.description || 'فشل حذف المنشور');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <Send className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">نظام إدارة التليكرام</h1>
          </div>
          <p className="text-sm text-white/50 font-bold uppercase tracking-widest">تحكم كامل في القناة، النشر، والإحصائيات</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 transition-all"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-5 h-5 ${fetchingInfo || fetchingHistory ? 'animate-spin' : ''}`} />
          </button>
          <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 ${botInfo ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
            <div className={`w-2 h-2 rounded-full ${botInfo ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs font-black uppercase tracking-widest">{botInfo ? 'النظام متصل' : 'خطأ في الاتصال'}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-bg-card border border-white/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-white/30 font-black uppercase tracking-widest">اسم البوت</div>
            <div className="text-sm font-bold text-white truncate max-w-[150px]">{botInfo?.bot?.first_name || '---'}</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-bg-card border border-white/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-white/30 font-black uppercase tracking-widest">المشتركين</div>
            <div className="text-lg font-black text-white">{botInfo?.channel?.member_count?.toLocaleString() || '0'}</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-bg-card border border-white/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-white/30 font-black uppercase tracking-widest">اسم القناة</div>
            <div className="text-sm font-bold text-white truncate max-w-[150px]">{botInfo?.channel?.title || '---'}</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-bg-card border border-white/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-white/30 font-black uppercase tracking-widest">آخر النشاطات</div>
            <div className="text-sm font-bold text-white">{history.length} منشور مؤخراً</div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Composer Area */}
        <div className="lg:col-span-7 space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-bg-card border border-white/5 rounded-[2rem] overflow-hidden"
          >
            {/* Tabs */}
            <div className="flex border-b border-white/5">
              {(['text', 'photo', 'video', 'settings'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-5 flex items-center justify-center gap-3 transition-all relative ${activeTab === tab ? 'text-primary' : 'text-white/30 hover:text-white/60'}`}
                >
                  {tab === 'text' && <Type className="w-5 h-5" />}
                  {tab === 'photo' && <ImageIcon className="w-5 h-5" />}
                  {tab === 'video' && <Video className="w-5 h-5" />}
                  {tab === 'settings' && <Settings className="w-5 h-5" />}
                  <span className="text-xs font-black uppercase tracking-widest">
                    {tab === 'text' ? 'نص' : tab === 'photo' ? 'صورة' : tab === 'video' ? 'فيديو' : 'إعدادات'}
                  </span>
                  {activeTab === tab && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-8">
              <AnimatePresence mode="wait">
                {activeTab === 'settings' ? (
                  <motion.form 
                    key="settings"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={handleUpdateChannel} 
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/30 font-black uppercase tracking-widest px-4">اسم القناة الجديد</label>
                      <input 
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white font-bold focus:outline-none focus:border-primary/50 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/30 font-black uppercase tracking-widest px-4">وصف القناة</label>
                      <textarea 
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        rows={4}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white font-bold focus:outline-none focus:border-primary/50 transition-all resize-none"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black italic uppercase tracking-tighter flex items-center justify-center gap-4 transition-all"
                    >
                      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'تحديث معلومات القناة'}
                    </button>
                  </motion.form>
                ) : (
                  <motion.form 
                    key="composer"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={handleSendMessage} 
                    className="space-y-6"
                  >
                    {/* Templates & Product Selection */}
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                      <div className="text-[10px] text-white/30 font-black uppercase tracking-widest w-full mb-2">القوالب السريعة</div>
                      <button 
                        type="button" 
                        onClick={() => setShowProductSelector(true)} 
                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl text-xs font-bold text-primary transition-all"
                      >
                        <Package className="w-4 h-4" />
                        اختيار منتج
                      </button>
                      <button type="button" onClick={() => useTemplate('product')} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-white/60 transition-all">قالب منتج فارغ</button>
                      <button type="button" onClick={() => useTemplate('discount')} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-white/60 transition-all">قالب خصم</button>
                      <button type="button" onClick={() => useTemplate('welcome')} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-white/60 transition-all">قالب ترحيب</button>
                    </div>

                    {activeTab !== 'text' && (
                      <div className="space-y-2">
                        <label className="text-[10px] text-white/30 font-black uppercase tracking-widest px-4">
                          رابط {activeTab === 'photo' ? 'الصورة' : 'الفيديو'}
                        </label>
                        <input 
                          type="url"
                          value={fileUrl}
                          onChange={(e) => setFileUrl(e.target.value)}
                          placeholder={`https://example.com/${activeTab === 'photo' ? 'image.jpg' : 'video.mp4'}`}
                          className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white font-bold focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/10"
                          required
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] text-white/30 font-black uppercase tracking-widest px-4">
                        {activeTab === 'text' ? 'محتوى الرسالة' : 'الوصف (Caption)'}
                      </label>
                      <textarea 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="اكتب ما تريد نشره هنا..."
                        rows={activeTab === 'text' ? 10 : 5}
                        className="w-full bg-white/5 border border-white/5 rounded-3xl p-6 text-white font-bold focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/10 resize-none"
                        required={activeTab === 'text'}
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={loading || !botInfo}
                      className="w-full py-5 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black italic uppercase tracking-tighter flex items-center justify-center gap-4 transition-all shadow-xl shadow-purple-500/20 group"
                    >
                      {loading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                          نشر في القناة الآن
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {status && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`mt-6 p-4 rounded-2xl flex items-center gap-4 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
                >
                  {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                  <span className="text-xs font-bold">{status.message}</span>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Preview Section */}
          {activeTab !== 'settings' && (
            <div className="bg-white/5 rounded-[2rem] p-8 border border-white/5">
              <h3 className="text-xs font-black text-white/40 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                معاينة المنشور قبل الإرسال
              </h3>
              <div className="bg-[#1c242f] rounded-3xl overflow-hidden border border-white/10 max-w-md shadow-2xl">
                {fileUrl && activeTab === 'photo' && (
                  <img src={fileUrl} alt="Preview" className="w-full aspect-video object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                )}
                {fileUrl && activeTab === 'video' && (
                  <div className="w-full aspect-video bg-black flex items-center justify-center text-white/20">
                    <Video className="w-12 h-12" />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-xs">
                      {botInfo?.bot?.first_name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{botInfo?.channel?.title || botInfo?.bot?.first_name || 'اسم القناة'}</div>
                      <div className="text-[10px] text-white/30">اليوم، 12:00 م</div>
                    </div>
                  </div>
                  <div className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: message || 'سيظهر محتوى الرسالة هنا...' }} />
                  <div className="mt-4 flex items-center justify-between text-[10px] text-white/20 font-bold border-t border-white/5 pt-4">
                    <div className="flex items-center gap-4">
                      <span>1.2K views</span>
                      <span>12:00 PM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* History Sidebar */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-bg-card border border-white/5 rounded-[2rem] p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">سجل المنشورات</h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">آخر 20 منشور تم إرساله</p>
                </div>
              </div>
              <button 
                onClick={fetchHistory}
                className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-primary transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${fetchingHistory ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
              {fetchingHistory ? (
                <div className="flex flex-col items-center justify-center py-20 text-white/20">
                  <Loader2 className="w-10 h-10 animate-spin mb-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">جاري تحميل السجل...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-white/10 text-center">
                  <History className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-sm font-bold">لا توجد منشورات سابقة</p>
                  <p className="text-[10px] uppercase tracking-widest mt-1">ابدأ بالنشر لتظهر هنا</p>
                </div>
              ) : (
                history.map((item) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="group bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4 flex-1">
                        <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${
                          item.type === 'photo' ? 'bg-blue-500/10 text-blue-500' : 
                          item.type === 'video' ? 'bg-purple-500/10 text-purple-500' : 
                          'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {item.type === 'photo' && <ImageIcon className="w-5 h-5" />}
                          {item.type === 'video' && <Video className="w-5 h-5" />}
                          {item.type === 'text' && <Type className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-white/80 line-clamp-2 font-bold mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.text || (item.type === 'photo' ? 'منشور صورة' : 'منشور فيديو') }} />
                          <div className="flex items-center gap-3 text-[10px] text-white/30 font-bold">
                            <span>{new Date(item.createdAt?.seconds * 1000).toLocaleString('ar-EG')}</span>
                            <span className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="uppercase">{item.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => handleResend(item)}
                          className="p-2 bg-primary/10 text-primary rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white"
                          title="إعادة استخدام المنشور"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteMessage(item.messageId, item.id)}
                          className="p-2 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                          title="حذف من القناة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Selector Modal */}
      <AnimatePresence>
        {showProductSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-bg-card border border-white/10 rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">اختر منتجاً للنشر</h3>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">سيتم ملء البيانات تلقائياً</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowProductSelector(false)}
                  className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all"
                >
                  <CloseIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="relative mb-6">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                  <input 
                    type="text"
                    placeholder="ابحث عن منتج بالاسم..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pr-12 pl-6 text-white font-bold focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {products
                    .filter(p => p.name_ar.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(product => (
                      <button
                        key={product.id}
                        onClick={() => useTemplate('product', product)}
                        className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group text-right"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-black shrink-0">
                          <img 
                            src={product.images[0]} 
                            alt="" 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">{product.name_ar}</div>
                          <div className="text-xs text-primary font-black mt-1">{product.price.toLocaleString()} د.ع</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-all">
                          <Check className="w-5 h-5" />
                        </div>
                      </button>
                    ))}
                  {products.length === 0 && (
                    <div className="text-center py-10 text-white/20">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-10" />
                      <p className="text-sm font-bold">لا توجد منتجات متوفرة</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TelegramManager;
