const backend_url = 'http://knz-app-t.konzum.hr:8080';
const data_url = '/kongo-0.0.1/api/v1/activeScreen';
async function get_data() {
	let response = await fetch(backend_url + data_url);
	let data = await response.json();
	return data;
}

function toggle_input_size(textinput) {
	let new_el;

	textinput.options.expanded = !Boolean(textinput.options.expanded);

	new_el = edit_element(
		textinput.bound_object,
		textinput.bound_field,
		textinput.value_type,
		textinput.options);

	new_el.original_value = textinput.original_value;
	new_el.original_field_value = textinput.original_field_value;
	new_el.trigger_input();
	textinput.insertAdjacentElement("afterend", new_el);
	textinput.remove();
}

function hover_image(url) {
	let imgel = image("graphics/photo.svg");
	imgel.className = "icon";

	let preview = image(url);
	preview.className = "follow-mouse";

	imgel.onmouseenter = () => {
		document.body.append(preview);
	};

	imgel.onmouseleave = () => {
		preview.remove();
	};

	return imgel;
}

function static_element(value, type, options={}) {
	type = options.type || type;

	if (value === null || value === undefined) {
		return text(String("?"));
	}

	switch (type) {
		case "image":
			return hover_image((options.url_prefix || "") + String(value));
		default:
			return text(String(value));
	}
}

function edit_element(object, field, type, options={}) {
	let element;

	let val = object[field];
	let value_field = "value";

	type = options.type || type;

	if (options.expanded) {
		element = el("textarea");
		element.rows = options.rows || 3;
		element.cols = options.cols || 35;
	} else {
		element = el("input");

		switch (type) {
			case 'number':
				element.type = "number";
				element.step = "any";
				element.size = options.cols || 8;
				value_field = "valueAsNumber";
				val = Number(val);
				break;
			default:
				element.type = "text";
				element.size = options.cols || 30;
				val = String(val);
				break;
		}

		element.style.setProperty("width", element.size + "ch");
	}

	let container = el("div", "flex-horizontal flex-inline flex-middle flex-center fit-content");

	container.options = options;
	container.bound_object = object;
	container.bound_field = field;
	container.original_value = val;
	container.value_type = type;
	element[value_field] = val;

	let original_field_value = object[field];

	let reset_element = el("button", "icon", text("↺"));

	reset_element.onclick = () => {
		element[value_field] = container.original_value;
		object[field] = original_field_value;
		container.trigger_input();
	}

	element.addEventListener("input", () => {
		object[field] = element[value_field];

		let changed = element[value_field] !== container.original_value;
		reset_element.disabled = !changed;
		element.classList.toggle("changed", changed);
	});

	let size_element;
	if (options.expandable) {
		size_element = el("button", "icon", text(options.expanded ? "▼" : "▶"));
	}

	if (size_element) {
		size_element.onclick = () => {
			toggle_input_size(container);
		}
	}

	container.trigger_input = () => {element.dispatchEvent(new Event("input"))};
	container.trigger_input();
	container.append(size_element, element, reset_element);

	return container;
}

/**
interface TableOptions {

	headers?: string[];
	// The specific columns (keys) that should be shown. If not provided,
	// all columns (keys) are shown.

	headers_display?: {[header: string]: string};
	// A map for pretty printing header names. If provided, the headers list
	// will be extracted from the keys.

	id_columns?: string[];
	// List of columns that will never get thrown out when diffing changes.

	editable?: boolean;
	// Specifies if the values in the table are editable inline or not.

	valign?: string;
	// Specifies the default vertical alignment in the table.

	halign?: string;
	// Specifies the default horizontal alignment in the table.

	column_options?: {[column: string]: ColumnOptions};
	// Dict of additional options for specific columns.

}

interface ColumnOptions {

	cols?: number;
	// Forces input/textarea field width.

	rows?: number;
	// Forces textarea field height.

	type?: string;
	// Used to force a type specific type.

	editable?: boolean;
	// Used to override the table setting.

	expandable?: boolean;
	// Used to allow input fields to expand into textareas.

	valign?: string;
	// Specifies the vertical alignment override for the cell.

	halign?: string;
	// Specifies the horizontal alignment override for the cell.

	url_prefix?: string;
	// Used with the "image" type. The image's url is prefixed with this string.
}
 */
function table(data_array, options) {
	let headers_display = options.headers_display || {};
	let headers = options.headers || Object.keys(headers_display);
	let columns_options = options.column_options || {};
	let table_valign = options.valign || 'middle';
	let table_halign = options.halign || 'left';

	let table_data = new Map();

	for (let item of data_array) {
		for (let key in item) {
			table_data.set(key, []);
		}
	}

	if (headers === undefined || headers.length === 0) {
		headers = Array.from(table_data.keys());
	}

	let header_types = new Map();

	for (let header of headers) {
		let types = [];
		for (let item of data_array) {
			let type = typeof(item[header]);
			if (["undefined", "object"].includes(type)) {
				continue;
			}
			types.push(type);
		}
		header_types.set(header, array_mode(types));
	}

	let header_row = el("tr");
	let header_cells = [];
	for (let header of headers) {
		let cell = el("th");
		cell.append(text(headers_display[header] || header));
		cell.setAttribute("value_type", header_types.get(header));
		header_cells.push(cell);
	}

	header_row.append(...header_cells);

	let body_rows = [];

	for (let item of data_array) {
		let tr = el("tr");
		tr.original_data = {...item};
		tr.current_data = item;

		let cells = [];
		for (let header of headers) {
			let column_options = columns_options[header] || {};

			let cell_valign = column_options.valign || table_valign;
			let cell_halign = column_options.halign || table_halign;

			let cell = el("td");
			cell.original_value = item[header];
			cell.style.setProperty("text-align", cell_halign);
			cell.style.setProperty("vertical-align", cell_valign);
			let type = header_types.get(header);

			let editable = options.editable;
			if (column_options.editable === true) {
				editable = true;
			} else if (column_options.editable === false) {
				editable = false;
			};

			let contents;
			if (editable) {
				contents = edit_element(item, header, type, {...column_options});
			} else {
				contents = static_element(item[header], type, {...column_options});
			}

			cell.append(contents);
			cell.setAttribute("value_type", type);
			cells.push(cell);
		}

		tr.append(...cells);
		body_rows.push(tr);
	}

	let thead = el("thead");
	let tbody = el("tbody");

	thead.append(header_row);
	tbody.append(...body_rows);

	let t = el("table");
	t.append(thead, tbody);

	t.diff = () => {
		let diffs = [];
		for (let row of body_rows) {
			let diff = diff_objects(row.original_data, row.current_data);

			if (diff) {
				if (options.id_columns) {
					for (let column of options.id_columns) {
						diff[column] = row.original_data[column];
					}
				}
				diffs.push(diff);
			}
		}
		return diffs;
	}

	return t;
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

async function log_in(username, password) {
	return new Promise((res, rej) => {
		setTimeout(() => {
			if (username === 'borna.lang' && password === 'pass') {
				res(true);
			} else {
				res(true);
			}
		}, 500);
	});
}

function log_out() {
	set_global("logged_in", false);
	show("login");
}

async function login_submit(event) {
	event.preventDefault();
	let form = q('#login');
	let data = form_data(form);
	let b = q('button', form);
	b.setCustomValidity('');
	b.classList.toggle("disabled", true);

	let error = false;
	let success = false;

	try {
		success = await log_in(data.username, data.password);
	} catch {
		error = true;
	}

	b.classList.toggle("disabled", false);

	if (error) {
		b.setCustomValidity("Error communicating with server.");
		b.reportValidity();
		return;
	}

	if (!success) {
		b.setCustomValidity("Wrong username or password. Please try again.");
		b.reportValidity();
		return;
	}

	set_global("logged_in", true);
	show("mainscreen");
}

function init_mainscreen() {
	let main = q('#mainscreen');
	let articles = q('#articles');

	let display_names = {
		itemOrder: "Redni broj",
		assetUrl: "Slika",
		itemName: "Artikl",
		itemPrice: "Cijena",
		itemDiscount: "Popust",
		itemDiscountPrice: "Promo cijena",
		itemDescription: "Opis",
		itemDeclaration: "Deklaracija",
		itemUom: "Mjerna jedinica"
	};

	main.addEventListener("shown", async () => {
		let data = await get_data();
		let data_table = table(
			[...data, ...data, ...data],
			{
				headers_display: display_names,
				editable: true,
				id_columns: ["screenDetailId", "screenId", "itemAssetId"],
				valign: 'middle',
				halign: 'center',
				column_options: {
					assetUrl: {
						type: "image",
						url_prefix: backend_url,
						editable: false
					},
					itemOrder: {editable: false},
					itemDescription: {expandable: true},
					itemDeclaration: {expandable: true},
					itemUom: {cols: 4}
				}
			}
		);

		articles.append(data_table);
	});

	main.addEventListener("hidden", () => {
		remove_all_children(articles);
	});
}

function init_login() {
	let login = q('#login');
	login.addEventListener("hidden", () => {
		login.reset();
	});
}

window.onload = () => {
	mouse_listen();
	init_mainscreen();
	init_login();
	show("mainscreen");
};
