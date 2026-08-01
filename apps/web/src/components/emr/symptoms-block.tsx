'use client';

import { useMemo } from 'react';
import { Field, TextInput, TextArea, Select } from '@/components/ui/field';
import { useCatalog } from '@/lib/hooks/use-masters';
import { useSymptomTypeMasters, useIcdCodes } from '@/lib/hooks/use-emr';

/**
 * The Symptoms block shared by the OPD New Visit and IPD Admission forms
 * (blueprint §7.2 / §8.2).
 *
 * Both cascades read from Setup rather than accepting free text, which is the
 * point: typed-in symptoms and diagnoses cannot be reported on, and two
 * clinicians spell the same condition three ways. Selecting a symptom title
 * fills the description from the master, still editable — the master is the
 * starting point for this patient's note, not a straitjacket.
 *
 * The stored columns stay plain text so rows written before the masters
 * existed still read correctly, and retiring a code in Setup never rewrites a
 * diagnosis already recorded against a patient.
 */
export interface SymptomsValue {
  symptomType: string;
  symptoms: string;
  symptomDescription: string;
  icd10Group: string;
  icd10Diagnosis: string;
  knownAllergies: string;
  previousMedicalIssue: string;
  note: string;
}

export function SymptomsBlock({
  value,
  onChange,
  /** IPD's Symptoms block has no allergies field; OPD's does (§8.2 note). */
  showAllergies = true,
  /** OPD labels it "ICD Group", IPD "ICD-10 Groups" — same master. */
  groupLabel = 'ICD Group',
}: {
  value: SymptomsValue;
  onChange: (patch: Partial<SymptomsValue>) => void;
  showAllergies?: boolean;
  groupLabel?: string;
}) {
  const { data: heads } = useCatalog('symptom-head', { size: 200 });
  const { data: symptomTypes = [] } = useSymptomTypeMasters();
  const { data: groups } = useCatalog('icd-group', { size: 200 });
  const { data: icdCodes = [] } = useIcdCodes();

  // Titles are filtered by the chosen head. The head is stored by name, so
  // resolve it back to an id to do the filtering.
  const headId = useMemo(
    () => (heads?.data ?? []).find((h) => h.name === value.symptomType)?.id ?? null,
    [heads, value.symptomType],
  );
  const titles = useMemo(
    () => (headId ? symptomTypes.filter((s) => s.headId === headId) : symptomTypes),
    [symptomTypes, headId],
  );

  const groupId = useMemo(
    () => (groups?.data ?? []).find((g) => g.name === value.icd10Group)?.id ?? null,
    [groups, value.icd10Group],
  );
  const codes = useMemo(
    () => (groupId ? icdCodes.filter((c) => c.groupId === groupId) : icdCodes),
    [icdCodes, groupId],
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Symptoms Type">
          <Select
            value={value.symptomType}
            onChange={(e) =>
              // Changing the head invalidates the chosen title, so clear it
              // rather than leave a title showing under a head it is not in.
              onChange({ symptomType: e.target.value, symptoms: '', symptomDescription: '' })
            }
            placeholder="Select…"
            options={(heads?.data ?? []).map((h) => ({ value: h.name, label: h.name }))}
          />
        </Field>
        <Field label="Symptoms Title">
          <Select
            value={value.symptoms}
            onChange={(e) => {
              const picked = titles.find((t) => t.title === e.target.value);
              onChange({
                symptoms: e.target.value,
                // Auto-fill from the master, but never blank out a description
                // the user has already written.
                symptomDescription: picked?.description || value.symptomDescription,
              });
            }}
            placeholder={titles.length ? 'Select…' : 'Add symptoms in Setup'}
            options={titles.map((t) => ({ value: t.title, label: t.title }))}
          />
        </Field>
        <Field label={groupLabel}>
          <Select
            value={value.icd10Group}
            onChange={(e) => onChange({ icd10Group: e.target.value, icd10Diagnosis: '' })}
            placeholder="Select…"
            options={(groups?.data ?? []).map((g) => ({ value: g.name, label: g.name }))}
          />
        </Field>
        <Field label="ICD-10 Diagnosis">
          <Select
            value={value.icd10Diagnosis}
            onChange={(e) => onChange({ icd10Diagnosis: e.target.value })}
            placeholder={codes.length ? 'Select…' : 'Add codes in Setup'}
            options={codes.map((c) => ({
              value: c.code,
              label: c.description ? `${c.code} — ${c.description}` : c.code,
            }))}
          />
        </Field>
      </div>

      <Field label="Symptoms Description">
        <TextArea
          value={value.symptomDescription}
          onChange={(e) => onChange({ symptomDescription: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        {showAllergies && (
          <Field label="Any Known Allergies">
            <TextInput
              value={value.knownAllergies}
              onChange={(e) => onChange({ knownAllergies: e.target.value })}
            />
          </Field>
        )}
        <Field label="Previous Medical Issue">
          <TextInput
            value={value.previousMedicalIssue}
            onChange={(e) => onChange({ previousMedicalIssue: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Note">
        <TextArea value={value.note} onChange={(e) => onChange({ note: e.target.value })} />
      </Field>
    </>
  );
}
