import {
  Currency,
  PrismaClient,
  PropertyStatus,
  PropertyType,
  TransactionType,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.agencySettings.upsert({
    where: { id: 'default' },
    update: { name: 'Houseland Real Estate' },
    create: {
      id: 'default',
      name: 'Houseland Real Estate',
      phonePrimary: '+964 770 123 4567',
      phoneSecondary: '+964 750 987 6543',
      whatsapp: '+9647701234567',
      address: 'Sulaymaniyah, Kurdistan Region, Iraq — Malik Mahmood Ring Road',
      email: 'info@houseland.iq',
    },
  });

  const admin = await prisma.profile.upsert({
    where: { email: 'admin@houseland.iq' },
    update: { role: UserRole.ADMIN, fullName: 'بەڕێوەبەری هاوسلاند' },
    create: {
      email: 'admin@houseland.iq',
      fullName: 'بەڕێوەبەری هاوسلاند',
      role: UserRole.ADMIN,
    },
  });

  const client = await prisma.profile.upsert({
    where: { email: 'client@houseland.iq' },
    update: { role: UserRole.CLIENT, fullName: 'بەکارهێنەری تاقیکردنەوە' },
    create: {
      email: 'client@houseland.iq',
      fullName: 'بەکارهێنەری تاقیکردنەوە',
      role: UserRole.CLIENT,
    },
  });

  const samples = [
    {
      code: 'SULI-001',
      title: 'ڤێلای لوکس لە سەرچنار',
      description: 'ڤێلای فراوان لەگەڵ باخچە و دیزاینی مۆدێرن و دیمەنی چیایان.',
      propertyType: PropertyType.VILLA,
      transactionType: TransactionType.FOR_SALE,
      areaSqm: 450,
      dimensions: '20x22m',
      price: 285000,
      currency: Currency.USD,
      floors: 2,
      bedrooms: 5,
      bathrooms: 4,
      neighborhood: 'Sarchinar',
      latitude: 35.583,
      longitude: 45.432,
      images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800'],
      status: PropertyStatus.APPROVED,
    },
    {
      code: 'SULI-002',
      title: 'شوقەی مۆدێرن — بەکرەجو',
      description: 'شوقەی نوێ نزیک شەقامی سەرەکی، ئاسانسۆر و پارکینگ.',
      propertyType: PropertyType.APARTMENT,
      transactionType: TransactionType.FOR_RENT,
      areaSqm: 120,
      price: 650,
      currency: Currency.USD,
      bedrooms: 2,
      bathrooms: 2,
      neighborhood: 'Bakrajo',
      latitude: 35.561,
      longitude: 45.418,
      images: ['https://images.unsplash.com/photo-1502672260266-1c1ef1d93788?w=800'],
      status: PropertyStatus.APPROVED,
    },
    {
      code: 'SULI-003',
      title: 'شوێنی بازرگانی — ڕاپەڕین',
      description: 'یەکەی بازرگانی لە شەقامی قەرەباڵغ، گونجاو بۆ فرۆشتن.',
      propertyType: PropertyType.COMMERCIAL,
      transactionType: TransactionType.FOR_SALE,
      areaSqm: 200,
      price: 175000,
      currency: Currency.USD,
      neighborhood: 'Raparin',
      latitude: 35.555,
      longitude: 45.44,
      images: ['https://images.unsplash.com/photo-1486406146925-ccea4e2f0d3a?w=800'],
      status: PropertyStatus.APPROVED,
    },
    {
      code: 'SULI-004',
      title: 'خانووی خێزانی — کازیوا',
      description: 'خانووی ٤ ژوورە لە ناوچەیەکی ئارام و نزیک قوتابخانە.',
      propertyType: PropertyType.HOUSE,
      transactionType: TransactionType.FOR_SALE,
      areaSqm: 280,
      price: 195000,
      currency: Currency.USD,
      bedrooms: 4,
      bathrooms: 3,
      neighborhood: 'Kaziwa',
      latitude: 35.565,
      longitude: 45.455,
      images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'],
      status: PropertyStatus.APPROVED,
    },
    {
      code: 'SULI-005',
      title: 'زەوی دروستکردن — تانجارۆ',
      description: 'زەوی ٦٠٠ م² لەگەڵ بەلگەی ڕوونکردنەوە و ڕێگای ئاسفالت.',
      propertyType: PropertyType.LAND,
      transactionType: TransactionType.FOR_SALE,
      areaSqm: 600,
      price: 120000,
      currency: Currency.USD,
      neighborhood: 'Tanjaro',
      latitude: 35.54,
      longitude: 45.41,
      images: ['https://images.unsplash.com/photo-1500382017468-904fcfed447c?w=800'],
      status: PropertyStatus.APPROVED,
    },
    {
      code: 'SULI-006',
      title: 'پێنتهاوس — ئاشتی سیتی',
      description: 'پێنتهاوسی سەرەوە لەگەڵ تەراس و دیمەنی شار.',
      propertyType: PropertyType.APARTMENT,
      transactionType: TransactionType.FOR_SALE,
      areaSqm: 185,
      price: 220000,
      currency: Currency.USD,
      bedrooms: 3,
      bathrooms: 2,
      floors: 12,
      neighborhood: 'Ashti City',
      latitude: 35.538,
      longitude: 45.415,
      images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'],
      status: PropertyStatus.APPROVED,
    },
    {
      code: 'SULI-007',
      title: 'شوقەی کرێ — گۆیژە',
      description: 'شوقەی ٣ ژوورە کرێی مانگانە، کەل و پەل تەواو.',
      propertyType: PropertyType.APARTMENT,
      transactionType: TransactionType.FOR_RENT,
      areaSqm: 145,
      price: 850,
      currency: Currency.USD,
      bedrooms: 3,
      bathrooms: 2,
      neighborhood: 'Goyzha',
      latitude: 35.552,
      longitude: 45.448,
      images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
      status: PropertyStatus.APPROVED,
    },
    {
      code: 'SULI-008',
      title: 'ڤێلای باخدار — زەرگەتە',
      description: 'ڤێلای کلاسیک لەگەڵ باخچەی گەورە و کۆشکی مێوان.',
      propertyType: PropertyType.VILLA,
      transactionType: TransactionType.FOR_SALE,
      areaSqm: 520,
      price: 310000,
      currency: Currency.USD,
      bedrooms: 6,
      bathrooms: 5,
      neighborhood: 'Zargata',
      latitude: 35.578,
      longitude: 45.445,
      images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'],
      status: PropertyStatus.APPROVED,
    },
    {
      code: 'SULI-009',
      title: 'موڵکی چاوەڕوان — نیشتمان',
      description: 'موڵکی تازە نێردراوە لەلایەن بەکارهێنەرەوە، بۆ پێداچوونەوە.',
      propertyType: PropertyType.HOUSE,
      transactionType: TransactionType.FOR_SALE,
      areaSqm: 200,
      price: 150000,
      currency: Currency.USD,
      bedrooms: 3,
      neighborhood: 'Azadi',
      latitude: 35.55,
      longitude: 45.43,
      images: ['https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800'],
      status: PropertyStatus.PENDING,
      submitterId: client.id,
    },
  ];

  for (const s of samples) {
    const { submitterId, ...data } = s;
    const ownerId = submitterId ?? admin.id;
    const prop = await prisma.property.upsert({
      where: { code: s.code },
      update: { ...data, submitterId: ownerId },
      create: { ...data, submitterId: ownerId },
    });
    await prisma.analytics.upsert({
      where: { propertyId: prop.id },
      update: {},
      create: {
        propertyId: prop.id,
        viewsCount: Math.floor(Math.random() * 200) + 20,
        phoneClicks: Math.floor(Math.random() * 30),
        whatsappClicks: Math.floor(Math.random() * 40),
      },
    });
  }

  await prisma.staff.upsert({
    where: { id: 'seed-staff-1' },
    update: {},
    create: {
      id: 'seed-staff-1',
      name: 'Rebaz Ahmed',
      position: 'Senior Agent',
      phoneNumber: '+964 770 111 2222',
      bio: 'Specialist in Sarchinar and Bakrajo residential sales.',
      photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200',
    },
  });

  console.log('Seed completed.');
  console.log('Demo users (link via Google sign-in with same email):');
  console.log('  ADMIN:  admin@houseland.iq');
  console.log('  CLIENT: client@houseland.iq');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
