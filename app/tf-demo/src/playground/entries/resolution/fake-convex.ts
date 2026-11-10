import { QueryClient } from "@tanstack/react-query";
import type { ConvexReactClient } from "convex/react";
import { type FunctionReference, getFunctionName } from "convex/server";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../../../../shared/knowledge-preferences";
import { DEFAULT_DE_READING_LANGUAGE_LAYOUT } from "../../../../shared/reading-block-layout";
import {
	type SessionPhase,
	type SessionPlan,
	type SessionState,
	sessionTimeline,
	stateAt,
} from "./session";
import {
	type StoryStatus,
	storedNotesById,
	storyScrollView,
} from "./stored-notes";
import { type Story, storyAt } from "./stories";
import {
	resolutionNoteAt,
	selectionResult,
	sentenceIndexOf,
} from "./story-notes";

/**
 * A Convex backend that lives in the page, for the real app's views: a
 * query client and a client object that answer the Scroll, the selection,
 * the Resolution Note and the stored Notes from the stories, on the fake
 * Session's clock. Nothing leaves the browser.
 */

/** One query's round-trip: a stored Note's at commit, a Block layout's at the deal. */
const QUERY_MS = 30;

export type SessionEvent = {
	readonly requestId: string;
	readonly story: Story;
	readonly state: SessionState;
	/** `performance.now()` when the state was reached. */
	readonly now: number;
};

export type FakeConvexOptions = {
	/** The latencies and outcome the next click runs on. */
	readonly plan: () => SessionPlan;
	/** Slow-mo: the Session's clock runs this many times real time. */
	readonly timeScale: () => number;
	readonly onState?: (event: SessionEvent) => void;
};

type Run = {
	readonly requestId: string;
	readonly story: Story;
	readonly clicked: number;
	timeline: readonly SessionState[];
	startedAt: number;
	phase: SessionPhase;
	timers: number[];
	/** Settles `getResolutionNote`'s first answer. */
	started: Deferred;
};

type Deferred = {
	readonly promise: Promise<void>;
	readonly resolve: () => void;
};

function deferred(): Deferred {
	let resolve = () => {};
	const promise = new Promise<void>((settle) => {
		resolve = settle;
	});
	return { promise, resolve };
}

const TERMINAL: readonly SessionPhase[] = ["Committed", "Stored", "Failed"];

function noteKey(requestId: string) {
	return [
		"convexQuery",
		"resolutionSessions:getResolutionNote",
		{ requestId },
	] as const;
}

export function createFakeConvex(options: FakeConvexOptions) {
	const notes = storedNotesById();
	const runs = new Map<string, Run>();
	/** Stories whose occurrence is stored: their next click finds the route. */
	const stored = new Set<string>();
	/** How each story's words stand in the text, as the Scroll's view shows. */
	const status = new Map<string, StoryStatus>();
	const scrollView = () => storyScrollView(({ key }) => status.get(key));
	function stand(story: Story, phase: SessionPhase) {
		const next: StoryStatus | undefined =
			phase === "Failed"
				? "PermanentFailure"
				: phase === "Committed" || phase === "Stored"
					? "Attested"
					: phase === "Clicked"
						? status.get(story.key)
						: "Active";
		if (next === status.get(story.key)) return;
		if (next) status.set(story.key, next);
		queryClient.setQueriesData(
			{ queryKey: ["convexQuery", "scrollViews:get"] },
			scrollView,
		);
	}
	const scale = () => 1 / Math.max(0.05, options.timeScale());
	const wait = (ms: number) =>
		new Promise<void>((resolve) => {
			window.setTimeout(resolve, ms * scale());
		});

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				/* the app's own, so a query asked again is cold when the app's is */
				gcTime: 10_000,
				queryFn: ({ queryKey }) =>
					answer(String(queryKey[1]), queryKey[2] as Args),
			},
		},
	});

	function reach(run: Run, state: SessionState) {
		run.phase = state.phase;
		stand(run.story, state.phase);
		options.onState?.({
			requestId: run.requestId,
			story: run.story,
			state,
			now: performance.now(),
		});
		if (state.phase === "Committed") stored.add(run.story.key);
		const note = resolutionNoteAt(
			run.story,
			run.requestId,
			state.phase,
			run.clicked,
		);
		if (!note) return;
		queryClient.setQueryData(noteKey(run.requestId), note);
		run.started.resolve();
	}

	/** Runs `run`'s timeline from `from` ms in, each state at its time. */
	function schedule(run: Run, from = 0) {
		for (const timer of run.timers) window.clearTimeout(timer);
		run.startedAt = performance.now() - from * scale();
		run.timers = run.timeline
			.filter((state) => from === 0 || state.at > from)
			.map((state) =>
				window.setTimeout(
					() => reach(run, state),
					Math.max(0, state.at - from) * scale(),
				),
			);
	}

	function runningFor(story: Story): Run | undefined {
		return [...runs.values()].find(
			(run) =>
				run.story.key === story.key && !TERMINAL.includes(run.phase),
		);
	}

	async function selectSegment(args: Args) {
		const sentence = sentenceIndexOf(String(args.sentenceId));
		const clicked = Number(args.clickedSegmentIndex);
		const story = sentence === null ? null : storyAt(sentence, clicked);
		if (!story) throw new Error("This Segment cannot be selected.");
		const plan = options.plan();
		const requestId = String(args.requestId);
		const joined = runningFor(story);
		const route = stored.has(story.key) || plan.outcome === "Stored";
		if (route)
			options.onState?.({
				requestId,
				story,
				state: { at: 0, phase: "Clicked" },
				now: performance.now(),
			});
		else if (!joined) {
			const run: Run = {
				requestId,
				story,
				clicked,
				timeline: sessionTimeline(plan),
				startedAt: 0,
				phase: "Clicked",
				timers: [],
				started: deferred(),
			};
			runs.set(requestId, run);
			schedule(run);
		}
		await wait(plan.latencies.selection);
		if (route) {
			options.onState?.({
				requestId,
				story,
				state: { at: plan.latencies.selection, phase: "Stored" },
				now: performance.now(),
			});
			stored.add(story.key);
			stand(story, "Stored");
		}
		return selectionResult(
			story,
			joined?.requestId ?? requestId,
			route,
			joined !== undefined,
		);
	}

	/** A failed Session runs again from its first result, and commits. */
	function retryResolution(args: Args) {
		const run = runs.get(String(args.requestId));
		if (run?.phase !== "Failed") return { retried: false };
		const plan = options.plan();
		run.timeline = sessionTimeline({ ...plan, outcome: "Complete" });
		const from = stateAt(run.timeline, plan.latencies.selection).at;
		run.phase = "Selected";
		stand(run.story, "Selected");
		schedule(run, from);
		return { retried: true };
	}

	type Args = Readonly<Record<string, unknown>>;

	async function storedNote(id: unknown) {
		await wait(QUERY_MS);
		return notes.get(String(id)) ?? null;
	}

	async function answer(name: string, args: Args): Promise<unknown> {
		switch (name) {
			case "scrollViews:get":
				return scrollView();
			case "knowledgeSettings:get":
				return DEFAULT_KNOWLEDGE_SETTINGS;
			case "readingBlockLayouts:getFamilyKind":
				await wait(QUERY_MS);
				return DEFAULT_DE_READING_LANGUAGE_LAYOUT;
			case "readingNotes:get":
				return storedNote(args.readingId);
			case "routeNotes:get": {
				const target = args.target as Args;
				return storedNote(
					target.attestationId ??
						target.lemmaId ??
						target.activeAnalysisKey,
				);
			}
			case "resolutionSessions:getResolutionNote": {
				const run = runs.get(String(args.requestId));
				if (!run) return null;
				await run.started.promise;
				return queryClient.getQueryData(noteKey(run.requestId)) ?? null;
			}
			default:
				return null;
		}
	}

	async function mutate(name: string, args: Args): Promise<unknown> {
		switch (name) {
			case "resolutionSessions:selectSegment":
				return selectSegment(args);
			case "resolutionSessions:retryResolution":
				return retryResolution(args);
			default:
				return null;
		}
	}

	const nameOf = (reference: unknown) =>
		getFunctionName(reference as FunctionReference<"query">);
	/* the views ask a client for no more than these three */
	const convex = {
		query: (reference: unknown, args: Args) =>
			nameOf(reference) === "library:progress"
				? Promise.resolve({ status: "Reading", position: 0 })
				: answer(nameOf(reference), args),
		mutation: (reference: unknown, args: Args) =>
			mutate(nameOf(reference), args),
		action: async () => null,
	} as unknown as ConvexReactClient;

	return {
		queryClient,
		convex,
		/** Forgets every Session and stored occurrence, for a fresh replay. */
		reset() {
			for (const run of runs.values())
				for (const timer of run.timers) window.clearTimeout(timer);
			runs.clear();
			stored.clear();
			status.clear();
			queryClient.clear();
		},
	};
}

export type FakeConvex = ReturnType<typeof createFakeConvex>;
