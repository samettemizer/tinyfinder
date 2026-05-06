from __future__ import annotations

from pathlib import Path

from . import config


def parse_ini_file(path: Path) -> dict[str, str]:
    messages: dict[str, str] = {}
    if not path.exists():
        return messages
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith(";") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] == '"':
            value = value[1:-1]
        messages[key] = value
    return messages


class MessageBag:
    def __init__(self, lang: str = config.TF_LANG) -> None:
        self.lang = lang
        lang_dir = config.MESSAGES_DIR / lang
        fallback_dir = config.MESSAGES_DIR / "en"
        self.front = parse_ini_file(fallback_dir / "front.ini")
        self.front.update(parse_ini_file(lang_dir / "front.ini"))
        self.back = parse_ini_file(fallback_dir / "back.ini")
        self.back.update(parse_ini_file(lang_dir / "back.ini"))

    def str(self, key: str) -> str:
        return self.back.get(key, key)


messages = MessageBag()
