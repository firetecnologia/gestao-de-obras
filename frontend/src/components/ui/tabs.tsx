import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <div className={cn("w-full", className)} data-value={value}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{ value?: string; activeValue?: string; onValueChange?: (v: string) => void }>, { activeValue: value, onValueChange })
        }
        return child
      })}
    </div>
  )
}

function TabsList({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { activeValue?: string; onValueChange?: (v: string) => void }) {
  const { activeValue, onValueChange, ...rest } = props as { activeValue?: string; onValueChange?: (v: string) => void } & React.HTMLAttributes<HTMLDivElement>
  return (
    <div className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)} {...rest}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{ activeValue?: string; onValueChange?: (v: string) => void }>, { activeValue, onValueChange })
        }
        return child
      })}
    </div>
  )
}

function TabsTrigger({ className, value, children, activeValue, onValueChange, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string; activeValue?: string; onValueChange?: (v: string) => void }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none",
        activeValue === value ? "bg-background text-foreground shadow" : "hover:bg-background/50",
        className
      )}
      onClick={() => onValueChange?.(value)}
      {...props}
    >
      {children}
    </button>
  )
}

function TabsContent({ value, activeValue, children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string; activeValue?: string; onValueChange?: (v: string) => void }) {
  if (activeValue !== value) return null
  return <div className={cn("mt-2", className)} {...props}>{children}</div>
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
