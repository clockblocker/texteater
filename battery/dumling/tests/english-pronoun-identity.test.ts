import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import { lemmaSchema, surfaceSchema } from "dumling/schema/en/lexeme/pronoun";

const core = {
	abbr: null,
	case: null,
	extPos: null,
	gender: null,
	number: null,
	person: null,
	poss: null,
	pronType: null,
	reflex: null,
	style: null,
};
function lemma(
	canonicalForm: string,
	features: Partial<Record<keyof typeof core, string | null>>,
) {
	return {
		unitKind: "Lemma",
		language: "en",
		family: "Lexeme",
		kind: "PRON",
		canonicalForm,
		coreFeatures: { ...core, ...features },
	};
}

test("each spelled personal pronoun cell is its own Lemma", () => {
	const first = { pronType: "Prs", person: "1", number: "Sing" };
	for (const value of [
		lemma("I", { ...first, case: "Nom" }),
		lemma("me", { ...first, case: "Acc" }),
		lemma("my", { ...first, case: "Gen", poss: "Yes" }),
		lemma("mine", { ...first, poss: "Yes" }),
		lemma("myself", { ...first, case: "Acc", reflex: "Yes" }),
	]) {
		expect(lemmaSchema.safeParse(value).success).toBe(true);
		expect(parseUnit(value).success).toBe(true);
	}
});

test("a pronoun Surface carries no inflectional bag", () => {
	const them = lemma("them", {
		pronType: "Prs",
		person: "3",
		number: "Plur",
		case: "Acc",
	});
	const surface = {
		unitKind: "Surface",
		language: "en",
		lemma: them,
		normalizedSurface: "them",
		spelling: "Canonical",
		surfaceFeatures: null,
	};
	expect(surfaceSchema.safeParse(surface).success).toBe(true);
	expect(
		surfaceSchema.safeParse({
			...surface,
			inflectionalFeatures: { case: "Acc" },
		}).success,
	).toBe(false);
});
