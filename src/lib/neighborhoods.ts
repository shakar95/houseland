/** Major neighborhoods, residential areas & main streets — Sulaymaniyah */
export const SULAYMANIYAH_NEIGHBORHOODS = [
  'Sarchinar',
  'Bakrajo',
  'Raparin',
  'Tuwi Malik',
  'Qrga',
  'Goyzha',
  'Kaziwa',
  'Zargata',
  'Malik Mahmood Ring Road',
  'Dream City',
  'Ashti City',
  'Lebanese Village',
  'Azadi',
  'Baxtyari',
  'Chwar Chra',
  'Dania City',
  'Goizha',
  'Halabja Street Area',
  'Kanipanka',
  'Kirkuk Road Area',
  'Koya Road Area',
  'Mawlawi',
  'Naznaz',
  'Pirka',
  'Qularaisi',
  'Rizgary',
  'Said Sadiq Road Area',
  'Salim Street',
  'Shahrizor',
  'Shorsh',
  'Tanjaro',
  'Tasluja',
  'Xabat',
  'Zanko',
  'Zargata Hill',
  'City Center',
  'Industrial Zone',
] as const;

export type Neighborhood = (typeof SULAYMANIYAH_NEIGHBORHOODS)[number];

/** Approximate zone centers for public map obfuscation */
export const NEIGHBORHOOD_COORDS: Record<string, [number, number]> = {
  Sarchinar: [35.583, 45.432],
  Bakrajo: [35.561, 45.418],
  Raparin: [35.555, 45.44],
  'Tuwi Malik': [35.57, 45.425],
  Qrga: [35.548, 45.435],
  Goyzha: [35.552, 45.448],
  Kaziwa: [35.565, 45.455],
  Zargata: [35.578, 45.445],
  'Malik Mahmood Ring Road': [35.56, 45.43],
  'Dream City': [35.545, 45.42],
  'Ashti City': [35.538, 45.415],
  'Lebanese Village': [35.535, 45.428],
  default: [35.556, 45.432],
};

export function getZoneCenter(neighborhood: string): [number, number] {
  return NEIGHBORHOOD_COORDS[neighborhood] ?? NEIGHBORHOOD_COORDS.default;
}
