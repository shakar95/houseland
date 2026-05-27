import { useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { Property, AgencySettings } from '@/types';
import { formatPrice, labelEnum } from '@/lib/format';

interface Props {
  property: Property;
  agency: AgencySettings | null;
}

export function PropertyFlyer({ property, agency }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const printPdf = async () => {
    if (!ref.current) return;
    const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true });
    const img = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(img, 'PNG', 0, 0, w, Math.min(h, 297));
    pdf.save(`${property.code}-flyer.pdf`);
  };

  return (
    <div>
      <button type="button" onClick={printPdf} className="btn-gold">
        Create / Print Listing (PDF)
      </button>
      <div className="sr-only" aria-hidden>
        <div
          ref={ref}
          className="w-[210mm] bg-white p-8 text-royal-900"
          style={{ position: 'fixed', left: '-9999px', top: 0 }}
        >
          <div className="flex items-center justify-between border-b-2 border-[#1e3270] pb-4">
            <div>
              <h1 className="text-3xl font-bold text-[#1e3270]">{agency?.name ?? 'Houseland'}</h1>
              <p className="text-sm text-gray-600">{agency?.address}</p>
            </div>
            <p className="text-xl font-bold text-[#d4a017]">{property.code}</p>
          </div>
          {property.images[0] && (
            <img src={property.images[0]} alt="" className="mt-4 h-48 w-full object-cover rounded" />
          )}
          <h2 className="mt-4 text-2xl font-bold">{property.title}</h2>
          <p className="text-lg text-[#d4a017]">{formatPrice(property.price, property.currency)}</p>
          <p className="text-sm">{labelEnum(property.transactionType)} · {property.neighborhood}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <span>Type: {labelEnum(property.propertyType)}</span>
            <span>Area: {property.areaSqm} m²</span>
            {property.bedrooms != null && <span>Bedrooms: {property.bedrooms}</span>}
            {property.bathrooms != null && <span>Bathrooms: {property.bathrooms}</span>}
            {property.floors != null && <span>Floors: {property.floors}</span>}
            {property.facing && <span>Facing: {labelEnum(property.facing)}</span>}
          </div>
          <p className="mt-4 text-sm leading-relaxed">{property.description}</p>
          <div className="mt-6 border-t pt-4 text-sm">
            <p className="font-semibold">Contact Houseland</p>
            <p>{agency?.phonePrimary}</p>
            <p>WhatsApp: {agency?.whatsapp}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
