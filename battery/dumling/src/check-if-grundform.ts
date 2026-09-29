import { matchFeatures } from "./grundform/features.js";
import {
	GrundformAssessmentError,
	type GrundformResult,
} from "./grundform/result.js";
import { ruleFor } from "./grundform/rules.js";
import { spellsCanonicalForm } from "./grundform/wording.js";
import type { Surface } from "./types.js";

/**
 * Assesses a validated Surface against its Lemma's canonical realization.
 * Known contrary spelling or grammar returns success with false. Missing,
 * ambiguous, or unrepresentable evidence returns a typed error with issue paths.
 * A supplied Variant spelling, whatever its tags, is trusted as a spelling of
 * the Lemma; this function does not perform spell checking or infer missing
 * grammar.
 * Routes without represented inflection use the canonical form/Variant evidence.
 * A Saying's spelling is compared by its words only (ADR 0039). A German or
 * English ADV or ADJ is assessed from its Lemma's comparability (ADR 0042):
 * a comparable one cites its positive, and a non-comparable one without
 * inflection (`hier`, `tot`) is Grundform by its spelling.
 * A noun's article is not part of its form (ADR 0035), so no rule reads it.
 * Parse unknown input with parseUnit first. No field or caller override stores
 * the assessment, and neither the Surface nor its feature bags are modified.
 */
export function checkIfGrundform(surface: Surface): GrundformResult {
	if (surface.spelling.kind !== "Variant" && !spellsCanonicalForm(surface))
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
