
import { LucideProps } from "lucide-react";

export const Icons = {
  spinner: (props: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
      {...props}
    >
      <path d="l2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0" />
    </svg>
  ),
};
