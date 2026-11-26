import React from "react";
import type { ContentStatus } from "@/types/pasanku";
import { Check, Clock, Edit3, FileText, Globe } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "success" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-bold rounded-control cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeClass =
    size === "sm"
      ? "min-h-[40px] px-3.5 text-sm"
      : size === "lg"
        ? "min-h-[50px] px-6 text-base"
        : "min-h-[48px] px-5 text-sm md:text-base";

  const variantClass: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary:
      "bg-brand text-white hover:bg-brand-lip tactile-btn tactile-brand",
    accent:
      "bg-accent text-ink border border-accent-border hover:brightness-95 tactile-btn tactile-accent",
    success:
      "bg-success text-white hover:bg-success-lip tactile-btn tactile-success",
    secondary:
      "bg-surface text-ink border-2 border-border-control hover:bg-surface-soft tactile-btn tactile-neutral",
    ghost: "bg-transparent text-ink-soft hover:bg-surface-soft min-h-[44px]",
  };

  return (
    <button
      className={`${base} ${sizeClass} ${variantClass[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
  focal = false,
}: {
  children: React.ReactNode;
  className?: string;
  focal?: boolean;
}) {
  return (
    <div
      className={`bg-surface border border-border-subtle rounded-card p-5 ${focal ? "shadow-(--shadow-focal)" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function WovenDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-2.5 py-1 ${className}`}
      aria-hidden="true"
    >
      <span className="h-2.5 w-2.5 rotate-45 bg-brand inline-block" />
      <span className="h-3 w-3 rotate-45 bg-accent border border-accent-border inline-block" />
      <span className="h-2.5 w-2.5 rotate-45 bg-brand inline-block" />
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  color = "success",
  label,
}: {
  value: number;
  max?: number;
  color?: "success" | "accent" | "brand";
  label?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const barColor =
    color === "accent"
      ? "bg-accent"
      : color === "brand"
        ? "bg-brand"
        : "bg-success";

  return (
    <div
      className="w-full h-3.5 bg-surface-soft border border-border-subtle rounded-full overflow-hidden"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progres belajar"}
    >
      <div
        className={`h-full ${barColor} rounded-full transition-all duration-200`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  const config: Record<
    ContentStatus,
    { label: string; classes: string; icon: React.ReactNode }
  > = {
    draft: {
      label: "Draf",
      classes: "bg-surface-soft text-ink-soft border-border-control",
      icon: <FileText className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    pending_review: {
      label: "Menunggu Review",
      classes: "bg-accent-tint text-ink border-accent-border",
      icon: <Clock className="w-3.5 h-3.5 text-accent-lip" aria-hidden="true" />,
    },
    changes_requested: {
      label: "Perlu Revisi",
      classes: "bg-brand-tint text-brand border-brand/40",
      icon: <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    approved: {
      label: "Disetujui Validator",
      classes: "bg-success-tint text-success border-success/40",
      icon: <Check className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    published: {
      label: "Terbit",
      classes: "bg-success text-white border-success-lip",
      icon: <Globe className="w-3.5 h-3.5" aria-hidden="true" />,
    },
  };

  const c = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip border text-xs font-semibold whitespace-nowrap ${c.classes}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

export function XpBadge({ amount }: { amount: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-chip bg-accent text-ink border border-accent-border text-xs font-extrabold whitespace-nowrap">
      <span>{amount} XP</span>
    </span>
  );
}
