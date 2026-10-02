import { expect, test } from "bun:test";
import { uncoveredGovernment } from "../server/attestedGovernment";

test("a Preposition complement covers the same preposition and case only, alternatives included", () => {
	const preposition = (canonicalForm: string, governedCase: string) => ({
		kind: "Preposition",
		preposition: { canonicalForm },
		governedCase,
		referent: "Either",
	});
	const knowledge = {
		valency: [
			{
				status: "Required",
				complements: [
					{ kind: "Case", governedCase: "Dat", referent: "Someone" },
				],
			},
			{
				status: "Optional",
				complements: [
					preposition("über", "Acc"),
					preposition("von", "Dat"),
					{ kind: "Clause", form: "Dass", correlate: "Optional" },
				],
			},
			{
				status: "Optional",
				complements: [{ kind: "Adverbial", standIn: "Irgendwo" }],
			},
		],
	};
	expect(
		uncoveredGovernment(
			[
				{ preposition: "von", case: "Dat" },
				{ preposition: "über", case: "Acc" },
				{ preposition: "über", case: "Dat" },
				{ preposition: "auf", case: "Acc" },
			],
			knowledge,
		),
	).toEqual([
		{ preposition: "über", case: "Dat" },
		{ preposition: "auf", case: "Acc" },
	]);
	expect(
		uncoveredGovernment([{ preposition: "von", case: "Dat" }], {}),
	).toEqual([{ preposition: "von", case: "Dat" }]);
});
