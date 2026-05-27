import { PrismaClient, PropertyStatus, PropertyType, TransactionType, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.agencySettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Houseland',
      phonePrimary: '+964 770 123 4567',
      phoneSecondary: '+964 750 987 6543',
      whatsapp: '+9647701234567',
      address: 'Sulaymaniyah, Kurdistan Region, Iraq — Malik Mahmood Ring Road',
      email: 'info@houseland.iq',
    },
  });

  const admin = await prisma.profile.upsert({
    where: { email: 'admin@houseland.iq' },
    update: { role: UserRole.ADMIN },
    create: {
      email: 'admin@houseland.iq',
      fullName: 'Houseland Admin',
      role: UserRole.ADMIN,
    },
  });

  const samples = [
    {
      code: 'SULI-001',
      title: 'Luxury Villa in Sarchinar',
      description: 'Spacious villa with garden, modern finishes, and panoramic mountain views.',
      propertyType: PropertyType.VILLA,
      transactionType: TransactionType.FOR_SALE,
      areaSqm: 450,
      dimensions: '20x22m',
      price: 285000,
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
      title: 'Modern Apartment — Bakrajo',
      description: 'Brand-new apartment near main road, elevator, parking.',
      propertyType: PropertyType.APARTMENT,
      transactionType: TransactionType.FOR_RENT,
      areaSqm: 120,
      price: 650,
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
      title: 'Commercial Space — Raparin',
      description: 'Prime commercial unit on busy street, ideal for retail.',
      propertyType: PropertyType.COMMERCIAL,
      transactionType: TransactionType.FOR_SALE,
      areaSqm: 200,
      price: 175000,
      neighborhood: 'Raparin',
      latitude: 35.555,
      longitude: 45.44,
      images: ['https://images.unsplash.com/photo-1486406146925-ccea4e2f0d3a?w=800'],
      status: PropertyStatus.APPROVED,
    },
  ];

  for (const s of samples) {
    const prop = await prisma.property.upsert({
      where: { code: s.code },
      update: {},
      create: { ...s, submitterId: admin.id },
    });
    await prisma.analytics.upsert({
      where: { propertyId: prop.id },
      update: {},
      create: { propertyId: prop.id, viewsCount: Math.floor(Math.random() * 200) + 20 },
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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
