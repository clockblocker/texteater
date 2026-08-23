import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from "react";

import { cn } from "@/lib/utils";
import type { Pane, Sheet, SheetWorkspace } from "./sheet-workspace";
import { useSheetWorkspaceActions } from "./sheet-workspace-context";
import {
	SHEET_WORKSPACE_SUBJECT_COPY,
	subjectKey,
} from "./sheet-workspace-fixtures";

export type TopSheetDndProps = {
	readonly rootRef?: Ref<HTMLElement>;
	readonly rootProps?: HTMLAttributes<HTMLElement>;
	readonly handleRef?: Ref<HTMLButtonElement>;
	readonly handleProps?: HTMLAttributes<HTMLButtonElement>;
	readonly dragging?: boolean;
	readonly dropping?: boolean;
	readonly nativeDraggable?: boolean;
};

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
	readonly renderTopSheet: (sheet: Sheet, sheetNode: ReactNode) => ReactNode;
}) {
	const { dispatch } = useSheetWorkspaceActions();
	const topSheet = pane.sheets.at(-1);
	return (
		<section
			{...dropProps}
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
			<header className="sheet-workspace-pane__header">
				<div>
					<span className="sheet-workspace-pane__kind">
						{pane.id === workspace.centralPaneId
							? "Central"
							: "Incidental"}
					</span>
					<strong>{pane.id} Pane</strong>
				</div>
				<span>
					{pane.sheets.length}{" "}
					{pane.sheets.length === 1 ? "Sheet" : "Sheets"}
				</span>
			</header>

			<div className="sheet-workspace-pane__stack">
				{pane.sheets.length === 0 ? (
					pane.id === workspace.centralPaneId ? (
						<NavigationAnchor />
					) : (
						<div className="sheet-workspace-empty-base">
							<strong>Empty Pane</strong>
							<span>Drop a top Sheet here.</span>
						</div>
					)
				) : (
					pane.sheets.map((sheet, index) => {
						const isTop = sheet.instanceId === topSheet?.instanceId;
						const node = (
							<SheetFace
								key={sheet.instanceId}
								pane={pane}
								sheet={sheet}
								isTop={isTop}
								stackIndex={index}
								workspace={workspace}
							/>
						);
						return isTop ? renderTopSheet(sheet, node) : node;
					})
				)}
			</div>
		</section>
	);
}

export function SheetFace({
	workspace,
	pane,
	sheet,
	isTop,
	stackIndex,
	dnd,
}: {
	readonly workspace: SheetWorkspace;
	readonly pane: Pane;
	readonly sheet: Sheet;
	readonly isTop: boolean;
	readonly stackIndex: number;
	readonly dnd?: TopSheetDndProps;
}) {
	const { dispatch, moveWithoutDragging, onPreviewCandidate } =
		useSheetWorkspaceActions();
	const copy = SHEET_WORKSPACE_SUBJECT_COPY[subjectKey(sheet.subject)];
	if (!copy)
		throw new Error(`Missing fake copy for ${subjectKey(sheet.subject)}.`);
	return (
		<article
			{...dnd?.rootProps}
			ref={dnd?.rootRef}
			className={cn(
				"sheet-workspace-sheet",
				dnd?.dragging && "sheet-workspace-sheet--dragging",
				dnd?.dropping && "sheet-workspace-sheet--dropping",
			)}
			data-dragging={dnd?.dragging ? "true" : undefined}
			data-sheet-id={sheet.instanceId}
			data-sheet-top={isTop ? "true" : undefined}
			draggable={dnd?.nativeDraggable}
			onFocus={() => onPreviewCandidate(sheet)}
			onMouseEnter={() => onPreviewCandidate(sheet)}
			onMouseLeave={() => onPreviewCandidate(null)}
			style={{ "--sheet-stack-index": stackIndex } as CSSProperties}
		>
			<header className="sheet-workspace-sheet__header">
				<div>
					<span>{copy.eyebrow}</span>
					<strong>{copy.title}</strong>
				</div>
				<div className="sheet-workspace-sheet__badges">
					{sheet.locked ? <span>Locked</span> : null}
					<span>{isTop ? "Top" : `Depth ${stackIndex + 1}`}</span>
				</div>
			</header>
			<p>{copy.summary}</p>
			<div className="sheet-workspace-sheet__actions">
				<button
					type="button"
					onClick={() =>
						dispatch({
							type: "SetSheetLock",
							sheetId: sheet.instanceId,
							locked: !sheet.locked,
						})
					}
				>
					{sheet.locked ? "Unlock" : "Lock here"}
				</button>
				<button
					type="button"
					onClick={() =>
						dispatch({
							type: "OpenSheet",
							sheet: {
								instanceId: `opened-${sheet.instanceId}-${Date.now()}`,
								subject: sheet.subject,
							},
							origin: {
								kind: "Sheet",
								sheetId: sheet.instanceId,
							},
						})
					}
				>
					Open again
				</button>
				<button
					type="button"
					onClick={() =>
						dispatch({
							type: "RemoveSheet",
							sheetId: sheet.instanceId,
						})
					}
				>
					Remove
				</button>
			</div>
			{isTop ? (
				<div className="sheet-workspace-sheet__move-row">
					<button
						{...dnd?.handleProps}
						ref={dnd?.handleRef}
						className="sheet-workspace-drag-handle"
						type="button"
					>
						Drag top Sheet
					</button>
					<fieldset>
						<legend className="sr-only">
							Move without dragging
						</legend>
						{workspace.panes
							.filter((destination) => destination.id !== pane.id)
							.map((destination) => (
								<button
									key={destination.id}
									type="button"
									onClick={() =>
										moveWithoutDragging(
											pane.id,
											destination.id,
											sheet.instanceId,
										)
									}
								>
									Move to {destination.id}
								</button>
							))}
					</fieldset>
				</div>
			) : null}
		</article>
	);
}

export function TransientCard({ sheet }: { readonly sheet: Sheet }) {
	const copy = SHEET_WORKSPACE_SUBJECT_COPY[subjectKey(sheet.subject)];
	if (!copy)
		throw new Error(`Missing fake copy for ${subjectKey(sheet.subject)}.`);
	return (
		<article
			className="sheet-workspace-card"
			data-transient-card={sheet.instanceId}
		>
			<span>{copy.eyebrow} · transient Card</span>
			<strong>{copy.title}</strong>
			<p>{copy.summary}</p>
		</article>
	);
}

function NavigationAnchor() {
	const { dispatch } = useSheetWorkspaceActions();
	return (
		<div className="sheet-workspace-navigation-anchor">
			<span>Navigation Anchor</span>
			<strong>Library</strong>
			<p>The central Pane base is visible because no Sheet blocks it.</p>
			<button
				type="button"
				onClick={() =>
					dispatch({
						type: "OpenSheet",
						sheet: {
							instanceId: `navigation-${Date.now()}`,
							subject: {
								kind: "Text",
								textId: "the-glass-bead-game",
							},
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
