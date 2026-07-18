import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium font-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--calabash-orange)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--calabash-orange)] text-white hover:bg-[#d67714]",
        secondary:
          "bg-[var(--calabash-dark-green)] text-[var(--calabash-beige)] hover:bg-[#0e3a34]",
        outline:
          "border border-[var(--calabash-light-green)] bg-white text-[var(--calabash-dark-green)] hover:bg-[var(--calabash-beige)]",
        ghost:
          "text-[var(--calabash-dark-green)] hover:bg-[var(--calabash-light-green)]/25",
        danger: "bg-red-700 text-white hover:bg-red-800",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
);
Button.displayName = "Button";
