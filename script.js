window.onload = kongo;

const mouse = { x: 0, y: 0, left: false };

function mouse_listen() {
	const update_mouse = (ev) => {
		mouse.x = ev.clientX;
		mouse.y = ev.clientY;
		mouse.left = ev.buttons & 1;
	};

	document.body.addEventListener('mousemove', update_mouse);
	document.body.addEventListener('mousedown', update_mouse);
	document.body.addEventListener('mouseup', update_mouse);
}

function wsreload() {
	const ws = new WebSocket("ws://localhost:8080");
	ws.onmessage = (msg) => {
		console.log("WS: ", msg.data)
		if (msg.data == 'refresh')
			window.location.reload()
	};
}

function el(type, klass, ...children) {
	const element = document.createElement(type);
	if (klass) {
		element.className = klass;
	}

	if (children.length > 0) {
		element.append(...children);
	}

	return element;
}

function text(str) {
	return document.createTextNode(str);
}

function food_element(food_item) {
	const img = el("img");
	img.src = food_item.assetUrl;
	const food_image = el("div", "food-image", img);
	const food_title = el("h1", "food-title", text(food_item.itemName));
	const food_description = el("p", "food-description", text(food_item.itemDescription));

	const food_original = el("span", "food-original-price", text(food_item.itemPrice.toFixed(2)));
	const percentage = Math.round(100 * (food_item.itemPrice - food_item.itemDiscountPrice) / food_item.itemDiscountPrice);
	const food_percentage = el("span", "food-discount-percentage", text(percentage + "%"));
	const food_price = el("p", "food-price", text(food_item.itemDiscountPrice.toFixed(2)));

	const food_discount = el(
		"p", "food-discount",
		text("("), food_original,
		el("span", "food-original-price-trailer", text("kn ")),
		food_percentage, text(")"));

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

function throttle(fn, ms = 100) {
	let last_call_time = null;
	let last_return = null;

	return (...args) => {
		if (last_call_time && Date.now() - last_call_time > ms) {
			last_call_time = null;
		}

		if (!last_call_time) {
			last_call_time = Date.now();
			last_return = fn(...args);
		}

		return last_return;
	};
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
			if (ratio > 0.6) {
				el.classList.toggle("unfocused", true);
			} else {
				el.classList.toggle("unfocused", false);
			}
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

function current_second() {
	return Date.now() / 1000;
}

window.settings = {
	rotate: true,
	rotate_interval: 5,
	rotate_index: 0,
	rotate_time: 0
};

function kongo() {
	wsreload();
	mouse_listen();
	const main = scrollable(document.querySelector("main"));

	for (let i = 0; i < 20; i++) {
		main.append(food_element({
			screenDetailId: 1,
			screenId: 1,
			itemAssetId: 1,
			itemOrder: 1,
			itemName: "Salata s piletinom",
			itemPrice: 17.99,
			itemDiscountPrice: 13.5,
			itemDescription: "pileća prsa s grilla na salati od baby špinata i "
				+ "listova cikle, rajčice, ljubičastog luka, rikole i svježih "
				+ "krastavaca, obogaćena sjemenkama grillanog sezama",
			itemDeclaration: "Kiseli kupus,luk,papar,sol, lovor,paprika slatka, "
				+ "vegeta dimljena slanina,ulje. Proizvodi:Konzum d.d. Cuvati na "
				+ "temp.od 4° do 6° C",
			itemAmount: "100",
			itemUom: "g",
			itemAllergens: null,
			itemNutritionFacts: null,
			itemFooter: null,
			assetName: "Slika",
			assetUrl: "graphics/plate.png",
			assetSize: 123,
			assetWidth: 100,
			assetHeight: 100,
			assetGeometry: "left"
		}));
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
