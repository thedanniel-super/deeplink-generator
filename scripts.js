"use strict";

/* =====================================================================
   MAPEAMENTO URL -> DEEPLINK
   Cada regra testa o caminho (path) da URL. A primeira que casar vence.
   `exact: true`  -> mapeamento confirmado na documentacao.
   `exact: false` -> melhor estimativa (revise antes de usar).
   Para adicionar uma rota nova, basta acrescentar um objeto aqui.
===================================================================== */
const RULES = [
  {
    label: "Free To Play (jogos-gratis)",
    test: /^jogos-gratis\/([^\/?#]+)/i,
    exact: true,
    build: (m) => ({
      product: "superbetsport",
      path: "freeToPlay",
      params: [
        { key: "gameId", kind: "text", value: m[1] },
        { key: "shouldLoginToPlay", kind: "bool", value: false }
      ]
    })
  },
  {
    label: "Live Casino",
    test: /^(?:cassino-ao-vivo|live-casino)(?:\/|$)/i,
    exact: true,
    build: () => ({ product: "superbetsport", path: "liveCasino", params: [] })
  },
  {
    label: "Multi Bet Builder",
    test: /^(?:multi-bet-builder|criar-aposta)(?:\/|$)/i,
    exact: false,
    build: () => ({ product: "superbetsport", path: "multiBetBuilder", params: [] })
  }
];

/* dominio -> mercado */
function detectMarket(host) {
  host = (host || "").toLowerCase();
  if (/\.br$/.test(host) || host.includes(".bet.br")) return "br";
  if (/\.ro$/.test(host)) return "ro";
  if (/\.pl$/.test(host)) return "pl";
  if (/\.rs$/.test(host)) return "rs";
  if (/napoleon/.test(host)) return "ronapoleongames";
  if (/\.com$/.test(host)) return "com";
  return "br";
}

/* remove prefixo de locale tipo /pt-br/ ou /en/ */
function stripLocale(path) {
  return path.replace(/^([a-z]{2}(-[a-z]{2})?)\//i, (full, code) => {
    // nao remover se parecer uma secao real
    return /^(pt|en|ro|pl|rs|sr|hr|br|us|gb|de)(-[a-z]{2})?$/i.test(code) ? "" : full;
  });
}

function kebabToCamel(s) {
  return s.replace(/-([a-z0-9])/gi, (_, c) => c.toUpperCase());
}

/* =====================================================================
   ESTADO
===================================================================== */
let state = {
  market: "br",
  product: "superbetsport",
  path: "freeToPlay",
  params: [],          // [{key, kind:'text'|'bool', value}]
  match: null          // {label, exact} | null | 'error'
};

const $ = (id) => document.getElementById(id);
const urlInput = $("pageUrl");
const marketSel = $("market");
const productSeg = $("productSeg");
const dlPath = $("dlPath");
const pathHint = $("pathHint");
const paramsBox = $("paramsBox");
const matchRow = $("matchRow");
const heroLink = $("heroLink");
const encodedLink = $("encodedLink");

function escapeHtml(str) {
  return String(str).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* =====================================================================
   PARSE: URL -> estado
===================================================================== */
function parseUrl() {
  const raw = urlInput.value.trim();
  if (!raw) { state.match = "empty"; syncControls(); return; }

  let u;
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
  } catch {
    state.match = "error"; syncControls(); return;
  }

  state.market = detectMarket(u.hostname);
  let path = u.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  path = stripLocale(path);

  // tenta casar uma regra
  let matched = null;
  for (const r of RULES) {
    const m = path.match(r.test);
    if (m) {
      const res = r.build(m);
      state.product = res.product;
      state.path = res.path;
      state.params = res.params.map((p) => ({ ...p }));
      matched = { label: r.label, exact: r.exact };
      break;
    }
  }

  if (!matched) {
    // estimativa generica
    const segs = path.split("/").filter(Boolean);
    const isGames = /(cassino|casino|slots|games|jogos)/i.test(path) && !/jogos-gratis/i.test(path);
    state.product = isGames ? "superbetgames" : "superbetsport";
    state.path = segs.length ? kebabToCamel(segs[0]) : "";
    state.params = segs.length > 1 ? [{ key: "id", kind: "text", value: segs.slice(1).join("/") }] : [];
    matched = path ? { label: "Estimativa (rota nao mapeada)", exact: false } : { label: "Home do app", exact: true };
  }

  state.match = matched;
  syncControls();
}

/* =====================================================================
   SYNC: estado -> controles -> saida
===================================================================== */
function syncControls() {
  marketSel.value = state.market;
  dlPath.value = state.path;
  productSeg.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.val === state.product));
  renderParams();
  renderMatch();
  build();
}

function renderMatch() {
  if (state.match === "empty") { matchRow.innerHTML = '<span class="match-detail">Cole um link para comecar.</span>'; return; }
  if (state.match === "error") { matchRow.innerHTML = '<span class="tag err">URL invalida</span><span class="match-detail">Verifique o link colado.</span>'; return; }
  const m = state.match;
  const cls = m.exact ? "exact" : "guess";
  const txt = m.exact ? "mapeamento confirmado" : "revise os campos abaixo";
  matchRow.innerHTML = `<span class="tag ${cls}">${m.exact ? "exato" : "estimativa"}</span>` +
    `<span class="match-detail">${escapeHtml(m.label)} &middot; ${txt}</span>`;
  pathHint.textContent = m.exact ? "" : "Caminho deduzido do link \u2014 ajuste se necessario.";
}

function renderParams() {
  paramsBox.innerHTML = "";
  state.params.forEach((c, idx) => {
    const row = document.createElement("div");
    row.className = "cparam" + (c.kind === "bool" ? " is-bool" : "");

    const keyInput = document.createElement("input");
    keyInput.type = "text"; keyInput.placeholder = "chave"; keyInput.value = c.key; keyInput.autocomplete = "off";
    keyInput.addEventListener("input", () => { c.key = keyInput.value; build(); });

    const typeWrap = document.createElement("div");
    typeWrap.className = "cp-type";
    const typeSel = document.createElement("select");
    typeSel.innerHTML = '<option value="text">valor</option><option value="bool">checkbox</option>';
    typeSel.value = c.kind;
    typeSel.addEventListener("change", () => {
      c.kind = typeSel.value;
      if (c.kind === "bool" && typeof c.value !== "boolean") c.value = false;
      if (c.kind === "text" && typeof c.value === "boolean") c.value = "";
      renderParams(); build();
    });
    typeWrap.appendChild(typeSel);

    let valueControl;
    if (c.kind === "bool") {
      valueControl = document.createElement("div");
      valueControl.className = "bool-wrap";
      const sw = document.createElement("label");
      sw.className = "switch";
      sw.innerHTML = `<input type="checkbox" ${c.value ? "checked" : ""} aria-label="valor de ${escapeHtml(c.key)}" /><span class="track"></span>`;
      sw.querySelector("input").addEventListener("change", (e) => { c.value = e.target.checked; build(); });
      valueControl.appendChild(sw);
    } else {
      valueControl = document.createElement("input");
      valueControl.type = "text"; valueControl.placeholder = "valor";
      valueControl.value = typeof c.value === "string" ? c.value : "";
      valueControl.autocomplete = "off";
      valueControl.addEventListener("input", () => { c.value = valueControl.value; build(); });
    }

    const remove = document.createElement("button");
    remove.type = "button"; remove.className = "cp-remove"; remove.textContent = "\u00D7";
    remove.setAttribute("aria-label", "Remover parametro");
    remove.addEventListener("click", () => { state.params.splice(idx, 1); renderParams(); build(); });

    row.append(keyInput, typeWrap, valueControl, remove);
    paramsBox.appendChild(row);
  });
}

/* =====================================================================
   BUILD: monta o deeplink
===================================================================== */
function build() {
  const scheme = state.market + state.product + "://";
  const path = state.path;

  const parts = [];
  state.params.forEach((p) => {
    const key = (p.key || "").trim();
    if (!key) return;
    if (p.kind === "bool") parts.push({ key, value: p.value ? "true" : "false" });
    else {
      const v = String(p.value || "").trim();
      if (v) parts.push({ key, value: v });
    }
  });

  const query = parts.map((p) => `${p.key}=${p.value}`).join("&");
  const plain = scheme + path + (query ? "?" + query : "");

  let html = `<span class="tok-scheme">${escapeHtml(scheme)}</span><span class="tok-path">${escapeHtml(path)}</span>`;
  parts.forEach((p, i) => {
    html += i === 0 ? '<span class="tok-sep">?</span>' : '<span class="tok-sep">&amp;</span>';
    html += `<span class="tok-key">${escapeHtml(p.key)}</span><span class="tok-sep">=</span><span class="tok-val">${escapeHtml(p.value)}</span>`;
  });
  heroLink.innerHTML = html;
  encodedLink.textContent = encodeURIComponent(plain);
  heroLink.dataset.plain = plain;
}

/* =====================================================================
   COPIAR + TOAST
===================================================================== */
function toast(msg) {
  const t = $("toast");
  t.innerHTML = `<span class="check">\u2713</span>${escapeHtml(msg)}`;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 1800);
}
async function copy(text, label) {
  if (!text) return;
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
  }
  toast(label + " copiado");
}

/* =====================================================================
   EVENTOS
===================================================================== */
urlInput.addEventListener("input", parseUrl);
marketSel.addEventListener("change", () => { state.market = marketSel.value; build(); });
dlPath.addEventListener("input", () => { state.path = dlPath.value.trim(); build(); });
productSeg.addEventListener("click", (e) => {
  const btn = e.target.closest(".seg-btn");
  if (!btn) return;
  state.product = btn.dataset.val;
  productSeg.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
  build();
});
$("addParam").addEventListener("click", () => { state.params.push({ key: "", kind: "text", value: "" }); renderParams(); build(); });
$("copyLink").addEventListener("click", () => copy(heroLink.dataset.plain || "", "Deeplink"));
$("copyEncoded").addEventListener("click", () => copy(encodedLink.textContent || "", "Link encoded"));

/* boot */
parseUrl();
