from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from typing import Iterator

from . import config

TABLE_NAME = f"{config.TF_TBL_PREFIX}tinyfinder"


@contextmanager
def connection() -> Iterator[sqlite3.Connection]:
    config.SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(config.SQLITE_PATH)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()


def init_db() -> None:
    with connection() as con:
        con.execute(
            f"""
            CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
                id INTEGER PRIMARY KEY,
                type VARCHAR NOT NULL DEFAULT 'img',
                basename VARCHAR NOT NULL,
                name VARCHAR NOT NULL,
                isprivate VARCHAR DEFAULT 'No',
                hasthumb VARCHAR DEFAULT 'No',
                size VARCHAR DEFAULT NULL,
                width VARCHAR DEFAULT NULL,
                height VARCHAR DEFAULT NULL,
                uploader VARCHAR DEFAULT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        con.execute(f"CREATE INDEX IF NOT EXISTS idx_{TABLE_NAME}_type_name ON {TABLE_NAME}(type, name)")
        con.execute(f"CREATE INDEX IF NOT EXISTS idx_{TABLE_NAME}_basename ON {TABLE_NAME}(basename)")


def fetch_items(file_type: str, title: str, active_user: str) -> list[sqlite3.Row]:
    title = f"%{title[:120]}%"
    with connection() as con:
        return list(
            con.execute(
                f"""
                SELECT id, name, basename, type, size, width, height, uploader, timestamp, hasthumb, isprivate
                FROM {TABLE_NAME}
                WHERE type = ? AND name LIKE ? AND (uploader = ? OR isprivate = 'No')
                ORDER BY id DESC
                LIMIT 50
                """,
                (file_type, title, active_user),
            )
        )


def fetch_by_id(file_id: int, keys: list[str]) -> sqlite3.Row | None:
    safe_keys = ", ".join(keys)
    with connection() as con:
        return con.execute(f"SELECT {safe_keys} FROM {TABLE_NAME} WHERE id = ? LIMIT 1", (file_id,)).fetchone()


def fetch_by_basename(basename: str, keys: list[str]) -> sqlite3.Row | None:
    safe_keys = ", ".join(keys)
    with connection() as con:
        return con.execute(f"SELECT {safe_keys} FROM {TABLE_NAME} WHERE basename = ? LIMIT 1", (basename,)).fetchone()


def insert_file(data: dict[str, object]) -> int:
    keys = list(data.keys())
    placeholders = ", ".join("?" for _ in keys)
    columns = ", ".join(keys)
    values = [data[key] for key in keys]
    with connection() as con:
        cur = con.execute(f"INSERT INTO {TABLE_NAME} ({columns}) VALUES ({placeholders})", values)
        return int(cur.lastrowid)


def update_file_details(file_id: int, width: int, height: int, size: int) -> None:
    with connection() as con:
        con.execute(f"UPDATE {TABLE_NAME} SET width = ?, height = ?, size = ? WHERE id = ?", (width, height, size, file_id))


def update_file_name(file_id: int, name: str) -> None:
    with connection() as con:
        con.execute(f"UPDATE {TABLE_NAME} SET name = ? WHERE id = ?", (name, file_id))


def delete_by_id(file_id: int) -> None:
    with connection() as con:
        con.execute(f"DELETE FROM {TABLE_NAME} WHERE id = ?", (file_id,))


def delete_file_row(file_type: str, basename: str) -> None:
    with connection() as con:
        con.execute(f"DELETE FROM {TABLE_NAME} WHERE type = ? AND basename = ?", (file_type, basename))
