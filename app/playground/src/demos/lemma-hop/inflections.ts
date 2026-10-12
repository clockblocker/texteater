/**
 * Inflection tables for the authored lemmas, as LinguaCafe's inflections
 * tab shows them, with the few facts the Lemma Card's header needs. The
 * fixtures carry no paradigms, so they live here, keyed by the lemma's
 * title as the Lemma Card shows it.
 *
 * A column is one series of forms: Präsens, Singular. A lemma with two
 * series in one meaning, such as melken's current melkte beside the older
 * molk or Komma's Kommas beside Kommata, gets a column for the rarer
 * series, tagged once in its heading. A rarer form in a single cell
 * (milkst beside melkst) is not a series; it stands under the usual one.
 */

/** What sets a rarer form apart from the usual one. */
type Rarity = "older" | "also";

/** A cell: its form, or the usual form and a rarer one under it. */
type Cell = string | readonly [usual: string, other: string];

type Column = {
	readonly heading: string;
	/** Marks the whole column as the rarer series. */
	readonly tag?: Rarity;
	/** Its forms take the article of the column before: `die` Kommata. */
	readonly sharesArticle?: boolean;
	/** One per row. */
	readonly cells: readonly Cell[];
};

/** A row under the table for a form outside the grid, as Partizip II. */
type Footer = {
	readonly label: string;
	/** The Perfekt's auxiliary: `hat`, `ist`. */
	readonly aux?: string;
	/** The usual form first. */
	readonly forms: readonly string[];
};

export type InflectionTable = {
	readonly lang: "de" | "he";
	/** The header's quiet line: `noun · neuter`, `verb`. */
	readonly wordClass: string;
	/** The header's gloss, in English. */
	readonly gloss: string;
	readonly rowLabels: readonly string[];
	readonly columns: readonly Column[];
	readonly footers?: readonly Footer[];
	/** A cell's or footer's rarer form, by form. */
	readonly rare?: Readonly<Record<string, Rarity>>;
};

/** A form as the table shows it, its article apart so it can go dim. */
export type ShownForm = {
	readonly article?: string;
	readonly form: string;
	readonly rarity?: Rarity;
	readonly marked: boolean;
};

export type ShownCell = {
	readonly usual: ShownForm;
	readonly other?: ShownForm;
};

export type Grid = {
	readonly columns: readonly {
		/** Left out where it repeats the column before's: `older` alone. */
		readonly heading?: string;
		readonly tag?: Rarity;
	}[];
	readonly rows: readonly {
		readonly label: string;
		readonly cells: readonly ShownCell[];
	}[];
	readonly footers: readonly {
		readonly label: string;
		readonly aux?: string;
		readonly forms: readonly ShownForm[];
	}[];
};

const persons = ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"];
const cases = ["Nom.", "Akk.", "Dat.", "Gen."];

const tables: Readonly<Record<string, InflectionTable>> = {
	gehen: {
		lang: "de",
		wordClass: "verb",
		gloss: "to go, to walk",
		rowLabels: persons,
		columns: [
			{
				heading: "Präsens",
				cells: ["gehe", "gehst", "geht", "gehen", "geht", "gehen"],
			},
			{
				heading: "Präteritum",
				cells: ["ging", "gingst", "ging", "gingen", "gingt", "gingen"],
			},
		],
		footers: [{ label: "Partizip II", aux: "ist", forms: ["gegangen"] }],
	},
	anfangen: {
		lang: "de",
		wordClass: "verb · separable",
		gloss: "to begin, to start",
		rowLabels: persons,
		columns: [
			{
				heading: "Präsens",
				cells: [
					"fange an",
					"fängst an",
					"fängt an",
					"fangen an",
					"fangt an",
					"fangen an",
				],
			},
			{
				heading: "Präteritum",
				cells: [
					"fing an",
					"fingst an",
					"fing an",
					"fingen an",
					"fingt an",
					"fingen an",
				],
			},
		],
		footers: [{ label: "Partizip II", aux: "hat", forms: ["angefangen"] }],
	},
	// Duden: melkte, veraltend molk; hat gemolken, seltener gemelkt; the
	// strong present milkst, milkt is veraltet.
	melken: {
		lang: "de",
		wordClass: "verb",
		gloss: "to milk",
		rowLabels: persons,
		columns: [
			{
				heading: "Präsens",
				cells: [
					"melke",
					["melkst", "milkst"],
					["melkt", "milkt"],
					"melken",
					"melkt",
					"melken",
				],
			},
			{
				heading: "Präteritum",
				cells: [
					"melkte",
					"melktest",
					"melkte",
					"melkten",
					"melktet",
					"melkten",
				],
			},
			{
				heading: "Präteritum",
				tag: "older",
				cells: ["molk", "molkst", "molk", "molken", "molkt", "molken"],
			},
		],
		footers: [
			{
				label: "Partizip II",
				aux: "hat",
				forms: ["gemolken", "gemelkt"],
			},
		],
		rare: { milkst: "older", milkt: "older", gemelkt: "also" },
	},
	// Duden: backt or bäckt, both current; backte, veraltend buk.
	backen: {
		lang: "de",
		wordClass: "verb",
		gloss: "to bake",
		rowLabels: persons,
		columns: [
			{
				heading: "Präsens",
				cells: [
					"backe",
					["backst", "bäckst"],
					["backt", "bäckt"],
					"backen",
					"backt",
					"backen",
				],
			},
			{
				heading: "Präteritum",
				cells: [
					"backte",
					"backtest",
					"backte",
					"backten",
					"backtet",
					"backten",
				],
			},
			{
				heading: "Präteritum",
				tag: "older",
				cells: ["buk", "bukst", "buk", "buken", "bukt", "buken"],
			},
		],
		footers: [{ label: "Partizip II", aux: "hat", forms: ["gebacken"] }],
	},
	detailliert: {
		lang: "de",
		wordClass: "adjective",
		gloss: "detailed",
		rowLabels: cases,
		columns: [
			{
				heading: "Masc.",
				cells: [
					"detaillierter",
					"detaillierten",
					"detailliertem",
					"detaillierten",
				],
			},
			{
				heading: "Fem.",
				cells: [
					"detaillierte",
					"detaillierte",
					"detaillierter",
					"detaillierter",
				],
			},
			{
				heading: "Neut.",
				cells: [
					"detailliertes",
					"detailliertes",
					"detailliertem",
					"detaillierten",
				],
			},
			{
				heading: "Plural",
				cells: [
					"detaillierte",
					"detaillierte",
					"detaillierten",
					"detaillierter",
				],
			},
		],
	},
	zu: {
		lang: "de",
		wordClass: "preposition · + dative",
		gloss: "to, towards",
		rowLabels: ["masc./neut.", "fem."],
		columns: [
			{ heading: "Fused", cells: ["zum", "zur"] },
			{ heading: "Written out", cells: ["zu dem", "zu der"] },
		],
	},
	"die Bank": {
		lang: "de",
		wordClass: "noun · feminine",
		gloss: "bench",
		rowLabels: cases,
		columns: [
			{
				heading: "Singular",
				cells: ["die Bank", "die Bank", "der Bank", "der Bank"],
			},
			{
				heading: "Plural",
				cells: ["die Bänke", "die Bänke", "den Bänken", "der Bänke"],
			},
		],
	},
	// Duden: Plural die Kommas und die Kommata; Kommas is the everyday one.
	"das Komma": {
		lang: "de",
		wordClass: "noun · neuter",
		gloss: "comma",
		rowLabels: cases,
		columns: [
			{
				heading: "Singular",
				cells: ["das Komma", "das Komma", "dem Komma", "des Kommas"],
			},
			{
				heading: "Plural",
				cells: ["die Kommas", "die Kommas", "den Kommas", "der Kommas"],
			},
			{
				heading: "Plural",
				tag: "also",
				sharesArticle: true,
				cells: ["Kommata", "Kommata", "Kommata", "Kommata"],
			},
		],
	},
	"der Bahnhof": {
		lang: "de",
		wordClass: "noun · masculine",
		gloss: "train station",
		rowLabels: cases,
		columns: [
			{
				heading: "Singular",
				cells: [
					"der Bahnhof",
					"den Bahnhof",
					"dem Bahnhof",
					"des Bahnhofs",
				],
			},
			{
				heading: "Plural",
				cells: [
					"die Bahnhöfe",
					"die Bahnhöfe",
					"den Bahnhöfen",
					"der Bahnhöfe",
				],
			},
		],
	},
	ללכת: {
		lang: "he",
		wordClass: "verb · pa'al",
		gloss: "to walk, to go",
		rowLabels: ["אני", "אתה", "הוא", "היא", "הם"],
		columns: [
			{
				heading: "עבר",
				cells: ["הלכתי", "הלכת", "הלך", "הלכה", "הלכו"],
			},
			{
				heading: "הווה",
				cells: ["הולך", "הולך", "הולך", "הולכת", "הולכים"],
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

const articles = new Set(["der", "die", "das", "den", "dem", "des"]);

/** `die Kommas` as its article and its word; a form without one whole. */
function splitArticle(written: string): {
	readonly article?: string;
	readonly form: string;
} {
	const [first, ...rest] = written.split(" ");
	return first && articles.has(first) && rest.length > 0
		? { article: first, form: rest.join(" ") }
		: { form: written };
}

/**
 * The table to draw, with every form equal to `marked` marked wherever it
 * stands. A form that shares its article is compared with it: Kommata
 * after `die Kommas` is `die Kommata`.
 */
export function gridOf(table: InflectionTable, marked: string): Grid {
	const shown = (
		written: string,
		shared?: string,
		rarity?: Rarity,
	): ShownForm => {
		const { article, form } = splitArticle(written);
		const whole = shared ? `${shared} ${form}` : written;
		return { article, form, rarity, marked: whole === marked };
	};
	return {
		columns: table.columns.map((column, index) => ({
			heading:
				column.tag &&
				table.columns[index - 1]?.heading === column.heading
					? undefined
					: column.heading,
			tag: column.tag,
		})),
		rows: table.rowLabels.map((label, row) => ({
			label,
			cells: table.columns.map((column, index) => {
				const cell = column.cells[row] ?? "";
				const before = table.columns[index - 1]?.cells[row];
				const shared = column.sharesArticle
					? splitArticle(
							typeof before === "string"
								? before
								: (before?.[0] ?? ""),
						).article
					: undefined;
				if (typeof cell === "string")
					return { usual: shown(cell, shared) };
				const [usual, other] = cell;
				return {
					usual: shown(usual, shared),
					other: shown(other, shared, table.rare?.[other]),
				};
			}),
		})),
		footers: (table.footers ?? []).map((footer) => ({
			label: footer.label,
			aux: footer.aux,
			forms: footer.forms.map((form) =>
				shown(form, undefined, table.rare?.[form]),
			),
		})),
	};
}

/**
 * Whether the clicked form is the rarer one: in a tagged column, under
 * its cell's usual form, or after a footer's first.
 */
export function rarityOf(lemma: string, clicked: string): Rarity | undefined {
	const table = tables[lemma];
	if (!table) return undefined;
	const grid = gridOf(table, markedFormOf(clicked));
	for (const row of grid.rows)
		for (const [index, cell] of row.cells.entries()) {
			if (cell.usual.marked) return grid.columns[index]?.tag;
			if (cell.other?.marked) return cell.other.rarity;
		}
	for (const footer of grid.footers)
		for (const form of footer.forms) if (form.marked) return form.rarity;
	return undefined;
}

/**
 * Roughly how wide the grid's table is, in rem, with no form wrapped: the
 * reflow switches to a list below it. Each column is as wide as its
 * widest form or heading, plus its gap but the last. Forms run about
 * 0.55 em a letter; labels, headings and a cell's quiet second line are
 * `text-xs`, mostly lower case, at about 0.45 em.
 */
export function tableRem(grid: Grid, compact: boolean): number {
	const form = (compact ? 0.75 : 0.875) * 0.55;
	const small = 0.75 * 0.45;
	const gap = 1;
	const written = (shown: ShownForm) =>
		(shown.article ? shown.article.length + 1 : 0) + shown.form.length;
	const labels =
		Math.max(
			...[...grid.rows, ...grid.footers].map((row) => row.label.length),
		) *
			small +
		gap;
	const columns = grid.columns.map(
		(column, index) =>
			Math.max(
				((column.heading?.length ?? 0) +
					(column.tag && column.heading ? 3 : 0) +
					(column.tag?.length ?? 0)) *
					small,
				...grid.rows.map((row) => {
					const cell = row.cells[index];
					if (!cell) return 0;
					return Math.max(
						written(cell.usual) * form,
						cell.other
							? (written(cell.other) +
									(cell.other.rarity?.length ?? 0) +
									1) *
									small
							: 0,
					);
				}),
			) + gap,
	);
	// The last column has no gap after it.
	return columns.reduce((sum, width) => sum + width, labels) - gap;
}
