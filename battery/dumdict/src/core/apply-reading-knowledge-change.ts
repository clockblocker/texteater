import { sameLemma, sameReading } from "dumling";
import type * as Dumling from "dumling/types";
import { applyKnowledgeChanges } from "dumrel";

import type { ReadingEntry, ReadingKnowledgeChange } from "../domain-types";

/**
 * Why Dumdict refuses an envelope before Dumrel sees its change, or undefined
 * when Dumrel decides.
 */
function envelopeRefusal<L extends Dumling.Language>(
	record: ReadingEntry<L>,
	envelope: ReadingKnowledgeChange<L>,
): string | undefined {
	if (!sameReading(record.reading, envelope.reading))
		return "Knowledge Change Reading does not match the Reading Entry.";
	const change = envelope.change;
	if (
		change.aspect === "semanticRelations" &&
		"value" in change &&
		(change.targetKind === "reading"
			? change.value.some((target) => sameReading(record.reading, target))
			: change.value.some((target) =>
					sameLemma(record.reading.lemma, target),
				))
	)
		return "Reading Knowledge cannot contain a direct same-Lemma relation.";
	return undefined;
}

/**
 * Applies Knowledge Change envelopes to a Reading Entry in order, and throws
 * what applying them one by one would throw first: an envelope for another
 * Reading, a direct same-Lemma relation, or Dumrel's ParsingError. Dumrel
 * parses the Knowledge once for the whole list, so a patch costs two parses,
 * not two per change. No envelopes return the entry as it is.
 */
export function applyDumdictKnowledgeChanges<L extends Dumling.Language>(
	record: ReadingEntry<L>,
	envelopes: readonly ReadingKnowledgeChange<L>[],
): ReadingEntry<L> {
	let refusal: string | undefined;
	let refusedAt = envelopes.length;
	for (const [index, envelope] of envelopes.entries()) {
		refusal = envelopeRefusal(record, envelope);
		if (refusal !== undefined) {
			refusedAt = index;
			break;
		}
	}
	// The changes before a refused envelope still apply first, so their own
	// failure wins, as it would one by one.
	const applied = applyChanges(record, envelopes.slice(0, refusedAt));
	if (refusal !== undefined) throw new Error(refusal);
	return applied;
}

function applyChanges<L extends Dumling.Language>(
	record: ReadingEntry<L>,
	envelopes: readonly ReadingKnowledgeChange<L>[],
): ReadingEntry<L> {
	if (envelopes.length === 0) return record;
	const result = applyKnowledgeChanges({
		source: record.reading,
		knowledge: record.knowledge ?? {},
		changes: envelopes.map(({ change }) => change),
	});
	if (!result.success) throw result.error;
	const { knowledge: _existing, ...withoutKnowledge } = record;
	return Object.keys(result.value).length === 0
		? withoutKnowledge
		: { ...withoutKnowledge, knowledge: result.value };
}
