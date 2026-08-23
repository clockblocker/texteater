import {
	DragDropProvider,
	DragOverlay,
	useDraggable,
	useDroppable,
} from "@dnd-kit/react";
import { useState } from "react";

import type { Pane, Sheet } from "../sheet-workspace";
import type { SheetWorkspaceAdapterProps } from "../sheet-workspace-contract";
import {
	SheetFace,
	SheetWorkspacePane,
	TransientCard,
} from "../sheet-workspace-presentation";

type DndKitDragData = {
	readonly kind: "Sheet";
	readonly sourcePaneId: string;
	readonly sheet: Sheet;
};

type DndKitDropData = {
	readonly kind: "Pane";
	readonly paneId: string;
};

export function DndKitSheetWorkspace({
	workspace,
	onMove,
	onPreviewCandidate,
}: SheetWorkspaceAdapterProps) {
	const [draggingSheet, setDraggingSheet] = useState<Sheet | null>(null);
	return (
		<DragDropProvider
			onDragStart={({ operation }) => {
				onPreviewCandidate(null);
				setDraggingSheet(
					(operation.source?.data as DndKitDragData | undefined)
						?.sheet ?? null,
				);
			}}
			onDragEnd={({ operation, canceled }) => {
				setDraggingSheet(null);
				if (canceled) return;
				const source = operation.source?.data as
					| DndKitDragData
					| undefined;
				const target = operation.target?.data as
					| DndKitDropData
					| undefined;
				if (source?.kind !== "Sheet" || target?.kind !== "Pane") return;
				onMove({
					sourcePaneId: source.sourcePaneId,
					destinationPaneId: target.paneId,
					sheetId: source.sheet.instanceId,
				});
			}}
		>
			<div className="sheet-workspace-board">
				{workspace.panes.map((pane) => (
					<DndKitPane
						key={pane.id}
						pane={pane}
						workspace={workspace}
					/>
				))}
			</div>
			<DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
				{(source) => {
					const sheet =
						(source?.data as DndKitDragData | undefined)?.sheet ??
						draggingSheet;
					return sheet ? <TransientCard sheet={sheet} /> : null;
				}}
			</DragOverlay>
		</DragDropProvider>
	);
}

function DndKitPane({
	workspace,
	pane,
}: {
	readonly workspace: SheetWorkspaceAdapterProps["workspace"];
	readonly pane: Pane;
}) {
	const { ref, isDropTarget } = useDroppable<DndKitDropData>({
		id: `pane-${pane.id}`,
		data: { kind: "Pane", paneId: pane.id },
	});
	return (
		<SheetWorkspacePane
			dropRef={ref}
			isDropTarget={isDropTarget}
			pane={pane}
			workspace={workspace}
			renderTopSheet={(sheet) => (
				<DndKitTopSheet
					key={sheet.instanceId}
					pane={pane}
					sheet={sheet}
					workspace={workspace}
				/>
			)}
		/>
	);
}

function DndKitTopSheet({
	workspace,
	pane,
	sheet,
}: {
	readonly workspace: SheetWorkspaceAdapterProps["workspace"];
	readonly pane: Pane;
	readonly sheet: Sheet;
}) {
	const { ref, handleRef, isDragging, isDropping } =
		useDraggable<DndKitDragData>({
			id: sheet.instanceId,
			data: { kind: "Sheet", sourcePaneId: pane.id, sheet },
		});
	return (
		<SheetFace
			workspace={workspace}
			pane={pane}
			sheet={sheet}
			isTop
			stackIndex={pane.sheets.length - 1}
			dnd={{
				rootRef: ref,
				handleRef,
				dragging: isDragging,
				dropping: isDropping,
			}}
		/>
	);
}
