'use client';
/*
  Action window displayed at the bottom of manage_group.
  Contains tabs for switching between different panels.
  Currently: Member Profile and Group Chat.
  Tabs are designed to accommodate additional panels in the future.
  The selected member is passed down to MemberProfile.
*/
import { useState } from 'react';
import { Member } from '../../types';
import MemberProfile from './member-profile';
import GroupChat from './group-chat';
import GameSessionOverview from './game-session-overview';
import { GroupChatEntryDto } from '@/lib/api';

type Tab = 'profile' | 'chat' | 'games';

type Props = {
  selectedMember: Member | null;
  groupId:        number;
  members:        Member[];
  chatEntries:    GroupChatEntryDto[];
  isAdmin:        boolean;
};

export default function ActionWindow({ selectedMember, members, chatEntries, isAdmin }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Member Profile' },
    { id: 'chat', label: 'Group Chat' },
    { id: 'games', label: 'Game Session' },
  ];

  return (
    <div className="clay-panel overflow-hidden">
      <div className="clay-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'clay-tab clay-tab-active' : 'clay-tab'}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-3 bg-surface">
        {activeTab === 'profile' && (
          selectedMember
            ? <MemberProfile member={selectedMember} />
            : <p className="text-sm text-muted-foreground italic">Select a member to view their profile.</p>
        )}
        {activeTab === 'chat' && (
          <GroupChat members={members} chatEntries={chatEntries} isAdmin={isAdmin} />
        )}
        {activeTab === 'games' && <GameSessionOverview />}
      </div>
    </div>
  );
}
