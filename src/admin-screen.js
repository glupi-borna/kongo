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

		let data_table = Elements.table(
			async () => await api.screens.active(loc_id),
			{
				editable: false,
				valign: 'middle',
				halign: 'center',
				actions: [{
					label: "Save",
					action: async (table) => {
						let changes = table.diff(false);

						let promises = [];
						for (let change of changes) {
							promises.push(api.screenDetails.modify(change));
						}

						await Promise.all(promises);
						table.load_data();
					},
					init: (table, action, button) => {
						table.changed.subscribe((val) => {
							button.classList.toggle("display-none", !val);
						}, true);
					},
					position: "bottom-right"
				}, {
					label: "Nazad",
					action: (table) => show("locations"),
					position: "top-left"
				}, {
					label: "Ekran",
					position: "top-right",
					action: (table) => {
						location = location.origin + "?location=" + loc_id;
					}
				}],
				headers_display: display_names,
				id_columns: ["screenDetailId", "screenId", "itemAssetId", "itemOrder", "visible"],
				column_options: {
					itemOrder: { editable: true },
					assetUrl: {
						type: "image",
						url_prefix: api.root,
						editable: false
					},
					visible: {
						type: "boolean",
						editable: true,
						diff_transform: Number
					}
				}
			}
		);

		location_articles.append(data_table);
	});

	location_articles.addEventListener("hidden", () => {
		remove_children(location_articles);
	});
}

function init_articles() {
	let articles = q('#articles');

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

	articles.addEventListener("shown", async (e) => {
		let title = q("#title");

		let loc_id = e.detail.locationId;
		title.innerText = "Artikli na lokaciji " + e.detail.name;

		let data_table = Elements.table(
			async () => await api.screens.active(loc_id),
			{
				editable: false,
				valign: 'middle',
				halign: 'center',
				actions: [{
					label: "Save",
					action: async (table) => {
						let changes = table.diff(false);

						let promises = [];
						for (let change of changes) {
							promises.push(api.screenDetails.modify(change));
						}

						await Promise.all(promises);
						table.load_data();
					},
					init: (table, action, button) => {
						table.changed.subscribe((val) => {
							button.classList.toggle("display-none", !val);
						}, true);
					},
					position: "bottom-right"
				}, {
					label: "Nazad",
					action: (table) => show("locations"),
					position: "top-left"
				}, {
					label: "Ekran",
					position: "top-right",
					action: (table) => {
						location = location.origin + "?location=" + loc_id;
					}
				}],
				headers_display: display_names,
				id_columns: ["screenDetailId", "screenId", "itemAssetId", "itemOrder", "visible"],
				column_options: {
					itemOrder: { editable: true },
					assetUrl: {
						type: "image",
						url_prefix: api.root,
						editable: false
					},
					visible: {
						type: "boolean",
						editable: true,
						diff_transform: Number
					}
				}
			}
		);

		articles.append(data_table);
	});

	articles.addEventListener("hidden", () => {
		remove_children(articles);
	});
}

function init_locations() {
	let locations = q('#locations');

	let display_names = {
		cin: "CIN",
		name: "Lokacija",
		address: "Adresa",
		"": ""
	};

	locations.addEventListener("shown", async () => {
		let title = q("#title");
		title.innerText = "Lokacije";

		let data_table = Elements.table(
			async () => await api.locations.all(),
			{
				editable: false,
				valign: 'middle',
				halign: 'center',
				row_click: (row) => show("location_articles", row),
				headers_display: display_names,
				column_options: {
					"": {
						type: "button",
						label: "Ekran",
						action: (row) => {
							location = location.origin + "?location=" + row.current_data.locationId;
						}
					}
				}
			}
		);

		locations.append(data_table);
	});

	locations.addEventListener("hidden", () => {
		remove_children(locations);
	});
}

function init_mainscreen() {
	let main = q("#mainscreen");
	main.addEventListener("shown", () => {
		show("locations");
	});
}

function init_login() {
	let login = q('#login');
	login.addEventListener("hidden", () => {
		login.reset();
	});
}

window.onload = () => {
	mouse_listen(16, true);
	init_mainscreen();
	init_login();
	init_location_articles();
	init_locations();
	show("login");
};
