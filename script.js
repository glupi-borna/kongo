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

function el(type, klass) {
	const element = document.createElement(type);
	if (klass) {
		element.className = klass;
	}
	return element;
}

function text(str) {
	return document.createTextNode(str);
}

function food_element(food_item) {
	const food_el = el("article", "food-element");

	const food_image = el("div", "food-image");
	const img = el("img");
	img.src = food_item.image;
	food_image.append(img);

	const food_details = el("div", "food-details");
	const food_blank = el("div", "food-blank");

	const food_summary = el("div", "food-summary");

	const food_title = el("h1", "food-title");
	food_title.append(text(food_item.name));

	const food_description = el("p", "food-description");
	food_description.append(text(food_item.description));

	const food_discount = el("p", "food-discount");

	const food_original = el("span", "food-original-price");
	food_original.append(text(food_item.price));
	const food_percentage = el("span", "food-discount-percentage");
	food_percentage.append(text(food_item.discount));

	const kn = el("span", "food-original-price-trailer");
	kn.append(text("kn "));

	food_discount.append(
		text("("),
		food_original,
		kn,
		food_percentage,
		text(")")
	);

	const food_price = el("p", "food-price");
	food_price.append(text(food_item.discount_price));

	food_summary.append(food_title, food_description, food_discount, food_price);

	food_details.append(food_summary, food_blank);

	food_el.append(food_image, food_details);
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
	rotate: false,
	rotate_interval: 10,
	rotate_index: 0,
	rotate_time: 0
};

function kongo() {
	wsreload();
	mouse_listen();
	const main = scrollable(document.querySelector("main"));

	for (let i = 0; i < 3; i++) {
		main.append(food_element({
			name: "Salata s piletinom",
			price: "17,99",
			discount: "-25%",
			discount_price: "13,50",
			description: "pileća prsa s grilla na salati od baby špinata i "
			+ "listova cikle, rajčice, ljubičastog luka, rikole i svježih "
			+ "krastavaca, obogaćena sjemenkama grillanog sezama",
			amount: "100",
			uom: "g",
			price: "14.99",
			image: "graphics/plate.png"
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
