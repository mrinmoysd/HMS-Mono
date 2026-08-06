'use client';

import { Barcode } from './barcode';
import { QrCode } from './qr-code';
import { hospitalSettings } from '@/lib/hospital-settings';

/**
 * A scannable code in whichever form the hospital uses.
 *
 * Setup ▸ Settings ▸ General offers Barcode or QR Code, and before this the
 * choice was stored and ignored — every header rendered Code 39 regardless. A
 * hospital whose scanners only read QR would have had a setting that said QR
 * and four screens that printed barcodes.
 */
export function ScanCode({
  value,
  height = 40,
  className,
}: {
  value: string;
  height?: number;
  className?: string;
}) {
  if (hospitalSettings().scanType === 'qr') {
    return <QrCode value={value} size={height + 16} className={className} />;
  }
  return <Barcode value={value} height={height} className={className} />;
}
