'use client';

interface IInvitationConfirmProps {
  groupName: string;
  onJoin: () => void;
  onDecline: () => void;
}

const containerClass = "min-h-screen bg-emerald-200";
const innerClass = "max-w-md mx-auto p-4";

export default function InvitationConfirm({
  groupName,
  onJoin,
  onDecline,
}: IInvitationConfirmProps) {
  return (
    <div className={containerClass}>
      <div className={innerClass}>
        <h1 className="text-2xl font-bold mb-4 text-center">Join {groupName}?</h1>
        <p className="mb-8 text-gray-600 text-center">
          Would you like to join the learning group {groupName}?
        </p>
        <div className="flex gap-4">
          <button
            onClick={onDecline}
            className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-medium py-3 px-4 rounded transition-colors"
          >
            No thanks
          </button>
          <button
            onClick={onJoin}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded transition-colors"
          >
            Join Group
          </button>
        </div>
      </div>
    </div>
  );
}