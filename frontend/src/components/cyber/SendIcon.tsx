interface SendIconProps {
  className?: string;
}

export default function SendIcon({ className = "text-white" }: SendIconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M8 12V4M8 4L5 7M8 4l3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
