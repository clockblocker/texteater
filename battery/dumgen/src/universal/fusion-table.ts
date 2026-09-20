/**
 * Reviewed data for splitting one source word into several Segments at
 * intake (Dumgen ADR 0004). Each language authors a table of closed entries;
 * open patterns (Hebrew prefix stacks) are enumerated in code and are not
 * tables. The tables are data the intake lab and playground fixtures consume;
 * production segmentation still runs the regex scanner.
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
	readonly role: FusionComponent["role"];
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

function surfaces(
	surface: string | readonly [string, string, ...string[]],
): readonly string[] {
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

/** Lookup of an abbreviation by its exact text, dots included. */
export function abbreviationEntry(
	table: FusionTable,
	text: string,
): AbbreviationEntry | undefined {
	return table.abbreviations.find((entry) => entry.text === text);
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
