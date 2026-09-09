import {
	createContext,
	type Dispatch,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
} from "react";
import {
	selectVisibleSheets,
	Workspace,
	type WorkspaceCommand,
	type WorkspaceRenderContext,
} from "react-resizable-panels/workspace";
import "react-resizable-panels/workspace.css";
import {
	type ApplicationWorkspaceStorage,
	loadApplicationWorkspace,
	saveApplicationWorkspace,
} from "./application-workspace-persistence";
import {
	type ApplicationWorkspaceAction,
	type ApplicationWorkspaceSession,
	type ApplicationWorkspaceSubject,
	createApplicationWorkspaceSession,
	reduceApplicationWorkspaceSession,
} from "./application-workspace-state";
import type {
	WorkspacePresentation,
	WorkspaceSubject,
} from "./sheet-workspace";
import { useWorkspaceSentenceReveal } from "./useWorkspaceSentenceReveal";
import {
	WorkspaceControllerProvider,
	type WorkspaceInteraction,
	WorkspaceInteractionProvider,
} from "./workspace-controller";
import "./workspace-reading-layout.css";

type Runtime = {
	session: ApplicationWorkspaceSession;
	dispatch: Dispatch<ApplicationWorkspaceAction>;
};
const RuntimeContext = createContext<Runtime | null>(null);

export function ApplicationWorkspaceProvider({
	children,
	storage,
	initialSession,
}: {
	children: ReactNode;
	storage?: ApplicationWorkspaceStorage | null;
	initialSession?: ApplicationWorkspaceSession;
}) {
	const [session, dispatch] = useReducer(
		reduceApplicationWorkspaceSession,
		{ storage, initialSession },
		(options) =>
			loadApplicationWorkspace(
				options.initialSession ?? createApplicationWorkspaceSession(),
				options.storage,
			),
	);
	useEffect(
		() => saveApplicationWorkspace(session, storage),
		[session, storage],
	);
	const { workspace } = session;
	const visible = selectVisibleSheets(workspace, workspace.activePaneId);
	const activeText = visible.findLast(
		(presentation) => presentation.subject.kind === "Text",
	);
	const revealLibrary = useCallback(
		() => dispatch({ type: "RevealLibrary" }),
		[],
	);
	const controller = useMemo(
		() => ({
			activeTextId:
				activeText?.subject.kind === "Text"
					? activeText.subject.target.textId
					: null,
			isLibraryVisible: visible.at(-1)?.subject.kind === "Library",
			revealLibrary,
		}),
		[activeText, visible, revealLibrary],
	);
	const runtime = useMemo(() => ({ session, dispatch }), [session]);
	return (
		<RuntimeContext.Provider value={runtime}>
			<WorkspaceControllerProvider controller={controller}>
				{children}
			</WorkspaceControllerProvider>
		</RuntimeContext.Provider>
	);
}

type ApplicationWorkspaceProps = {
	renderSubject(
		subject: WorkspaceSubject,
		presentation: WorkspacePresentation,
	): ReactNode;
	renderLibrary(): ReactNode;
	labelSubject(subject: WorkspaceSubject): string;
};

export function ApplicationWorkspace(props: ApplicationWorkspaceProps) {
	const runtime = useContext(RuntimeContext);
	if (!runtime)
		throw new Error(
			"ApplicationWorkspace requires ApplicationWorkspaceProvider.",
		);
	return <ApplicationWorkspaceCanvas {...props} {...runtime} />;
}

function ApplicationWorkspaceCanvas({
	session,
	dispatch,
	renderSubject,
	renderLibrary,
	labelSubject,
}: ApplicationWorkspaceProps & Runtime) {
	const root = useRef<HTMLDivElement>(null);
	const queueReveal = useWorkspaceSentenceReveal({
		root,
		state: session.workspace,
		isReady: (state) => !state.gesture,
		findDeck: (element, pending, state) => {
			const layer = Object.values(state.layers).find(
				(candidate) =>
					candidate.originPresentationId === pending.presentationId,
			);
			return layer
				? element.querySelector<HTMLElement>(
						`[data-card-layer="${layer.id}"]`,
					)
				: null;
		},
	});
	const dispatchCommand = useCallback(
		(command: WorkspaceCommand<ApplicationWorkspaceSubject>) => {
			dispatch({ type: "Command", command });
		},
		[dispatch],
	);
	return (
		<div ref={root} className="workspace-reading-layout">
			<Workspace
				state={session.workspace}
				dispatch={dispatchCommand}
				labelSubject={(subject) =>
					subject.kind === "Library"
						? "Library"
						: labelSubject(subject)
				}
				renderSubject={(subject, context) => (
					<ApplicationPresentation
						subject={subject}
						context={context}
						dispatch={dispatch}
						queueReveal={queueReveal}
						renderSubject={renderSubject}
						renderLibrary={renderLibrary}
					/>
				)}
			/>
		</div>
	);
}

function ApplicationPresentation({
	subject,
	context,
	dispatch,
	queueReveal,
	renderSubject,
	renderLibrary,
}: Omit<ApplicationWorkspaceProps, "labelSubject"> & {
	subject: ApplicationWorkspaceSubject;
	context: WorkspaceRenderContext<ApplicationWorkspaceSubject>;
	dispatch: Dispatch<ApplicationWorkspaceAction>;
	queueReveal(anchor: HTMLElement, presentationId: string): void;
}) {
	// Content effects (in particular live resolution) need stable interaction callbacks.
	const selectAnchor = useRef(context.selectAnchor);
	selectAnchor.current = context.selectAnchor;
	const presentationId = context.presentationId;
	const interaction = useMemo<WorkspaceInteraction>(
		() => ({
			follow: (target) =>
				dispatch({
					type: "Follow",
					originPresentationId: presentationId,
					target,
				}),
			reconcile: (target) =>
				dispatch({
					type: "ReconcilePresentation",
					presentationId,
					target,
				}),
			presentCards: (candidates, options) => {
				const anchor = options?.anchor;
				if (anchor instanceof HTMLElement) {
					selectAnchor.current(anchor);
					queueReveal(anchor, presentationId);
				}
				dispatch({
					type: "ReconcileCardLayer",
					originPresentationId: presentationId,
					candidates: candidates.map((candidate) => ({
						key: candidate.key,
						target: candidate.target,
						...(candidate.presentationContext
							? {
									presentationContext:
										candidate.presentationContext,
								}
							: {}),
					})),
				});
			},
		}),
		[dispatch, presentationId, queueReveal],
	);
	return (
		<WorkspaceInteractionProvider interaction={interaction}>
			{subject.kind === "Library" ? (
				renderLibrary()
			) : subject.kind === "Note" && subject.target.kind !== "Reading" ? (
				<div className="application-workspace__note">
					{renderSubject(subject, context.presentation)}
				</div>
			) : (
				renderSubject(subject, context.presentation)
			)}
		</WorkspaceInteractionProvider>
	);
}
