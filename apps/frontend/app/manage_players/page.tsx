import { redirect } from 'next/navigation';

export default function ManagePlayersPage() {
  redirect('/manage_group?tab=players');
}
