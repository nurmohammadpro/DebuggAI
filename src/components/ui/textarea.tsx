/**
 * Textarea - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
 */

import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "inp w-full min-h-[80px] field-sizing-content",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
