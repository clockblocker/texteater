import type * as Dumcorpus from "dumcorpus/types";

/** A record's Review Depth and the deepest layer that passes. */
export function DepthLabel({
	reviewDepth,
	validThrough,
}: {
	reviewDepth?: Dumcorpus.AnnotationLayer;
	validThrough?: Dumcorpus.AnnotationLayer;
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
