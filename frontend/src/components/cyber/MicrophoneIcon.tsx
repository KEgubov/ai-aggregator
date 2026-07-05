interface MicrophoneIconProps {
  className?: string;
}

export default function MicrophoneIcon({ className = "text-[#d9d9d9]/60" }: MicrophoneIconProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect x="7" y="2" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M4 10a6 6 0 0012 0M10 16v2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
