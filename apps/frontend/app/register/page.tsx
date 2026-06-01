'use client';
import { useState, ChangeEvent, SyntheticEvent, KeyboardEvent } from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { usersApi, ApiError } from '@/lib/api';

export default function Register() {
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
    setFormData(prev => ({ ...prev, [name]: value }));
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
    <div className="min-h-screen bg-emerald-200">
      <div className="bg-emerald-200 max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Register</h1>
        <p className="mb-6 text-gray-600">
          Create your account to get started.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="userName" className="block mb-1">
              Username
            </label>
            <input
              type="text"
              id="userName"
              name="userName"
              value={formData.userName}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className="w-full p-2 border rounded"
              placeholder="Choose a username"
              autoComplete="name"
              required
            />
          </div>
          <div>
            <label htmlFor="userPassword" className="block mb-1">
              Password
            </label>
            <input
              type="password"
              id="userPassword"
              name="userPassword"
              value={formData.userPassword}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className="w-full p-2 border rounded"
              placeholder="Create a new password"
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label htmlFor="userEmail" className="block mb-1">
              Your Email
            </label>
            <input
              type="text"
              id="userEmail"
              name="userEmail"
              value={formData.userEmail}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="Enter your email"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Submit
          </button>
        </form>
      </div>

      {showError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <p className="mb-6 text-gray-700">
              Registration failed. Please try again.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowError(false)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
