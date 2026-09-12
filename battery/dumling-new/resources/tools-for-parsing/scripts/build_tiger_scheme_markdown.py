#!/usr/bin/env python3
"""Merge and validate the page-wise TIGER annotation-scheme transcription."""

from __future__ import annotations

import re
from pathlib import Path


REPO = Path(__file__).resolve().parents[5]
RESOURCES = REPO / "battery/dumling/resources"
FRAGMENTS = RESOURCES / "tools-for-parsing/temp"
TARGET = RESOURCES / "TIGER/tiger_scheme-syntax.md"
PARTS = (
    FRAGMENTS / "tiger-pages-001-047.md",
    FRAGMENTS / "tiger-pages-048-084.md",
    FRAGMENTS / "tiger-pages-085-119.md",
    FRAGMENTS / "tiger-pages-120-148.md",
)
TRANSCRIPTION_NOTE = (
    "> **Transcription note.** Syntax diagrams are encoded as one-line Penn "
    "Treebank-style brackets extended with TIGER edge labels. A nonterminal is "
    "`(CATEGORY (EDGE:CATEGORY ...))`; a terminal is `(EDGE:POS token)`. `--` "
    "records an unlabeled punctuation edge, `@surfaceIndex` preserves surface "
    "order in discontinuous trees, `#id` plus `(EDGE:@id)` represents a "
    "secondary edge, and `?:?` records labels left blank in the source."
)


def bracket_depth(tree: str) -> int:
    """Count structural parentheses while ignoring backslash-escaped PoS text."""
    depth = 0
    escaped = False
    for character in tree:
        if escaped:
            escaped = False
        elif character == "\\":
            escaped = True
        elif character == "(":
            depth += 1
        elif character == ")":
            depth -= 1
            if depth < 0:
                return depth
    return depth


def validate(markdown: str) -> None:
    pages = [
        int(page)
        for page in re.findall(r"^<!-- PDF page (\d+) -->$", markdown, re.MULTILINE)
    ]
    if pages != list(range(1, 149)):
        raise ValueError("PDF page markers must occur exactly once in the range 1-148")
    if "\ufffd" in markdown:
        raise ValueError("Unicode replacement character found")
    if re.search(r"Unsicherheit|uncertain|TODO|TBD|PLACEHOLDER", markdown, re.I):
        raise ValueError("Unresolved transcription marker found")

    blocks: list[list[str]] = []
    block: list[str] = []
    in_text_block = False
    for line in markdown.splitlines():
        if line == "```text":
            if in_text_block:
                raise ValueError("Nested text fence")
            block = []
            in_text_block = True
        elif line == "```" and in_text_block:
            blocks.append(block)
            in_text_block = False
        elif in_text_block:
            block.append(line)
    if in_text_block:
        raise ValueError("Unclosed text fence")

    trees = [
        block[0]
        for block in blocks
        if len(block) == 1 and block and block[0].startswith("(")
    ]
    if len(trees) != 301:
        raise ValueError(f"Expected 301 bracketed diagrams, found {len(trees)}")
    unbalanced = [tree for tree in trees if bracket_depth(tree) != 0]
    if unbalanced:
        raise ValueError(f"Unbalanced bracket tree: {unbalanced[0]}")

    node_ids = set(re.findall(r"#([A-Za-z][A-Za-z0-9_-]*)", markdown))
    references = set(re.findall(r":@([A-Za-z][A-Za-z0-9_-]*)\)", markdown))
    if references - node_ids:
        raise ValueError(f"Secondary edges without targets: {references - node_ids}")


def main() -> None:
    missing = [str(path) for path in PARTS if not path.is_file()]
    if missing:
        raise FileNotFoundError(f"Missing transcription fragments: {missing}")

    parts = [path.read_text(encoding="utf-8").rstrip() for path in PARTS]
    parts[0] = parts[0].replace(
        "# TIGER Annotationsschema\n",
        f"# TIGER Annotationsschema\n\n{TRANSCRIPTION_NOTE}\n",
        1,
    )
    markdown = "\n".join(parts) + "\n"
    validate(markdown)
    TARGET.write_text(markdown, encoding="utf-8")


if __name__ == "__main__":
    main()
