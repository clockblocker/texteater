import { defineGoldenCaseCollection } from "../../../../../../../assembly";
import { addCaseEvidence, resolved, sentence } from "./builders";

function singleton(
	words: readonly string[],
	clickedSegmentIndex: number,
	kind: "DET" | "PRON",
) {
	const segments = sentence(words);
	return resolved(
		segments,
		clickedSegmentIndex,
		[clickedSegmentIndex],
		"Lexeme",
		kind,
	);
}

export const totalPronounCases = defineGoldenCaseCollection(import.meta.url, {
	cases: addCaseEvidence(
		{
			"target-de-mehrere-pron-nom": singleton(
				["Mehrere", "kamen"],
				0,
				"PRON",
			),
			"target-de-mehrere-det-nom": singleton(
				["mehrere", "Gäste", "kamen"],
				0,
				"DET",
			),
			"target-de-mehrere-pron-acc": singleton(
				["Ich", "kenne", "mehrere"],
				4,
				"PRON",
			),
			"target-de-mehrere-det-acc": singleton(
				["Ich", "kenne", "mehrere", "Gäste"],
				4,
				"DET",
			),
			"target-de-mehrere-pron-dat": singleton(
				["Ich", "helfe", "mehreren"],
				4,
				"PRON",
			),
			"target-de-mehrere-det-dat": singleton(
				["Ich", "helfe", "mehreren", "Gästen"],
				4,
				"DET",
			),
			"target-de-mehrere-pron-gen": singleton(
				["Die", "Aussagen", "mehrerer", "stimmen", "überein"],
				4,
				"PRON",
			),
			"target-de-mehrere-det-gen": singleton(
				["Die", "Aussagen", "mehrerer", "Gäste", "stimmen", "überein"],
				4,
				"DET",
			),
			"target-de-total-mancher-pron-masc": singleton(
				["Mancher", "irrt", "sich"],
				0,
				"PRON",
			),
			"target-de-total-mancher-det-masc": singleton(
				["mancher", "Mensch"],
				0,
				"DET",
			),
			"target-de-total-manches-pron-neut": singleton(
				["Manches", "bleibt", "unklar"],
				0,
				"PRON",
			),
			"target-de-total-manches-det-neut": singleton(
				["manches", "Detail"],
				0,
				"DET",
			),
			"target-de-total-manche-pron-plur": singleton(
				["Manche", "kommen", "später"],
				0,
				"PRON",
			),
			"target-de-total-manche-det-plur": singleton(
				["manche", "Gäste"],
				0,
				"DET",
			),
			"target-de-total-manchen-pron-acc": singleton(
				["Ich", "kenne", "manchen"],
				4,
				"PRON",
			),
			"target-de-total-manchen-det-acc": singleton(
				["manchen", "Menschen"],
				0,
				"DET",
			),
			"target-de-total-manchem-pron-dat": singleton(
				["Das", "hilft", "manchem"],
				4,
				"PRON",
			),
			"target-de-total-manchem-det-dat": singleton(
				["manchem", "Kind"],
				0,
				"DET",
			),
			"target-de-total-manch-control": singleton(
				["manch", "guter", "Rat"],
				0,
				"DET",
			),
			"target-de-total-jedermann-nom": singleton(
				["Jedermann", "ist", "willkommen"],
				0,
				"PRON",
			),
			"target-de-total-jedermann-acc": singleton(
				["Das", "betrifft", "jedermann"],
				4,
				"PRON",
			),
			"target-de-total-jedermann-dat": singleton(
				["Das", "steht", "jedermann", "frei"],
				4,
				"PRON",
			),
			"target-de-total-jedermanns-gen": singleton(
				["Das", "ist", "jedermanns", "Sache"],
				4,
				"PRON",
			),
			"target-de-total-alles-nom": singleton(
				["Alles", "funktioniert"],
				0,
				"PRON",
			),
			"target-de-total-alles-acc": singleton(
				["Ich", "habe", "alles", "geprüft"],
				4,
				"PRON",
			),
			"target-de-total-allem-dat": singleton(
				["Mit", "allem", "bin", "ich", "einverstanden"],
				2,
				"PRON",
			),
			"target-de-total-alle-nom": singleton(
				["Alle", "sind", "angekommen"],
				0,
				"PRON",
			),
			"target-de-total-alle-acc": singleton(
				["Ich", "kenne", "alle"],
				4,
				"PRON",
			),
			"target-de-total-allen-dat": singleton(
				["Ich", "helfe", "allen"],
				4,
				"PRON",
			),
			"target-de-total-aller-gen": singleton(
				["Die", "Stimmen", "aller", "zählen"],
				4,
				"PRON",
			),
			"target-de-total-adnominal-alles-material": singleton(
				["alles", "Material"],
				0,
				"DET",
			),
			"target-de-total-adnominal-alle-gaeste": singleton(
				["alle", "Gäste"],
				0,
				"DET",
			),
			"target-de-total-adnominal-allen-gaesten": singleton(
				["allen", "Gästen"],
				0,
				"DET",
			),
			"target-de-total-adnominal-aller-anfang": singleton(
				["aller", "Anfang"],
				0,
				"DET",
			),
			"target-de-total-jeder-nom-masc": singleton(
				["Unter", "den", "Männern", "hilft", "jeder"],
				8,
				"PRON",
			),
			"target-de-total-jeder-nom-fem": singleton(
				["Unter", "den", "Frauen", "hilft", "jede"],
				8,
				"PRON",
			),
			"target-de-total-jeder-nom-neut": singleton(
				["Unter", "den", "Kindern", "hilft", "jedes"],
				8,
				"PRON",
			),
			"target-de-total-jeder-acc-masc": singleton(
				["Von", "den", "Männern", "kenne", "ich", "jeden"],
				10,
				"PRON",
			),
			"target-de-total-jeder-acc-fem": singleton(
				["Von", "den", "Frauen", "kenne", "ich", "jede"],
				10,
				"PRON",
			),
			"target-de-total-jeder-acc-neut": singleton(
				["Von", "den", "Kindern", "kenne", "ich", "jedes"],
				10,
				"PRON",
			),
			"target-de-total-jeder-dat-masc": singleton(
				["Von", "den", "Männern", "helfe", "ich", "jedem"],
				10,
				"PRON",
			),
			"target-de-total-jeder-dat-fem": singleton(
				["Von", "den", "Frauen", "helfe", "ich", "jeder"],
				10,
				"PRON",
			),
			"target-de-total-jeder-dat-neut": singleton(
				["Von", "den", "Kindern", "helfe", "ich", "jedem"],
				10,
				"PRON",
			),
			"target-de-total-jeder-gen-masc": singleton(
				[
					"Die",
					"Bewerber",
					"stellten",
					"Projekte",
					"vor",
					"der",
					"Beitrag",
					"jedes",
					"wurde",
					"geprüft",
				],
				14,
				"PRON",
			),
			"target-de-total-jeder-gen-fem": singleton(
				[
					"Die",
					"Bewerberinnen",
					"stellten",
					"Projekte",
					"vor",
					"der",
					"Beitrag",
					"jeder",
					"wurde",
					"geprüft",
				],
				14,
				"PRON",
			),
			"target-de-total-jeder-gen-neut": singleton(
				[
					"Die",
					"Kinder",
					"stellten",
					"Projekte",
					"vor",
					"der",
					"Beitrag",
					"jedes",
					"wurde",
					"geprüft",
				],
				14,
				"PRON",
			),
			"target-de-total-adnominal-jeder-mensch": singleton(
				["jeder", "Mensch"],
				0,
				"DET",
			),
			"target-de-total-adnominal-jede-person": singleton(
				["jede", "Person"],
				0,
				"DET",
			),
			"target-de-total-adnominal-jedes-kind": singleton(
				["jedes", "Kind"],
				0,
				"DET",
			),
			"target-de-total-adnominal-jeden-menschen": singleton(
				["jeden", "Menschen"],
				0,
				"DET",
			),
			"target-de-total-adnominal-jedem-kind": singleton(
				["jedem", "Kind"],
				0,
				"DET",
			),
			"target-de-total-jedweder-nom": singleton(
				["Jedweder", "ist", "frei"],
				0,
				"PRON",
			),
			"target-de-total-jedwede-nom": singleton(
				["Jedwede", "ist", "eingeladen"],
				0,
				"PRON",
			),
			"target-de-total-jedweden-acc": singleton(
				["Das", "betrifft", "jedweden"],
				4,
				"PRON",
			),
			"target-de-total-jedwedem-dat": singleton(
				["Das", "steht", "jedwedem", "frei"],
				4,
				"PRON",
			),
			"target-de-total-jedwedes-nom": singleton(
				["Jedwedes", "zählt"],
				0,
				"PRON",
			),
			"target-de-total-adnominal-jedweder-mensch": singleton(
				["jedweder", "Mensch"],
				0,
				"DET",
			),
			"target-de-total-adnominal-jedweden-menschen": singleton(
				["jedweden", "Menschen"],
				0,
				"DET",
			),
			"target-de-total-adnominal-jedwedem-kind": singleton(
				["jedwedem", "Kind"],
				0,
				"DET",
			),
			"target-de-total-adnominal-jedwedes-detail": singleton(
				["jedwedes", "Detail"],
				0,
				"DET",
			),
			"target-de-total-jeglicher-sing-masc": singleton(
				["Jeglicher", "kann", "teilnehmen"],
				0,
				"PRON",
			),
			"target-de-total-jegliches-sing-neut": singleton(
				["Jegliches", "wurde", "geprüft"],
				0,
				"PRON",
			),
			"target-de-total-jegliche-plur": singleton(
				["Jegliche", "wurden", "geprüft"],
				0,
				"PRON",
			),
			"target-de-total-jegliche-sing-fem": singleton(
				["Jegliche", "kann", "teilnehmen"],
				0,
				"PRON",
			),
			"target-de-total-jeglichen-acc": singleton(
				["Das", "betrifft", "jeglichen"],
				4,
				"PRON",
			),
			"target-de-total-jeglichem-dat": singleton(
				["Das", "steht", "jeglichem", "frei"],
				4,
				"PRON",
			),
			"target-de-total-adnominal-jeglicher-mensch": singleton(
				["jeglicher", "Mensch"],
				0,
				"DET",
			),
			"target-de-total-adnominal-jegliches-detail": singleton(
				["jegliches", "Detail"],
				0,
				"DET",
			),
			"target-de-total-adnominal-jegliche-details": singleton(
				["jegliche", "Details"],
				0,
				"DET",
			),
			"target-de-total-adnominal-jeglichen-menschen": singleton(
				["jeglichen", "Menschen"],
				0,
				"DET",
			),
			"target-de-total-adnominal-jeglichem-kind": singleton(
				["jeglichem", "Kind"],
				0,
				"DET",
			),
		},
		(caseId) =>
			caseId.includes("adnominal") || caseId.includes("-det-")
				? "Issue #258 preserves the established DET route when the total form modifies an overt following noun."
				: "Issue #258 classifies the independently substantive total form as one singleton Lexeme/PRON target.",
	),
});
