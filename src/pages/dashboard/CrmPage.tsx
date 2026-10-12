import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Phone,
  MessageCircle,
  Building2,
  CheckCircle2,
  Send,
  ArrowRight,
  ArrowLeft,
  Trash2,
  RotateCw,
  Sparkles,
  UserPlus,
  BellRing,
  Kanban,
  List,
  Users,
  BookUser,
  UserCheck,
  X,
  Plus,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AgencySettings, CrmEntry, Property } from '@/types';
import { formatPrice } from '@/lib/format';
import { useLanguage } from '@/context/LanguageContext';

type ClientRole = 'BUYER' | 'SELLER' | 'TENANT' | 'LANDLORD';

const STAGES = [
  { id: 'LEAD', labelKu: 'نوێ (Lead)', labelAr: 'جديد (Lead)', labelEn: 'New Lead', color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400' },
  { id: 'CONTACTED', labelKu: 'پەیوەندیکراو', labelAr: 'تم التواصل', labelEn: 'Contacted', color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400' },
  { id: 'VIEWING', labelKu: 'سەردانی موڵک', labelAr: 'معاينة العقار', labelEn: 'Viewing', color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400' },
  { id: 'OFFER', labelKu: 'پێشکەشکردنی نرخ', labelAr: 'تقديم عرض', labelEn: 'Offer', color: 'from-gold-500/20 to-gold-600/10 border-gold-500/30 text-gold-400' },
  { id: 'CLOSED', labelKu: 'سەرکەوتوو (گرێبەست)', labelAr: 'صفقة ناجحة', labelEn: 'Closed Deal', color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400' },
] as const;

export function CrmPage() {
  const { lang, rtl } = useLanguage();
  const [entries, setEntries] = useState<CrmEntry[]>([]);
  const [inventory, setInventory] = useState<Property[]>([]);
  const [agency, setAgency] = useState<AgencySettings | null>(null);
  const [loading, setLoading] = useState(true);

  // View mode: Kanban | List | Contacts Directory
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'contacts'>('kanban');

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | ClientRole>('ALL');
  const [stageFilter, setStageFilter] = useState<string>('ALL');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ customerName: '', phone: '' });

  // Contact picker states inside Add Lead Modal
  const [leadSelectedContact, setLeadSelectedContact] = useState<{ id?: string; name: string; phone: string } | null>(null);
  const [contactSearchInLead, setContactSearchInLead] = useState('');
  const [showInlineAddContactInLead, setShowInlineAddContactInLead] = useState(false);
  const [inlineContactName, setInlineContactName] = useState('');
  const [inlineContactPhone, setInlineContactPhone] = useState('');
  const [savingInlineContact, setSavingInlineContact] = useState(false);

  const [activeMessageModal, setActiveMessageModal] = useState<{
    entry: CrmEntry;
    type: 'seller_checkin' | 'buyer_match' | 'custom' | 'staff_notify';
    property?: Property;
  } | null>(null);
  const [customMsgText, setCustomMsgText] = useState('');

  // Add / Edit Form State
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    email: '',
    notes: '',
    budget: 0,
    budgetCurrency: 'USD',
    status: 'LEAD',
    role: 'BUYER' as ClientRole,
    propertyTypeInterest: 'HOUSE',
  });

  const getDeletedIds = (): Set<string> => {
    try {
      const raw = localStorage.getItem('houseland_deleted_crm_ids');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  };

  const getDeletedPhones = (): Set<string> => {
    try {
      const raw = localStorage.getItem('houseland_deleted_crm_phones');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  };

  const unmarkDeleted = (phone?: string, id?: string) => {
    try {
      if (phone) {
        const phones = getDeletedPhones();
        phones.delete(phone.trim());
        localStorage.setItem('houseland_deleted_crm_phones', JSON.stringify(Array.from(phones)));
      }
      if (id) {
        const ids = getDeletedIds();
        ids.delete(id);
        localStorage.setItem('houseland_deleted_crm_ids', JSON.stringify(Array.from(ids)));
      }
    } catch {}
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [crmRes, invRes, agencyRes] = await Promise.all([
        api.get<CrmEntry[]>('/api/crm').catch(() => []),
        api.get<{ data: Property[] }>('/api/properties?status=APPROVED&limit=250').catch(() => ({ data: [] })),
        api.get<AgencySettings>('/api/agency').catch(() => null),
      ]);
      const delIds = getDeletedIds();
      const delPhones = getDeletedPhones();
      const validCrm = (crmRes || []).filter(
        (e) =>
          e.status !== 'DELETED' &&
          !delIds.has(e.id) &&
          !delPhones.has(e.phone?.trim() || '')
      );
      setEntries(validCrm);
      setInventory(invRes?.data || []);
      if (agencyRes) setAgency(agencyRes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Parse client role from propertyInterests array
  const getClientRole = (entry: CrmEntry): ClientRole => {
    const roleTag = entry.propertyInterests?.find((i) => i.startsWith('ROLE:'));
    if (roleTag) return roleTag.replace('ROLE:', '') as ClientRole;
    return 'BUYER';
  };

  // Contacts list derived and deduplicated by phone number
  const contactsList = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        phone: string;
        roles: Set<string>;
        propertiesOwned: string[];
        requestCount: number;
        latestEntry: CrmEntry;
      }
    >();

    for (const e of entries) {
      if (!e.customerName || !e.phone) continue;
      const key = e.phone.trim();
      const role = getClientRole(e);
      const owned =
        e.propertyInterests
          ?.filter((t) => t.startsWith('OWNER_OF:'))
          .map((t) => t.replace('OWNER_OF:', '')) || [];

      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          id: e.id,
          name: e.customerName.trim(),
          phone: e.phone.trim(),
          roles: new Set([role]),
          propertiesOwned: [...owned],
          requestCount: 1,
          latestEntry: e,
        });
      } else {
        existing.roles.add(role);
        for (const o of owned) {
          if (!existing.propertiesOwned.includes(o)) {
            existing.propertiesOwned.push(o);
          }
        }
        existing.requestCount += 1;
      }
    }

    return Array.from(map.values());
  }, [entries]);

  // Fast 2-field contact creation (Name & Phone only)
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.customerName.trim() || !contactForm.phone.trim()) return;

    try {
      const payload = {
        customerName: contactForm.customerName.trim(),
        phone: contactForm.phone.trim(),
        propertyInterests: ['ROLE:CONTACT'],
        status: 'LEAD',
      };
      const created = await api.post<CrmEntry>('/api/crm', payload);
      unmarkDeleted(created.phone, created.id);
      setEntries((prev) => [created, ...prev]);
      setShowAddContactModal(false);
      setContactForm({ customerName: '', phone: '' });
    } catch {
      alert('نەتوانرا کۆنتاکتەکە تۆمار بکرێت');
    }
  };

  // Fast inline contact creation inside Add Lead Modal
  const handleInlineCreateContactInLead = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cName = inlineContactName.trim();
    const cPhone = inlineContactPhone.trim();
    if (!cName || !cPhone) {
      alert('تکایە ناو و ژمارەی مۆبایل بنووسە');
      return;
    }
    setSavingInlineContact(true);
    try {
      const payload = {
        customerName: cName,
        phone: cPhone,
        propertyInterests: ['ROLE:CONTACT'],
        status: 'LEAD',
      };
      const created = await api.post<CrmEntry>('/api/crm', payload);
      unmarkDeleted(created.phone, created.id);
      setEntries((prev) => [created, ...prev]);
      const newContact = {
        id: created.id,
        name: created.customerName,
        phone: created.phone,
      };
      setLeadSelectedContact(newContact);
      setForm((prev) => ({
        ...prev,
        customerName: newContact.name,
        phone: newContact.phone,
      }));
      setShowInlineAddContactInLead(false);
      setInlineContactName('');
      setInlineContactPhone('');
      setContactSearchInLead('');
    } catch {
      alert('نەتوانرا کۆنتاکتەکە تۆمار بکرێت');
    } finally {
      setSavingInlineContact(false);
    }
  };

  const openLeadModalForContact = (contact: { name: string; phone: string; id?: string }) => {
    setLeadSelectedContact(contact);
    setShowInlineAddContactInLead(false);
    setInlineContactName('');
    setInlineContactPhone('');
    setContactSearchInLead('');
    setForm({
      customerName: contact.name,
      phone: contact.phone,
      email: '',
      notes: '',
      budget: 0,
      budgetCurrency: 'USD',
      status: 'LEAD',
      role: 'BUYER',
      propertyTypeInterest: 'HOUSE',
    });
    setShowAddModal(true);
  };

  const getRoleLabel = (role: ClientRole) => {
    if (lang === 'ar') {
      if (role === 'BUYER') return 'مشتري';
      if (role === 'SELLER') return 'بائع / مالك';
      if (role === 'TENANT') return 'مستأجر';
      return 'صاحب عقار';
    }
    if (lang === 'en') {
      if (role === 'BUYER') return 'Buyer';
      if (role === 'SELLER') return 'Seller';
      if (role === 'TENANT') return 'Tenant';
      return 'Landlord';
    }
    if (role === 'BUYER') return 'کڕیار';
    if (role === 'SELLER') return 'فرۆشیار';
    if (role === 'TENANT') return 'کرێچی';
    return 'خاوەن موڵک';
  };

  // Submit new customer lead
  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const customerName = (leadSelectedContact?.name || form.customerName).trim();
    const phone = (leadSelectedContact?.phone || form.phone).trim();

    if (!customerName || !phone) {
      alert('تکایە سەرەتا کۆنتاکتێک لە لیست هەڵبژێرە یان کۆنتاکتێکی نوێ لێرە تۆمار بکە');
      return;
    }

    const payload = {
      customerName,
      phone,
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
      budget: Number(form.budget) || null,
      budgetCurrency: form.budgetCurrency || 'USD',
      status: form.status,
      propertyInterests: [`ROLE:${form.role}`, `TYPE:${form.propertyTypeInterest}`],
    };

    try {
      const created = await api.post<CrmEntry>('/api/crm', payload);
      unmarkDeleted(created.phone, created.id);
      setEntries((prev) => [created, ...prev]);
      setShowAddModal(false);
      setLeadSelectedContact(null);
      setShowInlineAddContactInLead(false);
      setInlineContactName('');
      setInlineContactPhone('');
      setContactSearchInLead('');
      setForm({
        customerName: '',
        phone: '',
        email: '',
        notes: '',
        budget: 0,
        budgetCurrency: 'USD',
        status: 'LEAD',
        role: 'BUYER',
        propertyTypeInterest: 'HOUSE',
      });
    } catch {
      alert('نەتوانرا کڕیارەکە تۆمار بکرێت');
    }
  };

  // Update client status
  const handleUpdateStatus = async (id: string, nextStatus: string) => {
    setEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
    );
    try {
      await api.patch(`/api/crm/${id}`, { status: nextStatus });
    } catch {
      loadData();
    }
  };

  // Delete client lead / request
  const handleDeleteLead = async (id: string) => {
    if (!window.confirm('دڵنیایت لە سڕینەوەی ئەم داواکارییە؟')) return;
    setEntries((prev) => prev.filter((item) => item.id !== id));

    try {
      const ids = getDeletedIds();
      ids.add(id);
      localStorage.setItem('houseland_deleted_crm_ids', JSON.stringify(Array.from(ids)));
    } catch {}

    try {
      await api.delete(`/api/crm/${id}`);
    } catch {
      try {
        await api.patch(`/api/crm/${id}`, { status: 'DELETED' });
      } catch {}
    }
  };

  // Delete entire contact and all their associated CRM entries
  const handleDeleteContact = async (contact: {
    id: string;
    name: string;
    phone: string;
    propertiesOwned?: string[];
  }) => {
    if (!window.confirm(`دڵنیایت لە سڕینەوەی کۆنتاکتی "${contact.name}"؟ هەموو تۆمار و داواکارییەکانی دەسڕدرێنەوە.`)) return;

    const targetPhone = contact.phone.trim();
    const matchingEntries = entries.filter((e) => e.phone?.trim() === targetPhone);
    const matchingIds = matchingEntries.map((e) => e.id);

    // 1. Remove immediately from local state
    setEntries((prev) => prev.filter((e) => e.phone?.trim() !== targetPhone));

    // 2. Persist in localStorage so it never re-appears
    try {
      const phones = getDeletedPhones();
      phones.add(targetPhone);
      localStorage.setItem('houseland_deleted_crm_phones', JSON.stringify(Array.from(phones)));

      const ids = getDeletedIds();
      for (const id of matchingIds) ids.add(id);
      localStorage.setItem('houseland_deleted_crm_ids', JSON.stringify(Array.from(ids)));

      if (contact.propertiesOwned) {
        for (const code of contact.propertiesOwned) {
          localStorage.removeItem(`houseland_owner_${code}`);
        }
      }
    } catch {}

    // 3. Sync to backend (delete or patch to DELETED status)
    for (const entry of matchingEntries) {
      try {
        await api.delete(`/api/crm/${entry.id}`);
      } catch {
        try {
          await api.patch(`/api/crm/${entry.id}`, { status: 'DELETED' });
        } catch {}
      }
    }
  };

  // Inventory matcher for buyer/tenant leads
  const getMatchedProperties = (entry: CrmEntry): Property[] => {
    const role = getClientRole(entry);
    if (role === 'SELLER' || role === 'LANDLORD') return [];

    const budget = entry.budget || 0;
    const typeTag = entry.propertyInterests?.find((i) => i.startsWith('TYPE:'))?.replace('TYPE:', '');

    let matches = inventory;
    if (typeTag) {
      const typeMatches = matches.filter((p) => p.propertyType === typeTag);
      if (typeMatches.length > 0) matches = typeMatches;
    }

    if (budget > 0) {
      // Find properties within range (up to 15% above budget or 25% below)
      const budgetMatches = matches.filter(
        (p) => p.price <= budget * 1.15 && p.price >= budget * 0.7
      );
      if (budgetMatches.length > 0) return budgetMatches.slice(0, 4);
    }

    return matches.slice(0, 3);
  };

  // Automated WhatsApp Message Generators
  const generateMessage = (
    entry: CrmEntry,
    type: 'seller_checkin' | 'buyer_match' | 'custom' | 'staff_notify',
    prop?: Property
  ): string => {
    const name = entry.customerName;
    const phone = entry.phone;
    const propCode = prop?.code || '';
    const propTitle = prop?.title || '';
    const propLink = prop ? `${window.location.origin}/property/${prop.code}` : '';

    if (type === 'seller_checkin') {
      if (lang === 'ar') {
        return `مرحباً أستاذ ${name}، نتواصل معك من وكالة Houseland العقارية بخصوص العقار الذي عرضته لدينا. أردنا الاطمئنان والسؤال: هل العقار ما زال متاحاً؟ وهل يوجد أي تعديل في السعر أو التفاصيل؟ يسعدنا دائماً خدمتك.`;
      }
      if (lang === 'en') {
        return `Hello ${name}, reaching out from Houseland Real Estate regarding the property you listed with us. We wanted to check in to see if the property is still available and if you have any updates on price or details. We're happy to assist you!`;
      }
      return `سڵاو بەڕێز ${name}، لە ئەجەنسی Houseland دەربارەی ئەو موڵکەی کە لەلامان داتناوە پەیوەندیت پێوە دەکەین. ویستمان هەواڵت بپرسین بزانین ئایا موڵکەکەت هێشتا بەردەستە؟ هیچ گۆڕانکارییەک لە نرخ یان زانیارییەکانیدا هەیە؟ لە خزمەتتداین.`;
    }

    if (type === 'buyer_match') {
      if (lang === 'ar') {
        return `مرحباً أستاذ ${name}، من وكالة Houseland العقارية، وصلنا عقار جديد يتطابق تماماً مع طلبك وميزانيتك (كود #${propCode} - ${propTitle}). يمكنك مشاهدة الصور والتفاصيل عبر الرابط: ${propLink} - إذا أحببت ترتيب موعد لمعاينته يرجى إعلامنا.`;
      }
      if (lang === 'en') {
        return `Hello ${name}, from Houseland Real Estate! A new property just became available that matches your request and budget (Code #${propCode} - ${propTitle}). You can view full photos and details here: ${propLink} - Let us know if you'd like to schedule a viewing!`;
      }
      return `سڵاو بەڕێز ${name}، لە ئەجەنسی Houseland موڵکێکی نوێمان بۆ هات کە تەواو لەگەڵ داواکاری و بودجەکەت دەگونجێت (کۆدی #${propCode} - ${propTitle}). دەتوانیت وێنە و تەواوی زانیارییەکانی لەم لینکەدا ببینیت: ${propLink} - گەر حەز دەکەیت بینینی بۆ ڕێکبخەین ئاگادارمان بکەرەوە.`;
    }

    if (type === 'staff_notify') {
      const budgetStr = entry.budget ? `$${formatPrice(entry.budget, 'USD', lang)}` : 'دیارینەکراو';
      if (lang === 'ar') {
        return `تنبيه لفريق Houseland: العميل ${name} (هاتف: ${phone}) لديه طلب عقار بميزانية ${budgetStr}. تم العثور على هذا العقار المطابق: كود #${propCode} (${propTitle}) - ${propLink} يرجى المتابعة والتواصل معه.`;
      }
      if (lang === 'en') {
        return `Houseland Staff Alert: Client ${name} (Phone: ${phone}) is looking for property with budget ${budgetStr}. Matched property: #${propCode} (${propTitle}) - ${propLink} Please follow up.`;
      }
      return `ئاگاداری بۆ تیمی Houseland: موشتەری ${name} (مۆبایل: ${phone}) داواکاری موڵکی هەیە بە بودجەی ${budgetStr}. ئەم موڵکە هاوشێوەیە دۆزرایەوە: کۆدی #${propCode} (${propTitle}) - ${propLink} تکایە بەدواداچوونی بۆ بکەن.`;
    }

    // Default general check-in
    if (lang === 'ar') {
      return `مرحباً أستاذ ${name}، نتواصل معك من وكالة Houseland بخصوص طلبك العقاري. هل ما زلت تبحث عن عقار؟ يسعدنا خدمتك بأفضل الخيارات المتاحة.`;
    }
    if (lang === 'en') {
      return `Hello ${name}, following up from Houseland Real Estate regarding your property inquiry. Are you still looking? We have great new options available to show you!`;
    }
    return `سڵاو بەڕێز ${name}، لە ئەجەنسی Houseland دەربارەی داواکارییەکەت بۆ موڵک پەیوەندیت پێوە دەکەین. ئایا هێشتا بەدوای موڵکدا دەگەڕێیت؟ چەندین بژاردەی نوێمان بۆ هاتووە کە دەتوانین پێشکەشت بکەین.`;
  };

  const openWhatsApp = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Filtered leads
  const filteredEntries = useMemo(() => {
    let list = [...entries];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.customerName.toLowerCase().includes(q) ||
          e.phone.includes(q) ||
          e.notes?.toLowerCase().includes(q)
      );
    }

    if (roleFilter !== 'ALL') {
      list = list.filter((e) => getClientRole(e) === roleFilter);
    }

    if (stageFilter !== 'ALL') {
      list = list.filter((e) => e.status === stageFilter);
    }

    return list;
  }, [entries, searchQuery, roleFilter, stageFilter]);

  // Stage column leads for Kanban
  const getStageEntries = (stageId: string) => {
    return filteredEntries.filter((e) => e.status === stageId);
  };

  const NextStageIcon = rtl ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              {lang === 'ar' ? 'إدارة العملاء والطلبات (CRM)' : lang === 'en' ? 'Client Relationship Management (CRM)' : 'بەڕێوەبردنی کڕیاران و پەیوەندییەکان (CRM)'}
            </h1>
          </div>
          <p className="mt-1 text-xs text-royal-300 sm:text-sm">
            {lang === 'ar'
              ? 'متابعة العملاء، إرسال رسائل واتساب الذكية، مطابقة العقارات للطلبات، وتنبيهات الفريق.'
              : lang === 'en'
              ? 'Client tracking, automated WhatsApp follow-ups, smart property matching, and team alerts.'
              : 'چاودێریکردنی موشتەرییەکان، ناردنی نامەی زیرەکی واتسئاپ، دۆزینەوەی موڵکی هاوشێوە، و ئاگادارکردنەوەی ستاف.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-royal-700 bg-royal-950 p-1">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === 'kanban' ? 'bg-gold-500 text-royal-950 shadow-sm' : 'text-royal-300 hover:text-white'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">بۆرد</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === 'list' ? 'bg-gold-500 text-royal-950 shadow-sm' : 'text-royal-300 hover:text-white'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">لیست</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('contacts')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === 'contacts' ? 'bg-gold-500 text-royal-950 shadow-sm' : 'text-royal-300 hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>کۆنتاکتەکان</span>
              <span className="rounded-full bg-royal-800/90 px-1.5 py-0.2 text-[10px] font-bold text-gold-400">
                {contactsList.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-royal-700 bg-royal-900/80 text-royal-200 transition hover:border-gold-500/50 hover:text-gold-300 active:scale-95 disabled:opacity-50"
            title="نوێکردنەوە"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin text-gold-400' : ''}`} />
          </button>

          {/* Quick Add Contact (Name + Phone) */}
          <button
            type="button"
            onClick={() => {
              setContactForm({ customerName: '', phone: '' });
              setShowAddContactModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-royal-700 bg-royal-900/80 px-2.5 py-2 sm:px-3.5 sm:py-2.5 text-xs font-semibold text-royal-200 transition hover:border-gold-500/50 hover:text-gold-300 active:scale-95"
            title="تۆمارکردنی خێرای کۆنتاکت بە تەنها ناو و تەلەفۆن"
          >
            <BookUser className="h-4 w-4 text-gold-400" />
            <span className="hidden sm:inline">کۆنتاکتی نوێ</span>
          </button>

          {/* Add New Request / Lead */}
          <button
            type="button"
            onClick={() => {
              setLeadSelectedContact(null);
              setShowInlineAddContactInLead(false);
              setInlineContactName('');
              setInlineContactPhone('');
              setContactSearchInLead('');
              setForm({
                customerName: '',
                phone: '',
                email: '',
                notes: '',
                budget: 0,
                budgetCurrency: 'USD',
                status: 'LEAD',
                role: 'BUYER',
                propertyTypeInterest: 'HOUSE',
              });
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-gradient-to-r from-gold-400 to-gold-600 px-3 py-2 sm:px-4 sm:py-2.5 text-xs font-bold text-royal-950 shadow-md shadow-gold-500/20 transition hover:brightness-105 active:scale-95 shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>داواکاری نوێ</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-royal-800/80 bg-gradient-to-br from-royal-900/60 to-royal-950/80 p-3 sm:p-3.5 shadow-sm min-w-0">
          <span className="text-xs font-medium text-royal-300 truncate block">سەرجەم موشتەرییەکان</span>
          <p className="mt-2 text-2xl font-black text-white">{entries.length}</p>
        </div>

        <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/30 to-royal-950/80 p-3 sm:p-3.5 shadow-sm min-w-0">
          <span className="text-xs font-medium text-blue-300 truncate block">کڕیار و داواکاری</span>
          <p className="mt-2 text-2xl font-black text-blue-400">
            {entries.filter((e) => getClientRole(e) === 'BUYER' || getClientRole(e) === 'TENANT').length}
          </p>
        </div>

        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 to-royal-950/80 p-3 sm:p-3.5 shadow-sm min-w-0">
          <span className="text-xs font-medium text-purple-300 truncate block">فرۆشیار و خاوەن موڵک</span>
          <p className="mt-2 text-2xl font-black text-purple-400">
            {entries.filter((e) => getClientRole(e) === 'SELLER' || getClientRole(e) === 'LANDLORD').length}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-royal-950/80 p-3 sm:p-3.5 shadow-sm min-w-0">
          <span className="text-xs font-medium text-emerald-300 truncate block">گرێبەستی سەرکەوتوو</span>
          <p className="mt-2 text-2xl font-black text-emerald-400">
            {entries.filter((e) => e.status === 'CLOSED').length}
          </p>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="rounded-3xl border border-royal-800/80 bg-royal-900/40 p-3.5 sm:p-4 shadow-xl backdrop-blur-md space-y-3 min-w-0 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Real-time search */}
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-royal-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="گەڕان بەپێی ناو، ژمارەی مۆبایل، تێبینی..."
              className="w-full rounded-xl border border-royal-700/80 bg-royal-950/80 py-2.5 ps-9 pe-3 text-xs text-white placeholder:text-royal-500 focus:border-gold-400 focus:outline-none"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="rounded-xl border border-royal-700/80 bg-royal-950/80 px-3 py-2.5 text-xs text-royal-200 focus:border-gold-400 focus:outline-none"
          >
            <option value="ALL">هەموو ڕۆڵەکان (All Roles)</option>
            <option value="BUYER">کڕیار (Buyer)</option>
            <option value="SELLER">فرۆشیار / خاوەن موڵک (Seller)</option>
            <option value="TENANT">کرێچی (Tenant)</option>
            <option value="LANDLORD">خاوەن موڵکی کرێ (Landlord)</option>
          </select>

          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded-xl border border-royal-700/80 bg-royal-950/80 px-3 py-2.5 text-xs text-royal-200 focus:border-gold-400 focus:outline-none"
          >
            <option value="ALL">هەموو قۆناغەکان (All Stages)</option>
            <option value="LEAD">نوێ (Lead)</option>
            <option value="CONTACTED">پەیوەندیکراو (Contacted)</option>
            <option value="VIEWING">بینینی موڵک (Viewing)</option>
            <option value="OFFER">پێشکەشکردنی نرخ (Offer)</option>
            <option value="CLOSED">گرێبەست (Closed Deal)</option>
          </select>
        </div>
      </div>

      {/* VIEW MODE 1: KANBAN PIPELINE BOARD */}
      {viewMode === 'kanban' && (
        <div className="flex lg:grid lg:grid-cols-5 gap-4 items-start overflow-x-auto pb-4 w-full max-w-full min-w-0 snap-x">
          {STAGES.map((st) => {
            const stageLeads = getStageEntries(st.id);
            const stageLabel = lang === 'ar' ? st.labelAr : lang === 'en' ? st.labelEn : st.labelKu;

            return (
              <div
                key={st.id}
                className="rounded-3xl border border-royal-800/80 bg-royal-900/30 p-3.5 shadow-md flex flex-col w-[85vw] sm:w-72 lg:w-auto shrink-0 lg:shrink min-w-0 snap-start"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between pb-3 border-b border-royal-800/60">
                  <span className="text-xs font-bold text-white">{stageLabel}</span>
                  <span className="rounded-full bg-royal-800 px-2 py-0.5 text-[10px] font-bold text-gold-400">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Stage Lead Cards */}
                <div className="mt-3 space-y-3">
                  {stageLeads.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-royal-500">هیچ کڕیارێک نییە</div>
                  ) : (
                    stageLeads.map((entry) => {
                      const role = getClientRole(entry);
                      const matches = getMatchedProperties(entry);

                      return (
                        <div
                          key={entry.id}
                          className="rounded-2xl border border-royal-800/80 bg-gradient-to-br from-royal-900/80 to-royal-950 p-3.5 shadow-md space-y-3 transition hover:border-gold-500/40"
                        >
                          {/* Client Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-white text-xs sm:text-sm">{entry.customerName}</h4>
                              <p className="text-[11px] text-royal-400 dir-ltr text-start mt-0.5">{entry.phone}</p>
                            </div>
                            <span
                              className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border ${
                                role === 'SELLER' || role === 'LANDLORD'
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              }`}
                            >
                              {getRoleLabel(role)}
                            </span>
                          </div>

                          {/* Budget & Note */}
                          {entry.budget ? (
                            <div className="text-xs font-bold text-gold-300">
                              بودجە: ${formatPrice(entry.budget, 'USD', lang)}
                            </div>
                          ) : null}

                          {entry.notes && (
                            <p className="text-[11px] text-royal-300/80 line-clamp-2 bg-royal-950/60 p-2 rounded-xl border border-royal-800/50">
                              {entry.notes}
                            </p>
                          )}

                          {/* Fast Action Buttons (Call & WhatsApp) */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <a
                              href={`tel:${entry.phone}`}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-royal-700 bg-royal-900/60 py-2 text-xs font-semibold text-royal-200 hover:text-white hover:border-royal-600 transition active:scale-95"
                            >
                              <Phone className="h-3.5 w-3.5 text-gold-400" />
                              <span>تەلەفۆن</span>
                            </a>

                            {/* WhatsApp Button with Smart Flow */}
                            <button
                              type="button"
                              onClick={() => {
                                const msgType = role === 'SELLER' || role === 'LANDLORD' ? 'seller_checkin' : 'custom';
                                const text = generateMessage(entry, msgType);
                                setCustomMsgText(text);
                                setActiveMessageModal({ entry, type: msgType });
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition active:scale-95"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span>واتسئاپ</span>
                            </button>
                          </div>

                          {/* If Seller / Landlord: Check-in button */}
                          {(role === 'SELLER' || role === 'LANDLORD') && (
                            <button
                              type="button"
                              onClick={() => {
                                const text = generateMessage(entry, 'seller_checkin');
                                setCustomMsgText(text);
                                setActiveMessageModal({ entry, type: 'seller_checkin' });
                              }}
                              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 py-1.5 text-[11px] font-semibold text-purple-300 hover:bg-purple-500/20 transition"
                            >
                              <Sparkles className="h-3 w-3 text-purple-400" />
                              <span>پرسیارکردنی دۆخی موڵک (واتسئاپ)</span>
                            </button>
                          )}

                          {/* If Buyer / Tenant: Matched Properties Preview */}
                          {(role === 'BUYER' || role === 'TENANT') && matches.length > 0 && (
                            <div className="border-t border-royal-800/80 pt-2 space-y-1.5">
                              <span className="text-[10px] font-bold text-royal-400 flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-gold-400" />
                                <span>{matches.length} موڵکی هاوشێوە دۆزرایەوە:</span>
                              </span>

                              <div className="space-y-1">
                                {matches.slice(0, 2).map((mProp) => (
                                  <div
                                    key={mProp.id}
                                    className="flex items-center justify-between gap-1 text-[11px] bg-royal-950/70 p-1.5 rounded-lg border border-royal-800/60"
                                  >
                                    <div className="truncate flex-1">
                                      <span className="text-gold-400 font-bold">#{mProp.code}</span> ·{' '}
                                      <span className="text-white">${formatPrice(mProp.price, 'USD', lang)}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const text = generateMessage(entry, 'buyer_match', mProp);
                                        setCustomMsgText(text);
                                        setActiveMessageModal({ entry, type: 'buyer_match', property: mProp });
                                      }}
                                      title="ناردنی موڵک بە واتسئاپ بۆ کڕیار"
                                      className="flex items-center gap-1 rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/30 transition"
                                    >
                                      <Send className="h-2.5 w-2.5" />
                                      <span>ناردن</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Footer Stage Advancement & Delete */}
                          <div className="flex items-center justify-between border-t border-royal-800/50 pt-2 text-[11px]">
                            {/* Advance stage button */}
                            {st.id !== 'CLOSED' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const curIdx = STAGES.findIndex((s) => s.id === st.id);
                                  if (curIdx >= 0 && curIdx < STAGES.length - 1) {
                                    handleUpdateStatus(entry.id, STAGES[curIdx + 1].id);
                                  }
                                }}
                                className="flex items-center gap-1 text-gold-400 font-semibold hover:text-gold-300 transition"
                              >
                                <span>قۆناغی دواتر</span>
                                <NextStageIcon className="h-3 w-3" />
                              </button>
                            ) : (
                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>تەواوکراو</span>
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteLead(entry.id)}
                              className="text-royal-500 hover:text-red-400 transition"
                              title="سڕینەوە"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: TABLE LIST VIEW */}
      {viewMode === 'list' && (
        <div className="overflow-x-auto w-full max-w-full rounded-3xl border border-royal-800/80 bg-royal-900/40 shadow-xl backdrop-blur-md">
          <table className="w-full text-start text-xs min-w-[650px]">
            <thead className="border-b border-royal-800/80 bg-royal-950/70 text-royal-400 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">ناوی کڕیار</th>
                <th className="py-3 px-3">مۆبایل</th>
                <th className="py-3 px-3">ڕۆڵ</th>
                <th className="py-3 px-3">بودجە</th>
                <th className="py-3 px-3">قۆناغی ئێستا</th>
                <th className="py-3 px-4">موڵکی هاوشێوە</th>
                <th className="py-3 px-4 text-center">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-royal-800/50">
              {filteredEntries.map((entry) => {
                const role = getClientRole(entry);
                const matches = getMatchedProperties(entry);

                return (
                  <tr key={entry.id} className="hover:bg-royal-800/30 transition">
                    <td className="py-3 px-4 font-bold text-white">{entry.customerName}</td>
                    <td className="py-3 px-3 text-royal-300 dir-ltr text-start">{entry.phone}</td>
                    <td className="py-3 px-3">
                      <span className="rounded-md bg-royal-950 border border-royal-700 px-2 py-0.5 text-[10px] font-semibold text-royal-200">
                        {getRoleLabel(role)}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-gold-300">
                      {entry.budget ? `$${formatPrice(entry.budget, 'USD', lang)}` : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={entry.status}
                        onChange={(e) => handleUpdateStatus(entry.id, e.target.value)}
                        className="rounded-lg border border-royal-700 bg-royal-950 px-2.5 py-1 text-xs font-semibold text-royal-200 outline-none"
                      >
                        {STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {lang === 'ar' ? s.labelAr : lang === 'en' ? s.labelEn : s.labelKu}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      {matches.length > 0 ? (
                        <div className="flex items-center gap-1">
                          {matches.slice(0, 2).map((m) => (
                            <Link
                              key={m.id}
                              to={`/property/${m.code}`}
                              className="rounded bg-royal-950 border border-gold-500/30 px-1.5 py-0.5 text-[10px] text-gold-400 hover:underline"
                            >
                              #{m.code}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span className="text-royal-500 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <a
                          href={`tel:${entry.phone}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-royal-700 bg-royal-900 text-royal-300 hover:text-white"
                          title="تەلەفۆن"
                        >
                          <Phone className="h-3.5 w-3.5 text-gold-400" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const msgType = role === 'SELLER' || role === 'LANDLORD' ? 'seller_checkin' : 'custom';
                            const text = generateMessage(entry, msgType);
                            setCustomMsgText(text);
                            setActiveMessageModal({ entry, type: msgType });
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                          title="واتسئاپ"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLead(entry.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/30 bg-red-950/40 text-red-400 hover:bg-red-900/60"
                          title="سڕینەوە"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW MODE 3: CONTACTS DIRECTORY */}
      {viewMode === 'contacts' && (
        <div className="space-y-4">
          {/* Contacts Sub-bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-royal-800 bg-royal-900/50 p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gold-400" />
              <div>
                <h2 className="text-sm font-bold text-white">بەشی کۆنتاکتەکان (Contacts Directory)</h2>
                <p className="text-xs text-royal-300">
                  سەرجەم ناونیشان و ژمارەی تەلەفۆنەکانی تۆمارکراو ({contactsList.length} کۆنتاکت)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setContactForm({ customerName: '', phone: '' });
                setShowAddContactModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-400 to-gold-600 px-4 py-2 text-xs font-bold text-royal-950 shadow-md shadow-gold-500/20 hover:brightness-105 active:scale-95 transition"
            >
              <BookUser className="h-4 w-4" />
              <span>زیادکردنی کۆنتاکت (ناو و تەلەفۆن)</span>
            </button>
          </div>

          {contactsList.length === 0 ? (
            <div className="rounded-3xl border border-royal-800 bg-royal-900/30 p-12 text-center space-y-3">
              <Users className="mx-auto h-12 w-12 text-royal-600" />
              <p className="text-sm font-semibold text-royal-300">هیچ کۆنتاکتێک تۆمار نەکراوە</p>
              <p className="text-xs text-royal-500 max-w-sm mx-auto">
                دەتوانیت بە ئاسانی تەنها بە ناو و ژمارەی تەلەفۆن کۆنتاکت تۆمار بکەیت بۆ ئەوەی دواتر لە کاتی داواکاری یان دانانی موڵک بەکاریان بهێنیت.
              </p>
              <button
                type="button"
                onClick={() => setShowAddContactModal(true)}
                className="btn-gold text-xs px-4 py-2 mt-2"
              >
                کۆنتاکتی یەکەم تۆمار بکە
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {contactsList
                .filter((c) => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase().trim();
                  return c.name.toLowerCase().includes(q) || c.phone.includes(q);
                })
                .map((contact) => (
                  <div
                    key={contact.id + contact.phone}
                    className="rounded-2xl border border-royal-800/80 bg-gradient-to-b from-royal-900/60 to-royal-950/80 p-4 shadow-md hover:border-gold-500/40 transition flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      {/* Contact Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300 font-bold text-sm shadow">
                            {contact.name.slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-white text-sm block truncate group-hover:text-gold-300 transition">
                              {contact.name}
                            </span>
                            <a
                              href={`tel:${contact.phone}`}
                              className="text-xs font-mono text-royal-300 hover:text-gold-400 dir-ltr block transition"
                            >
                              {contact.phone}
                            </a>
                          </div>
                        </div>

                        <span className="rounded-full bg-royal-800/80 px-2 py-0.5 text-[10px] font-semibold text-royal-300 shrink-0">
                          {contact.requestCount} تۆمار
                        </span>
                      </div>

                      {/* Property Ownership & Tags */}
                      {contact.propertiesOwned.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {contact.propertiesOwned.map((code) => (
                            <Link
                              key={code}
                              to={`/property/${code}`}
                              className="inline-flex items-center gap-1 rounded-md bg-gold-500/10 border border-gold-500/30 px-2 py-0.5 text-[10px] font-bold text-gold-300 hover:bg-gold-500/20"
                            >
                              <span>خاوەنی موڵکی #{code}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-royal-800/60">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-royal-700 bg-royal-900 text-royal-300 hover:text-white hover:border-gold-500/50 transition"
                          title="پەیوەندیکردن"
                        >
                          <Phone className="h-3.5 w-3.5 text-gold-400" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const text = generateMessage(contact.latestEntry, 'custom');
                            setCustomMsgText(text);
                            setActiveMessageModal({ entry: contact.latestEntry, type: 'custom' });
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 transition"
                          title="واتسئاپ"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteContact(contact)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-500/30 bg-red-950/40 text-red-400 hover:bg-red-900/60 transition"
                          title="سڕینەوەی کۆنتاکت"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* 1-Click New Request Button */}
                      <button
                        type="button"
                        onClick={() => openLeadModalForContact(contact)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 py-1.5 text-xs font-bold text-gold-300 hover:bg-gold-500/20 hover:text-gold-200 transition"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>داواکاری نوێ</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD NEW CLIENT / REQUEST (WITH CONTACT PICKER) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-royal-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-royal-700 bg-gradient-to-b from-royal-900 to-royal-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-royal-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-gold-400" />
                <h3 className="font-display text-lg font-bold text-white">تۆمارکردنی داواکاری / کڕیاری نوێ</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-royal-400 hover:text-white text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-3.5">
              {/* Select Existing Contact or Create Inline */}
              <div className="rounded-2xl border border-royal-800 bg-royal-950/70 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gold-300 flex items-center gap-1.5">
                    <BookUser className="h-4 w-4 text-gold-400" />
                    <span>کۆنتاکتی موشتەری <span className="text-red-400">*</span></span>
                  </label>
                  {!leadSelectedContact && !showInlineAddContactInLead && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowInlineAddContactInLead(true);
                        setInlineContactName(contactSearchInLead.trim());
                        setInlineContactPhone('');
                      }}
                      className="text-[11px] text-gold-400 hover:text-gold-300 font-semibold flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>کۆنتاکتی نوێ</span>
                    </button>
                  )}
                </div>

                {leadSelectedContact ? (
                  <div className="flex items-center justify-between rounded-xl border border-gold-500/50 bg-gradient-to-r from-gold-500/15 via-royal-900 to-royal-950 p-3 shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500/20 text-gold-400 shrink-0">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs sm:text-sm">{leadSelectedContact.name}</span>
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.2 text-[9px] font-bold text-emerald-400">
                            دیاریکراو ✓
                          </span>
                        </div>
                        <span className="font-mono text-xs text-gold-300 dir-ltr block mt-0.5">{leadSelectedContact.phone}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLeadSelectedContact(null);
                        setForm((prev) => ({ ...prev, customerName: '', phone: '' }));
                      }}
                      className="rounded-lg border border-royal-700 bg-royal-900 px-2.5 py-1 text-[11px] text-royal-300 hover:text-white hover:border-gold-500/40 transition flex items-center gap-1"
                    >
                      <X className="h-3 w-3 text-red-400" />
                      <span>گۆڕین</span>
                    </button>
                  </div>
                ) : showInlineAddContactInLead ? (
                  <div className="rounded-xl border border-gold-500/40 bg-royal-900/90 p-3.5 space-y-3">
                    <div className="flex items-center justify-between border-b border-royal-800 pb-2">
                      <span className="text-xs font-bold text-gold-300 flex items-center gap-1.5">
                        <UserPlus className="h-4 w-4 text-gold-400" />
                        <span>تۆمارکردنی خێرای کۆنتاکت (ئەگەر لە لیست نییە)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowInlineAddContactInLead(false)}
                        className="text-[11px] text-royal-400 hover:text-white"
                      >
                        گەڕانەوە بۆ لیست
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-royal-200">
                          ناوی تەواو <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={inlineContactName}
                          onChange={(e) => setInlineContactName(e.target.value)}
                          placeholder="ناوی کۆنتاکت"
                          className="input-luxury text-xs py-2"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-royal-200">
                          ژمارەی مۆبایل <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="tel"
                          value={inlineContactPhone}
                          onChange={(e) => setInlineContactPhone(e.target.value)}
                          placeholder="+964 7..."
                          className="input-luxury text-xs py-2 dir-ltr"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowInlineAddContactInLead(false)}
                        className="rounded-lg border border-royal-700 px-3 py-1.5 text-xs text-royal-300 hover:text-white"
                      >
                        پاشگەزبوونەوە
                      </button>
                      <button
                        type="button"
                        disabled={savingInlineContact || !inlineContactName.trim() || !inlineContactPhone.trim()}
                        onClick={handleInlineCreateContactInLead}
                        className="btn-gold text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {savingInlineContact ? (
                          <RotateCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        <span>تۆمار و هەڵبژاردن</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-royal-400" />
                      <input
                        type="text"
                        value={contactSearchInLead}
                        onChange={(e) => setContactSearchInLead(e.target.value)}
                        placeholder="گەڕان بەپێی ناو یان ژمارەی مۆبایل بۆ هەڵبژاردنی کۆنتاکت..."
                        className="w-full rounded-xl border border-royal-700 bg-royal-900/90 py-2.5 ps-8 pe-3 text-xs text-white placeholder:text-royal-500 focus:border-gold-400 focus:outline-none"
                      />
                    </div>

                    {/* Contacts dropdown / list */}
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-royal-800 bg-royal-950 p-1.5 shadow-inner space-y-1">
                      {contactsList
                        .filter((c) => {
                          if (!contactSearchInLead.trim()) return true;
                          const q = contactSearchInLead.toLowerCase().trim();
                          return c.name.toLowerCase().includes(q) || c.phone.includes(q);
                        })
                        .slice(0, 8)
                        .map((c) => (
                          <button
                            key={c.id + c.phone}
                            type="button"
                            onClick={() => {
                              setLeadSelectedContact(c);
                              setForm({ ...form, customerName: c.name, phone: c.phone });
                              setContactSearchInLead('');
                            }}
                            className="w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs text-start hover:bg-royal-900 transition"
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-royal-800 text-gold-400 flex items-center justify-center font-bold text-[10px]">
                                {c.name.charAt(0) || '👤'}
                              </div>
                              <div>
                                <span className="font-semibold text-white block">{c.name}</span>
                                <span className="font-mono text-[10px] text-royal-400 dir-ltr block">{c.phone}</span>
                              </div>
                            </div>
                            <span className="rounded bg-gold-500/20 px-2 py-0.5 text-[10px] font-bold text-gold-400 hover:bg-gold-500 hover:text-royal-950 transition">
                              هەڵبژاردن
                            </span>
                          </button>
                        ))}

                      {contactsList.filter((c) => {
                        if (!contactSearchInLead.trim()) return true;
                        const q = contactSearchInLead.toLowerCase().trim();
                        return c.name.toLowerCase().includes(q) || c.phone.includes(q);
                      }).length === 0 && (
                        <div className="p-3 text-center space-y-2">
                          <p className="text-[11px] text-royal-400">هیچ کۆنتاکتێک نەدۆزرایەوە بەم زانیارییە</p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowInlineAddContactInLead(true);
                              setInlineContactName(contactSearchInLead.trim());
                              setInlineContactPhone('');
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500/20 px-3 py-1.5 text-xs font-bold text-gold-300 hover:bg-gold-500 hover:text-royal-950 transition"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>تۆمارکردنی {contactSearchInLead ? `"${contactSearchInLead}"` : 'کۆنتاکت'} وەک کۆنتاکتی نوێ</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowInlineAddContactInLead(true);
                        setInlineContactName(contactSearchInLead.trim());
                        setInlineContactPhone('');
                      }}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-gold-500/40 bg-gold-500/5 py-2 px-3 text-xs font-semibold text-gold-300 hover:bg-gold-500/15 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>کۆنتاکت لە لیستەکە نییە؟ لێرە زیادی بکە (ناو و ژمارە)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Role Selector Pills */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-royal-200">ڕۆڵی موشتەری</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['BUYER', 'SELLER', 'TENANT', 'LANDLORD'] as ClientRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, role: r })}
                      className={`rounded-xl py-2 px-3 text-xs font-semibold border transition ${
                        form.role === r
                          ? 'border-gold-400 bg-gold-500/20 text-gold-300 font-bold'
                          : 'border-royal-700 bg-royal-900/60 text-royal-300 hover:text-white'
                      }`}
                    >
                      {getRoleLabel(r)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget and Property Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-royal-300">بودجە ($)</label>
                  <input
                    type="number"
                    className="input-luxury text-xs"
                    placeholder="بڕی پارە بە دۆلار"
                    value={form.budget || ''}
                    onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-royal-300">جۆری موڵک</label>
                  <select
                    className="input-luxury text-xs"
                    value={form.propertyTypeInterest}
                    onChange={(e) => setForm({ ...form, propertyTypeInterest: e.target.value })}
                  >
                    <option value="HOUSE">خانوو (House)</option>
                    <option value="APARTMENT">شوقە (Apartment)</option>
                    <option value="VILLA">ڤێلا (Villa)</option>
                    <option value="LAND">زەوی (Land)</option>
                    <option value="COMMERCIAL">بازرگانی (Commercial)</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-xs font-medium text-royal-300">تێبینی و داواکاری</label>
                <textarea
                  className="input-luxury text-xs"
                  rows={2}
                  placeholder="گەڕەکی دڵخواز، تایبەتمەندییەکان..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 rounded-xl border border-royal-700 py-2.5 text-xs font-semibold text-royal-300 hover:text-white"
                >
                  پاشگەزبوونەوە
                </button>
                <button type="submit" className="w-1/2 btn-gold text-xs py-2.5">
                  تۆمارکردن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: FAST ADD CONTACT (NAME & PHONE ONLY) */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-royal-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-gold-500/30 bg-gradient-to-b from-royal-900 to-royal-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-royal-800 pb-3">
              <div className="flex items-center gap-2">
                <BookUser className="h-5 w-5 text-gold-400" />
                <h3 className="font-display text-base font-bold text-white">تۆمارکردنی خێرای کۆنتاکت</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddContactModal(false)}
                className="text-royal-400 hover:text-white text-lg"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-royal-300">
              تەنها ناو و ژمارەی مۆبایل تۆمار بکە. دواتر لە کاتی داواکاری یان دانانی موڵک بە ئاسانی هەڵیبژێرە.
            </p>

            <form onSubmit={handleSaveContact} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-royal-200">
                  ناوی کۆنتاکت <span className="text-red-400">*</span>
                </label>
                <input
                  className="input-luxury text-xs"
                  placeholder="ناوی چواری موشتەری"
                  value={contactForm.customerName}
                  onChange={(e) => setContactForm({ ...contactForm, customerName: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-royal-200">
                  ژمارەی مۆبایل <span className="text-red-400">*</span>
                </label>
                <input
                  className="input-luxury text-xs dir-ltr"
                  placeholder="0770xxxxxxx"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="w-1/2 rounded-xl border border-royal-700 py-2.5 text-xs font-semibold text-royal-300 hover:text-white"
                >
                  پاشگەزبوونەوە
                </button>
                <button type="submit" className="w-1/2 btn-gold text-xs py-2.5 font-bold">
                  تۆمارکردنی کۆنتاکت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: WHATSAPP AUTOMATED MESSAGING & STAFF NOTIFICATION */}
      {activeMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-royal-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-royal-700 bg-gradient-to-b from-royal-900 to-royal-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-royal-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-400" />
                <h3 className="font-display text-base font-bold text-white">
                  ناردنی نامەی واتسئاپ بۆ: {activeMessageModal.entry.customerName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveMessageModal(null)}
                className="text-royal-400 hover:text-white text-lg"
              >
                ×
              </button>
            </div>

            {/* Quick Template Switcher Buttons */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-royal-400 block">شێوازی نامە (Template):</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const text = generateMessage(activeMessageModal.entry, 'seller_checkin');
                    setCustomMsgText(text);
                  }}
                  className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-2.5 py-1 text-[11px] font-semibold text-purple-300 hover:bg-purple-500/20"
                >
                  پرسیارکردنی دۆخی موڵک (بۆ فرۆشیار)
                </button>

                {activeMessageModal.property && (
                  <button
                    type="button"
                    onClick={() => {
                      const text = generateMessage(activeMessageModal.entry, 'buyer_match', activeMessageModal.property);
                      setCustomMsgText(text);
                    }}
                    className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-300 hover:bg-blue-500/20"
                  >
                    ناردنی موڵکی هاوشێوە #{activeMessageModal.property.code}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const text = generateMessage(activeMessageModal.entry, 'custom');
                    setCustomMsgText(text);
                  }}
                  className="rounded-lg border border-royal-700 bg-royal-900 px-2.5 py-1 text-[11px] font-semibold text-royal-200 hover:text-white"
                >
                  سڵاو و بەدواداچوونی گشتی
                </button>
              </div>
            </div>

            {/* Editable Message Box */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-royal-200">دەقی نامەکە (دەتوانیت دەستکاری بکەیت):</label>
              <textarea
                rows={5}
                value={customMsgText}
                onChange={(e) => setCustomMsgText(e.target.value)}
                className="w-full rounded-2xl border border-royal-700 bg-royal-950 p-3 text-xs text-white leading-relaxed focus:border-gold-400 focus:outline-none"
              />
            </div>

            {/* Send Actions */}
            <div className="space-y-2 pt-2 border-t border-royal-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMessageModal(null)}
                  className="w-1/3 rounded-xl border border-royal-700 py-2.5 text-xs font-semibold text-royal-300 hover:text-white"
                >
                  داخستن
                </button>

                {/* Direct WhatsApp Send */}
                <button
                  type="button"
                  onClick={() => {
                    openWhatsApp(activeMessageModal.entry.phone, customMsgText);
                    setActiveMessageModal(null);
                  }}
                  className="w-2/3 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:brightness-105 active:scale-95"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>ناردن بۆ کڕیار لە واتسئاپ</span>
                </button>
              </div>

              {/* Notify Staff Action */}
              <button
                type="button"
                onClick={() => {
                  const staffPhone = agency?.whatsapp || agency?.phonePrimary || '+9647700000000';
                  const staffMsg = generateMessage(
                    activeMessageModal.entry,
                    'staff_notify',
                    activeMessageModal.property
                  );
                  openWhatsApp(staffPhone, staffMsg);
                  setActiveMessageModal(null);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-gold-500/30 bg-gold-500/10 py-2.5 text-xs font-semibold text-gold-300 hover:bg-gold-500/20 active:scale-95 transition"
              >
                <BellRing className="h-4 w-4 text-gold-400" />
                <span>ئاگادارکردنەوەی ستافی نوسینگە لە واتسئاپ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
