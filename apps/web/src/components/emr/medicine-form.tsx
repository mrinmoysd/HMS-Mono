'use client';

import { useEffect, useState } from 'react';
import { medicineSchema, type MedicineDto } from '@smart-hospital/shared';
import { FormDrawer } from '@/components/ui/form-drawer';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { useCatalog } from '@/lib/hooks/use-masters';
import { useCreateMedicine, useUpdateMedicine } from '@/lib/hooks/use-departments';
import { ApiRequestError } from '@/lib/api';

/** Add/Edit Medicine Details — full field parity with the demo (category/company/composition/group/unit/levels/tax/packing/VAT/rack/note/photo). */
export function MedicineForm({ open, onClose, medicine }: { open: boolean; onClose: () => void; medicine?: MedicineDto | null }) {
  const { data: categories } = useCatalog('medicine-category', { size: 100 });
  const { data: companies } = useCatalog('pharma-company', { size: 100 });
  const { data: groups } = useCatalog('medicine-group', { size: 100 });
  const { data: units } = useCatalog('pharma-unit', { size: 100 });
  const create = useCreateMedicine();
  const update = useUpdateMedicine();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [composition, setComposition] = useState('');
  const [groupId, setGroupId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [minLevel, setMinLevel] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [taxPercent, setTaxPercent] = useState('');
  const [boxPacking, setBoxPacking] = useState('');
  const [vatAc, setVatAc] = useState('');
  const [rackNumber, setRackNumber] = useState('');
  const [note, setNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(medicine?.name ?? '');
    setCategoryId(medicine?.categoryId ?? '');
    setCompanyId(medicine?.companyId ?? '');
    setComposition(medicine?.composition ?? '');
    setGroupId(medicine?.groupId ?? '');
    setUnitId(medicine?.unitId ?? '');
    setMinLevel(medicine?.minLevel != null ? String(medicine.minLevel) : '');
    setReorderLevel(medicine?.reorderLevel != null ? String(medicine.reorderLevel) : '');
    setTaxPercent(medicine?.taxPercent != null ? String(medicine.taxPercent) : '');
    setBoxPacking(medicine?.boxPacking ?? '');
    setVatAc(medicine?.vatAc ?? '');
    setRackNumber(medicine?.rackNumber ?? '');
    setNote(medicine?.note ?? '');
    setPhotoUrl(medicine?.photoUrl ?? '');
    setErrors({});
    setApiError(null);
  }, [open, medicine]);

  function readPhoto(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function submit() {
    setApiError(null);
    const parsed = medicineSchema.safeParse({
      name,
      categoryId,
      companyId: companyId || null,
      composition,
      groupId: groupId || null,
      unitId,
      minLevel: minLevel || undefined,
      reorderLevel: reorderLevel || undefined,
      taxPercent: taxPercent || undefined,
      boxPacking,
      vatAc,
      rackNumber,
      note,
      photoUrl,
      salePrice: medicine?.salePrice ?? 0,
      purchasePrice: medicine?.purchasePrice ?? 0,
      stock: medicine?.stock ?? 0,
    });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const i of parsed.error.issues) fe[String(i.path[0] ?? '')] = i.message;
      setErrors(fe);
      return;
    }
    try {
      if (medicine) await update.mutateAsync({ id: medicine.id, input: parsed.data });
      else await create.mutateAsync(parsed.data);
      onClose();
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  return (
    <FormDrawer
      open={open}
      title={medicine ? 'Edit Medicine' : 'Add Medicine Details'}
      onClose={onClose}
      onSubmit={submit}
      submitting={create.isPending || update.isPending}
      wide
    >
      {apiError && (
        <p role="alert" className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
          {apiError}
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Medicine Name" required error={errors.name}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Medicine Category" required error={errors.categoryId}>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder="Select…" options={(categories?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
        <Field label="Medicine Company">
          <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)} placeholder="Select…" options={(companies?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
        <Field label="Medicine Composition">
          <TextInput value={composition} onChange={(e) => setComposition(e.target.value)} />
        </Field>
        <Field label="Medicine Group">
          <Select value={groupId} onChange={(e) => setGroupId(e.target.value)} placeholder="Select…" options={(groups?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
        <Field label="Unit" required error={errors.unitId}>
          <Select value={unitId} onChange={(e) => setUnitId(e.target.value)} placeholder="Select…" options={(units?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
        <Field label="Min Level">
          <TextInput type="number" value={minLevel} onChange={(e) => setMinLevel(e.target.value)} />
        </Field>
        <Field label="Re-Order Level">
          <TextInput type="number" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
        </Field>
        <Field label="Tax (%)">
          <TextInput type="number" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
        </Field>
        <Field label="Box/Packing" required error={errors.boxPacking}>
          <TextInput value={boxPacking} onChange={(e) => setBoxPacking(e.target.value)} placeholder="e.g. 10 tablets" />
        </Field>
        <Field label="VAT A/C">
          <TextInput value={vatAc} onChange={(e) => setVatAc(e.target.value)} />
        </Field>
        <Field label="Rack Number">
          <TextInput value={rackNumber} onChange={(e) => setRackNumber(e.target.value)} />
        </Field>
      </div>
      <Field label="Note" className="mt-4">
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Field label="Medicine Photo (JPG | JPEG | PNG)" className="mt-4">
        <div className="flex items-center gap-3">
          <input type="file" accept="image/jpeg,image/jpg,image/png" onChange={(e) => readPhoto(e.target.files?.[0])} className="text-sm" />
          {photoUrl && (
            <button type="button" onClick={() => setPhotoUrl('')} className="text-xs text-danger">
              Remove
            </button>
          )}
        </div>
      </Field>
    </FormDrawer>
  );
}
