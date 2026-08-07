import {
  consultantScope,
  doctorScope,
  patientScope,
  restrictionApplies,
} from './doctor-restriction';
import type { RequestUser } from '../common/types/request-user';

/**
 * Doctor Restriction Mode fails silently in the direction that matters: a
 * scope fragment that comes back empty widens a query to the whole hospital,
 * and the screen still renders perfectly. So the empty case is asserted as
 * carefully as the scoped one.
 */
const as = (roleSlug: string, id = 'u1') => ({ id, roleSlug }) as unknown as RequestUser;

describe('doctor restriction', () => {
  describe('who it applies to', () => {
    it('applies to a doctor when the setting is on', () => {
      expect(restrictionApplies(as('doctor'), true)).toBe(true);
    });

    it('does not apply when the setting is off', () => {
      expect(restrictionApplies(as('doctor'), false)).toBe(false);
    });

    it('never applies to non-doctors, even with the setting on', () => {
      // It scopes a clinician's working list; it is not a way to hide data
      // from the people who run the hospital.
      for (const role of ['super_admin', 'admin', 'nurse', 'receptionist', 'accountant']) {
        expect(restrictionApplies(as(role), true)).toBe(false);
      }
    });

    it('does not apply with no user', () => {
      expect(restrictionApplies(undefined, true)).toBe(false);
    });
  });

  describe('scope fragments', () => {
    it('scopes OPD and IPD to the signed-in consultant', () => {
      expect(consultantScope(as('doctor', 'doc-7'), true)).toEqual({ consultantId: 'doc-7' });
    });

    it('scopes appointments to the signed-in doctor', () => {
      expect(doctorScope(as('doctor', 'doc-7'), true)).toEqual({ doctorId: 'doc-7' });
    });

    it('returns an EMPTY fragment when the rule is off, so callers can spread unconditionally', () => {
      // If this ever returned something truthy-but-wrong, every list would
      // silently filter to nothing — the opposite failure, equally invisible.
      expect(consultantScope(as('doctor'), false)).toEqual({});
      expect(doctorScope(as('admin'), true)).toEqual({});
      expect(patientScope(as('nurse'), true)).toEqual({});
    });

    it('scopes patients to anyone the doctor has an encounter or appointment with', () => {
      expect(patientScope(as('doctor', 'doc-7'), true)).toEqual({
        OR: [
          { opdVisits: { some: { consultantId: 'doc-7' } } },
          { ipdAdmissions: { some: { consultantId: 'doc-7' } } },
          { appointments: { some: { doctorId: 'doc-7' } } },
        ],
      });
    });

    it('uses the signed-in id, never a caller-supplied one', () => {
      // The id comes off the verified token; a doctor must not be able to
      // scope to a colleague by passing an id.
      const a = consultantScope(as('doctor', 'doc-a'), true);
      const b = consultantScope(as('doctor', 'doc-b'), true);
      expect(a).not.toEqual(b);
    });
  });
});
