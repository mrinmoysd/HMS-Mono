import { SetMetadata } from '@nestjs/common';

export const NO_PERMISSION_KEY = 'no_permission_required';

/**
 * "Being signed in is the whole check."
 *
 * There is a real category of endpoint that needs authentication and no
 * permission: reading your own profile, changing your own password, the static
 * nav metadata, the patient portal (which enforces its own boundary in
 * PortalService.requirePatient), and the reports catalogue (which filters its
 * response rather than gating it).
 *
 * Before R3 those endpoints carried no decorator, and neither did the ones that
 * had simply been forgotten — the guard failed open, so the two were
 * indistinguishable both to the reader and to the runtime. This decorator makes
 * the deliberate case say so. The guard now denies anything unmarked, so a
 * forgotten endpoint fails loudly instead of quietly admitting everyone.
 *
 * Adding this to a handler is a security decision. It should be as visible in
 * review as @RequireFeature is, and it is greppable:
 *
 *   grep -rn '@Authenticated()' apps/api/src
 */
export const Authenticated = () => SetMetadata(NO_PERMISSION_KEY, true);
