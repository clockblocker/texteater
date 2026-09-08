import { useReducer, useState } from "react";
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
	return (
		<div className="dynamic-panes-prototype" data-show-state={showState}>
			<PlaygroundControls>
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
							presentCards: (candidates) =>
								dispatch({
									type: "OpenLayer",
									originPresentationId:
										context.presentationId,
									subjects: candidates.map((candidate) =>
										workspaceSubjectFor(candidate.target),
									),
								}),
						}}
					>
						{renderFixtureSubject(subject, context.presentation)}
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
