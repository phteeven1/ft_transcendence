'use client';

// Expel Member button drives a three step modal flow.
// 1. showModal: Shows all group members - admins greyed out - and allows user to select.
//    'Expel' button stays disabled until a selection is made. Clicking 'Expel' closes modal.
// 2. showConfirm: Asks user to confirm expelling the selected members.
//    'Back' returns to showModal, 'Expel' calls handleConfirmExpel, which POSTs to /groups/expel
//    with id's of group and selected members. On success, it calls syncAndRefresh to update.
// 3. showResult: shows either successful result or error message. 'OK' button to close.

import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { Member } from '../../types';
import { Button, Dialog, Modal } from '../../components/ui';

// defines shape of props that ExpelMember must receive from parent
type Props = {
  currentGroupMembers: Member[];
  syncAndRefresh: () => Promise<void>;
};

export default function ExpelMember({
  currentGroupMembers,
  syncAndRefresh,
}: Props) {
  const { group, user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [showResult, setShowResult] = useState(false);

  // Guard. Returns null if no group
  if (!group || !user) return null;

  const nonAdmins = currentGroupMembers.filter((m) => !m.isAdmin);
  const admins = currentGroupMembers.filter((m) => m.isAdmin);

  const selectedMember =
    currentGroupMembers.find((m) => m.id === selectedId) ?? null;

  // resets selectedId to null and opens selection modal.
  const handleOpen = () => {
    setSelectedId(null);
    setShowModal(true);
  };

  // hides the selection modal and resets selectedId to null
  const handleClose = () => {
    setShowModal(false);
    setSelectedId(null);
  };

  // hides the result modal and clears the result message
  const handleCloseResult = () => {
    setShowResult(false);
    setResultMessage('');
  };

  // toggles the selection of a member. Already selected -> unselected -> selected
  const handleSelect = (memberId: number) => {
    setSelectedId((prev) => (prev === memberId ? null : memberId));
  };

  // guards against no selection, then closes selection modal and opens confirmation modal
  const handleExpelClick = () => {
    if (!selectedId) return;
    setShowModal(false);
    setShowConfirm(true);
  };

  // is called when 'Expel' is clicked in confirmation modal. Guards against no selected group or member
  // POSTS to /groups/expel with group id and
  const handleConfirmExpel = async () => {
    if (!selectedId || !selectedMember) return;
    try {
      await groupsApi.expel({ groupId: group.id, userId: selectedId, authorId: user.id });
      await syncAndRefresh();
      setShowConfirm(false);
      setSelectedId(null);
      setResultMessage(
        `${selectedMember.name} has been expelled from ${group.name}.`,
      );
      setShowResult(true);
    } catch (error) {
      console.error('Expel failed:', error);
      setShowConfirm(false);
      setResultMessage('Something went wrong. Please try again.');
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
        Expel Member
      </Button>

      <Dialog
        open={showModal}
        onClose={handleClose}
        title="Expel Member"
        scrollable
        footer={
          <div className="flex gap-3 justify-end shrink-0 border-t border-border pt-4">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleExpelClick}
              disabled={!selectedId}
            >
              Expel
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground mb-4">
          Select a member to expel.
        </p>
        <ul>
          {admins.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between py-2 border-b border-border"
            >
              <span className="text-muted-foreground">{member.name}</span>
              <span className="text-xs text-muted-foreground">Admin</span>
            </li>
          ))}
          {nonAdmins.map((member) => {
            const isSelected = selectedId === member.id;
            return (
              <li key={member.id} className="py-0.5">
                <button
                  type="button"
                  onClick={() => handleSelect(member.id)}
                  className={
                    isSelected
                      ? 'clay-list-btn clay-list-btn-active rounded-lg'
                      : 'clay-list-btn rounded-lg'
                  }
                >
                  <span className="text-foreground">{member.name}</span>
                  <input
                    type="radio"
                    checked={isSelected}
                    onChange={() => {}}
                    readOnly
                    className="w-4 h-4 accent-destructive pointer-events-none"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </Dialog>

      <Dialog
        open={showConfirm && !!selectedMember}
        onClose={() => {
          setShowConfirm(false);
          setShowModal(true);
        }}
        title="Are you sure?"
        cancelLabel="Back"
        confirmLabel="Expel"
        onConfirm={handleConfirmExpel}
        confirmVariant="destructive"
        cancelVariant="ghost"
      >
        This will expel{' '}
        <span className="font-semibold text-foreground">{selectedMember?.name}</span> from{' '}
        <span className="font-semibold text-foreground">{group.name}</span>. This cannot
        be undone.
      </Dialog>

      <Modal open={showResult} onClose={handleCloseResult}>
        {resultMessage}
      </Modal>
    </>
  );
}
