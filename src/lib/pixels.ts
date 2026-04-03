
import { StoreSettings } from '../types';

declare global {
  interface Window {
    fbq: any;
    ttq: any;
    snaptr: any;
    _fbq: any;
  }
}

export const initPixels = (settings: StoreSettings) => {
  const { metaPixelId, tiktokPixelId, snapchatPixelId } = settings;

  // Meta Pixel
  if (metaPixelId && !window.fbq) {
    (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return; n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s)
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', metaPixelId);
    window.fbq('track', 'PageView');
  }

  // TikTok Pixel
  if (tiktokPixelId && !window.ttq) {
    (function (w: any, d: any, t: any) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","setSelfHost","enableCookie","disableCookie"],ttq.setSelfHost=function(t: any){ttq._v=t};ttq.load=function(e: any,n: any){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load(tiktokPixelId);
      ttq.page();
    })(window, document, 'ttq');
  }

  // Snapchat Pixel
  if (snapchatPixelId && !window.snaptr) {
    (function(e: any, t: any, n: any) {
      if (e.snaptr) return; var a: any = e.snaptr = function() {
        a.handleRequest ? a.handleRequest.apply(a, arguments) : a.queue.push(arguments)
      };
      a.queue = []; var s = t.createElement(n); s.async = !0;
      s.src = "https://sc-static.net/scevent.min.js";
      var r = t.getElementsByTagName(n)[0]; r.parentNode.insertBefore(s, r)
    })(window, document, "script");
    window.snaptr('init', snapchatPixelId);
    window.snaptr('track', 'PAGE_VIEW');
  }
};

export const trackPageView = () => {
  if (window.fbq) window.fbq('track', 'PageView');
  if (window.ttq) window.ttq.page();
  if (window.snaptr) window.snaptr('track', 'PAGE_VIEW');
};

export const trackAddToCart = (product: any) => {
  const data = {
    content_name: product.name_ar,
    content_ids: [product.id],
    content_type: 'product',
    value: product.price,
    currency: 'IQD'
  };

  if (window.fbq) window.fbq('track', 'AddToCart', data);
  if (window.ttq) window.ttq.track('AddToCart', {
    contents: [{
      content_id: product.id,
      content_name: product.name_ar,
      quantity: 1,
      price: product.price
    }],
    value: product.price,
    currency: 'IQD'
  });
  if (window.snaptr) window.snaptr('track', 'ADD_CART', {
    item_ids: [product.id],
    price: product.price,
    currency: 'IQD'
  });
};

export const trackInitiateCheckout = (total: number, items: any[]) => {
  const data = {
    content_ids: items.map((i: any) => i.productId),
    content_type: 'product',
    value: total,
    currency: 'IQD',
    num_items: items.length
  };

  if (window.fbq) window.fbq('track', 'InitiateCheckout', data);
  if (window.ttq) window.ttq.track('InitiateCheckout', {
    contents: items.map((i: any) => ({
      content_id: i.productId,
      content_name: i.name,
      quantity: i.qty,
      price: i.price
    })),
    value: total,
    currency: 'IQD'
  });
  if (window.snaptr) window.snaptr('track', 'START_CHECKOUT', {
    item_ids: items.map((i: any) => i.productId),
    price: total,
    currency: 'IQD'
  });
};

export const trackPurchase = (order: any) => {
  const data = {
    content_ids: order.items.map((i: any) => i.productId),
    content_type: 'product',
    value: order.totalAmount,
    currency: 'IQD',
    num_items: order.items.length
  };

  if (window.fbq) window.fbq('track', 'Purchase', data);
  if (window.ttq) window.ttq.track('CompletePayment', {
    contents: order.items.map((i: any) => ({
      content_id: i.productId,
      content_name: i.name,
      quantity: i.qty,
      price: i.price
    })),
    value: order.totalAmount,
    currency: 'IQD'
  });
  if (window.snaptr) window.snaptr('track', 'PURCHASE', {
    item_ids: order.items.map((i: any) => i.productId),
    price: order.totalAmount,
    currency: 'IQD',
    transaction_id: order.id
  });
};
