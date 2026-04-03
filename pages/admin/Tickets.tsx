import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../src/firebase';
import { Ticket } from '../../src/types';
import { Mail, Phone, User, Clock, CheckCircle, Trash2, Loader2, MessageSquare } from 'lucide-react';

const AdminTickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const fetchedTickets = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Ticket[];
        setTickets(fetchedTickets);
        setLoading(false);
      },
      (error) => {
        console.error("Tickets listener error:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (id: string, status: Ticket['status']) => {
    try {
      await updateDoc(doc(db, 'tickets', id), { status });
    } catch (error) {
      console.error("Error updating ticket status:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه التذكرة؟')) return;
    try {
      await deleteDoc(doc(db, 'tickets', id));
    } catch (error) {
      console.error("Error deleting ticket:", error);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">تذاكر الدعم</h2>
          <p className="opacity-40 text-sm">إدارة رسائل تواصل معنا والطلبات الفنية</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {tickets.map((ticket) => (
          <div key={ticket.id} className={`p-6 bg-[var(--color-bg-card)] border rounded-3xl transition-all ${ticket.status === 'new' ? 'border-primary' : 'border-white/5'}`}>
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-4 flex-grow">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ticket.status === 'new' ? 'bg-primary text-white' : 'bg-white/5 opacity-40'}`}>
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{ticket.subject}</h3>
                    <div className="flex items-center gap-4 text-xs opacity-40 mt-1">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {ticket.name}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleString('ar-IQ') : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl text-sm leading-relaxed opacity-80">
                  {ticket.message}
                </div>

                <div className="flex flex-wrap gap-4">
                  <a href={`mailto:${ticket.email}`} className="flex items-center gap-2 text-xs bg-white/5 px-4 py-2 rounded-lg hover:bg-primary/20 transition-all">
                    <Mail className="w-4 h-4" /> {ticket.email}
                  </a>
                  <a href={`tel:${ticket.phone}`} className="flex items-center gap-2 text-xs bg-white/5 px-4 py-2 rounded-lg hover:bg-primary/20 transition-all">
                    <Phone className="w-4 h-4" /> {ticket.phone}
                  </a>
                </div>
              </div>

              <div className="flex flex-row md:flex-col justify-between items-end gap-4">
                <div className="flex items-center gap-2">
                  <select 
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(ticket.id, e.target.value as Ticket['status'])}
                    className="bg-bg-main border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary"
                  >
                    <option value="new">جديدة</option>
                    <option value="read">تمت القراءة</option>
                    <option value="replied">تم الرد</option>
                  </select>
                  <button 
                    onClick={() => handleDelete(ticket.id)}
                    className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {ticket.status === 'replied' && (
                  <div className="flex items-center gap-1 text-green-500 text-xs font-bold">
                    <CheckCircle className="w-4 h-4" /> تم الرد
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {tickets.length === 0 && (
          <div className="py-20 text-center opacity-20 space-y-4">
            <Mail className="w-20 h-20 mx-auto" />
            <p className="text-xl font-bold">لا توجد تذاكر حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTickets;
