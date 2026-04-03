
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PAGE_VIEW = 'page_view',
  ORDER_UPDATE = 'order_update',
  PRODUCT_UPDATE = 'product_update'
}

export interface UserActivity {
  id?: string;
  userId: string;
  userName: string;
  type: ActivityType;
  timestamp: any;
  details?: string;
  metadata?: any;
}

export const logActivity = async (activity: Omit<UserActivity, 'timestamp'>) => {
  const path = 'user_activities';
  try {
    await addDoc(collection(db, path), {
      ...activity,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getUserActivities = async (userId: string, maxResults: number = 50) => {
  const path = 'user_activities';
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserActivity[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};
