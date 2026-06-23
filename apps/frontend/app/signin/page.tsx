'use client';
import { useState, ChangeEvent, SyntheticEvent, KeyboardEvent } from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usersApi } from '@/lib/api';
import { PageShell } from '../components/ui/page-shell';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';

export default function SignIn() {
  const [formData, setFormData] = useState({
    userName: '',
    userPassword: '',
  });
  const [showError, setShowError] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    try {
      const user = await usersApi.signIn({
        userName: formData.userName,
        userPassword: formData.userPassword,
      });
      login(user);
      router.push('/dashboard');
    } catch (error) {
      console.error('Sign in failed:', error);
      setShowError(true);
    }
  };

  return (
    <PageShell narrow centered>
      <Card className="w-full">
        <h1 className="font-heading text-2xl font-bold mb-2 text-foreground">Sign In</h1>
        <p className="mb-6 text-muted-foreground">
          Welcome back! Please sign in to continue.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            type="text"
            id="userName"
            name="userName"
            value={formData.userName}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter your username"
            required
          />
          <Input
            label="Password"
            type="password"
            id="userPassword"
            name="userPassword"
            value={formData.userPassword}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter your password"
            required
          />
          <Button type="submit" variant="accent" fullWidth>
            Sign In
          </Button>
        </form>
        <p className="mt-6 text-center text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="link-accent">
            Register here
          </Link>
        </p>
      </Card>

      <Modal open={showError} onClose={() => setShowError(false)}>
        Invalid username or password. Please try again.
      </Modal>
    </PageShell>
  );
}
