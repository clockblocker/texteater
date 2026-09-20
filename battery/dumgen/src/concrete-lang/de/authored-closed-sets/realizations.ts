import type * as Dumling from "dumling/types";
import { authoredMembers } from "./inventory.js";
import type { AuthoredMember } from "./member.js";
import { reviewedPronouns } from "./pronoun-paradigms.js";
import { sameValue } from "./select.js";

export type AuthoredRealization = {
	readonly member: AuthoredMember;
	readonly spelled: string;
	/** Additional occurrence coordinates needed to distinguish a syncretic realization. */
	readonly inflection?: Readonly<Record<string, string | null>>;
};
const declined = (stem: string) =>
	["", "e", "er", "es", "em", "en"].map((ending) => stem + ending);
const strong = (stem: string) =>
	["e", "er", "es", "em", "en"].map((ending) => stem + ending);
/** Reviewed realization paradigms for existing identities, independent of evaluation corpora. */
// LEO: licensed reductions and plural was für, not spelling errors.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/e-Tilgung.html?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/RelInter/Pron-was_fuer.xml?lang=de
const determinerForms: Readonly<Record<string, readonly string[]>> = {
	ein: [...declined("ein"), "n", "ne", "nen", "nem"],
	mein: declined("mein"),
	dein: declined("dein"),
	sein: declined("sein"),
	ihr: declined("ihr"),
	Ihr: declined("Ihr"),
	unser: [...declined("unser"), ...strong("unsr"), "unsern", "unserm"],
	euer: [...declined("euer"), ...strong("eur"), "euern", "euerm"],
	derjenige: [
		"derjenige",
		"diejenige",
		"dasjenige",
		"denjenigen",
		"demjenigen",
		"desjenigen",
		"derjenigen",
		"diejenigen",
	],
	derselbe: [
		"derselbe",
		"dieselbe",
		"dasselbe",
		"denselben",
		"demselben",
		"desselben",
		"derselben",
		"dieselben",
		// Pieces left after a fused article (am selben, im selben): Partial coverage.
		"selbe",
		"selben",
	],
	dieser: strong("dies"),
	jener: strong("jen"),
	solcher: strong("solch"),
	welcher: strong("welch"),
	mancher: strong("manch"),
	etwelcher: strong("etwelch"),
	irgendwelcher: strong("irgendwelch"),
	wieviel: declined("wieviel"),
	wievielte: declined("wievielt"),
	"was für ein": [...declined("was für ein"), "was für"],
	einige: declined("einig"),
	etliche: declined("etlich"),
	irgendein: declined("irgendein"),
	mehrere: ["mehrere", "mehreren", "mehrerer"],
	viel: declined("viel"),
	wenig: [...declined("wenig"), ...declined("weniger")],
	meist: declined("meist"),
	kein: declined("kein"),
	alle: declined("all"),
	jeder: declined("jed"),
	jedweder: declined("jedwed"),
	jeglicher: declined("jeglich"),
	sämtlich: declined("sämtlich"),
	beide: declined("beid"),
};
/** Every form of the three grammatical auxiliaries; the spelling names the Lemma, the served verb's form picks the Reading (ADR 0026). */
const auxiliaryForms: Readonly<Record<string, readonly string[]>> = {
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
};
const pronounAliases: Readonly<Record<string, readonly string[]>> = {
	nichts: ["nix"],
	es: ["s"],
	jemanden: ["jemand"],
	jemandem: ["jemand"],
	niemanden: ["niemand"],
	niemandem: ["niemand"],
};
export const authoredRealizations: readonly AuthoredRealization[] =
	authoredMembers.flatMap((member) => {
		const { lemma } = member;
		if (
			lemma.kind !== "DET" &&
			lemma.kind !== "PRON" &&
			lemma.kind !== "AUX"
		)
			return [];
		const forms =
			lemma.kind === "DET"
				? (determinerForms[lemma.canonicalForm] ?? [])
				: lemma.kind === "AUX"
					? (auxiliaryForms[lemma.canonicalForm] ?? [])
					: [
							...(pronounAliases[lemma.canonicalForm] ?? []),
							...(reviewedPronouns.find(
								(entry) => entry.member === member,
							)?.variants ?? []),
						];
		return [...new Set([lemma.canonicalForm, ...forms])].map((spelled) => ({
			member,
			spelled,
		}));
	});

// Multiple Readings may share one Lemma. Deduplicate once so expanded paradigms
// do not cause a quadratic scan for every encountered pronoun.
const grammaticalMembers = authoredMembers.filter(
	(member, index) =>
		(member.lemma.kind === "DET" ||
			member.lemma.kind === "PRON" ||
			member.lemma.kind === "AUX") &&
		!authoredMembers
			.slice(0, index)
			.some((prior) => sameValue(prior.lemma, member.lemma)),
);

/** Core nulls compare literally; no missing spelling map is interpreted as catalog absence. */
export function locateAuthoredIdentity(
	input: {
		kind: "DET" | "PRON" | "AUX";
		spelled: string;
		core: Record<string, unknown>;
		inflection: unknown;
	},
	mappings: readonly AuthoredRealization[] = authoredRealizations,
) {
	const compatible = grammaticalMembers.filter(
		(member) =>
			member.lemma.kind === input.kind &&
			sameValue(member.lemma.coreFeatures, input.core),
	);
	const matches = [
		...new Set(
			mappings
				.filter(
					(mapping) =>
						compatible.includes(mapping.member) &&
						mapping.spelled.normalize("NFC") ===
							input.spelled.normalize("NFC") &&
						Object.entries(mapping.inflection ?? {}).every(
							([key, value]) =>
								input.inflection !== null &&
								typeof input.inflection === "object" &&
								sameValue(
									(
										input.inflection as Record<
											string,
											unknown
										>
									)[key],
									value,
								),
						),
				)
				.map((mapping) => mapping.member),
		),
	];
	return {
		matches,
		compatible,
		status:
			matches.length === 1
				? ("Hit" as const)
				: matches.length
					? ("Ambiguous" as const)
					: ("Gap" as const),
	};
}

export function validateAuthoredRealizations(
	mappings: readonly AuthoredRealization[] = authoredRealizations,
): void {
	for (const mapping of mappings) {
		if (!authoredMembers.includes(mapping.member))
			throw Error("Realization refers to an unauthored identity");
		if (
			!mapping.spelled.trim() ||
			mapping.spelled !== mapping.spelled.trim()
		)
			throw Error("Invalid authored realization text");
		const lemma: Dumling.Lemma = mapping.member.lemma;
		if (
			lemma.kind !== "DET" &&
			lemma.kind !== "PRON" &&
			lemma.kind !== "AUX"
		)
			throw Error("Unsupported authored realization route");
	}
}
