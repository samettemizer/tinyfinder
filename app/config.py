from __future__ import annotations

import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

TF_LANG = os.getenv("TF_LANG", "en")
TF_THEME = os.getenv("TF_THEME", "default")

# ALLOWED IMAGES : [jpg,jpeg,gif,png]
TF_ALLOWED_FILES = tuple(
    ext.strip().lower()
    for ext in os.getenv(
        "TF_ALLOWED_FILES",
        "gz,zip,rar,mp3,mp4,txt,pdf,doc,docx,xls,xlsx,ppt,pps,pptx,psd",
    ).split(",")
    if ext.strip()
)

# 128mb
TF_MAX_FILE_SIZE = int(os.getenv("TF_MAX_FILE_SIZE", str(128 * 1024 * 1024)))
# 8mb
TF_MAX_IMG_SIZE = int(os.getenv("TF_MAX_IMG_SIZE", str(8 * 1024 * 1024)))

TF_SETTING_THUMBS = {
    1: {"width": 480, "height": 270},
    2: {"width": 320, "height": 180},
    3: {"width": 160, "height": 90},
}

# 1: stretch
# 2: keep aspect ratio
# 3: center crop
# 4: keep ratio and fill blanks
TF_IMG_THUMBNAIL_TYPE = int(os.getenv("TF_IMG_THUMBNAIL_TYPE", "3"))

TF_TBL_PREFIX = os.getenv("TF_TBL_PREFIX", "tb_")

SQLITE_PATH = ROOT_DIR / "sqlite" / "tinyfinder.sqlite"
UPLOADS_DIR = ROOT_DIR / "uploads"
ASSETS_DIR = ROOT_DIR / "assets"
MESSAGES_DIR = ROOT_DIR / "lang"