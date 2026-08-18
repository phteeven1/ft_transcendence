'use client';

// Ant carrying duo for the Word Building drag cursor.
// Marches while a letter is being dragged, drops it into the cell,
// then wipes its sweat like it was the hardest job of the day.

import { useEffect } from 'react';

interface IAntCarryCursorProps {
  letter: string;
  x: number;
  y: number;
  isDropping: boolean;
  onCelebrationEnd: () => void;
}

const SWEAT_CELEBRATION_MS = 1700;

export default function AntCarryCursor({
  letter,
  x,
  y,
  isDropping,
  onCelebrationEnd,
}: IAntCarryCursorProps) {
  useEffect(() => {
    if (!isDropping) return;
    const timer = setTimeout(onCelebrationEnd, SWEAT_CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, [isDropping, onCelebrationEnd]);

  const modeClass = isDropping ? 'ant-carry-cursor--dropping' : '';

  return (
    <div className={`ant-carry-cursor ${modeClass}`} style={{ left: x, top: y }}>
      <style>{antCursorStyles}</style>
      <div className="ant-carry-cursor__crew" aria-hidden="true">
        <AntSprite side="left" />
        <div className="ant-carry-cursor__tile">
          <span>{letter}</span>
        </div>
        <AntSprite side="right" />
      </div>
    </div>
  );
}

interface IAntSpriteProps {
  side: 'left' | 'right';
}

function AntSprite({ side }: IAntSpriteProps) {
  return (
    <svg
      className={`ant-carry-cursor__ant ant-carry-cursor__ant--${side}`}
      viewBox="0 0 64 56"

    >
      <g className="ant-carry-cursor__body">
        {/* abdomen */}
        <ellipse cx="13" cy="37" rx="11" ry="8.5" fill="#7a4a21" />
        <ellipse cx="10" cy="34.5" rx="4" ry="2.6" fill="#93602f" opacity="0.7" />
        {/* thorax */}
        <ellipse cx="28" cy="34" rx="8" ry="6.2" fill="#8a5526" />
        {/* head */}
        <circle cx="44" cy="29" r="9.5" fill="#7a4a21" />
        {/* eye */}
        <circle cx="47" cy="26.5" r="2.9" fill="#fff" />
        <circle cx="48" cy="26.7" r="1.5" fill="#2b1a0c" />
        {/* mouth: smile while carrying, panting while resting */}
        <path
          className="ant-carry-cursor__mouth-smile"
          d="M46 34 q3.2 2.4 6.4 0.4"
          stroke="#3c2410"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse className="ant-carry-cursor__mouth-pant" cx="49" cy="35" rx="2.1" ry="2.7" fill="#3c2410" />
        {/* antennae */}
        <path d="M46 20 q2.5 -7 8 -9.5" stroke="#7a4a21" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="54.5" cy="10.5" r="1.8" fill="#7a4a21" />
        <path d="M41 19.5 q-0.5 -8 5 -12" stroke="#7a4a21" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="46.5" cy="7.5" r="1.8" fill="#7a4a21" />
        {/* legs */}
        <path className="ant-carry-cursor__leg ant-carry-cursor__leg--back"  d="M21 39 q-3 7 -8 9"   stroke="#5d3617" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path className="ant-carry-cursor__leg ant-carry-cursor__leg--mid"   d="M27 41 q-0.5 7 -3 11" stroke="#5d3617" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path className="ant-carry-cursor__leg ant-carry-cursor__leg--front" d="M33 39 q4 7 8 9"     stroke="#5d3617" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        {/* carrying arm — raised toward the tile while marching */}
        <path className="ant-carry-cursor__arm-carry" d="M37 31 q7 -3 11 -10" stroke="#5d3617" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        {/* wiping arm — hand at the forehead while sweating */}
        <g className="ant-carry-cursor__arm-wipe">
          <path d="M37 33 q6 -1 9 -8" stroke="#5d3617" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle cx="46.5" cy="24.5" r="2.2" fill="#5d3617" />
        </g>
      </g>
      {/* sweat drops (fly off when the work is done) */}
      <circle className="ant-carry-cursor__drop ant-carry-cursor__drop--a" cx="52" cy="16" r="2.2" fill="#6db9f2" />
      <circle className="ant-carry-cursor__drop ant-carry-cursor__drop--b" cx="56" cy="22" r="1.8" fill="#8ecdf7" />
      <circle className="ant-carry-cursor__drop ant-carry-cursor__drop--c" cx="49" cy="11" r="1.6" fill="#6db9f2" />
    </svg>
  );
}

const antCursorStyles = `
/* 🟢 RESPONSIVE SCALING - Direct viewport units for real-time resize */
.ant-carry-cursor {
  /* 
    KEY INSIGHT: CSS variables don't recalculate on viewport resize.
    Solution: Apply vmin/vw/vh units DIRECTLY to properties, not in variables.
    This ensures browser recalculates on every resize event.
  */
}

.ant-carry-cursor {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  user-select: none;
  /* Center horizontally, offset vertically */
  transform: translate(-50%, -50%);
}

.ant-carry-cursor__crew {
  display: flex;
  align-items: flex-end;
  gap: clamp(0.05rem, 0.15vmin, 0.2rem);
}

/* DIRECT vmin units on SVG - recalculates on resize */
.ant-carry-cursor__ant {
  width: clamp(1.4rem, 3.3vmin, 4.5rem);
  height: auto;
  display: block;
}

/* DIRECT vmin units on tile - recalculates on resize */
.ant-carry-cursor__tile {
  width: clamp(1.2rem, 3vmin, 4rem);
  height: clamp(1.2rem, 3vmin, 4rem);
  margin-bottom: clamp(0.4rem, 1vmin, 1.4rem);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: clamp(0.18rem, 0.45vmin, 0.6rem);
  background: #fff6dd;
  border: clamp(0.07rem, 0.18vmin, 0.25rem) solid #e0a63c;
  box-shadow: 0 clamp(0.15rem, 0.36vmin, 0.5rem) 0 rgba(90, 55, 20, 0.35);
  font-size: clamp(0.7rem, 1.8vmin, 2.2rem);
  font-weight: 800;
  color: #5b3a1e;
  animation: ant-tile-carry 0.6s ease-in-out infinite alternate;
}

.ant-carry-cursor--dropping .ant-carry-cursor__tile {
  animation: ant-tile-land 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.ant-carry-cursor__ant--right { transform: scaleX(-1); }

.ant-carry-cursor__body { animation: ant-march 0.35s ease-in-out infinite alternate; }
.ant-carry-cursor__ant--right .ant-carry-cursor__body { animation-delay: 0.17s; }

.ant-carry-cursor--dropping .ant-carry-cursor__body { animation: ant-tired 0.9s ease-in-out infinite; }

.ant-carry-cursor__leg {
  animation: ant-leg-kick 0.35s ease-in-out infinite alternate;
  transform-box: fill-box;
  transform-origin: 50% 0%;
}
.ant-carry-cursor__leg--mid   { animation-delay: 0.12s; }
.ant-carry-cursor__leg--front { animation-delay: 0.24s; }
.ant-carry-cursor--dropping .ant-carry-cursor__leg { animation: none; }

.ant-carry-cursor__arm-wipe  { opacity: 0; }
.ant-carry-cursor__mouth-pant { opacity: 0; }

.ant-carry-cursor--dropping .ant-carry-cursor__arm-carry   { opacity: 0; }
.ant-carry-cursor--dropping .ant-carry-cursor__mouth-smile { opacity: 0; }
.ant-carry-cursor--dropping .ant-carry-cursor__mouth-pant  { opacity: 1; }

.ant-carry-cursor--dropping .ant-carry-cursor__arm-wipe {
  opacity: 1;
  animation: ant-wipe 0.5s ease-in-out 2;
}

.ant-carry-cursor__drop { opacity: 0; }
.ant-carry-cursor--dropping .ant-carry-cursor__drop--a { animation: ant-sweat-fly 0.9s ease-out 0.15s forwards; }
.ant-carry-cursor--dropping .ant-carry-cursor__drop--b { animation: ant-sweat-fly 0.9s ease-out 0.45s forwards; }
.ant-carry-cursor--dropping .ant-carry-cursor__drop--c { animation: ant-sweat-fly 0.9s ease-out 0.75s forwards; }

.ant-carry-cursor--dropping { animation: ant-cursor-fade 0.35s ease-in 1.35s forwards; }

/* 🟢 ANIMATIONS with direct vmin units for proportional movement */
@keyframes ant-march {
  from { transform: translateY(0) rotate(-1.5deg); }
  to   { transform: translateY(calc(-1px - 0.3vmin)) rotate(1.5deg); }
}
@keyframes ant-leg-kick {
  from { transform: rotate(-10deg); }
  to   { transform: rotate(10deg); }
}
@keyframes ant-tile-carry {
  from { transform: rotate(-2.5deg) translateY(0); }
  to   { transform: rotate(2.5deg) translateY(calc(-1px - 0.25vmin)); }
}
@keyframes ant-tile-land {
  0%   { transform: scale(1.18); }
  60%  { transform: scale(0.94); }
  100% { transform: scale(1); }
}
@keyframes ant-tired {
  0%, 100% { transform: translateY(0) scaleY(1); }
  50%      { transform: translateY(calc(0.75px + 0.2vmin)) scaleY(0.94); }
}
@keyframes ant-wipe {
  0%, 100% { transform: translate(0, 0); }
  50%      { transform: translate(calc(-1px - 0.3vmin), calc(-0.75px - 0.2vmin)); }
}
@keyframes ant-sweat-fly {
  0%   { opacity: 0; transform: translate(0, 0) scale(0.5); }
  25%  { opacity: 1; }
  100% { opacity: 0; transform: translate(calc(4px + 1.35vmin), calc(-7px - 2.1vmin)) scale(1.15); }
}
@keyframes ant-cursor-fade { to { opacity: 0; } }
`;