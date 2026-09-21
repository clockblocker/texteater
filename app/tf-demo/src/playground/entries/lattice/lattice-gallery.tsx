import {
	ReaderPlainSegment,
	ReaderSegment,
	type ReaderSegmentTone,
} from "lego";
import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";

import latticeFixtures from "../../../../../../battery/dumgen/prototypes/intake/fixtures/lattice.json";
import {
	type AnalysisTarget,
	effectiveRoute,
	type Fixture,
	type Fusion,
	fusionAt,
	type GoldTarget,
	headOf,
	type IdentityState,
	type Member,
	type Segment,
	type SegmentedSentence,
	selectIdentity,
	selectRoute,
	targetOf,
} from "../../../../../../battery/dumgen/prototypes/intake/segmented-sentence";
import type { EntryRoute } from "../../playground-router";
import { Stage } from "../frames";

const fixtures = latticeFixtures as readonly Fixture[];

/**
 * Lab-produced lattices for real sentences (issue 496). Every value shown is
 * read off the fixture through the Resolution Selector; nothing here calls a
 * model or Convex. The URL carries the shown sentence:
 * `/playground/lattice/<sentence id>`.
 */
export function LatticeGallery({ route }: { readonly route: EntryRoute }) {
	const [sentenceId] = route.segments;
	const fixture =
		fixtures.find((entry) => entry.sentence.id === sentenceId) ??
		fixtures[0];
	useEffect(() => {
		if (fixture && fixture.sentence.id !== sentenceId)
			route.setSegments([fixture.sentence.id], { replace: true });
	}, [fixture, sentenceId, route]);
	if (!fixture) return null;
	return (
		<div className="grid min-h-full gap-6 p-4 md:grid-cols-[14rem_minmax(0,1fr)] md:p-6">
			<nav aria-label="Sentences" className="grid content-start gap-1">
				{fixtures.map((entry) => (
					<button
						key={entry.sentence.id}
						type="button"
						onClick={() => route.setSegments([entry.sentence.id])}
						className={`rounded-md border px-2 py-1.5 text-start text-[0.8rem] leading-snug ${
							entry === fixture
								? "border-line-strong bg-raised text-ink"
								: "border-transparent text-ink-muted hover:bg-raised hover:text-ink"
						}`}
					>
						<span className="block font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ink-soft">
							{entry.sentence.id}
						</span>
						{entry.sentence.stitchedText}
					</button>
				))}
			</nav>
			<FixtureView key={fixture.sentence.id} fixture={fixture} />
		</div>
	);
}

function FixtureView({ fixture }: { readonly fixture: Fixture }) {
	const { sentence } = fixture;
	const [selected, setSelected] = useState<number | null>(null);
	const [hovered, setHovered] = useState<number | null>(null);
	const selectedTarget =
		selected === null ? undefined : targetOf(sentence, selected);
	const hoveredTarget =
		hovered === null ? undefined : targetOf(sentence, hovered);
	const hoveredSegment =
		hovered === null
			? undefined
			: sentence.segments.find((segment) => segment.offset === hovered);
	const hoveredFusion =
		hovered === null ? undefined : fusionAt(sentence, hovered);
	return (
		<div className="grid content-start gap-8">
			<Stage label="Sentence">
				<p className="text-[0.8rem] text-ink-muted">{fixture.note}</p>
				<p className="max-w-[46rem] font-serif text-[1.55rem] leading-[1.7]">
					{sentence.segments.map((segment) => (
						<Word
							key={segment.offset}
							sentence={sentence}
							segment={segment}
							selectedTarget={selectedTarget}
							hoveredTarget={hoveredTarget}
							onHover={setHovered}
							onSelect={setSelected}
						/>
					))}
				</p>
				<HoverLine
					segment={hoveredSegment}
					fusion={hoveredFusion}
					sentence={sentence}
				/>
			</Stage>
			<Stage label="Target">
				{selectedTarget ? (
					<TargetPanel
						sentence={sentence}
						target={selectedTarget}
						gold={fixture.gold}
						clicked={selected}
					/>
				) : (
					<p className="text-[0.8rem] text-ink-muted">
						Click a word. The whole Analysis Target it belongs to
						lights up, and its masses are shown here as the
						Resolution Selector reads them.
					</p>
				)}
			</Stage>
			<Stage label="Every target">
				<TargetList
					sentence={sentence}
					gold={fixture.gold}
					onSelect={setSelected}
					selected={selectedTarget}
				/>
			</Stage>
			<Stage label="Legend">
				<Legend
					design={fixture.produced.design}
					at={fixture.produced.at}
				/>
			</Stage>
		</div>
	);
}

/* ---------- the reading line ---------- */

function toneOf(
	target: AnalysisTarget | undefined,
	member: Member | undefined,
): ReaderSegmentTone {
	if (!target || !member) return "plain";
	const route = effectiveRoute(target);
	const identity = selectIdentity(target, member);
	if (identity.state === "Miss") return "failed";
	if (route.kind === "Unresolved" || identity.state === "Unresolved")
		return "unknown";
	if (identity.state === "Open") return "shadow";
	return "known";
}

function Word({
	sentence,
	segment,
	selectedTarget,
	hoveredTarget,
	onHover,
	onSelect,
}: {
	readonly sentence: SegmentedSentence;
	readonly segment: Segment;
	readonly selectedTarget: AnalysisTarget | undefined;
	readonly hoveredTarget: AnalysisTarget | undefined;
	readonly onHover: (offset: number | null) => void;
	readonly onSelect: (offset: number) => void;
}) {
	if (segment.kind !== "ResolvableText")
		return <ReaderPlainSegment>{segment.text}</ReaderPlainSegment>;
	const target = targetOf(sentence, segment.offset);
	const member = target?.members.find((m) => m.offset === segment.offset);
	const fusion = fusionAt(sentence, segment.offset);
	const interaction =
		target && target === selectedTarget
			? "selected"
			: target && target === hoveredTarget
				? "previewed"
				: "idle";
	const title = fusion
		? `${fusion.form}: ${fusion.components.map((c) => `${c.span} → ${c.surface}`).join(" + ")}`
		: segment.surface !== segment.text
			? `${segment.text} → ${segment.surface}`
			: undefined;
	return (
		<ReaderSegment
			tone={toneOf(target, member)}
			interaction={interaction}
			title={title}
			data-offset={segment.offset}
			data-fusion={fusion?.form}
			className={
				fusion
					? "rounded-[0.15em] outline-1 outline-dotted outline-line-strong/60"
					: undefined
			}
			onMouseEnter={() => onHover(segment.offset)}
			onMouseLeave={() => onHover(null)}
			onFocus={() => onHover(segment.offset)}
			onBlur={() => onHover(null)}
			onClick={() => onSelect(segment.offset)}
		>
			{segment.text}
		</ReaderSegment>
	);
}

function HoverLine({
	segment,
	fusion,
	sentence,
}: {
	readonly segment: Segment | undefined;
	readonly fusion: Fusion | undefined;
	readonly sentence: SegmentedSentence;
}) {
	if (segment?.kind !== "ResolvableText")
		return (
			<p className="min-h-[1.5rem] text-[0.8rem] text-ink-soft">
				Hover a word to see its Segment; a fused word shows its pieces.
			</p>
		);
	const target = targetOf(sentence, segment.offset);
	return (
		<p className="min-h-[1.5rem] text-[0.8rem] text-ink-muted">
			{fusion ? (
				<>
					<span className="font-semibold text-ink">Fusion</span>{" "}
					<Mono>{fusion.form}</Mono> ={" "}
					{fusion.components.map((component, index) => (
						<Fragment key={component.offset}>
							{index > 0 ? " + " : ""}
							<Mono>{component.span}</Mono> standing for{" "}
							<Mono>{component.surface}</Mono> ({component.role}
							{component.offset === segment.offset
								? ", hovered"
								: ""}
							)
						</Fragment>
					))}
				</>
			) : (
				<>
					<span className="font-semibold text-ink">Segment</span> at
					offset {segment.offset}: <Mono>{segment.text}</Mono>
					{segment.surface !== segment.text ? (
						<>
							{" "}
							standing for <Mono>{segment.surface}</Mono>
						</>
					) : null}
				</>
			)}
			{target ? (
				<>
					{" "}
					· target <Mono>{target.id}</Mono>, {target.members.length}{" "}
					member{target.members.length === 1 ? "" : "s"}
				</>
			) : null}
		</p>
	);
}

/* ---------- the target panel ---------- */

function TargetPanel({
	sentence,
	target,
	gold,
	clicked,
}: {
	readonly sentence: SegmentedSentence;
	readonly target: AnalysisTarget;
	readonly gold: readonly GoldTarget[];
	readonly clicked: number | null;
}) {
	const text = (offset: number) =>
		sentence.segments.find((s) => s.offset === offset);
	const route = effectiveRoute(target);
	const vote = selectRoute(target);
	const head = headOf(target);
	const verdict = useMemo(
		() => goldVerdict(target, gold, clicked, sentence),
		[target, gold, clicked, sentence],
	);
	return (
		<div className="grid gap-5 rounded-[0.7rem] border border-line bg-paper p-4">
			<header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
				<span className="font-serif text-[1.2rem] text-ink">
					{target.members
						.map((m) => text(m.offset)?.text ?? "?")
						.join(" ")}
				</span>
				<RouteBadge
					kind={route.kind}
					family={route.family}
					share={route.share}
				/>
				{route.kind !== vote.kind ? (
					<span className="text-[0.75rem] text-ink-muted">
						vote said {vote.kind}; identity implies route
					</span>
				) : null}
				<span className="font-mono text-[0.65rem] text-ink-soft">
					{target.id} · {target.provenance}
				</span>
			</header>
			<p
				className={`text-[0.8rem] ${verdict.ok ? "text-ink-muted" : "text-word-unknown"}`}
			>
				{verdict.text}
			</p>
			<div className="grid gap-4 md:grid-cols-2">
				<section className="grid content-start gap-2">
					<Label>Members</Label>
					<table className="w-full text-[0.8rem]">
						<tbody>
							{target.members.map((member) => {
								const segment = text(member.offset);
								const identity = selectIdentity(target, member);
								return (
									<tr
										key={member.offset}
										className="border-t border-line align-top"
									>
										<td className="py-1 pe-2 font-serif text-[0.95rem] text-ink">
											{segment?.text}
											{segment &&
											segment.surface !== segment.text ? (
												<span className="text-ink-soft">
													{" "}
													→ {segment.surface}
												</span>
											) : null}
										</td>
										<td className="py-1 pe-2 font-mono text-[0.65rem] text-ink-soft">
											@{member.offset}
										</td>
										<td className="py-1 pe-2 text-ink-muted">
											{member.role}
											{member === head ? " ·" : ""}
										</td>
										<td className="py-1">
											<IdentityCell identity={identity} />
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
					<DerivedNotes
						target={target}
						sentence={sentence}
						routeKind={route.kind}
					/>
				</section>
				<section className="grid content-start gap-2">
					<Label>Route mass</Label>
					<Bars mass={target.routeMass} winner={vote.kind} />
				</section>
			</div>
			{target.identity ? (
				<section className="grid gap-2">
					<Label>Identity candidates for the head</Label>
					<Bars
						mass={target.identity.mass}
						winner={(() => {
							const identity = selectIdentity(target, head);
							return identity.state === "Selected"
								? identity.candidate.key
								: identity.state === "Open"
									? "NoMatch"
									: identity.state;
						})()}
						describe={(key) => {
							const candidate = target.identity?.candidates.find(
								(c) => c.key === key,
							);
							if (!candidate)
								return key === "NoMatch"
									? "none of the listed identities"
									: "the sentence cannot decide";
							return `${candidate.kind} ${candidate.headword}${candidate.pronType ? ` (${candidate.pronType})` : ""}, ${candidate.cells.length} cell${candidate.cells.length === 1 ? "" : "s"}: ${candidate.definition}`;
						}}
					/>
				</section>
			) : (
				<p className="text-[0.75rem] text-ink-soft">
					No authored candidates for the head
					{route.kind === "DET" || route.kind === "PRON"
						? ": a closed-class route with nothing to select is a Miss."
						: "; an open-class head continues through generation."}
				</p>
			)}
		</div>
	);
}

function goldVerdict(
	target: AnalysisTarget,
	gold: readonly GoldTarget[],
	clicked: number | null,
	sentence: SegmentedSentence,
): { readonly ok: boolean; readonly text: string } {
	const text = (offset: number) =>
		sentence.segments.find((s) => s.offset === offset)?.text ?? "?";
	const offsets = target.members
		.map((m) => m.offset)
		.sort((a, b) => a - b)
		.join(",");
	const same = gold.find(
		(entry) =>
			entry.members
				.map((m) => m.offset)
				.sort((a, b) => a - b)
				.join(",") === offsets,
	);
	const route = effectiveRoute(target);
	if (same) {
		const roleMismatch = same.members.filter((member) => {
			const actual = target.members.find(
				(m) => m.offset === member.offset,
			)?.role;
			return member.role && actual !== member.role;
		});
		if (route.kind === same.kind && roleMismatch.length === 0)
			return {
				ok: true,
				text: "Matches gold: same members, same route.",
			};
		return {
			ok: false,
			text: `Gold has these members but route ${same.kind}${roleMismatch.length ? `; roles: ${roleMismatch.map((m) => `${text(m.offset)} should be ${m.role}`).join(", ")}` : ""}.`,
		};
	}
	const containing =
		clicked === null
			? undefined
			: gold.find((entry) =>
					entry.members.some((m) => m.offset === clicked),
				);
	if (!containing)
		return { ok: false, text: "Gold has no target with these members." };
	return {
		ok: false,
		text: `Gold puts the clicked word in [${containing.members.map((m) => text(m.offset)).join(" ")}] ${containing.kind}.`,
	};
}

function DerivedNotes({
	target,
	sentence,
	routeKind,
}: {
	readonly target: AnalysisTarget;
	readonly sentence: SegmentedSentence;
	readonly routeKind: string;
}) {
	const head = headOf(target);
	const derived = target.members.filter((member) => member !== head);
	if (derived.length === 0) return null;
	const text = (offset: number) =>
		sentence.segments.find((s) => s.offset === offset);
	return (
		<details className="text-[0.75rem] text-ink-muted">
			<summary className="cursor-pointer text-ink">
				Reachable from the head: {derived.length} Derived member
				{derived.length === 1 ? "" : "s"}
			</summary>
			<ul className="mt-1 grid gap-1 ps-4">
				{derived.map((member) => {
					const segment = text(member.offset);
					return (
						<li key={member.offset} className="list-disc">
							<Mono>{segment?.text}</Mono>{" "}
							{member.role === "Article"
								? `is the article of this ${routeKind}: its DET identity and surface (${segment?.surface}) derive from the noun by agreement (ADR 0024).`
								: member.role === "Auxiliary"
									? "is an Auxiliary: its AUX Reading derives from the head's form and the other auxiliaries, no distribution stored."
									: member.role === "Expletive"
										? "is the lexically selected es of this verb; not a pronoun on its own."
										: member.role === "Reflexive"
											? "is the verb's required reflexive; not a free sich."
											: member.role ===
													"GovernedPreposition"
												? "is the preposition the verb governs; projected as hasGovPrep."
												: member.role ===
														"SeparableParticle"
													? "is the separated prefix; projected as hasSepPrefix."
													: `inherits the ${routeKind} route from the head.`}
						</li>
					);
				})}
			</ul>
		</details>
	);
}

function TargetList({
	sentence,
	gold,
	onSelect,
	selected,
}: {
	readonly sentence: SegmentedSentence;
	readonly gold: readonly GoldTarget[];
	readonly onSelect: (offset: number) => void;
	readonly selected: AnalysisTarget | undefined;
}) {
	const text = (offset: number) =>
		sentence.segments.find((s) => s.offset === offset)?.text ?? "?";
	return (
		<ul className="grid gap-1 text-[0.8rem]">
			{sentence.targets.map((target) => {
				const route = effectiveRoute(target);
				const identity = selectIdentity(target, headOf(target));
				const verdict = goldVerdict(
					target,
					gold,
					target.members[0]?.offset ?? null,
					sentence,
				);
				return (
					<li key={target.id}>
						<button
							type="button"
							onClick={() =>
								onSelect(target.members[0]?.offset ?? 0)
							}
							className={`flex w-full flex-wrap items-baseline gap-x-2 rounded-md px-2 py-1 text-start hover:bg-raised ${target === selected ? "bg-raised" : ""}`}
						>
							<span className="font-serif text-[0.95rem] text-ink">
								{target.members
									.map((m) => text(m.offset))
									.join(" ")}
							</span>
							<RouteBadge
								kind={route.kind}
								family={route.family}
								share={route.share}
							/>
							<span className="text-ink-muted">
								{identity.state}
							</span>
							<span
								className={`ms-auto font-mono text-[0.62rem] ${verdict.ok ? "text-ink-soft" : "text-word-unknown"}`}
							>
								{verdict.ok ? "gold ✓" : "gold ✗"}
							</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}

/* ---------- small parts ---------- */

function IdentityCell({ identity }: { readonly identity: IdentityState }) {
	if (identity.state === "Selected")
		return (
			<span className="text-ink">
				Selected: {identity.candidate.kind}{" "}
				{identity.candidate.headword}{" "}
				<span className="text-ink-soft">
					{Math.round(identity.share * 100)}%
				</span>
			</span>
		);
	if (identity.state === "Miss")
		return <span className="text-word-unknown">Miss</span>;
	if (identity.state === "Unresolved")
		return <span className="text-word-unknown">Unresolved</span>;
	return <span className="text-ink-muted">{identity.state}</span>;
}

function RouteBadge({
	kind,
	family,
	share,
}: {
	readonly kind: string;
	readonly family: string;
	readonly share: number;
}) {
	return (
		<span
			className={`rounded-sm border px-1.5 py-0.5 font-mono text-[0.65rem] ${kind === "Unresolved" ? "border-word-unknown/50 text-word-unknown" : "border-line-strong text-ink"}`}
		>
			{family !== "Unresolved" ? `${family}/` : ""}
			{kind} {Math.round(share * 100)}%
		</span>
	);
}

function Bars({
	mass,
	winner,
	describe,
}: {
	readonly mass: Readonly<Record<string, number>>;
	readonly winner: string;
	readonly describe?: (key: string) => string;
}) {
	const sorted = Object.entries(mass).sort((a, b) => b[1] - a[1]);
	const rows = sorted.filter(
		([key, share]) => share >= 0.01 || key === winner,
	);
	const hidden = sorted.length - rows.length;
	return (
		<ul className="grid gap-1">
			{hidden > 0 ? (
				<li className="order-last text-[0.65rem] text-ink-soft">
					{hidden} more under 1%
				</li>
			) : null}
			{rows.map(([key, share]) => (
				<li
					key={key}
					className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2 text-[0.75rem]"
				>
					<div className="min-w-0">
						<div className="flex items-baseline gap-2">
							<span
								className={`truncate font-mono text-[0.68rem] ${key === winner ? "text-ink" : "text-ink-muted"}`}
							>
								{key}
							</span>
							{describe ? (
								<span className="truncate text-ink-soft">
									{describe(key)}
								</span>
							) : null}
						</div>
						<div className="mt-0.5 h-1 rounded-full bg-line">
							<div
								className={`h-1 rounded-full ${key === winner ? "bg-link" : "bg-ink-soft/50"}`}
								style={{
									width: `${Math.max(1, Math.round(share * 100))}%`,
								}}
							/>
						</div>
					</div>
					<span className="text-end font-mono text-[0.65rem] text-ink-soft">
						{(share * 100).toFixed(0)}%
					</span>
				</li>
			))}
		</ul>
	);
}

function Legend({
	design,
	at,
}: {
	readonly design: string;
	readonly at: string;
}) {
	const items: readonly { tone: ReaderSegmentTone; meaning: string }[] = [
		{
			tone: "known",
			meaning: "Selected or Derived identity, route decided",
		},
		{
			tone: "shadow",
			meaning: "Open: an open-class head, generation continues",
		},
		{
			tone: "unknown",
			meaning:
				"Unresolved: the route mass or identity mass did not decide",
		},
		{
			tone: "failed",
			meaning: "Miss: a closed-class route with no authored candidate",
		},
	];
	return (
		<div className="grid gap-2 text-[0.8rem]">
			<ul className="flex flex-wrap gap-x-6 gap-y-1">
				{items.map((item) => (
					<li key={item.tone} className="flex items-baseline gap-2">
						<ReaderSegment
							tone={item.tone}
							interaction="idle"
							tabIndex={-1}
							className="cursor-default"
						>
							Wort
						</ReaderSegment>
						<span className="text-ink-muted">{item.meaning}</span>
					</li>
				))}
			</ul>
			<p className="text-ink-soft">
				A dotted outline marks a piece of a fused word. Produced {at} by{" "}
				<Mono>{design}</Mono>; re-emit with{" "}
				<Mono>bun prototypes/intake/fixtures.ts</Mono> in dumgen.
			</p>
		</div>
	);
}

function Label({ children }: { readonly children: ReactNode }) {
	return (
		<h3 className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.12em] text-ink-soft">
			{children}
		</h3>
	);
}

function Mono({ children }: { readonly children: ReactNode }) {
	return <code className="font-mono text-[0.9em] text-ink">{children}</code>;
}
