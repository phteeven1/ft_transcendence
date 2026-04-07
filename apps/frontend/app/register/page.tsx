'use client';

import { useState, ChangeEvent, SyntheticEvent, KeyboardEvent } from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';

export default function Register() {
  const [formData, setFormData] = useState({
    userName: '',
    userPassword: '',
    userEmail: '',
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

    try {
      // simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // simulate successful backend response
      console.log('Simulating backend response...');
      console.log('Username: ', formData.userName);
      console.log('Email: ', formData.userEmail);

      // update frontend auth state as if backend succeeded
      login({
        userName: formData.userName,
        userEmail: formData.userEmail,      
      });

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Simulated error:', error);
      alert('Registration failed. Please try again.');
    }
  };

  /*
  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    console.log('Username:', formData.userName);
    console.log('Password:', formData.userPassword);
    console.log('Email:', formData.userEmail);
  };
  */

  return (
    <div className="max-w-md mx-auto p-4">
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
            required
          />
        </div>

        <div>
          <label htmlFor="userPassword" className="block mb-1">
            Password
          </label>
          <input
            type="text"
            id="userPassword"
            name="userPassword"
            value={formData.userPassword}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="w-full p-2 border rounded"
            placeholder="Create a new password"
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
  );
}