import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  branchId: z.string().uuid().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  type: 'staff' | 'patient';
  roleSlug: string;
  roleLabel: string;
  branchId: string;
  permissions: string[];
  /**
   * FeaturePermissionKey[] — the precise grants, e.g. "patient.patient:add".
   * Optional so an older client (or an older API) still parses. The web gates
   * on these where a module has been migrated in R1; Ability falls back to the
   * module keys when the list is absent.
   */
  features?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}
