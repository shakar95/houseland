import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, UserCheck, ShieldCheck, X, Phone, UserPlus, User } from 'lucide-react';
import { api } from '@/lib/api';
import type { CrmEntry } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

export interface OwnerContactData {
  customerName: string;
  phone: string;
  contactId?: string;
  notes?: string;
}

interface Props {
  value: OwnerContactData | null;
  onChange: (val: OwnerContactData | null) => void;
  className?: string;
}

export function OwnerContactPicker({ value, onChange, className = '' }: Props) {
  const { lang } = useLanguage();
  const [contacts, setContacts] = useState<CrmEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get<CrmEntry[]>('/api/crm', { auth: true })
      .then((data) => {
        setContacts(data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter unique contacts by name or phone
  const uniqueContacts = useMemo(() => {
    const map = new Map<string, { id: string; name: string; phone: string }>();
    for (const c of contacts) {
      if (!c.customerName || !c.phone) continue;
      const key = c.phone.trim();
      if (!map.has(key)) {
        map.set(key, {
          id: c.id,
          name: c.customerName.trim(),
          phone: c.phone.trim(),
        });
      }
    }
    return Array.from(map.values());
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return uniqueContacts.slice(0, 8);
    return uniqueContacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [uniqueContacts, search]);

  const handleSelect = (c: { id: string; name: string; phone: string }) => {
    onChange({
      customerName: c.name,
      phone: c.phone,
      contactId: c.id,
    });
    setIsDropdownOpen(false);
    setSearch('');
    setManualMode(false);
  };

  const handleApplyManual = () => {
    if (!manualName.trim() || !manualPhone.trim()) return;
    onChange({
      customerName: manualName.trim(),
      phone: manualPhone.trim(),
    });
    setManualMode(false);
  };

  const handleClear = () => {
    onChange(null);
    setManualName('');
    setManualPhone('');
    setManualMode(false);
  };

  return (
    <div className={`rounded-3xl border border-gold-500/30 bg-gradient-to-br from-royal-950 via-royal-900/60 to-gold-950/20 p-4 sm:p-5 shadow-lg backdrop-blur-md ${className}`}>
      {/* Header with Admin Privacy Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-royal-800/80">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-400">
            <User className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {lang === 'ar' ? 'جهة اتصال مالك العقار' : lang === 'en' ? 'Property Owner Contact' : 'کۆنتاکتی خاوەن موڵک'}
            </h3>
            <p className="text-[11px] text-royal-400">
              {lang === 'ar'
                ? 'ربط المالك من سجل جهات الاتصال أو إدخال جديد'
                : lang === 'en'
                ? 'Attach owner from CRM contacts or enter new'
                : 'ئەتاچ کردنی خاوەنەکە لە لیستی کۆنتاکتەکان یان تۆماری نوێ'}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>{lang === 'ar' ? 'خاص بالإدارة فقط' : lang === 'en' ? 'Admin / Staff Only' : 'تەنها بۆ ئەدمین و ستاف'}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-4 space-y-3">
        {value ? (
          /* Attached Contact Card */
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-gold-500/40 bg-gold-500/10 p-3.5 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-royal-950 font-bold shadow">
                <UserCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white truncate text-sm">{value.customerName}</span>
                  <span className="rounded-md bg-gold-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-gold-300">
                    {lang === 'ar' ? 'المالك المربوط' : lang === 'en' ? 'Attached Owner' : 'خاوەنی دیاریکراو'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-royal-300 mt-0.5 dir-ltr">
                  <Phone className="h-3 w-3 text-gold-400 shrink-0" />
                  <span className="font-mono text-xs">{value.phone}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-950/40 text-red-400 hover:bg-red-900/60 hover:text-red-200 transition"
              title={lang === 'ar' ? 'إزالة الربط' : lang === 'en' ? 'Detach Owner' : 'لادانی پەیوەستکراو'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : !manualMode ? (
          /* Searchable Contact Picker */
          <div className="space-y-2">
            <div ref={dropdownRef} className="relative">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-royal-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder={
                      lang === 'ar'
                        ? 'ابحث بالاسم أو رقم الهاتف لاختيار المالك...'
                        : lang === 'en'
                        ? 'Search name or phone to pick owner...'
                        : 'گەڕان بەپێی ناو یان تەلەفۆن بۆ هەڵبژاردنی خاوەن...'
                    }
                    className="w-full rounded-xl border border-royal-700/80 bg-royal-950/80 py-2.5 ps-9 pe-3 text-xs text-white placeholder:text-royal-500 focus:border-gold-400 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setManualMode(true);
                    setIsDropdownOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-royal-700 bg-royal-900/80 px-3 py-2.5 text-xs font-semibold text-royal-200 hover:border-gold-500/50 hover:text-gold-300 transition shrink-0"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{lang === 'ar' ? 'إدخال يدوي' : lang === 'en' ? 'New Contact' : 'کۆنتاکتی نوێ'}</span>
                </button>
              </div>

              {/* Autocomplete Dropdown */}
              {isDropdownOpen && (
                <div className="absolute z-20 mt-1.5 w-full rounded-2xl border border-royal-700 bg-royal-950 p-2 shadow-2xl space-y-1 max-h-60 overflow-y-auto">
                  {loading ? (
                    <p className="p-3 text-center text-xs text-royal-400">
                      {lang === 'ar' ? 'جارٍ تحميل جهات الاتصال...' : lang === 'en' ? 'Loading contacts...' : 'بارکردنی کۆنتاکتەکان...'}
                    </p>
                  ) : filteredContacts.length === 0 ? (
                    <div className="p-3 text-center space-y-2">
                      <p className="text-xs text-royal-400">
                        {lang === 'ar' ? 'لم يتم العثور على جهة اتصال' : lang === 'en' ? 'No contact found' : 'هیچ کۆنتاکتێک نەدۆزرایەوە'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setManualMode(true);
                          setIsDropdownOpen(false);
                          if (search.trim()) setManualName(search.trim());
                        }}
                        className="inline-flex items-center gap-1 text-xs text-gold-400 hover:underline"
                      >
                        <UserPlus className="h-3 w-3" />
                        <span>{lang === 'ar' ? 'إضافة هذا الاسم كجهة اتصال جديدة' : lang === 'en' ? 'Add as new contact' : 'زیادکردن وەک کۆنتاکتی نوێ'}</span>
                      </button>
                    </div>
                  ) : (
                    filteredContacts.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelect(c)}
                        className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs text-start hover:bg-royal-900 transition group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-royal-800 text-gold-400 font-bold text-[11px] group-hover:bg-gold-500 group-hover:text-royal-950">
                            {c.name.slice(0, 1)}
                          </div>
                          <div>
                            <span className="font-semibold text-white block">{c.name}</span>
                            <span className="text-[10px] text-royal-400 font-mono dir-ltr block">{c.phone}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-gold-400/80 group-hover:text-gold-300">
                          {lang === 'ar' ? 'اختر' : lang === 'en' ? 'Select' : 'هەڵبژاردن'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Manual Quick-Entry Form */
          <div className="rounded-2xl border border-royal-700/80 bg-royal-950/60 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gold-300">
                {lang === 'ar' ? 'إدخال بيانات المالك مباشرة:' : lang === 'en' ? 'Enter Owner Details Directly:' : 'تۆمارکردنی خێرای خاوەن موڵک:'}
              </span>
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className="text-[11px] text-royal-400 hover:text-white"
              >
                {lang === 'ar' ? 'رجوع للبحث' : lang === 'en' ? 'Back to search' : 'گەڕانەوە بۆ لیستی گەڕان'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-royal-300">
                  {lang === 'ar' ? 'اسم المالك' : lang === 'en' ? 'Owner Name' : 'ناوی خاوەن موڵک'} *
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="ناوی چواری خاوەن موڵک"
                  className="w-full rounded-xl border border-royal-700 bg-royal-900/80 px-3 py-2 text-xs text-white placeholder:text-royal-500 focus:border-gold-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-royal-300">
                  {lang === 'ar' ? 'رقم الهاتف' : lang === 'en' ? 'Phone Number' : 'ژمارەی مۆبایل'} *
                </label>
                <input
                  type="text"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="0770xxxxxxx"
                  className="w-full rounded-xl border border-royal-700 bg-royal-900/80 px-3 py-2 text-xs text-white placeholder:text-royal-500 focus:border-gold-400 focus:outline-none dir-ltr"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className="rounded-xl border border-royal-700 px-3 py-1.5 text-xs text-royal-300 hover:text-white"
              >
                {lang === 'ar' ? 'إلغاء' : lang === 'en' ? 'Cancel' : 'پاشگەزبوونەوە'}
              </button>
              <button
                type="button"
                onClick={handleApplyManual}
                disabled={!manualName.trim() || !manualPhone.trim()}
                className="btn-gold text-xs px-4 py-1.5 disabled:opacity-50"
              >
                {lang === 'ar' ? 'تأكيد وربط المالك' : lang === 'en' ? 'Attach Owner' : 'ئەتاچ کردنی خاوەن'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
