
import React, { useState, useEffect, useRef } from 'react';
import { Truck, Plus, Search, Edit2, Trash2, Eye, Loader2, CheckCircle, XCircle, Settings, DollarSign, FileSpreadsheet, Upload, RefreshCw, MapPin } from 'lucide-react';
import { db } from '../../src/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { ShippingCompany } from '../../src/types';
import { CITIES } from '../../src/constants';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const AVAILABLE_FIELDS = [
  { id: 'none', label: '--- لا شيء (فارغ) ---' },
  { id: 'orderNumber', label: 'رقم الطلب' },
  { id: 'customerName', label: 'اسم العميل' },
  { id: 'customerPhone', label: 'رقم الهاتف' },
  { id: 'customerCity', label: 'المحافظة' },
  { id: 'customerRegion', label: 'المنطقة' },
  { id: 'customerAddress', label: 'العنوان' },
  { id: 'customerNotes', label: 'الملاحظات' },
  { id: 'itemsString', label: 'المنتجات (نص واحد)' },
  { id: 'productSKU', label: 'رمز المنتج (SKU)' },
  { id: 'quantity', label: 'الكمية' },
  { id: 'price', label: 'سعر المنتج' },
  { id: 'subtotal', label: 'المجموع الفرعي' },
  { id: 'shippingCost', label: 'سعر التوصيل' },
  { id: 'totalAmount', label: 'الإجمالي الكلي' },
  { id: 'paymentMethod', label: 'طريقة الدفع' },
  { id: 'paymentStatus', label: 'حالة الدفع' },
  { id: 'status', label: 'حالة الطلب' },
  { id: 'createdAt', label: 'تاريخ الطلب' },
];

const AdminShippingCompanies: React.FC = () => {
  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPricesModal, setShowPricesModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showHeeizModal, setShowHeeizModal] = useState(false);
  const [heeizProvinces, setHeeizProvinces] = useState<any[]>([]);
  const [heeizRegions, setHeeizRegions] = useState<Record<number, any[]>>({});
  const [provinceMapping, setProvinceMapping] = useState<Record<string, number>>({});
  const [regionMapping, setRegionMapping] = useState<Record<string, number>>({});
  const [loadingHeeiz, setLoadingHeeiz] = useState(false);
  const [editingCompany, setEditingCompany] = useState<ShippingCompany | null>(null);
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  const [templateMapping, setTemplateMapping] = useState<Record<string, string>>({});
  const [uploadedColumns, setUploadedColumns] = useState<string[]>([]);
  const [formData, setFormData] = useState<{
    name: string;
    isActive: boolean;
    isSystem: boolean;
    apiConfig: {
      type: 'none' | 'heeiz';
      token?: string;
    };
  }>({
    name: '',
    isActive: true,
    isSystem: false,
    apiConfig: {
      type: 'none',
      token: ''
    }
  });
  const cities = CITIES;

  const handleSavePrices = async () => {
    if (!editingCompany) return;
    try {
      const pricesArray = Object.entries(editingPrices).map(([city, price]) => ({ city, price }));
      await updateDoc(doc(db, 'shipping_companies', editingCompany.id), {
        prices: pricesArray
      });
      setShowPricesModal(false);
      fetchCompanies();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ الأسعار');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (data.length > 0) {
        const headers = data[0] as string[];
        const validHeaders = headers.filter(h => h && typeof h === 'string');
        setUploadedColumns(validHeaders);
        
        const newMapping = { ...templateMapping };
        validHeaders.forEach(h => {
          if (!newMapping[h]) newMapping[h] = 'none';
        });
        setTemplateMapping(newMapping);
      } else {
        alert('الملف فارغ أو لا يحتوي على أعمدة');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveTemplate = async () => {
    if (!editingCompany) return;
    try {
      await updateDoc(doc(db, 'shipping_companies', editingCompany.id), {
        excelTemplate: templateMapping
      });
      setShowTemplateModal(false);
      fetchCompanies();
      alert('تم حفظ قالب الإكسل بنجاح');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ القالب');
    }
  };

  const fetchHeeizProvinces = async (token?: string) => {
    setLoadingHeeiz(true);
    try {
      const activeToken = ((token && token !== 'undefined') ? token : '').trim();
      const res = await fetch('/api/heeiz/provinces', {
        headers: {
          'x-heeiz-token': activeToken
        }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Heeiz Provinces Data:', data);
      
      // Helper to find the first non-empty array in a nested object
      const findProvincesArray = (obj: any): any[] | null => {
        if (Array.isArray(obj) && obj.length > 0) return obj;
        if (obj && typeof obj === 'object') {
          // Check common keys first
          if (Array.isArray(obj.data)) return obj.data;
          if (Array.isArray(obj.provinces)) return obj.provinces;
          if (Array.isArray(obj.results)) return obj.results;
          
          // Recursive search
          for (const key in obj) {
            const val = obj[key];
            if (Array.isArray(val) && val.length > 0) return val;
            if (val && typeof val === 'object' && val !== null) {
              const nested = findProvincesArray(val);
              if (nested) return nested;
            }
          }
        }
        return null;
      };

      const provinces = findProvincesArray(data) || [];
      
      if (provinces.length > 0) {
        setHeeizProvinces(provinces);
      } else {
        console.warn('Could not find provinces array in Heeiz response:', data);
        const apiMessage = data?.message || data?.error || (data?.raw ? 'استجابة غير صالحة' : '');
        alert(`لم يتم العثور على قائمة المحافظات في استجابة Heeiz. ${apiMessage ? `الرسالة: ${apiMessage}` : 'يرجى التحقق من مفتاح الـ API.'}`);
        setHeeizProvinces([]);
      }
    } catch (err) {
      console.error('Fetch Heeiz Provinces Error:', err);
      alert('فشل جلب المحافظات من Heeiz. تأكد من صحة مفتاح الـ API.');
      setHeeizProvinces([]);
    } finally {
      setLoadingHeeiz(false);
    }
  };

  const fetchHeeizRegions = async (provinceId: number, token?: string) => {
    if (heeizRegions[provinceId]) return;
    try {
      const activeToken = ((token && token !== 'undefined') ? token : (editingCompany?.apiConfig?.token || '')).trim();
      const res = await fetch(`/api/heeiz/regions/${provinceId}`, {
        headers: {
          'x-heeiz-token': activeToken
        }
      });
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      
      const findRegionsArray = (obj: any): any[] | null => {
        if (Array.isArray(obj) && obj.length > 0) return obj;
        if (obj && typeof obj === 'object') {
          if (Array.isArray(obj.data)) return obj.data;
          if (Array.isArray(obj.regions)) return obj.regions;
          if (Array.isArray(obj.results)) return obj.results;
          for (const key in obj) {
            const val = obj[key];
            if (Array.isArray(val) && val.length > 0) return val;
            if (val && typeof val === 'object' && val !== null) {
              const nested = findRegionsArray(val);
              if (nested) return nested;
            }
          }
        }
        return null;
      };

      const regions = findRegionsArray(data) || [];

      if (regions.length > 0) {
        setHeeizRegions(prev => ({ ...prev, [provinceId]: regions }));
      }
    } catch (err) {
      console.error('Fetch Heeiz Regions Error:', err);
    }
  };

  const handleSaveHeeizMapping = async () => {
    if (!editingCompany) return;
    
    // Check if any mapped province is missing a region
    const missingRegions = Object.keys(provinceMapping).filter(city => provinceMapping[city] && !regionMapping[city]);
    if (missingRegions.length > 0) {
      if (!window.confirm(`المحافظات التالية ليس لها منطقة مرتبطة: ${missingRegions.join('، ')}. قد يؤدي هذا لفشل إرسال الطلبات لشركة Heeiz. هل تريد الحفظ على أي حال؟`)) {
        return;
      }
    }

    try {
      await updateDoc(doc(db, 'shipping_companies', editingCompany.id), {
        provinceMapping,
        regionMapping
      });
      setShowHeeizModal(false);
      fetchCompanies();
      alert('تم حفظ إعدادات الربط بنجاح');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const navigate = useNavigate();

  const isFetchingRef = useRef(false);

  const fetchCompanies = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'shipping_companies'), orderBy('createdAt', 'asc')));
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as ShippingCompany[];
      
      // Check for Heeiz duplicates
      const heeizCompanies = list.filter(c => c.apiConfig?.type === 'heeiz');
      
      if (heeizCompanies.length > 1) {
        // Keep the one with mapping or the oldest one
        const bestHeeiz = heeizCompanies.reduce((prev, curr) => {
          const prevScore = (prev.provinceMapping ? 1 : 0) + (prev.regionMapping ? 1 : 0);
          const currScore = (curr.provinceMapping ? 1 : 0) + (curr.regionMapping ? 1 : 0);
          return currScore > prevScore ? curr : prev;
        });

        // Delete duplicates
        for (const company of heeizCompanies) {
          if (company.id !== bestHeeiz.id) {
            await deleteDoc(doc(db, 'shipping_companies', company.id));
          }
        }
        
        // Refresh list
        list = list.filter(c => c.apiConfig?.type !== 'heeiz' || c.id === bestHeeiz.id);
      } else if (heeizCompanies.length === 0) {
        // Create it if it doesn't exist
        const newHeeiz: Partial<ShippingCompany> = {
          name: 'Heeiz Shipping',
          isActive: true,
          isSystem: true,
          prices: [],
          createdAt: new Date().toISOString(),
          apiConfig: {
            type: 'heeiz'
          }
        };
        const docRef = await addDoc(collection(db, 'shipping_companies'), newHeeiz);
        list = [...list, { id: docRef.id, ...newHeeiz } as ShippingCompany];
      }

      setCompanies(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await updateDoc(doc(db, 'shipping_companies', editingCompany.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'shipping_companies'), {
          ...formData,
          prices: [],
          createdAt: new Date().toISOString()
        });
      }
      setShowModal(false);
      setEditingCompany(null);
      setFormData({ 
        name: '', 
        isActive: true, 
        isSystem: false, 
        apiConfig: { type: 'none', token: '' } 
      });
      fetchCompanies();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ البيانات');
    }
  };

  const toggleStatus = async (company: ShippingCompany) => {
    try {
      await updateDoc(doc(db, 'shipping_companies', company.id), {
        isActive: !company.isActive
      });
      fetchCompanies();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCompany = async (company: ShippingCompany) => {
    if (company.isSystem) {
      if (!window.confirm('هذه الشركة مرتبطة بالنظام. هل أنت متأكد من رغبتك في حذفها نهائياً؟ قد يؤدي هذا لتعطيل بعض الميزات.')) return;
    } else {
      if (!window.confirm('هل أنت متأكد من حذف هذه الشركة؟')) return;
    }
    try {
      await deleteDoc(doc(db, 'shipping_companies', company.id));
      fetchCompanies();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">شركات التوصيل</h2>
            <p className="text-sm opacity-40">إدارة شركات الشحن والربط البرمجي</p>
          </div>
        </div>
        <button 
          onClick={() => {
          setEditingCompany(null);
          setFormData({ 
            name: '', 
            isActive: true, 
            isSystem: false, 
            apiConfig: { type: 'none', token: '' } 
          });
          setShowModal(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all"
        >
          <Plus className="w-5 h-5" /> إضافة شركة جديدة
        </button>
      </div>

      <div className="bg-[var(--color-bg-card)] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-bg-light border-b border-white/5">
                <th className="p-6 text-xs font-black uppercase tracking-widest opacity-40">الشركة</th>
                <th className="p-6 text-xs font-black uppercase tracking-widest opacity-40">الحالة</th>
                <th className="p-6 text-xs font-black uppercase tracking-widest opacity-40 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-20 text-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-20 text-center opacity-40 font-bold italic">لا توجد شركات توصيل مضافة</td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-bg-light flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Truck className="w-6 h-6" />
                        </div>
                        <div className="font-bold text-white">{company.name}</div>
                      </div>
                    </td>
                    <td className="p-6">
                      <button 
                        onClick={() => toggleStatus(company)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                          company.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                        }`}
                      >
                        {company.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {company.isActive ? 'نشط' : 'متوقف'}
                      </button>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingCompany(company);
                            const pricesMap: Record<string, number> = {};
                            cities.forEach(city => {
                              const found = company.prices?.find(p => p.city === city);
                              pricesMap[city] = found ? found.price : 5000;
                            });
                            setEditingPrices(pricesMap);
                            setShowPricesModal(true);
                          }}
                          className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all"
                          title="تعديل الأسعار"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingCompany(company);
                            setTemplateMapping(company.excelTemplate || {});
                            setUploadedColumns(Object.keys(company.excelTemplate || {}));
                            setShowTemplateModal(true);
                          }}
                          className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                          title="إعداد قالب الإكسل"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                        {company.apiConfig?.type === 'heeiz' && (
                          <button 
                            onClick={() => {
                              setEditingCompany(company);
                              const pMap = (company as any).provinceMapping || {};
                              setProvinceMapping(pMap);
                              setRegionMapping((company as any).regionMapping || {});
                              
                              const token = company.apiConfig?.token;
                              fetchHeeizProvinces(token);
                              
                              // Fetch regions for existing mappings
                              Object.values(pMap).forEach(pid => {
                                if (pid) fetchHeeizRegions(pid as number, token);
                              });
                              
                              setShowHeeizModal(true);
                            }}
                            className="p-2 bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500 hover:text-white transition-all"
                            title="إعدادات الربط (Heeiz)"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => navigate(`/admin/shipping/${company.id}`)}
                          className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all"
                          title="مشاهدة التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingCompany(company);
                            setFormData({
                              name: company.name,
                              isActive: company.isActive,
                              isSystem: company.isSystem || false,
                              apiConfig: company.apiConfig || { type: 'none', token: '' }
                            });
                            setShowModal(true);
                          }}
                          className="p-2 bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500 hover:text-white transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteCompany(company)}
                          className={`p-2 rounded-lg transition-all ${
                            company.isSystem 
                              ? 'bg-gray-500/10 text-gray-500 cursor-not-allowed' 
                              : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
                          }`}
                          title={company.isSystem ? 'لا يمكن الحذف' : 'حذف الشركة'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-main/90 backdrop-blur-sm">
          <div className="bg-[var(--color-bg-card)] border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xl font-black text-white uppercase italic">{editingCompany ? 'تعديل شركة' : 'إضافة شركة جديدة'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><XCircle className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs opacity-40 uppercase font-bold">اسم الشركة</label>
                <input 
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-bg-light border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                  placeholder="مثال: شركة النسر"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs opacity-40 uppercase font-bold">نوع الربط (API)</label>
                <select 
                  value={formData.apiConfig.type}
                  onChange={(e) => setFormData({
                    ...formData, 
                    apiConfig: { ...formData.apiConfig, type: e.target.value as any }
                  })}
                  className="w-full bg-bg-light border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                >
                  <option value="none">بدون ربط (يدوي)</option>
                  <option value="heeiz">شركة Heeiz</option>
                </select>
              </div>

              {formData.apiConfig.type === 'heeiz' && (
                <div className="space-y-2">
                  <label className="text-xs opacity-40 uppercase font-bold">مفتاح API (Token)</label>
                  <input 
                    type="password"
                    value={formData.apiConfig.token || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      apiConfig: { ...formData.apiConfig, token: e.target.value }
                    })}
                    className="w-full bg-bg-light border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary"
                    placeholder="أدخل مفتاح API الخاص بشركة Heeiz"
                  />
                  <p className="text-[10px] text-white/30 italic">سيتم استخدام هذا المفتاح للاتصال الحقيقي مع شركة الشحن.</p>
                </div>
              )}

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="w-5 h-5 rounded border-white/10 bg-bg-light text-primary focus:ring-0"
                  />
                  <label htmlFor="isActive" className="text-sm font-bold text-white">تفعيل الشركة</label>
                </div>

                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    id="isSystem"
                    checked={formData.isSystem}
                    onChange={(e) => setFormData({...formData, isSystem: e.target.checked})}
                    className="w-5 h-5 rounded border-white/10 bg-bg-light text-primary focus:ring-0"
                  />
                  <label htmlFor="isSystem" className="text-sm font-bold text-white">شركة نظام (لا يمكن حذفها)</label>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
              >
                {editingCompany ? 'حفظ التعديلات' : 'إضافة الشركة'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Prices Modal */}
      {showPricesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-main/90 backdrop-blur-sm">
          <div className="bg-[var(--color-bg-card)] border border-white/10 rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xl font-black text-white uppercase italic">تعديل أسعار التوصيل - {editingCompany?.name}</h3>
              <button onClick={() => setShowPricesModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><XCircle className="w-6 h-6" /></button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {cities.map(city => (
                  <div key={city} className="flex items-center gap-2 bg-bg-main p-4 rounded-2xl border border-white/5">
                    <span className="text-xs font-bold w-20 text-white/60">{city}</span>
                    <input 
                      type="number"
                      value={editingPrices[city] || 5000}
                      onChange={(e) => setEditingPrices({...editingPrices, [city]: parseInt(e.target.value) || 0})}
                      className="w-full bg-transparent border-none text-right text-sm outline-none text-primary font-black"
                    />
                    <span className="text-[10px] opacity-40">د.ع</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 border-t border-white/5 flex justify-end">
              <button 
                onClick={handleSavePrices}
                className="px-8 py-4 bg-primary text-white font-black uppercase tracking-widest rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
              >
                حفظ جميع الأسعار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-main/90 backdrop-blur-sm">
          <div className="bg-[var(--color-bg-card)] border border-white/10 rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white uppercase italic">إعداد قالب الإكسل - {editingCompany?.name}</h3>
                <p className="text-sm opacity-50 mt-1">ارفع ملف إكسل فارغ يحتوي على الأعمدة المطلوبة لشركة التوصيل، ثم قم بربطها مع بيانات النظام.</p>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><XCircle className="w-6 h-6" /></button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh]">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/10 border-dashed rounded-2xl cursor-pointer bg-white/5 hover:bg-white/10 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-primary" />
                    <p className="mb-2 text-sm text-white font-bold">اضغط لرفع ملف الإكسل (Template)</p>
                    <p className="text-xs text-white/40">.xlsx, .xls</p>
                  </div>
                  <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                </label>
              </div>

              {uploadedColumns.length > 0 && (
                <div className="space-y-4 mt-8">
                  <h4 className="text-lg font-black text-white border-b border-white/10 pb-2">ربط الأعمدة</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {uploadedColumns.map(col => (
                      <div key={col} className="bg-bg-light p-4 rounded-xl border border-white/5 space-y-2">
                        <label className="text-xs font-bold text-white/60 block">{col}</label>
                        <select
                          className="w-full bg-bg-main border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-primary"
                          value={templateMapping[col] || 'none'}
                          onChange={(e) => setTemplateMapping({...templateMapping, [col]: e.target.value})}
                        >
                          {AVAILABLE_FIELDS.map(field => (
                            <option key={field.id} value={field.id}>{field.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-8 border-t border-white/5 flex justify-end gap-4">
              <button 
                onClick={() => setShowTemplateModal(false)}
                className="px-8 py-4 bg-white/5 text-white font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all"
              >
                إلغاء
              </button>
              <button 
                onClick={handleSaveTemplate}
                className="px-8 py-4 bg-primary text-white font-black uppercase tracking-widest rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
              >
                حفظ القالب
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Heeiz Modal */}
      {showHeeizModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-main/90 backdrop-blur-sm">
          <div className="bg-[var(--color-bg-card)] border border-white/10 rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white uppercase italic">إعدادات ربط Heeiz - {editingCompany?.name}</h3>
                <p className="text-sm opacity-50 mt-1">قم بربط محافظات المتجر مع محافظات شركة الشحن لضمان إرسال الطلبات بشكل صحيح.</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={async () => {
                    const token = editingCompany?.apiConfig?.token;
                    if (!token) {
                      alert('يرجى ضبط مفتاح الـ API أولاً.');
                      return;
                    }
                    const mappedProvinceIds = Array.from(new Set(Object.values(provinceMapping).filter(id => id))) as number[];
                    if (mappedProvinceIds.length === 0) {
                      alert('لا توجد محافظات مربوطة لجلب مناطقها.');
                      return;
                    }
                    setLoadingHeeiz(true);
                    try {
                      for (const pid of mappedProvinceIds) {
                        await fetchHeeizRegions(pid, token);
                      }
                      alert('تم جلب جميع المناطق بنجاح.');
                    } catch (e) {
                      console.error(e);
                      alert('حدث خطأ أثناء جلب بعض المناطق.');
                    } finally {
                      setLoadingHeeiz(false);
                    }
                  }}
                  className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  جلب جميع المناطق
                </button>
                <button 
                  onClick={async () => {
                    if (!heeizProvinces || heeizProvinces.length === 0) {
                      alert('يرجى الانتظار حتى يتم تحميل المحافظات من Heeiz أولاً.');
                      return;
                    }
                    const newMapping = { ...provinceMapping };
                    let matchCount = 0;
                    const token = editingCompany?.apiConfig?.token;
                    
                    setLoadingHeeiz(true);
                    for (const city of CITIES) {
                      const match = heeizProvinces.find(p => 
                        p.name.includes(city) || city.includes(p.name) ||
                        (city === 'الديوانية' && p.name.includes('القادسية')) ||
                        (city === 'القادسية' && p.name.includes('الديوانية'))
                      );
                      if (match) {
                        newMapping[city] = match.id;
                        matchCount++;
                        // Fetch regions for the matched province
                        await fetchHeeizRegions(match.id, token);
                      }
                    }
                    setProvinceMapping(newMapping);
                    if (matchCount > 0) {
                      alert(`تم ربط ${matchCount} محافظة بنجاح.`);
                    } else {
                      alert('لم يتم العثور على تطابقات تلقائية. يرجى الربط يدوياً.');
                    }
                    setLoadingHeeiz(false);
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  ربط تلقائي بالاسم
                </button>
                <button onClick={() => setShowHeeizModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><XCircle className="w-6 h-6" /></button>
              </div>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh]">
              {loadingHeeiz ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-white/40 font-bold">جاري جلب البيانات من Heeiz...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {cities.map(city => (
                      <div key={city} className="bg-bg-light p-6 rounded-2xl border border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-white">{city}</h4>
                          <span className="text-[10px] opacity-40 uppercase font-black">متجر</span>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] opacity-40 uppercase font-black tracking-widest">المحافظة (Heeiz)</label>
                            <div className="flex gap-2">
                              <select 
                                value={provinceMapping[city] || ''}
                                onChange={(e) => {
                                  const pid = parseInt(e.target.value);
                                  setProvinceMapping({...provinceMapping, [city]: pid});
                                  if (pid) fetchHeeizRegions(pid, editingCompany?.apiConfig?.token);
                                }}
                                className="w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary"
                              >
                                <option value="">اختر المحافظة</option>
                                {Array.isArray(heeizProvinces) && heeizProvinces.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                              {provinceMapping[city] && (
                                <button 
                                  onClick={() => fetchHeeizRegions(provinceMapping[city], editingCompany?.apiConfig?.token)}
                                  className="p-3 bg-white/5 text-white/40 rounded-xl hover:bg-white/10 hover:text-white transition-all"
                                  title="تحديث المناطق"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}
                              {heeizProvinces.length === 0 && !loadingHeeiz && (
                                <button 
                                  onClick={() => fetchHeeizProvinces(editingCompany?.apiConfig?.token)}
                                  className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all"
                                  title="تحديث البيانات"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {provinceMapping[city] && (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <label className="text-[10px] opacity-40 uppercase font-black tracking-widest">المنطقة (Heeiz)</label>
                                {!regionMapping[city] && (
                                  <span className="text-[10px] text-red-500 font-bold animate-pulse">مطلوب *</span>
                                )}
                              </div>
                              <select 
                                value={regionMapping[city] || ''}
                                onChange={(e) => {
                                  const rid = parseInt(e.target.value);
                                  setRegionMapping({...regionMapping, [city]: rid});
                                }}
                                className={`w-full bg-bg-main border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary ${!regionMapping[city] ? 'border-red-500/50' : 'border-white/10'}`}
                              >
                                <option value="">اختر المنطقة</option>
                                {Array.isArray(heeizRegions[provinceMapping[city]]) && heeizRegions[provinceMapping[city]].map(r => (
                                  <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                              </select>
                              <p className="text-[9px] opacity-30 italic">يجب اختيار منطقة واحدة على الأقل لكل محافظة لتجنب أخطاء الإرسال.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-8 border-t border-white/5 flex justify-end gap-4">
              <button 
                onClick={() => setShowHeeizModal(false)}
                className="px-8 py-4 bg-white/5 text-white font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all"
              >
                إلغاء
              </button>
              <button 
                onClick={handleSaveHeeizMapping}
                className="px-8 py-4 bg-primary text-white font-black uppercase tracking-widest rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
              >
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminShippingCompanies;
