import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import { lemmaSchema as interjectionLemmaSchema } from "dumling/schema/de/lexeme/interjection";
import { lemmaSchema } from "dumling/schema/de/lexeme/particle";

function particle(
	canonicalForm: string,
	features: { partType?: string | null; polarity?: string | null },
) {
	return {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "PART",
		canonicalForm,
		coreFeatures: {
			abbr: null,
			partType: null,
			polarity: null,
			...features,
		},
	};
}

const accepts = (value: unknown) => {
	expect(lemmaSchema.safeParse(value).success).toBe(true);
	expect(parseUnit(value).success).toBe(true);
};
const rejects = (value: unknown) => {
	expect(lemmaSchema.safeParse(value).success).toBe(false);
	expect(parseUnit(value).success).toBe(false);
};

test("German PART names one type: nicht Neg, infinitive zu Inf, a modal particle Mod", () => {
	accepts(particle("nicht", { polarity: "Neg" }));
	accepts(particle("zu", { partType: "Inf" }));
	accepts(particle("ja", { partType: "Mod" }));
});

test("German PART with no type, two types or polarity Pos is rejected", () => {
	rejects(particle("ja", {}));
	rejects(particle("nicht", { partType: "Mod", polarity: "Neg" }));
	rejects(particle("ja", { polarity: "Pos" }));
	rejects(particle("doch", { partType: "Res" }));
});

test("an answer ja stays INTJ with partType Res", () => {
	const answer = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "INTJ",
		canonicalForm: "ja",
		coreFeatures: { partType: "Res" },
	};
	expect(interjectionLemmaSchema.safeParse(answer).success).toBe(true);
	expect(parseUnit(answer).success).toBe(true);
});
