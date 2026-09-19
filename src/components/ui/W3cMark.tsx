import Image from "next/image";
import { cn } from "@/lib/utils";

/** The W3Champions crown, for links that leave for w3champions.com. */
export function W3cMark({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo/w3champions.png"
      alt=""
      width={size}
      height={size}
      className={cn("inline-block shrink-0 align-[-2px]", className)}
    />
  );
}
