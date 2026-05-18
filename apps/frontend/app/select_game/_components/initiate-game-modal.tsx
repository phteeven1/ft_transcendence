'use client';

/*
This modal is shown when a player wants to initiate a new game. 
It asks them how many players to wait for, alternatively
if they want to keep it open for any number of players and start in 5 mins.
This modal is shown to the player initiating the game
join-game-modal is shown to the other players (and this player) afterwards
*/

type WaitingOption = {
  label: string;
  value: number;
};

// static array with four labels. 0=wait for 5 mins
// value becomes waitingFor in the Game object
const WAITING_OPTIONS: WaitingOption[] = [
  { label: 'Play with anyone who joins within 5 minutes.', value: 0 },
  { label: 'Wait for one more player.', value: 1 },
  { label: 'Wait for two more players.', value: 2 },
  { label: 'Wait for three more players.', value: 3 },
];

type Props = {
  gameName: string;
  onCancel: () => void;
  onCreate: (waitingFor: number) => void;
};

export default function InitiateGameModal({ gameName, onCancel, onCreate }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold mb-1">{gameName}</h2>
        <p className="text-sm text-gray-500 mb-5">
          You are about to start a new session. How many players do you want to invite?
        </p>

        <div className="space-y-2 mb-6">
          {WAITING_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onCreate(option.value)}
              className="w-full text-left bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-sm font-medium px-4 py-3 rounded transition-colors"
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
