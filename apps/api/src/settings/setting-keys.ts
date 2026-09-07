/**
 * Setting keys shared across modules.
 *
 * `front_cms` is read in two places — the Settings screen that edits it, and
 * the CMS service that decides whether the public site answers at all — so the
 * string lives here rather than being typed twice. (`general` predates this
 * file and is still declared in two places; worth folding in next time either
 * is touched.)
 */
export const FRONT_CMS_SETTING_KEY = 'front_cms';
