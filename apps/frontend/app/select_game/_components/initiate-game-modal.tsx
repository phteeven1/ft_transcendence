'use client';
/*
Simple confirmation modal asking the player if they want to initiate a new game.
waitingFor is always 0 (open lobby, starts after 5 minutes or when force-started).
Players join via the pending game button, and the initiator can force-start at any time.
*/

type Props = {
  gameName: string;
  onCancel: () => void;
  onCreate: () => void;
};

export default function InitiateGameModal({ gameName, onCancel, onCreate }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold mb-1">{gameName}</h2>
        <p className="text-sm text-gray-500 mb-6">
          Do you want to start a new session? Others in your group can join before it begins.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 rounded transition-colors"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}