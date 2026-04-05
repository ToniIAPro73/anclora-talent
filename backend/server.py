import os

import httpx
from fastapi import FastAPI, Request, Response


TARGET_URL = os.environ.get("NEXT_INTERNAL_URL") or "http://127.0.0.1:3000"
TIMEOUT = httpx.Timeout(120.0, connect=10.0)
HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "content-encoding",
}

app = FastAPI(title="Anclora Talent API Bridge")


def build_target_url(path: str, query: str) -> str:
    normalized_path = path if path.startswith("/") else f"/{path}"
    base = f"{TARGET_URL.rstrip('/')}{normalized_path}"
    return f"{base}?{query}" if query else base


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok", "target": TARGET_URL}


@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
async def proxy_request(full_path: str, request: Request) -> Response:
    target_url = build_target_url(request.url.path, request.url.query)
    request_headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in HOP_BY_HOP_HEADERS | {"host", "content-length"}
    }
    body = await request.body()

    async with httpx.AsyncClient(follow_redirects=False, timeout=TIMEOUT) as client:
        upstream = await client.request(
            request.method,
            target_url,
            headers=request_headers,
            content=body,
        )

    response_headers = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() not in HOP_BY_HOP_HEADERS | {"content-length"}
    }

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
        media_type=upstream.headers.get("content-type"),
    )