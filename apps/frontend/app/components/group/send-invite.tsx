'use client';
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';

const DEFAULT_INVITE_TEXT = (groupName: string) =>
  `Hi, I want to invite you to join the Dictée App, where your child can learn vocabulary lists in a fun and interactive way. Click the link below to join the learning group ${groupName} which I am also part of.`;

export default function SendInvite() {
  const { group } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [inviteText, setInviteText] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [inviteError, setInviteError] = useState('');

  if (!group) return null;

  const handleOpen = () => {
    setInviteText(DEFAULT_INVITE_TEXT(group.groupName));
    setInviteEmail('');
    setInviteStatus('idle');
    setInviteError('');
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setInviteStatus('idle');
    setInviteError('');
  };

  const handleSend = async () => {
    setInviteStatus('sending');
    setInviteError('');
    try {
      const res = await fetch('http://localhost:4000/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: group.groupId,
          groupName: group.groupName,
          toEmail: inviteEmail,
          invitationText: inviteText,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? `Server error: ${res.status}`);
      }
      setInviteStatus('success');
    } catch (error) {
      console.error('Failed to send invitation:', error);
      setInviteError(error instanceof Error ? error.message : 'Unknown error');
      setInviteStatus('error');
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded transition-colors"
      >
        Send Invite
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">Send Invitation</h2>

            {inviteStatus === 'success' ? (
              <div className="flex flex-col gap-4">
                <p className="text-green-600 font-medium">
                  Invitation successfully sent to {inviteEmail}.
                </p>
                <button
                  onClick={handleClose}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Invitation</label>
                  <textarea
                    value={inviteText}
                    onChange={e => setInviteText(e.target.value)}
                    rows={6}
                    className="w-full p-2 border border-gray-300 rounded resize-y text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="recipient@example.com"
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>

                {inviteStatus === 'error' && (
                  <p className="text-red-600 text-sm">
                    Sending invitation failed: {inviteError}
                  </p>
                )}

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleClose}
                    className="bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={inviteStatus === 'sending' || !inviteEmail}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-2 px-4 rounded transition-colors"
                  >
                    {inviteStatus === 'sending' ? 'Sending...' : 'Submit'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}