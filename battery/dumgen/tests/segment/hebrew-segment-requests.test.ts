import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";

const fixtures = [
	"והממשלה מבית הבית כשאנו מִשֶּׁתֶּחְשַׁךְ מדוע",
	'מס׳ 2 הוא אמר ׳מס׳. ד"ר כ"סיכון בית־ספר בת-עורב',
	"וּבִמְקוֹרָה שֶל כְּמוֹ לָה מהזווית שהוועדה שבהם",
	"\u200b\ufeff הַסֵּפֶר  ב־1.5.2025 18,696 😀!",
	Array(25).fill("והבית").join(" "),
	"",
	"123 😀\t\n",
	"משה משחק משקפת משבר משער משנראה כשאנו",
];
const policies = [
	"AsWritten",
	"Prefixes1",
	"Prefixes2",
	"TemporalKshe",
	"TemporalMishe",
	"CompoundParts",
	"TerminalGereshPunctuation",
	"InternalAsciiQuotePunctuation",
	"Unknown",
	"LowConfidence",
];

const capture = async (
	segment: typeof segmentHebrewSentence,
	sentence: string,
	policy: string,
) => {
	const requests: unknown[] = [];
	const result = await Effect.runPromise(
		segment(sentence, (request) => {
			requests.push(request);
			return Effect.succeed(
				Object.fromEntries(
					Object.keys(request.questions).map((id) => {
						const selected =
							policy === "LowConfidence" ? "AsWritten" : policy;
						const probability =
							policy === "LowConfidence" ? 0.69 : 1;
						return [
							id,
							{
								type: "choice",
								choice: selected,
								confidence: probability,
								probabilities: { [selected]: probability },
							},
						];
					}),
				),
			);
		}),
	);
	return { requests, result };
};

test("Hebrew segment requests and results preserve the publication baseline exactly", async () => {
	const snapshots = [];
	for (const sentence of fixtures)
		for (const policy of policies)
			snapshots.push({
				sentence,
				policy,
				...(await capture(segmentHebrewSentence, sentence, policy)),
			});
	expect(
		createHash("sha256").update(JSON.stringify(snapshots)).digest("hex"),
	).toBe("1e1edbfae5f76a5ed2e1db7f7ca97fc2338865bdf268322260472170ac6fd950");
});
