import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const unresolved = { decision: "Unresolved", resolution: null } as const;

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-sconj-unresolved-ambiguous-da": {
			input: {
				markedContext: "Stichwort ohne Kontext: <TARGET>da</TARGET>",
			},
			idealOutput: unresolved,
			explanation:
				"Without clause syntax, da does not distinguish its subordinating-conjunction use from its adverb use.",
			contaminationKeys: ["de-sconj-form:da"],
		},
		"grammar-de-sconj-unresolved-adp-waehrend": {
			input: {
				markedContext:
					"<TARGET>Während</TARGET> des Urlaubs blieb das Büro zu.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-sconj-lemma:während"],
		},
		"grammar-de-sconj-unresolved-adv-dann": {
			input: {
				markedContext: "<TARGET>Dann</TARGET> gehen wir nach Hause.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-sconj-boundary-form:dann"],
		},
		"grammar-de-sconj-unresolved-cconj-denn": {
			input: {
				markedContext:
					"Wir gehen, <TARGET>denn</TARGET> es wird schon spät.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-sconj-boundary-form:denn"],
		},
		"grammar-de-sconj-unresolved-cconj-comparative-als": {
			input: {
				markedContext:
					"Mira ist größer <TARGET>als</TARGET> ihre Schwester.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-sconj-lemma:als"],
		},
		"grammar-de-sconj-unresolved-adp-als": {
			input: {
				markedContext: "Er arbeitet <TARGET>als</TARGET> Lehrer.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-sconj-lemma:als"],
		},
		"grammar-de-sconj-unresolved-adv-darum": {
			input: {
				markedContext:
					"<TARGET>Darum</TARGET> verschieben wir den Termin.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-sconj-boundary-form:darum"],
		},
		"grammar-de-sconj-unresolved-overbroad-dass-er": {
			input: {
				markedContext: "Mara weiß, <TARGET>dass er</TARGET> kommt.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-sconj-lemma:dass"],
		},
		"grammar-de-sconj-unresolved-two-targets": {
			input: {
				markedContext:
					"Ich frage, <TARGET>ob</TARGET> sie kommt und <TARGET>wann</TARGET> sie abreist.",
			},
			idealOutput: unresolved,
			contaminationKeys: ["de-sconj-multiple-targets:ob-wann"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
