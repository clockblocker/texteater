import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { resolvedProverb } from "./builders";

export const proverbCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-proverb-morgenstund": {
			...resolvedProverb({
				attested: "Morgenstund hat Gold im Mund",
				before: "Die Großmutter sagte: „",
				after: ".“",
			}),
			contaminationKeys: ["de-proverb:morgenstund-hat-gold-im-mund"],
			explanation:
				"The complete proverb is selected; reporting context, quotation marks, and terminal punctuation are not lexical members.",
		},
		"grammar-de-proverb-typo-anfank": {
			...resolvedProverb({
				attested: "Aller Anfank ist schwer.",
				normalized: "Aller Anfang ist schwer",
				canonical: "Aller Anfang ist schwer",
				typoMemberIndices: [1],
			}),
			contaminationKeys: ["de-proverb:aller-anfang-ist-schwer"],
			explanation:
				"The misspelled noun is repaired and marked Typo; the repaired Surface is canonical.",
		},
		"grammar-de-proverb-was-heute": {
			...resolvedProverb({
				attested:
					"Was du heute kannst besorgen, das verschiebe nicht auf morgen.",
			}),
			contaminationKeys: ["de-proverb:was-du-heute-kannst-besorgen"],
			explanation:
				"Every lexical member is selected while the internal comma and terminal full stop remain outside member identity.",
		},
		"grammar-de-proverb-andere-laender": {
			...resolvedProverb({ attested: "Andere Länder, andere Sitten." }),
			contaminationKeys: ["de-proverb:andere-laender-andere-sitten"],
		},
		"grammar-de-proverb-ende-gut": {
			...resolvedProverb({ attested: "Ende gut, alles gut." }),
			contaminationKeys: ["de-proverb:ende-gut-alles-gut"],
			explanation:
				"The elliptical but sentence-valued OWID Kernform is one complete proverb; its comma is not a member.",
		},
		"grammar-de-proverb-uebung-meister": {
			...resolvedProverb({ attested: "Übung macht den Meister." }),
			contaminationKeys: ["de-proverb:uebung-macht-den-meister"],
		},
		"grammar-de-proverb-viele-koeche": {
			...resolvedProverb({
				attested: "Viele Köche verderben den Brei.",
			}),
			contaminationKeys: ["de-proverb:viele-koeche-verderben-den-brei"],
		},
		"grammar-de-proverb-grube": {
			...resolvedProverb({
				attested: "Wer anderen eine Grube gräbt, fällt selbst hinein.",
			}),
			contaminationKeys: ["de-proverb:wer-anderen-eine-grube-graebt"],
		},
		"grammar-de-proverb-zuletzt-lacht": {
			...resolvedProverb({
				attested: "Wer zuletzt lacht, lacht am besten.",
			}),
			contaminationKeys: ["de-proverb:wer-zuletzt-lacht-lacht-am-besten"],
		},
		"grammar-de-proverb-stille-wasser": {
			...resolvedProverb({ attested: "Stille Wasser sind tief." }),
			contaminationKeys: ["de-proverb:stille-wasser-sind-tief"],
		},
		"grammar-de-proverb-gelegenheit-diebe": {
			...resolvedProverb({ attested: "Gelegenheit macht Diebe." }),
			contaminationKeys: ["de-proverb:gelegenheit-macht-diebe"],
		},
		"grammar-de-proverb-apfel-stamm": {
			...resolvedProverb({
				attested: "Der Apfel fällt nicht weit vom Stamm.",
			}),
			contaminationKeys: [
				"de-proverb:der-apfel-faellt-nicht-weit-vom-stamm",
			],
		},
		"grammar-de-proverb-kleinvieh": {
			...resolvedProverb({ attested: "Kleinvieh macht auch Mist." }),
			contaminationKeys: ["de-proverb:kleinvieh-macht-auch-mist"],
		},
		"grammar-de-proverb-luegen-beine": {
			...resolvedProverb({ attested: "Lügen haben kurze Beine." }),
			contaminationKeys: ["de-proverb:luegen-haben-kurze-beine"],
		},
		"grammar-de-proverb-reden-silber": {
			...resolvedProverb({
				attested: "Reden ist Silber, Schweigen ist Gold.",
			}),
			contaminationKeys: [
				"de-proverb:reden-ist-silber-schweigen-ist-gold",
			],
		},
		"grammar-de-proverb-wer-rastet": {
			...resolvedProverb({ attested: "Wer rastet, der rostet." }),
			contaminationKeys: ["de-proverb:wer-rastet-der-rostet"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
