import {
	LayoutGroup,
	MotionConfig,
	motion,
	useDragControls,
} from "motion/react";
import { useState } from "react";

import type { Sheet } from "../sheet-workspace";
import type { SheetWorkspaceAdapterProps } from "../sheet-workspace-contract";
import {
	SheetFace,
	SheetWorkspaceBoard,
	SheetWorkspacePane,
	TransientCard,
} from "../sheet-workspace-presentation";

export function MotionSheetWorkspace({
	workspace,
	onMove,
	onPreviewCandidate,
}: SheetWorkspaceAdapterProps) {
	const [draggingSheetId, setDraggingSheetId] = useState<string | null>(null);
	return (
		<MotionConfig reducedMotion="user">
			<LayoutGroup id="sheet-workspace-motion">
				<SheetWorkspaceBoard
					workspace={workspace}
					renderPane={(pane) => (
						<SheetWorkspacePane
							pane={pane}
							workspace={workspace}
							renderTopSheet={(sheet) => (
								<MotionTopSheet
									key={sheet.instanceId}
									dragging={
										draggingSheetId === sheet.instanceId
									}
									onDragEnd={(destinationPaneId) => {
										setDraggingSheetId(null);
										if (destinationPaneId) {
											onMove({
												sourcePaneId: pane.id,
												destinationPaneId,
												sheetId: sheet.instanceId,
											});
										}
									}}
									onDragStart={() => {
										onPreviewCandidate(null);
										setDraggingSheetId(sheet.instanceId);
									}}
									pane={pane}
									sheet={sheet}
									workspace={workspace}
								/>
							)}
						/>
					)}
				/>
			</LayoutGroup>
		</MotionConfig>
	);
}

function MotionTopSheet({
	workspace,
	pane,
	sheet,
	dragging,
	onDragStart,
	onDragEnd,
}: {
	readonly workspace: SheetWorkspaceAdapterProps["workspace"];
	readonly pane: SheetWorkspaceAdapterProps["workspace"]["panes"][number];
	readonly sheet: Sheet;
	readonly dragging: boolean;
	readonly onDragStart: () => void;
	readonly onDragEnd: (destinationPaneId: string | null) => void;
}) {
	const dragControls = useDragControls();
	return (
		<motion.div
			layout
			layoutId={`sheet-${sheet.instanceId}`}
			drag
			dragControls={dragControls}
			dragListener={false}
			dragMomentum={false}
			dragSnapToOrigin
			onDragStart={onDragStart}
			onDragEnd={(event, info) => {
				const point =
					event instanceof PointerEvent
						? { x: event.clientX, y: event.clientY }
						: info.point;
				const destinationPaneId = workspace.panes.find((candidate) => {
					const element = document.querySelector<HTMLElement>(
						`[data-sheet-workspace-pane="${CSS.escape(candidate.id)}"]`,
					);
					if (!element) return false;
					const bounds = element.getBoundingClientRect();
					return (
						point.x >= bounds.left &&
						point.x <= bounds.right &&
						point.y >= bounds.top &&
						point.y <= bounds.bottom
					);
				})?.id;
				onDragEnd(destinationPaneId ?? null);
			}}
			className="sheet-workspace-motion-shell"
			data-motion-card={dragging ? "true" : undefined}
			style={{ zIndex: dragging ? 20 : 1 }}
			transition={{ type: "spring", stiffness: 420, damping: 36 }}
			whileDrag={{ scale: 1.025 }}
		>
			<SheetFace
				sheet={sheet}
				isTop
				stackIndex={pane.sheets.length - 1}
				dnd={{
					dragging,
					handleProps: {
						onPointerDown: (event) =>
							dragControls.start(event.nativeEvent),
					},
				}}
			/>
			{dragging ? (
				<div className="sheet-workspace-motion-card">
					<TransientCard sheet={sheet} />
				</div>
			) : null}
		</motion.div>
	);
}
