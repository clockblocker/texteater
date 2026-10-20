"use node";

import { type Infer, v } from "convex/values";
import { assertIdentifier } from "../server/identifiers";
import { unsupportedLanguageMessage } from "../server/intake";
import { planTextFile, scrollBatches } from "../server/textFileIntake";
import {
	MAX_TEXT_FILE_BYTES,
	TEXT_FILE_TOO_LARGE_MESSAGE,
} from "../shared/text-file-limits";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { languageValidator } from "./model/validators";

/**
 * Intake of a `.txt` Submission (#1191): the uploaded file, the Original,
 * is read in Node (512 MiB, where a 16 MB book and its Extracted Text fit),
 * planned by `server/textFileIntake.ts`, and written through
 * `textFiles.ts`: its Sections first, so the book is in the Library at
 * once, then its Scrolls in batches, each readable as plain text when its
 * batch lands. No model runs here: once the whole book is written, the
 * first Scroll's first Folio is processed, then processing follows the
 * reader (#1193).
 */

const submitTextFileResultValidator = v.union(
	v.object({
		status: v.literal("Accepted"),
		sectionId: v.id("sections"),
		title: v.string(),
	}),
	v.object({
		status: v.literal("Rejected"),
		message: v.string(),
	}),
);

type SubmitTextFileResult = Infer<typeof submitTextFileResultValidator>;

const UPLOAD_MISSING_MESSAGE = "The file didn't arrive. Try adding it again.";

/** A file's identity: the same bytes are the same Submission. */
async function submissionKeyOf(
	bytes: Uint8Array<ArrayBuffer>,
): Promise<string> {
	const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
	const hex = Array.from(digest, (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
	return `file:v1:${hex}`;
}

/** How often a batch the write rate turned away is tried again. */
const WRITE_RATE_RETRIES = 10;

/**
 * Runs a write, waiting and trying again while the deployment's write rate
 * (about 4 MiB a second) turns it away; a turned-away mutation wrote
 * nothing.
 */
async function withWriteRateRetries<T>(write: () => Promise<T>): Promise<T> {
	for (let attempt = 1; ; attempt += 1) {
		try {
			return await write();
		} catch (error) {
			if (
				attempt > WRITE_RATE_RETRIES ||
				!String(error).includes("TooManyWrites")
			)
				throw error;
			await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
		}
	}
}

export const submitTextFile = action({
	args: {
		visitorId: v.string(),
		storageId: v.id("_storage"),
		fileName: v.string(),
		/** The book's target language; German when absent, as for a paste. */
		language: v.optional(languageValidator),
	},
	returns: submitTextFileResultValidator,
	handler: async (ctx, args): Promise<SubmitTextFileResult> => {
		assertIdentifier(args.visitorId, "visitorId");
		const rejected = async (
			message: string,
		): Promise<SubmitTextFileResult> => {
			await ctx.storage.delete(args.storageId);
			return { status: "Rejected", message };
		};
		const unsupported = unsupportedLanguageMessage(args.language ?? "de");
		if (unsupported !== undefined) return rejected(unsupported);
		const file = await ctx.storage.get(args.storageId);
		if (!file)
			return { status: "Rejected", message: UPLOAD_MISSING_MESSAGE };
		if (file.size > MAX_TEXT_FILE_BYTES)
			return rejected(TEXT_FILE_TOO_LARGE_MESSAGE);
		const bytes = new Uint8Array(await file.arrayBuffer());
		const planned = planTextFile({ name: args.fileName, bytes });
		if (planned.kind === "Rejected") return rejected(planned.message);
		const { plan } = planned;
		const submissionKey = await submissionKeyOf(bytes);
		const stored = await ctx.runQuery(internal.textFiles.storedSubmission, {
			submissionKey,
			scrollCount: plan.scrolls.length,
		});
		if (stored) {
			await ctx.storage.delete(args.storageId);
			return { status: "Accepted", ...stored };
		}
		const limit = await ctx.runMutation(
			internal.rateLimits.consumeTextSubmission,
			{ visitorId: args.visitorId },
		);
		if (!limit.ok) return rejected(limit.message);

		const sectionIds = await ctx.runMutation(
			internal.textFiles.writeSections,
			{
				submissionKey,
				originalId: args.storageId,
				sections: [...plan.sections],
			},
		);
		const topId = sectionIds[0];
		if (topId === undefined) throw new Error("A book has a top Section.");
		let firstScrollId: Id<"scrolls"> | undefined;
		try {
			let index = 0;
			for (const batch of scrollBatches(plan.scrolls)) {
				const scrolls = batch.map((scroll) => {
					const sectionId = sectionIds[scroll.section];
					if (sectionId === undefined)
						throw new Error("A Scroll's Section is written first.");
					return {
						sectionId,
						order: scroll.order,
						// A failed run's half-written copy keeps its own keys.
						submissionKey: `${submissionKey}/${topId}#${index++}`,
						...(scroll.title === undefined
							? {}
							: { title: scroll.title }),
						sourceText: scroll.sourceText,
						extractedText: scroll.extractedText,
						sceneBreaks: [...scroll.sceneBreaks],
						sentences: scroll.sentences.map((sentence) => ({
							...sentence,
						})),
					};
				});
				const written = await withWriteRateRetries(() =>
					ctx.runMutation(internal.textFiles.writeScrolls, {
						scrolls,
					}),
				);
				firstScrollId ??= written[0];
			}
		} catch (error) {
			// No half-written book stays in the Library; the Original goes too.
			for (const sectionId of [...sectionIds].reverse())
				while (
					await ctx.runMutation(
						internal.textFiles.discardSectionBatch,
						{
							sectionId,
						},
					)
				);
			throw error;
		}
		if (firstScrollId !== undefined)
			await ctx.runMutation(internal.folios.follow, {
				scrollId: firstScrollId,
				position: 0,
			});
		return { status: "Accepted", sectionId: topId, title: plan.title };
	},
});
