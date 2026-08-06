import type { ActionKey } from '@smart-hospital/shared';
import type { RequiredFeature } from '../rbac/require-feature.decorator';

/**
 * One generic controller serves twenty-five name catalogs at
 * `/masters/:catalog`, and all of them were gated on `setup:*`. That is the
 * widest single switch left in the codebase: whoever could edit a Charge
 * Category could also edit Departments, Bed Types, Medicine Groups and ICD
 * Groups.
 *
 * The spec does not have a Setup module. Each of these masters is a feature of
 * the module it belongs to — Floor and Bed Type are IPD's, Medicine Group is
 * Pharmacy's, Department is HR's — with grants that differ sharply. So the key
 * depends on the `:catalog` param, which is why this is a resolver.
 *
 * An unlisted catalog resolves to null and is denied. Adding a catalog to
 * NAME_CATALOGS without adding it here fails closed, which is the right
 * direction to fail.
 */
const CATALOG_FEATURES: Record<string, string> = {
  'charge-category': 'hospital_charges.charge_category',
  'unit-type': 'hospital_charges.unit_type',
  floor: 'ipd.floor',
  'bed-type': 'ipd.bed_type',
  'medicine-category': 'pharmacy.medicine_category',
  'income-head': 'income.income_head',
  'expense-head': 'expense.expense_head',
  department: 'human_resource.department',
  designation: 'human_resource.designation',
  specialization: 'human_resource.specialist',
  'finding-category': 'system_settings.finding_category',
  'symptom-head': 'system_settings.symptoms_head',
  'icd-group': 'system_settings.icd_10_groups',
  'item-category': 'inventory.item_category',
  'item-store': 'inventory.store',
  'pharma-company': 'pharmacy.company',
  'medicine-group': 'pharmacy.medicine_group',
  'pharma-unit': 'pharmacy.unit',
  'dosage-interval': 'pharmacy.dosage_interval',
  'dosage-duration': 'pharmacy.dosage_duration',
  'referral-category': 'referral.referral_category',
  'content-type': 'download_center.content_type',

  // Front Office keeps its four lookup lists behind one feature, Setup Front
  // Office, rather than one per list — so these two share a key by design.
  'front-office-purpose': 'front_office.setup_front_office',
  'complaint-type': 'front_office.setup_front_office',

  // The one inferred mapping in this file. The spec has Operation Theatre as
  // an IPD/OPD record and never exposes its category master, so there is no
  // Operation Category feature to point at. Every other option is worse:
  // denying it breaks a working screen, and leaving it undecorated on a
  // resolver-driven route means no gate at all. Whoever may manage operations
  // may manage the list of operation categories, which is the narrowest
  // honest reading. Flagged so it can be overruled.
  'operation-category': 'ipd.operation_theatre',
};

export function catalogFeature(catalog: string | undefined, action: ActionKey): RequiredFeature | null {
  if (!catalog) return null;
  const feature = CATALOG_FEATURES[catalog];
  return feature ? { feature, action } : null;
}

/** Exported for the test that asserts every catalog is accounted for. */
export const MAPPED_CATALOGS = CATALOG_FEATURES;
