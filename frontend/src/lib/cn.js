import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
 * tailwind-merge only knows Tailwind's default font sizes. Our @theme adds two
 * (`--text-2xs` and `--text-display`, see styles/app.css), and an unknown
 * `text-*` class is taken to be a COLOUR — so `cn("text-display", "text-slate-900")`
 * silently dropped the size and every hero figure rendered at 16px. Declaring
 * them as font sizes makes size and colour merge independently again.
 * If you add a `--text-*` size token, add its name here; cn.test.js checks it.
 */
export const CUSTOM_TEXT_SIZES = ["2xs", "display"];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: CUSTOM_TEXT_SIZES }],
    },
  },
});

/**
 * Join class names and let later Tailwind classes win over earlier ones:
 * cn("px-3 text-sm", isLarge && "px-4") -> "text-sm px-4".
 */
export const cn = (...inputs) => twMerge(clsx(inputs));

export default cn;
