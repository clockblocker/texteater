/**
 * Identity axis: closed-class identity selected from authored candidates.
 *
 * Code enumerates every authored DET, PRON and AUX member a spelling can
 * realize (`realizations.ts`), and one Choice per such occurrence picks the
 * member, with NoMatch and Unresolved as ways out. A closed-class word with no
 * enumerated candidate is a Miss: the realization table is missing something.
 * Identity implies route, so the selected member's Kind is compared with the
 * route the group vote gave the same occurrence.
 */
import { choice, type Questions } from "promptsmith/typesafe";
import type { AuthoredMember } from "../../src/concrete-lang/de/authored-closed-sets/member.js";
import { authoredRealizations } from "../../src/concrete-lang/de/authored-closed-sets/realizations.js";
import { sameValue } from "../../src/concrete-lang/de/authored-closed-sets/select.js";
import { isResolved, type Sentence, type Unit } from "./corpus.js";
import type { GoldSentence, IdentityProbe } from "./gold.js";

type Answers = Record<string, unknown>;
type ChoiceAnswer = {
	type: "choice";
	choice: string;
	confidence: number;
	probabilities: Record<string, number>;
};

const key = (text: string) => text.normalize("NFC").toLowerCase();

const bySpelling = new Map<string, AuthoredMember[]>();
for (const realization of authoredRealizations) {
	const spelled = key(realization.spelled);
	const members = bySpelling.get(spelled) ?? [];
	if (!members.includes(realization.member)) members.push(realization.member);
	bySpelling.set(spelled, members);
}

/** Every authored member this spelling can realize, in a stable order. */
export function candidatesFor(text: string): AuthoredMember[] {
	return [...(bySpelling.get(key(text)) ?? [])].sort((a, b) =>
		`${a.lemma.kind} ${a.lemma.canonicalForm} ${JSON.stringify(a.lemma.coreFeatures)} ${a.knowledge.definition}`.localeCompare(
			`${b.lemma.kind} ${b.lemma.canonicalForm} ${JSON.stringify(b.lemma.coreFeatures)} ${b.knowledge.definition}`,
		),
	);
}

function features(member: AuthoredMember): string {
	return Object.entries(member.lemma.coreFeatures)
		.filter(([, value]) => value !== null)
		.map(([name, value]) => `${name}=${String(value)}`)
		.join(" ");
}

/** A plain-language rubric per member: what kind of word, which headword, which cell, what it means. */
function rubric(member: AuthoredMember) {
	return {
		kind: member.lemma.kind,
		headword: member.lemma.canonicalForm,
		features: features(member) || "none",
		meaning: member.knowledge.definition,
	};
}

export function identityQuestions(sentence: Sentence): Questions {
	const questions: Questions = {};
	for (const index of sentence.resolvable) {
		const text = sentence.segments[index]?.text ?? "";
		const candidates = candidatesFor(text);
		if (!candidates.length) continue;
		questions[`id_${index}`] = choice(
			`Which reviewed dictionary identity does occurrence <s${index}> "${text}" realize in \`sentence\`? The options are every authored determiner (DET), pronoun (PRON) and grammatical auxiliary (AUX) identity this spelling can realize; each names its word class, headword, grammatical cell and meaning. Read the whole sentence: the same spelling is an article before a noun, a standalone pronoun, or a relative pronoun after a comma. An AUX identity applies only when the word marks perfect, future or passive for another verb in the sentence; a copula, a possession verb or lexical werden is NoMatch. Choose NoMatch when the word is none of the listed identities here (an open-class word, a foreign word, or a use no option covers). Choose Unresolved only when the sentence cannot decide between two listed identities.`,
			{
				...Object.fromEntries(
					candidates.map((member, position) => [
						`c${position}`,
						rubric(member),
					]),
				),
				NoMatch:
					"None of the listed identities is this word in this sentence",
				Unresolved:
					"The sentence cannot decide between listed identities",
			},
		);
	}
	return questions;
}

export type Identity =
	| { readonly status: "Selected"; readonly member: AuthoredMember }
	| { readonly status: "NoMatch" | "Unresolved" }
	| { readonly status: "Miss" };

export function solveIdentity(
	sentence: Sentence,
	answers: Answers,
): Map<number, Identity> {
	const identities = new Map<number, Identity>();
	for (const index of sentence.resolvable) {
		const candidates = candidatesFor(sentence.segments[index]?.text ?? "");
		if (!candidates.length) {
			identities.set(index, { status: "Miss" });
			continue;
		}
		const answer = answers[`id_${index}`] as ChoiceAnswer | undefined;
		if (!answer || answer.type !== "choice") {
			identities.set(index, { status: "Unresolved" });
			continue;
		}
		if (answer.choice === "NoMatch" || answer.choice === "Unresolved") {
			identities.set(index, { status: answer.choice });
			continue;
		}
		const member = candidates[Number(answer.choice.slice(1))];
		identities.set(
			index,
			member ? { status: "Selected", member } : { status: "Unresolved" },
		);
	}
	return identities;
}

const closedRoutes = new Set(["DET", "PRON"]);

export type IdentityScore = {
	readonly id: string;
	readonly kind: IdentityProbe["kind"];
	readonly pass: boolean;
	readonly expected: string;
	readonly actual: string;
	readonly candidates: number;
};

function label(identity: Identity | undefined): string {
	if (!identity) return "none";
	if (identity.status !== "Selected") return identity.status;
	return `${identity.member.lemma.kind} ${identity.member.lemma.canonicalForm} ${features(identity.member)}`;
}

/**
 * Identity accuracy against lemma gold, Kind agreement with the unit route,
 * and the Miss rate over the occurrences the route vote called closed-class.
 */
export function reportIdentity(
	pairs: readonly {
		sentence: Sentence | GoldSentence;
		units: ReadonlyMap<number, Unit> | null;
		identities: ReadonlyMap<number, Identity> | null;
	}[],
) {
	const scores: IdentityScore[] = [];
	const byKind: Record<string, { cases: number; passed: number }> = {};
	const disagreement: Record<string, number> = {};
	let selected = 0;
	let selectedInRoutedUnit = 0;
	let disagree = 0;
	let closedRouted = 0;
	let misses = 0;
	const missing: Record<string, number> = {};
	const clickKinds: Record<string, number> = {};
	let occurrencesWithCandidates = 0;
	let occurrences = 0;

	for (const { sentence, units, identities } of pairs) {
		for (const index of sentence.resolvable) {
			occurrences += 1;
			const identity = identities?.get(index);
			if (identity && identity.status !== "Miss")
				occurrencesWithCandidates += 1;
			const unit = units?.get(index);
			const route = isResolved(unit) ? unit.kind : null;
			if (route && closedRoutes.has(route)) {
				closedRouted += 1;
				if (!identity || identity.status === "Miss") {
					misses += 1;
					const text = key(sentence.segments[index]?.text ?? "");
					missing[text] = (missing[text] ?? 0) + 1;
				}
			}
			if (identity?.status === "Selected") {
				selected += 1;
				if (!route) continue;
				selectedInRoutedUnit += 1;
				const kind = identity.member.lemma.kind;
				const text = key(sentence.segments[index]?.text ?? "");
				const grouped =
					isResolved(unit) && unit.memberSegmentIndices.length > 1;
				const verbal =
					route === "VERB" ||
					route === "Idiom" ||
					route === "Collocation";
				// A non-head member inherits its unit's route: an article in
				// NOUN, an auxiliary, expletive es or required sich in VERB,
				// any closed-class word inside a Phraseme.
				const consistent =
					kind === route ||
					(grouped &&
						((kind === "AUX" && verbal) ||
							(kind === "PRON" &&
								verbal &&
								(text === "es" || text === "sich")) ||
							(kind === "DET" && route === "NOUN") ||
							route === "Idiom" ||
							route === "Collocation" ||
							route === "Proverb" ||
							route === "Aphorism" ||
							route === "DiscourseFormula"));
				if (!consistent) {
					disagree += 1;
					const pair = `${kind}->${route}`;
					disagreement[pair] = (disagreement[pair] ?? 0) + 1;
				}
			}
		}
		if ("identity" in sentence)
			for (const probe of sentence.identity) {
				const identity = identities?.get(probe.index);
				const candidates = candidatesFor(
					sentence.segments[probe.index]?.text ?? "",
				).length;
				const pass =
					probe.gold === "Unresolved"
						? !identity || identity.status !== "Selected"
						: identity?.status === "Selected" &&
							identity.member.lemma.canonicalForm ===
								probe.gold.canonicalForm &&
							sameValue(
								identity.member.lemma.coreFeatures,
								probe.gold.coreFeatures,
							);
				scores.push({
					id: probe.id,
					kind: probe.kind,
					pass,
					expected:
						probe.gold === "Unresolved"
							? "Unresolved"
							: `${probe.kind} ${probe.gold.canonicalForm} ${Object.entries(
									probe.gold.coreFeatures,
								)
									.filter(([, value]) => value !== null)
									.map(
										([name, value]) =>
											`${name}=${String(value)}`,
									)
									.join(" ")}`,
					actual: label(identity),
					candidates,
				});
				const bucket = byKind[probe.kind] ?? { cases: 0, passed: 0 };
				byKind[probe.kind] = bucket;
				bucket.cases += 1;
				if (pass) bucket.passed += 1;
			}
		for (const probe of sentence.cases) {
			const identity = identities?.get(probe.clickedSegmentIndex);
			if (identity?.status !== "Selected") continue;
			const gold =
				(probe.idealOutput as { kind?: string }).kind ?? "Unresolved";
			const pair = `${identity.member.lemma.kind}->${gold}`;
			clickKinds[pair] = (clickKinds[pair] ?? 0) + 1;
		}
	}
	return {
		scores,
		summary: {
			identityCases: scores.length,
			identityPassed: scores.filter((score) => score.pass).length,
			identityByKind: byKind,
			occurrences,
			occurrencesWithCandidates,
			selected,
			selectedInRoutedUnit,
			kindDisagreesWithRoute: disagree,
			disagreementPairs: disagreement,
			closedRoutedOccurrences: closedRouted,
			closedRoutedWithoutCandidate: misses,
			missRate: +(misses / (closedRouted || 1)).toFixed(3),
			missingSpellings: Object.fromEntries(
				Object.entries(missing).sort((a, b) => b[1] - a[1]),
			),
			/** Selected identity Kind against the gold Kind of the clicked unit. */
			clickIdentityKindVersusGoldKind: clickKinds,
		},
	};
}
