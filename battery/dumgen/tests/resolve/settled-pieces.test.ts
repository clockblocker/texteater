import { expect, test } from "bun:test";
import type { Segment } from "../../src/segment/segmented-sentence.js";
import {
	attested,
	fakeJev,
	resolveOnce,
	sentenceOf,
	space,
	stop,
	unitOf,
	word,
	writes,
} from "./support.js";

// A piece or shortened word whose Segment names the word it stands for,
// as intake chose it when it segmented the Sentence, is read as that word:
// jev is not asked again (#1329).

/** Wie war's Wetter? with the 's Segment standing for `surface`, if any. */
const warsWetter = (surface?: string): Segment[] => [
	word("Wie"),
	space,
	word("war"),
	word("'s", surface),
	space,
	word("Wetter"),
	{ kind: "Punctuation", text: "?" },
];

test("a fused piece intake read as one of its words is read so, with no reading question", async () => {
	const jev = fakeJev({ gender: "das", number: "Sing" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("Wetter", ["das", "Wetter"]).ask },
		{
			sentence: sentenceOf("", warsWetter("das")),
			unit: unitOf([3, 5], "Lexeme/NOUN"),
		},
	);
	expect(jev.questions("grammar")).not.toContain("reading_s3");
	expect(attested(result).members[0]).toMatchObject({
		attested: "'s",
		orthography: "Fused",
		fusion: { components: [{ surface: "war" }, { surface: "das" }] },
	});
});

test("a piece whose Segment names no word of its table entry is still asked", async () => {
	const jev = fakeJev({ reading_s3: "w1", gender: "das", number: "Sing" });
	await resolveOnce(
		{ jev: jev.ask, luna: writes("Wetter", ["das", "Wetter"]).ask },
		{
			sentence: sentenceOf("", warsWetter("dies")),
			unit: unitOf([3, 5], "Lexeme/NOUN"),
		},
	);
	expect(jev.questions("grammar")).toContain("reading_s3");
});

test("a shortened word intake expanded is read as its expansion, with no shortened question", async () => {
	const segments = (surface?: string): Segment[] => [
		word("Sie"),
		space,
		word("kam"),
		space,
		word("u.a.", surface),
		space,
		word("heute"),
		stop,
	];
	const settled = fakeJev();
	const { result } = await resolveOnce(
		{ jev: settled.ask, luna: writes("unter anderem", ["u.a."]).ask },
		{
			sentence: sentenceOf("", segments("unter anderem")),
			unit: unitOf([4], "Locution/ADV"),
		},
	);
	expect(settled.questions("grammar")).not.toContain("short_s4");
	expect(attested(result).surface.normalizedSurface).toBe("unter anderem");
	const asked = fakeJev({ short_s4: "w0" });
	await resolveOnce(
		{ jev: asked.ask, luna: writes("unter anderem", ["u.a."]).ask },
		{
			sentence: sentenceOf("", segments()),
			unit: unitOf([4], "Locution/ADV"),
		},
	);
	expect(asked.questions("grammar")).toContain("short_s4");
});
