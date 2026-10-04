import type { AnnotationLayer } from "./types.js";

/** The Annotation Layers in order, each resting on the ones before it. */
export const annotationLayers: readonly AnnotationLayer[] = [
	"Segmentation",
	"Attestation",
	"Reading",
	"Knowledge",
];

/** A layer's place in `annotationLayers`; -1 for none. */
export function layerRank(layer: AnnotationLayer | undefined): number {
	return layer === undefined ? -1 : annotationLayers.indexOf(layer);
}

/**
 * Whether a person has reviewed the record's `layer`: its Review Depth is
 * that layer or a deeper one.
 */
export function isReviewed(
	record: { reviewDepth?: AnnotationLayer },
	layer: AnnotationLayer,
): boolean {
	return layerRank(record.reviewDepth) >= layerRank(layer);
}
