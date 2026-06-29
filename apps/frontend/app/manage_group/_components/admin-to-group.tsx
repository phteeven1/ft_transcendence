'use client';
/*
  Message Group button — visible to admins only.
  Allows an admin to send a GEN message to all admins and members in the group.
  Message is limited to 300 characters.
*/
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { chatApi } from '@/lib/api/chat';

const MAX_CHARS = 300;

type Props = {
  syncAndRefresh: () => Promise<void>;
};

export default function AdminToGroup({ syncAndRefresh }: Props) {
  const { group, user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage]     = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!group || !user) return null;

  const handleOpen = () => {
    setMessage('');
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setMessage('');
  };

  const handleConfirm = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    try {
      await chatApi.postMessage({
        groupId:  group.id,
        authorId: user.id,
        type:     'GEN',
        content:  message.trim(),
      });
      await syncAndRefresh();
      handleClose();
    } catch (error) {
      console.error('AdminToGroup failed:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="bg-purple-400 hover:bg-purple-500 text-white font-medium py-3 px-4 rounded transition-colors"
      >
        Message Group
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-2">Message Group</h2>
            <p className="text-sm text-gray-600 mb-4">
              Write a message to all admins and members of group{' '}
              <span className="font-semibold">{group.name}</span>.
              It will appear in the Group Chat, visible to everyone in the group.
            </p>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
              rows={4}
              autoFocus
              placeholder="Your message…"
              className="w-full p-2 border border-gray-300 rounded resize-none text-sm mb-1"
            />
            <p className="text-xs text-gray-400 text-right mb-4">
              {message.length} / {MAX_CHARS}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleClose}
                className="bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!message.trim() || isSending}
                className="bg-purple-400 hover:bg-purple-500 disabled:bg-purple-200 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                {isSending ? 'Sending…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
