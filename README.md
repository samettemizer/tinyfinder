## TinyFinder v1.6-RC2

Multimedia, document upload-search tool integrated with WYSIWYG editor.<br>
Manage easily all of files or use it for any form element.

backend: FastAPI + Uvicorn

---

## Sample environment

```bash
docker build \
  --build-arg UID=$(id -u) \
  --build-arg GID=$(id -g) \
  -t tinyfinder-silinecek \
  -f Dockerfile-tinyfinder .
```

## Run

```bash
docker run -d --name tinyfinder-ct -p 8887:8000 -v "$PWD":/app tinyfinder-silinecek:latest
```

## frontend assets

build assets:

```bash
npm i && npm run build
```

## That's all.
Open it your browser:

```text
http://0.0.0.0:8889
```


---

## settings, directories

config file:

```text
./app/config.py
```

sqlite database:

```text
./sqlite/tinyfinder.sqlite
```

uploaded files:

```text
./uploads/file
./uploads/img
./uploads/img/thumb1
./uploads/img/thumb2
./uploads/img/thumb3
```

---

### url note:

generates the application-url from `request.base_url` in sample environment.

if you run the app behind a reverse proxy, inside a subfolder, or behind a custom domain, you can define environment variable as TF_URL_APP explicitly.

