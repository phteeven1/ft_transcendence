'use client';

interface IInvitationErrorProps {
  errorMessage: string;
  onRetry: () => void;
}

const containerClass = "min-h-screen bg-emerald-200";
const innerClass = "max-w-md mx-auto p-4";

export default function InvitationError({ errorMessage, onRetry }: IInvitationErrorProps) {
  return (
    <div className={containerClass}>
      <div className={innerClass}>
        <h1 className="text-2xl font-bold mb-4 text-center">Something went wrong</h1>
        <p className="text-red-600 text-center mb-6">{errorMessage}</p>
        <button
          onClick={onRetry}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}