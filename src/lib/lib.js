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

function navigate_to(path, new_tab=false) {
	let app_root = location.href.split("/").slice(0,-1).join("/");

	if (new_tab) {
		window.open(app_root + path, "_blank");
	} else {
		location = app_root + path;
	}
}

function mouse_listen(delay=500, mouse_side_cls=false) {
	let last_update = performance.now();

	const update_mouse = (ev) => {
		mouse.x = ev.clientX;
		mouse.y = ev.clientY;
		mouse.left = ev.buttons & 1;

		if (mouse_side_cls) {
			document.body.classList.toggle("mouse-left",   mouse.x < window.innerWidth * 0.5);
			document.body.classList.toggle("mouse-right",  mouse.x >= window.innerWidth * 0.5);
			document.body.classList.toggle("mouse-top",    mouse.y < window.innerHeight * 0.5);
			document.body.classList.toggle("mouse-bottom", mouse.y >= window.innerHeight * 0.5);
		}

		if (performance.now() - last_update > delay) {
			document.body.style.setProperty("--mouse-x", mouse.x / window.innerWidth);
			document.body.style.setProperty("--mouse-y", mouse.y / window.innerHeight);
			last_update = performance.now();
		}
	};

	document.body.addEventListener('mousemove', update_mouse);
	document.body.addEventListener('mousedown', update_mouse);
	document.body.addEventListener('mouseup', update_mouse);
}

function wsreload() {
	if (!location.host.startsWith("localhost")) {
		return;
	}

	const ws = new WebSocket("ws://localhost:8080");
	ws.onmessage = (msg) => {
		console.log("WS: ", msg.data);

		if (msg.data == 'refresh') {
			window.location.reload();
		}
	};
}
wsreload();


function function_unwrap(arg) {
	// Calls a function and returns the result if the passed argument is a function.
	// Otherwise, returns the passed argument.
	if (typeof (arg) === "function") { return arg() };
	return arg;
}

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
		assetUrl: "graphics/plate.jpeg",
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

function pass() {
	return pass;
}

function show(id, data, push_state=true) {
	if (push_state) {
		history.pushState([id, data], window.title);
	}

	let target = document.getElementById(id);

	if (target.navigation_condition) {
		if (!target.navigation_condition(data)) {
			console.log("not allowed to show ", id);
			return show;
		}
	}

	console.log("showing", id);

	setTimeout(() => {
		for (let child of target.parentElement.children) {
			if (child===target) {
				child.classList.toggle("display-none", false);
				fadein(child);
			} else {
				fadeout(child).then(() => {
					child.classList.toggle("display-none", true);
				});
			}

			let old = child.show_state;
			let update = old != (child===target);
			child.show_state = (child===target);

			if (child === target) {
				if (update) {
					setTimeout(() => {
						child.dispatchEvent(new CustomEvent("shown", {detail: data}));
					});
				}
				child.classList.toggle("display-none", false);
			} else {
				if (update) {
					setTimeout(() => {
						child.dispatchEvent(new Event("hidden"));
					});
				}
			}
		}
	});

	return pass;
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

function fadein(element) {
	let ft;

	let prom = new Promise(resolve => {
		element.classList.toggle("fadeout", false);
		element.classList.toggle("fadein", true);

		ft = setTimeout(() => {
			element.classList.toggle("fadeout", false);
			element.classList.toggle("fadein", false);
			element.fade_resolve = null;
			element.fade_timeout = null;
			resolve();
		}, 250);

		if (element.fade_timeout) {
			clearTimeout(element.fade_timeout);
			element.fade_resolve();
		}

		element.fade_timeout = ft;
		element.fade_resolve = resolve;
	});

	return prom;
}

function fadeout(element) {
	let ft;

	let prom = new Promise(resolve => {
		element.classList.toggle("fadeout", true);
		element.classList.toggle("fadein", false);

		ft = setTimeout(() => {
			element.classList.toggle("fadeout", false);
			element.classList.toggle("fadein", false);
			element.fade_resolve = null;
			element.fade_timeout = null;
			resolve();
		}, 250);

		if (element.fade_timeout) {
			clearTimeout(element.fade_timeout);
			element.fade_resolve();
		}

		element.fade_timeout = ft;
		element.fade_resolve = resolve;
	});

	return prom;
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
	let children = [...el.childNodes];
	for (let node of children) {
		if (node.no_remove) {
			continue;
		}
		node.remove();
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

function get_url_search_params() {
	let params_str = location.search.substring(1);
	let params_pairs = params_str.split(";");
	let params = {};

	for (let param of params_pairs) {
		let [key, value] = param.split("=").map(s=>(s||"").trim());
		params[key] = value;
	}
	return params;
}

function all_children(root, include_root=true) {
	let els = [root];
	for (let child of root.children) {
		els.push(...all_children(child, false))
	}
	return els;
}

function bench_compare(fns, repeats=100000) {
	let results = new Map();
	for (let fn of fns) {
		let t1 = performance.now();

		for (let i = 0; i<repeats; i++) {
			fn();
		}

		results.set(fn, performance.now() - t1);
	}
	return results;
}

function bench(fn, repeats=100000) {
	let t1 = performance.now();

	for (let i = 0; i<repeats; i++) {
		fn();
	}

	return performance.now() - t1;
}
