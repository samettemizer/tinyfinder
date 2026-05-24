from __future__ import annotations

import json
import mimetypes
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, PlainTextResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from jinja2 import Environment, FileSystemLoader, select_autoescape

from . import config, db
from .file_service import (
    add_to_zip,
    boolish,
    clean_filename,
    create_thumbs,
    ext_from_name,
    image_size,
    parse_upload_options,
    random_basename,
    resize_image,
    resize_image_auto,
    round_file_size,
    set_file_details,
    store_remote_file,
    store_upload,
    upload_dir,
    zip_single_file,
)
from .messages import messages

app = FastAPI(title="TinyFinder FastAPI", version="1.6-RC2-python")

config.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
(config.UPLOADS_DIR / "img" / "thumb1").mkdir(parents=True, exist_ok=True)
(config.UPLOADS_DIR / "img" / "thumb2").mkdir(parents=True, exist_ok=True)
(config.UPLOADS_DIR / "img" / "thumb3").mkdir(parents=True, exist_ok=True)
(config.UPLOADS_DIR / "file").mkdir(parents=True, exist_ok=True)

db.init_db()

app.mount("/assets", StaticFiles(directory=config.ASSETS_DIR), name="assets")
app.mount("/uploads", StaticFiles(directory=config.UPLOADS_DIR), name="uploads")

templates = Environment(
    loader=FileSystemLoader(Path(__file__).resolve().parent / "templates"),
    autoescape=select_autoescape(["html", "xml"]),
)
templates.globals["s"] = messages.str


def app_url(request: Request) -> str:
    explicit = __import__("os").environ.get("TF_URL_APP", "").strip()
    if explicit:
        return explicit if explicit.endswith("/") else explicit + "/"
    return str(request.base_url)


def render_template(template_name: str, **context: Any) -> str:
    return templates.get_template(template_name).render(**context)


def format_timestamp(raw: str | None) -> str:
    if not raw:
        return ""
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
        try:
            dt = datetime.strptime(str(raw).split(".", 1)[0], fmt)
            return dt.strftime("%b %d, %Y %H:%M")
        except ValueError:
            pass
    return str(raw)


def html_safe(value: Any) -> str:
    import html

    return html.escape("" if value is None else str(value), quote=True)


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def demo(request: Request) -> str:
    return render_template("demo.html", app_url=app_url(request))


@app.get("/health", include_in_schema=False)
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/app/script", include_in_schema=False)
async def app_script(request: Request) -> Response:
    localize = json.dumps(messages.front, ensure_ascii=False)
    allowed = json.dumps(list(config.TF_ALLOWED_FILES))
    base = app_url(request)
    output = (
        f"var tf_dyn = {{localize:{localize}}};"
        "tf_dyn.cnf = {"
        f'app_url:"{base}",'
        f"file_extensions:{allowed},"
        f"max_file_size:{config.TF_MAX_FILE_SIZE},"
        f"max_img_size:{config.TF_MAX_IMG_SIZE}"
        "};"
        f"document.write('<script src=\"{base}assets/tinyfinder.min.js\" type=\"text/javascript\"><\\/script>');"
    )
    return Response(output, media_type="application/javascript")

@app.get("/file/manager", response_class=HTMLResponse, include_in_schema=False)
@app.get("/file/manager/", response_class=HTMLResponse, include_in_schema=False)
async def manager_archive(request: Request, type: str = Query("img")) -> str:
    return render_template("archive.html", type=type, url_app=app_url(request))


@app.get("/file/manager/basic", response_class=HTMLResponse, include_in_schema=False)
async def manager_basic(type: str = Query("img")) -> str:
    return render_template("basic.html", type=type)


@app.post("/file/manager/filter")
async def manager_filter(request: Request, type: str = Query("img")) -> JSONResponse:
    form = await request.form()
    title = str(form.get("TF_filetitle", ""))
    rows = db.fetch_items(type, title, "Guest User")
    data: list[dict[str, Any]] = []
    for row in rows:
        isprivate = row["isprivate"] or "No"
        name = row["name"] or ""
        item = {
            "id": html_safe(row["id"]),
            "name": html_safe(name),
            "basename": html_safe(row["basename"]),
            "type": html_safe(row["type"]),
            "size": html_safe(round_file_size(bytes_value=int(row["size"] or 0))),
            "width": html_safe(row["width"] or ""),
            "height": html_safe(row["height"] or ""),
            "uploader": html_safe(row["uploader"] or "Guest User"),
            "timestamp": html_safe(format_timestamp(row["timestamp"])),
            "hasthumb": html_safe(row["hasthumb"] or "No"),
            "isprivate": html_safe(isprivate),
            "display_name": html_safe(("* " if boolish(isprivate) else "") + name),
        }
        data.append(item)
    return JSONResponse({"data": data})


@app.post("/file/manager/name")
async def manager_name(basename: str = Form("")) -> PlainTextResponse:
    info = db.fetch_by_basename(basename, ["name"])
    return PlainTextResponse(str(info["name"] if info else ""))


@app.get("/file/manager/remove")
async def manager_remove(id: int = Query(...)) -> PlainTextResponse:
    info = db.fetch_by_id(id, ["type", "basename"])
    if info:
        basename = str(info["basename"])
        file_type = str(info["type"])
        (config.UPLOADS_DIR / file_type / basename).unlink(missing_ok=True)
        if file_type == "img":
            for index in range(1, 4):
                (config.UPLOADS_DIR / file_type / f"thumb{index}" / basename).unlink(missing_ok=True)
        db.delete_by_id(id)
    return PlainTextResponse("")


@app.get("/file/manager/img_sizes")
async def manager_img_sizes(id: int = Query(...)) -> JSONResponse:
    info = db.fetch_by_id(id, ["type", "basename"])
    if not info:
        return JSONResponse({"code": -2})
    basename = str(info["basename"])
    file_type = str(info["type"])
    path = config.UPLOADS_DIR / file_type / basename
    width, height = image_size(path)
    if not width or not height:
        return JSONResponse({"code": -1})
    return JSONResponse({"width": width, "height": height, "size": round_file_size(basename, file_type)})


@app.get("/file/manager/resize")
async def manager_resize(id: int = Query(...), dst_w: int = Query(...), dst_h: int = Query(...)) -> JSONResponse:
    info = db.fetch_by_id(id, ["basename"])
    if not info:
        return JSONResponse({"code": -1})
    basename = str(info["basename"])
    ok = resize_image(basename, None, int(dst_w), int(dst_h))
    if not ok:
        return JSONResponse({"code": -1})
    return JSONResponse(set_file_details(basename, int(dst_w), int(dst_h), id))


@app.post("/file/manager/rename")
async def manager_rename(id: int = Form(...), name: str = Form(...)) -> PlainTextResponse:
    db.update_file_name(int(id), clean_filename(name))
    return PlainTextResponse("")


@app.get("/file/manager/zip")
async def manager_zip(basename: str = Query(""), is_delete: int = Query(1)) -> JSONResponse:
    return JSONResponse(zip_single_file(basename, boolish(is_delete)))


@app.get("/file/manager/check4update", include_in_schema=False)
async def manager_check_update() -> JSONResponse:
    return JSONResponse({"release": 0})


@app.get("/file/manager/crop", response_class=HTMLResponse, include_in_schema=False)
async def manager_crop_get(
    request: Request,
    id: int = Query(...),
    aspect_ratio: str | None = Query(None),
    smartupload: str | None = Query("false"),
    tid: str = Query(""),
) -> str:
    def parse_aspect_ratio(value: str | None) -> float:
        if value is None:
            return 0.0

        value = str(value).strip().lower()

        if value in ("", "undefined", "null", "none", "nan"):
            return 0.0

        try:
            return float(value)
        except ValueError:
            return 0.0

    parsed_aspect_ratio = parse_aspect_ratio(aspect_ratio)

    info = db.fetch_by_id(id, ["basename", "type", "name", "id", "hasthumb"])
    if not info or info["type"] != "img":
        raise HTTPException(status_code=404, detail="Image not found")

    basename = str(info["basename"])
    size = image_size(config.UPLOADS_DIR / "img" / basename)

    if not size[0] or not size[1]:
        raise HTTPException(status_code=404, detail="Image not found")

    smartupload_value = str(smartupload or "").strip().lower()
    is_smart = smartupload_value == "true"

    set_select = None

    if is_smart and parsed_aspect_ratio:
        width, height = size

        if parsed_aspect_ratio <= 1:
            y2 = 0
            area_width = width / 1.5
        else:
            y2 = height / 1.5
            area_width = y2 * parsed_aspect_ratio

        x1 = (width - area_width) / 2
        x2 = x1 + area_width

        set_select = [round(x1, 2), 0, round(x2, 2), round(y2, 2)]

    return render_template(
        "crop.html",
        id=id,
        basename=basename,
        name=str(info["name"]),
        aspect_ratio=parsed_aspect_ratio,
        smartupload=is_smart,
        smartupload_js=1 if is_smart else 0,
        tid=tid,
        d=size,
        rand="rnd",
        url_app=app_url(request),
        url_uploads=app_url(request) + "uploads/",
        set_select=set_select,
    )


@app.post("/file/manager/crop")
async def manager_crop_post(id: int = Query(...), x: int = Form(...), y: int = Form(...), w: int = Form(...), h: int = Form(...)) -> JSONResponse:
    info = db.fetch_by_id(id, ["basename", "type", "name", "id", "hasthumb"])
    if not info or info["type"] != "img":
        return JSONResponse({"code": -1})
    if w < 16 or h < 16:
        return JSONResponse({"code": -1})
    basename = str(info["basename"])
    ok = resize_image(basename, None, w, h, 0, 0, x, y, w, h)
    if not ok:
        return JSONResponse({"code": -1})
    if boolish(info["hasthumb"]):
        create_thumbs(basename)
    return JSONResponse(set_file_details(basename, w, h, id))


@app.post("/file/upload/", include_in_schema=False)
@app.post("/file/upload")
async def file_upload(
    request: Request,
    mode: str = Query("archive"),
    type: str = Query("img"),
    tf_tmp_id: str = Query("", alias="tf-tmp-id"),
    aspect_ratio: str = Query(""),
    upload_options_qs: str | None = Query(None, alias="upload_options"),
    upload: UploadFile | None = File(None),
    upload_options_form: str | None = Form(None, alias="upload_options"),
    callback: str | None = Form(None),
) -> Response:
    response_msg = ""
    uploaded = None
    options = parse_upload_options(upload_options_qs or upload_options_form)

    if upload is None or not upload.filename:
        response_msg = messages.str("alert_select-file")
    else:
        uploaded = await store_upload(upload, type, options)
        if isinstance(uploaded, str):
            response_msg = uploaded
            uploaded = None
        elif type == "file" and boolish(options.get("add_to_zip")) and ext_from_name(uploaded.basename) != "zip":
            path = upload_dir("file")
            source = path / uploaded.basename
            ext = ext_from_name(uploaded.name)
            zip_name = uploaded.name.rsplit(f".{ext}", 1)[0] + ".zip" if ext else uploaded.name + ".zip"
            zip_basename = random_basename(path, "zip")
            zipped = add_to_zip(
                zip_basename=zip_basename,
                zip_name=clean_filename(zip_name),
                files=[{"basename": uploaded.basename, "localname": clean_filename(uploaded.name), "path": str(source)}],
                delete_files=boolish(options.get("del_zipped_files", True)),
            )
            if zipped:
                uploaded.basename = zipped["basename"]
                uploaded.name = zipped["name"]
                uploaded.row_id = zipped["id"]

    if mode in {"uploadbox", "archive"}:
        data = {
            "file": {"upload": {"name": upload.filename if upload else ""}},
            "tinyfinder": {
                "msg": response_msg,
                "name": uploaded.name if uploaded else "",
                "basename": uploaded.basename if uploaded else "",
                "width": uploaded.width if uploaded else None,
                "height": uploaded.height if uploaded else None,
                "id": tf_tmp_id,
            },
        }
        return JSONResponse(data)

    if mode == "smartupload":
        data = {
            "id": tf_tmp_id,
            "msg": response_msg,
            "name": uploaded.name if uploaded else "",
            "basename": uploaded.basename if uploaded else "",
            "fid": uploaded.row_id if uploaded else None,
            "aspect_ratio": aspect_ratio,
            "callback": callback,
        }
        script = f"<script language=\"javascript\">window.parent.$.TF_smartuploadResponse({json.dumps(data)});</script>"
        return HTMLResponse(script)

    return JSONResponse({"msg": response_msg})


@app.post("/file/upload/remote", include_in_schema=False)
async def file_upload_remote(request: Request, type: str = Query("img")) -> JSONResponse:
    form = await request.form()
    raw_options = str(form.get("upload_options", ""))
    options = parse_upload_options(raw_options)
    urls = form.getlist("url") or ([form.get("url")] if form.get("url") else [])
    response_msg = ""
    uploaded = None
    ismulti = 1 if len(urls) > 1 else 0
    for url in urls:
        uploaded = await store_remote_file(str(url), type, options)
        if isinstance(uploaded, str):
            response_msg += uploaded
            uploaded = None
    return JSONResponse(
        {
            "msg": response_msg,
            "name": uploaded.name if uploaded else "",
            "basename": uploaded.basename if uploaded else "",
            "width": uploaded.width if uploaded else None,
            "height": uploaded.height if uploaded else None,
            "ismulti": ismulti,
        }
    )


@app.get("/file/download")
async def file_download(basename: str = Query(...)) -> FileResponse:
    info = db.fetch_by_basename(basename, ["type", "name"])
    if not info:
        raise HTTPException(status_code=404, detail="File not found")
    path = config.UPLOADS_DIR / str(info["type"]) / basename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    media_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return FileResponse(path, media_type=media_type, filename=str(info["name"]))


@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException) -> PlainTextResponse:
    return PlainTextResponse("404", status_code=404)
