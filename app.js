/* Relatório Mensal ABRC — lógica do formulário */
(function () {
  "use strict";

  var state = {
    lang: "pt",
    photos: { photo1: null, photo2: null }, // dataURL
    signature: { mode: "draw", drawData: null, uploadData: null }
  };

  /* ---------- i18n ---------- */
  function t(key) {
    var dict = window.I18N[state.lang] || window.I18N.pt;
    return dict[key] != null ? dict[key] : (window.I18N.pt[key] || key);
  }

  function applyLang(lang) {
    state.lang = lang;
    var dict = window.I18N[lang];
    document.documentElement.lang = dict.htmlLang;
    document.title = dict.docTitle;

    // textos
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    // placeholders
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-ph");
      if (dict[key] != null) el.setAttribute("placeholder", dict[key]);
    });

    // botões de idioma
    var ptBtn = document.getElementById("btn-pt");
    var enBtn = document.getElementById("btn-en");
    ptBtn.classList.toggle("active", lang === "pt");
    enBtn.classList.toggle("active", lang === "en");
    ptBtn.setAttribute("aria-pressed", String(lang === "pt"));
    enBtn.setAttribute("aria-pressed", String(lang === "en"));

    try { localStorage.setItem("abrc_lang", lang); } catch (e) {}
    // atualiza a URL sem recarregar
    try {
      var url = new URL(window.location.href);
      url.searchParams.set("lang", lang);
      window.history.replaceState({}, "", url);
    } catch (e) {}
  }

  function initLang() {
    var lang = "pt";
    try {
      var params = new URLSearchParams(window.location.search);
      var q = (params.get("lang") || "").toLowerCase();
      if (q === "en" || q === "pt") lang = q;
      else {
        var saved = localStorage.getItem("abrc_lang");
        if (saved === "en" || saved === "pt") lang = saved;
      }
    } catch (e) {}
    applyLang(lang);
  }

  /* ---------- Campos condicionais (Sim/Não) ---------- */
  function setupConditionals() {
    document.querySelectorAll(".yesno[data-controls]").forEach(function (group) {
      var targetId = group.getAttribute("data-controls");
      var target = document.getElementById(targetId);
      group.querySelectorAll('input[type="radio"]').forEach(function (radio) {
        radio.addEventListener("change", function () {
          var isYes = radio.value === "yesno-yes" && radio.checked;
          if (target) target.hidden = !isYes;
        });
      });
    });
  }

  /* ---------- Fotos ---------- */
  function setupPhoto(inputId, previewId, stateKey) {
    var input = document.getElementById(inputId);
    var preview = document.getElementById(previewId);
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      preview.innerHTML = "";
      state.photos[stateKey] = null;
      if (!file) return;
      readImageAsDataURL(file, function (dataUrl, displayable) {
        state.photos[stateKey] = dataUrl;
        if (displayable) {
          var img = new Image();
          img.src = dataUrl;
          preview.appendChild(img);
        } else {
          var p = document.createElement("div");
          p.className = "fallback";
          p.textContent = file.name + " ✓";
          preview.appendChild(p);
        }
      });
    });
  }

  /* Lê imagem como dataURL. TIFF não é exibível no navegador, mas guardamos o nome. */
  function readImageAsDataURL(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = reader.result;
      var displayable = /image\/(png|jpe?g|gif|webp)/i.test(file.type);
      cb(dataUrl, displayable);
    };
    reader.readAsDataURL(file);
  }

  /* ---------- Assinatura: canvas ---------- */
  var sigCanvas, sigCtx, drawing = false, hasDrawn = false;

  function setupSignatureCanvas() {
    sigCanvas = document.getElementById("sig-canvas");
    // ajusta resolução ao tamanho real exibido (nitidez)
    resizeCanvas();
    sigCtx = sigCanvas.getContext("2d");
    sigCtx.lineWidth = 2.5;
    sigCtx.lineCap = "round";
    sigCtx.lineJoin = "round";
    sigCtx.strokeStyle = "#111";

    function pos(e) {
      var rect = sigCanvas.getBoundingClientRect();
      var scaleX = sigCanvas.width / rect.width;
      var scaleY = sigCanvas.height / rect.height;
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      var clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    }
    function start(e) { e.preventDefault(); drawing = true; var p = pos(e); sigCtx.beginPath(); sigCtx.moveTo(p.x, p.y); }
    function move(e) { if (!drawing) return; e.preventDefault(); var p = pos(e); sigCtx.lineTo(p.x, p.y); sigCtx.stroke(); hasDrawn = true; }
    function end(e) { if (!drawing) return; e.preventDefault(); drawing = false; }

    sigCanvas.addEventListener("mousedown", start);
    sigCanvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    sigCanvas.addEventListener("touchstart", start, { passive: false });
    sigCanvas.addEventListener("touchmove", move, { passive: false });
    sigCanvas.addEventListener("touchend", end, { passive: false });

    document.getElementById("sig-clear").addEventListener("click", function () {
      sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
      hasDrawn = false;
    });

    window.addEventListener("resize", function () {
      // preserva desenho ao redimensionar
      var data = hasDrawn ? sigCanvas.toDataURL() : null;
      resizeCanvas();
      sigCtx = sigCanvas.getContext("2d");
      sigCtx.lineWidth = 2.5; sigCtx.lineCap = "round"; sigCtx.lineJoin = "round"; sigCtx.strokeStyle = "#111";
      if (data) { var img = new Image(); img.onload = function () { sigCtx.drawImage(img, 0, 0, sigCanvas.width, sigCanvas.height); }; img.src = data; }
    });
  }

  function resizeCanvas() {
    var rect = sigCanvas.getBoundingClientRect();
    var ratio = window.devicePixelRatio || 1;
    sigCanvas.width = Math.max(300, Math.round(rect.width * ratio));
    sigCanvas.height = Math.round(200 * ratio);
  }

  /* ---------- Assinatura: abas e upload ---------- */
  function setupSignatureTabs() {
    var tabDraw = document.getElementById("tab-draw");
    var tabUpload = document.getElementById("tab-upload");
    var panelDraw = document.getElementById("panel-draw");
    var panelUpload = document.getElementById("panel-upload");

    function select(mode) {
      state.signature.mode = mode;
      var isDraw = mode === "draw";
      tabDraw.classList.toggle("active", isDraw);
      tabUpload.classList.toggle("active", !isDraw);
      tabDraw.setAttribute("aria-selected", String(isDraw));
      tabUpload.setAttribute("aria-selected", String(!isDraw));
      panelDraw.hidden = !isDraw;
      panelUpload.hidden = isDraw;
    }
    tabDraw.addEventListener("click", function () { select("draw"); });
    tabUpload.addEventListener("click", function () { select("upload"); });

    var sigFile = document.getElementById("sig-file");
    var sigPreview = document.getElementById("sig-preview");
    sigFile.addEventListener("change", function () {
      var file = sigFile.files && sigFile.files[0];
      sigPreview.innerHTML = "";
      state.signature.uploadData = null;
      if (!file) return;
      readImageAsDataURL(file, function (dataUrl, displayable) {
        state.signature.uploadData = dataUrl;
        if (displayable) {
          var img = new Image(); img.src = dataUrl; sigPreview.appendChild(img);
        } else {
          var p = document.createElement("div"); p.className = "fallback"; p.textContent = file.name + " ✓"; sigPreview.appendChild(p);
        }
      });
    });
  }

  function getSignatureImage() {
    if (state.signature.mode === "upload") {
      return state.signature.uploadData || null;
    }
    // draw
    if (hasDrawn) return sigCanvas.toDataURL("image/png");
    return null;
  }

  /* ---------- Coleta de respostas ---------- */
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function radioVal(name) {
    var checked = document.querySelector('input[name="' + name + '"]:checked');
    if (!checked) return null;
    return checked.value === "yesno-yes" ? "yes" : "no";
  }

  /* ---------- Geração do PDF ---------- */
  function generatePDF() {
    var name = val("f-name");
    if (!name) { alert(t("msgNoName")); document.getElementById("f-name").focus(); return; }

    // Fallback: se a biblioteca jsPDF não carregou (sem internet no momento),
    // usa a impressão do navegador para salvar como PDF.
    if (!window.jspdf || !window.jspdf.jsPDF) {
      window.print();
      return;
    }

    var jsPDFns = window.jspdf;
    var doc = new jsPDFns.jsPDF({ unit: "pt", format: "a4" });

    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    var margin = 48;
    var contentW = pageW - margin * 2;
    var y = margin;

    function ensureSpace(h) {
      if (y + h > pageH - margin) { doc.addPage(); y = margin; }
    }
    function addGap(h) { y += h; }

    function heading(text, size, color) {
      size = size || 13;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(size);
      doc.setTextColor.apply(doc, color || [20, 92, 46]);
      var lines = doc.splitTextToSize(text, contentW);
      ensureSpace(lines.length * (size + 4) + 6);
      doc.text(lines, margin, y);
      y += lines.length * (size + 4) + 4;
      doc.setTextColor(29, 36, 48);
    }
    function question(label) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      var lines = doc.splitTextToSize(label, contentW);
      ensureSpace(lines.length * 14 + 4);
      doc.text(lines, margin, y);
      y += lines.length * 14 + 2;
    }
    function answer(text) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      var value = text && text.length ? text : t("pdfNotAnswered");
      var lines = doc.splitTextToSize(t("pdfAnswer") + " " + value, contentW);
      ensureSpace(lines.length * 13 + 6);
      doc.setTextColor(55, 64, 77);
      doc.text(lines, margin, y);
      doc.setTextColor(29, 36, 48);
      y += lines.length * 13 + 8;
    }
    function yesNoAnswer(v) {
      var txt = v === "yes" ? t("pdfYes") : (v === "no" ? t("pdfNo") : t("pdfNotAnswered"));
      answer(txt);
    }
    function divider() {
      ensureSpace(14);
      doc.setDrawColor(217, 222, 229);
      doc.line(margin, y, pageW - margin, y);
      y += 12;
    }

    /* Cabeçalho */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(27, 122, 61);
    var org1Lines = doc.splitTextToSize(t("org1"), contentW);
    doc.text(org1Lines, pageW / 2, y, { align: "center" });
    y += org1Lines.length * 14;
    doc.setFontSize(10);
    doc.setTextColor(11, 74, 138);
    var org2Lines = doc.splitTextToSize(t("org2"), contentW);
    doc.text(org2Lines, pageW / 2, y, { align: "center" });
    y += org2Lines.length * 12 + 6;

    doc.setDrawColor(11, 74, 138);
    doc.setLineWidth(1.4);
    doc.line(margin, y, pageW - margin, y);
    doc.setLineWidth(1);
    y += 16;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(29, 36, 48);
    doc.text(t("reportTitle"), pageW / 2, y, { align: "center" });
    y += 22;

    /* Dados */
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold"); doc.text(t("name"), margin, y);
    doc.setFont("helvetica", "normal"); doc.text(name, margin + 60, y); y += 16;
    doc.setFont("helvetica", "bold"); doc.text(t("function"), margin, y);
    doc.setFont("helvetica", "normal"); doc.text(val("f-function") || "-", margin + 72, y); y += 16;
    doc.setFont("helvetica", "bold"); doc.text(t("refMonth"), margin, y);
    doc.setFont("helvetica", "normal"); doc.text(val("f-month") || "-", margin + 130, y); y += 18;
    divider();

    /* SEÇÃO I */
    heading(t("sectionI"), 14, [27, 122, 61]);

    heading("1. " + t("s1_title"), 12);
    question(t("q1_1")); yesNoAnswer(radioVal("q1_1"));
    if (radioVal("q1_1") === "yes") {
      question(t("q1_2")); answer(val("q1_2"));
      question(t("q1_3")); answer(val("q1_3"));
      question(t("q1_4")); answer(val("q1_4"));
      question(t("q1_5")); yesNoAnswer(radioVal("q1_5"));
      question(t("q1_6")); answer(val("q1_6"));
      question(t("q1_7")); answer(val("q1_7"));
    }
    divider();

    heading("2. " + t("s2_title"), 12);
    question(t("q2_1")); yesNoAnswer(radioVal("q2_1"));
    if (radioVal("q2_1") === "yes") {
      question(t("q2_2")); answer(val("q2_2"));
      question(t("q2_3")); answer(val("q2_3"));
      question(t("q2_4")); answer(val("q2_4"));
      question(t("q2_5")); yesNoAnswer(radioVal("q2_5"));
      question(t("q2_6")); answer(val("q2_6"));
    }
    divider();

    heading("3. " + t("s3_title"), 12);
    question(t("q3_1")); answer(val("q3_1"));
    question(t("q3_2")); answer(val("q3_2"));
    divider();

    /* SEÇÃO II */
    heading(t("sectionII"), 14, [27, 122, 61]);
    heading("1. " + t("s2b_title"), 12);
    question(t("p1_1")); answer(val("p1_1"));
    question(t("p1_2")); answer(val("p1_2"));
    question(t("p1_3")); answer(val("p1_3"));
    question(t("p1_4")); answer(val("p1_4"));
    question(t("p1_5")); answer(val("p1_5"));
    question(t("p1_6")); answer(val("p1_6"));
    question(t("p1_7")); answer(val("p1_7"));
    question(t("p1_8")); answer(val("p1_8"));
    question(t("p1_9")); answer(val("p1_9"));

    // Item 1.10 destacado
    (function () {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      var tag = t("itemTag");
      var lines = doc.splitTextToSize(tag + " — " + t("p1_10"), contentW - 16);
      var boxH = lines.length * 13 + 16;
      ensureSpace(boxH + 10);
      doc.setFillColor(255, 248, 225);
      doc.setDrawColor(244, 194, 13);
      doc.setLineWidth(1.4);
      doc.roundedRect(margin, y, contentW, boxH, 5, 5, "FD");
      doc.setLineWidth(1);
      doc.setTextColor(74, 59, 0);
      doc.text(lines, margin + 8, y + 14);
      doc.setTextColor(29, 36, 48);
      y += boxH + 6;
    })();
    if (val("p1_10_comment")) { question(t("p1_10_label")); answer(val("p1_10_comment")); }
    divider();

    /* SEÇÃO III */
    heading(t("sectionIII"), 14, [27, 122, 61]);
    heading(t("photosTitle"), 11);

    addPhotoToPdf(doc, state.photos.photo1, t("pdfPhoto") + " 1", margin, contentW, ensureSpace, function (ny) { y = ny; }, function () { return y; });
    addPhotoToPdf(doc, state.photos.photo2, t("pdfPhoto") + " 2", margin, contentW, ensureSpace, function (ny) { y = ny; }, function () { return y; });

    divider();

    // Data
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    ensureSpace(20);
    doc.text(t("dateLabel") + " " , margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(val("f-date")), margin + doc.getTextWidth(t("dateLabel") + "  "), y);
    y += 22;

    // Assinatura
    doc.setFont("helvetica", "bold"); doc.text(t("pdfSignature"), margin, y); y += 8;
    var sigImg = getSignatureImage();
    if (sigImg) {
      ensureSpace(90);
      try {
        var fmt = sigImg.indexOf("image/png") >= 0 ? "PNG" : "JPEG";
        doc.addImage(sigImg, fmt, margin, y, 200, 80);
      } catch (e) { /* ignore */ }
      y += 86;
    } else {
      ensureSpace(50);
      doc.setDrawColor(150);
      doc.line(margin, y + 30, margin + 240, y + 30);
      y += 44;
    }

    // Rodapé/nota
    ensureSpace(24);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(120, 128, 138);
    doc.text(doc.splitTextToSize(t("pdfGeneratedNote"), contentW), margin, y);
    doc.setTextColor(29, 36, 48);

    // Numeração de páginas
    var total = doc.internal.getNumberOfPages();
    for (var i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(140);
      doc.text(i + "/" + total, pageW - margin, pageH - 20, { align: "right" });
    }

    var fileName = buildFileName(name, val("f-month"));
    doc.save(fileName);
  }

  function addPhotoToPdf(doc, dataUrl, label, margin, contentW, ensureSpace, setY, getY) {
    var y = getY();
    doc.setFont("helvetica", "bold"); doc.setFontSize(10.5);
    ensureSpace(18); y = getY();
    doc.text(label, margin, y); y += 6; setY(y);
    if (!dataUrl) {
      doc.setFont("helvetica", "normal");
      doc.text("-", margin, getY() + 10); setY(getY() + 18);
      return;
    }
    var displayable = /^data:image\/(png|jpe?g|gif|webp)/i.test(dataUrl);
    if (!displayable) {
      doc.setFont("helvetica", "italic"); doc.setFontSize(9);
      doc.text(doc.splitTextToSize("(" + label + " anexada / attached — TIFF)", contentW), margin, getY() + 10);
      setY(getY() + 20);
      return;
    }
    // Insere com tamanho proporcional (máx 230x180)
    var maxW = 230, maxH = 180;
    var props;
    try { props = doc.getImageProperties(dataUrl); } catch (e) { props = { width: maxW, height: maxH }; }
    var ratio = Math.min(maxW / props.width, maxH / props.height, 1);
    var w = props.width * ratio, h = props.height * ratio;
    ensureSpace(h + 10); y = getY();
    var fmt = dataUrl.indexOf("image/png") >= 0 ? "PNG" : "JPEG";
    try { doc.addImage(dataUrl, fmt, margin, y, w, h); } catch (e) {}
    setY(y + h + 12);
  }

  function formatDate(iso) {
    if (!iso) return "-";
    var parts = iso.split("-"); // yyyy-mm-dd
    if (parts.length !== 3) return iso;
    if (state.lang === "pt") return parts[2] + "/" + parts[1] + "/" + parts[0];
    return parts[1] + "/" + parts[2] + "/" + parts[0];
  }

  function buildFileName(name, month) {
    var clean = (name + (month ? "_" + month : "")).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    clean = clean.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    var prefix = state.lang === "pt" ? "Relatorio_Mensal" : "Monthly_Report";
    return prefix + "_" + (clean || "ABRC") + ".pdf";
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("btn-pt").addEventListener("click", function () { applyLang("pt"); });
    document.getElementById("btn-en").addEventListener("click", function () { applyLang("en"); });

    initLang();
    setupConditionals();
    setupPhoto("photo1", "preview1", "photo1");
    setupPhoto("photo2", "preview2", "photo2");
    setupSignatureCanvas();
    setupSignatureTabs();

    document.getElementById("btn-pdf").addEventListener("click", generatePDF);
  });
})();
