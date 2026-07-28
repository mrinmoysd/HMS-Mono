'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { diagnosticTestSchema, type DiagnosticTestDto, type DiagnosticTestParameterInput, type Modality } from '@smart-hospital/shared';
import { Field, TextInput, Select } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useCatalog, useCharges } from '@/lib/hooks/use-masters';
import { useDiagnosticCategories, useCreateDiagnosticTest, useUpdateDiagnosticTest } from '@/lib/hooks/use-departments';
import { ApiRequestError } from '@/lib/api';

interface Props {
  open: boolean;
  modality: Modality;
  test?: DiagnosticTestDto | null;
  onClose: () => void;
}

/** Setup "Add Pathology/Radiology Test" — full field parity incl. Charge linkage + repeatable parameters. */
export function DiagnosticTestForm({ open, modality, test, onClose }: Props) {
  const { data: categories } = useDiagnosticCategories(modality, { size: 100 });
  const { data: chargeCategories } = useCatalog('charge-category', { size: 100 });
  const { data: charges } = useCharges({ size: 300 });
  const create = useCreateDiagnosticTest(modality);
  const update = useUpdateDiagnosticTest(modality);

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [testType, setTestType] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [method, setMethod] = useState('');
  const [reportDays, setReportDays] = useState('1');
  const [chargeCategoryId, setChargeCategoryId] = useState('');
  const [chargeId, setChargeId] = useState('');
  const [amount, setAmount] = useState('0');
  const [parameters, setParameters] = useState<DiagnosticTestParameterInput[]>([{ parameterName: '', referenceRange: '', unit: '' }]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (test) {
      setName(test.name);
      setShortName(test.shortName ?? '');
      setTestType(test.testType ?? '');
      setCategoryId(test.categoryId ?? '');
      setSubCategory(test.subCategory ?? '');
      setMethod(test.method ?? '');
      setReportDays(String(test.reportDays));
      const charge = (charges?.data ?? []).find((c) => c.id === test.chargeId);
      setChargeCategoryId(charge?.categoryId ?? '');
      setChargeId(test.chargeId ?? '');
      setAmount(String(test.charge));
      setParameters(test.parameters.length ? test.parameters.map((p) => ({ parameterName: p.parameterName, referenceRange: p.referenceRange ?? '', unit: p.unit ?? '' })) : [{ parameterName: '', referenceRange: '', unit: '' }]);
    } else {
      setName(''); setShortName(''); setTestType(''); setCategoryId(''); setSubCategory(''); setMethod('');
      setReportDays('1'); setChargeCategoryId(''); setChargeId(''); setAmount('0');
      setParameters([{ parameterName: '', referenceRange: '', unit: '' }]);
    }
    setError(null);
  }, [open, test, charges?.data]);

  if (!open) return null;

  const selectedCharge = (charges?.data ?? []).find((c) => c.id === chargeId);
  const taxPercent = selectedCharge?.taxPercent ?? 0;
  const standardCharge = selectedCharge?.standardCharge ?? 0;
  const chargeOptions = (charges?.data ?? []).filter((c) => !chargeCategoryId || c.categoryId === chargeCategoryId);

  function onChargeChange(id: string) {
    setChargeId(id);
    const c = (charges?.data ?? []).find((x) => x.id === id);
    if (c) setAmount(String(round2(c.standardCharge * (1 + c.taxPercent / 100))));
  }

  function updateParam(i: number, patch: Partial<DiagnosticTestParameterInput>) {
    setParameters((rs) => rs.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  async function submit() {
    setError(null);
    const parsed = diagnosticTestSchema.safeParse({
      modality,
      name,
      shortName,
      testType,
      categoryId: categoryId || null,
      subCategory,
      method,
      reportDays,
      chargeId: chargeId || null,
      charge: amount,
      parameters: parameters.filter((p) => p.parameterName.trim()),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the highlighted fields');
      return;
    }
    try {
      if (test) {
        await update.mutateAsync({ id: test.id, input: parsed.data });
      } else {
        await create.mutateAsync(parsed.data);
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : 'Save failed');
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={test ? 'Edit Test Details' : 'Add Test Details'}
      size="xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} loading={create.isPending || update.isPending}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p role="alert" className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="Test Name" required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Short Name" required>
            <TextInput value={shortName} onChange={(e) => setShortName(e.target.value)} />
          </Field>
          <Field label="Test Type">
            <TextInput value={testType} onChange={(e) => setTestType(e.target.value)} />
          </Field>
          <Field label="Category Name" required>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder="Select" options={(categories?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="Sub Category">
            <TextInput value={subCategory} onChange={(e) => setSubCategory(e.target.value)} />
          </Field>
          <Field label="Method">
            <TextInput value={method} onChange={(e) => setMethod(e.target.value)} />
          </Field>
          <Field label="Report Days" required>
            <TextInput type="number" value={reportDays} onChange={(e) => setReportDays(e.target.value)} />
          </Field>
          <Field label="Charge Category" required>
            <Select value={chargeCategoryId} onChange={(e) => { setChargeCategoryId(e.target.value); setChargeId(''); }} placeholder="Select" options={(chargeCategories?.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="Charge Name" required>
            <Select value={chargeId} onChange={(e) => onChargeChange(e.target.value)} placeholder="Select" options={chargeOptions.map((c) => ({ value: c.id, label: c.name }))} />
          </Field>
          <Field label="Tax (%)">
            <TextInput value={taxPercent.toFixed(2)} disabled className="bg-bg" />
          </Field>
          <Field label="Standard Charge (#)">
            <TextInput value={standardCharge.toFixed(2)} disabled className="bg-bg" />
          </Field>
          <Field label="Amount (#)" required>
            <TextInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
        </div>

        <div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                  <th className="px-2 py-2 font-semibold">Test Parameter Name</th>
                  <th className="px-2 py-2 font-semibold">Reference Range</th>
                  <th className="px-2 py-2 font-semibold">Unit</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {parameters.map((p, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    <td className="px-1 py-1"><input value={p.parameterName} onChange={(e) => updateParam(i, { parameterName: e.target.value })} className="h-8 w-full rounded-sm border border-border bg-surface px-2 text-sm" /></td>
                    <td className="px-1 py-1"><input value={p.referenceRange} onChange={(e) => updateParam(i, { referenceRange: e.target.value })} className="h-8 w-full rounded-sm border border-border bg-surface px-2 text-sm" /></td>
                    <td className="px-1 py-1"><input value={p.unit} onChange={(e) => updateParam(i, { unit: e.target.value })} className="h-8 w-full rounded-sm border border-border bg-surface px-2 text-sm" /></td>
                    <td className="px-1 py-1">
                      <button type="button" onClick={() => setParameters((rs) => rs.filter((_, idx) => idx !== i))} className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted hover:bg-danger/10 hover:text-danger">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => setParameters((rs) => [...rs, { parameterName: '', referenceRange: '', unit: '' }])}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
