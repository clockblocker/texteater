import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { unresolved } from "./builders";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-idiom-unresolved-literal-grass": {
			input: {
				markedContext:
					"Das Kalb <TARGET>biss</TARGET> <TARGET>ins</TARGET> <TARGET>Gras</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The animal literally bites grass; lexical resemblance does not establish the idiomatic reading 'die'.",
			contaminationKeys: [
				"de-idiom-lemma:ins-gras-beissen",
				"de-idiom-boundary:literal-reading-ins-gras",
			],
		},
		"grammar-de-idiom-unresolved-grass-underselected-without-head": {
			input: {
				markedContext:
					"Nach langer Krankheit biss der Bösewicht <TARGET>ins</TARGET> <TARGET>Gras</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The context clearly realizes the idiomatic meaning, but the contextual Inflection omits its finite verbal head biss from the selected members and must not borrow that head from unselected context.",
			contaminationKeys: [
				"de-idiom-lemma:ins-gras-beissen",
				"de-idiom-boundary:underselection-without-head-ins-gras",
			],
		},
		"grammar-de-idiom-unresolved-underselected-without-head": {
			input: {
				markedContext:
					"Sie lachte <TARGET>sich</TARGET> <TARGET>ins</TARGET> <TARGET>Fäustchen</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"A contextual Inflection Surface must select its inflecting verbal head; the route must not borrow head grammar from unselected context.",
			contaminationKeys: [
				"de-idiom-lemma:sich-ins-faeustchen-lachen",
				"de-idiom-boundary:underselection-without-head-faeustchen",
			],
		},
		"grammar-de-idiom-provisional-faeustchen-underselected-head": {
			input: {
				markedContext:
					"Sie <TARGET>lachte</TARGET> sich <TARGET>ins</TARGET> Fäustchen.",
			},
			idealOutput: unresolved,
			explanation:
				"The repository proves only the heulte mit Partial example. Extending head-plus-member Partial to a different idiom is unsettled and remains Unresolved.",
			contaminationKeys: [
				"de-idiom-lemma:sich-ins-faeustchen-lachen",
				"de-idiom-policy:broader-partial-generalization",
			],
		},
		"grammar-de-idiom-unresolved-overselected-subject": {
			input: {
				markedContext:
					"Der <TARGET>Plan</TARGET> <TARGET>hat</TARGET> <TARGET>Hand</TARGET> <TARGET>und</TARGET> <TARGET>Fuß</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The marked subject is not a fixed member of Hand und Fuß haben, so the proposed Surface is overbroad.",
			contaminationKeys: [
				"de-idiom-lemma:hand-und-fuss-haben",
				"de-idiom-boundary:overselection",
			],
		},
		"grammar-de-idiom-unresolved-literal-bed": {
			input: {
				markedContext:
					"Der Museumswärter <TARGET>hütete</TARGET> <TARGET>das</TARGET> <TARGET>Bett</TARGET> der Kaiserin vor Dieben.",
			},
			idealOutput: unresolved,
			explanation:
				"Guarding a physical bed is a free literal phrase rather than the conventional illness-related Phraseolexeme.",
			contaminationKeys: [
				"de-idiom-lemma:das-bett-hueten",
				"de-idiom-boundary:literal-reading-bed",
			],
		},
		"grammar-de-idiom-unresolved-collocation": {
			input: {
				markedContext:
					"Der Ausschuss <TARGET>trifft</TARGET> <TARGET>eine</TARGET> <TARGET>Entscheidung</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The conventional support-verb expression remains semantically connected to Entscheidung and belongs to Collocation.",
			contaminationKeys: ["de-idiom-boundary:collocation"],
		},
		"grammar-de-idiom-unresolved-proverb": {
			input: {
				markedContext:
					"<TARGET>Morgenstund</TARGET> <TARGET>hat</TARGET> <TARGET>Gold</TARGET> <TARGET>im</TARGET> <TARGET>Mund</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The complete anonymous generalizing saying belongs to Proverb, even though it is figurative.",
			contaminationKeys: [
				"de-proverb:morgenstund-hat-gold-im-mund",
				"de-idiom-boundary:proverb-morgenstund",
			],
		},
		"grammar-de-idiom-unresolved-proverb-grube": {
			input: {
				markedContext:
					"<TARGET>Wer</TARGET> <TARGET>anderen</TARGET> <TARGET>eine</TARGET> <TARGET>Grube</TARGET> <TARGET>gräbt</TARGET>, <TARGET>fällt</TARGET> <TARGET>selbst</TARGET> <TARGET>hinein</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The fully selected OWID-backed saying is a complete anonymous generalizing Proverb; its figurative wording does not make it an Idiom.",
			contaminationKeys: [
				"de-proverb:wer-anderen-eine-grube-graebt",
				"de-idiom-boundary:proverb-grube",
			],
		},
		"grammar-de-idiom-unresolved-discourse-formula": {
			input: {
				markedContext:
					"Sie sagte: „<TARGET>Guten</TARGET> <TARGET>Morgen</TARGET>!“",
			},
			idealOutput: unresolved,
			explanation:
				"The marked unit conventionally performs a greeting and belongs to DiscourseFormula.",
			contaminationKeys: ["de-idiom-boundary:discourse-formula"],
		},
		"grammar-de-idiom-unresolved-separable-verb": {
			input: {
				markedContext:
					"Fritz <TARGET>steht</TARGET> sofort <TARGET>auf</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The multi-member separable verb remains Lexeme/VERB rather than Phraseme/Idiom.",
			contaminationKeys: ["de-idiom-boundary:lexeme-verb"],
		},
		"grammar-de-idiom-unresolved-mixed-occurrences": {
			input: {
				markedContext:
					"Sie <TARGET>lachte</TARGET> sich ins Fäustchen, während er den <TARGET>Löffel</TARGET> <TARGET>abgab</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The selected members span two different idiom occurrences and cannot form one Surface.",
			contaminationKeys: [
				"de-idiom-boundary:mixed-occurrences",
				"de-idiom-lemma:sich-ins-faeustchen-lachen",
				"de-idiom-lemma:den-loeffel-abgeben",
			],
		},
		"grammar-de-idiom-unresolved-two-occurrences": {
			input: {
				markedContext:
					"Er <TARGET>hütete</TARGET> <TARGET>das</TARGET> <TARGET>Bett</TARGET>, und sie <TARGET>hütete</TARGET> <TARGET>das</TARGET> <TARGET>Bett</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"Targets covering two complete occurrences cannot be collapsed into one Idiom Surface.",
			contaminationKeys: [
				"de-idiom-boundary:repeated-occurrences",
				"de-idiom-lemma:das-bett-hueten",
			],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
