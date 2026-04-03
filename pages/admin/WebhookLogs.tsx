
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../src/firebase';
import { collection, query, orderBy, limit, onSnapshot, Timestamp, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { Terminal, Trash2, Clock, Shield, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from 'lucide-react';

interface WebhookLog {
  id: string;
  payload: any;
  headers: any;
  timestamp: Timestamp;
  source: string;
}

const WebhookLogs: React.FC = () => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'webhook_logs'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WebhookLog[];
      setLogs(newLogs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching webhook logs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearLogs = async () => {
    if (!window.confirm('هل أنت متأكد من مسح جميع السجلات؟')) return;
    
    try {
      const snapshot = await getDocs(collection(db, 'webhook_logs'));
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (err) {
      console.error("Error clearing logs:", err);
    }
  };

  const formatDate = (ts: Timestamp) => {
    if (!ts) return 'N/A';
    const date = ts.toDate();
    return new Intl.DateTimeFormat('ar-IQ', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Terminal className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">سجلات الويب هوك</h1>
          </div>
          <p className="text-sm text-white/40 font-bold uppercase tracking-widest mr-15">مراقبة البيانات القادمة من شركات الشحن</p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={clearLogs}
            className="flex items-center gap-2 px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all rounded-xl font-bold text-sm border border-red-500/20"
          >
            <Trash2 className="w-4 h-4" />
            مسح السجلات
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-card border border-white/5 p-6 rounded-3xl space-y-2">
          <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
            <RefreshCw className="w-3 h-3" /> حالة الاتصال
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-2xl font-black text-white italic tracking-tighter">نشط (Live)</p>
          </div>
        </div>
        <div className="bg-bg-card border border-white/5 p-6 rounded-3xl space-y-2">
          <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
            <Terminal className="w-3 h-3" /> إجمالي السجلات
          </div>
          <p className="text-2xl font-black text-white italic tracking-tighter">{logs.length} سجل</p>
        </div>
        <div className="bg-bg-card border border-white/5 p-6 rounded-3xl space-y-2">
          <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
            <Shield className="w-3 h-3" /> المصدر الأساسي
          </div>
          <p className="text-2xl font-black text-white italic tracking-tighter">Heeiz (حيّز)</p>
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-bg-card border border-white/5 rounded-[40px] overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-white/40 font-bold animate-pulse">جاري تحميل السجلات...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/20">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">لا توجد سجلات حالياً</h3>
              <p className="text-sm text-white/40 max-w-xs mx-auto">سيتم عرض البيانات هنا بمجرد وصول أي تحديث من شركة الشحن.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            <AnimatePresence initial={false}>
              {logs.map((log) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group"
                >
                  <div 
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-white italic tracking-tighter">
                          {formatDate(log.timestamp)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                            {log.source}
                          </span>
                          <span className="text-[10px] text-white/30 font-bold">
                            ID: {log.id.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-left hidden md:block">
                        <div className="text-[10px] text-white/20 font-black uppercase tracking-widest">Order ID</div>
                        <div className="text-xs font-bold text-white/60">
                          {log.payload?.vendor_reference_number || log.payload?.reference_number || log.payload?.order_id || 'N/A'}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 group-hover:text-white transition-colors">
                        {expandedLog === log.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {expandedLog === log.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-black/40 border-t border-white/5"
                    >
                      <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Payload */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Payload (JSON)</h4>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(JSON.stringify(log.payload, null, 2));
                                alert('تم نسخ البيانات');
                              }}
                              className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest transition-colors"
                            >
                              Copy JSON
                            </button>
                          </div>
                          <pre className="p-6 bg-black/60 rounded-3xl border border-white/5 text-xs font-mono text-emerald-400 overflow-x-auto custom-scrollbar max-h-[400px]">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </div>

                        {/* Headers */}
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Headers</h4>
                          <div className="p-6 bg-black/60 rounded-3xl border border-white/5 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {Object.entries(log.headers).map(([key, value]) => (
                              <div key={key} className="flex flex-col gap-1 pb-3 border-b border-white/5 last:border-0">
                                <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{key}</span>
                                <span className="text-xs text-white/60 break-all">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebhookLogs;
