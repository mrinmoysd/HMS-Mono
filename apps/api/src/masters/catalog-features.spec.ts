import { NAME_CATALOGS } from '@smart-hospital/shared';
import { FEATURES } from '@smart-hospital/shared';
import { catalogFeature, MAPPED_CATALOGS } from './catalog-features';

describe('catalogFeature', () => {
  it('maps every catalog the API will actually serve', () => {
    // The route is /masters/:catalog and the resolver denies anything it does
    // not recognise. Adding a catalog to NAME_CATALOGS without adding it here
    // would ship a screen that 403s for everyone, including Admin.
    const unmapped = NAME_CATALOGS.filter((c) => !MAPPED_CATALOGS[c]);
    expect(unmapped).toEqual([]);
  });

  it('points every catalog at a feature key that exists', () => {
    // A typo in a key is invisible at runtime — it just denies everyone,
    // forever, because no role can hold a key that is not in the table.
    const known = new Set(FEATURES.map((f) => f.key));
    const bogus = Object.entries(MAPPED_CATALOGS).filter(([, key]) => !known.has(key));
    expect(bogus).toEqual([]);
  });

  it('asks for the action it was given', () => {
    expect(catalogFeature('department', 'delete')).toEqual({
      feature: 'human_resource.department',
      action: 'delete',
    });
  });

  it('denies an unknown catalog rather than falling through', () => {
    expect(catalogFeature('not-a-catalog', 'view')).toBeNull();
    expect(catalogFeature(undefined, 'view')).toBeNull();
  });

  it('does not let one catalog answer for another', () => {
    // The whole point of the change: these used to be one `setup` switch.
    expect(catalogFeature('charge-category', 'edit')!.feature).not.toEqual(
      catalogFeature('department', 'edit')!.feature,
    );
  });
});
