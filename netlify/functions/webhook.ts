import { Handler } from '@netlify/functions';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

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
    const { referenceId, status } = body;
    console.log("Wayl Webhook Received:", { referenceId, status });

    if (referenceId && status === "Complete") {
      const orderRef = doc(db, "orders", referenceId);
      await updateDoc(orderRef, {
        paymentStatus: "paid",
        updatedAt: serverTimestamp(),
      });
      console.log(`Order ${referenceId} marked as paid via webhook`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status: "ok" })
    };
  } catch (error) {
    console.error("Webhook Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Webhook processing failed" })
    };
  }
};
