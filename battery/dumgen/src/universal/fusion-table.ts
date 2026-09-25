/**
 * Reviewed data for splitting one source word into several Segments at
 * intake (Dumgen ADR 0004). Each language authors a table of closed entries;
 * open patterns (Hebrew prefix stacks) are enumerated in code and are not
 * tables. A language's segmenter reads its table to cut abbreviations,
 * apostrophe clitics and fused words, and placement reads it for the
 * surfaces.
 */

/** One Segment of a fused word: the letters shown and the surface they stand for. */
export type FusionComponent = {
	/** The letters of the source word this Segment displays; may be empty for a component with no letters of its own. */
	readonly span: string;
	/** The surface the letters stand for, or the candidate surfaces one intake Choice decides between. */
	readonly surface: string | readonly [string, string, ...string[]];
	readonly role:
		| "Adposition"
		| "Article"
		| "Pronoun"
		| "Verb"
		| "Negation"
		| "Possessive"
		| "Host";
};

/** A closed fusion: one fixed spelling whose components are known. */
export type FusionEntry = {
	readonly form: string;
	readonly components: readonly [
		FusionComponent,
		FusionComponent,
		...FusionComponent[],
	];
	/** Authored text for the composition card. */
	readonly oneLiner: string;
	readonly register: "Standard" | "Colloquial" | "Dialect";
};

/**
 * A clitic that attaches to an open host: the entry describes the clitic
 * Segment (apostrophe included) and the host keeps its own letters. Free
 * forms (`'ne Frage`) are one Segment whose surface is the full form, not a
 * fusion; the entry still lists them so the surface is authored once.
 */
export type CliticEntry = {
	/** The clitic as written, apostrophe included. */
	readonly clitic: string;
	readonly surface: string | readonly [string, string, ...string[]];
	/** The clitic's role, or one per candidate surface when they differ. */
	readonly role:
		| FusionComponent["role"]
		| readonly [
				FusionComponent["role"],
				FusionComponent["role"],
				...FusionComponent["role"][],
		  ];
	readonly attachment: "Attached" | "Free" | "Both";
	/** Hosts the clitic attaches to, or null for any word. */
	readonly hosts: readonly string[] | null;
	readonly oneLiner: string;
	readonly register: FusionEntry["register"];
};

/** An abbreviation: one Segment whose surface is the expansion. */
export type AbbreviationEntry = {
	/** The abbreviation as written, dots included. */
	readonly text: string;
	readonly surface: string | readonly [string, string, ...string[]];
	/** The whole-unit Kind the expansion resolves to when known; null leaves it to the Open path. */
	readonly kind: string | null;
	readonly oneLiner: string;
};

export type FusionTable = {
	readonly language: "de" | "en";
	readonly fusions: readonly FusionEntry[];
	readonly clitics: readonly CliticEntry[];
	readonly abbreviations: readonly AbbreviationEntry[];
};

function surfaces(surface: string | readonly string[]): readonly string[] {
	return typeof surface === "string" ? [surface] : surface;
}

/** Every table invariant a reviewer would otherwise check by eye. */
export function validateFusionTable(table: FusionTable): void {
	const seen = new Set<string>();
	for (const entry of table.fusions) {
		const joined = entry.components.map((part) => part.span).join("");
		if (joined !== entry.form)
			throw Error(
				`Fusion ${entry.form}: spans ${JSON.stringify(entry.components.map((part) => part.span))} do not spell the form`,
			);
		if (seen.has(entry.form))
			throw Error(`Fusion ${entry.form} is listed twice`);
		seen.add(entry.form);
		for (const part of entry.components)
			for (const surface of surfaces(part.surface))
				if (!surface.trim() || surface !== surface.trim())
					throw Error(`Fusion ${entry.form}: invalid surface`);
		if (!entry.oneLiner.trim())
			throw Error(`Fusion ${entry.form}: missing one-liner`);
	}
	for (const entry of table.clitics) {
		if (!entry.clitic.includes("'"))
			throw Error(`Clitic ${entry.clitic} must carry its apostrophe`);
		if (seen.has(entry.clitic))
			throw Error(`Clitic ${entry.clitic} is listed twice`);
		seen.add(entry.clitic);
		if (!entry.oneLiner.trim())
			throw Error(`Clitic ${entry.clitic}: missing one-liner`);
		if (entry.hosts && entry.hosts.length === 0)
			throw Error(`Clitic ${entry.clitic}: empty host list`);
		if (
			typeof entry.role !== "string" &&
			entry.role.length !== surfaces(entry.surface).length
		)
			throw Error(`Clitic ${entry.clitic}: one role per surface`);
	}
	for (const entry of table.abbreviations) {
		if (!entry.text.endsWith("."))
			throw Error(`Abbreviation ${entry.text} must end with a dot`);
		if (seen.has(entry.text))
			throw Error(`Abbreviation ${entry.text} is listed twice`);
		seen.add(entry.text);
		for (const surface of surfaces(entry.surface))
			if (surface === entry.text || !surface.trim())
				throw Error(`Abbreviation ${entry.text}: surface must expand`);
		if (!entry.oneLiner.trim())
			throw Error(`Abbreviation ${entry.text}: missing one-liner`);
	}
}

/** Case-insensitive lookup of a fusion by its spelling. */
export function fusionEntry(
	table: FusionTable,
	form: string,
): FusionEntry | undefined {
	const normalized = form.normalize("NFC").toLocaleLowerCase(table.language);
	return table.fusions.find((entry) => entry.form === normalized);
}

/**
 * The source letters of each piece of a fused word, cut by the lengths of
 * the authored spans. The authored spans are NFC; a combining mark stays with
 * the letter before it, so an NFD `fu\u0308rs` still cuts after `für`.
 */
export function fusedWordPieces(
	entry: FusionEntry,
	text: string,
): readonly string[] {
	const characters = Array.from(text);
	let position = 0;
	return entry.components.map(({ span }, index) => {
		const start = position;
		if (index === entry.components.length - 1) position = characters.length;
		else
			for (let letter = 0; letter < Array.from(span).length; letter++) {
				position++;
				while (/^\p{M}$/u.test(characters[position] ?? "")) position++;
			}
		return characters.slice(start, position).join("");
	});
}

/**
 * A fused word as the Segments it splits into, each with the surface it
 * stands for when the table names one word (`Im` is `I` standing for `in` and
 * `m` standing for `dem`); undefined for any other word. Segmentation and
 * every host that splits a stored word use this one rule.
 */
export function fusedWordSegments(
	table: FusionTable,
	text: string,
): readonly { readonly text: string; readonly surface?: string }[] | undefined {
	const fusion = fusionEntry(table, text);
	if (!fusion) return undefined;
	const pieces = fusedWordPieces(fusion, text);
	return fusion.components.map((component, position) => {
		const [surface, ...others] = surfaces(component.surface);
		return {
			text: pieces[position] ?? "",
			...(surface !== undefined && others.length === 0
				? { surface }
				: {}),
		};
	});
}

/** Written as authored, or with its first letter capitalized to open a sentence. */
function spells(table: FusionTable, authored: string, written: string) {
	return (
		written === authored ||
		written ===
			authored.charAt(0).toLocaleUpperCase(table.language) +
				authored.slice(1)
	);
}

/** Lookup of an abbreviation by its text, dots included; `Vgl.` finds `vgl.`. */
export function abbreviationEntry(
	table: FusionTable,
	text: string,
): AbbreviationEntry | undefined {
	return table.abbreviations.find((entry) => spells(table, entry.text, text));
}

/** The longest abbreviation the text starts with, as written there. */
export function leadingAbbreviation(
	table: FusionTable,
	text: string,
): string | undefined {
	let longest: string | undefined;
	for (const entry of table.abbreviations) {
		const written = text.slice(0, entry.text.length);
		if (
			spells(table, entry.text, written) &&
			written.length > (longest?.length ?? 0)
		)
			longest = written;
	}
	return longest;
}

/** Lookup of a clitic Segment by its text; typographic apostrophes are normalized. */
export function cliticEntry(
	table: FusionTable,
	text: string,
): CliticEntry | undefined {
	const normalized = text.replaceAll(/[’‘´`]/g, "'");
	return table.clitics.find((entry) => entry.clitic === normalized);
}

/** A clitic the text starts with that stands free before the next word ('s Wetter, 'ne Frage). */
export function leadingFreeClitic(
	table: FusionTable,
	text: string,
): string | undefined {
	const written = text.match(/^[’‘´`'][\p{L}\p{M}]+/u)?.[0];
	const entry = written ? cliticEntry(table, written) : undefined;
	return entry && entry.attachment !== "Attached" ? written : undefined;
}

/**
 * One piece of a fused word as an Encounter holds it (ADR 0035): the
 * surfaces each piece can stand for, and which piece the Segment is. A host
 * keeps its own letters and authors no surface.
 */
export type FusedPiece = {
	readonly pieces: readonly {
		readonly span: string;
		readonly surfaces: readonly string[];
	}[];
	readonly component: number;
};

const fold = (table: FusionTable, text: string) =>
	text.normalize("NFC").toLocaleLowerCase(table.language);

type SegmentText = { readonly kind: string; readonly text: string };

/**
 * The run of adjacent ResolvableText Segments, nothing between them, that
 * holds the Segment at `index`, when it spells a table fusion piece by piece
 * (`i` + `m`) or a host and its attached clitic (`geht` + `'s`).
 */
function fusedRunAt(
	table: FusionTable,
	segments: readonly SegmentText[],
	index: number,
):
	| {
			readonly start: number;
			readonly spans: readonly string[];
			readonly surfaces: readonly (readonly string[])[];
			readonly fusion: FusionEntry | undefined;
	  }
	| undefined {
	const resolvable = (position: number) =>
		segments[position]?.kind === "ResolvableText";
	if (!resolvable(index)) return undefined;
	let start = index;
	while (resolvable(start - 1)) start -= 1;
	let end = index;
	while (resolvable(end + 1)) end += 1;
	if (start === end) return undefined;
	const spans = segments.slice(start, end + 1).map(({ text }) => text);
	const fusion = fusionEntry(table, spans.join(""));
	if (
		fusion &&
		fusion.components.length === spans.length &&
		fusion.components.every(
			(part, position) =>
				fold(table, part.span) === fold(table, spans[position] ?? ""),
		)
	)
		return {
			start,
			spans,
			surfaces: fusion.components.map((part) => surfaces(part.surface)),
			fusion,
		};
	const [host, clitic] = spans;
	if (spans.length !== 2 || host === undefined || clitic === undefined)
		return undefined;
	const attached = splitClitic(table, host + clitic);
	if (
		attached &&
		attached.host === host.replaceAll(/[’‘´`]/g, "'") &&
		cliticEntry(table, clitic) === attached.entry
	)
		return {
			start,
			spans,
			surfaces: [[], surfaces(attached.entry.surface)],
			fusion: undefined,
		};
	return undefined;
}

/**
 * The fused word a Segment is a piece of: adjacent ResolvableText Segments
 * with nothing between them that spell a table fusion piece by piece (`i` +
 * `m`), or a host and its attached clitic (`geht` + `'s`). An unsplit fused
 * word (`im`) is one Segment and no piece.
 */
export function fusedPieceAt(
	table: FusionTable,
	segments: readonly SegmentText[],
	index: number,
): FusedPiece | undefined {
	const run = fusedRunAt(table, segments, index);
	return (
		run && {
			pieces: run.spans.map((span, position) => ({
				span,
				surfaces: run.surfaces[position] ?? [],
			})),
			component: index - run.start,
		}
	);
}

/**
 * The Segment indices of the table fusion whose first piece is at `index`
 * (`i` + `m` of `im`); undefined anywhere else, a clitic's host included.
 */
export function fusedWordAt(
	table: FusionTable,
	segments: readonly SegmentText[],
	index: number,
): readonly number[] | undefined {
	const run = fusedRunAt(table, segments, index);
	return run?.fusion && run.start === index
		? run.spans.map((_, position) => index + position)
		: undefined;
}

/**
 * The first ResolvableText Segment that is a whole table fusion (`im` as one
 * Segment). Segmentation always splits one into its pieces (ADR 0035), so a
 * Sentence that still holds one did not come from Dumgen.
 */
export function unsplitFusedWord(
	table: FusionTable,
	segments: readonly SegmentText[],
): number | undefined {
	const index = segments.findIndex(
		(segment, position) =>
			segment.kind === "ResolvableText" &&
			fusionEntry(table, segment.text) !== undefined &&
			fusedRunAt(table, segments, position) === undefined,
	);
	return index === -1 ? undefined : index;
}

/**
 * A standalone shortened spelling (ADR 0035), a free clitic ('ne) or an
 * abbreviation (z.B.), with the surfaces it stands for: 'ne is eine, z.B.
 * is zum Beispiel. Undefined for any other spelling.
 */
export function shorthandSurfaces(
	table: FusionTable,
	text: string,
): readonly string[] | undefined {
	const clitic = cliticEntry(table, text);
	if (clitic && clitic.attachment !== "Attached")
		return surfaces(clitic.surface);
	const abbreviation = abbreviationEntry(table, text);
	return abbreviation && surfaces(abbreviation.surface);
}

/**
 * The attached clitic at the end of a word, with its host, or undefined.
 * Typographic apostrophes are normalized before matching.
 */
export function splitClitic(
	table: FusionTable,
	word: string,
): { host: string; entry: CliticEntry } | undefined {
	const normalized = word.replaceAll(/[’‘´`]/g, "'");
	for (const entry of table.clitics) {
		if (entry.attachment === "Free") continue;
		if (!normalized.endsWith(entry.clitic)) continue;
		const host = normalized.slice(0, -entry.clitic.length);
		if (!host || !/[\p{L}\p{M}]$/u.test(host)) continue;
		if (
			entry.hosts &&
			!entry.hosts.includes(host.toLocaleLowerCase(table.language))
		)
			continue;
		return { host, entry };
	}
	return undefined;
}
