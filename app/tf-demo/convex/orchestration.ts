"use node";

import { type Infer, v } from "convex/values";
import { parseScroll, type Scroll } from "dumgen";
import * as Effect from "effect/Effect";
import { extractPaste } from "../server/extraction";
import {
	inspected,
	inspectionStep,
	spanHops,
} from "../server/inspectionCapture";
import { unsupportedLanguageMessage } from "../server/intake";
import {
	fetchPage,
	LINK_REJECTED_MESSAGE,
	readPage,
} from "../server/linkIntake";
import { logged } from "../server/logging";
import { executeResolutionSession } from "../server/resolutionSessionExecution";
import { submittedLink } from "../shared/submitted-link";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import { orchestratorFor } from "./model/clickOrchestrator";
import { inspectionFor } from "./model/inspectionAction";
import { createResolutionSessionLifecycle } from "./model/resolutionSessionLifecycle";
import {
	analyzeScroll,
	type SubmitTextActionResult,
	submitTextResultValidator,
} from "./model/scrollAnalysis";
import {
	languageValidator,
	resolutionSessionGuardValidator,
} from "./model/validators";

const submitLinkResultValidator = v.union(
	v.object({
		status: v.literal("Accepted"),
		scrollId: v.id("scrolls"),
		/** What the Scroll is called: the article's title, else the link. */
		title: v.string(),
	}),
	v.object({
		status: v.literal("Rejected"),
		message: v.string(),
	}),
);

type SubmitLinkActionResult = Infer<typeof submitLinkResultValidator>;

export const submitText = action({
	args: {
		submissionKey: v.string(),
		sourceText: v.string(),
		visitorId: v.string(),
		/**
		 * The Scroll's target language; German when absent, and only German is
		 * read for now. Sentences in other languages become Plain Sentences.
		 */
		language: v.optional(languageValidator),
		inspectionVisitorId: v.optional(v.string()),
	},
	returns: submitTextResultValidator,
	handler: async (ctx, args): Promise<SubmitTextActionResult> => {
		const language = args.language ?? "de";
		const unsupported = unsupportedLanguageMessage(language);
		if (unsupported !== undefined)
			return { status: "Rejected", message: unsupported };
		// A Scroll submitted before re-runs from its stored Extracted Text.
		const stored = await ctx.runQuery(
			internal.persistence.storedExtractedText,
			{ submissionKey: args.submissionKey, sourceText: args.sourceText },
		);
		return analyzeScroll(ctx, {
			...args,
			language,
			extractedText:
				stored === null
					? extractPaste(args.sourceText)
					: parseScroll(stored),
		});
	},
});

/** The title a Scroll's own Heading gives it, if any. */
function headingTitle(scroll: Scroll): string | undefined {
	return scroll.heading?.runs.map(({ text }) => text).join("") || undefined;
}

/**
 * A link Submission (#1196): the page is fetched and read into one Scroll,
 * which is stored with its URL and the fetched page as its Original, and
 * private to the Visitor who added it. A link that gives no article is
 * Rejected before any model work. The same Visitor's same link opens the
 * Scroll they already have, with no fetch.
 */
export const submitLink = action({
	args: {
		link: v.string(),
		visitorId: v.string(),
		inspectionVisitorId: v.optional(v.string()),
	},
	returns: submitLinkResultValidator,
	handler: async (ctx, args): Promise<SubmitLinkActionResult> => {
		const link = submittedLink(args.link);
		if (link === undefined)
			return { status: "Rejected", message: LINK_REJECTED_MESSAGE };
		const submission = {
			submissionKey: `link:v1:${args.visitorId}:${link}`,
			sourceText: link,
			visitorId: args.visitorId,
			...(args.inspectionVisitorId === undefined
				? {}
				: { inspectionVisitorId: args.inspectionVisitorId }),
			language: "de" as const,
		};
		const stored = await ctx.runQuery(
			internal.persistence.storedExtractedText,
			{ submissionKey: submission.submissionKey, sourceText: link },
		);
		if (stored !== null) {
			const extractedText = parseScroll(stored);
			const result = await analyzeScroll(ctx, {
				...submission,
				extractedText,
			});
			return result.status === "Accepted"
				? { ...result, title: headingTitle(extractedText) ?? link }
				: result;
		}
		const page = await fetchPage(link);
		if (page === undefined)
			return { status: "Rejected", message: LINK_REJECTED_MESSAGE };
		const read = readPage(page);
		if (read.status === "Rejected") return read;
		const original = await ctx.storage.store(
			new Blob([page.received.body], { type: page.contentType }),
		);
		try {
			const result = await analyzeScroll(ctx, {
				...submission,
				extractedText: read.scroll,
				link: {
					...(read.title === undefined ? {} : { title: read.title }),
					url: page.received.url,
					original,
					owner: args.visitorId,
				},
			});
			if (result.status === "Rejected")
				await ctx.storage.delete(original);
			return result.status === "Accepted"
				? { ...result, title: read.title ?? link }
				: result;
		} catch (error) {
			await ctx.storage.delete(original);
			throw error;
		}
	},
});

export const runResolutionSession = internalAction({
	args: {
		...resolutionSessionGuardValidator.fields,
		inspect: v.optional(v.boolean()),
	},
	returns: v.null(),
	handler: async (ctx, { inspect, ...guard }): Promise<null> => {
		const inspection = inspectionFor(
			ctx,
			guard.requestId,
			inspect === true,
		);
		// Lifecycle hops are promises; they run with the session's services so
		// their spans sit under the session's.
		const session = Effect.flatMap(Effect.context<never>(), (services) =>
			executeResolutionSession({
				identity: guard,
				lifecycle: createResolutionSessionLifecycle(
					ctx,
					guard,
					spanHops(services),
				),
				resolve: (selection, checkpoints, observer, context) =>
					orchestratorFor(ctx, guard, observer, inspection)
						.resolveSegment(selection, checkpoints, context)
						.pipe(
							Effect.withSpan(
								"Resolve selected segment",
								inspectionStep(
									"app/tf-demo · linguisticOrchestration",
									{ selection, checkpoints },
								),
							),
						),
			}),
		).pipe(
			Effect.withSpan("Resolution session", {
				...inspectionStep(
					"app/tf-demo · orchestration.runResolutionSession",
					guard,
				),
				root: true,
			}),
		);
		try {
			await Effect.runPromise(inspected(logged(session), inspection));
		} finally {
			await inspection?.flush();
		}
		return null;
	},
});
