'use client';
import Link from 'next/link';

export default function Home() {
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
    </div>
  );
}