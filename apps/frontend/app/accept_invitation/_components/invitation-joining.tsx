'use client';

interface IInvitationJoiningProps {
  groupName: string;
}

const containerClass = "min-h-screen bg-emerald-200";
const innerClass = "max-w-md mx-auto p-4";

export default function InvitationJoining({ groupName }: IInvitationJoiningProps) {
  return (
    <div className={containerClass}>
      <div className={innerClass}>
        <p className="text-gray-600 text-center mt-12">Joining {groupName}...</p>
      </div>
    </div>
  );
}