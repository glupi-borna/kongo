(() => {
function hover_image(url) {
	let imgel = image("graphics/photo.svg");
	imgel.className = "icon";

	let preview = image(url);
	preview.className = "follow-mouse";

	imgel.onmouseenter = () => {
		fadein(preview);
		document.body.append(preview);
	};

	imgel.onmouseleave = () => {
		fadeout(preview).then(()=>preview.remove());
	};

	return imgel;
}


function spinner(promise) {
	let s = el("div", "spinner");
	s.no_remove = true;
	fadein(s);
	promise.finally(() => {
		fadeout(s).then(()=>s.remove());
	});
	return s;
}


function toggle_input_size(textinput) {
	let new_el;

	textinput.data.options.expanded = !Boolean(textinput.data.options.expanded);

	new_el = edit_element(textinput.data);

	new_el.original_value = textinput.original_value;
	new_el.original_field_value = textinput.original_field_value;
	new_el.trigger_input();
	textinput.insertAdjacentElement("afterend", new_el);
	textinput.remove();

	setTimeout(() => {
		new_el.scrollIntoView({
			block: "center",
			inline: "center",
			behavior: "smooth"
		});
	}, 100);
}

function static_element(data) {
	type = data.options.type || data.type;

	let element;
	let value = data.object[data.field];
	let label = data.options.label || data.header_display || data.field || "LABEL";

	if (type === "button") {
		element = el("button", "", text(label));
		element.onclick = (e) => { data.options.action(data.row); e.stopPropagation(); };
	} else if (typeof(type) === "function") {
		element = data.options.type(data);
	} else if (value === null || value === undefined) {
		element = el("div", "", text(String("?")));
	} else {
		switch (type) {
			case "image":
				element = hover_image((data.options.url_prefix || "") + String(value));
				break;
			default:
				let str = String(value);

				if (str.length > 80 || data.options.expandable) {
					element = el("details", "",
						el("summary", "", text(label)),
						text(str)
					);
					element.addEventListener("click", () => {
						setTimeout(() => {
							element.scrollIntoView({
								block: "center",
								inline: "center",
								behavior: "smooth"
							});
						}, 100);
					});
				} else {
					element = el("div", "", text(str));
				}

				break;
		}
	}

	element.table = table;
	return element;
}

function edit_element(data) {
	const options = data.options || {};
	const table = data.table;
	const object = data.object;
	const field = data.field;

	let element;

	let val = object[field];
	let value_field = "value";

	type = options.type || data.type;

	if (options.expanded) {
		element = el("textarea");
		element.rows = options.rows || 3;
		element.cols = options.cols || 35;
	} else {
		switch (type) {
			case 'number':
				element = el("input");
				element.type = "number";
				element.step = "any";
				element.size = options.cols || 8;
				value_field = "valueAsNumber";
				val = Number(val);
				break;
			case 'boolean':
				element = el("input");
				element.type = "checkbox";
				element.size = 1;
				value_field = "checked";
				val = Boolean(val);
				break;
			case 'select':
				let element_options = [];

				for (let option of (data.select_options || options.select_options || [])) {
					if (typeof(option) !== "object") {
						element_options.push(el("option", "", text(option)));
					} else {
						let option_element = el("option", "", text(option.label));
						option_element.value = option.value;
						element_options.push(option_element);
					}
				}

				element = el("select", "", ...element_options);
				break;
			default:
				element = el("textarea");
				element.rows = options.cols || 1;
				element.cols = options.cols || 35;
				val = String(val);
				break;
		}

		element.style.setProperty("width", (element.size || 30) + "ch");
	}

	element.placeholder = options.placeholder ?? options.header_display ?? "";

	let container = options.container_element?.() || el(
		options.container_type || "div",
		options.container_class ?? "flex-horizontal flex-inline flex-middle flex-center fit-content");

	container.data = data;
	container.original_value = val;
	container.original_field_value = object[field];
	container.edit_element = element;
	element[value_field] = val;

	let reset_element = el("button", "icon", text("↺"));

	reset_element.onclick = () => {
		element[value_field] = container.original_value;
		object[field] = container.original_field_value;
		container.trigger_input();
	}

	element.addEventListener("input", () => {
		data.object[data.field] = element[value_field];

		let changed = element[value_field] !== container.original_value;
		reset_element.disabled = !changed;
		element.classList.toggle("changed", changed);

		if (table) {
			table.changed.emit();
		}
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
	container.append(
		...(options.prefix_elements || []),
		size_element, element, reset_element,
		...(options.postfix_elements || [])
	);

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

	interface RowAction {
		label: string;
		action: (row) => void;
		init?: (table, action, button) => void;
	}

	interface ColumnOptions {

		cols?: number;
		// Forces input/textarea field width.

		rows?: number;
		// Forces textarea field height.

		type?: string | (data: ColumnOptions) => HTMLElement;
		// Used to force a type specific type.
		// Alternatively, a function that generates a HTMLElement can be passed for arbitrary display.

		diff_transform?: (val) => any;
		// Used to transform values after changes have been detected in diff.

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

		action?: TableAction {
			label: string;
			action: (table) => void;
			init?: (table, action, button) => void;
			position?: "top-left" | "top-right" | "top-middle" |
			           "bottom-left" | "bottom-right" | "bottom-middle";
		}
	}
	 */
function table(get_data, options) {
	let t = el("table");
	let table_container = el("div", "flex-vertical flex-dynamic scrollable table-container", t);
	t.container = table_container;

	t.body_rows = [];

	t.changed = new Signal({type: "undefined"});
	t.has_changes = new Signal({type: "boolean", nullable: false, initial: false});
	t.changed.subscribe(() => {
		let old = t.has_changes.current_value;
		let current = !!t.querySelector(".changed");

		if (old !== current) {
			t.has_changes.emit(current);
		}
	});

	t.diff = (whole_object=false) => {
		let diffs = [];
		for (let row of t.body_rows) {
			let old_data = row.original_data;
			let new_data = {...row.current_data};

			for (let column in new_data) {
				if (options.column_options[column] && options.column_options[column].diff_transform) {
					new_data[column] = options.column_options[column].diff_transform(new_data[column]);
				}
			}

			let diff = diff_objects(old_data, new_data);
			if (diff) {
				if (whole_object) {
					diff = new_data;
				}

				if (options.id_columns) {
					let id_columns = function_unwrap(options.id_columns);
					for (let column of id_columns) {
						diff[column] = new_data[column];
					}
				}

				diffs.push(diff);
			}
		}

		return diffs;
	}

	t.current_data = () => {
		let data = [];
		for (let row of t.body_rows) {
			data.push(row.current_data);
		}
		return data;
	};

	t.load_data = async (...args) => {
		let data = get_data(...args);
		t.insertAdjacentElement("afterbegin", spinner(data));

		let data_array = await data;

		let headers_display = function_unwrap(options.headers_display || {});
		let headers = function_unwrap(options.headers || Object.keys(headers_display));
		let column_options = function_unwrap(options.column_options || {});
		let table_valign = function_unwrap(options.valign || 'middle');
		let table_halign = function_unwrap(options.halign || 'left');

		if (headers === undefined || headers.length === 0) {
			let keys = new Set();

			for (let item of data_array) {
				for (let key in item) {
					keys.add(key);
				}
			}

			headers = Array.from(keys);
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

		t.body_rows = [];

		for (let item of data_array) {
			let tr = el("tr");
			tr.original_data = {...item};
			tr.current_data = item;

			let cells = [];
			for (let header of headers) {
				let column_options = options.column_options[header] || {};

				let cell_valign = function_unwrap(column_options.valign || table_valign);
				let cell_halign = function_unwrap(column_options.halign || table_halign);

				let cell = el("td");
				cell.original_value = item[header];
				cell.style.setProperty("text-align", cell_halign);
				cell.style.setProperty("vertical-align", cell_valign);
				let type = header_types.get(header);

				let editable = function_unwrap(options.editable);
				let column_editable = function_unwrap(column_options.editable);
				if (column_editable === true) {
					editable = true;
				} else if (column_editable === false) {
					editable = false;
				}

				let display_function = editable ? edit_element : static_element;

				let display_data = {
					value: item[header],
					object: item,
					field: header,
					header_display: headers_display[header] || header,
					type: type,
					table: t,
					row: tr,
					options: {...column_options}
				};

				let contents = display_function(display_data);

				cell.append(contents);
				cell.setAttribute("value_type", type);
				cells.push(cell);
			}

			tr.append(...cells);

			if (options.row_click) {
				tr.classList.toggle("clickable", true);
				tr.addEventListener("click", () => options.row_click(item));
			}

			t.body_rows.push(tr);
		}

		let thead = el("thead");
		let tbody = el("tbody");

		thead.append(header_row);
		tbody.append(...t.body_rows);

		remove_children(t);
		t.append(thead, tbody);

		let actions = (options.actions || []);
		actions = actions.map(function_unwrap);
		actions = actions.filter(Boolean);
		actions.forEach(a => {
			a.position = a.position || 'top-left';
			a.table = t;
		});

		let top_left_table_actions = actions.filter(
			a => a.position === 'top-left').map(table_action);
		let top_middle_table_actions = actions.filter(
			a => a.position === 'top-middle').map(table_action);
		let top_right_table_actions = actions.filter(
			a => a.position === 'top-right').map(table_action);

		let bottom_left_table_actions = actions.filter(
			a => a.position === 'bottom-left').map(table_action);
		let bottom_middle_table_actions = actions.filter(
			a => a.position === 'bottom-middle').map(table_action);
		let bottom_right_table_actions = actions.filter(
			a => a.position === 'bottom-right').map(table_action);

		let top_left = el("div", "flex-horizontal flex-dynamic flex-start",
			...top_left_table_actions);
		let top_mid = el("div", "flex-horizontal flex-dynamic flex-center",
			...top_middle_table_actions);
		let top_right = el("div", "flex-horizontal flex-dynamic flex-end",
			...top_right_table_actions);

		let bottom_left = el("div", "flex-horizontal flex-dynamic flex-start",
			...bottom_left_table_actions);
		let bottom_mid = el("div", "flex-horizontal flex-dynamic flex-center",
			...bottom_middle_table_actions);
		let bottom_right = el("div", "flex-horizontal flex-dynamic flex-end",
			...bottom_right_table_actions);

		let top = el("div", "flex-horizontal flex-static",
			top_left, top_mid, top_right);
		let bottom = el("div", "flex-horizontal flex-static",
			bottom_left, bottom_mid, bottom_right);

		if (t.top_actions) {
			t.top_actions.remove();
			t.top_actions = null;
		}

		if (t.bottom_actions) {
			t.bottom_actions.remove();
			t.bottom_actions = null;
		}

		t.top_actions = top;
		t.bottom_actions = bottom;

		table_container.insertAdjacentElement("beforebegin", t.top_actions);
		table_container.insertAdjacentElement("afterend", t.bottom_actions);

		t.changed.emit();
	};

	t.load_data();

	return table_container;
}

function table_action(action) {
	let button = el("button", "table-action", action.label);

	if (action.init) {
		action.init(action.table, action, button);
	}

	if (action.update) {
		action.update(action.table, action, button);
	}

	button.onclick = () => action.action(action.table);
	return button;
}

function paginator() {
	return [{
		label: "<",
		position: "bottom-left",
		init: function(table) {
			if (table.page_no === undefined) {
				table.page_no = 0;
			}
		},
		update: function(table, action, button) {
			button.classList.toggle(
				"display-none", table.page_no===0);
		},
		action: function(table) {
			table.page_no = Math.max(0, table.page_no - 1);
			table.load_data(table.page_no);
		}
	},
	{
		label: ">",
		position: "bottom-right",
		update: function(table, action, button) {
			button.classList.toggle(
				"display-none", table.current_data().length!==20);
		},
		action: function(table) {
			table.page_no = table.page_no + 1;
			table.load_data(table.page_no);
		}
	}];
}

window.Elements = {
	table: table,
	paginator: paginator,
	static_element: static_element,
	edit_element: edit_element,
	spinner: spinner
}
})();
