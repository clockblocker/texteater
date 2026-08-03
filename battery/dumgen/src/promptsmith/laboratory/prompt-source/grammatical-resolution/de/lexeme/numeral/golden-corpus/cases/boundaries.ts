import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const unresolved = { decision: "Unresolved", resolution: null } as const;

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-num-unresolved-ordinal-dritten": {
			input: {
				markedContext:
					"Am <TARGET>dritten</TARGET> Tag kam die Antwort.",
			},
			idealOutput: unresolved,
			explanation:
				"German ordinals are normally Lexeme/ADJ in UD and Ord is absent from the exact German NUM codec.",
			contaminationKeys: ["de-num-boundary:ordinal-adjective"],
		},
		"grammar-de-num-unresolved-multiplicative-zweimal": {
			input: {
				markedContext: "Sie klingelte <TARGET>zweimal</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"German multiplicatives such as zweimal are Lexeme/ADV rather than NUM even though the ADV codec can carry NumType=Mult.",
			contaminationKeys: ["de-num-boundary:multiplicative-adverb"],
		},
		"grammar-de-num-unresolved-overbroad-zehn-buecher": {
			input: {
				markedContext: "Sie kauft <TARGET>zehn Bücher</TARGET>.",
			},
			idealOutput: unresolved,
			explanation:
				"The TARGET includes the noun Bücher, so it cannot be collapsed into one numeral Lexeme Surface.",
			contaminationKeys: ["de-num-scope:overbroad-cardinal-noun"],
		},
		"grammar-de-num-unresolved-determiner-beide": {
			input: {
				markedContext: "<TARGET>Beide</TARGET> Kinder warten draußen.",
			},
			idealOutput: unresolved,
			explanation:
				"Official German UD policy treats beide as DET rather than NUM.",
		},
		"grammar-de-num-unresolved-adverb-dreimal": {
			input: { markedContext: "Er rief <TARGET>dreimal</TARGET> an." },
			idealOutput: unresolved,
			contaminationKeys: ["de-num-boundary:multiplicative-adverb"],
		},
		"grammar-de-num-unresolved-ordinal-zweiten": {
			input: {
				markedContext: "Im <TARGET>zweiten</TARGET> Versuch gelang es.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-num-boundary:ordinal-adjective"],
		},
		"grammar-de-num-unresolved-proper-name-ii": {
			input: {
				markedContext:
					"König Heinrich <TARGET>II</TARGET> regierte lange.",
			},
			idealOutput: unresolved,
			explanation:
				"A Roman-numeral name component belongs to Lexeme/PROPN in German GSD, unlike an explicitly numerical Roman numeral.",
		},
		"grammar-de-num-unresolved-symbol-percent": {
			input: {
				markedContext: "Die Quote liegt bei 5 <TARGET>%</TARGET>.",
			},
			idealOutput: unresolved,
			explanation: "The percent sign is Lexeme/SYM, not NUM.",
		},
		"grammar-de-num-unresolved-multi-token-sechs-billionen": {
			input: {
				markedContext:
					"Die Summe beträgt <TARGET>sechs</TARGET> <TARGET>Billionen</TARGET> Euro.",
			},
			idealOutput: unresolved,
			explanation:
				"The two TARGET pairs mark two syntactic numeral Lexemes, not two members of one lexical Surface.",
		},
		"grammar-de-num-unresolved-repeated-acht": {
			input: {
				markedContext:
					"<TARGET>Acht</TARGET> kamen morgens und <TARGET>acht</TARGET> abends.",
			},
			idealOutput: unresolved,
			explanation:
				"Repeated occurrences of one Lemma are still separate lexical targets; this route call resolves exactly one occurrence.",
		},
		"grammar-de-num-unresolved-overbroad-neun-haeuser": {
			input: {
				markedContext: "Man baut <TARGET>neun Häuser</TARGET>.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-num-scope:overbroad-cardinal-noun"],
		},
		"grammar-de-num-unresolved-two-unrelated-targets": {
			input: {
				markedContext:
					"<TARGET>Elf</TARGET> kamen heute und <TARGET>zwölf</TARGET> morgen.",
			},
			idealOutput: unresolved,
		},
		"grammar-de-num-unresolved-adjective-60er": {
			input: {
				markedContext: "Die <TARGET>60-er</TARGET> Jahre waren bewegt.",
			},
			idealOutput: unresolved,
			explanation:
				"The hyphenated decade modifier is adjectival in German GSD rather than a NUM Lexeme.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
