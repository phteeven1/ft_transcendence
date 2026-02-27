'use client';

import { useEffect, useState } from 'react';

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
    <div className="container">
      <h1 className="title">Counter</h1>

      <div className="counter">
        {count.toString().padStart(4, '0').split('').map((digit, index) => (
          <div key={index} className="digit">
            {digit}
          </div>
        ))}
      </div>

      <button className="btn" onClick={increment}>
        +1 Increase
      </button>

      <style jsx>{`
        .container {
          height: 100vh;
          width: 100vw;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #111;
          color: white;
          font-family: monospace;
        }

        .title {
          margin-bottom: 2rem;
          font-size: 2rem;
        }

        .counter {
          display: flex;
          gap: 10px;
          margin-bottom: 2rem;
        }

        .digit {
          background: black;
          color: #00ff99;
          font-size: 4rem;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          box-shadow: inset 0 0 20px #00ff99;
          transition: transform 0.2s ease;
        }

        .digit:active {
          transform: rotateX(360deg);
        }

        .btn {
          padding: 1rem 2rem;
          font-size: 1.5rem;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          background: linear-gradient(135deg, #00ff99, #0077ff);
          color: black;
          font-weight: bold;
          box-shadow: 0 0 20px #00ff99;
          transition: 0.2s;
        }

        .btn:hover {
          transform: scale(1.1);
          box-shadow: 0 0 30px #00ff99;
        }
      `}</style>
    </div>
  );
}