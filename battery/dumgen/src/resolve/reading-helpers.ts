import { closedRoute, reflexiveMarker } from "dumcorpus/inventories";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import type { LunaDraft } from "../luna.js";
import { germanFusionTable } from "../segment/de/fusion-entries.js";
import { fusedPieceAt } from "../segment/fusion-table.js";
import type { Route, Segment } from "../segment/segmented-sentence.js";
import {
	generation,
	judgePolicy,
	readingDemonstrations,
} from "./de/reading-prompts.js";

/**
 * The word a Segment stands for when it is a piece of a table fusion the
 * unit holds only part of, in the casing its letters show: `a` of `am` is
 * `an`, `A` of `Am` is `An`. Undefined for any other Segment.
 */
function spelledOutPiece(
	segments: readonly Segment[],
	marked: ReadonlySet<number>,
	index: number,
): string | undefined {
	const piece = fusedPieceAt(germanFusionTable, segments, index);
	if (!piece || piece.role === undefined) return undefined;
	const start = index - piece.component;
	let held = 0;
	for (let position = 0; position < piece.pieces.length; position++)
		if (marked.has(start + position)) held++;
	if (held === 0 || held === piece.pieces.length) return undefined;
	const surfaces = piece.pieces[piece.component]?.surfaces ?? [];
	const [surface] = surfaces;
	const span = segments[index]?.text ?? "";
	if (surface === undefined || surfaces.length !== 1) return undefined;
	const capital = span !== span.toLocaleLowerCase("de");
	return capital
		? surface.charAt(0).toLocaleUpperCase("de") + surface.slice(1)
		: surface;
}

/**
 * The Sentence with each run of the unit's Segments marked
 * `<TARGET>…</TARGET>`. A preposition-article fusion the unit holds only
 * part of is written out as its words, `<TARGET>an</TARGET> dem Feuer` for
 * the `a` of `am Feuer`: a bare piece names nothing, so the models labelled
 * the noun beside it instead (🔥 for `an`). Segments without kinds, as the
 * frozen Knowledge evaluation sets hold them, are marked as written.
 */
export function markedSentence(
	segments: readonly {
		readonly kind?: Segment["kind"];
		readonly text: string;
	}[],
	unitSegments: readonly number[],
): string {
	const marked = new Set(unitSegments);
	const kinded = segments.flatMap(({ kind, text }) =>
		kind === undefined ? [] : [{ kind, text }],
	);
	const words = segments.map((_, index) =>
		kinded.length === segments.length
			? spelledOutPiece(kinded, marked, index)
			: undefined,
	);
	return segments
		.map(({ text }, index) => {
			const word = words[index];
			// A written-out piece after the first follows a space. The unit
			// holds one piece of such a word, so no run of marks spans two.
			const space =
				word !== undefined && words[index - 1] !== undefined ? " " : "";
			const shown = word ?? text;
			if (!marked.has(index)) return `${space}${shown}`;
			const opens = marked.has(index - 1) ? "" : "<TARGET>";
			const closes = marked.has(index + 1) ? "" : "</TARGET>";
			return `${space}${opens}${shown}${closes}`;
		})
		.join("");
}

/** The judge's policy block, the same for every click. */
export const policyBlock = {
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
	generation.modal,
	generation.existential,
	generation.multiword,
	generation.json,
	generation.examples,
	...readingDemonstrations.map(({ text }) => text),
].join("\n");

/**
 * What Luna's Canonical Form call adds to its system prompt to draft the
 * Emoji Description after the headword (ADR 0031): the generation prompt,
 * with its task and output lines naming the draft's fields, a line that
 * confines the draft to the marked Sentence and the written Canonical
 * Form, and the same demonstrations.
 */
export const draftPrompt = [
	generation.draft,
	generation.draftScope,
	generation.meaning,
	generation.distinct,
	generation.copula,
	generation.polarity,
	generation.modal,
	generation.existential,
	generation.multiword,
	generation.draftJson,
	generation.examples,
	...readingDemonstrations.map(({ text }) => text),
].join("\n");

/**
 * Whether `resolve.reading` may ask Luna for a unit's Emoji Description,
 * so its Canonical Form call drafts one: an Open Route, but not Foreign
 * material, whose one Reading has none (ADR 0045).
 */
export function draftsEmojiDescription(route: Route): boolean {
	return !closedRoute(route) && route.family !== "Foreign";
}

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

/** The stage of Luna's Emoji Description call, as its trace and a host's stored answers name it. */
export const emojiDescriptionStage = "emojiDescription";

/**
 * The most tokens the Emoji Description call may write: at most 25 over
 * 9,113 cached answers, and four emoji in ZWJ sequences stay well under.
 */
const emojiDescriptionOutputLimit = 128;

/**
 * The Emoji Description request Luna gets, without its configuration. Luna
 * answers JSON under a string schema with strict mode off, E10's arm RS
 * (#526, ruled 2026-10-03): fewer lost clicks than free text. An answer
 * that is no Emoji Description is still refused, never salvaged.
 */
export function emojiDescriptionRequest(input: {
	readonly markedSentence: string;
	readonly lemma: string;
}): LunaDraft {
	return {
		systemPrompt: generationPrompt,
		input,
		maxOutputTokens: emojiDescriptionOutputLimit,
		outputFormat: "json",
		outputSchema: emojiDescriptionSchema,
	};
}

/** An Emoji Description as Dumling parses it, or undefined when it is none. */
export function parsedDescription(
	lemma: Dumling.Lemma<"de">,
	value: unknown,
): string | undefined {
	if (typeof value !== "string") return undefined;
	const parsed = parseUnit({
		unitKind: "Reading",
		lemma,
		emojiDescription: value.trim(),
	});
	if (!parsed.success || parsed.chain.unitKind !== "Reading")
		return undefined;
	const reading = parsed.chain.value;
	return "emojiDescription" in reading ? reading.emojiDescription : undefined;
}

/**
 * Whether an Attestation's members hold a lexical reflexive: its valency
 * evidence names a Reflexive (ADR 0052).
 */
export const holdsReflexive = (attestation: Dumling.Attestation<"de">) =>
	"valencyEvidence" in attestation &&
	attestation.valencyEvidence.some(
		({ complement }) => complement.kind === "Reflexive",
	);

/**
 * A description with the 🪞 marker grammar gives it (ADR 0052): before it
 * when the click holds a lexical reflexive, never otherwise, whatever the
 * model wrote.
 */
export function withReflexiveMarker(
	description: string,
	reflexive: boolean,
): string {
	const trimmed = description.trim();
	const bare = trimmed.startsWith(reflexiveMarker)
		? trimmed.slice(reflexiveMarker.length)
		: trimmed;
	return reflexive ? `${reflexiveMarker}${bare}` : bare;
}
