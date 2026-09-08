import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import type { Neighborhood } from '@/types';
import { Edit3, Trash2, GitMerge, Search, X } from 'lucide-react';
import { isSimilarName } from '@/lib/similarity';

export function EditNeighborhoodModal({ editItem, onClose, onSave }: { editItem: Neighborhood, onClose: () => void, onSave: (form: any) => void }) {
  const [editForm, setEditForm] = useState({
    name: editItem.name,
    nameEn: editItem.nameEn || '',
    nameKu: editItem.nameKu || '',
    nameAr: editItem.nameAr || '',
    latitude: editItem.latitude,
    longitude: editItem.longitude,
    aliases: editItem.aliases?.join(', ') || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editForm);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-royal-700 bg-royal-950 p-6 shadow-2xl">
        <h2 className="mb-4 text-xl font-bold text-gold-400">Edit Neighborhood</h2>
        
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-royal-300">Name</label>
            <input
              type="text"
              required
              className="w-full rounded-lg border border-royal-700 bg-royal-900/50 p-2 text-white focus:border-gold-500 focus:outline-none"
              value={editForm.name}
              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
            />
            <p className="mt-1 text-xs text-royal-500">Changing this will update all properties attached to the old name.</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-royal-300">English</label>
              <input
                type="text"
                className="w-full rounded-lg border border-royal-700 bg-royal-900/50 p-2 text-white text-sm focus:border-gold-500 focus:outline-none"
                value={editForm.nameEn}
                onChange={e => setEditForm({ ...editForm, nameEn: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-royal-300">Kurdish</label>
              <input
                type="text"
                className="w-full rounded-lg border border-royal-700 bg-royal-900/50 p-2 text-white text-sm focus:border-gold-500 focus:outline-none"
                value={editForm.nameKu}
                onChange={e => setEditForm({ ...editForm, nameKu: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-royal-300">Arabic</label>
              <input
                type="text"
                className="w-full rounded-lg border border-royal-700 bg-royal-900/50 p-2 text-white text-sm focus:border-gold-500 focus:outline-none"
                value={editForm.nameAr}
                onChange={e => setEditForm({ ...editForm, nameAr: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-royal-300">Aliases (comma separated)</label>
            <input
              type="text"
              className="w-full rounded-lg border border-royal-700 bg-royal-900/50 p-2 text-white focus:border-gold-500 focus:outline-none"
              value={editForm.aliases}
              onChange={e => setEditForm({ ...editForm, aliases: e.target.value })}
              placeholder="e.g. Peshawa, Peshawa City"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-royal-300">Latitude</label>
              <input
                type="number"
                step="any"
                required
                className="w-full rounded-lg border border-royal-700 bg-royal-900/50 p-2 text-white focus:border-gold-500 focus:outline-none"
                value={editForm.latitude}
                onChange={e => setEditForm({ ...editForm, latitude: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-royal-300">Longitude</label>
              <input
                type="number"
                step="any"
                required
                className="w-full rounded-lg border border-royal-700 bg-royal-900/50 p-2 text-white focus:border-gold-500 focus:outline-none"
                value={editForm.longitude}
                onChange={e => setEditForm({ ...editForm, longitude: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-royal-300 hover:text-white"
          >
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-royal-950 hover:bg-gold-400">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

export function NeighborhoodsAdminPage() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editItem, setEditItem] = useState<Neighborhood | null>(null);

  // Merge Scanner State
  const [similarGroups, setSimilarGroups] = useState<Neighborhood[][]>([]);
  const [showScanner, setShowScanner] = useState(false);

  // Merge Action State
  const [mergeGroup, setMergeGroup] = useState<Neighborhood[] | null>(null);
  const [primaryMergeId, setPrimaryMergeId] = useState<string>('');
  const [mergeNewName, setMergeNewName] = useState<string>('');
  const [mergeNewNameEn, setMergeNewNameEn] = useState<string>('');
  const [mergeNewNameKu, setMergeNewNameKu] = useState<string>('');
  const [mergeNewNameAr, setMergeNewNameAr] = useState<string>('');

  const [search, setSearch] = useState('');

  const [scanning, setScanning] = useState(false);

  const CACHE_KEY = 'admin_neighborhoods_cache';
  const SCAN_CACHE_KEY = 'admin_neighborhood_scans_cache';

  const load = async (forceRefresh = false) => {
    setLoading(true);
    try {
      if (!forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          setNeighborhoods(JSON.parse(cached));
          setLoading(false);
          return;
        }
      }
      const data = await api.get<Neighborhood[]>('/api/admin/neighborhoods');
      setNeighborhoods(data);
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      // Clear scan cache if we are forcefully fetching new data
      if (forceRefresh) {
        localStorage.removeItem(SCAN_CACHE_KEY);
        setSimilarGroups([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredNeighborhoods = useMemo(() => {
    if (!search.trim()) return neighborhoods;
    const q = search.toLowerCase();
    return neighborhoods.filter(n => 
      n.name.toLowerCase().includes(q) || 
      n.aliases?.some(a => a.toLowerCase().includes(q))
    );
  }, [neighborhoods, search]);

  const scanForDuplicates = (forceRefresh = false) => {
    setShowScanner(true);
    if (!forceRefresh) {
      const cached = localStorage.getItem(SCAN_CACHE_KEY);
      if (cached) {
        setSimilarGroups(JSON.parse(cached));
        return;
      }
    }

    setScanning(true);
    // Use setTimeout to allow UI to render the scanning state before locking the thread
    setTimeout(() => {
      const groups: Neighborhood[][] = [];
      const used = new Set<string>();

      for (let i = 0; i < neighborhoods.length; i++) {
        const n1 = neighborhoods[i];
        if (used.has(n1.id)) continue;

        const group = [n1];
        for (let j = i + 1; j < neighborhoods.length; j++) {
          const n2 = neighborhoods[j];
          if (used.has(n2.id)) continue;

          if (isSimilarName(n1.name, n2.name)) {
            group.push(n2);
            used.add(n2.id);
          }
        }
        if (group.length > 1) {
          groups.push(group);
        }
        used.add(n1.id);
      }
      
      setSimilarGroups(groups);
      localStorage.setItem(SCAN_CACHE_KEY, JSON.stringify(groups));
      setScanning(false);
    }, 50);
  };

  const handleSaveEdit = async (id: string, form: any) => {
    const aliases = form.aliases.split(',').map((s: string) => s.trim()).filter(Boolean);
    
    try {
      await api.put(`/api/admin/neighborhoods/${id}`, {
        name: form.name,
        nameEn: form.nameEn || null,
        nameKu: form.nameKu || null,
        nameAr: form.nameAr || null,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        aliases,
      });
      setEditItem(null);
      load(true);
    } catch (error: any) {
      alert(error?.response?.data?.error || error?.message || 'Failed to update neighborhood');
    }
  };

  const deleteNeighborhood = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? Properties attached to it might break filtering.`)) return;
    try {
      await api.delete(`/api/admin/neighborhoods/${id}`);
      load(true);
    } catch (error) {
      alert('Failed to delete');
    }
  };

  const executeMerge = async () => {
    if (!mergeGroup || !primaryMergeId) return;
    const duplicateIds = mergeGroup.filter(n => n.id !== primaryMergeId).map(n => n.id);
    
    if (duplicateIds.length === 0) return;

    const finalName = mergeNewName.trim() || mergeGroup.find(n => n.id === primaryMergeId)?.name || '';
    const isRenaming = finalName !== (mergeGroup.find(n => n.id === primaryMergeId)?.name || '');

    if (isRenaming) {
      if (!mergeNewNameEn.trim() || !mergeNewNameKu.trim() || !mergeNewNameAr.trim()) {
        alert('Please provide the new name in all three languages (English, Kurdish, Arabic) since you are renaming it.');
        return;
      }
    }

    if (!confirm(`Are you sure you want to merge ${duplicateIds.length} neighborhood(s) into "${finalName}"?`)) return;

    try {
      await api.post('/api/admin/neighborhoods/merge', {
        primaryId: primaryMergeId,
        duplicateIds,
        newName: mergeNewName.trim() || undefined,
        nameEn: isRenaming ? mergeNewNameEn.trim() : undefined,
        nameKu: isRenaming ? mergeNewNameKu.trim() : undefined,
        nameAr: isRenaming ? mergeNewNameAr.trim() : undefined,
      });
      setMergeGroup(null);
      setMergeNewName('');
      setMergeNewNameEn('');
      setMergeNewNameKu('');
      setMergeNewNameAr('');
      setShowScanner(false);
      load(true);
    } catch (error) {
      alert('Failed to merge neighborhoods');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-3xl text-gold-400">Neighborhoods</h1>
          <button 
            onClick={() => load(true)} 
            className="text-sm text-royal-400 hover:text-gold-400 transition"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
        <button onClick={() => scanForDuplicates(false)} disabled={scanning} className="btn-gold flex items-center gap-2">
          <GitMerge className="h-4 w-4" />
          {scanning ? 'Scanning...' : 'Scan Duplicates'}
        </button>
      </div>

      {showScanner && (
        <div className="rounded-xl border border-gold-500/30 bg-gold-500/10 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-gold-300">Duplicate Scanner Results</h2>
              <button 
                onClick={() => scanForDuplicates(true)} 
                className="text-xs text-royal-300 hover:text-white"
                disabled={scanning}
              >
                {scanning ? 'Scanning...' : 'Force Rescan'}
              </button>
            </div>
            <button onClick={() => setShowScanner(false)} className="text-royal-300 hover:text-white">Close</button>
          </div>
          
          {scanning ? (
            <p className="text-royal-300 animate-pulse">Running similarity algorithm... This may take a few seconds.</p>
          ) : similarGroups.length === 0 ? (
            <p className="text-royal-300">No similar neighborhoods found.</p>
          ) : (
            <div className="space-y-4">
              {similarGroups.map((group, idx) => (
                <div key={idx} className="rounded-lg bg-royal-900/50 p-4 border border-royal-700">
                  <h3 className="mb-2 font-semibold text-royal-200">Potential Match Group {idx + 1}</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {group.map(n => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          setSimilarGroups(prev => {
                            const next = [...prev];
                            next[idx] = next[idx].filter(x => x.id !== n.id);
                            return next;
                          });
                        }}
                        className="group flex items-center gap-1.5 rounded-md bg-royal-800 pl-2 pr-1.5 py-1 text-sm text-gold-300 hover:bg-red-500/20 hover:text-red-400 transition"
                        title="Click to remove from group"
                      >
                        {n.name} ({n.propertyCount || 0} props)
                        <X className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setMergeGroup(group);
                      // Auto-select the one with most properties as primary
                      const best = [...group].sort((a, b) => (b.propertyCount || 0) - (a.propertyCount || 0))[0];
                      setPrimaryMergeId(best.id);
                      setMergeNewName(best.name);
                      setMergeNewNameEn(best.nameEn || '');
                      setMergeNewNameKu(best.nameKu || '');
                      setMergeNewNameAr(best.nameAr || '');
                    }}
                    className="rounded bg-royal-700 px-3 py-1 text-sm text-white hover:bg-royal-600 transition disabled:opacity-50"
                    disabled={group.length < 2}
                  >
                    Review & Merge
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 rounded-lg border border-royal-700 bg-royal-900/50 px-4 py-2 w-full max-w-md">
        <Search className="h-5 w-5 text-royal-500" />
        <input
          type="text"
          placeholder="Search neighborhoods or aliases..."
          className="w-full bg-transparent text-sm text-white focus:outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-royal-800 bg-royal-900/30">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-royal-800 text-royal-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Properties</th>
              <th className="px-4 py-3">Aliases</th>
              <th className="px-4 py-3">Coordinates</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-royal-800/50">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-royal-500">Loading...</td>
              </tr>
            ) : filteredNeighborhoods.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-royal-500">No neighborhoods found.</td>
              </tr>
            ) : (
              filteredNeighborhoods.map((n) => (
                <tr key={n.id} className="transition hover:bg-royal-800/20">
                  <td className="px-4 py-3 font-medium text-gold-200">{n.name}</td>
                  <td className="px-4 py-3">{n.propertyCount || 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {n.aliases && n.aliases.length > 0 ? n.aliases.map(a => (
                        <span key={a} className="rounded bg-royal-800 px-1.5 py-0.5 text-xs text-royal-300">{a}</span>
                      )) : <span className="text-royal-600">-</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-royal-400">
                    {n.latitude.toFixed(4)}, {n.longitude.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditItem(n)}
                        className="rounded p-1.5 text-royal-300 hover:bg-royal-800 hover:text-gold-300 transition"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteNeighborhood(n.id, n.name)}
                        className="rounded p-1.5 text-royal-300 hover:bg-red-500/20 hover:text-red-400 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editItem && (
        <EditNeighborhoodModal 
          editItem={editItem} 
          onClose={() => setEditItem(null)} 
          onSave={(form) => handleSaveEdit(editItem.id, form)} 
        />
      )}

      {mergeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gold-500/50 bg-royal-950 p-6 shadow-2xl">
            <h2 className="mb-1 text-xl font-bold text-gold-400">Merge Neighborhoods</h2>
            <p className="mb-4 text-sm text-royal-300">
              Select the primary neighborhood. Duplicates will be deleted, their properties moved to primary, and their names saved as aliases.
            </p>

            {/* Neighborhood radio list */}
            <div className="space-y-3 mb-5 max-h-60 overflow-y-auto pr-2">
              {mergeGroup.map(n => (
                <label
                  key={n.id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition ${
                    primaryMergeId === n.id ? 'border-gold-500 bg-gold-500/10' : 'border-royal-700 bg-royal-900/30'
                  }`}
                  onClick={() => {
                    setPrimaryMergeId(n.id);
                    setMergeNewName(n.name);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="primaryMerge"
                      checked={primaryMergeId === n.id}
                      onChange={() => {
                        setPrimaryMergeId(n.id);
                        setMergeNewName(n.name);
                        setMergeNewNameEn(n.nameEn || '');
                        setMergeNewNameKu(n.nameKu || '');
                        setMergeNewNameAr(n.nameAr || '');
                      }}
                      className="text-gold-500 focus:ring-gold-500"
                    />
                    <div>
                      <div className="font-semibold text-white">{n.name}</div>
                      <div className="text-xs text-royal-400">
                        Properties: {n.propertyCount || 0} | Aliases: {n.aliases?.length || 0}
                      </div>
                    </div>
                  </div>
                  {primaryMergeId === n.id && <span className="rounded bg-gold-500/20 px-2 py-1 text-xs font-medium text-gold-400">Primary</span>}
                </label>
              ))}
            </div>

            {/* Rename after merge */}
            <div className="mb-6">
              <label className="mb-1 block text-sm font-medium text-royal-300">
                Final name after merge
                <span className="ms-1 text-xs text-royal-500">(optional — defaults to primary's current name)</span>
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-royal-700 bg-royal-900/50 px-3 py-2 text-white focus:border-gold-500 focus:outline-none"
                value={mergeNewName}
                onChange={e => setMergeNewName(e.target.value)}
                placeholder="e.g. Raparin"
              />
              {mergeNewName.trim() &&
                mergeNewName.trim() !== mergeGroup.find(n => n.id === primaryMergeId)?.name && (
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-royal-300">English (Required)</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-royal-700 bg-royal-900/50 px-2 py-1.5 text-white text-sm focus:border-gold-500 focus:outline-none"
                        value={mergeNewNameEn}
                        onChange={e => setMergeNewNameEn(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-royal-300">Kurdish (Required)</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-royal-700 bg-royal-900/50 px-2 py-1.5 text-white text-sm focus:border-gold-500 focus:outline-none"
                        value={mergeNewNameKu}
                        onChange={e => setMergeNewNameKu(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-royal-300">Arabic (Required)</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-royal-700 bg-royal-900/50 px-2 py-1.5 text-white text-sm focus:border-gold-500 focus:outline-none"
                        value={mergeNewNameAr}
                        onChange={e => setMergeNewNameAr(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              {mergeNewName.trim() &&
                mergeNewName.trim() !== mergeGroup.find(n => n.id === primaryMergeId)?.name && (
                  <p className="mt-2 text-xs text-gold-400/80">
                    ✎ Will rename primary to &ldquo;{mergeNewName.trim()}&rdquo; after merge.
                  </p>
                )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { 
                  setMergeGroup(null); 
                  setMergeNewName(''); 
                  setMergeNewNameEn(''); 
                  setMergeNewNameKu(''); 
                  setMergeNewNameAr(''); 
                }}
                className="rounded-lg px-4 py-2 text-sm text-royal-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={executeMerge}
                className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-royal-950 hover:bg-gold-400"
              >
                Confirm Merge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
