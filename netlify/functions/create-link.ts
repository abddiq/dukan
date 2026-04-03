import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAe7balTauQ5BY6Z1-fP4ULeucGBEgmTOU",
  authDomain: "gt23-fb938.firebaseapp.com",
  projectId: "gt23-fb938",
  storageBucket: "gt23-fb938.firebasestorage.app",
  messagingSenderId: "149578575884",
  appId: "1:149578575884:web:52164d2d1c394cd5a57e29"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { amount, baseAmount, paymentFee, referenceId, productName } = body;
    
    const DEFAULT_API_KEY = "UuMzpuP9mv71qHi3x5hxEQ==:AyMq3tNGWaZ7kjpAOIfi49ch1XcAyTwN8ejD12QkpUt/fV8H/cc8jl45ckA3Ncjk4zYh5jFCq64UOxB/PXB1z53SoI1Ii8M0akEZNKXKYHTcq41J12Plid14xAzwz8zN35CWT4f8sZNNZSDf86K0lBP4VT+WwSHV5eACx5CDmMk=";
    let apiKey = process.env.WAYL_API_KEY || DEFAULT_API_KEY;
    const appUrl = process.env.URL || event.headers.origin || 'https://pcthrone.com';

    // Try fetching from Firestore
    try {
      const configDoc = await getDoc(doc(db, 'settings', 'wayl_config'));
      if (configDoc.exists() && configDoc.data().apiKey) {
        apiKey = configDoc.data().apiKey;
      }
    } catch (e) {
      console.error("Error fetching Wayl API key from Firestore:", e);
    }

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "WAYL_API_KEY is not configured" })
      };
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
      return {
        statusCode: response.status,
        body: JSON.stringify({ message: "Invalid response from payment gateway" })
      };
    }
    
    if (!response.ok) {
      console.error("Wayl API Error:", data);
      return {
        statusCode: response.status,
        body: JSON.stringify(data)
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error("Server Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" })
    };
  }
};
