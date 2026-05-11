'use client';

interface IInvitationAlreadyMemberProps {
  groupName: string;
  onGoToGroup: () => void;
}

const containerClass = "min-h-screen bg-emerald-200";
const innerClass = "max-w-md mx-auto p-4";

export default function InvitationAlreadyMember({
  groupName,
  onGoToGroup,
}: IInvitationAlreadyMemberProps) {
  return (
    <div className={containerClass}>
      <div className={innerClass}>
        <h1 className="text-2xl font-bold mb-4 text-center">Already a Member</h1>
        <p className="text-gray-600 text-center mb-8">
          You are already a member of {groupName}.
        </p>
        <button
          onClick={onGoToGroup}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          Go to Group
        </button>
      </div>
    </div>
  );
}