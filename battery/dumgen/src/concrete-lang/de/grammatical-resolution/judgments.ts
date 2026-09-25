import { germanAdpositionCases } from "dumling";
import * as Effect from "effect/Effect";
import type { Questions } from "promptsmith/typesafe";
import { modelSchemas } from "../../../generated/model-schemas.js";
import type {
	DumgenOptions,
	Encounter,
	LemmaCandidate,
	MoreContextRequired,
} from "../../../types.js";
import { DumgenFailure } from "../../../universal/failure.js";
import { judgmentCaller } from "../../../universal/judgment.js";
import { executeGeneration } from "../../../universal/model.js";
import { effectiveConfiguration } from "../../../universal/model-configuration.js";
import { choice } from "../../../universal/questions.js";
import { type OperationScope, recordEvent } from "../../../universal/trace.js";
import { markedContext, parse } from "../../../universal/validation.js";
import { authoredMembers } from "../authored-closed-sets/inventory.js";
import { sameValue } from "../authored-closed-sets/select.js";
import {
	fixedCaseOf,
	governablePrepositionLemma,
	isGovernablePreposition,
} from "../governable-prepositions.js";
import { resolveAuthoredGrammarIdentity } from "./authored-identity.js";
import {
	featureQuestion,
	inflectionQuestion,
	verbalKinds,
} from "./feature-questions.js";
import { grammarFeatureFields } from "./feature-schema.js";
import { infinitiveShaped } from "./infinitive-shape.js";
import { possiblyInflectedNoun } from "./inflected-noun.js";
import {
	nounArticleCandidates,
	nounArticleQuestions,
	nounArticleState,
	resolveNounArticle,
} from "./noun-article.js";
import type { GrammarOutput } from "./project.js";
import {
	inReferentGroup,
	type ReferentMode,
	referentChoice,
	referentKeys,
} from "./referent.js";
import { routeGuidance } from "./route-guidance.js";
import {
	canonicalFormGuidance,
	canonicalFormPrompt,
	normalizedMemberGuidance,
	textSystemPrompt,
} from "./text-guidance.js";
import { verbalCompositionGuidance } from "./verbal-guidance.js";

const unmarked = "Unmarked";
/** A feature answer's domain value: Unmarked is null and "Masc,Neut" a value set. */
function featureValue(answer: string): unknown {
	if (answer === unmarked) return null;
	return answer.includes(",") ? answer.split(",") : answer;
}
const normalizations = {
	Keep: "Copy the attested member exactly, preserving licensed variants and required capitals",
	LowerInitial:
		"Only its first letter has ordinary sentence-initial capitalization; lowercase that first letter",
	UpperInitial:
		"Uppercase the initial letter to repair casing or restore required noun/name capitalization",
	Generate:
		"Required spelling correction or constrained suspended-noun completion needs new text",
	Unresolved: "No defensible positional normalization",
};
function transformed(text: string, mode: string): string {
	if (mode === "LowerInitial")
		return text.slice(0, 1).toLocaleLowerCase("de") + text.slice(1);
	if (mode === "UpperInitial")
		return text.slice(0, 1).toLocaleUpperCase("de") + text.slice(1);
	return text;
}

const lexicalStringLimit = 254;
/**
 * Candidate strings for open lexical features (the separable prefix) derived
 * from raw members only, so they can be asked in the same
 * round trip as the feature questions. Casing follows ordinary normalization;
 * the judged canonical form may still add candidates in the follow-up.
 */
function speculativeLexicalStringCandidates(
	catalog: ReturnType<typeof grammarFeatureFields>,
	members: readonly string[],
): Record<string, string[]> {
	const candidates: Record<string, string[]> = {};
	const words = [
		...new Set(
			members.flatMap((text) => [
				text,
				text.slice(0, 1).toLocaleLowerCase("de") + text.slice(1),
			]),
		),
	];
	for (const [path, field] of catalog) {
		if (!field.open || !path.startsWith("lemma.coreFeatures.")) continue;
		const key = path.slice("lemma.coreFeatures.".length);
		const values = [
			...new Set(
				key === "hasSepPrefix"
					? words.flatMap((word) =>
							Array.from({ length: word.length }, (_, index) =>
								word.slice(0, index + 1),
							),
						)
					: words,
			),
		];
		if (values.length && values.length <= lexicalStringLimit)
			candidates[key] = values;
	}
	return candidates;
}
function lexicalStringQuestion(key: string, candidates: readonly string[]) {
	return choice(
		`If the lexical feature judgment establishes ${key} as Present, which exact text in \`lexicalStringCandidates.${key}\` is it? Prefixes are separable lexical prefixes, never a governed preposition or an adposition with its own complement.`,
		{
			...Object.fromEntries(
				candidates.map((text, index) => [`text_${index}`, text]),
			),
			Unresolved:
				"None is defensible, or the feature is Absent; do not revise the feature judgment",
		},
	);
}

const sharedPolicy = {
	target: "The classified route and ordered membership are fixed. Analyze only this whole target in full sentence context. Do not repair membership or reclassify. Return Unresolved when a valid analysis is not defensible.",
	identity:
		"Core Features belong to the dictionary identity, not the current inflection. Occurrence features belong to Surface. Spelling Canonical does not mean Grundform: finite and declined forms may be Canonical.",
	canonicalForm:
		"Canonical Form is the exact dictionary headword, not necessarily the Surface. The concrete `canonicalFormCandidate` is the attested members joined with single spaces; accept it only when that exact text already is the headword, otherwise select an exact headword from `canonicalFormAlternatives` when available. These include stored dictionary headwords and, for nouns, individual source members without the article. Candidates are suggestions, not proof: preserve contextual identity and Core Features; select missing text only when no candidate is the exact headword. Inflection does not prevent identical spelling. Selection requires exact headword text and casing; the headword may omit compositional articles even though Attestation membership stays fixed.",
	orthography:
		"Standard orthography includes licensed variants and ordinary sentence-initial capitalization. Typo means a real spelling/casing error. Never modernize licensed variants in normalized members. Keep source members positionally aligned; no added or deleted member. Surface spelling is Variant only for a licensed spelling/abbreviation of the same Lemma, never simply an inflection or typo repair. Historical status concerns archaic grammatical use, not merely old spelling or surrounding context.",
	inflection:
		"Citation has null inflection only for a dictionary/citation use or genuinely unmarked invariant use under the route's policy. Structural null is not uncertainty.",
};

const nounPolicy = {
	suspension:
		"For noun suspension, completion is allowed only for one selected trailing-hyphen member in binary und/oder coordination with a full right compound sharing the literal suffix; retain Full coverage. Ordinary uninflected noun forms and dictionary citations remain distinct.",
	articles:
		"German NOUN article features describe an owned, licensed shared, or Fusion-supplied article: Definite, Indefinite, or null for bare nouns/non-article determiners. A separate governing Fusion supplies its DET component: im Wald has Surface dem Wald with only Wald attested as a member and im retained as article evidence. Noun Lemma is always the bare dictionary headword. Contextual nouns have a marked case/number/article bag even when article is null. Partial nouns are allowed for licensed shared articles in compatible coordination or articles supplied by a governing Fusion; membership stays fixed.",
};

const verbalIdentityPolicy =
	"For VERB, hasSepPrefix is only a separable lexical prefix, lexicallyReflexive only a required reflexive; verbType Mod is a lexical modal identity. Select string values only from code-supplied candidates. A verbal target that includes the preposition its verb or expression lexically selects for its complement (wartet auf, erinnert sich an, geht um, weiß Bescheid über) is a supported complete target: that owned member is named as governed-preposition evidence and stays out of the Lemma. A free adjunct preposition, a detached separable prefix or an adposition with its own nominal complement is never governed-preposition evidence. AUX is sein, haben or werden as the auxiliary member of another verb; its identity is a complete reviewed Lemma, and perfect, future and passive belong to the whole verbal Unit, never to the auxiliary alone.";

/** ADJ and NOUN take in their governed preposition like verbs (ADR 0034). */
const governmentPolicy =
	"An adjective or noun target that includes the preposition it lexically selects for its complement (stolz auf, abhängig von, Angst vor, Interesse an) is a supported complete target, also when the preposition stands apart from it (Auf ihn bin ich stolz, der auf seinen Sohn stolze Vater, die Angst der Kinder vor Hunden): that owned member is named as governed-preposition evidence and stays out of the Lemma. A free adjunct preposition or an adposition with its own nominal complement is never governed-preposition evidence.";

/** The Kinds that name a governed preposition among their members (ADR 0034). */
const adnominalGovernors: ReadonlySet<string> = new Set(["ADJ", "NOUN"]);

const partialCoveragePolicy =
	"Partial coverage is otherwise allowed only for Idiom, DiscourseFormula, Proverb and Aphorism when fixed lexical material is genuinely unrealized and the full identity remains recoverable. Discontinuous or multi-member targets are not Partial merely due to excluded contextual material.";

/**
 * Each round trip depends on every earlier one: the follow-ups ask only what
 * the earlier answers left open. A PRON form that several cells share adds
 * the referent question; only `MayAskForContext` lets it answer
 * MoreContextRequired.
 */
export function resolveGrammarJudgments(
	options: DumgenOptions,
	encounter: Encounter,
	scope: OperationScope,
	lemmaCandidates: readonly LemmaCandidate[] = [],
	referentMode: ReferentMode = { mode: "MustAnswer" },
): Effect.Effect<GrammarOutput | MoreContextRequired, DumgenFailure> {
	return Effect.gen(function* () {
		const route = `${encounter.sentence.language}/${encounter.target.family}/${encounter.target.kind}`;
		if (
			encounter.target.family === "Morpheme" ||
			encounter.target.kind === "PUNCT"
		)
			throw new DumgenFailure(
				"NotImplemented",
				"resolveGrammar",
				"Production is not enabled for this grammar route",
				route,
			);
		const fail = (message: string): never => {
			throw new DumgenFailure(
				"Unresolved",
				"resolveGrammar",
				message,
				route,
			);
		};
		const input = markedContext(encounter);
		const canonicalFormCandidate = input.members.join(" ");
		// jev takes an offered candidate almost always (E2: CandidateIsNotCanonical
		// 102 → 0/154), so a stored Lemma of the same route found under another
		// word would become this target's Lemma: "stolz" for "normal".
		const targetTexts = new Set([...input.members, canonicalFormCandidate]);
		const storedLemmas = lemmaCandidates
			.filter(({ foundUnder }) =>
				foundUnder.some((text) => targetTexts.has(text)),
			)
			.map(({ lemma }) => lemma)
			.filter(
				(lemma) =>
					lemma.language === encounter.sentence.language &&
					lemma.family === encounter.target.family &&
					lemma.kind === encounter.target.kind,
			);
		// Every source here sets Lemma precision. A preposition is never a
		// noun's headword, so a governed one is not offered.
		const canonicalFormAlternatives = [
			...new Set([
				...storedLemmas.map((lemma) => lemma.canonicalForm),
				...(encounter.target.kind === "NOUN"
					? input.members.filter(
							(text) =>
								!isGovernablePreposition(
									text.toLocaleLowerCase("de"),
								),
						)
					: []),
			]),
		]
			.filter((text) => text !== canonicalFormCandidate)
			.slice(0, 64);
		const schema = modelSchemas[`grammar/${route}`];
		if (!schema)
			throw new DumgenFailure(
				"NotImplemented",
				"resolveGrammar",
				"No grammatical route",
				route,
			);
		const catalog = grammarFeatureFields(route);
		const verbal = verbalKinds.has(encounter.target.kind);
		const adnominal = adnominalGovernors.has(encounter.target.kind);
		const auxiliary = encounter.target.kind === "AUX";
		const constructionFeature = (path: string) =>
			/\.(perfect|future|passive)$/u.test(path);
		const mapped =
			encounter.target.kind === "DET" || encounter.target.kind === "PRON";
		// Several grammar Readings share one AUX Lemma; the identity is the Lemma.
		const identities = auxiliary
			? authoredMembers.filter(
					(member, index) =>
						member.lemma.kind === "AUX" &&
						!authoredMembers
							.slice(0, index)
							.some((prior) =>
								sameValue(prior.lemma, member.lemma),
							),
				)
			: [];
		const sentenceInitial =
			encounter.target.memberSegmentIndices[0] ===
			encounter.sentence.segments.findIndex(
				(segment) => segment.kind === "ResolvableText",
			);
		const referent =
			encounter.target.kind === "PRON"
				? referentChoice(
						input.members.join(" "),
						sentenceInitial,
						referentMode,
					)
				: null;
		const questions: Questions = {
			support: choice(
				"Under `policy`, can the fixed target in `markedContext` support a coherent analysis on `route`?",
				{
					Supported: "Yes, keep route and membership unchanged",
					Unresolved: "No defensible analysis on the supplied target",
				},
			),
			spelling: choice(
				"Under `policy.orthography` and `policy.route`, is the Surface realized by `members` in `markedContext` a canonical spelling of its Lemma or a licensed variant? Inflection alone never means Variant.",
				{ Canonical: null, Variant: null, Unresolved: null },
			),
			historicalStatus: choice(
				"Is the grammatical use of this target archaic?",
				{
					Current: "Current use, including licensed old spelling",
					Archaic: "The grammatical use itself is archaic",
					Unresolved: null,
				},
			),
		};
		if (catalog.has("surface.inflectionalFeatures"))
			questions.inflection = inflectionQuestion(encounter.target.kind);
		for (const [path, field] of catalog) {
			if (
				!(
					path.startsWith("lemma.coreFeatures.") ||
					path.startsWith("surface.inflectionalFeatures.")
				)
			)
				continue;
			if (auxiliary && path.startsWith("lemma.")) continue;
			if (auxiliary && constructionFeature(path)) continue; // Construction belongs to the Unit, not the auxiliary.
			if (
				encounter.target.kind === "NOUN" &&
				(path.endsWith(".article") || path.endsWith(".case"))
			)
				continue;
			if (verbal && path.endsWith(".voice")) continue; // Voice follows the judged passive construction.
			questions[path] = featureQuestion(
				encounter.target.kind,
				path,
				field,
			);
		}
		for (const [index] of input.members.entries()) {
			questions[`orthography_${index}`] = choice(
				`Under \`policy.orthography\`, what is the orthography of \`members[${index}]\` in \`markedContext\`?`,
				{
					Standard:
						"Licensed spelling/capitalization, including variants",
					Typo: "Actual local spelling or casing error",
					Unresolved: null,
				},
			);
			questions[`normalization_${index}`] = choice(
				`Under \`policy\`, how should \`members[${index}]\` be positionally normalized in \`markedContext\`?`,
				normalizations,
			);
		}
		const partial = [
			"Idiom",
			"DiscourseFormula",
			"Proverb",
			"Aphorism",
		].includes(encounter.target.kind);
		if (partial)
			questions.coverage = choice(
				"Is all fixed lexical material realized, or is some genuinely unrealized?",
				{
					Full: "All fixed material realized",
					Partial: "Recoverable fixed material genuinely unrealized",
					Unresolved: null,
				},
			);
		if (auxiliary)
			questions.identity = choice(
				"Which reviewed AUX Lemma (sein, haben or werden) is realized by the supplied auxiliary? Finite features belong to its Surface; perfect, future and passive belong to the verb it serves.",
				{
					...Object.fromEntries(
						identities.map((member, index) => [
							`identity_${index}`,
							JSON.stringify(member.lemma),
						]),
					),
					NoMatch:
						"The required AUX identity is absent from the reviewed catalog",
					Unresolved: "Cannot choose a defensible identity",
				},
			);
		else if (encounter.target.kind !== "DET")
			questions.canonical = choice(
				"Under `policy.canonicalForm`, which supplied text exactly equals the dictionary Canonical Form of the fixed whole target in `markedContext`? Select the joined candidate, an alternative, or missing text. A noun headword excludes its compositional article; do not copy an inflected noun just because its spelling is Canonical.",
				{
					...Object.fromEntries(
						canonicalFormAlternatives.map((text, index) => [
							`candidate_${index}`,
							text,
						]),
					),
					CandidateIsCanonical:
						"`canonicalFormCandidate` is already the exact dictionary headword",
					CandidateIsNotCanonical:
						"The dictionary headword is absent from both `canonicalFormCandidate` and every `canonicalFormAlternatives` value",
					Unresolved:
						"Cannot defensibly establish whether the concrete candidate is the dictionary headword",
				},
			);
		// Speculative questions whose candidates come from raw source text ride in
		// the same round trip; code consumes them only when they apply.
		const articleCandidates =
			encounter.target.kind === "NOUN"
				? nounArticleCandidates(encounter)
				: null;
		if (articleCandidates)
			Object.assign(
				questions,
				nounArticleQuestions(encounter, articleCandidates),
			);
		const lexicalStringCandidates = auxiliary
			? {}
			: speculativeLexicalStringCandidates(catalog, input.members);
		for (const [key, candidates] of Object.entries(lexicalStringCandidates))
			questions[`text.${key}`] = lexicalStringQuestion(key, candidates);
		// Only a member spelling a governable preposition can be the one the
		// verb, adjective or noun governs; its complement's case and referent
		// ride along and are consumed only when a member is chosen.
		const governor = verbal
			? { name: "verbal target", policy: "policy.verbalIdentity" }
			: encounter.target.kind === "ADJ"
				? { name: "adjective", policy: "policy.government" }
				: { name: "noun", policy: "policy.government" };
		const governable =
			(verbal || adnominal) && !auxiliary && input.members.length > 1
				? input.members.flatMap((text, index) => {
						const form = text.toLocaleLowerCase("de");
						return isGovernablePreposition(form)
							? [{ index, text, form }]
							: [];
					})
				: [];
		const governedPreposition = governable.length > 0;
		// An adjective, a noun or a Phraseme beside a preposition reads as
		// incomplete unless the question says the governed one belongs to it
		// (ADR 0034); a verb's governed preposition needs no such note.
		if (
			(adnominal || encounter.target.family === "Phraseme") &&
			governedPreposition
		)
			questions.support = choice(
				`Under \`policy\`, can the fixed target in \`markedContext\` support a coherent analysis on \`route\`? Under \`${governor.policy}\`, a supplied member that is the preposition this ${governor.name} lexically governs belongs to the target, wherever it stands.`,
				{
					Supported: "Yes, keep route and membership unchanged",
					Unresolved: "No defensible analysis on the supplied target",
				},
			);
		if (governedPreposition) {
			questions.governedPreposition = choice(
				`Under \`${governor.policy}\`, which supplied member is the preposition this ${governor.name} lexically selects for its complement? A free adjunct preposition, a detached separable prefix or an adposition with its own nominal complement is not governed.`,
				{
					...Object.fromEntries(
						governable.map(({ index, text }) => [
							`member_${index}`,
							`\`members[${index}]\` (${text}) is the lexically governed preposition`,
						]),
					),
					Absent: "No member is a lexically governed preposition",
					Unresolved: "Government cannot be defensibly decided",
				},
			);
			if (governable.some(({ form }) => fixedCaseOf(form) === null))
				questions.governedCase = choice(
					`If a supplied member is the preposition this ${governor.name} lexically governs, which case does that preposition's complement take in \`markedContext\`? Read it from the complement's form when the form shows it; otherwise give the case the ${verbal ? "verb" : governor.name} requires with this preposition.`,
					{
						Acc: "Accusative",
						Dat: "Dative",
						Unresolved: "The case cannot be defensibly decided",
					},
				);
			questions.governedReferent = choice(
				`If a supplied member is the preposition this ${governor.name} lexically governs, does that preposition's complement in \`markedContext\` name a person or a thing?`,
				{
					Someone: "A person or a group of people",
					Something:
						"A thing, place, event, fact, idea or anything that is not a person",
					Unresolved: "What it names cannot be defensibly decided",
				},
			);
		}
		// A free adposition records the case its complement takes here; the
		// ADP Case Table, not this answer, says which cases it allows.
		const adposition = encounter.target.kind === "ADP";
		if (adposition)
			questions.realizedCase = choice(
				"Which case does the complement of this adposition take in `markedContext`? Read it from the complement's form when the form shows it: auf dem Tisch and wegen dem Regen are dative, auf den Tisch is accusative, wegen des Regens is genitive. When the form does not show it, give the case this adposition assigns in this use; a two-way adposition takes accusative for a direction (wohin?) and dative for a location (wo?).",
				{
					Acc: "Accusative",
					Dat: "Dative",
					Gen: "Genitive",
					None: "No case-marked nominal complement: a clause, an adverb or no complement at all",
					Unresolved: "The case cannot be defensibly decided",
				},
			);
		if (referent) questions.referent = referent.question;
		const judge = judgmentCaller(options);
		const state = {
			...input,
			route,
			canonicalFormCandidate,
			canonicalFormAlternatives,
			storedLemmas,
			...(articleCandidates ? nounArticleState(encounter) : {}),
			...(Object.keys(lexicalStringCandidates).length
				? { lexicalStringCandidates }
				: {}),
			policy: {
				...sharedPolicy,
				...(verbal
					? {
							verbalIdentity: verbalIdentityPolicy,
							canonicalExample:
								"In Wir gehen ins Haus, finite gehen has Canonical Form gehen.",
							verbalComposition: verbalCompositionGuidance,
						}
					: {}),
				...(encounter.target.kind === "NOUN"
					? { noun: nounPolicy }
					: {}),
				...(adnominal ? { government: governmentPolicy } : {}),
				...(partial ? { coverage: partialCoveragePolicy } : {}),
				route: routeGuidance[encounter.target.kind] ?? "",
			},
			reviewedIdentities: identities.map((member) => member.lemma),
			...referent?.state,
		};
		const features = yield* judge(
			"resolveGrammar",
			`${route}/features`,
			state,
			questions,
			scope,
			[],
		);
		const result = features.output;
		const upstream = [features.id];
		const consumed = new Set<string>();
		function selected(id: string): string {
			consumed.add(id);
			const answer = result.answers[id];
			if (
				!answer ||
				answer.type !== "choice" ||
				answer.choice === "Unresolved"
			)
				return fail(`Unresolved applicable question ${id}`);
			return answer.choice;
		}
		/** A speculative answer: consumed when applicable, never a failure by itself. */
		function speculative(id: string): string | undefined {
			if (!(id in questions)) return undefined;
			consumed.add(id);
			const answer = result.answers[id];
			return answer?.type === "choice" ? answer.choice : undefined;
		}
		try {
			selected("support");
			// A possessive stem (ihrer: hers, theirs) is one Lemma whatever
			// it refers to, so it never needs the neighbours.
			const referentAnswer = speculative("referent");
			if (
				referentAnswer === "MoreContextRequired" &&
				speculative("lemma.coreFeatures.poss") !== "Yes"
			)
				return { decision: "MoreContextRequired" as const };
			const core: Record<string, unknown> = {};
			const openFeatures: string[] = [];
			const byReferent: string[] = [];
			for (const [path, field] of catalog)
				if (path.startsWith("lemma.coreFeatures.") && !auxiliary) {
					const key = path.slice("lemma.coreFeatures.".length);
					if (
						referent &&
						(referentKeys as readonly string[]).includes(key)
					) {
						byReferent.push(key);
						continue;
					}
					const answer = selected(path);
					if (field.open) {
						core[key] = null;
						if (answer === "Present") openFeatures.push(key);
					} else core[key] = featureValue(answer);
				}
			// The referent's cell settles the coordinates it splits once the
			// rest of the judged Core lands in a group it splits.
			const cell =
				referent &&
				referentAnswer?.startsWith("cell_") &&
				inReferentGroup(referent, core)
					? referent.cells[referentAnswer]
					: undefined;
			for (const key of byReferent) {
				const path = `lemma.coreFeatures.${key}`;
				if (cell) {
					consumed.add(path);
					core[key] = cell[key as keyof typeof cell];
				} else core[key] = featureValue(selected(path));
			}
			const surface: Record<string, unknown> = {
				spelling: selected("spelling"),
				surfaceFeatures:
					selected("historicalStatus") === "Archaic"
						? { historicalStatus: "Archaic" }
						: null,
			};
			if (questions.inflection) {
				surface.inflectionalFeatures = null;
				if (selected("inflection") === "Marked") {
					const bag: Record<string, unknown> = {};
					const form = verbal
						? selected("surface.inflectionalFeatures.verbForm")
						: undefined;
					for (const [path] of catalog)
						if (path.startsWith("surface.inflectionalFeatures.")) {
							const key = path.slice(
								"surface.inflectionalFeatures.".length,
							);
							if (
								encounter.target.kind === "NOUN" &&
								(key === "article" || key === "case")
							) {
								bag[key] = null;
								continue;
							}
							if (verbal && key === "voice") continue;
							if (
								auxiliary &&
								constructionFeature(
									`surface.inflectionalFeatures.${key}`,
								)
							) {
								bag[key] = null;
								continue;
							}
							if (
								verbal &&
								key === "participleForm" &&
								form !== "Part"
							)
								continue;
							if (
								verbal &&
								["tense", "mood", "person", "number"].includes(
									key,
								) &&
								form !== "Fin"
							) {
								bag[key] = null;
								continue;
							}
							if (
								verbal &&
								key === "tense" &&
								selected(
									"surface.inflectionalFeatures.mood",
								) === "Imp"
							) {
								bag[key] = null;
								continue;
							}
							const answer = selected(path);
							bag[key] = featureValue(answer);
						}
					if (verbal)
						bag.voice = bag.passive === null ? null : "Pass";
					surface.inflectionalFeatures = bag;
				}
			}
			const memberOrthographies = input.members.map(
				(_, index) =>
					selected(`orthography_${index}`) as "Standard" | "Typo",
			);
			const normalizationModes = input.members.map((_, index) =>
				selected(`normalization_${index}`),
			);
			// The referent's cell settles a sentence-initial capital: formal Sie
			// keeps it, any other cell has ordinary capitalization.
			if (cell && sentenceInitial && normalizationModes.length === 1) {
				const formal = cell.polite === "Form";
				if (!formal && normalizationModes[0] === "Keep")
					normalizationModes[0] = "LowerInitial";
				if (formal && normalizationModes[0] === "LowerInitial")
					normalizationModes[0] = "Keep";
			}
			const valencyEvidence: NonNullable<
				GrammarOutput["valencyEvidence"]
			> = [];
			let governedPrepositionPosition: number | undefined;
			if (governedPreposition) {
				const answer = selected("governedPreposition");
				if (answer !== "Absent") {
					const position = Number(answer.slice("member_".length));
					const form = governable.find(
						(member) => member.index === position,
					)?.form;
					if (form === undefined)
						return fail("Unaligned governed-preposition evidence");
					const governedCase =
						fixedCaseOf(form) ??
						(selected("governedCase") as "Acc" | "Dat");
					const referent = speculative("governedReferent");
					valencyEvidence.push({
						member: position,
						complement: {
							kind: "Preposition",
							preposition: governablePrepositionLemma(form),
							case: governedCase,
							referent:
								referent === "Someone" ||
								referent === "Something"
									? referent
									: "Either",
						},
						realizedCase: governedCase,
					});
					governedPrepositionPosition = position;
				}
			}
			const normalizedMembers = input.members.map((text, index) =>
				transformed(text, normalizationModes[index]!),
			);
			const needed: Record<string, string> = {};
			for (const [index, mode] of normalizationModes.entries())
				if (mode === "Generate")
					needed[`member_${index}`] =
						`Required normalized text for supplied member ${index}; preserve its inflection and position. Correct only the judged typo or licensed constrained noun suspension.`;
			let coverage = partial
				? (selected("coverage") as "Full" | "Partial")
				: "Full";
			const mechanicalCanonical =
				coverage === "Full" &&
				surface.spelling === "Canonical" &&
				["DiscourseFormula", "Proverb", "Aphorism"].includes(
					encounter.target.kind,
				);
			const copiedCanonical = () =>
				encounter.target.kind === "DiscourseFormula"
					? normalizedMembers.join(" ").toLocaleLowerCase("de")
					: normalizedMembers.join(" ");
			let lemma: GrammarOutput["lemma"];
			if (auxiliary) {
				const identity = selected("identity");
				if (identity === "NoMatch")
					throw new DumgenFailure(
						"CatalogMiss",
						"resolveGrammar",
						"Required AUX identity is absent from the reviewed catalog",
						route,
					);
				const member =
					identities[Number(identity.slice("identity_".length))];
				if (!member) return fail("Missing selected AUX identity");
				lemma = {
					canonicalForm: member.lemma.canonicalForm,
					coreFeatures: member.lemma.coreFeatures,
				};
				recordEvent(scope, "AuthoredIdentity", { lemma: member.lemma });
			} else {
				const identity = mapped
					? yield* resolveAuthoredGrammarIdentity(
							options,
							{
								kind: encounter.target.kind as "DET" | "PRON",
								spelled: normalizedMembers.join(" "),
								core,
								inflection: surface.inflectionalFeatures,
								markedContext: input.markedContext,
								sentenceInitial,
							},
							scope,
							[...upstream],
						)
					: null;
				upstream.push(...(identity?.calls ?? []));
				const member = identity?.member;
				if (member) {
					lemma = {
						canonicalForm: member.lemma.canonicalForm,
						coreFeatures: member.lemma.coreFeatures,
					};
					recordEvent(scope, "AuthoredIdentity", {
						lemma: member.lemma,
					});
				} else if (mechanicalCanonical) {
					lemma = {
						canonicalForm: copiedCanonical(),
						coreFeatures: core,
					};
				} else {
					const canonical = selected("canonical");
					const chosen =
						canonical === "CandidateIsCanonical"
							? canonicalFormCandidate
							: canonical.startsWith("candidate_")
								? canonicalFormAlternatives[
										Number(
											canonical.slice(
												"candidate_".length,
											),
										)
									]
								: undefined;
					// A VERB Canonical Form is infinitive-shaped. A NOUN member
					// copied under a Surface that can inflect it is no headword
					// evidence: jev copies Bücher for Buch. Either rejected text
					// means no exact text is available, so Luna supplies the
					// required missing text (#442 Canonical Form row, #445); code
					// enforcing a domain invariant is not a review judge (ADR
					// 0023). A stored Lemma keeps its headword; generated text is
					// never checked.
					const copiedInflectedNoun = (text: string) =>
						encounter.target.kind === "NOUN" &&
						input.members.includes(text) &&
						!storedLemmas.some(
							(stored) => stored.canonicalForm === text,
						) &&
						possiblyInflectedNoun(text, {
							gender: core.gender,
							number: (
								surface.inflectionalFeatures as Record<
									string,
									unknown
								> | null
							)?.number,
							// Code derives Case from the attached article later;
							// the speculative answer only decides generation.
							case: speculative(
								"surface.inflectionalFeatures.case",
							),
						});
					// A governed preposition never belongs to an adjective's or a
					// noun's headword: stolz auf is stolz (ADR 0034).
					const governedWord =
						adnominal && governedPrepositionPosition !== undefined
							? input.members[
									governedPrepositionPosition
								]?.toLocaleLowerCase("de")
							: undefined;
					const withGovernedPreposition = (text: string) =>
						governedWord !== undefined &&
						text
							.toLocaleLowerCase("de")
							.split(/\s+/u)
							.includes(governedWord);
					const rejection =
						chosen === undefined
							? undefined
							: encounter.target.kind === "VERB" &&
									!infinitiveShaped(chosen)
								? "NonInfinitiveCanonicalForm"
								: copiedInflectedNoun(chosen)
									? "InflectedNounCanonicalForm"
									: withGovernedPreposition(chosen)
										? "GovernedPrepositionCanonicalForm"
										: undefined;
					const rejected = rejection !== undefined;
					if (rejection)
						recordEvent(scope, rejection, {
							rejected: chosen,
							answer: canonical,
						});
					lemma = {
						canonicalForm: rejected ? undefined : chosen,
						coreFeatures: core,
					};
					if (canonical === "CandidateIsNotCanonical" || rejected)
						needed.canonicalForm =
							"Exact dictionary Canonical Form of the fixed supplied identity. Supply only missing text, not grammatical labels.";
				}
			}

			try {
				parse(
					`grammar/${route}`,
					{
						lemma: {
							...lemma,
							canonicalForm: lemma.canonicalForm ?? "pending",
						},
						surface,
						memberOrthographies,
						normalizedMembers,
						realizationCoverage: coverage,
						...(verbal
							? {
									expletiveEvidence: null,
									valencyEvidence: [],
								}
							: {}),
						...(adposition || adnominal
							? { valencyEvidence: [] }
							: {}),
						...(encounter.target.kind === "NOUN"
							? { articleEvidence: null }
							: {}),
					},
					"resolveGrammar",
					true,
				);
			} catch (error) {
				if (!(error instanceof DumgenFailure)) throw error;
				recordEvent(scope, "IncoherentApplicableFeatures", {
					lemma,
					surface,
				});
				return fail(
					"Applicable grammatical answers do not compose into a legal analysis",
				);
			}
			if (Object.keys(needed).length === 1 && needed.canonicalForm) {
				// The route already fixes the Kind, so the headword needs only
				// the occurrence's words: besaß in, besitzen out. A governed
				// preposition never belongs to the headword, so it stays out.
				const generation = yield* executeGeneration(
					options,
					scope,
					{
						stage: "generateCanonicalForm",
						route: `${route}/text`,
						input: normalizedMembers
							.filter(
								(_, index) =>
									index !== governedPrepositionPosition,
							)
							.join(" "),
						systemPrompt: canonicalFormPrompt(
							encounter.target.kind,
						),
						outputFormat: "text",
						configuration: effectiveConfiguration(options, route),
					},
					(raw) => {
						const text = typeof raw === "string" ? raw.trim() : "";
						if (!text || /\n/u.test(text))
							throw new DumgenFailure(
								"InvalidModelOutput",
								"generateCanonicalForm",
								"Expected one Canonical Form",
								`${route}/text`,
							);
						return text;
					},
					[...upstream],
				);
				upstream.push(generation.id);
				lemma.canonicalForm = generation.output;
			} else if (Object.keys(needed).length) {
				const wantsCanonical = Boolean(needed.canonicalForm);
				const wantsMembers =
					Object.keys(needed).length > (wantsCanonical ? 1 : 0);
				const textStage = wantsCanonical
					? "generateCanonicalFormAndNormalizedMembers"
					: "generateNormalizedMembers";
				const invalidText = (message: string) =>
					new DumgenFailure(
						"InvalidModelOutput",
						textStage,
						message,
						`${route}/text`,
					);
				const generation = yield* executeGeneration(
					options,
					scope,
					{
						stage: textStage,
						route: `${route}/text`,
						input: {
							...input,
							route,
							needed,
							...(wantsCanonical
								? {
										judgedCore: core,
										...(governedPrepositionPosition !==
										undefined
											? {
													governedPreposition:
														input.members[
															governedPrepositionPosition
														],
												}
											: {}),
										canonicalFormPolicy:
											canonicalFormGuidance[
												encounter.target.kind
											] ??
											"Canonical Form is the exact dictionary headword.",
									}
								: {}),
							...(wantsMembers
								? {
										judgedSurface: surface,
										memberOrthographies,
										memberPolicy: normalizedMemberGuidance,
									}
								: {}),
						},
						systemPrompt: textSystemPrompt,
						outputSchema: {
							type: "object",
							properties: Object.fromEntries(
								Object.keys(needed).map((key) => [
									key,
									{ type: "string", minLength: 1 },
								]),
							),
							required: Object.keys(needed),
							additionalProperties: false,
						},
						configuration: effectiveConfiguration(options, route),
					},
					(raw) => {
						if (
							!raw ||
							typeof raw !== "object" ||
							Array.isArray(raw)
						)
							throw invalidText("Expected requested text fields");
						const values = raw as Record<string, unknown>;
						if (
							Object.keys(values).length !==
								Object.keys(needed).length ||
							Object.keys(needed).some(
								(key) =>
									typeof values[key] !== "string" ||
									!(values[key] as string).trim() ||
									(key.startsWith("member_") &&
										/\s/u.test(values[key] as string)),
							)
						)
							throw invalidText(
								"Generated text does not match the requested fields",
							);
						return values as Record<string, string>;
					},
					[...upstream],
				);
				upstream.push(generation.id);
				const generated = generation.output;
				if (generated.canonicalForm)
					lemma.canonicalForm = generated.canonicalForm;
				for (const [index] of normalizedMembers.entries())
					if (generated[`member_${index}`])
						normalizedMembers[index] =
							generated[`member_${index}`]!;
			}
			if (mechanicalCanonical) lemma.canonicalForm = copiedCanonical();
			// Speculative lexical strings answered in the first round trip settle
			// the open feature; only unresolved ones need the follow-up.
			const pendingFeatures = openFeatures.filter((key) => {
				const answer = speculative(`text.${key}`);
				const text =
					answer?.startsWith("text_") &&
					lexicalStringCandidates[key]?.[
						Number(answer.slice("text_".length))
					];
				if (!text) return true;
				core[key] = text;
				return false;
			});
			if (pendingFeatures.length) {
				const words = [
					...normalizedMembers,
					...String(lemma.canonicalForm).split(/\s+|\.\.\./u),
				].filter(Boolean);
				const followup: Questions = {};
				const candidates: Record<string, string[]> = {};
				for (const key of pendingFeatures) {
					candidates[key] = [
						...new Set(
							key === "hasSepPrefix"
								? words.flatMap((word) =>
										Array.from(
											{ length: word.length },
											(_, index) =>
												word.slice(0, index + 1),
										),
									)
								: words,
						),
					];
					if (candidates[key]!.length > lexicalStringLimit)
						return fail(
							"Too many complete lexical-string candidates",
						);
					followup[key] = choice(
						`Choose the exact ${key} established by the lexical feature judgment. Prefixes are separable lexical prefixes, never a governed preposition or an adposition with its own complement.`,
						{
							...Object.fromEntries(
								candidates[key]!.map((text, index) => [
									`text_${index}`,
									text,
								]),
							),
							Unresolved:
								"None is defensible; do not revise the prior feature judgment",
						},
					);
				}
				const lexicalStrings = yield* judge(
					"resolveGrammar",
					`${route}/lexical-strings`,
					{
						...state,
						lemma: JSON.stringify(lemma),
						normalizedMembers,
						candidates,
					},
					followup,
					scope,
					[...upstream],
				);
				upstream.push(lexicalStrings.id);
				for (const key of pendingFeatures) {
					const answer = lexicalStrings.output.answers[key];
					if (
						!answer ||
						answer.type !== "choice" ||
						answer.choice === "Unresolved"
					)
						return fail(`Unresolved ${key}`);
					core[key] =
						candidates[key]![
							Number(answer.choice.slice("text_".length))
						];
				}
			}
			const judgedArticle = articleCandidates
				? yield* resolveNounArticle(
						options,
						encounter,
						{
							lemma,
							surface,
							normalizedMembers,
							memberOrthographies,
						},
						{
							candidates: articleCandidates,
							attachment: speculative("attachment"),
							case: speculative(
								"surface.inflectionalFeatures.case",
							),
						},
						scope,
						[...upstream],
					)
				: null;
			const article = judgedArticle?.article;
			if (article) {
				coverage = article.coverage;
			}
			let expletiveEvidence = null;
			if (
				verbal &&
				(surface.inflectionalFeatures as Record<string, unknown> | null)
					?.expletive === "Subject"
			) {
				const positions = normalizedMembers.flatMap((text, index) =>
					text.toLocaleLowerCase("de") === "es" ? [index] : [],
				);
				const [position] = positions;
				if (positions.length !== 1 || position === undefined)
					return fail(
						"Subject es needs one unambiguous owned occurrence",
					);
				const attested = input.members[position];
				const orthography = memberOrthographies[position];
				if (attested === undefined || orthography === undefined)
					return fail("Unaligned subject es evidence");
				normalizedMembers[position] = "es";
				expletiveEvidence = {
					attested,
					orthography,
				};
			}
			if (adposition) {
				// A one-case adposition (`mit` Dat) takes that case whatever the
				// answer says; the judgement decides only where the table allows
				// several (`auf`, `wegen`).
				const answer = selected("realizedCase");
				const allowed = germanAdpositionCases({
					canonicalForm: String(lemma.canonicalForm),
					coreFeatures: lemma.coreFeatures as {
						adpType?: string | null;
					},
				})?.allowed;
				const realizedCase =
					answer !== "None" && allowed?.length === 1
						? allowed[0]
						: answer;
				if (
					realizedCase === "Acc" ||
					realizedCase === "Dat" ||
					realizedCase === "Gen"
				)
					valencyEvidence.push({
						member: null,
						complement: {
							kind: "Case",
							case: realizedCase,
							referent: "Either",
						},
						realizedCase,
					});
			}
			const output = {
				...(verbal || adposition || adnominal
					? { valencyEvidence }
					: {}),
				...(verbal ? { expletiveEvidence } : {}),
				...(encounter.target.kind === "NOUN"
					? { articleEvidence: article?.evidence ?? null }
					: {}),
				lemma,
				surface,
				memberOrthographies,
				normalizedMembers,
				realizationCoverage: coverage,
			};
			try {
				return parse<GrammarOutput>(
					`grammar/${route}`,
					output,
					"resolveGrammar",
					true,
				);
			} catch (error) {
				if (!(error instanceof DumgenFailure)) throw error;
				recordEvent(scope, "IncoherentApplicableFeatures", output);
				return fail(
					"Applicable grammatical answers do not compose into a legal analysis",
				);
			}
		} finally {
			recordEvent(scope, "JudgmentApplicability", {
				consumed: [...consumed],
				ignored: Object.keys(questions).filter(
					(id) => !consumed.has(id),
				),
			});
		}
	});
}
