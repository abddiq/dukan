
import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../src/firebase';
import { StoreSettings } from '../../src/types';
import { Palette, Loader2, CheckCircle2, Moon, Snowflake, Layout } from 'lucide-react';

const AdminThemes: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'store'));
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

  const handleThemeChange = async (theme: 'default' | 'ramadan' | 'winter') => {
    setUpdating(theme);
    try {
      await updateDoc(doc(db, 'settings', 'store'), { theme });
      setSettings(prev => prev ? { ...prev, theme } : null);
    } catch (error) {
      console.error("Error updating theme:", error);
      alert('حدث خطأ أثناء تحديث الثيم');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  const currentTheme = settings?.theme || 'default';

  const themes = [
    {
      id: 'default',
      name: 'الثيم الافتراضي',
      desc: 'المظهر الأصلي للمتجر (بنفسجي وأسود)',
      icon: <Layout className="w-8 h-8" />,
      color: 'bg-primary'
    },
    {
      id: 'ramadan',
      name: 'الثيم الرمضاني',
      desc: 'أجواء رمضانية مع أيقونات الهلال والفوانيس',
      icon: <Moon className="w-8 h-8" />,
      color: 'bg-amber-500'
    },
    {
      id: 'winter',
      name: 'الثيم الشتوي',
      desc: 'أجواء شتوية مع أيقونات الثلج واللون الأزرق',
      icon: <Snowflake className="w-8 h-8" />,
      color: 'bg-blue-500'
    }
  ];

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">الثيمات <span className="text-primary">السنوية</span></h1>
        <p className="opacity-40 text-sm mt-2">تغيير مظهر المتجر حسب المناسبات السنوية</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => handleThemeChange(t.id as any)}
            disabled={updating !== null}
            className={`relative p-8 rounded-[2.5rem] border-2 transition-all text-right flex flex-col gap-6 group overflow-hidden ${
              currentTheme === t.id 
                ? 'bg-bg-card border-primary shadow-2xl shadow-primary/20' 
                : 'bg-bg-card border-white/5 hover:border-white/10'
            }`}
          >
            {/* Background Glow */}
            <div className={`absolute -top-24 -right-24 w-48 h-48 opacity-10 blur-[80px] rounded-full transition-all group-hover:opacity-20 ${t.color}`}></div>

            <div className="flex items-center justify-between relative z-10">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                currentTheme === t.id ? t.color + ' text-white' : 'bg-white/5 text-white/40'
              }`}>
                {updating === t.id ? <Loader2 className="w-8 h-8 animate-spin" /> : t.icon}
              </div>
              {currentTheme === t.id && (
                <CheckCircle2 className="w-6 h-6 text-primary" />
              )}
            </div>

            <div className="space-y-2 relative z-10">
              <h3 className={`text-xl font-black ${currentTheme === t.id ? 'text-white' : 'text-white/60'}`}>
                {t.name}
              </h3>
              <p className="text-xs opacity-40 font-medium leading-relaxed">
                {t.desc}
              </p>
            </div>

            {currentTheme === t.id && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary"></div>
            )}
          </button>
        ))}
      </div>

      <div className="bg-bg-card border border-white/5 rounded-[2rem] p-8 flex items-center gap-6">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
          <Palette className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-white">ملاحظة حول الثيمات</h4>
          <p className="text-sm opacity-40">تغيير الثيم سيؤثر على جميع واجهات المتجر للعملاء فوراً. يشمل ذلك الألوان، الأيقونات، وبعض العناصر الزخرفية.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminThemes;
