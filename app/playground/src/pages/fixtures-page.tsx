import { useState } from "react";
import {
	CardSkeleton,
	CardStack,
	type FakeCardLink,
	germanText,
	hebrewText,
	rectWithin,
	useFakeResolution,
	type WordClick,
	WordText,
	wordsOf,
} from "@/fixtures";
import { useDemoParam, useFrameSize, usePlaygroundEnv } from "@/shell";

const allWords = [...wordsOf(germanText), ...wordsOf(hebrewText)];

/**
 * Every shared fixture at work, as a reference for demo authors: click a
 * word to deal its Cards, which arrive one by one; a tail brings its Card
 * to the front; a lemma link looks the lemma up. The clicked word is the
 * `word` URL param.
 */
export function FixturesPage() {
	const env = usePlaygroundEnv();
	const size = useFrameSize();
	const [wordId, setWordId] = useDemoParam("word");
	const [lookup, setLookup] = useState<string | null>(null);
	const [front, setFront] = useState<number | null>(null);
	const [click, setClick] = useState<string>("");
	const word = allWords.find((candidate) => candidate.id === wordId) ?? null;
	const { cards, pending } = useFakeResolution(lookup ?? word);

	const onWordClick = ({ word: clicked, rect }: WordClick) => {
		setWordId(clicked.id, { push: true });
		setLookup(null);
		setFront(null);
		if (env.frame) {
			const within = rectWithin(rect, env.frame);
			setClick(`at ${Math.round(within.x)}, ${Math.round(within.y)}`);
		}
	};
	const onLinkClick = (link: FakeCardLink) => {
		setLookup(link.word);
		setFront(null);
	};

	return (
		<div className="h-full overflow-auto">
			<div className="mx-auto grid max-w-6xl gap-8 p-5 @min-[760px]/frame:grid-cols-[1fr_22rem] @min-[760px]/frame:p-8">
				<section className="grid content-start gap-6">
					<p className="font-mono text-xs text-ink-muted">
						frame {size.inlineSize}×{size.blockSize} · {env.dir} ·{" "}
						{env.theme}
						{env.reducedMotion ? " · reduced motion" : ""}
						{click ? ` · clicked ${click}` : ""}
					</p>
					<WordText
						text={germanText}
						selectedWordId={wordId}
						onWordClick={onWordClick}
					/>
					<WordText
						text={hebrewText}
						selectedWordId={wordId}
						onWordClick={onWordClick}
					/>
				</section>
				<aside className="grid content-start gap-3">
					{word || lookup ? (
						<>
							<CardStack
								cards={cards}
								frontIndex={front ?? cards.length - 1}
								onFront={setFront}
								onLinkClick={onLinkClick}
							/>
							{pending.map((kind) => (
								<CardSkeleton
									key={kind}
									kind={kind}
									collapsed
								/>
							))}
						</>
					) : (
						<p className="text-ink-muted">Click a word.</p>
					)}
				</aside>
			</div>
		</div>
	);
}
