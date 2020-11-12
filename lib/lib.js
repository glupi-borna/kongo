const original_append = Element.prototype.append;
Element.prototype.append = function append(...children) {
	children = children.filter(c => c !== null && c!== undefined);
	original_append.bind(this)(...children);
}

window.mouse = { x: 0, y: 0, left: false };

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

function show(id) {
	let target = document.getElementById(id);
	for (let child of target.parentElement.children) {
		child.classList.toggle("fadeout", child!==target);
		child.classList.toggle("fadein", child===target);

		if (child === target) {
			child.dispatchEvent(new Event("shown"));
		} else {
			child.dispatchEvent(new Event("hidden"));
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
