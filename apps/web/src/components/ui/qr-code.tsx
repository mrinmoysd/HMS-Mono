'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * QR code as an inline SVG.
 *
 * The sibling Barcode is hand-rolled because Code 39 is a lookup table. QR is
 * not: it needs Reed–Solomon error correction and mask selection, so this
 * leans on `qrcode` rather than approximating something that would scan
 * unreliably. Generated client-side — nothing is sent anywhere.
 */
export function QrCode({
  value,
  size = 88,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    QRCode.toString(value, {
      type: 'svg',
      margin: 0,
      width: size,
      // Medium correction: still scannable if the print smudges, without
      // making the modules so dense they blur at this size.
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#00000000' },
    })
      .then((s) => { if (live) setSvg(s); })
      .catch(() => { if (live) setSvg(null); });
    return () => { live = false; };
  }, [value, size]);

  if (!svg) {
    // Hold the layout so the info grid does not jump once the code resolves.
    return <div className={className} style={{ width: size, height: size }} aria-hidden />;
  }
  return (
    <div
      className={className}
      role="img"
      aria-label={`QR code for ${value}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
