(() => {
  "use strict";

  // ─── State ──────────────────────────────────────────
  const cart = []; // { barcode, name, price, qty }
  let cameraStream = null;
  let scanning = false;
  let scanInterval = null;
  const TAX_RATE = 0.18;
  const DISCOUNT_THRESHOLD = 500; // ₹500+ gets 5 % off
  const DISCOUNT_RATE = 0.05;

  // ─── DOM refs ───────────────────────────────────────
  const $  = (sel) => document.querySelector(sel);
  const video          = $("#camera-feed");
  const canvas         = $("#scanner-canvas");
  const ctx            = canvas.getContext("2d", { willReadFrequently: true });
  const scanLine       = $("#scan-line");
  const btnStart       = $("#btn-start-scan");
  const btnStop        = $("#btn-stop-scan");
  const manualInput    = $("#manual-barcode");
  const btnManual      = $("#btn-manual-add");
  const statusBar      = $("#scan-status");
  const cartCount      = $("#cart-count");
  const cartEmpty      = $("#cart-empty");
  const cartTable      = $("#cart-table");
  const cartBody       = $("#cart-body");
  const billingSection = $("#billing-section");
  const billSubtotal   = $("#bill-subtotal");
  const billTax        = $("#bill-tax");
  const billDiscount   = $("#bill-discount");
  const billTotal      = $("#bill-total");
  const btnCheckout    = $("#btn-checkout");
  const btnClear       = $("#btn-clear-cart");
  const btnPrint       = $("#btn-print");
  const paymentModal   = $("#payment-modal");
  const paymentAmount  = $("#payment-amount");
  const btnNewTx       = $("#btn-new-transaction");
  const receiptModal   = $("#receipt-modal");
  const receiptBody    = $("#receipt-body");
  const btnCloseReceipt = $("#btn-close-receipt");

  // ─── Camera / Scanner ───────────────────────────────
  async function startCamera() {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      video.srcObject = cameraStream;
      await video.play();

      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;

      scanning = true;
      scanLine.style.display = "block";
      btnStart.disabled = true;
      btnStop.disabled  = false;

      showStatus("Camera active — point at a barcode", "info");
      scanInterval = setInterval(grabFrame, 500);
    } catch (err) {
      showStatus("Camera access denied. Use manual entry.", "error");
    }
  }

  function stopCamera() {
    scanning = false;
    clearInterval(scanInterval);
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      cameraStream = null;
    }
    video.srcObject = null;
    scanLine.style.display = "none";
    btnStart.disabled = false;
    btnStop.disabled  = true;
    showStatus("Camera stopped", "info");
  }

  /**
   * Grab a video frame and attempt BarcodeDetector (available in Chrome / Edge).
   * Falls back to manual entry when BarcodeDetector is not supported.
   */
  async function grabFrame() {
    if (!scanning) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if ("BarcodeDetector" in window) {
      try {
        const detector = new BarcodeDetector({ formats: [
          "ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code",
        ]});
        const barcodes = await detector.detect(canvas);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          handleBarcode(code);
        }
      } catch (_) { /* detection failed this frame — will retry */ }
    } else {
      // Fallback: try simple ZXing-based detection via ImageData
      // If no native support, we rely on manual entry
      if (!window._barcodeWarned) {
        showStatus("Auto-detect not supported in this browser. Enter barcode manually.", "error");
        window._barcodeWarned = true;
      }
    }
  }

  // ─── Barcode handling ───────────────────────────────
  let lastScannedCode = "";
  let lastScannedTime = 0;

  function handleBarcode(code) {
    // Debounce: ignore same barcode within 2 s
    const now = Date.now();
    if (code === lastScannedCode && now - lastScannedTime < 2000) return;
    lastScannedCode = code;
    lastScannedTime = now;

    addToCart(code);
  }

  function addToCart(barcode) {
    const product = PRODUCTS[barcode];
    if (!product) {
      showStatus(`Unknown barcode: ${barcode}`, "error");
      return;
    }

    const existing = cart.find((item) => item.barcode === barcode);
    if (existing) {
      existing.qty += 1;
      showStatus(`${product.name} — qty now ${existing.qty}`, "success");
    } else {
      cart.push({ barcode, name: product.name, price: product.price, qty: 1 });
      showStatus(`Added ${product.name}`, "success");
    }

    renderCart();
  }

  // ─── Cart rendering ─────────────────────────────────
  function renderCart() {
    cartBody.innerHTML = "";

    if (cart.length === 0) {
      cartEmpty.classList.remove("hidden");
      cartTable.classList.add("hidden");
      billingSection.classList.add("hidden");
      cartCount.textContent = "0";
      return;
    }

    cartEmpty.classList.add("hidden");
    cartTable.classList.remove("hidden");
    billingSection.classList.remove("hidden");

    let totalQty = 0;
    cart.forEach((item, idx) => {
      totalQty += item.qty;
      const subtotal = item.price * item.qty;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div class="item-name">${escapeHTML(item.name)}</div>
          <div class="item-barcode">${escapeHTML(item.barcode)}</div>
        </td>
        <td>₹${item.price.toFixed(2)}</td>
        <td>
          <div class="qty-controls">
            <button data-action="dec" data-idx="${idx}">−</button>
            <span>${item.qty}</span>
            <button data-action="inc" data-idx="${idx}">+</button>
          </div>
        </td>
        <td>₹${subtotal.toFixed(2)}</td>
        <td><button class="btn-remove" data-action="remove" data-idx="${idx}">✕</button></td>
      `;
      cartBody.appendChild(tr);
    });

    cartCount.textContent = totalQty;
    updateBilling();
  }

  function updateBilling() {
    const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const tax      = subtotal * TAX_RATE;
    const discount = subtotal >= DISCOUNT_THRESHOLD ? subtotal * DISCOUNT_RATE : 0;
    const total    = subtotal + tax - discount;

    billSubtotal.textContent  = `₹${subtotal.toFixed(2)}`;
    billTax.textContent       = `₹${tax.toFixed(2)}`;
    billDiscount.textContent  = `-₹${discount.toFixed(2)}`;
    billTotal.textContent     = `₹${total.toFixed(2)}`;
  }

  // ─── Cart actions (event delegation) ────────────────
  cartBody.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const idx    = Number(btn.dataset.idx);
    const action = btn.dataset.action;

    if (action === "inc") {
      cart[idx].qty += 1;
    } else if (action === "dec") {
      cart[idx].qty -= 1;
      if (cart[idx].qty <= 0) cart.splice(idx, 1);
    } else if (action === "remove") {
      cart.splice(idx, 1);
    }
    renderCart();
  });

  // ─── Checkout / Payment ─────────────────────────────
  btnCheckout.addEventListener("click", () => {
    if (cart.length === 0) return;
    const total = calculateTotal();
    paymentAmount.textContent = `Amount paid: ₹${total.toFixed(2)}`;
    paymentModal.classList.remove("hidden");
  });

  btnNewTx.addEventListener("click", () => {
    cart.length = 0;
    renderCart();
    paymentModal.classList.add("hidden");
    showStatus("New transaction started", "info");
  });

  btnClear.addEventListener("click", () => {
    if (cart.length === 0) return;
    if (!confirm("Clear entire cart?")) return;
    cart.length = 0;
    renderCart();
    showStatus("Cart cleared", "info");
  });

  // ─── Receipt / Print ────────────────────────────────
  btnPrint.addEventListener("click", () => {
    if (cart.length === 0) return;
    generateReceipt();
    receiptModal.classList.remove("hidden");
  });

  btnCloseReceipt.addEventListener("click", () => {
    receiptModal.classList.add("hidden");
  });

  function generateReceipt() {
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const tax      = subtotal * TAX_RATE;
    const discount = subtotal >= DISCOUNT_THRESHOLD ? subtotal * DISCOUNT_RATE : 0;
    const total    = subtotal + tax - discount;
    const now      = new Date();

    let itemsHTML = cart.map((i) => `
      <div class="receipt-item">
        <span>${escapeHTML(i.name)} x${i.qty}</span>
        <span>₹${(i.price * i.qty).toFixed(2)}</span>
      </div>
    `).join("");

    receiptBody.innerHTML = `
      <div class="receipt-header">
        <h3>Auto Bill</h3>
        <p>${now.toLocaleDateString()} ${now.toLocaleTimeString()}</p>
        <p>Receipt #${Date.now().toString(36).toUpperCase()}</p>
      </div>
      <div class="receipt-items">${itemsHTML}</div>
      <div class="receipt-totals">
        <div class="receipt-item"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
        <div class="receipt-item"><span>GST (18%)</span><span>₹${tax.toFixed(2)}</span></div>
        <div class="receipt-item"><span>Discount</span><span>-₹${discount.toFixed(2)}</span></div>
        <div class="receipt-item receipt-grand-total"><span>TOTAL</span><span>₹${total.toFixed(2)}</span></div>
      </div>
      <div class="receipt-footer">
        <p>Thank you for shopping!</p>
        <p>Powered by Auto Bill</p>
      </div>
    `;
  }

  // ─── Helpers ────────────────────────────────────────
  function calculateTotal() {
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const tax      = subtotal * TAX_RATE;
    const discount = subtotal >= DISCOUNT_THRESHOLD ? subtotal * DISCOUNT_RATE : 0;
    return subtotal + tax - discount;
  }

  function showStatus(msg, type) {
    statusBar.textContent = msg;
    statusBar.className   = `status-bar ${type}`;
    statusBar.classList.remove("hidden");
    clearTimeout(statusBar._timer);
    statusBar._timer = setTimeout(() => statusBar.classList.add("hidden"), 3000);
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ─── Event bindings ─────────────────────────────────
  btnStart.addEventListener("click", startCamera);
  btnStop.addEventListener("click", stopCamera);

  btnManual.addEventListener("click", () => {
    const code = manualInput.value.trim();
    if (code) {
      addToCart(code);
      manualInput.value = "";
    }
  });

  manualInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      btnManual.click();
    }
  });

  // Close modals on backdrop click
  [paymentModal, receiptModal].forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });
  });

  // Initial render
  renderCart();
})();
