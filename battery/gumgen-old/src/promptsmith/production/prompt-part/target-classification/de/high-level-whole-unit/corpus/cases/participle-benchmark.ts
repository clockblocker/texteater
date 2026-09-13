import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { canonicalInputSchema, canonicalOutputSchema } from "../schemas";
import { addCaseEvidence, resolved, type Segment } from "./builders";
import { evidence, IDS } from "./sources";

function benchmarkSentence(tokens: readonly string[]): Segment[] {
	const segments: Segment[] = [];
	for (const token of tokens) {
		if (token === ",") {
			segments.push({ kind: "Punctuation", text: token });
			continue;
		}
		if (segments.length > 0) {
			segments.push({ kind: "Whitespace", text: " " });
		}
		segments.push({ kind: "ResolvableText", text: token });
	}
	segments.push({ kind: "Punctuation", text: "." });
	return segments;
}

// Verbal Partizip II
const repairedMotor = benchmarkSentence([
	"Obwohl",
	"der",
	"Wagen",
	"am",
	"Morgen",
	"noch",
	"liegen",
	"geblieben",
	"war",
	",",
	"hat",
	"die",
	"Mechanikerin",
	"den",
	"beschädigten",
	"Motor",
	"vor",
	"der",
	"Mittagspause",
	"repariert",
]);
const signedContract = benchmarkSentence([
	"Der",
	"Vertrag",
	",",
	"den",
	"beide",
	"Parteien",
	"nach",
	"langen",
	"Verhandlungen",
	"akzeptiert",
	"haben",
	",",
	"wird",
	"morgen",
	"im",
	"Beisein",
	"der",
	"Anwälte",
	"unterschrieben",
]);
const arrivedTrain = benchmarkSentence([
	"Als",
	"die",
	"ersten",
	"Fahrgäste",
	"den",
	"Bahnsteig",
	"erreichten",
	",",
	"ist",
	"der",
	"verspätete",
	"Zug",
	"trotz",
	"des",
	"dichten",
	"Nebels",
	"endlich",
	"angekommen",
]);
const paidInvoice = benchmarkSentence([
	"Die",
	"Rechnung",
	",",
	"die",
	"gestern",
	"noch",
	"offen",
	"war",
	",",
	"ist",
	"inzwischen",
	"vom",
	"Kunden",
	"vollständig",
	"bezahlt",
	",",
	"sodass",
	"keine",
	"weitere",
	"Mahnung",
	"nötig",
	"ist",
]);
const paintedWindow = benchmarkSentence([
	"Das",
	"Fenster",
	",",
	"das",
	"gestern",
	"noch",
	"mehrere",
	"tiefe",
	"Kratzer",
	"zeigte",
	",",
	"ist",
	"von",
	"der",
	"Malerin",
	"inzwischen",
	"sorgfältig",
	"gestrichen",
]);
const invitedGuests = benchmarkSentence([
	"Obwohl",
	"einige",
	"Plätze",
	"kurzfristig",
	"frei",
	"geworden",
	"sind",
	",",
	"sind",
	"die",
	"übrigen",
	"Gäste",
	"vom",
	"Gastgeber",
	"persönlich",
	"eingeladen",
]);
const approvedApplication = benchmarkSentence([
	"Der",
	"Antrag",
	",",
	"über",
	"den",
	"der",
	"Ausschuss",
	"fast",
	"drei",
	"Stunden",
	"beraten",
	"hat",
	",",
	"ist",
	"nach",
	"mehreren",
	"Änderungen",
	"schließlich",
	"genehmigt",
]);
const filledBottle = benchmarkSentence([
	"Bevor",
	"die",
	"Lieferung",
	"am",
	"frühen",
	"Morgen",
	"abgeholt",
	"wird",
	",",
	"ist",
	"jede",
	"Flasche",
	"bereits",
	"bis",
	"zum",
	"Rand",
	"gefüllt",
	",",
	"sodass",
	"während",
	"der",
	"Fahrt",
	"nichts",
	"auslaufen",
	"kann",
]);
const movedTable = benchmarkSentence([
	"Der",
	"schwere",
	"Tisch",
	",",
	"der",
	"zuvor",
	"direkt",
	"vor",
	"dem",
	"Fenster",
	"stand",
	",",
	"ist",
	"für",
	"die",
	"Feier",
	"um",
	"zwei",
	"Meter",
	"nach",
	"links",
	"verrückt",
]);
const closedDoor = benchmarkSentence([
	"Nachdem",
	"der",
	"letzte",
	"Besucher",
	"das",
	"Gebäude",
	"verlassen",
	"hat",
	",",
	"ist",
	"die",
	"schwere",
	"Eingangstür",
	"nun",
	"von",
	"der",
	"Hausmeisterin",
	"geschlossen",
	",",
	"damit",
	"niemand",
	"unbemerkt",
	"zurückkehren",
	"kann",
]);

// Partizipiale Adjektive
const irrationalMan = benchmarkSentence([
	"Der",
	"Mann",
	",",
	"der",
	"sich",
	"während",
	"der",
	"Sitzung",
	"immer",
	"wieder",
	"widersprach",
	",",
	"ist",
	"nach",
	"Ansicht",
	"seiner",
	"Kollegen",
	"völlig",
	"verrückt",
]);
const marriedWoman = benchmarkSentence([
	"Obwohl",
	"sie",
	"und",
	"ihr",
	"Partner",
	"seit",
	"Jahren",
	"in",
	"verschiedenen",
	"Städten",
	"arbeiten",
	",",
	"ist",
	"sie",
	"seit",
	"dem",
	"vergangenen",
	"Frühjahr",
	"verheiratet",
]);
const knownResult = benchmarkSentence([
	"Das",
	"Ergebnis",
	",",
	"das",
	"zunächst",
	"niemand",
	"veröffentlichen",
	"wollte",
	",",
	"ist",
	"inzwischen",
	"auch",
	"außerhalb",
	"des",
	"Instituts",
	"bekannt",
]);
const educatedStudent = benchmarkSentence([
	"Die",
	"Studentin",
	",",
	"die",
	"mehrere",
	"Sprachen",
	"fließend",
	"spricht",
	"und",
	"klassische",
	"Literatur",
	"liest",
	",",
	"ist",
	"für",
	"ihr",
	"Alter",
	"ungewöhnlich",
	"gebildet",
]);
const giftedChild = benchmarkSentence([
	"Das",
	"Kind",
	",",
	"dessen",
	"Zeichnungen",
	"bereits",
	"mehrfach",
	"ausgezeichnet",
	"wurden",
	",",
	"ist",
	"auch",
	"nach",
	"Einschätzung",
	"seiner",
	"Lehrer",
	"besonders",
	"begabt",
]);
const unopenedCrate = benchmarkSentence([
	"Obwohl",
	"die",
	"Ausstellung",
	"bereits",
	"morgen",
	"beginnt",
	",",
	"ist",
	"die",
	"versiegelte",
	"Kiste",
	"im",
	"hinteren",
	"Raum",
	"noch",
	"immer",
	"ungeöffnet",
]);
const unsolvedTask = benchmarkSentence([
	"Die",
	"Aufgabe",
	",",
	"an",
	"der",
	"bereits",
	"zwei",
	"erfahrene",
	"Teams",
	"gearbeitet",
	"haben",
	",",
	"bleibt",
	"trotz",
	"der",
	"neuen",
	"Hinweise",
	"weiterhin",
	"ungelöst",
]);
const closedShop = benchmarkSentence([
	"Der",
	"Laden",
	",",
	"vor",
	"dem",
	"an",
	"Werktagen",
	"schon",
	"morgens",
	"zahlreiche",
	"Kunden",
	"warten",
	",",
	"ist",
	"sonntags",
	"und",
	"an",
	"Feiertagen",
	"grundsätzlich",
	"geschlossen",
	"und",
	"für",
	"Kunden",
	"unzugänglich",
]);
const offendedMan = benchmarkSentence([
	"Obwohl",
	"er",
	"sich",
	"später",
	"entschuldigte",
	",",
	"ist",
	"er",
	"wegen",
	"der",
	"öffentlichen",
	"Kritik",
	"noch",
	"immer",
	"beleidigt",
	"und",
	"ungewöhnlich",
	"abweisend",
]);
const exaggeratedReaction = benchmarkSentence([
	"Seine",
	"Reaktion",
	",",
	"die",
	"selbst",
	"seine",
	"engsten",
	"Freunde",
	"überrascht",
	"hat",
	",",
	"ist",
	"angesichts",
	"des",
	"kleinen",
	"Fehlers",
	"völlig",
	"übertrieben",
]);

const cases = {
	"target-de-participle-benchmark-01-repariert-click-hat": resolved(
		repairedMotor,
		19,
		[19, 37],
		"Lexeme",
		"VERB",
	),
	"target-de-participle-benchmark-01-repariert-click-repariert": resolved(
		repairedMotor,
		37,
		[19, 37],
		"Lexeme",
		"VERB",
	),
	"target-de-participle-benchmark-02-unterschrieben-click-wird": resolved(
		signedContract,
		22,
		[22, 34],
		"Lexeme",
		"VERB",
	),
	"target-de-participle-benchmark-02-unterschrieben-click-unterschrieben":
		resolved(signedContract, 34, [22, 34], "Lexeme", "VERB"),
	"target-de-participle-benchmark-03-angekommen-click-ist": resolved(
		arrivedTrain,
		15,
		[15, 33],
		"Lexeme",
		"VERB",
	),
	"target-de-participle-benchmark-03-angekommen-click-angekommen": resolved(
		arrivedTrain,
		33,
		[15, 33],
		"Lexeme",
		"VERB",
	),
	"target-de-participle-benchmark-04-bezahlt-click-ist": resolved(
		paidInvoice,
		16,
		[16, 26],
		"Lexeme",
		"VERB",
	),
	"target-de-participle-benchmark-04-bezahlt-click-bezahlt": resolved(
		paidInvoice,
		26,
		[16, 26],
		"Lexeme",
		"VERB",
	),
	"target-de-participle-benchmark-05-gestrichen-click-ist": resolved(
		paintedWindow,
		20,
		[20, 32],
		"Lexeme",
		"VERB",
	),
	"target-de-participle-benchmark-05-gestrichen-click-gestrichen": resolved(
		paintedWindow,
		32,
		[20, 32],
		"Lexeme",
		"VERB",
	),
	"target-de-participle-benchmark-06-eingeladen-click-sind": resolved(
		invitedGuests,
		15,
		[15, 29],
		"Lexeme",
		"VERB",
	),
	"target-de-participle-benchmark-06-eingeladen-click-eingeladen": resolved(
		invitedGuests,
		29,
		[15, 29],
		"Lexeme",
		"VERB",
	),
	"target-de-participle-benchmark-07-genehmigt-click-ist": resolved(
		approvedApplication,
		24,
		[24, 34],
		"Lexeme",
		"VERB",
	),
	"target-de-participle-benchmark-07-genehmigt-click-genehmigt": resolved(
		approvedApplication,
		34,
		[24, 34],
		"Lexeme",
		"VERB",
	),
	"target-de-participle-benchmark-08-gefuellt-click-ist": resolved(
		filledBottle,
		17,
		[17, 31],
		"Lexeme",
		"VERB",
	),
	"target-de-participle-benchmark-08-gefuellt-click-gefuellt": resolved(
		filledBottle,
		31,
		[17, 31],
		"Lexeme",
		"VERB",
	),
	"target-de-participle-benchmark-09-verrueckt-click-ist": resolved(
		movedTable,
		22,
		[22, 40],
		"Lexeme",
		"VERB",
	),
	"target-de-participle-benchmark-09-verrueckt-click-verrueckt": resolved(
		movedTable,
		40,
		[22, 40],
		"Lexeme",
		"VERB",
	),
	"target-de-participle-benchmark-10-geschlossen-click-ist": resolved(
		closedDoor,
		17,
		[17, 33],
		"Lexeme",
		"VERB",
	),
	"target-de-participle-benchmark-10-geschlossen-click-geschlossen": resolved(
		closedDoor,
		33,
		[17, 33],
		"Lexeme",
		"VERB",
	),

	"target-de-participle-benchmark-11-verrueckt-click-ist": resolved(
		irrationalMan,
		22,
		[22],
		"Lexeme",
		"AUX",
	),
	"target-de-participle-benchmark-11-verrueckt-click-verrueckt": resolved(
		irrationalMan,
		34,
		[34],
		"Lexeme",
		"ADJ",
	),
	"target-de-participle-benchmark-12-verheiratet-click-ist": resolved(
		marriedWoman,
		23,
		[23],
		"Lexeme",
		"AUX",
	),
	"target-de-participle-benchmark-12-verheiratet-click-verheiratet": resolved(
		marriedWoman,
		35,
		[35],
		"Lexeme",
		"ADJ",
	),
	"target-de-participle-benchmark-13-bekannt-click-ist": resolved(
		knownResult,
		16,
		[16],
		"Lexeme",
		"AUX",
	),
	"target-de-participle-benchmark-13-bekannt-click-bekannt": resolved(
		knownResult,
		28,
		[28],
		"Lexeme",
		"ADJ",
	),
	"target-de-participle-benchmark-14-gebildet-click-ist": resolved(
		educatedStudent,
		24,
		[24],
		"Lexeme",
		"AUX",
	),
	"target-de-participle-benchmark-14-gebildet-click-gebildet": resolved(
		educatedStudent,
		34,
		[34],
		"Lexeme",
		"ADJ",
	),
	"target-de-participle-benchmark-15-begabt-click-ist": resolved(
		giftedChild,
		18,
		[18],
		"Lexeme",
		"AUX",
	),
	"target-de-participle-benchmark-15-begabt-click-begabt": resolved(
		giftedChild,
		32,
		[32],
		"Lexeme",
		"ADJ",
	),
	"target-de-participle-benchmark-16-ungeoeffnet-click-ist": resolved(
		unopenedCrate,
		13,
		[13],
		"Lexeme",
		"AUX",
	),
	"target-de-participle-benchmark-16-ungeoeffnet-click-ungeoeffnet": resolved(
		unopenedCrate,
		31,
		[31],
		"Lexeme",
		"ADJ",
	),
	"target-de-participle-benchmark-17-ungeloest-click-bleibt": resolved(
		unsolvedTask,
		22,
		[22],
		"Lexeme",
		"AUX",
	),
	"target-de-participle-benchmark-17-ungeloest-click-ungeloest": resolved(
		unsolvedTask,
		34,
		[34],
		"Lexeme",
		"ADJ",
	),
	"target-de-participle-benchmark-18-geschlossen-click-ist": resolved(
		closedShop,
		24,
		[24],
		"Lexeme",
		"AUX",
	),
	"target-de-participle-benchmark-18-geschlossen-click-geschlossen": resolved(
		closedShop,
		36,
		[36],
		"Lexeme",
		"ADJ",
	),
	"target-de-participle-benchmark-19-beleidigt-click-ist": resolved(
		offendedMan,
		11,
		[11],
		"Lexeme",
		"AUX",
	),
	"target-de-participle-benchmark-19-beleidigt-click-beleidigt": resolved(
		offendedMan,
		27,
		[27],
		"Lexeme",
		"ADJ",
	),
	"target-de-participle-benchmark-20-uebertrieben-click-ist": resolved(
		exaggeratedReaction,
		20,
		[20],
		"Lexeme",
		"AUX",
	),
	"target-de-participle-benchmark-20-uebertrieben-click-uebertrieben":
		resolved(exaggeratedReaction, 32, [32], "Lexeme", "ADJ"),
} satisfies GoldenCaseRegistry<
	typeof canonicalInputSchema,
	typeof canonicalOutputSchema
>;

export const participleBenchmarkPairs = Object.freeze([
	{
		id: "01-repariert",
		auxiliaryCaseId:
			"target-de-participle-benchmark-01-repariert-click-hat",
		participleCaseId:
			"target-de-participle-benchmark-01-repariert-click-repariert",
		expected: "VERB",
	},
	{
		id: "02-unterschrieben",
		auxiliaryCaseId:
			"target-de-participle-benchmark-02-unterschrieben-click-wird",
		participleCaseId:
			"target-de-participle-benchmark-02-unterschrieben-click-unterschrieben",
		expected: "VERB",
	},
	{
		id: "03-angekommen",
		auxiliaryCaseId:
			"target-de-participle-benchmark-03-angekommen-click-ist",
		participleCaseId:
			"target-de-participle-benchmark-03-angekommen-click-angekommen",
		expected: "VERB",
	},
	{
		id: "04-bezahlt",
		auxiliaryCaseId: "target-de-participle-benchmark-04-bezahlt-click-ist",
		participleCaseId:
			"target-de-participle-benchmark-04-bezahlt-click-bezahlt",
		expected: "VERB",
	},
	{
		id: "05-gestrichen",
		auxiliaryCaseId:
			"target-de-participle-benchmark-05-gestrichen-click-ist",
		participleCaseId:
			"target-de-participle-benchmark-05-gestrichen-click-gestrichen",
		expected: "VERB",
	},
	{
		id: "06-eingeladen",
		auxiliaryCaseId:
			"target-de-participle-benchmark-06-eingeladen-click-sind",
		participleCaseId:
			"target-de-participle-benchmark-06-eingeladen-click-eingeladen",
		expected: "VERB",
	},
	{
		id: "07-genehmigt",
		auxiliaryCaseId:
			"target-de-participle-benchmark-07-genehmigt-click-ist",
		participleCaseId:
			"target-de-participle-benchmark-07-genehmigt-click-genehmigt",
		expected: "VERB",
	},
	{
		id: "08-gefuellt",
		auxiliaryCaseId: "target-de-participle-benchmark-08-gefuellt-click-ist",
		participleCaseId:
			"target-de-participle-benchmark-08-gefuellt-click-gefuellt",
		expected: "VERB",
	},
	{
		id: "09-verrueckt",
		auxiliaryCaseId:
			"target-de-participle-benchmark-09-verrueckt-click-ist",
		participleCaseId:
			"target-de-participle-benchmark-09-verrueckt-click-verrueckt",
		expected: "VERB",
	},
	{
		id: "10-geschlossen",
		auxiliaryCaseId:
			"target-de-participle-benchmark-10-geschlossen-click-ist",
		participleCaseId:
			"target-de-participle-benchmark-10-geschlossen-click-geschlossen",
		expected: "VERB",
	},
	{
		id: "11-verrueckt",
		auxiliaryCaseId:
			"target-de-participle-benchmark-11-verrueckt-click-ist",
		participleCaseId:
			"target-de-participle-benchmark-11-verrueckt-click-verrueckt",
		expected: "ADJ",
	},
	{
		id: "12-verheiratet",
		auxiliaryCaseId:
			"target-de-participle-benchmark-12-verheiratet-click-ist",
		participleCaseId:
			"target-de-participle-benchmark-12-verheiratet-click-verheiratet",
		expected: "ADJ",
	},
	{
		id: "13-bekannt",
		auxiliaryCaseId: "target-de-participle-benchmark-13-bekannt-click-ist",
		participleCaseId:
			"target-de-participle-benchmark-13-bekannt-click-bekannt",
		expected: "ADJ",
	},
	{
		id: "14-gebildet",
		auxiliaryCaseId: "target-de-participle-benchmark-14-gebildet-click-ist",
		participleCaseId:
			"target-de-participle-benchmark-14-gebildet-click-gebildet",
		expected: "ADJ",
	},
	{
		id: "15-begabt",
		auxiliaryCaseId: "target-de-participle-benchmark-15-begabt-click-ist",
		participleCaseId:
			"target-de-participle-benchmark-15-begabt-click-begabt",
		expected: "ADJ",
	},
	{
		id: "16-ungeoeffnet",
		auxiliaryCaseId:
			"target-de-participle-benchmark-16-ungeoeffnet-click-ist",
		participleCaseId:
			"target-de-participle-benchmark-16-ungeoeffnet-click-ungeoeffnet",
		expected: "ADJ",
	},
	{
		id: "17-ungeloest",
		auxiliaryCaseId:
			"target-de-participle-benchmark-17-ungeloest-click-bleibt",
		participleCaseId:
			"target-de-participle-benchmark-17-ungeloest-click-ungeloest",
		expected: "ADJ",
	},
	{
		id: "18-geschlossen",
		auxiliaryCaseId:
			"target-de-participle-benchmark-18-geschlossen-click-ist",
		participleCaseId:
			"target-de-participle-benchmark-18-geschlossen-click-geschlossen",
		expected: "ADJ",
	},
	{
		id: "19-beleidigt",
		auxiliaryCaseId:
			"target-de-participle-benchmark-19-beleidigt-click-ist",
		participleCaseId:
			"target-de-participle-benchmark-19-beleidigt-click-beleidigt",
		expected: "ADJ",
	},
	{
		id: "20-uebertrieben",
		auxiliaryCaseId:
			"target-de-participle-benchmark-20-uebertrieben-click-ist",
		participleCaseId:
			"target-de-participle-benchmark-20-uebertrieben-click-uebertrieben",
		expected: "ADJ",
	},
] as const);

export const participleBenchmarkCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: addCaseEvidence(cases, participleBenchmarkEvidence),
	},
);

function participleBenchmarkEvidence(caseId: string): string {
	if (/benchmark-(?:0[1-9]|10)-/.test(caseId)) {
		return evidence(
			IDS.participialBoundary,
			"TIGER keeps a verbal Partizip II in a perfect, werden-passive, or productive sein-passive verbal. The finite auxiliary and Partizip II therefore resolve to the same Lexeme/VERB target.",
		);
	}
	return evidence(
		IDS.participialBoundary,
		"TIGER assigns lexicalized or contextually adjectival participles to the adjective class. The copula therefore remains a singleton Lexeme/AUX target and the participial adjective a singleton Lexeme/ADJ target.",
	);
}
