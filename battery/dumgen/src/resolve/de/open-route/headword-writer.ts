/**
 * Who writes an open-route click's headword, and when (#1326, #1337): code
 * where the route settles it (`code-headword.ts`), else the one stored
 * Lemma found under the headword's words (`lookup-headword.ts`), otherwise
 * Luna, asked while jev judges on a guess at jev's answers (#862) and
 * again should the guess miss. Luna's guess is not asked while code or a
 * likely lookup may write the headword. A click whose headword code or the
 * lookup writes makes no Canonical Form call; when code wrote the headword
 * of a Lemma with no stored or authored Reading, Luna drafts its Emoji
 * Description beside jev with the standalone generation prompt, as the
 * Canonical Form call would have drafted it (ADR 0031). A looked-up Lemma
 * is stored, so its Readings are judged first. Either request, the guess
 * or the draft, is known before jev answers, so a host may ask it ahead
 * of the click (#1351).
 */

import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import type * as Scope from "effect/Scope";
import type { CallLog } from "../../../call.js";
import type { LunaDraft, StagedLunaDraft } from "../../../luna.js";
import type { Write } from "../../../luna-call.js";
import type { AskFailure } from "../../../segment/ask.js";
import {
	draftsEmojiDescription,
	emojiDescriptionRequest,
	emojiDescriptionStage,
	markedSentence,
	writtenEmojiDescription,
} from "../../reading.js";
import type { LemmaCandidate } from "../../types.js";
import {
	canonicalFormRequest,
	canonicalStage,
	checkWritten,
	type Judged,
	type Written,
} from "../canonical-form.js";
import type { Target } from "../target.js";
import { codeHeadword, readingsMayExist } from "./code-headword.js";
import type { FirstRead, Plan } from "./first-request.js";
import { lookupHeadword } from "./lookup-headword.js";
import {
	compareGuess,
	excludedWordMisses,
	guessedJudgment,
} from "./luna-guess.js";
import { verbGuessMisses } from "./verbal.js";

/** The headword once jev has judged: code's, or Luna's. */
export type HeadwordOnceJudged = (
	first: FirstRead,
	judged: Judged,
) => Effect.Effect<Written, AskFailure>;

/**
 * The standalone Emoji Description request for a headword code wrote: the
 * Sentence with the unit marked, and the headword.
 */
const draftRequest = (target: Target, lemma: string) =>
	emojiDescriptionRequest({
		markedSentence: markedSentence(
			target.segments,
			target.members.map(({ segment }) => segment),
		),
		lemma,
	});

/**
 * Who may write the click's headword, as known before jev answers: code,
 * a stored Lemma, or Luna on a guess at jev's answers (`guessed`); the
 * Canonical Form request a judgment makes; and the Emoji Description
 * request Luna drafts beside jev for a headword code wrote of a Lemma with
 * no stored or authored Reading (`draft`). `guessed` and `draft` exclude
 * each other, as a guess is made only where code writes no headword.
 */
function headwordPlan(
	target: Target,
	planned: Plan,
	hints: readonly LemmaCandidate[],
) {
	const drafts = draftsEmojiDescription(target.route);
	const request = (judged: Judged) =>
		canonicalFormRequest(target, judged, hints, drafts);
	const coded = codeHeadword(target);
	const looked = coded ? undefined : lookupHeadword(target, planned, hints);
	// With nothing to ask jev there is no guess.
	const guessed =
		planned.questionnaire.empty || coded || looked?.likely
			? undefined
			: guessedJudgment(target, planned);
	const draft =
		coded &&
		drafts &&
		!readingsMayExist(target, coded.written.canonicalForm, hints)
			? draftRequest(target, coded.written.canonicalForm)
			: undefined;
	return { request, coded, looked, guessed, draft };
}

/**
 * The Luna request the click sends before jev answers: the Canonical Form
 * request on its guess at jev's answers, or the Emoji Description draft of
 * a headword code wrote; none where a stored Lemma is to write the
 * headword, or code writes one whose Readings may exist. What a host may
 * ask ahead of the click (#1351).
 */
export function headwordRequestAhead(
	target: Target,
	planned: Plan,
	hints: readonly LemmaCandidate[],
): StagedLunaDraft | undefined {
	const { request, guessed, draft } = headwordPlan(target, planned, hints);
	if (guessed) return { stage: canonicalStage, draft: request(guessed) };
	return draft ? { stage: emojiDescriptionStage, draft } : undefined;
}

/**
 * Starts the click's headword before jev answers: code's draft of its
 * Emoji Description, or Luna's call on a guess, either ending with the
 * scope unless it is joined. Returns how the headword is had once jev
 * has judged.
 */
export const startHeadword = Effect.fnUntraced(function* (
	target: Target,
	planned: Plan,
	hints: readonly LemmaCandidate[],
	luna: Write,
	log: CallLog["Service"],
): Effect.fn.Return<HeadwordOnceJudged, never, Scope.Scope> {
	const {
		request,
		coded,
		looked,
		guessed,
		draft: drafted,
	} = headwordPlan(target, planned, hints);
	const write = (judged: Judged) =>
		luna(canonicalStage, request(judged), (output) =>
			checkWritten(target, judged, output),
		);
	// A draft that is no Emoji Description is dropped once the Lemma is known.
	const draft = drafted
		? yield* Effect.forkScoped(
				luna(emojiDescriptionStage, drafted, (output) =>
					writtenEmojiDescription(output)?.trim(),
				),
				{ startImmediately: true },
			)
		: undefined;
	const guess = guessed
		? yield* Effect.forkScoped(write(guessed), { startImmediately: true })
		: undefined;
	return (first, judged) => {
		const settled = coded?.settles(first) ? coded.written : undefined;
		if (settled) return withDraft(settled, draft);
		const lookedUp = looked?.settled(first, judged);
		if (lookedUp)
			return Effect.as(
				guess ? Fiber.interrupt(guess) : Effect.void,
				lookedUp,
			);
		return Effect.andThen(
			draft ? Fiber.interrupt(draft) : Effect.void,
			rewritten(
				target,
				log,
				write,
				request,
				guess && guessed
					? { judged: guessed, fiber: guess }
					: undefined,
				judged,
				verbMissesOf(first, planned),
			),
		);
	};
});

/** Code's headword with the draft beside it, once the draft is in. */
const withDraft = (
	settled: Written,
	draft: Fiber.Fiber<string | undefined, AskFailure> | undefined,
): Effect.Effect<Written, AskFailure> =>
	draft
		? Effect.map(Fiber.join(draft), (drafted) =>
				drafted === undefined ? settled : { ...settled, drafted },
			)
		: Effect.succeed(settled);

/** Why a VERB Lexeme's guessed headword misses its judged prefix, if it does. */
const verbMissesOf = (first: FirstRead, planned: Plan) => {
	const verbal = first.block === "verbal" ? first : undefined;
	return verbal && planned.shape.lexeme
		? (form: string) =>
				verbGuessMisses(
					form,
					verbal.core,
					planned.verbal?.prefixes ?? [],
				)
		: undefined;
};

/**
 * Luna's headword once jev has judged. The guessed answer stands when jev
 * changed nothing Luna reads — or only added members to `outsideHeadword`
 * whose words the guessed headword already omits — and, on a VERB Lexeme,
 * judged away no prefix the guessed headword carries; otherwise Luna
 * writes again with jev's answers.
 */
function rewritten(
	target: Target,
	log: CallLog["Service"],
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
		const comparison = compareGuess(
			request(guessed.judged),
			request(judged),
		);
		let missed: string | undefined;
		if (comparison.kind === "miss") {
			missed = comparison.reason;
			yield* Fiber.interrupt(guessed.fiber);
		} else {
			const written = yield* Fiber.join(guessed.fiber);
			missed =
				excludedWordMisses(
					target,
					judged,
					comparison.newlyExcluded,
					written.canonicalForm,
				) ?? verbMisses?.(written.canonicalForm);
			if (!missed) return written;
		}
		log.event({
			name: "CanonicalRewritten",
			data: { reason: missed },
		});
		return yield* write(judged);
	});
}
