import { ParsingError } from "common-utils/validation";
import type * as Dumling from "dumling/types";
import { contextualizeChange, issue, parseSource } from "./context.js";
import { structuralKeys } from "./fingerprint.js";
import { parseReadingKnowledge } from "./parse-reading-knowledge.js";
import type {
	ConjugationClasses,
	KnowledgeChange,
	ReadingKnowledge,
	SemanticRelations,
	ValencyComplement,
	ValencyFrame,
	ValencySlot,
} from "./types.js";
import { parseChangeShape } from "./validation.js";
import { conjugationClassValues } from "./vocabulary.js";

/**
 * Applies one source-aware change atomically. Contribute adds absent atomic
 * aspects or distinct bucket values; Correct replaces; Retract removes. Exact
 * Reading targets support synonym only and require targetKind: "reading",
 * including retractions. The Valency Frame: Contribute appends each Slot none
 * of whose complements a stored complement covers, never adding an
 * alternative to a stored Slot; Correct replaces the frame; and Retract
 * removes the frame or, given a complement, that complement from its Slot and
 * the Slot once it is empty (ADR 0034). A Participle Source,
 * Locution Type, Saying Type and Formula Role are atomic like a definition.
 * A noun's plural: Contribute adds the plural forms it lacks, and a NoPlural
 * or PluralOnly marker is atomic. A verb's
 * conjugation classes: Contribute adds the classes it lacks. Failure returns
 * ParsingError without a partial value.
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
		case "plural":
			return applyPlural(knowledge, canonical);
		case "conjugationClass":
			applyConjugation(knowledge, canonical);
			return;
		case "transcription":
		case "definition":
		case "morphologicalTree":
		case "participleSource":
		case "locutionType":
		case "sayingType":
		case "formulaRole":
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

/**
 * Only the proposal that creates the Reading and Correct group complements as
 * alternatives (#673): Contribute appends a whole Slot or nothing, so
 * contributing `von` + Dat to `reden` Optional `über` + Acc | `von` + Dat
 * changes nothing.
 */
function applyValency<R extends Dumling.Reading>(
	knowledge: ReadingKnowledge<R>,
	change: Extract<KnowledgeChange, { aspect: "valency" }>,
): void {
	const frame = knowledge.valency ?? [];
	let next: ValencySlot[];
	if (change.kind === "Retract") {
		const key = structuralKeys();
		const retracted = change.complement && key(change.complement);
		next = retracted
			? frame.flatMap((slot) => {
					const complements = slot.complements.filter(
						(complement) => key(complement) !== retracted,
					);
					return complements.length === 0
						? []
						: [{ ...slot, complements } as ValencySlot];
				})
			: [];
	} else if (change.kind === "Correct") next = structuredClone(change.value);
	else {
		next = [...frame];
		for (const slot of change.value)
			if (
				!next.some((stored) =>
					stored.complements.some((complement) =>
						slot.complements.some((contributed) =>
							fills(complement, contributed),
						),
					),
				)
			)
				next.push(structuredClone(slot));
	}
	if (next.length === 0) delete knowledge.valency;
	else knowledge.valency = next as ValencyFrame;
}

/**
 * Plural forms accumulate in the order they arrive: `Pizzen` then `Pizzas`
 * store both. A marker never merges with forms; replacing one with the other
 * takes Correct.
 */
function applyPlural<R extends Dumling.Reading>(
	knowledge: ReadingKnowledge<R>,
	change: Extract<KnowledgeChange, { aspect: "plural" }>,
): ParsingError | undefined {
	if (change.kind === "Retract") {
		delete knowledge.plural;
		return;
	}
	const existing =
		change.kind === "Contribute" ? knowledge.plural : undefined;
	if (
		existing !== undefined &&
		(typeof existing === "string" || typeof change.value === "string") &&
		existing !== change.value
	)
		return issue(
			["change", "value"],
			"Contribute conflicts with the existing plural; use Correct to replace it",
		);
	knowledge.plural =
		typeof change.value === "string"
			? change.value
			: unique([
					...(Array.isArray(existing) ? existing : []),
					...change.value,
				]);
}

/**
 * Conjugation classes accumulate like plural forms, but always in vocabulary
 * order: `sandte` then `sendete` store `Weak`, `Mixed`. Correct replaces the
 * set.
 */
function applyConjugation<R extends Dumling.Reading>(
	knowledge: ReadingKnowledge<R>,
	change: Extract<KnowledgeChange, { aspect: "conjugationClass" }>,
): void {
	if (change.kind === "Retract") {
		delete knowledge.conjugationClass;
		return;
	}
	const classes = new Set([
		...(change.kind === "Contribute"
			? (knowledge.conjugationClass ?? [])
			: []),
		...change.value,
	]);
	knowledge.conjugationClass = conjugationClassValues.filter((value) =>
		classes.has(value),
	) as ConjugationClasses;
}

/**
 * A stored complement already covers a contributed one when both are the same
 * apart from their referents, and those agree or one is Either: an attested
 * `auf` + Acc adds nothing to a proposed `auf` + Acc Someone. A complement
 * with no referent (an Adverbial, Predicative or Clause) covers only itself.
 */
function fills(
	stored: ValencyComplement,
	contributed: ValencyComplement,
): boolean {
	const key = structuralKeys();
	const [storedReferent, storedRest] = splitReferent(stored);
	const [contributedReferent, contributedRest] = splitReferent(contributed);
	return (
		key(storedRest) === key(contributedRest) &&
		(storedReferent === contributedReferent ||
			storedReferent === "Either" ||
			contributedReferent === "Either")
	);
}

function splitReferent(
	complement: ValencyComplement,
): [string | undefined, object] {
	if (!("referent" in complement)) return [undefined, complement];
	const { referent, ...rest } = complement;
	return [referent, rest];
}

function applyRelation<R extends Dumling.Reading>(
	knowledge: ReadingKnowledge<R>,
	change: Extract<KnowledgeChange, { aspect: "semanticRelations" }>,
): ParsingError | undefined {
	const requested = change.targetKind === "reading" ? "reading" : "lemma";
	const existing = knowledge.semanticRelations;
	const current = existing?.targetKind === "reading" ? "reading" : "lemma";
	if (existing && requested !== current)
		return issue(
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
			| "participleSource"
			| "locutionType"
			| "sayingType"
			| "formulaRole";
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
	const key = structuralKeys();
	if (
		change.kind === "Contribute" &&
		existing !== undefined &&
		key(existing) !== key(change.value)
	)
		return issue(
			["change", "value"],
			`Contribute conflicts with existing ${change.aspect}; use Correct to replace it`,
		);
	Reflect.set(knowledge, change.aspect, structuredClone(change.value));
}

function unique<T>(values: readonly T[]): [T, ...T[]] {
	const key = structuralKeys();
	const result: T[] = [];
	const seen = new Set<string>();
	for (const value of values) {
		const identity = key(value);
		if (seen.has(identity)) continue;
		seen.add(identity);
		result.push(structuredClone(value));
	}
	return result as [T, ...T[]];
}
