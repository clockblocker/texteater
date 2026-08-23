import { useButton } from "@react-aria/button";
import { DragPreview, isTextDropItem, useDrag, useDrop } from "@react-aria/dnd";
import { type ComponentRef, useRef } from "react";

import type { Pane, Sheet } from "../sheet-workspace";
import type { SheetWorkspaceAdapterProps } from "../sheet-workspace-contract";
import {
	SheetFace,
	SheetWorkspaceBoard,
	SheetWorkspacePane,
	TransientCard,
} from "../sheet-workspace-presentation";

const REACT_ARIA_SHEET_TYPE = "application/x-texteater-sheet-workspace";

export function ReactAriaSheetWorkspace(props: SheetWorkspaceAdapterProps) {
	return (
		<SheetWorkspaceBoard
			workspace={props.workspace}
			renderPane={(pane) => <ReactAriaPane {...props} pane={pane} />}
		/>
	);
}

function ReactAriaPane({
	workspace,
	pane,
	onMove,
}: SheetWorkspaceAdapterProps & { readonly pane: Pane }) {
	const ref = useRef<HTMLElement>(null);
	const { dropProps, isDropTarget } = useDrop({
		ref,
		getDropOperation: (types, allowedOperations) =>
			types.has(REACT_ARIA_SHEET_TYPE) &&
			allowedOperations.includes("move")
				? "move"
				: "cancel",
		onDrop: async (event) => {
			const item = event.items.find(isTextDropItem);
			if (!item?.types.has(REACT_ARIA_SHEET_TYPE)) return;
			const source = parseReactAriaSource(
				await item.getText(REACT_ARIA_SHEET_TYPE),
			);
			if (source) {
				onMove({ ...source, destinationPaneId: pane.id });
			}
		},
	});
	return (
		<SheetWorkspacePane
			dropRef={ref}
			dropProps={dropProps}
			isDropTarget={isDropTarget}
			pane={pane}
			workspace={workspace}
			renderTopSheet={(sheet) => (
				<ReactAriaTopSheet
					key={sheet.instanceId}
					pane={pane}
					sheet={sheet}
				/>
			)}
		/>
	);
}

function ReactAriaTopSheet({
	pane,
	sheet,
}: {
	readonly pane: Pane;
	readonly sheet: Sheet;
}) {
	const preview = useRef<ComponentRef<typeof DragPreview>>(null);
	const dragButtonRef = useRef<HTMLButtonElement>(null);
	const { dragProps, dragButtonProps, isDragging } = useDrag({
		getItems: () => [
			{
				[REACT_ARIA_SHEET_TYPE]: JSON.stringify({
					sourcePaneId: pane.id,
					sheetId: sheet.instanceId,
				}),
			},
		],
		getAllowedDropOperations: () => ["move"],
		hasDragButton: true,
		preview,
	});
	const { buttonProps } = useButton(dragButtonProps, dragButtonRef);
	return (
		<>
			<SheetFace
				sheet={sheet}
				isTop
				stackIndex={pane.sheets.length - 1}
				dnd={{
					handleRef: dragButtonRef,
					handleProps: { ...dragProps, ...buttonProps },
					handleDraggable: true,
					dragging: isDragging,
				}}
			/>
			<DragPreview ref={preview}>
				{() => <TransientCard sheet={sheet} />}
			</DragPreview>
		</>
	);
}

function parseReactAriaSource(
	value: string,
): { readonly sourcePaneId: string; readonly sheetId: string } | null {
	try {
		const parsed: unknown = JSON.parse(value);
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			"sourcePaneId" in parsed &&
			"sheetId" in parsed &&
			typeof parsed.sourcePaneId === "string" &&
			typeof parsed.sheetId === "string"
		) {
			return {
				sourcePaneId: parsed.sourcePaneId,
				sheetId: parsed.sheetId,
			};
		}
	} catch {
		return null;
	}
	return null;
}
