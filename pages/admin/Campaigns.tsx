import React, { useState, useEffect, useMemo } from 'react';
import { 
  Megaphone, Search, Loader2, AlertCircle, ExternalLink, TrendingUp, 
  MousePointerClick, Eye, DollarSign, Settings, Save, X, 
  BarChart3, ShoppingCart, Target, ArrowUpRight, ArrowDownRight,
  Clock, Calendar, Filter, Download, ChevronRight, ChevronLeft,
  Activity, Users, PieChart as PieChartIcon, RefreshCw
} from 'lucide-react';
import { db } from '../../src/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Cell, Pie
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

interface AdCampaign {
  id: string;
  platform: 'meta' | 'tiktok';
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  objective?: string;
  created_time?: string;
  // Calculated fields from Firestore
  conversions: number;
  revenue: number;
  sessions: number;
  avgScrollDepth: number;
}

interface CampaignDetailsModalProps {
  campaign: AdCampaign;
  onClose: () => void;
  orders: any[];
  sessions: any[];
}

const CampaignDetailsModal: React.FC<CampaignDetailsModalProps> = ({ campaign, onClose, orders, sessions }) => {
  const campaignOrders = useMemo(() => {
    return orders.filter(o => {
      const session = sessions.find(s => s.id === o.sessionId);
      return session?.utmCampaign === campaign.name || session?.utmCampaign === campaign.id;
    });
  }, [campaign, orders, sessions]);

  const campaignSessions = useMemo(() => {
    return sessions.filter(s => s.utmCampaign === campaign.name || s.utmCampaign === campaign.id);
  }, [campaign, sessions]);

  const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
  const cr = campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0;
  const cpa = campaign.conversions > 0 ? campaign.spend / campaign.conversions : 0;
  const roas = campaign.spend > 0 ? campaign.revenue / campaign.spend : 0;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const deviceData = useMemo(() => {
    const counts: Record<string, number> = {};
    campaignSessions.forEach(s => {
      const device = s.deviceInfo?.platform || 'Unknown';
      counts[device] = (counts[device] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [campaignSessions]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${campaign.platform === 'meta' ? 'bg-[#1877F2]/20 text-[#1877F2]' : 'bg-[#00f2fe]/20 text-[#00f2fe]'}`}>
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{campaign.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold opacity-40 uppercase tracking-widest">{campaign.platform}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-xs font-bold opacity-40 uppercase tracking-widest">{campaign.objective}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl text-white/40 hover:text-white transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-8 space-y-10 scrollbar-hide">
          {/* Main Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: 'الإنفاق', value: `$${campaign.spend.toFixed(2)}`, icon: <DollarSign className="w-4 h-4" />, color: 'text-blue-400' },
              { label: 'الظهور', value: campaign.impressions.toLocaleString(), icon: <Eye className="w-4 h-4" />, color: 'text-purple-400' },
              { label: 'النقرات', value: campaign.clicks.toLocaleString(), icon: <MousePointerClick className="w-4 h-4" />, color: 'text-amber-400' },
              { label: 'التحويلات', value: campaign.conversions, icon: <ShoppingCart className="w-4 h-4" />, color: 'text-emerald-400' },
              { label: 'CPA', value: `$${cpa.toFixed(2)}`, icon: <Target className="w-4 h-4" />, color: 'text-pink-400' },
              { label: 'CTR', value: `${ctr.toFixed(2)}%`, icon: <Activity className="w-4 h-4" />, color: 'text-blue-500' },
            ].map((m, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1">
                <div className="flex items-center gap-2 opacity-40">
                  {m.icon}
                  <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                </div>
                <div className={`text-xl font-black ${m.color}`}>{m.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Funnel Analysis */}
            <div className="lg:col-span-2 bg-white/5 border border-white/5 rounded-[2rem] p-8 space-y-6">
              <h4 className="text-lg font-black text-white italic uppercase tracking-tight flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                تحليل القمع التسويقي (Funnel)
              </h4>
              <div className="space-y-6">
                {[
                  { label: 'الظهور إلى نقرات (CTR)', value: ctr, sub: `${campaign.clicks} نقرة من ${campaign.impressions} ظهور`, color: 'bg-blue-500' },
                  { label: 'النقرات إلى جلسات', value: (campaignSessions.length / (campaign.clicks || 1)) * 100, sub: `${campaignSessions.length} جلسة من ${campaign.clicks} نقرة`, color: 'bg-purple-500' },
                  { label: 'الجلسات إلى مبيعات (CR)', value: (campaignOrders.length / (campaignSessions.length || 1)) * 100, sub: `${campaignOrders.length} طلب من ${campaignSessions.length} جلسة`, color: 'bg-emerald-500' },
                ].map((f, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-sm font-bold text-white">{f.label}</div>
                        <div className="text-[10px] opacity-40 font-bold uppercase">{f.sub}</div>
                      </div>
                      <div className="text-lg font-black text-white">{f.value.toFixed(2)}%</div>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(f.value, 100)}%` }}
                        transition={{ duration: 1, delay: i * 0.2 }}
                        className={`h-full ${f.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Device Breakdown */}
            <div className="bg-white/5 border border-white/5 rounded-[2rem] p-8 space-y-6">
              <h4 className="text-lg font-black text-white italic uppercase tracking-tight flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-purple-500" />
                توزيع الأجهزة
              </h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {deviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {deviceData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] font-bold text-white/60 truncate">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Behavior Metrics */}
            <div className="bg-white/5 border border-white/5 rounded-[2rem] p-8 space-y-6">
              <h4 className="text-lg font-black text-white italic uppercase tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-500" />
                سلوك الزوار
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-white/5 rounded-2xl text-center space-y-2">
                  <div className="text-3xl font-black text-white">{campaign.avgScrollDepth.toFixed(0)}%</div>
                  <div className="text-[10px] font-black opacity-40 uppercase tracking-widest">متوسط عمق التصفح</div>
                </div>
                <div className="p-6 bg-white/5 rounded-2xl text-center space-y-2">
                  <div className="text-3xl font-black text-white">
                    {campaignSessions.length > 0 
                      ? (campaignSessions.reduce((sum, s) => sum + (s.interactions?.length || 0), 0) / campaignSessions.length).toFixed(1)
                      : 0}
                  </div>
                  <div className="text-[10px] font-black opacity-40 uppercase tracking-widest">متوسط التفاعلات</div>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white/5 border border-white/5 rounded-[2rem] p-8 space-y-6">
              <h4 className="text-lg font-black text-white italic uppercase tracking-tight flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-500" />
                آخر الطلبات من هذه الحملة
              </h4>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2 scrollbar-hide">
                {campaignOrders.slice(0, 10).map((order, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                    <div>
                      <div className="font-bold text-white text-sm">{order.customer?.name}</div>
                      <div className="text-[10px] opacity-40 font-bold">{order.orderNumber} | {order.customer?.city}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-400 text-sm">{order.totalAmount.toLocaleString()} د.ع</div>
                      <div className="text-[10px] opacity-40 font-bold">{new Date(order.createdAt?.toDate?.() || order.createdAt).toLocaleDateString('ar-IQ')}</div>
                    </div>
                  </div>
                ))}
                {campaignOrders.length === 0 && (
                  <div className="text-center py-10 opacity-40 italic">لا توجد طلبات مرتبطة بهذه الحملة حالياً</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const AdminCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'meta' | 'tiktok'>('all');
  const [paymentIssue, setPaymentIssue] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<AdCampaign | null>(null);

  const [lastSync, setLastSync] = useState<Date | null>(null);

  const [metaToken, setMetaToken] = useState(() => localStorage.getItem('META_ACCESS_TOKEN') || (import.meta as any).env.VITE_META_ACCESS_TOKEN || '');
  const [metaAccountId, setMetaAccountId] = useState(() => localStorage.getItem('META_AD_ACCOUNT_ID') || (import.meta as any).env.VITE_META_AD_ACCOUNT_ID || '');
  const [tiktokToken, setTiktokToken] = useState(() => localStorage.getItem('TIKTOK_ACCESS_TOKEN') || (import.meta as any).env.VITE_TIKTOK_ACCESS_TOKEN || '');
  const [tiktokAccountId, setTiktokAccountId] = useState(() => localStorage.getItem('TIKTOK_AD_ACCOUNT_ID') || (import.meta as any).env.VITE_TIKTOK_AD_ACCOUNT_ID || '');

  const [showSettings, setShowSettings] = useState(false);
  const [formMetaToken, setFormMetaToken] = useState(metaToken);
  const [formMetaAccountId, setFormMetaAccountId] = useState(metaAccountId);
  const [formTiktokToken, setFormTiktokToken] = useState(tiktokToken);
  const [formTiktokAccountId, setFormTiktokAccountId] = useState(tiktokAccountId);

  const isConfigured = metaToken || (tiktokToken && tiktokAccountId);

  const handleSaveCredentials = () => {
    localStorage.setItem('META_ACCESS_TOKEN', formMetaToken);
    localStorage.setItem('META_AD_ACCOUNT_ID', formMetaAccountId);
    localStorage.setItem('TIKTOK_ACCESS_TOKEN', formTiktokToken);
    localStorage.setItem('TIKTOK_AD_ACCOUNT_ID', formTiktokAccountId);
    setMetaToken(formMetaToken);
    setMetaAccountId(formMetaAccountId);
    setTiktokToken(formTiktokToken);
    setTiktokAccountId(formTiktokAccountId);
    setShowSettings(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!isConfigured) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setPaymentIssue(null);
      
      try {
        // 1. Fetch Firestore Data (Orders & Sessions)
        const [ordersSnap, sessionsSnap] = await Promise.all([
          getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'landing_page_sessions'), orderBy('entryTime', 'desc')))
        ]);

        const allOrders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        const allSessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        
        setOrders(allOrders);
        setSessions(allSessions);

        // 2. Fetch Ad Platform Data
        const allCampaigns: AdCampaign[] = [];
        let currentMetaAccountId = metaAccountId;

        // Meta Auto-detect & Status Check
        if (metaToken) {
          if (!currentMetaAccountId) {
            try {
              const adAccountsRes = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status&access_token=${metaToken}`);
              const adAccountsData = await adAccountsRes.json();
              if (adAccountsData.data?.length > 0) {
                currentMetaAccountId = adAccountsData.data[0].id;
              }
            } catch (err) { console.error(err); }
          }

          if (currentMetaAccountId) {
            try {
              // Get Account Status
              const accountRes = await fetch(`https://graph.facebook.com/v19.0/${currentMetaAccountId}?fields=account_status,disable_reason,balance,currency&access_token=${metaToken}`);
              const accountData = await accountRes.json();
              if (accountData.account_status && [2, 3, 7].includes(accountData.account_status)) {
                setPaymentIssue(prev => (prev ? prev + ' | ' : '') + `Meta Account Issue: ${accountData.account_status === 3 ? 'Unsettled Balance' : accountData.account_status === 2 ? 'Disabled' : 'Pending Review'}`);
              }

              // Get Campaigns with Insights
              const filtering = encodeURIComponent(JSON.stringify([{field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED', 'PENDING_REVIEW', 'DISAPPROVED']}]));
              const res = await fetch(`https://graph.facebook.com/v19.0/${currentMetaAccountId}/campaigns?fields=id,name,effective_status,objective,created_time,insights.date_preset(maximum){spend,impressions,clicks}&filtering=${filtering}&limit=100&access_token=${metaToken}`);
              const data = await res.json();
              
              if (data.data) {
                data.data.forEach((camp: any) => {
                  const insights = camp.insights?.data?.[0] || {};
                  
                  // Match with Firestore
                  const campSessions = allSessions.filter(s => s.utmCampaign === camp.name || s.utmCampaign === camp.id);
                  const campOrders = allOrders.filter(o => {
                    const session = allSessions.find(s => s.id === o.sessionId);
                    return session?.utmCampaign === camp.name || session?.utmCampaign === camp.id;
                  });

                  allCampaigns.push({
                    id: camp.id,
                    platform: 'meta',
                    name: camp.name,
                    status: camp.effective_status,
                    objective: camp.objective,
                    created_time: camp.created_time,
                    spend: parseFloat(insights.spend || '0'),
                    impressions: parseInt(insights.impressions || '0'),
                    clicks: parseInt(insights.clicks || '0'),
                    conversions: campOrders.length,
                    revenue: campOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
                    sessions: campSessions.length,
                    avgScrollDepth: campSessions.length > 0 ? campSessions.reduce((sum, s) => sum + (s.scrollDepth || 0), 0) / campSessions.length : 0
                  });
                });
              }
            } catch (err) { console.error(err); }
          }
        }

        // TikTok Integration
        if (tiktokToken && tiktokAccountId) {
          try {
            // Get Campaigns
            const campRes = await fetch(`https://business-api.tiktok.com/open_api/v1.3/campaign/get/?advertiser_id=${tiktokAccountId}`, {
              headers: { 'Access-Token': tiktokToken }
            });
            const campData = await campRes.json();
            
            // Get Reports (Integrated)
            const reportRes = await fetch(`https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?advertiser_id=${tiktokAccountId}&report_type=BASIC&data_level=AUCTION_CAMPAIGN&dimensions=["campaign_id"]&metrics=["spend","impressions","clicks"]&page_size=100`, {
              headers: { 'Access-Token': tiktokToken }
            });
            const reportData = await reportRes.json();
            const reports = reportData.data?.list || [];

            if (campData.data?.list) {
              campData.data.list.forEach((camp: any) => {
                const report = reports.find((r: any) => r.dimensions.campaign_id === camp.campaign_id) || { metrics: {} };
                
                // Match with Firestore
                const campSessions = allSessions.filter(s => s.utmCampaign === camp.campaign_name || s.utmCampaign === camp.campaign_id);
                const campOrders = allOrders.filter(o => {
                  const session = allSessions.find(s => s.id === o.sessionId);
                  return session?.utmCampaign === camp.campaign_name || session?.utmCampaign === camp.campaign_id;
                });

                allCampaigns.push({
                  id: camp.campaign_id,
                  platform: 'tiktok',
                  name: camp.campaign_name,
                  status: camp.operation_status,
                  objective: camp.objective_type,
                  spend: parseFloat(report.metrics.spend || '0'),
                  impressions: parseInt(report.metrics.impressions || '0'),
                  clicks: parseInt(report.metrics.clicks || '0'),
                  conversions: campOrders.length,
                  revenue: campOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
                  sessions: campSessions.length,
                  avgScrollDepth: campSessions.length > 0 ? campSessions.reduce((sum, s) => sum + (s.scrollDepth || 0), 0) / campSessions.length : 0
                });
              });
            }
          } catch (err) { console.error(err); }
        }

        setCampaigns(allCampaigns);
        setLastSync(new Date());
      } catch (err) {
        console.error(err);
        setError('حدث خطأ أثناء جلب بيانات الحملات الإعلانية والتحليلات');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isConfigured, metaToken, metaAccountId, tiktokToken, tiktokAccountId]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => activeTab === 'all' || c.platform === activeTab);
  }, [campaigns, activeTab]);

  const stats = useMemo(() => {
    const totalSpend = filteredCampaigns.reduce((sum, c) => sum + c.spend, 0);
    const totalConversions = filteredCampaigns.reduce((sum, c) => sum + c.conversions, 0);
    const totalImpressions = filteredCampaigns.reduce((sum, c) => sum + c.impressions, 0);
    const totalClicks = filteredCampaigns.reduce((sum, c) => sum + c.clicks, 0);
    
    const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    
    return { totalSpend, totalConversions, avgCpa, avgCtr, avgCpc, totalImpressions };
  }, [filteredCampaigns]);

  const chartData = useMemo(() => {
    return filteredCampaigns.slice(0, 10).map(c => ({
      name: c.name.substring(0, 15) + '...',
      spend: c.spend,
      revenue: c.revenue / 1000, // Scale for chart
      conversions: c.conversions
    }));
  }, [filteredCampaigns]);

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Megaphone className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter font-serif">مدير الحملات الإعلانية</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm opacity-40 font-bold">تحليل شامل للأداء، العائد، وسلوك الزوار</p>
              {lastSync && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-mono opacity-30 uppercase">متصل: {lastSync.toLocaleTimeString()}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/5"
          >
            <Settings className="w-5 h-5" />
            الإعدادات
          </button>
          <button
            onClick={() => window.location.reload()}
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all shadow-lg shadow-blue-600/20"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showSettings && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0f172a] border border-white/5 rounded-[2rem] p-8 space-y-8 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-white italic uppercase tracking-tight">إعدادات الربط</h3>
            <button onClick={() => setShowSettings(false)} className="text-white/40 hover:text-white"><X className="w-6 h-6" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-[#1877F2]/5 border border-[#1877F2]/10 rounded-3xl space-y-6">
              <div className="flex items-center gap-3 text-[#1877F2]">
                <Megaphone className="w-6 h-6" />
                <h4 className="font-black text-lg italic uppercase tracking-tight">Meta (Facebook/IG)</h4>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-white/40 uppercase tracking-widest">Access Token</label>
                  <input
                    type="password"
                    value={formMetaToken}
                    onChange={(e) => setFormMetaToken(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#1877F2] transition-all font-mono text-sm"
                    placeholder="EAAV..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-white/40 uppercase tracking-widest">Ad Account ID</label>
                  <input
                    type="text"
                    value={formMetaAccountId}
                    onChange={(e) => setFormMetaAccountId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#1877F2] transition-all font-mono text-sm"
                    placeholder="act_123..."
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-[#00f2fe]/5 border border-[#00f2fe]/10 rounded-3xl space-y-6">
              <div className="flex items-center gap-3 text-[#00f2fe]">
                <Megaphone className="w-6 h-6" />
                <h4 className="font-black text-lg italic uppercase tracking-tight">TikTok</h4>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-white/40 uppercase tracking-widest">Access Token</label>
                  <input
                    type="password"
                    value={formTiktokToken}
                    onChange={(e) => setFormTiktokToken(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00f2fe] transition-all font-mono text-sm"
                    placeholder="Tiktok Token..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-white/40 uppercase tracking-widest">Advertiser ID</label>
                  <input
                    type="text"
                    value={formTiktokAccountId}
                    onChange={(e) => setFormTiktokAccountId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00f2fe] transition-all font-mono text-sm"
                    placeholder="123456..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveCredentials}
              className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black italic uppercase tracking-tighter transition-all shadow-xl shadow-blue-600/20 flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              حفظ وتحديث البيانات
            </button>
          </div>
        </motion.div>
      )}

      {paymentIssue && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-8 flex items-start gap-6">
          <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500 shrink-0">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-red-500 italic uppercase tracking-tight">تنبيهات هامة</h3>
            <p className="text-red-400/80 font-bold leading-relaxed">{paymentIssue}</p>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-white/5 rounded-3xl overflow-hidden bg-white/[0.02]">
        {[
          { label: 'إجمالي الإنفاق', value: `$${stats.totalSpend.toFixed(2)}`, icon: <DollarSign className="w-5 h-5" />, color: 'text-blue-400' },
          { label: 'التكلفة لكل تحويلة (CPA)', value: `$${stats.avgCpa.toFixed(2)}`, icon: <Target className="w-5 h-5" />, color: 'text-pink-400' },
          { label: 'نسبة النقر (CTR)', value: `${stats.avgCtr.toFixed(2)}%`, icon: <MousePointerClick className="w-5 h-5" />, color: 'text-amber-400' },
          { label: 'تكلفة النقرة (CPC)', value: `$${stats.avgCpc.toFixed(2)}`, icon: <Activity className="w-5 h-5" />, color: 'text-purple-400' },
        ].map((s, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`p-8 space-y-4 ${i !== 3 ? 'border-r border-white/5' : ''} hover:bg-white/[0.03] transition-colors`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] font-serif italic">{s.label}</p>
              <div className={`${s.color} opacity-50`}>{s.icon}</div>
            </div>
            <h3 className="text-3xl font-black text-white italic tracking-tighter font-mono">{s.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-[#0f172a] border border-white/5 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-white italic uppercase tracking-tight flex items-center gap-3 font-serif">
              <BarChart3 className="w-6 h-6 text-blue-500" />
              مقارنة أداء الحملات
            </h3>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest font-mono">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> الإنفاق ($)</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> التحويلات</div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} tick={{ className: 'font-mono' }} />
                <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} tick={{ className: 'font-mono' }} />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '16px', color: '#fff' }}
                />
                <Bar dataKey="spend" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="conversions" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
          <h3 className="text-xl font-black text-white italic uppercase tracking-tight flex items-center gap-3 font-serif">
            <PieChartIcon className="w-6 h-6 text-purple-500" />
            توزيع المنصات
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Meta', value: campaigns.filter(c => c.platform === 'meta').reduce((sum, c) => sum + c.spend, 0) },
                    { name: 'TikTok', value: campaigns.filter(c => c.platform === 'tiktok').reduce((sum, c) => sum + c.spend, 0) }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#1877F2" />
                  <Cell fill="#00f2fe" />
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '16px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
              <div className="flex items-center gap-2 text-[#1877F2]">
                <div className="w-2 h-2 rounded-full bg-[#1877F2]" /> Meta
              </div>
              <span className="text-white font-mono">
                ${campaigns.filter(c => c.platform === 'meta').reduce((sum, c) => sum + c.spend, 0).toFixed(0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
              <div className="flex items-center gap-2 text-[#00f2fe]">
                <div className="w-2 h-2 rounded-full bg-[#00f2fe]" /> TikTok
              </div>
              <span className="text-white font-mono">
                ${campaigns.filter(c => c.platform === 'tiktok').reduce((sum, c) => sum + c.spend, 0).toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl w-fit">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'meta', label: 'Meta' },
              { id: 'tiktok', label: 'TikTok' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-white/40 hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="بحث عن حملة..."
              className="bg-white/5 border border-white/5 rounded-2xl pr-12 pl-6 py-3 text-sm text-white outline-none focus:border-blue-500/50 transition-all w-full md:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 font-serif italic text-right border-r border-white/5">الحملة</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 font-serif italic text-right border-r border-white/5">المنصة</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 font-serif italic text-right border-r border-white/5">الحالة</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 font-serif italic text-right border-r border-white/5">الإنفاق</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 font-serif italic text-right border-r border-white/5">CTR</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 font-serif italic text-right border-r border-white/5">CPC</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 font-serif italic text-right border-r border-white/5">التحويلات</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 font-serif italic text-right border-r border-white/5">CPA</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 font-serif italic text-right">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-20 text-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                    <p className="mt-4 text-white/40 font-bold italic">جاري تحليل البيانات...</p>
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-20 text-center opacity-40 font-bold italic">لا توجد حملات إعلانية مطابقة</td>
                </tr>
              ) : (
                filteredCampaigns.map((camp) => {
                  const cpa = camp.conversions > 0 ? camp.spend / camp.conversions : 0;
                  const ctr = camp.impressions > 0 ? (camp.clicks / camp.impressions) * 100 : 0;
                  const cpc = camp.clicks > 0 ? camp.spend / camp.clicks : 0;
                  
                  return (
                    <tr key={camp.id} className="hover:bg-white/[0.03] transition-colors group border-b border-white/5">
                      <td className="p-6 border-r border-white/5">
                        <div className="font-black text-white italic group-hover:text-blue-400 transition-colors font-serif">{camp.name}</div>
                        <div className="text-[10px] opacity-30 font-bold uppercase mt-1 font-mono">{camp.objective}</div>
                      </td>
                      <td className="p-6 border-r border-white/5">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${camp.platform === 'meta' ? 'bg-[#1877F2]/10 text-[#1877F2]' : 'bg-[#00f2fe]/10 text-[#00f2fe]'}`}>
                          {camp.platform}
                        </div>
                      </td>
                      <td className="p-6 border-r border-white/5">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          camp.status.includes('ACTIVE') || camp.status === 'ENABLE' ? 'bg-emerald-500/10 text-emerald-500' : 
                          camp.status.includes('PAUSED') || camp.status === 'DISABLE' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-white/10 text-white/40'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            camp.status.includes('ACTIVE') || camp.status === 'ENABLE' ? 'bg-emerald-500' : 
                            camp.status.includes('PAUSED') || camp.status === 'DISABLE' ? 'bg-amber-500' :
                            'bg-white/40'
                          }`} />
                          {camp.status}
                        </div>
                      </td>
                      <td className="p-6 font-mono text-white text-sm tracking-tighter border-r border-white/5">${camp.spend.toFixed(2)}</td>
                      <td className="p-6 font-mono text-white text-sm tracking-tighter border-r border-white/5">{ctr.toFixed(2)}%</td>
                      <td className="p-6 font-mono text-white text-sm tracking-tighter border-r border-white/5">${cpc.toFixed(2)}</td>
                      <td className="p-6 font-mono text-white text-sm tracking-tighter border-r border-white/5">{camp.conversions}</td>
                      <td className="p-6 border-r border-white/5">
                        <div className="font-black italic text-pink-400 font-mono tracking-tighter">
                          ${cpa.toFixed(2)}
                        </div>
                      </td>
                      <td className="p-6">
                        <button 
                          onClick={() => setSelectedCampaign(camp)}
                          className="p-3 bg-white/5 hover:bg-blue-600 text-white/40 hover:text-white rounded-xl transition-all group-hover:scale-110"
                        >
                          <BarChart3 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedCampaign && (
          <CampaignDetailsModal 
            campaign={selectedCampaign} 
            onClose={() => setSelectedCampaign(null)} 
            orders={orders}
            sessions={sessions}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCampaigns;
