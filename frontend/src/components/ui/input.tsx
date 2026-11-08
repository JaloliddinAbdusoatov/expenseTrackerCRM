import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-border/80 bg-muted/70 px-4 py-3 text-base text-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_24px_rgba(0,0,0,0.18)] transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/90 hover:border-border focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_0_1px_rgba(124,102,255,0.45),0_0_0_4px_rgba(124,102,255,0.16),0_12px_30px_rgba(124,102,255,0.20)] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
