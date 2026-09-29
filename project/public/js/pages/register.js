import { renderHeader, renderFooter } from "../modules/partials.js";
import { registerCustomer } from "../modules/auth.js";
import { validateForm, isValidEmail, isValidSaPhone, isNonEmpty } from "../modules/validate.js";

renderHeader();
renderFooter();

const form = document.getElementById("register-form");
const alertBox = document.getElementById("form-alert");
const submitBtn = document.getElementById("register-submit");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  alertBox.innerHTML = "";
  const { valid } = validateForm(form, {
    firstName: (v) => (isNonEmpty(v) ? true : "Required."),
    lastName: (v) => (isNonEmpty(v) ? true : "Required."),
    email: (v) => (isValidEmail(v) ? true : "Enter a valid email address."),
    phone: (v) => (!v || isValidSaPhone(v) ? true : "Enter a valid South African number."),
    password: (v) => (v.length >= 8 ? true : "At least 8 characters."),
  });
  if (!valid) return;
  if (!form.terms.checked) {
    alertBox.innerHTML = `<div class="alert alert-error">Please accept the Terms of Service to continue.</div>`;
    return;
  }
  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account…";
  try {
    await registerCustomer({
      email: form.email.value.trim(), password: form.password.value,
      firstName: form.firstName.value.trim(), lastName: form.lastName.value.trim(),
      phone: form.phone.value.trim(),
    });
    alertBox.innerHTML = `<div class="alert alert-success">Account created! Check your email to verify it.</div>`;
    setTimeout(() => (window.location.href = "/"), 1500);
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Account";
    const map = { "auth/email-already-in-use": "An account already exists with that email — try logging in instead." };
    alertBox.innerHTML = `<div class="alert alert-error">${map[err.code] || err.message || "Something went wrong."}</div>`;
  }
});
