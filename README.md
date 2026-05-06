## TinyFinder v1.6-RC2

Multimedia, document upload-search tool integrated with WYSIWYG editor.<br>
Manage easily all of files or use it for any form element.

Backend: FastAPI + Uvicorn

---

## Sample environment

```bash
docker build -t tinyfinder -f Dockerfile-tinyfinder .
```

## Run

```bash
docker run -d --name tinyfinder-staging -p 8889:8000 -v "$PWD":/app tinyfinder:latest
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

## frontend assets

to rebuild assets:

```bash
npm i && npm run build
```

to watch files during development:

```bash
npm run watch
```

---

### url note:

generates the application-url from `request.base_url` in sample environment.

if you run the app behind a reverse proxy, inside a subfolder, or behind a custom domain, you can define environment variable as TF_URL_APP explicitly.

