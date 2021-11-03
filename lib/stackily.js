var STACKILY = function (param1, param2, param3, name) {
	var parse = {
		"func": function (param) {
			if (typeof (param) != "function") param = function () {};
			return param;
		},
		"string": function (param) {
			if (typeof (param) != "string") param = "";
			return param;
		},
		"bool": function(param) {
			if (typeof (param) != "boolean") param = false;
			return param;
		},
		"number": function(param) {
			if (typeof (param) != "number") param = 0;
			return param;
		}
	};
	
	var is = {
		"func": function (param) {
			return typeof (param) == "function";
		},
		"options": function (param) {
			var is_option = false;
			var key_count = 0;
			
			if(typeof (param) == "object")
			{
				for(var key in param) {
					key_count++;
					break;
				}
				
				is_option = key_count > 0;
			}
			
			return is_option;
		}
	};
	
	var self = this;
	self.index = 0; self.total_process_requests = 0; self.total_items = 0;
	self.slab = 0; self.delay_time = 0; 
	self.got_error = false; self.call_next = true; self.on_error_stop = false;
	self.options = {}; self.parent = {}; self.requests = []; self.options.items = [];

	self.rest_method = parse.func(param1);
	self.common_method = parse.func(param2);
	self.last_method = parse.func(param3);
	self.on_error = parse.func({});
	self.name = parse.string(name);
	self.is_promise = is.func(param1) == false;
	
	if(is.options(param1)) {
		self.call_next = (parse.bool(param1.require_next || false) == false);
		self.on_error_stop = parse.bool(param1.on_error_stop || false);
	}

	var process_batch = function (from) {
		from = from || 0;
		var to = from + self.slab;
		to = (to < self.total_items) ? to : self.total_items;

		if(self.is_promise) {
			self.rest_method(from, self);
		}
		else
		{
			for (var i = from; i < to; i++) {
				self.requests.push({
					"id": ""
				});
				self.rest_method(i, self);
			}
		}
	};

	var start = function () {
		if (self.total_items > 0) {
			self.slab = (self.slab < self.total_items) ? self.slab : self.total_items;
			process_batch();
		} else {
			self.last_method(-1, self);
		}
	};
	
	self.all = function(func_array) {
		if(self.total_items == 0)
		{
			self.index = 0; self.total_process_requests = 0;
			self.total_items = 0; self.slab = 0;
			self.options = {}; self.parent = {}; self.requests = []; self.options.items = [];
		}
		
		for(var i = 0; i < func_array.length; i++)
		{
			self.requests.push({
				"id": self.total_items,
				"delay": self.delay_time
			});
			
			self.delay_time = 0;
			self.options.items.push(func_array[i]);
			self.total_items++;
		}
		
		return self;
	};

	self.then = function(func) {
		if(self.total_items == 0)
		{
			self.index = 0;
			self.total_process_requests = 0;
			self.total_items = 0;
			self.slab = 0;
			
			self.options = {};
			self.parent = {};
			self.requests = [];
			self.options.items = [];
		}
		
		self.requests.push({
			"id": self.total_items,
			"delay": self.delay_time
		});
		
		self.delay_time = 0;
		self.options.items.push(func);
		self.total_items++;
		return self;
	};

	self.catch = function(func) {
		self.on_error = func;
		return self;
	};

	self.delay = function(ms) {
		self.delay_time = parse.number(ms);
		return self;
	};
	
	self.item = function (index) {
		self.index = index;
		return self.options.items[self.index];
	};
	
	self.request = function (index) {
		self.index = index;
		return self.requests[self.index];
	};

	self.error = function (index, rest_error) {
		var output;
		self.got_error = true;
		
		if(self.on_error_stop)
		{
			if (typeof (self.requests[index]) != "undefined") self.requests[index].error = rest_error;
			self.on_error(self.requests, index);
		}
		else
		{
			self.next(index, output, rest_error);
		}
	};

	self.next = function (index, rest_output, rest_error) {
		self.index = index;
		self.total_process_requests++;
		self.ok(self.index, rest_output, rest_error);

		if (self.total_process_requests >= self.total_items) {
			self.last_method(self.index, self);
		} else {
			if ((self.total_process_requests % self.slab) == 0) {
				process_batch(self.total_process_requests);
			}
		}
	};

	self.ok = function (index, rest_output, rest_error) {
		if (typeof (self.requests[index]) != "undefined") self.requests[index].output = rest_output;
		if (typeof (self.requests[index]) != "undefined") self.requests[index].error = rest_error;
		self.common_method(index, self);
	};
	
	self.done = function(func) {
		self.rest_method = function(index, stackily){
			var current_func = stackily.item(index);
			var delay = self.requests[index].delay || 0;

			setTimeout(function() {
				var output = "";
				var previous_request = self.requests[index - 1] || {};
				
				try {
					if(is.func(current_func))
					{
						output = current_func(previous_request.output || "", function(output) {
							stackily.next(index, output);
						});
						
						if(self.call_next) {
							stackily.next(index, output);
						}
					}
					else
					{
						stackily.next(index, output);
					}
				}
				catch(e) {
					stackily.error(index, e);
				}
			}, delay);
		};
		
		self.common_method = function(index, stackily){
			
		};
		
		self.last_method = function(index, stackily){
			if(self.got_error) self.on_error(self.requests);
			
			self.total_items = 0;
			self.total_process_requests = 0;
			func(stackily.requests);
		};
		
		self.options.slab = 1;
		self.process(self.options);
	};
	
	self.process = function (options, parent) {
		self.options = options || {};
		self.options.items = self.options.items || [];

		if(self.options.from) {
			if(!self.options.to) {
				self.options.to = self.options.from;
			}

			if(self.options.items.length == 0) {
				var from = parse.number(self.options.from) - 1;
				var to = parse.number(self.options.to);

				while((++from) <= to) {
					self.options.items.push(from);
				}
			}
		}

		self.total_items = self.options.items.length;
		self.slab = options.slab || self.total_items;
		self.parent = parent || {};
		
		start();
	};

};

if(typeof(exports) == "undefined") exports = {}; exports.STACKILY = STACKILY;