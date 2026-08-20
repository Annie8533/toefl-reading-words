"""Validate every generated cloze question before Firestore import."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def audit(question: dict[str, str]) -> list[str]:
    errors: list[str] = []
    word = question["word"]
    prefix = question["prefix"]
    missing = question["missing"]
    before = question["before"]
    after = question["after"]
    sentence = question["sentence"]
    reconstructed = before + prefix + missing + after

    if (prefix + missing).lower() != word.lower():
        errors.append("prefix + missing does not equal word")
    if not missing:
        errors.append("missing segment is empty")
    if reconstructed.lower() != sentence.lower():
        errors.append("before + word + after does not reconstruct sentence")
    if after.lower().startswith(missing.lower()):
        errors.append("word suffix leaked into after")
    if len(prefix) < 1 or len(prefix) >= len(word):
        errors.append("prefix length is invalid")
    return errors


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: audit_question_masks.py QUESTION_BANK.json")
    questions = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    failures = [(question["id"], audit(question)) for question in questions]
    failures = [(identifier, errors) for identifier, errors in failures if errors]
    if failures:
        for identifier, errors in failures[:20]:
            print(f"{identifier}: {'; '.join(errors)}")
        raise SystemExit(f"Mask audit failed for {len(failures)} of {len(questions)} questions.")
    examples = {question["word"].lower(): question for question in questions}
    print(f"Mask audit passed: {len(questions)} questions.")
    for word in ("consumer", "cell"):
        if word in examples:
            item = examples[word]
            print(f"{word}: {item['before']}{item['prefix']}{'_' * len(item['missing'])}{item['after']}")


if __name__ == "__main__":
    main()
