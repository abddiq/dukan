import { useStore } from '../contexts/StoreContext';
import { collection, doc, query, where, Firestore, CollectionReference, DocumentReference, Query } from 'firebase/firestore';

export const useFirestore = () => {
  const { db, store } = useStore();

  const getCollection = (path: string) => collection(db, path);
  const getDoc = (path: string, id: string) => doc(db, path, id);
  
  return {
    db,
    store,
    getCollection,
    getDoc
  };
};
