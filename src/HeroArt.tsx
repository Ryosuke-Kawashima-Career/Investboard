/** Decorative hero illustration shared by the demo and real-data pages. */
export function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <svg viewBox="0 0 350 230">
        <defs>
          <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#bfd4bb" />
            <stop offset="1" stopColor="#6b997c" />
          </linearGradient>
        </defs>
        <ellipse
          cx="180"
          cy="208"
          rx="108"
          ry="12"
          fill="#c9d8c2"
          opacity=".35"
        />
        <path
          d="M175 203C175 147 182 99 213 48"
          fill="none"
          stroke="#638b71"
          strokeWidth="3"
        />
        <path
          d="M180 152C120 165 84 112 95 83C143 80 181 105 180 152Z"
          fill="url(#leaf)"
        />
        <path
          d="M187 121C241 130 280 89 270 59C222 54 193 78 187 121Z"
          fill="#a7c5a2"
        />
        <path
          d="M206 62C181 47 189 14 220 9C241 33 231 54 206 62Z"
          fill="#80a98a"
        />
        <path
          d="M179 151L110 97M189 120L256 72"
          stroke="#729a76"
          strokeWidth="1.2"
          fill="none"
        />
        <rect
          x="56"
          y="162"
          width="60"
          height="41"
          rx="7"
          fill="#ffffff"
          opacity=".65"
          transform="rotate(-8 86 182)"
        />
        <path
          d="M67 189L77 180L86 184L103 169"
          stroke="#6f9475"
          strokeWidth="2"
          fill="none"
        />
        <circle cx="276" cy="157" r="21" fill="#ffffff" opacity=".55" />
        <path
          d="M267 158L274 164L285 151"
          fill="none"
          stroke="#719775"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
