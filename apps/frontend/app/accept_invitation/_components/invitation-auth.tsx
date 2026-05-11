'use client';

import { ChangeEvent, SyntheticEvent, KeyboardEvent } from 'react';

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

const containerClass = "min-h-screen bg-emerald-200";
const innerClass = "max-w-md mx-auto p-4";

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
            onClick={() => onAuthModeChange('signin')}
            className={`flex-1 py-2 rounded font-medium transition-colors ${
              authMode === 'signin'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-blue-500 border border-blue-500'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => onAuthModeChange('register')}
            className={`flex-1 py-2 rounded font-medium transition-colors ${
              authMode === 'register'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-blue-500 border border-blue-500'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="userName" className="block mb-1">Username</label>
            <input
              type="text"
              id="userName"
              name="userName"
              value={formData.userName}
              onChange={onChange}
              onKeyDown={onKeyDown}
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
              onChange={onChange}
              onKeyDown={onKeyDown}
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
                onChange={onChange}
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