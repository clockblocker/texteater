import { applyKnowledgeChange, type ReadingKnowledge } from "dumrel";
import type { ReadingEntry, ReadingKnowledgeChange } from "../dto";
import type { Lemma, SupportedLanguage } from "../dumling";
import { sameLemma, sameReading } from "./identity";

export function applyDumdictKnowledgeChange<L extends SupportedLanguage>(
	record: ReadingEntry<L>,
	envelope: ReadingKnowledgeChange<L>,
): ReadingEntry<L>;
export function applyDumdictKnowledgeChange<L extends SupportedLanguage>(
	record: ReadingEntry<L>,
	envelope: ReadingKnowledgeChange<L>,
): ReadingEntry<L> {
	if (!sameReading(record.reading, envelope.reading)) {
		throw new Error(
			"Knowledge Change Reading does not match the Reading Entry.",
		);
	}
	if (
		envelope.change.aspect === "semanticRelations" &&
		"value" in envelope.change &&
		envelope.change.value.some((target) =>
			sameLemma(record.reading.lemma, target),
		)
	)
		throw new Error(
			"Reading Knowledge cannot contain a direct same-Lemma relation.",
		);
	const knowledge = applyKnowledgeChange(
		record.knowledge as ReadingKnowledge<string, Lemma<L>> | undefined,
		envelope.change,
	);
	const { knowledge: _existing, ...withoutKnowledge } = record;
	return Object.keys(knowledge).length === 0
		? withoutKnowledge
		: { ...withoutKnowledge, knowledge };
}
