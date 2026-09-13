import type { Surface } from "../types.js";
import type { GrundformFeatureValue, GrundformIssue } from "./result.js";

export type FeatureRequirements = Readonly<
	Record<string, readonly (string | null)[]>
>;
export interface GrundformRule {
	readonly features: FeatureRequirements;
	readonly issue?: GrundformIssue;
}

export function inflectionalFeatures(
	surface: Surface,
): Readonly<Record<string, GrundformFeatureValue>> | null {
	return "inflectionalFeatures" in surface
		? surface.inflectionalFeatures
		: null;
}

/** A known counterexample decides false even if other coordinates are unknown. */
export function matchFeatures(surface: Surface, rule: GrundformRule) {
	const bag = inflectionalFeatures(surface);
	const issues: GrundformIssue[] = [];
	let mismatch = false;
	for (const [feature, expected] of Object.entries(rule.features)) {
		const received = bag?.[feature] ?? null;
		// A null in a present bag can represent an unmarked coordinate when the
		// rule explicitly permits it. A missing bag never supplies that evidence.
		if (bag === null || (received === null && !expected.includes(null))) {
			issues.push({
				_tag: "InsufficientFeatures",
				path: ["inflectionalFeatures", feature],
				expected,
				received,
				message: `Grundform requires evidence for ${feature}`,
			});
			continue;
		}
		const values = Array.isArray(received) ? received : [received];
		const matches = values.filter((value) => expected.includes(value));
		if (matches.length === 0) mismatch = true;
		else if (matches.length !== values.length)
			issues.push({
				_tag: "AmbiguousFeatures",
				path: ["inflectionalFeatures", feature],
				expected,
				received,
				message: `${feature} includes both Grundform and other analyses`,
			});
	}
	if (rule.issue) issues.push(rule.issue);
	return { mismatch, issues };
}
