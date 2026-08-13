import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citationCase, core, inflectionCase } from "./builders";

export const typeAndPossessorCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-pron-demo-relative-der": inflectionCase(
				"Das ist der Techniker, <TARGET>der</TARGET> den Drucker repariert hat.",
				"der",
				"der",
				{ case: "Nom", gender: "Masc", number: "Sing", reflex: null },
				{
					coreFeatures: core("Rel"),
					explanation: "Current role relative. Scalar PronType Rel.",
				},
			),
			"grammar-de-pron-demo-indefinite-etwas": citationCase(
				"<TARGET>Etwas</TARGET> fehlt noch für das gemeinsame Frühstück.",
				"Etwas",
				"etwas",
				{
					normalizedMember: "etwas",
					coreFeatures: core("Ind"),
					explanation:
						"Invariant Citation. Initial capital normalizes down.",
				},
			),
			"grammar-de-pron-dev-demonstrative-das-nom": inflectionCase(
				"<TARGET>Das</TARGET> gefällt der ganzen Familie.",
				"Das",
				"der",
				{ case: "Nom", gender: "Neut", number: "Sing", reflex: null },
				{
					normalizedMember: "das",
					coreFeatures: core("Dem"),
				},
			),
			"grammar-de-pron-dev-relative-die-nom": inflectionCase(
				"Die Musikerin, <TARGET>die</TARGET> heute auftritt, kommt aus Köln.",
				"die",
				"der",
				{ case: "Nom", gender: "Fem", number: "Sing", reflex: null },
				{ coreFeatures: core("Rel") },
			),
			"grammar-de-pron-dev-interrogative-wer-nom": inflectionCase(
				"<TARGET>Wer</TARGET> übernimmt morgen den Bereitschaftsdienst?",
				"Wer",
				"wer",
				{ case: "Nom", gender: null, number: "Sing", reflex: null },
				{
					normalizedMember: "wer",
					coreFeatures: core("Int"),
					explanation: "Question role. Scalar PronType Int.",
				},
			),
			"grammar-de-pron-dev-indefinite-jemandem": inflectionCase(
				"Die Notiz muss <TARGET>jemandem</TARGET> aus dem Team gehören.",
				"jemandem",
				"jemand",
				{ case: "Dat", gender: null, number: "Sing", reflex: null },
				{ coreFeatures: core("Ind") },
			),
			"grammar-de-pron-dev-negative-niemanden": inflectionCase(
				"Am Eingang sah der Pförtner <TARGET>niemanden</TARGET> mehr.",
				"niemanden",
				"niemand",
				{ case: "Acc", gender: null, number: "Sing", reflex: null },
				{ coreFeatures: core("Neg") },
			),
			"grammar-de-pron-dev-total-foreign-all": citationCase(
				"Im englischen Bericht stand: „<TARGET>All</TARGET> had arrived safely.“",
				"All",
				"all",
				{
					normalizedMember: "all",
					coreFeatures: core("Tot", { foreign: "Yes" }),
					explanation:
						"Foreign invariant total PRON. Citation Surface.",
				},
			),
			"grammar-de-pron-dev-extpos-was": inflectionCase(
				"<TARGET>Was</TARGET> für eine Überraschung war das!",
				"Was",
				"was",
				{ case: "Nom", gender: "Neut", number: "Sing", reflex: null },
				{
					normalizedMember: "was",
					coreFeatures: core("Int", { extPos: "DET" }),
					explanation: "Interrogative-exclamative PRON. ExtPos DET.",
				},
			),
			"grammar-de-pron-dev-poss-meiner": inflectionCase(
				"Der rote Regenschirm am Eingang ist <TARGET>meiner</TARGET>.",
				"meiner",
				"ich",
				{ case: "Nom", gender: "Masc", number: "Sing", reflex: null },
				{
					coreFeatures: core("Prs", { person: "1", poss: "Yes" }),
					explanation:
						"Possessor first person. Pronoun stands alone.",
				},
			),
			"grammar-de-pron-accept-v4-demonstrative-die-nom-plur":
				inflectionCase(
					"<TARGET>Die</TARGET> dort warten bereits auf den nächsten Bus.",
					"Die",
					"der",
					{
						case: "Nom",
						gender: null,
						number: "Plur",
						reflex: null,
					},
					{
						normalizedMember: "die",
						coreFeatures: core("Dem"),
					},
				),
			"grammar-de-pron-accept-v4-relative-dem-dat-neut": inflectionCase(
				"Das Gerät, mit <TARGET>dem</TARGET> wir messen, steht im Labor.",
				"dem",
				"der",
				{ case: "Dat", gender: "Neut", number: "Sing", reflex: null },
				{ coreFeatures: core("Rel") },
			),
			"grammar-de-pron-accept-v4-interrogative-wem-dat": inflectionCase(
				"<TARGET>Wem</TARGET> gehört der grüne Rucksack am Eingang?",
				"Wem",
				"wer",
				{ case: "Dat", gender: null, number: "Sing", reflex: null },
				{
					normalizedMember: "wem",
					coreFeatures: core("Int"),
				},
			),
			"grammar-de-pron-accept-v4-indefinite-irgendjemandem-dat":
				inflectionCase(
					"Die Nachricht muss <TARGET>irgendjemandem</TARGET> im Büro bekannt vorkommen.",
					"irgendjemandem",
					"irgendjemand",
					{ case: "Dat", gender: null, number: "Sing", reflex: null },
					{
						coreFeatures: core("Ind"),
					},
				),
			"grammar-de-pron-accept-v4-negative-niemanden-acc": inflectionCase(
				"Die Kontrolleurin ließ <TARGET>niemanden</TARGET> ohne Ausweis hinein.",
				"niemanden",
				"niemand",
				{ case: "Acc", gender: null, number: "Sing", reflex: null },
				{ coreFeatures: core("Neg") },
			),
			"grammar-de-pron-accept-v4-reciprocal-einander": citationCase(
				"Im engen Flur gingen die Besucher <TARGET>einander</TARGET> höflich aus dem Weg.",
				"einander",
				"einander",
				{ coreFeatures: core("Rcp") },
			),
			"grammar-de-pron-accept-v4-negative-nichts": citationCase(
				"Auf dem leeren Schreibtisch lag <TARGET>nichts</TARGET> mehr.",
				"nichts",
				"nichts",
				{ coreFeatures: core("Neg") },
			),
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
