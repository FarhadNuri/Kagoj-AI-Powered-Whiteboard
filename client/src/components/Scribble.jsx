export default function Scribble({ className }) {
  return (
    <svg className={className} viewBox="0 0 200 12" fill="none" aria-hidden="true">
      <path
        d="M3 8 C 40 2, 80 12, 120 6 S 185 4, 197 8"
        stroke="#2f8159"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
