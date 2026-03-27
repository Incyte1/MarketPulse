import { cx } from "@/lib/utils";

type LineChartProps = {
  points: number[];
  height?: number;
  className?: string;
  tone?: "accent" | "positive" | "neutral";
};

function buildPath(points: number[], width: number, height: number) {
  if (points.length === 0) return "";

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = points.length === 1 ? width : width / (points.length - 1);

  return points
    .map((point, index) => {
      const x = Number((index * step).toFixed(2));
      const y = Number((height - ((point - min) / range) * height).toFixed(2));
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function buildArea(path: string, width: number, height: number) {
  if (!path) return "";
  return `${path} L ${width} ${height} L 0 ${height} Z`;
}

export default function LineChart({
  points,
  height = 220,
  className,
  tone = "accent",
}: LineChartProps) {
  const width = 560;
  const linePath = buildPath(points, width, height - 14);
  const areaPath = buildArea(linePath, width, height);
  const hash = Math.abs(points.reduce((total, point, index) => total + point * (index + 1), 0))
    .toString()
    .replace(".", "");
  const gradientId = `chart-gradient-${hash}-${tone}`;
  const stroke =
    tone === "positive"
      ? "#86c38b"
      : tone === "neutral"
        ? "#c9d0da"
        : "#dfbb82";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cx("h-full w-full", className)}
      role="img"
      aria-label="Price trend"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0.2, 0.45, 0.7].map((offset) => (
        <line
          key={offset}
          x1="0"
          x2={width}
          y1={height * offset}
          y2={height * offset}
          stroke="rgba(242,235,225,0.08)"
          strokeWidth="1"
        />
      ))}

      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}
