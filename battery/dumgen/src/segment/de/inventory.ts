/**
 * What the German unit stage reads from dumcorpus's Authored Inventories
 * (system ADR 0021): the AUX spellings that open an auxiliary slot, the ADP
 * Case Table that opens a preposition slot, and the DET and PRON members a
 * spelling realizes, its closed-class identity candidates (Dumgen ADR
 * 0007). The stage takes it as a parameter, so an experiment can pin the
 * inventory its cached requests were built from.
 */
import {
	authoredRealizations,
	germanAdpositionEntry,
} from "dumcorpus/inventories";

/**
 * One DET or PRON identity a spelling can realize, grouped by Kind,
 * Canonical Form and pronoun type. AUX members are left out: an auxiliary
 * joins its verb, so its identity never routes a unit.
 */
export type IdentityCandidate = {
	readonly key: string;
	readonly kind: "DET" | "PRON";
	readonly canonicalForm: string;
	readonly pronType: string | null;
	readonly poss: boolean;
	readonly description: string;
};

export type GermanInventory = {
	/** Whether the spelling realizes an authored AUX member. */
	readonly isAuxiliary: (spelling: string) => boolean;
	/** Whether the ADP Case Table lists the word as a Lexeme ADP, in any position. */
	readonly isAdposition: (word: string) => boolean;
	readonly identityCandidates: (
		spelling: string,
	) => readonly IdentityCandidate[];
};

const pronTypeNames: Readonly<Record<string, string>> = {
	Art: "article",
	Dem: "demonstrative",
	Rel: "relative",
	Int: "interrogative",
	Prs: "personal",
	Ind: "indefinite",
	Neg: "negative",
	Tot: "total",
	Rcp: "reciprocal",
	Emp: "emphatic",
	Exc: "exclamative",
};

/**
 * The use of a PRON that stands before a noun or grades a word as well as
 * standing for a noun phrase, keyed by Canonical Form. Quantity bisschen is
 * one PRON in every use (de/quantifier-by-use), so the default "standing
 * for a whole noun phrase" made jev answer Other for ein bisschen Milch and
 * klingt bisschen förmlich. ein wenig and ein paar are two pieces, which
 * the identity Choice never asks about.
 */
const pronounUses: Readonly<Record<string, string>> = {
	bisschen:
		"the quantity word 'a bit, a little' in every use: before a noun (ein bisschen Brot, kein bisschen Zeit), alone (Iss noch ein bisschen) or grading a word (ein bisschen kalt, wartet bisschen länger)",
};

function identityIndex(): Map<string, IdentityCandidate[]> {
	const map = new Map<string, Map<string, IdentityCandidate>>();
	for (const realization of authoredRealizations) {
		const { lemma } = realization.member;
		if (lemma.kind !== "DET" && lemma.kind !== "PRON") continue;
		const features = lemma.coreFeatures as Record<string, unknown>;
		const pronType =
			typeof features.pronType === "string" ? features.pronType : null;
		const poss = features.poss === "Yes";
		const key = `${lemma.kind}:${lemma.canonicalForm}:${pronType ?? "-"}${poss ? ":Poss" : ""}`;
		const spelling = realization.spelled.toLowerCase();
		const group = map.get(spelling) ?? new Map<string, IdentityCandidate>();
		if (!group.has(key)) {
			const role = [
				poss ? "possessive" : undefined,
				pronType ? (pronTypeNames[pronType] ?? pronType) : undefined,
			]
				.filter(Boolean)
				.join(" ");
			const use =
				lemma.kind === "DET"
					? pronType === "Art"
						? "the article of a noun phrase"
						: "a determiner directly before its noun"
					: (pronounUses[lemma.canonicalForm] ??
						"a pronoun standing for a whole noun phrase");
			group.set(key, {
				key,
				kind: lemma.kind,
				canonicalForm: lemma.canonicalForm,
				pronType,
				poss,
				description: `${lemma.canonicalForm}: ${role || lemma.kind.toLowerCase()} ${lemma.kind === "DET" ? "determiner" : "pronoun"}, ${use}`,
			});
		}
		map.set(spelling, group);
	}
	return new Map(
		[...map].map(([spelling, group]) => [spelling, [...group.values()]]),
	);
}

/**
 * The inventory dumcorpus authors now. `auxiliaryLemmas` keeps only the AUX
 * members of those Lemmas, as an experiment replaying requests made before
 * a later AUX member was authored needs.
 */
export function germanInventory(
	options: { readonly auxiliaryLemmas?: ReadonlySet<string> } = {},
): GermanInventory {
	let auxiliaries: Set<string> | undefined;
	let identities: Map<string, IdentityCandidate[]> | undefined;
	return {
		isAuxiliary(spelling) {
			auxiliaries ??= new Set(
				authoredRealizations
					.filter(
						({ member }) =>
							member.lemma.kind === "AUX" &&
							(options.auxiliaryLemmas?.has(
								member.lemma.canonicalForm,
							) ??
								true),
					)
					.map(({ spelled }) => spelled.toLowerCase()),
			);
			return auxiliaries.has(spelling.toLowerCase());
		},
		isAdposition: (word) =>
			germanAdpositionEntry({ family: "Lexeme", canonicalForm: word }) !==
			null,
		identityCandidates(spelling) {
			identities ??= identityIndex();
			return identities.get(spelling.toLowerCase()) ?? [];
		},
	};
}

/** The inventory dumcorpus authors now, with every AUX member. */
export const authoredInventory: GermanInventory = germanInventory();
