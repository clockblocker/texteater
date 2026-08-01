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
	Segment,
	SegmentationResponse,
} from "../shared/contract";

const sampleText = "Der Hund läuft schnell. Der Kaffee ist heiß.";
const variants = ["A", "B", "C"] as const;
type Variant = (typeof variants)[number];
type Tab = "reading" | "surface" | "selection";

const variantNames: Record<Variant, string> = {
	A: "Split bench",
	B: "Evidence stack",
	C: "Three-rail inspector",
};

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
	};
}

function SourceEditor({
	state,
	compact = false,
}: {
	state: LaboratoryState;
	compact?: boolean;
}) {
	const ref = useRef<HTMLTextAreaElement>(null);
	useEffect(() => {
		ref.current?.setSelectionRange(
			state.selection.start,
			state.selection.end,
		);
	}, [state.selection.end, state.selection.start]);
	const selectedCount = state.selection.end - state.selection.start;
	return (
		<section
			className={`source-panel ${compact ? "source-panel--compact" : ""}`}
		>
			<div className="section-heading">
				<div>
					<p className="eyebrow">Input · de only</p>
					<h2>Source text</h2>
				</div>
				<span className="status-dot">live Dumgen</span>
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
		</section>
	);
}

function Segments({
	state,
	vertical = false,
}: {
	state: LaboratoryState;
	vertical?: boolean;
}) {
	const segments = state.result?.sentence?.segments ?? [];
	return (
		<section
			className={`segments-panel ${vertical ? "segments-panel--vertical" : ""}`}
		>
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

function VariantA({ state }: { state: LaboratoryState }) {
	return (
		<main className="variant variant-a">
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

function VariantB({ state }: { state: LaboratoryState }) {
	return (
		<main className="variant variant-b">
			<header className="lab-header">
				<p className="eyebrow">Laboratory / 001</p>
				<h1>German segmentation evidence</h1>
				<p>
					The source, emitted segments, and resolved entity stay in
					one vertical reading path.
				</p>
			</header>
			<SourceEditor state={state} compact />
			<Segments state={state} />
			<EntityTabs state={state} />
		</main>
	);
}

function VariantC({ state }: { state: LaboratoryState }) {
	return (
		<main className="variant variant-c">
			<div className="rail rail-source">
				<SourceEditor state={state} compact />
			</div>
			<div className="rail rail-segments">
				<Segments state={state} vertical />
			</div>
			<div className="rail rail-entity">
				<EntityTabs state={state} />
			</div>
		</main>
	);
}

function variantFromUrl(): Variant {
	const candidate = new URLSearchParams(window.location.search)
		.get("variant")
		?.toUpperCase();
	return variants.includes(candidate as Variant)
		? (candidate as Variant)
		: "A";
}

function PrototypeSwitcher({
	variant,
	onChange,
}: {
	variant: Variant;
	onChange: (variant: Variant) => void;
}) {
	const cycle = useCallback(
		(direction: -1 | 1) => {
			const index = variants.indexOf(variant);
			onChange(
				variants[
					(index + direction + variants.length) % variants.length
				] ?? "A",
			);
		},
		[onChange, variant],
	);

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent): void {
			const target = event.target as HTMLElement | null;
			if (target?.matches("input, textarea, [contenteditable]")) return;
			if (event.key === "ArrowLeft") cycle(-1);
			if (event.key === "ArrowRight") cycle(1);
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [cycle]);

	if (import.meta.env.PROD) return null;
	return (
		<nav className="prototype-switcher" aria-label="Prototype variants">
			<button
				type="button"
				onClick={() => cycle(-1)}
				aria-label="Previous variant"
			>
				←
			</button>
			<span>
				<strong>{variant}</strong> — {variantNames[variant]}
			</span>
			<button
				type="button"
				onClick={() => cycle(1)}
				aria-label="Next variant"
			>
				→
			</button>
		</nav>
	);
}

export function App() {
	const state = useLaboratory();
	const [variant, setVariant] = useState<Variant>(variantFromUrl);
	const changeVariant = useCallback((next: Variant) => {
		const url = new URL(window.location.href);
		url.searchParams.set("variant", next);
		window.history.replaceState({}, "", url);
		setVariant(next);
	}, []);

	return (
		<>
			{variant === "A" ? <VariantA state={state} /> : null}
			{variant === "B" ? <VariantB state={state} /> : null}
			{variant === "C" ? <VariantC state={state} /> : null}
			<PrototypeSwitcher variant={variant} onChange={changeVariant} />
		</>
	);
}
