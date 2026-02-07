// Auth UI + Validation Demo (HTML/CSS/JS)
// - localStorage-backed "users"
// - login/signup/forgot flows
// - strong validation + clear errors

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const views = {
  login: $("#loginForm"),
  signup: $("#signupForm"),
  forgot: $("#forgotForm"),
};

const tabs = $$(".tab");
const alertBox = $("#alert");
const resetDemoBtn = $("#resetDemo");

const strengthBar = $("#strengthBar");
const signupPassword = $("#signupPassword");

// ---------- Utilities ----------
function showAlert(type, msg) {
  alertBox.className = `alert show ${type}`;
  alertBox.textContent = msg;
}

function clearAlert() {
  alertBox.className = "alert";
  alertBox.textContent = "";
}

function switchView(name) {
  clearAlert();

  tabs.forEach(t => t.classList.toggle("active", t.dataset.view === name));
  Object.entries(views).forEach(([k, el]) => el.classList.toggle("active", k === name));

  // Clear inline errors when switching
  clearAllErrors();

  // Focus first input in active view
  const firstInput = $(`.view.active input`);
  if (firstInput) firstInput.focus();
}

function setFieldError(inputId, msg) {
  const input = $("#" + inputId);
  const hint = document.querySelector(`[data-error-for="${inputId}"]`);
  if (!input || !hint) return;

  input.classList.add("invalid");
  hint.textContent = msg;
}

function clearFieldError(inputId) {
  const input = $("#" + inputId);
  const hint = document.querySelector(`[data-error-for="${inputId}"]`);
  if (!input || !hint) return;

  input.classList.remove("invalid");
  hint.textContent = "";
}

function clearAllErrors() {
  $$("input").forEach(i => i.classList.remove("invalid"));
  $$("[data-error-for]").forEach(h => (h.textContent = ""));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem("auth_users") || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem("auth_users", JSON.stringify(users));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem("auth_session") || "null");
  } catch {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem("auth_session", JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem("auth_session");
}

function hashPassword(plain) {
  // Not real security. Just a demo to avoid storing raw password.
  // If you want real auth, you need a backend.
  let h = 0;
  for (let i = 0; i < plain.length; i++) {
    h = (h << 5) - h + plain.charCodeAt(i);
    h |= 0;
  }
  return `h${Math.abs(h)}`;
}

// ---------- Validation ----------
function isValidEmail(email) {
  // Reasonable basic email check (not perfect, but solid)
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

function passwordScore(pw) {
  const s = String(pw || "");
  let score = 0;

  const rules = {
    len: s.length >= 8,
    lower: /[a-z]/.test(s),
    upper: /[A-Z]/.test(s),
    num: /[0-9]/.test(s),
    sym: /[^A-Za-z0-9]/.test(s),
  };

  score += rules.len ? 1 : 0;
  score += rules.lower ? 1 : 0;
  score += rules.upper ? 1 : 0;
  score += rules.num ? 1 : 0;
  score += rules.sym ? 1 : 0;

  // Penalize common weak patterns
  if (/password|123456|qwerty|letmein/i.test(s)) score = Math.max(0, score - 2);

  return { score, rules };
}

function updateStrengthUI(pw) {
  const { score } = passwordScore(pw);
  const pct = (score / 5) * 100;
  strengthBar.style.width = `${pct}%`;

  // No explicit colors per your environment rules; bar just grows.
}

// ---------- UI events ----------
tabs.forEach(tab => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

$$("[data-switch]").forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.switch));
});

$$("[data-toggle]").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.getAttribute("data-toggle");
    const input = $("#" + id);
    if (!input) return;

    const isPass = input.type === "password";
    input.type = isPass ? "text" : "password";
    btn.textContent = isPass ? "Hide" : "Show";
  });
});

signupPassword.addEventListener("input", (e) => {
  updateStrengthUI(e.target.value);
});

// ---------- Forms ----------
$("#signupForm").addEventListener("submit", (e) => {
  e.preventDefault();
  clearAlert();
  clearAllErrors();

  const name = $("#signupName").value.trim();
  const email = normalizeEmail($("#signupEmail").value);
  const password = $("#signupPassword").value;
  const confirm = $("#signupConfirm").value;

  let ok = true;

  if (name.length < 2) {
    setFieldError("signupName", "Name must be at least 2 characters.");
    ok = false;
  }

  if (!email) {
    setFieldError("signupEmail", "Email is required.");
    ok = false;
  } else if (!isValidEmail(email)) {
    setFieldError("signupEmail", "Enter a valid email address.");
    ok = false;
  }

  const { score, rules } = passwordScore(password);
  if (!password) {
    setFieldError("signupPassword", "Password is required.");
    ok = false;
  } else if (score < 5) {
    const missing = [];
    if (!rules.len) missing.push("8+ chars");
    if (!rules.upper) missing.push("uppercase");
    if (!rules.lower) missing.push("lowercase");
    if (!rules.num) missing.push("number");
    if (!rules.sym) missing.push("symbol");
    setFieldError("signupPassword", `Weak password. Missing: ${missing.join(", ")}.`);
    ok = false;
  }

  if (!confirm) {
    setFieldError("signupConfirm", "Please confirm your password.");
    ok = false;
  } else if (confirm !== password) {
    setFieldError("signupConfirm", "Passwords do not match.");
    ok = false;
  }

  if (!ok) {
    showAlert("bad", "Fix the errors and try again.");
    return;
  }

  const users = getUsers();
  const exists = users.some(u => u.email === email);
  if (exists) {
    setFieldError("signupEmail", "This email is already registered. Try logging in.");
    showAlert("bad", "Account already exists.");
    return;
  }

  users.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name,
    email,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  });

  saveUsers(users);

  showAlert("good", "Account created ✅ You can login now.");
  // Optional: auto switch to login and prefill email
  switchView("login");
  $("#loginEmail").value = email;
  $("#loginPassword").value = "";
});

$("#loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  clearAlert();
  clearAllErrors();

  const email = normalizeEmail($("#loginEmail").value);
  const password = $("#loginPassword").value;
  const remember = $("#rememberMe").checked;

  let ok = true;

  if (!email) {
    setFieldError("loginEmail", "Email is required.");
    ok = false;
  } else if (!isValidEmail(email)) {
    setFieldError("loginEmail", "Enter a valid email address.");
    ok = false;
  }

  if (!password) {
    setFieldError("loginPassword", "Password is required.");
    ok = false;
  }

  if (!ok) {
    showAlert("bad", "Fix the errors and try again.");
    return;
  }

  const users = getUsers();
  const user = users.find(u => u.email === email);

  if (!user || user.passwordHash !== hashPassword(password)) {
    showAlert("bad", "Invalid email or password.");
    setFieldError("loginEmail", " ");
    setFieldError("loginPassword", " ");
    return;
  }

  saveSession({
    userId: user.id,
    email: user.email,
    createdAt: new Date().toISOString(),
    remember,
  });

  showAlert("good", `Welcome back, ${user.name} ✅ (Session stored locally)`);
});

$("#forgotForm").addEventListener("submit", (e) => {
  e.preventDefault();
  clearAlert();
  clearAllErrors();

  const email = normalizeEmail($("#forgotEmail").value);

  if (!email) {
    setFieldError("forgotEmail", "Email is required.");
    showAlert("bad", "Enter your email.");
    return;
  }
  if (!isValidEmail(email)) {
    setFieldError("forgotEmail", "Enter a valid email address.");
    showAlert("bad", "Invalid email format.");
    return;
  }

  const users = getUsers();
  const user = users.find(u => u.email === email);

  // Security note: real apps do NOT reveal whether email exists.
  // Here we keep it generic but still helpful.
  showAlert("good", "If an account exists for that email, a reset link has been “sent”. ✅");
  $("#forgotEmail").value = "";
});

// ---------- Demo reset ----------
resetDemoBtn.addEventListener("click", () => {
  localStorage.removeItem("auth_users");
  localStorage.removeItem("auth_session");
  clearAllErrors();
  clearAlert();
  updateStrengthUI("");
  showAlert("good", "Demo storage cleared ✅ You can sign up again.");
  switchView("signup");
});

// ---------- Initialize ----------
(function init() {
  updateStrengthUI("");

  // If session exists, show message (optional)
  const session = getSession();
  if (session?.email) {
    showAlert("good", `Session found for ${session.email} ✅ (localStorage)`);
  }
})();
