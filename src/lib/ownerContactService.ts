import { api } from './api';
import type { CrmEntry } from '@/types';

export interface OwnerContactData {
  id?: string;
  customerName: string;
  phone: string;
  contactId?: string;
  notes?: string;
}

const STORAGE_PREFIX = 'houseland_owner_';

/**
 * Retrieve owner contact for a property code.
 * Checks CRM entries, local storage cache, and property owner API.
 */
export async function getOwnerContact(code: string): Promise<OwnerContactData | null> {
  if (!code) return null;

  // 1. Check CRM API first (already active on Render & local DB)
  try {
    const crmList = await api.get<CrmEntry[]>('/api/crm', { auth: true });
    const tag = `OWNER_OF:${code}`;
    const matched = crmList?.find((c) =>
      c.propertyInterests?.some((t) => t === tag || t.toUpperCase() === tag.toUpperCase())
    );
    if (matched) {
      const data: OwnerContactData = {
        id: matched.id,
        contactId: matched.id,
        customerName: matched.customerName,
        phone: matched.phone,
        notes: matched.notes || undefined,
      };
      try {
        localStorage.setItem(STORAGE_PREFIX + code, JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch {
    // If not authenticated or CRM request fails, fallback below
  }

  // 2. Try direct owner endpoint
  try {
    const res = await api.get<{ owner: any }>(`/api/properties/${code}/owner`, { auth: true });
    if (res?.owner) {
      const data: OwnerContactData = {
        id: res.owner.id,
        contactId: res.owner.id,
        customerName: res.owner.customerName,
        phone: res.owner.phone,
        notes: res.owner.notes || undefined,
      };
      try {
        localStorage.setItem(STORAGE_PREFIX + code, JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch {}

  // 3. Fallback to localStorage cache
  try {
    const cached = localStorage.getItem(STORAGE_PREFIX + code);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  return null;
}

/**
 * Save or detach owner contact for a property code.
 * Syncs with CRM, localStorage, and backend.
 */
export async function saveOwnerContact(
  code: string,
  owner: OwnerContactData | null
): Promise<OwnerContactData | null> {
  if (!code) return null;

  const ownerTag = `OWNER_OF:${code}`;

  // If detached/cleared:
  if (!owner || !owner.customerName?.trim() || !owner.phone?.trim()) {
    try {
      localStorage.removeItem(STORAGE_PREFIX + code);
    } catch {}

    // Remove OWNER_OF tag from any CRM entries
    try {
      const crmList = await api.get<CrmEntry[]>('/api/crm', { auth: true });
      for (const item of crmList || []) {
        if (item.propertyInterests?.includes(ownerTag)) {
          const updatedTags = item.propertyInterests.filter((t) => t !== ownerTag);
          await api.patch(`/api/crm/${item.id}`, { propertyInterests: updatedTags });
        }
      }
    } catch {}

    try {
      await api.post(`/api/properties/${code}/owner`, null);
    } catch {}

    return null;
  }

  const customerName = owner.customerName.trim();
  const phone = owner.phone.trim();
  const savedData: OwnerContactData = {
    customerName,
    phone,
    notes: owner.notes || `خاوەنی موڵکی #${code}`,
  };

  // 1. Immediately cache in localStorage for 0-latency UI updates
  try {
    localStorage.setItem(STORAGE_PREFIX + code, JSON.stringify(savedData));
  } catch {}

  // 2. Sync to CRM
  try {
    const crmList = await api.get<CrmEntry[]>('/api/crm', { auth: true });

    // Clean up any other previous owner tagged for this property
    for (const item of crmList || []) {
      if (item.propertyInterests?.includes(ownerTag) && item.id !== owner.contactId && item.phone !== phone) {
        const updatedTags = item.propertyInterests.filter((t) => t !== ownerTag);
        await api.patch(`/api/crm/${item.id}`, { propertyInterests: updatedTags });
      }
    }

    if (owner.contactId) {
      const existing = crmList?.find((c) => c.id === owner.contactId);
      if (existing) {
        const tags = Array.from(new Set([...(existing.propertyInterests || []), 'ROLE:SELLER', ownerTag]));
        const updated = await api.patch<CrmEntry>(`/api/crm/${owner.contactId}`, {
          customerName,
          phone,
          propertyInterests: tags,
        });
        savedData.id = updated.id;
        savedData.contactId = updated.id;
      }
    } else {
      const existing = crmList?.find((c) => c.phone.trim() === phone);
      if (existing) {
        const tags = Array.from(new Set([...(existing.propertyInterests || []), 'ROLE:SELLER', ownerTag]));
        const updated = await api.patch<CrmEntry>(`/api/crm/${existing.id}`, {
          customerName,
          propertyInterests: tags,
        });
        savedData.id = updated.id;
        savedData.contactId = updated.id;
      } else {
        const created = await api.post<CrmEntry>('/api/crm', {
          customerName,
          phone,
          propertyInterests: ['ROLE:SELLER', ownerTag],
          notes: owner.notes || `خاوەنی موڵکی #${code}`,
          status: 'LEAD',
        });
        savedData.id = created.id;
        savedData.contactId = created.id;
      }
    }
  } catch (err) {
    console.warn('[OwnerService] CRM sync error:', err);
  }

  // 3. Sync to direct backend endpoint if available
  try {
    await api.post(`/api/properties/${code}/owner`, {
      customerName,
      phone,
      contactId: savedData.contactId,
      notes: savedData.notes,
    });
  } catch {}

  // Re-save with final IDs
  try {
    localStorage.setItem(STORAGE_PREFIX + code, JSON.stringify(savedData));
  } catch {}

  return savedData;
}
