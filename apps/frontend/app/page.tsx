// app/page.tsx
"use client";

import { useState } from "react";

export default function Home() {
  const [data, setData] = useState<number[]>([]);

  const handleClick = async () => {
    try {
      const res = await fetch("http://localhost:4000/iterate"); // Backend-Endpunkt
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Fehler beim Abrufen:", err);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "2rem",
        fontFamily: "sans-serif",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "3rem" }}>FT Transcendence Test</h1>
      <button
        onClick={handleClick}
        style={{
          padding: "1rem 3rem",
          fontSize: "1.5rem",
          borderRadius: "12px",
          backgroundColor: "#0070f3",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}
      >
        Hole Iteration vom Backend
      </button>
      <pre
        style={{
          fontSize: "1.2rem",
          color: "#333",
          backgroundColor: "#f0f0f0",
          padding: "1rem 2rem",
          borderRadius: "8px",
          minWidth: "300px",
        }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}