import {
	DensityScope,
	LinkButton,
	NoteSection,
	NoteTitle,
	NoteTitleRow,
} from "lego";
import { Fragment, type ReactNode } from "react";
import { langAttrs } from "@/fixtures";
import {
	DemoInspector,
	InspectorChoice,
	InspectorSection,
	InspectorTry,
	useDemoParam,
} from "@/shell";
import {
	cases,
	type HeadingOption,
	type HeadingToken,
	headingOf,
	headingOptions,
	type SurfaceCase,
} from "./cases";

/**
 * Surface heading: a Surface Note opened with no Reading in context, as
 * from a Lemma's written forms, so no frame says which slots its line
 * has (#1293). The Sheet shows the Note as tf-demo draws it; the
 * inspector switches its heading between the stored form, the stored
 * form with its gaps marked, and the slotted line of its most common
 * Reading. The case and the option live in the URL.
 */
export default function SurfaceHeadingDemo() {
	const [caseParam, setCaseParam] = useDemoParam("case");
	const [headingParam, setHeadingParam] = useDemoParam("heading");
	const surface =
		cases.find((candidate) => candidate.id === caseParam) ?? cases[0];
	const option: HeadingOption =
		headingOptions.find(({ value }) => value === headingParam)?.value ??
		"stored";
	if (!surface) return null;

	return (
		<div className="flex h-full flex-col overflow-y-auto bg-canvas text-ink">
			<SurfaceInspector
				surface={surface}
				option={option}
				onCase={(id) => setCaseParam(id === cases[0]?.id ? null : id)}
				onOption={(value) =>
					setHeadingParam(value === "stored" ? null : value)
				}
			/>
			<div className="mx-auto w-full max-w-[40rem] p-4 @min-[640px]/frame:p-8">
				<SurfaceSheet surface={surface} option={option} />
			</div>
		</div>
	);
}

/** The Surface Note as a Sheet: its heading, then the Lemmas it is a form of. */
function SurfaceSheet({
	surface,
	option,
}: {
	readonly surface: SurfaceCase;
	readonly option: HeadingOption;
}) {
	const tone = surface.analyses[0]?.tone;
	return (
		<DensityScope
			density="comfortable"
			className="grid gap-2 rounded-xl border border-line bg-paper p-5 text-ink shadow-[0_8px_24px_-12px_oklch(0%_0_0/0.5)]"
		>
			<header className="min-w-0">
				<NoteTitleRow className="flex-nowrap justify-start gap-x-1.5">
					<NoteTitle tone={tone} {...langAttrs("de")}>
						<Heading tokens={headingOf(surface, option)} />
					</NoteTitle>
					{surface.caption ? (
						<span className="min-w-0 flex-[1_1_0] truncate text-sm text-ink-muted">
							<span
								aria-hidden="true"
								className="me-1.5 text-ink-faint"
							>
								·
							</span>
							{surface.caption}
						</span>
					) : null}
				</NoteTitleRow>
			</header>
			<NoteSection label="Analyses">
				<ul className="grid gap-2">
					{surface.analyses.map((analysis) => (
						<li key={analysis.canonicalForm}>
							<LinkButton
								{...langAttrs("de")}
								tone={analysis.tone ?? "link"}
							>
								<span aria-hidden="true" className="me-1.5">
									→
								</span>
								{analysis.canonicalForm}
							</LinkButton>
							<span className="ms-2 text-sm text-ink-muted">
								{analysis.aside}
							</span>
						</li>
					))}
				</ul>
			</NoteSection>
		</DensityScope>
	);
}

/** The heading's tokens in tf-demo's valency styles. */
function Heading({ tokens }: { readonly tokens: readonly HeadingToken[] }) {
	return tokens.map((token, index) => (
		<Fragment key={`${index}:${token.kind}`}>
			{index > 0 ? " " : null}
			{tokenView(token)}
		</Fragment>
	));
}

function tokenView(token: HeadingToken): ReactNode {
	switch (token.kind) {
		case "gap":
			return <span className="font-normal text-ink-faint">…</span>;
		case "prep":
			return <span className="italic">{token.text}</span>;
		case "word":
			return token.prefix ? (
				<>
					{token.prefix}
					<span className="text-ink-muted">|</span>
					{token.text.slice(token.prefix.length)}
				</>
			) : (
				token.text
			);
		case "slot": {
			const slot =
				token.text === "sich" ? (
					token.text
				) : (
					<span className="font-mono text-[0.9em] text-ink-soft">
						{token.text}
					</span>
				);
			const run = token.preposition ? (
				<>
					<span className="italic">{token.preposition}</span> {slot}
				</>
			) : (
				slot
			);
			return token.optional ? (
				<>
					<span className="text-ink-muted">(</span>
					{run}
					<span className="text-ink-muted">)</span>
				</>
			) : (
				run
			);
		}
	}
}

function SurfaceInspector({
	surface,
	option,
	onCase,
	onOption,
}: {
	readonly surface: SurfaceCase;
	readonly option: HeadingOption;
	readonly onCase: (id: string) => void;
	readonly onOption: (option: HeadingOption) => void;
}) {
	const readings = surface.analyses.flatMap(({ readings }) => readings);
	return (
		<DemoInspector>
			<InspectorSection>
				<InspectorTry>
					<p>
						A Surface is stored in base order (
						<i>mit zu tun hatte</i>), and a Reading's frame turns it
						into its slotted line (<i>jD mit jM zu tun hatte</i>).
						Opened from a Lemma's written forms, the Surface Note
						has no Reading in context, so nothing says which slots
						it has. How should it head itself?
					</p>
				</InspectorTry>
			</InspectorSection>
			<InspectorSection title="Heading">
				<InspectorChoice
					label="With no Reading in context"
					options={headingOptions.map(({ value, label, hint }) => ({
						value,
						label,
						hint,
					}))}
					value={option}
					onChange={onOption}
				/>
			</InspectorSection>
			<InspectorSection title="Case">
				<InspectorChoice
					label="Surface"
					options={cases.map((each) => ({
						value: each.id,
						label: each.stored,
						hint: each.hint,
					}))}
					value={surface.id}
					onChange={onCase}
				/>
				<InspectorTry>
					<p>
						Its Readings:{" "}
						{readings
							.map(
								({ emoji, gloss, attestations }) =>
									`${emoji} ${gloss} (${attestations})`,
							)
							.join(", ")}
						.
					</p>
				</InspectorTry>
			</InspectorSection>
			<InspectorSection title="Try">
				<InspectorTry>
					<p>
						Step through the three headings on{" "}
						<i>mit zu tun hatte</i>: does the bare form read as a
						word you met, and do the gaps say enough?
					</p>
					<p>
						On <i>erinnert</i> the two Readings disagree: the common
						line shows <i>sich</i>, which <i>jemanden erinnern</i>{" "}
						does not have. Is a guess worse than a gap?
					</p>
					<p>
						<i>Kindern</i> has no frame: every heading is the same.
					</p>
				</InspectorTry>
			</InspectorSection>
		</DemoInspector>
	);
}
