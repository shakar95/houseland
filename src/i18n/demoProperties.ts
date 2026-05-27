import type { Lang } from './types';

export type DemoPropertyText = { title: Record<Lang, string>; description: Record<Lang, string> };

export const DEMO_PROPERTIES: Record<string, DemoPropertyText> = {
  'SULI-001': {
    title: {
      ku: 'ڤێلای لوکس لە سەرچنار',
      ar: 'فيلا فاخرة في سرجنار',
      en: 'Luxury Villa in Sarchinar',
    },
    description: {
      ku: 'ڤێلای فراوان لەگەڵ باخچە و دیزاینی مۆدێرن و دیمەنی چیایان.',
      ar: 'فيلا واسعة مع حديقة وتشطيبات حديثة وإطلالة جبلية.',
      en: 'Spacious villa with garden, modern finishes, and panoramic mountain views.',
    },
  },
  'SULI-002': {
    title: {
      ku: 'شوقەی مۆدێرن — بەکرەجو',
      ar: 'شقة عصرية — بكرجو',
      en: 'Modern Apartment — Bakrajo',
    },
    description: {
      ku: 'شوقەی نوێ نزیک شەقامی سەرەکی، ئاسانسۆر و پارکینگ.',
      ar: 'شقة جديدة قرب الطريق الرئيسي، مصعد وموقف.',
      en: 'Brand-new apartment near main road, elevator, parking.',
    },
  },
  'SULI-003': {
    title: {
      ku: 'شوێنی بازرگانی — ڕاپەڕین',
      ar: 'مساحة تجارية — رابرين',
      en: 'Commercial Space — Raparin',
    },
    description: {
      ku: 'یەکەی بازرگانی لە شەقامی قەرەباڵغ، گونجاو بۆ فرۆشتن.',
      ar: 'وحدة تجارية على شارع مزدحم، مثالية للتجزئة.',
      en: 'Prime commercial unit on busy street, ideal for retail.',
    },
  },
  'SULI-004': {
    title: {
      ku: 'خانووی خێزانی — کازیوا',
      ar: 'منزل عائلي — كازيوا',
      en: 'Family House — Kaziwa',
    },
    description: {
      ku: 'خانووی ٤ ژوورە لە ناوچەیەکی ئارام و نزیک قوتابخانە.',
      ar: 'منزل ٤ غرف في حي هادئ قرب المدارس.',
      en: '4-bedroom house in quiet area, close to schools.',
    },
  },
  'SULI-005': {
    title: {
      ku: 'زەوی دروستکردن — تانجارۆ',
      ar: 'أرض للبناء — تنجرو',
      en: 'Building Land — Tanjaro',
    },
    description: {
      ku: 'زەوی ٦٠٠ م² لەگەڵ بەلگەی ڕوونکردنەوە و ڕێگای ئاسفالت.',
      ar: 'أرض ٦٠٠ م² مع أوراق نظامية وطريق معبّد.',
      en: '600 m² plot with clear title and paved road access.',
    },
  },
  'SULI-006': {
    title: {
      ku: 'پێنتهاوس — ئاشتی سیتی',
      ar: 'بنتهاوس — آشتي سيتي',
      en: 'Penthouse — Ashti City',
    },
    description: {
      ku: 'پێنتهاوسی سەرەوە لەگەڵ تەراس و دیمەنی شار.',
      ar: 'بنتهاوس علوي مع تراس وإطلالة على المدينة.',
      en: 'Top-floor penthouse with terrace and city views.',
    },
  },
  'SULI-007': {
    title: {
      ku: 'شوقەی کرێ — گۆیژە',
      ar: 'شقة للإيجار — جويزها',
      en: 'Rental Apartment — Goyzha',
    },
    description: {
      ku: 'شوقەی ٣ ژوورە کرێی مانگانە، کەل و پەل تەواو.',
      ar: 'شقة ٣ غرف إيجار شهري، مفروشة بالكامل.',
      en: '3-bedroom monthly rental, fully furnished.',
    },
  },
  'SULI-008': {
    title: {
      ku: 'ڤێلای باخدار — زەرگەتە',
      ar: 'فيلا بحديقة — زركتا',
      en: 'Garden Villa — Zargata',
    },
    description: {
      ku: 'ڤێلای کلاسیک لەگەڵ باخچەی گەورە و کۆشکی مێوان.',
      ar: 'فيلا كلاسيكية مع حديقة كبيرة ومجلس ضيافة.',
      en: 'Classic villa with large garden and guest majlis.',
    },
  },
};
