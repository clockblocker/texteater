import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "lego";
import { type ReactNode, useMemo, useState } from "react";
import {
	type WorkspaceInteraction,
	WorkspaceInteractionProvider,
} from "@/workspace/workspace-controller";
import type { EntryRoute } from "../playground-router";
import { CardFrame, SheetFrame } from "./frames";
import {
	Inspector,
	InspectorChoice,
	InspectorExamples,
	InspectorSection,
} from "./inspector";
import { type ExampleGroup, exampleTarget } from "./note-examples";
import { segmentsFromTarget, targetFromSegments } from "./notes-gallery";
import { PlaygroundNote, playgroundNotesQuery } from "./playground-note";

/**
 * A prototype of real Notes from the Notes Study fake db, as playground ADR
 * 0001 lays one out: the frame shows only the Note, rendered by tf-demo's
 * real Blocks, and the inspector holds the explanation, the examples worth
 * judging and the knobs.
 *
 * The shown Note is the route, `/playground/<entry>/<kind>/<id>`, so every
 * click inside the Note is a history entry.
 */
export function NotePrototype({
	route,
	title,
	examples,
	lead,
	children,
	wrapNote = (note) => note,
}: {
	readonly route: EntryRoute;
	readonly title: string;
	readonly examples: readonly ExampleGroup[];
	/** The inspector's opening explanation, above the examples. */
	readonly lead: ReactNode;
	/** The inspector's sections after the examples and the frame's knobs. */
	readonly children?: ReactNode;
	/** Wraps the shown Note, as a knob that reaches its Blocks does. */
	readonly wrapNote?: (note: ReactNode) => ReactNode;
}) {
	const snapshot = useQuery(playgroundNotesQuery);
	const [presentation, setPresentation] = useState<"Sheet" | "Card">("Sheet");
	const routed = useMemo(
		() => targetFromSegments(route.segments),
		[route.segments],
	);
	const { setSegments } = route;
	const interaction = useMemo<WorkspaceInteraction>(
		() => ({
			follow: (next) => setSegments(segmentsFromTarget(next)),
			presentCards: () => {},
		}),
		[setSegments],
	);

	if (snapshot.isPending)
		return (
			<div className="p-6" role="status" aria-label="Loading fake db">
				<Skeleton className="h-6 w-64" />
			</div>
		);
	if (snapshot.isError)
		return (
			<p className="p-6 text-sm text-destructive" role="alert">
				The playground fixtures could not be built. Check the Vite
				terminal and reload.
			</p>
		);
	const data = snapshot.data;
	const firstExample = examples[0]?.examples[0];
	const target =
		routed ?? (firstExample ? exampleTarget(data, firstExample) : null);
	const Frame = presentation === "Card" ? CardFrame : SheetFrame;

	return (
		<div className="flex min-h-full justify-center px-6 py-10 lg:pe-[23rem]">
			<div className="w-full max-w-2xl">
				{target ? (
					<WorkspaceInteractionProvider interaction={interaction}>
						<Frame>
							{wrapNote(
								<PlaygroundNote
									target={target}
									presentation={presentation}
									snapshot={data}
									follow={interaction.follow}
								/>,
							)}
						</Frame>
					</WorkspaceInteractionProvider>
				) : null}
			</div>
			<Inspector title={title}>
				<InspectorSection>{lead}</InspectorSection>
				<InspectorExamples
					groups={examples.map((group) => ({
						title: group.title,
						examples: group.examples.map((example) => ({
							...example,
							target: exampleTarget(data, example),
						})),
					}))}
					current={target}
					onSelect={(next) =>
						setSegments(segmentsFromTarget(next), {
							replace: false,
						})
					}
				/>
				<InspectorSection title="Frame">
					<InspectorChoice
						label="Presentation"
						value={presentation}
						options={[
							{ value: "Sheet", label: "Sheet" },
							{ value: "Card", label: "Card" },
						]}
						onChange={setPresentation}
					/>
				</InspectorSection>
				{children}
			</Inspector>
		</div>
	);
}
