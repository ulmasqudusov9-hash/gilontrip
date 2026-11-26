const CLIENT_KEY = "gilontrip_client_session_v1";
const ACCOUNTS_KEY = "gilontrip_accounts_v1";
const LISTINGS_KEY = "gilontrip_listings_v2";
const PAYMENTS_KEY = "gilontrip_payments_v2";
const USERS_LIST_KEY = "gilontrip_registered_users_v2";
const CARD_KEY = "gilontrip_admin_card_v1";
const LEDGER_KEY = "gilontrip_ledger_v1";

let currentCategory = "barchasi";
let base64Image = "";
let currentClient = JSON.parse(localStorage.getItem(CLIENT_KEY)) || null;
let accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || [];

let listings = JSON.parse(localStorage.getItem(LISTINGS_KEY)) || [];
let payments = JSON.parse(localStorage.getItem(PAYMENTS_KEY)) || [];
let registeredUsers = JSON.parse(localStorage.getItem(USERS_LIST_KEY)) || [
  { name: "Alijon Valiyev", paid: true },
  { name: "Sardor Komilov", paid: false }
];
let cardInfo = JSON.parse(localStorage.getItem(CARD_KEY)) || {
  number: "8600 5544 3322 1100",
  owner: "Norboyev Nazarbek"
};
let ledger = JSON.parse(localStorage.getItem(LEDGER_KEY)) || [];

function showAuthNotice(message, type = "warn", suggestedLogin = "") {
  const box = document.getElementById("authNoticeBox");
  box.className = "auth-notice" + (type === "error" ? " error" : "");
  box.innerHTML = `
    <div>${escapeHtml(message)}</div>
    ${suggestedLogin ? `<button type="button" class="auth-notice-action" onclick="moveToRegister('${escapeAttr(suggestedLogin)}')"><i class="fa-solid fa-user-plus"></i> "${escapeHtml(suggestedLogin)}" bilan ro'yxatdan o'tish</button>` : ""}
  `;
  box.classList.remove("hidden");
}

function clearAuthNotice() {
  const box = document.getElementById("authNoticeBox");
  box.classList.add("hidden");
  box.innerHTML = "";
}

function moveToRegister(loginVal) {
  setEntryMode("register");
  document.getElementById("entryRegLogin").value = loginVal;
  showAuthNotice(`"${loginVal}" loginini ro'yxatdan o'tkazish uchun ism-familya va parol kiriting.`, "warn");
  document.getElementById("entryRegName").focus();
}

function syncGate() {
  const gate = document.getElementById("entryGate");
  const shell = document.getElementById("appShell");
  if (currentClient) {
    gate.classList.add("hidden");
    shell.classList.add("unlocked");
    document.getElementById("drawerClientName").textContent = currentClient.name;
  } else {
    gate.classList.remove("hidden");
    shell.classList.remove("unlocked");
  }
  renderCardDetails();
}

function renderCardDetails() {
  document.getElementById("displayCardNum").textContent = cardInfo.number;
  document.getElementById("displayCardOwner").textContent = cardInfo.owner;
}

function setEntryMode(mode) {
  clearAuthNotice();
  const isLogin = mode === "login";
  document.getElementById("modeLoginBtn").classList.toggle("active", isLogin);
  document.getElementById("modeRegBtn").classList.toggle("active", !isLogin);
  document.getElementById("entryLoginForm").classList.toggle("hidden", !isLogin);
  document.getElementById("entryRegForm").classList.toggle("hidden", isLogin);
}

function submitEntryLogin(e) {
  e.preventDefault();
  clearAuthNotice();
  const rawLogin = document.getElementById("entryLoginUser").value.trim();
  const loginKey = rawLogin.toLowerCase();
  const passVal = document.getElementById("entryLoginPass").value;
  if (!loginKey) return;

  const foundAccount = accounts.find(acc => acc.login === loginKey);
  if (!foundAccount) {
    showAuthNotice("Bu login ro'yxatdan o'tmagan! Avval ro'yxatdan o'ting.", "warn", rawLogin);
    return;
  }

  if (foundAccount.password !== passVal) {
    showAuthNotice("Parol noto'g'ri! Qayta kiriting.", "error");
    return;
  }

  const foundUser = registeredUsers.find(u => u.name.toLowerCase() === foundAccount.name.toLowerCase());
  if (foundUser && foundUser.blocked) {
    showAuthNotice("To'lov qilmaganligingiz sababli profilingiz Admin tomonidan o'chirib qo'yilgan.", "error");
    return;
  }

  currentClient = { name: foundAccount.name, login: foundAccount.login };
  localStorage.setItem(CLIENT_KEY, JSON.stringify(currentClient));
  document.getElementById("entryLoginPass").value = "";
  syncGate();
  renderListings();
}

function submitEntryRegister(e) {
  e.preventDefault();
  clearAuthNotice();
  const fullName = document.getElementById("entryRegName").value.trim();
  const loginRaw = document.getElementById("entryRegLogin").value.trim();
  const loginKey = loginRaw.toLowerCase();
  const passVal = document.getElementById("entryRegPass").value;
  if (!fullName || !loginKey || !passVal) return;

  const alreadyUsed = accounts.some(acc => acc.login === loginKey);
  if (alreadyUsed) {
    showAuthNotice("Bu login allaqachon ishlatilgan! Boshqa yangi login kiriting.", "error");
    return;
  }

  accounts.push({
    name: fullName,
    login: loginKey,
    password: passVal
  });
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));

  if (!registeredUsers.some(u => u.name.toLowerCase() === fullName.toLowerCase())) {
    registeredUsers.push({ name: fullName, paid: false });
    localStorage.setItem(USERS_LIST_KEY, JSON.stringify(registeredUsers));
  }

  currentClient = { name: fullName, login: loginKey };
  localStorage.setItem(CLIENT_KEY, JSON.stringify(currentClient));
  document.getElementById("entryRegName").value = "";
  document.getElementById("entryRegLogin").value = "";
  document.getElementById("entryRegPass").value = "";
  syncGate();
  renderListings();
  renderAdminTables();
}

function logoutClient() {
  currentClient = null;
  localStorage.removeItem(CLIENT_KEY);
  document.getElementById("entryLoginPass").value = "";
  document.getElementById("entryRegPass").value = "";
  clearAuthNotice();
  syncGate();
}

function toggleDrawer(open) {
  document.getElementById("drawerOverlay").classList.toggle("active", open);
  document.getElementById("drawerMenu").classList.toggle("active", open);
}

function selectDrawerCategory(cat, btn) {
  currentCategory = cat;
  document.querySelectorAll(".drawer-item").forEach(i => i.classList.remove("active"));
  if (btn) btn.classList.add("active");
  toggleDrawer(false);
  switchTab("tabListings", document.getElementById("bNavHome"));
  renderListings();
}

function selectDrawerTab(tabId, btn) {
  document.querySelectorAll(".drawer-item").forEach(i => i.classList.remove("active"));
  if (btn) btn.classList.add("active");
  toggleDrawer(false);
  switchTab(tabId, document.getElementById("bNavPay"));
}

function switchTab(tabId, btn) {
  ["tabListings", "tabPayment"].forEach(id => {
    document.getElementById(id).classList.toggle("hidden", id !== tabId);
  });
  if (btn) {
    document.querySelectorAll(".bar-item").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }
}

function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    base64Image = e.target.result;
    document.getElementById("imagePreview").src = base64Image;
    document.getElementById("uploadBox").style.display = "none";
    document.getElementById("previewContainer").style.display = "block";
  };
  reader.readAsDataURL(file);
}

function removeSelectedImage() {
  base64Image = "";
  document.getElementById("postImageFile").value = "";
  document.getElementById("uploadBox").style.display = "block";
  document.getElementById("previewContainer").style.display = "none";
}

function openAddModal() {
  document.getElementById("addModal").classList.add("open");
}

function closeAddModal() {
  document.getElementById("addModal").classList.remove("open");
}

function saveNewListing(e) {
  e.preventDefault();
  const category = document.getElementById("postCat").value;
  const title = document.getElementById("postTitle").value.trim();
  const price = document.getElementById("postPrice").value.trim();
  const desc = document.getElementById("postDesc").value.trim();

  listings.unshift({
    id: Date.now(),
    category,
    title,
    price,
    desc,
    author: currentClient ? currentClient.name : "Mijoz",
    image: base64Image || ""
  });

  localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
  closeAddModal();
  removeSelectedImage();
  document.getElementById("postTitle").value = "";
  document.getElementById("postPrice").value = "";
  document.getElementById("postDesc").value = "";
  renderListings();
  renderAdminTables();
}

function renderListings() {
  const container = document.getElementById("listingsContainer");
  const query = (document.getElementById("searchInput").value || "").toLowerCase().trim();

  const filtered = listings.filter(item => {
    const matchCat = currentCategory === "barchasi" || item.category === currentCategory;
    const matchQuery = !query || item.title.toLowerCase().includes(query) || item.desc.toLowerCase().includes(query);
    return matchCat && matchQuery;
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div class="client-card-box" style="text-align:center; padding:2.2rem 1rem;">
        <i class="fa-solid fa-folder-open" style="font-size:2.2rem; color:var(--blue-accent); margin-bottom:8px;"></i>
        <h4 style="color:#ffffff; margin-bottom:6px;">E'lonlar topilmadi</h4>
        <p style="font-size:0.8rem; color:var(--blue-muted); margin-bottom:14px;">Birinchi bo'lib rasm bilan e'lon qo'shing</p>
        <button type="button" class="btn-gold" onclick="openAddModal()">
          <i class="fa-solid fa-plus-circle"></i> E'lon qo'shish
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <article class="app-card">
      <div class="app-card-img">
        ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.title)}" />` : `<div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--blue-muted); font-size:2rem;"><i class="fa-solid fa-image"></i></div>`}
        <span class="cat-badge">${escapeHtml(item.category.toUpperCase())}</span>
      </div>
      <div class="app-card-body">
        <h3 class="app-card-title">${escapeHtml(item.title)}</h3>
        <p class="app-card-desc">${escapeHtml(item.desc)}</p>
        <div class="app-card-author"><i class="fa-solid fa-user"></i> ${escapeHtml(item.author)}</div>
        <div class="app-card-foot">
          <span class="price-tag">${escapeHtml(item.price)}</span>
          <button type="button" class="btn-blue" style="width:auto; min-height:36px; padding:4px 12px; font-size:0.76rem;" onclick="showContactInfo('${escapeAttr(item.author)}')">Bog'lanish</button>
        </div>
      </div>
    </article>
  `).join("");
}

function showContactInfo(author) {
  const existing = document.getElementById("contactToast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "contactToast";
  toast.style.cssText = "position:fixed;bottom:76px;left:1rem;right:1rem;z-index:550;background:#0c214d;border:1px solid #38bdf8;color:#fff;padding:10px 14px;border-radius:10px;font-size:0.82rem;display:flex;justify-content:space-between;align-items:center;";
  toast.innerHTML = `<span><i class="fa-solid fa-phone" style="color:#38bdf8;"></i> Aloqa: <strong>${escapeHtml(author)}</strong></span><button type="button" style="background:none;border:none;color:#93c5fd;font-weight:800;cursor:pointer;" onclick="this.parentElement.remove()">Yopish</button>`;
  document.body.appendChild(toast);
}

function submitPayment(e) {
  e.preventDefault();
  const payerName = document.getElementById("payName").value.trim();
  const phone = document.getElementById("payPhone").value.trim();
  payments.unshift({
    id: Date.now(),
    payerName,
    phone,
    status: "pending"
  });
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
  document.getElementById("payName").value = "";
  document.getElementById("payPhone").value = "";
  renderAdminTables();
}

/* ADMIN PANEL BO'LIMLARI */
function openAdminModal() {
  document.getElementById("adminModal").classList.add("open");
}

function closeAdminModal() {
  document.getElementById("adminModal").classList.remove("open");
}

function verifyAdminLogin(e) {
  e.preventDefault();
  const login = document.getElementById("adminUserInput").value.trim();
  const pass = document.getElementById("adminPassInput").value.trim();
  if (login === "olmasbek" && pass === "78879009") {
    document.getElementById("adminLoginStep").classList.add("hidden");
    document.getElementById("adminAreaStep").classList.remove("hidden");

    document.getElementById("adminCardNumInput").value = cardInfo.number;
    document.getElementById("adminCardOwnerInput").value = cardInfo.owner;

    renderAdminTables();
  }
}

function lockAdminModal() {
  document.getElementById("adminUserInput").value = "";
  document.getElementById("adminPassInput").value = "";
  document.getElementById("adminAreaStep").classList.add("hidden");
  document.getElementById("adminLoginStep").classList.remove("hidden");
}

function saveAdminCardDetails() {
  const num = document.getElementById("adminCardNumInput").value.trim();
  const owner = document.getElementById("adminCardOwnerInput").value.trim();
  if (!num || !owner) return;

  cardInfo = { number: num, owner: owner };
  localStorage.setItem(CARD_KEY, JSON.stringify(cardInfo));
  renderCardDetails();
}

function toggleBlockUser(idx) {
  registeredUsers[idx].blocked = !registeredUsers[idx].blocked;
  localStorage.setItem(USERS_LIST_KEY, JSON.stringify(registeredUsers));
  renderAdminTables();
}

function addLedgerEntry() {
  const title = document.getElementById("ledgerTitle").value.trim();
  const amount = document.getElementById("ledgerAmount").value.trim();
  const type = document.getElementById("ledgerType").value;

  if (!title || !amount) return;

  ledger.unshift({ title, amount, type, date: new Date().toLocaleDateString() });
  localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));

  document.getElementById("ledgerTitle").value = "";
  document.getElementById("ledgerAmount").value = "";
  renderAdminTables();
}

function decideAdminPayment(id, status) {
  const target = payments.find(p => p.id === id);
  if (!target) return;
  target.status = status;
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
  renderAdminTables();
}

function adminDeleteListing(id) {
  listings = listings.filter(x => x.id !== id);
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
  renderListings();
  renderAdminTables();
}

function renderAdminTables() {
  const uBody = document.getElementById("adminUsersStatusBody");
  if (!registeredUsers.length) {
    uBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Foydalanuvchilar yo'q</td></tr>`;
  } else {
    uBody.innerHTML = registeredUsers.map((u, idx) => `
      <tr>
        <td>${escapeHtml(u.name)}</td>
        <td>${u.paid ? `<span style="color:var(--blue-accent);">To'langan</span>` : `<span style="color:var(--gold-accent);">To'lanmagan</span>`}</td>
        <td>
          <button type="button" class="btn-danger-sm" onclick="toggleBlockUser(${idx})">
            ${u.blocked ? "Tiklash" : "O'chirish (Yopish)"}
          </button>
        </td>
      </tr>
    `).join("");
  }

  const lBody = document.getElementById("adminLedgerBody");
  if (!ledger.length) {
    lBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Daftarda yozuvlar yo'q</td></tr>`;
  } else {
    lBody.innerHTML = ledger.map(item => `
      <tr>
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.amount)} UZS</td>
        <td><strong style="color:${item.type === 'kirim' ? 'var(--blue-accent)' : 'var(--danger)'};">${item.type.toUpperCase()}</strong></td>
      </tr>
    `).join("");
  }

  const pBody = document.getElementById("adminPaymentsBody");
  if (!payments.length) {
    pBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">To'lovlar yo'q</td></tr>`;
  } else {
    pBody.innerHTML = payments.map(p => `
      <tr>
        <td>${escapeHtml(p.payerName)}</td>
        <td>${escapeHtml(p.phone)}</td>
        <td>${p.status === "approved" ? "1 oy ochiq" : p.status === "rejected" ? "Yo'q" : "Kutilmoqda"}</td>
        <td style="display:flex; gap:4px;">
          <button type="button" class="btn-approve-sm" onclick="decideAdminPayment(${p.id}, 'approved')">1 oy och</button>
          <button type="button" class="btn-danger-sm" onclick="decideAdminPayment(${p.id}, 'rejected')">Yo'q</button>
        </td>
      </tr>
    `).join("");
  }

  const listBody = document.getElementById("adminListingsBody");
  if (!listings.length) {
    listBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">E'lonlar yo'q</td></tr>`;
  } else {
    listBody.innerHTML = listings.map(item => `
      <tr>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.title)}</td>
        <td><button type="button" class="btn-danger-sm" onclick="adminDeleteListing(${item.id})">O'chirish</button></td>
      </tr>
    `).join("");
  }
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, "&#39;");
}

syncGate();
renderListings();
