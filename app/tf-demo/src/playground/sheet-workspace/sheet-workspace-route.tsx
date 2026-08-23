import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import {
	type Sheet,
	type SheetWorkspaceCommand,
	transitionSheetWorkspace,
} from "./sheet-workspace";
import { SHEET_WORKSPACE_ACCEPTANCE_SCENARIOS } from "./sheet-workspace-acceptance";
import { SheetWorkspaceActionsProvider } from "./sheet-workspace-context";
import {
	isSheetWorkspaceVariant,
	SHEET_WORKSPACE_VARIANT_LABEL,
	SHEET_WORKSPACE_VARIANTS,
	type SheetMoveRequest,
	type SheetWorkspaceAdapter,
	type SheetWorkspaceVariant,
} from "./sheet-workspace-contract";
import { createSheetWorkspaceFixture } from "./sheet-workspace-fixtures";
import { TransientCard } from "./sheet-workspace-presentation";
import "./sheet-workspace.css";

const ADAPTERS: Record<SheetWorkspaceVariant, SheetWorkspaceAdapter> = {
	motion: lazy(() =>
		import("./variants/motion-sheet-workspace").then((module) => ({
			default: module.MotionSheetWorkspace,
		})),
	),
	"dnd-kit": lazy(() =>
		import("./variants/dnd-kit-sheet-workspace").then((module) => ({
			default: module.DndKitSheetWorkspace,
		})),
	),
	pragmatic: lazy(() =>
		import("./variants/pragmatic-sheet-workspace").then((module) => ({
			default: module.PragmaticSheetWorkspace,
		})),
	),
	"react-aria": lazy(() =>
		import("./variants/react-aria-sheet-workspace").then((module) => ({
			default: module.ReactAriaSheetWorkspace,
		})),
	),
};

export function SheetWorkspaceRoute() {
	const { variant } = useParams();
	if (!variant) {
		return <Navigate replace to="/playground/sheet-workspace/motion" />;
	}
	if (!isSheetWorkspaceVariant(variant)) {
		return <SheetWorkspaceNotFound />;
	}
	return <SheetWorkspaceHarness key={variant} variant={variant} />;
}

function SheetWorkspaceHarness({
	variant,
}: {
	readonly variant: SheetWorkspaceVariant;
}) {
	const [harnessState, setHarnessState] = useState(() => ({
		workspace: createSheetWorkspaceFixture(),
		announcement: "Sheet workspace ready.",
	}));
	const { workspace, announcement } = harnessState;
	const [previewCandidate, setPreviewCandidate] = useState<Sheet | null>(
		null,
	);
	const [modifierPressed, setModifierPressed] = useState(false);
	const Adapter = ADAPTERS[variant];

	const dispatch = useCallback((command: SheetWorkspaceCommand) => {
		setHarnessState((current) => {
			const transition = transitionSheetWorkspace(
				current.workspace,
				command,
			);
			if (transition.status === "unchanged") return current;
			return {
				workspace: transition.workspace,
				announcement:
					transition.status === "rejected"
						? `Rejected: ${transition.rejection}.`
						: announcementFor(command),
			};
		});
	}, []);

	const move = useCallback(
		(request: SheetMoveRequest) => {
			dispatch({ type: "MoveTopSheet", ...request });
			requestAnimationFrame(() => {
				document
					.querySelector<HTMLElement>(
						`[data-sheet-id="${CSS.escape(request.sheetId)}"] button`,
					)
					?.focus();
			});
		},
		[dispatch],
	);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Alt") setModifierPressed(true);
			if (event.key === "Escape") {
				setModifierPressed(false);
				setPreviewCandidate(null);
			}
		};
		const onKeyUp = (event: KeyboardEvent) => {
			if (event.key === "Alt") setModifierPressed(false);
		};
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
		};
	}, []);

	const actions = useMemo(
		() => ({
			dispatch,
			moveWithoutDragging: (
				sourcePaneId: string,
				destinationPaneId: string,
				sheetId: string,
			) => move({ sourcePaneId, destinationPaneId, sheetId }),
			onPreviewCandidate: setPreviewCandidate,
		}),
		[dispatch, move],
	);

	return (
		<SheetWorkspaceActionsProvider value={actions}>
			<section
				aria-labelledby="sheet-workspace-title"
				className="sheet-workspace-page"
				data-variant={variant}
			>
				<header className="sheet-workspace-page__header">
					<div>
						<p>Throwaway comparison playground · issue #240</p>
						<h1 id="sheet-workspace-title">
							Pane-local Sheet workspace
						</h1>
						<span className="sheet-workspace-page__description">
							Drag only a top Sheet. Hold Alt/Option while
							hovering or focusing a Sheet to preview its
							transient Card.
						</span>
					</div>
					<nav aria-label="DnD implementation">
						{SHEET_WORKSPACE_VARIANTS.map((candidate) => (
							<Link
								key={candidate}
								aria-current={
									candidate === variant ? "page" : undefined
								}
								to={`/playground/sheet-workspace/${candidate}`}
							>
								{SHEET_WORKSPACE_VARIANT_LABEL[candidate]}
							</Link>
						))}
					</nav>
				</header>

				<div className="sheet-workspace-toolbar">
					<button
						type="button"
						onClick={() =>
							dispatch({ type: "Collapse", extent: "top" })
						}
					>
						Collapse top in Active Pane
					</button>
					<button
						type="button"
						onClick={() =>
							dispatch({ type: "Collapse", extent: "all" })
						}
					>
						Collapse all to lock
					</button>
					<button
						type="button"
						onClick={() => {
							setHarnessState({
								workspace: createSheetWorkspaceFixture(),
								announcement: "Fixture reset.",
							});
						}}
					>
						Reset fixture
					</button>
				</div>

				<Suspense fallback={<SheetWorkspaceLoading />}>
					<Adapter
						workspace={workspace}
						onMove={move}
						onPreviewCandidate={setPreviewCandidate}
					/>
				</Suspense>

				<div className="sheet-workspace-evidence">
					<details open>
						<summary>Full valid workspace state</summary>
						<pre data-testid="sheet-workspace-state">
							{JSON.stringify(workspace, null, 2)}
						</pre>
					</details>
					<details>
						<summary>Hands-on acceptance scenarios</summary>
						<ol>
							{SHEET_WORKSPACE_ACCEPTANCE_SCENARIOS.map(
								(scenario) => (
									<li key={scenario.id}>
										<strong>{scenario.gate}</strong>{" "}
										{scenario.instruction}
									</li>
								),
							)}
						</ol>
					</details>
				</div>

				<div className="sr-only" aria-live="polite">
					{announcement}
				</div>
				{modifierPressed && previewCandidate ? (
					<div
						className="sheet-workspace-modifier-preview"
						role="tooltip"
					>
						<TransientCard sheet={previewCandidate} />
					</div>
				) : null}
			</section>
		</SheetWorkspaceActionsProvider>
	);
}

function announcementFor(command: SheetWorkspaceCommand): string {
	switch (command.type) {
		case "ActivatePane":
			return `${command.paneId} Pane is Active.`;
		case "OpenSheet":
			return `Opened Sheet ${command.sheet.instanceId}.`;
		case "MoveTopSheet":
			return `Moved Sheet ${command.sheetId} to ${command.destinationPaneId} Pane.`;
		case "Collapse":
			return `Collapsed ${command.extent} in the Active Pane.`;
		case "RemoveSheet":
			return `Removed Sheet ${command.sheetId}.`;
		case "SetSheetLock":
			return `${command.locked ? "Locked" : "Unlocked"} Sheet ${command.sheetId}.`;
	}
}

function SheetWorkspaceNotFound() {
	return (
		<section className="sheet-workspace-page">
			<h1>Sheet workspace variant not found</h1>
			<Link to="/playground/sheet-workspace/motion">
				Open Motion variant
			</Link>
		</section>
	);
}

function SheetWorkspaceLoading() {
	return (
		<div className="sheet-workspace-loading" role="status">
			Loading comparison adapter…
		</div>
	);
}
