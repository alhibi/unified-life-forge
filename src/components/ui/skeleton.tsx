import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The aspect ratio of the skeleton (e.g., "16/9", "4/3", "1/1")
   */
  aspectRatio?: string;
  /**
   * Custom animation duration
   */
  animationDuration?: string;
}

function Skeleton({ className, aspectRatio, animationDuration = "2s", ...props }: SkeletonProps) {
  const skeletonClassNames = cn(
    "animate-pulse rounded-md bg-muted",
    className
  );

  if (aspectRatio) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-md bg-muted"
        style={{ 
          paddingBottom: aspectRatio,
          minHeight: aspectRatio.includes('/') ? undefined : aspectRatio
        }}
      >
        <div 
          className="absolute inset-0 w-full h-full animate-pulse bg-muted"
          style={{ animationDuration }}
        />
      </div>
    );
  }

  return <div className={skeletonClassNames} {...props} />;
}

export { Skeleton };
