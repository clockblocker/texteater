import {
	createContext,
	type Dispatch,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
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
	type OccurrenceReveal,
	reduceApplicationWorkspaceSession,
} from "./application-workspace-state";
import type {
	WorkspacePresentation,
	WorkspaceSubject,
} from "./sheet-workspace";
import { useWorkspaceSentenceReveal } from "./useWorkspaceSentenceReveal";
import {
	type OccurrenceRevealHandle,
	OccurrenceRevealProvider,
	WorkspaceControllerProvider,
	type WorkspaceInteraction,
	WorkspaceInteractionProvider,
} from "./workspace-controller";

/**
 * Reading geometry shared by Texts and Reading Notes. The Card Layer top sits
 * below the first two sentences (two text lines plus one paragraph gap) with a
 * line of breathing room, and its left edge lines up with the inner reading
 * column (half the leftover width, plus the gutter, minus the Card's own
 * padding and border).
 */
const READING_LAYOUT_CLASS = [
	"flex h-full min-h-0 [--reading-top:5rem] [--reading-deck-top:calc(var(--reading-top)+2*1.71rem+1.75rem+1rem)]",
	"[--workspace-cards-top:var(--reading-deck-top)]",
	"[--workspace-cards-height:min(calc(100%-var(--reading-deck-top)-12px),34rem)]",
	"[--workspace-cards-left:calc(max(0px,50%-24rem)+var(--spacing-note-gutter)-0.9rem-1px)]",
	"[--workspace-cards-transform:none]",
	"[&>.workspace]:min-w-0 [&>.workspace]:flex-1",
	"[&_.workspace\\_\\_sheet>*]:min-h-full",
].join(" ");

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
	const closeAllSheets = useCallback(
		() => dispatch({ type: "CloseAllSheets" }),
		[],
	);
	const canCloseAllSheets =
		Object.keys(workspace.presentations).length > 1 ||
		Object.keys(workspace.layers).length > 0 ||
		Object.keys(workspace.panes).length > 1 ||
		visible.at(-1)?.subject.kind !== "Library";
	const controller = useMemo(
		() => ({
			activeTextId:
				activeText?.subject.kind === "Text"
					? activeText.subject.target.textId
					: null,
			isLibraryVisible: visible.at(-1)?.subject.kind === "Library",
			revealLibrary,
			canCloseAllSheets,
			closeAllSheets,
		}),
		[activeText, visible, revealLibrary, canCloseAllSheets, closeAllSheets],
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
		<div ref={root} className={READING_LAYOUT_CLASS}>
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
						pendingReveal={
							session.pendingReveal?.presentationId ===
							context.presentationId
								? session.pendingReveal
								: null
						}
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
	pendingReveal,
	queueReveal,
	renderSubject,
	renderLibrary,
}: Omit<ApplicationWorkspaceProps, "labelSubject"> & {
	subject: ApplicationWorkspaceSubject;
	context: WorkspaceRenderContext<ApplicationWorkspaceSubject>;
	dispatch: Dispatch<ApplicationWorkspaceAction>;
	pendingReveal: OccurrenceReveal | null;
	queueReveal(anchor: HTMLElement, presentationId: string): void;
}) {
	// Content effects (in particular live resolution) need stable interaction callbacks.
	const selectAnchor = useRef(context.selectAnchor);
	useLayoutEffect(() => {
		selectAnchor.current = context.selectAnchor;
	}, [context.selectAnchor]);
	const presentationId = context.presentationId;
	const reveal = useMemo<OccurrenceRevealHandle | null>(
		() =>
			pendingReveal
				? {
						attestationId: pendingReveal.attestationId,
						acknowledge: () =>
							dispatch({
								type: "AcknowledgeReveal",
								presentationId,
							}),
					}
				: null,
		[dispatch, pendingReveal, presentationId],
	);
	const interaction = useMemo<WorkspaceInteraction>(
		() => ({
			follow: (target, presentationContext) =>
				dispatch({
					type: "Follow",
					presentationContext,
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
			<OccurrenceRevealProvider reveal={reveal}>
				{subject.kind === "Library"
					? renderLibrary()
					: renderSubject(subject, context.presentation)}
			</OccurrenceRevealProvider>
		</WorkspaceInteractionProvider>
	);
}
