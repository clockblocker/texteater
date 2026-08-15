import {
	applyKnowledgeChange,
	type LemmaKnowledge,
	type ReadingKnowledge,
} from "dumrel";
import type {
	LemmaKnowledgeChange,
	LemmaRecord,
	ReadingEntry,
	ReadingKnowledgeChange,
} from "../dto";
import type { SupportedLanguage } from "../dumling";
import { sameLemma, sameReading } from "./identity";

export function applyDumdictKnowledgeChange<L extends SupportedLanguage>(
	record: LemmaRecord<L>,
	envelope: LemmaKnowledgeChange<L>,
): LemmaRecord<L>;
export function applyDumdictKnowledgeChange<L extends SupportedLanguage>(
	record: ReadingEntry<L>,
	envelope: ReadingKnowledgeChange<L>,
): ReadingEntry<L>;
export function applyDumdictKnowledgeChange<L extends SupportedLanguage>(
	record: LemmaRecord<L> | ReadingEntry<L>,
	envelope: LemmaKnowledgeChange<L> | ReadingKnowledgeChange<L>,
): LemmaRecord<L> | ReadingEntry<L> {
	if (envelope.owner.kind === "Lemma") {
		if (envelope.change.aspect !== "transcriptions") {
			throw new Error(
				"Lemma Knowledge accepts only transcription Changes.",
			);
		}
		if (
			!("lemma" in record) ||
			!sameLemma(record.lemma, envelope.owner.lemma)
		) {
			throw new Error(
				"Knowledge Change owner does not match the Lemma Record.",
			);
		}
		const knowledge = applyKnowledgeChange(
			record.knowledge as LemmaKnowledge | undefined,
			(envelope as LemmaKnowledgeChange<L>).change,
		);
		const { knowledge: _existing, ...withoutKnowledge } = record;
		return Object.keys(knowledge).length === 0
			? withoutKnowledge
			: { ...withoutKnowledge, knowledge };
	}
	if (envelope.change.aspect === "transcriptions") {
		throw new Error(
			"Reading Knowledge does not accept transcription Changes.",
		);
	}

	if (
		!("reading" in record) ||
		!sameReading(record.reading, envelope.owner.reading)
	) {
		throw new Error(
			"Knowledge Change owner does not match the Reading Entry.",
		);
	}
	const readingEnvelope = envelope as ReadingKnowledgeChange<L>;
	const knowledge = applyKnowledgeChange(
		record.knowledge as
			| ReadingKnowledge<string, ReadingEntry<L>["reading"]>
			| undefined,
		readingEnvelope.change,
	);
	const { knowledge: _existing, ...withoutKnowledge } = record;
	return Object.keys(knowledge).length === 0
		? withoutKnowledge
		: { ...withoutKnowledge, knowledge };
}
