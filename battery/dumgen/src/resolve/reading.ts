/**
 * The body of `resolve.reading` (#859, ADR 0031): which Reading of its
 * Lemma a resolved click lands on, told apart by the Emoji Description
 * alone.
 *
 * - On a Closed Route a Lemma takes its authored Reading with no call, or
 *   jev's pick when it has several, and one dumspec authors no Reading of
 *   is a Catalog Miss (ADR 0021).
 * - On an Open Route jev judges first: it sees the Lemma's authored and
 *   stored Emoji Descriptions bare beside the marked Sentence and picks
 *   one or answers NoMatch. Only after NoMatch, or with none to offer,
 *   does Luna write one, from the marked Sentence and the Canonical Form
 *   alone. An authored set may miss a sense, so its Lemma can gain a New
 *   Reading beside it (#877 R4). Luna writing an offered one takes it: the
 *   judge was wrong.
 * - A host that refused a New as stale passes the description Luna wrote
 *   as `written`: the judge runs again over the current candidates, and a
 *   second NoMatch takes it (ADR 0031).
 *
 * Descriptions compare as Dumling parses them, so `🕰️` is `🕰`. Nothing is
 * retried, and no answer is salvaged (#889).
 */
import { parseUnit, readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import { authoredFor, closedRoute } from "dumspec/inventories";
import * as Effect from "effect/Effect";
import type { OperationScope } from "../call.js";
import { InvalidModelOutput, type ProviderFailure } from "../errors.js";
import { askThrough, type JevSettings } from "../jev-call.js";
import type { LunaRequest } from "../luna.js";
import { askLuna, type LunaSettings } from "../luna-call.js";
import { type Ask, choice, choiceOf } from "../segment/ask.js";
import type { Route } from "../segment/segmented-sentence.js";
import {
	generation,
	judgePolicy,
	judgeQuestion,
	readingDemonstrations,
} from "./de/reading-prompts.js";
import { targetOf } from "./de/target.js";
import type { ReadingResolution, ResolveReadingInput } from "./types.js";

/** What `resolve.reading` reaches its models with: jev judges, Luna writes. */
export type ReadingModels = {
	readonly jev: JevSettings;
	readonly luna: LunaSettings;
};

/** The Sentence with each run of the unit's Segments marked `<TARGET>…</TARGET>`. */
export function markedSentence(
	segments: readonly { readonly text: string }[],
	unitSegments: readonly number[],
): string {
	const marked = new Set(unitSegments);
	return segments
		.map(({ text }, index) => {
			if (!marked.has(index)) return text;
			const opens = marked.has(index - 1) ? "" : "<TARGET>";
			const closes = marked.has(index + 1) ? "" : "</TARGET>";
			return `${opens}${text}${closes}`;
		})
		.join("");
}

/** The judge's policy block, the same for every click. */
const policyBlock = {
	task: judgePolicy.task,
	meaning: judgePolicy.meaning,
	label: judgePolicy.label,
	distinct: judgePolicy.distinct,
	noMatch: judgePolicy.noMatch,
	copula: judgePolicy.copula,
	multiword: judgePolicy.multiword,
};

/** Luna's system prompt, the same for every click so the provider can cache it. */
export const generationPrompt = [
	generation.task,
	generation.meaning,
	generation.distinct,
	generation.copula,
	generation.polarity,
	generation.existential,
	generation.multiword,
	generation.json,
	generation.examples,
	...readingDemonstrations.map(({ text }) => text),
].join("\n");

/**
 * The string schema Luna answers under. Strict mode stays off, E10's arm RS
 * (#526, ruled 2026-10-03), so the provider enforces none of it: the schema
 * states the constraint, and Dumling's emoji-grapheme parse enforces it.
 */
export const emojiDescriptionSchema = {
	type: "string",
	minLength: 1,
	description: generation.schema,
} as const;

/**
 * The Emoji Description request Luna gets, without its configuration. Luna
 * answers JSON under a string schema with strict mode off, E10's arm RS
 * (#526, ruled 2026-10-03): fewer lost clicks than free text. An answer
 * that is no Emoji Description is still refused, never salvaged.
 */
export function emojiDescriptionRequest(input: {
	readonly markedSentence: string;
	readonly lemma: string;
}): Omit<LunaRequest, "configuration"> {
	return {
		systemPrompt: generationPrompt,
		input,
		outputFormat: "json",
		outputSchema: emojiDescriptionSchema,
	};
}

/** An Emoji Description as Dumling parses it, or undefined when it is none. */
function parsedDescription(
	lemma: Dumling.Lemma<"de">,
	value: unknown,
): string | undefined {
	if (typeof value !== "string") return undefined;
	const parsed = parseUnit({
		unitKind: "Reading",
		lemma,
		emojiDescription: value.trim(),
	});
	if (!parsed.success) return undefined;
	return (parsed.chain.value as { emojiDescription: string })
		.emojiDescription;
}

/** One option the judge sees: an Emoji Description, and whether dumspec authors it. */
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
	return index;
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
	scope: OperationScope,
	models: ReadingModels,
	input: ResolveReadingInput,
): Effect.fn.Return<ReadingResolution, ProviderFailure | InvalidModelOutput> {
	const { attestation, sentence, unit } = input;
	const lemma = attestation.surface.lemma as Dumling.Lemma<"de">;
	const defect = (message: string) => Effect.die(Error(message));
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
	const keyOf = (emojiDescription: string) =>
		readingIdentityKey({
			unitKind: "Reading",
			lemma,
			emojiDescription,
		} as Dumling.Reading<"de">);
	const candidates: string[] = [];
	const seen = new Set<string>();
	for (const candidate of input.candidates) {
		if (parsedDescription(lemma, candidate) === undefined)
			return yield* defect(
				`The candidate ${JSON.stringify(candidate)} is no Emoji Description`,
			);
		const key = keyOf(candidate);
		if (seen.has(key)) continue;
		seen.add(key);
		candidates.push(candidate);
	}
	/** A stored candidate the description is, as stored, or the description as New. */
	const answer = (
		emojiDescription: string,
		reason: string,
	): ReadingResolution => {
		const key = keyOf(emojiDescription);
		const stored = candidates.find((candidate) => keyOf(candidate) === key);
		scope.resolution({ outcome: stored ? "Reuse" : "New", reason });
		return stored
			? { _tag: "Reuse", emojiDescription: stored }
			: { _tag: "New", emojiDescription };
	};
	const state = {
		markedSentence: markedSentence(sentence.segments, unit.segments),
		lemma: lemma.canonicalForm,
	};
	const ask = askThrough(scope, models.jev);

	const authored = authoredFor(lemma).map(
		({ reading }) => reading.emojiDescription,
	);
	// A Closed Route: its authored Reading, or jev's pick of them.
	if (closedRoute(route)) {
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
		scope.resolution({ outcome: "CatalogMiss", reason: message });
		return { _tag: "CatalogMiss", route, message };
	}

	// An Open Route: the judge over the authored and stored descriptions,
	// then Luna.
	const authoredKeys = new Set(authored.map(keyOf));
	const options = [...authored, ...candidates]
		.filter(
			(option, index, all) =>
				all.findIndex((other) => keyOf(other) === keyOf(option)) ===
				index,
		)
		.map((description) => ({
			description,
			authored: authoredKeys.has(keyOf(description)),
		}));
	const offered = new Set(
		options.map(({ description }) => keyOf(description)),
	);
	const written =
		input.written === undefined
			? undefined
			: parsedDescription(lemma, input.written);
	if (input.written !== undefined && written === undefined)
		return yield* defect(
			`The written ${JSON.stringify(input.written)} is no Emoji Description`,
		);
	if (written !== undefined && offered.has(keyOf(written)))
		return answer(written, "WrittenStored");
	if (options.length > 0) {
		const index = yield* pick(ask, "reading", state, options);
		const picked = index === undefined ? undefined : options[index];
		if (picked !== undefined) return answer(picked.description, "Judged");
	}
	if (written !== undefined) return answer(written, "Rejudged");
	const emojiDescription = yield* askLuna(
		scope,
		models.luna,
		"emojiDescription",
		emojiDescriptionRequest(state),
		(output) =>
			parsedDescription(lemma, output) ??
			new InvalidModelOutput({
				stage: "emojiDescription",
				message: `Luna answered no Emoji Description: ${JSON.stringify(output).slice(0, 80)}`,
			}),
	);
	return answer(
		emojiDescription,
		offered.has(keyOf(emojiDescription)) ? "Collision" : "Written",
	);
});
