/** What an attempt's changes add up to for its Reading: its Knowledge and its Paradigm forms. */
import type * as Dumcorpus from "dumcorpus/types";
import type * as Dumling from "dumling/types";
import { applyKnowledgeChange, applyParadigmChanges } from "dumrel";
import type * as Dumrel from "dumrel/types";

/** The Knowledge an attempt's changes add up to, each change Dumrel takes applied in order. */
export function producedKnowledge(
	reading: Dumling.Reading<"de">,
	changes: readonly unknown[],
): Dumrel.ReadingKnowledge<Dumling.Reading<"de">> {
	let knowledge: Dumrel.ReadingKnowledge<Dumling.Reading<"de">> = {};
	for (const change of changes) {
		const applied = applyKnowledgeChange({
			source: reading,
			knowledge,
			change,
		});
		if (applied.success) knowledge = applied.value;
	}
	return knowledge;
}

/**
 * What the Reading licenses once an attempt's Paradigm Changes are applied,
 * per dimension its forms; changes Dumrel refuses as a list add nothing.
 */
export function producedParadigm(
	reading: Dumling.Reading<"de">,
	changes: readonly unknown[],
): Dumcorpus.ReadingParadigm {
	const applied = applyParadigmChanges({
		lemma: reading.lemma,
		readings: [reading],
		paradigm: { dimensions: {} },
		changes,
	});
	if (!applied.success) return {};
	return Object.fromEntries(
		Object.entries(applied.value.dimensions).map(([dimension, stored]) => [
			dimension,
			(stored?.variants ?? []).map(({ value }) => value),
		]),
	);
}
