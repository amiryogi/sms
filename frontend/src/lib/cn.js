import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Join class names and let later Tailwind classes win over earlier ones:
 * cn("px-3 text-sm", isLarge && "px-4") -> "text-sm px-4".
 */
export const cn = (...inputs) => twMerge(clsx(inputs));

export default cn;
