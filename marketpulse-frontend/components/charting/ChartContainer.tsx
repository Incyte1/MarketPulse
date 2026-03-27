"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

type ChartContainerProps = {
  className?: string;
  toolbar: ReactNode;
  leftRail: ReactNode;
  chart: ReactNode;
  rightRail: ReactNode;
  footer: ReactNode;
};

export default function ChartContainer({
  className,
  toolbar,
  leftRail,
  chart,
  rightRail,
  footer,
}: ChartContainerProps) {
  return (
    <section className={cx("chart-desk reveal-up", className)}>
      <div className="chart-desk-toolbar">{toolbar}</div>

      <div className="chart-desk-body">
        <aside className="chart-desk-tools">{leftRail}</aside>
        <div className="chart-desk-stage">{chart}</div>
        <aside className="chart-desk-inspector">{rightRail}</aside>
      </div>

      <div className="chart-desk-footer">{footer}</div>
    </section>
  );
}
