const TYPE = Symbol("Type");
const ALL_TYPES = {};
const TYPEMAP = new Map();
TYPEMAP.set(Number, 'number');
TYPEMAP.set(String, 'string');
TYPEMAP.set(Boolean, 'boolean');
TYPEMAP.set(Symbol, 'symbol');
TYPEMAP.set(null, 'object');
TYPEMAP.set(undefined, 'undefined');
TYPEMAP.set(BigInt, 'bigint');
TYPEMAP.set(Function, 'function');

function get_possible_types(val) {
	let possible = [];
	for (let type in ALL_TYPES) {
		if (ALL_TYPES[type].check_fn(val)) {
			possible.push(type);
		}
	}
	return possible;
}

function is_typedef(val) {
	return val[TYPE] || false;
}

function is_type(val, type) {
	if (TYPEMAP.has(type)) {
		return typeof(val) == TYPEMAP.get(type);
	} else if (is_typedef(type)) {
		return type.check_fn(val);
	} else {
		return val instanceof type;
	}
}

function typedef(type_name, typecheck_fn) {
	if (ALL_TYPES[type_name] !== undefined) {
		return ALL_TYPES[type_name];
	}

	let type;
	type = {
		[TYPE]: true,
		type: type_name,
		check_fn: typecheck_fn,
		and: (type_name, _typecheck_fn) => typedef(type_name, (val) => {
			return typecheck_fn(val) && _typecheck_fn(val)
		}),
		or: (type_name, _typecheck_fn) => typedef(type_name, (val) => {
			return typecheck_fn(val) || _typecheck_fn(val);
		}),
		optional: () => typedef(type_name + "?", (val) => {
			return val === undefined || val === null || typecheck_fn(val)
		}),
		merge: (obj) => {
			obj[TYPE] = type[TYPE];
			obj.type = type.type;
			obj.check_fn = type.check_fn;
			obj.and = type.and;
			obj.or = type.or;
			obj.optional = type.optional;
			obj.merge = type.merge;
		}
	};
	ALL_TYPES[type_name] = type;
	return type;
}

function typedef_wrap(type) {
	return typedef(type.name, (val) => is_type(val, type));
}

function typedef_struct(type_name, shape) {
	return typedef(
		type_name,
		(val) => {
			if (typeof(val) != 'object' || Array.isArray(val)) {
				return false;
			}

			for (let key in shape) {
				if (!is_type(val[key], shape[key])) {
					return false;
				}
			}
			return true;
		}
	);
}

function typedef_array(type) {
	let type_name = "";
	if (is_typedef(type)) {
		type_name = type.type;
	} else {
		type = typedef_wrap(type);
		type_name = type.type;
	}

	return typedef(
		type_name + "[]",
		(val) => {
			if (!Array.isArray(val)) {
				return false;
			}

			for (let obj of val) {
				if (!is_type(obj, type)) {
					return false
				}
			}

			return true;
		}
	);
}

function typedef_record(type) {
	let type_name = "";
	if (is_typedef(type)) {
		type_name = type.type;
	} else {
		type = typedef_wrap(type);
		type_name = type.type;
	}

	return typedef(
		type_name + "Record",
		(val) => {
			if (typeof(val) != 'object' || Array.isArray(val)) {
				return false;
			}

			for (let key in val) {
				if (!is_type(val[key], type)) {
					return false;
				}
			}

			return true;
		}
	);
}

typedef_wrap(Number).merge(Number);
typedef_wrap(String).merge(String);
typedef_wrap(Boolean).merge(Boolean);


StringRecord = typedef_record(String);

ColumnOptions = typedef_struct("ColumnOptions", {
	cols: Number.optional(),
	rows: Number.optional(),
	type: String.optional(),
	editable: Boolean.optional(),
	expandable: Boolean.optional(),
	valign: String.optional(),
	halign: String.optional(),
	url_prefix: String.optional()
});

TableOptions = typedef_struct("TableOptions", {
	headers: typedef_array(String).optional(),
	headers_display: StringRecord.optional(),
	id_columns: typedef_array(String).optional(),
	editable: Boolean.optional(),
	valign: String.optional(),
	halign: String.optional(),
	column_options: typedef_record(ColumnOptions).optional(),
});
