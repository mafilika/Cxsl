export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}
export function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
export function isValidSaPhone(phone) { return /^(\+27|0)[6-8][0-9]{8}$/.test(String(phone).replace(/\s/g, "")); }
export function isNonEmpty(str, min = 1) { return typeof str === "string" && str.trim().length >= min; }
export function stripDangerousChars(str) { return String(str ?? "").replace(/<[^>]*>/g, "").trim(); }

export function validateForm(formEl, rules) {
  const errors = {};
  for (const [name, rule] of Object.entries(rules)) {
    const input = formEl.querySelector(`[name="${name}"]`);
    const wrapper = formEl.querySelector(`[data-field="${name}"]`);
    const value = input?.value ?? "";
    const result = rule(value);
    input?.classList.toggle("input-error", result !== true);
    const errorEl = wrapper?.querySelector(".field-error");
    if (result !== true) { errors[name] = result; if (errorEl) errorEl.textContent = result; }
    else if (errorEl) errorEl.textContent = "";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function debounceSubmit(button, handler, cooldownMs = 3000) {
  let locked = false;
  return async (...args) => {
    if (locked) return;
    locked = true;
    button.disabled = true;
    try { await handler(...args); } finally {
      setTimeout(() => { locked = false; button.disabled = false; }, cooldownMs);
    }
  };
}
