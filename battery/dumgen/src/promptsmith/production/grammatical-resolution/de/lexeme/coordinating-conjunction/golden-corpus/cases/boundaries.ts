import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { conjunctionCase } from "./case-helpers";

export const ambiguityAndAnchorCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-cconj-demo-comparative-als": conjunctionCase(
				"Mira ist größer <TARGET>als</TARGET> ihre Schwester.",
				"als",
				{
					conjType: "Comp",
					explanation:
						"Comparison complement. Route fixed. Mark Comp.",
				},
			),
			"grammar-de-cconj-demo-causal-denn": conjunctionCase(
				"Wir gehen jetzt, <TARGET>denn</TARGET> es wird spät.",
				"denn",
				{
					explanation:
						"Second clause stays V2. Causal coordinator. Not particle or subordinator.",
				},
			),
			"grammar-de-cconj-dev-comparative-wie": conjunctionCase(
				"Mira ist genauso groß <TARGET>wie</TARGET> ihre Schwester.",
				"wie",
				{ conjType: "Comp" },
			),
			"grammar-de-cconj-dev-comparative-als-mehr": conjunctionCase(
				"Heute kamen mehr Gäste <TARGET>als</TARGET> gestern.",
				"als",
				{ conjType: "Comp" },
			),
			"grammar-de-cconj-dev-jedoch-null-position": conjunctionCase(
				"Die Polizei suchte überall, <TARGET>jedoch</TARGET> sie fand ihn nicht.",
				"jedoch",
				{
					explanation:
						"Pronoun before finite verb. Coordinator slot. Not integrated ADV.",
				},
			),
			"grammar-de-cconj-dev-aber-not-particle": conjunctionCase(
				"Die Aufgabe war schwierig, <TARGET>aber</TARGET> alle lösten sie.",
				"aber",
				{
					explanation:
						"Joins clauses. Route fixed CCONJ. Not intensifying PART.",
				},
			),
			"grammar-de-cconj-dev-doch-not-particle": conjunctionCase(
				"Wir warteten lange, <TARGET>doch</TARGET> niemand erschien.",
				"doch",
				{
					explanation:
						"Joins clauses. Route fixed CCONJ. Not modal PART.",
				},
			),
			"grammar-de-cconj-dev-denn-verb-second-anchor": conjunctionCase(
				"Nora schloss das Fenster, <TARGET>denn</TARGET> draußen tobte ein Sturm.",
				"denn",
				{
					explanation:
						"Finite verb stays second. Coordinator. Not SCONJ.",
				},
			),
			"grammar-de-cconj-dev-ordinary-oder-without-correlate":
				conjunctionCase(
					"Du kannst anrufen <TARGET>oder</TARGET> eine Nachricht schreiben.",
					"oder",
					{
						explanation:
							"Plain oder joins alternatives without an upstream correlating partner.",
					},
				),
			"grammar-de-cconj-accept-comparative-als-tiefer": conjunctionCase(
				"Der neue Brunnen ist tiefer <TARGET>als</TARGET> der alte.",
				"als",
				{ conjType: "Comp" },
			),
			"grammar-de-cconj-accept-comparative-wie-ebenso": conjunctionCase(
				"Die zweite Lösung ist ebenso robust <TARGET>wie</TARGET> die erste.",
				"wie",
				{ conjType: "Comp" },
			),
			"grammar-de-cconj-accept-denn-causal": conjunctionCase(
				"Lea nahm einen Schirm, <TARGET>denn</TARGET> dunkle Wolken zogen auf.",
				"denn",
			),
			"grammar-de-cconj-accept-doch-sentence-initial": conjunctionCase(
				"<TARGET>Doch</TARGET> niemand wollte den Plan aufgeben.",
				"Doch",
				{ normalizedMember: "doch", canonicalForm: "doch" },
			),
			"grammar-de-cconj-accept-jedoch-null-position": conjunctionCase(
				"Der Weg war weit, <TARGET>jedoch</TARGET> die Gruppe blieb zusammen.",
				"jedoch",
				{
					explanation:
						"Subject before finite verb. CCONJ. Not integrated ADV.",
				},
			),
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
