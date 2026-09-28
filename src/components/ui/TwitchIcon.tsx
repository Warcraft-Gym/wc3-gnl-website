import { cn } from "@/lib/utils";

/** Twitch's glitch mark, per brand.twitch.tv. Rendered in currentColor so it
 *  can sit on Twitch Purple, white or muted contexts; never recolour it to
 *  anything off-brand or alter its proportions. */
export function TwitchIcon({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <path d="M4.265 0 1.5 2.765v18.47h6.353V24l2.765-2.765h4.5L21.882 14.5V0H4.265Zm15.353 13.5-3.53 3.529h-3.529l-3.088 3.088v-3.088H5.588V1.765h14.03V13.5Z" />
      <path d="M15.353 5.294h1.765v5.294h-1.765zM10.5 5.294h1.765v5.294H10.5z" />
    </svg>
  );
}
