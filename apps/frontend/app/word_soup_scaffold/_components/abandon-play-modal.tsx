type Props = {
  onStay: () => void;
  onLeave: () => void;
  isLeaving: boolean;
};

export default function AbandonPlayModal({ onStay, onLeave, isLeaving }: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-xl font-bold">Leave this game?</h2>
        <p className="text-gray-700 text-sm leading-relaxed">
          If you leave now, your play session will end immediately. You will{' '}
          <strong>not</strong> be able to join again — a parent must start a new
          session for you.
        </p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onStay}
            disabled={isLeaving}
            className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-800 font-medium py-2 rounded transition-colors"
          >
            Stay in game
          </button>
          <button
            onClick={onLeave}
            disabled={isLeaving}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium py-2 rounded transition-colors"
          >
            {isLeaving ? 'Leaving…' : 'Leave game'}
          </button>
        </div>
      </div>
    </div>
  );
}
