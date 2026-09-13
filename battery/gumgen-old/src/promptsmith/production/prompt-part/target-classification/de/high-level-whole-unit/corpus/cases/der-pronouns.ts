import { defineGoldenCaseCollection } from "../../../../../../../assembly";
import { addCaseEvidence, resolved, sentence } from "./builders";

function singleton(
	words: readonly string[],
	clickedSegmentIndex: number,
	kind: "DET" | "PRON",
) {
	const segments = sentence(words);
	return resolved(
		segments,
		clickedSegmentIndex,
		[clickedSegmentIndex],
		"Lexeme",
		kind,
	);
}

export const derPronounCases = defineGoldenCaseCollection(import.meta.url, {
	cases: addCaseEvidence(
		{
			"target-de-der-pron-dem-der": singleton(
				["Der", "gefällt", "mir"],
				0,
				"PRON",
			),
			"target-de-der-pron-dem-die": singleton(
				["Die", "gefallen", "mir"],
				0,
				"PRON",
			),
			"target-de-der-pron-dem-das": singleton(
				["Das", "gefällt", "mir"],
				0,
				"PRON",
			),
			"target-de-der-pron-rel-der": singleton(
				[
					"Das",
					"ist",
					"der",
					"Techniker",
					"der",
					"den",
					"Drucker",
					"repariert",
					"hat",
				],
				8,
				"PRON",
			),
			"target-de-der-pron-rel-die": singleton(
				[
					"Die",
					"Musikerin",
					"die",
					"heute",
					"auftritt",
					"kommt",
					"aus",
					"Köln",
				],
				4,
				"PRON",
			),
			"target-de-der-pron-rel-das": singleton(
				[
					"Das",
					"Gerät",
					"das",
					"wir",
					"prüfen",
					"steht",
					"im",
					"Labor",
				],
				4,
				"PRON",
			),
			"target-de-der-pron-det-der": singleton(
				["Der", "Plan", "funktioniert"],
				0,
				"DET",
			),
			"target-de-der-pron-det-die": singleton(
				["Die", "Lösung", "funktioniert"],
				0,
				"DET",
			),
			"target-de-der-pron-det-das": singleton(
				["Das", "Gerät", "funktioniert"],
				0,
				"DET",
			),
		},
		(caseId) =>
			caseId.includes("-det-")
				? "Issue #251 preserves singleton DET routing when der, die, or das directly modifies an overt noun."
				: "Issue #251 routes a free demonstrative or relative-clause occurrence as one singleton PRON target.",
	),
});
