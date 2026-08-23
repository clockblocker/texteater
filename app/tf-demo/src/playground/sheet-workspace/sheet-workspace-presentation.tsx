import {
	Fragment,
	type HTMLAttributes,
	type ReactNode,
	type Ref,
	useEffect,
	useRef,
	useState,
} from "react";

import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import type { CardDemoFakeSegment } from "@/playground/card-demo/card-demo-contract";
import {
	CARD_DEMO_FAKE_TEXT,
	CARD_DEMO_RESOLUTION_CHAIN,
} from "@/playground/card-demo/card-demo-fixtures";
import { CardDemoCardContent } from "@/playground/card-demo/card-demo-presentation";
import { CardDemoTextInteraction } from "@/playground/card-demo/card-demo-text-interaction";
import { MotionCardDemoInteraction } from "@/playground/card-demo/variants/motion-card-demo-interaction";
import { cardSheetOpeningOrigin } from "./card-sheet-opening";
import type { Pane, Sheet, SheetWorkspace } from "./sheet-workspace";
import { useSheetWorkspaceActions } from "./sheet-workspace-context";
import {
	cardDemoNoteSheetSource,
	cardDemoNoteSubject,
	SHEET_WORKSPACE_SUBJECTS,
} from "./sheet-workspace-fixtures";

export type TopSheetDndProps = {
	readonly rootRef?: Ref<HTMLElement>;
	readonly rootProps?: HTMLAttributes<HTMLElement>;
	readonly handleRef?: Ref<HTMLButtonElement>;
	readonly handleProps?: HTMLAttributes<HTMLButtonElement>;
	readonly dragging?: boolean;
	readonly dropping?: boolean;
	readonly nativeDraggable?: boolean;
	readonly handleDraggable?: boolean;
};

export function SheetWorkspaceBoard({
	workspace,
	renderPane,
}: {
	readonly workspace: SheetWorkspace;
	readonly renderPane: (pane: Pane) => ReactNode;
}) {
	const defaultSize = String(100 / workspace.panes.length);
	return (
		<ResizablePanelGroup
			className="sheet-workspace-board"
			orientation="horizontal"
		>
			{workspace.panes.map((pane, index) => (
				<Fragment key={pane.id}>
					<ResizablePanel
						defaultSize={defaultSize}
						id={`sheet-workspace-panel-${pane.id}`}
						minSize={240}
					>
						{renderPane(pane)}
					</ResizablePanel>
					{index < workspace.panes.length - 1 ? (
						<ResizableHandle
							aria-label={`Resize ${pane.id} Pane`}
							className="sheet-workspace-resize-handle"
							withHandle
						/>
					) : null}
				</Fragment>
			))}
		</ResizablePanelGroup>
	);
}

export function SheetWorkspacePane({
	workspace,
	pane,
	dropRef,
	dropProps,
	isDropTarget = false,
	renderTopSheet,
}: {
	readonly workspace: SheetWorkspace;
	readonly pane: Pane;
	readonly dropRef?: Ref<HTMLElement>;
	readonly dropProps?: HTMLAttributes<HTMLElement>;
	readonly isDropTarget?: boolean;
	readonly renderTopSheet: (sheet: Sheet) => ReactNode;
}) {
	const { dispatch } = useSheetWorkspaceActions();
	const topSheet = pane.sheets.at(-1);
	return (
		<section
			{...dropProps}
			aria-label={`${pane.id} Pane`}
			ref={dropRef}
			className="sheet-workspace-pane"
			data-active={
				workspace.activePaneId === pane.id ? "true" : undefined
			}
			data-drop-target={isDropTarget ? "true" : undefined}
			data-sheet-workspace-pane={pane.id}
			onFocusCapture={() =>
				dispatch({
					type: "ActivatePane",
					paneId: pane.id,
					cause: "focus",
				})
			}
			onPointerDown={() =>
				dispatch({
					type: "ActivatePane",
					paneId: pane.id,
					cause: "pointer",
				})
			}
		>
			<div className="sheet-workspace-pane__stack">
				{pane.sheets.length === 0 ? (
					pane.id === workspace.centralPaneId ? (
						<NavigationAnchor />
					) : (
						<div className="sheet-workspace-empty-base">
							Drop Sheet
						</div>
					)
				) : (
					pane.sheets.map((sheet, index) => {
						const isTop = sheet.instanceId === topSheet?.instanceId;
						return isTop ? (
							<Fragment key={sheet.instanceId}>
								{renderTopSheet(sheet)}
							</Fragment>
						) : (
							<SheetFace
								key={sheet.instanceId}
								sheet={sheet}
								isTop={isTop}
								stackIndex={index}
							/>
						);
					})
				)}
			</div>
		</section>
	);
}

export function SheetFace({
	sheet,
	isTop,
	stackIndex,
	dnd,
}: {
	readonly sheet: Sheet;
	readonly isTop: boolean;
	readonly stackIndex: number;
	readonly dnd?: TopSheetDndProps;
}) {
	const { onPreviewCandidate } = useSheetWorkspaceActions();
	return (
		<article
			{...dnd?.rootProps}
			aria-hidden={!isTop}
			inert={!isTop}
			ref={dnd?.rootRef}
			className={cn(
				"sheet-workspace-sheet",
				dnd?.dragging && "sheet-workspace-sheet--dragging",
				dnd?.dropping && "sheet-workspace-sheet--dropping",
			)}
			data-dragging={dnd?.dragging ? "true" : undefined}
			data-sheet-id={sheet.instanceId}
			data-sheet-stack-index={stackIndex}
			data-sheet-top={isTop ? "true" : undefined}
			draggable={dnd?.nativeDraggable}
			onFocus={() => isTop && onPreviewCandidate(sheet)}
			onMouseEnter={() => isTop && onPreviewCandidate(sheet)}
			onMouseLeave={() => onPreviewCandidate(null)}
		>
			{sheet.subject.kind === "Text" ? (
				<TextSheetInteraction sheet={sheet} />
			) : (
				<NoteSheet sheet={sheet} />
			)}
			{isTop ? (
				<button
					{...dnd?.handleProps}
					ref={dnd?.handleRef}
					className={cn(
						"sheet-workspace-drag-handle",
						dnd?.handleProps?.className,
					)}
					draggable={dnd?.handleDraggable}
					type="button"
				>
					Drag top Sheet
				</button>
			) : null}
		</article>
	);
}

function TextSheetInteraction({ sheet }: { readonly sheet: Sheet }) {
	const { dispatch } = useSheetWorkspaceActions();
	const [selectedSegment, setSelectedSegment] =
		useState<CardDemoFakeSegment | null>(null);
	const openSequence = useRef(0);

	return (
		<div className="sheet-workspace-text-sheet">
			<CardDemoTextInteraction
				Interaction={MotionCardDemoInteraction}
				onOpenNote={(request) => {
					if (!selectedSegment) return;
					const regions = Array.from(
						document.querySelectorAll<HTMLElement>(
							"[data-sheet-workspace-pane]",
						),
					).map((element) => {
						const bounds = element.getBoundingClientRect();
						return {
							paneId: element.dataset.sheetWorkspacePane ?? "",
							bounds,
						};
					});
					const origin = cardSheetOpeningOrigin(
						request,
						sheet.instanceId,
						regions,
					);
					if (!origin) return false;
					openSequence.current += 1;
					dispatch({
						type: "OpenSheet",
						sheet: {
							instanceId: `${sheet.instanceId}-${request.kind}-${selectedSegment.id}-${openSequence.current}`,
							subject: cardDemoNoteSubject(
								request.kind,
								selectedSegment,
							),
						},
						origin,
					});
					setSelectedSegment(null);
					return true;
				}}
				onSelectedSegmentChange={setSelectedSegment}
				selectedSegment={selectedSegment}
			/>
		</div>
	);
}

function NoteSheet({ sheet }: { readonly sheet: Sheet }) {
	const { dispatch } = useSheetWorkspaceActions();
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		const frame = requestAnimationFrame(() =>
			closeButtonRef.current?.focus(),
		);
		return () => cancelAnimationFrame(frame);
	}, []);
	const source = cardDemoNoteSheetSource(sheet.subject);
	const card = source
		? CARD_DEMO_RESOLUTION_CHAIN.find(
				(candidate) => candidate.kind === source.kind,
			)
		: null;
	if (!source || !card) {
		return <div className="sheet-workspace-note-sheet">Unknown Note</div>;
	}
	return (
		<div
			className="sheet-workspace-note-sheet"
			data-card-demo-note={source.kind}
		>
			<button
				className="sheet-workspace-note-sheet__close"
				onClick={() =>
					dispatch({
						type: "RemoveSheet",
						sheetId: sheet.instanceId,
					})
				}
				ref={closeButtonRef}
				type="button"
			>
				Close Note
			</button>
			<CardDemoCardContent card={card} segment={source.segment} />
		</div>
	);
}

export function TransientCard({ sheet }: { readonly sheet: Sheet }) {
	const source = cardDemoNoteSheetSource(sheet.subject);
	const card = source
		? CARD_DEMO_RESOLUTION_CHAIN.find(
				(candidate) => candidate.kind === source.kind,
			)
		: null;
	return (
		<article
			className="sheet-workspace-card"
			data-transient-card={sheet.instanceId}
		>
			{source && card ? (
				<CardDemoCardContent card={card} segment={source.segment} />
			) : (
				<>
					<span className="card-demo-card__eyebrow">Fake Text</span>
					<strong className="card-demo-card__title">
						Lorem ipsum
					</strong>
					<span className="card-demo-card__detail">
						{CARD_DEMO_FAKE_TEXT.disclaimer}
					</span>
				</>
			)}
		</article>
	);
}

function NavigationAnchor() {
	const { dispatch } = useSheetWorkspaceActions();
	return (
		<div className="sheet-workspace-navigation-anchor">
			<strong>Library</strong>
			<button
				type="button"
				onClick={() =>
					dispatch({
						type: "OpenSheet",
						sheet: {
							instanceId: `navigation-${Date.now()}`,
							subject: SHEET_WORKSPACE_SUBJECTS.article,
						},
						origin: { kind: "NavigationAnchor" },
					})
				}
			>
				Open Text
			</button>
		</div>
	);
}
