import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import {
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  createContext,
  useContext,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SidebarContextValue {
  open: boolean;
  setOpen: (next: boolean | ((value: boolean) => boolean)) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error("Sidebar components must be used within SidebarProvider.");
  }

  return context;
}

interface SidebarProviderProps extends HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SidebarProvider({
  children,
  className,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  ...props
}: SidebarProviderProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;

  const value = {
    open,
    setOpen(next: boolean | ((value: boolean) => boolean)) {
      const resolved = typeof next === "function" ? next(open) : next;
      if (openProp === undefined) {
        setUncontrolledOpen(resolved);
      }
      onOpenChange?.(resolved);
    },
  };

  return (
    <SidebarContext.Provider value={value}>
      <TooltipProvider>
        <div className={cn("min-h-screen w-full", className)} data-sidebar-open={open ? "true" : "false"} {...props}>
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

export function Sidebar({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  const { open } = useSidebar();

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200",
        open ? "w-72" : "w-20",
        className,
      )}
      data-state={open ? "open" : "collapsed"}
      {...props}
    >
      {children}
    </aside>
  );
}

export function SidebarTrigger({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = useSidebar();

  return (
    <Button
      className={cn("rounded-xl shadow-none hover:translate-y-0", className)}
      onClick={() => setOpen((value) => !value)}
      type="button"
      variant="ghost"
      {...props}
    >
      {children || (
        <>
          {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          <span>{open ? "Collapse" : "Expand"}</span>
        </>
      )}
    </Button>
  );
}

export function SidebarHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { open } = useSidebar();
  return <div className={cn("border-b border-slate-200 py-6", open ? "px-6" : "px-3", className)} {...props} />;
}

export function SidebarContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { open } = useSidebar();
  return <div className={cn("flex flex-1 flex-col gap-6 overflow-y-auto py-6", open ? "px-4" : "px-2", className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { open } = useSidebar();
  return <div className={cn("mt-auto border-t border-slate-200 py-4", open ? "px-4" : "px-2", className)} {...props} />;
}

export function SidebarInset({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 flex-1", className)} {...props} />;
}

export function SidebarGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-3", className)} {...props} />;
}

export function SidebarGroupHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { open } = useSidebar();
  return <div className={cn("flex items-center justify-between gap-2", open ? "px-2" : "justify-center px-0", className)} {...props} />;
}

export function SidebarGroupLabel({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  const { open } = useSidebar();
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 transition-opacity",
        open ? "opacity-100" : "pointer-events-none opacity-0",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarGroupAction({
  className,
  tooltip,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tooltip?: ReactNode }) {
  const { open } = useSidebar();
  const button = (
    <button
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950",
        className,
      )}
      type="button"
      {...props}
    />
  );

  if (open || !tooltip) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function SidebarGroupContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1", className)} {...props} />;
}

export function SidebarMenu({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("space-y-1", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: HTMLAttributes<HTMLLIElement>) {
  return <li className={cn("group/menu-item relative list-none", className)} {...props} />;
}

const sidebarMenuButtonVariants = cva(
  "flex w-full items-center gap-3 overflow-hidden rounded-xl text-left text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2",
  {
    variants: {
      active: {
        true: "bg-deep-blue text-white",
        false: "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
      },
      collapsed: {
        true: "h-12 justify-center px-0",
        false: "px-4 py-3",
      },
    },
    defaultVariants: {
      active: false,
      collapsed: false,
    },
  },
);

interface SidebarMenuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  active?: boolean;
  tooltip?: ReactNode;
}

export function SidebarMenuButton({
  active = false,
  asChild,
  className,
  children,
  tooltip,
  ...props
}: SidebarMenuButtonProps) {
  const { open } = useSidebar();
  const Comp = asChild ? Slot : "button";

  const content = (
    <Comp
      className={cn(sidebarMenuButtonVariants({ active, collapsed: !open }), className)}
      data-active={active ? "true" : "false"}
      {...props}
    >
      {children}
    </Comp>
  );

  if (open || !tooltip) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function SidebarMenuBadge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  const { open } = useSidebar();

  return (
    <span
      className={cn(
        "pointer-events-none absolute right-10 top-1/2 inline-flex -translate-y-1/2 items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600",
        open ? "opacity-100" : "opacity-0",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarMenuAction({
  className,
  showOnHover = true,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { showOnHover?: boolean }) {
  const { open } = useSidebar();

  if (!open) {
    return null;
  }

  return (
    <button
      className={cn(
        "absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950",
        showOnHover && "opacity-0 group-hover/menu-item:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
        className,
      )}
      type="button"
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">Open menu</span>
    </button>
  );
}

export function SidebarMenuSub({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
  const { open } = useSidebar();
  if (!open) {
    return null;
  }

  return <ul className={cn("ml-5 space-y-1 border-l border-slate-200 pl-3", className)} {...props} />;
}

export function SidebarMenuSubItem({ className, ...props }: HTMLAttributes<HTMLLIElement>) {
  return <li className={cn("list-none", className)} {...props} />;
}

interface SidebarMenuSubButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  active?: boolean;
}

export function SidebarMenuSubButton({
  asChild,
  active = false,
  className,
  ...props
}: SidebarMenuSubButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        active ? "bg-slate-100 font-semibold text-slate-950" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
        className,
      )}
      {...props}
    />
  );
}
