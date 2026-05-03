'use client';
import { useState, useEffect, ChangeEvent, SyntheticEvent, KeyboardEvent } from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { User } from '../types';

type PageState =
  | 'validating'
  | 'invalid'
  | 'auth'
  | 'confirm'
  | 'joining'
  | 'already_member'
  | 'error';

type AuthMode = 'signin' | 'register';

export default function AcceptInvitation() {
  const { login, syncGroup, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [pageState, setPageState] = useState<PageState>('validating');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [groupId, setGroupId] = useState<number | null>(null);
  const [groupName, setGroupName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    userName: '',
    userPassword: '',
    userEmail: '',
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (!token) {
      setPageState('invalid');
      return;
    }
    validateToken();
  }, []);

  const validateToken = async () => {
    try {
      const res = await fetch(`http://localhost:4000/invitations/validate/${token}`);
      if (!res.ok) throw new Error('Failed to validate token');
      const data = await res.json();
      if (!data.valid) {
        setPageState('invalid');
        return;
      }
      const gId = data.groupId;
      setGroupId(gId);

      const groupRes = await fetch(`http://localhost:4000/groups/${gId}`);
      if (!groupRes.ok) throw new Error('Failed to fetch group');
      const group = await groupRes.json();
      setGroupName(group.groupName);
      setPageState('auth');
    } catch (error) {
      console.error('Token validation failed:', error);
      setPageState('invalid');
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  const handleAuth = async (e: SyntheticEvent) => {
    e.preventDefault();
    try {
      const url = authMode === 'signin'
        ? 'http://localhost:4000/users/signin'
        : 'http://localhost:4000/users/register';

      const body = authMode === 'signin'
        ? { userName: formData.userName, userPassword: formData.userPassword }
        : { userName: formData.userName, userPassword: formData.userPassword, userEmail: formData.userEmail };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: User = await res.json();
      login(data);
      setCurrentUser(data);
      setPageState('confirm');
    } catch (error) {
      console.error('Auth failed:', error);
      setErrorMessage(
        authMode === 'signin'
          ? 'Invalid username or password. Please try again.'
          : 'Registration failed. Username may already be taken.'
      );
    }
  };

  const handleJoin = async () => {
    if (!currentUser || !groupId || !token) return;
    setPageState('joining');
    try {
      const groupRes = await fetch(`http://localhost:4000/groups/${groupId}`);
      if (!groupRes.ok) throw new Error('Failed to fetch group');
      const groupData = await groupRes.json();

      const isAlreadyMember =
        groupData.groupMembers.includes(currentUser.userId) ||
        groupData.groupAdmins.includes(currentUser.userId);

      if (isAlreadyMember) {
        await syncGroup(groupId);
        setPageState('already_member');
        return;
      }

      const memberRes = await fetch('http://localhost:4000/groups/addMember', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, userId: currentUser.userId }),
      });
      if (!memberRes.ok) throw new Error('Failed to join group');

      await fetch('http://localhost:4000/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      await refreshUser();
      await syncGroup(groupId);
      router.push('/manage_group');
    } catch (error) {
      console.error('Failed to join group:', error);
      setErrorMessage('Something went wrong while joining the group. Please try again.');
      setPageState('error');
    }
  };

  const handleDecline = () => {
    router.push('/dashboard');
  };

  const containerClass = "min-h-screen bg-emerald-200";
  const innerClass = "max-w-md mx-auto p-4";

  if (pageState === 'validating') {
    return (
      <div className={containerClass}>
        <div className={innerClass}>
          <p className="text-gray-600 text-center mt-12">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (pageState === 'invalid') {
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

  if (pageState === 'auth') {
    return (
      <div className={containerClass}>
        <div className={innerClass}>
          <h1 className="text-2xl font-bold mb-2 text-center">
            You have been invited to join {groupName}
          </h1>
          <p className="mb-6 text-gray-600 text-center">
            Please sign in or register to continue.
          </p>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setAuthMode('signin'); setErrorMessage(''); }}
              className={`flex-1 py-2 rounded font-medium transition-colors ${
                authMode === 'signin'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-blue-500 border border-blue-500'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode('register'); setErrorMessage(''); }}
              className={`flex-1 py-2 rounded font-medium transition-colors ${
                authMode === 'register'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-blue-500 border border-blue-500'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label htmlFor="userName" className="block mb-1">Username</label>
              <input
                type="text"
                id="userName"
                name="userName"
                value={formData.userName}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full p-2 border rounded"
                placeholder="Enter your username"
                required
              />
            </div>
            <div>
              <label htmlFor="userPassword" className="block mb-1">Password</label>
              <input
                type="password"
                id="userPassword"
                name="userPassword"
                value={formData.userPassword}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full p-2 border rounded"
                placeholder="Enter your password"
                required
              />
            </div>
            {authMode === 'register' && (
              <div>
                <label htmlFor="userEmail" className="block mb-1">Email</label>
                <input
                  type="email"
                  id="userEmail"
                  name="userEmail"
                  value={formData.userEmail}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  placeholder="Enter your email"
                  required
                />
              </div>
            )}
            {errorMessage && (
              <p className="text-red-600 text-sm">{errorMessage}</p>
            )}
            <button
              type="submit"
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (pageState === 'confirm') {
    return (
      <div className={containerClass}>
        <div className={innerClass}>
          <h1 className="text-2xl font-bold mb-4 text-center">Join {groupName}?</h1>
          <p className="mb-8 text-gray-600 text-center">
            Would you like to join the learning group {groupName}?
          </p>
          <div className="flex gap-4">
            <button
              onClick={handleDecline}
              className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-medium py-3 px-4 rounded transition-colors"
            >
              No thanks
            </button>
            <button
              onClick={handleJoin}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded transition-colors"
            >
              Join Group
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (pageState === 'joining') {
    return (
      <div className={containerClass}>
        <div className={innerClass}>
          <p className="text-gray-600 text-center mt-12">Joining {groupName}...</p>
        </div>
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div className={containerClass}>
        <div className={innerClass}>
          <h1 className="text-2xl font-bold mb-4 text-center">Something went wrong</h1>
          <p className="text-red-600 text-center mb-6">{errorMessage}</p>
          <button
            onClick={() => setPageState('confirm')}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (pageState === 'already_member') {
    return (
      <div className={containerClass}>
        <div className={innerClass}>
          <h1 className="text-2xl font-bold mb-4 text-center">Already a Member</h1>
          <p className="text-gray-600 text-center mb-8">
            You are already a member of {groupName}.
          </p>
          <button
            onClick={() => router.push('/manage_group')}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Go to Group
          </button>
        </div>
      </div>
    );
  }

  return null;
}