import { z } from 'zod';

export const bedGroupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  floorId: z.string().uuid().optional().nullable(),
  color: z.string().trim().optional().or(z.literal('')),
});
export type BedGroupInput = z.infer<typeof bedGroupSchema>;

export const bedSchema = z.object({
  bedNo: z.string().trim().min(1, 'Bed number is required'),
  bedGroupId: z.string().uuid({ message: 'Bed group is required' }),
  bedTypeId: z.string().uuid().optional().nullable(),
});
export type BedInput = z.infer<typeof bedSchema>;

export interface BedGroupDto {
  id: string;
  name: string;
  floorId: string | null;
  floorName: string | null;
  color: string | null;
  createdAt: string;
}

export interface BedDto {
  id: string;
  bedNo: string;
  bedGroupId: string;
  bedGroupName: string;
  bedTypeId: string | null;
  bedTypeName: string | null;
  status: 'available' | 'allotted';
}

/** Live occupancy grid grouped Floor → Bed Group → Bed (FRD §2.30 Bed Status). */
export interface BedStatusCell {
  id: string;
  bedNo: string;
  status: 'available' | 'allotted';
  patientName: string | null;
  ipdNo: string | null;
}
export interface BedStatusGroup {
  bedGroupId: string;
  bedGroupName: string;
  beds: BedStatusCell[];
}
export interface BedStatusFloor {
  floorId: string | null;
  floorName: string;
  groups: BedStatusGroup[];
}
export interface BedStatusSummary {
  total: number;
  available: number;
  allotted: number;
  floors: BedStatusFloor[];
}
