/**
 * Inflection tables for the authored lemmas, as LinguaCafe's inflections
 * tab shows them. The fixtures carry no paradigms, so they live here,
 * keyed by the lemma's title as the Lemma Card shows it.
 *
 * A lemma can inflect with two sets of forms in one meaning: melken's
 * current melkte beside the older molk, Komma's Kommas beside Kommata.
 * Each set is authored whole, as if the lemma had no other; `layOut`
 * shows them merged into one table, stacked as one table per set, or as
 * the usual set's table with the rest in one line under it.
 */

/** What sets a rarer form apart from the usual one in its cell. */
type Rarity = "older" | "also";

export type Layout = "merged" | "stacked" | "footnote";

/** One set of forms. A cell lists alternatives within it as `a · b`. */
type FormSet = {
	/** The stacked layout's heading; a lone set needs none. */
	readonly heading?: string;
	/** Row by row, one cell per column after the row heading. */
	readonly rows: readonly (readonly string[])[];
	/** One cell per line label. */
	readonly lines?: readonly string[];
};

export type InflectionTable = {
	readonly lang: "de" | "he";
	/** Column headings; the first column holds the row headings. */
	readonly columns: readonly string[];
	readonly rowLabels: readonly string[];
	/** Lines under the table, such as Partizip II. */
	readonly lineLabels?: readonly string[];
	/** The current set first. */
	readonly sets: readonly FormSet[];
	/** The forms rarer than their cell's usual one. */
	readonly rare?: Readonly<Record<string, Rarity>>;
};

/** A form as a cell shows it. */
export type ShownForm = {
	readonly form: string;
	readonly rarity?: Rarity;
	readonly marked: boolean;
};

type ShownCell = readonly ShownForm[];

/** One table to draw: a set, or the sets merged. */
export type Grid = {
	readonly heading?: string;
	readonly columns: readonly string[];
	readonly rows: readonly {
		readonly label: string;
		readonly cells: readonly ShownCell[];
	}[];
	readonly lines: readonly {
		readonly label: string;
		readonly cell: ShownCell;
	}[];
};

/** The footnote layout's `Also:` forms, one group per rarity. */
type AlsoGroup = {
	readonly rarity?: Rarity;
	readonly forms: readonly ShownForm[];
};

export type LaidOut = {
	readonly grids: readonly Grid[];
	readonly also: readonly AlsoGroup[];
};

const persons = ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"];
const cases = ["Nom.", "Akk.", "Dat.", "Gen."];

/** Rows from columns: `byRow([a1, a2], [b1, b2])` is `[[a1, b1], [a2, b2]]`. */
function byRow(...columns: readonly (readonly string[])[]): string[][] {
	const height = Math.max(...columns.map((column) => column.length));
	return Array.from({ length: height }, (_, row) =>
		columns.map((column) => column[row] ?? ""),
	);
}

const older = (...forms: readonly string[]) =>
	Object.fromEntries(forms.map((form) => [form, "older" as const]));
const also = (...forms: readonly string[]) =>
	Object.fromEntries(forms.map((form) => [form, "also" as const]));

const tables: Readonly<Record<string, InflectionTable>> = {
	gehen: {
		lang: "de",
		columns: ["", "Präsens", "Präteritum"],
		rowLabels: persons,
		lineLabels: ["Partizip II"],
		sets: [
			{
				rows: byRow(
					["gehe", "gehst", "geht", "gehen", "geht", "gehen"],
					["ging", "gingst", "ging", "gingen", "gingt", "gingen"],
				),
				lines: ["gegangen"],
			},
		],
	},
	anfangen: {
		lang: "de",
		columns: ["", "Präsens", "Präteritum"],
		rowLabels: persons,
		lineLabels: ["Partizip II"],
		sets: [
			{
				rows: byRow(
					[
						"fange an",
						"fängst an",
						"fängt an",
						"fangen an",
						"fangt an",
						"fangen an",
					],
					[
						"fing an",
						"fingst an",
						"fing an",
						"fingen an",
						"fingt an",
						"fingen an",
					],
				),
				lines: ["angefangen"],
			},
		],
	},
	// Duden: melkte, veraltend molk; hat gemolken, seltener gemelkt; the
	// strong present milkst, milkt is veraltet. The current set keeps
	// gemelkt as its rarer participle, since gemolken is today's usual one.
	melken: {
		lang: "de",
		columns: ["", "Präsens", "Präteritum"],
		rowLabels: persons,
		lineLabels: ["Partizip II"],
		sets: [
			{
				heading: "Current",
				rows: byRow(
					["melke", "melkst", "melkt", "melken", "melkt", "melken"],
					[
						"melkte",
						"melktest",
						"melkte",
						"melkten",
						"melktet",
						"melkten",
					],
				),
				lines: ["gemolken · gemelkt"],
			},
			{
				heading: "Older",
				rows: byRow(
					["melke", "milkst", "milkt", "melken", "melkt", "melken"],
					["molk", "molkst", "molk", "molken", "molkt", "molken"],
				),
				lines: ["gemolken"],
			},
		],
		rare: {
			...older("milkst", "milkt", "molk", "molkst", "molken", "molkt"),
			...also("gemelkt"),
		},
	},
	// Duden: backt or bäckt, both current; backte, veraltend buk.
	backen: {
		lang: "de",
		columns: ["", "Präsens", "Präteritum"],
		rowLabels: persons,
		lineLabels: ["Partizip II"],
		sets: [
			{
				heading: "Current",
				rows: byRow(
					[
						"backe",
						"backst · bäckst",
						"backt · bäckt",
						"backen",
						"backt",
						"backen",
					],
					[
						"backte",
						"backtest",
						"backte",
						"backten",
						"backtet",
						"backten",
					],
				),
				lines: ["gebacken"],
			},
			{
				heading: "Older",
				rows: byRow(
					["backe", "bäckst", "bäckt", "backen", "backt", "backen"],
					["buk", "bukst", "buk", "buken", "bukt", "buken"],
				),
				lines: ["gebacken"],
			},
		],
		rare: older("buk", "bukst", "buken", "bukt"),
	},
	detailliert: {
		lang: "de",
		columns: ["", "masc.", "fem.", "neut.", "pl."],
		rowLabels: cases,
		sets: [
			{
				rows: [
					[
						"detaillierter",
						"detaillierte",
						"detailliertes",
						"detaillierte",
					],
					[
						"detaillierten",
						"detaillierte",
						"detailliertes",
						"detaillierte",
					],
					[
						"detailliertem",
						"detaillierter",
						"detailliertem",
						"detaillierten",
					],
					[
						"detaillierten",
						"detaillierter",
						"detaillierten",
						"detaillierter",
					],
				],
			},
		],
	},
	zu: {
		lang: "de",
		columns: ["", "fused", "with"],
		rowLabels: ["masc./neut. dat.", "fem. dat."],
		sets: [
			{
				rows: [
					["zum", "zu + dem"],
					["zur", "zu + der"],
				],
			},
		],
	},
	"die Bank": {
		lang: "de",
		columns: ["", "singular", "plural"],
		rowLabels: cases,
		sets: [
			{
				rows: byRow(
					["die Bank", "die Bank", "der Bank", "der Bank"],
					["die Bänke", "die Bänke", "den Bänken", "der Bänke"],
				),
			},
		],
	},
	// Duden: Plural die Kommas und die Kommata; Kommas is the everyday one.
	"das Komma": {
		lang: "de",
		columns: ["", "singular", "plural"],
		rowLabels: cases,
		sets: [
			{
				heading: "Plural Kommas",
				rows: byRow(
					["das Komma", "das Komma", "dem Komma", "des Kommas"],
					["die Kommas", "die Kommas", "den Kommas", "der Kommas"],
				),
			},
			{
				heading: "Plural Kommata",
				rows: byRow(
					["das Komma", "das Komma", "dem Komma", "des Kommas"],
					[
						"die Kommata",
						"die Kommata",
						"den Kommata",
						"der Kommata",
					],
				),
			},
		],
		rare: also("die Kommata", "den Kommata", "der Kommata"),
	},
	"der Bahnhof": {
		lang: "de",
		columns: ["", "singular", "plural"],
		rowLabels: cases,
		sets: [
			{
				rows: byRow(
					[
						"der Bahnhof",
						"den Bahnhof",
						"dem Bahnhof",
						"des Bahnhofs",
					],
					[
						"die Bahnhöfe",
						"die Bahnhöfe",
						"den Bahnhöfen",
						"der Bahnhöfe",
					],
				),
			},
		],
	},
	ללכת: {
		lang: "he",
		columns: ["", "עבר", "הווה"],
		rowLabels: ["אני", "אתה", "הוא", "היא", "הם"],
		sets: [
			{
				rows: [
					["הלכתי", "הולך"],
					["הלכת", "הולך"],
					["הלך", "הולך"],
					["הלכה", "הולכת"],
					["הלכו", "הולכים"],
				],
			},
		],
	},
};

/** The table for a Lemma Card's title, or undefined for a generic fake. */
export function inflectionsOf(lemma: string): InflectionTable | undefined {
	return tables[lemma];
}

/**
 * The form a click marks, as the table writes it: a noun's with the
 * article its case takes, a separable verb's with its prefix after it.
 */
const markedForms: Readonly<Record<string, string>> = {
	Bank: "der Bank",
	Bahnhof: "dem Bahnhof",
	"fängt … an": "fängt an",
	Kommata: "die Kommata",
};

export function markedFormOf(clicked: string): string {
	return markedForms[clicked] ?? clicked;
}

const formsIn = (cell: string | undefined) => (cell ? cell.split(" · ") : []);

/**
 * One cell's forms from `sets`, the usual ones first: unrated forms
 * before rare ones, then in the sets' order.
 */
function cellOf(
	table: InflectionTable,
	cells: readonly (string | undefined)[],
	marked: string,
): ShownCell {
	const forms = [...new Set(cells.flatMap(formsIn))];
	const rank = (form: string) => (table.rare?.[form] ? 1 : 0);
	return forms
		.toSorted((a, b) => rank(a) - rank(b))
		.map((form) => ({
			form,
			rarity: table.rare?.[form],
			marked: form === marked,
		}));
}

function gridOf(
	table: InflectionTable,
	sets: readonly FormSet[],
	marked: string,
	heading?: string,
): Grid {
	return {
		heading,
		columns: table.columns,
		rows: table.rowLabels.map((label, row) => ({
			label,
			cells: table.columns.slice(1).map((_, column) =>
				cellOf(
					table,
					sets.map((set) => set.rows[row]?.[column]),
					marked,
				),
			),
		})),
		lines: (table.lineLabels ?? []).map((label, line) => ({
			label,
			cell: cellOf(
				table,
				sets.map((set) => set.lines?.[line]),
				marked,
			),
		})),
	};
}

/** The grid's cells column by column, then its lines: reading order. */
function cellsByColumn(grid: Grid): ShownCell[] {
	return [
		...grid.columns
			.slice(1)
			.flatMap((_, column) =>
				grid.rows.map((row) => row.cells[column] ?? []),
			),
		...grid.lines.map((line) => line.cell),
	];
}

/**
 * The table in `layout`, with each form equal to `marked` marked
 * wherever it stands:
 * - merged: one table; a cell holds every set's forms, usual first;
 * - stacked: one table per set, the set holding the marked form first;
 * - footnote: the usual form of each cell, and every other form in
 *   `also`, grouped by rarity.
 */
export function layOut(
	table: InflectionTable,
	layout: Layout,
	marked: string,
): LaidOut {
	if (layout === "stacked") {
		const holds = (set: FormSet) =>
			[...set.rows.flat(), ...(set.lines ?? [])]
				.flatMap(formsIn)
				.includes(marked);
		const sets = [
			...table.sets.filter(holds),
			...table.sets.filter((set) => !holds(set)),
		];
		return {
			grids: sets.map((set) =>
				gridOf(
					table,
					[set],
					marked,
					table.sets.length > 1 ? set.heading : undefined,
				),
			),
			also: [],
		};
	}
	const merged = gridOf(table, table.sets, marked);
	if (layout === "merged") return { grids: [merged], also: [] };

	const usual: Grid = {
		...merged,
		rows: merged.rows.map((row) => ({
			...row,
			cells: row.cells.map((cell) => cell.slice(0, 1)),
		})),
		lines: merged.lines.map((line) => ({
			...line,
			cell: line.cell.slice(0, 1),
		})),
	};
	const groups = new Map<Rarity | undefined, ShownForm[]>();
	for (const cell of cellsByColumn(merged))
		for (const shown of cell.slice(1)) {
			const group = groups.get(shown.rarity) ?? [];
			if (!group.some((other) => other.form === shown.form))
				group.push(shown);
			groups.set(shown.rarity, group);
		}
	return {
		grids: [usual],
		also: [...groups].map(([rarity, forms]) => ({ rarity, forms })),
	};
}

/** The row headings' column, in rem: `text-xs` at about 0.5 em a letter. */
export function labelRem(grid: Grid): number {
	const longest = Math.max(
		...[...grid.rows, ...grid.lines].map((row) => row.label.length),
	);
	return Math.ceil((longest * 0.75 * 0.5 + 1) * 4) / 4;
}

/**
 * Roughly how wide the grid's table is, in rem, with no form wrapped: the
 * reflow switches to a list below it. The table is fixed-layout, so every
 * form column is as wide as the widest; a line spans them all. Forms run
 * about 0.5 em a letter, column headings are `text-xs`, a rarity marker
 * 0.65 rem.
 */
export function tableRem(grid: Grid, compact: boolean): number {
	const form = (compact ? 0.75 : 0.875) * 0.5;
	const label = 0.75 * 0.5;
	const marker = 0.65 * 0.5;
	const cellRem = (cell: ShownCell) =>
		cell.reduce(
			(sum, shown, index) =>
				sum +
				shown.form.length * form +
				(index > 0 ? 3 * form : 0) +
				(shown.rarity ? shown.rarity.length * marker + 0.25 : 0),
			0,
		) + 0.75;
	const labels = labelRem(grid);
	const columns = grid.columns
		.slice(1)
		.map((heading, column) =>
			Math.max(
				heading.length * label + 0.75,
				...grid.rows.map((row) => cellRem(row.cells[column] ?? [])),
			),
		);
	const lines = grid.lines.map((line) => cellRem(line.cell));
	return labels + Math.max(columns.length * Math.max(...columns), ...lines);
}
