'use client';
import { useState, ChangeEvent, SyntheticEvent } from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';

export default function CreateGroup() {
  const { user, setCurrentGroup } = useAuth();
  const router = useRouter();
  const [groupName, setGroupName] = useState('');

  if (!user) {
    router.push('/');
    return null;
  }

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
      setCurrentGroup(data.groupId);
      router.push('/manage_group');
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group. Please try again.');
    }
  };

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
    </div>
  );
}