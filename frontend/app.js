let pages = [];
let activeTitle = "";
const resultsInfo = document.getElementById("resultsInfo");
const sidebar = document.querySelector(".sidebar");
const main = document.querySelector(".main");
const toggleSidebar = document.getElementById("toggleSidebar");
const resultsBlock = document.getElementById("results");
const resultsContainer = document.getElementById("results");
const searchInput = document.getElementById("searchInput");
const pageTitle = document.getElementById("pageTitle");
const pageContent = document.getElementById("pageContent");
const menu = document.getElementById("menu");
const backButton = document.getElementById("backButton");
const loadMoreButton = document.getElementById("loadMoreButton");

let visibleCount = 20;
let currentList = [];
let lastResults = [];
let lastQuery = "";

async function loadData() {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/pages");

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    pages = await res.json();
    visibleCount = 20;

    renderResults(pages);
    renderMenu(pages);
  } catch (error) {
    console.error("Ошибка loadData:", error);
    resultsContainer.innerHTML = `<p>Ошибка загрузки: ${error.message}</p>`;
  }
}

async function openPageByTitle(title) {
  try {
    const res = await fetch(
      `http://127.0.0.1:8000/api/page?title=${encodeURIComponent(title)}`
    );

    const page = await res.json();

    pageTitle.textContent = page.title || "Без названия";
    pageContent.innerHTML = page.content || "<p>Нет содержимого</p>";

    document.getElementById("breadcrumbs").innerText =
      "Главная / " + page.title;

    // 👇 скрываем результаты
    resultsBlock.style.display = "none";
    backButton.style.display = "block";
    activeTitle = title;
    renderMenu(pages);

  } catch (error) {
    console.error("Ошибка:", error);
  }
}

async function searchPages(query) {
  try {
    const q = query.trim();
    resultsContainer.innerHTML = "<p>Загрузка...</p>";

    const url = q
      ? `http://127.0.0.1:8000/api/search?q=${encodeURIComponent(q)}`
      : "http://127.0.0.1:8000/api/pages";

    visibleCount = 20;

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    renderResults(data, q);
  } catch (error) {
    console.error("Ошибка поиска:", error);
    resultsContainer.innerHTML = `<p>Ошибка поиска: ${error.message}</p>`;
  }
}

function renderResults(list, query = "") {
  lastResults = list;
  lastQuery = query;
  currentList = list;

  resultsContainer.innerHTML = "";

  if (query) {
    resultsInfo.innerHTML = `Найдено: <b>${list.length}</b> по запросу "<b>${query}</b>"`;
  } else {
    resultsInfo.innerHTML = `Всего страниц: <b>${list.length}</b>`;
  }

  if (!list || list.length === 0) {
    resultsContainer.innerHTML = `
      <div style="padding:20px;color:#777;">
        Ничего не найдено 😕
      </div>
    `;
    loadMoreButton.style.display = "none";
    return;
  }

  const visibleItems = list.slice(0, visibleCount);

visibleItems.forEach((p) => {
  const div = document.createElement("div");
  div.className = "result-item";

  div.innerHTML = `
    <div><b>${highlight(p.title || "Без названия", query)}</b></div>
    <div class="result-snippet">
      ${highlight((p.snippet || "").trim(), query)}...
    </div>
  `;

  div.onclick = () => openPageByTitle(p.title);

  resultsContainer.appendChild(div);
});

  if (visibleCount < list.length) {
    loadMoreButton.style.display = "block";
  } else {
    loadMoreButton.style.display = "none";
  }
}

function renderMenu(list) {
  menu.innerHTML = "";

  if (!list || list.length === 0) {
    menu.innerHTML = "<p>Нет страниц</p>";
    return;
  }

  list.slice(0, 30).forEach((p) => {
    const item = document.createElement("div");
    item.className = "menu-item";
    item.textContent = p.title || "Без названия";

    // 👇 ВОТ ЗДЕСЬ правильно
    item.style.fontWeight = p.title === activeTitle ? "bold" : "normal";

    item.onclick = () => openPageByTitle(p.title);

    menu.appendChild(item);
  });
}

function highlight(text, q) {
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(escaped, "gi"), (m) => `<mark>${m}</mark>`);
}

let searchTimeout;

searchInput.addEventListener("input", (e) => {
  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
    searchPages(e.target.value);
  }, 300);
});

backButton.addEventListener("click", () => {
  resultsBlock.style.display = "block";
  backButton.style.display = "none";
  renderResults(lastResults, lastQuery);
});

backButton.style.display = "none";

toggleSidebar.addEventListener("click", () => {
  sidebar.classList.toggle("hidden");
  main.classList.toggle("full");
});

loadMoreButton.addEventListener("click", () => {
  visibleCount += 20;
  renderResults(currentList, lastQuery);
});

function initTheme() {
  if (!themeToggle) return;

  const saved = localStorage.getItem("theme");

  if (saved === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }




}

function updateThemeIcon() {
  const isDark = document.documentElement.classList.contains("dark");
  themeToggle.textContent = isDark ? "☀️" : "🌙";
}


loadData();