import { cn, DensityScope, NoteSection } from "lego";
import { langAttrs } from "@/fixtures";
import { toneClass } from "./alignment";
import {
	AttestationBody,
	type CardProps,
	LemmaCard,
	SurfaceBody,
} from "./cards";
import type { CardKind } from "./cases";
import { SentenceGloss } from "./clause";
import { labelsOf, litBy, notesOf } from "./focus";
import { AbbreviationKey } from "./gloss-text";
import { abbreviations, type Step } from "./model";

/**
 * A Card as a Sheet's Cover, with the room a Card lacks: the same gloss,
 * larger; on the Attestation, the whole sentence with what `es` and
 * `damit` stand for; every token's note; and the glosses' abbreviations,
 * as a glossed paper lists them.
 */
export function CoverPage({
	kind,
	...props
}: CardProps & { readonly kind: CardKind }) {
	const { glossCase } = props;
	if (kind === "lemma") return <LemmaCard glossCase={glossCase} />;
	const step =
		kind === "attestation"
			? glossCase.attestation.syntax
			: glossCase.surface.inflection;
	const lit = step ? litBy(step, props.focus) : null;
	return (
		<DensityScope density="comfortable" className="grid gap-4 text-sm">
			{kind === "attestation" ? (
				<AttestationBody {...props} size="sheet" />
			) : (
				<SurfaceBody {...props} size="sheet" />
			)}
			{kind === "attestation" ? (
				<NoteSection label="Sentence">
					<SentenceGloss
						glossCase={glossCase}
						lit={lit?.columns ?? new Set()}
						referents={lit?.referents ?? new Set()}
						onFocus={step ? props.onFocus : undefined}
					/>
				</NoteSection>
			) : null}
			{step ? <StepNotes step={step} {...props} /> : null}
		</DensityScope>
	);
}

/** Every token's note, the focused one lit, then the abbreviations. */
function StepNotes({
	step,
	glossCase,
	knobs,
	focus,
	onFocus,
}: CardProps & { readonly step: Step }) {
	const labels = labelsOf(step);
	return (
		<>
			<NoteSection label="Word by word">
				<ul className="grid gap-1">
					{notesOf(step).map((each) => {
						const on = each.key === focus;
						return (
							<li key={each.key}>
								<button
									type="button"
									aria-pressed={on}
									onClick={() => onFocus(each.key)}
									className={cn(
										"-mx-2 w-[calc(100%+1rem)] cursor-pointer rounded-md px-2 py-1.5 text-start leading-relaxed transition-colors",
										on
											? "bg-link/10 text-ink"
											: "text-ink-soft hover:bg-canvas",
									)}
								>
									<span {...langAttrs("en")}>
										<b
											{...langAttrs("de")}
											className={cn(
												"font-semibold",
												on ? "text-link" : "text-ink",
												toneClass(glossCase.lemma.tone),
											)}
										>
											{each.word}
										</b>{" "}
										{each.note}
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			</NoteSection>
			{knobs.style === "leipzig" && labels.length > 0 ? (
				<NoteSection label="Abbreviations">
					<AbbreviationKey
						labels={labels}
						meanings={abbreviations}
						className="text-xs leading-relaxed"
					/>
				</NoteSection>
			) : null}
		</>
	);
}
