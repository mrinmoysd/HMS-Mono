import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frontCmsSettingSchema, publicSiteIdentity } from './cms';

test('front cms setting parses an empty object', () => {
  const s = frontCmsSettingSchema.parse({});
  // The switch defaults to off: publishing to the open internet is opt-in.
  assert.equal(s.enabled, false);
  assert.equal(s.siteName, '');
  assert.equal(s.analyticsId, '');
});

test('analytics id accepts the two real formats and nothing else', () => {
  for (const id of ['', 'G-ABCD1234', 'G-4XY9ZQ01LMN', 'UA-12345-1', 'UA-123456789-12']) {
    assert.equal(frontCmsSettingSchema.parse({ analyticsId: id }).analyticsId, id);
  }
  // This value is emitted into a public page, so anything shaped unlike an
  // analytics id is refused rather than echoed.
  for (const bad of [
    '"><script>alert(1)</script>',
    'G-ABCD1234"></script><script>x()</script>',
    'javascript:alert(1)',
    'g-lowercase',
    'GTM-ABCD12',
  ]) {
    assert.throws(() => frontCmsSettingSchema.parse({ analyticsId: bad }), undefined, `should refuse: ${bad}`);
  }
});

test('identity falls back to the hospital name rather than a blank title', () => {
  const empty = publicSiteIdentity(frontCmsSettingSchema.parse({}), 'City Hospital');
  assert.equal(empty.siteName, 'City Hospital');
  assert.equal(empty.metaTitle, 'City Hospital');

  const named = publicSiteIdentity(
    frontCmsSettingSchema.parse({ siteName: 'City Care', metaTitle: 'City Care — Cardiology' }),
    'City Hospital',
  );
  assert.equal(named.siteName, 'City Care');
  assert.equal(named.metaTitle, 'City Care — Cardiology');
});

test('identity carries the social links through under stable keys', () => {
  const s = publicSiteIdentity(
    frontCmsSettingSchema.parse({ facebookUrl: 'https://fb.com/x', youtubeUrl: 'https://yt.com/y' }),
    'H',
  );
  assert.equal(s.social.facebook, 'https://fb.com/x');
  assert.equal(s.social.youtube, 'https://yt.com/y');
  assert.equal(s.social.twitter, '');
});
