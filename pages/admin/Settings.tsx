import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useStore } from '../../src/contexts/StoreContext';
import { StoreSettings } from '../../src/types';
import { Save, Loader2, Phone, Mail, MapPin, Facebook, Instagram, Youtube, MessageCircle, Globe, Image as ImageIcon, Settings as SettingsIcon, Target } from 'lucide-react';

const AdminSettings: React.FC = () => {
  const { db: storeDb } = useStore();
  const [settings, setSettings] = useState<StoreSettings & { shippingPrices?: Record<string, number> }>({
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    facebook: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    logoUrl: '',
    heroUrl: '',
    shippingPrices: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(storeDb, 'settings', 'store');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as StoreSettings);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await setDoc(doc(storeDb, 'settings', 'store'), settings);
      setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' });
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء حفظ الإعدادات' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">إعدادات المتجر</h2>
        <p className="opacity-40 text-sm">تعديل معلومات التواصل وحسابات السوشيال ميديا</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {message && (
          <div className={`p-4 rounded-2xl text-sm font-bold ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Branding */}
          <div className="p-8 bg-[var(--color-bg-card)] rounded-3xl border border-white/5 space-y-6 md:col-span-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <ImageIcon className="w-5 h-5 text-primary" /> الهوية البصرية
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs opacity-40 uppercase font-bold">رابط الشعار (Logo URL)</label>
                  <input 
                    type="text"
                    value={settings.logoUrl}
                    onChange={(e) => setSettings({...settings, logoUrl: e.target.value})}
                    className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                {settings.logoUrl && (
                  <div className="p-4 bg-bg-main rounded-2xl border border-white/5 flex items-center justify-center">
                    <img src={settings.logoUrl} alt="Logo Preview" className="h-20 object-contain" />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs opacity-40 uppercase font-bold">رابط غلاف الهيرو الثابت (Hero URL)</label>
                  <input 
                    type="text"
                    value={settings.heroUrl}
                    onChange={(e) => setSettings({...settings, heroUrl: e.target.value})}
                    className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                    placeholder="https://example.com/hero.jpg"
                  />
                </div>
                {settings.heroUrl && (
                  <div className="p-4 bg-bg-main rounded-2xl border border-white/5 overflow-hidden">
                    <img src={settings.heroUrl} alt="Hero Preview" className="w-full h-32 object-cover rounded-xl" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="p-8 bg-[var(--color-bg-card)] rounded-3xl border border-white/5 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Phone className="w-5 h-5 text-primary" /> معلومات التواصل
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs opacity-40 uppercase font-bold">رقم الهاتف</label>
                <input 
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({...settings, phone: e.target.value})}
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  placeholder="07XXXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs opacity-40 uppercase font-bold">رقم الواتساب</label>
                <input 
                  type="text"
                  value={settings.whatsapp}
                  onChange={(e) => setSettings({...settings, whatsapp: e.target.value})}
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  placeholder="07XXXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs opacity-40 uppercase font-bold">البريد الإلكتروني</label>
                <input 
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({...settings, email: e.target.value})}
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  placeholder="info@dukan.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs opacity-40 uppercase font-bold">العنوان</label>
                <input 
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({...settings, address: e.target.value})}
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  placeholder="بغداد - شارع الصناعة"
                />
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="p-8 bg-[var(--color-bg-card)] rounded-3xl border border-white/5 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary" /> مواقع التواصل الاجتماعي
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs opacity-40 uppercase font-bold flex items-center gap-2">
                  <Facebook className="w-3 h-3" /> ميتا
                </label>
                <input 
                  type="text"
                  value={settings.facebook}
                  onChange={(e) => setSettings({...settings, facebook: e.target.value})}
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  placeholder="رابط الصفحة"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs opacity-40 uppercase font-bold flex items-center gap-2">
                  <Instagram className="w-3 h-3" /> إنستغرام
                </label>
                <input 
                  type="text"
                  value={settings.instagram}
                  onChange={(e) => setSettings({...settings, instagram: e.target.value})}
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  placeholder="رابط الحساب"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs opacity-40 uppercase font-bold flex items-center gap-2">
                  <MessageCircle className="w-3 h-3" /> تيك توك
                </label>
                <input 
                  type="text"
                  value={settings.tiktok}
                  onChange={(e) => setSettings({...settings, tiktok: e.target.value})}
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  placeholder="رابط الحساب"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs opacity-40 uppercase font-bold flex items-center gap-2">
                  <Youtube className="w-3 h-3" /> يوتيوب
                </label>
                <input 
                  type="text"
                  value={settings.youtube}
                  onChange={(e) => setSettings({...settings, youtube: e.target.value})}
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  placeholder="رابط القناة"
                />
              </div>
            </div>
          </div>

          {/* Marketing & Tracking */}
          <div className="p-8 bg-[var(--color-bg-card)] rounded-3xl border border-white/5 space-y-6 md:col-span-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Target className="w-5 h-5 text-primary" /> التسويق والتتبع (Pixels)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-xs opacity-40 uppercase font-bold flex items-center gap-2">
                  <Facebook className="w-3 h-3" /> Meta Pixel ID
                </label>
                <input 
                  type="text"
                  value={settings.metaPixelId || ''}
                  onChange={(e) => setSettings({...settings, metaPixelId: e.target.value})}
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  placeholder="1234567890"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs opacity-40 uppercase font-bold flex items-center gap-2">
                  <MessageCircle className="w-3 h-3" /> TikTok Pixel ID
                </label>
                <input 
                  type="text"
                  value={settings.tiktokPixelId || ''}
                  onChange={(e) => setSettings({...settings, tiktokPixelId: e.target.value})}
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  placeholder="CXXXXXXXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs opacity-40 uppercase font-bold flex items-center gap-2">
                  <Globe className="w-3 h-3" /> Snapchat Pixel ID
                </label>
                <input 
                  type="text"
                  value={settings.snapchatPixelId || ''}
                  onChange={(e) => setSettings({...settings, snapchatPixelId: e.target.value})}
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                />
              </div>
            </div>
            <p className="text-[10px] opacity-30">أدخل معرفات البكسل فقط (IDs) وسيتم تفعيل التتبع تلقائياً في صفحة الهبوط.</p>
          </div>

          {/* Store Status */}
          <div className="p-8 bg-[var(--color-bg-card)] rounded-3xl border border-white/5 space-y-6 md:col-span-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <SettingsIcon className="w-5 h-5 text-primary" /> حالة المتجر
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs opacity-40 uppercase font-bold">حالة المتجر الحالية</label>
                <select 
                  value={settings.storeStatus || 'open'}
                  onChange={(e) => setSettings({...settings, storeStatus: e.target.value as any})}
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                >
                  <option value="open">مفتوح (يعمل بشكل طبيعي)</option>
                  <option value="closed">مغلق (لا يمكن الطلب)</option>
                  <option value="maintenance">صيانة (رسالة موعد الافتتاح)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs opacity-40 uppercase font-bold">تاريخ افتتاح المتجر (لحساب عمر المتجر)</label>
                <input 
                  type="date"
                  value={settings.openingDate || ''}
                  onChange={(e) => setSettings({...settings, openingDate: e.target.value})}
                  className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>



        </div>

        <div className="flex justify-end">
          <button 
            type="submit"
            disabled={saving}
            className="px-12 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-all flex items-center gap-3 shadow-xl shadow-primary/20"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            حفظ جميع الإعدادات
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettings;
