import "./support/dom";
import { afterEach, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { ConvexProvider, type ConvexReactClient } from "convex/react";
import type { Id } from "../convex/_generated/dataModel";
import {
	STORED_DEAL_WAIT_MS,
	useSegmentSelection,
} from "../src/hooks/use-segment-selection";
import {
	ReaderSentence,
	type ReaderSentenceData,
} from "../src/views/reader-sentence";
import {
	type WorkspaceCardTarget,
	WorkspaceInteractionProvider,
} from "../src/workspace/workspace-controller";

/** The setting that once put the Attestation Card in front. */
const RETIRED_ROUTE_NOTE_KEY = "tf-demo.route-notes-enabled.v1";

const canonical = {
	readingId: "reading-1" as Id<"readings">,
	lemmaId: "lemma-1" as Id<"lemmas">,
	surfaceId: "surface-1" as Id<"surfaces">,
	surfaceLanguage: "de" as const,
	normalizedSurface: "verarbeiten",
	attestationId: "attestation-1" as Id<"attestations">,
	steps: { attestation: true, surface: true, lemma: true },
};

const sentence = {
	sentenceId: "sentence-1",
	language: "de",
	stitchedText: "Wir verarbeiten",
	segments: [
		{ index: 0, kind: "ResolvableText", text: "Wir" },
		{ index: 1, kind: "Whitespace", text: " " },
		{ index: 2, kind: "ResolvableText", text: "verarbeiten" },
	],
} as unknown as ReaderSentenceData;

afterEach(() => {
	cleanup();
	localStorage.clear();
});

function Reader() {
	const selection = useSegmentSelection("visitor-1");
	return (
		<ReaderSentence
			sentence={sentence}
			selectedSegmentKey={selection.selectedSegmentKey}
			onSegmentClick={(clicked, index, anchor) =>
				selection.select(
					clicked.sentenceId as Id<"sentences">,
					index,
					anchor,
				)
			}
		/>
	);
}

/** A query client whose every stored Note is answered by `note`. */
function notesClient(note: () => Promise<unknown> = async () => null) {
	return new QueryClient({
		defaultOptions: { queries: { retry: false, queryFn: note } },
	});
}

/** Clicks "verarbeiten" with the selection answered by `reply`; `dealt` fills as Decks are dealt. */
function reader(reply: unknown, notes = notesClient(), init?: MouseEventInit) {
	const asked: unknown[] = [];
	const dealt: (readonly WorkspaceCardTarget[])[] = [];
	const client: Pick<ConvexReactClient, "mutation"> = {
		mutation: async (_reference, args) => {
			asked.push(args);
			return reply;
		},
	};
	const view = render(
		<ConvexProvider client={client as ConvexReactClient}>
			<QueryClientProvider client={notes}>
				<WorkspaceInteractionProvider
					interaction={{
						follow: () => {},
						presentCards: (cards) => {
							dealt.push(cards);
						},
					}}
				>
					<Reader />
				</WorkspaceInteractionProvider>
			</QueryClientProvider>
		</ConvexProvider>,
	);
	fireEvent.click(view.getByText("verarbeiten"), init);
	return { asked, dealt };
}

/**
 * Clicks "verarbeiten" with the selection answered by `reply`, and returns
 * what was asked of `selectSegment` and the Cards dealt.
 */
async function click(reply: unknown, init: MouseEventInit = {}) {
	const { asked, dealt } = reader(reply, notesClient(), init);
	await waitFor(() => expect(dealt).toHaveLength(1));
	return {
		asked,
		roles: dealt[0]?.map(({ key }) => key.split(":")[1]),
	};
}

const resolving = {
	kind: "Resolving",
	requestId: "request-1",
	progress: "Starting",
	activity: "Scheduled",
	deduplicated: false,
};
/** A click on a unit of more than the clicked word. */
const resolvingUnit = {
	...resolving,
	unitRoute: { language: "de", family: "Lexeme", kind: "VERB" },
	unitSegments: [0, 2],
};
const available = { kind: "Available", canonical };

test("nothing a click carries puts another Card in front of the Reading", async () => {
	for (const [reply, roles] of [
		[resolving, ["Reading"]],
		[resolvingUnit, ["Reading", "Attestation"]],
		[available, ["Reading", "Lemma", "Surface", "Attestation"]],
	] as const)
		for (const [retiredSetting, altKey] of [
			[false, false],
			[true, false],
			[false, true],
		] as const) {
			if (retiredSetting)
				localStorage.setItem(RETIRED_ROUTE_NOTE_KEY, "true");
			const selection = await click(reply, { altKey });
			expect(selection.roles).toEqual([...roles]);
			expect(selection.asked[0]).not.toHaveProperty("routeNoteRequested");
			cleanup();
			localStorage.clear();
		}
});

const settled = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

test("a stored route's Deck is dealt once its Notes have loaded, a running Session's at once", async () => {
	const waiting: ((note: unknown) => void)[] = [];
	const slow = () =>
		notesClient(
			() =>
				new Promise((resolve) => {
					waiting.push(resolve);
				}),
		);
	const stored = reader(available, slow());
	await waitFor(() => expect(waiting).toHaveLength(5));
	expect(stored.dealt).toHaveLength(0);
	for (const answer of waiting) answer(null);
	await waitFor(() => expect(stored.dealt).toHaveLength(1));
	cleanup();

	const running = reader(resolving, slow());
	await waitFor(() => expect(running.dealt).toHaveLength(1));
});

test("a stored route whose Notes are slow is dealt anyway after the wait", async () => {
	const stored = reader(
		available,
		notesClient(() => new Promise(() => {})),
	);
	await settled(STORED_DEAL_WAIT_MS / 2);
	expect(stored.dealt).toHaveLength(0);
	await waitFor(() => expect(stored.dealt).toHaveLength(1), {
		timeout: STORED_DEAL_WAIT_MS * 2,
	});
});
