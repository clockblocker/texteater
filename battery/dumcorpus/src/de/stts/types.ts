import type {
	AdrId,
	RuleId,
	SpecRecordId,
	SpecRoute,
} from "../../corpus-types.js";

/** The 54 tags of the Stuttgart-Tübingen Tagset, in its order. */
export const sttsTags = [
	"ADJA",
	"ADJD",
	"ADV",
	"APPR",
	"APPRART",
	"APPO",
	"APZR",
	"ART",
	"CARD",
	"FM",
	"ITJ",
	"KOUI",
	"KOUS",
	"KON",
	"KOKOM",
	"NN",
	"NE",
	"PDS",
	"PDAT",
	"PIS",
	"PIAT",
	"PIDAT",
	"PPER",
	"PPOSS",
	"PPOSAT",
	"PRELS",
	"PRELAT",
	"PRF",
	"PWS",
	"PWAT",
	"PWAV",
	"PAV",
	"PTKZU",
	"PTKNEG",
	"PTKVZ",
	"PTKANT",
	"PTKA",
	"TRUNC",
	"VVFIN",
	"VVIMP",
	"VVINF",
	"VVIZU",
	"VVPP",
	"VAFIN",
	"VAIMP",
	"VAINF",
	"VAPP",
	"VMFIN",
	"VMINF",
	"VMPP",
	"XY",
	"$,",
	"$.",
	"$(",
] as const;

type SttsTag = (typeof sttsTags)[number];

/** A Dumling route without its language: German is implied. */
export type SttsRoute = Pick<SpecRoute, "family" | "kind">;

/**
 * What an STTS token becomes in a Spec Record:
 * - `Target`: the unit is the token's own word. Alone it is the target's
 *   only member; with `satellites` its Head may own other members, such as
 *   a noun its article or a verb its auxiliary.
 * - `Member`: one member of a target whose unit is another word or a
 *   multiword Lemma: an article of its Head, a particle of its verb, an
 *   anchor of a Locution.
 * - `Component`: a piece of a fused word, a Segment standing for another
 *   word (`m` in `im` stands for `dem`), inside a target of `route`.
 * - `NoTarget`: a Segment of a No Target entry.
 * - `Punctuation`: a Punctuation Segment, which no target holds.
 */
export type SttsBecomes =
	| { role: "Target"; route: SttsRoute; satellites?: true }
	| { role: "Member" | "Component"; route: SttsRoute }
	| { role: "NoTarget" }
	| { role: "Punctuation" };

/**
 * A record showing a mapping: the Segment spelled `word` (its `nth`
 * occurrence, counting from 1, when the sentence repeats it) and, where
 * given, the Canonical Form of the target holding it.
 */
export interface SttsShowing {
	record: SpecRecordId;
	word: string;
	nth?: number;
	lemma?: string;
}

/**
 * Something the crosswalk can't show or the model can't express, and the
 * issue for it. A gap with no issue is not filed.
 */
export interface SttsGap {
	gap: string;
	issue?: number;
	/** The issue's finding ids, where it numbers them. */
	findings?: readonly string[];
}

/** One use of a tag: the condition that picks it and what the token becomes. */
export interface SttsMapping {
	use: string;
	becomes: SttsBecomes;
	/** Each mapping needs its own records: another use's don't count. */
	records: readonly SttsShowing[];
	/** Why no record shows the mapping, when none does. */
	missing?: SttsGap;
}

/**
 * How far one side covers a tag. `Partial` and `No` name their gaps; gold
 * derives from records, so its gaps are the mappings' `missing`.
 */
export type SttsStatus =
	| { status: "Yes" }
	| { status: "Partial" | "No"; gaps: readonly SttsGap[] };

/**
 * One STTS tag in Dumling: its representation or the loss accepted on
 * purpose, a mapping per use, the Rules and ADRs it rests on, and three
 * statuses. `model`: the schema can express it. `gold`: a record reviewed
 * through at least Attestation shows each mapping (`Yes`), some (`Partial`)
 * or none (`No`). `pipeline`: Dumgen produces it.
 */
export interface SttsRow {
	tag: SttsTag;
	/** What STTS tags with it. */
	stts: string;
	dumling: string;
	/** A loss accepted on purpose, if any. */
	loss?: string;
	mappings: readonly SttsMapping[];
	rules: readonly RuleId[];
	adrs: readonly AdrId[];
	model: SttsStatus;
	gold: "Yes" | "Partial" | "No";
	pipeline: SttsStatus;
}
