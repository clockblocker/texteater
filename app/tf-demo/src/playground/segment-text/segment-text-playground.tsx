import { useState } from "react";

import "./segment-text-playground.css";

type Unit = {
	readonly id: string;
	readonly label: string;
	readonly reading: string;
	readonly memberCount: number;
};

type PinnedUnit = {
	readonly unitId: string;
	readonly originSegmentId: string;
};

type TextPart =
	| {
			readonly kind: "segment";
			readonly id: string;
			readonly text: string;
			readonly unitId: string;
	  }
	| {
			readonly kind: "space";
			readonly id: string;
			readonly text: string;
			readonly bridgeUnitId?: string;
	  };

type TokenSpec = string | readonly [text: string, unitId: string];

type PassageBlock =
	| {
			readonly id: string;
			readonly kind: "quote" | "aside";
			readonly parts: readonly TextPart[];
	  }
	| {
			readonly id: string;
			readonly kind: "dialogue";
			readonly speaker: "Anna" | "Sascha";
			readonly parts: readonly TextPart[];
	  };

const UNITS: readonly Unit[] = [
	{
		id: "seven-years-quote",
		label: "Temporal phrase",
		reading: "vor sieben Jahren",
		memberCount: 3,
	},
	{
		id: "seven-years-correction",
		label: "Temporal phrase",
		reading: "vor sieben Jahren",
		memberCount: 3,
	},
	{
		id: "remember",
		label: "Reflexive verb",
		reading: "sich erinnern",
		memberCount: 2,
	},
	{
		id: "from-america",
		label: "Prepositional phrase",
		reading: "aus Amerika",
		memberCount: 2,
	},
	{
		id: "look-up",
		label: "Separable verb",
		reading: "heraussuchen",
		memberCount: 2,
	},
	{
		id: "call",
		label: "Separable verb",
		reading: "anrufen",
		memberCount: 2,
	},
	{
		id: "write-back",
		label: "Separable verb",
		reading: "zurückschreiben",
		memberCount: 2,
	},
	{
		id: "invite",
		label: "Separable verb",
		reading: "einladen",
		memberCount: 2,
	},
	{
		id: "come-by",
		label: "Separable verb",
		reading: "vorbeikommen",
		memberCount: 2,
	},
] as const;

const PASSAGE: readonly PassageBlock[] = [
	{
		id: "opening",
		kind: "quote",
		parts: tokenize("opening", [
			"„Sascha",
			"Maus,",
			"dieser",
			"Brief",
			"ist",
			"für",
			"dich.",
			"Hast",
			"du",
			"immer",
			"noch",
			"so",
			"viele",
			"Pickel?",
			"Deine",
			"Mama.“",
		]),
	},
	{
		id: "america",
		kind: "dialogue",
		speaker: "Sascha",
		parts: tokenize("america", [
			"Danke.",
			"Der",
			"hier",
			"ist",
			["aus", "from-america"],
			["Amerika.", "from-america"],
		]),
	},
	{
		id: "ask-who",
		kind: "dialogue",
		speaker: "Anna",
		parts: tokenize("ask-who", [
			"Aus",
			"Amerika?",
			"Von",
			"wem",
			"denn?",
			"Na",
			"sag",
			"schon",
			"…",
		]),
	},
	{
		id: "old-letter",
		kind: "dialogue",
		speaker: "Sascha",
		parts: tokenize("old-letter", [
			"Mmh",
			"…",
			"„Hallo!",
			"Kennst",
			"du",
			"mich",
			"noch?“",
			"Nein",
			"…",
			["„vor", "seven-years-quote"],
			["sieben", "seven-years-quote"],
			["Jahren", "seven-years-quote"],
			"Brieffreunde",
			"sind",
			"wir",
			"…“",
		]),
	},
	{
		id: "correction",
		kind: "aside",
		parts: tokenize("correction", [
			["Vor", "seven-years-correction"],
			["sieben", "seven-years-correction"],
			["Jahren", "seven-years-correction"],
			"waren",
			"wir",
			"Brieffreunde.",
		]),
	},
	{
		id: "remember-line",
		kind: "quote",
		parts: tokenize("remember-line", [
			"Ach",
			"du",
			"liebe",
			"Zeit!",
			"…",
			"Jetzt",
			["erinnere", "remember"],
			"ich",
			["mich", "remember"],
			"wieder.",
			"Der",
			"Brief",
			"ist",
			"von",
			"Sam!",
			"Sam",
			"Scott!",
		]),
	},
	{
		id: "ask-now",
		kind: "dialogue",
		speaker: "Anna",
		parts: tokenize("ask-now", ["Und", "was", "machst", "du", "jetzt?"]),
	},
	{
		id: "find-address",
		kind: "dialogue",
		speaker: "Sascha",
		parts: tokenize("find-address", [
			"Zuerst",
			["suche", "look-up"],
			"ich",
			"seine",
			"Adresse",
			["heraus.", "look-up"],
		]),
	},
	{
		id: "call-and-write",
		kind: "dialogue",
		speaker: "Sascha",
		parts: tokenize("call-and-write", [
			"Danach",
			["rufe", "call"],
			"ich",
			"Sam",
			["an", "call"],
			"und",
			["schreibe", "write-back"],
			"ihm",
			"gleich",
			["zurück.", "write-back"],
		]),
	},
	{
		id: "invitation",
		kind: "dialogue",
		speaker: "Anna",
		parts: tokenize("invitation", [
			"Vielleicht",
			["lädt", "invite"],
			"er",
			"dich",
			"nach",
			"Amerika",
			["ein.", "invite"],
		]),
	},
	{
		id: "visit",
		kind: "dialogue",
		speaker: "Sascha",
		parts: tokenize("visit", [
			"Oder",
			"Sam",
			["kommt", "come-by"],
			"nächstes",
			"Jahr",
			["vorbei.", "come-by"],
		]),
	},
] as const;

export function SegmentTextPlayground() {
	const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);
	const [focusedUnitId, setFocusedUnitId] = useState<string | null>(null);
	const [pinnedUnits, setPinnedUnits] = useState<readonly PinnedUnit[]>([]);
	const [transientOriginSegmentId, setTransientOriginSegmentId] = useState<
		string | null
	>(null);
	const lastPinnedUnit = pinnedUnits.at(-1) ?? null;
	const inspectedUnitId =
		hoveredUnitId ?? focusedUnitId ?? lastPinnedUnit?.unitId ?? null;
	const inspectedOriginSegmentId =
		hoveredUnitId || focusedUnitId
			? transientOriginSegmentId
			: (lastPinnedUnit?.originSegmentId ?? null);
	const inspectedUnit = resolveUnit(
		inspectedUnitId,
		inspectedOriginSegmentId,
	);
	const highlightedUnitIds = new Set(pinnedUnits.map(({ unitId }) => unitId));
	if (hoveredUnitId) highlightedUnitIds.add(hoveredUnitId);
	if (focusedUnitId) highlightedUnitIds.add(focusedUnitId);
	const originSegmentIds = new Set(
		pinnedUnits.map(({ originSegmentId }) => originSegmentId),
	);
	if (hoveredUnitId || focusedUnitId) {
		if (transientOriginSegmentId) {
			originSegmentIds.add(transientOriginSegmentId);
		}
	}

	function activateUnit(unitId: string, segmentId: string) {
		setHoveredUnitId(unitId);
		setTransientOriginSegmentId(segmentId);
	}

	function pinUnit(unitId: string, segmentId: string) {
		setPinnedUnits((current) => [
			...current.filter((unit) => unit.unitId !== unitId),
			{ unitId, originSegmentId: segmentId },
		]);
		setTransientOriginSegmentId(segmentId);
	}

	return (
		<div className="segment-study">
			<header className="segment-study__toolbar">
				<div className="segment-study__title">
					<span>Text specimen</span>
					<strong>Segments in continuous reading</strong>
				</div>
				<p className="segment-study__mode" aria-live="polite">
					<span aria-hidden="true" />
					Memory ink · {pinnedUnits.length} kept
				</p>
			</header>

			<div className="segment-study__body">
				<div className="segment-reader">
					<header className="segment-reader__header">
						<nav aria-label="Text location">
							<span>Texte</span>
							<i aria-hidden="true">/</i>
							<span>Extra</span>
							<i aria-hidden="true">/</i>
							<strong>1.1 Sams Ankunft</strong>
						</nav>
						<span className="segment-reader__hint">
							Hover a word · click to keep the unit visible
						</span>
					</header>

					<article
						className="segment-reader__passage"
						aria-label="Sams Ankunft"
					>
						{PASSAGE.map((block) => (
							<PassageBlockView
								key={block.id}
								block={block}
								highlightedUnitIds={highlightedUnitIds}
								originSegmentIds={originSegmentIds}
								onActivateUnit={activateUnit}
								onBlurUnit={() => setFocusedUnitId(null)}
								onFocusUnit={(unitId, segmentId) => {
									setFocusedUnitId(unitId);
									setTransientOriginSegmentId(segmentId);
								}}
								onLeaveUnit={() => setHoveredUnitId(null)}
								onPinUnit={pinUnit}
							/>
						))}
					</article>
				</div>

				<aside className="unit-inspector" aria-live="polite">
					<div className="unit-inspector__rule" aria-hidden="true" />
					<p className="unit-inspector__eyebrow">
						{inspectedUnit?.memberCount === 1
							? "Selected segment"
							: "Resolved together"}
					</p>
					{inspectedUnit ? (
						<>
							<h2>{inspectedUnit.reading}</h2>
							<p>{inspectedUnit.label}</p>
							<div className="unit-inspector__count">
								<strong>{inspectedUnit.memberCount}</strong>
								<span>
									{inspectedUnit.memberCount === 1
										? "segment"
										: "segments"}
									<br />
									one unit
								</span>
							</div>
						</>
					) : (
						<>
							<h2>Read first</h2>
							<p>
								Segment boundaries appear only when you ask for
								them.
							</p>
						</>
					)}
					<p className="unit-inspector__note">
						Clicking keeps every member of a resolved unit
						highlighted. Kept units accumulate until you reset the
						fixture.
					</p>
				</aside>
			</div>
		</div>
	);
}

function PassageBlockView({
	block,
	highlightedUnitIds,
	originSegmentIds,
	onActivateUnit,
	onFocusUnit,
	onBlurUnit,
	onLeaveUnit,
	onPinUnit,
}: {
	readonly block: PassageBlock;
	readonly highlightedUnitIds: ReadonlySet<string>;
	readonly originSegmentIds: ReadonlySet<string>;
	readonly onActivateUnit: (unitId: string, segmentId: string) => void;
	readonly onFocusUnit: (unitId: string, segmentId: string) => void;
	readonly onBlurUnit: () => void;
	readonly onLeaveUnit: () => void;
	readonly onPinUnit: (unitId: string, segmentId: string) => void;
}) {
	const content = block.parts.map((part) => {
		if (part.kind === "space") {
			return (
				<span
					key={part.id}
					className="segment-bridge"
					data-unit-active={
						(part.bridgeUnitId !== undefined &&
							highlightedUnitIds.has(part.bridgeUnitId)) ||
						undefined
					}
					aria-hidden="true"
				>
					{part.text}
				</span>
			);
		}

		const unit = resolveUnit(part.unitId, part.id);
		const accessibleDescription =
			unit?.memberCount === 1
				? `${part.text}, single segment`
				: `${part.text}, part of ${unit?.reading ?? "one resolved unit"}`;

		return (
			<button
				key={part.id}
				type="button"
				className="text-segment"
				data-unit-active={
					highlightedUnitIds.has(part.unitId) || undefined
				}
				data-origin={originSegmentIds.has(part.id) || undefined}
				aria-label={accessibleDescription}
				onBlur={onBlurUnit}
				onClick={() => onPinUnit(part.unitId, part.id)}
				onFocus={() => onFocusUnit(part.unitId, part.id)}
				onMouseEnter={() => onActivateUnit(part.unitId, part.id)}
				onMouseLeave={onLeaveUnit}
			>
				{part.text}
			</button>
		);
	});

	if (block.kind === "dialogue") {
		return (
			<section
				className="passage-block passage-block--dialogue"
				data-passage-block={block.id}
			>
				<h2>{block.speaker}:</h2>
				<p>{content}</p>
			</section>
		);
	}

	return (
		<p
			className={`passage-block passage-block--${block.kind}`}
			data-passage-block={block.id}
		>
			{content}
		</p>
	);
}

function tokenize(prefix: string, tokens: readonly TokenSpec[]): TextPart[] {
	return tokens.flatMap((token, index) => {
		const [text, explicitUnitId] =
			typeof token === "string" ? [token, undefined] : token;
		const id = `${prefix}-${index}`;
		const unitId = explicitUnitId ?? `single:${id}`;
		const segment: TextPart = { kind: "segment", id, text, unitId };
		const nextToken = tokens[index + 1];
		if (!nextToken) return [segment];

		const nextExplicitUnitId =
			typeof nextToken === "string" ? undefined : nextToken[1];
		const bridgeUnitId =
			explicitUnitId && explicitUnitId === nextExplicitUnitId
				? explicitUnitId
				: undefined;
		const gap: TextPart = {
			kind: "space",
			id: `${prefix}-space-${index}`,
			text: " ",
			...(bridgeUnitId ? { bridgeUnitId } : {}),
		};
		return [segment, gap];
	});
}

function resolveUnit(
	unitId: string | null,
	segmentId: string | null,
): Unit | null {
	if (!unitId) return null;
	const groupedUnit = UNITS.find((unit) => unit.id === unitId);
	if (groupedUnit) return groupedUnit;

	const segment = PASSAGE.flatMap((block) => block.parts).find(
		(part) => part.kind === "segment" && part.id === segmentId,
	);
	return segment?.kind === "segment"
		? {
				id: unitId,
				label: "Single segment",
				reading: segment.text,
				memberCount: 1,
			}
		: null;
}
