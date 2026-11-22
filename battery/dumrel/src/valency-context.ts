import { ParsingError } from "common-utils/validation";
import { foldCase, parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { structuralKeys } from "./fingerprint.js";
import { issue, type Path, prefixIssues } from "./issue.js";
import type {
	ValencyComplement,
	ValencyFrame,
	ValencyPattern,
} from "./types.js";
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
 * (ADR 0052). A German Clause with a `da(r)-` correlate names that ADP Lemma
 * as its `preposition` (`achten` `darauf, dass …`).
 */
function parseValencyComplement<R extends Dumling.Reading>(
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

/** The complements a single pattern names at most once (ADRs 0034, 0052, 0057). */
const onceInPattern: ReadonlySet<ValencyComplement["kind"]> = new Set([
	"Preposition",
	"Subject",
	"DirectObject",
	"IndirectObject",
]);

/**
 * Checks structural invariants of one concrete pattern: at most one Reflexive
 * per pattern, and a German Nom only at index 0 (the subject position).
 */
function checkPatternInvariants(
	pattern: ValencyPattern,
	path: Path,
): ParsingError | undefined {
	let seenReflexive = false;
	for (const [index, complement] of pattern.entries()) {
		if (complement.kind === "Reflexive") {
			if (seenReflexive)
				return issue(
					[...path, index],
					"A Valency Pattern has at most one Reflexive",
				);
			seenReflexive = true;
		}
		if (
			index > 0 &&
			complement.kind === "Case" &&
			complement.governedCase === "Nom"
		)
			return issue(
				[...path, index, "governedCase"],
				"A Nom Case complement stands only first in a Valency Pattern, as its subject",
			);
	}
	return undefined;
}

/**
 * One concrete Valency Pattern whose complements the source's route allows
 * (ADR 0034). Each Preposition, Subject, DirectObject, IndirectObject or
 * Reflexive appears at most once per pattern; a German Case (such as double
 * Acc in `jemanden etwas fragen`), Adverbial, Predicative or Clause may recur.
 * A German Nom stands only at index 0.
 */
export function parseValencyPattern<R extends Dumling.Reading>(
	source: R,
	pattern: ValencyPattern,
	path: Path,
): ValencyPattern | ParsingError {
	const key = structuralKeys();
	const complements: ValencyComplement[] = [];
	const seenOnce = new Set<string>();
	let seenReflexive = false;
	for (const [index, value] of pattern.entries()) {
		const complementPath = [...path, index];
		const complement = parseValencyComplement(
			source,
			value,
			complementPath,
		);
		if (complement instanceof ParsingError) return complement;
		if (complement.kind === "Reflexive") {
			if (seenReflexive)
				return issue(
					complementPath,
					"A Valency Pattern has at most one Reflexive",
				);
			seenReflexive = true;
		}
		if (onceInPattern.has(complement.kind)) {
			const identity = key(complement);
			if (seenOnce.has(identity))
				return issue(
					complementPath,
					"A Valency Pattern lists each Preposition, Subject or object complement once",
				);
			seenOnce.add(identity);
		}
		if (
			index > 0 &&
			complement.kind === "Case" &&
			complement.governedCase === "Nom"
		)
			return issue(
				[...complementPath, "governedCase"],
				"A Nom Case complement stands only first in a Valency Pattern, as its subject",
			);
		complements.push(complement);
	}
	return complements;
}

/**
 * A Reading's accumulated Valency Patterns: each pattern validated against
 * the source's route, with every pattern distinct by structural identity.
 */
export function parseValencyFrame<R extends Dumling.Reading>(
	source: R,
	frame: ValencyFrame,
	path: Path,
): ValencyFrame | ParsingError {
	const key = structuralKeys();
	const patterns: ValencyPattern[] = [];
	const seen = new Set<string>();
	for (const [index, pattern] of frame.entries()) {
		const patternPath = [...path, index];
		const parsed = parseValencyPattern(source, pattern, patternPath);
		if (parsed instanceof ParsingError) return parsed;
		const identity = key(parsed);
		if (seen.has(identity))
			return issue(
				patternPath,
				"Reading valency lists each Valency Pattern once",
			);
		seen.add(identity);
		patterns.push(parsed);
	}
	return patterns;
}

export function checkValencyFrameInvariants(
	frame: ValencyFrame,
	path: Path,
): ParsingError | undefined {
	const key = structuralKeys();
	const seen = new Set<string>();
	for (const [index, pattern] of frame.entries()) {
		const patternPath = [...path, index];
		const failure = checkPatternInvariants(pattern, patternPath);
		if (failure) return failure;
		const identity = key(pattern);
		if (seen.has(identity))
			return issue(
				patternPath,
				"Reading valency lists each Valency Pattern once",
			);
		seen.add(identity);
	}
	return undefined;
}
