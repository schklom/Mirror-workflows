

const methods = {};
const controller = {};

controller['GET /test'] = async (data) => {

	return { test: 123 };
}

methods.controller = controller;

module.exports = methods;
