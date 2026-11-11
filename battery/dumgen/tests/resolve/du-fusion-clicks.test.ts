import { expect, test } from "bun:test";
import type { Segment } from "../../src/segment/segmented-sentence.js";
import {
	attested,
	fakeJev,
	fakeLuna,
	resolveOnce,
	sentenceOf,
	space,
	unitOf,
	word,
	writes,
} from "./support.js";

// A click on a piece of a spoken verb + du fusion (#1338, #1342): intake
// cuts Kannste into Kanns, standing for kannst, and te, standing for du,
// and resolve reads each piece as the word its Segment names.

const question: Segment = { kind: "Punctuation", text: "?" };

/** Kannste0 mir helfen? cut as intake cuts it: Kanns0 te1 _2 mir3 _4 helfen5 ?6 */
const kannste: Segment[] = [
	word("Kanns", "kannst"),
	word("te", "du"),
	space,
	word("mir"),
	space,
	word("helfen"),
	question,
];

/** Biste0 gut angekommen? as Bis0 te1 _2 gut3 _4 angekommen5 ?6 */
const biste: Segment[] = [
	word("Bis", "bist"),
	word("te", "du"),
	space,
	word("gut"),
	space,
	word("angekommen"),
	question,
];

test("the verb piece of a verb + du fusion is its verb, its Surface spelled as the word the piece stands for", async () => {
	const jev = fakeJev({ prefix: "None", verbForm: "Fin", person: "2" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("können", ["kannst"]).ask },
		{
			sentence: sentenceOf("", kannste),
			unit: unitOf([0], "Lexeme/VERB"),
		},
	);
	const { surface, members } = attested(result);
	expect(surface.lemma.canonicalForm).toBe("können");
	expect(surface.normalizedSurface).toBe("kannst");
	expect(members[0]).toMatchObject({
		attested: "Kanns",
		orthography: "Fused",
	});
	// The piece's word comes from its Segment, not from a question.
	expect(jev.questions("grammar")).not.toContain("reading_s0");
});

test("the verb piece joins the participle its auxiliary serves, and the Surface is the verb's in base order", async () => {
	const jev = fakeJev({ aux_m0: "u0", prefix: "None", person: "2" });
	const { result } = await resolveOnce(
		{
			jev: jev.ask,
			luna: writes("ankommen", ["bist", "angekommen"]).ask,
		},
		{
			sentence: sentenceOf("", biste),
			unit: unitOf([0, 5], "Lexeme/VERB"),
		},
	);
	const { surface, members } = attested(result);
	expect(surface.lemma.canonicalForm).toBe("ankommen");
	expect(surface.normalizedSurface).toBe("angekommen bist");
	// Bis is the auxiliary bist: a perfect, as Bist angekommen is.
	expect(jev.questions("grammar")).toContain("aux_m0");
	expect(surface).toMatchObject({
		inflectionalFeatures: { perfect: "Yes", person: "2" },
	});
	expect(members.map(({ attested }) => attested)).toEqual([
		"Bis",
		"angekommen",
	]);
});

test("the du piece of a verb + du fusion is the pronoun du, with no Luna call", async () => {
	const luna = fakeLuna();
	const { result } = await resolveOnce(
		{ jev: fakeJev().ask, luna: luna.ask },
		{
			sentence: sentenceOf("", kannste),
			unit: unitOf([1], "Lexeme/PRON", {
				kind: "PRON",
				canonicalForm: "du",
				pronType: "Prs",
			}),
		},
	);
	const { surface, members } = attested(result);
	expect(surface.lemma.canonicalForm).toBe("du");
	expect(surface.lemma.coreFeatures).toMatchObject({
		case: "Nom",
		person: "2",
	});
	expect(surface.normalizedSurface).toBe("du");
	expect(members[0]).toMatchObject({ attested: "te", orthography: "Fused" });
	expect(luna.sent).toEqual([]);
});

test("a verb beside the modal piece of a verb + du fusion is no finite verb", async () => {
	// Kanns0 te1 _2 kommen3 ?4: Kanns is kannst, a modal's finite form.
	const jev = fakeJev({
		prefix: "None",
		verbForm: "Fin",
		mood: "Ind",
		tense: "Pres",
		person: "3",
		number: "Plur",
	});
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("kommen").ask },
		{
			sentence: sentenceOf("", [
				word("Kanns", "kannst"),
				word("te", "du"),
				space,
				word("kommen"),
				question,
			]),
			unit: unitOf([3], "Lexeme/VERB"),
		},
	);
	expect(attested(result).surface).toMatchObject({
		inflectionalFeatures: { verbForm: "Inf" },
	});
});
