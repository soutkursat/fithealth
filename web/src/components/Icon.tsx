const PATHS = {
  flame: "M12 2c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8ZM6 14a6 6 0 0 0 12 0",
  fork: "M7 2v8a2 2 0 0 0 2 2v10M11 2v8M15 2c-1.5 1-2 3-2 6s1 4 2 4v10",
  scale: "M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7Zm14 0-3 7a3 3 0 0 0 6 0l-3-7Z",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  steps: "M8 3c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5Zm-2 13h4v2a2 2 0 0 1-4 0v-2Zm10-9c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5Zm-2 13h4v1a2 2 0 0 1-4 0v-1Z",
  trend: "M3 7l6 6 4-4 8 8M21 11v6h-6",
  fire: "M12 22c4 0 7-3 7-7 0-5-4-7-5-11-2 2-3 4-3 6-1-1-2-2-2-4-2 2-4 5-4 9 0 4 3 7 7 7Z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "size-4" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
