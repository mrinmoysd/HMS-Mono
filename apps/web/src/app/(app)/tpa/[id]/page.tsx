'use client';

import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Hash, MapPin, Pencil, Phone, Search, Trash2, User } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { TPA_CHARGE_MODULES, type TpaChargeRowDto } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import { ExportMenu } from '@/components/ui/export-menu';
import { useAbility } from '@/lib/auth-store';
import { useTpaDetail, useTpaCharges, useSetTpaCharge, useDeleteTpaCharge } from '@/lib/hooks/use-tpa';

export default function TpaDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const ability = useAbility();
  const canEdit = ability.can('tpa', 'edit');

  const tpa = useTpaDetail(id);
  const [module, setModule] = useState('appointment');
  const [query, setQuery] = useState('appointment');
  const charges = useTpaCharges(id, query);
  const setCharge = useSetTpaCharge(id);
  const delCharge = useDeleteTpaCharge(id);
  const toast = useToast();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<TpaChargeRowDto | null>(null);

  const rows = useMemo(() => {
    const all = charges.data ?? [];
    const q = search.trim().toLowerCase();
    return q ? all.filter((c) => `${c.chargeName} ${c.chargeCategory ?? ''} ${c.chargeType ?? ''}`.toLowerCase().includes(q)) : all;
  }, [charges.data, search]);

  const t = tpa.data;

  async function remove(c: TpaChargeRowDto) {
    const ok = await confirm({
      title: `Reset ${c.chargeName} to standard rate?`,
      description: 'The TPA-specific rate is removed and the standard hospital charge applies again.',
      confirmLabel: 'Reset to standard',
      tone: 'warning',
    });
    if (!ok) return;
    try {
      await delCharge.mutateAsync(c.chargeId);
      toast.success(`${c.chargeName} reset to standard`);
    } catch (e) {
      toast.error('Could not reset charge', { description: (e as Error).message });
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={() => router.push('/tpa')} className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ChevronLeft className="h-4 w-4" /> TPA Management</button>

      {/* TPA Name card */}
      <div className="rounded-md border border-border bg-surface">
        <div className="border-b border-border px-5 py-3 text-sm font-semibold">TPA Name</div>
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-6">
          <Meta icon={User} label="TPA Name" value={t?.name} accent />
          <Meta icon={Hash} label="Code" value={t?.code} />
          <Meta icon={Phone} label="Contact No" value={t?.phone} />
          <Meta icon={User} label="Contact Person Name" value={t?.contactPerson} />
          <Meta icon={Phone} label="Contact Person Phone" value={t?.contactPhone} />
          <Meta icon={MapPin} label="Address" value={t?.address} />
        </div>
      </div>

      {/* TPA Details — charge schedule */}
      <div className="rounded-md border border-border bg-surface">
        <div className="border-b border-border px-5 py-3 text-sm font-semibold">TPA Details</div>
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-64"><Field label="Charge Type"><Select value={module} onChange={(e) => setModule(e.target.value)} options={TPA_CHARGE_MODULES.map((m) => ({ value: m.value, label: m.label }))} /></Field></div>
            <Button onClick={() => setQuery(module)}><Search className="h-4 w-4" /> Search</Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-64" />
            <ExportMenu table={() => ({ title: 'TPA Charges', filename: 'tpa-charges', headers: ['Charge Type', 'Charge Category', 'Charge Name', 'Description', 'Standard Charge ($)', 'TPA Charge ($)'], rows: rows.map((c) => [c.chargeType ?? '', c.chargeCategory ?? '', c.chargeName, c.description ?? '', c.standardCharge.toFixed(2), c.tpaCharge != null ? c.tpaCharge.toFixed(2) : '']) })} />
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-fg-muted">
                  {['Charge Type', 'Charge Category', 'Charge Name', 'Description', 'Standard Charge ($)', 'TPA Charge ($)', 'Action'].map((c) => <th key={c} className={`px-3 py-2.5 font-semibold ${c.includes('$') ? 'text-right' : ''}`}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.chargeId} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2.5">{c.chargeType ?? '—'}</td>
                    <td className="px-3 py-2.5">{c.chargeCategory ?? '—'}</td>
                    <td className="px-3 py-2.5 font-medium">{c.chargeName}</td>
                    <td className="px-3 py-2.5 text-fg-muted">{c.description ?? ''}</td>
                    <td className="px-3 py-2.5 text-right tabular">{c.standardCharge.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right tabular">{c.tpaCharge != null ? c.tpaCharge.toFixed(2) : <span className="text-fg-muted">—</span>}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        {canEdit && <button onClick={() => setEditing(c)} aria-label="Edit" title="Edit TPA Charge" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"><Pencil className="h-4 w-4" /></button>}
                        {canEdit && c.tpaCharge != null && <button onClick={() => remove(c)} aria-label="Delete" title="Reset to standard" className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {charges.isLoading && <p className="py-8 text-center text-sm text-fg-muted">Loading…</p>}
            {!charges.isLoading && rows.length === 0 && <p className="py-10 text-center text-sm text-fg-muted">No charges found for this type.</p>}
          </div>
          {!charges.isLoading && rows.length > 0 && <p className="text-xs text-fg-muted">Records: 1 to {rows.length} of {rows.length}</p>}
        </div>
      </div>

      {editing && <EditTpaChargeModal row={editing} saving={setCharge.isPending} onSave={async (amount) => { await setCharge.mutateAsync({ chargeId: editing.chargeId, amount }); setEditing(null); }} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Meta({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value?: string | null; accent?: boolean }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-fg-muted"><Icon className="h-3.5 w-3.5" /> {label}</p>
      <p className={`mt-1 font-semibold ${accent ? 'text-primary' : ''}`}>{value || '—'}</p>
    </div>
  );
}

function EditTpaChargeModal({ row, saving, onSave, onClose }: { row: TpaChargeRowDto; saving: boolean; onSave: (amount: number) => void; onClose: () => void }) {
  const [amount, setAmount] = useState(row.tpaCharge != null ? String(row.tpaCharge) : String(row.standardCharge));
  return (
    <Modal
      open
      onClose={onClose}
      title="Edit TPA Charge"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={() => onSave(Number(amount) || 0)}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
          <p className="text-sm font-semibold">Charge Details</p>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-fg-muted">
                  {['Charge Type', 'Charge Category', 'Charge Name', 'Description', 'Standard Charge ($)', 'TPA Charge ($) *'].map((c) => <th key={c} className="px-3 py-2.5 font-semibold">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-3">{row.chargeType ?? '—'}</td>
                  <td className="px-3 py-3">{row.chargeCategory ?? '—'}</td>
                  <td className="px-3 py-3">{row.chargeName}</td>
                  <td className="px-3 py-3 text-fg-muted">{row.description ?? ''}</td>
                  <td className="px-3 py-3 tabular">{row.standardCharge.toFixed(2)}</td>
                  <td className="px-3 py-3"><TextInput type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-28" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
    </Modal>
  );
}
