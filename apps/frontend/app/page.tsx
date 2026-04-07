'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [count, setCount] = useState(0);

  const fetchCounter = async () => {
    const res = await fetch('http://localhost:4000/counter');
    const data = await res.json();
    setCount(data);
  };

  const increment = async () => {
    const res = await fetch('http://localhost:4000/counter', {
      method: 'POST',
    });
    const data = await res.json();
    setCount(data);
  };

  useEffect(() => {
    fetchCounter();
  }, []);

  return (
    <div className="min-h-screen bg-emerald-200 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">Dicteé</h1>
      <p className="text-lg text-gray-600 text-center max-w-lg mb-8">
        Welcome to Dicteé, your fun app for turning boring vocabulary lists into learning games.
        Upload your word lists, invite the other parents of the class. Then set up a direct link for your child and invite them to play with their friends.
        But first, you need to register.
      </p>

      <div className="flex gap-4 mb-8">
        <Link
          href="/register"
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          Register
        </Link>
        <Link
          href="/signin"
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          Sign In
        </Link>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        {count.toString().padStart(4, '0').split('').map((digit, index) => (
          <div
            key={index}
            className="w-12 h-16 flex items-center justify-center bg-gray-200 rounded-lg text-2xl font-bold text-gray-800"
          >
            {digit}
          </div>
        ))}
      </div>

      <button
        className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition-colors"
        onClick={increment}
      >
        +1 Increase
      </button>
    </div>
  );
}