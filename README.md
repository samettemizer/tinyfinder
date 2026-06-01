## TinyFinder v1.6.0

Multimedia, document upload-search tool integrated with WYSIWYG editor.<br>
Manage easily all of files or use it for any form element.

backend: FastAPI + Uvicorn

---

## Build env image

```bash
docker build \
  --build-arg UID=$(id -u) \
  --build-arg GID=$(id -g) \
  -t tinyfinder-staging \
  -f Dockerfile-tinyfinder .
```

### Copy sample env file

```bash
cp .env.sample .env
```

## Run

```bash
docker run -d --name tinyfinder -p 8889:8000 -v "$PWD":/app --env-file .env tinyfinder-staging:latest
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