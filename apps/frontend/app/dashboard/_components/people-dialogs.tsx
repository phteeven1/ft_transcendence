'use client';

import MemberDialog from './member-dialog';
import RenamePlayer from './rename-player';
import DeletePlayer from './delete-player';
import InviteToPlay from './invite-to-play';
import DeleteVocabulary from './delete-vocabulary';
import type { UsePeoplePanelResult } from '../_hooks/use-people-panel';

type Props = {
  panel: UsePeoplePanelResult;
};

export default function PeopleDialogs({ panel }: Props) {
  return (
    <>
      <MemberDialog
        action={panel.memberDialog}
        member={panel.actionMember}
        open={panel.memberDialog !== null}
        onClose={panel.closeMemberDialog}
        syncAndRefresh={panel.syncAndRefresh}
      />
      <RenamePlayer
        player={panel.activePlayer}
        open={panel.playerDialog === 'rename'}
        onClose={panel.closePlayerDialog}
        onRenamed={panel.handlePlayerUpdated}
      />
      <DeletePlayer
        player={panel.activePlayer}
        open={panel.playerDialog === 'delete'}
        onClose={panel.closePlayerDialog}
        onDeleted={panel.handlePlayerDeleted}
      />
      <InviteToPlay
        player={panel.activePlayer}
        open={panel.isPlayOpen}
        onClose={panel.closePlay}
      />
      <DeleteVocabulary
        vocabulary={panel.actionVocabulary}
        open={panel.vocabDialog === 'delete'}
        onClose={panel.closeVocabDialog}
        onDeleted={panel.handleVocabularyDeleted}
      />
    </>
  );
}
