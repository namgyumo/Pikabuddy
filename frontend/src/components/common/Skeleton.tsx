interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export default function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = "var(--radius-sm)",
  style,
}: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card skeleton-card">
      <Skeleton height={20} width="60%" style={{ marginBottom: 12 }} />
      <Skeleton height={14} width="90%" style={{ marginBottom: 8 }} />
      <Skeleton height={14} width="40%" />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="course-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
