from __future__ import annotations

import html
import json
import random
import re
import shutil
import string
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
from fastapi import UploadFile
from PIL import Image, ImageOps

from . import config, db
from .messages import messages

IMG_EXTS = {"jpg", "jpeg", "png", "gif"}
IMG_FORMAT_BY_EXT = {"jpg": "JPEG", "jpeg": "JPEG", "png": "PNG", "gif": "GIF"}


def enum_bool(value: Any) -> str:
    return "Yes" if boolish(value) else "No"


def boolish(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).lower() in {"1", "true", "yes", "on"}


def clean_filename(filename: str) -> str:
    filename = Path(filename).name.strip().replace("\\", "-").replace("/", "-")
    filename = re.sub(r"[\x00-\x1f\x7f]+", "", filename)
    filename = filename.replace("*", "-")
    return filename or "file"


def random_chars(length: int = 8) -> str:
    return "".join(random.choice(string.ascii_lowercase) for _ in range(length))


def ext_from_name(filename: str) -> str:
    suffix = Path(filename).suffix.lower().lstrip(".")
    if suffix == "jpeg":
        suffix = "jpg"
    return suffix


def random_basename(folder: Path, ext: str) -> str:
    folder.mkdir(parents=True, exist_ok=True)
    ext = ext.lstrip(".")
    while True:
        name = f"{random_chars(8)}.{ext}"
        if not (folder / name).exists():
            return name


def upload_dir(file_type: str) -> Path:
    return config.UPLOADS_DIR / file_type


def round_file_size(basename: str = "", file_type: str = "img", bytes_value: int = 0) -> str:
    if not bytes_value and basename:
        target = upload_dir(file_type) / basename
        bytes_value = target.stat().st_size if target.exists() else 0
    size = bytes_value / 1024 / 1024
    if size >= 1:
        return f"{round(size, 1)} MB"
    size *= 1024
    if size >= 1:
        return f"{round(size)} KB"
    return f"{round(bytes_value)} bytes"


def parse_upload_options(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        return json.loads(html.unescape(raw))
    except Exception:
        return {}


def active_user_from_request() -> str:
    # varsayılan uygulama için üyelik sist yok
    return "Guest User"


def image_size(path: Path) -> tuple[int | None, int | None]:
    try:
        with Image.open(path) as img:
            return img.size
    except Exception:
        return None, None


def save_image(img: Image.Image, dst_path: Path, ext: str) -> None:
    fmt = IMG_FORMAT_BY_EXT.get(ext.lower(), "JPEG")
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    if fmt == "JPEG" and img.mode not in {"RGB", "L"}:
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode in {"RGBA", "LA"}:
            background.paste(img, mask=img.getchannel("A"))
        else:
            background.paste(img)
        img = background
    img.save(dst_path, format=fmt, quality=90 if fmt == "JPEG" else None)


def resize_image(
    basename: str,
    dst_route: str | None,
    dst_w: int,
    dst_h: int,
    dst_x: int = 0,
    dst_y: int = 0,
    src_x: int = 0,
    src_y: int = 0,
    src_w: int | None = None,
    src_h: int | None = None,
) -> bool:
    src_path = config.UPLOADS_DIR / "img" / basename
    dst_path = src_path if dst_route is None else config.UPLOADS_DIR / "img" / dst_route
    if not src_path.exists() or dst_w < 1 or dst_h < 1:
        return False
    ext = ext_from_name(basename)
    try:
        with Image.open(src_path) as opened:
            img = ImageOps.exif_transpose(opened)
            src_w = int(src_w or img.width)
            src_h = int(src_h or img.height)
            cropped = img.crop((int(src_x), int(src_y), int(src_x) + src_w, int(src_y) + src_h))
            resized = cropped.resize((int(dst_w), int(dst_h)), Image.Resampling.LANCZOS)
            if dst_x or dst_y:
                canvas = Image.new(resized.mode, (int(dst_w) + int(dst_x), int(dst_h) + int(dst_y)))
                canvas.paste(resized, (int(dst_x), int(dst_y)))
                resized = canvas
            save_image(resized, dst_path, ext)
        return True
    except Exception:
        return False


def keep_aspect_ratio_values(org_w: int, org_h: int, desired_w: int, desired_h: int) -> tuple[int, int]:
    ratio_w = desired_w / org_w
    ratio_h = desired_h / org_h
    if ratio_w <= ratio_h:
        return desired_w, round(ratio_w * org_h)
    return round(ratio_h * org_w), desired_h


def resize_image_auto(basename: str, dst: str | None, width: int, height: int, resize_type: int | str) -> bool:
    src_path = config.UPLOADS_DIR / "img" / basename
    if not src_path.exists() or width < 1 or height < 1:
        return False
    with Image.open(src_path) as img:
        ow, oh = img.size
    src_x = src_y = dst_x = dst_y = 0
    src_w, src_h = ow, oh
    dst_w, dst_h = width, height
    resize_type = str(resize_type or "1")

    if resize_type == "2":
        dst_w, dst_h = keep_aspect_ratio_values(ow, oh, width, height)
    elif resize_type == "3":
        if ow > width or oh > height:
            if ow / oh > width / height:
                src_y = 0
                src_h = oh
                src_x = round((ow - ((width / height) * oh)) / 2)
                src_w = round((width / height) * oh)
            else:
                src_x = 0
                src_w = ow
                src_y = round((oh - ((height / width) * ow)) / 2)
                src_h = round((height / width) * ow)
    elif resize_type == "4":
        dst_w, dst_h = keep_aspect_ratio_values(ow, oh, width, height)
        ok = resize_image(basename, dst, dst_w, dst_h, 0, 0, src_x, src_y, src_w, src_h)
        if width == dst_w and height == dst_h:
            return ok
        # boşluklu çıktı + ortalanmış görsel
        dst_path = src_path if dst is None else config.UPLOADS_DIR / "img" / dst
        ext = ext_from_name(basename)
        try:
            with Image.open(dst_path) as resized:
                mode = "RGBA" if ext == "png" else "RGB"
                background = (0, 0, 0, 0) if mode == "RGBA" else (0, 0, 0)
                canvas = Image.new(mode, (width, height), background)
                paste_x = round(abs(width - resized.width) / 2)
                paste_y = round(abs(height - resized.height) / 2)
                canvas.paste(resized.convert(mode), (paste_x, paste_y))
                save_image(canvas, dst_path, ext)
            return True
        except Exception:
            return False

    return resize_image(basename, dst, int(dst_w), int(dst_h), dst_x, dst_y, src_x, src_y, int(src_w), int(src_h))


def create_thumbs(basename: str) -> None:
    for index, values in config.TF_SETTING_THUMBS.items():
        resize_image_auto(
            basename=basename,
            dst=f"thumb{index}/{basename}",
            width=int(values["width"]),
            height=int(values["height"]),
            resize_type=config.TF_IMG_THUMBNAIL_TYPE,
        )


def is_valid_img_ext(filename: str) -> bool:
    return ext_from_name(filename) in IMG_EXTS


def is_valid_file_ext(filename: str) -> bool:
    return ext_from_name(filename) in set(config.TF_ALLOWED_FILES)


@dataclass
class StoredFile:
    name: str
    basename: str
    width: int | None = None
    height: int | None = None
    row_id: int | None = None
    size: int | None = None


def validate_upload(filename: str, size: int, file_type: str) -> str:
    if file_type == "img":
        if not is_valid_img_ext(filename):
            return messages.str("alert_allowed-formats") % (filename, "gif,jpg,jpeg,png")
        if size > config.TF_MAX_IMG_SIZE:
            return messages.str("alert_max-allowed-size") % (filename, round_file_size(bytes_value=config.TF_MAX_IMG_SIZE))
    else:
        if not is_valid_file_ext(filename) or is_valid_img_ext(filename):
            return messages.str("alert_file-not-allowed") % filename
        if size > config.TF_MAX_FILE_SIZE:
            return messages.str("alert_max-allowed-size") % (filename, round_file_size(bytes_value=config.TF_MAX_FILE_SIZE))
    return ""


def assert_image_content(path: Path) -> bool:
    try:
        with Image.open(path) as img:
            img.verify()
        return True
    except Exception:
        return False


async def store_upload(upload: UploadFile, file_type: str, upload_options: dict[str, Any]) -> StoredFile | str:
    filename = clean_filename(upload.filename or "file")
    content = await upload.read()
    response_msg = validate_upload(filename, len(content), file_type)
    if response_msg:
        return response_msg

    ext = ext_from_name(filename)
    path = upload_dir(file_type)
    basename = random_basename(path, ext)
    target = path / basename
    target.write_bytes(content)

    if file_type == "img" and not assert_image_content(target):
        target.unlink(missing_ok=True)
        return messages.str("alert_img-not-allowed")

    create_thumb = boolish(upload_options.get("create_thumb", True))
    private_file = boolish(upload_options.get("private_file", False))

    width = int(upload_options.get("width") or 0)
    height = int(upload_options.get("height") or 0)
    resize_type = int(upload_options.get("resize_type") or 0)
    if file_type == "img" and resize_type and (width < 1 or height < 1):
        return messages.str("alert_resizing-width-height")
    if file_type == "img" and width and height:
        resize_image_auto(basename, None, width, height, resize_type or 1)

    if file_type == "img" and create_thumb:
        create_thumbs(basename)

    final_size = target.stat().st_size
    img_w, img_h = image_size(target) if file_type == "img" else (None, None)

    data = {
        "name": filename,
        "basename": basename,
        "type": file_type,
        "uploader": active_user_from_request(),
        "size": str(final_size),
        "hasthumb": enum_bool(create_thumb),
        "isprivate": enum_bool(private_file),
        "width": str(img_w) if img_w else None,
        "height": str(img_h) if img_h else None,
    }
    row_id = db.insert_file(data)
    return StoredFile(name=filename, basename=basename, width=img_w, height=img_h, row_id=row_id, size=final_size)


async def store_remote_file(url: str, file_type: str, upload_options: dict[str, Any]) -> StoredFile | str:
    parsed = urlparse(url.split("?", 1)[0])
    filename = clean_filename(Path(parsed.path).name or "remote-file")
    if file_type == "img" and not is_valid_img_ext(filename):
        return messages.str("alert_allowed-formats") % (filename, "gif,jpg,jpeg,png")

    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            content = response.content
    except Exception:
        return "Remote file could not read!"

    if file_type == "img" and len(content) > config.TF_MAX_IMG_SIZE and not (upload_options.get("width") and upload_options.get("height")):
        return messages.str("alert_max-allowed-size") % (filename, round_file_size(bytes_value=config.TF_MAX_IMG_SIZE))

    class RemoteUpload:
        def __init__(self, filename: str, content: bytes) -> None:
            self.filename = filename
            self._content = content

        async def read(self) -> bytes:
            return self._content

    return await store_upload(RemoteUpload(filename, content), file_type, upload_options)  # type: ignore[arg-type]


def add_to_zip(zip_basename: str, zip_name: str, files: list[dict[str, str]], delete_files: bool) -> dict[str, Any] | None:
    zip_path = upload_dir("file") / zip_basename
    try:
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            for item in files:
                zf.write(item["path"], arcname=item["localname"])
    except Exception:
        zip_path.unlink(missing_ok=True)
        return None

    if delete_files:
        for item in files:
            Path(item["path"]).unlink(missing_ok=True)
            db.delete_file_row("file", item["basename"])

    size = zip_path.stat().st_size
    row_id = db.insert_file(
        {
            "basename": zip_basename,
            "name": zip_name,
            "size": str(size),
            "type": "file",
            "uploader": active_user_from_request(),
            "hasthumb": "No",
            "isprivate": "No",
            "width": None,
            "height": None,
        }
    )
    return {"id": row_id, "basename": zip_basename, "name": zip_name, "size": round_file_size(bytes_value=size)}


def zip_single_file(basename: str, is_delete: bool) -> dict[str, Any]:
    path = upload_dir("file")
    source = path / basename
    if not basename.strip() or not source.exists():
        return {"code": -1}
    ext = ext_from_name(basename)
    if ext == "zip":
        return {"code": -2}
    info = db.fetch_by_basename(basename, ["name", "isprivate"])
    if not info:
        return {"code": -1}
    clean_name = clean_filename(str(info["name"]))
    zip_name = re.sub(rf"\.{re.escape(ext)}$", "", clean_name, flags=re.IGNORECASE) + ".zip"
    zip_basename = random_basename(path, "zip")
    result = add_to_zip(
        zip_basename=zip_basename,
        zip_name=zip_name,
        files=[{"basename": basename, "localname": clean_name, "path": str(source)}],
        delete_files=is_delete,
    )
    return result if result is not None else {"code": -3}


def set_file_details(basename: str, width: int, height: int, file_id: int) -> dict[str, str]:
    file_path = upload_dir("img") / basename
    size = file_path.stat().st_size if file_path.exists() else 0
    db.update_file_details(file_id, width, height, size)
    return {"size": round_file_size(bytes_value=size)}
