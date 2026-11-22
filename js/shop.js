(() => {
    const status = document.querySelector("[data-shop-status]");
    const list = document.querySelector("[data-shop-list]");
    const empty = document.querySelector("[data-shop-empty]");
    const total = document.getElementById("cart-total");
    const cartBadge = document.querySelector("[data-cart-count]");
    const cartLink = cartBadge && cartBadge.closest("a");
    const favoriteButtons = new Map();
    const price = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
    const key = name => "shopproject." + name;

    function read(name, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key(name)));
            if (value === null) return fallback;
            return value;
        } catch {
            return fallback;
        }
    }

    function save(name, value, message) {
        try {
            localStorage.setItem(key(name), JSON.stringify(value));
        } catch {
            if (status) status.textContent = "Не удалось сохранить данные в этом браузере.";
            return false;
        }
        if (status) status.textContent = message;
        if (name === "cart") updateCart(value);
        return true;
    }

    function items(name) {
        const entries = read(name, []);
        if (!Array.isArray(entries)) return [];
        return entries.filter(item =>
            item && /^product-\d+$/.test(item.id) && typeof item.name === "string" &&
            Number.isFinite(item.price) && item.price >= 0 &&
            (name !== "cart" || (Number.isSafeInteger(item.quantity) && item.quantity > 0))
        );
    }

    function node(tag, classes, text = "") {
        const el = document.createElement(tag);
        el.className = classes;
        el.textContent = text;
        return el;
    }

    function button(label, action, variant = "btn-outline-primary") {
        const el = node("button", "btn " + variant, label);
        el.type = "button";
        el.addEventListener("click", action);
        return el;
    }

    function addToCart(product) {
        const cart = items("cart");
        const entry = cart.find(item => item.id === product.id);
        const quantity = entry ? entry.quantity + 1 : 1;
        if (!Number.isSafeInteger(quantity)) return;
        const next = { id: product.id, name: product.name, price: product.price, quantity };
        if (product.image) next.image = product.image;
        if (entry) Object.assign(entry, next);
        else cart.push(next);
        save("cart", cart, "Товар добавлен в корзину.");
    }

    function updateFavoriteButtons() {
        const selected = new Set(items("favorites").map(item => item.id));
        for (const [id, el] of favoriteButtons) {
            const saved = selected.has(id);
            el.setAttribute("aria-pressed", String(saved));
            el.textContent = saved ? "В избранном" : "В избранное";
        }
    }

    for (const card of document.querySelectorAll("#catalog-grid > [data-price]")) {
        const photo = card.querySelector(".product-card__image");
        const product = {
            id: card.id,
            name: card.querySelector(".product-card__title").textContent.trim(),
            price: Number(card.dataset.price),
        };
        if (photo) product.image = photo.getAttribute("src");
        const favorite = button("В избранное", () => {
            const entries = items("favorites");
            const exists = entries.some(item => item.id === product.id);
            const next = exists ? entries.filter(item => item.id !== product.id) : [...entries, product];
            if (save("favorites", next, exists ? "Товар убран из избранного." : "Товар добавлен в избранное.")) {
                updateFavoriteButtons();
            }
        });
        favorite.setAttribute("aria-label", "Избранное — " + product.name);
        favoriteButtons.set(product.id, favorite);
        const actions = node("div", "d-grid w-100 gap-2 mt-2");
        actions.append(favorite, button("В корзину", () => addToCart(product)));
        card.querySelector(".card-body").append(actions);
    }

    function updateCart(cart) {
        if (total) total.textContent = price.format(cart.reduce((sum, item) => sum + item.price * item.quantity, 0));
        if (cartLink) {
            const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
            cartBadge.hidden = quantity === 0;
            cartBadge.textContent = quantity > 99 ? "99+" : String(quantity);
            cartLink.setAttribute("aria-label", quantity ? "Корзина, количество товаров: " + quantity : "Корзина");
        }
    }

    function savedProductLink(item, inCart) {
        const link = node("a", "saved-product__link");
        link.href = "catalog.html#" + item.id;

        const media = node("div", "saved-product__media");
        const image = node("img", "saved-product__image");
        const placeholder = node("i", "icon icon-mic saved-product__placeholder");
        placeholder.setAttribute("aria-hidden", "true");
        placeholder.hidden = true;
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        image.addEventListener("error", () => {
            image.hidden = true;
            placeholder.hidden = false;
        });
        const hasLocalPhoto = typeof item.image === "string" && /^images\/[\w.-]+\.(?:avif|webp|png|jpe?g)$/i.test(item.image);
        image.src = hasLocalPhoto ? item.image : "images/" + item.id + ".webp";
        media.append(image, placeholder);

        const details = node("div", "saved-product__details");
        const amount = node("p", "saved-product__price", price.format(item.price));
        if (inCart) amount.append(node("small", "saved-product__unit", " за шт."));
        details.append(node("h2", "saved-product__title", item.name), amount);
        link.append(media, details);
        return link;
    }

    function renderList() {
        if (!list) return;
        const name = list.dataset.shopList;
        const inCart = name === "cart";
        const entries = items(name);
        empty.hidden = entries.length > 0;
        list.hidden = entries.length === 0;
        list.replaceChildren();

        for (const item of entries) {
            const row = node("li", "saved-product");
            const actions = node("div", "saved-product__actions");

            if (inCart) {
                const controls = node("div", "saved-product__quantity");
                const label = node("label", "", "Количество");
                const stepper = node("div", "saved-product__stepper");
                const quantity = node("input", "form-control");
                const subtotal = node("p", "saved-product__subtotal");
                const lineTotal = node("strong", "", price.format(item.price * item.quantity));
                const decrease = button("−", () => changeQuantity(value => value - 1));
                const increase = button("+", () => changeQuantity(value => value + 1));
                decrease.classList.add("saved-product__step");
                increase.classList.add("saved-product__step");
                decrease.setAttribute("aria-label", "Уменьшить количество — " + item.name);
                increase.setAttribute("aria-label", "Увеличить количество — " + item.name);
                quantity.id = "quantity-" + item.id;
                quantity.type = "number";
                quantity.inputMode = "numeric";
                quantity.min = "1";
                quantity.step = "1";
                quantity.setAttribute("aria-label", "Количество — " + item.name);
                label.htmlFor = quantity.id;

                function syncQuantityControls() {
                    quantity.value = item.quantity;
                    decrease.disabled = item.quantity <= 1;
                    increase.disabled = item.quantity >= Number.MAX_SAFE_INTEGER;
                }

                function changeQuantity(getValue) {
                    const cart = items("cart");
                    const entry = cart.find(product => product.id === item.id);
                    if (!entry) return refresh();
                    const value = getValue(entry.quantity);
                    item.quantity = entry.quantity;
                    if (Number.isSafeInteger(value) && value > 0 && value !== entry.quantity) {
                        entry.quantity = value;
                        if (save("cart", cart, "Количество обновлено.")) item.quantity = value;
                    }
                    lineTotal.textContent = price.format(item.price * item.quantity);
                    syncQuantityControls();
                }

                quantity.addEventListener("change", () => changeQuantity(() => quantity.valueAsNumber));
                syncQuantityControls();
                stepper.append(decrease, quantity, increase);
                controls.append(label, stepper);
                subtotal.append(node("span", "", "Сумма"), lineTotal);
                actions.append(controls, subtotal);
            } else {
                actions.append(button("В корзину", () => addToCart(item), "btn-primary"));
            }

            const remove = button("Убрать", () => {
                const next = items(name).filter(product => product.id !== item.id);
                if (save(name, next, "Товар удалён.")) renderList();
            });
            remove.classList.add("saved-product__remove");
            remove.setAttribute("aria-label", "Убрать — " + item.name);
            actions.append(remove);
            row.append(savedProductLink(item, inCart), actions);
            list.append(row);
        }
    }

    const profile = document.getElementById("profile-form");
    if (profile) {
        const name = document.getElementById("profile-name");
        const email = document.getElementById("profile-email");
        const saved = read("profile", {});
        name.value = typeof saved.name === "string" ? saved.name : "";
        email.value = typeof saved.email === "string" ? saved.email : "";
        profile.addEventListener("submit", event => {
            event.preventDefault();
            name.value = name.value.trim();
            if (profile.reportValidity()) save("profile", { name: name.value, email: email.value }, "Профиль сохранён.");
        });
    }

    function refresh() {
        updateFavoriteButtons();
        renderList();
        updateCart(items("cart"));
    }

    window.addEventListener("pageshow", refresh);
    window.addEventListener("storage", event => {
        if (event.key === key("cart") || event.key === key("favorites") || event.key === null) refresh();
    });
    refresh();
})();