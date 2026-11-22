import { expect, test } from "bun:test";
import {
	type ValencyLinePart,
	valencyLineText,
} from "./block-renderers/reading/valency/valency-line";
import {
	germanSurfaceLine,
	type LinedSurface,
	type SurfaceReadingContext,
} from "./surface-line";

/**
 * The display line of a German Surface (ADR 0056, ADR 0034): clean base-order
 * form with separable prefix bar and `sich` for Required lexical reflexives,
 * without projecting `jD` or open valency slots.
 */

type Lemma = LinedSurface["lemma"];

const lexeme = (
	kind: string,
	canonicalForm: string,
	hasSepPrefix: string | null = null,
): Lemma => ({
	family: "Lexeme",
	kind,
	canonicalForm,
	coreFeatures: kind === "VERB" ? { hasSepPrefix } : {},
});
const locution = (canonicalForm: string): Lemma => ({
	family: "Locution",
	kind: "VERB",
	canonicalForm,
	coreFeatures: {},
});

const finite = (tense: "Pres" | "Past" = "Pres") => ({
	verbForm: "Fin",
	mood: "Ind",
	tense,
	person: "3",
	number: "Sing",
	expletive: null,
});
const imperative = {
	verbForm: "Fin",
	mood: "Imp",
	person: "2",
	number: "Sing",
};

function line(
	normalizedSurface: string,
	lemma: Lemma,
	inflectionalFeatures: Record<string, unknown>,
	reading?: SurfaceReadingContext | null,
): string {
	return valencyLineText(
		germanSurfaceLine(
			{ normalizedSurface, lemma, inflectionalFeatures },
			reading,
		),
	);
}

test("a verb Surface stays clean in base order without jD or open valency slots", () => {
	expect(line("gefragt hast", lexeme("VERB", "fragen"), finite("Past"))).toBe(
		"gefragt hast",
	);
	expect(
		line("mit zu tun hatte", locution("mit zu tun haben"), finite("Past")),
	).toBe("mit zu tun hatte");
	expect(line("wartet", lexeme("VERB", "warten"), finite())).toBe("wartet");
});

test("a separable verb splits its attached prefix with a bar", () => {
	const parts = germanSurfaceLine({
		normalizedSurface: "anfängt",
		lemma: lexeme("VERB", "anfangen", "an"),
		inflectionalFeatures: finite(),
	});
	expect(valencyLineText(parts)).toBe("anfängt");
	expect(parts).toEqual([
		{
			part: "Head",
			text: "anfängt",
			prefix: "an",
		} satisfies ValencyLinePart,
	]);
});

test("a Required lexical reflexive places sich according to the active Reading", () => {
	const erinnert = (reading: SurfaceReadingContext | null) =>
		line("erinnert", lexeme("VERB", "erinnern"), finite(), reading);
	expect(
		erinnert({
			emojiDescription: "🪞🧠",
			reflexive: {
				status: "Required",
				governedCase: "Acc",
				preposition: null,
			},
		}),
	).toBe("sich erinnert");
	// Also works from 🪞 alone before Knowledge arrives.
	expect(erinnert({ emojiDescription: "🪞🧠", reflexive: null })).toBe(
		"sich erinnert",
	);
	// Plain Reading without Required reflexive stays bare.
	expect(erinnert({ emojiDescription: "💭", reflexive: null })).toBe(
		"erinnert",
	);
	// Fixed-phrase reflexive goes after its preposition; leading es stays first.
	expect(
		line("außer war", locution("außer sein"), finite("Past"), {
			emojiDescription: "🪞😤",
			reflexive: {
				status: "Required",
				governedCase: "Dat",
				preposition: "außer",
			},
		}),
	).toBe("außer sich war");
	expect(
		line(
			"es gemütlich machte",
			locution("es gemütlich machen"),
			finite("Past"),
			{
				emojiDescription: "🪞🛋️",
				reflexive: {
					status: "Required",
					governedCase: "Dat",
					preposition: null,
				},
			},
		),
	).toBe("es sich gemütlich machte");
});

test("an imperative keeps its order and separated prefix", () => {
	const sieh = germanSurfaceLine({
		normalizedSurface: "sieh an",
		lemma: lexeme("VERB", "ansehen", "an"),
		inflectionalFeatures: imperative,
	});
	expect(valencyLineText(sieh)).toBe("sieh an");
	expect(sieh[0]).toEqual({ part: "Head", text: "sieh", prefix: null });
	expect(
		line("erinnere", lexeme("VERB", "erinnern"), imperative, {
			emojiDescription: "🪞🧠",
			reflexive: {
				status: "Required",
				governedCase: "Acc",
				preposition: null,
			},
		}),
	).toBe("erinnere sich");
});

test("non-verb Surfaces stay as their stored forms", () => {
	expect(
		line("Kindern", lexeme("NOUN", "Kind"), {
			case: "Dat",
			number: "Plur",
		}),
	).toBe("Kindern");
	expect(line("stolz", lexeme("ADJ", "stolz"), { degree: "Pos" })).toBe(
		"stolz",
	);
});
