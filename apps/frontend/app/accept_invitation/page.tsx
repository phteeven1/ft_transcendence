'use client';

import { useState, useEffect, ChangeEvent, SyntheticEvent, KeyboardEvent } from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { User } from '../types';
import InvitationValidating from './_components/invitation-validating';
import InvitationInvalid from './_components/invitation-invalid';
import InvitationAuth from './_components/invitation-auth';
import InvitationConfirm from './_components/invitation-confirm';
import InvitationJoining from './_components/invitation-joining';
import InvitationError from './_components/invitation-error';
import InvitationAlreadyMember from './_components/invitation-already-member';

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

  const handleDecline = () => router.push('/dashboard');
  const handleGoToGroup = () => router.push('/manage_group');
  const handleRetry = () => setPageState('confirm');
  const handleAuthModeChange = (mode: AuthMode) => {
    setAuthMode(mode);
    setErrorMessage('');
  };

  if (pageState === 'validating') return <InvitationValidating />;
  if (pageState === 'invalid') return <InvitationInvalid />;
  if (pageState === 'auth') return (
    <InvitationAuth
      groupName={groupName}
      authMode={authMode}
      formData={formData}
      errorMessage={errorMessage}
      onAuthModeChange={handleAuthModeChange}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onSubmit={handleAuth}
    />
  );
  if (pageState === 'confirm') return (
    <InvitationConfirm
      groupName={groupName}
      onJoin={handleJoin}
      onDecline={handleDecline}
    />
  );
  if (pageState === 'joining') return <InvitationJoining groupName={groupName} />;
  if (pageState === 'error') return (
    <InvitationError
      errorMessage={errorMessage}
      onRetry={handleRetry}
    />
  );
  if (pageState === 'already_member') return (
    <InvitationAlreadyMember
      groupName={groupName}
      onGoToGroup={handleGoToGroup}
    />
  );

  return null;
}