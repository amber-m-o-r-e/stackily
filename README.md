# stackily.js

Derived from https://www.npmjs.com/package/stackify

First stack with FIFO in mind. It provides you simple and effective way to handle asynchronous JavaScript. Till now we are living in Promise Tower to avoid Pyramid of Doom, but still it’s uncomfortable for programmers who are dealing with huge number of rest requests (or same family request which moves too slowly). So I come-up with mine own implementation of promise tower that provides easy way to handle nested callbacks; and while doing so you can specify frequency slab for parallel processing. So now we can go serially, parallelly or any-ly :-). Again it support old-school coding, which runs on conventional modal of Promise Tower; all of this packed in one small .js file. **In short, stackily.js is just more than promise.** 


###Installation:
```javascript
$ npm install stackily
```

For client side html

```html
<script language='JavaScript' src='stackily.js'></script>
```


###Require statement:
```javascript
const STACKILY = require('stackily');
```

###Quick start:
```javascript
// Example for defining stackily processor.
const stackily_processor = new STACKILY((index, stackily) => {
    // Your current processing item, you can use this for your rest function.
    const item = stackily.item(index);
    
    your_rest_function(item, (output) => {
        // It will ask stackily to run processor against next item.
        stackily.next(index, output);
    });
}, (index, stackily) => {
    // You can place common code over here, 
    // which needs to be run after processing of each item.
    // It will give current request object.
    const current_request = stackily.request(index);
    
    // It will give current request output if any.
    const output = current_request.output;
    
    // It will give current request error if any.
    const error = current_request.error;
}, (index, stackily) => {
    // Your last code of execution.
});

// Now run this processor with any number of item collection.
stackily_processor.process({
    'items': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 
    // Here we can consider number of items equals to number of requests. 
    'slab': 3 
    // This specifies frequency for parallel processing.
});

```

&quot;From&quot; and &quot;to&quot; are also supportable.

```javascript
stackily_processor.process({
    'from': 1,
    'to': 10,
    'slab': 3 
    // This specifies frequency for parallel processing.
});
```

The above request processor can be used with different item collections, somewhere else.

```javascript
// We will run this processor with different item collection.
stackily_processor.process({
    'items': [{
        'id': 1,
        'name': 'Jack Jefferson',
        'gender': 'male'
    }, {
        'id': 2,
        'name': 'Molly Hooper',
        'gender': 'female'
    }], 
    'other_data': {
        
    },
    'headers': {
        
    }
    // Here we specified other optional data, that we can use in our processor.
    // If we will not specify slab it will parallelly process all items. 
    // Quick hack: For same we can specify slab as 0.
});
```

To use optional parameters or data, we need to do little change in our processor.
```javascript
// So our change processor will be as
const stackily_processor = new STACKILY(function(index, stackily){
    // Your current processing item, you can use this for your rest function.
    const item = stackily.item(index);
    
    // This will gives us other_data.
    const other_data = stackily.options.other_data;
    
    // This will gives us headers.
    const headers = stackily.options.headers;
    
    // This will gives us collection of items.
    const all_items = stackily.options.items;
    
    // So, we can also find our current item from items collection as
    item = stackily.options.items[index];
    
    your_rest_function(item, (output) => {
        // This will ask stackily to run processor against next item.
        stackily.next(index, output);
    });
}, (index, stackily) => {
    // You can place common code over here, 
    // which needs to be run after processing of each item.
    // So, we can find current request also from requests collection.
    const current_request = stackily.requests[index];
    
}, (index, stackily) => {
    // Your last code of execution.
    // So we can have all requests` output  or error at last by
    const requests = stackily.requests;
});
```

Now, how we can specify our nested processor?
```javascript
// This will be our nested processor.
const stackily_child_processor = new STACKILY(function(index, stackily){
    // Your current processing item, you can use this for your rest function.
    const item = stackily.item(index);

    your_rest_function(item, function(output) {
        // This will ask stackily to run processor against next item.
        stackily.next(index, output);
    });
}, (index, stackily) => {

}, (index, stackily) => {
    // On completion we will execute next method of parent.
    stackily.parent.next(stackily.parent.index, stackily.requests);
}, 'stackily_child_processor');
// Now here we specified processor name 'stackily_child_processor', this is optional.

// This will be our parent processor.
const stackily_parent_processor = new STACKILY((index, stackily) => {
    // Your current processing item, you can use this for your rest function.
    const item = stackily.item(index);
    // Current processor name.
    const name = stackily.name;

    your_rest_function(item, (output) => {
        // This will ask stackily to run child processor.
        stackily_child_processor.process({
            'items': output
            // Here we have consider 'output' is array.
        }, stackily);
        
        // No next is required for this, 
        // we will call next of this processor from child.
    });
}, (index, stackily) => {
    // Now, in this case we will have actual use of this method.
    // Since, we cannot write our common execution code in rest callback.
}, (index, stackily) => {
    // Your last code of execution.
    // So, we can have all requests` output or error at last by
    const requests = stackily.requests;
}, 'stackily_parent_processor');
```

###Conventional Promise:
How we can support our old code, we can do this by-
```javascript
(new STACKILY()).then((value) => {
    console.log(new Date());
    // This will be forward to next then method.
    return 10;
}).then((value) => {
    console.log(new Date());
    console.log('Earlier request output: ', value);
    return value + 20;
}).then((value) => {
    console.log(new Date());
    console.log('Earlier request output: ', value);
    return value + 30;
}).catch((requests) => {
    // In case of any error, this will get executed.
}).done((requests) => {
        // This will get executed at last.
});
```

For handling our rest callback, we need to pass options to STACKILY constructor.
```javascript
// Here we are passing require_next as 'true'.
(new STACKILY({
    'require_next': true,
    'on_error_stop': true
    // In case of any error, instantly it will halt our next step execution.
})).then((value, next) => {
    console.log(new Date());
    // This will be forward to next then method.
        next(10);
}).then((value, next) => {
        console.log(new Date());
    console.log('Earlier request output: ', value);
        next(20);
}).then((value, next) => {
    console.log(new Date());
    console.log('Earlier request output: ', value);

    your_rest_function(value, (output) => {
        next(output);
    });
}).catch((requests, execution_halt_at) => {
    // In case of any error, this will get executed.
    // 'execution_halt_at' will give us index at which execution got halt.
    console.log('Execution halt at: ', execution_halt_at);
    console.log('Error: ', requests[execution_halt_at].error);
}).done((requests) => {
        // This will get executed at last.
});
```

We can also pass collection of methods to our processor by .all method.
```javascript
(new STACKILY()).all([(value) => {
    console.log(new Date());
    // This will be forward to next then method.
        return 10;
}, (value) => {
        console.log(new Date());
    console.log('Earlier request output: ', value);
        return value + 20;
}, (value) => {
    console.log(new Date());
    console.log('Earlier request output: ', value);
    return value + 30;
}]).then((value) => {
    console.log(new Date());
    console.log('Earlier request output: ', value);
    return value + 40;
}).catch((requests, execution_halt_at) => {
    // In case of any error, this will get executed.
    // 'execution_halt_at' will give us index at which execution got halt.
}).done((requests) => {
        // This will get executed at last.
});

// Quick hack: With this, we can also use 'require_next' and other options.
```

Again, if we need to delay our next execution we can do that with .delay method.
```javascript
(new STACKILY()).then((value) => {
    console.log(new Date());
    // This will be forward to next then method.
        return 10;
})
// This will delay next execution for 10 seconds.
.delay(10000).then((value) => {
        console.log(new Date());
    console.log('Earlier request output: ', value);
        return value + 20;
}).then((value) => {
    console.log(new Date());
    console.log('Earlier request output: ', value);
    return value + 30;
}).catch((requests, execution_halt_at) => {
    // In case of any error, this will get executed.
    // 'execution_halt_at' will give us index at which execution got halt.
}).done((requests) => {
        // This will get executed at last.
});
```

####Till now that’s all, Thanks Folks!


###License
Copyright 2021, Amber More - MIT License (enclosed)
