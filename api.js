const api = {}
window.api = api;
api.root = "http://knz-app-t.konzum.hr:8080";
api.url = api.root + "/kongo-0.0.1/api/v1";

api.post = function post(route, body) {
	return fetch(route, {
		method: "POST",
		headers: {
			"Content-Type": "application/json;charset=utf-8"
		},
		body: JSON.stringify(body)
	})
}


api.devices = {};

api.devices.all = async function all() {
	let response = await fetch(api.url + "/devices");
	return await response.json();
}

api.devices.one = async function one(id) {
	let response = await fetch(api.url + "/device/" + id);
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

api.screens.active = async function active(location_id) {
	let response = await fetch(api.url + "/activeScreen/" + location_id);
	return await response.json();
}
