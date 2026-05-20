'use client';

const containerClass = "min-h-screen bg-emerald-200";
const innerClass = "max-w-md mx-auto p-4";

export default function InvitationValidating() {
  return (
    <div className={containerClass}>
      <div className={innerClass}>
        <p className="text-gray-600 text-center mt-12">Validating invitation...</p>
      </div>
    </div>
  );
}