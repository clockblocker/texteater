import { expect, test } from "bun:test";
import {
	type FrameSlot,
	type ValencyLinePart,
	valencyLineText,
} from "../src/notes/de/block-renderers/reading/valency/valency-line";
import {
	germanSurfaceLine,
	type LinedSurface,
} from "../src/notes/de/surface-line";

/**
 * The slotted Surface line (#1293), from stored Surfaces in base order:
 * the Lemma's words inflected, the verb last.
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
const infinitive = { verbForm: "Inf" };

const nom = (status: FrameSlot["status"] = "Required"): FrameSlot => ({
	status,
	complements: [{ kind: "Case", governedCase: "Nom" }],
});
const bare = (
	governedCase: "Acc" | "Dat",
	status: FrameSlot["status"] = "Required",
): FrameSlot => ({
	status,
	complements: [{ kind: "Case", governedCase }],
});
const prep = (
	preposition: string,
	governedCase: "Acc" | "Dat",
	status: FrameSlot["status"] = "Required",
): FrameSlot => ({
	status,
	complements: [
		{
			kind: "Preposition",
			governedCase,
			preposition: { canonicalForm: preposition },
		},
	],
});
const reflexive: FrameSlot = {
	status: "Required",
	complements: [{ kind: "Reflexive", governedCase: "Acc" }],
};

function line(
	normalizedSurface: string,
	lemma: Lemma,
	inflectionalFeatures: Record<string, unknown>,
	frame?: readonly FrameSlot[],
): string {
	return valencyLineText(
		germanSurfaceLine(
			{ normalizedSurface, lemma, inflectionalFeatures },
			frame,
		),
	);
}

test("a Locution's Surface prints its slots among its words, the subject first", () => {
	expect(
		line("mit zu tun hatte", locution("mit zu tun haben"), finite("Past"), [
			nom(),
			prep("mit", "Dat"),
		]),
	).toBe("jD mit jM zu tun hatte");
});

test("every slot shows, an Optional one in parentheses", () => {
	expect(
		line("wartet", lexeme("VERB", "warten"), finite(), [
			nom(),
			prep("auf", "Acc", "Optional"),
		]),
	).toBe("jD (auf jN) wartet");
});

test("a separable verb is stored joined and split by the Citation's bar", () => {
	const parts = germanSurfaceLine(
		{
			normalizedSurface: "anfängt",
			lemma: lexeme("VERB", "anfangen", "an"),
			inflectionalFeatures: finite(),
		},
		[nom(), prep("mit", "Dat", "Optional")],
	);
	expect(valencyLineText(parts)).toBe("jD (mit jM) anfängt");
	expect(parts.at(-1)).toEqual({
		part: "Head",
		text: "anfängt",
		prefix: "an",
	} satisfies ValencyLinePart);
});

test("each Reading of one Surface slots it by its own frame", () => {
	const erinnert = (frame: readonly FrameSlot[]) =>
		line("erinnert", lexeme("VERB", "erinnern"), finite(), frame);
	// 🪞🧠 sich an etwas erinnern: the reflexive where the Citation puts it.
	expect(erinnert([nom(), reflexive, prep("an", "Acc", "Optional")])).toBe(
		"jD sich (an jN) erinnert",
	);
	// jemanden an etwas erinnern.
	expect(erinnert([nom(), bare("Acc"), prep("an", "Acc")])).toBe(
		"jD jN an jN erinnert",
	);
});

test("a Locution's own es is its subject, so it takes no jD", () => {
	expect(line("es gibt", locution("es geben"), finite(), [bare("Acc")])).toBe(
		"es jN gibt",
	);
});

test("an adjective prints its head first", () => {
	expect(
		line("stolz", lexeme("ADJ", "stolz"), { degree: "Pos" }, [
			prep("auf", "Acc", "Optional"),
		]),
	).toBe("stolz (auf jN)");
});

test("a Surface without a frame is its stored form", () => {
	expect(
		line("Kindern", lexeme("NOUN", "Kind"), {
			case: "Dat",
			number: "Plur",
		}),
	).toBe("Kindern");
	expect(
		line("mit zu tun hatte", locution("mit zu tun haben"), finite("Past")),
	).toBe("mit zu tun hatte");
	expect(
		line("anfängt", lexeme("VERB", "anfangen", "an"), finite(), []),
	).toBe("anfängt");
});

test("an imperative keeps its own order and takes no jD", () => {
	expect(
		line("warte", lexeme("VERB", "warten"), imperative, [
			nom(),
			prep("auf", "Acc", "Optional"),
		]),
	).toBe("warte (auf jN)");
	const sieh = germanSurfaceLine(
		{
			normalizedSurface: "sieh an",
			lemma: lexeme("VERB", "ansehen", "an"),
			inflectionalFeatures: imperative,
		},
		[nom(), bare("Acc")],
	);
	expect(valencyLineText(sieh)).toBe("sieh jN an");
	expect(sieh[0]).toEqual({ part: "Head", text: "sieh", prefix: null });
});

test("jD needs a finite form, a Nom slot and no expletive subject", () => {
	expect(
		line("graut", lexeme("VERB", "grauen"), finite(), [bare("Dat")]),
	).toBe("jM graut");
	expect(
		line(
			"es regnet",
			lexeme("VERB", "regnen"),
			{
				...finite(),
				expletive: "Subject",
			},
			[nom()],
		),
	).toBe("es regnet");
	expect(
		line("zu warten", lexeme("VERB", "warten"), infinitive, [
			nom(),
			prep("auf", "Acc"),
		]),
	).toBe("auf jN zu warten");
	// A frame with only its subject still shows it.
	expect(line("schläft", lexeme("VERB", "schlafen"), finite(), [nom()])).toBe(
		"jD schläft",
	);
});
