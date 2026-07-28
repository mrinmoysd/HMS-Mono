'use client';

import { useState } from 'react';
import { PaymentView } from '@/components/referral/payment-view';
import { PersonView } from '@/components/referral/person-view';

export default function ReferralPage() {
  const [view, setView] = useState<'payment' | 'person'>('payment');
  if (view === 'person') return <PersonView onBack={() => setView('payment')} />;
  return <PaymentView onManagePersons={() => setView('person')} />;
}
