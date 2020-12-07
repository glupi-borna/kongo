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
				b.setCustomValidity("Wrong username or password. Please try again.");
				break;
			default:
				b.setCustomValidity("Error communicating with server.");
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
		itemUom: "Mjerna jedinica",
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
				navigate_to("?location=" + loc_id);
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
		itemUom: "Mjerna jedinica",
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
		conf.column_options["itemDeclaration"] = { editable: true, expandable: true };
		conf.column_options["assetUrl"] = { type: "image", url_prefix: api.root };

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
			action: (row) => navigate_to("?location=" + row.current_data.locationId)
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

window.onload = () => {
	mouse_listen(16, true);
	init_login();
	show("login");
	init_mainscreen();
	init_articles();
	init_location_articles();
	init_locations();
	init_admin_dash();
};
