'use client';

/*
  renders a Promote to Admin button, opens a list of all members of current group in a modal
  admins are greyed out and not selectable, members are selectable
  clicking a members row toggles that member's id in selectedIds
  clicking'Promote' POSTs /groups/promote for each selected id in parallel via Promise.all
  then calls syncAndRefresh to update parent's state
  selection modal closes. Result modal opens and displays summary of promotion
  if nothing was selected, it skips fetch and shows "no members selected" message
*/

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { Member } from '../../types';
import { Button, Dialog, Modal } from '../../components/ui';

type Props = {
  currentGroupMembers: Member[];
  syncAndRefresh: () => Promise<void>;
};

export default function PromoteToAdmin({
  currentGroupMembers,
  syncAndRefresh,
}: Props) {
  const t = useTranslations('group');
  const tCommon = useTranslations('common');
  const { group, user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [resultMessage, setResultMessage] = useState('');
  const [showResult, setShowResult] = useState(false);

  if (!group || !user) return null;

  const nonAdmins = currentGroupMembers.filter((m) => !m.isAdmin);
  const admins = currentGroupMembers.filter((m) => m.isAdmin);

  const handleOpen = () => {
    setSelectedIds([]);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setSelectedIds([]);
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setResultMessage('');
  };

  const toggleSelect = (memberId: number) => {
    setSelectedIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const handlePromote = async () => {
    if (selectedIds.length === 0) {
      setShowModal(false);
      setResultMessage(t('promote.noSelection'));
      setShowResult(true);
      return;
    }
    try {
      await Promise.all(
        selectedIds.map((userId) =>
          groupsApi.promote({ groupId: group.id, userId, authorId: user.id }),
        ),
      );

      const promotedNames = currentGroupMembers
        .filter((m) => selectedIds.includes(m.id))
        .map((m) => m.name);

      const message =
        promotedNames.length === 1
          ? t('promote.successOne', {
              name: promotedNames[0],
              groupName: group.name,
            })
          : t('promote.successMany', {
              names:
                promotedNames.slice(0, -1).join(', ') +
                ` ${tCommon('and')} ` +
                promotedNames[promotedNames.length - 1],
              groupName: group.name,
            });

      await syncAndRefresh();
      setShowModal(false);
      setResultMessage(message);
      setShowResult(true);
    } catch (error) {
      console.error('Promotion failed:', error);
      setShowModal(false);
      setResultMessage(t('promote.failed'));
      setShowResult(true);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="accent"
        fullWidth
        className="clay-action-btn"
      >
        {t('promoteToAdmin')}
      </Button>

      <Dialog
        open={showModal}
        onClose={handleClose}
        title={t('promote.title')}
        scrollable
        footer={
          <div className="flex gap-3 justify-end shrink-0 border-t border-border pt-4">
            <Button variant="ghost" onClick={handleClose}>
              {tCommon('cancel')}
            </Button>
            <Button variant="accent" onClick={handlePromote}>
              {t('promote.promoteButton')}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground mb-4">
          {t('promote.selectMembers')}
        </p>
        <ul>
          {admins.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between py-2 border-b border-border"
            >
              <span className="text-muted-foreground">{member.name}</span>
              <span className="text-xs text-muted-foreground">{tCommon('admin')}</span>
            </li>
          ))}
          {nonAdmins.map((member) => {
            const isSelected = selectedIds.includes(member.id);
            return (
              <li key={member.id} className="py-0.5">
                <button
                  type="button"
                  onClick={() => toggleSelect(member.id)}
                  className={
                    isSelected
                      ? 'clay-list-btn clay-list-btn-active rounded-lg'
                      : 'clay-list-btn rounded-lg'
                  }
                >
                  <span className="text-foreground">{member.name}</span>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    readOnly
                    className="w-4 h-4 accent-primary pointer-events-none"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </Dialog>

      <Modal open={showResult} onClose={handleCloseResult}>
        {resultMessage}
      </Modal>
    </>
  );
}
