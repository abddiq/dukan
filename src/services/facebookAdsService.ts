const FB_GRAPH_URL = 'https://graph.facebook.com/v19.0';

export interface FBAccount {
  id: string;
  account_id: string;
  name: string;
  account_status: number;
  balance: number;
  currency: string;
}

export interface FBCampaign {
  id: string;
  name: string;
  objective: string;
  status: string;
  insights?: {
    data: {
      spend: string;
      impressions: string;
      clicks: string;
      actions?: { action_type: string; value: string }[];
    }[];
  };
}

export interface FBAd {
  id: string;
  name: string;
  status: string;
  campaign?: { name: string };
  insights?: {
    data: {
      spend: string;
      impressions: string;
      clicks: string;
      cpc: string;
      ctr: string;
      actions?: { action_type: string; value: string }[];
    }[];
  };
}

export const fetchAdAccounts = async (accessToken: string): Promise<FBAccount[]> => {
  const res = await fetch(`${FB_GRAPH_URL}/me/adaccounts?fields=name,account_id,account_status,balance,currency&access_token=${accessToken}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || 'Failed to fetch ad accounts');
  }
  const data = await res.json();
  return data.data;
};

export const fetchCampaigns = async (accountId: string, accessToken: string): Promise<FBCampaign[]> => {
  const res = await fetch(`${FB_GRAPH_URL}/${accountId}/campaigns?fields=name,objective,status,insights{spend,actions,impressions,clicks}&access_token=${accessToken}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || 'Failed to fetch campaigns');
  }
  const data = await res.json();
  return data.data;
};

export const fetchAds = async (accountId: string, accessToken: string): Promise<FBAd[]> => {
  const res = await fetch(`${FB_GRAPH_URL}/${accountId}/ads?fields=name,status,campaign{name},insights{spend,actions,impressions,clicks,cpc,ctr}&access_token=${accessToken}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || 'Failed to fetch ads');
  }
  const data = await res.json();
  return data.data;
};

export const fetchAdDetails = async (adId: string, accessToken: string): Promise<any> => {
  const res = await fetch(`${FB_GRAPH_URL}/${adId}?fields=name,status,campaign{name},adcreatives{body,title,image_url,thumbnail_url,video_id},insights{spend,actions,impressions,clicks,cpc,ctr}&access_token=${accessToken}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || 'Failed to fetch ad details');
  }
  return await res.json();
};

export const updateAd = async (adId: string, updates: any, accessToken: string): Promise<any> => {
  const res = await fetch(`${FB_GRAPH_URL}/${adId}?access_token=${accessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || 'Failed to update ad');
  }
  return await res.json();
};

export const fetchAdComments = async (adId: string, accessToken: string): Promise<any[]> => {
  // First get the creative to find the effective object story ID
  const creativeRes = await fetch(`${FB_GRAPH_URL}/${adId}?fields=adcreatives{effective_object_story_id}&access_token=${accessToken}`);
  if (!creativeRes.ok) return [];
  const creativeData = await creativeRes.json();
  const storyId = creativeData.adcreatives?.data?.[0]?.effective_object_story_id;
  
  if (!storyId) return [];

  // Then fetch comments for that story
  const commentsRes = await fetch(`${FB_GRAPH_URL}/${storyId}/comments?fields=from,message,created_time,is_hidden&access_token=${accessToken}`);
  if (!commentsRes.ok) return [];
  const commentsData = await commentsRes.json();
  return commentsData.data || [];
};

export interface FBPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
  picture?: { data: { url: string } };
  instagram_business_account?: { id: string };
}

export const fetchPages = async (accessToken: string): Promise<FBPage[]> => {
  const res = await fetch(`${FB_GRAPH_URL}/me/accounts?fields=name,access_token,category,picture,instagram_business_account&access_token=${accessToken}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || 'Failed to fetch pages');
  }
  const data = await res.json();
  return data.data;
};

export const fetchConversations = async (pageId: string, pageAccessToken: string): Promise<any> => {
  const res = await fetch(`${FB_GRAPH_URL}/${pageId}/conversations?fields=participants,updated_time,unread_count,messages.limit(1){message,created_time},platform&limit=100&access_token=${pageAccessToken}`);
  if (!res.ok) return { data: [] };
  return await res.json();
};

export const fetchMessages = async (conversationId: string, pageAccessToken: string): Promise<any> => {
  const res = await fetch(`${FB_GRAPH_URL}/${conversationId}/messages?fields=message,created_time,from&limit=100&access_token=${pageAccessToken}`);
  if (!res.ok) return { data: [] };
  return await res.json();
};

export const sendFBMessage = async (recipientId: string, text: string, pageAccessToken: string): Promise<any> => {
  const res = await fetch(`${FB_GRAPH_URL}/me/messages?access_token=${pageAccessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text }
    }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || 'Failed to send message');
  }
  return await res.json();
};

export const publishPost = async (pageId: string, pageAccessToken: string, message: string, link?: string, scheduledTime?: number): Promise<any> => {
  const url = `${FB_GRAPH_URL}/${pageId}/feed?access_token=${pageAccessToken}`;
  
  const body: any = {
    message,
  };
  
  if (link) body.link = link;
  
  if (scheduledTime) {
    body.published = false;
    body.scheduled_publish_time = scheduledTime;
  } else {
    body.published = true;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || 'Failed to publish post');
  }
  return await res.json();
};

export const createCampaign = async (accountId: string, accessToken: string, campaignData: { name: string, objective: string, status: string }): Promise<any> => {
  const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const res = await fetch(`${FB_GRAPH_URL}/${formattedAccountId}/campaigns?access_token=${accessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: campaignData.name,
      objective: campaignData.objective,
      status: campaignData.status,
      buying_type: 'AUCTION',
      special_ad_categories: []
    }),
  });
  if (!res.ok) {
    const error = await res.json();
    console.error('Facebook API Error Details:', JSON.stringify(error, null, 2));
    throw new Error(error.error?.message || 'Failed to create campaign');
  }
  return await res.json();
};

export const fetchPermissions = async (accessToken: string): Promise<any[]> => {
  const res = await fetch(`${FB_GRAPH_URL}/me/permissions?access_token=${accessToken}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
};

export const fetchPagePosts = async (pageId: string, pageAccessToken: string): Promise<any[]> => {
  try {
    const res = await fetch(`${FB_GRAPH_URL}/${pageId}/promotable_posts?fields=message,created_time,full_picture,permalink_url,is_published,scheduled_publish_time&access_token=${pageAccessToken}`);
    if (res.ok) {
      const data = await res.json();
      return data.data || [];
    }
  } catch (e) {
    console.error("Error fetching promotable_posts:", e);
  }

  try {
    const res2 = await fetch(`${FB_GRAPH_URL}/${pageId}/posts?fields=message,created_time,full_picture,permalink_url,is_published,scheduled_publish_time&access_token=${pageAccessToken}`);
    if (res2.ok) {
      const data2 = await res2.json();
      return data2.data || [];
    }
  } catch (e) {
    console.error("Error fetching regular posts:", e);
  }
  
  return [];
};
