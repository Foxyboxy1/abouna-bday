// ========================================================
// منطق التطبيق - تهنئة عيد ميلاد أبونا دميان
// ========================================================

document.addEventListener("DOMContentLoaded", () => {
  // العناصر الرئيسية
  const wishForm = document.getElementById("wishForm");
  const senderNameInput = document.getElementById("senderName");
  const senderMessageInput = document.getElementById("senderMessage");
  const submitBtn = document.getElementById("submitBtn");
  const btnText = submitBtn.querySelector(".btn-text");
  const btnSpinner = submitBtn.querySelector(".btn-spinner");
  const charCount = document.getElementById("charCount");
  
  const successNotice = document.getElementById("successNotice");
  const errorNotice = document.getElementById("errorNotice");
  const errorMessage = document.getElementById("errorMessage");

  const messagesSection = document.getElementById("messagesSection");
  const messagesList = document.getElementById("messagesList");
  const refreshBtn = document.getElementById("refreshBtn");

  // عناصر الـ QR Code والـ Modal
  const qrModal = document.getElementById("qrModal");
  const openQrBtn = document.getElementById("openQrBtn");
  const footerQrBtn = document.getElementById("footerQrBtn");
  const closeQrBtn = document.getElementById("closeQrBtn");
  const qrCodeContainer = document.getElementById("qrCodeContainer");
  const shareUrlInput = document.getElementById("shareUrlInput");
  const downloadQrBtn = document.getElementById("downloadQrBtn");
  const modalCopyBtn = document.getElementById("modalCopyBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const whatsappShareBtn = document.getElementById("whatsappShareBtn");
  const toast = document.getElementById("toast");

  // الرابط الفعلي للمشاركة
  const shareUrl = (CONFIG.CUSTOM_QR_URL && CONFIG.CUSTOM_QR_URL.trim() !== "")
    ? CONFIG.CUSTOM_QR_URL.trim()
    : window.location.href.split("#")[0].split("?")[0];

  shareUrlInput.value = shareUrl;

  // إعداد رابط واتساب
  const whatsappText = encodeURIComponent(`كل سنة وقدسك طيب يا أبونا دميان! 🎂✨ شارك بكلمة محبة وتهنئة لقدس أبونا من خلال هذا الرابط:\n${shareUrl}`);
  whatsappShareBtn.href = `https://api.whatsapp.com/send?text=${whatsappText}`;

  // ========================================================
  // 1. إدارة عداد الأحرف في الرسالة
  // ========================================================
  senderMessageInput.addEventListener("input", () => {
    charCount.textContent = senderMessageInput.value.length;
  });

  // ========================================================
  // 2. إرسال الفورم وحفظ الرسالة
  // ========================================================
  wishForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = senderNameInput.value.trim() || "محب لأبونا";
    const message = senderMessageInput.value.trim();

    if (!message) {
      showError("يرجى كتابة رسالتك قبل الإرسال.");
      return;
    }

    // إخفاء التنبيهات السابقة
    hideNotices();
    setSubmitting(true);

    const now = new Date();
    const formattedDate = formatArabicDate(now);

    const payload = {
      name: name,
      message: message,
      date: formattedDate
    };

    try {
      if (CONFIG.GOOGLE_SCRIPT_URL && CONFIG.GOOGLE_SCRIPT_URL.trim() !== "") {
        // إرسال لـ Google Apps Script
        // استخدام mode: 'no-cors' لتجنب مشاكل CORS Preflight في المتصفحات
        await fetch(CONFIG.GOOGLE_SCRIPT_URL.trim(), {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify(payload),
        });

        // حفظ محلي احتياطي أيضاً
        saveLocalMessage(payload);
      } else {
        // في حال لم يضع الرابط بعد (وضع التجربة المحلي)
        saveLocalMessage(payload);
        console.warn("لم يتم وضع رابط Google Apps Script في config.js، تم الحفظ محلياً.");
      }

      // نجاح الإرسال
      showSuccess(name);
      launchConfetti();
      
      // تفريغ الفورم
      wishForm.reset();
      charCount.textContent = "0";

      // إضافة الرسالة في أول القائمة مباشرة
      prependMessageCard(payload);

    } catch (err) {
      console.error("Error submitting wish:", err);
      showError("حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  });

  function setSubmitting(isSubmitting) {
    submitBtn.disabled = isSubmitting;
    if (isSubmitting) {
      btnText.style.display = "none";
      btnSpinner.style.display = "inline-flex";
    } else {
      btnText.style.display = "inline";
      btnSpinner.style.display = "none";
    }
  }

  function showSuccess(name) {
    successNotice.style.display = "flex";
    errorNotice.style.display = "none";
    successNotice.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorNotice.style.display = "flex";
    successNotice.style.display = "none";
  }

  function hideNotices() {
    successNotice.style.display = "none";
    errorNotice.style.display = "none";
  }

  // ========================================================
  // 3. احتفالية Confetti
  // ========================================================
  function launchConfetti() {
    if (typeof confetti === "function") {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#c5a059", "#dfb86e", "#ffffff", "#e57373", "#ffd54f"]
      });

      setTimeout(() => {
        confetti({
          particleCount: 40,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 40,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 250);
    }
  }

  // ========================================================
  // 4. جلب وعرض الرسائل (لوحة التهاني)
  // ========================================================
  if (!CONFIG.SHOW_MESSAGES_LIST) {
    if (messagesSection) messagesSection.style.display = "none";
  } else {
    loadMessages();
    refreshBtn.addEventListener("click", () => {
      refreshBtn.classList.add("rotating");
      loadMessages().finally(() => {
        setTimeout(() => refreshBtn.classList.remove("rotating"), 500);
      });
    });
  }

  async function loadMessages() {
    let messages = [];

    if (CONFIG.GOOGLE_SCRIPT_URL && CONFIG.GOOGLE_SCRIPT_URL.trim() !== "") {
      try {
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL.trim(), { method: "GET" });
        const result = await response.json();
        if (result && result.data && Array.isArray(result.data)) {
          messages = result.data;
        }
      } catch (e) {
        console.warn("تعذر جلب الرسائل من جوجل شيت، جاري استخدام الحفظ المحلي:", e);
        messages = getLocalMessages();
      }
    } else {
      messages = getLocalMessages();
    }

    renderMessages(messages);
  }

  function renderMessages(messages) {
    if (!messages || messages.length === 0) {
      messagesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💌</div>
          <p>لا توجد رسائل بعد.. كن أول من يهنئ أبونا دميان!</p>
        </div>
      `;
      return;
    }

    messagesList.innerHTML = "";
    messages.forEach(item => {
      messagesList.appendChild(createMessageCard(item));
    });
  }

  function prependMessageCard(item) {
    const emptyState = messagesList.querySelector(".empty-state");
    if (emptyState) {
      messagesList.innerHTML = "";
    }
    const card = createMessageCard(item);
    messagesList.insertBefore(card, messagesList.firstChild);
  }

  function createMessageCard(item) {
    const card = document.createElement("div");
    card.className = "message-card";

    const nameText = escapeHtml(item.name || "محب لأبونا");
    const dateText = escapeHtml(item.date || "");
    const msgText = escapeHtml(item.message || "");

    card.innerHTML = `
      <div class="message-top">
        <span class="message-author">🤍 ${nameText}</span>
        <span class="message-time">${dateText}</span>
      </div>
      <div class="message-body">${msgText}</div>
    `;

    return card;
  }

  // ========================================================
  // 5. التخزين المحلي (LocalStorage Fallback)
  // ========================================================
  function getLocalMessages() {
    try {
      const stored = localStorage.getItem("abouna_bday_messages");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  function saveLocalMessage(item) {
    try {
      const list = getLocalMessages();
      list.unshift(item);
      localStorage.setItem("abouna_bday_messages", JSON.stringify(list));
    } catch (e) {
      console.warn("Local storage error:", e);
    }
  }

  // ========================================================
  // 6. إدارة وتوليد الـ QR Code
  // ========================================================
  let qrCodeInstance = null;

  function renderQrCode() {
    if (!qrCodeContainer) return;
    qrCodeContainer.innerHTML = "";

    if (typeof QRCode !== "undefined") {
      qrCodeInstance = new QRCode(qrCodeContainer, {
        text: shareUrl,
        width: 200,
        height: 200,
        colorDark: "#101321",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    } else {
      qrCodeContainer.innerHTML = "<p>تعذر تحميل مكتبة QR</p>";
    }
  }

  // فتح وإغلاق الـ Modal
  function openModal() {
    qrModal.style.display = "flex";
    if (!qrCodeInstance) {
      renderQrCode();
    }
  }

  function closeModal() {
    qrModal.style.display = "none";
  }

  openQrBtn.addEventListener("click", openModal);
  if (footerQrBtn) footerQrBtn.addEventListener("click", openModal);
  closeQrBtn.addEventListener("click", closeModal);

  qrModal.addEventListener("click", (e) => {
    if (e.target === qrModal) closeModal();
  });

  // نسخ الرابط
  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast("تم نسخ الرابط بنجاح! 📋");
    }).catch(() => {
      // بديل قديم
      shareUrlInput.select();
      document.execCommand("copy");
      showToast("تم نسخ الرابط بنجاح! 📋");
    });
  }

  copyLinkBtn.addEventListener("click", copyLink);
  modalCopyBtn.addEventListener("click", copyLink);

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2800);
  }

  // ========================================================
  // 7. تحميل الـ QR Code كصورة للطباعة (PNG)
  // ========================================================
  downloadQrBtn.addEventListener("click", () => {
    const qrCanvas = qrCodeContainer.querySelector("canvas");
    const qrImg = qrCodeContainer.querySelector("img");

    if (!qrCanvas && (!qrImg || !qrImg.src)) {
      alert("يرجى الانتظار لحين توليد الكود.");
      return;
    }

    // إنشاء Canvas عالي الدقة لإضافة إطار وعنوان قابل للطباعة
    const printCanvas = document.createElement("canvas");
    const ctx = printCanvas.getContext("2d");
    const width = 500;
    const height = 620;

    printCanvas.width = width;
    printCanvas.height = height;

    // خلفية بيضاء أنيقة
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // إطار ذهبي خارجي
    ctx.strokeStyle = "#c5a059";
    ctx.lineWidth = 6;
    ctx.strokeRect(14, 14, width - 28, height - 28);

    // كتابة العنوان
    ctx.fillStyle = "#1e2238";
    ctx.font = "bold 26px 'Cairo', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("كل سنة وقدسك طيب يا أبونا دميان 🎂", width / 2, 70);

    ctx.fillStyle = "#666666";
    ctx.font = "16px 'Cairo', sans-serif";
    ctx.fillText("امسح الرمز بكاميرا الموبايل لكتابة تهنئتك 📱", width / 2, 105);

    // رسم صورة الـ QR في المنتصف
    const drawAndSave = (source) => {
      const qrSize = 340;
      const qrX = (width - qrSize) / 2;
      const qrY = 140;
      ctx.drawImage(source, qrX, qrY, qrSize, qrSize);

      // نص سفلي
      ctx.fillStyle = "#c5a059";
      ctx.font = "bold 15px 'Cairo', sans-serif";
      ctx.fillText("دفتر تهاني ومحبة شعب الكنيسة", width / 2, 530);

      // تنزيل الصورة
      const link = document.createElement("a");
      link.download = "QR-عيد-ميلاد-أبونا-دميان.png";
      link.href = printCanvas.toDataURL("image/png");
      link.click();
    };

    if (qrCanvas) {
      drawAndSave(qrCanvas);
    } else if (qrImg) {
      const img = new Image();
      img.onload = () => drawAndSave(img);
      img.src = qrImg.src;
    }
  });

  // ========================================================
  // 8. أدوات مساعدة (Utilities)
  // ========================================================
  function formatArabicDate(date) {
    try {
      return date.toLocaleDateString("ar-EG", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true
      });
    } catch {
      return date.toLocaleDateString();
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
