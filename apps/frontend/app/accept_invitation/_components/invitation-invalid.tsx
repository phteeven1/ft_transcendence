'use client';

const containerClass = "min-h-screen bg-emerald-200";
const innerClass = "max-w-md mx-auto p-4";

export default function InvitationInvalid() {
  return (
    <div className={containerClass}>
      <div className={innerClass}>
        <h1 className="text-2xl font-bold mb-4 text-center">Invalid Invitation</h1>
        <p className="text-gray-600 text-center">
          This invitation link is invalid or has expired. Please ask for a new invitation.
        </p>
      </div>
    </div>
  );
}