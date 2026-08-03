import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { markEveryMember, unresolved } from "./builders";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-proverb-unresolved-aphorism-alter": {
			...unresolved(
				`In ihrer Aphorismensammlung schrieb Marie von Ebner-Eschenbach: „${markEveryMember("Das Alter verklärt oder versteinert")}.“`,
			),
			contaminationKeys: ["de-aphorism-lemma:das-alter-verklaert"],
			explanation:
				"The context explicitly identifies the marked authored maxim as an entry in an aphorism collection.",
		},
		"grammar-de-proverb-unresolved-aphorism-nachahmer": {
			...unresolved(
				`Der Eintrag in Ebner-Eschenbachs Aphorismensammlung lautet: „${markEveryMember("Die meisten Nachahmer lockt das Unnachahmliche")}.“`,
			),
			contaminationKeys: ["de-aphorism-lemma:die-meisten-nachahmer"],
			explanation:
				"Editorial classification as an authored Aphorism is positive evidence contradicting the fixed Proverb route.",
		},
		"grammar-de-proverb-unresolved-idiom": {
			...unresolved(
				`Er wollte ${markEveryMember("den Nagel auf den Kopf treffen")}.`,
			),
			contaminationKeys: ["de-idiom:den-nagel-auf-den-kopf-treffen"],
			explanation:
				"The marked phrase fills a clause role as a figurative Idiom rather than functioning as a sentence-valued Proverb.",
		},
		"grammar-de-proverb-unresolved-discourse-formula": {
			...unresolved(
				`Als sie das Büro betrat, sagte sie: „${markEveryMember("Guten Morgen")}!“`,
			),
			contaminationKeys: [
				"de-discourse-formula:orthography-guten-morgen",
			],
			explanation:
				"The marked unit performs the local interactional act of greeting rather than expressing a generalizing saying.",
		},
		"grammar-de-proverb-unresolved-arbitrary-quotation": {
			...unresolved(
				`Anna sagte: „${markEveryMember("Ich komme morgen später")}.“`,
			),
			contaminationKeys: [
				"de-arbitrary-quotation:ich-komme-morgen-spaeter",
			],
			explanation:
				"Quotation and sentence shape do not conventionalize an ordinary episodic utterance as a Proverb.",
		},
		"grammar-de-proverb-unresolved-partial": {
			...unresolved(`${markEveryMember("Ende gut")}, alles gut.`),
			contaminationKeys: [
				"de-proverb:ende-gut-alles-gut",
				"de-proverb-boundary:partial",
			],
			explanation:
				"Two present lexical members of the proverb are unmarked; the route never repairs scope or returns Partial coverage.",
		},
		"grammar-de-proverb-unresolved-overbroad-attribution": {
			...unresolved(
				`„${markEveryMember("Andere Länder")}, ${markEveryMember("andere Sitten")}“, ${markEveryMember("sagte die Reiseleiterin")}.`,
			),
			contaminationKeys: [
				"de-proverb:andere-laender-andere-sitten",
				"de-proverb-boundary:overselection",
			],
			explanation:
				"Speaker attribution is metadata rather than part of the Proverb Lemma, so marking it makes scope overbroad.",
		},
		"grammar-de-proverb-unresolved-two-whole-units": {
			...unresolved(
				`${markEveryMember("Übung macht den Meister")}. ${markEveryMember("Wer rastet")}, ${markEveryMember("der rostet")}.`,
			),
			contaminationKeys: [
				"de-proverb:uebung-macht-den-meister",
				"de-proverb:wer-rastet-der-rostet",
				"de-proverb-boundary:two-whole-units",
			],
			explanation:
				"The selected members span two independent proverbs rather than exactly one whole unit.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
