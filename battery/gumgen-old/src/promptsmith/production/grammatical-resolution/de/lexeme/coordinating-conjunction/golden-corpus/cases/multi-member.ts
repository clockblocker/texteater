import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { multiMemberConjunctionCase } from "./case-helpers";

export const multiMemberCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-cconj-demo-sowohl-als-auch": multiMemberConjunctionCase(
			"Sie hat <TARGET>sowohl</TARGET> den Film gesehen <TARGET>als</TARGET> <TARGET>auch</TARGET> das Buch gelesen.",
			["sowohl", "als", "auch"],
			"sowohl … als auch",
		),
		"grammar-de-cconj-demo-je-desto": multiMemberConjunctionCase(
			"<TARGET>Je</TARGET> länger der Weg wird, <TARGET>desto</TARGET> müder werden die Reisenden.",
			["Je", "desto"],
			"je … desto",
			{
				normalizedMembers: ["je", "desto"],
				explanation:
					"Je and desto are the fixed CCONJ anchors; comparative payload remains unmarked.",
			},
		),
		"grammar-de-cconj-demo-entweder-typo": multiMemberConjunctionCase(
			"Wir nehmen <TARGET>endweder</TARGET> den Bus <TARGET>oder</TARGET> die Bahn.",
			["endweder", "oder"],
			"entweder … oder",
			{
				normalizedMembers: ["entweder", "oder"],
				orthographies: ["Typo", "Standard"],
				explanation:
					"Repair the misspelled first anchor while preserving authoritative membership.",
			},
		),

		"grammar-de-cconj-dev-entweder-freitag": multiMemberConjunctionCase(
			"Wir reisen <TARGET>entweder</TARGET> am Freitag <TARGET>oder</TARGET> am Samstag.",
			["entweder", "oder"],
			"entweder … oder",
		),
		"grammar-de-cconj-dev-entweder-clauses": multiMemberConjunctionCase(
			"<TARGET>Entweder</TARGET> fährt Mia heute, <TARGET>oder</TARGET> sie bleibt bis morgen.",
			["Entweder", "oder"],
			"entweder … oder",
			{ normalizedMembers: ["entweder", "oder"] },
		),
		"grammar-de-cconj-dev-weder-noch": multiMemberConjunctionCase(
			"Sie trinkt <TARGET>weder</TARGET> Tee <TARGET>noch</TARGET> Kaffee.",
			["weder", "noch"],
			"weder … noch",
		),
		"grammar-de-cconj-dev-sowohl-als": multiMemberConjunctionCase(
			"Sie schätzt <TARGET>sowohl</TARGET> Ruhe <TARGET>als</TARGET> Bewegung.",
			["sowohl", "als"],
			"sowohl … als",
		),
		"grammar-de-cconj-dev-sowohl-wie": multiMemberConjunctionCase(
			"Die Regel gilt <TARGET>sowohl</TARGET> für Kinder <TARGET>wie</TARGET> für Erwachsene.",
			["sowohl", "wie"],
			"sowohl … wie",
		),
		"grammar-de-cconj-dev-sowohl-wie-auch": multiMemberConjunctionCase(
			"Das Angebot gilt <TARGET>sowohl</TARGET> online <TARGET>wie</TARGET> <TARGET>auch</TARGET> im Laden.",
			["sowohl", "wie", "auch"],
			"sowohl … wie auch",
		),
		"grammar-de-cconj-dev-je-umso": multiMemberConjunctionCase(
			"<TARGET>Je</TARGET> genauer wir messen, <TARGET>umso</TARGET> sicherer wird das Ergebnis.",
			["Je", "umso"],
			"je … umso",
			{ normalizedMembers: ["je", "umso"] },
		),
		"grammar-de-cconj-dev-je-je": multiMemberConjunctionCase(
			"<TARGET>Je</TARGET> mehr er versprach, <TARGET>je</TARGET> weniger glaubte man ihm.",
			["Je", "je"],
			"je … je",
			{
				normalizedMembers: ["je", "je"],
				explanation:
					"The repeated anchors are separate ordered members of one proportional CCONJ.",
			},
		),
		"grammar-de-cconj-dev-casing-entweder": multiMemberConjunctionCase(
			"<TARGET>Entweder</TARGET> gewinnen wir heute, <TARGET>oder</TARGET> wir üben morgen weiter.",
			["Entweder", "oder"],
			"entweder … oder",
			{ normalizedMembers: ["entweder", "oder"] },
		),
		"grammar-de-cconj-dev-desto-typo": multiMemberConjunctionCase(
			"<TARGET>Je</TARGET> höher der Druck, <TARGET>desdo</TARGET> größer das Risiko.",
			["Je", "desdo"],
			"je … desto",
			{
				normalizedMembers: ["je", "desto"],
				orthographies: ["Standard", "Typo"],
			},
		),
		"grammar-de-cconj-dev-near-ordinary-cconj": multiMemberConjunctionCase(
			"Die Frage lautet „Kaffee oder Tee?“, doch wir bestellen <TARGET>entweder</TARGET> Saft <TARGET>oder</TARGET> Wasser.",
			["entweder", "oder"],
			"entweder … oder",
			{
				explanation:
					"The earlier ordinary coordinators are unmarked context; only the supplied anchors belong to this Lexeme.",
			},
		),
		"grammar-de-cconj-dev-near-sconj": multiMemberConjunctionCase(
			"Ob es regnet, weiß niemand; wir fahren <TARGET>entweder</TARGET> mit dem Bus <TARGET>oder</TARGET> mit der Bahn.",
			["entweder", "oder"],
			"entweder … oder",
			{
				explanation:
					"Initial ob is unmarked SCONJ context and does not alter membership.",
			},
		),
		"grammar-de-cconj-dev-near-adv": multiMemberConjunctionCase(
			"Außerdem ist der Entwurf <TARGET>sowohl</TARGET> klar <TARGET>als</TARGET> <TARGET>auch</TARGET> knapp.",
			["sowohl", "als", "auch"],
			"sowohl … als auch",
			{
				explanation:
					"Außerdem is unmarked ADV context; all three supplied anchors belong to one CCONJ.",
			},
		),

		"grammar-de-cconj-accept-entweder-nouns": multiMemberConjunctionCase(
			"Zum Frühstück gibt es <TARGET>entweder</TARGET> Müsli <TARGET>oder</TARGET> Brot.",
			["entweder", "oder"],
			"entweder … oder",
		),
		"grammar-de-cconj-accept-weder-clauses": multiMemberConjunctionCase(
			"<TARGET>Weder</TARGET> rief sie zurück, <TARGET>noch</TARGET> schrieb sie eine Nachricht.",
			["Weder", "noch"],
			"weder … noch",
			{ normalizedMembers: ["weder", "noch"] },
		),
		"grammar-de-cconj-accept-sowohl-als-auch": multiMemberConjunctionCase(
			"Der Kurs ist <TARGET>sowohl</TARGET> anspruchsvoll <TARGET>als</TARGET> <TARGET>auch</TARGET> unterhaltsam.",
			["sowohl", "als", "auch"],
			"sowohl … als auch",
		),
		"grammar-de-cconj-accept-sowohl-wie": multiMemberConjunctionCase(
			"Das Verfahren eignet sich <TARGET>sowohl</TARGET> für kleine Teams <TARGET>wie</TARGET> für große Abteilungen.",
			["sowohl", "wie"],
			"sowohl … wie",
		),
		"grammar-de-cconj-accept-je-desto": multiMemberConjunctionCase(
			"<TARGET>Je</TARGET> ruhiger die See war, <TARGET>desto</TARGET> schneller kamen wir voran.",
			["Je", "desto"],
			"je … desto",
			{ normalizedMembers: ["je", "desto"] },
		),
		"grammar-de-cconj-accept-je-umso": multiMemberConjunctionCase(
			"<TARGET>Je</TARGET> später der Abend wurde, <TARGET>umso</TARGET> leiser sprach die Runde.",
			["Je", "umso"],
			"je … umso",
			{ normalizedMembers: ["je", "umso"] },
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
