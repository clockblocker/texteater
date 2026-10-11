import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import type { FixtureWord } from "@/fixtures";
import { usePlaygroundEnv } from "@/shell";
import type { CardWordClick } from "./clickable-words";
import { type Lookup, LookupDeck } from "./lookup-deck";
import {
	IconButton,
	ReaderStage,
	Surface,
	useAnchoredBox,
	useEscape,
} from "./stage";

/**
 * Plain replacement, as Foliate does it: a word clicked inside the lookup
 * replaces its content, and nothing remembers what was there. The demo's
 * annotations (not part of the pattern) count what was lost.
 */
export function PlainReplacement() {
	const { reducedMotion } = usePlaygroundEnv();
	const contentRef = useRef<HTMLDivElement>(null);
	const nextKey = useRef(0);
	const [anchorId, setAnchorId] = useState<string | null>(null);
	const [current, setCurrent] = useState<Lookup | null>(null);
	const [lost, setLost] = useState<readonly string[]>([]);
	const { box, containerWidth } = useAnchoredBox(contentRef, anchorId);

	const lookup = (word: FixtureWord | string): Lookup => {
		nextKey.current += 1;
		return {
			key: `r${nextKey.current}`,
			word,
			label: typeof word === "string" ? word : word.text,
		};
	};
	const openFromText = (word: FixtureWord) => {
		setAnchorId(word.id);
		setCurrent(lookup(word));
		setLost([]);
	};
	const replace = (click: CardWordClick) => {
		if (!current) return;
		setLost([...lost, current.label]);
		setCurrent(lookup(click.word));
	};
	const close = () => {
		setAnchorId(null);
		setCurrent(null);
		setLost([]);
	};
	useEscape(close);

	const first = lost[0];

	return (
		<>
			<p
				dir="auto"
				className="border-b border-line px-4 py-2 text-xs text-ink-muted rtl:text-end"
			>
				{first ? (
					<>
						<span className="font-semibold text-destructive">
							{lost.length}{" "}
							{lost.length === 1 ? "lookup" : "lookups"} lost:
						</span>{" "}
						{lost.map((label, index) => (
							<span key={`${label}-${index}`}>
								{index > 0 ? " → " : null}
								<s className="text-ink-soft">{label}</s>
							</span>
						))}
						. To see <b className="text-ink-soft">{first}</b> again,
						find it in the text and click it.
					</>
				) : current ? (
					"Click a word inside the Card."
				) : (
					"No lookup open"
				)}
			</p>
			<ReaderStage
				contentRef={contentRef}
				selectedWordId={current ? anchorId : null}
				onWord={openFromText}
				onDismiss={close}
			>
				<AnimatePresence>
					{current && box ? (
						<Surface
							key="surface"
							id="surface"
							label={`Lookup of ${current.label}`}
							box={box}
							containerWidth={containerWidth}
							zIndex={10}
							header={
								<>
									<span className="min-w-0 flex-1 truncate ps-2 text-sm text-ink">
										{current.label}
									</span>
									<IconButton label="Close" onClick={close}>
										<X className="size-4" />
									</IconButton>
								</>
							}
							footer={
								<AnimatePresence initial={false}>
									{lost.length > 0 ? (
										<motion.p
											dir="auto"
											key={current.key}
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											className="m-2 mt-0 rounded-lg border border-dashed border-destructive/60 px-2.5 py-1.5 text-xs text-destructive rtl:text-end"
										>
											„{lost.at(-1)}“ was replaced. There
											is no way back.
										</motion.p>
									) : null}
								</AnimatePresence>
							}
						>
							<AnimatePresence mode="wait" initial={false}>
								<motion.div
									key={current.key}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={
										reducedMotion
											? { opacity: 0 }
											: {
													opacity: 0,
													scale: 0.94,
													filter: "blur(3px)",
												}
									}
									transition={{
										duration: 0.18,
										ease: "easeIn",
									}}
								>
									<LookupDeck
										lookup={current}
										onWord={replace}
									/>
								</motion.div>
							</AnimatePresence>
						</Surface>
					) : null}
				</AnimatePresence>
			</ReaderStage>
		</>
	);
}
