"use strict";

/* ---------------------------------------------------------------
   Data model
----------------------------------------------------------------*/
const SECTIONS = [
  {
    id: "freeToPlay",
    label: "Free To Play game",
    path: "freeToPlay",
    hint: "Betler markets (incl. Brazil). e.g. brsuperbetsport://freeToPlay?gameId=calendar-game&shouldLoginToPlay=false",
    params: [
      { key: "gameId", kind: "text", label: "Game ID", placeholder: "calendar-game", required: true },
      { key: "shouldLoginToPlay", kind: "bool", label: "Require login to play", value: false }
    ]
  },
  { id: "liveCasino", label: "Live Casino", path: "liveCasino", hint: "Sportsbook app section.", params: [] },
  { id: "multiBetBuilder", label: "Multi Bet Builder", path: "multiBetBuilder", hint: "Sportsbook app section.", params: [] },
  { id: "adventCalendar", label: "Advent Calendar (legacy RO)", path: "adventCalendar", hint: "Legacy shorthand. New markets use Free To Play.", params: [] },
  {
    id: "games",
    label: "Casino game (external ID)",
    path: "games",
    hint: "Games app. e.g. rosuperbetgames://games?externalId=icore_1253_ro",
    params: [{ key: "externalId", kind: "text", label: "External game ID", placeholder: "icore_1253_ro", required: true }]
  },
  { id: "home", label: "App home", path: "", hint: "Opens the app with no specific destination.", params: [] },
  { id: "custom", label: "Custom path…", path: "", custom: true, hint: "Type any section path manually.", params: [] }
];

/* live state for preset params, keyed by param key */
let presetState = {};
/* custom params: array of {key, kind, value} */
let customState = [];

/* ---------------------------------------------------------------
   DOM refs
----------------------------------------------------------------*/
const $ = (id) => document.getElementById(id);
const productSeg = $("productSeg");
const domainSel = $("domain");
const sectionSel = $("section");
const sectionHint = $("sectionHint");
const customPathField = $("customPathField");
const customPathInput = $("customPath");
const presetParamsBox = $("presetParams");
const customParamsBox = $("customParams");
const heroLink = $("heroLink");
const encodedLink = $("encodedLink");

let product = "superbetsport";

/* ---------------------------------------------------------------
   Init: populate section dropdown
----------------------------------------------------------------*/
SECTIONS.forEach((s) => {
  const opt = document.createElement("option");
  opt.value = s.id;
  opt.textContent = s.label;
  sectionSel.appendChild(opt);
});
sectionSel.value = "freeToPlay";

/* ---------------------------------------------------------------
   Helpers
----------------------------------------------------------------*/
function currentSection() {
  return SECTIONS.find((s) => s.id === sectionSel.value);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

/* collect all params -> [{key, value, isPlaceholder}] */
function collectParams() {
  const out = [];
  const section = currentSection();

  section.params.forEach((p) => {
    if (p.kind === "bool") {
      out.push({ key: p.key, value: presetState[p.key] ? "true" : "false" });
    } else {
      const raw = (presetState[p.key] || "").trim();
      if (raw) out.push({ key: p.key, value: raw });
      else if (p.placeholder) out.push({ key: p.key, value: p.placeholder, isPlaceholder: true });
    }
  });

  customState.forEach((c) => {
    const key = (c.key || "").trim();
    if (!key) return;
    if (c.kind === "bool") {
      out.push({ key, value: c.value ? "true" : "false" });
    } else {
      const v = (c.value || "").trim();
      if (v) out.push({ key, value: v });
    }
  });

  return out;
}

function getPath() {
  const section = currentSection();
  if (section.custom) return customPathInput.value.trim();
  return section.path;
}

/* ---------------------------------------------------------------
   Build outputs
----------------------------------------------------------------*/
function build() {
  const scheme = domainSel.value + product + "://";
  const path = getPath();
  const params = collectParams();
  const query = params.map((p) => `${p.key}=${p.value}`).join("&");
  const plain = scheme + path + (query ? "?" + query : "");

  // --- hero (tokenized) ---
  let html = `<span class="tok-scheme">${escapeHtml(scheme)}</span>`;
  html += `<span class="tok-path">${escapeHtml(path)}</span>`;
  if (params.length) {
    html += `<span class="tok-sep">?</span>`;
    params.forEach((p, i) => {
      if (i > 0) html += `<span class="tok-sep">&amp;</span>`;
      const valClass = p.isPlaceholder ? "tok-val placeholder" : "tok-val";
      html += `<span class="tok-key">${escapeHtml(p.key)}</span><span class="tok-sep">=</span><span class="${valClass}">${escapeHtml(p.value)}</span>`;
    });
  }
  heroLink.innerHTML = html;

  // --- encoded ---
  encodedLink.textContent = encodeURIComponent(plain);

  // stash for copy
  heroLink.dataset.plain = plain;
}

/* ---------------------------------------------------------------
   Render preset params for the active section
----------------------------------------------------------------*/
function renderPresetParams() {
  const section = currentSection();
  presetState = {};
  presetParamsBox.innerHTML = "";

  // toggle custom path field
  customPathField.hidden = !section.custom;
  sectionHint.textContent = section.hint || "";

  section.params.forEach((p) => {
    if (p.kind === "bool") {
      presetState[p.key] = !!p.value;
      const row = document.createElement("div");
      row.className = "param-bool";
      row.innerHTML = `
        <div class="pb-text">
          <div class="pb-label">${escapeHtml(p.label)}</div>
          <div class="pb-key">${escapeHtml(p.key)}=${p.value ? "true" : "false"}</div>
        </div>
        <label class="switch">
          <input type="checkbox" ${p.value ? "checked" : ""} aria-label="${escapeHtml(p.label)}" />
          <span class="track"></span>
        </label>`;
      const input = row.querySelector("input");
      const keyLabel = row.querySelector(".pb-key");
      input.addEventListener("change", () => {
        presetState[p.key] = input.checked;
        keyLabel.textContent = `${p.key}=${input.checked ? "true" : "false"}`;
        build();
      });
      presetParamsBox.appendChild(row);
    } else {
      presetState[p.key] = "";
      const row = document.createElement("div");
      row.className = "param-text";
      row.innerHTML = `
        <label>${escapeHtml(p.label)}${p.required ? ' <span class="req">*</span>' : ""}</label>
        <input type="text" placeholder="${escapeHtml(p.placeholder || "")}" autocomplete="off" />`;
      const input = row.querySelector("input");
      input.addEventListener("input", () => {
        presetState[p.key] = input.value;
        build();
      });
      presetParamsBox.appendChild(row);
    }
  });

  build();
}

/* ---------------------------------------------------------------
   Custom params builder
----------------------------------------------------------------*/
function renderCustomParams() {
  customParamsBox.innerHTML = "";
  customState.forEach((c, idx) => {
    const row = document.createElement("div");
    row.className = "cparam" + (c.kind === "bool" ? " is-bool" : "");

    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.placeholder = "key";
    keyInput.value = c.key;
    keyInput.autocomplete = "off";
    keyInput.addEventListener("input", () => { c.key = keyInput.value; build(); });

    const typeWrap = document.createElement("div");
    typeWrap.className = "cp-type";
    const typeSel = document.createElement("select");
    typeSel.innerHTML = `<option value="text">value</option><option value="bool">checkbox</option>`;
    typeSel.value = c.kind;
    typeSel.addEventListener("change", () => {
      c.kind = typeSel.value;
      if (c.kind === "bool" && typeof c.value !== "boolean") c.value = false;
      if (c.kind === "text" && typeof c.value === "boolean") c.value = "";
      renderCustomParams();
      build();
    });
    typeWrap.appendChild(typeSel);

    let valueControl;
    if (c.kind === "bool") {
      const sw = document.createElement("label");
      sw.className = "switch";
      sw.innerHTML = `<input type="checkbox" ${c.value ? "checked" : ""} aria-label="value" /><span class="track"></span>`;
      sw.querySelector("input").addEventListener("change", (e) => { c.value = e.target.checked; build(); });
      valueControl = sw;
    } else {
      valueControl = document.createElement("input");
      valueControl.type = "text";
      valueControl.placeholder = "value";
      valueControl.value = typeof c.value === "string" ? c.value : "";
      valueControl.autocomplete = "off";
      valueControl.addEventListener("input", () => { c.value = valueControl.value; build(); });
    }

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "cp-remove";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Remove parameter");
    remove.addEventListener("click", () => {
      customState.splice(idx, 1);
      renderCustomParams();
      build();
    });

    row.append(keyInput, typeWrap, valueControl, remove);
    customParamsBox.appendChild(row);
  });
}

/* ---------------------------------------------------------------
   Copy + toast
----------------------------------------------------------------*/
function toast(msg) {
  const t = $("toast");
  t.innerHTML = `<span class="check">✓</span>${escapeHtml(msg)}`;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 1800);
}

async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
  toast(label + " copied");
}

/* ---------------------------------------------------------------
   Events
----------------------------------------------------------------*/
productSeg.addEventListener("click", (e) => {
  const btn = e.target.closest(".seg-btn");
  if (!btn) return;
  product = btn.dataset.val;
  productSeg.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
  build();
});

domainSel.addEventListener("change", build);
sectionSel.addEventListener("change", renderPresetParams);
customPathInput.addEventListener("input", build);

$("addParam").addEventListener("click", () => {
  customState.push({ key: "", kind: "text", value: "" });
  renderCustomParams();
});

$("copyLink").addEventListener("click", () => copy(heroLink.dataset.plain || "", "Deeplink"));
$("copyEncoded").addEventListener("click", () => copy(encodedLink.textContent || "", "Encoded link"));

/* ---------------------------------------------------------------
   Boot
----------------------------------------------------------------*/
renderPresetParams();
renderCustomParams();
