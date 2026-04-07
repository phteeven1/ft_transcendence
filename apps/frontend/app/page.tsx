'use client';

import { useEffect, useState } from 'react';
import styles from './styles/page.module.css';

export default function Home() {
  const [count, setCount] = useState(0);
  const [showSignIn, setShowSignIn] = useState(false);

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

    <div className={styles.container} >
      <h1 className={styles.title}>Dicteé</h1>
      <p className={styles.paragraph}>Welcome to Dicteé, your fun app for turning boring vocabulary lists into learning games. Upload your word lists, invite the other parents of the class. Then set up a direct link for your child and invite them to play with their friends. But first, you need to register.</p>
      <div className={styles.buttonGroup}>
        <a href="/register" className={styles.btn}>
          Register
        </a>
        <a href="/signin" className={styles.btn}>
          Sign In
        </a>
      </div>

      <div className={styles.counter}>
        {count.toString().padStart(4, '0').split('').map((digit, index) => (
          <div key={index} className={styles.digit}>
            {digit}
          </div>
        ))}
      </div>

      <button className={styles.btn} onClick={increment}>
        +1 Increase
      </button>
    </div>
  );
}