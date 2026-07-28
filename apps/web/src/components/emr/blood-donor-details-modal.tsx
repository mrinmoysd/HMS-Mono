'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { BloodDonorDto } from '@smart-hospital/shared';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { SkeletonText } from '@/components/ui/skeleton';
import { useBloodDonor } from '@/lib/hooks/use-departments';
import { formatAge } from '@/lib/utils';
import { BloodBagForm } from './blood-bag-form';

/** Donor Details — header info + "Bag Stock Details" donation ledger with an Add Bag action. */
export function BloodDonorDetailsModal({ donor, open, onClose }: { donor: BloodDonorDto | null; open: boolean; onClose: () => void }) {
  const { data, isLoading } = useBloodDonor(open ? donor?.id ?? null : null);
  const [bagFormOpen, setBagFormOpen] = useState(false);

  return (
    <>
      <Modal open={open} onClose={onClose} title="Donor Details" size="xl">
        <div className="space-y-5">
          {isLoading || !data ? (
            <SkeletonText lines={8} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-3">
                <Row label="Donor Name" value={data.name} />
                <Row label="Blood Group" value={data.bloodGroup} />
                <Row label="Age" value={formatAge(data.age)} />
                <Row label="Gender" value={data.gender ?? '—'} />
                <Row label="Father Name" value={data.fatherName ?? '—'} />
                <Row label="Contact No" value={data.phone ?? '—'} />
                <Row label="Last Donation" value={data.lastDonation ? new Date(data.lastDonation).toLocaleDateString() : '—'} />
                <Row label="Address" value={data.address ?? '—'} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Bag Stock Details</h3>
                  <Button size="sm" onClick={() => setBagFormOpen(true)}>
                    <Plus className="h-4 w-4" /> Add Bag
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-md border border-line">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-surface-sunken text-left text-xs text-fg-muted">
                        <th className="px-3 py-2 font-semibold">Bag No</th>
                        <th className="px-3 py-2 font-semibold">Donate Date</th>
                        <th className="px-3 py-2 font-semibold">Volume</th>
                        <th className="px-3 py-2 font-semibold">Lot</th>
                        <th className="px-3 py-2 font-semibold">Charge Name</th>
                        <th className="px-3 py-2 text-right font-semibold">Net Amount</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.bags.length === 0 && (
                        <tr><td colSpan={7} className="px-3 py-8 text-center text-fg-muted">No bags collected yet</td></tr>
                      )}
                      {data.bags.map((b) => (
                        <tr key={b.id} className="border-b border-line/60 last:border-0">
                          <td className="px-3 py-2 font-medium">{b.bagNo}</td>
                          <td className="px-3 py-2">{b.donateDate ? new Date(b.donateDate).toLocaleDateString() : '—'}</td>
                          <td className="px-3 py-2">{b.volume ?? '—'}</td>
                          <td className="px-3 py-2">{b.lot ?? '—'}</td>
                          <td className="px-3 py-2">{b.chargeName ?? '—'}</td>
                          <td className="px-3 py-2 text-right tabular">{b.netAmount.toFixed(2)}</td>
                          <td className="px-3 py-2">
                            <Badge tone={b.status === 'available' ? 'success' : 'neutral'} size="sm">
                              {b.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Sibling, not a child: each Modal portals to <body>, and the scroll lock
          is ref-counted so closing this one keeps the donor modal locked. */}
      {donor && <BloodBagForm open={bagFormOpen} donorId={donor.id} onClose={() => setBagFormOpen(false)} />}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/50 py-1.5">
      <span className="text-fg-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
