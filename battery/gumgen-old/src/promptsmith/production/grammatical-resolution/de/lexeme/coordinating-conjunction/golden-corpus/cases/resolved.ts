import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { conjunctionCase } from "./case-helpers";

export const resolvedCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-cconj-demo-ordinary-und": conjunctionCase(
			"Anna liest, <TARGET>und</TARGET> Ben kocht.",
			"und",
			{
				explanation:
					"Route fixed. Joins clauses. Citation only. Ordinary Lemma.",
			},
		),
		"grammar-de-cconj-dev-ordinary-oder-nouns": conjunctionCase(
			"Zum Frühstück gibt es Müsli <TARGET>oder</TARGET> Brot.",
			"oder",
		),
		"grammar-de-cconj-dev-adversative-aber-clauses": conjunctionCase(
			"Sie ist müde, <TARGET>aber</TARGET> sie arbeitet weiter.",
			"aber",
		),
		"grammar-de-cconj-dev-adversative-doch-clauses": conjunctionCase(
			"Er wollte kommen, <TARGET>doch</TARGET> der Zug fiel aus.",
			"doch",
		),
		"grammar-de-cconj-dev-corrective-sondern": conjunctionCase(
			"Das Wasser ist nicht kalt, <TARGET>sondern</TARGET> warm.",
			"sondern",
		),
		"grammar-de-cconj-dev-additive-sowie": conjunctionCase(
			"Brot <TARGET>sowie</TARGET> Käse werden serviert.",
			"sowie",
		),
		"grammar-de-cconj-dev-beziehungsweise-full": conjunctionCase(
			"Die Eltern <TARGET>beziehungsweise</TARGET> Sorgeberechtigten unterschreiben.",
			"beziehungsweise",
		),
		"grammar-de-cconj-dev-sentence-initial-und": conjunctionCase(
			"<TARGET>Und</TARGET> danach gingen alle nach Hause.",
			"Und",
			{ normalizedMember: "und", canonicalForm: "und" },
		),
		"grammar-de-cconj-dev-repeated-second-und": conjunctionCase(
			"Anna und Ben singen, <TARGET>und</TARGET> Carla tanzt.",
			"und",
		),
		"grammar-de-cconj-accept-und-list": conjunctionCase(
			"Im Korb liegen Äpfel, Birnen <TARGET>und</TARGET> Pflaumen.",
			"und",
		),
		"grammar-de-cconj-accept-oder-clauses": conjunctionCase(
			"Wir fahren heute, <TARGET>oder</TARGET> wir bleiben zu Hause.",
			"oder",
		),
		"grammar-de-cconj-accept-aber-adjectives": conjunctionCase(
			"Der Weg ist lang, <TARGET>aber</TARGET> gut ausgeschildert.",
			"aber",
		),
		"grammar-de-cconj-accept-sowie-subjects": conjunctionCase(
			"Die Ärztin <TARGET>sowie</TARGET> der Pfleger wurden informiert.",
			"sowie",
		),
		"grammar-de-cconj-accept-variant-u": conjunctionCase(
			"Auf dem Zettel stehen Brot <TARGET>u</TARGET>. Käse.",
			"u",
			{
				canonicalForm: "und",
				spelling: "Variant",
			},
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
