(() => {
  const WIDGET_CLASS = "wfc-estimate";

  // 1. EXCLUSÕES POR URL
  const EXCLUDED_PATHS = [
    "/checkout",
    "/delivery"
  ];

  // 2. EXCLUSÕES POR ETIQUETA
  const EXCLUDED_EXACT_TAGS = [
    "apenas venda presencial",
    "garantia"
  ];

  const EXCLUDED_BADGE_TYPES = [
    "facetoface"
  ];

  // 3. EXCLUSÕES POR CATEGORIA (breadcrumbs)
  const EXCLUDED_CATEGORIES = [
    { slug: "/carros", name: "carros" },
    { slug: "/imoveis", name: "imóveis" },
    { slug: "/servicos", name: "serviços" }
    // Exemplos adicionais:
    // { slug: "/motas", name: "motas" },
    // { slug: "/imobiliario", name: "imobiliário" },
    // { slug: "/servicos", name: "serviços" }
  ];

  const PRICE_SELECTOR = [
    '[data-testid*="price" i]',
    '[class*="price" i]',
    '[aria-label*="price" i]',
    '[aria-label*="preço" i]'
  ].join(",");

  function normalizeText(str) {
    return (str || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function isExcludedPage() {
    const currentUrl = window.location.href.toLowerCase();
    return EXCLUDED_PATHS.some(path => currentUrl.includes(path.toLowerCase()));
  }

  // Encontra o cartão individual (pesquisa, favoritos, perfil ou carrossel de recomendados)
  function getCardContainer(el) {
    let current = el ? el.parentElement : null;
    while (current && current !== document.body && current !== document.documentElement) {
      const cls = typeof current.className === "string" ? current.className : "";
      if (
        /(?:Retrieval)?ItemCard_(?!_)/i.test(cls) ||
        current.tagName === "ARTICLE" ||
        (current.tagName === "A" && (current.getAttribute("href") || "").includes("/item/"))
      ) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  function matchesExcludedCategory(el) {
    if (!el) return false;

    const href = (el.getAttribute("href") || "").trim().toLowerCase();
    const titleAttr = normalizeText(el.getAttribute("title"));
    const nameSpan = el.querySelector ? el.querySelector('[itemprop="name"]') : null;
    const nameText = normalizeText(nameSpan ? nameSpan.textContent : el.textContent);

    return EXCLUDED_CATEGORIES.some(cat => {
      const slug = (cat.slug || "").trim().toLowerCase();
      const slugMatch =
        slug &&
        href &&
        (href === slug ||
          href.endsWith(slug) ||
          href.includes(slug + "/") ||
          href.includes(slug + "?"));

      const normCatName = normalizeText(cat.name);
      const nameMatch =
        normCatName && (nameText === normCatName || titleAttr === normCatName);

      return Boolean(slugMatch || nameMatch);
    });
  }

  function hasExcludedCategoryInScope(root, options = {}) {
    if (!root) return false;
    const { excludeCards = false } = options;

    if (root.querySelectorAll) {
      const links = root.querySelectorAll(
        'a[itemprop="item"], [class*="Breadcrumb" i] a, [itemtype*="BreadcrumbList"] a'
      );
      for (const link of links) {
        if (excludeCards && getCardContainer(link)) continue;
        if (matchesExcludedCategory(link)) {
          return true;
        }
      }

      const allElements = root.querySelectorAll("*");
      for (const el of allElements) {
        if (excludeCards && getCardContainer(el)) continue;
        if (el.shadowRoot && hasExcludedCategoryInScope(el.shadowRoot, options)) {
          return true;
        }
      }
    }

    return false;
  }

  // Procura tags excluídas recursivamente no DOM e dentro de QUALQUER Shadow DOM
  function containerHasExcludedTag(root, options = {}) {
    if (!root) return false;
    const { ignoreTabs = false, excludeCards = false } = options;

    // 1. Verifica <wallapop-badge> no nível atual
    if (root.querySelectorAll) {
      const badges = root.querySelectorAll("wallapop-badge");
      for (const badge of badges) {
        if (excludeCards && getCardContainer(badge)) continue;
        if (ignoreTabs && badge.closest('[role="tablist"], .wallapop-tab__children-container')) continue;

        const textAttr = normalizeText(badge.getAttribute("text"));
        const ariaAttr = normalizeText(badge.getAttribute("aria-label"));
        const typeAttr = (badge.getAttribute("badge-type") || "").trim().toLowerCase();

        const normalizedExactTags = EXCLUDED_EXACT_TAGS.map(normalizeText);

        if (
          normalizedExactTags.includes(textAttr) ||
          normalizedExactTags.includes(ariaAttr) ||
          EXCLUDED_BADGE_TYPES.includes(typeAttr)
        ) {
          return true;
        }
      }
    }

    // 2. Verifica nós de texto no nível atual
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node;
    const normalizedExactTags = EXCLUDED_EXACT_TAGS.map(normalizeText);
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (excludeCards && getCardContainer(parent)) continue;
      if (ignoreTabs && parent && parent.closest('[role="tablist"], .wallapop-tab__children-container')) {
        continue;
      }

      const text = normalizeText(node.nodeValue);
      if (normalizedExactTags.includes(text)) {
        return true;
      }
    }

    // 3. Entra recursivamente em todos os Shadow Roots existentes dentro deste contentor
    if (root.querySelectorAll) {
      const allElements = root.querySelectorAll("*");
      for (const el of allElements) {
        if (excludeCards && getCardContainer(el)) continue;
        if (el.shadowRoot) {
          if (containerHasExcludedTag(el.shadowRoot, options)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  function hasExcludedBadge(priceEl) {
    const card = getCardContainer(priceEl);

    // CASO 1: O preço está dentro de um cartão de anúncio (listagem ou recomendados)
    if (card) {
      return (
        containerHasExcludedTag(card, { ignoreTabs: false, excludeCards: false }) ||
        hasExcludedCategoryInScope(card, { excludeCards: false })
      );
    }

    // CASO 2: Página de detalhe (/item/...) e este é o preço principal do anúncio
    if (window.location.pathname.includes("/item/")) {
      return (
        containerHasExcludedTag(document.body, { ignoreTabs: false, excludeCards: true }) ||
        hasExcludedCategoryInScope(document.body, { excludeCards: true })
      );
    }

    // CASO 3: Fallback genérico para outras páginas
    let current = priceEl.parentElement;
    let validScope = current;
    while (current && current !== document.body && current !== document.documentElement) {
      const priceMatches = [...current.querySelectorAll(PRICE_SELECTOR)].filter(el => {
        if (el.closest("." + WIDGET_CLASS) || el.offsetParent === null) return false;
        const txt = (el.innerText || el.textContent || "").trim();
        return txt.length > 0 && txt.length < 40 && /€/.test(txt) && parsePrice(txt) !== null;
      });
      const leafPrices = priceMatches.filter(el => !priceMatches.some(other => other !== el && el.contains(other)));
      if (leafPrices.length > 1) break;
      validScope = current;
      current = current.parentElement;
    }

    return (
      containerHasExcludedTag(validScope, { ignoreTabs: true, excludeCards: false }) ||
      hasExcludedCategoryInScope(validScope, { excludeCards: false })
    );
  }

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

  function protectionFee(price) {
    if (price >= 1 && price <= 25) return 1.95;
    if (price > 25 && price <= 100) return 1.95 + (161 / 1500) * (price - 25);
    if (price > 100 && price <= 300) return 10 + 9.1 * Math.log(price / 100);
    if (price > 300 && price <= 1000) return 20;
    if (price > 1000 && price <= 2500) return 50;
    return null;
  }

  function euro(value) {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR"
    }).format(value);
  }

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

  function cleanupOrphanWidgets(activePriceElements) {
    const activeSet = new Set(activePriceElements);
    document.querySelectorAll("." + WIDGET_CLASS).forEach(widget => {
      const prev = widget.previousElementSibling;
      if (!prev || !activeSet.has(prev)) {
        widget.remove();
      }
    });
  }

  function render() {
    observer.disconnect();

    try {
      if (isExcludedPage()) {
        document.querySelectorAll("." + WIDGET_CLASS).forEach(el => el.remove());
        document.querySelectorAll("[data-wfc-done]").forEach(el => delete el.dataset.wfcDone);
        return;
      }

      const priceElements = findPriceElements();
      const renderedPriceElements = [];

      priceElements.forEach(chosen => {
        if (hasExcludedBadge(chosen)) {
          const existingWidget = chosen.nextElementSibling;
          if (existingWidget && existingWidget.classList.contains(WIDGET_CLASS)) {
            existingWidget.remove();
          }
          delete chosen.dataset.wfcDone;
          return;
        }

        const price = parsePrice(chosen.innerText || chosen.textContent);
        if (price === null) return;

        renderedPriceElements.push(chosen);

        if (chosen.dataset.wfcDone === String(price)) return;

        let widget = chosen.nextElementSibling;
        if (!widget || !widget.classList.contains(WIDGET_CLASS)) {
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

        chosen.dataset.wfcDone = String(price);
      });

      cleanupOrphanWidgets(renderedPriceElements);
    } finally {
      startObserving();
    }
  }

  let timer;
  const scheduleRender = () => {
    clearTimeout(timer);
    timer = setTimeout(render, 200);
  };

  const observer = new MutationObserver(scheduleRender);

  function hookHistoryNavigation() {
    const wrap = method => {
      const original = history[method];
      if (typeof original !== "function") return;
      history[method] = function (...args) {
        const result = original.apply(this, args);
        scheduleRender();
        return result;
      };
    };
    wrap("pushState");
    wrap("replaceState");
    window.addEventListener("popstate", scheduleRender);
  }

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

  hookHistoryNavigation();
  render();
})();