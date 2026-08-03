import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { unresolved } from "./builders";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-paired-frame-unresolved-overselected-determiner": {
			input: {
				markedContext:
					"Wir wählen <TARGET>entweder</TARGET> <TARGET>den</TARGET> Bus <TARGET>oder</TARGET> die Bahn.",
			},
			idealOutput: unresolved,
			contaminationKeys: [
				"de-paired-frame-boundary:overselected-determiner",
			],
			explanation:
				"The determiner belongs to a conjunct, not the paired frame, so marked membership is overbroad.",
		},
		"grammar-de-paired-frame-unresolved-single-arm-entweder": {
			input: {
				markedContext:
					"Wir wählen <TARGET>entweder</TARGET> den Bus oder die Bahn.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-paired-frame-boundary:single-arm"],
			explanation:
				"The second arm is visibly present but unmarked; the route does not repair underselection or emit Partial.",
		},
		"grammar-de-paired-frame-unresolved-single-arm-noch": {
			input: {
				markedContext:
					"Sie trinkt weder Tee <TARGET>noch</TARGET> Kaffee.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-paired-frame-boundary:single-arm"],
			explanation:
				"A single selected noch is a CCONJ Lexeme target in the existing corpus, not a complete PairedFrame Surface.",
		},
		"grammar-de-paired-frame-unresolved-overselected-conjunct": {
			input: {
				markedContext:
					"Sie trinkt <TARGET>weder</TARGET> <TARGET>Tee</TARGET> <TARGET>noch</TARGET> Kaffee.",
			},
			idealOutput: unresolved,
			contaminationKeys: [
				"de-paired-frame-boundary:overselected-conjunct",
			],
			explanation:
				"Tee is coordinated content rather than a lexical member of the frame.",
		},
		"grammar-de-paired-frame-unresolved-mixed-occurrences": {
			input: {
				markedContext:
					"<TARGET>Entweder</TARGET> fährt Mia oder sie bleibt; entweder kommt Noah <TARGET>oder</TARGET> Lea.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-paired-frame-boundary:mixed-occurrences"],
			explanation:
				"The marked members come from two distinct paired-frame occurrences.",
		},
		"grammar-de-paired-frame-unresolved-unrelated-um-zu": {
			input: {
				markedContext:
					"Er geht <TARGET>um</TARGET> das Haus und kommt <TARGET>zu</TARGET> spät.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-paired-frame-boundary:unrelated-members"],
			explanation:
				"A preposition um and degree particle zu in one sentence do not instantiate the infinitive frame.",
		},
		"grammar-de-paired-frame-unresolved-mismatched-arms": {
			input: {
				markedContext:
					"Wir nehmen <TARGET>weder</TARGET> den Bus <TARGET>oder</TARGET> die Bahn.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-paired-frame-boundary:mismatched-arms"],
			explanation:
				"The marked spellings do not form a licensed paired frame.",
		},
		"grammar-de-paired-frame-unresolved-single-cconj-sowie": {
			input: {
				markedContext:
					"Brot <TARGET>sowie</TARGET> Käse werden serviert.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-paired-frame-boundary:cconj-lexeme"],
			explanation:
				"Sowie alone is a complete CCONJ Lexeme, not a discontinuous frame.",
		},
		"grammar-de-paired-frame-unresolved-unmarked-third-member": {
			input: {
				markedContext:
					"Sie hat <TARGET>sowohl</TARGET> den Film gesehen <TARGET>als</TARGET> auch das Buch gelesen.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-paired-frame-boundary:underselection"],
			explanation:
				"The lexical member auch is present but unmarked; all three members are required.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
