/**
 * Closed-class identity from the authored candidates (Dumgen ADR 0007): a
 * piece whose spelling realizes authored DET or PRON members chooses among
 * those members, grouped by Kind, Canonical Form and pronoun type, and the
 * chosen group implies the route. AUX members are left out: an auxiliary
 * joins its verb, so its identity never routes a unit.
 */
import { authoredRealizations } from "dumspec";

export type IdentityCandidate = {
	readonly key: string;
	readonly kind: "DET" | "PRON";
	readonly canonicalForm: string;
	readonly pronType: string | null;
	readonly description: string;
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

let bySpelling: Map<string, IdentityCandidate[]> | undefined;

function index(): Map<string, IdentityCandidate[]> {
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
					: "a pronoun standing for a whole noun phrase";
			group.set(key, {
				key,
				kind: lemma.kind,
				canonicalForm: lemma.canonicalForm,
				pronType,
				description: `${lemma.canonicalForm}: ${role || lemma.kind.toLowerCase()} ${lemma.kind === "DET" ? "determiner" : "pronoun"}, ${use}`,
			});
		}
		map.set(spelling, group);
	}
	return new Map(
		[...map].map(([spelling, group]) => [spelling, [...group.values()]]),
	);
}

export function identityCandidates(
	spelling: string,
): readonly IdentityCandidate[] {
	bySpelling ??= index();
	return bySpelling.get(spelling.toLowerCase()) ?? [];
}
