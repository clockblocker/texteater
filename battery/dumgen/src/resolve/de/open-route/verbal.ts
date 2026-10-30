/**
 * A VERB's satellites (auxiliaries, lexical reflexive, subject es) and
 * separable prefix, its block of the first request and the reading of its
 * answers, its headword, and the Reflexive its valency evidence names
 * (ADR 0052).
 */

import {
	type AuthoredMember,
	authoredRealizations,
	auxiliarySurfaceFeatures,
	germanAdpositionAllowedCases,
	germanAdpositionEntry,
} from "dumcorpus/inventories";
import type * as Dumling from "dumling/types";
import * as Result from "effect/Result";
import {
	reflexiveForms,
	withoutReflexive,
} from "../../../segment/de/candidates.js";
import { rShortenings } from "../member-spelling.js";
import { auxiliaryUses, fill, options, question } from "../prompts.js";
import {
	type Answered,
	answerReader,
	type Choice,
	type ChoiceOf,
	type Questionnaire,
	type ReaderBody,
	type Unresolved,
	unresolved,
} from "../questions.js";
import type { Member, Target } from "../target.js";
import type { GovernedQuestions } from "./governed.js";
import { prefixAnswer } from "./prefix-answer.js";
import { isParticle, prefixCandidates } from "./separable-prefix.js";
import { fold, type Shape, spellingOf, type ValencyEvidence } from "./shape.js";

/** A VERB Lexeme's Core Features; a VERB Locution has none. */
export type VerbCore = Dumling.Lemma<"de", "Lexeme", "VERB">["coreFeatures"];

/** A verbal Surface's features, Lexeme or Locution. */
export type VerbInflection = NonNullable<
	Dumling.Surface<"de", "Lexeme" | "Locution", "VERB">["inflectionalFeatures"]
>;

/**
 * The voice a verbal Surface takes, with the passive that goes with it:
 * none, a process or recipient passive, or the causative.
 */
type Voice = VerbInflection extends infer Features
	? Features extends VerbInflection
		? Pick<Features, "passive" | "voice">
		: never
	: never;

/** The features one auxiliary use sets, as dumcorpus authors them. */
type AuxiliaryFeatures = (typeof auxiliarySurfaceFeatures)[number]["features"];

/** An authored AUX Reading's use, by Canonical Form and Emoji Description (`werden 🔄`). */
export const auxiliaryUse = ({ lemma, reading }: AuthoredMember) =>
	`${lemma.canonicalForm} ${reading.emojiDescription}`;

/** The authored AUX uses a member's spelling realizes, by Canonical Form and Emoji Description. */
function auxiliaryUsesOf(member: Member): readonly string[] {
	const spelled = fold(member.text);
	return [
		...new Set(
			authoredRealizations
				.filter(
					(realization) =>
						realization.member.lemma.kind === "AUX" &&
						fold(realization.spelled) === spelled,
				)
				.map(({ member: authored }) => auxiliaryUse(authored)),
		),
	].filter((use) => use in auxiliaryUses);
}

/**
 * The Surface features an auxiliary's use makes (ADR 0022, ADR 0026), by
 * use, as dumcorpus authors them for its AUX members.
 */
export const auxiliaryFeatures: ReadonlyMap<string, AuxiliaryFeatures> =
	new Map(
		auxiliarySurfaceFeatures.map(({ member, features }) => [
			auxiliaryUse(member),
			features,
		]),
	);

/**
 * Each form a lexical reflexive takes, with the case it shows: the one case
 * all its personal-pronoun realizations share (mich Acc, mir Dat), none when
 * they differ (sich, uns, euch): the form hides it.
 */
export const reflexives: ReadonlyMap<string, "Acc" | "Dat" | undefined> =
	new Map(
		[...reflexiveForms].map((form) => {
			const shown = new Set(
				authoredRealizations.flatMap(
					({ member: { lemma }, spelled }) =>
						lemma.family === "Lexeme" &&
						lemma.kind === "PRON" &&
						lemma.coreFeatures.pronType === "Prs" &&
						fold(spelled) === form
							? [lemma.coreFeatures.case]
							: [],
				),
			);
			const [only] = shown;
			return [
				form,
				shown.size === 1 && (only === "Acc" || only === "Dat")
					? only
					: undefined,
			];
		}),
	);

/** Whether a member spells es, a clitic 's that may stand for it included. */
const spellsEs = (member: Member) =>
	fold(spellingOf(member)) === "es" ||
	(member.spelling?.surfaces.includes("es") ?? false);

/** An auxiliary member, and the authored AUX uses its spelling realizes. */
type Auxiliary = { readonly member: Member; readonly uses: readonly string[] };

/**
 * A VERB unit's satellite members: its auxiliaries, lexical reflexive and
 * subject es. A Lexeme's or Locution's reflexive member is lexical, since
 * segmentation leaves a free one a unit of its own
 * (de/verb-owns-its-scattered-members).
 */
export type VerbalSatellites = {
	readonly auxiliaries: readonly Auxiliary[];
	readonly reflexive: Member | undefined;
	/**
	 * The preposition a verbal Locution's reflexive is the object of, inside
	 * its fixed phrase (`außer sich sein`): the member right before it.
	 */
	readonly reflexivePreposition: Preposition | undefined;
	/** Every member that spells es; the subject es when there is one only. */
	readonly expletives: readonly Member[];
	readonly expletive: Member | undefined;
};

/** What a VERB's block asked: its satellites, the separable prefixes offered, and the questions. */
export type VerbalPlan = Omit<VerbalSatellites, "auxiliaries"> &
	VerbFormQuestions & {
		/** Each auxiliary, with the question of its use. */
		readonly auxiliaries: readonly (Auxiliary & { readonly use: Choice })[];
		/** Whether a Locution's es is its subject es. */
		readonly subjectEs: ChoiceOf<typeof options.expletive> | undefined;
		readonly prefixes: readonly string[];
		readonly prefix: Choice | undefined;
	};

/** A member preposition, and the cases the ADP Case Table lets it take. */
type Preposition = {
	readonly member: Member;
	readonly canonicalForm: string;
	readonly cases: readonly string[];
};

/**
 * The preposition a verbal Locution's reflexive is the object of: the
 * member right before it, with nothing but space between, that the ADP
 * Case Table lists (ADR 0052, ADR 0053).
 */
function prepositionBefore(
	target: Target,
	reflexive: Member,
): Preposition | undefined {
	const member = target.members[reflexive.position - 1];
	if (
		!member ||
		target.segments
			.slice(member.segment + 1, reflexive.segment)
			.some((segment) => segment.kind === "ResolvableText")
	)
		return undefined;
	const canonicalForm = fold(spellingOf(member));
	const entry = germanAdpositionEntry({ family: "Lexeme", canonicalForm });
	return entry
		? { member, canonicalForm, cases: germanAdpositionAllowedCases(entry) }
		: undefined;
}

/** The reflexive case a preposition's table leaves, when it leaves one. */
function prepositionCase(
	preposition: Preposition | undefined,
): "Acc" | "Dat" | undefined {
	const cases = (preposition?.cases ?? []).filter(
		(grammaticalCase): grammaticalCase is "Acc" | "Dat" =>
			grammaticalCase === "Acc" || grammaticalCase === "Dat",
	);
	return cases.length === 1 ? cases[0] : undefined;
}

/** A unit's verbal satellites, none off a VERB route. */
export function verbalSatellites(
	target: Target,
	shape: Shape,
): VerbalSatellites {
	const expletives = shape.verbal ? target.members.filter(spellsEs) : [];
	const auxiliaries =
		shape.verbal && target.members.length > 1
			? target.members.flatMap((member) => {
					const uses = auxiliaryUsesOf(member);
					return uses.length > 0 ? [{ member, uses }] : [];
				})
			: [];
	const reflexive = shape.verbal
		? target.members.find((member) => reflexives.has(fold(member.text)))
		: undefined;
	return {
		auxiliaries,
		reflexive,
		reflexivePreposition:
			reflexive && shape.locution
				? prepositionBefore(target, reflexive)
				: undefined,
		expletives,
		expletive: expletives.length === 1 ? expletives[0] : undefined,
	};
}

/**
 * Asks a VERB's block: each auxiliary's use, a Locution's subject es, the
 * separable prefix among the members no satellite `taken`, and the verb's
 * form.
 */
export function askVerbal(
	questionnaire: Questionnaire,
	target: Target,
	shape: Shape,
	satellites: VerbalSatellites,
	taken: ReadonlySet<number>,
): VerbalPlan {
	const { expletive } = satellites;
	const auxiliaries = satellites.auxiliaries.map((auxiliary) => ({
		...auxiliary,
		use: questionnaire.choice(
			`aux_m${auxiliary.member.position}`,
			fill(question.auxiliary, { m: auxiliary.member.ref }),
			{
				...Object.fromEntries(
					auxiliary.uses.map((use, index) => [
						`u${index}`,
						auxiliaryUses[use] ?? use,
					]),
				),
				...options.auxiliary,
			},
			["verbal"],
		),
	}));
	const subjectEs =
		expletive && shape.locution
			? questionnaire.choice(
					"expletive",
					fill(question.expletive, { m: expletive.ref }),
					options.expletive,
				)
			: undefined;
	const prefixes = shape.lexeme ? prefixCandidates(target, taken) : [];
	const prefix =
		prefixes.length > 0
			? questionnaire.choice(
					"prefix",
					question.prefix,
					{
						...Object.fromEntries(
							prefixes.map((prefix, index) => [
								`p${index}`,
								prefix,
							]),
						),
						...options.prefix,
					},
					["verbCore"],
				)
			: undefined;
	return {
		...satellites,
		auxiliaries,
		subjectEs,
		prefixes,
		prefix,
		...askVerbForm(questionnaire),
	};
}

/** The questions of a VERB's form, and of the mood, tense, person, number and participle it may take. */
type VerbFormQuestions = ReturnType<typeof askVerbForm>;

/** Asks a VERB's form, and the mood, tense, person, number and participle it may take. */
function askVerbForm(questionnaire: Questionnaire) {
	return {
		verbForm: questionnaire.choice(
			"verbForm",
			question.verbForm,
			options.verbForm,
			["verbal"],
		),
		mood: questionnaire.choice("mood", question.mood, options.mood),
		tense: questionnaire.choice("tense", question.tense, options.tense),
		person: questionnaire.choice("person", question.person, options.person),
		number: questionnaire.choice(
			"number",
			question.verbNumber,
			options.number,
		),
		participle: questionnaire.choice(
			"participle",
			question.participle,
			options.participle,
		),
	};
}

/**
 * Reads a VERB's block: its separable prefix, its lexical reflexive's
 * evidence, its subject es or a Locution's referential one, its
 * inflection unless it is cited, and the
 * reading a shortened particle takes from the prefix judged for it.
 */
export const readVerbal = answerReader(function* (
	target: Target,
	verbal: VerbalPlan,
	shape: Shape,
	governable: readonly GovernedQuestions[],
	answered: Answered,
	cited: boolean,
): ReaderBody<{
	readonly core: VerbCore | Record<string, never>;
	readonly inflection: VerbInflection | null;
	readonly expletive: Member | undefined;
	/** A Locution's es judged a referential subject: a free unit, no word of the Lemma (ADR 0003). */
	readonly referential: Member | undefined;
	readonly reflexive: ValencyEvidence | undefined;
	readonly readings: ReadonlyMap<number, string>;
}> {
	let core: VerbCore | Record<string, never> = {};
	const readings = new Map<number, string>();
	if (shape.lexeme) {
		const prefix = verbal.prefix
			? yield* prefixAnswer(
					target,
					verbal.prefixes,
					verbal.prefix,
					governable,
					answered,
				)
			: "None";
		const hasSepPrefix =
			prefix === "None"
				? null
				: (verbal.prefixes[Number(prefix.slice(1))] ?? null);
		// A shortened particle stands for the prefix judged for it
		// (rein is herein when the verb is hereinkommen).
		for (const member of target.members)
			if (
				member.spelling?.orthography === "Shorthand" &&
				hasSepPrefix !== null &&
				member.spelling.surfaces.length > 1 &&
				member.spelling.surfaces.includes(hasSepPrefix)
			)
				readings.set(member.segment, hasSepPrefix);
		core = { hasSepPrefix };
	}
	const subjectEs = verbal.subjectEs
		? yield* answered.pick(verbal.subjectEs)
		: undefined;
	const expletive =
		verbal.expletive && (shape.lexeme || subjectEs === "Subject")
			? verbal.expletive
			: undefined;
	return {
		referential: subjectEs === "Referential" ? verbal.expletive : undefined,
		core,
		inflection: cited
			? null
			: yield* verbalInflection(verbal, answered, expletive),
		expletive,
		reflexive: reflexiveEvidence(verbal),
		readings,
	};
});

/**
 * The valency evidence a lexical reflexive member gives (ADR 0052): its
 * Reflexive complement, with its case only where the occurrence shows it,
 * through its form (mich, mir) or a fixed phrase's preposition that leaves
 * it one case (`außer sich`). sich, uns and euch hide the case, so it is
 * left out: the Reading's frame holds it. A reflexive inside a fixed phrase
 * names the preposition it is the object of.
 */
function reflexiveEvidence(verbal: VerbalPlan): ValencyEvidence | undefined {
	const { reflexive, reflexivePreposition } = verbal;
	if (!reflexive) return undefined;
	const governedCase =
		reflexives.get(fold(reflexive.text)) ??
		prepositionCase(reflexivePreposition);
	const preposition = reflexivePreposition
		? {
				preposition: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "ADP",
					canonicalForm: reflexivePreposition.canonicalForm,
					coreFeatures: {},
				} as const,
			}
		: {};
	return governedCase === undefined
		? {
				member: reflexive.position,
				complement: { kind: "Reflexive", ...preposition },
			}
		: {
				member: reflexive.position,
				complement: { kind: "Reflexive", governedCase, ...preposition },
				realizedCase: governedCase,
			};
}

/**
 * The voice an auxiliary use sets, with the passive that goes with it:
 * none, a process or recipient passive, or the causative. A use that sets
 * another pairing has no verbal Surface in Dumling: a bug in the table.
 */
function voiceOf(features: AuxiliaryFeatures): Voice | undefined {
	const { passive, voice } = features;
	if (voice === undefined && passive === undefined) return undefined;
	if (voice === "Pass" && passive !== undefined) return { passive, voice };
	if (voice === "Cau" && passive === undefined)
		return { passive: null, voice };
	throw Error(`An auxiliary use sets voice ${voice} with passive ${passive}`);
}

/** One composed feature: a value two uses set differently is a clash. */
function composed<Value>(
	was: Value | null,
	now: Value | undefined,
	same: (left: Value, right: Value) => boolean = Object.is,
): Result.Result<Value | null, Unresolved> {
	if (now === undefined) return Result.succeed(was);
	if (was !== null && !same(was, now))
		return unresolved("The auxiliaries' uses do not compose");
	return Result.succeed(now);
}

/** A verbal Surface's features, from its form questions and its auxiliaries' uses. */
const verbalInflection = answerReader(function* (
	verbal: VerbalPlan,
	answered: Answered,
	expletive: Member | undefined,
): ReaderBody<VerbInflection> {
	let perfect: VerbInflection["perfect"] = null;
	let future: VerbInflection["future"] = null;
	let voiced: Voice | null = null;
	for (const { uses, use: asked } of verbal.auxiliaries) {
		const answer = yield* answered.pick(asked);
		if (answer === "Main") continue;
		const use = uses[Number(answer.slice(1))];
		const features =
			(use === undefined ? undefined : auxiliaryFeatures.get(use)) ?? {};
		perfect = yield* composed(perfect, features.perfect);
		future = yield* composed(future, features.future);
		voiced = yield* composed(
			voiced,
			voiceOf(features),
			(left, right) =>
				left.passive === right.passive && left.voice === right.voice,
		);
	}
	const composition = {
		perfect,
		future,
		...(voiced ?? { passive: null, voice: null }),
	};
	const subject = expletive ? "Subject" : null;
	const verbForm = yield* answered.pick(verbal.verbForm);
	if (verbForm === "Inf")
		return {
			mood: null,
			number: null,
			person: null,
			tense: null,
			verbForm,
			expletive: subject,
			...composition,
		};
	if (verbForm === "Part")
		return {
			mood: null,
			number: null,
			person: null,
			tense: null,
			verbForm,
			participleForm: answered.peek(verbal.participle) ?? null,
			expletive: subject,
			...composition,
		};
	const mood = yield* answered.pick(verbal.mood);
	const number = yield* answered.pick(verbal.number);
	const person = yield* answered.pick(verbal.person);
	// A subject es takes a finite verb in the 3rd person singular, never
	// an imperative: jev's agreement against it is a clash of answers.
	if (expletive && (person !== "3" || number !== "Sing"))
		return yield* unresolved(
			"The subject es clashes with the verb's agreement",
		);
	if (expletive && mood === "Imp")
		return yield* unresolved("The subject es clashes with an imperative");
	if (mood === "Imp")
		return {
			mood,
			number,
			person,
			tense: null,
			verbForm,
			expletive: subject,
			...composition,
		};
	return {
		mood,
		number,
		person,
		tense: yield* answered.pick(verbal.tense),
		verbForm,
		expletive: subject,
		...composition,
	};
});

/** The VERB Core Features a headword reads, absent on a Locution. */
type VerbCoreRead = {
	readonly [Feature in keyof VerbCore]?: string | null;
};

/**
 * A VERB's Canonical Form as its judged Core Features require it (Rule
 * de/verb-core-features, de/canonical-form-is-the-headword): the
 * infinitive with its separable prefix, never a lexical reflexive (ADR
 * 0052). Luna's form is kept when it already has its prefix. A prefix it
 * left out is written on, over the r- shortening Luna wrote for it
 * (reinkommen is hereinkommen) or over a shorter particle that ends the
 * prefix (umkommen is herumkommen).
 */
export function verbHeadword(form: string, core: VerbCoreRead): string {
	let verb = withoutReflexive(form);
	const prefix = core.hasSepPrefix;
	if (typeof prefix === "string" && !fold(verb).startsWith(fold(prefix))) {
		const folded = fold(verb);
		const shortening = Object.entries(rShortenings).find(
			([word, expansions]) =>
				expansions.includes(fold(prefix)) && folded.startsWith(word),
		)?.[0];
		const foldedPrefix = fold(prefix);
		const tail = Array.from({ length: foldedPrefix.length }, (_, start) =>
			foldedPrefix.slice(start),
		).find(
			(ending) =>
				ending.length >= 2 &&
				ending.length < prefix.length &&
				isParticle(ending) &&
				folded.startsWith(ending),
		);
		verb = `${prefix}${verb.slice(shortening?.length ?? tail?.length ?? 0)}`;
	}
	return verb;
}

/**
 * Why a VERB's headword Luna wrote on the guess cannot stand: it carries a
 * separable prefix jev judged away, which `verbHeadword` adds but never
 * takes off.
 */
export function verbGuessMisses(
	form: string,
	core: VerbCoreRead,
	prefixes: readonly string[],
): string | undefined {
	const bare = fold(withoutReflexive(form));
	return core.hasSepPrefix === null &&
		prefixes.some((prefix) => bare.startsWith(fold(prefix)))
		? "jev judged the verb without a separable prefix"
		: undefined;
}
