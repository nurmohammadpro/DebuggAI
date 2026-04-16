/**
 * Sonner Toast - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
 */

"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" style={{ color: 'var(--ds-green)' }} />
        ),
        info: (
          <InfoIcon className="size-4" style={{ color: 'var(--ds-blue)' }} />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" style={{ color: 'var(--ds-amber)' }} />
        ),
        error: (
          <OctagonXIcon className="size-4" style={{ color: 'var(--ds-red)' }} />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" style={{ color: 'var(--ds-green)' }} />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--ds-surface2)",
          "--normal-text": "var(--ds-text)",
          "--normal-border": "var(--ds-border2)",
          "--border-radius": "8px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
