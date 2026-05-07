/**
 * Badge Component - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "badge inline-flex items-center gap-1 font-mono text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "",
        green: "bg-green-muted/15 text-green-bright",
        red: "bg-red/15 text-red",
        amber: "bg-amber/15 text-amber",
        blue: "bg-blue/15 text-blue",
        purple: "bg-purple/15 text-purple",
        gray: "bg-surface3 text-text2",
        outline: "bg-transparent border border-current",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, dot, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)}>
      {props.children}
    </div>
  )
}

export { Badge, badgeVariants }
