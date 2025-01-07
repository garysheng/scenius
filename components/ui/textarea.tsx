import * as React from "react"

import { cn } from "@/lib/utils"

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-gradient-to-r from-[#1a1625] to-[#231d31] px-3 py-2 text-sm",
          "ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-[#6d28d9] focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-300 hover:bg-gradient-to-r hover:from-[#231d31] hover:to-[#2a2339]",
          "animate-gradient bg-[length:200%_200%]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea } 