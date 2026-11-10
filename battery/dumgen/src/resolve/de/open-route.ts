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
 * Luna is asked again with jev's answers. A common NOUN whose headword
 * dumcorpus lists in free gender variation takes its mixed gender, after
 * one more request (`freeGender`) when only one of its senses does. Code
 * derives the rest: the article's cell and evidence (#681), perfect,
 * future, passive and causative from the auxiliaries (#686), a lexical
 * reflexive's case where its form shows it, a VERB's subject es, an ADP's
 * case where the ADP Case Table allows one. A lexical reflexive stays out
 * of the Canonical Form and the normalized Surface, and its Reflexive is
 * valency evidence (ADR 0052).
 */

import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import type * as Scope from "effect/Scope";
import { CallLog } from "../../call.js";
import { type Luna, stageWrite } from "../../luna-call.js";
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
import { openAttestation } from "./open-route/attestation.js";
import { judgedOf, plan, readFirst } from "./open-route/first-request.js";
import { headwordOutside, outsideSurface } from "./open-route/governed.js";
import { canonicalFormOf, rewritten } from "./open-route/headword.js";
import { guessedJudgment } from "./open-route/luna-guess.js";
import { nominalCells } from "./open-route/nominal.js";
import { particlesSpelled } from "./open-route/particle.js";
import {
	caseRequest,
	grammarRequest,
	senseRequest,
} from "./open-route/requests.js";
import { spellingOf } from "./open-route/shape.js";
import { verbGuessMisses } from "./open-route/verbal.js";
import { Answered, Unresolved } from "./questions.js";
import { type Target, targetState } from "./target.js";

/** What an open-route click comes to before it is checked against Dumling. */
export type OpenOutcome =
	| {
			readonly _tag: "Attestation";
			/** Unchecked: `parseUnit` checks it against the unit's route. */
			readonly attestation: unknown;
			/** The Emoji Description Luna drafted with the headword, unchecked. */
			readonly drafted?: string;
	  }
	| Unresolved
	| { readonly _tag: "CatalogMiss"; readonly message: string };

/**
 * Resolves a unit on an open route: the grammar request, with Luna's call
 * on a guess beside it, then the Case question and Luna's call again
 * should the guess miss, then the Attestation as an unchecked value.
 */
export const resolveOpenRoute = Effect.fnUntraced(function* (
	target: Target,
	ask: Ask,
	candidates: readonly LemmaCandidate[],
): Effect.fn.Return<OpenOutcome, AskFailure, Scope.Scope | Luna | CallLog> {
	const log = yield* CallLog;
	const luna = yield* stageWrite;
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
		luna("canonical", request(judged), (output) =>
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
	const read = readFirst(target, planned, new Answered(answers));
	if (Result.isFailure(read)) return read.failure;
	const first = read.success;
	const verbal = first.block === "verbal" ? first : undefined;
	const article = planned.article;
	const outsideHeadword = headwordOutside(
		[
			...(planned.article ? [planned.article.member] : []),
			...(planned.verbal?.reflexive ? [planned.verbal.reflexive] : []),
			...(verbal?.referential ? [verbal.referential] : []),
		],
		first.governedMembers,
		shape,
	);
	const judged = judgedOf(
		planned,
		first,
		new Answered(answers),
		outsideHeadword,
	);
	const writing: Effect.Effect<Written | undefined, AskFailure> =
		particleSpelled.length === 1 && first.orthographies[0] === "Standard"
			? Effect.undefined
			: rewritten(
					log,
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
			? yield* nominalCells(
					article,
					first,
					writing,
					(open) => caseRequest(ask, state, open),
					(sense) => senseRequest(ask, state, sense),
				)
			: {
					written: yield* writing,
					core: { ...first.core, ...first.tailCore },
					inflection: first.inflection,
				};
	if (cells instanceof Unresolved) return cells;
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
				auxiliaries: judged.auxiliaries ?? new Set(),
				inflection: cells.inflection,
			},
			headword,
			outsideSurface(
				outsideHeadword,
				first.governedMembers,
				shape,
				headword.canonicalForm,
			),
		),
		...(written?.drafted === undefined ? {} : { drafted: written.drafted }),
	};
}, Effect.scoped);
