import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Input({ className, ...props }: InputProps) {
  return <input className={cx("text-input", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cx("text-input min-h-28 resize-y", className)} {...props} />;
}
