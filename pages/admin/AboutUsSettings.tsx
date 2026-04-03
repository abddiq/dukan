
import React, { useState, useEffect } from 'react';
import { db } from '../../src/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { StoreSettings } from '../../src/types';
import { Info, Save, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const AdminAboutUsSettings: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aboutUs, setAboutUs] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'store'));
        if (docSnap.exists()) {
          const data = docSnap.data() as StoreSettings;
          setSettings(data);
          setAboutUs(data.aboutUs_ar || '');
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'settings', 'store'), {
        aboutUs_ar: aboutUs
      });
      alert('تم حفظ معلومات "من نحن" بنجاح');
    } catch (error) {
      console.error("Error updating about us:", error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAI = async () => {
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `اكتب نصاً تعريفياً احترافياً ومميزاً لمتجر "PCTHRONE" المتخصص في بيع قطع الكمبيوتر وتجهيزات الألعاب في العراق. ركز على الجودة، الضمان، والاحترافية. النص يجب أن يكون باللغة العربية وجذاباً للعملاء.`,
      });
      if (response.text) {
        setAboutUs(response.text);
      }
    } catch (err) {
      console.error("AI Generation failed:", err);
      alert("فشل توليد النص بالذكاء الاصطناعي.");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">إعدادات <span className="text-primary">من نحن</span></h1>
          <p className="opacity-40 text-sm mt-2">قم بتعديل النص التعريفي لمتجرك الذي يظهر للعملاء</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-all flex items-center gap-3 shadow-2xl shadow-primary/40 uppercase italic tracking-widest disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          حفظ التغييرات
        </button>
      </div>

      <div className="bg-bg-card border border-white/5 rounded-[2.5rem] p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <Info className="w-6 h-6 text-primary" />
            محتوى صفحة "من نحن"
          </h3>
          <button 
            onClick={handleGenerateAI}
            disabled={aiLoading}
            className="text-xs flex items-center gap-2 text-primary hover:bg-primary/10 px-4 py-2 rounded-xl transition-all font-bold disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            توليد نص احترافي بالذكاء الاصطناعي
          </button>
        </div>

        <div className="space-y-4">
          <textarea 
            className="w-full bg-bg-main border border-white/10 rounded-2xl px-6 py-4 h-96 text-white outline-none focus:border-primary transition-all leading-relaxed"
            placeholder="اكتب هنا قصة متجرك، رؤيتكم، وأهدافكم..."
            value={aboutUs}
            onChange={(e) => setAboutUs(e.target.value)}
          />
          <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
            <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs opacity-60 leading-relaxed">
              نصيحة: اجعل النص يركز على الثقة والضمان والاحترافية. العملاء في العراق يبحثون دائماً عن الجودة والضمان الحقيقي.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAboutUsSettings;
