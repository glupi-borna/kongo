window.onerror = function onerror(msg, url, ln, col, err) {
	api.report_error(err);
	setTimeout(() => {
		window.location.reload();
	}, 30000);
};
window.onunhandledrejection = function onunhandledrejection(msg, url, ln, col, err) {
	api.report_error(err);
	setTimeout(() => {
		window.location.reload();
	}, 30000);
};
window.onload = with_error_handling(kongo, (err) => {
	api.report_error(err);
	setTimeout(() => {
		window.location.reload();
	}, 30000);
}, "stop");

function food_element(food_item) {
	window.info.screen_detail_id = food_item.screenDetailId;

	let food_image;
	const img = image(api.root + food_item.assetUrl, (img) => {
		window.info.screen_detail_id = food_item.screenDetailId;

		food_image.classList.toggle("not-loaded", false);
		img.animate([{opacity: 0}, {opacity: 1}], { duration: 250 });

		delete window.info.screen_detail_id;
	});
	food_image = el("div", "food-image not-loaded", img);
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
			text("("),
				food_original,
				el("span", "food-original-price-trailer", text("kn ")),
				food_percentage,
			text(")"));
	} else {
		food_price = el("p", "food-price", text(price.toFixed(2)));
	}

	const food_ref = el("p", "food-ref", text(food_item.itemRefUom));

	let food_std = null;
	if (food_item.itemUom && food_item.itemUom != "KO") {
		let food_std_uom = text("1" + food_item.itemUom.toLowerCase() + "=");
		let food_std_price = text(food_item.itemRefPrice.toFixed(2) + "kn");
		food_std = el("p", "food-std", food_std_uom, food_std_price);
	}

	const food_summary = el(
		"div", "food-summary",
		food_title, food_description,
		food_discount,
		food_price,
		food_ref,
		food_std,
		el("p", "food-code", text("šifra: " + String(food_item.itemId).padStart(7, "0"))));

	const food_declaration = el(
		"div", "food-declaration",
		el("h1", "food-declaration-title", text("Opis proizvoda")),
		el("p", "food-declaration-text", text(food_item.itemDeclaration)));

	const nutrition = JSON.parse(food_item.itemNutritionFacts || `{"calories": [], "nutrients": []}`);

	const row = (...els) => el("tr", "", ...els);
	const td = (val, cls="") => el("td", cls, text(val));
	const th = (val, cls="") => el("th", cls, text(val));

	let thead = el("thead", "");
	let tbody = el("tbody", "");
	let tfoot = el("tfoot", "");

	let thead_desc = th("% Dnevna Vrijednost *", "align-right");
	thead_desc.colSpan = 4;
	thead.append(row(thead_desc));

	for (let nutrient of nutrition.calories) {
		thead.append(row(
			th(nutrient.name),
			td(nutrient.value + nutrient.uom),
			td(String.fromCharCode(160).repeat(50)),
			td(nutrient.daily_value + "%")
		));
	}

	for (let nutrient of nutrition.nutrients) {
		tbody.append(row(
			th(nutrient.name),
			td(nutrient.value + nutrient.uom),
			td(String.fromCharCode(160).repeat(50)),
			td(nutrient.daily_value + "%")
		));

		if (nutrient.sub_nutrients) {
			for (let subnutrient of nutrient.sub_nutrients){
				tbody.append(row(
					td(subnutrient.name, "subnutrient"),
					td(subnutrient.value + subnutrient.uom),
					td(String.fromCharCode(160).repeat(30)),
					td(subnutrient.daily_value + "%")
				));
			}
		}
	}

	let tfoot_desc = td("* Preporučeni unos za prosječnu odraslu osobu (8400 kJ / 2000 kcal)", "align-right");
	tfoot_desc.colSpan = 4;
	tbody.append(row(tfoot_desc));

	let table = el("table", "food-nutrients-table-table", thead, tbody, tfoot);

	const food_nutrients_table = el(
		"div", "food-nutrients-table",
		el("h1", "food-nutrients-table-title", text("Nutritivne vrijednosti")),
		table
	);

	let subnutrients = nutrition.nutrients.flatMap(n=>n.sub_nutrients);
	let left_nutrients = [
		...nutrition.calories.filter(c => c.side == "left" || c.side == "both"),
		...nutrition.nutrients.filter(n => n.side == "left" || n.side == "both"),
		...subnutrients.filter(n => n.side == "left" || n.side == "both")
	];

	const food_nutrients_icons = el(
		"div", "food-nutrients-icons",
		el("h1", "food-nutrients-icons-title", text("Nutritivne vrijednosti")),
		el("div", "food-nutrients-icons-icons",
			...left_nutrients.map(
				nutrient => {
					return el(
						"div", "",
						el("p", "nutrient-icon-title", text(nutrient.name)),
						el("p", "nutrient-icon-value",
							el("span", "nutrient-icon-value-value", text(nutrient.value)),
							el("span", "nutrient-icon-value-uom", text(nutrient.uom))
						),
						el("p", "nutrient-icon-daily",
							el("span", "nutrient-icon-daily-value", text(nutrient.daily_value)),
							el("span", "nutrient-icon-daily-uom", text("%"))
						),
						image("graphics/nutri-logo.svg"));
				}
			)
		)
	);

	food_nutrients_icons.style.setProperty("--factor", 1 / Math.pow(left_nutrients.length + 1, 1));

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
		window.info.screen_detail_id = food_item.screenDetailId;
		if (!settings.allow_expand) {
			return;
		}

		food_el.classList.toggle("large");

		make_interactive();

		setTimeout(() => {
			window.info.screen_detail_id = food_item.screenDetailId;

			food_el.scrollIntoView({block: "center", inline: "center", behavior: "smooth"});
			food_el.dispatchEvent(new Event("scrollresize", {bubbles: true}));

			delete window.info.screen_detail_id;
		}, 200);

		delete window.info.screen_detail_id;
	});

	delete window.info.screen_detail_id;

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
		if (!settings.show_scrollbar) {
			return;
		}

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
	rotate_index: 'random',
	rotate_time: 0,
	show_scrollbar: false,
	allow_expand: true,

	refresh_minutes: 20,

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
	mouse_listen(500, false, false);
	const main = scrollable(document.querySelector("main"));
	const params = get_url_search_params();

	let count = 0;

	let location_id = params.location;

	if (!location_id) {
		location_id = (await api.locations.all())[0].locationId;
	}

	window.info.location_id = location_id;

	for (let item of await api.screens.active(location_id)) {
		window.info.screen_id = item.screenId;
		if (!item.visible) {
			continue;
		}

		let elem = food_element(item);
		main.append(elem);
		count++;
	}

	if (count == 0) {
		throw new Error("Screen has no items.");
	}

	if (settings.rotate_index === 'random') {
		settings.rotate_index = Math.floor(Math.random() * count);
	}

	let elements = Array.from(document.querySelectorAll("main article"));
	try {
		elements[settings.rotate_index].scrollIntoView({block: "center", inline: "center"});
	} catch (err) {
		api.report_error(err);
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

	if (settings.refresh_minutes) {
		setTimeout(try_refresh, settings.refresh_minutes * 1000 * 60)
	}
}

function try_refresh() {
	if (settings.interactive) {
		setTimeout(try_refresh, settings.interactive_seconds / 2);
	} else {
		fadeout(document.body).then(() => {
			document.body.classList.add("display-none");
			location.reload();
		});
	}
}

