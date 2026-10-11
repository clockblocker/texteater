/**
 * Inflection tables for the authored lemmas, as LinguaCafe's inflections
 * tab shows them. The fixtures carry no paradigms, so they live here. Each
 * table marks the cell the clicked form fills, keyed by the lemma's title
 * as the Lemma Card shows it.
 */

export type InflectionTable = {
	readonly lang: "de" | "he";
	/** Column headings; the first column holds the row headings. */
	readonly columns: readonly string[];
	readonly rows: readonly {
		readonly label: string;
		readonly cells: readonly string[];
	}[];
	/** The clicked form's cell: row index, then cell index. */
	readonly marked: readonly [number, number];
	readonly note?: string;
};

const persons = ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"];

const tables: Readonly<Record<string, InflectionTable>> = {
	gehen: {
		lang: "de",
		columns: ["", "Präsens", "Präteritum"],
		rows: persons.map((label, index) => ({
			label,
			cells: [
				["gehe", "gehst", "geht", "gehen", "geht", "gehen"][index] ??
					"",
				["ging", "gingst", "ging", "gingen", "gingt", "gingen"][
					index
				] ?? "",
			],
		})),
		marked: [2, 1],
		note: "Partizip II: gegangen (ist)",
	},
	anfangen: {
		lang: "de",
		columns: ["", "Präsens", "Präteritum"],
		rows: persons.map((label, index) => ({
			label,
			cells: [
				[
					"fange an",
					"fängst an",
					"fängt an",
					"fangen an",
					"fangt an",
					"fangen an",
				][index] ?? "",
				[
					"fing an",
					"fingst an",
					"fing an",
					"fingen an",
					"fingt an",
					"fingen an",
				][index] ?? "",
			],
		})),
		marked: [2, 0],
		note: "Partizip II: angefangen (hat)",
	},
	detailliert: {
		lang: "de",
		columns: ["", "masc.", "fem.", "neut.", "pl."],
		rows: [
			{
				label: "Nom.",
				cells: [
					"detaillierter",
					"detaillierte",
					"detailliertes",
					"detaillierte",
				],
			},
			{
				label: "Akk.",
				cells: [
					"detaillierten",
					"detaillierte",
					"detailliertes",
					"detaillierte",
				],
			},
			{
				label: "Dat.",
				cells: [
					"detailliertem",
					"detaillierter",
					"detailliertem",
					"detaillierten",
				],
			},
			{
				label: "Gen.",
				cells: [
					"detaillierten",
					"detaillierter",
					"detaillierten",
					"detaillierter",
				],
			},
		],
		marked: [1, 1],
	},
	zu: {
		lang: "de",
		columns: ["", "fused", "with"],
		rows: [
			{ label: "masc./neut. dat.", cells: ["zum", "zu + dem"] },
			{ label: "fem. dat.", cells: ["zur", "zu + der"] },
		],
		marked: [0, 0],
	},
	"die Bank": {
		lang: "de",
		columns: ["", "singular", "plural"],
		rows: [
			{ label: "Nom.", cells: ["die Bank", "die Bänke"] },
			{ label: "Akk.", cells: ["die Bank", "die Bänke"] },
			{ label: "Dat.", cells: ["der Bank", "den Bänken"] },
			{ label: "Gen.", cells: ["der Bank", "der Bänke"] },
		],
		marked: [2, 0],
	},
	"der Bahnhof": {
		lang: "de",
		columns: ["", "singular", "plural"],
		rows: [
			{ label: "Nom.", cells: ["der Bahnhof", "die Bahnhöfe"] },
			{ label: "Akk.", cells: ["den Bahnhof", "die Bahnhöfe"] },
			{ label: "Dat.", cells: ["dem Bahnhof", "den Bahnhöfen"] },
			{ label: "Gen.", cells: ["des Bahnhofs", "der Bahnhöfe"] },
		],
		marked: [2, 0],
	},
	ללכת: {
		lang: "he",
		columns: ["", "עבר", "הווה"],
		rows: [
			{ label: "אני", cells: ["הלכתי", "הולך"] },
			{ label: "אתה", cells: ["הלכת", "הולך"] },
			{ label: "הוא", cells: ["הלך", "הולך"] },
			{ label: "היא", cells: ["הלכה", "הולכת"] },
			{ label: "הם", cells: ["הלכו", "הולכים"] },
		],
		marked: [2, 0],
	},
};

/** The table for a Lemma Card's title, or undefined for a generic fake. */
export function inflectionsOf(lemma: string): InflectionTable | undefined {
	return tables[lemma];
}
