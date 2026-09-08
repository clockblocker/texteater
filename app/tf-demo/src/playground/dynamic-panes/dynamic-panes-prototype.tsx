import { useLayoutEffect, useReducer, useRef, useState } from "react";
import {
	createWorkspace,
	getWorkspaceStateLabel,
	Workspace,
	type WorkspaceCommand,
	type WorkspaceState,
	workspaceReducer,
} from "react-resizable-panels/workspace";
import "react-resizable-panels/workspace.css";
import { PlaygroundControls } from "@/playground/playground-controls";
import {
	FIXTURE_TEXT_SUBJECT,
	renderFixtureSubject,
} from "@/playground/sheet-workspace/sheet-workspace-fixtures";
import {
	type WorkspaceSubject,
	workspaceSubjectFor,
} from "@/workspace/sheet-workspace";
import {
	PASSIVE_WORKSPACE_INTERACTION,
	WorkspaceInteractionProvider,
} from "@/workspace/workspace-controller";
import {
	type TransitionRecord,
	WorkspaceStateInspector,
} from "./workspace-state-inspector";
import "./dynamic-panes-prototype.css";

type StudyState = {
	workspace: WorkspaceState<WorkspaceSubject>;
	history: TransitionRecord[];
};
function reduceStudy(
	state: StudyState,
	command: WorkspaceCommand<WorkspaceSubject>,
): StudyState {
	const workspace = workspaceReducer(state.workspace, command);
	if (workspace === state.workspace) return state;
	const history =
		command.type === "ActivatePane"
			? state.history
			: [
					...state.history,
					{
						from: getWorkspaceStateLabel(state.workspace),
						command: command.type,
						to: getWorkspaceStateLabel(workspace),
					},
				].slice(-8);
	return { workspace, history };
}
function subjectLabel(subject: WorkspaceSubject) {
	return subject.kind === "Text"
		? "Source text"
		: subject.target.kind === "UnitReadingNote"
			? "Reading"
			: subject.target.kind === "RouteNote"
				? subject.target.routeKind
				: "Note";
}

/** Content adapter; the battery owns all placement and gesture behavior. */
export function DynamicPanesPrototype() {
	const [{ workspace, history }, dispatch] = useReducer(
		reduceStudy,
		undefined,
		() => ({
			workspace: createWorkspace<WorkspaceSubject>(FIXTURE_TEXT_SUBJECT),
			history: [],
		}),
	);
	const [showState, setShowState] = useState(false);
	const [longText, setLongText] = useState(true);
	const root = useRef<HTMLDivElement>(null);
	const pendingSentence = useRef<{
		anchor: HTMLElement;
		presentationId: string;
	} | null>(null);
	useLayoutEffect(() => {
		const pending = pendingSentence.current;
		if (!pending || workspace.gesture) return;
		pendingSentence.current = null;
		const layer = Object.values(workspace.layers).find(
			(layer) => layer.originPresentationId === pending.presentationId,
		);
		const deck =
			layer &&
			root.current?.querySelector<HTMLElement>(
				`[data-card-layer="${layer.id}"]`,
			);
		const sheet = pending.anchor.closest<HTMLElement>(".workspace__sheet");
		const sentence = pending.anchor.closest<HTMLElement>(
			".text-reader__sentence",
		);
		if (!deck || !sheet || !sentence?.isConnected) return;
		const lineHeight = parseFloat(getComputedStyle(sentence).lineHeight);
		const excess =
			sentence.getBoundingClientRect().bottom -
			(deck.getBoundingClientRect().top - lineHeight * 0.5);
		// Prioritize the sentence ending if the whole sentence cannot fit above the deck.
		if (excess > 0) sheet.scrollTop += excess;
	}, [workspace]);
	return (
		<div
			ref={root}
			className="dynamic-panes-prototype"
			data-show-state={showState}
		>
			<PlaygroundControls>
				<label>
					<input
						type="checkbox"
						checked={longText}
						onChange={(event) => setLongText(event.target.checked)}
					/>{" "}
					Long reading fixture
				</label>
				<button
					type="button"
					className="dynamic-panes__state-toggle"
					aria-expanded={showState}
					onClick={() => setShowState((value) => !value)}
				>
					{showState ? "Hide" : "Show"} state machine
				</button>
			</PlaygroundControls>
			<Workspace
				state={workspace}
				dispatch={dispatch}
				labelSubject={subjectLabel}
				renderSubject={(subject, context) => (
					<WorkspaceInteractionProvider
						interaction={{
							...PASSIVE_WORKSPACE_INTERACTION,
							presentCards: (candidates, options) => {
								const anchor = options?.anchor;
								if (anchor instanceof HTMLElement) {
									context.selectAnchor(anchor);
									pendingSentence.current = {
										anchor,
										presentationId: context.presentationId,
									};
								}
								dispatch({
									type: "OpenLayer",
									originPresentationId:
										context.presentationId,
									subjects: candidates.map((candidate) =>
										workspaceSubjectFor(candidate.target),
									),
								});
							},
						}}
					>
						{renderFixtureSubject(
							subject,
							context.presentation,
							longText,
						)}
					</WorkspaceInteractionProvider>
				)}
			/>
			{showState ? (
				<WorkspaceStateInspector
					state={workspace}
					history={history}
					onClose={() => setShowState(false)}
				/>
			) : null}
		</div>
	);
}
