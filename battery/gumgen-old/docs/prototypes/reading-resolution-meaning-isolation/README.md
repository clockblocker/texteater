# German Reading meaning-isolation reproducer

This diagnostic suite exercises the production German Reading Resolution prompt
on five observed first-encounter misses whose marked target is surrounded by
salient content. It covers the Lexeme `DET` and `PRON` kinds plus the Morpheme
`Suffix` kind.

The exact emoji in a `New` Golden Case is illustrative. The evaluator follows
the Emoji Description authoring policy: it requires `New`, requires a novel
description, and fails only when the description contains an emoji belonging to
an unmarked neighbor's meaning. This makes the original `Die Häuser sind groß.`
house-emoji leak a direct scored miss without rejecting a different defensible
determiner emoji.

From `battery/dumgen`, validate the bound suite without a provider call:

```sh
bun run prototype:reading-resolution-meaning-isolation preflight development 1
```

Run and retain one bounded diagnostic round:

```sh
bun run prototype:reading-resolution-meaning-isolation run development 1
```

Results are written below `runs/<timestamp>/results.json`. This is diagnostic
evidence for prompt iteration, not an acceptance gate.
