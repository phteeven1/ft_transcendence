'use client';

import { Member } from '../../types';

type Props = {
  members: Member[];
  selectedMember: Member | null;
  onSelect: (member: Member) => void;
};

export default function MemberList({ members, selectedMember, onSelect }: Props) {
  return (
    <ul className="overflow-y-auto max-h-64 md:max-h-full md:h-full border border-emerald-300 rounded">
      <li className="border-b border-emerald-300 bg-white px-3 py-2">
        <span className="text-lg font-semibold">Members</span>
      </li>
      {members.map((member) => (
        <li key={member.id} className="border-b border-emerald-300 last:border-b-0">
          <button
            onClick={() => onSelect(member)}
            className={`w-full text-left px-3 py-2 transition-colors flex items-center justify-between ${
              selectedMember?.id === member.id
                ? 'bg-blue-50 font-medium text-blue-700'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <span>{member.name}</span>
            <span className={`text-xs ${selectedMember?.id === member.id ? 'text-blue-500' : 'text-gray-500'}`}>
              {member.isAdmin ? 'Admin' : 'Member'}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}