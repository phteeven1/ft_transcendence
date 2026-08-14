'use client';
/*
  Action window at the bottom of manage_group.
  Tabs: member profile and game sessions.
*/
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Member } from '../../types';
import MemberProfile from './member-profile';
import GameSessionOverview from './game-session-overview';
import { Panel, Tab, TabPanel, Tabs } from '../../components/ui';

type TabId = 'profile' | 'games';

type Props = {
  selectedMember: Member | null;
};

export default function ActionWindow({ selectedMember }: Props) {
  const t = useTranslations('group');
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'profile', label: t('tabs.profile') },
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
