'use client';

/* keeps track of sequence of accepting an invitation using a PageState variable 
  that renders a subcomponent at every stage.
  1. validating: (initial state) useEffect reads the token from the URL query string.
    If no token, then jumps to 'invalid'.
    Otherwise calls validateToken, which checks token against backend and fetches 
    group name. On success it sets pageState to 'auth'.
  2. auth: renders the sign-in/register form. User can toggle between register and sign-in.
    on submit, handleAuth POSTs to either /users/signin or /users/register
    On success, it stores in both auth context and local currentUser state,
    then moves on to 'confirm'.
  3. confirm: asks user if they want to join group. Declining sends to /dashboard
    accepting calls handleJoin.
  4. joining: shown while handleJoin is running. Checks if user is already member -
    if so, jumps to 'already_member'
    Otherwise, it POSTs to /groups/addMember 
    then POSTs to /invitations/accept to consume token 
    then refreshes the user and syncs group before navigating to /manage_group
  5. already_member: is a terminal state. It offers a button to /manage_group
  6. error: is a terminal state. Offers retry button that goes back to 'confirm'  */

import {
  useState,
  useEffect,
  ChangeEvent,
  SyntheticEvent,
  KeyboardEvent,
} from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { groupsApi, invitationsApi, usersApi } from '@/lib/api';
import type { UserDto } from '@/lib/api/users/types';
import InvitationValidating from './_components/invitation-validating';
import InvitationInvalid from './_components/invitation-invalid';
import InvitationAuth from './_components/invitation-auth';
import InvitationConfirm from './_components/invitation-confirm';
import InvitationJoining from './_components/invitation-joining';
import InvitationError from './_components/invitation-error';
import InvitationAlreadyMember from './_components/invitation-already-member';

// PageState variable moves through sequence of steps, reading different subcomponents
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
  const [currentUser, setCurrentUser] = useState<UserDto | null>(null);

  // pageState = validating. If no token exists, then returns invalid
  useEffect(() => {
    if (!token) {
      setPageState('invalid');
      return;
    }
    validateToken();
  }, []);

  // checks token against backend and fetches groups name. On success sets pageState to auth
  const validateToken = async () => {
    try {
      const data = await invitationsApi.validateToken(token!);
      if (!data.valid || data.groupId == null) {
        setPageState('invalid');
        return;
      }
      const gId = data.groupId;
      setGroupId(gId);

      const group = await groupsApi.getById(gId);
      setGroupName(group.name);
      setPageState('auth');
    } catch (error) {
      console.error('Token validation failed:', error);
      setPageState('invalid');
    }
  };

  // updates formData on any change to input fields
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // prevents pressing Enter from submitting
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  // is called when Submit is clicked on the auth form. preventDefault stops page from reloading
  // then picks URL and requests body based on authMode (signin or register)
  // POSTs to appropriate endpoint, and on success stores both local in currentUser
  // and in auth context via login()
  // then advances pageState to 'confirm'
  // on failure it sets error message and displays inline.
  const handleAuth = async (e: SyntheticEvent) => {
    e.preventDefault();
    try {
      const data =
        authMode === 'signin'
          ? await usersApi.signIn({
              userName: formData.userName,
              userPassword: formData.userPassword,
            })
          : await usersApi.register({
              userName: formData.userName,
              userPassword: formData.userPassword,
              userEmail: formData.userEmail,
            });
      login(data);
      setCurrentUser(data);
      setPageState('confirm');
    } catch (error) {
      console.error('Auth failed:', error);
      setErrorMessage(
        authMode === 'signin'
          ? 'Invalid username or password. Please try again.'
          : 'Registration failed. Username may already be taken.',
      );
    }
  };

  // is called when user clicks "Join Group" on confirm screen.
  // guards against missing data - if so, returns early
  // sets pageStage to 'joining' to show screen while async is working
  // Fetches group from backend and checks if user is alread admin or member
  // - if so, jumps to 'already_member'
  // POSTs to /groups/addMember to add the user to the group
  // POSTs to /invitations/accept to consume token
  // Refreshes user in auth context, syncs group, navigates to /manage_group
  const handleJoin = async () => {
    if (!currentUser || !groupId || !token) return;
    setPageState('joining');
    try {
      const groupData = await groupsApi.getById(groupId);

      const isAlreadyMember =
        groupData.members.includes(currentUser.id) || groupData.admins.includes(currentUser.id);

      if (isAlreadyMember) {
        await syncGroup(groupId);
        setPageState('already_member');
        return;
      }

      await groupsApi.addMember({ groupId, userId: currentUser.id });
      await invitationsApi.accept({ token });

      await refreshUser();
      await syncGroup(groupId);
      router.push('/manage_group');
    } catch (error) {
      console.error('Failed to join group:', error);
      setErrorMessage(
        'Something went wrong while joining the group. Please try again.',
      );
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
  if (pageState === 'auth')
    return (
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
  if (pageState === 'confirm')
    return (
      <InvitationConfirm
        groupName={groupName}
        onJoin={handleJoin}
        onDecline={handleDecline}
      />
    );
  if (pageState === 'joining')
    return <InvitationJoining groupName={groupName} />;
  if (pageState === 'error')
    return (
      <InvitationError errorMessage={errorMessage} onRetry={handleRetry} />
    );
  if (pageState === 'already_member')
    return (
      <InvitationAlreadyMember
        groupName={groupName}
        onGoToGroup={handleGoToGroup}
      />
    );

  return null;
}
