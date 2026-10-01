import './night-clock.css';

type NightClockProps = { revealing: boolean };

/** A brief, wordless passage from a sunny afternoon into evening. */
export default function NightClock({ revealing }: NightClockProps) {
  return (
    <div
      className={`park-night-clock${revealing ? ' park-night-clock--revealing' : ''}`}
      role="status"
      aria-label="时钟转动，夜晚即将来临"
    >
      <svg className="park-night-clock__face" viewBox="0 0 240 240" aria-hidden="true">
        <defs>
          <linearGradient id="park-clock-paper" x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#fffdf4" />
            <stop offset="1" stopColor="#fff0d8" />
          </linearGradient>
          <linearGradient id="park-clock-rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#edd6a4" />
            <stop offset="0.5" stopColor="#c99160" />
            <stop offset="1" stopColor="#dfb67d" />
          </linearGradient>
        </defs>
        <circle cx="120" cy="123" r="101" fill="#c99c6c" opacity="0.2" />
        <circle cx="120" cy="120" r="100" fill="url(#park-clock-rim)" />
        <circle cx="120" cy="120" r="94" fill="url(#park-clock-paper)" />
        <circle cx="120" cy="120" r="88" fill="none" stroke="#dbc5a4" strokeWidth="0.8" />
        {Array.from({ length: 60 }, (_, index) => (
          <line
            key={index}
            x1="120" y1="40" x2="120" y2={index % 5 === 0 ? '49' : '43'}
            transform={`rotate(${index * 6} 120 120)`}
            stroke={index % 5 === 0 ? '#ad8056' : '#d7bda0'}
            strokeWidth={index % 5 === 0 ? 2.5 : 1}
            strokeLinecap="round"
          />
        ))}
        <path d="M125 151a11 11 0 1 1-14-14 10 10 0 0 0 14 14Z" fill="#dfb879" opacity="0.8" />
        <path d="m137 141 1.3 3.5 3.5 1.3-3.5 1.3-1.3 3.5-1.3-3.5-3.5-1.3 3.5-1.3Z" fill="#dfb879" />
        <g className="park-night-clock__hour">
          <path d="M120 127V76" fill="none" stroke="#514b64" strokeWidth="6" strokeLinecap="round" />
        </g>
        <g className="park-night-clock__minute">
          <path d="M120 130V59" fill="none" stroke="#76647c" strokeWidth="3.5" strokeLinecap="round" />
        </g>
        <circle cx="120" cy="120" r="7" fill="#d5ab72" />
        <circle cx="120" cy="120" r="2.5" fill="#fff8e9" />
        <g fill="#c99c6c">
          <path d="m22 26 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" />
          <path d="m215 181 2.5 7.5 7.5 2.5-7.5 2.5-2.5 7.5-2.5-7.5-7.5-2.5 7.5-2.5Z" />
          <circle cx="215" cy="46" r="2.5" />
          <circle cx="28" cy="204" r="2" />
        </g>
      </svg>
    </div>
  );
}
