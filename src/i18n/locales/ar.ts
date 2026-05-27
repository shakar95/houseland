import type { TranslationDict } from '../types';

const ar: TranslationDict = {
  lang: { ku: 'كوردي', ar: 'عربي', en: 'English' },
  nav: {
    home: 'الرئيسية',
    listings: 'العقارات',
    submit: 'إضافة عقار',
    about: 'من نحن',
    dashboard: 'لوحة التحكم',
  },
  auth: { signIn: 'تسجيل الدخول', signOut: 'تسجيل الخروج' },
  hero: {
    tag: 'السليمانية · كردستان',
    title: 'اكتشف منزلك',
    titleHighlight: 'القادم',
    subtitle:
      'هاوسلاند شريكك الموثوق في العقارات الفاخرة — فلل وشقق وعقارات تجارية في السليمانية.',
    browse: 'تصفح العقارات',
    listProperty: 'أضف عقارك',
  },
  features: {
    premium: { title: 'قوائم مميزة', desc: 'عقارات مراجعة وصور احترافية.' },
    privacy: { title: 'خصوصية محمية', desc: 'الموقع التفصيلي مخفي؛ تواصل الوكالة فقط.' },
    local: { title: 'خبرة محلية', desc: 'معرفة عميقة بكل أحياء السليمانية.' },
  },
  home: { featured: 'عقارات مميزة', viewAll: 'عرض الكل' },
  listings: {
    title: 'قائمة العقارات',
    subtitle: 'تصفية حسب الرمز، المساحة، السعر، الحي والمزيد.',
    loading: 'جاري التحميل...',
    empty: 'لا توجد عقارات مطابقة.',
  },
  filters: {
    code: 'رمز العقار',
    neighborhood: 'الحي',
    type: 'نوع العقار',
    transaction: 'نوع المعاملة',
    minArea: 'أقل مساحة (م²)',
    maxArea: 'أكبر مساحة (م²)',
    minPrice: 'أقل سعر',
    maxPrice: 'أكبر سعر',
    floor: 'الطابق',
    allAreas: 'كل الأحياء',
    allTypes: 'كل الأنواع',
    saleRent: 'بيع وإيجار',
  },
  about: {
    title: 'عن هاوسلاند',
    intro:
      'هاوسلاند وكالة عقارية رائدة في السليمانية — من المنازل العائلية في سرجنار إلى الوحدات التجارية في رابرين.',
    team: 'فريقنا',
  },
  footer: {
    tagline: 'وكالة عقارات فاخرة في السليمانية وإقليم كردستان.',
    whatsapp: 'واتساب',
    rights: 'جميع الحقوق محفوظة.',
  },
  property: {
    call: 'اتصل بالوكالة',
    whatsapp: 'واتساب',
    loading: 'جاري التحميل...',
    area: 'المنطقة التقريبية',
    location: 'الموقع (تقريبي)',
    video: 'جولة فيديو',
    privacyNote: 'تواصل الوكالة فقط — معلومات المُرسل محمية.',
  },
  enums: {
    FOR_SALE: 'للبيع',
    FOR_RENT: 'للإيجار',
    HOUSE: 'منزل',
    APARTMENT: 'شقة',
    VILLA: 'فيلا',
    LAND: 'أرض',
    COMMERCIAL: 'تجاري',
    PENDING: 'قيد المراجعة',
    APPROVED: 'موافق عليه',
    REJECTED: 'مرفوض',
    SOLD: 'مباع',
    RENTED: 'مؤجر',
  },
  submit: {
    signInTitle: 'سجّل الدخول للإضافة',
    signInDesc: 'استخدم Google لتسجيل عقارك للمراجعة.',
    continueGoogle: 'المتابعة مع Google',
  },
  dashboard: {
    title: 'لوحة التحكم',
    analytics: 'التحليلات',
    properties: 'العقارات',
    crm: 'CRM',
    staff: 'الموظفون',
    settings: 'الإعدادات',
  },
  common: { loading: 'جاري التحميل...', sulaymaniyah: 'السليمانية · العراق' },
};

export default ar;
