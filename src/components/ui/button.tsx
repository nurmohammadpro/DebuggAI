/**
 * Button Component - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
 */

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "btn group/button inline-flex shrink-0 items-center justify-center rounded-ds bg-clip-padding text-[15px] font-medium whitespace-nowrap transition-all duration-100 outline-none select-none focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:text-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 active:opacity-85",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[#00E676]",
        outline:
          "border border-primary text-primary bg-transparent hover:bg-[rgba(0,200,83,0.12)]",
        ghost:
          "text-text2 bg-transparent hover:text-primary hover:bg-surface2",
        secondary:
          "bg-surface2 text-text2 hover:bg-surface3 hover:text-foreground",
        destructive:
          "bg-transparent text-destructive hover:bg-[rgba(255,82,82,0.1)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-[44px] px-6",
        sm: "h-[34px] px-4 text-[13px]",
        lg: "h-[56px] px-9 text-[17px]",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
