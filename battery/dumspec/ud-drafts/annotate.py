# /// script
# requires-python = "==3.12.*"
# dependencies = ["stanza==1.14.0", "torch==2.14.0"]
# ///
"""Parse paragraphs.json with Stanza's German pipeline into paragraphs.conllu.

Each sentence of paragraphs.json is parsed as given: Stanza tokenizes but
never splits sentences. The output is committed, so drafting records needs no
Python. Rerun only to change the parser:

    uv run battery/dumspec/ud-drafts/annotate.py
"""

import json
from pathlib import Path

import stanza
import torch

here = Path(__file__).parent
PROCESSORS = "tokenize,mwt,pos,lemma,depparse"


def field(value):
    return "_" if value in (None, "") else str(value)


def main():
    paragraphs = json.loads((here / "paragraphs.json").read_text("utf-8"))[
        "paragraphs"
    ]
    nlp = stanza.Pipeline(
        "de", processors=PROCESSORS, tokenize_no_ssplit=True, logging_level="WARN"
    )
    packages = ", ".join(
        f"{name} {processor.config.get('model_path', '').split('/')[-1].removesuffix('.pt')}"
        for name, processor in nlp.processors.items()
    )
    lines = [
        f"# parser = Stanza {stanza.__version__} (torch {torch.__version__}), German, processors {packages}",
    ]
    for paragraph in paragraphs:
        sentences = paragraph["sentences"]
        doc = nlp("\n\n".join(sentences))
        if len(doc.sentences) != len(sentences):
            raise SystemExit(f"{paragraph['id']}: Stanza split the sentences differently")
        lines.append(f"# newpar id = {paragraph['id']}")
        for number, (text, parsed) in enumerate(zip(sentences, doc.sentences), 1):
            lines.append(f"# sent_id = {paragraph['id']}-{number}")
            lines.append(f"# text = {text}")
            offset = parsed.tokens[0].start_char
            for position, token in enumerate(parsed.tokens):
                following = (
                    parsed.tokens[position + 1].start_char
                    if position + 1 < len(parsed.tokens)
                    else None
                )
                misc = "SpaceAfter=No" if following == token.end_char else "_"
                if text[token.start_char - offset : token.end_char - offset] != token.text:
                    raise SystemExit(f"{paragraph['id']}-{number}: token offsets drift at {token.text}")
                if len(token.words) > 1:
                    ids = f"{token.words[0].id}-{token.words[-1].id}"
                    lines.append("\t".join([ids, token.text, *["_"] * 7, misc]))
                for word in token.words:
                    lines.append(
                        "\t".join(
                            [
                                str(word.id),
                                word.text,
                                field(word.lemma),
                                field(word.upos),
                                field(word.xpos),
                                field(word.feats),
                                str(word.head),
                                field(word.deprel),
                                "_",
                                misc if len(token.words) == 1 else "_",
                            ]
                        )
                    )
            lines.append("")
    (here / "paragraphs.conllu").write_text("\n".join(lines), "utf-8")


if __name__ == "__main__":
    main()
