import { Suspense } from "react";
import ChartWorkspace from "@/components/charting/ChartWorkspace";

export default function ChartPage() {
  return (
    <Suspense fallback={null}>
      <ChartWorkspace />
    </Suspense>
  );
}
