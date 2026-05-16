"use strict";

/* ---------------- Storage ---------------- */
const STORE_KEY = "memoryTickets";

function loadTickets() {
    try {
        return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
    } catch {
        return [];
    }
}

function persist() {
    try {
        localStorage.setItem(STORE_KEY, JSON.stringify(state.tickets));
        return true;
    } catch (e) {
        toast("Storage full — try fewer or smaller photos");
        return false;
    }
}

/* ---------------- Icons ---------------- */
const I = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4M12 2v14"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v13"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>'
};

/* ---------------- State ---------------- */
const state = {
    tickets: loadTickets(),
    view: "gallery",
    activeId: null,
    draftPhoto: null,
    stream: null,
    menuOpen: false
};

const appEl = document.getElementById("app");
const fileInput = document.getElementById("fileInput");

/* ---------------- Helpers ---------------- */
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function esc(s) {
    return String(s || "").replace(/[&<>"]/g, c =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function fmtDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${y}.${m}.${d}`;
}

function today() {
    const d = new Date();
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function stopCamera() {
    if (state.stream) {
        state.stream.getTracks().forEach(t => t.stop());
        state.stream = null;
    }
}

function go(view, id) {
    stopCamera();
    state.menuOpen = false;
    state.view = view;
    state.activeId = id ?? state.activeId;
    render();
}

let toastTimer;
function toast(msg) {
    let el = document.querySelector(".toast");
    if (!el) {
        el = document.createElement("div");
        el.className = "toast";
        document.getElementById("phone").appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

/* Downscale + compress an image source to a JPEG data URL */
function compress(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const max = 1080;
            let { width: w, height: h } = img;
            if (w > max || h > max) {
                const r = Math.min(max / w, max / h);
                w = Math.round(w * r);
                h = Math.round(h * r);
            }
            const c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            c.getContext("2d").drawImage(img, 0, 0, w, h);
            resolve(c.toDataURL("image/jpeg", 0.82));
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

/* ---------------- Views ---------------- */
function render() {
    if (state.view === "gallery") renderGallery();
    else if (state.view === "form") renderForm();
    else if (state.view === "ticket") renderTicket();
}

function renderGallery() {
    const t = state.tickets;
    const cards = t.length
        ? `<div class="grid">${t.map(x => `
            <div class="stub-card" data-open="${x.id}">
                <img class="ph" src="${x.photo}" alt="${esc(x.title)}">
                <div class="meta">
                    <div class="t">${esc(x.title) || "Untitled"}</div>
                    <div class="d">${esc(fmtDate(x.date))}${x.location ? " · " + esc(x.location) : ""}</div>
                </div>
            </div>`).join("")}</div>`
        : `<div class="empty">
                <div class="em">🎞️</div>
                <p>No memories yet.<br>Snap a photo and turn it into a ticket stub.</p>
           </div>`;

    appEl.innerHTML = `
        <div class="gallery-head">
            <div class="big">Memories</div>
            <div class="sub">${t.length} ticket${t.length === 1 ? "" : "s"} collected</div>
        </div>
        <div class="scroll">${cards}</div>
        <button class="fab" id="newBtn">${I.plus}<span>New Memory</span></button>
    `;

    appEl.querySelectorAll("[data-open]").forEach(el =>
        el.addEventListener("click", () => go("ticket", el.dataset.open)));
    document.getElementById("newBtn").addEventListener("click", startCreate);
}

function renderForm() {
    const editing = !!state.activeId;
    const t = editing ? state.tickets.find(x => x.id === state.activeId) : null;
    const photo = state.draftPhoto || (t && t.photo) || null;

    appEl.innerHTML = `
        <div class="topbar">
            <button class="iconbtn" id="backBtn">${I.back}</button>
            <h1>${editing ? "Edit Ticket" : "New Memory"}</h1>
            <button class="iconbtn hidden">${I.menu}</button>
        </div>
        <div class="scroll">
            <div class="capture-photo" id="photoBox">
                ${photo
                    ? `<img id="preview" src="${photo}" alt="preview">`
                    : `<div class="placeholder"><div class="em">📷</div><p>Take or upload a photo</p></div>`}
            </div>
            <div class="cam-row">
                <button class="btn" id="camBtn">${I.camera}<span>Camera</span></button>
                <button class="btn" id="upBtn">${I.upload}<span>Upload</span></button>
            </div>
            <div class="field">
                <label>Title</label>
                <input id="f_title" maxlength="60" placeholder="Ghibli Park"
                    value="${t ? esc(t.title) : ""}">
            </div>
            <div class="field">
                <label>Location</label>
                <input id="f_loc" maxlength="60" placeholder="Nagakute"
                    value="${t ? esc(t.location) : ""}">
            </div>
            <div class="field">
                <label>Date</label>
                <input id="f_date" type="date" value="${t ? t.date : today()}">
            </div>
            <div class="field">
                <label>Note</label>
                <textarea id="f_note" maxlength="140"
                    placeholder="howl's moving castle!">${t ? esc(t.note) : ""}</textarea>
            </div>
        </div>
        <div class="save-bar">
            <button class="btn primary" id="saveBtn">${editing ? "Save Changes" : "Create Ticket Stub"}</button>
        </div>
    `;

    document.getElementById("backBtn").addEventListener("click", () =>
        go(editing ? "ticket" : "gallery"));
    document.getElementById("camBtn").addEventListener("click", openCamera);
    document.getElementById("upBtn").addEventListener("click", () => fileInput.click());
    document.getElementById("saveBtn").addEventListener("click", saveTicket);
}

function renderTicket() {
    const t = state.tickets.find(x => x.id === state.activeId);
    if (!t) return go("gallery");

    appEl.innerHTML = `
        <div class="topbar">
            <button class="iconbtn" id="backBtn">${I.back}</button>
            <h1>Ticket Stub</h1>
            <button class="iconbtn" id="menuBtn">${I.menu}</button>
        </div>
        <div class="ticket-wrap">
            <div class="ticket" id="ticketCard">
                <div class="stamp"><img src="${t.photo}" alt="${esc(t.title)}"></div>
                <div class="title">${esc(t.title) || "Untitled"}</div>
                <div class="facts">
                    ${t.location ? `<span>${I.pin}${esc(t.location)}</span>` : ""}
                    ${t.date ? `<span>${I.cal}${esc(fmtDate(t.date))}</span>` : ""}
                </div>
                <div class="perf"></div>
                <div class="note">
                    <div class="q">&ldquo;</div>
                    <p>${esc(t.note) || "A memory worth keeping."}</p>
                </div>
            </div>
        </div>
        <div class="actions">
            <button class="round" id="dlBtn" title="Download">${I.download}</button>
            <button class="edit-pill" id="editBtn">Edit</button>
            <button class="round" id="shBtn" title="Share">${I.share}</button>
        </div>
        ${state.menuOpen ? `
            <div class="menu" id="menu">
                <button class="danger" id="delBtn">${I.trash}<span>Delete ticket</span></button>
            </div>` : ""}
    `;

    document.getElementById("backBtn").addEventListener("click", () => go("gallery"));
    document.getElementById("editBtn").addEventListener("click", () => {
        state.draftPhoto = null;
        go("form", t.id);
    });
    document.getElementById("dlBtn").addEventListener("click", () => exportTicket(t, "download"));
    document.getElementById("shBtn").addEventListener("click", () => exportTicket(t, "share"));
    document.getElementById("menuBtn").addEventListener("click", () => {
        state.menuOpen = !state.menuOpen;
        render();
    });
    const del = document.getElementById("delBtn");
    if (del) del.addEventListener("click", () => deleteTicket(t.id));
}

/* ---------------- Photo capture ---------------- */
function startCreate() {
    state.draftPhoto = null;
    state.activeId = null;
    go("form");
}

async function openCamera() {
    const box = document.getElementById("photoBox");
    try {
        state.stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });
        box.innerHTML = `<video id="cam" autoplay playsinline muted></video>`;
        document.getElementById("cam").srcObject = state.stream;
        // Replace the button with a clone to drop the prior openCamera listener
        const old = document.getElementById("camBtn");
        const camBtn = old.cloneNode(false);
        camBtn.id = "camBtn";
        camBtn.innerHTML = `${I.camera}<span>Capture</span>`;
        camBtn.classList.add("primary");
        camBtn.addEventListener("click", snap);
        old.replaceWith(camBtn);
    } catch {
        toast("Camera unavailable — use Upload instead");
    }
}

function snap() {
    const v = document.getElementById("cam");
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    stopCamera();
    compress(c.toDataURL("image/jpeg", 0.9)).then(d => {
        state.draftPhoto = d;
        render();
    });
}

fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => compress(reader.result).then(d => {
        state.draftPhoto = d;
        fileInput.value = "";
        render();
    });
    reader.readAsDataURL(file);
});

/* ---------------- Save / delete ---------------- */
function saveTicket() {
    const get = id => document.getElementById(id).value.trim();
    const title = get("f_title");
    const editing = !!state.activeId;
    const existing = editing ? state.tickets.find(x => x.id === state.activeId) : null;
    const photo = state.draftPhoto || (existing && existing.photo);

    if (!photo) return toast("Add a photo first");
    if (!title) return toast("Give your memory a title");

    const data = {
        title,
        location: get("f_loc"),
        date: get("f_date") || today(),
        note: get("f_note"),
        photo
    };

    if (editing) {
        Object.assign(existing, data);
    } else {
        state.tickets.unshift({ id: uid(), createdAt: Date.now(), ...data });
        state.activeId = state.tickets[0].id;
    }

    if (persist()) {
        state.draftPhoto = null;
        go("ticket", state.activeId);
        toast(editing ? "Ticket updated" : "Ticket stub created");
    }
}

function deleteTicket(id) {
    if (!confirm("Delete this memory ticket? This can't be undone.")) return;
    state.tickets = state.tickets.filter(x => x.id !== id);
    persist();
    go("gallery");
    toast("Ticket deleted");
}

/* ---------------- Export: render ticket to PNG ---------------- */
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = "";
    for (const w of words) {
        const test = line ? line + " " + w : w;
        if (ctx.measureText(test).width > maxW && line) {
            lines.push(line);
            line = w;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);
    return lines;
}

function drawTicket(t) {
    return new Promise(resolve => {
        const S = 3;                 // supersample for crisp output
        const W = 560, PAD = 40;
        const cv = document.createElement("canvas");
        const ctx = cv.getContext("2d");

        const img = new Image();
        img.onload = () => {
            const photoW = W - PAD * 2;
            const photoH = photoW;            // square
            let y = PAD;

            // measure dynamic content height
            ctx.font = `800 44px Inter, sans-serif`;
            const titleLines = wrap(ctx, t.title || "Untitled", photoW);
            ctx.font = `600 38px Caveat, cursive`;
            const noteLines = wrap(ctx, t.note || "A memory worth keeping.", photoW - 34);

            const H = PAD + photoH + 18 + 36 + titleLines.length * 50
                    + 26 + 30 + 44 + noteLines.length * 44 + PAD;

            cv.width = W * S;
            cv.height = H * S;
            ctx.scale(S, S);
            ctx.textBaseline = "top";

            // card
            ctx.fillStyle = "#ffffff";
            roundRect(ctx, 0, 0, W, H, 28);
            ctx.fill();

            // photo with stamp border
            ctx.fillStyle = "#ffffff";
            roundRect(ctx, PAD - 8, y - 8, photoW + 16, photoH + 16, 8);
            ctx.fill();
            ctx.save();
            roundRect(ctx, PAD, y, photoW, photoH, 6);
            ctx.clip();
            const ar = img.width / img.height;
            let dw = photoW, dh = photoW / ar, dx = PAD, dy = y;
            if (dh < photoH) { dh = photoH; dw = photoH * ar; dx = PAD - (dw - photoW) / 2; }
            else { dy = y - (dh - photoH) / 2; }
            ctx.drawImage(img, dx, dy, dw, dh);
            ctx.restore();
            y += photoH + 34;

            // title
            ctx.fillStyle = "#1a1a1a";
            ctx.font = `800 44px Inter, sans-serif`;
            for (const ln of titleLines) { ctx.fillText(ln, PAD, y); y += 50; }
            y += 4;

            // facts
            ctx.fillStyle = "#8a8a8a";
            ctx.font = `500 24px Inter, sans-serif`;
            const parts = [];
            if (t.location) parts.push("◍  " + t.location);
            if (t.date) parts.push("▦  " + fmtDate(t.date));
            ctx.fillText(parts.join("      "), PAD, y);
            y += 44;

            // perforation
            ctx.strokeStyle = "#d8d8d8";
            ctx.lineWidth = 3;
            ctx.setLineDash([9, 8]);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = "#0e0e10";
            ctx.beginPath(); ctx.arc(0, y, 16, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.arc(W, y, 16, 0, 7); ctx.fill();
            y += 34;

            // note
            ctx.fillStyle = "#c4c4c4";
            ctx.font = `600 64px Caveat, cursive`;
            ctx.fillText("“", PAD, y - 14);
            ctx.fillStyle = "#4a4a4a";
            ctx.font = `600 38px Caveat, cursive`;
            let ny = y + 6;
            for (const ln of noteLines) { ctx.fillText(ln, PAD + 34, ny); ny += 44; }

            cv.toBlob(b => resolve(b), "image/png");
        };
        img.onerror = () => resolve(null);
        img.src = t.photo;
    });
}

async function exportTicket(t, mode) {
    try {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
    } catch {}
    const blob = await drawTicket(t);
    if (!blob) return toast("Couldn't render the ticket");

    const safe = (t.title || "memory").replace(/[^\w\-]+/g, "_").toLowerCase();
    const fname = `ticket-${safe}.png`;

    if (mode === "share") {
        const file = new File([blob], fname, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: t.title || "Memory Ticket" });
                return;
            } catch (e) {
                if (e && e.name === "AbortError") return;
            }
        }
        toast("Sharing not supported — downloading instead");
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fname;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (mode === "download") toast("Ticket saved as image");
}

/* ---------------- Boot ---------------- */
document.addEventListener("click", e => {
    if (state.menuOpen && !e.target.closest("#menu") && !e.target.closest("#menuBtn")) {
        state.menuOpen = false;
        if (state.view === "ticket") render();
    }
});

render();
