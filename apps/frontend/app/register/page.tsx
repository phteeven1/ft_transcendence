'use client';
import { useState, ChangeEvent, SyntheticEvent, KeyboardEvent } from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usersApi, ApiError } from '@/lib/api';
import { PageShell } from '../components/ui/page-shell';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';

export default function Register() {
  const t = useTranslations('auth.register');
  const [formData, setFormData] = useState({
    userName: '',
    userPassword: '',
    userEmail: '',
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
      const user = await usersApi.register({
        userName: formData.userName,
        userPassword: formData.userPassword,
        userEmail: formData.userEmail,
      });
      login(user);
      router.push('/dashboard');
    } catch (error) {
      console.error('Registration failed:', error);
      setShowError(true);
      if (error instanceof ApiError) {
        console.error('API status:', error.status);
      }
    }
  };

  return (
    <PageShell narrow centered>
      <Card className="w-full">
        <h1 className="font-heading text-2xl font-bold mb-2 text-foreground">{t('title')}</h1>
        <p className="mb-6 text-muted-foreground">
          {t('subtitle')}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('usernameLabel')}
            type="text"
            id="userName"
            name="userName"
            value={formData.userName}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={t('usernamePlaceholder')}
            autoComplete="name"
            required
          />
          <Input
            label={t('passwordLabel')}
            type="password"
            id="userPassword"
            name="userPassword"
            value={formData.userPassword}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={t('passwordPlaceholder')}
            autoComplete="new-password"
            required
          />
          <Input
            label={t('emailLabel')}
            type="text"
            id="userEmail"
            name="userEmail"
            value={formData.userEmail}
            onChange={handleChange}
            placeholder={t('emailPlaceholder')}
            required
          />
          <Button type="submit" variant="accent" fullWidth>
            {t('submit')}
          </Button>
        </form>
      </Card>

      <Modal open={showError} onClose={() => setShowError(false)}>
        {t('failed')}
      </Modal>
    </PageShell>
  );
}
