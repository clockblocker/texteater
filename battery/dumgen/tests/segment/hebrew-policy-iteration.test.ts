import { expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import { segmentHebrewSentence } from "../../src/segment/he/segments.js";
import { segmentHebrewUnits } from "../../src/segment/he/units.js";
import { stitchedText } from "../../src/segment/stitched-text.js";

// Frozen complete sources from policy1-observed-failures.json, not new gold.
const song =
	"שתדע שהבנתי את הדרך שיש בי הרבה אמונה שדברים יסתדרו יש ימים שהבת של המלך הולכת מכות עם כל העולם עשיתי טיפול בכיתי מבול ואיפה אתה מתי הפסקת לאהוב אותי ולחבק אותי בלילה";

const picked = (choice: string, probability = 1) => ({
	type: "choice" as const,
	choice,
	confidence: 1,
	probabilities: { [choice]: probability },
});

// Local answers inspect real offered menus/wording; they do not test Jev choices.
async function sourceQuestion(
	sentence: string,
	target: string,
	plan: string,
	probability = 1,
) {
	let found: Question | undefined;
	const segmentation = await Effect.runPromise(
		segmentHebrewSentence(sentence, ({ questions, state }) => {
			expect(state.sentence).toBe(stitchedText(sentence));
			const written = state.written as Readonly<Record<string, string>>;
			return Effect.succeed(
				Object.fromEntries(
					Object.entries(questions).map(([id, question]) => {
						const isTarget =
							written[`w${id.slice("source_".length)}`] ===
							target;
						if (isTarget) found = question;
						return [
							id,
							picked(
								isTarget ? plan : "AsWritten",
								isTarget ? probability : 1,
							),
						];
					}),
				),
			);
		}),
	);
	expect(found?.type).toBe("choice");
	if (found?.type !== "choice") throw Error(`No source choice for ${target}`);
	expect(segmentation.segments.map(({ text }) => text).join("")).toBe(
		stitchedText(sentence),
	);
	return { question: found, segmentation };
}

test("Hebrew iteration question contrasts the observed song infinitive with a preposition", async () => {
	// Jev chose Prefixes1 at 0.67 then 0.70; only the latter crossed the 0.70 floor.
	const { question, segmentation } = await sourceQuestion(
		song,
		"לאהוב",
		"AsWritten",
	);
	expect(Object.keys(question.criteria ?? {})).toEqual([
		"Prefixes1",
		"AsWritten",
	]);
	expect(String(question.criteria?.Prefixes1)).toStartWith("ל + אהוב —");
	expect(String(question.criteria?.AsWritten)).toStartWith("לאהוב —");
	expect(String(question.instructions)).toContain(
		"In 'מתי הפסקת לאהוב אותי', לאהוב stays whole ('to love'), never ל + אהוב; contrast לרגע = ל + רגע.",
	);
	for (const control of [
		"לברר (infinitive of בירר) is one Segment",
		"ולברר = ו + לברר",
		"Lexical שהרי and בין",
		"ולהסיר = ו + להסיר",
		"לקחת remains one whole infinitive Segment",
	])
		expect(String(question.instructions)).toContain(control);
	expect(segmentation.segments.some(({ text }) => text === "לאהוב")).toBe(
		true,
	);
});

const maznon =
	"יתרה מכך, אף אחד מהמפעילים שתמכו בחסימה אינו צד ישיר או עקיף בתלונה במטא, ומבין 11 המפעילים הללו רק אחד (נריה) הגיב במטא";

test("Hebrew iteration question restores the explicit conjunction without fixing internal מבין policy", async () => {
	// Jev selected Prefixes1 at 0.69/0.63: correct conjunction, below the unchanged floor.
	const { question, segmentation } = await sourceQuestion(
		maznon,
		"ומבין",
		"Prefixes1",
	);
	expect(Object.keys(question.criteria ?? {})).toEqual([
		"Prefixes1",
		"Prefixes2",
		"AsWritten",
	]);
	expect(String(question.criteria?.Prefixes1)).toStartWith("ו + מבין —");
	expect(String(question.criteria?.Prefixes2)).toStartWith("ו + מ + בין —");
	expect(String(question.instructions)).toContain(
		"In 'ומבין 11 המפעילים', ו is an explicit conjunction: separate ו from the following host; uncertainty inside מבין does not justify keeping ומבין whole. Contrast ועדת הכספים: ועדת stays whole (stem-initial ו).",
	);
	expect(String(question.instructions)).toContain("ובהיותו = ו + בהיותו");
	const boundary = segmentation.segments.findIndex(
		({ text }) => text === "ו",
	);
	expect(boundary).toBeGreaterThanOrEqual(0);
	// Only ו's boundary is gold here, not the internal morphology of its host.
	expect(segmentation.segments[boundary + 1]?.text).toStartWith("מ");
});

const manual =
	"כיבוי תכונת 'תאורה מותאמת לתנועה'\nהפונקציה תאורה מותאמת תנועה (Motion Lighting) מאפשרת לכוון את בהירות המסך בהתאם לתנועות שמוצגות בו וכך לצמצם את צריכת הסוללה.";
const medical =
	"כדי לטפל בכאב ולשפר את טווח התנועה ואת התפקוד, אין צורך בבדיקת דימות, וניתן כבר בשלבים הראשונים לטפל במשככי כאבים, בפיזיותרפיה ובפעילות גופנית מתונה.";

test("Hebrew iteration membership explicitly includes the observed article-Head pairs, not ADP-PRON", async () => {
	for (const [sentence, target, head, probabilities] of [
		[manual, "הפונקציה", "פונקציה", [0.63, 0.6, 0.7]],
		[medical, "התפקוד", "תפקוד", [0.67, 0.7]],
	] as const) {
		// Only the target is source-split; other AsWritten answers are local fixtures,
		// not a claimed replay of Jev's complete source-stage output.
		const { segmentation } = await sourceQuestion(
			sentence,
			target,
			"Prefixes1",
		);
		for (const probability of probabilities) {
			let found: Question | undefined;
			let pair: number[] = [];
			const units = await Effect.runPromise(
				segmentHebrewUnits(segmentation, ({ questions, state }) => {
					expect(state.sentence).toBe(stitchedText(sentence));
					const candidates = state.candidates as Readonly<
						Record<string, string>
					>;
					return Effect.succeed(
						Object.fromEntries(
							Object.entries(questions).map(([id, question]) => {
								const members =
									candidates[id]?.split("|") ?? [];
								const isTarget =
									members
										.map((member) =>
											member.slice(
												member.indexOf(":") + 1,
											),
										)
										.join("|") === `ה|${head}`;
								if (isTarget) {
									found = question;
									pair = members.map((member) =>
										Number(
											member.slice(
												0,
												member.indexOf(":"),
											),
										),
									);
								}
								return [
									id,
									picked(
										isTarget ? "Join" : "Separate",
										isTarget ? probability : 1,
									),
								];
							}),
						),
					);
				}),
			);
			expect(found?.type).toBe("choice");
			if (found?.type !== "choice")
				throw Error(`No article-Head choice for ${target}`);
			expect(Object.keys(found.criteria ?? {})).toEqual([
				"Join",
				"Separate",
			]);
			expect(String(found.criteria?.Join)).toContain(
				"article-to-Head membership",
			);
			expect(String(found.criteria?.Join)).toContain(
				"fixed lexicalized expression",
			);
			expect(String(found.instructions)).toContain(
				"הפונקציה = ה + פונקציה and התפקוד = ה + תפקוד: Join each article with its Head, even outside a fixed expression; keep the two source Segments.",
			);
			for (const control of [
				"לָ + ה is ADP + PRON, not an article",
				"ל + י and ב + הם stay separate",
			])
				expect(String(found.instructions)).toContain(control);
			expect(pair).toHaveLength(2);
			// Recorded choices were Join, not Separate. Below-floor fallback is unchanged.
			expect(
				units.some(({ segments }) =>
					pair.every((index) => segments.includes(index)),
				),
			).toBe(probability >= 0.7);
			expect(units.every(({ route }) => route === "Unresolved")).toBe(
				true,
			);
		}
	}
	for (const target of ["לי", "בהם", "לָה"]) {
		const { segmentation } = await sourceQuestion(
			target,
			target,
			"Prefixes1",
		);
		const units = await Effect.runPromise(
			segmentHebrewUnits(segmentation, ({ questions }) =>
				Effect.succeed(
					Object.fromEntries(
						Object.entries(questions).map(([id, question]) => {
							expect(String(question.instructions)).toContain(
								"לָ + ה is ADP + PRON, not an article",
							);
							return [id, picked("Separate")];
						}),
					),
				),
			),
		);
		expect(units.map(({ segments }) => segments)).toEqual([[0], [1]]);
	}
});
