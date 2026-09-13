import { matchFeatures } from "./grundform/features.js";
import {
	GrundformAssessmentError,
	type GrundformResult,
} from "./grundform/result.js";
import { ruleFor } from "./grundform/rules.js";
import type { Surface } from "./types.js";

/**
 * Assesses a validated Surface against its Lemma's canonical realization.
 * Known contrary spelling or grammar returns success with false. Missing,
 * ambiguous, or unrepresentable evidence returns a typed error with issue paths.
 * A supplied Variant spelling is trusted as an accepted spelling alternative;
 * this function does not perform spell checking or infer missing grammar.
 * Routes without represented inflection use the canonical form/variant evidence.
 * Parse unknown input with parseUnit first. No field or caller override stores
 * the assessment, and neither the Surface nor its feature bags are modified.
 */
export function checkIfGrundform(surface: Surface): GrundformResult {
	if (
		surface.spelling !== "Variant" &&
		surface.normalizedSurface !== surface.lemma.canonicalForm
	)
		return { success: true, value: false };
	const { mismatch, issues } = matchFeatures(surface, ruleFor(surface));
	if (mismatch) return { success: true, value: false };
	const [first, ...rest] = issues;
	if (first)
		return {
			success: false,
			error: new GrundformAssessmentError(surface, [first, ...rest]),
		};
	return { success: true, value: true };
}
