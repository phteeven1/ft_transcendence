'use client';

import { useTranslations } from 'next-intl';
import { Member } from '../../types';
import { ListButton, Panel } from '../../components/ui';

type Props = {
  members: Member[];
  selectedMember: Member | null;
  onSelect: (member: Member) => void;
};

export default function MemberList({ members, selectedMember, onSelect }: Props) {
  const t = useTranslations('group');
  const tCommon = useTranslations('common');

  return (
    <Panel className="overflow-y-auto max-h-64 md:max-h-full md:h-full p-0">
      <ul className="list-none m-0 p-0">
      <li className="border-b border-border bg-muted px-3 py-2">
        <span className="font-heading text-lg font-semibold text-foreground">{t('members')}</span>
      </li>
      {members.map((member) => {
        const isSelected = selectedMember?.id === member.id;
        return (
          <li key={member.id} className="border-b border-border last:border-b-0 px-1 py-0.5">
            <ListButton active={isSelected} onClick={() => onSelect(member)}>
              <span className="text-foreground">{member.name}</span>
              <span className={`text-xs ${isSelected ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                {member.isAdmin ? tCommon('admin') : tCommon('member')}
              </span>
            </ListButton>
          </li>
        );
      })}
      </ul>
    </Panel>
  );
}
