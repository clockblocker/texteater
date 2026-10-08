import type { ParsedUnit } from "../../src/generated/units.js";
import { parseUnit } from "../../src/index.js";
import type { Lemma, Reading } from "../../src/types.js";

type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;
function expectType<T extends true>(): T | undefined {
	return undefined;
}

// A typed input keeps its type.
declare const reading: Reading<"de">;
const typed = parseUnit(reading);
if (typed.success) {
	const _value: Reading<"de"> = typed.chain.value;
	const _language: "de" = typed.chain.language;
	const chain = typed.chain;
	if (chain.family === "Lexeme" && chain.kind === "NOUN") {
		const _noun: Reading<"de", "Lexeme", "NOUN"> = chain.value;
	}
}

// An object literal keeps its literal route fields, but string fields widen,
// because normalization can change them.
const literal = parseUnit({
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "ADP",
	canonicalForm: "mit ",
	coreFeatures: {},
});
if (literal.success) {
	const _route: { family: "Lexeme"; kind: "ADP" } = literal.chain.value;
	expectType<Equal<typeof literal.chain.value.canonicalForm, string>>();
	const _lemma: Lemma<"de", "Lexeme", "ADP"> = literal.chain.value;
}

// An unknown input still gets the whole ParsedUnit union.
declare const raw: unknown;
const broad = parseUnit(raw);
if (broad.success) expectType<Equal<typeof broad.chain, ParsedUnit>>();
declare const loose: Record<string, unknown>;
const looseResult = parseUnit(loose);
if (looseResult.success)
	expectType<Equal<typeof looseResult.chain, ParsedUnit>>();

// An expected route still narrows.
const expected = parseUnit(raw, {
	unitKind: "Reading",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
});
if (expected.success) {
	const _noun: Reading<"de", "Lexeme", "NOUN"> = expected.chain.value;
}
