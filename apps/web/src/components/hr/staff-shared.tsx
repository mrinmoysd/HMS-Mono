'use client';

/** Role → badge colour, matching the demo's coloured role chips. */
export function roleBadgeClass(slug: string): string {
  switch (slug) {
    case 'super_admin':
    case 'admin':
      return 'bg-danger/10 text-danger';
    case 'doctor':
      return 'bg-success/10 text-success';
    case 'nurse':
      return 'bg-primary/10 text-primary';
    case 'pharmacist':
      return 'bg-warning/10 text-warning';
    default:
      return 'bg-border/60 text-fg-muted';
  }
}

/** Round staff avatar with initials fallback. */
export function StaffAvatar({ photoUrl, name, size = 'md' }: { photoUrl: string | null; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-24 w-24 text-2xl' : size === 'sm' ? 'h-10 w-10 text-sm' : 'h-16 w-16 text-lg';
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt={name} className={`${dim} rounded-full object-cover`} />;
  }
  return (
    <div className={`${dim} flex items-center justify-center rounded-full bg-primary/10 font-semibold text-primary`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
