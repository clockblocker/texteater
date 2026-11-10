import "./support/dom";
import { expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "@testing-library/react";
import { ResolutionStepNoteFrame } from "../src/views/resolution-note-view";
import { NotePartProvider } from "../src/workspace/note-part";
import { WorkspaceInteractionProvider } from "../src/workspace/workspace-controller";
import { renderWithAtoms } from "./support/atoms";

const unitRoute = {
	language: "de" as const,
	family: "Lexeme" as const,
	kind: "NOUN" as const,
};

/** A query client whose Block layout answers only when the test lets it. */
function layoutClient() {
	let answer: (layout: unknown) => void = () => {};
	const client = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				queryFn: ({ queryKey }) =>
					queryKey[1] === "readingBlockLayouts:getFamilyKind"
						? new Promise((resolve) => {
								answer = resolve;
							})
						: new Promise(() => {}),
			},
		},
	});
	return { client, answer: (layout: unknown) => answer(layout) };
}

/** The Reading step's Body as a Deck deals it, before the Session's first result. */
function dealtReadingStep(client: QueryClient) {
	return renderWithAtoms(
		<QueryClientProvider client={client}>
			<WorkspaceInteractionProvider
				interaction={{ follow: () => {}, presentCards: () => {} }}
			>
				<NotePartProvider value="body">
					<ResolutionStepNoteFrame
						stepKind="Reading"
						requestId="request-1"
						presentation="Card"
						note={null}
						unitRoute={unitRoute}
					/>
				</NotePartProvider>
			</WorkspaceInteractionProvider>
		</QueryClientProvider>,
	);
}

test("a Reading step is dealt in its own Blocks while its Block layout loads, and keeps them when it has", async () => {
	const { client, answer } = layoutClient();
	const view = dealtReadingStep(client);
	const note = view.container.querySelector('[data-note-kind="Reading"]');
	expect(note).not.toBeNull();
	const blocks = [...view.container.querySelectorAll("*")];

	await act(async () => {
		answer({
			order: [
				"Valency",
				"Breakdown",
				"Relations",
				"Translations",
				"Definition",
				"PersonalAnnotation",
			],
			hidden: [],
		});
	});
	expect(view.container.querySelector('[data-note-kind="Reading"]')).toBe(
		note,
	);
	expect([...view.container.querySelectorAll("*")]).toEqual(blocks);
});
