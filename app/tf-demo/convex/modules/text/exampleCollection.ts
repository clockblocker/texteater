import {
	EXAMPLES_SUBMISSION_KEY,
	EXAMPLES_TEXT_TITLE,
	exampleContext,
} from "../../../shared/notes-study/example-contexts";
import { NOTE_STUDY_DATABASE } from "../../../shared/notes-study/note-study-dummy-database";
import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";

const LIMIT = 256;
const SEGMENT_LIMIT = 512;

function proseSegments(text: string) {
	return (text.match(/ +|[^\s\p{P}]+|\p{P}/gu) ?? []).map((text) => ({
		text,
		kind: /^ +$/.test(text)
			? ("Whitespace" as const)
			: /^\p{P}$/u.test(text)
				? ("Punctuation" as const)
				: ("ResolvableText" as const),
	}));
}

async function contextualize(
	ctx: MutationCtx,
	sentence: Doc<"sentences">,
	heading: string,
) {
	const { before, after } = exampleContext(heading);
	const stitchedText = before + heading + after;
	if (sentence.stitchedText === stitchedText) return stitchedText;
	if (sentence.stitchedText !== `${heading}.`)
		throw new Error(
			`Example ${heading} was edited; refusing to replace its content.`,
		);
	const sessions = await ctx.db
		.query("resolutionSessions")
		.withIndex("by_sentence_id", (q) => q.eq("sentenceId", sentence._id))
		.take(LIMIT + 1);
	if (sessions.length > 0)
		throw new Error(
			`Example ${heading} has Resolution Sessions; finish their cleanup before changing its context.`,
		);
	const segments = await ctx.db
		.query("segments")
		.withIndex("by_sentence_id_and_index", (q) =>
			q.eq("sentenceId", sentence._id),
		)
		.take(SEGMENT_LIMIT + 1);
	if (segments.length > SEGMENT_LIMIT)
		throw new Error("Too many example Segments.");
	let length = 0;
	const target: Doc<"segments">[] = [];
	for (const segment of segments) {
		if (length >= heading.length) break;
		target.push(segment);
		length += segment.text.length;
	}
	if (target.map((segment) => segment.text).join("") !== heading)
		throw new Error(`Cannot preserve ${heading}'s Segment identities.`);
	const prefix = proseSegments(before);
	const suffix = proseSegments(after);
	const retained = new Set(target.map((segment) => segment._id));
	for (const segment of segments) {
		if (retained.has(segment._id)) continue;
		const encounters = await ctx.db
			.query("visitorClicks")
			.withIndex("by_segment_id", (q) => q.eq("segmentId", segment._id))
			.take(1);
		if (segment.attestationMembership || encounters.length > 0)
			throw new Error(
				"Cannot replace an encountered example punctuation Segment.",
			);
		await ctx.db.delete(segment._id);
	}
	for (const [index, segment] of prefix.entries())
		await ctx.db.insert("segments", {
			sentenceId: sentence._id,
			index,
			...segment,
		});
	for (const [index, segment] of target.entries())
		await ctx.db.patch(segment._id, { index: prefix.length + index });
	for (const [index, segment] of suffix.entries())
		await ctx.db.insert("segments", {
			sentenceId: sentence._id,
			index: prefix.length + target.length + index,
			...segment,
		});
	return stitchedText;
}

/** Move only Notes Study examples; retain Sentence, target Segment and Attestation IDs. */
export async function consolidateExampleTexts(ctx: MutationCtx) {
	const texts = await ctx.db
		.query("texts")
		.withIndex("by_submission_key", (q) =>
			q
				.gte("submissionKey", "notes-study:")
				.lt("submissionKey", "notes-study;"),
		)
		.take(LIMIT + 1);
	if (texts.length > LIMIT)
		throw new Error(
			"Too many fixture Texts to consolidate in one transaction.",
		);
	const collection = texts.find(
		(text) => text.submissionKey === EXAMPLES_SUBMISSION_KEY,
	);
	const textId =
		collection?._id ??
		(await ctx.db.insert("texts", {
			submissionKey: EXAMPLES_SUBMISSION_KEY,
			title: EXAMPLES_TEXT_TITLE,
			sourceText: "",
		}));
	const examples: {
		sentence: Doc<"sentences">;
		heading: string;
		related: boolean;
	}[] = [];
	for (const text of texts) {
		const sentences = await ctx.db
			.query("sentences")
			.withIndex("by_text_id_and_position", (q) =>
				q.eq("textId", text._id),
			)
			.take(LIMIT + 1);
		if (sentences.length > LIMIT)
			throw new Error("Too many example Sentences.");
		for (const sentence of sentences) {
			const related = sentence.segmentedSentenceId.startsWith(
				"notes-study:related-",
			);
			const unit = NOTE_STUDY_DATABASE.find((unit) =>
				unit.occurrences.some(
					(occurrence) =>
						occurrence.segmentedSentenceId ===
						sentence.segmentedSentenceId,
				),
			);
			const heading = related
				? decodeURIComponent(
						sentence.segmentedSentenceId
							.slice("notes-study:related-".length)
							.replace(/:\d+:sentence$/, ""),
					)
				: unit?.reading.lemma.canonicalForm;
			if (!heading)
				throw new Error(
					`Unrecognized fixture Sentence ${sentence.segmentedSentenceId}.`,
				);
			examples.push({ sentence, heading, related });
		}
	}
	if (examples.length > LIMIT) throw new Error("Too many example cases.");
	examples.sort(
		(a, b) =>
			a.heading.localeCompare(b.heading, "de") ||
			a.sentence.segmentedSentenceId.localeCompare(
				b.sentence.segmentedSentenceId,
			),
	);
	const paragraphs: string[] = [];
	for (const [
		position,
		{ sentence, heading, related },
	] of examples.entries()) {
		const stitchedText = related
			? await contextualize(ctx, sentence, heading)
			: sentence.stitchedText;
		await ctx.db.patch(sentence._id, {
			textId,
			position,
			heading,
			stitchedText,
		});
		paragraphs.push(`${heading}\n${stitchedText}`);
		const segments = await ctx.db
			.query("segments")
			.withIndex("by_sentence_id_and_index", (q) =>
				q.eq("sentenceId", sentence._id),
			)
			.take(SEGMENT_LIMIT + 1);
		if (segments.length > SEGMENT_LIMIT)
			throw new Error("Too many example Segments.");
		for (const segment of segments) {
			const encounters = await ctx.db
				.query("visitorClicks")
				.withIndex("by_segment_id", (q) =>
					q.eq("segmentId", segment._id),
				)
				.take(LIMIT + 1);
			if (encounters.length > LIMIT)
				throw new Error("Too many example Encounters.");
			for (const encounter of encounters)
				await ctx.db.patch(encounter._id, { textId });
		}
		const sessions = await ctx.db
			.query("resolutionSessions")
			.withIndex("by_sentence_id", (q) =>
				q.eq("sentenceId", sentence._id),
			)
			.take(LIMIT + 1);
		if (sessions.length > LIMIT)
			throw new Error("Too many example Resolution Sessions.");
		for (const session of sessions)
			await ctx.db.patch(session._id, {
				route: { ...session.route, textId },
			});
	}
	await ctx.db.patch(textId, {
		title: EXAMPLES_TEXT_TITLE,
		sourceText: paragraphs.join("\n\n"),
	});
	for (const text of texts)
		if (text._id !== textId) await ctx.db.delete(text._id);
	return {
		textId,
		cases: examples.length,
		movedTexts: texts.filter((text) => text._id !== textId).length,
	};
}
