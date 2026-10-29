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
 * need, not every German affix, except the verb-forming suffixes, which
 * are the closed set the grammars give.
 */
import type * as Dumrel from "dumrel/types";

/** One affix: the letters it shows and its Morpheme Lemma's Canonical Form. */
export type GermanAffix = {
	readonly spelled: string;
	readonly canonicalForm: string;
	/**
	 * A suffix's base Kind, when it derives from one Kind only: `-ung`
	 * makes nouns from verbs (`gründen + -ung`).
	 */
	readonly baseKind?: string;
	/**
	 * What a word made with the suffix names, `{base}` standing for its
	 * base's letters (`Leit-`), after Fleischer/Barz's word-formation patterns. Dumgen
	 * tests a homograph's analysis against its sense with it (#1241).
	 */
	readonly sense?: string;
};

const prefix = (spelled: string): GermanAffix => ({
	spelled,
	canonicalForm: `${spelled}-`,
});

const suffix = (
	spelled: string,
	canonical = spelled,
	sense?: string,
): GermanAffix => ({
	spelled,
	canonicalForm: `-${canonical}`,
	...(sense === undefined ? {} : { sense }),
});

/*
 * The senses of the common noun- and adjective-forming patterns
 * (Fleischer/Barz, Wortbildung der deutschen Gegenwartssprache, 4th ed.,
 * 2012: nomina agentis and instrumenti in -er, abstracts in -ung and -heit,
 * collectives in -schaft, diminutives, motion in -in, adjectives in -lich,
 * -ig, -isch and -bar).
 */
const agent =
	"a person, a tool, a vehicle or a thing that does, carries or holds what {base} names";
const quality =
	"the state or quality of being what {base} names, or something that has it";
const diminutive = "a small or dear {base}";
const activity =
	"the activity of what {base} names, or its place or its product";
const having = "having, like or to do with what {base} names";

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

/**
 * The prefixes that stand only before a hyphen (ADR 0054): DWDS's 2e-,
 * short for *elektronisch*, which `E-Mail` links its `E` to. Kept apart
 * from `germanPrefixes`, so no word that merely opens with an e is cut
 * there.
 */
export const germanHyphenPrefixes: readonly GermanAffix[] = ["e"].map(prefix);

/** The derivational suffixes, each allomorph linking to its one Lemma. */
export const germanSuffixes: readonly GermanAffix[] = [
	/*
	 * -ung derives nouns from verbs (Fleischer/Barz, Wortbildung der
	 * deutschen Gegenwartssprache, 4th ed., 2012, on deverbal -ung
	 * abstracts; de.wiktionary -ung: "Suffix zur Bildung von Substantiven
	 * vorwiegend aus Verben"), so its base is a verb even where the stem
	 * also spells a noun: `Gründ` is gründen, not Grund. The few old
	 * collectives from nouns (Waldung, Stallung) are not productive.
	 */
	{
		...suffix(
			"ung",
			"ung",
			"the act, process or result of what {base} names",
		),
		baseKind: "VERB",
	},
	suffix("heit", "heit", quality),
	suffix("keit", "heit", quality),
	suffix("igkeit", "heit", quality),
	suffix("schaft", "schaft", "a group, state or domain of what {base} names"),
	suffix("tum"),
	suffix("nis"),
	suffix("sal"),
	suffix("ling"),
	suffix("ler", "ler", agent),
	suffix("ner", "ner", agent),
	suffix("er", "er", agent),
	suffix("in", "in", "a female {base}"),
	suffix("chen", "chen", diminutive),
	suffix("lein", "lein", diminutive),
	suffix("erei", "erei", activity),
	suffix("ei", "ei", activity),
	suffix("ie"),
	suffix("ion"),
	suffix("ität"),
	suffix("ismus"),
	suffix("ist"),
	suffix("lich", "lich", having),
	suffix("ig", "ig", having),
	suffix("isch", "isch", having),
	suffix("bar", "bar", "able to be done as {base} names"),
	suffix("sam"),
	suffix("haft"),
	suffix("los"),
	suffix("weise"),
	suffix("wärts"),
	/*
	 * The verb-forming suffixes, closed (Fleischer/Barz, Wortbildung der
	 * deutschen Gegenwartssprache, 4th ed., 2012, Verbderivation; Duden, Die
	 * Grammatik, 9th ed., 2016, Verbbildung): -ier(en), -el(n), -er(n) and
	 * -ig(en). Each is spelled without the citation ending, which is the
	 * verb's Ending (ADR 0051): `stud · ier · en`, `läch · el · n`, `steig ·
	 * er · n`, `rein · ig · en`. -isier(en) and -ifizier(en) are Lemmas of
	 * their own, not Surfaces of `-ier` (ADR 0051): no base predicts them,
	 * as an adjective in -ig predicts `igkeit` for `-heit`, and one base can
	 * take two with different senses (harmonieren, harmonisieren;
	 * elektrisieren, elektrifizieren). DWDS calls -ifizieren a "Synonym zu
	 * -ieren" and gives -isieren a sense of its own, "mit etw. versehen"
	 * (https://www.dwds.de/wb/-ieren, …/-isieren, …/-ifizieren). The verbal
	 * -er and -ig are the Lemmas `-er` and `-ig` above, each with a Reading
	 * of its own, as homograph Morphemes are (ADR 0051); DWDS gives them no
	 * verbal affix entry.
	 */
	suffix("ier"),
	suffix("isier"),
	suffix("ifizier"),
	suffix("el"),
];

/**
 * The overt endings a German citation form may close with, by Kind
 * (ADR 0051): a verb's `-en` (`spann · en`, `stud · ier · en`), whose `n`
 * after -el or -er (`läch · el · n`) is a Surface of the same Ending Lemma
 * as `-igkeit` is of `-heit`, and a noun's or adjective's `-e` (`gesell ·
 * e`, `müd · e`). No suffix above includes one.
 */
export const germanCitationEndings: Readonly<
	Partial<Record<string, readonly GermanAffix[]>>
> = {
	VERB: [suffix("en"), suffix("n", "en")],
	NOUN: [suffix("e")],
	ADJ: [suffix("e")],
};

/**
 * German's Morphemic Breakdown policy for `dumrel`'s `propagateMorphemes`
 * (ADR 0051): the Kinds whose citation form, with no overt ending, ends in
 * the zero ending, because their paradigm has a slot for one (`Haus` =
 * `haus · ∅`). An indeclinable word gets no Ending, and a verb's citation
 * form always shows one, its letters linked to their Ending Lemma (`n` to
 * `-en`).
 */
export const germanMorphemePolicy: Dumrel.MorphemePolicy = {
	zeroEndingKinds: new Set(["NOUN", "PROPN", "ADJ", "DET", "PRON"]),
	endings: new Map(
		Object.values(germanCitationEndings).flatMap((endings) =>
			(endings ?? []).map(({ spelled, canonicalForm }) => [
				spelled,
				canonicalForm,
			]),
		),
	),
};
