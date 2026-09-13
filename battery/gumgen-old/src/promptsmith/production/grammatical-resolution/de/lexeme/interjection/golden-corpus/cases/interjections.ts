import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { interjectionCase } from "./builders";

export const interjectionCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-intj-demo-pfui-expressive": interjectionCase(
			"Sieh einmal, hier steht er, <TARGET>pfui</TARGET>, der Struwwelpeter!",
			["pfui"],
			"pfui",
			null,
			{
				explanation:
					"Pfui independently expresses disgust; it is not a response interjection.",
			},
		),
		"grammar-de-intj-demo-ja-response": interjectionCase(
			"Sie fragte, ob er komme; er antwortete: „<TARGET>Ja</TARGET>.“",
			["Ja"],
			"ja",
			"Res",
			{
				normalizedMembers: ["ja"],
				explanation:
					"The standalone answer carries response partType Res; quotation-initial capitalization remains Standard.",
			},
		),

		"grammar-de-intj-dev-wupp-onomatopoeia": interjectionCase(
			"Fort geht nun die Mutter und <TARGET>wupp</TARGET>! den Daumen in den Mund.",
			["wupp"],
			"wupp",
		),
		"grammar-de-intj-dev-hallo-greeting": interjectionCase(
			"Am Gartentor rief sie <TARGET>hallo</TARGET> zu den Nachbarn.",
			["hallo"],
			"hallo",
		),
		"grammar-de-intj-dev-hurra-joy": interjectionCase(
			"Nach dem Sieg riefen alle <TARGET>hurra</TARGET>.",
			["hurra"],
			"hurra",
		),
		"grammar-de-intj-dev-oh-reaction": interjectionCase(
			"Als sie die Nachricht las, sagte sie nur <TARGET>oh</TARGET>.",
			["oh"],
			"oh",
		),
		"grammar-de-intj-dev-huch-surprise": interjectionCase(
			"Beim Anblick der Maus rief er <TARGET>huch</TARGET>!",
			["huch"],
			"huch",
		),
		"grammar-de-intj-dev-au-pain": interjectionCase(
			"Er stieß sich am Tisch und rief <TARGET>au</TARGET>.",
			["au"],
			"au",
		),
		"grammar-de-intj-dev-aeh-hesitation": interjectionCase(
			"Ich wollte, <TARGET>äh</TARGET>, nur kurz nachfragen.",
			["äh"],
			"äh",
		),
		"grammar-de-intj-dev-tja-resignation": interjectionCase(
			"Nach dem letzten Fehlschlag sagte sie <TARGET>tja</TARGET> und ging.",
			["tja"],
			"tja",
		),
		"grammar-de-intj-dev-miau-onomatopoeia": interjectionCase(
			"Die Katze sprang aufs Fensterbrett: <TARGET>miau</TARGET>!",
			["miau"],
			"miau",
		),
		"grammar-de-intj-dev-nein-response": interjectionCase(
			"Auf die Frage nach dem Termin antwortete er <TARGET>nein</TARGET>.",
			["nein"],
			"nein",
			"Res",
		),
		"grammar-de-intj-dev-doch-corrective-response": interjectionCase(
			"Sie fragte: „Kommst du nicht?“ Er antwortete <TARGET>doch</TARGET>.",
			["doch"],
			"doch",
			"Res",
		),
		"grammar-de-intj-dev-jawohl-response": interjectionCase(
			"Der Offizier fragte nach dem Auftrag; sie antwortete <TARGET>jawohl</TARGET>.",
			["jawohl"],
			"jawohl",
			"Res",
		),

		"grammar-de-intj-accept-v2-aha-realization": interjectionCase(
			"Als sie den Zusammenhang verstand, sagte sie <TARGET>aha</TARGET>.",
			["aha"],
			"aha",
		),
		"grammar-de-intj-accept-v2-hoppla-mishap": interjectionCase(
			"Als das Glas beinahe fiel, rief er <TARGET>hoppla</TARGET>!",
			["hoppla"],
			"hoppla",
		),
		"grammar-de-intj-accept-v2-maeh-onomatopoeia": interjectionCase(
			"Das Lamm lief zum Gatter: <TARGET>mäh</TARGET>!",
			["mäh"],
			"mäh",
		),
		"grammar-de-intj-accept-v2-ja-response-initial": interjectionCase(
			"Auf die Frage nach der Reservierung antwortete sie: „<TARGET>Ja</TARGET>.“",
			["Ja"],
			"ja",
			"Res",
			{ normalizedMembers: ["ja"] },
		),
		"grammar-de-intj-accept-v2-heda-prompting": interjectionCase(
			"Vom anderen Ufer rief der Fährmann <TARGET>heda</TARGET>!",
			["heda"],
			"heda",
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
