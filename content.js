(() => {
  let tooltip = null;

  function containsChinese(text) {
    return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
  }

  function removeTooltip() {
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
  }

  function createTooltip(x, y, original) {
    removeTooltip();

    tooltip = document.createElement("div");
    tooltip.id = "chinese-lens-tooltip";
    tooltip.innerHTML = `
      <div class="cl-original">${escapeHtml(original)}</div>
      <div class="cl-loading">Translating…</div>
    `;
    document.body.appendChild(tooltip);
    positionTooltip(x, y);
  }

  function positionTooltip(x, y) {
    if (!tooltip) return;
    const rect = tooltip.getBoundingClientRect();
    let left = x;
    let top = y + 12;

    if (left + rect.width > window.innerWidth - 10) {
      left = window.innerWidth - rect.width - 10;
    }
    if (left < 10) left = 10;

    if (top + rect.height > window.innerHeight + window.scrollY - 10) {
      top = y - rect.height - 8;
    }

    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function updateTooltip(original, pinyin, translation) {
    if (!tooltip) return;
    tooltip.innerHTML = `
      <div class="cl-original">${escapeHtml(original)}</div>
      <div class="cl-pinyin">${escapeHtml(pinyin)}</div>
      <hr class="cl-divider">
      <div class="cl-translation">${escapeHtml(translation)}</div>
    `;
  }

  function showError(message) {
    if (!tooltip) return;
    tooltip.innerHTML = `
      <div class="cl-loading">${escapeHtml(message)}</div>
    `;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  async function translate(text) {
    const url =
      "https://translate.googleapis.com/translate_a/single" +
      "?client=gtx" +
      "&sl=zh-CN" +
      "&tl=en" +
      "&dt=t" +  // translation
      "&dt=rm" + // transliteration (pinyin)
      "&q=" +
      encodeURIComponent(text);

    const res = await fetch(url);
    if (!res.ok) throw new Error("Translation request failed");

    const data = await res.json();

    // data[0] contains translation segments
    const translation = data[0]
      .filter((seg) => seg && seg[0])
      .map((seg) => seg[0])
      .join("");

    // data[0] segments may contain pinyin at index [3]
    let pinyin = data[0]
      .filter((seg) => seg && seg[3])
      .map((seg) => seg[3])
      .join(" ");

    // Fallback: check data[8] for romanization
    if (!pinyin && data[8]) {
      try {
        pinyin = data[8]
          .flat(Infinity)
          .filter((s) => typeof s === "string")
          .join(" ");
      } catch {
        // ignore
      }
    }

    return { translation, pinyin: pinyin || "" };
  }

  document.addEventListener("mouseup", async (e) => {
    // Small delay to let the selection finalize
    await new Promise((r) => setTimeout(r, 10));

    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (!text || !containsChinese(text)) {
      return;
    }

    // Limit to reasonable length
    const input = text.slice(0, 500);

    createTooltip(e.pageX, e.pageY, input);

    try {
      const { translation, pinyin } = await translate(input);
      updateTooltip(input, pinyin, translation);
    } catch {
      showError("Translation failed");
    }
  });

  document.addEventListener("mousedown", (e) => {
    if (tooltip && !tooltip.contains(e.target)) {
      removeTooltip();
    }
  });
})();
