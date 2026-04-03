import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { MessageSquare, X, Send, Loader2, Search, MapPin, BrainCircuit, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string; type?: 'search' | 'map' | 'thinking' }[]>([
    { role: 'ai', content: 'مرحباً بك في دكان! أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      let responseText = '';
      let type: 'search' | 'map' | 'thinking' | undefined;

      if (isThinkingMode) {
        // High Thinking Mode
        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: userMessage,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
            systemInstruction: "أنت خبير تقني في متجر دكان. قدم نصائح احترافية ومعمقة حول تجميعات الكمبيوتر وحل المشاكل التقنية المعقدة باللغة العربية."
          },
        });
        responseText = response.text || 'عذراً، لم أتمكن من معالجة طلبك.';
        type = 'thinking';
      } else {
        // Standard Mode with Search and Maps
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: userMessage,
          config: {
            tools: [
              { googleSearch: {} },
              { googleMaps: {} }
            ],
            systemInstruction: "أنت مساعد ذكي لمتجر دكان في العراق. استخدم البحث للعثور على أحدث أخبار الألعاب والتقنية، واستخدم الخرائط لمساعدة المستخدمين في العثور على مواقعنا أو مراكز الشحن القريبة. تحدث باللغة العربية."
          },
        });
        responseText = response.text || 'عذراً، لم أتمكن من معالجة طلبك.';
        
        // Check if tools were used (simplified check for UI feedback)
        if (responseText.toLowerCase().includes('بحث') || responseText.toLowerCase().includes('نتائج')) {
          type = 'search';
        } else if (responseText.toLowerCase().includes('خريطة') || responseText.toLowerCase().includes('موقع')) {
          type = 'map';
        }
      }

      setMessages(prev => [...prev, { role: 'ai', content: responseText, type }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'ai', content: 'حدث خطأ أثناء الاتصال بالمساعد الذكي. يرجى المحاولة مرة أخرى.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-[9999] font-sans" dir="rtl">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-bg-card border border-primary/20 w-[350px] md:w-[400px] h-[550px] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl mb-4"
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-primary to-primary-dark text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-tighter">مساعد دكان</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] opacity-80">متصل الآن</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar bg-bg-main/50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white rounded-tr-none' 
                      : 'bg-bg-card border border-white/5 text-white/80 rounded-tl-none'
                  }`}>
                    {msg.type === 'thinking' && <div className="flex items-center gap-2 text-[10px] text-primary font-black uppercase mb-2"><BrainCircuit className="w-3 h-3" /> تحليل معمق</div>}
                    {msg.type === 'search' && <div className="flex items-center gap-2 text-[10px] text-blue-400 font-black uppercase mb-2"><Search className="w-3 h-3" /> بحث مباشر</div>}
                    {msg.type === 'map' && <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-black uppercase mb-2"><MapPin className="w-3 h-3" /> بيانات المواقع</div>}
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-end">
                  <div className="bg-bg-card border border-white/5 p-4 rounded-2xl rounded-tl-none">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Controls */}
            <div className="p-4 border-t border-white/5 bg-bg-card/50">
              <div className="flex items-center gap-2 mb-3">
                <button 
                  onClick={() => setIsThinkingMode(!isThinkingMode)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${
                    isThinkingMode 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                      : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  <BrainCircuit className="w-3 h-3" />
                  نمط التفكير العميق
                </button>
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="اسألني أي شيء..."
                  className="w-full bg-bg-main border border-white/5 rounded-xl px-4 py-3 pr-12 text-sm text-white outline-none focus:border-primary/50 transition-all"
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-2xl bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 relative group ${isOpen ? 'rotate-90' : ''}`}
      >
        {isOpen ? <X className="w-8 h-8" /> : <MessageSquare className="w-8 h-8" />}
        {!isOpen && (
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full border-4 border-bg-main animate-pulse" />
        )}
        <div className="absolute right-full mr-4 px-4 py-2 bg-bg-card border border-white/5 rounded-xl text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all pointer-events-none">
          تحدث مع مساعدنا الذكي
        </div>
      </button>
    </div>
  );
};

export default AIAssistant;
