/*
 * shadcn/ui Progress (added with the shadcn CLI, then restyled to our tokens).
 * We own this file: edit it like any other component. Radix provides the
 * behaviour and accessibility. See components.json and CLAUDE.md §9.
 */
import * as React from "react"
import { cn } from "@/lib/cn"
import { Progress as ProgressPrimitive } from "radix-ui"

function Progress({
  className,
  indicatorClassName,
  value,
  ...props
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-slate-100",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("h-full w-full flex-1 rounded-full bg-brand-600 transition-all", indicatorClassName)}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
