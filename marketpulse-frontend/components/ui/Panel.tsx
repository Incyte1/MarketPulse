import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cx } from "@/lib/utils";

type PanelProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export default function Panel<T extends ElementType = "section">({
  as,
  children,
  className,
  ...props
}: PanelProps<T>) {
  const Component = (as || "section") as ElementType;

  return (
    <Component className={cx("workspace-panel", className)} {...props}>
      {children}
    </Component>
  );
}
