/**
 * German's closed affix inventory (system ADR 0050, ADR 0051): the formants
 * `segment.inConstituents` may cut off a word built from a word (`ver- +
 * kaufen`, `entspannen + -ung`), the affixes `segment.inMorphemes` splits
 * off a bottom word (`ver · gess · en`), and the endings a citation form
 * closes with. A cut nothing here licenses never happens: the remainder of
 * a bottom word is its Root.
 *
 * Each affix pairs the letters it shows with the Canonical Form of its
 * Morpheme Lemma. An allomorph is a Surface of one Lemma (ADR 0051), so
 * `keit` and `igkeit` both link to `-heit`; synonyms such as `-chen` and
 * `-lein` stay two Lemmas. The true separable particles are
 * `germanSeparableParticles` (`verb-prefixes.ts`), not listed again here.
 *
 * The lists hold the affixes the gold and common German word formation
 * need, not every German affix; the foreign verb suffix `-ieren` and the
 * verbal `-eln` and `-ern` are not covered yet.
 */
import type * as Dumrel from "dumrel/types";

/** One affix: the letters it shows and its Morpheme Lemma's Canonical Form. */
export type GermanAffix = {
	readonly spelled: string;
	readonly canonicalForm: string;
};

const prefix = (spelled: string): GermanAffix => ({
	spelled,
	canonicalForm: `${spelled}-`,
});

const suffix = (spelled: string, canonical = spelled): GermanAffix => ({
	spelled,
	canonicalForm: `-${canonical}`,
});

/**
 * The prefixes that are no separable particle: the inseparable verb
 * prefixes (be-, ver-), the nominal and adjectival ones (un-, ur-) and the
 * common foreign ones (anti-, re-).
 */
export const germanPrefixes: readonly GermanAffix[] = [
	"be",
	"emp",
	"ent",
	"er",
	"ge",
	"miss",
	"ver",
	"zer",
	"un",
	"ur",
	"erz",
	"anti",
	"des",
	"dis",
	"ex",
	"inter",
	"post",
	"prä",
	"pro",
	"re",
	"super",
	"trans",
].map(prefix);

/** The derivational suffixes, each allomorph linking to its one Lemma. */
export const germanSuffixes: readonly GermanAffix[] = [
	suffix("ung"),
	suffix("heit"),
	suffix("keit", "heit"),
	suffix("igkeit", "heit"),
	suffix("schaft"),
	suffix("tum"),
	suffix("nis"),
	suffix("sal"),
	suffix("ling"),
	suffix("ler"),
	suffix("ner"),
	suffix("er"),
	suffix("in"),
	suffix("chen"),
	suffix("lein"),
	suffix("erei"),
	suffix("ei"),
	suffix("ie"),
	suffix("ion"),
	suffix("ität"),
	suffix("ismus"),
	suffix("ist"),
	suffix("lich"),
	suffix("ig"),
	suffix("isch"),
	suffix("bar"),
	suffix("sam"),
	suffix("haft"),
	suffix("los"),
	suffix("weise"),
	suffix("wärts"),
];

/**
 * The overt endings a German citation form may close with, by Kind
 * (ADR 0051): a verb's `-en` or `-n` (`spann · en`, `wander · n`), a noun's
 * or adjective's `-e` (`gesell · e`, `müd · e`). Each is spelled as its
 * Ending Lemma's Canonical Form.
 */
export const germanCitationEndings: Readonly<
	Partial<Record<string, readonly string[]>>
> = {
	VERB: ["-en", "-n"],
	NOUN: ["-e"],
	ADJ: ["-e"],
};

/**
 * German's Morphemic Breakdown policy for `dumrel`'s `propagateMorphemes`
 * (ADR 0051): the Kinds whose citation form, with no overt ending, ends in
 * the zero ending, because their paradigm has a slot for one (`Haus` =
 * `haus · ∅`). An indeclinable word gets no Ending, and a verb's citation
 * form always shows one.
 */
export const germanMorphemePolicy: Dumrel.MorphemePolicy = {
	zeroEndingKinds: new Set(["NOUN", "PROPN", "ADJ", "DET", "PRON"]),
};
