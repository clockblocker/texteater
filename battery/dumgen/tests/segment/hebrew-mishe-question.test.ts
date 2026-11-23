import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";

const sentence =
	"וִדּוּי מִן הַדִּין הוּא בְּהַתְחָלַת זְמַן הַכַּפָּרָה, דְּהַיְנוּ מִשֶּׁתֶּחְשַׁךְ לֵיל יוֹם הַכִּפּוּרִים";
// Stub answer verifies an offered menu and exact pointed source, not model quality.
test("Hebrew offers temporal מש and comparative מ plus ש without deciding from spelling", async () => {
	let inspected = false;
	const result = await Effect.runPromise(
		segmentHebrewSentence(sentence, ({ questions, state }) => {
			const written = state.written as Record<string, string>;
			return Effect.succeed(
				Object.fromEntries(
					Object.entries(questions).map(([id, q]) => {
						const target = written[`w${id.slice(7)}`] === "מִשֶּׁתֶּחְשַׁךְ";
						if (target) {
							expect(q.type).toBe("choice");
							if (q.type !== "choice")
								throw Error("Expected Choice");
							expect(q.criteria).toHaveProperty("TemporalMishe");
							expect(String(q.criteria?.TemporalMishe)).toContain(
								"מִשֶּׁ + תֶּחְשַׁךְ",
							);
							expect(String(q.criteria?.Prefixes2)).toContain(
								"מִ + שֶּׁ + תֶּחְשַׁךְ",
							);
							expect(String(q.instructions)).toContain(
								"Temporal מש",
							);
							expect(String(q.instructions)).toContain(
								"יותר משעשו",
							);
							inspected = true;
						}
						const choice = target ? "TemporalMishe" : "AsWritten";
						return [
							id,
							{
								type: "choice" as const,
								choice,
								confidence: 1,
								probabilities: { [choice]: 1 },
							},
						];
					}),
				),
			);
		}),
	);
	expect(inspected).toBe(true);
	expect(result.segments.map((s) => s.text).join("")).toBe(sentence);
	const texts = result.segments.map((s) => s.text);
	const index = texts.indexOf("מִשֶּׁ");
	expect(texts.slice(index, index + 2)).toEqual(["מִשֶּׁ", "תֶּחְשַׁךְ"]);
});
