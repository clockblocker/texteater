import type * as Dumling from "dumling/types";
import {
	type AuthoredRealization,
	authoredMembers,
	authoredRealizations,
} from "dumspec/inventories";
import { sameValue } from "./select.js";

// Multiple Readings may share one Lemma. Deduplicate once so expanded paradigms
// do not cause a quadratic scan for every encountered pronoun.
const grammaticalMembers = authoredMembers.filter(
	(member, index) =>
		(member.lemma.kind === "DET" ||
			member.lemma.kind === "PRON" ||
			member.lemma.kind === "AUX") &&
		!authoredMembers
			.slice(0, index)
			.some((prior) => sameValue(prior.lemma, member.lemma)),
);

/** Core nulls compare literally; no missing spelling map is interpreted as catalog absence. */
export function locateAuthoredIdentity(
	input: {
		kind: "DET" | "PRON" | "AUX";
		spelled: string;
		core: Record<string, unknown>;
		inflection: unknown;
	},
	mappings: readonly AuthoredRealization[] = authoredRealizations,
) {
	const compatible = grammaticalMembers.filter(
		(member) =>
			member.lemma.kind === input.kind &&
			sameValue(member.lemma.coreFeatures, input.core),
	);
	const matches = [
		...new Set(
			mappings
				.filter(
					(mapping) =>
						compatible.includes(mapping.member) &&
						mapping.spelled.normalize("NFC") ===
							input.spelled.normalize("NFC") &&
						Object.entries(mapping.inflection ?? {}).every(
							([key, value]) =>
								input.inflection !== null &&
								typeof input.inflection === "object" &&
								sameValue(
									(
										input.inflection as Record<
											string,
											unknown
										>
									)[key],
									value,
								),
						),
				)
				.map((mapping) => mapping.member),
		),
	];
	return {
		matches,
		compatible,
		status:
			matches.length === 1
				? ("Hit" as const)
				: matches.length
					? ("Ambiguous" as const)
					: ("Gap" as const),
	};
}

export function validateAuthoredRealizations(
	mappings: readonly AuthoredRealization[] = authoredRealizations,
): void {
	for (const mapping of mappings) {
		if (!authoredMembers.includes(mapping.member))
			throw Error("Realization refers to an unauthored identity");
		if (
			!mapping.spelled.trim() ||
			mapping.spelled !== mapping.spelled.trim()
		)
			throw Error("Invalid authored realization text");
		const lemma: Dumling.Lemma = mapping.member.lemma;
		if (
			lemma.kind !== "DET" &&
			lemma.kind !== "PRON" &&
			lemma.kind !== "AUX"
		)
			throw Error("Unsupported authored realization route");
	}
}
