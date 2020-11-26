const original_append = Element.prototype.append;
Element.prototype.append = function append(...children) {
	children = children.filter(c => c !== null && c!== undefined);
	original_append.bind(this)(...children);
}

window.mouse = { x: 0, y: 0, left: false };
window.onpopstate = () => {
	show(...history.state, false);
};

class Signal {
	static UNSUB = Symbol("Signal.Unsub")
	static CLEAR = Symbol("Signal.Clear")
	static FINISH = Symbol("Signal.Finish")
	static KILL = Symbol("Signal.Kill")

	constructor(options={type: "any", nullable: true, initial: null}) {
		if (typeof(options?.type) == "string")
			this.checkFunction = (val) => {
				if (val == null && (options?.nullable ?? true))
					return true

				return typeof(val) == options.type
			}

		else if (options?.type == undefined || options?.type == "any")
			this.checkFunction = () => true

		else
			this.checkFunction = (val) => {
				if (val == null && (options?.nullable ?? true))
					return true
				return val instanceof options.type
			}

		this.subscriptions = new Set()
		this.finished = false

		this.emit(options?.initial ?? null)
	}

	subscribe(fn, immediate = false) {
		if (this.finished)
			throw new ReferenceError("Trying to subscribe to a finished signal!")

		this.subscriptions.add(fn)

		if (immediate)
			this.update_sub(fn)

		return () => this.subscriptions.delete(fn)
	}

	update_sub(fn) {
		if (this.finished)
			throw new ReferenceError("Trying to emit from a finished signal!")

		if (!this.subscriptions.has(fn))
			throw new ReferenceError("Function is not subscribed to this singal!")

		return fn(this.current_value)
	}

	update_subs() {
		if (this.finished)
			throw new ReferenceError("Trying to emit from a finished signal!")

		let clear = false
		let finish = false
		let killed = false
		let to_emit = []

		for (let fn of this.subscriptions) {
			let res = this.update_sub(fn);

			if ([Signal.UNSUB, Signal.CLEAR, Signal.FINISH, Signal.KILL].includes(res)) {
				this.subscriptions.delete(fn);

				if ([Signal.CLEAR, Signal.FINISH, Signal.KILL].includes(res)) {
					clear = true;

					if ([Signal.FINISH, Signal.KILL].includes(res)) {
						finish = true;
						if (res == Signal.KILL) {
							killed = true;
							break;
						}
					}
				}
			}
		}

		if (!killed)
			for (let val of to_emit)
				this.emit(val)

		if (clear)
			signal.clear();

		this.finished = finish;
	}

	async next() {
		return await new Promise(res =>
			this.subscribe(() => {
				res(this.current_value)
				return Signal.UNSUB
			})
		)
	}

	emit(val) {
		if (this.finished)
			throw new ReferenceError("Trying to emit from a finished signal!")

		if (this.checkFunction(val)) {
			this.current_value = val
			this.update_subs()
		} else
			throw new TypeError("Trying to emit wrong type from signal!")
	}

	clear() {
		if (this.finished)
			throw new ReferenceError("Trying to clear a finished signal!")

		this.subscriptions.clear()
	}

	end() {
		if (this.finished)
			throw new ReferenceError("Trying to end a finished signal!")

		this.subscriptions.clear()
		this.finished = true
	}
}

function mouse_listen() {
	const update_mouse = (ev) => {
		mouse.x = ev.clientX;
		mouse.y = ev.clientY;
		mouse.left = ev.buttons & 1;

		document.body.classList.toggle("mouse-left",   mouse.x < window.innerWidth * 0.5);
		document.body.classList.toggle("mouse-right",  mouse.x >= window.innerWidth * 0.5);
		document.body.classList.toggle("mouse-top",    mouse.y < window.innerHeight * 0.5);
		document.body.classList.toggle("mouse-bottom", mouse.y >= window.innerHeight * 0.5);
		document.body.style.setProperty("--mouse-x", mouse.x / window.innerWidth);
		document.body.style.setProperty("--mouse-y", mouse.y / window.innerHeight);
	};

	document.body.addEventListener('mousemove', update_mouse);
	document.body.addEventListener('mousedown', update_mouse);
	document.body.addEventListener('mouseup', update_mouse);
}

function wsreload() {
	const ws = new WebSocket("ws://localhost:8080");
	ws.onmessage = (msg) => {
		console.log("WS: ", msg.data);

		if (msg.data == 'refresh') {
			window.location.reload();
		}
	};
}
wsreload();

function fake_item() {
	return {
		screenDetailId: 1,
		screenId: 1,
		itemAssetId: 1,
		itemOrder: 1,
		itemName: "Salata s piletinom",
		itemPrice: 17.99,
		itemDiscount: 25,
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
	};
}

function form_data(form) {
	let data = {};
	for (let element of form.elements) {
		data[element.name] = element.value;
	}
	return data;
}

function reset_validity(el) {
	el.setCustomValidity('');
}

const show_stack = [];

function show(id, data, push_stack=true) {
	if (push_stack) {
		history.pushState([id, data], window.title);
	}

	let target = document.getElementById(id);
	for (let child of target.parentElement.children) {
		child.classList.toggle("fadeout", child!==target);
		child.classList.toggle("fadein", child===target);
		child.classList.toggle("display-none", child!==target);

		let old = child.show_state;
		let update = old != (child===target);
		child.show_state = (child===target);

		if (child === target) {
			if (update) {
				child.dispatchEvent(new CustomEvent("shown", {detail: data}));
			}
			child.classList.toggle("display-none", false);
		} else {
			if (update) {
				child.dispatchEvent(new Event("hidden"));
			}
			setTimeout(() => {
				child.classList.toggle("display-none", true);
			});
		}
	}
}

const globals = {};
function set_global(varname, on_off) {
	on_off = Boolean(on_off);
	globals[varname] = on_off;
	document.body.setAttribute(varname, on_off);
}

function get_global(varname) {
	return Boolean(globals[varname]);
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

function current_second() {
	return Date.now() / 1000;
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

function image(url) {
	let img = el("img", "not-loaded");
	img.onload = () => img.classList.toggle("not-loaded", false);
	img.src = url;
	return img;
}

function remove_children(el) {
	while(el.hasChildNodes()) {
		el.firstChild.remove();
	}
}

function q(arg, par=document) {
	return par.querySelector(arg);
}

function array_mode(array) {
	if (array.length === 0) {
		return null;
	}

	const mode_counts = new Map();
	let max_count = 0;
	let max_item = null;

	for (let item of array) {
		let count = mode_counts.get(item) || 0;
		mode_counts.set(item, count++);
		if (count > max_count) {
			max_item = item;
			max_count = count;
		}
	}

	return max_item;
}

function diff_objects(obj1, obj2) {
	let keys = Array.from(new Set([...Object.keys(obj1), ...Object.keys(obj2)]));

	let new_obj = {};
	let diffs = 0;
	for (let key of keys) {
		if (obj1[key] !== obj2[key]) {
			new_obj[key] = obj2[key];
			diffs++;
		}
	}

	if (diffs === 0) {
		return null;
	}

	return new_obj;
}
