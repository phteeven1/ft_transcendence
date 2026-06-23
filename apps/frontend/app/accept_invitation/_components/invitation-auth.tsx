'use client';

import { ChangeEvent, SyntheticEvent, KeyboardEvent } from 'react';
import { PageShell } from '../../components/ui/page-shell';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

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
  return (
    <PageShell narrow centered>
      <Card className="w-full">
        <h1 className="font-heading text-2xl font-bold mb-2 text-center text-foreground">
          You have been invited to join {groupName}
        </h1>
        <p className="mb-6 text-muted-foreground text-center">
          Please sign in or register to continue.
        </p>

        <div className="flex gap-2 mb-6">
          <Button
            type="button"
            variant={authMode === 'signin' ? 'accent' : 'ghost'}
            className="flex-1"
            onClick={() => onAuthModeChange('signin')}
          >
            Sign In
          </Button>
          <Button
            type="button"
            variant={authMode === 'register' ? 'accent' : 'ghost'}
            className="flex-1"
            onClick={() => onAuthModeChange('register')}
          >
            Register
          </Button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Username"
            type="text"
            id="userName"
            name="userName"
            value={formData.userName}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="Enter your username"
            required
          />
          <Input
            label="Password"
            type="password"
            id="userPassword"
            name="userPassword"
            value={formData.userPassword}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="Enter your password"
            required
          />
          {authMode === 'register' && (
            <Input
              label="Email"
              type="email"
              id="userEmail"
              name="userEmail"
              value={formData.userEmail}
              onChange={onChange}
              placeholder="Enter your email"
              required
            />
          )}
          {errorMessage && (
            <p className="text-destructive text-sm">{errorMessage}</p>
          )}
          <Button type="submit" variant="accent" fullWidth>
            Submit
          </Button>
        </form>
      </Card>
    </PageShell>
  );
}
