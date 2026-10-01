import type * as Dumspec from "dumspec/types";

/** A record's Review Depth and the deepest layer that passes. */
export function DepthLabel({
	reviewDepth,
	validThrough,
}: {
	reviewDepth?: Dumspec.AnnotationLayer;
	validThrough?: Dumspec.AnnotationLayer;
}) {
	return (
		<span className="text-ink-muted text-xs">
			<span className={reviewDepth ? "text-link" : undefined}>
				{reviewDepth ?? "Draft"}
			</span>
			{" · valid through "}
			{validThrough ?? "nothing"}
		</span>
	);
}
