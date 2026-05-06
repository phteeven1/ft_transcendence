import { Member } from '../../types';

type Props = {
  members: Member[];
};

export default function MemberList({ members }: Props) {
  return (
    <ul className="overflow-y-auto max-h-64 md:max-h-full md:h-full border border-emerald-300 rounded">
      {members.map(member => (
        <li
          key={member.memberId}
          className="flex items-center justify-between px-3 py-2 border-b border-emerald-300 last:border-b-0"
        >
          <span>{member.memberName}</span>
          <span className="text-xs text-gray-500">
            {member.isAdmin ? 'Admin' : 'Member'}
          </span>
        </li>
      ))}
    </ul>
  );
}