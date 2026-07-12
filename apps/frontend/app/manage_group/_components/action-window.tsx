'use client';
/*
  Action window displayed at the bottom of manage_group.
  Contains tabs for switching between different panels.
  Currently: Member Profile and Group Chat.
  Tabs are designed to accommodate additional panels in the future.
  The selected member is passed down to MemberProfile.
*/
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Member } from '../../types';
import MemberProfile from './member-profile';
import GroupChat from './group-chat';
import GameSessionOverview from './game-session-overview';
import { GroupChatEntryDto } from '@/lib/api';
import { Panel, Tab, TabPanel, Tabs } from '../../components/ui';

type Tab = 'profile' | 'chat' | 'games';

type Props = {
  selectedMember: Member | null;
  groupId:        number;
  members:        Member[];
  chatEntries:    GroupChatEntryDto[];
  isAdmin:        boolean;
};

export default function ActionWindow({ selectedMember, members, chatEntries, isAdmin }: Props) {
  const t = useTranslations('group');
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: t('tabs.profile') },
    { id: 'chat', label: t('tabs.chat') },
    { id: 'games', label: t('tabs.games') },
  ];

  return (
    <Panel className="overflow-hidden">
      <Tabs>
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            id={`${tab.id}-tab`}
            panelId={`${tab.id}-panel`}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Tab>
        ))}
      </Tabs>

      <TabPanel
        panelId="profile-panel"
        labelledBy="profile-tab"
        hidden={activeTab !== 'profile'}
        className="px-4 py-3 bg-surface"
      >
        {selectedMember ? (
          <MemberProfile member={selectedMember} />
        ) : (
          <p className="text-sm text-muted-foreground italic">{t('selectMemberHint')}</p>
        )}
      </TabPanel>
      <TabPanel
        panelId="chat-panel"
        labelledBy="chat-tab"
        hidden={activeTab !== 'chat'}
        className="px-4 py-3 bg-surface"
      >
        <GroupChat members={members} chatEntries={chatEntries} isAdmin={isAdmin} />
      </TabPanel>
      <TabPanel
        panelId="games-panel"
        labelledBy="games-tab"
        hidden={activeTab !== 'games'}
        className="px-4 py-3 bg-surface"
      >
        <GameSessionOverview />
      </TabPanel>
    </Panel>
  );
}
