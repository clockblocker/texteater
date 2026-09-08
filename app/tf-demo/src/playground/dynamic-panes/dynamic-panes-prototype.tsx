import { useReducer, useRef, useState } from "react";
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
import { useWorkspaceSentenceReveal } from "@/workspace/useWorkspaceSentenceReveal";
import {
	PASSIVE_WORKSPACE_INTERACTION,
	WorkspaceInteractionProvider,
} from "@/workspace/workspace-controller";
import {
	type TransitionRecord,
	WorkspaceStateInspector,
} from "./workspace-state-inspector";
import "./dynamic-panes-prototype.css";
import "@/workspace/workspace-reading-layout.css";

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
	const queueSentenceReveal = useWorkspaceSentenceReveal({
		root,
		state: workspace,
		isReady: (state) => !state.gesture,
		findDeck: (workspaceRoot, pending, state) => {
			const layer = Object.values(state.layers).find(
				(layer) =>
					layer.originPresentationId === pending.presentationId,
			);
			return layer
				? workspaceRoot.querySelector<HTMLElement>(
						`[data-card-layer="${layer.id}"]`,
					)
				: null;
		},
	});
	return (
		<div
			ref={root}
			className="dynamic-panes-prototype workspace-reading-layout"
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
									queueSentenceReveal(
										anchor,
										context.presentationId,
									);
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
