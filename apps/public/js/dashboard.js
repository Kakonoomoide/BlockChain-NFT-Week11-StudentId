/**
 * Copies text to clipboard and triggers brief visual feedback on the button.
 * @param {string} text - The string to copy to clipboard.
 * @param {HTMLElement} btnElement - The button element clicked by the user.
 * @returns {void}
 */
function copyAddress(text, btnElement) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = btnElement.innerText;
    btnElement.innerText = "Copied";
    btnElement.classList.add("text-emerald-600");
    setTimeout(() => {
      btnElement.innerText = originalText;
      btnElement.classList.remove("text-emerald-600");
    }, 1500);
  });
}

/**
 * Fills a target input field with a selected wallet address.
 * @param {string} inputId - The DOM ID of the target input element.
 * @param {string} address - The Ethereum address to populate.
 * @returns {void}
 */
function fillAddressInput(inputId, address) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = address;
    input.focus();
  }
}

/**
 * Clears the value of a specified input field and focuses it to reopen datalist suggestions.
 * @param {string} inputId - The DOM ID of the input element to clear.
 * @returns {void}
 */
function clearInput(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = "";
    input.focus();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const forms = document.querySelectorAll("form[data-tx-form]");
  forms.forEach((form) => {
    form.addEventListener("submit", () => {
      const btn = form.querySelector("button[type='submit']");
      if (btn) {
        btn.disabled = true;
        btn.classList.add("opacity-50", "cursor-not-allowed");
        btn.innerText = "Memproses Transaksi...";
      }
    });
  });
});
