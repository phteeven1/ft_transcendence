'use client';
import { useState, ChangeEvent, SyntheticEvent } from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';

export default function CreateGroup() {
  const { user, syncGroup } = useAuth();
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [showError, setShowError] = useState(false);

  // if no user, returns to landing page
  if (!user) {
    router.push('/');
    return null;
  }

  // is called when Submit is clicked. Tries to POST to /groups/create in backend
  // to create a new group, then syncs the group locally and redirects to /manage_group
  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:4000/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupName: groupName,
          creatorId: user.userId,
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      const result = await syncGroup(data.groupId);
      if (result) router.push('/manage_group');
    } catch (error) {
      console.error('Failed to create group:', error);
      setShowError(true);
    }
  };

  // creates layout with input field and two buttons
  return (
    <div className="min-h-screen bg-emerald-200">
      <div className="bg-emerald-200 max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Create New Group</h1>
        <p className="mb-6 text-gray-600">
          Choose a name for your new group.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="groupName" className="block mb-1">Group Name</label>
            <input
              type="text"
              id="groupName"
              name="groupName"
              value={groupName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setGroupName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter a group name"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Create Group
          </button>
        </form>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 w-full bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          Back to Dashboard
        </button>
      </div>

      {/* Error modal */}
      {showError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <p className="mb-6 text-gray-700">
              Failed to create group. Please try again.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowError(false)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}