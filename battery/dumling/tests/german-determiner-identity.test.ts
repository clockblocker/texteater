import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import {
	lemmaSchema,
	surfaceSchema,
} from "dumling/schema/de/lexeme/determiner";

const core = {
	case: null,
	gender: null,
	number: null,
	person: null,
	polite: null,
	poss: null,
	pronType: null,
};
function lemma(
	canonicalForm: string,
	features: Partial<Record<keyof typeof core, string | null>>,
) {
	return {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "DET",
		canonicalForm,
		coreFeatures: { ...core, ...features },
	};
}
const article = { pronType: "Art" };

test("each definite article cell is its own Lemma", () => {
	const nominative = lemma("der", {
		...article,
		case: "Nom",
		number: "Sing",
		gender: "Masc",
	});
	const dative = lemma("der", {
		...article,
		case: "Dat",
		number: "Sing",
		gender: "Fem",
	});
	for (const value of [nominative, dative]) {
		expect(lemmaSchema.safeParse(value).success).toBe(true);
		expect(parseUnit(value).success).toBe(true);
	}
	expect(nominative).not.toEqual(dative);
});

test("plural agreement has no marked gender", () => {
	const plural = { ...article, case: "Nom", number: "Plur" };
	expect(lemmaSchema.safeParse(lemma("die", plural)).success).toBe(true);
	expect(
		lemmaSchema.safeParse(lemma("die", { ...plural, gender: "Fem" }))
			.success,
	).toBe(false);
});

const dieser = lemma("dieser", { pronType: "Dem" });
function stemSurface(
	normalizedSurface: string,
	inflectionalFeatures: Record<string, string | null> | null,
	source: ReturnType<typeof lemma> = dieser,
) {
	return {
		unitKind: "Surface",
		language: "de",
		lemma: source,
		normalizedSurface,
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: inflectionalFeatures && {
			case: null,
			degree: null,
			gender: null,
			"gender[psor]": null,
			number: null,
			"number[psor]": null,
			...inflectionalFeatures,
		},
	};
}

test("a stem Lemma marks its cell on the Surface, never also in Core", () => {
	const diesem = stemSurface("diesem", {
		case: "Dat",
		number: "Sing",
		gender: "Masc",
	});
	expect(surfaceSchema.safeParse(diesem).success).toBe(true);
	expect(parseUnit(diesem).success).toBe(true);
	const doubled = stemSurface(
		"den",
		{ case: "Acc" },
		lemma("den", {
			...article,
			case: "Acc",
			number: "Sing",
			gender: "Masc",
		}),
	);
	expect(surfaceSchema.safeParse(doubled).success).toBe(false);
	expect(parseUnit(doubled).success).toBe(false);
	const pluralGender = stemSurface("diese", {
		case: "Nom",
		number: "Plur",
		gender: "Fem",
	});
	expect(surfaceSchema.safeParse(pluralGender).success).toBe(false);
});
