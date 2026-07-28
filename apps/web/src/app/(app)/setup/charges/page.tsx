'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { chargeSchema, type ChargeDto } from '@smart-hospital/shared';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useConfirmDelete } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, Select } from '@/components/ui/field';
import { Tabs } from '@/components/ui/tabs';
import { SimpleCatalogPanel } from '@/components/setup/simple-catalog-panel';
import { ChargeTypePanel } from '@/components/setup/charge-type-panel';
import { TaxCategoryPanel } from '@/components/setup/tax-category-panel';
import {
  useCharges,
  useCharge,
  useCreateCharge,
  useUpdateCharge,
  useDeleteCharge,
  useUpdateChargeSchedule,
  useCatalog,
  useCreateCatalogItem,
  useTaxCategories,
  useChargeTypes,
} from '@/lib/hooks/use-masters';
import { useAbility } from '@/lib/auth-store';

type Section = 'charges' | 'category' | 'type' | 'unit' | 'tax';

export default function ChargesPage() {
  const [section, setSection] = useState<Section>('charges');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hospital Charges"
        description={<>The charge master shared by every department&apos;s billing</>}
        backHref="/setup"
        backLabel="Back to Setup"
      />

      <Tabs
        tabs={[
          { value: 'charges', label: 'Charges' },
          { value: 'category', label: 'Charge Category' },
          { value: 'type', label: 'Charge Type' },
          { value: 'unit', label: 'Unit Type' },
          { value: 'tax', label: 'Tax Category' },
        ]}
        value={section}
        onChange={(s) => setSection(s as Section)}
      />

      {section === 'charges' && <ChargesTab />}
      {section === 'category' && <SimpleCatalogPanel catalog="charge-category" label="Charge Category" />}
      {section === 'type' && <ChargeTypePanel />}
      {section === 'unit' && <SimpleCatalogPanel catalog="unit-type" label="Unit Type" />}
      {section === 'tax' && <TaxCategoryPanel />}
    </div>
  );
}

function ChargesTab() {
  const ability = useAbility();
  const canAdd = ability.can('setup', 'add');
  const canEdit = ability.can('setup', 'edit');
  const canDelete = ability.can('setup', 'delete');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);

  const { data, isLoading } = useCharges({ search, page, size });
  const { data: cats } = useCatalog('charge-category', { size: 100 });
  const { data: types } = useChargeTypes({ size: 100 });
  const { data: units } = useCatalog('unit-type', { size: 100 });
  const { data: taxes } = useTaxCategories();
  const createCharge = useCreateCharge();
  const updateCharge = useUpdateCharge();
  const removeCharge = useDeleteCharge();
  const createCat = useCreateCatalogItem('charge-category');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ChargeDto | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [taxCategoryId, setTaxCategoryId] = useState('');
  const [standardCharge, setStandardCharge] = useState('');
  const [newCat, setNewCat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const confirmDelete = useConfirmDelete();
  const toast = useToast();

  async function onDelete(row: ChargeDto) {
    if (!(await confirmDelete(`charge ${row.name}`))) return;
    try {
      await removeCharge.mutateAsync(row.id);
      toast.success(`${row.name} deleted`);
    } catch (e) {
      toast.error('Could not delete charge', { description: (e as Error).message });
    }
  }
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const columns: Column<ChargeDto>[] = [
    { key: 'name', header: 'Charge', className: 'font-medium' },
    { key: 'categoryName', header: 'Category', render: (c) => c.categoryName ?? '—' },
    { key: 'typeName', header: 'Type', render: (c) => c.typeName ?? '—' },
    { key: 'unitName', header: 'Unit', render: (c) => c.unitName ?? '—' },
    { key: 'taxPercent', header: 'Tax %', className: 'tabular', render: (c) => `${c.taxPercent}%` },
    {
      key: 'standardCharge',
      header: 'Standard Charge',
      className: 'tabular',
      render: (c) => c.standardCharge.toFixed(2),
    },
  ];

  function openAdd() {
    setEditing(null);
    setName('');
    setCategoryId('');
    setTypeId('');
    setUnitId('');
    setTaxCategoryId('');
    setStandardCharge('');
    setError(null);
    setOpen(true);
  }

  function openEdit(row: ChargeDto) {
    setEditing(row);
    setName(row.name);
    setCategoryId(row.categoryId ?? '');
    setTypeId(row.typeId ?? '');
    setUnitId(row.unitId ?? '');
    setTaxCategoryId(row.taxCategoryId ?? '');
    setStandardCharge(String(row.standardCharge));
    setError(null);
    setOpen(true);
  }

  async function submit() {
    setError(null);
    const parsed = chargeSchema.safeParse({
      name,
      categoryId: categoryId || undefined,
      typeId: typeId || undefined,
      unitId: unitId || undefined,
      taxCategoryId: taxCategoryId || undefined,
      standardCharge: standardCharge || 0,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid');
      return;
    }
    if (editing) {
      await updateCharge.mutateAsync({ id: editing.id, input: parsed.data });
    } else {
      await createCharge.mutateAsync(parsed.data);
    }
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        meta={data?.meta}
        loading={isLoading}
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onPage={setPage}
        onSize={(s) => {
          setSize(s);
          setPage(1);
        }}
        toolbar={
          canAdd && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Charge
            </Button>
          )
        }
        rowActions={(row) => (
          <>
            <button
              onClick={() => setDetailsId(row.id)}
              aria-label="Details"
              title="Details"
              className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"
            >
              <Eye className="h-4 w-4" />
            </button>
            {canEdit && (
              <button
                onClick={() => openEdit(row)}
                aria-label="Edit"
                title="Edit"
                className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-primary/10 hover:text-primary"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(row)}
                aria-label="Delete"
                title="Delete"
                className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      />

      <FormDrawer
        open={open}
        title={editing ? 'Edit Charge' : 'Add Charge'}
        onClose={() => setOpen(false)}
        onSubmit={submit}
        submitting={createCharge.isPending || updateCharge.isPending}
      >
        {error && (
          <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="space-y-4">
          <Field label="Charge Name" required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <Field label="Category">
            <div className="flex gap-2">
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                placeholder="Select…"
                options={(cats?.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
            <div className="mt-2 flex gap-2">
              <TextInput
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="…or add a new category"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={createCat.isPending}
                onClick={async () => {
                  if (!newCat.trim()) return;
                  const c = await createCat.mutateAsync(newCat.trim());
                  setCategoryId(c.id);
                  setNewCat('');
                }}
              >
                Add
              </Button>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <Select
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
                placeholder="None"
                options={(types?.data ?? []).map((t) => ({ value: t.id, label: t.name }))}
              />
            </Field>
            <Field label="Unit">
              <Select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                placeholder="None"
                options={(units?.data ?? []).map((u) => ({ value: u.id, label: u.name }))}
              />
            </Field>
          </div>

          <Field label="Tax Category">
            <Select
              value={taxCategoryId}
              onChange={(e) => setTaxCategoryId(e.target.value)}
              placeholder="None"
              options={(taxes?.data ?? []).map((t) => ({
                value: t.id,
                label: `${t.name} (${t.percent}%)`,
              }))}
            />
          </Field>

          <Field label="Standard Charge">
            <TextInput
              type="number"
              value={standardCharge}
              onChange={(e) => setStandardCharge(e.target.value)}
              placeholder="0.00"
            />
          </Field>
        </div>
      </FormDrawer>


      {detailsId && <ChargeDetailsModal id={detailsId} onClose={() => setDetailsId(null)} />}
    </div>
  );
}

// ── Charges Details modal (read-only + per-TPA "Scheduled Charges") ────
function ChargeDetailsModal({ id, onClose }: { id: string; onClose: () => void }) {
  const ability = useAbility();
  const canEdit = ability.can('setup', 'edit');
  const { data: charge, isLoading } = useCharge(id);
  const updateSchedule = useUpdateChargeSchedule();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [applyAll, setApplyAll] = useState('');

  useEffect(() => {
    if (!charge) return;
    setAmounts(Object.fromEntries(charge.schedule.map((s) => [s.tpaId, s.amount != null ? String(s.amount) : ''])));
  }, [charge]);

  async function saveSchedule() {
    if (!charge) return;
    const entries = charge.schedule
      .map((s) => ({ tpaId: s.tpaId, amount: amounts[s.tpaId] }))
      .filter((e) => e.amount !== undefined && e.amount !== '')
      .map((e) => ({ tpaId: e.tpaId, amount: Number(e.amount) }));
    await updateSchedule.mutateAsync({ chargeId: id, input: { entries } });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Charge Details"
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          {canEdit && charge && charge.schedule.length > 0 && (
            <Button type="button" loading={updateSchedule.isPending} onClick={saveSchedule}>
              Save Schedule
            </Button>
          )}
        </>
      }
    >
        <div className="space-y-6">
          {isLoading || !charge ? (
            <p className="text-sm text-fg-muted">Loading…</p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-fg-muted">Name</dt>
                  <dd className="font-medium">{charge.name}</dd>
                </div>
                <div>
                  <dt className="text-fg-muted">Category</dt>
                  <dd className="font-medium">{charge.categoryName ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-fg-muted">Type</dt>
                  <dd className="font-medium">{charge.typeName ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-fg-muted">Unit</dt>
                  <dd className="font-medium">{charge.unitName ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-fg-muted">Tax Category</dt>
                  <dd className="font-medium">
                    {charge.taxCategoryName ? `${charge.taxCategoryName} (${charge.taxPercent}%)` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-fg-muted">Standard Charge</dt>
                  <dd className="font-medium tabular">{charge.standardCharge.toFixed(2)}</dd>
                </div>
              </dl>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Scheduled Charges For TPA</h3>
                  {canEdit && charge.schedule.length > 0 && (
                    <div className="flex items-center gap-2">
                      <TextInput
                        type="number"
                        value={applyAll}
                        onChange={(e) => setApplyAll(e.target.value)}
                        placeholder="Amount"
                        className="h-8 w-28"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (applyAll === '') return;
                          setAmounts(Object.fromEntries(charge.schedule.map((s) => [s.tpaId, applyAll])));
                        }}
                      >
                        Apply To All
                      </Button>
                    </div>
                  )}
                </div>
                {charge.schedule.length === 0 ? (
                  <p className="text-sm text-fg-muted">No TPAs configured yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                          <th className="px-3 py-2 font-semibold">TPA</th>
                          <th className="px-3 py-2 font-semibold">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {charge.schedule.map((s) => (
                          <tr key={s.tpaId} className="border-b border-border/60 last:border-0">
                            <td className="px-3 py-2">{s.tpaName}</td>
                            <td className="px-3 py-2">
                              <TextInput
                                type="number"
                                disabled={!canEdit}
                                value={amounts[s.tpaId] ?? ''}
                                onChange={(e) => setAmounts((prev) => ({ ...prev, [s.tpaId]: e.target.value }))}
                                placeholder={charge.standardCharge.toFixed(2)}
                                className="h-8 w-32"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
    </Modal>
  );
}
