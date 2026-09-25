import { ParsingError } from "common-utils";
import type * as Dumling from "dumling/types";
import { conflict, contextualizeChange, parseSource } from "./context.js";
import { fingerprint } from "./fingerprint.js";
import { parseReadingKnowledge } from "./parse-reading-knowledge.js";
import type {
	KnowledgeChange,
	ReadingKnowledge,
	SemanticRelations,
	ValencyComplement,
	ValencyFrame,
	ValencySlot,
} from "./types.js";
import { parseChangeShape } from "./validation.js";

/**
 * Applies one source-aware change atomically. Contribute adds absent atomic
 * aspects or distinct bucket values; Correct replaces; Retract removes. Exact
 * Reading targets support synonym only and require targetKind: "reading",
 * including retractions. The Valency Frame: Contribute appends the Slots whose
 * complement the frame lacks, Correct replaces the frame, and Retract removes
 * the frame or, given a complement, that one Slot. A Participle Source is
 * atomic like a definition. Failure returns ParsingError
 * without a partial value.
 */
export function applyKnowledgeChange<const R extends Dumling.Reading>(input: {
	source: R;
	knowledge: ReadingKnowledge<R>;
	change: unknown;
}) {
	const source = parseSource(input.source);
	if (source instanceof ParsingError)
		return { success: false, error: source } as const;
	const current = parseReadingKnowledge({
		source,
		knowledge: input.knowledge,
	});
	if (!current.success) return current;
	const shape = parseChangeShape(input.change);
	if (shape instanceof ParsingError)
		return { success: false, error: shape } as const;
	const contextual = contextualizeChange(source, shape);
	if (contextual instanceof ParsingError)
		return { success: false, error: contextual } as const;
	const next = structuredClone(current.value) as ReadingKnowledge<R>;
	const failure = apply(next, contextual);
	if (failure) return { success: false, error: failure } as const;
	return parseReadingKnowledge({ source, knowledge: next });
}

function apply<R extends Dumling.Reading>(
	knowledge: ReadingKnowledge<R>,
	change: KnowledgeChange<R>,
): ParsingError | undefined {
	const canonical = change as KnowledgeChange;
	switch (canonical.aspect) {
		case "translations":
			applyTranslation(knowledge, canonical);
			return;
		case "semanticRelations":
			return applyRelation(knowledge, canonical);
		case "valency":
			applyValency(knowledge, canonical);
			return;
		case "transcription":
		case "definition":
		case "morphologicalTree":
		case "lexicalBreakdown":
		case "participleSource":
			return applyAtomic(knowledge, canonical);
	}
}

function applyTranslation<R extends Dumling.Reading>(
	knowledge: ReadingKnowledge<R>,
	change: Extract<KnowledgeChange, { aspect: "translations" }>,
): void {
	const translations = { ...knowledge.translations };
	if (change.kind === "Retract") delete translations[change.language];
	else
		translations[change.language] =
			change.kind === "Correct"
				? unique(change.value)
				: unique([
						...(translations[change.language] ?? []),
						...change.value,
					]);
	if (Object.keys(translations).length === 0) delete knowledge.translations;
	else knowledge.translations = translations;
}

function applyValency<R extends Dumling.Reading>(
	knowledge: ReadingKnowledge<R>,
	change: Extract<KnowledgeChange, { aspect: "valency" }>,
): void {
	const frame = knowledge.valency ?? [];
	let next: ValencySlot[];
	if (change.kind === "Retract") {
		const retracted = change.complement && fingerprint(change.complement);
		next = retracted
			? frame.filter(
					({ complement }) => fingerprint(complement) !== retracted,
				)
			: [];
	} else if (change.kind === "Correct") next = structuredClone(change.value);
	else {
		next = [...frame];
		for (const slot of change.value)
			if (
				!next.some(({ complement }) =>
					fills(complement, slot.complement),
				)
			)
				next.push(structuredClone(slot));
	}
	if (next.length === 0) delete knowledge.valency;
	else knowledge.valency = next as ValencyFrame;
}

/**
 * A stored complement already covers a contributed one when both name the same
 * case, and the same preposition, and their referents agree or one is Either:
 * an attested `auf` + Acc adds nothing to a proposed `auf` + Acc Someone.
 */
function fills(
	stored: ValencyComplement,
	contributed: ValencyComplement,
): boolean {
	const { referent: storedReferent, ...storedRest } = stored;
	const { referent: contributedReferent, ...contributedRest } = contributed;
	return (
		fingerprint(storedRest) === fingerprint(contributedRest) &&
		(storedReferent === contributedReferent ||
			storedReferent === "Either" ||
			contributedReferent === "Either")
	);
}

function applyRelation<R extends Dumling.Reading>(
	knowledge: ReadingKnowledge<R>,
	change: Extract<KnowledgeChange, { aspect: "semanticRelations" }>,
): ParsingError | undefined {
	const requested = change.targetKind === "reading" ? "reading" : "lemma";
	const existing = knowledge.semanticRelations;
	const current = existing?.targetKind === "reading" ? "reading" : "lemma";
	if (existing && requested !== current)
		return conflict(
			["change", "targetKind"],
			"One Reading Knowledge value cannot mix Lemma and Reading Semantic Relation targets",
		);
	const relations: Record<string, unknown> = {
		...existing,
		...(requested === "reading" ? { targetKind: "reading" } : {}),
	};
	if (change.kind === "Retract") delete relations[change.relation];
	else {
		const previous = Array.isArray(relations[change.relation])
			? (relations[change.relation] as unknown[])
			: [];
		relations[change.relation] =
			change.kind === "Correct"
				? unique(change.value as readonly unknown[])
				: unique([...previous, ...change.value]);
	}
	if (requested === "lemma" && Object.keys(relations).length === 0)
		delete knowledge.semanticRelations;
	else knowledge.semanticRelations = relations as SemanticRelations<R>;
}

type AtomicChange = Extract<
	KnowledgeChange,
	{
		aspect:
			| "transcription"
			| "definition"
			| "morphologicalTree"
			| "lexicalBreakdown"
			| "participleSource";
	}
>;
function applyAtomic<R extends Dumling.Reading>(
	knowledge: ReadingKnowledge<R>,
	change: AtomicChange,
): ParsingError | undefined {
	if (change.kind === "Retract") {
		delete knowledge[change.aspect];
		return;
	}
	const existing = knowledge[change.aspect];
	if (
		change.kind === "Contribute" &&
		existing !== undefined &&
		fingerprint(existing) !== fingerprint(change.value)
	)
		return conflict(
			["change", "value"],
			`Contribute conflicts with existing ${change.aspect}; use Correct to replace it`,
		);
	Reflect.set(knowledge, change.aspect, structuredClone(change.value));
}

function unique<T>(values: readonly T[]): [T, ...T[]] {
	const result: T[] = [];
	const seen = new Set<string>();
	for (const value of values) {
		const key = fingerprint(value);
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(structuredClone(value));
	}
	return result as [T, ...T[]];
}
