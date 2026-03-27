import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  block?: boolean;
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  block = false,
  className,
}: Pick<ButtonProps, "variant" | "size" | "block" | "className"> = {}) {
  return cx(
    variant === "primary"
      ? "action-button"
      : variant === "secondary"
        ? "action-button-secondary"
        : "action-button-ghost",
    size === "sm" ? "min-h-10 px-3 text-xs" : "min-h-11 px-4 text-sm",
    block && "w-full",
    className
  );
}

export default function Button({
  className,
  variant = "primary",
  size = "md",
  block = false,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClassName({ className, variant, size, block })}
      {...props}
    />
  );
}
