import type { FunctionArgs } from "convex/server";
import { useCallback } from "react";
import { usePendingAction } from "@/hooks/use-pending-action";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { submittedLink } from "../../shared/submitted-link";

/** A submission's outcome; an accepted link carries its article's title. */
type Submitted =
	| {
			readonly status: "Accepted";
			readonly scrollId: Id<"scrolls">;
			readonly title?: string;
	  }
	| { readonly status: "Rejected"; readonly message: string };

/**
 * The Library's text box: a lone http(s) link goes to `submitLink`, which
 * fetches the article (#1196); anything else is pasted text for
 * `submitText`. An accepted link carries its article's title.
 */
export function useTextOrLinkSubmission() {
	const text = usePendingAction(api.orchestration.submitText);
	const link = usePendingAction(api.orchestration.submitLink);
	const runText = text.run;
	const runLink = link.run;
	const run = useCallback(
		async (
			args: FunctionArgs<typeof api.orchestration.submitText>,
		): Promise<Submitted> => {
			const url = submittedLink(args.sourceText);
			if (url === undefined) return runText(args);
			return runLink({
				link: url,
				visitorId: args.visitorId,
				...(args.inspectionVisitorId === undefined
					? {}
					: { inspectionVisitorId: args.inspectionVisitorId }),
			});
		},
		[runText, runLink],
	);
	return { run, isPending: text.isPending || link.isPending } as const;
}
