import { cellKeyOf } from "dumling";

import { germanSuppletiveComparisons } from "../../inventories/de/suppletive-comparison.js";
import {
	Cells,
	type PackDerivedTable,
	type PackDeriveInput,
} from "../types.js";
import type { GermanWordForm } from "./forms.js";
import {
	endsWithSibilant,
	endsWithVowel,
	lower,
	syllableCount,
} from "./orthography.js";

/**
 * The adjectives that umlaut in comparison (alt, älter; gesund, gesünder).
 * A compound ending in one may too (altklug, altklüger; lebensnah,
 * lebensnäher).
 */
const UMLAUTING_HEADS: readonly string[] = [
	"alt",
	"arg",
	"arm",
	"bang",
	"blass",
	"dumm",
	"fromm",
	"gesund",
	"glatt",
	"grob",
	"groß",
	"hart",
	"hoch",
	"jung",
	"kalt",
	"karg",
	"klug",
	"krank",
	"krumm",
	"kurz",
	"lang",
	"nah",
	"nass",
	"rot",
	"scharf",
	"schmal",
	"schwach",
	"schwarz",
	"stark",
	"warm",
];

/**
 * Latin adjectives in `-er` that drop its `e` before the comparative ending
 * (integer, integrer), which no rule here tells from those that keep it
 * (sauber, sauberer).
 */
const E_DROPPING: ReadonlySet<string> = new Set([
	"illuster",
	"integer",
	"makaber",
	"sinister",
]);

/** The stem the comparison endings attach to: `dunkel` → `dunkl`, `leise` → `leis`. */
function comparativeStem(positive: string): string {
	const word = lower(positive);
	if (word.endsWith("el")) return `${positive.slice(0, -2)}l`;
	if (/(au|eu)er$/u.test(word)) return `${positive.slice(0, -2)}r`;
	if (word.endsWith("e")) return positive.slice(0, -1);
	return positive;
}

/**
 * A monosyllabic stem whose vowel is a, o, u or au may umlaut (alt, älter;
 * lange, länger; hoch, höher) or not (klar, klarer), which the Lemma cannot
 * tell. A polysyllable does only when it ends in an umlauting adjective
 * (kerngesund, altklug).
 */
function mayUmlaut(positive: string): boolean {
	const word = lower(positive);
	const stem = word.endsWith("e") ? word.slice(0, -1) : word;
	if (syllableCount(stem) === 1) return /(^|[^eä])[aou]/u.test(stem);
	return UMLAUTING_HEADS.some((head) => stem.endsWith(head));
}

/**
 * The superlative takes `-esten` after d, t, s, ß, x, z, sch and a vowel
 * (am kältesten, am heißesten, am freiesten), except after the
 * participial `-end`, `-elt`, unstressed `-ert` and `-et` and after
 * `-isch` (am bedeutendsten, am begeistertsten, am gebildetsten, am
 * typischsten; but am interessiertesten). Undefined after the unstressed
 * `-igt` and `-icht` (berechtigt, töricht), where no rule here is sure of
 * the `e`.
 */
function superlative(positive: string): string | undefined {
	const word = lower(positive);
	const base = word.endsWith("e") ? positive.slice(0, -1) : positive;
	const folded = lower(base);
	if (syllableCount(folded) > 1 && /i(g|ch)t$/u.test(folded))
		return undefined;
	const participial =
		syllableCount(folded) > 1 &&
		/(end|elt|[^i]ert|[dtnm]et)$/u.test(folded);
	const linking =
		!participial &&
		!folded.endsWith("isch") &&
		(/[dt]$/u.test(folded) ||
			endsWithSibilant(folded) ||
			folded.endsWith("sch") ||
			(endsWithVowel(folded) && !word.endsWith("e")));
	return `am ${base}${linking ? "esten" : "sten"}`;
}

/** The suppletive comparison of a positive, `gerne` read as `gern`. */
function suppletiveOf(positive: string) {
	const word = lower(positive);
	return germanSuppletiveComparisons.find(
		(entry) => entry.positive === word || `${entry.positive}e` === word,
	);
}

/**
 * A comparable ADJ's or ADV's comparison: Positiv, Komparativ and
 * Superlativ. The positive is the Lemma; suppletive forms come from the
 * Authored Inventory (gut, besser, am besten); an ADJ's regular forms are
 * derived only where no umlaut can be in doubt. An ADV's comparison is
 * mostly suppletive or irregular (oft, öfter), so only an ADJ's is derived.
 * A cell in doubt stays Unknown, for a met comparative (`älter`) to fill.
 */
export function compareGerman({
	lemma,
	schema,
}: PackDeriveInput<"de">): PackDerivedTable<GermanWordForm> {
	const cells = new Cells<GermanWordForm>();
	const positive = lemma.canonicalForm;
	const at = (degree: string) => cellKeyOf({ degree }, schema.keyFeatures);
	const word = (text: string): GermanWordForm => ({
		kind: "Word",
		word: text,
	});
	cells.add(at("Pos"), { form: word(positive), provenance: "Rule" });
	const suppletive = suppletiveOf(positive);
	if (suppletive) {
		cells.add(at("Cmp"), {
			form: word(suppletive.comparative),
			provenance: "Authored",
		});
		cells.add(at("Sup"), {
			form: word(suppletive.superlative),
			provenance: "Authored",
		});
		return cells.table;
	}
	if (lemma.kind !== "ADJ" || mayUmlaut(positive)) return cells.table;
	if (!E_DROPPING.has(lower(positive)))
		cells.add(at("Cmp"), {
			form: word(`${comparativeStem(positive)}er`),
			provenance: "Rule",
		});
	const derived = superlative(positive);
	if (derived !== undefined)
		cells.add(at("Sup"), { form: word(derived), provenance: "Rule" });
	return cells.table;
}
