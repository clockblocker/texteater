import "./support/dom";
import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { ConvexProvider, type ConvexReactClient } from "convex/react";
import type { Id } from "../convex/_generated/dataModel";
import { useSegmentSelection } from "../src/hooks/use-segment-selection";
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

/**
 * Clicks "verarbeiten" with the selection answered by `reply`, and returns
 * what was asked of `selectSegment` and the Cards dealt.
 */
async function click(reply: unknown, init: MouseEventInit = {}) {
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
		</ConvexProvider>,
	);
	fireEvent.click(view.getByText("verarbeiten"), init);
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
const available = { kind: "Available", canonical };

test("nothing a click carries puts another Card in front of the Reading", async () => {
	for (const [reply, roles] of [
		[resolving, ["Reading", "Attestation"]],
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
