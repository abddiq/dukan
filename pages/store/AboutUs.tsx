
import React, { useState, useEffect } from 'react';
import { db } from '../../src/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { StoreSettings } from '../../src/types';
import { Loader2, Info, ShieldCheck, Award, Users, Cpu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const StoreAboutUs: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-16 space-y-20">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 text-primary mb-4">
          <Info className="w-10 h-10" />
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-white italic uppercase tracking-tighter">من <span className="text-primary">نحن</span></h1>
        <p className="text-xl opacity-60 max-w-2xl mx-auto">تعرف على قصة دكان ورؤيتنا لمستقبل التجارة الإلكترونية في العراق</p>
      </section>

      {/* Main Content */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="relative">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 blur-[100px] rounded-full"></div>
          <div className="bg-[var(--color-bg-card)] border border-white/5 p-10 rounded-[3rem] relative z-10 space-y-8">
            <div className="prose prose-invert max-w-none">
              <div className="markdown-body text-lg leading-relaxed opacity-80">
                <ReactMarkdown>
                  {settings?.aboutUs_ar || 'نحن متجر دكان، وجهتكم الأولى لكل ما تحتاجونه في العراق. نسعى دائماً لتقديم أفضل المنتجات والخدمات لعملائنا.'}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { icon: <ShieldCheck className="w-8 h-8" />, title: 'ضمان حقيقي', desc: 'نقدم ضماناً حقيقياً على كافة القطع لضمان راحة بالكم.' },
            { icon: <Award className="w-8 h-8" />, title: 'جودة عالمية', desc: 'نتعامل مع أفضل الماركات العالمية لضمان أعلى أداء.' },
            { icon: <Users className="w-8 h-8" />, title: 'فريق خبير', desc: 'فريقنا مكون من خبراء تقنيين جاهزين لمساعدتكم دائماً.' },
            { icon: <Cpu className="w-8 h-8" />, title: 'أحدث التقنيات', desc: 'نواكب دائماً أحدث الإصدارات والتقنيات في عالم الهاردوير.' }
          ].map((item, i) => (
            <div key={i} className="p-8 bg-white/5 border border-white/5 rounded-[2rem] space-y-4 hover:border-primary/30 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold text-white">{item.title}</h3>
              <p className="text-sm opacity-50 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vision Section */}
      <section className="bg-gradient-to-br from-primary to-primary-dark rounded-[3rem] p-12 md:p-20 text-center space-y-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-white rounded-full blur-3xl"></div>
        </div>
        <h2 className="text-4xl md:text-6xl font-black text-white italic uppercase tracking-tighter relative z-10">رؤيتنا</h2>
        <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto font-medium leading-relaxed relative z-10">
          أن نكون المرجع الأول والمنصة الأكثر ثقة لبناء أجهزة الكمبيوتر الاحترافية وتطوير مجتمع اللاعبين والمبدعين في العراق، من خلال توفير أحدث التقنيات بأسعار تنافسية وخدمات ما بعد البيع المتميزة.
        </p>
      </section>
    </div>
  );
};

export default StoreAboutUs;
