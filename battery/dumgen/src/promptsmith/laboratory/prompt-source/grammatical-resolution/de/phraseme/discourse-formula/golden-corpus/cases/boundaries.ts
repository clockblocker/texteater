import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { unresolved } from "./builders";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-discourse-formula-unresolved-danke-intj": {
			input: {
				markedContext:
					"Er nahm das Geschenk und sagte <TARGET>Danke</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The isolated single word danke belongs to a lexical/interjection boundary, not this multiword Phraseme route.",
		},
		"grammar-de-discourse-formula-unresolved-compositional-request": {
			input: {
				markedContext:
					"<TARGET>Kannst</TARGET> <TARGET>du</TARGET> <TARGET>mir</TARGET> <TARGET>bitte</TARGET> <TARGET>das</TARGET> <TARGET>Fenster</TARGET> <TARGET>öffnen</TARGET>?",
			},
			idealOutput: unresolved,
			explanation:
				"This is an ordinary productive request sentence, not a conventionalized formula Lemma.",
		},
		"grammar-de-discourse-formula-unresolved-collocation": {
			input: {
				markedContext:
					"Sie musste <TARGET>eine</TARGET> <TARGET>Entscheidung</TARGET> <TARGET>treffen</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"Eine Entscheidung treffen is a restricted compositional Collocation, not an autonomous discourse act.",
		},
		"grammar-de-discourse-formula-unresolved-idiom": {
			input: {
				markedContext:
					"Im Western musste der Bösewicht <TARGET>ins</TARGET> <TARGET>Gras</TARGET> <TARGET>beißen</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The figurative whole belongs to Phraseme/Idiom rather than DiscourseFormula.",
		},
		"grammar-de-discourse-formula-unresolved-proverb": {
			input: {
				markedContext:
					"Die Großmutter sagte: „<TARGET>Morgenstund</TARGET> <TARGET>hat</TARGET> <TARGET>Gold</TARGET> <TARGET>im</TARGET> <TARGET>Mund</TARGET>.“",
			},
			idealOutput: unresolved,
			explanation:
				"A reusable general saying belongs to the Proverb boundary, not an interactional formula role.",
		},
		"grammar-de-discourse-formula-unresolved-arbitrary-quote": {
			input: {
				markedContext:
					"Auf der Anzeige stand: „<TARGET>Der</TARGET> <TARGET>Zug</TARGET> <TARGET>kommt</TARGET> <TARGET>später</TARGET>.“",
			},
			idealOutput: unresolved,
			explanation:
				"Quotation does not conventionalize an ordinary proposition as a discourse formula.",
		},
		"grammar-de-discourse-formula-unresolved-partial-formula": {
			input: {
				markedContext:
					"Beim Abschied sagte sie: „<TARGET>Schönen</TARGET> Tag!“",
			},
			idealOutput: unresolved,
			explanation:
				"Only one member of the candidate formula is marked, so this route cannot emit a Full Surface.",
		},
		"grammar-de-discourse-formula-unresolved-overbroad-punctuation": {
			input: {
				markedContext:
					"Vor der Abfahrt rief sie: „<TARGET>Gute Reise!</TARGET>“",
			},
			idealOutput: unresolved,
			explanation:
				"One TARGET spans multiple lexical members and punctuation instead of marking members separately.",
		},
		"grammar-de-discourse-formula-unresolved-repeated-occurrence": {
			input: {
				markedContext:
					"Sie sagte erst „<TARGET>Bis</TARGET> <TARGET>morgen</TARGET>“ und später erneut „<TARGET>Bis</TARGET> <TARGET>morgen</TARGET>“.",
			},
			idealOutput: unresolved,
			explanation:
				"The targets mix two occurrences; one result may describe only one contiguous formula occurrence.",
		},
		"grammar-de-discourse-formula-unresolved-unrelated-targets": {
			input: {
				markedContext:
					"Morgens sagte er <TARGET>Guten</TARGET> Tag, abends auf <TARGET>Wiedersehen</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The marked words belong to different formulas and different discourse moments.",
		},
		"grammar-de-discourse-formula-unresolved-bitte-intj": {
			input: {
				markedContext:
					"Beim Bäcker sagte er: „Noch einen Kaffee, <TARGET>bitte</TARGET>.“",
			},
			idealOutput: unresolved,
			explanation:
				"The isolated single-word request marker bitte is outside this multiword Phraseme route.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
