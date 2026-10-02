import type * as Dumling from "dumling/types";
import { reviewedDeterminers } from "./determiner-paradigms.js";
import { reflexivityUnit } from "./drill-down.js";
import { authoredMembers } from "./inventory.js";
import type { AuthoredMember } from "./member.js";
import { reviewedPronouns } from "./pronoun-paradigms.js";
import { canonical, licensed, type SurfaceSpelling } from "./stem-lemma.js";

/**
 * How one spelling is written, where gold or a Rule fixes it. `spelling` is
 * the Surface's spelling (ADR 0041): Canonical, or a Variant with its tags.
 * A spelling whose status awaits a ruling has none. `historicalStatus` marks
 * an archaic form (de/variant-and-historical-status). A clitic alias names
 * its member orthography, Shorthand or Fused, and the word it stands for
 * (ADR 0035, de/member-orthography); any other spelling is a Standard member.
 */
export type RealizationSpelling = {
	readonly spelling?: SurfaceSpelling;
	readonly historicalStatus?: "Archaic";
	readonly orthography?: "Shorthand" | "Fused";
	readonly standsFor?: string;
};
/** One spelling that realizes an authored DET, PRON or AUX member. */
export type AuthoredRealization = RealizationSpelling & {
	readonly member: AuthoredMember;
	/** The letters a member attests. */
	readonly spelled: string;
	/** The cell a stem Lemma's Surface marks with this spelling (system ADR 0032). */
	readonly inflection?: Readonly<Record<string, string | null>>;
};
type Alias = RealizationSpelling & {
	readonly spelled: string;
	/** The inflection a spelling outside the stem's cells marks: mehr is Cmp. */
	readonly inflection?: Readonly<Record<string, string | null>>;
};

/** A Shorthand member of the word it shortens, whose Surface is Canonical. */
const shorthand = (spelled: string, standsFor: string): Alias => ({
	spelled,
	spelling: canonical,
	orthography: "Shorthand",
	standsFor,
});

/** The comparative of a quantifying determiner, a Canonical Surface marking Cmp. */
const comparative = (spelled: string): Alias => ({
	spelled,
	spelling: canonical,
	inflection: { degree: "Cmp" },
});
/**
 * Other spellings of authored determiners, keyed by Canonical Form. The
 * shortened articles are Shorthand members of the article they stand for
 * ('ne Frage; ADR 0035). mehr and weniger are the comparatives of viel and
 * wenig (mehr Zeit, weniger Besucher), as the ADJ and ADV forms are; standing
 * alone they are PRON Lemmas of their own.
 */
const determinerAliases: Readonly<Record<string, readonly Alias[]>> = {
	ein: [shorthand("n", "ein")],
	eine: [shorthand("ne", "eine")],
	einen: [shorthand("nen", "einen")],
	einem: [shorthand("nem", "einem")],
	einer: [shorthand("ner", "einer")],
	viel: [comparative("mehr")],
	wenig: [comparative("weniger")],
};
/** Every form of the three grammatical auxiliaries; the spelling names the Lemma, the served verb's form picks the Reading (ADR 0026). */
export const auxiliaryForms: Readonly<Record<string, readonly string[]>> = {
	sein: [
		"sein",
		"bin",
		"bist",
		"ist",
		"sind",
		"seid",
		"war",
		"warst",
		"waren",
		"wart",
		"sei",
		"seist",
		"seiest",
		"seien",
		"seiet",
		"wäre",
		"wärst",
		"wärest",
		"wären",
		"wärt",
		"wäret",
		"gewesen",
	],
	haben: [
		"haben",
		"habe",
		"hab",
		"hast",
		"hat",
		"habt",
		"hatte",
		"hattest",
		"hatten",
		"hattet",
		"habest",
		"habet",
		"hätte",
		"hätt",
		"hättest",
		"hätten",
		"hättet",
		"gehabt",
	],
	werden: [
		"werden",
		"werde",
		"wirst",
		"wird",
		"werdet",
		"wurde",
		"wurdest",
		"wurden",
		"wurdet",
		// Archaic preterite, attested in the auxiliary corpus.
		"ward",
		"wardst",
		"werdest",
		"würde",
		"würdest",
		"würden",
		"würdet",
		"geworden",
		"worden",
	],
	// Causative lassen (ADR 0026, Rule de/causative-lassen).
	lassen: [
		"lassen",
		"lasse",
		"lässt",
		"lasst",
		"ließ",
		"ließest",
		"ließt",
		"ließen",
		"lassest",
		"lasset",
		"ließe",
		"ließet",
		"lass",
	],
	// Recipient passive: three verbs share one AUX Lemma and Reading (ADR 0026).
	bekommen: [
		"bekommen",
		"bekomme",
		"bekommst",
		"bekommt",
		"bekam",
		"bekamst",
		"bekamen",
		"bekamt",
		"bekomme",
		"bekommest",
		"bekommet",
		"bekäme",
		"bekämst",
		"bekämest",
		"bekämen",
		"bekämt",
		"bekämet",
		"kriegen",
		"kriege",
		"kriegst",
		"kriegt",
		"kriegte",
		"kriegtest",
		"kriegten",
		"kriegtet",
		"kriegest",
		"krieget",
		"gekriegt",
		"erhalten",
		"erhalte",
		"erhältst",
		"erhält",
		"erhaltet",
		"erhielt",
		"erhieltst",
		"erhielten",
		"erhieltet",
		"erhaltest",
		"erhielte",
		"erhieltest",
		"erhielten",
		"erhieltet",
	],
};
/**
 * The auxiliary forms whose spelling is not plainly Canonical and Standard;
 * every other form is. ward and wardst are Canonical and Archaic, the archaic
 * preterite (de/variant-and-historical-status). hätt is the Shorthand of
 * hätte, as gold has it (de/member-orthography), and hab, the 1sg (ich hab's
 * gesehen), the Shorthand of habe, as the user ruled on 2026-10-02.
 */
export const auxiliaryFormSpellings: Readonly<
	Record<string, RealizationSpelling>
> = {
	ward: { spelling: canonical, historicalStatus: "Archaic" },
	wardst: { spelling: canonical, historicalStatus: "Archaic" },
	hätt: { spelling: canonical, orthography: "Shorthand", standsFor: "hätte" },
	hab: { spelling: canonical, orthography: "Shorthand", standsFor: "habe" },
};
/**
 * Other spellings of pronouns, keyed by Canonical Form. nix is a Licensed
 * Variant of nichts, as gold has it. s is a Fused piece standing for es, as
 * in gehts (ADR 0035).
 */
const pronounAliases: Readonly<Record<string, readonly Alias[]>> = {
	nichts: [{ spelled: "nix", spelling: licensed }],
	es: [
		{
			spelled: "s",
			spelling: canonical,
			orthography: "Fused",
			standsFor: "es",
		},
	],
};
/**
 * Other spellings of one pronoun Lemma rather than of every Lemma
 * spelled alike. derer is a Licensed Variant of relative and demonstrative
 * deren (system ADR 0044) in an occurrence where deren stands alone: die
 * Opfer, derer wir gedenken; sich derer entledigen. Before a noun only deren
 * stands, and attributive and standalone deren are one Lemma, so the swap is
 * judged per occurrence. Pointing ahead to a relative clause, only derer
 * fits, and it is its own Lemma.
 * https://www.duden.de/sprachwissen/sprachratgeber/Demonstrativpronomen-deren-derer
 * https://blog.leo.org/2018/08/24/zwei-woerter-aufgrund-derenderer-manche-ins-zweifeln-geraten/
 */
function pronounAliasesOf(lemma: Dumling.Lemma<"de">): readonly Alias[] {
	const core: Readonly<Record<string, unknown>> = lemma.coreFeatures;
	if (
		lemma.canonicalForm === "deren" &&
		(core.pronType === "Rel" || core.pronType === "Dem")
	)
		return [{ spelled: "derer", spelling: licensed }];
	return pronounAliases[lemma.canonicalForm] ?? [];
}

/** An auxiliary form with its spelling: Canonical unless listed otherwise. */
const auxiliaryAlias = (spelled: string): Alias => ({
	spelled,
	...(auxiliaryFormSpellings[spelled] ?? { spelling: canonical }),
});

/**
 * Every spelling that realizes an authored DET, PRON or AUX member: a stem's
 * spellings with the cell each marks, a pillar's own spelling, the other
 * spellings, and every form of an auxiliary. No spelling realizes the
 * reflexivity unit: a free sich is an Acc or Dat cell, and only drill-down
 * reaches the unit.
 */
export const authoredRealizations: readonly AuthoredRealization[] =
	authoredMembers.flatMap((member) => {
		const { lemma } = member;
		if (
			member === reflexivityUnit ||
			(lemma.kind !== "DET" &&
				lemma.kind !== "PRON" &&
				lemma.kind !== "AUX")
		)
			return [];
		const aliases =
			lemma.kind === "DET"
				? (determinerAliases[lemma.canonicalForm] ?? [])
				: lemma.kind === "AUX"
					? (auxiliaryForms[lemma.canonicalForm] ?? []).map(
							auxiliaryAlias,
						)
					: pronounAliasesOf(lemma);
		const reviewed = (
			lemma.kind === "DET" ? reviewedDeterminers : reviewedPronouns
		).find((entry) => entry.member === member);
		// A stem Lemma's canonical spelling is one of its cells, never
		// cell-less. Any other member's own spelling is Canonical.
		const spellings = reviewed?.spellings ?? [
			{ spelled: lemma.canonicalForm, spelling: canonical },
		];
		const cellless = new Set(
			spellings.filter(({ cell }) => !cell).map(({ spelled }) => spelled),
		);
		return [
			...spellings.map(({ spelled, cell, spelling }) => ({
				member,
				spelled,
				...(spelling ? { spelling } : {}),
				...(cell ? { inflection: { ...cell } } : {}),
			})),
			...aliases
				.filter(({ spelled }) => !cellless.has(spelled))
				.map((alias) => ({ member, ...alias })),
		];
	});
