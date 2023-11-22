
type Packet = {
	type: number
	id: number
	action?: string
	params?: any
	data?: any
}

export default class Manager {

	static S_OPEN = 0;
	static S_QUEUED = 1;
	static S_CLOSED = 2;
	static T_EVT = 0;
	static T_REQ = 1;
	static T_RES = 2;
	static T_ERR = 3;
	static WILDCARD = "*";

	out: Function
	timeout = 1000;
	outstanding = new Map();
	idBase = Date.now();
	handlers = new Map();
	status = 2;
	queue: Packet[] = [];

	constructor({
		out,
		timeout = 1000,
		initStatus = 2
	}: { out: Function, timeout?: number, initStatus?: number }) {
		this.out = out;
		this.timeout = timeout;
		this.outstanding = new Map();
		this.idBase = Date.now();
		this.handlers = new Map();
		this.status = initStatus;
		this.queue = [];
	}

	createRequest(action: string, params: any) {
		let resolve,reject;
		const p: any = new Promise((res,rej) => {
			resolve = res;
			reject = rej;
		});
		p.resolve = resolve;
		p.reject = reject;
		p._id = this.getId();
		this.outstanding.set(p._id, p);
		if (this.timeout) {
			setTimeout(() => {
				p.reject(new Error("timeout reached"));
			}, this.timeout);
		}
		this.send(Manager.T_REQ, p._id, null, action, params);
		return p;
	}

	createEvent(evtName: string, data: any) {
		this.send(Manager.T_EVT, this.getId(), null, evtName, data);
	}

	getId() {
		return ++this.idBase;
	}

	setHandler(action: string, fn: Function) {
		this.handlers.set(action,fn);
	}

	handleRequest(request: { type: number, action: string, id: number, params: any, data: any }) {
		let handler;
		const { type, action, id, params, data } = request;
		if (type === Manager.T_ERR || type === Manager.T_RES) {
			if (this.outstanding.has(id)) {
				let outs = this.outstanding.get(id);
				this.outstanding.delete(id);
				if (type === Manager.T_ERR) {
					outs.reject(new Error(data));
				} else {
					outs.resolve(data);
				}
			} else {
				console.error("unknown response, no outstanding promise",request);
			}
			return;
		}

		if (this.handlers.has(action)) {
			handler = this.handlers.get(action);
		} else if (this.handlers.has(Manager.WILDCARD)) {
			handler = this.handlers.get(Manager.WILDCARD);
		} else {
			if (type === Manager.T_REQ) {
				return this.send(Manager.T_ERR, id, "not implemented");
			} else {
				return;
			}
		}

		let p = handler(params || {}, action);

		if (type === Manager.T_REQ) {
			p.then((res: any) => {
				this.send(Manager.T_RES, id, res);
			},(err: any) => {
				this.send(Manager.T_ERR, id, err);
			});
		}

	}

	send(type: number, id: number, data: any, action?: string, params?: any) {
		let pkt: Packet = {
			type: type,
			id: id
		};
		if (action) {
			pkt.action = action;
			if (params) {
				pkt.params = params;
			}
		} else {
			pkt.data = data;
		}
		switch (this.status) {
			case Manager.S_OPEN:
				this.out(pkt);
			break;

			case Manager.S_QUEUED:
				this.queue.push(pkt);
			break;

			case Manager.S_CLOSED:
				throw new Error("cannot send, status is closed");
		}
	}

	sendQueue() {
		let pkt;
		while(pkt = this.queue.shift()) {
			this.out(pkt);
		}
	}

	setStatus(status: number) {
		let oldStatus = this.status;
		this.status = status;
		if (status === Manager.S_OPEN && oldStatus < Manager.S_OPEN) {
			this.sendQueue();
		}
	}

}

// Manager.WILDCARD = '*';
// Manager.T_ERR = 'error';
// Manager.T_RES = 'res';
// Manager.T_REQ = 'req';
// Manager.T_EVT = 'evt';
// Manager.S_OPEN = 2;
// Manager.S_QUEUED = 1;
// Manager.S_CLOSED = 0;


