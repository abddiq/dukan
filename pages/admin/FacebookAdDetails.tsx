import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, FileText, Activity, DollarSign, MousePointerClick, Eye, MessageCircle, Calendar, Edit3, Trash2, ExternalLink, PlayCircle, Image as ImageIcon, History, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { fetchAdDetails, updateAd, fetchAdComments } from '../../src/services/facebookAdsService';

const DUMMY_LOGS = [
  { id: 'log_1', action: 'تعديل الميزانية', details: 'تم زيادة الميزانية اليومية من $10 إلى $20', performedBy: 'أحمد (مدير)', timestamp: '2026-03-25T14:30:00Z' },
  { id: 'log_2', action: 'تغيير الحالة', details: 'تم تفعيل الإعلان', performedBy: 'النظام', timestamp: '2026-03-20T09:15:00Z' },
  { id: 'log_3', action: 'إنشاء الإعلان', details: 'تم إنشاء الإعلان ورفعه للمراجعة', performedBy: 'أحمد (مدير)', timestamp: '2026-03-20T08:00:00Z' },
];

const FacebookAdDetails: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get('account_id');
  const accessToken = searchParams.get('token');
  
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'messages' | 'edit'>('overview');
  const [ad, setAd] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit state
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id && accessToken) {
      loadAdDetails();
    } else {
      setError('معلومات المصادقة مفقودة. يرجى العودة إلى مدير الإعلانات.');
      setLoading(false);
    }
  }, [id, accessToken]);

  const loadAdDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdDetails(id!, accessToken!);
      setAd(data);
      setEditName(data.name);
      setEditStatus(data.status);
      
      // Load comments
      const commentsData = await fetchAdComments(id!, accessToken!);
      setComments(commentsData);
    } catch (err: any) {
      const errorMsg = err.message || 'فشل في جلب تفاصيل الإعلان';
      setError(errorMsg);
      
      // If error is related to token validation, we should suggest going back to update it
      if (errorMsg.toLowerCase().includes('access token') || errorMsg.toLowerCase().includes('expired')) {
        setError('انتهت صلاحية رمز الوصول (Access Token). يرجى العودة لمدير الإعلانات لتحديثه.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAd = async () => {
    if (!id || !accessToken) return;
    setSaving(true);
    try {
      await updateAd(id, { name: editName, status: editStatus }, accessToken);
      await loadAdDetails();
      alert('تم تحديث الإعلان بنجاح');
    } catch (err: any) {
      const errorMsg = err.message || 'فشل في تحديث الإعلان';
      alert(errorMsg);
      if (errorMsg.toLowerCase().includes('access token') || errorMsg.toLowerCase().includes('expired')) {
        setError('انتهت صلاحية رمز الوصول. يرجى العودة لمدير الإعلانات.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center justify-center text-center gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <div>
          <h2 className="text-xl font-bold text-red-500 mb-2">خطأ في تحميل الإعلان</h2>
          <p className="text-red-400/80">{error}</p>
        </div>
        <Link to="/admin/facebook-ads" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors mt-4">
          العودة لمدير الإعلانات
        </Link>
      </div>
    );
  }

  // Extract metrics safely
  const spend = parseFloat(ad.insights?.data?.[0]?.spend || '0').toFixed(2);
  const actions = ad.insights?.data?.[0]?.actions || [];
  const results = parseInt(actions.find((a: any) => a.action_type === 'purchase')?.value || '0');
  const clicks = parseInt(ad.insights?.data?.[0]?.clicks || '0');
  const impressions = parseInt(ad.insights?.data?.[0]?.impressions || '0');
  const cpc = parseFloat(ad.insights?.data?.[0]?.cpc || '0').toFixed(2);
  const ctr = parseFloat(ad.insights?.data?.[0]?.ctr || '0').toFixed(2);
  const roas = parseFloat(spend) > 0 ? ((results * 100) / parseFloat(spend)).toFixed(2) : '0.00';

  // Extract creative safely
  const creative = ad.adcreatives?.data?.[0] || {};
  const primaryText = creative.body || 'لا يوجد نص أساسي';
  const headline = creative.title || 'لا يوجد عنوان';
  const creativeUrl = creative.image_url || creative.thumbnail_url || 'https://placehold.co/600x600/151B2B/FFFFFF?text=No+Image';
  const creativeType = creative.video_id ? 'video' : 'image';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-bg-card border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <Link to="/admin/fb-ads" className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors">
            <ChevronRight className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-black text-white">{ad.name}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${ad.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                {ad.status === 'ACTIVE' ? 'نشط' : ad.status}
              </span>
            </div>
            <p className="text-sm text-white/40 font-mono">ID: {ad.id} | Campaign: {ad.campaign?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAdDetails} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-colors">
            <RefreshCw className="w-4 h-4" />
            تحديث البيانات
          </button>
          {accountId && (
            <a href={`https://business.facebook.com/adsmanager/manage/ads?act=${accountId}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[#1877F2] hover:bg-[#1877F2]/80 text-white rounded-xl text-sm font-bold transition-colors">
              <ExternalLink className="w-4 h-4" />
              فتح في مدير الإعلانات
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-bg-card border border-white/5 p-2 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
        >
          <Activity className="w-4 h-4" />
          نظرة عامة وأداء
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'logs' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
        >
          <History className="w-4 h-4" />
          سجل التعديلات (Log)
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'messages' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
        >
          <MessageCircle className="w-4 h-4" />
          الرسائل والتعليقات
        </button>
        <button
          onClick={() => setActiveTab('edit')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'edit' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
        >
          <Edit3 className="w-4 h-4" />
          تعديل الإعلان
        </button>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metrics */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-bg-card border border-white/5 rounded-2xl p-4">
                <p className="text-xs font-bold text-white/40 uppercase mb-2">الإنفاق</p>
                <h3 className="text-xl font-black text-white">${spend}</h3>
              </div>
              <div className="bg-bg-card border border-white/5 rounded-2xl p-4">
                <p className="text-xs font-bold text-white/40 uppercase mb-2">النتائج</p>
                <h3 className="text-xl font-black text-emerald-400">{results}</h3>
              </div>
              <div className="bg-bg-card border border-white/5 rounded-2xl p-4">
                <p className="text-xs font-bold text-white/40 uppercase mb-2">ROAS</p>
                <h3 className="text-xl font-black text-emerald-400">{roas}x</h3>
              </div>
              <div className="bg-bg-card border border-white/5 rounded-2xl p-4">
                <p className="text-xs font-bold text-white/40 uppercase mb-2">النقرات</p>
                <h3 className="text-xl font-black text-white">{clicks}</h3>
              </div>
              <div className="bg-bg-card border border-white/5 rounded-2xl p-4">
                <p className="text-xs font-bold text-white/40 uppercase mb-2">الظهور</p>
                <h3 className="text-xl font-black text-white">{impressions.toLocaleString()}</h3>
              </div>
              <div className="bg-bg-card border border-white/5 rounded-2xl p-4">
                <p className="text-xs font-bold text-white/40 uppercase mb-2">تكلفة النقرة (CPC)</p>
                <h3 className="text-xl font-black text-white">${cpc}</h3>
              </div>
              <div className="bg-bg-card border border-white/5 rounded-2xl p-4">
                <p className="text-xs font-bold text-white/40 uppercase mb-2">نسبة النقر (CTR)</p>
                <h3 className="text-xl font-black text-white">{ctr}%</h3>
              </div>
            </div>

            <div className="bg-bg-card border border-white/5 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">مخطط الأداء (قريباً)</h3>
              <div className="h-64 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 border-dashed">
                <p className="text-white/40 font-bold">سيتم عرض المخطط البياني هنا</p>
              </div>
            </div>
          </div>

          {/* Creative Preview */}
          <div className="bg-bg-card border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              {creativeType === 'video' ? <PlayCircle className="w-5 h-5 text-blue-500" /> : <ImageIcon className="w-5 h-5 text-blue-500" />}
              معاينة الإعلان
            </h3>
            <div className="bg-white rounded-xl overflow-hidden shadow-lg">
              <div className="p-3 flex items-center gap-2 border-b border-black/5">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div>
                  <div className="text-xs font-bold text-black">PC Throne</div>
                  <div className="text-[10px] text-gray-500">مُموّل</div>
                </div>
              </div>
              <div className="p-3 text-sm text-black" dir="rtl">
                {primaryText}
              </div>
              <img src={creativeUrl} alt="Ad Creative" className="w-full h-auto" />
              <div className="p-3 bg-gray-50 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase">dukan.com</div>
                  <div className="text-sm font-bold text-black">{headline}</div>
                </div>
                <button className="px-4 py-1.5 bg-gray-200 text-black text-xs font-bold rounded-md">تسوق الآن</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-bg-card border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">سجل التعديلات والنشاطات (Audit Log)</h3>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
            {DUMMY_LOGS.map((log, index) => (
              <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-bg-main bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-white">{log.action}</h4>
                    <span className="text-xs text-white/40 font-mono">{new Date(log.timestamp).toLocaleString('ar-IQ')}</span>
                  </div>
                  <p className="text-sm text-white/60 mb-2">{log.details}</p>
                  <div className="text-xs text-blue-400 font-bold">بواسطة: {log.performedBy}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="bg-bg-card border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">التعليقات على هذا الإعلان</h3>
          {comments.length === 0 ? (
            <div className="text-center py-10 text-white/40">
              لا توجد تعليقات حتى الآن
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className={`p-4 rounded-xl border ${comment.is_hidden ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/5'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {comment.from?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{comment.from?.name || 'مستخدم غير معروف'}</h4>
                        <span className="text-xs text-white/40 font-mono">{new Date(comment.created_time).toLocaleString('ar-IQ')}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-white/80 mt-2">{comment.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'edit' && (
        <div className="bg-bg-card border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">تعديل الإعلان (Publishing)</h3>
          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm text-white/60 mb-2">اسم الإعلان</label>
              <input 
                type="text" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">حالة الإعلان</label>
              <select 
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ACTIVE">نشط (ACTIVE)</option>
                <option value="PAUSED">متوقف (PAUSED)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">النص الأساسي (Primary Text) - للقراءة فقط</label>
              <textarea disabled value={primaryText} rows={4} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed"></textarea>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">العنوان (Headline) - للقراءة فقط</label>
              <input type="text" disabled value={headline} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed" />
            </div>
            <div className="flex gap-4 pt-4">
              <button 
                onClick={handleSaveAd}
                disabled={saving || (editName === ad.name && editStatus === ad.status)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                حفظ ونشر التعديلات
              </button>
              <button 
                onClick={() => {
                  setEditName(ad.name);
                  setEditStatus(ad.status);
                }}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacebookAdDetails;
