'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BloodBagDto,
  BloodBagInput,
  BloodComponentSplitInput,
  BloodDonorDto,
  BloodDonorInput,
  BloodIssueDto,
  BloodIssueInput,
  BloodIssueUpdateInput,
  BloodIssueNextNoDto,
  BloodProductDto,
  BloodProductInput,
  BulkDeleteInput,
  DiagnosticBillInput,
  DiagnosticCategoryDto,
  DiagnosticCategoryInput,
  DiagnosticTestDto,
  DiagnosticTestInput,
  DiagnosticUnitDto,
  DiagnosticUnitInput,
  DiagnosticBillUpdateInput,
  InvoiceDto,
  NextBillNoDto,
  ListQuery,
  MedicineBadStockInput,
  MedicineBatchTpaDetailDto,
  MedicineBatchTpaScheduleEntryDto,
  MedicineBatchTpaScheduleUpdateInput,
  MedicineDetailDto,
  MedicineDosageDto,
  MedicineDosageInput,
  MedicineDto,
  MedicineImportInput,
  MedicineInput,
  MedicinePurchaseDetailDto,
  MedicinePurchaseDto,
  MedicinePurchaseInput,
  Modality,
  Paginated,
  PharmacyBillInput,
  PharmacyBillUpdateInput,
  PharmacyNextBillNoDto,
  PharmaSupplierDto,
  PharmaSupplierInput,
  PreviousReportRow,
} from '@smart-hospital/shared';
import { api } from '@/lib/api';

function qs(p: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') sp.set(k, String(v));
  return sp.toString();
}

// ── Pharmacy ─────────────────────────────────────────────────
export function useMedicines(params: Partial<ListQuery>) {
  return useQuery({
    queryKey: ['medicines', params],
    queryFn: () => api.get<Paginated<MedicineDto>>(`/pharmacy/medicines?${qs(params)}`),
  });
}
export function useMedicine(id: string | null) {
  return useQuery({
    queryKey: ['medicine', id],
    queryFn: () => api.get<MedicineDetailDto>(`/pharmacy/medicines/${id}`),
    enabled: !!id,
  });
}
export function useCreateMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MedicineInput) => api.post<MedicineDto>('/pharmacy/medicines', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicines'] }),
  });
}
export function useUpdateMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MedicineInput }) => api.patch<MedicineDto>(`/pharmacy/medicines/${id}`, input),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['medicines'] });
      qc.invalidateQueries({ queryKey: ['medicine', id] });
    },
  });
}
export function useDeleteMedicines() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkDeleteInput) => api.post<void>('/pharmacy/medicines/bulk-delete', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicines'] }),
  });
}
export function useImportMedicines() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MedicineImportInput) => api.post<{ imported: number }>('/pharmacy/medicines/import', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicines'] }),
  });
}
export function useCreateBadStock(medicineId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MedicineBadStockInput) => api.post<void>(`/pharmacy/medicines/${medicineId}/bad-stock`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medicines'] });
      qc.invalidateQueries({ queryKey: ['medicine', medicineId] });
    },
  });
}
export function useMedicinePurchases(params: Partial<ListQuery>) {
  return useQuery({
    queryKey: ['medicine-purchases', params],
    queryFn: () => api.get<Paginated<MedicinePurchaseDto>>(`/pharmacy/purchases?${qs(params)}`),
  });
}
export function useMedicinePurchase(id: string | null) {
  return useQuery({
    queryKey: ['medicine-purchase', id],
    queryFn: () => api.get<MedicinePurchaseDetailDto>(`/pharmacy/purchases/${id}`),
    enabled: !!id,
  });
}
export function useCreateMedicinePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MedicinePurchaseInput) => api.post<MedicinePurchaseDetailDto>('/pharmacy/purchases', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medicine-purchases'] });
      qc.invalidateQueries({ queryKey: ['medicines'] });
    },
  });
}
export function useBatchTpaDetail(purchaseItemId: string | null) {
  return useQuery({
    queryKey: ['batch-tpa', purchaseItemId],
    queryFn: () => api.get<MedicineBatchTpaDetailDto>(`/pharmacy/purchase-items/${purchaseItemId}/tpa`),
    enabled: !!purchaseItemId,
  });
}
export function useUpdateBatchTpaSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ purchaseItemId, input }: { purchaseItemId: string; input: MedicineBatchTpaScheduleUpdateInput }) =>
      api.put<MedicineBatchTpaScheduleEntryDto[]>(`/pharmacy/purchase-items/${purchaseItemId}/tpa`, input),
    onSuccess: (_d, { purchaseItemId }) => qc.invalidateQueries({ queryKey: ['batch-tpa', purchaseItemId] }),
  });
}
export function useUpdatePharmacyBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PharmacyBillUpdateInput }) =>
      api.patch<InvoiceDto>(`/pharmacy/bills/${id}`, input),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoice', inv.id] });
    },
  });
}
export function useDeletePharmacyBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/pharmacy/bills/${id}`),
    // Medicines too: voiding a bill puts the dispensed stock back on the shelf.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['medicines'] });
    },
  });
}
export function useDeletePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/pharmacy/purchases/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medicine-purchases'] });
      qc.invalidateQueries({ queryKey: ['medicines'] });
    },
  });
}
export function usePharmacyNextBillNo(enabled: boolean, patientId?: string) {
  return useQuery({
    queryKey: ['pharmacy-next-bill-no', patientId ?? null],
    queryFn: () =>
      api.get<PharmacyNextBillNoDto>(
        `/pharmacy/bills/next-no${patientId ? `?patientId=${encodeURIComponent(patientId)}` : ''}`,
      ),
    enabled,
    staleTime: 0,
  });
}

export function useGeneratePharmacyBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PharmacyBillInput) => api.post<InvoiceDto>('/pharmacy/bills', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medicines'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
export function usePharmaSuppliers(params: Partial<ListQuery> = {}) {
  return useQuery({
    queryKey: ['pharma-suppliers', params],
    queryFn: () => api.get<Paginated<PharmaSupplierDto>>(`/pharmacy/suppliers?${qs({ size: 100, ...params })}`),
  });
}
export function useCreatePharmaSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PharmaSupplierInput) => api.post<PharmaSupplierDto>('/pharmacy/suppliers', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharma-suppliers'] }),
  });
}
export function useUpdatePharmaSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PharmaSupplierInput }) =>
      api.patch<PharmaSupplierDto>(`/pharmacy/suppliers/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharma-suppliers'] }),
  });
}
export function useDeletePharmaSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/pharmacy/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharma-suppliers'] }),
  });
}
export function useMedicineDosages(params: Partial<ListQuery> = {}) {
  return useQuery({
    queryKey: ['medicine-dosages', params],
    queryFn: () => api.get<Paginated<MedicineDosageDto>>(`/pharmacy/dosages?${qs({ size: 100, ...params })}`),
  });
}
export function useCreateMedicineDosage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MedicineDosageInput) => api.post<MedicineDosageDto>('/pharmacy/dosages', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicine-dosages'] }),
  });
}
export function useUpdateMedicineDosage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MedicineDosageInput }) =>
      api.patch<MedicineDosageDto>(`/pharmacy/dosages/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicine-dosages'] }),
  });
}
export function useDeleteMedicineDosage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/pharmacy/dosages/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicine-dosages'] }),
  });
}

// ── Diagnostics (pathology / radiology) ──────────────────────
export function useDiagnosticTests(modality: Modality, params: Partial<ListQuery>) {
  return useQuery({
    queryKey: ['diag-tests', modality, params],
    queryFn: () => api.get<Paginated<DiagnosticTestDto>>(`/${modality}/tests?${qs(params)}`),
  });
}
export function useDiagnosticTest(modality: Modality, id: string | null) {
  return useQuery({
    queryKey: ['diag-tests', modality, 'detail', id],
    queryFn: () => api.get<DiagnosticTestDto>(`/${modality}/tests/${id}`),
    enabled: !!id,
  });
}
export function usePreviousReports(modality: Modality, patientId: string | null) {
  return useQuery({
    queryKey: [modality, 'previous-reports', patientId],
    queryFn: () => api.get<PreviousReportRow[]>(`/${modality}/previous-reports?patientId=${patientId}`),
    enabled: !!patientId,
  });
}
export function useCreateDiagnosticTest(modality: Modality) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DiagnosticTestInput) => api.post<DiagnosticTestDto>(`/${modality}/tests`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diag-tests', modality] }),
  });
}
export function useGenerateDiagnosticBill(modality: Modality) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DiagnosticBillInput) => api.post<InvoiceDto>(`/${modality}/bills`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}
export function useUpdateDiagnosticTest(modality: Modality) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DiagnosticTestInput }) =>
      api.patch<DiagnosticTestDto>(`/${modality}/tests/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diag-tests', modality] }),
  });
}
export function useDeleteDiagnosticTest(modality: Modality) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/${modality}/tests/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diag-tests', modality] }),
  });
}

/** Preview the next bill number for the Generate Bill header. Never persisted. */
export function useNextBillNo(modality: Modality, enabled: boolean, patientId?: string) {
  return useQuery({
    queryKey: ['diag-next-bill-no', modality, patientId ?? null],
    queryFn: () =>
      api.get<NextBillNoDto>(
        `/${modality}/bills/next-no${patientId ? `?patientId=${encodeURIComponent(patientId)}` : ''}`,
      ),
    enabled,
    // Always refetch when the form opens: another user may have consumed it.
    staleTime: 0,
  });
}

export function useUpdateDiagnosticBill(modality: Modality) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DiagnosticBillUpdateInput }) =>
      api.patch<InvoiceDto>(`/${modality}/bills/${id}`, input),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoice', inv.id] });
    },
  });
}

export function useDeleteDiagnosticBill(modality: Modality) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/${modality}/bills/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

export function useDiagnosticCategories(modality: Modality, params: Partial<ListQuery> = {}) {
  return useQuery({
    queryKey: ['diag-categories', modality, params],
    queryFn: () => api.get<Paginated<DiagnosticCategoryDto>>(`/${modality}/categories?${qs({ size: 100, ...params })}`),
  });
}
export function useCreateDiagnosticCategory(modality: Modality) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DiagnosticCategoryInput) => api.post<DiagnosticCategoryDto>(`/${modality}/categories`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diag-categories', modality] }),
  });
}
export function useUpdateDiagnosticCategory(modality: Modality) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DiagnosticCategoryInput }) =>
      api.patch<DiagnosticCategoryDto>(`/${modality}/categories/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diag-categories', modality] }),
  });
}
export function useDeleteDiagnosticCategory(modality: Modality) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/${modality}/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diag-categories', modality] }),
  });
}

export function useDiagnosticUnits(modality: Modality, params: Partial<ListQuery> = {}) {
  return useQuery({
    queryKey: ['diag-units', modality, params],
    queryFn: () => api.get<Paginated<DiagnosticUnitDto>>(`/${modality}/units?${qs({ size: 100, ...params })}`),
  });
}
export function useCreateDiagnosticUnit(modality: Modality) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DiagnosticUnitInput) => api.post<DiagnosticUnitDto>(`/${modality}/units`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diag-units', modality] }),
  });
}
export function useUpdateDiagnosticUnit(modality: Modality) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DiagnosticUnitInput }) =>
      api.patch<DiagnosticUnitDto>(`/${modality}/units/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diag-units', modality] }),
  });
}
export function useDeleteDiagnosticUnit(modality: Modality) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/${modality}/units/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diag-units', modality] }),
  });
}

// ── Blood Bank ───────────────────────────────────────────────
export function useBloodProducts(params: Partial<ListQuery> = {}) {
  return useQuery({
    queryKey: ['blood-products', params],
    queryFn: () => api.get<Paginated<BloodProductDto>>(`/blood-bank/products?${qs(params)}`),
  });
}
export function useCreateBloodProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BloodProductInput) => api.post<BloodProductDto>('/blood-bank/products', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blood-products'] }),
  });
}
export function useUpdateBloodProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BloodProductInput }) => api.patch<BloodProductDto>(`/blood-bank/products/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blood-products'] }),
  });
}
export function useDeleteBloodProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/blood-bank/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blood-products'] }),
  });
}

// Donors
export function useBloodDonors(params: Partial<ListQuery> = {}) {
  return useQuery({
    queryKey: ['blood-donors', params],
    queryFn: () => api.get<Paginated<BloodDonorDto>>(`/blood-bank/donors?${qs(params)}`),
  });
}
export function useBloodDonor(id: string | null) {
  return useQuery({
    queryKey: ['blood-donors', 'detail', id],
    queryFn: () => api.get<BloodDonorDto & { bags: BloodBagDto[] }>(`/blood-bank/donors/${id}`),
    enabled: !!id,
  });
}
export function useCreateBloodDonor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BloodDonorInput) => api.post<BloodDonorDto>('/blood-bank/donors', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blood-donors'] }),
  });
}
export function useUpdateBloodDonor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BloodDonorInput }) => api.patch<BloodDonorDto>(`/blood-bank/donors/${id}`, input),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['blood-donors'] });
      qc.invalidateQueries({ queryKey: ['blood-donors', 'detail', id] });
    },
  });
}
export function useDeleteBloodDonor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/blood-bank/donors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blood-donors'] }),
  });
}

// Bags (whole blood + components share one table)
export type BloodBagListParams = Partial<ListQuery> & {
  kind?: 'blood' | 'component';
  bloodGroup?: string;
  status?: string;
};
export function useBloodBags(params: BloodBagListParams = {}) {
  return useQuery({
    queryKey: ['blood-bags', params],
    queryFn: () => api.get<Paginated<BloodBagDto>>(`/blood-bank/bags?${qs(params)}`),
  });
}
export function useBloodBagStatus() {
  return useQuery({
    queryKey: ['blood-bags', 'status'],
    queryFn: () => api.get<{ blood: { bloodGroup: string; count: number }[]; components: { bloodGroup: string; component: string; count: number }[] }>('/blood-bank/bags/status'),
  });
}
export function useCreateBloodBag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BloodBagInput) => api.post<BloodBagDto>('/blood-bank/bags', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blood-bags'] });
      qc.invalidateQueries({ queryKey: ['blood-donors'] });
    },
  });
}
export function useSplitBloodComponents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BloodComponentSplitInput) => api.post<BloodBagDto[]>('/blood-bank/components', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blood-bags'] }),
  });
}

// Issues (blood / component)
export type BloodIssueListParams = Partial<ListQuery> & {
  type?: 'blood' | 'component';
};
export function useBloodIssues(params: BloodIssueListParams = {}) {
  return useQuery({
    queryKey: ['blood-issues', params],
    queryFn: () => api.get<Paginated<BloodIssueDto>>(`/blood-bank/issues?${qs(params)}`),
  });
}
export function useBloodIssue(id: string | null) {
  return useQuery({
    queryKey: ['blood-issues', 'detail', id],
    queryFn: () => api.get<BloodIssueDto>(`/blood-bank/issues/${id}`),
    enabled: !!id,
  });
}
export function useIssueBlood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BloodIssueInput) => api.post<BloodIssueDto>('/blood-bank/issues', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blood-bags'] });
      qc.invalidateQueries({ queryKey: ['blood-issues'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
export function useUpdateBloodIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BloodIssueUpdateInput }) =>
      api.patch<BloodIssueDto>(`/blood-bank/issues/${id}`, input),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['blood-issues'] });
      qc.invalidateQueries({ queryKey: ['blood-issues', 'detail', id] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
export function useDeleteBloodIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/blood-bank/issues/${id}`),
    // Bag status too: voiding an issue hands the bag back to stock, so the
    // status board and bag lists are stale the moment this succeeds.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blood-issues'] });
      qc.invalidateQueries({ queryKey: ['blood-bags'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
export function useDeleteBloodBag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/blood-bank/bags/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blood-bags'] }),
  });
}
export function useNextBloodIssueNo(enabled: boolean, patientId?: string) {
  return useQuery({
    queryKey: ['blood-issue-next-no', patientId ?? null],
    queryFn: () =>
      api.get<BloodIssueNextNoDto>(
        `/blood-bank/issues/next-no${patientId ? `?patientId=${encodeURIComponent(patientId)}` : ''}`,
      ),
    enabled,
    staleTime: 0,
  });
}
