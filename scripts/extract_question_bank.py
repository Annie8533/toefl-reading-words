"""Extract the supplied TOEFL Word document into Firestore-ready JSON."""

from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
ENTRY_RE = re.compile(r"^(\d+)\.\s+(.+?)\s+詞性：\s*(.+)$")
MAJOR_RE = re.compile(r"^[一二三四五六七八九十]+、(.+?類)（\d+詞）$")
SUB_RE = re.compile(r"^（[一二三四五六七八九十]+）(.+?)（\d+詞）$")


def read_paragraphs(docx_path: Path) -> list[str]:
    with zipfile.ZipFile(docx_path) as archive:
        xml = archive.read("word/document.xml")
    root = ET.fromstring(xml)
    paragraphs: list[str] = []
    for paragraph in root.iter(f"{W_NS}p"):
        text = "".join(node.text or "" for node in paragraph.iter(f"{W_NS}t")).strip()
        if text:
            paragraphs.append(text)
    return paragraphs


def split_sentence(word: str, sentence: str) -> tuple[str, str, str]:
    match = re.search(re.escape(word), sentence, re.IGNORECASE)
    if not match:
        raise ValueError(f"Target word not found in sentence: {word} :: {sentence}")
    displayed = sentence[match.start():match.end()]
    revealed_length = max(1, min(len(displayed) - 1, (len(displayed) + 2) // 3))
    return sentence[:match.start()], displayed[:revealed_length], sentence[match.start() + revealed_length:]


def extract_questions(paragraphs: list[str]) -> list[dict[str, object]]:
    questions: list[dict[str, object]] = []
    major_category = ""
    sub_category = ""
    current: dict[str, str] | None = None

    def commit() -> None:
        nonlocal current
        if not current:
            return
        required = ("number", "word", "sentence")
        missing = [field for field in required if not current.get(field)]
        if missing:
            raise ValueError(f"Incomplete entry {current.get('number', '?')}: missing {', '.join(missing)}")
        before, prefix, after = split_sentence(current["word"], current["sentence"])
        order = len(questions) + 1
        identifier = f"q{order:03d}"
        questions.append(
            {
                "id": identifier,
                "order": order,
                "category": "／".join(part for part in (major_category, sub_category) if part),
                "word": current["word"],
                "prefix": prefix,
                "missing": after[:0] + current["sentence"][len(before) + len(prefix):len(before) + len(prefix) + (len(current["word"]) - len(prefix))],
                "before": before,
                "after": after,
                "sentence": current["sentence"],
                "hint": current.get("meaning") or current.get("translation") or "請依例句完成單字。",
                "translation": current.get("translation", ""),
                "memory": current.get("memory", ""),
                "active": True,
            }
        )
        current = None

    for raw in paragraphs:
        paragraph = raw.strip()
        major = MAJOR_RE.match(paragraph)
        if major:
            major_category = major.group(1)
            sub_category = ""
            continue
        sub = SUB_RE.match(paragraph)
        if sub:
            sub_category = sub.group(1)
            continue
        entry = ENTRY_RE.match(paragraph)
        if entry:
            commit()
            current = {"number": entry.group(1), "word": entry.group(2).strip(), "partOfSpeech": entry.group(3).strip()}
            continue
        if not current:
            continue
        normalized = re.sub(r"^[•·\-\s]+", "", paragraph).strip()
        if "釋義：" in normalized:
            current["meaning"] = normalized.split("釋義：", 1)[1].strip()
        elif "記憶法：" in normalized:
            current["memory"] = normalized.split("記憶法：", 1)[1].strip()
        elif "例句：" in normalized:
            current["sentence"] = normalized.split("例句：", 1)[1].strip()
        elif "譯文：" in normalized:
            current["translation"] = normalized.split("譯文：", 1)[1].strip()
    commit()
    return questions


def main() -> None:
    if len(sys.argv) == 3 and sys.argv[1] == "--debug":
        for index, paragraph in enumerate(read_paragraphs(Path(sys.argv[2]))[:80], start=1):
            print(f"{index:03}: {paragraph}")
        return
    if len(sys.argv) != 3:
        raise SystemExit("Usage: extract_question_bank.py INPUT.docx OUTPUT.json")
    source = Path(sys.argv[1])
    destination = Path(sys.argv[2])
    questions = extract_questions(read_paragraphs(source))
    if len(questions) != 521:
        raise ValueError(f"Expected 521 questions but extracted {len(questions)}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(questions, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Extracted {len(questions)} questions to {destination}")


if __name__ == "__main__":
    main()
