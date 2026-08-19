'use client';

import {
  useState,
  useEffect,
  ChangeEvent,
  SyntheticEvent,
  KeyboardEvent,
} from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { groupsApi, invitationsApi, usersApi } from '@/lib/api';
import type { UserDto } from '@/lib/api/users/types';
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

export default function AcceptInvitationClient() {
  const t = useTranslations('invitation');
  const { user: authUser, login, syncGroup, refreshUser } = useAuth();
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

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const runValidation = async () => {
      try {
        const data = await invitationsApi.validateToken(token);
        if (cancelled) return;
        if (!data.valid || data.groupId == null) {
          setPageState('invalid');
          return;
        }
        const gId = data.groupId;
        setGroupId(gId);

        const group = await groupsApi.getById(gId);
        if (cancelled) return;
        setGroupName(group.name);

        if (authUser) {
          setCurrentUser(authUser);
          setPageState('confirm');
        } else {
          setPageState('auth');
        }
      } catch {
        if (cancelled) return;
        setPageState('invalid');
      }
    };

    void runValidation();
    return () => {
      cancelled = true;
    };
  }, [token, authUser]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  const handleAuth = async (e: SyntheticEvent) => {
    e.preventDefault();
    try {
      const result =
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
      if (!result.user || !result.session) {
        setErrorMessage(
          authMode === 'signin'
            ? t('auth.signInFailed')
            : t('auth.registerFailed'),
        );
        return;
      }
      login(result.user, result.session);
      setCurrentUser(result.user);
      setPageState('confirm');
    } catch {
      setErrorMessage(
        authMode === 'signin'
          ? t('auth.signInFailed')
          : t('auth.registerFailed'),
      );
    }
  };

  const handleJoin = async () => {
    const joinUser = currentUser ?? authUser;
    if (!joinUser || !groupId || !token) {
      setErrorMessage(t('auth.authRequired'));
      setPageState('auth');
      return;
    }
    if (!currentUser) setCurrentUser(joinUser);
    setPageState('joining');
    try {
      const groupData = await groupsApi.getById(groupId);

      const isAlreadyMember =
        groupData.members.includes(joinUser.id) ||
        groupData.admins.includes(joinUser.id);

      if (isAlreadyMember) {
        await syncGroup(groupId);
        setPageState('already_member');
        return;
      }

      await groupsApi.addMember({ groupId, userId: joinUser.id });
      await invitationsApi.accept({ token });

      await refreshUser();
      const synced = await syncGroup(groupId);
      if (!synced) {
        setErrorMessage(t('error.joinFailed'));
        setPageState('error');
        return;
      }
      router.push('/dashboard');
    } catch {
      setErrorMessage(t('error.joinFailed'));
      setPageState('error');
    }
  };

  const handleDecline = () => router.push('/dashboard');
  const handleGoToGroup = async () => {
    const joinUser = currentUser ?? authUser;
    if (!joinUser || !groupId) {
      setPageState('auth');
      return;
    }
    await syncGroup(groupId);
    router.push('/dashboard');
  };
  const handleRetry = () => {
    if (currentUser ?? authUser) {
      setPageState('confirm');
    } else {
      setErrorMessage(t('auth.authRequired'));
      setPageState('auth');
    }
  };
  const handleAuthModeChange = (mode: AuthMode) => {
    setAuthMode(mode);
    setErrorMessage('');
  };

  const joinUser = currentUser ?? authUser;
  const needsAuth =
    pageState === 'auth' || (pageState === 'confirm' && !joinUser);

  if (!token || pageState === 'invalid') return <InvitationInvalid />;
  if (pageState === 'validating') return <InvitationValidating />;
  if (needsAuth)
    return (
      <InvitationAuth
        groupName={groupName}
        authMode={authMode}
        formData={formData}
        errorMessage={
          pageState === 'confirm' && !joinUser
            ? errorMessage || t('auth.authRequired')
            : errorMessage
        }
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
