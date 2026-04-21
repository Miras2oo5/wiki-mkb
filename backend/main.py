from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import json
from pathlib import Path
from urllib.parse import unquote
from bs4 import BeautifulSoup

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = Path("data.json")
PAGES_CACHE = []


def clean_html(html: str) -> str:
    try:
        soup = BeautifulSoup(html or "", "html.parser")

        for tag in soup(["script", "style"]):
            tag.decompose()

        for img in soup.find_all("img"):
            if not img.get("src", "").startswith("http"):
                img["src"] = "https://wiki.mkb.kz" + img.get("src", "")

        return str(soup)
    except Exception:
        return html or ""


def extract_text(html: str) -> str:
    try:
        soup = BeautifulSoup(html or "", "html.parser")
        return soup.get_text(separator=" ", strip=True)
    except Exception:
        return ""


def extract_hidden_text(html: str) -> str:
    try:
        soup = BeautifulSoup(html or "", "html.parser")
        parts = []

        hidden_blocks = soup.select(".mw-collapsible, .mw-collapsible-content")
        for block in hidden_blocks:
            text = block.get_text(separator=" ", strip=True)
            if text:
                parts.append(text)

        return " ".join(parts)
    except Exception:
        return ""


def build_snippet(text: str, query: str = "", size: int = 200) -> str:
    if not text:
        return ""

    if not query:
        return text[:size]

    lower_text = text.lower()
    lower_query = query.lower()
    index = lower_text.find(lower_query)

    if index == -1:
        return text[:size]

    start = max(0, index - 60)
    end = min(len(text), index + len(query) + 120)
    return text[start:end]


def load_and_prepare_pages():
    global PAGES_CACHE

    if not DATA_FILE.exists():
        PAGES_CACHE = []
        return

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        raw_pages = json.load(f)

    prepared = []

    for p in raw_pages:
        title = p.get("title", "")
        raw_content = p.get("content", "")
        text = extract_text(raw_content)
        hidden_text = extract_hidden_text(raw_content)

        prepared.append({
            "title": title,
            "content": clean_html(raw_content),
            "text": text,
            "hidden_text": hidden_text,
        })

    PAGES_CACHE = prepared
    print(f"Загружено страниц в кэш: {len(PAGES_CACHE)}")


@app.on_event("startup")
def startup_event():
    load_and_prepare_pages()


@app.get("/")
def root():
    return {"status": "ok", "pages_cached": len(PAGES_CACHE)}


@app.get("/api/pages")
def get_pages():
    result = []

    for p in PAGES_CACHE[:200]:
        result.append({
            "title": p["title"],
            "snippet": build_snippet(p["text"])
        })

    return result


@app.get("/api/page")
def get_page(title: str = Query(...)):
    decoded_title = unquote(title)

    for p in PAGES_CACHE:
        if p["title"] == decoded_title:
            return {
                "title": p["title"],
                "content": p["content"]
            }

    return {
        "title": "Не найдено",
        "content": "<p>Страница не найдена</p>"
    }


@app.get("/api/search")
def search_pages(q: str = ""):
    q = q.strip()

    if not q:
        return get_pages()

    q_lower = q.lower()
    results = []

    for p in PAGES_CACHE:
        title_match = q_lower in p["title"].lower()
        text_match = q_lower in p["text"].lower()
        hidden_match = q_lower in p["hidden_text"].lower()

        if title_match or text_match or hidden_match:
            snippet_source = p["text"]
            if hidden_match and not text_match:
                snippet_source = p["hidden_text"]

            results.append({
                "title": p["title"],
                "snippet": build_snippet(snippet_source, q)
            })

    return results[:100]