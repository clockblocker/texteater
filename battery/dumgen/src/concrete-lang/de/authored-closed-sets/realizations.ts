import type * as Dumling from "dumling/types";
import { reviewedDeterminers } from "./determiner-paradigms.js";
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
/** Licensed alternate spellings of authored determiner cells, keyed by Canonical Form. */
// Free clitic article forms (fusion Entry table) and the comparative of
// uninflected wenig.
const determinerAliases: Readonly<Record<string, readonly string[]>> = {
	ein: ["n"],
	eine: ["ne"],
	einen: ["nen"],
	einem: ["nem"],
	einer: ["ner"],
	wenig: ["weniger"],
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
				? [
						...(determinerAliases[lemma.canonicalForm] ?? []),
						...(reviewedDeterminers.find(
							(entry) => entry.member === member,
						)?.variants ?? []),
					]
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
