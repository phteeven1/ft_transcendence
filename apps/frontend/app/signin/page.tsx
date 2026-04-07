'use client';

import { useState, ChangeEvent, SyntheticEvent, KeyboardEvent } from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';

export default function SignIn() {
  const [formData, setFormData] = useState({
    userName: '',
    userPassword: '',
  });

  const { login } = useAuth(); // Access the login function from auth context
  const router = useRouter(); // For redirecting

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  // Simulated backend call (placeholder for smanthey)
  const handleSubmit = async (e: SyntheticEvent) => {
  e.preventDefault();

  // Placeholder: Check if fields are non-empty
  if (!formData.userName || !formData.userPassword) {
    alert("Please enter both username and password.");
    return;
  }

  // Simulate a delay (optional)
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Update auth state (with placeholder email if needed)
  login({
    userName: formData.userName,
    userEmail: "", // Or remove this if you update the `login` function
  });

  // Redirect to dashboard
  router.push('/dashboard');
  
};

  return (
    <div className="min-h-screen bg-emerald-200">
    <div className="bg-emerald-200 max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Sign In</h1>
      <p className="mb-6 text-gray-600">
        Welcome back! Please sign in to continue.
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
            placeholder="Enter your username"
            required
          />
        </div>

        <div>
          <label htmlFor="userPassword" className="block mb-1">
            Password
          </label>
          <input
            type="password" // Changed to password type for security
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

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Sign In
        </button>
      </form>
    </div>
    </div>
  );
}