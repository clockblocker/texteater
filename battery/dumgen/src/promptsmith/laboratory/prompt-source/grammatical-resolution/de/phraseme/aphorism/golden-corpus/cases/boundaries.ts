import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { markEveryMember, unresolved } from "./builders";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-aphorism-unresolved-proverb": {
			...unresolved(
				`${markEveryMember("Morgenstund hat Gold im Mund")}.`,
			),
			contaminationKeys: ["de-proverb:morgenstund-hat-gold-im-mund"],
			explanation:
				"This anonymous traditional saying belongs on Phraseme/Proverb, not the authored Aphorism route.",
		},
		"grammar-de-aphorism-unresolved-proverb-grube": {
			...unresolved(
				`${markEveryMember("Wer anderen eine Grube gräbt fällt selbst hinein")}.`,
			),
			contaminationKeys: ["de-proverb:wer-anderen-eine-grube-graebt"],
			explanation:
				"This traditional anonymous rule-shaped saying is a Proverb, even though it can be quoted as a complete sentence.",
		},
		"grammar-de-aphorism-unresolved-idiom": {
			...unresolved(
				`Er wollte ${markEveryMember("den Nagel auf den Kopf treffen")}.`,
			),
			contaminationKeys: ["de-idiom:den-nagel-auf-den-kopf-treffen"],
		},
		"grammar-de-aphorism-unresolved-collocation": {
			...unresolved(
				`Sie musste ${markEveryMember("eine Entscheidung treffen")}.`,
			),
			contaminationKeys: ["de-collocation:eine-entscheidung-treffen"],
		},
		"grammar-de-aphorism-unresolved-arbitrary-quotation": {
			...unresolved(
				`Anna sagte: „${markEveryMember("Ich komme morgen später")}.“`,
			),
			explanation:
				"Direct speech is not an Aphorism merely because it is quoted and sentence-like.",
		},
		"grammar-de-aphorism-unresolved-ordinary-sentence": {
			...unresolved(
				`${markEveryMember("Die Katze sitzt auf dem Sofa")}.`,
			),
		},
		"grammar-de-aphorism-unresolved-literary-quotation": {
			...unresolved(
				`„${markEveryMember("Da steh ich nun ich armer Tor")}.“`,
			),
			contaminationKeys: ["de-literary-quotation:faust-da-steh-ich-nun"],
			explanation:
				"A memorable line of dramatic dialogue is an arbitrary literary quotation here, not a self-contained authored maxim from an aphorism collection.",
		},
		"grammar-de-aphorism-unresolved-partial": {
			...unresolved(
				"<TARGET>Die</TARGET> <TARGET>meisten</TARGET> <TARGET>Menschen</TARGET> brauchen mehr Liebe, als sie verdienen.",
			),
			contaminationKeys: [
				"de-aphorism-lemma:die-meisten-menschen-brauchen-liebe",
			],
			explanation:
				"Only a prefix of the aphorism is selected; this route requires every lexical member and never returns Partial coverage.",
		},
		"grammar-de-aphorism-unresolved-two-whole-units": {
			...unresolved(
				`${markEveryMember("Was Du zu müssen glaubst ist das was Du willst")}. ${markEveryMember("Auch was wir am meisten sind sind wir nicht immer")}.`,
			),
			explanation:
				"The marked members span two independent aphorisms, so they do not form exactly one resolvable whole unit.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
