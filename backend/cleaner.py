from bs4 import BeautifulSoup

def clean_html(html: str) -> str:
    soup = BeautifulSoup(html or "", "html.parser")

    # удалить служебные блоки MediaWiki
    for el in soup.select(".mw-editsection, .plainlinks"):
        el.decompose()

    # удалить script/style
    for tag in soup(["script", "style"]):
        tag.decompose()

    # убрать комментарии
    for element in soup(text=lambda text: text and str(text).strip().startswith("NewPP")):
        element.extract()

    # убрать center, но оставить содержимое
    for center in soup.find_all("center"):
        center.unwrap()

    return str(soup)

def extract_text(html: str) -> str:
    soup = BeautifulSoup(html or "", "html.parser")
    return soup.get_text(separator=" ", strip=True)

def extract_hidden_text(html: str) -> str:
    soup = BeautifulSoup(html or "", "html.parser")
    parts = []

    for block in soup.select(".mw-collapsible, .mw-collapsible-content"):
        text = block.get_text(separator=" ", strip=True)
        if text:
            parts.append(text)

    return " ".join(parts)