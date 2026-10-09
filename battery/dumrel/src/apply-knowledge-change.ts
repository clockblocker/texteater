import { ParsingError } from "common-utils/validation";
import type * as Dumling from "dumling/types";
import { contextualizeChange, issue, parseSource } from "./context.js";
import { structuralKeys } from "./fingerprint.js";
import { parseReadingKnowledge } from "./parse-reading-knowledge.js";
import type {
	KnowledgeChange,
	KnowledgeParse,
	ReadingKnowledge,
	SemanticRelations,
	ValencyComplement,
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
}): KnowledgeParse<R> {
	return applyKnowledgeChanges({
		source: input.source,
		knowledge: input.knowledge,
		changes: [input.change],
	});
}

/**
 * Applies changes in order, atomically, each as `applyKnowledgeChange` would,
 * and answers what applying them one by one answers: the result, or the first
 * failure without a partial value. The Knowledge is parsed once going in and
 * once coming out, not around every change. Each change is checked against
 * the source before it applies, and a checked change applied to parsed
 * Knowledge always yields Knowledge that parses, so no state between two
 * changes needs a parse of its own.
 */
export function applyKnowledgeChanges<const R extends Dumling.Reading>(input: {
	source: R;
	knowledge: ReadingKnowledge<R>;
	changes: readonly unknown[];
}): KnowledgeParse<R> {
	const source = parseSource(input.source);
	if (source instanceof ParsingError)
		return { success: false, error: source } as const;
	const current = parseReadingKnowledge({
		source,
		knowledge: input.knowledge,
	});
	if (!current.success) return current;
	// Applied as plain Reading Knowledge; parsing the result checks it against
	// the source again. The parse answered a fresh value, so it is ours to edit.
	const next: ReadingKnowledge = current.value;
	for (const change of input.changes) {
		const contextual = checkChange(source, change);
		if (contextual instanceof ParsingError)
			return { success: false, error: contextual } as const;
		const failure = apply(next, contextual);
		if (failure) return { success: false, error: failure } as const;
	}
	return parseReadingKnowledge({ source, knowledge: next });
}

/**
 * Checks one change against its source Reading the way `applyKnowledgeChange`
 * does before applying it, and answers the change Dumrel accepts: fresh, with
 * its strings normalized and its Semantic Relation targets, governed
 * prepositions and Participle Source verb parsed by Dumling. It checks no
 * Knowledge, so a Contribute that conflicts with stored Knowledge still
 * parses. Failure returns ParsingError.
 */
export function parseKnowledgeChange<const R extends Dumling.Reading>(input: {
	source: R;
	change: unknown;
}):
	| { readonly success: true; readonly value: KnowledgeChange<R> }
	| { readonly success: false; readonly error: ParsingError } {
	const source = parseSource(input.source);
	if (source instanceof ParsingError)
		return { success: false, error: source } as const;
	const change = checkChange(source, input.change);
	return change instanceof ParsingError
		? ({ success: false, error: change } as const)
		: ({ success: true, value: change } as const);
}

function checkChange<R extends Dumling.Reading>(
	source: R,
	change: unknown,
): KnowledgeChange<R> | ParsingError {
	const shape = parseChangeShape(change);
	if (shape instanceof ParsingError) return shape;
	const contextual = contextualizeChange(source, shape);
	// contextualizeChange checked each target against this source's Language and
	// relation space, which KnowledgeChange<R> encodes; a generic R hides that
	// from TypeScript.
	return contextual instanceof ParsingError
		? contextual
		: (contextual as KnowledgeChange<R>);
}

function apply(
	knowledge: ReadingKnowledge,
	change: KnowledgeChange,
): ParsingError | undefined {
	switch (change.aspect) {
		case "translations":
			applyTranslation(knowledge, change);
			return;
		case "semanticRelations":
			return applyRelation(knowledge, change);
		case "valency":
			applyValency(knowledge, change);
			return;
		case "plural":
			return applyPlural(knowledge, change);
		case "conjugationClass":
			applyConjugation(knowledge, change);
			return;
		case "transcription":
		case "definition":
		case "morphologicalTree":
		case "participleSource":
		case "locutionType":
		case "sayingType":
		case "formulaRole":
			return applyAtomic(knowledge, change);
	}
}

function applyTranslation(
	knowledge: ReadingKnowledge,
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
function applyValency(
	knowledge: ReadingKnowledge,
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
						: [{ ...slot, complements }];
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
	else knowledge.valency = next;
}

/**
 * Plural forms accumulate in the order they arrive: `Pizzen` then `Pizzas`
 * store both. A marker never merges with forms; replacing one with the other
 * takes Correct.
 */
function applyPlural(
	knowledge: ReadingKnowledge,
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
function applyConjugation(
	knowledge: ReadingKnowledge,
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
	);
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

type ReadingRelations = Extract<SemanticRelations, { targetKind: "reading" }>;
type LemmaRelations = Exclude<SemanticRelations, { targetKind: "reading" }>;
function applyRelation(
	knowledge: ReadingKnowledge,
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
	if (change.targetKind === "reading") {
		const relations: ReadingRelations =
			existing?.targetKind === "reading"
				? { ...existing }
				: { targetKind: "reading" };
		if (change.kind === "Retract") delete relations.synonym;
		else
			relations.synonym =
				change.kind === "Correct"
					? unique(change.value)
					: unique([...(relations.synonym ?? []), ...change.value]);
		knowledge.semanticRelations = relations;
		return;
	}
	const relations: LemmaRelations =
		existing?.targetKind === "reading" ? {} : { ...existing };
	if (change.kind === "Retract") delete relations[change.relation];
	else
		relations[change.relation] =
			change.kind === "Correct"
				? unique(change.value)
				: unique([
						...(relations[change.relation] ?? []),
						...change.value,
					]);
	if (Object.keys(relations).length === 0) delete knowledge.semanticRelations;
	else knowledge.semanticRelations = relations;
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
function applyAtomic(
	knowledge: ReadingKnowledge,
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
	storeAtomic(knowledge, change);
}

/**
 * Stores an atomic aspect's value, one case per aspect so each value is
 * checked against its own field: `knowledge[change.aspect] = change.value`
 * would lose which value goes with which aspect.
 */
function storeAtomic(
	knowledge: ReadingKnowledge,
	change: Exclude<AtomicChange, { kind: "Retract" }>,
): void {
	switch (change.aspect) {
		case "transcription":
			knowledge.transcription = structuredClone(change.value);
			return;
		case "definition":
			knowledge.definition = structuredClone(change.value);
			return;
		case "morphologicalTree":
			knowledge.morphologicalTree = structuredClone(change.value);
			return;
		case "participleSource":
			knowledge.participleSource = structuredClone(change.value);
			return;
		case "locutionType":
			knowledge.locutionType = structuredClone(change.value);
			return;
		case "sayingType":
			knowledge.sayingType = structuredClone(change.value);
			return;
		case "formulaRole":
			knowledge.formulaRole = structuredClone(change.value);
			return;
		default:
			// A new atomic aspect fails to type-check here until it has a case.
			change satisfies never;
	}
}

function unique<T>(values: readonly T[]): T[] {
	const key = structuralKeys();
	const result: T[] = [];
	const seen = new Set<string>();
	for (const value of values) {
		const identity = key(value);
		if (seen.has(identity)) continue;
		seen.add(identity);
		result.push(structuredClone(value));
	}
	return result;
}
