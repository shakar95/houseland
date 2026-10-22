import { useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Phone,
  ImageIcon,
  UserCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Staff } from '@/types';

/* ─── Blank form shape ──────────────────────────────────────────────── */
const blankForm = {
  name: '',
  position: '',
  phoneNumber: '',
  bio: '',
  photoUrl: '',
};

/* ─── Inline-edit card ──────────────────────────────────────────────── */
function StaffCard({
  member,
  onSave,
  onDelete,
}: {
  member: Staff;
  onSave: (id: string, data: Partial<Staff>) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Staff>>({
    name: member.name,
    position: member.position,
    phoneNumber: member.phoneNumber,
    bio: member.bio ?? '',
    photoUrl: member.photoUrl ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(member.id, form);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      name: member.name,
      position: member.position,
      phoneNumber: member.phoneNumber,
      bio: member.bio ?? '',
      photoUrl: member.photoUrl ?? '',
    });
    setEditing(false);
    setConfirmDel(false);
  };

  const photo = editing ? form.photoUrl : member.photoUrl;

  return (
    <div className="card-luxury overflow-hidden transition-all duration-300">
      {/* ── Header row ── */}
      <div className="flex items-start gap-4 p-4 sm:p-5">
        {/* Photo */}
        <div className="relative shrink-0">
          {photo ? (
            <img
              src={photo as string}
              alt={member.name}
              className="h-16 w-16 rounded-2xl object-cover border-2 border-gold-500/30 shadow-md"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className={`${photo ? 'hidden' : 'flex'} h-16 w-16 items-center justify-center rounded-2xl border-2 border-royal-700 bg-royal-800 text-royal-400`}
          >
            <UserCircle2 className="h-8 w-8" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="grid gap-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  className="input-luxury text-sm"
                  placeholder="ناو *"
                  required
                  value={form.name as string}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  className="input-luxury text-sm"
                  placeholder="پۆستە"
                  value={form.position as string}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
                <input
                  className="input-luxury text-sm dir-ltr"
                  placeholder="ژمارەی مۆبایل"
                  value={form.phoneNumber as string}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                />
                <input
                  className="input-luxury text-sm"
                  placeholder="بەستەری وێنە (URL)"
                  value={form.photoUrl as string}
                  onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                />
              </div>
              <textarea
                className="input-luxury text-sm resize-none"
                rows={2}
                placeholder="بایۆگرافی..."
                value={form.bio as string}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>
          ) : (
            <>
              <p className="text-base font-bold text-white leading-tight">{member.name}</p>
              <p className="text-xs font-semibold text-gold-400 mt-0.5">{member.position}</p>
              {member.phoneNumber && (
                <a
                  href={`tel:${member.phoneNumber}`}
                  className="mt-1 inline-flex items-center gap-1.5 text-xs text-royal-300 hover:text-gold-300 transition-colors dir-ltr"
                >
                  <Phone className="h-3 w-3 text-gold-500" />
                  {member.phoneNumber}
                </a>
              )}
              {member.bio && (
                <p className="mt-2 text-xs text-royal-400 leading-relaxed line-clamp-2">{member.bio}</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Action row ── */}
      <div className="flex items-center justify-end gap-2 border-t border-royal-800/60 px-4 py-2.5 bg-royal-950/40">
        {editing ? (
          <>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1 rounded-xl border border-royal-700 px-3 py-1.5 text-xs font-semibold text-royal-300 hover:text-white transition"
            >
              <X className="h-3.5 w-3.5" />
              داخستن
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-1 rounded-xl bg-gold-500 px-4 py-1.5 text-xs font-bold text-royal-950 hover:bg-gold-400 transition disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              {saving ? 'تۆمارکردن...' : 'پاشەکەوتکردن'}
            </button>
          </>
        ) : (
          <>
            {confirmDel ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">دڵنیایت؟</span>
                <button
                  type="button"
                  onClick={() => onDelete(member.id)}
                  className="rounded-xl bg-red-500/20 border border-red-500/40 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/30 transition"
                >
                  بەڵێ، بیسڕەوە
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDel(false)}
                  className="rounded-xl border border-royal-700 px-3 py-1.5 text-xs font-semibold text-royal-300 hover:text-white transition"
                >
                  نەخێر
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmDel(true)}
                  className="inline-flex items-center gap-1 rounded-xl border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:border-red-400/40 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  سڕینەوە
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1 rounded-xl bg-royal-800 border border-royal-700 px-4 py-1.5 text-xs font-semibold text-royal-200 hover:text-white hover:border-gold-500/40 transition"
                >
                  <Pencil className="h-3.5 w-3.5 text-gold-400" />
                  گۆڕین
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Add-new collapsible form ──────────────────────────────────────── */
function AddStaffForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/staff', form);
      setForm(blankForm);
      setOpen(false);
      onAdded();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-luxury overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-royal-200 hover:text-white hover:bg-royal-800/30 transition-colors"
      >
        <span className="flex items-center gap-2 text-gold-400">
          <Plus className="h-4 w-4" />
          زیادکردنی ئەندامی تیمی نوێ
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-royal-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-royal-400" />
        )}
      </button>

      {open && (
        <form onSubmit={submit} className="grid gap-3 border-t border-royal-800/60 p-4 sm:p-5 sm:grid-cols-2">
          <input
            className="input-luxury text-sm"
            placeholder="ناو *"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="input-luxury text-sm"
            placeholder="پۆستە"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
          />
          <input
            className="input-luxury text-sm dir-ltr"
            placeholder="ژمارەی مۆبایل *"
            required
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
          />
          <input
            className="input-luxury text-sm"
            placeholder="بەستەری وێنە (URL)"
            value={form.photoUrl}
            onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
          />
          <textarea
            className="input-luxury text-sm resize-none sm:col-span-2"
            rows={2}
            placeholder="بایۆگرافی..."
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
          <div className="flex items-center justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => { setOpen(false); setForm(blankForm); }}
              className="rounded-xl border border-royal-700 px-4 py-2 text-xs font-semibold text-royal-300 hover:text-white transition"
            >
              داخستن
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-gold text-xs px-5 py-2 font-bold disabled:opacity-50"
            >
              {saving ? 'تۆمارکردن...' : 'زیادکردن'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export function StaffPage() {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);

  const load = () => api.get<Staff[]>('/api/staff').then(setStaff).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  if (profile?.role !== 'ADMIN') {
    return <p className="text-royal-400">دەسترسی ئەدمین پێویستە.</p>;
  }

  const handleSave = async (id: string, data: Partial<Staff>) => {
    await api.put(`/api/staff/${id}`, data);
    await load();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/api/staff/${id}`);
    await load();
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <UserCircle2 className="h-7 w-7 text-gold-400" />
        <div>
          <h1 className="font-display text-2xl font-bold text-gold-400">تیمی کارمەندان</h1>
          <p className="text-xs text-royal-400 mt-0.5">{staff.length} ئەندام</p>
        </div>
      </div>

      {/* Add form */}
      <AddStaffForm onAdded={load} />

      {/* Staff cards */}
      {staff.length === 0 ? (
        <div className="card-luxury flex flex-col items-center gap-3 py-14 text-royal-400">
          <ImageIcon className="h-10 w-10 opacity-30" />
          <p className="text-sm">هیچ کارمەندێک نەدۆزرایەوە.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {staff.map((s) => (
            <StaffCard key={s.id} member={s} onSave={handleSave} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
