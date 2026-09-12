'use client';

import { ChangeEvent, SyntheticEvent, KeyboardEvent } from 'react';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useTranslations } from 'next-intl';

type AuthMode = 'signin' | 'register';

interface IInvitationAuthProps {
  groupName: string;
  authMode: AuthMode;
  formData: { userName: string; userPassword: string; userEmail: string };
  errorMessage: string;
  onAuthModeChange: (mode: AuthMode) => void;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: (e: SyntheticEvent) => void;
}

export default function InvitationAuth({
  groupName,
  authMode,
  formData,
  errorMessage,
  onAuthModeChange,
  onChange,
  onKeyDown,
  onSubmit,
}: IInvitationAuthProps) {
  const t = useTranslations('invitation.auth');

  return (
    <div className="page-content page-content--narrow page-content--centered">
      <Card className="w-full">
        <h1 className="font-heading text-2xl font-bold mb-2 text-center text-foreground">
          {t('title', { groupName })}
        </h1>
        <p className="mb-6 text-muted-foreground text-center">
          {t('subtitle')}
        </p>

        <div className="flex gap-2 mb-6">
          <Button
            type="button"
            variant={authMode === 'signin' ? 'accent' : 'ghost'}
            className="flex-1"
            onClick={() => onAuthModeChange('signin')}
          >
            {t('signInTab')}
          </Button>
          <Button
            type="button"
            variant={authMode === 'register' ? 'accent' : 'ghost'}
            className="flex-1"
            onClick={() => onAuthModeChange('register')}
          >
            {t('registerTab')}
          </Button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label={t('usernameLabel')}
            type="text"
            id="userName"
            name="userName"
            value={formData.userName}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={t('usernamePlaceholder')}
            autoComplete="username"
            required
          />
          <Input
            label={t('passwordLabel')}
            type="password"
            id="userPassword"
            name="userPassword"
            value={formData.userPassword}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={t('passwordPlaceholder')}
            autoComplete={
              authMode === 'register' ? 'new-password' : 'current-password'
            }
            required
          />
          {authMode === 'register' && (
            <Input
              label={t('emailLabel')}
              type="email"
              id="userEmail"
              name="userEmail"
              value={formData.userEmail}
              onChange={onChange}
              placeholder={t('emailPlaceholder')}
              autoComplete="email"
              required
            />
          )}
          {errorMessage && (
            <p className="text-destructive text-sm">{errorMessage}</p>
          )}
          <Button type="submit" variant="accent" fullWidth>
            {t('submit')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
