/**
 * The body of `resolve.reading` (#859, ADR 0031): which Reading of its
 * Lemma a resolved click lands on, told apart by the Emoji Description
 * alone.
 *
 * - On a Closed Route a Lemma takes its authored Reading with no call, or
 *   jev's pick when it has several, and one dumcorpus authors no Reading of
 *   is a Catalog Miss (ADR 0021).
 * - On an Open Route jev judges first, unless Luna's draft (below) is one
 *   of its options: it sees the Lemma's authored and stored Emoji
 *   Descriptions bare beside the marked Sentence and picks one or answers
 *   NoMatch. Only after NoMatch, or with none to offer,
 *   does Luna write one, from the marked Sentence and the Canonical Form
 *   alone. An authored set may miss a sense, so its Lemma can gain a New
 *   Reading beside it (#877 R4). Luna writing an offered one takes it: the
 *   judge was wrong.
 * - Luna drafts the description in `resolve.grammar`'s Canonical Form
 *   call, or beside jev where code wrote the headword of a Lemma with
 *   nothing stored, so a click needs no second Luna call. The host passes it as
 *   `drafted`. A draft that is one of the descriptions the judge would be
 *   offered settles the Reuse with no judge call; any other draft stands in
 *   for the description Luna would write here, after the judge's NoMatch
 *   (ADR 0031).
 * - A host that refused a New as stale passes the description Luna wrote
 *   as `written`: the judge runs again over the current candidates, and a
 *   second NoMatch takes it (ADR 0031).
 * - Grammar, never an emoji model, supplies the 🪞 marker (ADR 0052). When
 *   the Attestation's members hold a lexical reflexive, its valency
 *   evidence names a Reflexive: the judge is offered only the 🪞 Readings
 *   and those the host names `optionallyReflexive`, and code writes 🪞
 *   before the description Luna proposes, which an optionally reflexive
 *   one with the same bare emoji takes. Otherwise the judge is offered no
 *   🪞 Reading, and Luna's description never starts with 🪞.
 *
 * Descriptions compare as Dumling parses them, so `🕰️` is `🕰`. Nothing is
 * retried, and no answer is salvaged (#889).
 */

import {
	authoredFor,
	closedRoute,
	reflexiveMarker,
} from "dumcorpus/inventories";
import { readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { CallLog } from "../call.js";
import { InvalidModelOutput, type ProviderFailure } from "../errors.js";
import { type Jev, stageAsk } from "../jev-call.js";
import { askLuna, type Luna } from "../luna-call.js";
import { type Ask, choice, choiceOf, noul, noulOf } from "../segment/ask.js";
import type { Route } from "../segment/segmented-sentence.js";
import { judgeQuestion } from "./de/reading-prompts.js";
import { targetOf } from "./de/target.js";
import {
	emojiDescriptionRequest,
	emojiDescriptionStage,
	holdsReflexive,
	markedSentence,
	parsedDescription,
	policyBlock,
	withReflexiveMarker,
} from "./reading-helpers.js";
import type { ReadingResolution, ResolveReadingInput } from "./types.js";

export {
	draftPrompt,
	draftsEmojiDescription,
	emojiDescriptionRequest,
	emojiDescriptionSchema,
	emojiDescriptionStage,
	generationPrompt,
	markedSentence,
	parsedDescription,
	withReflexiveMarker,
} from "./reading-helpers.js";

/** One option the judge sees: an Emoji Description, and whether dumcorpus authors it. */
type Option = { readonly description: string; readonly authored: boolean };

/**
 * Picks one of `options` with jev: on an Open Route the authored and stored
 * descriptions with NoMatch, on a Closed Route a Lemma's authored Readings
 * alone. An authored option's id is `a<index>`, a stored one's `c<index>`,
 * so the question can tell the judge which are authored. The pick's index,
 * or undefined for NoMatch.
 */
const pick = Effect.fnUntraced(function* (
	ask: Ask,
	stage: "reading" | "authoredReading",
	state: { readonly markedSentence: string; readonly lemma: string },
	options: readonly Option[],
): Effect.fn.Return<number | undefined, ProviderFailure | InvalidModelOutput> {
	const open = stage === "reading";
	const idOf = (option: Option, index: number) =>
		`${option.authored ? "a" : "c"}${index}`;
	const question = !open
		? judgeQuestion.authored
		: options.some(({ authored }) => authored)
			? judgeQuestion.storedWithAuthored
			: judgeQuestion.stored;
	const verifyQuestions = open
		? Object.fromEntries(
				options.map((option, index) => [
					`rival_${index}`,
					noul(
						judgeQuestion.verify.replaceAll(
							"{emoji}",
							option.description,
						),
						{
							true: judgeQuestion.verifyTrue.replaceAll(
								"{emoji}",
								option.description,
							),
							false: judgeQuestion.verifyFalse.replaceAll(
								"{emoji}",
								option.description,
							),
						},
					),
				]),
			)
		: {};
	const answers = yield* ask({
		stage,
		state: { ...state, policy: policyBlock },
		questions: {
			reading: choice(question, {
				...Object.fromEntries(
					options.map((option, index) => [
						idOf(option, index),
						option.description,
					]),
				),
				...(open ? { NoMatch: judgeQuestion.noMatch } : {}),
			}),
			...verifyQuestions,
		},
	});
	const answer = choiceOf(answers, "reading").choice;
	if (open && answer === "NoMatch") return undefined;
	const index = options.findIndex(
		(option, at) => idOf(option, at) === answer,
	);
	if (index < 0)
		return yield* new InvalidModelOutput({
			stage,
			message: `jev answered the Reading with ${answer}, no option of it`,
		});
	// Reject if Jev independently judges that the chosen emoji specifically names a rival sense of the lemma.
	if (open && noulOf(answers, `rival_${index}`) >= 0.65) return undefined;
	return index;
});

type ValidatedReadingInput = {
	readonly route: Route;
	readonly lemma: Dumling.Lemma<"de">;
	readonly keyOf: (emojiDescription: string) => string;
	readonly candidates: readonly string[];
	readonly candidateByKey: ReadonlyMap<string, string>;
	readonly reflexive: boolean;
	readonly optional: ReadonlySet<string>;
	readonly state: { readonly markedSentence: string; readonly lemma: string };
};

const defect = (message: string) => Effect.die(Error(message));

/** Validates the click input and indexes its deduplicated stored candidates. */
const validateReadingInput = Effect.fnUntraced(function* (
	input: ResolveReadingInput,
): Effect.fn.Return<ValidatedReadingInput> {
	const { attestation, sentence, unit } = input;
	const { lemma } = attestation.surface;
	if (lemma.language !== "de")
		return yield* defect(
			`resolve.reading resolves German ("de") only, not ${JSON.stringify(lemma.language)}`,
		);
	if (sentence.failed)
		return yield* defect(
			"The Sentence's segmentation failed; segment it again before resolving a click on it",
		);
	if (unit.route === "Unresolved")
		return yield* defect("A unit intake left Unresolved has no Reading");
	const route: Route = unit.route;
	if (route.family !== lemma.family || route.kind !== lemma.kind)
		return yield* defect("The Attestation is off the unit's route");
	if (lemma.family === "Foreign")
		return yield* defect(
			"A Foreign Reading has no Emoji Description, so there is nothing to resolve (ADR 0045)",
		);
	targetOf(sentence, unit, route);
	// TypeScript can't pair a Lemma union with each route's Reading; `lemma`
	// is a non-Foreign German Lemma, so this is its Reading.
	const keyOf = (emojiDescription: string) =>
		readingIdentityKey({
			unitKind: "Reading",
			lemma,
			emojiDescription,
		} as Dumling.Reading<"de">);
	const candidates: string[] = [];
	const candidateByKey = new Map<string, string>();
	for (const candidate of input.candidates) {
		if (parsedDescription(lemma, candidate) === undefined)
			return yield* defect(
				`The candidate ${JSON.stringify(candidate)} is no Emoji Description`,
			);
		const key = keyOf(candidate);
		if (candidateByKey.has(key)) continue;
		candidateByKey.set(key, candidate);
		candidates.push(candidate);
	}
	return {
		route,
		lemma,
		keyOf,
		candidates,
		candidateByKey,
		reflexive: holdsReflexive(attestation),
		optional: new Set((input.optionallyReflexive ?? []).map(keyOf)),
		state: {
			markedSentence: markedSentence(sentence.segments, unit.segments),
			lemma: lemma.canonicalForm,
		},
	};
});

type AnswerReading = (
	emojiDescription: string,
	reason: string,
) => ReadingResolution;

/** Resolves a Closed Route click from its authored Readings, or reports a Catalog Miss. */
const resolveClosedRouteReading = Effect.fnUntraced(function* (
	ask: Ask,
	log: CallLog["Service"],
	route: Route,
	lemma: Dumling.Lemma<"de">,
	state: { readonly markedSentence: string; readonly lemma: string },
	authored: readonly string[],
	answer: AnswerReading,
): Effect.fn.Return<ReadingResolution, ProviderFailure | InvalidModelOutput> {
	const [only] = authored;
	if (only !== undefined && authored.length === 1)
		return answer(only, "Authored");
	if (authored.length > 1) {
		const index = yield* pick(
			ask,
			"authoredReading",
			state,
			authored.map((description) => ({
				description,
				authored: true,
			})),
		);
		const chosen = index === undefined ? undefined : authored[index];
		if (chosen === undefined)
			throw Error("An authored pick names an option");
		return answer(chosen, "AuthoredJudged");
	}
	const message = `No authored Reading of ${route.kind} ${lemma.canonicalForm}`;
	log.resolution({ outcome: "CatalogMiss", reason: message });
	return { _tag: "CatalogMiss", route, message };
});

/** Deduplicated options the Open Route judge sees, plus their identity keys. */
function openRouteOptions(
	authored: readonly string[],
	candidates: readonly string[],
	keyOf: (emojiDescription: string) => string,
	reflexive: boolean,
	optional: ReadonlySet<string>,
): {
	readonly options: readonly Option[];
	readonly offered: ReadonlySet<string>;
} {
	const authoredKeys = new Set(authored.map(keyOf));
	const options: Option[] = [];
	const seenKeys = new Set<string>();
	const offered = new Set<string>();
	for (const description of [...authored, ...candidates]) {
		const key = keyOf(description);
		if (seenKeys.has(key)) continue;
		seenKeys.add(key);
		if (
			description.startsWith(reflexiveMarker) !== reflexive &&
			!optional.has(key)
		)
			continue;
		offered.add(key);
		options.push({ description, authored: authoredKeys.has(key) });
	}
	return { options, offered };
}

/** Parses optional `written` and `drafted` descriptions for an Open Route click. */
const parseOpenDescriptions = Effect.fnUntraced(function* (
	input: ResolveReadingInput,
	lemma: Dumling.Lemma<"de">,
	reflexive: boolean,
): Effect.fn.Return<{
	readonly written: string | undefined;
	readonly markedDraft: string | undefined;
}> {
	let written: string | undefined;
	if (input.written !== undefined) {
		written = parsedDescription(
			lemma,
			withReflexiveMarker(input.written, reflexive),
		);
		if (written === undefined)
			return yield* defect(
				`The written ${JSON.stringify(input.written)} is no Emoji Description`,
			);
	}
	let markedDraft: string | undefined;
	if (input.drafted !== undefined) {
		const drafted = parsedDescription(lemma, input.drafted);
		if (drafted === undefined)
			return yield* defect(
				`The drafted ${JSON.stringify(input.drafted)} is no Emoji Description`,
			);
		// A draft the marker leaves no Emoji Description, as a bare 🪞, is no draft.
		markedDraft = parsedDescription(
			lemma,
			withReflexiveMarker(drafted, reflexive),
		);
	}
	return { written, markedDraft };
});

/** Asks Luna to write an Open Route Emoji Description with the grammar's 🪞 marker. */
const askOpenEmojiDescription = (
	lemma: Dumling.Lemma<"de">,
	state: { readonly markedSentence: string; readonly lemma: string },
	reflexive: boolean,
) =>
	askLuna(
		emojiDescriptionStage,
		emojiDescriptionRequest(state),
		(output) =>
			parsedDescription(
				lemma,
				typeof output === "string"
					? withReflexiveMarker(output, reflexive)
					: output,
			) ??
			new InvalidModelOutput({
				stage: emojiDescriptionStage,
				message: `Luna answered no Emoji Description: ${JSON.stringify(output).slice(0, 80)}`,
			}),
	);

/** Resolves an Open Route click via offered options, draft/written shortcuts, jev, and Luna. */
const resolveOpenRouteReading = Effect.fnUntraced(function* (
	input: ResolveReadingInput,
	validated: ValidatedReadingInput,
	ask: Ask,
	authored: readonly string[],
	storedAs: (emojiDescription: string) => string | undefined,
	answer: AnswerReading,
): Effect.fn.Return<
	ReadingResolution,
	ProviderFailure | InvalidModelOutput,
	Luna | CallLog
> {
	const { lemma, keyOf, candidates, reflexive, optional, state } = validated;
	const { options, offered } = openRouteOptions(
		authored,
		candidates,
		keyOf,
		reflexive,
		optional,
	);
	const { written, markedDraft } = yield* parseOpenDescriptions(
		input,
		lemma,
		reflexive,
	);
	/** Whether a description is, or stands for, one the judge is offered. */
	const isOffered = (description: string) =>
		offered.has(keyOf(storedAs(description) ?? description));
	if (written !== undefined && isOffered(written))
		return answer(written, "WrittenStored");
	// An offered draft settles the Reuse before the judge: on the stored dev
	// runs it was right on 1,474 of 1,474, 1,466 of 1,468 and 1,417 of
	// 1,424 attempts, more precise than the judge (ADR 0031).
	if (markedDraft !== undefined && isOffered(markedDraft))
		return answer(markedDraft, "DraftedStored");
	if (options.length > 0) {
		const index = yield* pick(ask, "reading", state, options);
		const picked = index === undefined ? undefined : options[index];
		if (picked !== undefined) return answer(picked.description, "Judged");
	}
	if (written !== undefined) return answer(written, "Rejudged");
	const emojiDescription =
		markedDraft ??
		(yield* askOpenEmojiDescription(lemma, state, reflexive));
	const reason = isOffered(emojiDescription)
		? "Collision"
		: markedDraft === undefined
			? "Written"
			: "Drafted";
	return answer(emojiDescription, reason);
});

/**
 * Resolves one click's Reading. A Sentence whose segmentation failed, a
 * unit intake left Unresolved or that is no unit of its Sentence, an
 * Attestation off the unit's route or in another language than German,
 * a Foreign Attestation, whose one Reading has no Emoji Description (ADR
 * 0045), and a candidate that is no Emoji Description are bad input, a
 * Defect raised before anything is asked.
 */
export const resolveReading = Effect.fnUntraced(function* (
	input: ResolveReadingInput,
): Effect.fn.Return<
	ReadingResolution,
	ProviderFailure | InvalidModelOutput,
	Jev | Luna | CallLog
> {
	const log = yield* CallLog;
	const validated = yield* validateReadingInput(input);
	const { route, lemma, keyOf, candidateByKey, reflexive, optional, state } =
		validated;
	/**
	 * The stored candidate a description is: itself, or for a 🪞 one on a
	 * reflexive click the optionally reflexive Reading with its bare emoji,
	 * since a Lemma never has both (ADR 0052).
	 */
	const storedAs = (emojiDescription: string) => {
		const exact = candidateByKey.get(keyOf(emojiDescription));
		if (exact !== undefined) return exact;
		if (!reflexive) return undefined;
		const bare = keyOf(withReflexiveMarker(emojiDescription, false));
		return optional.has(bare) ? candidateByKey.get(bare) : undefined;
	};
	/** A stored candidate the description is, as stored, or the description as New. */
	const answer: AnswerReading = (emojiDescription, reason) => {
		const stored = storedAs(emojiDescription);
		log.resolution({ outcome: stored ? "Reuse" : "New", reason });
		return stored
			? { _tag: "Reuse", emojiDescription: stored }
			: { _tag: "New", emojiDescription };
	};
	const ask = yield* stageAsk;
	const authored = authoredFor(lemma).map(
		({ reading }) => reading.emojiDescription,
	);
	if (closedRoute(route))
		return yield* resolveClosedRouteReading(
			ask,
			log,
			route,
			lemma,
			state,
			authored,
			answer,
		);
	return yield* resolveOpenRouteReading(
		input,
		validated,
		ask,
		authored,
		storedAs,
		answer,
	);
});
