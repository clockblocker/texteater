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
 * is stored, so its Readings are judged first.
 */

import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import type * as Scope from "effect/Scope";
import type { CallLog } from "../../../call.js";
import type { LunaDraft } from "../../../luna.js";
import type { Write } from "../../../luna-call.js";
import type { AskFailure } from "../../../segment/ask.js";
import {
	draftsEmojiDescription,
	emojiDescriptionRequest,
	markedSentence,
} from "../../reading.js";
import type { LemmaCandidate } from "../../types.js";
import {
	canonicalFormRequest,
	checkWritten,
	type Judged,
	type Written,
} from "../canonical-form.js";
import type { Target } from "../target.js";
import { codeHeadword, readingsMayExist } from "./code-headword.js";
import type { FirstRead, Plan } from "./first-request.js";
import { lookupHeadword } from "./lookup-headword.js";
import { guessedJudgment, guessMisses } from "./luna-guess.js";
import { verbGuessMisses } from "./verbal.js";

/** The headword once jev has judged: code's, or Luna's. */
export type HeadwordOnceJudged = (
	first: FirstRead,
	judged: Judged,
) => Effect.Effect<Written, AskFailure>;

/**
 * The Emoji Description the standalone generation prompt drafts for a
 * headword code wrote; a draft that is no Emoji Description is dropped
 * once the Lemma is known.
 */
const draftOf = (target: Target, lemma: string, luna: Write) =>
	luna(
		"emojiDescription",
		emojiDescriptionRequest({
			markedSentence: markedSentence(
				target.segments,
				target.members.map(({ segment }) => segment),
			),
			lemma,
		}),
		(output) => (typeof output === "string" ? output.trim() : undefined),
	);

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
	const drafts = draftsEmojiDescription(target.route);
	const request = (judged: Judged) =>
		canonicalFormRequest(target, judged, hints, drafts);
	const write = (judged: Judged) =>
		luna("canonical", request(judged), (output) =>
			checkWritten(target, judged, output),
		);
	const coded = codeHeadword(target);
	const looked = coded ? undefined : lookupHeadword(target, planned, hints);
	const draft =
		coded &&
		drafts &&
		!readingsMayExist(target, coded.written.canonicalForm, hints)
			? yield* Effect.forkScoped(
					draftOf(target, coded.written.canonicalForm, luna),
					{ startImmediately: true },
				)
			: undefined;
	// With nothing to ask jev there is no guess.
	const guessed =
		planned.questionnaire.empty || coded || looked?.likely
			? undefined
			: guessedJudgment(target, planned);
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
 * changed nothing Luna reads and, on a VERB Lexeme, judged away no
 * prefix the guessed headword carries; otherwise Luna writes again with
 * jev's answers.
 */
function rewritten(
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
		let missed = guessMisses(request(guessed.judged), request(judged));
		if (missed) yield* Fiber.interrupt(guessed.fiber);
		else {
			const written = yield* Fiber.join(guessed.fiber);
			missed = verbMisses?.(written.canonicalForm);
			if (!missed) return written;
		}
		log.event({
			name: "CanonicalRewritten",
			data: { reason: missed },
		});
		return yield* write(judged);
	});
}
