import { cn } from "lego";
import { Fragment } from "react";
import { langAttrs } from "@/fixtures";
import { glossParts } from "./focus";

/**
 * One gloss, as the Leipzig Glossing Rules set it: grammatical labels in
 * small capitals (rule 3), each an `<abbr>` that names its category on
 * hover, as Wikipedia's interlinear template does. A long gloss may break
 * after a hyphen, a period or a slash, so a narrow column wraps instead of
 * scrolling.
 */
export function GlossText({
	gloss,
	className,
}: {
	readonly gloss: string;
	readonly className?: string;
}) {
	return (
		<span {...langAttrs("en")} className={className}>
			{glossParts(gloss).map((part, index) => (
				<Fragment key={`${index}:${part.text}`}>
					{part.label ? (
						<abbr
							title={part.label}
							className="cursor-help decoration-current/40 decoration-dotted underline-offset-2 [font-variant-caps:all-small-caps] tracking-[0.02em]"
						>
							{part.text}
						</abbr>
					) : (
						part.text
					)}
					{/[-./]$/u.test(part.text) ? <wbr /> : null}
				</Fragment>
			))}
		</span>
	);
}

/**
 * The list of abbreviations a glossed example ends with, once per label:
 * `PST past · IND indicative`.
 */
export function AbbreviationKey({
	labels,
	meanings,
	className,
}: {
	readonly labels: readonly string[];
	readonly meanings: Readonly<Record<string, string>>;
	readonly className?: string;
}) {
	if (labels.length === 0) return null;
	return (
		<p {...langAttrs("en")} className={cn("text-ink-muted", className)}>
			{labels.map((label, index) => (
				<Fragment key={label}>
					{index > 0 ? (
						<span aria-hidden="true" className="text-ink-faint">
							{" · "}
						</span>
					) : null}
					<span className="whitespace-nowrap">
						<span className="text-ink-soft [font-variant-caps:all-small-caps] tracking-[0.02em]">
							{label}
						</span>{" "}
						{meanings[label]}
					</span>
				</Fragment>
			))}
		</p>
	);
}
