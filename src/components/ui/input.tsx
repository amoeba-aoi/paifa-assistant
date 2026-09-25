"use client";

import * as React from "react";
import { cn } from "cn";

function isImeComposing(event: {
  nativeEvent?: { isComposing?: boolean; keyCode?: number };
  key?: string;
  keyCode?: number;
}): boolean {
  const ne = event.nativeEvent;
  // keyCode 229 = IME processing (Safari often lacks isComposing on keydown)
  return Boolean(ne?.isComposing || ne?.keyCode === 229 || event.keyCode === 229);
}

export type InputProps = React.ComponentProps<"input">;

/**
 * Native text input with IME-safe Enter handling so Chinese composition
 * is not interrupted by accidental form submit.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", onKeyDown, lang, inputMode, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        lang={lang ?? "zh-CN"}
        inputMode={inputMode ?? (type === "number" ? "numeric" : "text")}
        data-slot="input"
        className={cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className,
        )}
        {...props}
        onKeyDown={(event) => {
          if (event.key === "Enter" && isImeComposing(event)) {
            event.preventDefault();
            return;
          }
          onKeyDown?.(event);
        }}
      />
    );
  },
);
Input.displayName = "Input";

export { Input, isImeComposing };
