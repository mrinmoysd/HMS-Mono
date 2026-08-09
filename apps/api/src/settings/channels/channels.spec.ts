import { CHANNELS, providersFor, type Channel } from '@smart-hospital/shared';
import { SENDERS, senderFor } from './providers';

/**
 * The shared registry says which providers claim to deliver; `SENDERS` decides
 * which ones actually can. If those two disagree, the product either offers a
 * gateway that silently drops everything, or hides one that works — so they are
 * pinned to each other here rather than kept in step by hand.
 */
describe('channel provider registry', () => {
  it('has a sender for every provider that is not marked coming soon', () => {
    for (const channel of CHANNELS) {
      for (const p of providersFor(channel)) {
        if (p.comingSoon) continue;
        expect(senderFor(channel, p.key)).toBeDefined();
      }
    }
  });

  it('has no sender for a provider marked coming soon', () => {
    for (const channel of CHANNELS) {
      for (const p of providersFor(channel)) {
        if (!p.comingSoon) continue;
        expect(senderFor(channel, p.key)).toBeUndefined();
      }
    }
  });

  it('defines no sender for a provider the registry does not list', () => {
    for (const channel of CHANNELS) {
      const known = new Set(providersFor(channel).map((p) => p.key));
      for (const key of Object.keys(SENDERS[channel])) {
        expect(known.has(key)).toBe(true);
      }
    }
  });

  it('covers exactly the declared channels', () => {
    expect(Object.keys(SENDERS).sort()).toEqual([...CHANNELS].sort());
  });

  it('reports an unknown provider as having no sender', () => {
    expect(senderFor('sms' as Channel, 'carrier_pigeon')).toBeUndefined();
  });
});
