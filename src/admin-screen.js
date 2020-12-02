const backend_url = 'http://knz-app-t.konzum.hr:8080';
const data_url = '/kongo-0.0.1/api/v1/activeScreen';

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

function init_articles() {
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

	articles.addEventListener("shown", async (e) => {
		let title = q("#title");
		title.innerText = "Artikli";

		let data_table = Elements.table(
			await api.screens.active(e.detail.locationId),
			{
				editable: true,
				valign: 'middle',
				halign: 'center',
				actions: [{
					label: "Save",
					action: (table) => console.log(table.diff()),
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
				}],
				headers_display: display_names,
				id_columns: ["screenDetailId", "screenId", "itemAssetId"],
				column_options: {
					assetUrl: {
						type: "image",
						url_prefix: api.root,
						editable: false
					},
					itemOrder: {editable: false},
					itemDescription: {expandable: true},
					itemDeclaration: {expandable: true},
					itemUom: {cols: 4}
				}
			}
		);

		articles.append(...data_table);
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
		address: "Adresa"
	};

	locations.addEventListener("shown", async () => {
		let title = q("#title");
		title.innerText = "Lokacije";

		let data_table = Elements.table(
			await api.locations.all(),
			{
				editable: false,
				valign: 'middle',
				halign: 'center',
				row_click: (row) => show("articles", { locationId: row.locationId }),
				headers_display: display_names
			}
		);

		locations.append(...data_table);
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
	mouse_listen();
	init_mainscreen();
	init_login();
	init_articles();
	init_locations();
	show("mainscreen");
};
