import { twMerge } from "tailwind-merge";

/**
 * Join class names, skipping falsy ones, and let a later class win a conflict
 * ("text-base" then "text-sm" gives "text-sm"; "p-4" then "p-0" gives "p-0").
 *
 * NativeWind resolves conflicting utilities by stylesheet order, not by the
 * order they are written, so without merging a variant's size or padding
 * silently beat the className passed to override it.
 */
export const cn = (...classes: (string | false | null | undefined)[]) => twMerge(classes.filter(Boolean).join(" "));
