'use client';

import { useEffect, useState } from 'react';
import styles from './styles/page.module.css';

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
    <div className={styles.container} >
      <h1 className={styles.title}>Counter</h1>

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