import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { unresolved } from "./builders";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-fusion-demo-uncontracted-in-dem": {
			...unresolved(
				"Wir sitzen <TARGET>in</TARGET> <TARGET>dem</TARGET> Garten.",
			),
			explanation:
				"The separately written ADP and DET are not one orthographic Fusion.",
			contaminationKeys: [
				"de-fusion:im",
				"de-fusion-boundary:uncontracted-in-dem",
			],
		},
		"grammar-de-fusion-unresolved-adp-mit": {
			...unresolved("Sie fährt <TARGET>mit</TARGET> dem Bus."),
			explanation:
				"A plain adposition is Lexeme/ADP, not Construction/Fusion.",
			contaminationKeys: ["de-fusion-boundary:ordinary-adp"],
		},
		"grammar-de-fusion-unresolved-am-superlative": {
			...unresolved("Mia läuft <TARGET>am</TARGET> schnellsten."),
			contaminationKeys: [
				"de-fusion:am",
				"de-fusion-boundary:nondecomposable-superlative-am",
			],
			explanation:
				"Superlative am is nondecomposable and does not realize the Fusion an dem.",
		},
		"grammar-de-fusion-unresolved-von-dem": {
			...unresolved(
				"Der Brief kommt <TARGET>von</TARGET> <TARGET>dem</TARGET> Arzt.",
			),
			contaminationKeys: [
				"de-fusion:vom",
				"de-fusion-boundary:uncontracted-von-dem",
			],
		},
		"grammar-de-fusion-unresolved-overbroad-noun": {
			...unresolved(
				"Wir fahren <TARGET>ans</TARGET> <TARGET>Meer</TARGET>.",
			),
			explanation:
				"The marked noun is outside the one-token Fusion, so target scope is overbroad.",
			contaminationKeys: [
				"de-fusion:ans",
				"de-fusion-boundary:overbroad",
			],
		},
		"grammar-de-fusion-unresolved-two-fusions": {
			...unresolved(
				"Er war <TARGET>am</TARGET> See und kam <TARGET>vom</TARGET> Bahnhof.",
			),
			explanation: "Targets span two independent Fusion occurrences.",
			contaminationKeys: [
				"de-fusion:am",
				"de-fusion:vom",
				"de-fusion-boundary:multiple",
			],
		},
		"grammar-de-fusion-unresolved-mixed-fusion-adp": {
			...unresolved(
				"Er ging <TARGET>ins</TARGET> Haus <TARGET>mit</TARGET> Garten.",
			),
			explanation:
				"The marked Fusion and plain ADP cannot form one Fusion Surface.",
			contaminationKeys: ["de-fusion-boundary:mixed-routes"],
		},
		"grammar-de-fusion-unresolved-valid-ihm": {
			...unresolved("Sie hilft <TARGET>ihm</TARGET> im Haus."),
			explanation:
				"The valid dative pronoun ihm must not be silently typo-normalized into im.",
			contaminationKeys: ["de-fusion-boundary:valid-word-not-typo"],
		},
		"grammar-de-fusion-unresolved-idiom-whole": {
			...unresolved(
				"Er musste <TARGET>ins</TARGET> <TARGET>Gras</TARGET> <TARGET>beißen</TARGET>.",
			),
			explanation:
				"The whole marked unit is Phraseme/Idiom; an internal Fusion does not determine the whole route.",
			contaminationKeys: ["de-fusion:ins", "de-fusion-boundary:idiom"],
		},
		"grammar-de-fusion-unresolved-discourse-whole": {
			...unresolved(
				"Sie sagte: „<TARGET>Zum</TARGET> <TARGET>Wohl</TARGET>!“",
			),
			explanation:
				"The complete marked toast is a DiscourseFormula rather than one Fusion.",
			contaminationKeys: ["de-fusion-boundary:discourse-formula"],
		},
		"grammar-de-fusion-unresolved-paired-frame": {
			...unresolved(
				"<TARGET>Je</TARGET> mehr, <TARGET>desto</TARGET> besser.",
			),
			explanation: "The marked construction is PairedFrame, not Fusion.",
			contaminationKeys: ["de-fusion-boundary:paired-frame"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
