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

import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import type * as Scope from "effect/Scope";
import type { OperationScope } from "../../call.js";
import type { LunaDraft } from "../../luna.js";
import { askLuna, type LunaSettings } from "../../luna-call.js";
import type { Answers, Ask, AskFailure } from "../../segment/ask.js";
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
import type { MemberOrthography } from "./member-spelling.js";
import {
	type AdpositionPlan,
	askAdposition,
	readAdposition,
} from "./open-route/adposition.js";
import {
	type AdverbialPlan,
	adverbialHeadword,
	askAdverbial,
	readAdverbial,
} from "./open-route/adverbial.js";
import {
	type AgreeingPlan,
	askAgreeing,
	readAgreeing,
} from "./open-route/agreeing.js";
import { type Headword, openAttestation } from "./open-route/attestation.js";
import {
	askHead,
	askTail,
	type HeadPlan,
	readHead,
	readTail,
	type Spelling,
	type SurfaceFeatures,
	type TailCore,
	type TailPlan,
} from "./open-route/common.js";
import { guessedJudgment, guessMisses } from "./open-route/luna-guess.js";
import {
	askNominal,
	caseQuestion,
	type NominalPlan,
	nominalCells,
	type OpeningArticle,
	openingArticle,
	readNominal,
} from "./open-route/nominal.js";
import {
	digitsHeadword,
	numeralLocutionHeadword,
} from "./open-route/numeral.js";
import { authoredParticle, particlesSpelled } from "./open-route/particle.js";
import {
	type AdpCase,
	routeShape,
	type Shape,
	spellingOf,
	type ValencyEvidence,
} from "./open-route/shape.js";
import {
	askVerbal,
	readVerbal,
	type VerbalPlan,
	verbalSatellites,
	verbGuessMisses,
	verbHeadword,
} from "./open-route/verbal.js";
import type { CaseOption } from "./prompts.js";
import { Answered, Questionnaire, UnresolvedAnswer } from "./questions.js";
import { fixedSpelling, type Target, targetState } from "./target.js";

/** What an open-route click comes to before it is checked against Dumling. */
export type OpenOutcome =
	| {
			readonly _tag: "Attestation";
			/** Unchecked: `parseUnit` checks it against the unit's route. */
			readonly attestation: unknown;
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
	readonly adverbial: AdverbialPlan | undefined;
	readonly agreeing: AgreeingPlan | undefined;
	readonly adposition: AdpositionPlan | undefined;
	readonly tail: TailPlan;
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
	const adverbial =
		shape.adjectival || shape.adverbial
			? askAdverbial(questionnaire, target, shape)
			: undefined;
	const agreeing = shape.agreeing ? askAgreeing(questionnaire) : undefined;
	const adposition = shape.adposition
		? askAdposition(questionnaire, target, shape)
		: undefined;
	const tail = askTail(questionnaire, target, shape, taken);
	questionnaire.cite("identity");
	return {
		...head,
		questionnaire,
		shape,
		article,
		verbal,
		nominal,
		adverbial,
		agreeing,
		adposition,
		tail,
	};
}

/**
 * What the block of a route's shape settles, by block: its Core Features
 * and inflection, typed as the block's routes take them, and its extras.
 * A shape with no block has no Core Features.
 */
type ShapeRead =
	| ({ readonly block: "verbal" } & ReturnType<typeof readVerbal>)
	| ({ readonly block: "nominal" } & ReturnType<typeof readNominal>)
	| ({ readonly block: "adverbial" } & ReturnType<typeof readAdverbial>)
	| ({ readonly block: "agreeing" } & ReturnType<typeof readAgreeing>)
	| {
			readonly block: "adposition";
			readonly core: Record<string, never>;
			readonly inflection: null | undefined;
			readonly realizedCase: AdpCase | "None";
	  }
	| {
			readonly block: "none";
			readonly core: Record<string, never>;
			readonly inflection: null | undefined;
	  };

/** What the first request settled, and what is still open. */
type FirstRead = ShapeRead & {
	/** The Core Feature the tail settled, beside the block's. */
	readonly tailCore: TailCore;
	readonly orthographies: readonly MemberOrthography[];
	readonly spelling: Spelling;
	readonly surfaceFeatures: SurfaceFeatures;
	readonly coverage: "Full" | "Partial";
	/** The readings the head and the block fixed. */
	readonly readings: ReadonlyMap<number, string>;
	readonly governed: readonly ValencyEvidence[];
	readonly governedPositions: readonly number[];
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
		return {
			block: "verbal",
			...readVerbal(
				target,
				planned.verbal,
				shape,
				planned.tail.governable,
				answered,
				cited,
			),
		};
	if (planned.nominal)
		return {
			block: "nominal",
			...readNominal(
				shape,
				planned.article,
				planned.nominal,
				answered,
				cited,
			),
		};
	if (planned.adverbial)
		return {
			block: "adverbial",
			...readAdverbial(planned.adverbial, answered),
		};
	if (planned.agreeing)
		return {
			block: "agreeing",
			...readAgreeing(planned.agreeing, answered),
		};
	const inflection = shape.inflects ? null : undefined;
	if (planned.adposition)
		return {
			block: "adposition",
			core: {},
			inflection,
			realizedCase: readAdposition(planned.adposition, answered),
		};
	return { block: "none", core: {}, inflection };
}

/** Reads the first request's answers; an Unresolved deciding answer throws. */
function readFirst(
	target: Target,
	planned: Plan,
	answered: Answered,
): FirstRead {
	const head = readHead(
		target,
		planned.article,
		planned,
		planned.adverbial?.indefinite,
		answered,
	);
	const read = readShape(target, planned, answered, head.cited);
	const verbal = read.block === "verbal" ? read : undefined;
	const tail = readTail(
		planned.tail,
		planned.shape,
		answered,
		verbal?.expletive,
		head.cited,
	);
	return {
		...read,
		tailCore: tail.core,
		orthographies: head.orthographies,
		spelling: head.spelling,
		surfaceFeatures: head.surfaceFeatures,
		coverage: tail.coverage,
		readings: new Map([...head.readings, ...(verbal?.readings ?? [])]),
		governed: tail.governed,
		governedPositions: tail.governedPositions,
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
 * What Luna reads once jev has judged: the members' orthographies, the
 * judged features, the members outside the headword, the auxiliaries
 * judged as such, and the readings.
 */
function judgedOf(
	planned: Plan,
	first: FirstRead,
	answered: Answered,
	outsideHeadword: ReadonlySet<number>,
): Judged {
	return {
		orthographies: first.orthographies,
		features: {
			...first.core,
			...first.tailCore,
			...(first.inflection ? { inflection: first.inflection } : {}),
		},
		outsideHeadword,
		auxiliaries: new Set(
			(planned.verbal?.auxiliaries ?? []).flatMap(
				({ member, use: asked }) => {
					const use = answered.peek(asked);
					return use === undefined || use === "Main"
						? []
						: [member.position];
				},
			),
		),
		readings: first.readings,
	};
}

/** The first request, sent only when it asks something. */
function grammarRequest(
	ask: Ask,
	state: ReturnType<typeof targetState>,
	questionnaire: Questionnaire,
): Effect.Effect<Answers, AskFailure> {
	return questionnaire.empty
		? Effect.succeed({})
		: ask({
				stage: "grammar",
				state: { ...state, policy: questionnaire.policyBlock() },
				questions: questionnaire.questions,
			});
}

/** The Case question over the cells still open, asked only when more than one is. */
function caseRequest(
	ask: Ask,
	state: ReturnType<typeof targetState>,
	open: readonly CaseOption[],
): Effect.Effect<CaseOption | UnresolvedAnswer | undefined, AskFailure> {
	return open.length > 1
		? Effect.gen(function* () {
				const questionnaire = new Questionnaire();
				const asked = caseQuestion(questionnaire, open);
				const answered = yield* ask({
					stage: "case",
					state: {
						...state,
						policy: questionnaire.policyBlock(),
					},
					questions: questionnaire.questions,
				});
				return settle(() => new Answered(answered).pick(asked));
			})
		: Effect.succeed(undefined);
}

/**
 * The headword: Luna's Canonical Form and members' words, over which each
 * route shape's step writes what the Rules settle, in this order: a VERB
 * Lexeme's prefix and sich, a PART's authored Lemma, a numeral Locution's
 * members or a Locution's guarded headword, a NUM's digits, an ADV's or
 * ADJ's. A PART no authored Lemma names is a Catalog Miss.
 */
function canonicalFormOf(
	target: Target,
	shape: Shape,
	first: FirstRead,
	cells: Dumling.Lemma<"de">["coreFeatures"],
	written: Written | undefined,
	judged: Judged,
): Headword | Extract<OpenOutcome, { readonly _tag: "CatalogMiss" }> {
	let core = cells;
	let canonicalForm =
		written && first.block === "verbal" && shape.lexeme
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
		const authored = authoredParticle(target, written);
		if ("_tag" in authored) return authored;
		core = { ...authored.lemma.coreFeatures };
		canonicalForm = authored.lemma.canonicalForm;
		if (!written) normalized[0] = authored.lemma.canonicalForm;
	}
	const { outsideHeadword } = judged;
	if (canonicalForm !== undefined)
		canonicalForm =
			numeralLocutionHeadword(
				target,
				canonicalForm,
				normalized,
				outsideHeadword,
			) ??
			guardedHeadword(
				target,
				canonicalForm,
				new Set([...outsideHeadword, ...(judged.auxiliaries ?? [])]),
			);
	canonicalForm = digitsHeadword(target) ?? canonicalForm;
	if (first.block === "adverbial") {
		const derived = adverbialHeadword(
			target,
			shape,
			first.orthographies,
			first.inflection?.degree,
			canonicalForm,
			normalized,
		);
		canonicalForm = derived.canonicalForm;
		for (const [position, word] of derived.members)
			normalized[position] = word;
	}
	if (canonicalForm === undefined)
		throw Error("No Canonical Form was written");
	return { canonicalForm, core, normalized };
}

/**
 * Luna's headword once jev has judged. The guessed answer stands when jev
 * changed nothing Luna reads and, on a VERB Lexeme, judged away no sich or
 * prefix the guessed headword carries; otherwise Luna writes again with
 * jev's answers.
 */
function rewritten(
	scope: OperationScope,
	write: (judged: Judged) => Effect.Effect<Written, AskFailure>,
	request: (judged: Judged) => LunaDraft,
	guessed:
		| {
				readonly judged: Judged;
				readonly fiber: Fiber.Fiber<Written, AskFailure>;
		  }
		| undefined,
	judged: Judged,
	verbMisses: ((form: string) => string | undefined) | undefined,
): Effect.Effect<Written, AskFailure> {
	return Effect.gen(function* () {
		if (!guessed) return yield* write(judged);
		let missed = guessMisses(request(guessed.judged), request(judged));
		if (missed) yield* Fiber.interrupt(guessed.fiber);
		else {
			const written = yield* Fiber.join(guessed.fiber);
			missed = verbMisses?.(written.canonicalForm);
			if (!missed) return written;
		}
		scope.event({
			name: "CanonicalRewritten",
			data: { reason: missed },
		});
		return yield* write(judged);
	});
}

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
	const [opening, ...rest] = target.members;
	const lone = rest.length === 0 ? opening : undefined;
	// A PART is authored (#734): its spelling names its member, or Luna's
	// headword does when the member is no Standard spelling.
	const particleSpelled =
		target.route.kind === "PART" && lone
			? particlesSpelled(spellingOf(lone))
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
	const answers = yield* grammarRequest(ask, state, planned.questionnaire);
	const first = settle(() =>
		readFirst(target, planned, new Answered(answers)),
	);
	if (first instanceof UnresolvedAnswer)
		return { _tag: "Unresolved", reason: first.reason };
	const verbal = first.block === "verbal" ? first : undefined;
	const article = planned.article;
	const outsideHeadword = new Set<number>([
		...(article ? [article.member.position] : []),
		...first.governedPositions,
	]);
	const judged = judgedOf(
		planned,
		first,
		new Answered(answers),
		outsideHeadword,
	);
	const writing: Effect.Effect<Written | undefined, AskFailure> =
		particleSpelled.length === 1 && first.orthographies[0] === "Standard"
			? Effect.succeed(undefined)
			: rewritten(
					scope,
					write,
					request,
					guess && guessed
						? { judged: guessed, fiber: guess }
						: undefined,
					judged,
					verbal && shape.lexeme
						? (form) =>
								verbGuessMisses(
									form,
									verbal.core,
									planned.verbal?.prefixes ?? [],
								)
						: undefined,
				);
	const cells =
		first.block === "nominal"
			? yield* nominalCells(article, first, writing, (open) =>
					caseRequest(ask, state, open),
				)
			: {
					written: yield* writing,
					core: { ...first.core, ...first.tailCore },
					inflection: first.inflection,
				};
	if (cells instanceof UnresolvedAnswer)
		return { _tag: "Unresolved", reason: cells.reason };
	const { written } = cells;
	const headword = canonicalFormOf(
		target,
		shape,
		first,
		cells.core,
		written,
		judged,
	);
	if ("_tag" in headword) return headword;
	return {
		_tag: "Attestation",
		attestation: openAttestation(
			target,
			shape,
			article,
			{
				...first,
				realizedCase:
					first.block === "adposition"
						? first.realizedCase
						: undefined,
				expletive: verbal?.expletive,
				inflection: cells.inflection,
			},
			headword,
			outsideHeadword,
		),
		...(written?.drafted === undefined ? {} : { drafted: written.drafted }),
	};
}, Effect.scoped);
