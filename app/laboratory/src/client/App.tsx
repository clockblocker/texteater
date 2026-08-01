import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type {
	ClickResolutionResponse,
	EntityRepresentation,
	LaboratorySessionResponse,
	Segment,
	SegmentationResponse,
} from "../shared/contract";

const sampleText = "Der Hund läuft schnell. Der Kaffee ist heiß.";
type Tab = "reading" | "surface" | "selection";

type LaboratoryState = {
	text: string;
	setText: (value: string) => void;
	selection: { start: number; end: number };
	setSelection: (selection: { start: number; end: number }) => void;
	result: SegmentationResponse | null;
	activeIndex: number | null;
	entity: EntityRepresentation | null;
	selectSegment: (index: number) => Promise<void>;
	segment: () => Promise<void>;
	busy: boolean;
	error: string | null;
	resolutionBusy: boolean;
	resolutionError: string | null;
	sessionId: string | null;
	resetSession: () => Promise<void>;
	resetBusy: boolean;
	sessionError: string | null;
};

function useLaboratory(): LaboratoryState {
	const [text, setText] = useState(sampleText);
	const [selection, setSelection] = useState({
		start: 0,
		end: sampleText.length,
	});
	const [result, setResult] = useState<SegmentationResponse | null>(null);
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const [entity, setEntity] = useState<EntityRepresentation | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [resolutionBusy, setResolutionBusy] = useState(false);
	const [resolutionError, setResolutionError] = useState<string | null>(null);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [resetBusy, setResetBusy] = useState(false);
	const [sessionError, setSessionError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		void (async () => {
			try {
				const response = await fetch("/api/session");
				const payload =
					(await response.json()) as LaboratorySessionResponse & {
						error?: string;
					};
				if (!response.ok) {
					throw new Error(payload.error ?? "Could not load session.");
				}
				if (active) setSessionId(payload.sessionId);
			} catch (cause) {
				if (active) {
					setSessionError(
						cause instanceof Error
							? cause.message
							: "Could not load session.",
					);
				}
			}
		})();
		return () => {
			active = false;
		};
	}, []);

	const resetSession = useCallback(async () => {
		setResetBusy(true);
		setSessionError(null);
		try {
			const response = await fetch("/api/session", { method: "POST" });
			const payload =
				(await response.json()) as LaboratorySessionResponse & {
					error?: string;
				};
			if (!response.ok) {
				throw new Error(payload.error ?? "Could not reset session.");
			}
			setSessionId(payload.sessionId);
			setResult(null);
			setActiveIndex(null);
			setEntity(null);
			setError(null);
			setResolutionError(null);
		} catch (cause) {
			setSessionError(
				cause instanceof Error
					? cause.message
					: "Could not reset session.",
			);
		} finally {
			setResetBusy(false);
		}
	}, []);

	const segment = useCallback(async () => {
		setBusy(true);
		setError(null);
		setEntity(null);
		setActiveIndex(null);
		setResolutionError(null);
		try {
			const response = await fetch("/api/segment", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ text, selection }),
			});
			const payload = (await response.json()) as SegmentationResponse & {
				error?: string;
			};
			if (!response.ok)
				throw new Error(payload.error ?? "Segmentation failed.");
			setResult(payload);
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "Segmentation failed.",
			);
		} finally {
			setBusy(false);
		}
	}, [selection, text]);

	const selectSegment = useCallback(
		async (index: number) => {
			if (!result?.sentence) return;
			setActiveIndex(index);
			setEntity(null);
			setResolutionBusy(true);
			setResolutionError(null);
			try {
				const response = await fetch("/api/resolve", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						segmentedSentenceId: result.sentence.id,
						clickedSegmentIndex: index,
					}),
				});
				const payload =
					(await response.json()) as ClickResolutionResponse & {
						error?: string;
					};
				if (!response.ok)
					throw new Error(payload.error ?? "Resolution failed.");
				setEntity(payload.entity);
			} catch (cause) {
				setResolutionError(
					cause instanceof Error
						? cause.message
						: "Resolution failed.",
				);
			} finally {
				setResolutionBusy(false);
			}
		},
		[result],
	);

	return {
		text,
		setText(value) {
			setText(value);
			setSelection({ start: 0, end: 0 });
		},
		selection,
		setSelection,
		result,
		activeIndex,
		entity,
		selectSegment,
		segment,
		busy,
		error,
		resolutionBusy,
		resolutionError,
		sessionId,
		resetSession,
		resetBusy,
		sessionError,
	};
}

function SourceEditor({ state }: { state: LaboratoryState }) {
	const ref = useRef<HTMLTextAreaElement>(null);
	useEffect(() => {
		ref.current?.setSelectionRange(
			state.selection.start,
			state.selection.end,
		);
	}, [state.selection.end, state.selection.start]);
	const selectedCount = state.selection.end - state.selection.start;
	return (
		<section className="source-panel">
			<div className="section-heading">
				<div>
					<p className="eyebrow">Input · de only</p>
					<h2>Source text</h2>
				</div>
				<div className="session-controls">
					<span className="status-dot">
						{state.sessionId
							? `session ${state.sessionId.slice(0, 8)}`
							: "loading session"}
					</span>
					<button
						type="button"
						className="reset-session"
						onClick={() => void state.resetSession()}
						disabled={
							state.busy ||
							state.resolutionBusy ||
							state.resetBusy
						}
					>
						{state.resetBusy ? "Resetting…" : "Reset session"}
					</button>
				</div>
			</div>
			<textarea
				ref={ref}
				value={state.text}
				onChange={(event) => state.setText(event.target.value)}
				onSelect={(event) => {
					const target = event.currentTarget;
					state.setSelection({
						start: target.selectionStart,
						end: target.selectionEnd,
					});
				}}
				aria-label="German source text"
				spellCheck="false"
			/>
			<div className="source-actions">
				<p>
					{selectedCount > 0
						? `${selectedCount} characters selected`
						: "Select text to continue"}
				</p>
				<button
					type="button"
					onClick={state.segment}
					disabled={selectedCount === 0 || state.busy}
				>
					{state.busy ? "Segmenting…" : "Segment"}
				</button>
			</div>
			{state.error ? (
				<p className="error-message">{state.error}</p>
			) : null}
			{state.sessionError ? (
				<p className="error-message">{state.sessionError}</p>
			) : null}
		</section>
	);
}

function Segments({ state }: { state: LaboratoryState }) {
	const segments = state.result?.sentence?.segments ?? [];
	return (
		<section className="segments-panel">
			<div className="section-heading section-heading--small">
				<div>
					<p className="eyebrow">Output</p>
					<h2>Segments</h2>
				</div>
				<span>
					{segments.length > 0
						? `${segments.length} indexed`
						: "waiting"}
				</span>
			</div>
			<div className="segment-list">
				{state.result && state.result.decision !== "Accepted" ? (
					<p className="empty-state">
						Dumgen returned {state.result.decision}.
					</p>
				) : segments.length === 0 ? (
					<p className="empty-state">
						Select text and run the Dumgen segmenter.
					</p>
				) : (
					segments.map((segment) => (
						<SegmentToken
							key={`${segment.index}-${segment.text}`}
							segment={segment}
							active={state.activeIndex === segment.index}
							onClick={() =>
								void state.selectSegment(segment.index)
							}
						/>
					))
				)}
			</div>
			{state.result?.sentence ? (
				<p className="sentence-id">
					Sentence {state.result.sentence.id.slice(0, 8)} · gpt-5-nano
					· local indices shown
				</p>
			) : null}
		</section>
	);
}

function SegmentToken({
	segment,
	active,
	onClick,
}: {
	segment: Segment;
	active: boolean;
	onClick: () => void;
}) {
	if (segment.kind === "Whitespace") {
		return (
			<span
				className="segment-space"
				title={`#${segment.index} Whitespace`}
			>
				·
			</span>
		);
	}
	const clickable = segment.kind === "ResolvableText";
	return (
		<button
			type="button"
			className={`segment-token segment-token--${segment.kind.toLowerCase()} ${active ? "is-active" : ""}`}
			disabled={!clickable}
			onClick={onClick}
			title={`#${segment.index} ${segment.kind}`}
		>
			<small>{segment.index}</small>
			{segment.text}
		</button>
	);
}

function EntityTabs({ state }: { state: LaboratoryState }) {
	const [tab, setTab] = useState<Tab>("reading");
	const { entity } = state;
	return (
		<section className="entity-panel">
			<div className="entity-title">
				<div>
					<p className="eyebrow">Selected segment</p>
					<h2>Entity representation</h2>
				</div>
				{entity ? (
					<span className="resolution resolution--dumgen">
						Dumgen · {entity.model}
					</span>
				) : null}
			</div>
			<div
				className="tabs"
				role="tablist"
				aria-label="Entity representation"
			>
				{(["reading", "surface", "selection"] as const).map(
					(candidate) => (
						<button
							key={candidate}
							type="button"
							role="tab"
							aria-selected={tab === candidate}
							className={tab === candidate ? "is-active" : ""}
							onClick={() => setTab(candidate)}
						>
							{candidate}
						</button>
					),
				)}
			</div>
			<div className="entity-content">
				{state.resolutionBusy ? (
					<p className="empty-state">
						Resolving the clicked Segment through Dumgen…
					</p>
				) : state.resolutionError ? (
					<p className="error-message">{state.resolutionError}</p>
				) : entity ? (
					<EntityDetails label={tab} value={entity[tab]} />
				) : (
					<p className="empty-state">
						Click a resolvable segment to call the resolution
						prompt.
					</p>
				)}
			</div>
		</section>
	);
}

function EntityDetails({ label, value }: { label: string; value: unknown }) {
	return (
		<div className="details-block">
			<p className="details-path">entity.{label}</p>
			<ObjectRows value={value as Record<string, unknown>} />
		</div>
	);
}

function ObjectRows({
	value,
	depth = 0,
}: {
	value: Record<string, unknown>;
	depth?: number;
}) {
	return (
		<dl className={depth > 0 ? "nested-object" : "object-rows"}>
			{Object.entries(value).map(([key, item]) => {
				const isObject =
					item !== null &&
					typeof item === "object" &&
					!Array.isArray(item);
				return (
					<div className="object-row" key={key}>
						<dt>{key}</dt>
						<dd>
							{isObject ? (
								<ObjectRows
									value={item as Record<string, unknown>}
									depth={depth + 1}
								/>
							) : (
								formatValue(item)
							)}
						</dd>
					</div>
				);
			})}
		</dl>
	);
}

function formatValue(value: unknown): ReactNode {
	if (Array.isArray(value)) return value.join(", ");
	if (typeof value === "boolean") return value ? "true" : "false";
	return String(value);
}

function Laboratory({ state }: { state: LaboratoryState }) {
	return (
		<main className="laboratory">
			<div className="workbench">
				<div className="results-column">
					<Segments state={state} />
					<EntityTabs state={state} />
				</div>
				<SourceEditor state={state} />
			</div>
		</main>
	);
}

export function App() {
	const state = useLaboratory();
	return <Laboratory state={state} />;
}
