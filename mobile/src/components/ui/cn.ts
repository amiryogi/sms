/** Join class names, skipping falsy ones. The kit avoids conflicting utilities, so no merging is needed. */
export const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
