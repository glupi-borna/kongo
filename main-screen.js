window.onload = kongo;

function food_element(food_item) {
	const img = image(api.root + food_item.assetUrl);
	const food_image = el("div", "food-image", img);
	const food_title = el("h1", "food-title", text(food_item.itemName));
	const food_description = el("p", "food-description", text(food_item.itemDescription || ""));

	let price = food_item.itemPrice;
	let discount_price = food_item.itemDiscountPrice;
	const percentage = Math.round(100 * (price - discount_price) / price);
	let has_discount = discount_price > 0 && percentage >= 5;

	let food_discount, food_original, food_percentage, food_price = null;

	if (has_discount) {
		food_original = el("span", "food-original-price", text(price.toFixed(2)));
		food_percentage = el("span", "food-discount-percentage", text("-" + percentage + "%"));
		food_price = el("p", "food-price", text(discount_price.toFixed(2)));
		food_discount = el(
			"p", "food-discount",
			text("("), food_original,
			el("span", "food-original-price-trailer", text("kn ")),
			food_percentage, text(")"));
	} else {
		food_price = el("p", "food-price", text(price.toFixed(2)));
	}

	const food_summary = el(
		"div", "food-summary",
		food_title, food_description,
		food_discount, food_price);

	const food_nutrients_icons = el(
		"div", "food-nutrients-icons",
		el("h1", "food-nutrients-icons-title", text("Nutritivne vrijednosti")),
		el("div", "food-nutrients-icons-icons",
			...[0,0,0,0,0,0].map(_=>el("div", "", image("graphics/nutri-logo.svg"))))
	);

	const food_declaration = el(
		"div", "food-declaration",
		el("h1", "food-declaration-title", text("Opis proizvoda")),
		el("p", "food-declaration-text", text(food_item.itemDeclaration)));

	const td = function td(value) {
		return el("td", "", text(value));
	}

	const th = function th(value) {
		return el("th", "", text(value));
	}

	const tr = function tr(label_fn, label_text, val_fn, val_text) {
		return el("tr", "", label_fn(label_text), val_fn(val_text));
	}

	const rows = function rows(num, label_fn, label_text, val_fn, val_text) {
		return new Array(num).fill(0).map(_=>tr(label_fn, label_text, val_fn, val_text));
	}

	const food_nutrients_table = el(
		"div", "food-nutrients-table",
		el("h1", "food-nutrients-table-title", text("Nutritivne vrijednosti")),
		el("table", "food-nutrients-table-table",
			el("thead", "",
				...rows(1, th, "Lorem ipsum", td, ""),
				...rows(2, th, "Vrijednost", td, "20g")),
			el("tbody", "",
				...rows(10, th, "Vrijednost", td, "20g")),
			el("tfoot", "",
				...rows(2, th, "Vitamin A", td, "2%"))
		)
	);

	const food_details_column_left = el(
		"div", "food-details-column-left",
		food_nutrients_icons, food_declaration);

	const food_details_column_right = el(
		"div", "food-details-column-right",
		food_nutrients_table);

	const food_details_additional = el(
		"div", "food-details-additional",
		food_details_column_left, food_details_column_right);

	const food_details = el(
		"div", "food-details",
		food_summary, el("div", "food-blank"),
		food_details_additional);

	const food_el = el(
		"article", "food-element",
		food_image, food_details);

	food_el.addEventListener("click", () => {
		if (!settings.allow_expand) {
			return;
		}

		food_el.classList.toggle("large");

		make_interactive();

		setTimeout(() => {
			food_el.scrollIntoView({block: "center", inline: "center", behavior: "smooth"});
			food_el.dispatchEvent(new Event("scrollresize", {bubbles: true}));
		}, 200);
	});

	return food_el;
}

function percentage(over, under) {
	return ((over / under) * 100).toFixed(2) + "%";
}

function scrollable(element) {
	const bar = el("div", "scrollbar invisible");
	const nub = el("div", "scrollbar-nub");
	const container = el("div", "scroll-container");

	container.update_scroll = () => {
		const scrollbar_width = (container.offsetWidth - container.clientWidth);

		if (!settings.show_scrollbar) {
			bar.classList.add("invisible");
			element.classList.remove("has-scrollbar");
			return;
		}

		if (container.scrollHeight > element.clientHeight) {
			if (bar.classList.contains("invisible")) {
				bar.classList.remove("invisible");
				element.classList.add("has-scrollbar");
			}
		} else {
			if (!bar.classList.contains("invisible")) {
				bar.classList.add("invisible");
				element.classList.remove("has-scrollbar");
			}
		}

		nub.style.height = percentage(element.clientHeight, container.scrollHeight);
		nub.update_y();
	};

	nub.update_y = () => {
		const scroll_offset = container.scrollTop / container.scrollHeight;

		nub.style.setProperty(
			"transform",
			`translateY(${scroll_offset * bar.clientHeight}px)`
		);

		/** UNCOMMENT to make list items get the "unfocused" class when out of view
		let container_rect = container.getBoundingClientRect();
		let middle = element.clientHeight * 0.5;

		for (let el of container.children) {
			let rect = el.getBoundingClientRect();
			let top = rect.y - container_rect.y;
			let bot = top + rect.height;

			let dist = Math.max(Math.abs(top - middle), Math.abs(bot - middle));

			let ratio = dist / element.clientHeight;

			// Elements should be blurred if more than 80% of the element is offscreen.
			el.classList.toggle("unfocused", ratio > 0.8);
		}*/
	};

	bar.addEventListener('mousedown', (ev) => {
		if (ev.used) {
			return;
		}

		let int = setInterval(() => {
			const rect = bar.getBoundingClientRect();
			const offset = (mouse.y - rect.top) / rect.height;

			container.scrollTo({
				top: offset * container.scrollHeight - element.clientHeight / 2,
				behavior: 'smooth'
			});

			if (!mouse.left) {
				clearInterval(int);
			}
		}, 33);
	});

	nub.addEventListener('mousedown', (ev) => {
		nub.dragging = true;

		let last_y = mouse.y;
		let delta_y = 0;
		let scroll_pos = container.scrollTop;

		let int = setInterval(() => {
			delta_y = mouse.y - last_y;
			last_y = mouse.y;

			let scroll_amount = (delta_y / bar.clientHeight) * container.scrollHeight;
			scroll_pos += scroll_amount;
			container.scrollTop = scroll_pos;
			nub.update_y();

			nub.dragging = nub.dragging && mouse.left;

			if (!nub.dragging) {
				clearInterval(int);
			}
		}, 33);

		ev.used = true;
	});

	container.addEventListener('scroll', nub.update_y);
	container.addEventListener('scrollresize', () => {
		nub.update_y();
		container.update_scroll()

		setTimeout(() => {
			container.update_scroll()
		}, 400);
	});
	container.addEventListener("wheel", make_interactive);
	container.addEventListener("touchmove", make_interactive);
	container.addEventListener("touch", make_interactive);

	bar.append(nub);
	element.append(bar);
	element.append(container);
	container.update_scroll();

	return container;
}

// Role
// 1. Prodavaonica - namješta što se vidi na ekranu
// 2. Podaci - nutri, opis, etc.
// 3. Admin - sve + conf ekrana

window.settings = {
	rotate: true,
	rotate_expand: false,
	rotate_interval: 5,
	rotate_index: 0,
	rotate_time: 0,
	show_scrollbar: false,
	allow_expand: true,

	// When the panel is touched, it becomes interactive for
	// an amount of seconds, and the rotation options are ignored,
	// to allow the user to browse.
	interactive: false,
	interactive_seconds: 30,
	interactive_id: null
};

function make_interactive() {
	let focused = q(".food-element.focused");
	if (focused) {
		focused.classList.toggle("focused", false);
	}

	clearTimeout(settings.interactive_id);
	settings.interactive = true;
	settings.interactive_id = setTimeout(() => {
		settings.interactive = false;
	}, settings.interactive_seconds * 1000);
}

async function kongo() {
	wsreload();
	mouse_listen();
	const main = scrollable(document.querySelector("main"));

	// for (let i = 0; i < 20; i++) {
		// main.append(food_element(fake_item()));
	// }
	for (let item of await api.screens.active(1)) {
		main.append(food_element(item));
	}

	main.update_scroll();

	let rotate;
	rotate = () => {
		if (settings.rotate) {
			if (!settings.interactive && current_second() > settings.rotate_time + settings.rotate_interval) {
				settings.rotate_time = current_second();

				let elements = Array.from(document.querySelectorAll("main article"));

				if (elements.length == 0) {
					return;
				}

				if (settings.rotate_index >= elements.length) {
					settings.rotate_index = 0;
				}

				for (let element of elements) {
					element.classList.toggle("large", false);
					element.classList.toggle("focused", false);
				}

				setTimeout(() => {
					if (settings.rotate_expand) {
						elements[settings.rotate_index].click();
						settings.interactive = false;
					} else {
						elements[settings.rotate_index].scrollIntoView({
							block: "center",
							inline: "center",
							behavior: "smooth"
						});
						main.update_scroll();
					}

					elements[settings.rotate_index].classList.toggle("focused", true);

					settings.rotate_index++;
				}, 600);
			}
		}
		setTimeout(rotate, 30);
	};
	rotate();
}
