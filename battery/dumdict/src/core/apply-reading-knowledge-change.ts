import type * as Dumling from "dumling/types";
import { applyKnowledgeChange } from "dumrel";

import type { ReadingEntry, ReadingKnowledgeChange } from "../dto";
import { sameLemma, sameReading } from "./identity";

export function applyDumdictKnowledgeChange<L extends Dumling.Language>(
	record: ReadingEntry<L>,
	envelope: ReadingKnowledgeChange<L>,
): ReadingEntry<L>;
export function applyDumdictKnowledgeChange<L extends Dumling.Language>(
	record: ReadingEntry<L>,
	envelope: ReadingKnowledgeChange<L>,
): ReadingEntry<L> {
	if (!sameReading(record.reading, envelope.reading)) {
		throw new Error(
			"Knowledge Change Reading does not match the Reading Entry.",
		);
	}
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
		throw new Error(
			"Reading Knowledge cannot contain a direct same-Lemma relation.",
		);

	const result = applyKnowledgeChange({
		source: record.reading,
		knowledge: record.knowledge ?? {},
		change: envelope.change,
	});
	if (!result.success) throw result.error;
	const { knowledge: _existing, ...withoutKnowledge } = record;
	return Object.keys(result.value).length === 0
		? withoutKnowledge
		: { ...withoutKnowledge, knowledge: result.value };
}
