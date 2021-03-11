const api = {}
window.api = api;
if (location.host.startsWith("localhost")) {
	api.root = "http://knz-app-t.konzum.hr:8080";
} else {
	api.root = location.origin;
}
api.url = api.root + "/kongo-0.0.1/api/v1";

api.post = async function post(route, body, headers={}) {
	let response = await fetch(route, {
		method: "POST",
		headers: {
			"Content-Type": "application/json;charset=utf-8",
			...headers
		},
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		throw response;
	}

	return response;
}

api.patch = async function patch(route, body, headers) {
	let response = await fetch(route, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json;charset=utf-8",
			...headers
		},
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		throw response;
	}

	return response;
}

api.get = async function get(route, headers) {
	let response = await fetch(route, {
		method: "GET",
		headers: {
			"Content-Type": "application/json;charset=utf-8",
			...headers
		}
	});

	if (!response.ok) {
		throw response;
	}

	return response;
}

api.pagination = (page_no, page_size) => {
	let offset = page_no * page_size;
	let limit = page_size;
	return `?limit=${limit}&&offset=${offset}`;
};

api.log_in = async function log_in(username, password) {
	let response = await api.post(api.url + "/checkUser", { username, password });
	return response.json();
}


api.report_error = async function report_error(error) {
	let response = await api.post(api.url + "/log", {
		"createdBy": "kongo frontend",
		"text": `${error.toString()}\nContext info:\n${info_string()}\nStack trace:\n${error.stack}`
	});
}


api.devices = {};

api.devices.all = async function all() {
	let response = await api.get(api.url + "/devices");
	return await response.json();
}

api.devices.one = async function one(id) {
	let response = await api.get(api.url + "/device/" + id);
	return await response.json();
}

api.devices.add = async function add(device) {
	let response = await api.post(api.url + "/devices", device)
	return await response.json();
}


api.locations = {};

api.locations.all = async function all() {
	let response = await fetch(api.url + "/locations");
	return await response.json();
}

api.locations.one = async function one(id) {
	let response = await fetch(api.url + "/location/" + id);
	return await response.json();
}


api.screens = {}

api.screens.all = async function all() {
	let response = await fetch(api.url + "/screens");
	return await response.json();
}

api.screens.one = async function one(id) {
	let response = await fetch(api.url + "/screen/" + id);
	return await response.json();
}

api.screens.active = async function active(location_id, page_no=0, page_size=20) {
	let response = await fetch(api.url + "/activeScreen/" + location_id + api.pagination(page_no, page_size));
	return await response.json();
}


api.screenDetails = {};

api.screenDetails.modify = async function modify(screenDetail) {
	let response = await api.patch(api.url + "/screenDetail", screenDetail);
	return await response.json();
}


api.items = {};

api.items.all = async function all(page_no=0, page_size=20) {
	let response = await api.get(
		api.url + "/items" + api.pagination(page_no, page_size)
	);
	return await response.json();
}

api.items.modifyDesc = async function modifyDesc(itemId, data) {
	let response = await api.patch(api.url + "/item/desc/" + itemId, data);
	return true;
}
