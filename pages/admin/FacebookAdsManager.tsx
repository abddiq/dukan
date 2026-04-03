import React, { useState, useEffect } from 'react';
import { Megaphone, Search, Loader2, AlertCircle, ExternalLink, TrendingUp, MousePointerClick, Eye, DollarSign, Settings, Save, X, Facebook, MessageCircle, FileText, Activity, Users, Plus, ChevronLeft, Calendar, BarChart2, CheckCircle, RefreshCw, Trash2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchAdAccounts, fetchCampaigns, fetchAds, fetchPages, fetchConversations, fetchMessages, sendFBMessage, publishPost, fetchPagePosts, fetchPermissions, createCampaign, FBAccount, FBCampaign, FBAd, FBPage } from '../../src/services/facebookAdsService';

const FacebookAdsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'campaigns' | 'ads' | 'messages' | 'bot' | 'scheduling'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [accessToken, setAccessToken] = useState(localStorage.getItem('fb_access_token') || '');
  const [isTokenValid, setIsTokenValid] = useState(!!localStorage.getItem('fb_access_token'));
  const [accounts, setAccounts] = useState<FBAccount[]>([]);
  const [campaigns, setCampaigns] = useState<FBCampaign[]>([]);
  const [ads, setAds] = useState<FBAd[]>([]);
  const [pages, setPages] = useState<FBPage[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [convPaging, setConvPaging] = useState<any>(null);
  const [botRules, setBotRules] = useState<{keyword: string, reply: string}[]>(JSON.parse(localStorage.getItem('fb_bot_rules') || '[]'));
  const [isBotActive, setIsBotActive] = useState(localStorage.getItem('fb_bot_active') === 'true');
  const [error, setError] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(localStorage.getItem('fb_selected_account') || '');
  const [selectedPageId, setSelectedPageId] = useState(localStorage.getItem('fb_selected_page') || '');
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [msgPaging, setMsgPaging] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  
  // Scheduling State
  const [posts, setPosts] = useState<any[]>([]);
  const [postMessage, setPostMessage] = useState('');
  const [postLink, setPostLink] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  
  // Bot Rule Creation State
  const [newKeyword, setNewKeyword] = useState('');
  const [newReply, setNewReply] = useState('');

  // Campaign Creation State
  const [isCreateCampaignModalOpen, setIsCreateCampaignModalOpen] = useState(false);
  const [isCreatingCampaignWizard, setIsCreatingCampaignWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignObjective, setNewCampaignObjective] = useState('OUTCOME_SALES');
  const [newCampaignStatus, setNewCampaignStatus] = useState('PAUSED');

  // Wizard Selection State
  const [wizardSelectedPageId, setWizardSelectedPageId] = useState('');
  const [wizardIsNewPost, setWizardIsNewPost] = useState(false);
  const [wizardSelectedPostId, setWizardSelectedPostId] = useState('');
  const [wizardNewPostMessage, setWizardNewPostMessage] = useState('');
  const [wizardNewPostLink, setWizardNewPostLink] = useState('');
  const [wizardPagePosts, setWizardPagePosts] = useState<any[]>([]);

  useEffect(() => {
    if (isTokenValid && accessToken) {
      loadAccounts();
      loadPages();
      loadPermissions();
    }
  }, [isTokenValid, accessToken]);

  const loadPermissions = async () => {
    try {
      const perms = await fetchPermissions(accessToken);
      setPermissions(perms);
    } catch (err) {
      console.error('Failed to load permissions:', err);
    }
  };

  useEffect(() => {
    if (selectedPageId && activeTab === 'messages') {
      loadConversations();
    }
  }, [selectedPageId, activeTab]);

  useEffect(() => {
    if (selectedConversationId && selectedPageId) {
      loadMessagesData();
    }
  }, [selectedConversationId, selectedPageId]);

  useEffect(() => {
    if (selectedPageId && activeTab === 'scheduling') {
      loadPosts();
    }
  }, [selectedPageId, activeTab]);

  const loadPosts = async () => {
    const page = pages.find(p => p.id === selectedPageId);
    if (!page) return;
    setLoading(true);
    try {
      const data = await fetchPagePosts(page.id, page.access_token);
      setPosts(data);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishPost = async () => {
    const page = pages.find(p => p.id === selectedPageId);
    if (!page || !postMessage.trim()) return;

    setLoading(true);
    try {
      let scheduledTimestamp;
      if (isScheduling && scheduledDate && scheduledTime) {
        scheduledTimestamp = Math.floor(new Date(`${scheduledDate}T${scheduledTime}`).getTime() / 1000);
        // FB requires scheduled time to be between 10 mins and 75 days in the future
        const now = Math.floor(Date.now() / 1000);
        if (scheduledTimestamp < now + 600) {
          alert('يجب أن يكون وقت الجدولة بعد 10 دقائق على الأقل من الآن');
          setLoading(false);
          return;
        }
      }

      await publishPost(page.id, page.access_token, postMessage, postLink, scheduledTimestamp);
      setPostMessage('');
      setPostLink('');
      setScheduledDate('');
      setScheduledTime('');
      setIsScheduling(false);
      alert(scheduledTimestamp ? 'تمت جدولة المنشور بنجاح' : 'تم نشر المنشور بنجاح');
      loadPosts();
    } catch (err: any) {
      console.error('Failed to publish post:', err);
      const msg = err.message || String(err);
      if (msg.includes('(#200)')) {
        alert('فشل في النشر: يرجى التأكد من أن الرمز (Access Token) يملك صلاحيات pages_manage_posts و pages_read_engagement. يمكنك التحقق من ذلك في دليل الصلاحيات.');
      } else {
        alert('فشل في نشر المنشور: ' + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMessagesData = async (nextUrl?: string) => {
    const page = pages.find(p => p.id === selectedPageId);
    if (!page || !selectedConversationId) return;
    setLoading(true);
    try {
      let data;
      if (nextUrl) {
        const res = await fetch(nextUrl);
        data = await res.json();
      } else {
        data = await fetchMessages(selectedConversationId, page.access_token);
      }
      
      if (nextUrl) {
        // For messages, we prepend old messages
        setMessages(prev => [...(data.data || []).reverse(), ...prev]);
      } else {
        setMessages((data.data || []).reverse()); // Show oldest first for chat flow
      }
      setMsgPaging(data.paging);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    const page = pages.find(p => p.id === selectedPageId);
    if (!page || !selectedConversationId || !replyText.trim()) return;

    const conversation = conversations.find(c => c.id === selectedConversationId);
    const recipientId = conversation?.participants?.data?.find((p: any) => p.id !== selectedPageId)?.id;

    if (!recipientId) return;

    setLoading(true);
    try {
      await sendFBMessage(recipientId, replyText, page.access_token);
      setReplyText('');
      loadMessagesData(); // Refresh chat
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('فشل في إرسال الرسالة');
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async (nextUrl?: string) => {
    const page = pages.find(p => p.id === selectedPageId);
    if (!page) return;
    setLoading(true);
    try {
      let data;
      if (nextUrl) {
        const res = await fetch(nextUrl);
        data = await res.json();
      } else {
        data = await fetchConversations(page.id, page.access_token);
      }
      
      if (nextUrl) {
        setConversations(prev => [...prev, ...(data.data || [])]);
      } else {
        setConversations(data.data || []);
      }
      setConvPaging(data.paging);
      
      // If bot is active, process unread messages
      if (isBotActive && !nextUrl) {
        processBotReplies(data.data || [], page.access_token);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const processBotReplies = async (convs: any[], pageToken: string) => {
    for (const conv of convs) {
      if (conv.unread_count > 0) {
        const lastMsg = conv.messages?.data?.[0]?.message?.toLowerCase();
        if (!lastMsg) continue;

        const rule = botRules.find(r => lastMsg.includes(r.keyword.toLowerCase()));
        if (rule) {
          const recipientId = conv.participants?.data?.find((p: any) => p.id !== selectedPageId)?.id;
          if (recipientId) {
            try {
              await sendFBMessage(recipientId, rule.reply, pageToken);
              console.log(`Bot replied to ${recipientId} with: ${rule.reply}`);
            } catch (err) {
              console.error('Bot failed to reply:', err);
            }
          }
        }
      }
    }
  };

  const toggleBot = () => {
    const newState = !isBotActive;
    setIsBotActive(newState);
    localStorage.setItem('fb_bot_active', String(newState));
  };

  const addBotRule = (keyword: string, reply: string) => {
    const newRules = [...botRules, { keyword, reply }];
    setBotRules(newRules);
    localStorage.setItem('fb_bot_rules', JSON.stringify(newRules));
  };

  const removeBotRule = (index: number) => {
    const newRules = botRules.filter((_, i) => i !== index);
    setBotRules(newRules);
    localStorage.setItem('fb_bot_rules', JSON.stringify(newRules));
  };

  useEffect(() => {
    if (selectedAccountId && isTokenValid && accessToken) {
      loadCampaignsAndAds(selectedAccountId);
      localStorage.setItem('fb_selected_account', selectedAccountId);
    }
  }, [selectedAccountId, isTokenValid, accessToken]);

  const loadWizardPosts = async (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    setLoading(true);
    try {
      const data = await fetchPagePosts(page.id, page.access_token);
      setWizardPagePosts(data);
    } catch (err) {
      console.error('Failed to load wizard posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWizardNext = () => {
    if (wizardStep === 1 && newCampaignName) {
      setWizardStep(2);
    } else if (wizardStep === 2 && wizardSelectedPageId) {
      setWizardStep(3);
    }
  };

  const handleWizardBack = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    } else {
      setIsCreatingCampaignWizard(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!selectedAccountId || !newCampaignName) return;
    setLoading(true);
    try {
      // 1. If it's a new post, publish it first
      if (isCreatingCampaignWizard && wizardIsNewPost && wizardSelectedPageId) {
        const page = pages.find(p => p.id === wizardSelectedPageId);
        if (page) {
          await publishPost(page.id, page.access_token, wizardNewPostMessage, wizardNewPostLink);
        }
      }

      // 2. Create the campaign
      await createCampaign(selectedAccountId, accessToken, {
        name: newCampaignName,
        objective: newCampaignObjective,
        status: newCampaignStatus
      });

      // 3. Reset all states
      setIsCreateCampaignModalOpen(false);
      setIsCreatingCampaignWizard(false);
      setWizardStep(1);
      setNewCampaignName('');
      setWizardSelectedPageId('');
      setWizardSelectedPostId('');
      setWizardNewPostMessage('');
      setWizardNewPostLink('');
      
      loadCampaignsAndAds(selectedAccountId);
      alert('تم إنشاء الحملة بنجاح');
    } catch (err: any) {
      console.error('Failed to create campaign:', err);
      alert('فشل في إنشاء الحملة: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdAccounts(accessToken);
      setAccounts(data);
      if (data.length > 0 && !selectedAccountId) {
        setSelectedAccountId(data[0].id);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'فشل في جلب الحسابات الإعلانية';
      setError(errorMsg);
      
      // If error is related to token validation, reset token state
      if (errorMsg.toLowerCase().includes('access token') || errorMsg.toLowerCase().includes('expired')) {
        setIsTokenValid(false);
        localStorage.removeItem('fb_access_token');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignsAndAds = async (accountId: string) => {
    setLoading(true);
    setError('');
    try {
      const [camps, adsData] = await Promise.all([
        fetchCampaigns(accountId, accessToken),
        fetchAds(accountId, accessToken)
      ]);
      setCampaigns(camps);
      setAds(adsData);
    } catch (err: any) {
      const errorMsg = err.message || 'فشل في جلب بيانات الحملات والإعلانات';
      setError(errorMsg);
      
      if (errorMsg.toLowerCase().includes('access token') || errorMsg.toLowerCase().includes('expired')) {
        setIsTokenValid(false);
        localStorage.removeItem('fb_access_token');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPages = async () => {
    try {
      const data = await fetchPages(accessToken);
      setPages(data);
      if (data.length > 0 && !selectedPageId) {
        // Don't auto-select, let user choose
      }
    } catch (err: any) {
      console.error('Failed to load pages:', err);
    }
  };

  const handleConnectPage = async (pageId: string) => {
    setSelectedPageId(pageId);
    localStorage.setItem('fb_selected_page', pageId);
    // In a real app, you might save the page's long-lived token here
  };

  const handleSaveToken = () => {
    if (!accessToken.trim()) return;
    localStorage.setItem('fb_access_token', accessToken);
    setIsTokenValid(true);
  };

  const handleClearToken = () => {
    localStorage.removeItem('fb_access_token');
    localStorage.removeItem('fb_selected_account');
    setAccessToken('');
    setIsTokenValid(false);
    setAccounts([]);
    setCampaigns([]);
    setAds([]);
    setSelectedAccountId('');
  };

  // Calculate Dashboard Metrics
  const totalSpend = ads.reduce((sum, ad) => sum + parseFloat(ad.insights?.data?.[0]?.spend || '0'), 0);
  const totalClicks = ads.reduce((sum, ad) => sum + parseInt(ad.insights?.data?.[0]?.clicks || '0'), 0);
  const totalImpressions = ads.reduce((sum, ad) => sum + parseInt(ad.insights?.data?.[0]?.impressions || '0'), 0);
  
  // Calculate total purchases (results)
  const totalResults = ads.reduce((sum, ad) => {
    const actions = ad.insights?.data?.[0]?.actions || [];
    const purchaseAction = actions.find(a => a.action_type === 'purchase');
    return sum + parseInt(purchaseAction?.value || '0');
  }, 0);

  const roas = totalSpend > 0 ? ((totalResults * 100) / totalSpend).toFixed(2) : '0.00'; // Assuming $100 average order value for dummy ROAS calculation if revenue not tracked directly

  if (!isTokenValid) {
    return (
      <div className="space-y-8 max-w-2xl mx-auto mt-10">
        <div className="bg-bg-card border border-white/5 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-[#1877F2]/10 text-[#1877F2] rounded-full flex items-center justify-center mx-auto mb-6">
            <Facebook className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-white mb-4">ربط حساب منصة ميتا</h2>
          <p className="text-white/60 mb-8">
            يرجى إدخال رمز الوصول (Access Token) الخاص بحسابك في Facebook Developer للبدء في إدارة إعلاناتك.
          </p>
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-right">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <div className="space-y-4 text-right">
            <div>
              <label className="block text-sm font-bold text-white/60 mb-2">Access Token</label>
              <input 
                type="password" 
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="EAA..." 
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#1877F2]"
                dir="ltr"
              />
            </div>
            
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-right">
              <h4 className="text-sm font-black text-blue-400 mb-2 flex items-center justify-end gap-2">
                <AlertCircle className="w-4 h-4" />
                دليل الصلاحيات المطلوبة
              </h4>
              <p className="text-xs text-white/60 leading-relaxed mb-3">
                لضمان عمل جميع ميزات النظام، تأكد من اختيار الصلاحيات التالية عند إنشاء الرمز (Access Token):
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-white/40">
                {['ads_management', 'ads_read', 'business_management', 'pages_read_engagement', 'pages_manage_posts', 'pages_show_list', 'pages_messaging', 'instagram_basic', 'instagram_manage_messages'].map(scope => {
                  const isGranted = permissions.find(p => p.permission === scope && p.status === 'granted');
                  return (
                    <div key={scope} className={`p-1 rounded flex items-center justify-between ${isGranted ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5'}`}>
                      {scope}
                      {isGranted && <CheckCircle className="w-2.5 h-2.5" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <button 
              onClick={handleSaveToken}
              disabled={!accessToken.trim() || loading}
              className="w-full py-3 bg-[#1877F2] hover:bg-[#1877F2]/80 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ربط الحساب'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-bg-card border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white/40 uppercase tracking-wider">إجمالي الإنفاق</p>
              <h3 className="text-2xl font-black text-white">${totalSpend.toFixed(2)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-bg-card border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white/40 uppercase tracking-wider">العائد على الإعلان (ROAS)</p>
              <h3 className="text-2xl font-black text-white">{roas}x</h3>
            </div>
          </div>
        </div>
        <div className="bg-bg-card border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
              <MousePointerClick className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white/40 uppercase tracking-wider">إجمالي النقرات</p>
              <h3 className="text-2xl font-black text-white">{totalClicks.toLocaleString()}</h3>
            </div>
          </div>
        </div>
        <div className="bg-bg-card border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white/40 uppercase tracking-wider">النتائج (المبيعات)</p>
              <h3 className="text-2xl font-black text-white">{totalResults}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-card border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            أفضل الحملات أداءً
          </h3>
          <div className="space-y-4">
            {campaigns.filter(c => c.status === 'ACTIVE').slice(0, 5).map(camp => {
              const spend = parseFloat(camp.insights?.data?.[0]?.spend || '0');
              const actions = camp.insights?.data?.[0]?.actions || [];
              const results = parseInt(actions.find(a => a.action_type === 'purchase')?.value || '0');
              const clicks = parseInt(camp.insights?.data?.[0]?.clicks || '0');
              const campRoas = spend > 0 ? ((results * 100) / spend).toFixed(2) : '0.00';

              return (
                <div key={camp.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div>
                    <h4 className="font-bold text-white">{camp.name}</h4>
                    <p className="text-xs text-white/40 mt-1">ROAS: {campRoas}x | الإنفاق: ${spend.toFixed(2)}</p>
                  </div>
                  <div className="text-left">
                    <div className="font-black text-emerald-400">{results} مبيعة</div>
                    <div className="text-xs text-white/40 mt-1">{clicks} نقرة</div>
                  </div>
                </div>
              );
            })}
            {campaigns.length === 0 && !loading && (
              <p className="text-white/40 text-center py-4">لا توجد حملات نشطة</p>
            )}
          </div>
        </div>

        <div className="bg-bg-card border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            تنبيهات الحسابات
          </h3>
          <div className="space-y-4">
            {accounts.filter(a => a.account_status !== 1).map(acc => (
              <div key={acc.id} className="flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-red-500">حساب معطل: {acc.name}</h4>
                  <p className="text-xs text-red-400/80 mt-1">يرجى مراجعة جودة الحساب أو تحديث طريقة الدفع.</p>
                </div>
              </div>
            ))}
            {accounts.filter(a => a.account_status === 1).length === accounts.length && (
              <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-emerald-500">جميع الحسابات نشطة</h4>
                  <p className="text-xs text-emerald-400/80 mt-1">لا توجد أي مشاكل في حساباتك الإعلانية.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAccounts = () => (
    <div className="bg-bg-card border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/5 flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">الحسابات الإعلانية (Ad Accounts)</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors">
          <Plus className="w-4 h-4" />
          ربط حساب جديد
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="bg-white/5">
              <th className="p-4 text-xs font-black uppercase text-white/40">اسم الحساب</th>
              <th className="p-4 text-xs font-black uppercase text-white/40">المعرف (ID)</th>
              <th className="p-4 text-xs font-black uppercase text-white/40">الحالة</th>
              <th className="p-4 text-xs font-black uppercase text-white/40">الرصيد المستحق</th>
              <th className="p-4 text-xs font-black uppercase text-white/40">العملة</th>
              <th className="p-4 text-xs font-black uppercase text-white/40">تحديد</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {accounts.map(acc => (
              <tr key={acc.id} className={`hover:bg-white/5 ${selectedAccountId === acc.id ? 'bg-blue-500/5' : ''}`}>
                <td className="p-4 font-bold text-white">{acc.name}</td>
                <td className="p-4 text-sm text-white/60 font-mono">{acc.account_id}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${acc.account_status === 1 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {acc.account_status === 1 ? 'نشط' : 'معطل'}
                  </span>
                </td>
                <td className="p-4 font-mono text-white">{acc.balance}</td>
                <td className="p-4 text-white/60">{acc.currency}</td>
                <td className="p-4">
                  <button 
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${selectedAccountId === acc.id ? 'bg-blue-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                    {selectedAccountId === acc.id ? 'محدد' : 'تحديد'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCampaigns = () => {
    if (isCreatingCampaignWizard) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <button 
              onClick={handleWizardBack}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              العودة
            </button>
            <div className="flex items-center gap-4">
              {[1, 2, 3].map(step => (
                <div 
                  key={step}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all ${wizardStep === step ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-600/20' : wizardStep > step ? 'bg-emerald-500 text-white' : 'bg-white/5 text-white/20'}`}
                >
                  {wizardStep > step ? <CheckCircle className="w-6 h-6" /> : step}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-bg-card border border-white/5 rounded-3xl overflow-hidden">
            {wizardStep === 1 && (
              <div className="p-8 space-y-8">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-white">تفاصيل الحملة</h3>
                  <p className="text-white/40">ابدأ بتحديد اسم وهدف حملتك الإعلانية</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-white/60 mb-2">اسم الحملة</label>
                      <input 
                        type="text" 
                        value={newCampaignName}
                        onChange={(e) => setNewCampaignName(e.target.value)}
                        placeholder="مثال: حملة مبيعات رمضان" 
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-blue-500 text-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-white/60 mb-2">هدف الحملة (Objective)</label>
                      <select 
                        value={newCampaignObjective}
                        onChange={(e) => setNewCampaignObjective(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-blue-500 text-lg"
                      >
                        <option value="OUTCOME_SALES">المبيعات (Sales)</option>
                        <option value="OUTCOME_LEADS">تجميع بيانات العملاء (Leads)</option>
                        <option value="OUTCOME_ENGAGEMENT">التفاعل (Engagement)</option>
                        <option value="OUTCOME_TRAFFIC">الزيارات (Traffic)</option>
                        <option value="OUTCOME_AWARENESS">الوعي بالعلامة التجارية (Awareness)</option>
                        <option value="OUTCOME_APP_INSTALLS">تثبيت التطبيق (App Installs)</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 border border-white/5 flex flex-col justify-center items-center text-center space-y-4">
                    <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center">
                      <Megaphone className="w-10 h-10 text-blue-500" />
                    </div>
                    <h4 className="font-bold text-white">لماذا هذا الهدف؟</h4>
                    <p className="text-sm text-white/40 leading-relaxed">
                      اختيار الهدف الصحيح يساعد خوارزميات ميتا على تحسين نتائجك والوصول للجمهور الأكثر احتمالاً للقيام بالإجراء المطلوب.
                    </p>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex justify-end">
                  <button 
                    onClick={handleWizardNext}
                    disabled={!newCampaignName}
                    className="px-12 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-black transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
                  >
                    التالي: اختيار الصفحة والمنشور
                    <ChevronLeft className="w-5 h-5 rotate-180" />
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="p-8 space-y-8">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-white">الصفحة والمنشور</h3>
                  <p className="text-white/40">اختر الصفحة التي تريد الإعلان منها والمنشور الذي سيظهر للعملاء</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-white/60 mb-4">اختر الصفحة</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {pages.map(page => (
                        <div 
                          key={page.id}
                          onClick={() => {
                            setWizardSelectedPageId(page.id);
                            loadWizardPosts(page.id);
                          }}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${wizardSelectedPageId === page.id ? 'bg-blue-600/10 border-blue-600' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                        >
                          <img 
                            src={page.picture?.data.url} 
                            alt={page.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <span className="font-bold text-white text-sm truncate">{page.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {wizardSelectedPageId && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setWizardIsNewPost(false)}
                          className={`flex-1 py-4 rounded-2xl font-black transition-all border ${!wizardIsNewPost ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                        >
                          اختيار منشور موجود
                        </button>
                        <button 
                          onClick={() => setWizardIsNewPost(true)}
                          className={`flex-1 py-4 rounded-2xl font-black transition-all border ${wizardIsNewPost ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                        >
                          إنشاء منشور جديد
                        </button>
                      </div>

                      {wizardIsNewPost ? (
                        <div className="space-y-4 p-6 bg-white/5 rounded-2xl border border-white/5">
                          <div>
                            <label className="block text-sm font-bold text-white/60 mb-2">محتوى المنشور</label>
                            <textarea 
                              value={wizardNewPostMessage}
                              onChange={(e) => setWizardNewPostMessage(e.target.value)}
                              rows={4}
                              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                              placeholder="اكتب ما يدور في ذهنك..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-white/60 mb-2">رابط (اختياري)</label>
                            <input 
                              type="url" 
                              value={wizardNewPostLink}
                              onChange={(e) => setWizardNewPostLink(e.target.value)}
                              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                              placeholder="https://example.com"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {wizardPagePosts.map(post => (
                            <div 
                              key={post.id}
                              onClick={() => setWizardSelectedPostId(post.id)}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${wizardSelectedPostId === post.id ? 'bg-blue-600/10 border-blue-600' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                            >
                              {post.full_picture && (
                                <img src={post.full_picture} alt="" className="w-full h-32 object-cover rounded-xl" />
                              )}
                              <p className="text-xs text-white/60 line-clamp-2">{post.message || 'بدون نص'}</p>
                              <div className="flex justify-between items-center text-[10px] text-white/20">
                                <span>{new Date(post.created_time).toLocaleDateString('ar-IQ')}</span>
                                {post.is_published ? <span className="text-emerald-500">منشور</span> : <span className="text-amber-500">مجدول</span>}
                              </div>
                            </div>
                          ))}
                          {wizardPagePosts.length === 0 && !loading && (
                            <div className="col-span-2 text-center py-10 text-white/20">لا توجد منشورات في هذه الصفحة</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-8 border-t border-white/5 flex justify-between">
                  <button 
                    onClick={handleWizardBack}
                    className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all"
                  >
                    السابق
                  </button>
                  <button 
                    onClick={handleWizardNext}
                    disabled={!wizardSelectedPageId || (!wizardIsNewPost && !wizardSelectedPostId) || (wizardIsNewPost && !wizardNewPostMessage)}
                    className="px-12 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-black transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
                  >
                    التالي: المراجعة والتأكيد
                    <ChevronLeft className="w-5 h-5 rotate-180" />
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="p-8 space-y-8">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-white">المراجعة النهائية</h3>
                  <p className="text-white/40">تأكد من جميع التفاصيل قبل إنشاء الحملة</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                      <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest">تفاصيل الحملة</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-white/60">الاسم:</span>
                          <span className="text-white font-bold">{newCampaignName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">الهدف:</span>
                          <span className="text-white font-bold">{newCampaignObjective}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">الحالة:</span>
                          <span className="text-white font-bold">{newCampaignStatus === 'ACTIVE' ? 'نشط' : 'متوقف مؤقتاً'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                      <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest">الصفحة المختارة</h4>
                      <div className="flex items-center gap-3">
                        <img 
                          src={pages.find(p => p.id === wizardSelectedPageId)?.picture?.data.url} 
                          alt="" 
                          className="w-12 h-12 rounded-full"
                        />
                        <span className="text-lg font-black text-white">{pages.find(p => p.id === wizardSelectedPageId)?.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-blue-600/5 rounded-3xl border border-blue-600/20 space-y-4">
                    <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest">معاينة الإعلان</h4>
                    <div className="bg-black/20 rounded-2xl p-4 space-y-4">
                      {wizardIsNewPost ? (
                        <div className="space-y-3">
                          <p className="text-white text-sm leading-relaxed">{wizardNewPostMessage}</p>
                          {wizardNewPostLink && <p className="text-blue-400 text-xs truncate">{wizardNewPostLink}</p>}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {wizardPagePosts.find(p => p.id === wizardSelectedPostId)?.full_picture && (
                            <img src={wizardPagePosts.find(p => p.id === wizardSelectedPostId)?.full_picture} alt="" className="w-full h-48 object-cover rounded-xl" />
                          )}
                          <p className="text-white text-sm leading-relaxed">{wizardPagePosts.find(p => p.id === wizardSelectedPostId)?.message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex justify-between">
                  <button 
                    onClick={handleWizardBack}
                    className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all"
                  >
                    السابق
                  </button>
                  <button 
                    onClick={handleCreateCampaign}
                    disabled={loading}
                    className="px-16 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد وإنشاء الحملة'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-bg-card border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">الحملات الإعلانية (Campaigns)</h3>
            <button 
              onClick={() => {
                setIsCreatingCampaignWizard(true);
                setWizardStep(1);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              إنشاء حملة جديدة
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-white/5">
                  <th className="p-4 text-xs font-black uppercase text-white/40">اسم الحملة</th>
                  <th className="p-4 text-xs font-black uppercase text-white/40">الهدف</th>
                  <th className="p-4 text-xs font-black uppercase text-white/40">الحالة</th>
                  <th className="p-4 text-xs font-black uppercase text-white/40">الإنفاق</th>
                  <th className="p-4 text-xs font-black uppercase text-white/40">النتائج</th>
                  <th className="p-4 text-xs font-black uppercase text-white/40">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {campaigns.map(camp => {
                  const spend = parseFloat(camp.insights?.data?.[0]?.spend || '0');
                  const actions = camp.insights?.data?.[0]?.actions || [];
                  const results = parseInt(actions.find(a => a.action_type === 'purchase')?.value || '0');
                  const campRoas = spend > 0 ? ((results * 100) / spend).toFixed(2) : '0.00';

                  return (
                    <tr key={camp.id} className="hover:bg-white/5">
                      <td className="p-4 font-bold text-white">{camp.name}</td>
                      <td className="p-4 text-sm text-white/60">{camp.objective}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${camp.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {camp.status === 'ACTIVE' ? 'نشط' : camp.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-white">${spend.toFixed(2)}</td>
                      <td className="p-4 font-mono text-white">{results}</td>
                      <td className="p-4 font-mono text-emerald-400">{campRoas}x</td>
                    </tr>
                  );
                })}
                {campaigns.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-white/40">لا توجد حملات إعلانية</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderAds = () => {
    const filteredAds = ads.filter(ad => ad.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <div className="bg-bg-card border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center">
          <h3 className="text-lg font-bold text-white">سجل الإعلانات (Ads Log)</h3>
          <div className="relative w-full md:w-auto">
            <Search className="w-5 h-5 text-white/40 absolute right-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن إعلان..." 
              className="bg-black/20 border border-white/10 rounded-xl pr-10 pl-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 w-full md:w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-white/5">
                <th className="p-4 text-xs font-black uppercase text-white/40">اسم الإعلان</th>
                <th className="p-4 text-xs font-black uppercase text-white/40">الحملة</th>
                <th className="p-4 text-xs font-black uppercase text-white/40">الحالة</th>
                <th className="p-4 text-xs font-black uppercase text-white/40">الإنفاق</th>
                <th className="p-4 text-xs font-black uppercase text-white/40">النتائج</th>
                <th className="p-4 text-xs font-black uppercase text-white/40">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAds.map(ad => {
                const spend = parseFloat(ad.insights?.data?.[0]?.spend || '0');
                const actions = ad.insights?.data?.[0]?.actions || [];
                const results = parseInt(actions.find(a => a.action_type === 'purchase')?.value || '0');

                return (
                  <tr key={ad.id} className="hover:bg-white/5">
                    <td className="p-4 font-bold text-white">{ad.name}</td>
                    <td className="p-4 text-sm text-white/60">{ad.campaign?.name}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${ad.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {ad.status === 'ACTIVE' ? 'نشط' : ad.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-white">${spend.toFixed(2)}</td>
                    <td className="p-4 font-mono text-white">{results}</td>
                    <td className="p-4">
                      <Link to={`/admin/fb-ads/${ad.id}?account_id=${selectedAccountId}&token=${accessToken}`} className="px-4 py-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        سجل الإعلان (التفاصيل)
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filteredAds.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-white/40">لا توجد إعلانات</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderMessages = () => {
    const selectedPage = pages.find(p => p.id === selectedPageId);

    if (selectedPage) {
      return (
        <div className="space-y-6">
          <div className="bg-bg-card border border-white/5 rounded-2xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-500/20">
                <img 
                  src={selectedPage.picture?.data.url || `https://ui-avatars.com/api/?name=${selectedPage.name}&background=1877F2&color=fff`} 
                  alt={selectedPage.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{selectedPage.name}</h3>
                <p className="text-sm text-white/40">{selectedPage.category}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab('bot')}
                className="px-4 py-2 bg-purple-600/10 text-purple-500 border border-purple-500/20 hover:bg-purple-600/20 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                إعدادات البوت
              </button>
              <button 
                onClick={() => {
                  setSelectedPageId('');
                  localStorage.removeItem('fb_selected_page');
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-colors"
              >
                تغيير الصفحة
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="bg-bg-card border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-blue-500" />
                    المحادثات الأخيرة
                  </h3>
                  <button onClick={() => loadConversations()} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="space-y-2">
                  {conversations.map(conv => {
                    const otherParticipant = conv.participants?.data?.find((p: any) => p.id !== selectedPageId);
                    const lastMsg = conv.messages?.data?.[0];
                    const isInstagram = conv.platform === 'instagram';

                    return (
                      <div 
                        key={conv.id} 
                        onClick={() => setSelectedConversationId(conv.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedConversationId === conv.id ? 'bg-blue-600/10 border-blue-600' : conv.unread_count > 0 ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 bg-gradient-to-br ${isInstagram ? 'from-purple-500 via-pink-500 to-orange-500' : 'from-blue-500 to-blue-700'} rounded-full flex items-center justify-center text-white font-bold relative`}>
                              {otherParticipant?.name?.charAt(0) || '?'}
                              <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5">
                                {isInstagram ? <TrendingUp className="w-3 h-3 text-pink-500" /> : <Facebook className="w-3 h-3 text-blue-500" />}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                {otherParticipant?.name || 'مستخدم'}
                                {isInstagram && <span className="text-[10px] bg-pink-500/20 text-pink-500 px-1.5 py-0.5 rounded-md">انستغرام</span>}
                              </h4>
                              <p className="text-xs text-white/40 line-clamp-1 mt-1">{lastMsg?.message || 'لا يوجد نص'}</p>
                            </div>
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] text-white/20 font-mono">{new Date(conv.updated_time).toLocaleTimeString('ar-IQ')}</span>
                            {conv.unread_count > 0 && (
                              <div className="mt-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block">
                                {conv.unread_count}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {conversations.length === 0 && !loading && (
                    <div className="text-center py-10 text-white/20">لا توجد محادثات حالياً</div>
                  )}
                  {convPaging?.next && (
                    <button 
                      onClick={() => loadConversations(convPaging.next)}
                      disabled={loading}
                      className="w-full py-2 text-xs text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all font-bold"
                    >
                      {loading ? 'جاري التحميل...' : 'تحميل محادثات أقدم'}
                    </button>
                  )}
                </div>
              </div>

              {selectedConversationId && (
                <div className="bg-bg-card border border-white/5 rounded-2xl flex flex-col h-[600px]">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {conversations.find(c => c.id === selectedConversationId)?.participants?.data?.find((p: any) => p.id !== selectedPageId)?.name?.charAt(0)}
                      </div>
                      <h4 className="font-bold text-white text-sm">
                        {conversations.find(c => c.id === selectedConversationId)?.participants?.data?.find((p: any) => p.id !== selectedPageId)?.name}
                      </h4>
                    </div>
                    <button onClick={() => setSelectedConversationId('')} className="text-white/40 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
                    {msgPaging?.next && (
                      <button 
                        onClick={() => loadMessagesData(msgPaging.next)}
                        disabled={loading}
                        className="py-2 text-[10px] text-white/30 hover:text-white transition-all"
                      >
                        {loading ? 'جاري التحميل...' : 'تحميل رسائل أقدم'}
                      </button>
                    )}
                    {messages.map((msg, idx) => {
                      const isMe = msg.from?.id === selectedPageId;
                      return (
                        <div key={idx} className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white self-start rounded-tr-none' : 'bg-white/10 text-white self-end rounded-tl-none'}`}>
                          <p>{msg.message}</p>
                          <span className="text-[9px] opacity-40 mt-1 block text-left">
                            {new Date(msg.created_time).toLocaleTimeString('ar-IQ')}
                          </span>
                        </div>
                      );
                    })}
                    {messages.length === 0 && !loading && (
                      <div className="text-center text-white/20 my-auto">اختر محادثة لعرض الرسائل</div>
                    )}
                  </div>

                  <div className="p-4 border-t border-white/5 flex gap-2">
                    <input 
                      type="text" 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="اكتب ردك هنا..."
                      className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={!replyText.trim() || loading}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-bg-card border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-bold text-white">حالة البوت المبرمج</h4>
                  <button 
                    onClick={toggleBot}
                    className={`relative w-12 h-6 rounded-full transition-all ${isBotActive ? 'bg-emerald-500' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isBotActive ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>
                <div className={`p-4 rounded-xl border flex items-center gap-3 ${isBotActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-white/5 border-white/5 text-white/40'}`}>
                  {isBotActive ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
                  <span className="text-sm font-bold">{isBotActive ? 'البوت يعمل حالياً' : 'البوت متوقف'}</span>
                </div>
                <p className="text-[10px] text-white/30 mt-4 leading-relaxed">
                  * البوت يقوم بالرد تلقائياً على الرسائل الجديدة التي تحتوي على كلمات مفتاحية محددة.
                </p>
              </div>

              <div className="bg-bg-card border border-white/5 rounded-2xl p-6">
                <h4 className="font-bold text-white mb-4">إحصائيات سريعة</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">المحادثات غير المقروءة</span>
                    <span className="text-white font-bold">{conversations.filter(c => c.unread_count > 0).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">إجمالي القواعد</span>
                    <span className="text-white font-bold">{botRules.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-bg-card border border-white/5 rounded-2xl p-12 text-center">
        <div className="w-20 h-20 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <MessageCircle className="w-10 h-10" />
        </div>
        <h3 className="text-2xl font-black text-white mb-2">نظام التواصل (الرسائل والتعليقات)</h3>
        <p className="text-white/40 max-w-md mx-auto mb-8">
          اختر صفحة ميتا التي ترغب في ربطها للرد على العملاء مباشرة من لوحة التحكم.
        </p>
        
        {pages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {pages.map(page => (
              <div key={page.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-4 hover:border-blue-500/50 transition-all group">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-transparent group-hover:border-blue-500 transition-all">
                  <img 
                    src={page.picture?.data.url || `https://ui-avatars.com/api/?name=${page.name}&background=1877F2&color=fff`} 
                    alt={page.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <h4 className="font-bold text-white line-clamp-1">{page.name}</h4>
                  <p className="text-xs text-white/40">{page.category}</p>
                </div>
                <button 
                  onClick={() => handleConnectPage(page.id)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  ربط هذه الصفحة
                </button>
              </div>
            ))}
          </div>
        ) : (
          <button 
            onClick={loadPages}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors inline-flex items-center gap-2"
          >
            <Facebook className="w-5 h-5" />
            جلب الصفحات المتاحة
          </button>
        )}
      </div>
    );
  };

  const renderScheduling = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-bg-card border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-500" />
            إنشاء منشور جديد
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase text-white/40 mb-2">محتوى المنشور</label>
              <textarea
                value={postMessage}
                onChange={(e) => setPostMessage(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white h-40 focus:outline-none focus:border-blue-500 transition-all resize-none"
                placeholder="اكتب شيئاً رائعاً لجمهورك..."
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-white/40 mb-2">رابط (اختياري)</label>
              <input
                type="text"
                value={postLink}
                onChange={(e) => setPostLink(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-all"
                placeholder="https://your-store.com/product"
              />
            </div>
            
            <div className="flex items-center gap-3 py-2">
              <input
                type="checkbox"
                id="isScheduling"
                checked={isScheduling}
                onChange={(e) => setIsScheduling(e.target.checked)}
                className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-blue-600 focus:ring-blue-500 transition-all"
              />
              <label htmlFor="isScheduling" className="text-sm font-bold text-white/80 cursor-pointer">جدولة المنشور لوقت لاحق</label>
            </div>

            {isScheduling && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-2">التاريخ</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-white/40 mb-2">الوقت</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handlePublishPost}
              disabled={loading || !postMessage.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isScheduling ? 'جدولة المنشور' : 'نشر الآن على ميتا')}
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-bg-card border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              المنشورات السابقة والمجدولة
            </h3>
            <button onClick={loadPosts} className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                <Calendar className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/40 font-bold">لا توجد منشورات لعرضها</p>
              </div>
            ) : (
              posts.map((post: any) => (
                <div key={post.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex gap-6 hover:bg-white/10 transition-all group">
                  {post.full_picture && (
                    <div className="w-32 h-32 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
                      <img src={post.full_picture} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${post.is_published ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {post.is_published ? 'تم النشر' : 'مجدول للنشر'}
                        </span>
                        <span className="text-xs font-bold text-white/40">
                          {new Date(post.created_time).toLocaleString('ar-EG')}
                        </span>
                      </div>
                      <p className="text-white/80 text-sm leading-relaxed line-clamp-3">{post.message}</p>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      {!post.is_published && post.scheduled_publish_time && (
                        <p className="text-xs font-bold text-blue-400 flex items-center gap-2 bg-blue-400/10 px-3 py-1.5 rounded-lg">
                          <Clock className="w-3.5 h-3.5" />
                          موعد النشر: {new Date(post.scheduled_publish_time * 1000).toLocaleString('ar-EG')}
                        </p>
                      )}
                      <a 
                        href={post.permalink_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs font-black text-white/40 hover:text-blue-500 transition-colors flex items-center gap-2 ml-auto"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        عرض المنشور
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBotSettings = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveTab('messages')} className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-2xl font-black text-white">إعدادات البوت المبرمج</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-bg-card border border-white/5 rounded-2xl p-6 h-fit">
            <h4 className="font-bold text-white mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-500" />
              إضافة قاعدة رد جديدة
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">الكلمة المفتاحية (Keyword)</label>
                <input 
                  type="text" 
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="مثال: سعر، توصيل، متوفر"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">نص الرد التلقائي</label>
                <textarea 
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="اكتب الرد الذي سيتم إرساله..."
                  rows={4}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>
              <button 
                onClick={() => {
                  if (newKeyword && newReply) {
                    addBotRule(newKeyword, newReply);
                    setNewKeyword('');
                    setNewReply('');
                  }
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
              >
                إضافة القاعدة
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-bg-card border border-white/5 rounded-2xl p-6">
            <h4 className="font-bold text-white mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-500" />
              القواعد الحالية
            </h4>
            <div className="space-y-4">
              {botRules.map((rule, index) => (
                <div key={index} className="p-4 bg-white/5 border border-white/5 rounded-xl flex justify-between items-start group">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-md">كلمة: {rule.keyword}</span>
                    </div>
                    <p className="text-sm text-white/80">{rule.reply}</p>
                  </div>
                  <button 
                    onClick={() => removeBotRule(index)}
                    className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {botRules.length === 0 && (
                <div className="text-center py-10 text-white/20 italic">
                  لم يتم إضافة أي قواعد رد حتى الآن. ابدأ بإضافة كلمتك المفتاحية الأولى!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#1877F2]/10 rounded-2xl flex items-center justify-center text-[#1877F2]">
            <Facebook className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">نظام إدارة منصة ميتا</h2>
            <p className="text-sm opacity-40">إدارة شاملة للحسابات، الحملات، الإعلانات، والتواصل</p>
          </div>
        </div>
        <button 
          onClick={handleClearToken}
          className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl text-sm font-bold transition-colors"
        >
          تسجيل الخروج من ميتا
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-2 bg-bg-card border border-white/5 p-2 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
        >
          <BarChart2 className="w-4 h-4" />
          نظرة عامة
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'accounts' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
        >
          <Users className="w-4 h-4" />
          الحسابات الإعلانية
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'campaigns' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
        >
          <Megaphone className="w-4 h-4" />
          الحملات
        </button>
        <button
          onClick={() => setActiveTab('ads')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'ads' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
        >
          <FileText className="w-4 h-4" />
          سجل الإعلانات
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'messages' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
        >
          <MessageCircle className="w-4 h-4" />
          التواصل والرسائل
        </button>
        <button
          onClick={() => setActiveTab('scheduling')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'scheduling' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
        >
          <Calendar className="w-4 h-4" />
          جدولة ونشر
        </button>
        <button
          onClick={() => setActiveTab('bot')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'bot' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
        >
          <Settings className="w-4 h-4" />
          الرد الآلي
        </button>
      </div>

      {loading && accounts.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'accounts' && renderAccounts()}
          {activeTab === 'campaigns' && renderCampaigns()}
          {activeTab === 'ads' && renderAds()}
          {activeTab === 'messages' && renderMessages()}
          {activeTab === 'scheduling' && renderScheduling()}
          {activeTab === 'bot' && renderBotSettings()}
        </>
      )}
    </div>
  );
};

export default FacebookAdsManager;
