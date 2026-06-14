import { Member } from '../../types';

type Props = {
  member: Member;
};

export default function MemberProfile({ member }: Props) {
  return (
    <div className="border border-emerald-400 rounded-lg px-4 py-3">
      <p className="font-medium">{member.name}</p>
      <p className="text-xs text-gray-500">{member.isAdmin ? 'Admin' : 'Member'}</p>
      {/* add more member fields here as needed */}
    </div>
  );
}