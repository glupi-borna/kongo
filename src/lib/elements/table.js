(() => {
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


function toggle_input_size(textinput) {
	let new_el;

	textinput.options.expanded = !Boolean(textinput.options.expanded);

	new_el = edit_element(
		textinput.bound_object,
		textinput.bound_field,
		textinput.value_type,
		textinput.table,
		textinput.options);

	new_el.original_value = textinput.original_value;
	new_el.original_field_value = textinput.original_field_value;
	new_el.trigger_input();
	textinput.insertAdjacentElement("afterend", new_el);
	textinput.remove();
}

function static_element(value, type, table, options={}) {
	type = options.type || type;

	let el;

	if (value === null || value === undefined) {
		el = text(String("?"));
	} else {
		switch (type) {
			case "image":
				el = hover_image((options.url_prefix || "") + String(value));
				break;
			default:
				el = text(String(value));
				break;
		}
	}

	el.table = table;
	return el;
}

function edit_element(object, field, type, table, options={}) {
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
	container.table = table;
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
		table.changed.emit(changed);
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

		row_click? (row_data) => void;
		// Gets called when the row is clicked on.

		actions?: TableAction[]
	}

	interface TableAction {
		label: string;
		action: (table) => void;
		init?: (table, action, button) => void;
		position?: "top-left" | "top-right" | "top-middle" |
		           "bottom-left" | "bottom-right" | "bottom-middle";
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

	let t = el("table");
	t.changed = new Signal({type: "boolean", nullable: false, initial: false});
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
				contents = edit_element(item, header, type, t, {...column_options});
			} else {
				contents = static_element(item[header], type, t, {...column_options});
			}

			cell.append(contents);
			cell.setAttribute("value_type", type);
			cells.push(cell);
		}

		tr.append(...cells);

		if (options.row_click) {
			tr.classList.toggle("clickable", true);
			tr.addEventListener("click", () => options.row_click(item));
		}

		body_rows.push(tr);
	}

	let thead = el("thead");
	let tbody = el("tbody");

	thead.append(header_row);
	tbody.append(...body_rows);

	t.append(thead, tbody);

	let actions = (options.actions || []);
	actions.forEach(a => {
		a.position = a.position || 'top-left';
		a.table = t;
	});

	let top_left_table_actions = actions.filter(a => a.position === 'top-left').map(table_action);
	let top_middle_table_actions = actions.filter(a => a.position === 'top-middle').map(table_action);
	let top_right_table_actions = actions.filter(a => a.position === 'top-right').map(table_action);

	let bottom_left_table_actions = actions.filter(a => a.position === 'bottom-left').map(table_action);
	let bottom_middle_table_actions = actions.filter(a => a.position === 'bottom-middle').map(table_action);
	let bottom_right_table_actions = actions.filter(a => a.position === 'bottom-right').map(table_action);

	let top_left = el("div", "flex-horizontal flex-dynamic flex-start", ...top_left_table_actions);
	let top_mid = el("div", "flex-horizontal flex-dynamic flex-center", ...top_middle_table_actions);
	let top_right = el("div", "flex-horizontal flex-dynamic flex-end", ...top_right_table_actions);

	let bottom_left = el("div", "flex-horizontal flex-dynamic flex-start", ...bottom_left_table_actions);
	let bottom_mid = el("div", "flex-horizontal flex-dynamic flex-center", ...bottom_middle_table_actions);
	let bottom_right = el("div", "flex-horizontal flex-dynamic flex-end", ...bottom_right_table_actions);

	let top = el("div", "flex-horizontal flex-static", top_left, top_mid, top_right);
	let bottom = el("div", "flex-horizontal flex-static", bottom_left, bottom_mid, bottom_right);

	let table_container = el("div", "flex-vertical flex-dynamic scrollable table-container", t);

	return [top, table_container, bottom];
}

function table_action(action) {
	let button = el("button", "table-action", action.label);

	if (action.init) {
		action.init(action.table, action, button);
	}

	button.onclick = () => action.action(action.table);
	return button;
}

window.Elements = {
	table: table,
	static_element: static_element,
	edit_element: edit_element
}
})();
