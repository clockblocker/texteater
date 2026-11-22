import { ParsingError } from "common-utils/validation";
import { foldCase, parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { structuralKeys } from "./fingerprint.js";
import { issue, type Path, prefixIssues } from "./issue.js";
import type { ValencyComplement, ValencyFrame, ValencySlot } from "./types.js";
import { allowedComplementKinds } from "./valency-policy.js";

/**
 * A complement the source's route allows. A Preposition complement names an
 * ADP Lemma of the source Language. A German one names an oblique case, and
 * dumcorpus checks it against the ADP Case Table (ADR 0041). A Hebrew or
 * English one names no case (`סמך על`, `depend on`). A German Reflexive names
 * its case, another language's none. A Reflexive that is the object of a
 * fixed phrase's preposition names that ADP Lemma too, and the preposition is
 * a word of the source's Canonical Form, since the phrase holds it (`außer
 * sein` for `außer sich sein`); dumcorpus checks its case as a Preposition's
 * (ADR 0052).
 */
export function parseValencyComplement<R extends Dumling.Reading>(
	source: R,
	complement: ValencyComplement,
	path: Path,
): ValencyComplement | ParsingError {
	const { family, kind, language } = source.lemma;
	if (!allowedComplementKinds(source.lemma).includes(complement.kind))
		return issue(
			[...path, "kind"],
			`${family} ${kind} Readings take no ${complement.kind} complement`,
		);
	if (
		complement.kind === "Reflexive" &&
		"governedCase" in complement !== (language === "de")
	)
		return issue(
			path,
			"A German Reflexive names its case; another language's names none",
		);
	if (!("preposition" in complement) || complement.preposition === undefined)
		return complement;
	const preposition = parsePreposition(source, complement.preposition, [
		...path,
		"preposition",
	]);
	if (preposition instanceof ParsingError) return preposition;
	if (
		complement.kind === "Reflexive" &&
		!source.lemma.canonicalForm
			.split(" ")
			.some(
				(word) =>
					foldCase(word, language) ===
					foldCase(preposition.canonicalForm, language),
			)
	)
		return issue(
			[...path, "preposition"],
			"A Reflexive's preposition is a word of its Reading's Canonical Form",
		);
	// parseUnit keeps the input's Language, so the parsed ADP Lemma fits the
	// variant complement came from; TypeScript can't correlate the two unions.
	return { ...complement, preposition } as ValencyComplement;
}

/** A complement's preposition: an ADP Lemma of the source Language. */
function parsePreposition<R extends Dumling.Reading>(
	source: R,
	value: unknown,
	path: Path,
): Dumling.Lemma | ParsingError {
	const parsed = parseUnit(value);
	if (!parsed.success) return prefixIssues(parsed.error, path);
	const { chain } = parsed;
	if (
		chain.unitKind !== "Lemma" ||
		chain.family !== "Lexeme" ||
		chain.kind !== "ADP"
	)
		return issue(path, "A governed preposition must be an ADP Lemma");
	if (chain.value.language !== source.lemma.language)
		return issue(
			[...path, "language"],
			"A governed preposition must use the source Language",
		);
	return chain.value;
}

/** A Reflexive alone in its Slot, at most one per frame (ADR 0052). */
function reflexiveIssue(
	frame: ValencyFrame,
	path: Path,
): ParsingError | undefined {
	let seen = false;
	for (const [index, { complements }] of frame.entries()) {
		const at = complements.findIndex(({ kind }) => kind === "Reflexive");
		if (at === -1) continue;
		const complementPath = [...path, index, "complements", at];
		if (complements.length > 1)
			return issue(
				complementPath,
				"A Reflexive is the only complement of its Slot",
			);
		if (seen)
			return issue(
				complementPath,
				"A Valency Frame has at most one Reflexive",
			);
		seen = true;
	}
	return undefined;
}

/** The complements a frame names at most once, across all its Slots (ADR 0057). */
const onceInFrame: ReadonlySet<ValencyComplement["kind"]> = new Set([
	"Preposition",
	"Subject",
	"DirectObject",
	"IndirectObject",
]);

/**
 * Why a Slot's correlated Clause has no word to take, if it has none: its
 * word is `da(r)-` with the Slot's one Preposition, or else the pronoun of
 * its Case (ADR 0034).
 */
function correlateIssue(
	complements: readonly ValencyComplement[],
	path: Path,
): ParsingError | undefined {
	const correlated = complements.findIndex(
		(complement) =>
			complement.kind === "Clause" && complement.correlate !== undefined,
	);
	if (correlated === -1) return undefined;
	const correlatePath = [...path, "complements", correlated, "correlate"];
	const prepositions = complements.filter(
		({ kind }) => kind === "Preposition",
	).length;
	if (prepositions > 1)
		return issue(
			correlatePath,
			"A Clause with a correlate in a Preposition Slot needs exactly one Preposition alternative there",
		);
	if (
		!complements.some(
			({ kind }) => kind === "Case" || kind === "Preposition",
		)
	)
		return issue(
			correlatePath,
			"A Clause with a correlate shares its Slot with the Case or Preposition its correlate's word derives from",
		);
	return undefined;
}

/**
 * A frame whose complements the source's route allows. A Preposition
 * complement, and a Hebrew or English Subject or object, appears once in the
 * frame. A German Case complement, like an Adverbial, Predicative or Clause,
 * appears once per Slot but may recur in another: `jemanden etwas fragen` has
 * an Acc in two Slots, and `Dass er kommt, bedeutet, dass …` a Clause Dass in
 * its Nom Slot and in its Acc Slot. Which complements belong in one Slot is
 * the proposal's call; only the correlate is checked: a Clause with a
 * correlate takes its word from its Slot, `da(r)-` with the Slot's one
 * Preposition or else the pronoun of its Case, so a Slot that holds one has a
 * Case or Preposition and at most one Preposition (ADRs 0034, 0057). A German
 * Nom stands only in the first Slot, which makes that Slot the subject's. A
 * Reflexive is the only complement of its Slot, and a frame has at most one
 * (ADR 0052).
 */
export function parseValencyFrame<R extends Dumling.Reading>(
	source: R,
	frame: ValencyFrame,
	path: Path,
): ValencyFrame | ParsingError {
	const key = structuralKeys();
	const slots: ValencySlot[] = [];
	const inFrame = new Set<string>();
	const reflexive = reflexiveIssue(frame, path);
	if (reflexive) return reflexive;
	for (const [index, slot] of frame.entries()) {
		const complements: ValencyComplement[] = [];
		const inSlot = new Set<string>();
		for (const [alternative, value] of slot.complements.entries()) {
			const complementPath = [...path, index, "complements", alternative];
			const complement = parseValencyComplement(
				source,
				value,
				complementPath,
			);
			if (complement instanceof ParsingError) return complement;
			const identity = key(complement);
			if (inSlot.has(identity))
				return issue(
					complementPath,
					"A Slot lists each complement once",
				);
			inSlot.add(identity);
			if (onceInFrame.has(complement.kind)) {
				if (inFrame.has(identity))
					return issue(
						complementPath,
						"A Valency Frame lists each Preposition, Subject or object complement once, across all its Slots",
					);
				inFrame.add(identity);
			}
			if (
				index > 0 &&
				complement.kind === "Case" &&
				complement.governedCase === "Nom"
			)
				return issue(
					[...complementPath, "governedCase"],
					"A Nom Case complement stands only in a frame's first Slot, the subject's",
				);
			complements.push(complement);
		}
		const correlate = correlateIssue(complements, [...path, index]);
		if (correlate) return correlate;
		slots.push({ status: slot.status, complements });
	}
	return slots;
}

export function checkValencyFrameInvariants(
	frame: ValencyFrame,
	path: Path,
): ParsingError | undefined {
	const reflexive = reflexiveIssue(frame, path);
	if (reflexive) return reflexive;
	for (const [index, slot] of frame.entries()) {
		if (index > 0) {
			const nomAt = slot.complements.findIndex(
				(complement) =>
					complement.kind === "Case" &&
					complement.governedCase === "Nom",
			);
			if (nomAt !== -1)
				return issue(
					[...path, index, "complements", nomAt, "governedCase"],
					"A Nom Case complement stands only in a frame's first Slot, the subject's",
				);
		}
		const correlate = correlateIssue(slot.complements, [...path, index]);
		if (correlate) return correlate;
	}
	return undefined;
}
