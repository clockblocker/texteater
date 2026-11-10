/**
 * Grammatical Resolution of a unit on an open route: everything but the
 * closed DET and PRON Lexemes. One jev request (`grammar`) judges what
 * neither the unit nor dumcorpus's tables already fix: a member's Typo or
 * Shorthand, the Surface's spelling, the route's Core Features, its
 * inflection, the auxiliaries' uses, the prepositions a head governs,
 * coverage, and a NOUN's or agreeing word's Case over the cases its
 * article and where it stands leave (#625, #1326). Then the headword (`open-route/headword-writer.ts`): code's where the route
 * settles it, else Luna's Canonical Form and spellings (#862), asked
 * while jev judges on a guess at its answers and again when the guess
 * misses. A common NOUN whose headword
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
import type { LemmaCandidate, ResolveGrammarInput } from "../types.js";
import { hintsFor, type Written } from "./canonical-form.js";
import { openAttestation } from "./open-route/attestation.js";
import { judgedOf, plan, readFirst } from "./open-route/first-request.js";
import { headwordOutside, outsideSurface } from "./open-route/governed.js";
import { canonicalFormOf } from "./open-route/headword.js";
import { startHeadword } from "./open-route/headword-writer.js";
import { reportJudged } from "./open-route/judged-report.js";
import { nominalCells } from "./open-route/nominal-cells.js";
import {
	caseRequest,
	grammarRequest,
	senseRequest,
} from "./open-route/requests.js";
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
 * Resolves a unit on an open route: the grammar request, with the
 * headword started beside it, then the report of what jev judged, the
 * Case question and the headword, then the Attestation as an unchecked
 * value.
 */
export const resolveOpenRoute = Effect.fnUntraced(function* (
	target: Target,
	ask: Ask,
	candidates: readonly LemmaCandidate[],
	onJudged?: ResolveGrammarInput["onJudged"],
): Effect.fn.Return<OpenOutcome, AskFailure, Scope.Scope | Luna | CallLog> {
	const log = yield* CallLog;
	const luna = yield* stageWrite;
	const planned = plan(target);
	const { shape } = planned;
	const state = targetState(target);
	const hints = hintsFor(target, candidates);
	const once = yield* startHeadword(target, planned, hints, luna, log);
	const answers = yield* grammarRequest(ask, state, planned.questionnaire);
	const read = readFirst(target, planned, new Answered(answers));
	if (Result.isFailure(read)) return read.failure;
	const first = read.success;
	const reported = yield* reportJudged(onJudged, target, first);
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
	const writing: Effect.Effect<Written | undefined, AskFailure> = once(
		first,
		judged,
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
	if (cells instanceof Unresolved) return yield* reported(cells);
	const { written } = cells;
	const headword = canonicalFormOf(
		target,
		shape,
		first,
		cells.core,
		written,
		judged,
	);
	if ("_tag" in headword) return yield* reported(headword);
	return yield* reported({
		_tag: "Attestation" as const,
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
	});
}, Effect.scoped);
