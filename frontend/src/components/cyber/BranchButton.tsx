import BranchIcon from "./BranchIcon";

interface BranchButtonProps {
  onClick?: () => void;
  size?: number;
  className?: string;
  "aria-label"?: string;
}

export default function BranchButton({
  onClick,
  size = 24,
  className = "",
  "aria-label": ariaLabel = "Создать ветку",
}: BranchButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`group/branch flex size-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${className}`}
    >
      <span className="flex size-8 items-center justify-center rounded-full text-[#444444] transition-all duration-200 group-hover/branch:bg-[#ffb35c] group-hover/branch:text-black">
        <BranchIcon size={size} />
      </span>
    </button>
  );
}
