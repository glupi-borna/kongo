window.onload = kongo;

function food_element(food_item) {
	const img = image(backend_url + food_item.assetUrl);
	const food_image = el("div", "food-image", img);
	const food_title = el("h1", "food-title", text(food_item.itemName));
	const food_description = el("p", "food-description", text(food_item.itemDescription));

	let price = food_item.itemPrice;
	let discount_price = food_item.itemDiscountPrice;
	const percentage = Math.round(100 * (price - discount_price) / discount_price);
	let has_discount = discount_price > 0 && percentage >= 5;

	let food_discount, food_original, food_percentage, food_price = null;

	if (has_discount) {
		food_original = el("span", "food-original-price", text(price.toFixed(2)));
		food_percentage = el("span", "food-discount-percentage", text(percentage + "%"));
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

	const food_declaration = el(
		"p", "food-declaration",
		el("h1", "food-declaration-title", text("Opis proizvoda")),
		text(food_item.itemDeclaration));

	const food_details_additional = el(
		"div", "food-details-additional",
		food_declaration);

	const food_details = el(
		"div", "food-details",
		food_summary, el("div", "food-blank"),
		food_details_additional);

	const food_el = el(
		"article", "food-element",
		food_image, food_details);

	food_el.addEventListener("click", () => {
		food_el.classList.toggle("large");
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
		}
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

	bar.append(nub);
	element.append(bar);
	element.append(container);
	container.update_scroll();

	return container;
}

const backend_url = 'http://knz-app-t.konzum.hr:8080';
const data_url = '/kongo-0.0.1/api/v1/activeScreen';
async function get_data() {
	let response = await fetch(backend_url + data_url);
	let data = await response.json();
	return data;
}

window.settings = {
	rotate: true,
	rotate_interval: 5,
	rotate_index: 0,
	rotate_time: 0
};

async function kongo() {
	wsreload();
	mouse_listen();
	const main = scrollable(document.querySelector("main"));

	// for (let i = 0; i < 20; i++) {
		// main.append(food_element({
			// screenDetailId: 1,
			// screenId: 1,
			// itemAssetId: 1,
			// itemOrder: 1,
			// itemName: "Salata s piletinom",
			// itemPrice: 17.99,
			// itemDiscountPrice: 13.5,
			// itemDescription: "pileća prsa s grilla na salati od baby špinata i "
				// + "listova cikle, rajčice, ljubičastog luka, rikole i svježih "
				// + "krastavaca, obogaćena sjemenkama grillanog sezama",
			// itemDeclaration: "Kiseli kupus,luk,papar,sol, lovor,paprika slatka, "
				// + "vegeta dimljena slanina,ulje. Proizvodi:Konzum d.d. Cuvati na "
				// + "temp.od 4° do 6° C",
			// itemAmount: "100",
			// itemUom: "g",
			// itemAllergens: null,
			// itemNutritionFacts: null,
			// itemFooter: null,
			// assetName: "Slika",
			// assetUrl: "graphics/plate.png",
			// assetSize: 123,
			// assetWidth: 100,
			// assetHeight: 100,
			// assetGeometry: "left"
		// }));
	// }
	for (let item of await get_data()) {
		main.append(food_element(item));
	}

	main.update_scroll();

	let rotate;
	rotate = () => {
		if (settings.rotate) {
			if (current_second() > settings.rotate_time + settings.rotate_interval) {
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
				}

				setTimeout(() => {
					elements[settings.rotate_index].click();
					settings.rotate_index++;
				}, 600);
			}
		}
		setTimeout(rotate, 30);
	};
	rotate();
}
