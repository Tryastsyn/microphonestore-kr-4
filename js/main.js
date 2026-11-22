function setupCatalog() {
    const form = document.getElementById("catalog-filters");
    if (!form) return;

    const grid = document.getElementById("catalog-grid");
    const count = document.getElementById("catalog-count");
    const empty = document.getElementById("catalog-empty");
    const search = form.elements.namedItem("q");
    const category = form.elements.namedItem("category");
    const min = form.elements.namedItem("min");
    const max = form.elements.namedItem("max");
    const sort = form.elements.namedItem("sort");
    const products = [...grid.children].map((item) => ({
        item,
        price: Number(item.dataset.price),
        name: item.querySelector(".product-card__title").textContent,
        text: item.querySelector(".card-body").textContent.toLocaleLowerCase("ru-RU"),
    }));

    function updateProducts() {
        const terms = search.value.trim().toLocaleLowerCase("ru-RU").split(/\s+/);
        const minPrice = min.value === "" ? 0 : min.valueAsNumber;
        const maxPrice = max.value === "" ? Infinity : max.valueAsNumber;
        const selected = category.value;
        let visible = 0;

        for (const { item, price, text }
            of products) {
            const matchesCategory = selected === "all" || item.hasAttribute("data-" + selected);
            const matchesSearch = terms.every((term) => text.includes(term));
            item.hidden = !matchesCategory || !matchesSearch || price < minPrice || price > maxPrice;
            if (!item.hidden) visible += 1;
        }

        const ordered = [...products];
        if (sort.value === "price-asc") ordered.sort((a, b) => a.price - b.price);
        if (sort.value === "price-desc") ordered.sort((a, b) => b.price - a.price);
        if (sort.value === "name") ordered.sort((a, b) => a.name.localeCompare(b.name, "ru"));
        for (const { item }
            of ordered) grid.append(item);

        count.textContent = "Показано " + visible + " из " + products.length;
        grid.hidden = visible === 0;
        empty.hidden = visible !== 0;
    }

    function checkPriceRange() {
        const reversed = min.value !== "" && max.value !== "" && min.valueAsNumber > max.valueAsNumber;
        max.setCustomValidity(reversed ? "Верхняя граница должна быть не меньше нижней." : "");
        return form.checkValidity();
    }

    function updateIfValid() {
        if (checkPriceRange()) updateProducts();
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (checkPriceRange()) updateProducts();
        else form.reportValidity();
    });
    for (const input of[min, max]) input.addEventListener("input", checkPriceRange);
    for (const input of form.querySelectorAll("[name='category']")) input.addEventListener("change", updateIfValid);
    search.addEventListener("input", updateIfValid);
    sort.addEventListener("change", updateIfValid);
    for (const button of document.querySelectorAll("[data-reset-filters]")) {
        button.addEventListener("click", () => {
            form.reset();
            max.setCustomValidity("");
            updateProducts();
            if (button.closest("#catalog-empty")) search.focus();
        });
    }
    updateIfValid();
}

function setupDisclosures() {
    for (const button of document.querySelectorAll("[data-disclosure]")) {
        const panel = document.getElementById(button.getAttribute("aria-controls"));
        if (!panel) continue;
        button.addEventListener("click", () => {
            const expanded = panel.classList.toggle("show");
            button.setAttribute("aria-expanded", String(expanded));
            if (button.classList.contains("navbar-toggler")) {
                button.setAttribute("aria-label", expanded ? "Скрыть меню" : "Показать меню");
            }
        });
    }
}

function setupGuideTabs() {
    const tabs = [...document.querySelectorAll(".home-guide__tabs [role='tab']")];
    for (const [index, tab] of tabs.entries()) {
        tab.addEventListener("click", () => {
            for (const button of tabs) {
                const selected = button === tab;
                button.classList.toggle("active", selected);
                button.setAttribute("aria-selected", String(selected));
                button.tabIndex = selected ? 0 : -1;
                const panel = document.getElementById(button.getAttribute("aria-controls"));
                panel.hidden = !selected;
            }
        });
        tab.addEventListener("keydown", (event) => {
            const destinations = {
                ArrowLeft: (index + tabs.length - 1) % tabs.length,
                ArrowRight: (index + 1) % tabs.length,
                Home: 0,
                End: tabs.length - 1,
            };
            if (!Object.hasOwn(destinations, event.key)) return;
            event.preventDefault();
            const next = tabs[destinations[event.key]];
            next.click();
            next.focus();
        });
    }
}

function setupOrderForm() {
    const dialog = document.getElementById("order-dialog");
    if (!dialog) return;
    const form = document.getElementById("order-form");
    const name = document.getElementById("order-name");
    const product = document.getElementById("selected-product");
    const summary = document.getElementById("selected-product-summary");
    const topic = document.getElementById("order-topic");
    const phone = document.getElementById("order-phone");
    const notice = document.getElementById("success-message");
    let noticeTimer;

    function hideNotice() {
        clearTimeout(noticeTimer);
        notice.hidden = true;
    }

    for (const button of document.querySelectorAll("[data-order]")) {
        button.addEventListener("click", () => {
            form.reset();
            form.classList.remove("was-validated");
            name.setCustomValidity("");
            phone.setCustomValidity("");
            hideNotice();
            product.value = button.dataset.product || "";
            topic.value = product.value ? "product" : "consultation";
            summary.hidden = product.value === "";
            summary.textContent = product.value ? "Товар: " + product.value : "";
            dialog.showModal();
            name.focus();
        });
    }
    for (const button of dialog.querySelectorAll("[data-close-dialog]")) {
        button.addEventListener("click", () => dialog.close());
    }
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
    });
    notice.querySelector("[data-close-notice]").addEventListener("click", hideNotice);
    name.addEventListener("input", () => name.setCustomValidity(""));
    phone.addEventListener("input", () => phone.setCustomValidity(""));

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        name.value = name.value.trim();
        name.setCustomValidity(name.value.length < 2 ? "Введите имя из двух или более символов." : "");
        const phoneDigits = phone.value.replace(/\D/g, "");
        const validPhoneDigits = /^(?:7|8)?\d{10}$/.test(phoneDigits);
        const validPhone = validPhoneDigits && /^[+\d\s().-]+$/.test(phone.value);
        phone.setCustomValidity(phone.value && !validPhone ? "Укажите телефон в формате +7 (900) 000-00-00." : "");

        form.classList.add("was-validated");
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        dialog.close();
        notice.hidden = false;
        noticeTimer = setTimeout(hideNotice, 8000);
    });
    form.querySelector("[type='submit']").disabled = false;
}

function setupSiteHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    const announcement = header.querySelector(".shop-announcement");
    const styles = document.documentElement.style;

    function updateHeaderSize() {
        const headerHeight = header.getBoundingClientRect().height;
        const announcementHeight = announcement ? announcement.getBoundingClientRect().height : 0;
        styles.setProperty("--screen-header-height", headerHeight + "px");
        styles.setProperty("--site-announcement-height", announcementHeight + "px");
        styles.setProperty("--site-nav-height", (headerHeight - announcementHeight) + "px");
    }

    updateHeaderSize();
    if ("ResizeObserver" in window) {
        new ResizeObserver(updateHeaderSize).observe(header);
    } else {
        window.addEventListener("resize", updateHeaderSize);
    }
}

function setupHomeStats() {
    const stats = document.getElementById("home-stats");
    if (!stats || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const numbers = Array.from(stats.querySelectorAll("[data-count-up]"), (element) => ({
        element,
        total: Number(element.textContent),
    }));

    const counter = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        counter.disconnect();
        const start = performance.now();

        function animate(time) {
            const progress = Math.min(1, Math.max(0, (time - start) / 750));
            const eased = 1 - (1 - progress) ** 2;
            for (const { element, total }
                of numbers) {
                element.textContent = Math.round(total * eased);
            }
            if (progress < 1) requestAnimationFrame(animate);
        }

        requestAnimationFrame(animate);
    }, { threshold: 0.25 });

    counter.observe(stats);
}

setupSiteHeader();
setupDisclosures();
setupGuideTabs();
setupCatalog();
setupOrderForm();
setupHomeStats();