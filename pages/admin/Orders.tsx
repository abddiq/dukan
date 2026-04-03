import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Truck, CheckCircle, XCircle, Clock, Loader2, Trash2, Edit2, X, Filter, CreditCard, Send, Package, Download, FileSpreadsheet, Zap } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../src/firebase';
import { CartContext } from '../../src/App';
import { collection, getDocs, updateDoc, deleteDoc, doc, query, orderBy, getDoc, arrayUnion, Timestamp, writeBatch } from 'firebase/firestore';
import { Order, OrderStatus, PaymentStatus, ShippingCompany } from '../../src/types';
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';

const AdminOrders: React.FC = () => {
  const navigate = useNavigate();
  const context = React.useContext(CartContext);
  const user = context?.user;
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [shippingCompanies, setShippingCompanies] = useState<ShippingCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Order>>({});
  const [selectedShippingCompanyId, setSelectedShippingCompanyId] = useState<string>('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [showPrepSlip, setShowPrepSlip] = useState(false);
  const [showBulkShippingModal, setShowBulkShippingModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showConfirmStatusModal, setShowConfirmStatusModal] = useState(false);
  const [exportedOrderIds, setExportedOrderIds] = useState<string[]>([]);
  const [exportCompanyId, setExportCompanyId] = useState<string>('default');
  const [prepOrders, setPrepOrders] = useState<Order[]>([]);
  const slipRef = useRef<HTMLDivElement>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const fetchedOrders = snap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          paymentStatus: data.paymentStatus || PaymentStatus.UNPAID // Default for old orders
        };
      }) as Order[];
      setOrders(fetchedOrders);
      setFilteredOrders(fetchedOrders);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.LIST, 'orders');
      console.error(err);
      if (err.code === 'permission-denied') {
        setError('ليس لديك صلاحية للوصول إلى هذه البيانات. يرجى التأكد من إعداد قواعد الحماية في Firebase.');
      } else {
        setError('حدث خطأ أثناء جلب البيانات.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchShippingCompanies = async () => {
    try {
      const snap = await getDocs(collection(db, 'shipping_companies'));
      const companies = snap.docs.map(d => ({ id: d.id, ...d.data() })) as ShippingCompany[];
      setShippingCompanies(companies.filter(c => !c.name.toLowerCase().includes('nwaslak')));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'shipping_companies');
      console.error("Error fetching shipping companies:", err);
    }
  };

  useEffect(() => { 
    fetchOrders(); 
    fetchShippingCompanies();
  }, []);

  useEffect(() => {
    let result = orders;

    if (searchTerm) {
      result = result.filter(o => 
        o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer.phone.includes(searchTerm)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }

    if (paymentFilter !== 'all') {
      result = result.filter(o => o.paymentStatus === paymentFilter);
    }

    setFilteredOrders(result);
  }, [searchTerm, statusFilter, paymentFilter, orders]);

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkSend = async () => {
    if (selectedOrderIds.length === 0) return;
    if (!confirm(`هل أنت متأكد من إرسال ${selectedOrderIds.length} طلب؟`)) return;
    
    setLoading(true);
    try {
      const batch = selectedOrderIds.map(id => {
        const order = orders.find(o => o.id === id);
        const historyEntry = {
          status: OrderStatus.CONFIRMED,
          timestamp: Timestamp.now(),
          updatedBy: user?.uid,
          notes: `تم تأكيد الطلب بالجملة (الحالة السابقة: ${order?.status || 'غير معروف'})`
        };
        return updateDoc(doc(db, 'orders', id), { 
          status: OrderStatus.CONFIRMED,
          updatedAt: new Date().toISOString(),
          statusHistory: arrayUnion(historyEntry)
        });
      });
      await Promise.all(batch);
      alert('تم إرسال الطلبات بنجاح');
      setSelectedOrderIds([]);
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الإرسال');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPrepare = async () => {
    if (selectedOrderIds.length === 0) return;
    
    setLoading(true);
    try {
      const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));
      const batch = selectedOrderIds.map(id => {
        const order = orders.find(o => o.id === id);
        const historyEntry = {
          status: OrderStatus.PROCESSING,
          timestamp: Timestamp.now(),
          updatedBy: user?.uid,
          notes: `تم تحويل الطلب للتجهيز بالجملة (الحالة السابقة: ${order?.status || 'غير معروف'})`
        };
        return updateDoc(doc(db, 'orders', id), { 
          status: OrderStatus.PROCESSING,
          updatedAt: new Date().toISOString(),
          statusHistory: arrayUnion(historyEntry)
        });
      });
      await Promise.all(batch);
      
      setPrepOrders(selectedOrders);
      setShowPrepSlip(true);
      setSelectedOrderIds([]);
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تجهيز الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSlips = () => {
    if (!slipRef.current) return;
    
    const element = slipRef.current;
    const opt = {
      margin: 0,
      filename: `preparation-slips-${new Date().getTime()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: [100, 150] as [number, number], orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };

  const handleExportToExcel = () => {
    if (selectedOrderIds.length === 0) {
      alert('يرجى تحديد الطلبات المراد تصديرها أولاً');
      return;
    }

    const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));
    let exportData: any[] = [];
    let fileName = `orders_export_${new Date().toISOString().split('T')[0]}.xlsx`;

    if (exportCompanyId === 'default') {
      selectedOrders.forEach(order => {
        const businessReference = order.orderNumber || `PCT-${order.id.slice(-6).toUpperCase()}`;
        const createdAt = order.createdAt ? new Date(order.createdAt['seconds'] * 1000).toLocaleString('en-GB') : '';
        
        if (order.items && order.items.length > 0) {
          order.items.forEach((item, index) => {
            exportData.push({
              'Business Reference': businessReference,
              'Customer Name': order.customer.name || '',
              'Customer Phone': order.customer.phone || '',
              'Customer Address': order.customer.address || '',
              'Province': order.customer.city || '',
              'Region': (order.customer as any).region || '',
              'Notes': order.customer.notes || '',
              'Product SKU': item.productId ? item.productId.slice(-6).toUpperCase() : '',
              'Quantity': item.qty || 1,
              'Price': index === 0 ? (order.totalAmount || 0) : 0,
              'Created At': createdAt
            });
          });
        } else {
          exportData.push({
            'Business Reference': businessReference,
            'Customer Name': order.customer.name || '',
            'Customer Phone': order.customer.phone || '',
            'Customer Address': order.customer.address || '',
            'Province': order.customer.city || '',
            'Region': (order.customer as any).region || '',
            'Notes': order.customer.notes || '',
            'Product SKU': '',
            'Quantity': '',
            'Price': order.totalAmount || 0,
            'Created At': createdAt
          });
        }
      });
    } else {
      const company = shippingCompanies.find(c => c.id === exportCompanyId);
      if (!company || !company.excelTemplate) return;
      
      fileName = `${company.name}_Orders_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      selectedOrders.forEach(order => {
        if (order.items && order.items.length > 0) {
          order.items.forEach((item, index) => {
            const rowData: any = {};
            Object.entries(company.excelTemplate!).forEach(([colName, fieldId]) => {
              let value: any = '';
              switch (fieldId) {
                case 'orderNumber': value = order.orderNumber || `PCT-${order.id.slice(-6).toUpperCase()}`; break;
                case 'customerName': value = order.customer.name || ''; break;
                case 'customerPhone': value = order.customer.phone || ''; break;
                case 'customerCity': value = order.customer.city || ''; break;
                case 'customerRegion': value = (order.customer as any).region || ''; break;
                case 'customerAddress': value = order.customer.address || ''; break;
                case 'customerNotes': value = order.customer.notes || ''; break;
                case 'itemsString': value = order.items.map(i => `${i.name} (x${i.qty})`).join('، '); break;
                case 'productSKU': value = item.productId ? item.productId.slice(-6).toUpperCase() : ''; break;
                case 'quantity': value = item.qty || 1; break;
                case 'price': value = index === 0 ? (order.totalAmount || 0) : 0; break;
                case 'subtotal': value = index === 0 ? (order.subtotal || order.totalAmount) : 0; break;
                case 'shippingCost': value = index === 0 ? (order.shippingCost || 0) : 0; break;
                case 'totalAmount': value = index === 0 ? (order.totalAmount || 0) : 0; break;
                case 'paymentMethod': value = order.paymentMethod === 'WAYL' ? 'دفع إلكتروني' : 'عند الاستلام'; break;
                case 'paymentStatus': value = order.paymentStatus === PaymentStatus.PAID ? 'مدفوع' : order.paymentStatus === PaymentStatus.REFUNDED ? 'مسترجع' : 'غير مدفوع'; break;
                case 'status': value = order.status === OrderStatus.PENDING ? 'جديد' : order.status === OrderStatus.CONFIRMED ? 'مؤكد' : order.status === OrderStatus.PROCESSING ? 'قيد التجهيز' : order.status === OrderStatus.SHIPPED ? 'قيد التوصيل' : order.status === OrderStatus.DELIVERED ? 'تم التسليم' : 'ملغي'; break;
                case 'createdAt': value = order.createdAt ? new Date(order.createdAt['seconds'] * 1000).toLocaleString('ar-IQ') : ''; break;
                default: value = '';
              }
              rowData[colName] = value;
            });
            exportData.push(rowData);
          });
        } else {
          const rowData: any = {};
          Object.entries(company.excelTemplate!).forEach(([colName, fieldId]) => {
            let value: any = '';
            switch (fieldId) {
              case 'orderNumber': value = order.orderNumber || `PCT-${order.id.slice(-6).toUpperCase()}`; break;
              case 'customerName': value = order.customer.name || ''; break;
              case 'customerPhone': value = order.customer.phone || ''; break;
              case 'customerCity': value = order.customer.city || ''; break;
              case 'customerRegion': value = (order.customer as any).region || ''; break;
              case 'customerAddress': value = order.customer.address || ''; break;
              case 'customerNotes': value = order.customer.notes || ''; break;
              case 'itemsString': value = ''; break;
              case 'productSKU': value = ''; break;
              case 'quantity': value = ''; break;
              case 'price': value = order.totalAmount || 0; break;
              case 'subtotal': value = order.subtotal || order.totalAmount; break;
              case 'shippingCost': value = order.shippingCost || 0; break;
              case 'totalAmount': value = order.totalAmount || 0; break;
              case 'paymentMethod': value = order.paymentMethod === 'WAYL' ? 'دفع إلكتروني' : 'عند الاستلام'; break;
              case 'paymentStatus': value = order.paymentStatus === PaymentStatus.PAID ? 'مدفوع' : order.paymentStatus === PaymentStatus.REFUNDED ? 'مسترجع' : 'غير مدفوع'; break;
              case 'status': value = order.status === OrderStatus.PENDING ? 'جديد' : order.status === OrderStatus.CONFIRMED ? 'مؤكد' : order.status === OrderStatus.PROCESSING ? 'قيد التجهيز' : order.status === OrderStatus.SHIPPED ? 'قيد التوصيل' : order.status === OrderStatus.DELIVERED ? 'تم التسليم' : 'ملغي'; break;
              case 'createdAt': value = order.createdAt ? new Date(order.createdAt['seconds'] * 1000).toLocaleString('ar-IQ') : ''; break;
              default: value = '';
            }
            rowData[colName] = value;
          });
          exportData.push(rowData);
        }
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الطلبات");
    
    // Auto-size columns
    const maxWidths = exportData.reduce((acc: any, row: any) => {
      Object.keys(row).forEach(key => {
        const val = row[key] ? row[key].toString() : '';
        acc[key] = Math.max(acc[key] || 0, val.length, key.length);
      });
      return acc;
    }, {});
    
    worksheet['!cols'] = Object.keys(maxWidths).map(key => ({ wch: maxWidths[key] + 2 }));

    XLSX.writeFile(workbook, fileName);
    setExportedOrderIds([...selectedOrderIds]);
    setShowExportModal(false);
    setShowConfirmStatusModal(true);
  };

  const handleUpdateExportedOrdersStatus = async () => {
    if (exportedOrderIds.length === 0) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      exportedOrderIds.forEach(id => {
        const orderRef = doc(db, 'orders', id);
        batch.update(orderRef, { status: OrderStatus.CONFIRMED });
      });
      await batch.commit();
      
      setOrders(orders.map(o => 
        exportedOrderIds.includes(o.id) ? { ...o, status: OrderStatus.CONFIRMED } : o
      ));
      
      setShowConfirmStatusModal(false);
      setExportedOrderIds([]);
      setSelectedOrderIds([]); // Optional: clear selection after processing
    } catch (error) {
      console.error("Error updating orders status:", error);
      alert('حدث خطأ أثناء تحديث حالة الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkApiSend = async () => {
    if (!selectedShippingCompanyId) return alert('يرجى اختيار شركة توصيل أولاً');
    if (selectedOrderIds.length === 0) return;

    const company = shippingCompanies.find(c => c.id === selectedShippingCompanyId);
    if (!company || company.apiConfig?.type !== 'heeiz') {
      return alert('شركة الشحن المحددة لا تدعم الإرسال عبر API');
    }

    if (!company.apiConfig?.token) {
      return alert('يرجى ضبط مفتاح الـ API لشركة الشحن أولاً في الإعدادات.');
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedOrderIds) {
      const order = orders.find(o => o.id === id);
      if (!order) continue;

      const provinceId = company.provinceMapping?.[order.customer.city];
      const regionId = company.regionMapping?.[order.customer.city];

      if (!provinceId || !regionId) {
        console.error(`Missing mapping for city ${order.customer.city} in order ${order.orderNumber}`);
        failCount++;
        continue;
      }

      try {
        const cleanPhone = (order.customer?.phone || '').replace(/\D/g, '');
        const payload = {
          customer_name: order.customer?.name || 'غير محدد',
          customer_phone: cleanPhone || '0000000000',
          customer_address: order.customer?.address || 'غير محدد',
          province_id: Number(provinceId),
          region_id: Number(regionId),
          tagar_reference_number: order.orderNumber || order.id,
          external_id: order.orderNumber || order.id,
          order_id: order.orderNumber || order.id,
          reference_number: order.orderNumber || order.id,
          notes: order.customer?.notes || '',
          total_price: order.totalAmount || 0,
          amount: order.totalAmount || 0,
          cod_amount: order.paymentMethod === 'COD' ? (order.totalAmount || 0) : 0,
          currency: 'IQD',
          items: (order.items || []).map(item => ({
            title: item.name || 'عنصر',
            quantity: item.qty || 1,
            price: item.price || 0,
            total: (item.price || 0) * (item.qty || 1),
            sku: item.productId || '000'
          }))
        };

        const res = await fetch('/api/heeiz/orders', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-heeiz-token': (company.apiConfig.token || '').trim()
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.success !== false) {
          const trackingNumber = data.data?.tracking_number || data.tracking_number || data.id || '';
          
          const historyEntry = {
            status: OrderStatus.SHIPPED,
            timestamp: Timestamp.now(),
            updatedBy: user?.uid,
            notes: `تم إرسال الطلب عبر API لشركة ${company.name}${trackingNumber ? ` برقم تتبع: ${trackingNumber}` : ''}`
          };

          await updateDoc(doc(db, 'orders', id), {
            status: OrderStatus.SHIPPED,
            shippingCompany: company.name,
            trackingNumber: trackingNumber,
            updatedAt: new Date().toISOString(),
            statusHistory: arrayUnion(historyEntry)
          });
          successCount++;
        } else {
          console.error(`Failed to send order ${order.orderNumber}:`, data);
          failCount++;
        }
      } catch (err) {
        console.error(`Error sending order ${order.orderNumber}:`, err);
        failCount++;
      }
    }

    alert(`تم إرسال ${successCount} طلب بنجاح. ${failCount > 0 ? `\nفشل إرسال ${failCount} طلب (تأكد من ربط المناطق والمحافظات في إعدادات شركة الشحن).` : ''}`);
    setShowBulkShippingModal(false);
    setSelectedOrderIds([]);
    setSelectedShippingCompanyId('');
    fetchOrders();
    setLoading(false);
  };

  const handleBulkUploadToShipping = async () => {
    if (!selectedShippingCompanyId) return alert('يرجى اختيار شركة توصيل أولاً');
    if (selectedOrderIds.length === 0) return;

    const company = shippingCompanies.find(c => c.id === selectedShippingCompanyId);
    if (!company) return;

    setLoading(true);
    try {
      const batch = selectedOrderIds.map(id => {
        const order = orders.find(o => o.id === id);
        const historyEntry = {
          status: OrderStatus.SHIPPED,
          timestamp: Timestamp.now(),
          updatedBy: user?.uid,
          notes: `تم إرسال الطلب لشركة التوصيل (${company.name}) بالجملة`
        };
        return updateDoc(doc(db, 'orders', id), {
          status: OrderStatus.SHIPPED,
          shippingCompany: company.name,
          updatedAt: new Date().toISOString(),
          statusHistory: arrayUnion(historyEntry)
        });
      });
      await Promise.all(batch);
      alert(`تم رفع ${selectedOrderIds.length} طلب بنجاح إلى شركة ${company.name}`);
      setShowBulkShippingModal(false);
      setSelectedOrderIds([]);
      setSelectedShippingCompanyId('');
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء رفع الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadToShipping = async (orderId: string) => {
    if (!selectedShippingCompanyId) return alert('يرجى اختيار شركة توصيل أولاً');
    
    const company = shippingCompanies.find(c => c.id === selectedShippingCompanyId);
    if (!company) return;

    setUploading(orderId);
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const historyEntry = {
        status: OrderStatus.SHIPPED,
        timestamp: Timestamp.now(),
        updatedBy: user?.uid,
        notes: `تم إرسال الطلب لشركة التوصيل (${company.name})`
      };

      await updateDoc(doc(db, 'orders', orderId), {
        status: OrderStatus.SHIPPED,
        shippingCompany: company.name,
        updatedAt: new Date().toISOString(),
        statusHistory: arrayUnion(historyEntry)
      });

      alert(`تم تحويل الطلب بنجاح إلى شركة ${company.name}`);
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { 
          ...prev, 
          status: OrderStatus.SHIPPED, 
          shippingCompany: company.name,
          statusHistory: [...(prev.statusHistory || []), historyEntry]
        } : null);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تحويل الطلب');
    } finally {
      setUploading(null);
    }
  };

  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      const order = orders.find(o => o.id === id);
      const historyEntry = {
        status,
        timestamp: Timestamp.now(),
        updatedBy: user?.uid,
        notes: `تم تغيير الحالة من ${order?.status || 'غير معروف'} إلى ${status}`
      };

      const updates: any = { 
        status,
        statusHistory: arrayUnion(historyEntry)
      };
      if (status === OrderStatus.DELIVERED) {
        updates.paymentStatus = PaymentStatus.PAID;
      }
      await updateDoc(doc(db, 'orders', id), updates);
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    try {
      await deleteDoc(doc(db, 'orders', id));
      setOrders(orders.filter(o => o.id !== id));
      if (selectedOrder?.id === id) setSelectedOrder(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (order: Order) => {
    setEditForm(JSON.parse(JSON.stringify(order))); // Deep copy
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!editForm.id) return;
    try {
      await updateDoc(doc(db, 'orders', editForm.id), {
        customer: editForm.customer,
        status: editForm.status,
        paymentStatus: editForm.paymentStatus
      });
      setIsEditing(false);
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء التحديث');
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch(status) {
      case OrderStatus.PENDING: return <span className="text-orange-500 bg-orange-500/10 px-2 py-1 rounded text-[10px] font-bold">جديد</span>;
      case OrderStatus.CONFIRMED: return <span className="text-purple-500 bg-purple-500/10 px-2 py-1 rounded text-[10px] font-bold">مؤكد</span>;
      case OrderStatus.PROCESSING: return <span className="text-amber-500 bg-amber-500/10 px-2 py-1 rounded text-[10px] font-bold">قيد التجهيز</span>;
      case OrderStatus.SHIPPED: return <span className="text-blue-500 bg-blue-500/10 px-2 py-1 rounded text-[10px] font-bold">قيد التوصيل</span>;
      case OrderStatus.DELIVERED: return <span className="text-green-500 bg-green-500/10 px-2 py-1 rounded text-[10px] font-bold">تم التسليم</span>;
      case OrderStatus.CANCELLED: return <span className="text-red-500 bg-red-500/10 px-2 py-1 rounded text-[10px] font-bold">ملغي</span>;
      default: return null;
    }
  };

  const getPaymentBadge = (status: PaymentStatus) => {
    switch(status) {
      case PaymentStatus.UNPAID: return <span className="text-red-400 bg-red-400/10 px-2 py-1 rounded text-[10px] font-bold">غير مدفوع</span>;
      case PaymentStatus.PAID: return <span className="text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded text-[10px] font-bold">مدفوع</span>;
      case PaymentStatus.REFUNDED: return <span className="text-gray-400 bg-gray-400/10 px-2 py-1 rounded text-[10px] font-bold">مسترجع</span>;
      default: return null;
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    switch(method) {
      case 'WAYL': return <span className="text-blue-400 bg-blue-400/10 px-2 py-1 rounded text-[10px] font-bold">دفع إلكتروني</span>;
      case 'COD': return <span className="text-gray-400 bg-gray-400/10 px-2 py-1 rounded text-[10px] font-bold">عند الاستلام</span>;
      default: return <span className="text-gray-400 bg-gray-400/10 px-2 py-1 rounded text-[10px] font-bold">{method}</span>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">إدارة الطلبات</h2>
          <p className="text-sm opacity-50">تتبع طلبات العملاء وحالات الدفع والشحن</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchOrders}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"
            title="تحديث البيانات"
          >
            <Clock className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
          <input 
            type="text"
            placeholder="البحث برقم الطلب، اسم العميل، أو رقم الهاتف..."
            className="w-full bg-bg-card border border-white/10 rounded-2xl px-12 py-4 outline-none focus:border-primary transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <select 
            className="w-full bg-bg-card border border-white/10 rounded-2xl px-4 py-4 outline-none focus:border-primary transition-all text-sm appearance-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">كل حالات الطلب</option>
            <option value={OrderStatus.PENDING}>جديد</option>
            <option value={OrderStatus.CONFIRMED}>مؤكد</option>
            <option value={OrderStatus.SHIPPED}>قيد التوصيل</option>
            <option value={OrderStatus.DELIVERED}>تم التسليم</option>
            <option value={OrderStatus.CANCELLED}>ملغي</option>
          </select>
        </div>
        <div>
          <select 
            className="w-full bg-bg-card border border-white/10 rounded-2xl px-4 py-4 outline-none focus:border-primary transition-all text-sm appearance-none cursor-pointer"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="all">كل حالات الدفع</option>
            <option value={PaymentStatus.UNPAID}>غير مدفوع</option>
            <option value={PaymentStatus.PAID}>مدفوع</option>
            <option value={PaymentStatus.REFUNDED}>مسترجع</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-primary text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 border-l border-white/20 pl-8">
            <span className="text-lg font-black italic uppercase tracking-tighter">{selectedOrderIds.length} طلبات مختارة</span>
          </div>
          <div className="flex items-center gap-4">
            {orders.filter(o => selectedOrderIds.includes(o.id)).some(o => o.status === OrderStatus.PENDING) && (
              <button 
                onClick={handleBulkSend}
                className="flex items-center gap-2 px-6 py-2 bg-white text-primary font-black rounded-xl hover:bg-opacity-90 transition-all text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                تأكيد الطلبات
              </button>
            )}
            {orders.filter(o => selectedOrderIds.includes(o.id)).some(o => o.status === OrderStatus.CONFIRMED) && (
              <button 
                onClick={handleBulkPrepare}
                className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white font-black rounded-xl hover:bg-amber-600 transition-all text-sm"
              >
                <Package className="w-4 h-4" />
                تجهيز الطلبات
              </button>
            )}
            {orders.filter(o => selectedOrderIds.includes(o.id)).some(o => o.status === OrderStatus.PROCESSING) && (
              <button 
                onClick={() => setShowBulkShippingModal(true)}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white font-black rounded-xl hover:bg-blue-600 transition-all text-sm"
              >
                <Send className="w-4 h-4" />
                ارسال لشركة التوصيل
              </button>
            )}
            <button 
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 transition-all text-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              تصدير Excel
            </button>
            <button 
              onClick={() => setSelectedOrderIds([])}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
          <p className="font-bold">{error}</p>
          <button 
            onClick={fetchOrders}
            className="px-6 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>
      ) : (
        <div className="bg-bg-card border border-primary/10 rounded-3xl overflow-hidden shadow-2xl">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-white/5 font-black text-primary uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-8 py-5 w-10">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-white/10 bg-transparent checked:bg-primary transition-all cursor-pointer"
                      checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-8 py-5">رقم الطلب</th>
                  <th className="px-8 py-5">العميل</th>
                  <th className="px-8 py-5">الإجمالي</th>
                  <th className="px-8 py-5">طريقة الدفع</th>
                  <th className="px-8 py-5">حالة الدفع</th>
                  <th className="px-8 py-5">حالة الطلب</th>
                  <th className="px-8 py-5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.length > 0 ? filteredOrders.map(order => (
                  <tr key={order.id} className={`hover:bg-white/[0.02] transition-colors group ${selectedOrderIds.includes(order.id) ? 'bg-primary/5' : ''}`}>
                    <td className="px-8 py-5">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-white/10 bg-transparent checked:bg-primary transition-all cursor-pointer"
                        checked={selectedOrderIds.includes(order.id)}
                        onChange={() => toggleSelectOrder(order.id)}
                      />
                    </td>
                    <td className="px-8 py-5 font-black text-white">#{order.orderNumber || `PCT-${order.id.slice(-6).toUpperCase()}`}</td>
                    <td className="px-8 py-5">
                      <div className="font-bold text-white">{order.customer?.name || 'عميل مجهول'}</div>
                      <div className="text-[10px] opacity-40 mt-0.5">{order.customer?.phone}</div>
                    </td>
                    <td className="px-8 py-5 font-black text-primary">{(order.totalAmount || 0).toLocaleString()} د.ع</td>
                    <td className="px-8 py-5">{getPaymentMethodBadge(order.paymentMethod)}</td>
                    <td className="px-8 py-5">{getPaymentBadge(order.paymentStatus)}</td>
                    <td className="px-8 py-5">{getStatusBadge(order.status)}</td>
                    <td className="px-8 py-5">
                       <div className="flex items-center justify-center gap-2">
                         {order.status === OrderStatus.CONFIRMED && (
                           <button 
                             onClick={() => { setSelectedOrder(order); }} 
                             className="p-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl transition-all" 
                             title="رفع لشركة التوصيل"
                           >
                             <Send className="w-4 h-4" />
                           </button>
                         )}
                         <button onClick={() => navigate(`/admin/orders/${order.id}`)} className="p-2.5 bg-white/5 hover:bg-primary/20 text-primary rounded-xl transition-all" title="عرض التفاصيل"><Eye className="w-4 h-4" /></button>
                         <button onClick={() => handleEdit(order)} className="p-2.5 bg-white/5 hover:bg-blue-500/20 text-blue-500 rounded-xl transition-all" title="تعديل"><Edit2 className="w-4 h-4" /></button>
                         <button onClick={() => handleDelete(order.id)} className="p-2.5 bg-white/5 hover:bg-red-500/20 text-red-500 rounded-xl transition-all" title="حذف"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="px-8 py-20 text-center opacity-40 italic">لا توجد طلبات تطابق معايير البحث</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-white/5">
            {filteredOrders.length > 0 ? filteredOrders.map(order => (
              <div key={order.id} className={`p-4 space-y-4 ${selectedOrderIds.includes(order.id) ? 'bg-primary/5' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-white/10 bg-transparent checked:bg-primary transition-all cursor-pointer"
                      checked={selectedOrderIds.includes(order.id)}
                      onChange={() => toggleSelectOrder(order.id)}
                    />
                    <div>
                      <div className="text-sm font-black text-white">#{order.orderNumber || `PCT-${order.id.slice(-6).toUpperCase()}`}</div>
                      <div className="text-[10px] opacity-40">{order.createdAt ? new Date(order.createdAt['seconds'] * 1000).toLocaleString('ar-IQ') : ''}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(order.status)}
                    {getPaymentBadge(order.paymentStatus)}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">{order.customer?.name || 'عميل مجهول'}</div>
                    <div className="text-[10px] opacity-40">{order.customer?.phone}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-primary">{(order.totalAmount || 0).toLocaleString()} د.ع</div>
                    <div className="text-[10px] opacity-40">{getPaymentMethodBadge(order.paymentMethod)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  {order.status === OrderStatus.CONFIRMED && (
                    <button 
                      onClick={() => { setSelectedOrder(order); }} 
                      className="p-2.5 bg-primary/10 text-primary rounded-xl"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => navigate(`/admin/orders/${order.id}`)} className="p-2.5 bg-white/5 text-primary rounded-xl">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleEdit(order)} className="p-2.5 bg-white/5 text-blue-500 rounded-xl">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(order.id)} className="p-2.5 bg-white/5 text-red-500 rounded-xl">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="p-10 text-center opacity-40 italic">لا توجد طلبات تطابق معايير البحث</div>
            )}
          </div>
        </div>
      )}

      {/* Preparation Slip Modal */}
      {showPrepSlip && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl print:bg-white print:p-0">
          <style>
            {`
              @media print {
                @page {
                  size: 100mm 150mm;
                  margin: 0;
                }
                body {
                  background: white !important;
                  color: black !important;
                }
                .print-hidden {
                  display: none !important;
                }
                .thermal-label {
                  width: 100mm;
                  height: 150mm;
                  padding: 5mm;
                  page-break-after: always;
                  display: flex;
                  flex-direction: column;
                  border: none !important;
                  margin: 0 !important;
                }
              }
            `}
          </style>
          <div className="bg-white text-black w-full max-w-4xl rounded-[2rem] p-10 max-h-[90vh] overflow-y-auto space-y-8 shadow-2xl print:max-w-none print:p-0 print:shadow-none print:rounded-none print:overflow-visible">
            <div className="flex justify-between items-center print-hidden">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter">بوليصة التجهيز (ملصق حراري)</h3>
                  <p className="text-xs font-bold text-gray-400">عدد الملصقات: {prepOrders.length}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={handleDownloadSlips}
                  className="px-6 py-2 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <Download className="w-4 h-4" /> تحميل البوليصة
                </button>
                <button 
                  onClick={() => window.print()}
                  className="px-6 py-2 bg-primary text-white font-black rounded-xl hover:bg-primary-dark transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                  <CreditCard className="w-4 h-4" /> طباعة الملصقات
                </button>
                <button 
                  onClick={() => setShowPrepSlip(false)}
                  className="p-3 bg-black/5 hover:bg-black/10 rounded-full transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="space-y-12 print:space-y-0" ref={slipRef}>
              {prepOrders.map((order, idx) => (
                <div key={order.id} className="thermal-label border-2 border-dashed border-gray-200 p-8 rounded-3xl print:border-none print:p-4 bg-white">
                  {/* Label Header */}
                  <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
                    <div className="space-y-1">
                      <div className="text-xs font-black uppercase tracking-widest">رقم الطلب</div>
                      <div className="text-4xl font-black tracking-tighter">#{order.orderNumber || `PCT-${order.id.slice(-6).toUpperCase()}`}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-50">التاريخ</div>
                      <div className="text-xs font-bold">
                        {order.createdAt ? new Date(order.createdAt['seconds'] * 1000).toLocaleDateString('ar-IQ') : 'غير متوفر'}
                      </div>
                    </div>
                  </div>

                  {/* Customer Info Section */}
                  <div className="space-y-2 mb-6">
                    <div className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2 py-0.5 inline-block">تفاصيل العميل</div>
                    <div className="text-2xl font-black">{order.customer.name}</div>
                    <div className="text-xl font-bold">{order.customer.phone}</div>
                    <div className="text-sm font-bold leading-tight border-r-4 border-black pr-3 py-1">
                      {order.customer.city} - {order.customer.address}
                    </div>
                  </div>

                  {/* Items Section */}
                  <div className="flex-grow">
                    <div className="text-[10px] font-black uppercase tracking-widest mb-2 border-b border-black pb-1">المواد المطلوب تجهيزها</div>
                    <div className="space-y-2">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-start gap-4 border-b border-gray-100 pb-2 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-black text-white rounded flex items-center justify-center font-black text-lg shrink-0">
                              {item.qty}
                            </div>
                            <div className="font-bold text-sm leading-tight">{item.name}</div>
                          </div>
                          <div className="text-[8px] font-bold text-gray-400 shrink-0">
                            {item.productId.slice(-6)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer / Notes */}
                  <div className="mt-4 pt-4 border-t-2 border-black">
                    {order.customer.notes && (
                      <div className="mb-4 p-2 bg-gray-100 rounded text-xs font-bold">
                        <span className="text-[8px] uppercase block opacity-50">ملاحظات:</span>
                        {order.customer.notes}
                      </div>
                    )}
                    <div className="flex justify-between items-end">
                      <div className="text-[8px] font-black uppercase tracking-widest">
                        أنظمة PCTHRONE<br />
                        وحدة التجهيز
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] font-black uppercase tracking-widest opacity-50">المبلغ الإجمالي</div>
                        <div className="text-lg font-black">{order.totalAmount.toLocaleString()} د.ع</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Shipping Modal */}
      {showBulkShippingModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
          <div className="bg-white/5 border border-white/10 w-full max-w-md rounded-[2.5rem] p-10 space-y-8 relative shadow-2xl backdrop-blur-2xl">
            <button onClick={() => setShowBulkShippingModal(false)} className="absolute top-8 left-8 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10"><X className="w-6 h-6" /></button>
            
            <div className="text-center space-y-2">
              <div className="w-20 h-20 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">إرسال الطلبات للشحن</h3>
              <p className="text-sm opacity-40">سيتم إرسال {selectedOrderIds.length} طلب إلى شركة التوصيل المختارة</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider opacity-40 px-2">اختر شركة التوصيل</label>
                <select 
                  className="w-full bg-bg-main border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-primary text-white font-bold text-sm appearance-none cursor-pointer"
                  value={selectedShippingCompanyId}
                  onChange={(e) => setSelectedShippingCompanyId(e.target.value)}
                >
                  <option value="">اختر شركة توصيل...</option>
                  {shippingCompanies.filter(c => c.isActive).map(company => (
                    <option key={company.id} value={company.id}>{company.name} {company.apiConfig?.type === 'heeiz' ? '(API)' : ''}</option>
                  ))}
                </select>
              </div>

              {shippingCompanies.find(c => c.id === selectedShippingCompanyId)?.apiConfig?.type === 'heeiz' ? (
                <button 
                  onClick={handleBulkApiSend}
                  disabled={!selectedShippingCompanyId || loading}
                  className="w-full py-5 bg-purple-600 text-white font-black rounded-2xl hover:bg-purple-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-purple-500/20"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  إرسال عبر API
                </button>
              ) : (
                <button 
                  onClick={handleBulkUploadToShipping}
                  disabled={!selectedShippingCompanyId || loading}
                  className="w-full py-5 bg-blue-500 text-white font-black rounded-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-blue-500/20"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  تأكيد الإرسال لشركة التوصيل
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
          <div className="bg-white/5 border border-white/10 w-full max-w-md rounded-[2.5rem] p-10 space-y-8 relative shadow-2xl backdrop-blur-2xl">
            <button onClick={() => setShowExportModal(false)} className="absolute top-8 left-8 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10"><X className="w-6 h-6" /></button>
            
            <div className="text-center space-y-2">
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">تصدير الطلبات المحددة</h3>
              <p className="text-sm opacity-40">اختر صيغة التصدير المناسبة</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider opacity-40 px-2">صيغة التصدير</label>
                <select 
                  className="w-full bg-bg-main border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-primary text-white font-bold text-sm appearance-none cursor-pointer"
                  value={exportCompanyId}
                  onChange={(e) => setExportCompanyId(e.target.value)}
                >
                  <option value="default">الصيغة الافتراضية (النظام)</option>
                  {shippingCompanies.filter(c => c.excelTemplate && Object.keys(c.excelTemplate).length > 0).map(company => (
                    <option key={company.id} value={company.id}>قالب شركة: {company.name}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={handleExportToExcel}
                className="w-full py-5 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20"
              >
                <Download className="w-5 h-5" />
                تحميل ملف الإكسل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Status Change Modal */}
      {showConfirmStatusModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
          <div className="bg-white/5 border border-white/10 w-full max-w-md rounded-[2.5rem] p-10 space-y-8 relative shadow-2xl backdrop-blur-2xl text-center">
            <div className="w-20 h-20 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">تحديث حالة الطلبات</h3>
            <p className="text-sm text-white/70">
              تم تصدير الطلبات بنجاح. هل تريد تحويل حالة هذه الطلبات ({exportedOrderIds.length} طلب) إلى "مؤكد"؟
            </p>
            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => {
                  setShowConfirmStatusModal(false);
                  setExportedOrderIds([]);
                }}
                className="flex-1 py-4 bg-white/5 text-white font-black rounded-2xl hover:bg-white/10 transition-all"
              >
                لا، شكراً
              </button>
              <button 
                onClick={handleUpdateExportedOrdersStatus}
                disabled={loading}
                className="flex-1 py-4 bg-blue-500 text-white font-black rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'نعم، تأكيد الطلبات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
          <div className="bg-white/5 border border-white/10 w-full max-w-4xl rounded-[2.5rem] p-10 max-h-[90vh] overflow-y-auto space-y-8 relative shadow-2xl backdrop-blur-2xl">
            <button onClick={() => { setSelectedOrder(null); setSelectedShippingCompanyId(''); }} className="absolute top-8 left-8 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10"><X className="w-6 h-6" /></button>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">تفاصيل الطلب #{selectedOrder.orderNumber || `PCT-${selectedOrder.id.slice(-6).toUpperCase()}`}</h3>
                {getStatusBadge(selectedOrder.status)}
              </div>
              <p className="text-sm opacity-40 font-bold">تاريخ الطلب: {selectedOrder.createdAt ? new Date(selectedOrder.createdAt['seconds'] * 1000).toLocaleString('ar-IQ') : 'N/A'}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Customer Info */}
                <div className="p-8 bg-white/[0.03] rounded-3xl border border-white/5 space-y-6">
                  <h4 className="text-lg font-black text-white flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary" /> بيانات العميل والشحن
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <span className="text-[10px] opacity-40 uppercase font-bold block">الاسم الكامل</span>
                      <span className="text-white font-bold">{selectedOrder.customer.name}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] opacity-40 uppercase font-bold block">رقم الهاتف</span>
                      <span className="text-white font-bold">{selectedOrder.customer.phone}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] opacity-40 uppercase font-bold block">المدينة</span>
                      <span className="text-white font-bold">{selectedOrder.customer.city}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] opacity-40 uppercase font-bold block">العنوان بالتفصيل</span>
                      <span className="text-white font-bold">{selectedOrder.customer.address}</span>
                    </div>
                  </div>
                  {selectedOrder.customer.notes && (
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[10px] opacity-40 uppercase font-bold block mb-1">ملاحظات إضافية</span>
                      <p className="text-sm italic opacity-80">{selectedOrder.customer.notes}</p>
                    </div>
                  )}
                </div>

                {/* Products */}
                <div className="space-y-4">
                  <h4 className="text-lg font-black text-white">المنتجات المطلوبة ({selectedOrder.items.length})</h4>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-6 p-5 bg-white/[0.03] rounded-2xl border border-white/5 group hover:border-primary/30 transition-all">
                        <div className="w-20 h-20 bg-black/40 rounded-xl overflow-hidden shrink-0 border border-white/5">
                          <img src={item.image || 'https://via.placeholder.com/150'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="flex-grow">
                          <div className="font-bold text-white text-lg">{item.name}</div>
                          <div className="text-xs opacity-40 mt-1 font-bold">{item.qty} وحدة × {(item.price || 0).toLocaleString()} د.ع</div>
                          {item.assignedKeys && item.assignedKeys.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <div className="text-[10px] font-black uppercase tracking-widest text-primary">أكواد التفعيل المخصصة:</div>
                              <div className="flex flex-wrap gap-2">
                                {item.assignedKeys.map((key, kIdx) => (
                                  <div key={kIdx} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 font-mono text-[10px] text-white/80">
                                    {key}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-black text-primary text-xl">
                            {((item.price || 0) * item.qty).toLocaleString()}
                          </div>
                          <div className="text-[10px] opacity-30 font-bold uppercase">دينار عراقي</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary & Status */}
              <div className="space-y-8">
                <div className="p-8 bg-white/[0.03] rounded-3xl border border-white/5 space-y-6">
                  <h4 className="text-lg font-black text-white flex items-center gap-3">
                    <Filter className="w-5 h-5 text-primary" /> ملخص الحساب
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="opacity-40 font-bold">المجموع الفرعي</span>
                      <span className="text-white font-bold">{(selectedOrder.subtotal || selectedOrder.totalAmount).toLocaleString()} د.ع</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="opacity-40 font-bold">سعر التوصيل</span>
                      <span className="text-white font-bold">{(selectedOrder.shippingCost || 0).toLocaleString()} د.ع</span>
                    </div>
                    {selectedOrder.paymentFee && selectedOrder.paymentFee > 0 && (
                      <div className="flex justify-between items-center text-sm text-amber-500">
                        <span className="font-bold">عمولة الدفع الإلكتروني</span>
                        <span className="font-bold">{selectedOrder.paymentFee.toLocaleString()} د.ع</span>
                      </div>
                    )}
                    <div className="pt-4 border-t border-white/10">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <span className="text-[10px] opacity-40 uppercase font-black block">الإجمالي الكلي</span>
                          <span className="text-3xl font-black text-primary">{(selectedOrder.totalAmount || 0).toLocaleString()}</span>
                        </div>
                        <span className="text-xs opacity-30 font-bold mb-1">د.ع</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-white/[0.03] rounded-3xl border border-white/5 space-y-6">
                  <h4 className="text-lg font-black text-white flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-primary" /> حالة الدفع والشحن
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <span className="text-[10px] opacity-40 uppercase font-bold block">حالة الدفع</span>
                      {getPaymentBadge(selectedOrder.paymentStatus)}
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] opacity-40 uppercase font-bold block">طريقة الدفع</span>
                      <span className="text-white font-bold text-sm">
                        {selectedOrder.paymentMethod === 'WAYL' ? 'دفع إلكتروني (Wayl)' : 'الدفع عند الاستلام (COD)'}
                      </span>
                    </div>
                    
                    {selectedOrder.status === OrderStatus.CONFIRMED && (
                      <div className="space-y-4 pt-4 border-t border-white/10">
                        <span className="text-[10px] opacity-40 uppercase font-bold block">رفع الطلب لشركة التوصيل</span>
                        <div className="space-y-3">
                          <select 
                            className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary text-sm"
                            value={selectedShippingCompanyId}
                            onChange={(e) => setSelectedShippingCompanyId(e.target.value)}
                          >
                            <option value="">اختر شركة توصيل...</option>
                            {shippingCompanies.filter(c => c.isActive).map(company => (
                              <option key={company.id} value={company.id}>{company.name}</option>
                            ))}
                          </select>
                          <button 
                            onClick={() => handleUploadToShipping(selectedOrder.id)}
                            disabled={uploading === selectedOrder.id || !selectedShippingCompanyId}
                            className="w-full py-3 bg-primary text-white font-black rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20"
                          >
                            {uploading === selectedOrder.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            ارفع الطلب للشركة
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedOrder.shippingCompany && (
                      <div className="space-y-2 pt-4 border-t border-white/10">
                        <span className="text-[10px] opacity-40 uppercase font-bold block">شركة التوصيل</span>
                        <div className="flex items-center gap-2 text-white font-bold text-sm">
                          <Truck className="w-4 h-4 text-primary" />
                          {selectedOrder.shippingCompany}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {isEditing && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
          <div className="bg-white/5 border border-white/10 w-full max-w-xl rounded-[2.5rem] p-10 space-y-8 relative shadow-2xl backdrop-blur-2xl">
            <button onClick={() => setIsEditing(false)} className="absolute top-8 left-8 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10"><X className="w-6 h-6" /></button>
            
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">تعديل الطلب</h3>
              <p className="text-sm opacity-40">تحديث بيانات العميل وحالة الطلب</p>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider opacity-40 px-2">اسم العميل</label>
                  <input 
                    className="w-full bg-bg-main border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-primary text-white font-bold text-sm"
                    value={editForm.customer?.name || ''}
                    onChange={e => setEditForm({...editForm, customer: {...editForm.customer!, name: e.target.value}})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider opacity-40 px-2">رقم الهاتف</label>
                  <input 
                    className="w-full bg-bg-main border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-primary text-white font-bold text-sm"
                    value={editForm.customer?.phone || ''}
                    onChange={e => setEditForm({...editForm, customer: {...editForm.customer!, phone: e.target.value}})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider opacity-40 px-2">العنوان</label>
                <input 
                  className="w-full bg-bg-main border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-primary text-white font-bold text-sm"
                  value={editForm.customer?.address || ''}
                  onChange={e => setEditForm({...editForm, customer: {...editForm.customer!, address: e.target.value}})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider opacity-40 px-2">حالة الطلب</label>
                  <select 
                    className="w-full bg-bg-main border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-primary text-white font-bold text-sm appearance-none cursor-pointer"
                    value={editForm.status}
                    onChange={e => setEditForm({...editForm, status: e.target.value as OrderStatus})}
                  >
                    <option value={OrderStatus.PENDING}>جديد</option>
                    <option value={OrderStatus.CONFIRMED}>مؤكد</option>
                    <option value={OrderStatus.SHIPPED}>قيد التوصيل</option>
                    <option value={OrderStatus.DELIVERED}>تم التسليم</option>
                    <option value={OrderStatus.CANCELLED}>إلغاء</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider opacity-40 px-2">حالة الدفع</label>
                  <select 
                    className="w-full bg-bg-main border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-primary text-white font-bold text-sm appearance-none cursor-pointer"
                    value={editForm.paymentStatus}
                    onChange={e => setEditForm({...editForm, paymentStatus: e.target.value as PaymentStatus})}
                  >
                    <option value={PaymentStatus.UNPAID}>غير مدفوع</option>
                    <option value={PaymentStatus.PAID}>مدفوع</option>
                    <option value={PaymentStatus.REFUNDED}>مسترجع</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setIsEditing(false)}
                className="flex-1 py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-all"
              >
                إلغاء
              </button>
              <button 
                onClick={saveEdit} 
                className="flex-1 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-all shadow-xl shadow-primary/20"
              >
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
