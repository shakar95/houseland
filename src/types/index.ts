export interface AgencySettings {
  id: string;
  name: string;
  logoUrl?: string | null;
  phonePrimary: string;
  phoneSecondary?: string | null;
  whatsapp: string;
  address: string;
  email?: string | null;
}

export interface Property {
  id: string;
  code: string;
  title: string;
  description?: string;
  propertyType: string;
  transactionType: string;
  areaSqm: number;
  dimensions?: string | null;
  frontageMeters?: number | null;
  streetWidth?: number | null;
  streetWidth2?: number | null;
  isCorner?: boolean;
  nearestLandmark?: string | null;
  price: number;
  currency: string;
  floors?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  facing?: string | null;
  latitude?: number;
  longitude?: number;
  neighborhood: string;
  images: string[];
  imageCount?: number;
  videoLink?: string | null;
  status: string;
  analytics?: Analytics;
}

export interface Analytics {
  viewsCount: number;
  phoneClicks: number;
  whatsappClicks: number;
  saleContractsCount: number;
  rentContractsCount: number;
  property?: { code: string; title: string; status: string };
}

export interface Staff {
  id: string;
  name: string;
  photoUrl?: string | null;
  position: string;
  phoneNumber: string;
  bio?: string | null;
}

export interface CrmEntry {
  id: string;
  customerName: string;
  phone: string;
  email?: string | null;
  propertyInterests: string[];
  notes?: string | null;
  budget?: number | null;
  budgetCurrency?: string | null;
  status: string;
}

export interface Contract {
  id: string;
  propertyId: string;
  clientName: string;
  amount: number;
  date: string;
  contractType: string;
  documentUrl?: string | null;
  property?: Property;
}

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'STAFF' | 'CLIENT';
}

export interface PropertyFilters {
  code?: string;
  minArea?: string;
  maxArea?: string;
  minPrice?: string;
  maxPrice?: string;
  neighborhood?: string;
  floor?: string;
  propertyType?: string;
  transactionType?: string;
}

export interface Neighborhood {
  id: string;
  name: string;
  nameEn?: string | null;
  nameKu?: string | null;
  nameAr?: string | null;
  latitude: number;
  longitude: number;
  aliases: string[];
  createdAt: string;
  propertyCount?: number;
}
