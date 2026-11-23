import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import {
	prepareHebrewCitation,
	renderHebrewPronunciation,
} from "../../../src/knowledge/he/pronunciation.js";

const reading = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "he",
		family: "Lexeme",
		kind: "ADJ",
		canonicalForm: "יפה",
		coreFeatures: { abbr: null },
	},
	emojiDescription: "✨",
} as const satisfies Dumling.Reading<"he">;
const draft = {
	pointedCitation: "יָפֶה",
	citationRole: "ResolvedCanonical",
	citationFeatures: { gender: "Masc", number: "Sing", definite: null },
	syllableCount: 2,
	stressedSyllable: 2,
	finalYod: "Absent",
	furtivePatah: false,
};
// This fake orchestration exercises pure gates only, not the production producer.
async function pipeline(
	write: (stage: string, input: unknown) => Promise<unknown>,
) {
	const citation = prepareHebrewCitation(
		reading,
		await write("transcription.citation", { reading, occurrence: "יָפָה" }),
	);
	if (!citation) return null;
	return renderHebrewPronunciation(
		citation,
		await write("transcription.ipa", citation),
	);
}
test("injected sequence gates IPA and freezes citation without occurrence evidence", async () => {
	const sent: { stage: string; input: unknown }[] = [];
	const result = await pipeline(async (stage, input) => {
		sent.push({ stage, input });
		return stage === "transcription.citation"
			? draft
			: { syllables: ["ja", "fe"] };
	});
	expect(result).toBe("jaˈfe");
	expect(sent.map((x) => x.stage)).toEqual([
		"transcription.citation",
		"transcription.ipa",
	]);
	expect(sent[1]?.input).toEqual(draft);
	expect(JSON.stringify(sent[1]?.input)).not.toContain("יָפָה");
});
test("invalid citation or null never invokes IPA; IPA null abstains without fallback", async () => {
	for (const first of [
		null,
		{
			...draft,
			pointedCitation: "יָפָה",
			citationFeatures: { gender: "Fem", number: "Sing", definite: null },
		},
		{ ...draft, stressedSyllable: 0 },
		{ ...draft, stressedSyllable: 3 },
	]) {
		let calls = 0;
		expect(
			await pipeline(async () => {
				calls++;
				return first;
			}),
		).toBeNull();
		expect(calls).toBe(1);
	}
	let calls = 0;
	expect(
		await pipeline(async () => (++calls === 1 ? draft : null)),
	).toBeNull();
	expect(calls).toBe(2);
});
