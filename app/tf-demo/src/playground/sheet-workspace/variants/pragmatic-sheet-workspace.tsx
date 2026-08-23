import {
	draggable,
	dropTargetForElements,
	monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/utils/set-custom-native-drag-preview";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import type { Pane, Sheet } from "../sheet-workspace";
import type { SheetWorkspaceAdapterProps } from "../sheet-workspace-contract";
import {
	SheetFace,
	SheetWorkspacePane,
	TransientCard,
} from "../sheet-workspace-presentation";

const PRAGMATIC_SOURCE_KIND = "sheet-workspace-sheet";
const PRAGMATIC_TARGET_KIND = "sheet-workspace-pane";

export function PragmaticSheetWorkspace({
	workspace,
	onMove,
	onPreviewCandidate,
}: SheetWorkspaceAdapterProps) {
	const [draggingSheetId, setDraggingSheetId] = useState<string | null>(null);
	useEffect(
		() =>
			monitorForElements({
				canMonitor: ({ source }) =>
					source.data.kind === PRAGMATIC_SOURCE_KIND,
				onDragStart: ({ source }) => {
					onPreviewCandidate(null);
					setDraggingSheetId(readString(source.data.sheetId));
				},
				onDrop: ({ source, location }) => {
					setDraggingSheetId(null);
					const sourcePaneId = readString(source.data.sourcePaneId);
					const sheetId = readString(source.data.sheetId);
					const destinationPaneId = readString(
						location.current.dropTargets.find(
							(target) =>
								target.data.kind === PRAGMATIC_TARGET_KIND,
						)?.data.paneId,
					);
					if (sourcePaneId && sheetId && destinationPaneId) {
						onMove({ sourcePaneId, destinationPaneId, sheetId });
					}
				},
			}),
		[onMove, onPreviewCandidate],
	);

	return (
		<div className="sheet-workspace-board">
			{workspace.panes.map((pane) => (
				<PragmaticPane
					key={pane.id}
					draggingSheetId={draggingSheetId}
					pane={pane}
					workspace={workspace}
				/>
			))}
		</div>
	);
}

function PragmaticPane({
	workspace,
	pane,
	draggingSheetId,
}: {
	readonly workspace: SheetWorkspaceAdapterProps["workspace"];
	readonly pane: Pane;
	readonly draggingSheetId: string | null;
}) {
	const paneRef = useRef<HTMLElement>(null);
	const [isDropTarget, setIsDropTarget] = useState(false);
	useEffect(() => {
		const element = paneRef.current;
		if (!element) return;
		return dropTargetForElements({
			element,
			canDrop: ({ source }) => source.data.kind === PRAGMATIC_SOURCE_KIND,
			getData: () => ({ kind: PRAGMATIC_TARGET_KIND, paneId: pane.id }),
			onDragEnter: () => setIsDropTarget(true),
			onDragLeave: () => setIsDropTarget(false),
			onDrop: () => setIsDropTarget(false),
		});
	}, [pane.id]);

	return (
		<SheetWorkspacePane
			dropRef={paneRef}
			isDropTarget={isDropTarget}
			pane={pane}
			workspace={workspace}
			renderTopSheet={(sheet) => (
				<PragmaticTopSheet
					key={sheet.instanceId}
					dragging={draggingSheetId === sheet.instanceId}
					pane={pane}
					sheet={sheet}
					workspace={workspace}
				/>
			)}
		/>
	);
}

function PragmaticTopSheet({
	workspace,
	pane,
	sheet,
	dragging,
}: {
	readonly workspace: SheetWorkspaceAdapterProps["workspace"];
	readonly pane: Pane;
	readonly sheet: Sheet;
	readonly dragging: boolean;
}) {
	const rootRef = useRef<HTMLElement>(null);
	const handleRef = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		const element = rootRef.current;
		const dragHandle = handleRef.current;
		if (!element || !dragHandle) return;
		return draggable({
			element,
			dragHandle,
			getInitialData: () => ({
				kind: PRAGMATIC_SOURCE_KIND,
				sourcePaneId: pane.id,
				sheetId: sheet.instanceId,
			}),
			onGenerateDragPreview: ({ nativeSetDragImage }) => {
				setCustomNativeDragPreview({
					nativeSetDragImage,
					render: ({ container }) => {
						const root = createRoot(container);
						root.render(<TransientCard sheet={sheet} />);
						return () => root.unmount();
					},
				});
			},
		});
	}, [pane.id, sheet]);

	return (
		<SheetFace
			workspace={workspace}
			pane={pane}
			sheet={sheet}
			isTop
			stackIndex={pane.sheets.length - 1}
			dnd={{ rootRef, handleRef, dragging, nativeDraggable: true }}
		/>
	);
}

function readString(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}
