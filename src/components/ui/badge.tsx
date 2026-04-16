/**
 * Badge Component - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "badge inline-flex items-center gap-1 font-mono text-xs font-medium rounded-ds px-2 py-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50 disabled:pointer-events-none",
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
  pill?: boolean
}

function Badge({ className, variant, dot, pill, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), pill && "badge-pill", className)}>
      {dot && <span className="badge-dot w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" style={{ backgroundColor: variant === 'green' ? '#00C853' : variant === 'red' ? '#FF5252' : variant === 'amber' ? '#FFAB00' : variant === 'blue' ? '#40C4FF' : variant === 'purple' ? '#CE93D8' : '' }} />}
      {props.children}
    </div>
  )
}

export { Badge, badgeVariants }
