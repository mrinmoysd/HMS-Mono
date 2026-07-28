import { z } from 'zod';

export const AMBULANCE_VEHICLE_TYPES = ['owned', 'contractual'] as const;

export const ambulanceVehicleSchema = z.object({
  vehicleNo: z.string().trim().min(1, 'Vehicle number is required'),
  model: z.string().trim().min(1, 'Vehicle model is required'),
  year: z.coerce.number().int().optional(),
  driverName: z.string().trim().optional().or(z.literal('')),
  driverLicense: z.string().trim().optional().or(z.literal('')),
  driverContact: z.string().trim().optional().or(z.literal('')),
  vehicleType: z.enum(AMBULANCE_VEHICLE_TYPES, { message: 'Vehicle type is required' }),
  note: z.string().trim().optional().or(z.literal('')),
});
export type AmbulanceVehicleInput = z.infer<typeof ambulanceVehicleSchema>;

export interface AmbulanceVehicleDto {
  id: string;
  vehicleNo: string;
  model: string | null;
  year: number | null;
  driverName: string | null;
  driverLicense: string | null;
  driverContact: string | null;
  vehicleType: string | null;
  note: string | null;
}

/** Log an ambulance call and bill the fare via the shared invoice engine. */
export const ambulanceCallSchema = z.object({
  vehicleId: z.string().uuid({ message: 'Vehicle is required' }),
  patientId: z.string().uuid({ message: 'Patient is required' }),
  patientAddress: z.string().trim().optional().or(z.literal('')),
  date: z.coerce.date(),
  chargeId: z.string().uuid({ message: 'Charge is required' }),
  standardCharge: z.coerce.number().min(0),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  taxPct: z.coerce.number().min(0).max(100).default(0),
  note: z.string().trim().optional().or(z.literal('')),
  payment: z
    .object({ amount: z.coerce.number().min(0).default(0), mode: z.string().default('cash') })
    .optional(),
});
export type AmbulanceCallInput = z.infer<typeof ambulanceCallSchema>;

/** Full bill row for an ambulance call — joins AmbulanceCall + Vehicle + Invoice. */
export interface AmbulanceCallDto {
  id: string;
  invoiceId: string;
  billNo: string;
  caseNo: string | null;
  patientId: string;
  patientName: string;
  patientNo: string | null;
  patientAddress: string | null;
  vehicleId: string;
  vehicleNo: string;
  vehicleModel: string | null;
  driverName: string | null;
  driverContact: string | null;
  chargeId: string | null;
  chargeName: string | null;
  chargeCategoryName: string | null;
  standardCharge: number;
  note: string | null;
  date: string;
  subtotal: number;
  discount: number;
  tax: number;
  netAmount: number;
  paid: number;
  balance: number;
  createdByName: string | null;
}
