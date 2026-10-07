/**
 * Grammatical Resolution of a unit on an open route: everything but the
 * closed DET and PRON Lexemes. One jev request (`grammar`) judges what
 * neither the unit nor dumcorpus's tables already fix: a member's Typo or
 * Shorthand, the Surface's spelling, the route's Core Features, its
 * inflection, the auxiliaries' uses, the prepositions a head governs,
 * coverage. Then, side by side, a NOUN's Case question over the cells its
 * article and form leave open, when more than one remains (#625), and
 * Luna's Canonical Form and spellings (#862). Luna is asked while jev
 * judges, on the guess that jev changes nothing Luna reads; when it does,
 * Luna is asked again with jev's answers. Code derives the rest: the
 * article's cell and evidence (#681), perfect, future, passive and
 * causative from the auxiliaries (#686), a lexical reflexive's case where
 * its form shows it, a VERB's subject es, an ADP's case where the ADP Case
 * Table allows one.
 */

import {
	germanAdpositionAllowedCases,
	germanAdpositionEntry,
	germanParticles,
	isGermanPluralOnlyNoun,
} from "dumcorpus/inventories";
import { lemmaIdentityKey } from "dumling";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import type * as Scope from "effect/Scope";
import type { OperationScope } from "../../call.js";
import { askLuna, type LunaSettings } from "../../luna-call.js";
import type { Ask, AskFailure } from "../../segment/ask.js";
import { draftsEmojiDescription } from "../reading.js";
import type { LemmaCandidate } from "../types.js";
import {
	canonicalFormRequest,
	checkWritten,
	hintsFor,
	type Judged,
	type Written,
} from "./canonical-form.js";
import { guardedHeadword } from "./headword-guards.js";
import { attestedMember, type MemberOrthography } from "./member-spelling.js";
import { numeralWord } from "./numeral.js";
import {
	type AdpositionPlan,
	askAdposition,
	readAdposition,
} from "./open-route/adposition.js";
import {
	adverbHeadword,
	askAdverbial,
	ordinalStem,
	readAdverbial,
	suppletivePositive,
} from "./open-route/adverbial.js";
import { askAgreeing, readAgreeing } from "./open-route/agreeing.js";
import {
	askHead,
	askTail,
	type HeadPlan,
	readHead,
	readTail,
} from "./open-route/common.js";
import type { Governable } from "./open-route/governed.js";
import { guessedJudgment, guessMisses } from "./open-route/luna-guess.js";
import {
	askNominal,
	caseQuestion,
	type NominalPlan,
	type NounRead,
	nounCells,
	type OpeningArticle,
	openingArticle,
	readNominal,
} from "./open-route/nominal.js";
import {
	type AdpCase,
	fold,
	routeShape,
	type Shape,
	spellingOf,
	type Values,
} from "./open-route/shape.js";
import {
	askVerbal,
	readVerbal,
	type VerbalPlan,
	verbalSatellites,
	verbGuessMisses,
	verbHeadword,
} from "./open-route/verbal.js";
import { Answered, Questionnaire, UnresolvedAnswer } from "./questions.js";
import {
	fixedSpelling,
	joinMembers,
	type Member,
	type Target,
	targetState,
} from "./target.js";

/** What an open-route click comes to before it is checked against Dumling. */
export type OpenOutcome =
	| {
			readonly _tag: "Attestation";
			readonly attestation: Values;
			/** The Emoji Description Luna drafted with the headword, unchecked. */
			readonly drafted?: string;
	  }
	| { readonly _tag: "Unresolved"; readonly reason: string }
	| { readonly _tag: "CatalogMiss"; readonly message: string };

/** Everything the first request asks, and what code fixed before it. */
type Plan = HeadPlan & {
	readonly questionnaire: Questionnaire;
	readonly shape: Shape;
	readonly article: OpeningArticle | undefined;
	readonly verbal: VerbalPlan | undefined;
	readonly nominal: NominalPlan | undefined;
	readonly adposition: AdpositionPlan | undefined;
	readonly governable: readonly Governable[];
};

/**
 * The first request: the common head, the block of the route's shape, and
 * the common tail, in that order, which is part of what jev sees and of
 * the answer cache's key. The satellites (auxiliaries, reflexive, subject
 * es, article) are found first, so neither the prefix nor a governed
 * preposition is looked for among them.
 */
function plan(target: Target): Plan {
	const shape = routeShape(target);
	const questionnaire = new Questionnaire();
	const article = openingArticle(target, shape);
	const satellites = verbalSatellites(target, shape);
	const head = askHead(
		questionnaire,
		target,
		shape,
		article,
		satellites.expletive,
	);
	const taken = new Set(
		[
			...satellites.auxiliaries.map(({ member }) => member),
			...(satellites.reflexive ? [satellites.reflexive] : []),
			...satellites.expletives,
			...(article ? [article.member] : []),
		].map(({ position }) => position),
	);
	const verbal = shape.verbal
		? askVerbal(questionnaire, target, shape, satellites, taken)
		: undefined;
	const nominal = shape.nounLike
		? askNominal(questionnaire, shape, article)
		: undefined;
	if (shape.adjectival || shape.adverbial)
		askAdverbial(questionnaire, target, shape);
	if (shape.agreeing) askAgreeing(questionnaire);
	const adposition = shape.adposition
		? askAdposition(questionnaire, target, shape)
		: undefined;
	const governable = askTail(questionnaire, target, shape, taken);
	questionnaire.cite("identity");
	return {
		...head,
		questionnaire,
		shape,
		article,
		verbal,
		nominal,
		adposition,
		governable,
	};
}

/** What the first request settled, and what is still open. */
type FirstRead = {
	readonly core: Values;
	readonly inflection: Values | null | undefined;
	readonly orthographies: readonly MemberOrthography[];
	readonly spelling: Values;
	readonly surfaceFeatures: Values | null;
	readonly coverage: "Full" | "Partial";
	readonly readings: ReadonlyMap<number, string>;
	readonly governed: readonly Values[];
	readonly governedPositions: readonly number[];
	readonly expletive: Member | undefined;
	readonly realizedCase: AdpCase | "None" | undefined;
	/** The cases a NOUN's Case question still has to choose among. */
	readonly openCases: readonly string[];
	readonly noun?: NounRead;
};

/** What the block of a route's shape settles: its Core Features, its inflection and any extras. */
type ShapeRead = {
	readonly core: Values;
	readonly inflection: Values | null | undefined;
	readonly readings?: ReadonlyMap<number, string>;
	readonly expletive?: Member | undefined;
	readonly openCases?: readonly string[];
	readonly noun?: NounRead | undefined;
	readonly realizedCase?: AdpCase | "None" | undefined;
};

/** Reads the block of the route's shape; a shape with none has no Core Features. */
function readShape(
	target: Target,
	planned: Plan,
	answered: Answered,
	cited: boolean,
): ShapeRead {
	const { shape } = planned;
	if (planned.verbal)
		return readVerbal(target, planned.verbal, shape, answered, cited);
	if (planned.nominal)
		return readNominal(
			shape,
			planned.article,
			planned.nominal,
			planned.questionnaire,
			answered,
			cited,
		);
	if (shape.adjectival || shape.adverbial)
		return readAdverbial(shape, answered);
	if (shape.agreeing) return readAgreeing(answered);
	const inflection = shape.inflects ? null : undefined;
	if (planned.adposition)
		return {
			core: {},
			inflection,
			realizedCase: readAdposition(planned.adposition, answered),
		};
	return { core: {}, inflection };
}

/** Reads the first request's answers; an Unresolved deciding answer throws. */
function readFirst(
	target: Target,
	planned: Plan,
	answered: Answered,
): FirstRead {
	const head = readHead(
		target,
		planned.questionnaire,
		planned.article,
		planned,
		answered,
	);
	const read = readShape(target, planned, answered, head.cited);
	const tail = readTail(
		target,
		planned.shape,
		planned.governable,
		answered,
		read.expletive,
		head.cited,
	);
	return {
		core: { ...read.core, ...tail.core },
		inflection: read.inflection,
		orthographies: head.orthographies,
		spelling: head.spelling,
		surfaceFeatures: head.surfaceFeatures,
		coverage: tail.coverage,
		readings: new Map([...head.readings, ...(read.readings ?? [])]),
		governed: tail.governed,
		governedPositions: tail.governedPositions,
		expletive: read.expletive,
		realizedCase: read.realizedCase,
		openCases: read.openCases ?? [],
		...(read.noun ? { noun: read.noun } : {}),
	};
}

/** Settles a synchronous reading, an Unresolved deciding answer included. */
function settle<T>(read: () => T): T | UnresolvedAnswer {
	try {
		return read();
	} catch (error) {
		if (error instanceof UnresolvedAnswer) return error;
		throw error;
	}
}

/**
 * The authored PART Lemmas whose Canonical Form is `form`, compared
 * without case; a Lemma's several Readings count once.
 */
const particlesSpelled = (form: string) => [
	...new Map(
		germanParticles
			.filter((member) => fold(member.lemma.canonicalForm) === fold(form))
			.map((member) => [lemmaIdentityKey(member.lemma), member]),
	).values(),
];

/**
 * Resolves a unit on an open route: the grammar request, with Luna's call
 * on a guess beside it, then the Case question and Luna's call again
 * should the guess miss, then the Attestation as an unchecked value.
 */
export const resolveOpenRoute = Effect.fnUntraced(function* (
	scope: OperationScope,
	target: Target,
	ask: Ask,
	luna: LunaSettings,
	candidates: readonly LemmaCandidate[],
): Effect.fn.Return<OpenOutcome, AskFailure, Scope.Scope> {
	const planned = plan(target);
	const { shape } = planned;
	const state = targetState(target);
	// A PART is authored (#734): its spelling names its member, or Luna's
	// headword does when the member is no Standard spelling.
	const particleSpelled =
		target.route.kind === "PART" && target.members.length === 1
			? particlesSpelled(spellingOf(target.members[0] as Member))
			: [];
	const hints = hintsFor(target, candidates);
	const drafts = draftsEmojiDescription(target.route);
	const request = (judged: Judged) =>
		canonicalFormRequest(target, judged, hints, drafts);
	const write = (judged: Judged) =>
		askLuna(scope, luna, "canonical", request(judged), (output) =>
			checkWritten(target, judged, output),
		);
	// Luna writes while jev judges, on a guess at jev's answers; the
	// guessed call ends with the scope unless it is joined. A PART spelled
	// Standard needs no call, and with nothing to ask jev there is no guess.
	const guessed =
		planned.questionnaire.empty || particleSpelled.length === 1
			? undefined
			: guessedJudgment(target, planned);
	const guess = guessed
		? yield* Effect.forkScoped(write(guessed), { startImmediately: true })
		: undefined;
	const answers = planned.questionnaire.empty
		? {}
		: yield* ask({
				stage: "grammar",
				state: {
					...state,
					policy: planned.questionnaire.policyBlock(),
				},
				questions: planned.questionnaire.questions,
			});
	const first = settle(() =>
		readFirst(target, planned, new Answered(answers)),
	);
	if (first instanceof UnresolvedAnswer)
		return { _tag: "Unresolved", reason: first.reason };
	const article = planned.article;
	const outsideHeadword = new Set<number>([
		...(article ? [article.member.position] : []),
		...first.governedPositions,
	]);
	const judged: Judged = {
		orthographies: first.orthographies,
		features: {
			...first.core,
			...(first.inflection ? { inflection: first.inflection } : {}),
		},
		outsideHeadword,
		auxiliaries: new Set(
			(planned.verbal?.auxiliaries ?? []).flatMap(({ member }) => {
				const use = new Answered(answers).peek(
					`aux_m${member.position}`,
				);
				return use === undefined || use === "Main"
					? []
					: [member.position];
			}),
		),
		readings: first.readings,
	};
	const caseRequestOver = (open: readonly string[]) =>
		open.length > 1
			? Effect.gen(function* () {
					const questionnaire = new Questionnaire();
					caseQuestion(questionnaire, open);
					const answered = yield* ask({
						stage: "case",
						state: {
							...state,
							policy: questionnaire.policyBlock(),
						},
						questions: questionnaire.questions,
					});
					return settle(() => new Answered(answered).pick("case"));
				})
			: Effect.succeed(undefined);
	const caseRequest = caseRequestOver(first.openCases);
	// The guessed answer stands when jev changed nothing Luna reads;
	// otherwise Luna writes again with jev's answers.
	const writing: Effect.Effect<Written | undefined, AskFailure> =
		particleSpelled.length === 1 && first.orthographies[0] === "Standard"
			? Effect.succeed(undefined)
			: Effect.gen(function* () {
					if (!guess || !guessed) return yield* write(judged);
					let missed = guessMisses(request(guessed), request(judged));
					if (missed) yield* Fiber.interrupt(guess);
					else {
						const written = yield* Fiber.join(guess);
						missed =
							shape.verbal && shape.lexeme
								? verbGuessMisses(
										written.canonicalForm,
										first.core,
										planned.verbal?.prefixes ?? [],
									)
								: undefined;
						if (!missed) return written;
					}
					scope.event({
						name: "CanonicalRewritten",
						data: { reason: missed },
					});
					return yield* write(judged);
				});
	// A common NOUN's gender is the article Luna writes with its headword
	// when it fits the Sentence's article; its Case is asked over the cells
	// that gender leaves, after Luna.
	let cells = {
		core: first.core,
		inflection: first.inflection,
		openCases: first.openCases,
	};
	let caseAnswer: string | UnresolvedAnswer | undefined;
	let written: Written | undefined;
	if (first.noun && first.inflection) {
		written = yield* writing;
		// A noun with no singular has gender null, whatever article Luna
		// wrote (Rule de/plural-only-noun-has-no-gender): dumcorpus lists the
		// Pluraletantum nouns Duden gives only in the plural.
		const article =
			written && isGermanPluralOnlyNoun(written.canonicalForm)
				? "none"
				: written?.article;
		cells = nounCells(planned.article, first, article) ?? cells;
		if (cells.openCases.length === 0)
			return {
				_tag: "Unresolved",
				reason: "The article agrees with no case of its head",
			};
		caseAnswer = yield* caseRequestOver(cells.openCases);
	} else
		[caseAnswer, written] = yield* Effect.all([caseRequest, writing], {
			concurrency: "unbounded",
		});
	if (caseAnswer instanceof UnresolvedAnswer)
		return { _tag: "Unresolved", reason: caseAnswer.reason };
	const inflection =
		caseAnswer === undefined || !cells.inflection
			? cells.inflection
			: {
					...cells.inflection,
					case: caseAnswer === "Unmarked" ? null : caseAnswer,
				};
	let core = cells.core;
	let canonicalForm =
		written && shape.verbal && shape.lexeme
			? verbHeadword(written.canonicalForm, first.core)
			: written?.canonicalForm;
	const normalized = [
		...(written?.members ??
			target.members.map(
				(member) =>
					fixedSpelling(member, first.readings) ?? member.text,
			)),
	];
	if (target.route.kind === "PART") {
		const [authored, ...others] = particlesSpelled(
			written?.canonicalForm ?? spellingOf(target.members[0] as Member),
		);
		if (!authored || others.length > 0)
			return {
				_tag: "CatalogMiss",
				message: authored
					? "Several authored particles share this spelling"
					: "No authored particle has this spelling",
			};
		core = { ...authored.lemma.coreFeatures };
		canonicalForm = authored.lemma.canonicalForm;
		if (!written) normalized[0] = authored.lemma.canonicalForm;
	}
	// A numeral Locution has no open slot: a … Luna writes in it (von … bis …)
	// cites a dictionary pattern, not this unit, whose headword is its
	// members' words, digits spelled (zehn bis zwölf; Rules
	// de/canonical-form-is-the-headword, de/digits-spell-the-numeral).
	if (
		canonicalForm !== undefined &&
		target.route.family === "Locution" &&
		target.route.kind === "NUM" &&
		canonicalForm.split(" ").includes("…")
	)
		canonicalForm = joinMembers(
			normalized.map((word) => numeralWord(word) ?? word),
			target.glued,
			outsideHeadword,
		);
	else if (canonicalForm !== undefined)
		canonicalForm = guardedHeadword(
			target,
			canonicalForm,
			new Set([...outsideHeadword, ...(judged.auxiliaries ?? [])]),
		);
	// Digits spell their numeral word (Rule de/digits-spell-the-numeral).
	const [only] = target.members;
	const spelledNumber =
		target.route.family === "Lexeme" &&
		target.route.kind === "NUM" &&
		target.members.length === 1 &&
		only
			? numeralWord(only.text)
			: undefined;
	if (spelledNumber !== undefined) canonicalForm = spelledNumber;
	if (shape.adverbial && shape.lexeme && canonicalForm !== undefined) {
		const derived = adverbHeadword(target, first.orthographies, normalized);
		if (derived) {
			canonicalForm = derived.canonicalForm;
			for (const [position, word] of derived.members)
				normalized[position] = word;
		}
	}
	// A compared form of a suppletive adverb cites its positive (lieber is
	// gern; Rules de/comparability-is-lexical, de/canonical-form-is-the-headword).
	const degree = (first.inflection as { degree?: unknown } | null | undefined)
		?.degree;
	if (
		shape.adverbial &&
		shape.lexeme &&
		(degree === "Cmp" || degree === "Sup")
	) {
		const last = target.members[target.members.length - 1];
		const positive = last && suppletivePositive.get(fold(last.text));
		if (positive) canonicalForm = positive;
	}
	// An ordinal is cited in its attributive headword (erste; Rule
	// de/attributive-adjective-stands-alone).
	if (
		shape.adjectival &&
		shape.lexeme &&
		canonicalForm !== undefined &&
		ordinalStem.test(canonicalForm)
	)
		canonicalForm = `${canonicalForm}e`;
	if (canonicalForm === undefined)
		throw Error("No Canonical Form was written");
	// The subject es is the authored es, whatever its position's capital.
	if (first.expletive) normalized[first.expletive.position] = "es";
	const normalizedSurface = shape.foreign
		? canonicalForm
		: joinMembers(normalized, target.glued, outsideHeadword);
	// A member piece whose table names no word stands for its own word, in
	// the spelling Luna wrote for it (geht of geht's).
	const pieceReadings = new Map(first.readings);
	for (const member of target.members)
		if (
			member.spelling?.orthography === "Fused" &&
			member.spelling.surfaces.length === 0 &&
			!pieceReadings.has(member.segment)
		)
			pieceReadings.set(
				member.segment,
				normalized[member.position] ?? member.text,
			);
	const members = target.members.map((member) =>
		attestedMember(
			target.segments,
			member.segment,
			first.orthographies[member.position] ?? "Standard",
			pieceReadings,
		),
	);
	const valencyEvidence: Values[] = [...first.governed];
	if (
		shape.adposition &&
		first.realizedCase &&
		first.realizedCase !== "None"
	) {
		const table = shape.locution
			? germanAdpositionEntry({ family: "Locution", canonicalForm })
			: null;
		const allowed = table ? germanAdpositionAllowedCases(table) : [];
		const realized =
			allowed.length === 1 ? (allowed[0] as AdpCase) : first.realizedCase;
		valencyEvidence.push({
			member: null,
			complement: {
				kind: "Case",
				governedCase: realized,
				referent: "Either",
			},
			realizedCase: realized,
		});
	}
	const attestation: Values = {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "de",
			lemma: {
				unitKind: "Lemma",
				language: "de",
				family: target.route.family,
				kind: target.route.kind,
				canonicalForm,
				coreFeatures: core,
			},
			normalizedSurface,
			spelling: shape.foreign ? { kind: "Canonical" } : first.spelling,
			surfaceFeatures: shape.foreign ? null : first.surfaceFeatures,
			...(inflection === undefined
				? {}
				: { inflectionalFeatures: inflection }),
		},
		members,
		realizationCoverage: first.coverage,
		// A NOUN Locution's evidence is optional: it names only an owned article.
		...(shape.articleOwner && (shape.lexeme || article)
			? {
					articleEvidence: article
						? { kind: "Owned", member: article.member.position }
						: null,
				}
			: {}),
		...(shape.verbal
			? {
					expletiveEvidence: first.expletive
						? members[first.expletive.position]
						: null,
				}
			: {}),
		...(shape.governor || shape.adposition ? { valencyEvidence } : {}),
	};
	return {
		_tag: "Attestation",
		attestation,
		...(written?.drafted === undefined ? {} : { drafted: written.drafted }),
	};
}, Effect.scoped);
