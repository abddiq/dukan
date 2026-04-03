import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import admin from "firebase-admin";
import path from "path";

import firebaseConfig from './firebase-applet-config.json';

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Explicitly use the project ID from the config to ensure we connect to the correct Firebase project
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
    console.log(`Firebase Admin initialized for project: ${firebaseConfig.projectId}`);
  } catch (e) {
    console.error("Firebase Admin initialization failed:", e);
    // Fallback to default only if explicit fails
    admin.initializeApp();
  }
}

const db = admin.firestore();

// Log project ID for debugging
try {
  const projectId = admin.app().options.projectId || "unknown (using default ADC)";
  console.log(`Firestore initialized for project: ${projectId}`);
} catch (e) {
  console.error("Error logging project ID:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Wayl Payment Integration
  app.post("/api/wayl/create-link", async (req, res) => {
    try {
      const { amount, baseAmount, paymentFee, referenceId, productName } = req.body;
      const DEFAULT_API_KEY = "UuMzpuP9mv71qHi3x5hxEQ==:AyMq3tNGWaZ7kjpAOIfi49ch1XcAyTwN8ejD12QkpUt/fV8H/cc8jl45ckA3Ncjk4zYh5jFCq64UOxB/PXB1z53SoI1Ii8M0akEZNKXKYHTcq41J12Plid14xAzwz8zN35CWT4f8sZNNZSDf86K0lBP4VT+WwSHV5eACx5CDmMk=";
      let apiKey = process.env.WAYL_API_KEY || DEFAULT_API_KEY;
      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

      // Try fetching from Firestore
      try {
        const configDoc = await db.collection('settings').doc('wayl_config').get();
        if (configDoc.exists && configDoc.data()?.apiKey) {
          apiKey = configDoc.data()?.apiKey;
        }
      } catch (e) {
        console.error("Error fetching Wayl API key from Firestore:", e);
      }

      if (!apiKey) {
        return res.status(500).json({ message: "WAYL_API_KEY is not configured" });
      }

      const lineItems = [
        {
          label: productName || "Order Payment",
          amount: baseAmount || amount,
          type: "increase",
        }
      ];

      if (paymentFee && paymentFee > 0) {
        lineItems.push({
          label: "رسوم الدفع الإلكتروني",
          amount: paymentFee,
          type: "increase",
        });
      }

      const response = await fetch("https://api.thewayl.com/api/v1/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WAYL-AUTHENTICATION": apiKey,
        },
        body: JSON.stringify({
          env: "live",
          referenceId: referenceId,
          total: amount,
          currency: "IQD",
          lineItem: lineItems,
          webhookUrl: `${appUrl}/api/wayl/webhook`,
          webhookSecret: "secure_random_secret_123",
          redirectionUrl: `${appUrl}/order-success`,
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Wayl API returned non-JSON response:", responseText);
        return res.status(response.status).json({ message: "Invalid response from payment gateway" });
      }
      
      if (!response.ok) {
        console.error("Wayl API Error:", data);
        return res.status(response.status).json(data);
      }

      res.json(data);
    } catch (error) {
      console.error("Server Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Webhook handler
  app.post("/api/wayl/webhook", async (req, res) => {
    try {
      const { referenceId, status } = req.body;
      console.log("Wayl Webhook Received:", { referenceId, status });

      if (referenceId && status === "Complete") {
        await db.collection("orders").doc(referenceId).update({
          paymentStatus: "paid",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Order ${referenceId} marked as paid via webhook`);
      }

      res.json({ status: "ok" });
    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Proxy for local dev environment (simulates the PHP proxy)
  app.post("/wayl-proxy.php", async (req, res) => {
    try {
      const apiKey = req.headers['x-wayl-authentication'] || req.headers['X-WAYL-AUTHENTICATION'];
      
      const response = await fetch('https://api.thewayl.com/api/v1/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WAYL-AUTHENTICATION': apiKey as string
        },
        body: JSON.stringify(req.body)
      });

      const responseText = await response.text();
      res.status(response.status).send(responseText);
    } catch (error: any) {
      console.error("Proxy Error:", error);
      res.status(500).json({ message: "Proxy error: " + error.message });
    }
  });

  // Telegram Integration
  app.get("/api/telegram/info", async (req, res) => {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const channelId = process.env.TELEGRAM_CHANNEL_ID;

      if (!botToken) {
        return res.status(400).json({ message: "TELEGRAM_BOT_TOKEN is not configured" });
      }

      const botResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const botData = await botResponse.json();

      let channelInfo = null;
      if (channelId) {
        try {
          const chatResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${channelId}`);
          const chatData = await chatResponse.json();
          
          const memberCountResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChatMemberCount?chat_id=${channelId}`);
          const memberCountData = await memberCountResponse.json();

          channelInfo = {
            ...chatData.result,
            member_count: memberCountData.result
          };
        } catch (e) {
          console.error("Error fetching channel info:", e);
        }
      }

      res.json({
        bot: botData.result,
        channel: channelInfo,
        channelId: channelId
      });
    } catch (error) {
      console.error("Telegram Info Error:", error);
      res.status(500).json({ message: "Failed to fetch Telegram info" });
    }
  });

  app.get("/api/telegram/history", async (req, res) => {
    try {
      const snapshot = await db.collection("telegram_history")
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();
      
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      res.json(history);
    } catch (error) {
      console.error("Telegram History Error:", error);
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  app.post("/api/telegram/send", async (req, res) => {
    try {
      const { message, photoUrl, type = 'text', fileUrl } = req.body;
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const channelId = process.env.TELEGRAM_CHANNEL_ID;

      if (!botToken || !channelId) {
        return res.status(400).json({ message: "Telegram configuration is missing" });
      }

      let url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      let body: any = {
        chat_id: channelId,
        text: message,
        parse_mode: "HTML"
      };

      if (type === 'photo' || photoUrl) {
        url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
        body = {
          chat_id: channelId,
          photo: photoUrl || fileUrl,
          caption: message,
          parse_mode: "HTML"
        };
      } else if (type === 'video') {
        url = `https://api.telegram.org/bot${botToken}/sendVideo`;
        body = {
          chat_id: channelId,
          video: fileUrl,
          caption: message,
          parse_mode: "HTML"
        };
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      // Save to history using Admin SDK
      await db.collection("telegram_history").add({
        messageId: data.result.message_id,
        text: message,
        photoUrl: photoUrl || (type === 'photo' ? fileUrl : null),
        videoUrl: type === 'video' ? fileUrl : null,
        type,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json(data);
    } catch (error) {
      console.error("Telegram Send Error:", error);
      res.status(500).json({ message: "Failed to send message to Telegram" });
    }
  });

  app.get("/api/products", async (req, res) => {
    try {
      const snapshot = await db.collection("products")
        .where("isActive", "==", true)
        .limit(50)
        .get();
      
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      res.json(products);
    } catch (error) {
      console.error("Fetch Products Error:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/telegram/delete", async (req, res) => {
    try {
      const { messageId, historyId } = req.body;
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const channelId = process.env.TELEGRAM_CHANNEL_ID;

      if (!botToken || !channelId || !messageId) {
        return res.status(400).json({ message: "Missing parameters" });
      }

      const response = await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channelId,
          message_id: messageId
        })
      });

      const data = await response.json();
      
      if (historyId) {
        await db.collection("telegram_history").doc(historyId).delete();
      }

      res.json(data);
    } catch (error) {
      console.error("Telegram Delete Error:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  app.post("/api/telegram/update-channel", async (req, res) => {
    try {
      const { title, description } = req.body;
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const channelId = process.env.TELEGRAM_CHANNEL_ID;

      if (!botToken || !channelId) {
        return res.status(400).json({ message: "Telegram configuration is missing" });
      }

      const results: any = {};

      if (title) {
        const titleRes = await fetch(`https://api.telegram.org/bot${botToken}/setChatTitle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: channelId, title })
        });
        results.title = await titleRes.json();
      }

      if (description) {
        const descRes = await fetch(`https://api.telegram.org/bot${botToken}/setChatDescription`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: channelId, description })
        });
        results.description = await descRes.json();
      }

      res.json(results);
    } catch (error) {
      console.error("Telegram Update Error:", error);
      res.status(500).json({ message: "Failed to update channel info" });
    }
  });

  // Heeiz Shipping Integration
  const HEEIZ_BASE_URL = "https://api.heeiz.net/api/v1/external";
  const HEEIZ_DEFAULT_TOKEN = process.env.HEEIZ_API_TOKEN || "79vznsrIc31HSHPhcJIOGYRIUG8QMp7PfNgUqQrAu6pPuCOgcIGE9KSFoh5sXXtpKlVF9o1Iq15h9M4nFZDFXAMO5OOK3AwfcA2ZUE0T5DKazcWJ9gWCExj8q425p3VvD4wtXMkaesthLMIFJA8nnlg46oi5XcqyJ0hGJqlWub0j7t7Faxfuo2ZQ363z8jT8EKD6prg30QiaPrCTuDxGreK8b48oVvgliZh5ekTNoxPt5NnCFTMkpn8405tAzFN12H2ZdUjQJEp665Mk7I0HXj9GoJFYyM81ZhLiNCpz4qobS0Z6ossN0xXhuJnRPzMEqKvxmUNgOTvnJqw8mrrD8vxFfGkWLeBHxf30EIllAmYT0DmwX5k08Kci8lYSnJo6CNMaykU4zpyHnufzCg0UY2XY2yBA9yXmZfncMMXv1xqf7mwfQL9ymYovwidFOx5RAkFl3QlCQlNd7J5e6zF1911bgjJAr2wDinGD7uz2htL40GhIeE8U7e6df105";

  app.get("/api/heeiz/provinces", async (req, res) => {
    try {
      const headerToken = req.headers["x-heeiz-token"];
      const token = (headerToken && headerToken !== "" && headerToken !== "undefined") 
        ? headerToken 
        : HEEIZ_DEFAULT_TOKEN;

      console.log(`[Heeiz] Fetching provinces with token: ${token.substring(0, 10)}...`);
      
      const response = await fetch(`${HEEIZ_BASE_URL}/locations/provinces`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
          "Accept-Language": "ar"
        }
      });
      
      const responseText = await response.text();
      console.log(`[Heeiz] Provinces Response Status: ${response.status}`);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("[Heeiz] Failed to parse provinces response as JSON:", responseText);
        return res.status(500).json({ message: "Invalid JSON response from Heeiz", raw: responseText });
      }
      
      res.status(response.status).json(data);
    } catch (error) {
      console.error("Heeiz Provinces Error:", error);
      res.status(500).json({ message: "Failed to fetch provinces from Heeiz", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/heeiz/regions/:provinceId", async (req, res) => {
    try {
      const headerToken = req.headers["x-heeiz-token"];
      const token = (headerToken && headerToken !== "" && headerToken !== "undefined") 
        ? headerToken 
        : HEEIZ_DEFAULT_TOKEN;

      const { provinceId } = req.params;
      const response = await fetch(`${HEEIZ_BASE_URL}/locations/provinces/${provinceId}/regions`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
          "Accept-Language": "ar"
        }
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Heeiz Regions Error:", error);
      res.status(500).json({ message: "Failed to fetch regions from Heeiz" });
    }
  });

  app.post("/api/heeiz/orders", async (req, res) => {
    try {
      const headerToken = req.headers["x-heeiz-token"];
      const token = (headerToken && headerToken !== "" && headerToken !== "undefined") 
        ? headerToken 
        : HEEIZ_DEFAULT_TOKEN;
      
      console.log("--- Heeiz Order Submission ---");
      console.log("Token Source:", headerToken ? "Request Header" : "Default Environment Token");
      console.log("Payload:", JSON.stringify(req.body, null, 2));
      
      const response = await fetch(`${HEEIZ_BASE_URL}/orders/direct`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Accept-Language": "ar"
        },
        body: JSON.stringify(req.body)
      });
      
      const data = await response.json();
      console.log("Heeiz Order Response Status:", response.status);
      console.log("Heeiz Order Response Data:", JSON.stringify(data, null, 2));
      
      res.status(response.status).json(data);
    } catch (error) {
      console.error("Heeiz Order Proxy Error:", error);
      res.status(500).json({ message: "Failed to create order in Heeiz due to server error", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*all", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
