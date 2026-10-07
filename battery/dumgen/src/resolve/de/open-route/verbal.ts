/**
 * A VERB's satellites (auxiliaries, lexical reflexive, subject es) and
 * separable prefix, its block of the first request and the reading of its
 * answers, and its headword.
 */

import {
	type AuthoredMember,
	authoredRealizations,
	auxiliarySurfaceFeatures,
	germanAdpositionEntry,
} from "dumcorpus/inventories";
import {
	particleForms,
	reflexiveForms,
} from "../../../segment/de/candidates.js";
import { rShortenings } from "../member-spelling.js";
import { auxiliaryUses, fill, question } from "../prompts.js";
import {
	type Answered,
	type Questionnaire,
	UnresolvedAnswer,
} from "../questions.js";
import type { Member, Target } from "../target.js";
import { coordinators } from "./governed.js";
import { fold, numbers, type Shape, spellingOf, type Values } from "./shape.js";

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
export const auxiliaryFeatures: ReadonlyMap<string, Values> = new Map(
	auxiliarySurfaceFeatures.map(({ member, features }) => [
		auxiliaryUse(member),
		features,
	]),
);

/**
 * Each form a lexical reflexive takes, with the case it shows: the one case
 * all its personal-pronoun realizations share (mich Acc, mir Dat), none when
 * they differ (sich, uns, euch), so jev is asked.
 */
export const reflexives: ReadonlyMap<string, "Acc" | "Dat" | undefined> =
	new Map(
		[...reflexiveForms].map((form) => {
			const shown = new Set(
				authoredRealizations.flatMap(({ member, spelled }) => {
					const features = member.lemma.coreFeatures as Readonly<
						Record<string, unknown>
					>;
					return member.lemma.kind === "PRON" &&
						features.pronType === "Prs" &&
						fold(spelled) === form
						? [features.case]
						: [];
				}),
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

/**
 * The separable prefixes a VERB unit may carry: those that open a particle
 * slot, and da and leid (daliegen, leidtun), which open none. The other
 * prefixes that open no slot (bekannt, gut, …) are not offered (#1057).
 */
export const prefixParticles: ReadonlySet<string> = new Set([
	...particleForms,
	"da",
	"leid",
]);
const isParticle = (word: string) => prefixParticles.has(word);

/**
 * The separable prefixes a VERB unit could carry, longest first: each
 * particle member standing apart from the verb, the words a shortened one
 * stands for in its place (rein is herein or hinein, never a prefix of its
 * own: Rule de/r-adverb-is-her-or-hin-shorthand), and each particle a
 * member's word begins with. A member that is no particle, such as the
 * verb's own participle, is never offered whole.
 */
function prefixCandidates(target: Target, skip: ReadonlySet<number>) {
	const found = new Set<string>();
	for (const member of target.members) {
		if (skip.has(member.position)) continue;
		const word = fold(spellingOf(member));
		if (
			target.members.length > 1 &&
			member.spelling?.orthography === "Shorthand"
		)
			for (const surface of member.spelling.surfaces)
				found.add(fold(surface));
		else if (
			target.members.length > 1 &&
			/^\p{L}+$/u.test(word) &&
			isParticle(word)
		)
			found.add(word);
		for (let length = word.length - 2; length >= 2; length--) {
			const prefix = word.slice(0, length);
			if (isParticle(prefix)) found.add(prefix);
		}
	}
	return [...found].sort((left, right) => right.length - left.length);
}

/** A VERB unit's satellite members: its auxiliaries, lexical reflexive and subject es. */
export type VerbalSatellites = {
	readonly auxiliaries: readonly {
		readonly member: Member;
		readonly uses: readonly string[];
	}[];
	readonly reflexive: Member | undefined;
	/** Every member that spells es; the subject es when there is one only. */
	readonly expletives: readonly Member[];
	readonly expletive: Member | undefined;
};

/** What a VERB's block asked: its satellites and the separable prefixes offered. */
export type VerbalPlan = VerbalSatellites & {
	readonly prefixes: readonly string[];
};

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
	const reflexive =
		shape.verbal && shape.lexeme
			? target.members.find((member) => reflexives.has(fold(member.text)))
			: undefined;
	return {
		auxiliaries,
		reflexive,
		expletives,
		expletive: expletives.length === 1 ? expletives[0] : undefined,
	};
}

/**
 * Asks a VERB's block: each auxiliary's use, a reflexive's case its form
 * leaves open, a Locution's subject es, the separable prefix among the
 * members no satellite `taken`, and the verb's form.
 */
export function askVerbal(
	questionnaire: Questionnaire,
	target: Target,
	shape: Shape,
	satellites: VerbalSatellites,
	taken: ReadonlySet<number>,
): VerbalPlan {
	const { auxiliaries, reflexive, expletive } = satellites;
	for (const { member, uses } of auxiliaries)
		questionnaire.choice(
			`aux_m${member.position}`,
			fill(question.auxiliary, { m: member.ref }),
			{
				...Object.fromEntries(
					uses.map((use, index) => [
						`u${index}`,
						auxiliaryUses[use] ?? use,
					]),
				),
				Main: question.auxiliaryMain,
			},
			["verbal"],
		);
	if (reflexive && reflexives.get(fold(reflexive.text)) === undefined)
		questionnaire.choice(
			"reflexive",
			fill(question.reflexive, { m: reflexive.ref }),
			{ Acc: "Accusative", Dat: "Dative" },
			["verbCore"],
		);
	if (expletive && shape.locution)
		questionnaire.choice(
			"expletive",
			fill(question.expletive, { m: expletive.ref }),
			{
				Subject: "Yes: the subject es, referring to nothing",
				None: "No: an object or a fixed word of the expression",
			},
		);
	const prefixes = shape.lexeme ? prefixCandidates(target, taken) : [];
	if (prefixes.length > 0)
		questionnaire.choice(
			"prefix",
			question.prefix,
			{
				...Object.fromEntries(
					prefixes.map((prefix, index) => [`p${index}`, prefix]),
				),
				None: "No separable prefix: the verb's dictionary infinitive is written without any of these",
			},
			["verbCore"],
		);
	askVerbForm(questionnaire);
	return { ...satellites, prefixes };
}

/** Asks a VERB's form, and the mood, tense, person, number and participle it may take. */
function askVerbForm(questionnaire: Questionnaire): void {
	questionnaire.choice(
		"verbForm",
		question.verbForm,
		{
			Fin: "Finite: its own finite verb or auxiliary, an imperative included",
			Inf: "An infinitive, a separate modal's finite form aside",
			Part: "A participle, without its own finite or infinitive auxiliary",
		},
		["verbal"],
	);
	questionnaire.choice("mood", question.mood, {
		Ind: "Indicative",
		Sub: "Subjunctive, Konjunktiv I or II",
		Imp: "Imperative",
	});
	questionnaire.choice("tense", question.tense, {
		Pres: "Present",
		Past: "Past",
	});
	questionnaire.choice("person", question.person, {
		"1": "First person",
		"2": "Second person",
		"3": "Third person, formal Sie included",
	});
	questionnaire.choice("number", question.verbNumber, numbers);
	questionnaire.choice("participle", question.participle, {
		Present: "Present participle",
		Past: "Past participle",
	});
}

/**
 * Reads a VERB's block: its separable prefix and lexical reflexive, its
 * subject es, its inflection unless it is cited, and the reading a
 * shortened particle takes from the prefix judged for it.
 */
export function readVerbal(
	target: Target,
	verbal: VerbalPlan,
	shape: Shape,
	answered: Answered,
	cited: boolean,
): {
	readonly core: Values;
	readonly inflection: Values | null;
	readonly expletive: Member | undefined;
	readonly readings: ReadonlyMap<number, string>;
} {
	const core: Values = {};
	const readings = new Map<number, string>();
	if (shape.lexeme) {
		const prefix = verbal.prefixes.length
			? prefixAnswer(target, verbal.prefixes, answered)
			: "None";
		core.hasSepPrefix =
			prefix === "None"
				? null
				: (verbal.prefixes[Number(prefix.slice(1))] ?? null);
		// A shortened particle stands for the prefix judged for it
		// (rein is herein when the verb is hereinkommen).
		for (const member of target.members)
			if (
				member.spelling?.orthography === "Shorthand" &&
				typeof core.hasSepPrefix === "string" &&
				member.spelling.surfaces.length > 1 &&
				member.spelling.surfaces.includes(core.hasSepPrefix)
			)
				readings.set(member.segment, core.hasSepPrefix);
		const reflexive = verbal.reflexive;
		core.lexicallyReflexive = reflexive
			? (reflexives.get(fold(reflexive.text)) ??
				answered.pick("reflexive"))
			: null;
	}
	const expletive =
		verbal.expletive &&
		(shape.lexeme || answered.pick("expletive") === "Subject")
			? verbal.expletive
			: undefined;
	return {
		core,
		inflection: cited
			? null
			: verbalInflection(verbal, answered, expletive),
		expletive,
		readings,
	};
}

/** A verbal Surface's features, from its form questions and its auxiliaries' uses. */
function verbalInflection(
	verbal: VerbalSatellites,
	answered: Answered,
	expletive: Member | undefined,
): Values {
	const composition: Values = {
		perfect: null,
		future: null,
		passive: null,
		voice: null,
	};
	for (const { member, uses } of verbal.auxiliaries) {
		const answer = answered.pick(`aux_m${member.position}`);
		if (answer === "Main") continue;
		const use = uses[Number(answer.slice(1))];
		for (const [feature, value] of Object.entries(
			(use && auxiliaryFeatures.get(use)) ?? {},
		)) {
			if (composition[feature] !== null && composition[feature] !== value)
				throw new UnresolvedAnswer(
					"The auxiliaries' uses do not compose",
				);
			composition[feature] = value;
		}
	}
	const verbForm = answered.pick("verbForm");
	const finite = verbForm === "Fin";
	const mood = finite ? answered.pick("mood") : null;
	const number = finite ? answered.pick("number") : null;
	const person = finite ? answered.pick("person") : null;
	// A subject es takes a finite verb in the 3rd person singular, never
	// an imperative: jev's agreement against it is a clash of answers.
	if (expletive && finite && (person !== "3" || number !== "Sing"))
		throw new UnresolvedAnswer(
			"The subject es clashes with the verb's agreement",
		);
	if (expletive && mood === "Imp")
		throw new UnresolvedAnswer("The subject es clashes with an imperative");
	return {
		mood,
		number,
		person,
		tense: finite && mood !== "Imp" ? answered.pick("tense") : null,
		verbForm,
		...(verbForm === "Part"
			? { participleForm: answered.peek("participle") ?? null }
			: {}),
		expletive: expletive ? "Subject" : null,
		...composition,
	};
}

/**
 * A VERB's Canonical Form as its judged Core Features require it (Rule
 * de/verb-core-features, de/canonical-form-is-the-headword): the
 * infinitive with its separable prefix and, for a lexical reflexive, sich
 * before it. Luna's form is kept when it already has both. A prefix it
 * left out is written on, over the r- shortening Luna wrote for it
 * (reinkommen is hereinkommen) or over a shorter particle that ends the
 * prefix (umkommen is herumkommen).
 */
export function verbHeadword(form: string, core: Values): string {
	const reflexive = /^sich\s+/u.test(form) || core.lexicallyReflexive;
	let verb = form.replace(/^sich\s+/u, "");
	const prefix = core.hasSepPrefix;
	if (typeof prefix === "string" && !fold(verb).startsWith(fold(prefix))) {
		const folded = fold(verb);
		const shortening = Object.entries(rShortenings).find(
			([word, expansions]) =>
				expansions.includes(fold(prefix)) && folded.startsWith(word),
		)?.[0];
		const tail = [...fold(prefix)]
			.map((_, start) => fold(prefix).slice(start))
			.find(
				(ending) =>
					ending.length >= 2 &&
					ending.length < prefix.length &&
					isParticle(ending) &&
					folded.startsWith(ending),
			);
		verb = `${prefix}${verb.slice(shortening?.length ?? tail?.length ?? 0)}`;
	}
	return reflexive ? `sich ${verb}` : verb;
}

/**
 * The prefix answer. A shortened r- word in the verbal bracket is the
 * particle of its her- or hin- word's particle verb (Rule
 * de/r-adverb-is-her-or-hin-shorthand), so when jev leaves the prefix
 * Unresolved, the likelier of those two it weighed is read; None is never
 * one of them.
 */
function prefixAnswer(
	target: Target,
	prefixes: readonly string[],
	answered: Answered,
): string {
	const governed = (word: string) =>
		target.members.some(
			(member) =>
				fold(spellingOf(member)) === word &&
				answered.peek(`governed_m${member.position}`) === "Governed",
		);
	const settled = answered.peek("prefix");
	// A preposition the verb governs is never its prefix (Rule
	// de/verb-core-features): warten auf is warten.
	if (settled !== undefined && settled !== "None") {
		const prefix = prefixes[Number(settled.slice(1))];
		return prefix !== undefined && governed(prefix) ? "None" : settled;
	}
	// A particle standing apart that segmentation put in the VERB unit, and
	// that the verb does not govern, is its separable prefix: it belongs to
	// the verb's Lemma, and only the prefix can (de/verb-core-features,
	// de/bracket-particle-or-circumposition): tut … leid is leidtun. A
	// preposition followed by a word has its own complement and is never
	// the prefix (sich mit ihm zanken; de/verb-core-features).
	const ownComplement = (member: Member) => {
		if (
			germanAdpositionEntry({
				family: "Lexeme",
				canonicalForm: fold(member.text),
			}) === null
		)
			return false;
		const next = target.segments
			.slice(member.segment + 1)
			.find((segment) => segment.kind !== "Whitespace");
		// A coordinating conjunction or another preposition after it opens
		// no complement of its own (gingen … entlang und spazierten; liefen
		// den Fluss entlang bis zur Brücke).
		return (
			next?.kind === "ResolvableText" &&
			!coordinators.has(fold(next.text)) &&
			germanAdpositionEntry({
				family: "Lexeme",
				canonicalForm: fold(next.text),
			}) === null
		);
	};
	const standing = prefixes.flatMap((prefix, index) =>
		target.members.length > 1 &&
		target.members.some(
			(member) =>
				fold(spellingOf(member)) === prefix &&
				member.spelling === undefined &&
				!ownComplement(member),
		) &&
		!governed(prefix)
			? [`p${index}`]
			: [],
	);
	if (settled === "None")
		return standing.length === 1 ? (standing[0] as string) : "None";
	const expansions = new Set(
		target.members.flatMap((member) =>
			member.spelling?.orthography === "Shorthand" &&
			member.spelling.surfaces.some((surface) => surface in shortenedFrom)
				? member.spelling.surfaces
				: [],
		),
	);
	const likeliest = answered.alternatives("prefix", 0).find((option) => {
		const prefix = prefixes[Number(option.slice(1))];
		return prefix !== undefined && expansions.has(prefix);
	});
	return likeliest ?? answered.pick("prefix");
}

/** Each her- or hin- word an r- shortening stands for. */
const shortenedFrom: Readonly<Record<string, string>> = Object.fromEntries(
	Object.entries(rShortenings).flatMap(([word, expansions]) =>
		expansions.map((expansion) => [expansion, word]),
	),
);

/**
 * Why a VERB's headword Luna wrote on the guess cannot stand: it carries a
 * sich or a separable prefix jev judged away, which `verbHeadword` adds
 * but never takes off.
 */
export function verbGuessMisses(
	form: string,
	core: Values,
	prefixes: readonly string[],
): string | undefined {
	if (/^sich\s/u.test(form) && !core.lexicallyReflexive)
		return "jev judged the verb not lexically reflexive";
	const bare = fold(form.replace(/^sich\s+/u, ""));
	return core.hasSepPrefix === null &&
		prefixes.some((prefix) => bare.startsWith(fold(prefix)))
		? "jev judged the verb without a separable prefix"
		: undefined;
}
