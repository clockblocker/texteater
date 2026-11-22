import { RegistryContext } from "@effect/atom-react";
import { useAction } from "convex/react";
import type { FunctionArgs } from "convex/server";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import {
	useCallback,
	useContext,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import {
	createCommandScheduler,
	runCommandEffect,
	squashCommandFailure,
	tryCommandPromise,
} from "@/lib/command-scheduler";
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

type TextSubmissionArgs = FunctionArgs<typeof api.orchestration.submitText>;
type LinkSubmissionArgs = FunctionArgs<typeof api.orchestration.submitLink>;

const textOrLinkScheduler = createCommandScheduler();

/**
 * Schedules a Library text or link submission under one `singleFlight` lane
 * so duplicate or overlapping submits cannot race `submitText` and `submitLink`.
 */
export function scheduleTextOrLinkSubmission(
	registry: AtomRegistry.AtomRegistry,
	laneKey: string,
	args: TextSubmissionArgs,
	deps: {
		readonly submitText: (args: TextSubmissionArgs) => Promise<Submitted>;
		readonly submitLink: (args: LinkSubmissionArgs) => Promise<Submitted>;
	},
) {
	return textOrLinkScheduler.schedule(
		registry,
		{ mode: "singleFlight", key: () => laneKey },
		args,
		tryCommandPromise(() => {
			const url = submittedLink(args.sourceText);
			if (url === undefined) return deps.submitText(args);
			return deps.submitLink({
				link: url,
				visitorId: args.visitorId,
				...(args.inspectionVisitorId === undefined
					? {}
					: { inspectionVisitorId: args.inspectionVisitorId }),
			});
		}),
	);
}

/**
 * The Library's text box: a lone http(s) link goes to `submitLink`, which
 * fetches the article (#1196); anything else is pasted text for
 * `submitText`. An accepted link carries its article's title.
 */
export function useTextOrLinkSubmission() {
	const registry = useContext(RegistryContext);
	const laneKey = useId();
	const submitText = useAction(api.orchestration.submitText);
	const submitLink = useAction(api.orchestration.submitLink);
	const [pendingCount, setPendingCount] = useState(0);
	const isMountedRef = useRef(true);

	// oxlint-disable-next-line textfresser/no-unreasoned-state-sync -- tracks mounted lifetime to guard async completion state updates
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	const run = useCallback(
		async (args: TextSubmissionArgs): Promise<Submitted> => {
			setPendingCount((count) => count + 1);
			try {
				const outcome = await runCommandEffect(
					scheduleTextOrLinkSubmission(registry, laneKey, args, {
						submitText,
						submitLink,
					}),
				);
				if (AsyncResult.isFailure(outcome)) {
					throw squashCommandFailure(outcome);
				}
				return outcome.value;
			} finally {
				if (isMountedRef.current) {
					setPendingCount((count) => Math.max(0, count - 1));
				}
			}
		},
		[laneKey, registry, submitLink, submitText],
	);
	return { run, isPending: pendingCount > 0 } as const;
}
