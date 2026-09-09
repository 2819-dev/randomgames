"use client";

const BITS = [
  { left: 8, delay: 0, color: "var(--coral)", char: "✦" },
  { left: 16, delay: 0.12, color: "var(--lime)", char: "★" },
  { left: 24, delay: 0.05, color: "var(--sky)", char: "●" },
  { left: 32, delay: 0.22, color: "var(--butter)", char: "▲" },
  { left: 40, delay: 0.08, color: "var(--plum)", char: "■" },
  { left: 48, delay: 0.18, color: "var(--mint)", char: "◆" },
  { left: 56, delay: 0.03, color: "var(--coral)", char: "★" },
  { left: 64, delay: 0.28, color: "var(--lime)", char: "✦" },
  { left: 72, delay: 0.15, color: "var(--sky)", char: "●" },
  { left: 80, delay: 0.09, color: "var(--butter)", char: "◆" },
  { left: 88, delay: 0.2, color: "var(--plum)", char: "▲" },
  { left: 12, delay: 0.32, color: "var(--mint)", char: "■" },
  { left: 28, delay: 0.25, color: "var(--coral)", char: "✦" },
  { left: 44, delay: 0.14, color: "var(--lime)", char: "★" },
  { left: 60, delay: 0.35, color: "var(--sky)", char: "●" },
  { left: 76, delay: 0.11, color: "var(--butter)", char: "◆" },
  { left: 92, delay: 0.19, color: "var(--plum)", char: "▲" },
  { left: 20, delay: 0.27, color: "var(--mint)", char: "■" },
  { left: 36, delay: 0.06, color: "var(--coral)", char: "★" },
  { left: 52, delay: 0.3, color: "var(--lime)", char: "✦" },
  { left: 68, delay: 0.16, color: "var(--sky)", char: "●" },
  { left: 84, delay: 0.24, color: "var(--butter)", char: "◆" },
  { left: 4, delay: 0.21, color: "var(--plum)", char: "▲" },
  { left: 96, delay: 0.1, color: "var(--mint)", char: "■" },
];

export function Confetti({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {BITS.map((b, i) => (
        <span
          key={i}
          className="animate-confetti absolute top-0 text-lg font-black"
          style={{
            left: `${b.left}%`,
            color: b.color,
            animationDelay: `${b.delay}s`,
          }}
        >
          {b.char}
        </span>
      ))}
    </div>
  );
}
