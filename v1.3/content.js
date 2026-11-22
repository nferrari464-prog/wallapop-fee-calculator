(() => {
const WIDGET_CLASS = "wfc-widget";

// Seletores CSS para encontrar artigos fora da proteção Wallapop
const EXCLUSION_SELECTOR = [
    '[aria-label="apenas venda presencial" i ]',
    'wallapop-badge[text="apenas venda presencial" i]',
    'wallapop-badge[badge-type="warranty"]',
    'wallapop-badge[text="garantia" i]',
    'walla-button[text="Chat" i][button-type="primary"]'
].join(",");

// Seletores CSS para encontrar os preços na página
const PRICE_SELECTOR = [
    '[data-testid*="price" i]',
    '[class*="price" i]',
    '[aria-label*="price" i]',
    '[aria-label*="preço" i]'
  ].join(",");

// Converte o texto detetado num número válido (lida com formatação europeia)
function parsePrice(text) {
    if (!text) return null;
    const cleaned = text.replace(/\s/g, "");
    const match = cleaned.match(/(?:€\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*€/);
    if (!match) return null;

  let raw = match[1];
  if (raw.includes(",")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(".")) {
    raw = raw.replace(/\./g, "");
  }
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
}

// Calcula a taxa de proteção com base em escalões de preço
function protectionFee(price) {
    if (price >= 1 && price <= 25) return 1.95;
    if (price > 25 && price <= 100) return 1.95 + (161 / 1500) * (price - 25);
    if (price > 100 && price <= 300) return 10 + 9.1 * Math.log(price / 100);
    if (price > 300 && price <= 1000) return 20;
    if (price > 1000 && price <= 2500) return 50;
    return null;
}

// Formata um valor numérico para o formato de moeda Euro (PT)
function euro(value) {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR"
    }).format(value);
  }


// Procura e filtra os elementos de preço válidos no DOM
function findPriceElements() {
    const candidates = [...document.querySelectorAll(PRICE_SELECTOR)]
      .filter(el => !el.closest("." + WIDGET_CLASS))
      .filter(el => {
        if (el.offsetParent === null) return false;
        const text = (el.innerText || el.textContent || "").trim();
        return text.length > 0 && text.length < 40 && /€/.test(text) && parsePrice(text) !== null;
      });

    return candidates.filter(el => !candidates.some(other => other !== el && el.contains(other)));
}

// Verifica se o anúncio associado a este preço tem seletor de exclusão
function hasExclusionSelector(priceEl, allPriceEls) {
    let scope = priceEl;
    let node = priceEl.parentElement;
    while (node && node !== document.body) {
        const count = allPriceEls.filter(p => node.contains(p)).length;
        if (count >2 ) break;
        scope = node;
        node = node.parentElement;
    }
   
    return scope.matches(EXCLUSION_SELECTOR) || scope.querySelector(EXCLUSION_SELECTOR) !== null;
}

 

// Variável de controlo para debounce e instância do observador de mutações no DOM
let timer;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(render, 350);
  });

// Ativa o observador de mutações no corpo da página
function startObserving() {
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["text", "aria-label", "badge-type", "aria-selected", "class"]
      });
    }
}


// Renderiza e injeta os widgets com a taxa calculada e o preço total junto dos preços detetados
function render() {
    observer.disconnect();

    try {
      const priceElements = findPriceElements();

      priceElements.forEach(chosen => {
        const price = parsePrice(chosen.innerText || chosen.textContent);
        if (price === null) return;

        const ExclusionTag = hasExclusionSelector(chosen, priceElements);
        const key = price + "|" + ExclusionTag;
        if (chosen.dataset.wfcDone === key) return;

        let widget = chosen.nextElementSibling;
        const hasWidget = widget && widget.classList.contains(WIDGET_CLASS);

        // Etiqueta de Exclusão: fora da proteção, não mostra nada
        if (ExclusionTag) {
          if (hasWidget) widget.remove();
          chosen.dataset.wfcDone = key;
          return;
        }

        if (!hasWidget) {
          widget = document.createElement("div");
          widget.className = WIDGET_CLASS;
          widget.style.cssText =
            "margin-top:4px;padding:6px 8px;border-left:3px solid #13a37f;" +
            "background:#f1faf7;border-radius:4px;font:12px/1.4 Arial,sans-serif;color:#222;";
          chosen.insertAdjacentElement("afterend", widget);
        }

        const fee = protectionFee(price);
        widget.replaceChildren();

        if (fee === null) {
          widget.style.display = "none";
        } else {
          widget.style.display = "";
          const roundedFee = Math.round((fee + Number.EPSILON) * 100) / 100;
          const total = Math.round((price + roundedFee + Number.EPSILON) * 100) / 100;

          const feeLine = document.createElement("div");
          feeLine.textContent = "+" + euro(roundedFee);

          const totalLine = document.createElement("strong");
          totalLine.textContent = "Total: " + euro(total);
          totalLine.style.display = "block";

          widget.append(feeLine, totalLine);
        }

        chosen.dataset.wfcDone = key;
      });
    } finally {
      startObserving();
    }
  }
  // Executa a função principal pela primeira vez ao carregar o script
  render();
})();