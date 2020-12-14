function log_out() {
	set_global("logged_in", false);
	window.user = null;
	show("login");
}

async function login_submit(event) {
	event.preventDefault();
	let form = q('#login');
	let data = form_data(form);
	let b = q('button', form);
	b.setCustomValidity('');
	b.classList.toggle("disabled", true);

	let error = null;
	let user = null;

	try {
		user = await api.log_in(data.username, data.password);
	} catch(err) {
		error = err;
	}

	b.classList.toggle("disabled", false);

	if (error) {
		switch (error.status) {
			case 401:
			case 403:
				b.setCustomValidity("Pogrešno korisničko ime ili lozinka. Pokušajte ponovno.");
				break;
			default:
				b.setCustomValidity("Greška u komunikaciji sa poslužiteljem..");
				break;
		}

		b.reportValidity();
		return;
	}

	window.user = user;

	set_global("logged_in", true);
	show("mainscreen");
}

function init_location_articles() {
	let location_articles = q('#location_articles');
	location_articles.navigation_condition = () => if_role(["ADMIN", "PRODAVAONICA"]);

	let display_names = {
		visible: "Vidljivo",
		itemOrder: "Redni broj",
		assetUrl: "Slika",
		itemName: "Artikl",
		itemPrice: "Cijena",
		itemDiscount: "Popust",
		itemDiscountPrice: "Promo cijena",
		itemDescription: "Opis",
		itemDeclaration: "Deklaracija",
		itemRefUom: "Mjerna jedinica",
	};

	location_articles.addEventListener("shown", async (e) => {
		let title = q("#title");

		let loc_id = e.detail.locationId;
		title.innerText = "Artikli na lokaciji " + e.detail.name;

		let conf = {};
		conf.editable = false;
		conf.valign = "middle";
		conf.halign = "center";
		conf.headers_display = display_names;
		conf.id_columns = ["screenDetailId", "screenId", "itemAssetId", "itemOrder", "visible"];

		conf.column_options = {};
		conf.column_options["itemOrder"] = { editable: true };
		conf.column_options["assetUrl"] = { type: "image", url_prefix: api.root };
		conf.column_options["visible"] = { type: "boolean", editable: true, diff_transform: Number };
		conf.column_options["itemDiscount"] = { type: (data)=>text((data.value || 0) + " %") };
		conf.column_options["itemPrice"] = { type: (data)=>text((data.value || 0).toFixed(2) + " kn") };
		conf.column_options["itemDescription"] = { expandable: true };
		conf.column_options["itemDeclaration"] = { expandable: true };
		conf.column_options["itemDiscountPrice"] = { type: (data)=>text((data.value || 0).toFixed(2) + " kn") };

		conf.actions = [];
		conf.actions.push({
			label: "Save",
			position: "bottom-right",
			init: (table, action, button) => {
				table.has_changes.subscribe((val) => {
					button.classList.toggle("display-none", !val);
				}, true);
			},
			action: async (table) => {
				let changes = table.diff(false);

				let promises = [];
				for (let change of changes) {
					if (change.itemOrder !== undefined) {
						change.orderScreenDetails = change.itemOrder;
					}
					promises.push(api.screenDetails.modify(change));
				}

				await Promise.all(promises);
				table.load_data();
			}
		});

		conf.actions.push({
			label: "Nazad",
			action: (table) => show("locations"),
			position: "top-left"
		});

		conf.actions.push({
			label: "Ekran",
			position: "top-right",
			action: (table) => {
				navigate_to("?location=" + loc_id, true);
			}
		});

		let data_table = Elements.table(
			async () => await api.screens.active(loc_id),
			conf
		);

		location_articles.append(data_table);
	});

	location_articles.addEventListener("hidden", () => {
		remove_children(location_articles);
	});
}

function init_articles() {
	let articles = q('#articles');
	articles.navigation_condition = () => if_role(["ADMIN", "MARKETING"]);

	let display_names = {
		assetUrl: "Slika",
		itemName: "Artikl",
		itemPrice: "Cijena",
		itemDiscount: "Popust",
		itemDiscountPrice: "Promo cijena",
		itemDescription: "Opis",
		itemDeclaration: "Deklaracija",
		refUom: "Mjerna jedinica",
		"": ""
	};

	articles.addEventListener("shown", async (e) => {
		let title = q("#title");
		title.innerText = "Artikli";

		let conf = {};
		conf.editable = false;
		conf.valign = "middle";
		conf.halign = "center";
		conf.headers_display = display_names;
		conf.id_columns = ["itemId", "itemDescription", "itemDeclaration"];

		conf.column_options = {};
		conf.column_options["itemOrder"] = { editable: true };
		conf.column_options["itemDescription"] = { editable: true, expandable: true };
		conf.column_options["itemDeclaration"] = { editable: false, expandable: true };
		conf.column_options["assetUrl"] = { type: "image", url_prefix: api.root };
		conf.column_options["itemDiscount"] = { type: (data)=>text((data.value || 0) + " %") };
		conf.column_options["itemPrice"] = { type: (data)=>text((data.value || 0).toFixed(2) + " kn") };
		conf.column_options["itemDiscountPrice"] = { type: (data)=>text((data.value || 0).toFixed(2) + " kn") };
		conf.column_options[""] = {
			type: "button",
			label: "Nutritivne informacije",
			action: (row) => {
				let m = nutrition_modal(row.original_data);
				m.saved.subscribe(() => {
					row.current_data.itemNutritionFacts = row.original_data.itemNutritionFacts;
				});
			}
		};

		conf.actions = [];

		conf.actions.push({
			label: "Save",
			position: "bottom-right",
			init: (table, action, button) => {
				table.has_changes.subscribe((val) => {
					button.classList.toggle("display-none", !val);
				}, true);
			},
			action: async (table) => {
				let changes = table.diff(false);
				let promises = [];
				for (let change of changes) {
					let data = {
						itemId: change.itemId,
						description: change.itemDescription,
						declaration: change.itemDeclaration
					};
					promises.push(api.items.modifyDesc(data.itemId, data));
				}

				await Promise.all(promises);
				table.load_data();
			}
		});

		conf.actions.push(if_role("ADMIN", {
			label: "Nazad",
			position: "top-left",
			action: function() { show("admin-dash") }
		}));

		let data_table = Elements.table(
			async () => await api.items.all(),
			conf
		);

		articles.append(data_table);
	});

	articles.addEventListener("hidden", () => {
		remove_children(articles);
	});
}

function init_locations() {
	let locations = q('#locations');
	locations.navigation_condition = () => if_role(["ADMIN", "PRODAVAONICA"]);

	let display_names = {
		cin: "CIN",
		name: "Lokacija",
		address: "Adresa",
		"": ""
	};

	locations.addEventListener("shown", async () => {
		let title = q("#title");
		title.innerText = "Lokacije";

		let conf = {};
		conf.editable = false;
		conf.valign = "middle";
		conf.halign = "center";
		conf.row_click = (row) => show("location_articles", row)("login");
		conf.headers_display = display_names;

		conf.column_options = {};
		conf.column_options[""] = {
			type: "button",
			label: "Ekran",
			action: (row) => navigate_to("?location=" + row.current_data.locationId, true)
		};

		conf.actions = [];
		conf.actions.push(if_role("ADMIN", {
			label: "Nazad",
			position: "top-left",
			action: () => {
				show("admin-dash");
			}
		}));

		let data_table = Elements.table(
			async () => await api.locations.all(),
			conf
		);

		locations.append(data_table);
	});

	locations.addEventListener("hidden", () => {
		remove_children(locations);
	});
}

function init_admin_dash() {
	let dash = q('#admin-dash');
	dash.navigation_condition = () => if_role("ADMIN");
	dash.addEventListener("shown", () => {
		let title = q("#title");
		title.innerText = "Administracija";
	});
}

function init_mainscreen() {
	let main = q("#mainscreen");
	main.navigation_condition = () => Boolean(window.user);
	main.addEventListener("shown", () => {
		if (window.user) {
			console.log(window.user.role)
			switch (window.user.role) {
				default: {
					console.warn(`Unknown user role '${window.user.role}.'`);
					show("locations")("login");
				} break;
				case "ADMIN": {
					show("admin-dash")("login");
				} break;
				case "PRODAVAONICA": show("locations")("login"); break;
				case "MARKETING": show("articles")("login"); break;
			}
		} else {
			show("login");
		}
	});
}

function init_login() {
	let login = q('#login');
	login.navigation_condition = () => !Boolean(window.user);
	login.addEventListener("hidden", () => {
		login.reset();
	});
	// login.insertAdjacentElement("afterbegin", Elements.spinner(new Promise(()=>{})));
}

function if_role(roles, iftrue=true, iffalse=null) {
	if (!Array.isArray(roles)) {
		roles = [roles];
	}

	for (let role of roles) {
		if ((role === null || role === undefined) && !window.user) {
			return function_unwrap(iftrue);
		}

		if (window.user && window.user.role === role) {
			return function_unwrap(iftrue);
		}
	}

	return function_unwrap(iffalse);
}

const IS_CALORIE = Symbol("Is calorie");
function nutrition_fact(fact, is_calorie, is_subnutrient=false) {
	fact[IS_CALORIE] = is_calorie;

	let legendtext = text(fact.name || "Nutritivni podatak");
	let legend = el("legend", "", legendtext);

	let del = el("button", "warn", "Obriši");
	del.onclick = () => {
		fact_el.deleted.emit();
		fact_el.remove();
	};

	let name = Elements.edit_element({
		object: fact,
		field: 'name',
		options: {
			container_type: "label",
			container_class: "flex-static",
			prefix_elements: [el("div", "input-label", "Naziv")],
			postfix_elements: [del]
		}
	});
	name.edit_element.oninput = () => {
		legendtext.data = fact.name || "Nutritivni podatak";
	}

	let uom = Elements.edit_element({
		object: fact,
		field: 'uom',
		options: {
			container_type: "label",
			container_class: "flex-static",
			prefix_elements: [el("div", "input-label", "Mjera")]
		}
	});

	let value = Elements.edit_element({
		object: fact,
		field: 'value',
		type: 'number',
		options: {
			container_type: "label",
			container_class: "flex-static",
			prefix_elements: [el("div", "input-label", "Vrijednost")]
		}
	});

	let daily = Elements.edit_element({
		object: fact,
		field: 'daily_value',
		type: 'number',
		options: {
			container_type: "label",
			container_class: "flex-static",
			prefix_elements: [el("div", "input-label", "Dnevna vrijednost (%)")]
		}
	});

	let values = el("div", "flex-horizontal", value, daily);

	let side = Elements.edit_element({
		object: fact,
		field: 'side',
		type: 'select',
		options: {
			container_type: "label",
			container_class: "flex-static",
			prefix_elements: [el("div", "input-label", "Strana")],
			select_options: [
				{label: "Lijeva", value: "left"},
				{label: "Desna", value: "right"},
				{label: "Obije", value: "both"}
			]
		}
	});

	let calorie = null;
	let subnutrients_el = null;
	let subnutrient_add = null;
	if (!is_subnutrient) {
		calorie = Elements.edit_element({
			object: fact,
			field: IS_CALORIE,
			type: 'boolean',
			options: {
				container_type: "label",
				container_class: "flex-static flex-horizontal",
				prefix_elements: [el("span", "", "U zaglavlju")]
			}
		});
		calorie.style.setProperty("align-items", "center");
		calorie.style.setProperty("margin-top", "0.5em");
		calorie.edit_element.addEventListener(
			"input", () => {
				fact_el.classList.toggle("calorie", fact[IS_CALORIE]);
			}
		);

		let sublegend = el("legend", "", text("Podnutrijenti"));
		subnutrients_el = el(
			"fieldset", "nutrition-subnutrients flex-vertical",
			sublegend);

		subnutrients_el.add_fact = (subfact, already_in_data=false) => {
			let subfact_el = nutrition_fact(subfact, false, true);
			subnutrients_el.append(subfact_el);

			if (!fact.sub_nutrients) {
				fact.sub_nutrients = [];
			}

			if (!already_in_data) {
				fact.sub_nutrients.push(subfact);
				subfact_el.scrollIntoView({block: "center", inline: "center", behavior: "smooth"});
				subfact_el.classList.add("new");
			}

			subfact_el.deleted.subscribe(() => {
				let ind = fact.sub_nutrients.indexOf(subfact);
				if (ind >= 0) {
					fact.sub_nutrients.splice(ind, 1);
				}
				return Signal.FINISH;
			});
		};

		(fact.sub_nutrients || []).forEach(s=>subnutrients_el.add_fact(s, true));

		subnutrient_add = el("button", "nutrition-subnutrients", "Dodaj podnutrijent");
		subnutrient_add.onclick = () => {
			subnutrients_el.add_fact({
				name: "",
				side: fact.side,
				uom: fact.uom,
				daily_value: 0,
				value: 0
			});
		};
	}

	let fact_el = el(
		"fieldset",
		"nutrition-fact flex-vertical " +
			(is_subnutrient ? "subnutrient" : "nutrient") +
			(is_calorie ? " calorie" : ""),
		legend, name, uom, values, side, calorie, subnutrients_el, subnutrient_add);
	fact_el.deleted = new Signal();
	fact_el.style.setProperty("align-items", "flex-start");
	fact_el.fact_object = fact;

	return fact_el;
}

function nutrition_modal(item) {
	let modal_base = modal();

	let facts = JSON.parse(item.itemNutritionFacts || '{"calories": [], "nutrients": []}');

	let title = el("h1", "flex-static no-overflow", text(`Nutritivne informacije artikla`));
	let subtitle = el("h4", "subtitle flex-static no-overflow", text(`${item.itemName}`));

	let calorie_facts = facts.calories.map(f => nutrition_fact(f, true));
	let nutrient_facts = facts.nutrients.map(f => nutrition_fact(f, false));
	let facts_elements = [...calorie_facts, ...nutrient_facts];

	let facts_container = el("div", "flex-dynamic scrollable", ...facts_elements);

	let add_fact = el("button", "gap", text("Dodaj nutrijent"));
	add_fact.onclick = () => {
		let fact = {
			name: "",
			side: "right",
			uom: "",
			daily_value: 0,
			value: 0
		};
		let el = nutrition_fact(fact);
		el.classList.add("new");
		facts_container.append(el);
		el.scrollIntoView({block: "center", inline: "center", behavior: "smooth"});
	};

	modal_base.saved = new Signal();
	let save = el("button", "gap flex-dynamic action", text("Spremi"));
	save.onclick = async () => {
		let root_facts = [...facts_container.children].map(el=>el.fact_object);

		let new_facts = {calories: [], nutrients: []};
		for (let nutrient of root_facts) {
			if (nutrient[IS_CALORIE]) {
				new_facts.calories.push(nutrient);
				delete nutrient.sub_nutrients;
			} else {
				new_facts.nutrients.push(nutrient);

				if (nutrient.sub_nutrients) {
					for (let subnutrient of nutrient.sub_nutrients) {
						delete subnutrient.sub_nutrients;
					}
				}
			}
		}

		let data = {
			itemId: item.itemId,
			description: item.itemDescription,
			declaration: item.itemDeclaration,
			nutritionalFacts: JSON.stringify(new_facts)
		};

		try {
			await api.items.modifyDesc(data.itemId, data);
			item.itemNutritionFacts = JSON.stringify(new_facts, null, " ");
			modal_base.saved.emit();
			modal_base.close();
		} catch (err) {
			inform_modal("Greška", el("p", "", text("Došlo je do greške pri komunikaciji sa poslužiteljem.")));
			console.error(err);
		}
	};

	let cancel = el("button", "gap flex-dynamic warn", text("Odustani"));
	cancel.onclick = () => {
		modal_base.close();
	};

	let actions = el("div", "flex-horizontal", cancel, save);

	let card = el(
		"div", "card middle-center flex-vertical no-overflow",
		title, subtitle, facts_container, add_fact, actions);
	card.onclick = (ev) => { ev.stopPropagation(); }

	modal_base.append(card);
	modal_base.open();

	if (facts_container.firstElementChild) {
		facts_container.firstElementChild.scrollIntoView();
	}

	return modal_base;
}

function inform_modal(title_text, body) {
	let modal_base = modal();

	let title = el("h1", "flex-static no-overflow", text(title_text));
	let cancel = el("button", "gap flex-dynamic warn", text("OK"));
	cancel.onclick = () => {
		modal_base.close();
	};
	let card = el("div", "card middle-center flex-vertical no-overflow", title, body, cancel);
	card.onclick = (ev) => { ev.stopPropagation(); }

	modal_base.append(card);
	modal_base.open();
}

window.onload = async () => {
	mouse_listen(16, true);
	init_login();
	show("login");
	init_mainscreen();
	init_articles();
	init_location_articles();
	init_locations();
	init_admin_dash();
};
