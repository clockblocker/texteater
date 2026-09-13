import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { inflectionCase } from "./builders";

export const agreementAndPositionCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-adj-demo-attributive-klein": inflectionCase(
				"Der <TARGET>kleine</TARGET> Hund schläft.",
				"kleine",
				"klein",
				{ case: "Nom", degree: "Pos", gender: "Masc", number: "Sing" },
				{
					explanation:
						"Attributive ADJ. Context gives nominative masculine singular.",
				},
			),
			"grammar-de-adj-demo-adverbial-schnell": inflectionCase(
				"Der Hund läuft <TARGET>schnell</TARGET>.",
				"schnell",
				"schnell",
				{ case: null, degree: "Pos", gender: null, number: null },
				{
					explanation:
						"Productive adverbial ADJ, not lexical ADV. Degree Pos. No agreement.",
				},
			),
			"grammar-de-adj-dev-attributive-acc-fem-rot": inflectionCase(
				"Sie trägt die <TARGET>rote</TARGET> Tasche.",
				"rote",
				"rot",
				{ case: "Acc", degree: "Pos", gender: "Fem", number: "Sing" },
			),
			"grammar-de-adj-dev-attributive-dat-neut-kalt": inflectionCase(
				"Bei <TARGET>kaltem</TARGET> Wetter bleiben wir drinnen.",
				"kaltem",
				"kalt",
				{ case: "Dat", degree: "Pos", gender: "Neut", number: "Sing" },
			),
			"grammar-de-adj-dev-attributive-gen-plur-neu": inflectionCase(
				"Wegen <TARGET>neuer</TARGET> Regeln änderte sich der Ablauf.",
				"neuer",
				"neu",
				{ case: "Gen", degree: "Pos", gender: "Fem", number: "Plur" },
				{
					explanation:
						"Ending syncretic. Context gives genitive plural; noun gives feminine identity.",
				},
			),
			"grammar-de-adj-dev-attributive-nom-plur-alt": inflectionCase(
				"Die <TARGET>alten</TARGET> Häuser stehen am Marktplatz.",
				"alten",
				"alt",
				{ case: "Nom", degree: "Pos", gender: "Neut", number: "Plur" },
			),
			"grammar-de-adj-dev-predicative-blau": inflectionCase(
				"<TARGET>Blau</TARGET> ist der Himmel über dem Meer.",
				"Blau",
				"blau",
				{ case: null, degree: "Pos", gender: null, number: null },
				{ normalizedMember: "blau" },
			),
			"grammar-de-adj-dev-adverbial-leise": inflectionCase(
				"Sie schließt die Tür <TARGET>leise</TARGET>.",
				"leise",
				"leise",
				{ case: null, degree: "Pos", gender: null, number: null },
			),
			"grammar-de-adj-accept-attributive-dat-fem-lang": inflectionCase(
				"Mit <TARGET>langer</TARGET> Geduld löste sie das Rätsel.",
				"langer",
				"lang",
				{ case: "Dat", degree: "Pos", gender: "Fem", number: "Sing" },
			),
			"grammar-de-adj-accept-attributive-acc-neut-gruen": inflectionCase(
				"Sie kaufte ein <TARGET>grünes</TARGET> Fahrrad.",
				"grünes",
				"grün",
				{ case: "Acc", degree: "Pos", gender: "Neut", number: "Sing" },
			),
			"grammar-de-adj-accept-attributive-gen-masc-stark": inflectionCase(
				"Trotz <TARGET>starken</TARGET> Regens begann das Spiel.",
				"starken",
				"stark",
				{ case: "Gen", degree: "Pos", gender: "Masc", number: "Sing" },
			),
			"grammar-de-adj-accept-predicative-ruhig": inflectionCase(
				"Der See bleibt <TARGET>ruhig</TARGET>.",
				"ruhig",
				"ruhig",
				{ case: null, degree: "Pos", gender: null, number: null },
			),
			"grammar-de-adj-accept-adverbial-deutlich": inflectionCase(
				"Die Zeugin sprach <TARGET>deutlich</TARGET>.",
				"deutlich",
				"deutlich",
				{ case: null, degree: "Pos", gender: null, number: null },
			),
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
