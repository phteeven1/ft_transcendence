import { Suspense } from 'react';
import AcceptInvitationClient from './accept-invitation-client';
import InvitationValidating from './_components/invitation-validating';

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<InvitationValidating />}>
      <AcceptInvitationClient />
    </Suspense>
  );
}
