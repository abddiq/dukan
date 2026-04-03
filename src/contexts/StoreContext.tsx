
import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp, getApp } from 'firebase/app';
import { getFirestore, Firestore, collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { Store, StoreSettings } from '../types';
import { firebaseConfig } from '../firebase';

interface StoreContextType {
  store: Store | null;
  db: Firestore; // Store-specific Firestore instance
  isPlatform: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  error: string | null;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [storeDb, setStoreDb] = useState<Firestore>(getFirestore(getApp(), firebaseConfig.firestoreDatabaseId));
  const [isPlatform, setIsPlatform] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectStore = async () => {
      const hostname = window.location.hostname;
      const mainDomain = 'dukan.com';
      const superAdminSubdomain = 'admin.' + mainDomain;
      const platformDb = getFirestore(getApp(), firebaseConfig.firestoreDatabaseId);

      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const urlParams = new URLSearchParams(window.location.search);
        const mockStoreId = urlParams.get('storeId');
        
        if (mockStoreId) {
          await fetchStoreById(mockStoreId, platformDb);
        } else {
          setIsPlatform(true);
          setLoading(false);
        }
        return;
      }

      if (hostname === mainDomain) {
        setIsPlatform(true);
        setLoading(false);
      } else if (hostname === superAdminSubdomain) {
        setIsSuperAdmin(true);
        setLoading(false);
      } else {
        try {
          let storeQuery;
          if (hostname.endsWith('.' + mainDomain)) {
            const subdomain = hostname.replace('.' + mainDomain, '');
            storeQuery = query(collection(platformDb, 'stores'), where('subdomain', '==', subdomain), limit(1));
          } else {
            storeQuery = query(collection(platformDb, 'stores'), where('customDomain', '==', hostname), limit(1));
          }

          const querySnapshot = await getDocs(storeQuery);
          if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const storeData = { id: doc.id, ...(doc.data() as any) } as Store;
            setStore(storeData);
            
            // Initialize store-specific database if specified
            if (storeData.databaseId && storeData.databaseId !== '(default)') {
              setStoreDb(getFirestore(getApp(), storeData.databaseId));
            }
          } else {
            setError('Store not found');
          }
        } catch (err) {
          console.error('Error detecting store:', err);
          setError('Failed to load store data');
        } finally {
          setLoading(false);
        }
      }
    };

    const fetchStoreById = async (id: string, platformDb: Firestore) => {
      try {
        const docRef = doc(platformDb, 'stores', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const storeData = { id: docSnap.id, ...docSnap.data() } as Store;
          setStore(storeData);
          if (storeData.databaseId && storeData.databaseId !== '(default)') {
            setStoreDb(getFirestore(getApp(), storeData.databaseId));
          }
        } else {
          setError('Store not found');
        }
      } catch (err) {
        setError('Failed to load store data');
      } finally {
        setLoading(false);
      }
    };

    detectStore();
  }, []);

  return (
    <StoreContext.Provider value={{ store, db: storeDb, isPlatform, isSuperAdmin, loading, error }}>
      {children}
    </StoreContext.Provider>
  );
};
