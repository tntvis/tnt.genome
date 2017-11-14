(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
if (typeof tnt === "undefined") {
    module.exports = tnt = {};
}
tnt.board = require("./index.js");
tnt.utils = require("tnt.utils");

},{"./index.js":2,"tnt.utils":33}],2:[function(require,module,exports){
// if (typeof tnt === "undefined") {
//     module.exports = tnt = {}
// }
module.exports = require("./src/index.js");


},{"./src/index.js":41}],3:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
 * @version   3.3.1
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.ES6Promise = factory());
}(this, (function () { 'use strict';

function objectOrFunction(x) {
  return typeof x === 'function' || typeof x === 'object' && x !== null;
}

function isFunction(x) {
  return typeof x === 'function';
}

var _isArray = undefined;
if (!Array.isArray) {
  _isArray = function (x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
} else {
  _isArray = Array.isArray;
}

var isArray = _isArray;

var len = 0;
var vertxNext = undefined;
var customSchedulerFn = undefined;

var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
};

function setScheduler(scheduleFn) {
  customSchedulerFn = scheduleFn;
}

function setAsap(asapFn) {
  asap = asapFn;
}

var browserWindow = typeof window !== 'undefined' ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && ({}).toString.call(process) === '[object process]';

// test for web worker but not in IE10
var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

// node
function useNextTick() {
  // node version 0.10.x displays a deprecation warning when nextTick is used recursively
  // see https://github.com/cujojs/when/issues/410 for details
  return function () {
    return process.nextTick(flush);
  };
}

// vertx
function useVertxTimer() {
  return function () {
    vertxNext(flush);
  };
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function () {
    node.data = iterations = ++iterations % 2;
  };
}

// web worker
function useMessageChannel() {
  var channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return function () {
    return channel.port2.postMessage(0);
  };
}

function useSetTimeout() {
  // Store setTimeout reference so es6-promise will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var globalSetTimeout = setTimeout;
  return function () {
    return globalSetTimeout(flush, 1);
  };
}

var queue = new Array(1000);
function flush() {
  for (var i = 0; i < len; i += 2) {
    var callback = queue[i];
    var arg = queue[i + 1];

    callback(arg);

    queue[i] = undefined;
    queue[i + 1] = undefined;
  }

  len = 0;
}

function attemptVertx() {
  try {
    var r = require;
    var vertx = r('vertx');
    vertxNext = vertx.runOnLoop || vertx.runOnContext;
    return useVertxTimer();
  } catch (e) {
    return useSetTimeout();
  }
}

var scheduleFlush = undefined;
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && typeof require === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}

function then(onFulfillment, onRejection) {
  var _arguments = arguments;

  var parent = this;

  var child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }

  var _state = parent._state;

  if (_state) {
    (function () {
      var callback = _arguments[_state - 1];
      asap(function () {
        return invokeCallback(_state, child, callback, parent._result);
      });
    })();
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

/**
  `Promise.resolve` returns a promise that will become resolved with the
  passed `value`. It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    resolve(1);
  });

  promise.then(function(value){
    // value === 1
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.resolve(1);

  promise.then(function(value){
    // value === 1
  });
  ```

  @method resolve
  @static
  @param {Any} value value that the returned promise will be resolved with
  Useful for tooling.
  @return {Promise} a promise that will become fulfilled with the given
  `value`
*/
function resolve(object) {
  /*jshint validthis:true */
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(noop);
  _resolve(promise, object);
  return promise;
}

var PROMISE_ID = Math.random().toString(36).substring(16);

function noop() {}

var PENDING = void 0;
var FULFILLED = 1;
var REJECTED = 2;

var GET_THEN_ERROR = new ErrorObject();

function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}

function cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function getThen(promise) {
  try {
    return promise.then;
  } catch (error) {
    GET_THEN_ERROR.error = error;
    return GET_THEN_ERROR;
  }
}

function tryThen(then, value, fulfillmentHandler, rejectionHandler) {
  try {
    then.call(value, fulfillmentHandler, rejectionHandler);
  } catch (e) {
    return e;
  }
}

function handleForeignThenable(promise, thenable, then) {
  asap(function (promise) {
    var sealed = false;
    var error = tryThen(then, thenable, function (value) {
      if (sealed) {
        return;
      }
      sealed = true;
      if (thenable !== value) {
        _resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, function (reason) {
      if (sealed) {
        return;
      }
      sealed = true;

      _reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      _reject(promise, error);
    }
  }, promise);
}

function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    _reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return _resolve(promise, value);
    }, function (reason) {
      return _reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$) {
  if (maybeThenable.constructor === promise.constructor && then$$ === then && maybeThenable.constructor.resolve === resolve) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then$$ === GET_THEN_ERROR) {
      _reject(promise, GET_THEN_ERROR.error);
    } else if (then$$ === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$)) {
      handleForeignThenable(promise, maybeThenable, then$$);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}

function _resolve(promise, value) {
  if (promise === value) {
    _reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    handleMaybeThenable(promise, value, getThen(value));
  } else {
    fulfill(promise, value);
  }
}

function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

function _reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;

  parent._onerror = null;

  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;

  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = undefined,
      callback = undefined,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function ErrorObject() {
  this.error = null;
}

var TRY_CATCH_ERROR = new ErrorObject();

function tryCatch(callback, detail) {
  try {
    return callback(detail);
  } catch (e) {
    TRY_CATCH_ERROR.error = e;
    return TRY_CATCH_ERROR;
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value = undefined,
      error = undefined,
      succeeded = undefined,
      failed = undefined;

  if (hasCallback) {
    value = tryCatch(callback, detail);

    if (value === TRY_CATCH_ERROR) {
      failed = true;
      error = value.error;
      value = null;
    } else {
      succeeded = true;
    }

    if (promise === value) {
      _reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
      _resolve(promise, value);
    } else if (failed) {
      _reject(promise, error);
    } else if (settled === FULFILLED) {
      fulfill(promise, value);
    } else if (settled === REJECTED) {
      _reject(promise, value);
    }
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value) {
      _resolve(promise, value);
    }, function rejectPromise(reason) {
      _reject(promise, reason);
    });
  } catch (e) {
    _reject(promise, e);
  }
}

var id = 0;
function nextId() {
  return id++;
}

function makePromise(promise) {
  promise[PROMISE_ID] = id++;
  promise._state = undefined;
  promise._result = undefined;
  promise._subscribers = [];
}

function Enumerator(Constructor, input) {
  this._instanceConstructor = Constructor;
  this.promise = new Constructor(noop);

  if (!this.promise[PROMISE_ID]) {
    makePromise(this.promise);
  }

  if (isArray(input)) {
    this._input = input;
    this.length = input.length;
    this._remaining = input.length;

    this._result = new Array(this.length);

    if (this.length === 0) {
      fulfill(this.promise, this._result);
    } else {
      this.length = this.length || 0;
      this._enumerate();
      if (this._remaining === 0) {
        fulfill(this.promise, this._result);
      }
    }
  } else {
    _reject(this.promise, validationError());
  }
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
};

Enumerator.prototype._enumerate = function () {
  var length = this.length;
  var _input = this._input;

  for (var i = 0; this._state === PENDING && i < length; i++) {
    this._eachEntry(_input[i], i);
  }
};

Enumerator.prototype._eachEntry = function (entry, i) {
  var c = this._instanceConstructor;
  var resolve$$ = c.resolve;

  if (resolve$$ === resolve) {
    var _then = getThen(entry);

    if (_then === then && entry._state !== PENDING) {
      this._settledAt(entry._state, i, entry._result);
    } else if (typeof _then !== 'function') {
      this._remaining--;
      this._result[i] = entry;
    } else if (c === Promise) {
      var promise = new c(noop);
      handleMaybeThenable(promise, entry, _then);
      this._willSettleAt(promise, i);
    } else {
      this._willSettleAt(new c(function (resolve$$) {
        return resolve$$(entry);
      }), i);
    }
  } else {
    this._willSettleAt(resolve$$(entry), i);
  }
};

Enumerator.prototype._settledAt = function (state, i, value) {
  var promise = this.promise;

  if (promise._state === PENDING) {
    this._remaining--;

    if (state === REJECTED) {
      _reject(promise, value);
    } else {
      this._result[i] = value;
    }
  }

  if (this._remaining === 0) {
    fulfill(promise, this._result);
  }
};

Enumerator.prototype._willSettleAt = function (promise, i) {
  var enumerator = this;

  subscribe(promise, undefined, function (value) {
    return enumerator._settledAt(FULFILLED, i, value);
  }, function (reason) {
    return enumerator._settledAt(REJECTED, i, reason);
  });
};

/**
  `Promise.all` accepts an array of promises, and returns a new promise which
  is fulfilled with an array of fulfillment values for the passed promises, or
  rejected with the reason of the first passed promise to be rejected. It casts all
  elements of the passed iterable to promises as it runs this algorithm.

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = resolve(2);
  let promise3 = resolve(3);
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = reject(new Error("2"));
  let promise3 = reject(new Error("3"));
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @static
  @param {Array} entries array of promises
  @param {String} label optional string for labeling the promise.
  Useful for tooling.
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
  @static
*/
function all(entries) {
  return new Enumerator(this, entries).promise;
}

/**
  `Promise.race` returns a new promise which is settled in the same way as the
  first passed promise to settle.

  Example:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 2');
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // result === 'promise 2' because it was resolved before promise1
    // was resolved.
  });
  ```

  `Promise.race` is deterministic in that only the state of the first
  settled promise matters. For example, even if other promises given to the
  `promises` array argument are resolved, but the first settled promise has
  become rejected before the other promises became fulfilled, the returned
  promise will become rejected:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error('promise 2'));
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // Code here never runs
  }, function(reason){
    // reason.message === 'promise 2' because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  An example real-world use case is implementing timeouts:

  ```javascript
  Promise.race([ajax('foo.json'), timeout(5000)])
  ```

  @method race
  @static
  @param {Array} promises array of promises to observe
  Useful for tooling.
  @return {Promise} a promise which settles in the same way as the first passed
  promise to settle.
*/
function race(entries) {
  /*jshint validthis:true */
  var Constructor = this;

  if (!isArray(entries)) {
    return new Constructor(function (_, reject) {
      return reject(new TypeError('You must pass an array to race.'));
    });
  } else {
    return new Constructor(function (resolve, reject) {
      var length = entries.length;
      for (var i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}

/**
  `Promise.reject` returns a promise rejected with the passed `reason`.
  It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @static
  @param {Any} reason value that the returned promise will be rejected with.
  Useful for tooling.
  @return {Promise} a promise rejected with the given `reason`.
*/
function reject(reason) {
  /*jshint validthis:true */
  var Constructor = this;
  var promise = new Constructor(noop);
  _reject(promise, reason);
  return promise;
}

function needsResolver() {
  throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}

function needsNew() {
  throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
}

/**
  Promise objects represent the eventual result of an asynchronous operation. The
  primary way of interacting with a promise is through its `then` method, which
  registers callbacks to receive either a promise's eventual value or the reason
  why the promise cannot be fulfilled.

  Terminology
  -----------

  - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
  - `thenable` is an object or function that defines a `then` method.
  - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
  - `exception` is a value that is thrown using the throw statement.
  - `reason` is a value that indicates why a promise was rejected.
  - `settled` the final resting state of a promise, fulfilled or rejected.

  A promise can be in one of three states: pending, fulfilled, or rejected.

  Promises that are fulfilled have a fulfillment value and are in the fulfilled
  state.  Promises that are rejected have a rejection reason and are in the
  rejected state.  A fulfillment value is never a thenable.

  Promises can also be said to *resolve* a value.  If this value is also a
  promise, then the original promise's settled state will match the value's
  settled state.  So a promise that *resolves* a promise that rejects will
  itself reject, and a promise that *resolves* a promise that fulfills will
  itself fulfill.


  Basic Usage:
  ------------

  ```js
  let promise = new Promise(function(resolve, reject) {
    // on success
    resolve(value);

    // on failure
    reject(reason);
  });

  promise.then(function(value) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Advanced Usage:
  ---------------

  Promises shine when abstracting away asynchronous interactions such as
  `XMLHttpRequest`s.

  ```js
  function getJSON(url) {
    return new Promise(function(resolve, reject){
      let xhr = new XMLHttpRequest();

      xhr.open('GET', url);
      xhr.onreadystatechange = handler;
      xhr.responseType = 'json';
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();

      function handler() {
        if (this.readyState === this.DONE) {
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
          }
        }
      };
    });
  }

  getJSON('/posts.json').then(function(json) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Unlike callbacks, promises are great composable primitives.

  ```js
  Promise.all([
    getJSON('/posts'),
    getJSON('/comments')
  ]).then(function(values){
    values[0] // => postsJSON
    values[1] // => commentsJSON

    return values;
  });
  ```

  @class Promise
  @param {function} resolver
  Useful for tooling.
  @constructor
*/
function Promise(resolver) {
  this[PROMISE_ID] = nextId();
  this._result = this._state = undefined;
  this._subscribers = [];

  if (noop !== resolver) {
    typeof resolver !== 'function' && needsResolver();
    this instanceof Promise ? initializePromise(this, resolver) : needsNew();
  }
}

Promise.all = all;
Promise.race = race;
Promise.resolve = resolve;
Promise.reject = reject;
Promise._setScheduler = setScheduler;
Promise._setAsap = setAsap;
Promise._asap = asap;

Promise.prototype = {
  constructor: Promise,

  /**
    The primary way of interacting with a promise is through its `then` method,
    which registers callbacks to receive either a promise's eventual value or the
    reason why the promise cannot be fulfilled.
  
    ```js
    findUser().then(function(user){
      // user is available
    }, function(reason){
      // user is unavailable, and you are given the reason why
    });
    ```
  
    Chaining
    --------
  
    The return value of `then` is itself a promise.  This second, 'downstream'
    promise is resolved with the return value of the first promise's fulfillment
    or rejection handler, or rejected if the handler throws an exception.
  
    ```js
    findUser().then(function (user) {
      return user.name;
    }, function (reason) {
      return 'default name';
    }).then(function (userName) {
      // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
      // will be `'default name'`
    });
  
    findUser().then(function (user) {
      throw new Error('Found user, but still unhappy');
    }, function (reason) {
      throw new Error('`findUser` rejected and we're unhappy');
    }).then(function (value) {
      // never reached
    }, function (reason) {
      // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
      // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
    });
    ```
    If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
  
    ```js
    findUser().then(function (user) {
      throw new PedagogicalException('Upstream error');
    }).then(function (value) {
      // never reached
    }).then(function (value) {
      // never reached
    }, function (reason) {
      // The `PedgagocialException` is propagated all the way down to here
    });
    ```
  
    Assimilation
    ------------
  
    Sometimes the value you want to propagate to a downstream promise can only be
    retrieved asynchronously. This can be achieved by returning a promise in the
    fulfillment or rejection handler. The downstream promise will then be pending
    until the returned promise is settled. This is called *assimilation*.
  
    ```js
    findUser().then(function (user) {
      return findCommentsByAuthor(user);
    }).then(function (comments) {
      // The user's comments are now available
    });
    ```
  
    If the assimliated promise rejects, then the downstream promise will also reject.
  
    ```js
    findUser().then(function (user) {
      return findCommentsByAuthor(user);
    }).then(function (comments) {
      // If `findCommentsByAuthor` fulfills, we'll have the value here
    }, function (reason) {
      // If `findCommentsByAuthor` rejects, we'll have the reason here
    });
    ```
  
    Simple Example
    --------------
  
    Synchronous Example
  
    ```javascript
    let result;
  
    try {
      result = findResult();
      // success
    } catch(reason) {
      // failure
    }
    ```
  
    Errback Example
  
    ```js
    findResult(function(result, err){
      if (err) {
        // failure
      } else {
        // success
      }
    });
    ```
  
    Promise Example;
  
    ```javascript
    findResult().then(function(result){
      // success
    }, function(reason){
      // failure
    });
    ```
  
    Advanced Example
    --------------
  
    Synchronous Example
  
    ```javascript
    let author, books;
  
    try {
      author = findAuthor();
      books  = findBooksByAuthor(author);
      // success
    } catch(reason) {
      // failure
    }
    ```
  
    Errback Example
  
    ```js
  
    function foundBooks(books) {
  
    }
  
    function failure(reason) {
  
    }
  
    findAuthor(function(author, err){
      if (err) {
        failure(err);
        // failure
      } else {
        try {
          findBoooksByAuthor(author, function(books, err) {
            if (err) {
              failure(err);
            } else {
              try {
                foundBooks(books);
              } catch(reason) {
                failure(reason);
              }
            }
          });
        } catch(error) {
          failure(err);
        }
        // success
      }
    });
    ```
  
    Promise Example;
  
    ```javascript
    findAuthor().
      then(findBooksByAuthor).
      then(function(books){
        // found books
    }).catch(function(reason){
      // something went wrong
    });
    ```
  
    @method then
    @param {Function} onFulfilled
    @param {Function} onRejected
    Useful for tooling.
    @return {Promise}
  */
  then: then,

  /**
    `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
    as the catch block of a try/catch statement.
  
    ```js
    function findAuthor(){
      throw new Error('couldn't find that author');
    }
  
    // synchronous
    try {
      findAuthor();
    } catch(reason) {
      // something went wrong
    }
  
    // async with promises
    findAuthor().catch(function(reason){
      // something went wrong
    });
    ```
  
    @method catch
    @param {Function} onRejection
    Useful for tooling.
    @return {Promise}
  */
  'catch': function _catch(onRejection) {
    return this.then(null, onRejection);
  }
};

function polyfill() {
    var local = undefined;

    if (typeof global !== 'undefined') {
        local = global;
    } else if (typeof self !== 'undefined') {
        local = self;
    } else {
        try {
            local = Function('return this')();
        } catch (e) {
            throw new Error('polyfill failed because global object is unavailable in this environment');
        }
    }

    var P = local.Promise;

    if (P) {
        var promiseToString = null;
        try {
            promiseToString = Object.prototype.toString.call(P.resolve());
        } catch (e) {
            // silently ignored
        }

        if (promiseToString === '[object Promise]' && !P.cast) {
            return;
        }
    }

    local.Promise = Promise;
}

polyfill();
// Strange compat..
Promise.polyfill = polyfill;
Promise.Promise = Promise;

return Promise;

})));
//# sourceMappingURL=es6-promise.map
}).call(this,require("lYpoI2"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"lYpoI2":4}],4:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],5:[function(require,module,exports){
/*globals define */
'use strict';


(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return (root.httppleasepromises = factory(root));
        });
    } else if (typeof exports === 'object') {
        module.exports = factory(root);
    } else {
        root.httppleasepromises = factory(root);
    }
}(this, function (root) { // jshint ignore:line
    return function (Promise) {
        Promise = Promise || root && root.Promise;
        if (!Promise) {
            throw new Error('No Promise implementation found.');
        }
        return {
            processRequest: function (req) {
                var resolve, reject,
                    oldOnload = req.onload,
                    oldOnerror = req.onerror,
                    promise = new Promise(function (a, b) {
                        resolve = a;
                        reject = b;
                    });
                req.onload = function (res) {
                    var result;
                    if (oldOnload) {
                        result = oldOnload.apply(this, arguments);
                    }
                    resolve(res);
                    return result;
                };
                req.onerror = function (err) {
                    var result;
                    if (oldOnerror) {
                        result = oldOnerror.apply(this, arguments);
                    }
                    reject(err);
                    return result;
                };
                req.then = function () {
                    return promise.then.apply(promise, arguments);
                };
                req['catch'] = function () {
                    return promise['catch'].apply(promise, arguments);
                };
            }
        };
    };
}));

},{}],6:[function(require,module,exports){
'use strict';

var Response = require('./response');

function RequestError(message, props) {
    var err = new Error(message);
    err.name = 'RequestError';
    this.name = err.name;
    this.message = err.message;
    if (err.stack) {
        this.stack = err.stack;
    }

    this.toString = function () {
        return this.message;
    };

    for (var k in props) {
        if (props.hasOwnProperty(k)) {
            this[k] = props[k];
        }
    }
}

RequestError.prototype = Error.prototype;

RequestError.create = function (message, req, props) {
    var err = new RequestError(message, props);
    Response.call(err, req);
    return err;
};

module.exports = RequestError;

},{"./response":9}],7:[function(require,module,exports){
'use strict';

var i,
    cleanURL = require('../plugins/cleanurl'),
    XHR = require('./xhr'),
    delay = require('./utils/delay'),
    createError = require('./error').create,
    Response = require('./response'),
    Request = require('./request'),
    extend = require('xtend'),
    once = require('./utils/once');

function factory(defaults, plugins) {
    defaults = defaults || {};
    plugins = plugins || [];

    function http(req, cb) {
        var xhr, plugin, done, k, timeoutId;

        req = new Request(extend(defaults, req));

        for (i = 0; i < plugins.length; i++) {
            plugin = plugins[i];
            if (plugin.processRequest) {
                plugin.processRequest(req);
            }
        }

        // Give the plugins a chance to create the XHR object
        for (i = 0; i < plugins.length; i++) {
            plugin = plugins[i];
            if (plugin.createXHR) {
                xhr = plugin.createXHR(req);
                break; // First come, first serve
            }
        }
        xhr = xhr || new XHR();

        req.xhr = xhr;

        // Because XHR can be an XMLHttpRequest or an XDomainRequest, we add
        // `onreadystatechange`, `onload`, and `onerror` callbacks. We use the
        // `once` util to make sure that only one is called (and it's only called
        // one time).
        done = once(delay(function (err) {
            clearTimeout(timeoutId);
            xhr.onload = xhr.onerror = xhr.onreadystatechange = xhr.ontimeout = xhr.onprogress = null;
            var res = err && err.isHttpError ? err : new Response(req);
            for (i = 0; i < plugins.length; i++) {
                plugin = plugins[i];
                if (plugin.processResponse) {
                    plugin.processResponse(res);
                }
            }
            if (err) {
                if (req.onerror) {
                    req.onerror(err);
                }
            } else {
                if (req.onload) {
                    req.onload(res);
                }
            }
            if (cb) {
                cb(err, res);
            }
        }));

        // When the request completes, continue.
        xhr.onreadystatechange = function () {
            if (req.timedOut) return;

            if (req.aborted) {
                done(createError('Request aborted', req, {name: 'Abort'}));
            } else if (xhr.readyState === 4) {
                var type = Math.floor(xhr.status / 100);
                if (type === 2) {
                    done();
                } else if (xhr.status === 404 && !req.errorOn404) {
                    done();
                } else {
                    var kind;
                    switch (type) {
                        case 4:
                            kind = 'Client';
                            break;
                        case 5:
                            kind = 'Server';
                            break;
                        default:
                            kind = 'HTTP';
                    }
                    var msg = kind + ' Error: ' +
                              'The server returned a status of ' + xhr.status +
                              ' for the request "' +
                              req.method.toUpperCase() + ' ' + req.url + '"';
                    done(createError(msg, req));
                }
            }
        };

        // `onload` is only called on success and, in IE, will be called without
        // `xhr.status` having been set, so we don't check it.
        xhr.onload = function () { done(); };

        xhr.onerror = function () {
            done(createError('Internal XHR Error', req));
        };

        // IE sometimes fails if you don't specify every handler.
        // See http://social.msdn.microsoft.com/Forums/ie/en-US/30ef3add-767c-4436-b8a9-f1ca19b4812e/ie9-rtm-xdomainrequest-issued-requests-may-abort-if-all-event-handlers-not-specified?forum=iewebdevelopment
        xhr.ontimeout = function () { /* noop */ };
        xhr.onprogress = function () { /* noop */ };

        xhr.open(req.method, req.url);

        if (req.timeout) {
            // If we use the normal XHR timeout mechanism (`xhr.timeout` and
            // `xhr.ontimeout`), `onreadystatechange` will be triggered before
            // `ontimeout`. There's no way to recognize that it was triggered by
            // a timeout, and we'd be unable to dispatch the right error.
            timeoutId = setTimeout(function () {
                req.timedOut = true;
                done(createError('Request timeout', req, {name: 'Timeout'}));
                try {
                    xhr.abort();
                } catch (err) {}
            }, req.timeout);
        }

        for (k in req.headers) {
            if (req.headers.hasOwnProperty(k)) {
                xhr.setRequestHeader(k, req.headers[k]);
            }
        }

        xhr.send(req.body);

        return req;
    }

    var method,
        methods = ['get', 'post', 'put', 'head', 'patch', 'delete'],
        verb = function (method) {
            return function (req, cb) {
                req = new Request(req);
                req.method = method;
                return http(req, cb);
            };
        };
    for (i = 0; i < methods.length; i++) {
        method = methods[i];
        http[method] = verb(method);
    }

    http.plugins = function () {
        return plugins;
    };

    http.defaults = function (newValues) {
        if (newValues) {
            return factory(extend(defaults, newValues), plugins);
        }
        return defaults;
    };

    http.use = function () {
        var newPlugins = Array.prototype.slice.call(arguments, 0);
        return factory(defaults, plugins.concat(newPlugins));
    };

    http.bare = function () {
        return factory();
    };

    http.Request = Request;
    http.Response = Response;

    return http;
}

module.exports = factory({}, [cleanURL]);

},{"../plugins/cleanurl":14,"./error":6,"./request":8,"./response":9,"./utils/delay":10,"./utils/once":11,"./xhr":12,"xtend":13}],8:[function(require,module,exports){
'use strict';

function Request(optsOrUrl) {
    var opts = typeof optsOrUrl === 'string' ? {url: optsOrUrl} : optsOrUrl || {};
    this.method = opts.method ? opts.method.toUpperCase() : 'GET';
    this.url = opts.url;
    this.headers = opts.headers || {};
    this.body = opts.body;
    this.timeout = opts.timeout || 0;
    this.errorOn404 = opts.errorOn404 != null ? opts.errorOn404 : true;
    this.onload = opts.onload;
    this.onerror = opts.onerror;
}

Request.prototype.abort = function () {
    if (this.aborted) return;
    this.aborted = true;
    this.xhr.abort();
    return this;
};

Request.prototype.header = function (name, value) {
    var k;
    for (k in this.headers) {
        if (this.headers.hasOwnProperty(k)) {
            if (name.toLowerCase() === k.toLowerCase()) {
                if (arguments.length === 1) {
                    return this.headers[k];
                }

                delete this.headers[k];
                break;
            }
        }
    }
    if (value != null) {
        this.headers[name] = value;
        return value;
    }
};


module.exports = Request;

},{}],9:[function(require,module,exports){
'use strict';

var Request = require('./request');


function Response(req) {
    var i, lines, m,
        xhr = req.xhr;
    this.request = req;
    this.xhr = xhr;
    this.headers = {};

    // Browsers don't like you trying to read XHR properties when you abort the
    // request, so we don't.
    if (req.aborted || req.timedOut) return;

    this.status = xhr.status || 0;
    this.text = xhr.responseText;
    this.body = xhr.response || xhr.responseText;
    this.contentType = xhr.contentType || (xhr.getResponseHeader && xhr.getResponseHeader('Content-Type'));

    if (xhr.getAllResponseHeaders) {
        lines = xhr.getAllResponseHeaders().split('\n');
        for (i = 0; i < lines.length; i++) {
            if ((m = lines[i].match(/\s*([^\s]+):\s+([^\s]+)/))) {
                this.headers[m[1]] = m[2];
            }
        }
    }

    this.isHttpError = this.status >= 400;
}

Response.prototype.header = Request.prototype.header;


module.exports = Response;

},{"./request":8}],10:[function(require,module,exports){
'use strict';

// Wrap a function in a `setTimeout` call. This is used to guarantee async
// behavior, which can avoid unexpected errors.

module.exports = function (fn) {
    return function () {
        var
            args = Array.prototype.slice.call(arguments, 0),
            newFunc = function () {
                return fn.apply(null, args);
            };
        setTimeout(newFunc, 0);
    };
};

},{}],11:[function(require,module,exports){
'use strict';

// A "once" utility.
module.exports = function (fn) {
    var result, called = false;
    return function () {
        if (!called) {
            called = true;
            result = fn.apply(this, arguments);
        }
        return result;
    };
};

},{}],12:[function(require,module,exports){
module.exports = window.XMLHttpRequest;

},{}],13:[function(require,module,exports){
module.exports = extend

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],14:[function(require,module,exports){
'use strict';

module.exports = {
    processRequest: function (req) {
        req.url = req.url.replace(/[^%]+/g, function (s) {
            return encodeURI(s);
        });
    }
};

},{}],15:[function(require,module,exports){
'use strict';

var jsonrequest = require('./jsonrequest'),
    jsonresponse = require('./jsonresponse');

module.exports = {
    processRequest: function (req) {
        jsonrequest.processRequest.call(this, req);
        jsonresponse.processRequest.call(this, req);
    },
    processResponse: function (res) {
        jsonresponse.processResponse.call(this, res);
    }
};

},{"./jsonrequest":16,"./jsonresponse":17}],16:[function(require,module,exports){
'use strict';

module.exports = {
    processRequest: function (req) {
        var
            contentType = req.header('Content-Type'),
            hasJsonContentType = contentType &&
                                 contentType.indexOf('application/json') !== -1;

        if (contentType != null && !hasJsonContentType) {
            return;
        }

        if (req.body) {
            if (!contentType) {
                req.header('Content-Type', 'application/json');
            }

            req.body = JSON.stringify(req.body);
        }
    }
};

},{}],17:[function(require,module,exports){
'use strict';

module.exports = {
    processRequest: function (req) {
        var accept = req.header('Accept');
        if (accept == null) {
            req.header('Accept', 'application/json');
        }
    },
    processResponse: function (res) {
        // Check to see if the contentype is "something/json" or
        // "something/somethingelse+json"
        if (res.contentType && /^.*\/(?:.*\+)?json(;|$)/i.test(res.contentType)) {
            var raw = typeof res.body === 'string' ? res.body : res.text;
            if (raw) {
                res.body = JSON.parse(raw);
            }
        }
    }
};

},{}],18:[function(require,module,exports){
module.exports = require("./src/api.js");

},{"./src/api.js":19}],19:[function(require,module,exports){
var api = function (who) {

    var _methods = function () {
	var m = [];

	m.add_batch = function (obj) {
	    m.unshift(obj);
	};

	m.update = function (method, value) {
	    for (var i=0; i<m.length; i++) {
		for (var p in m[i]) {
		    if (p === method) {
			m[i][p] = value;
			return true;
		    }
		}
	    }
	    return false;
	};

	m.add = function (method, value) {
	    if (m.update (method, value) ) {
	    } else {
		var reg = {};
		reg[method] = value;
		m.add_batch (reg);
	    }
	};

	m.get = function (method) {
	    for (var i=0; i<m.length; i++) {
		for (var p in m[i]) {
		    if (p === method) {
			return m[i][p];
		    }
		}
	    }
	};

	return m;
    };

    var methods    = _methods();
    var api = function () {};

    api.check = function (method, check, msg) {
	if (method instanceof Array) {
	    for (var i=0; i<method.length; i++) {
		api.check(method[i], check, msg);
	    }
	    return;
	}

	if (typeof (method) === 'function') {
	    method.check(check, msg);
	} else {
	    who[method].check(check, msg);
	}
	return api;
    };

    api.transform = function (method, cbak) {
	if (method instanceof Array) {
	    for (var i=0; i<method.length; i++) {
		api.transform (method[i], cbak);
	    }
	    return;
	}

	if (typeof (method) === 'function') {
	    method.transform (cbak);
	} else {
	    who[method].transform(cbak);
	}
	return api;
    };

    var attach_method = function (method, opts) {
	var checks = [];
	var transforms = [];

	var getter = opts.on_getter || function () {
	    return methods.get(method);
	};

	var setter = opts.on_setter || function (x) {
	    for (var i=0; i<transforms.length; i++) {
		x = transforms[i](x);
	    }

	    for (var j=0; j<checks.length; j++) {
		if (!checks[j].check(x)) {
		    var msg = checks[j].msg || 
			("Value " + x + " doesn't seem to be valid for this method");
		    throw (msg);
		}
	    }
	    methods.add(method, x);
	};

	var new_method = function (new_val) {
	    if (!arguments.length) {
		return getter();
	    }
	    setter(new_val);
	    return who; // Return this?
	};
	new_method.check = function (cbak, msg) {
	    if (!arguments.length) {
		return checks;
	    }
	    checks.push ({check : cbak,
			  msg   : msg});
	    return this;
	};
	new_method.transform = function (cbak) {
	    if (!arguments.length) {
		return transforms;
	    }
	    transforms.push(cbak);
	    return this;
	};

	who[method] = new_method;
    };

    var getset = function (param, opts) {
	if (typeof (param) === 'object') {
	    methods.add_batch (param);
	    for (var p in param) {
		attach_method (p, opts);
	    }
	} else {
	    methods.add (param, opts.default_value);
	    attach_method (param, opts);
	}
    };

    api.getset = function (param, def) {
	getset(param, {default_value : def});

	return api;
    };

    api.get = function (param, def) {
	var on_setter = function () {
	    throw ("Method defined only as a getter (you are trying to use it as a setter");
	};

	getset(param, {default_value : def,
		       on_setter : on_setter}
	      );

	return api;
    };

    api.set = function (param, def) {
	var on_getter = function () {
	    throw ("Method defined only as a setter (you are trying to use it as a getter");
	};

	getset(param, {default_value : def,
		       on_getter : on_getter}
	      );

	return api;
    };

    api.method = function (name, cbak) {
	if (typeof (name) === 'object') {
	    for (var p in name) {
		who[p] = name[p];
	    }
	} else {
	    who[name] = cbak;
	}
	return api;
    };

    return api;
    
};

module.exports = exports = api;
},{}],20:[function(require,module,exports){
// if (typeof tnt === "undefined") {
//     module.exports = tnt = {}
// }
// tnt.utils = require("tnt.utils");
// tnt.tooltip = require("tnt.tooltip");
// tnt.board = require("./src/index.js");

module.exports = require("./src/index");

},{"./src/index":24}],21:[function(require,module,exports){
var apijs = require ("tnt.api");
var deferCancel = require ("tnt.utils").defer_cancel;

var board = function() {
    "use strict";

    //// Private vars
    var svg;
    var div_id;
    var tracks = [];
    var min_width = 50;
    var height    = 0;    // This is the global height including all the tracks
    var width     = 920;
    var height_offset = 20;
    var loc = {
	species  : undefined,
	chr      : undefined,
        from     : 0,
        to       : 500
    };

    // Limit caps
    var caps = {
        left : undefined,
        right : undefined
    };
    var cap_width = 3;


    // TODO: We have now background color in the tracks. Can this be removed?
    // It looks like it is used in the too-wide pane etc, but it may not be needed anymore
    var bgColor   = d3.rgb('#F8FBEF'); //#F8FBEF
    var pane; // Draggable pane
    var svg_g;
    var xScale;
    var zoomEventHandler = d3.behavior.zoom();
    var limits = {
        min : 0,
        max : 1000,
        zoom_out : 1000,
        zoom_in  : 100
    };
    var dur = 500;
    var drag_allowed = true;

    var exports = {
        ease          : d3.ease("cubic-in-out"),
        extend_canvas : {
            left : 0,
            right : 0
        },
        show_frame : true
        // limits        : function () {throw "The limits method should be defined"}
    };

    // The returned closure / object
    var track_vis = function(div) {
    	div_id = d3.select(div).attr("id");

    	// The original div is classed with the tnt class
    	d3.select(div)
    	    .classed("tnt", true);

    	// TODO: Move the styling to the scss?
    	var browserDiv = d3.select(div)
    	    .append("div")
    	    .attr("id", "tnt_" + div_id)
    	    .style("position", "relative")
    	    .classed("tnt_framed", exports.show_frame ? true : false)
    	    .style("width", (width + cap_width*2 + exports.extend_canvas.right + exports.extend_canvas.left) + "px");

    	var groupDiv = browserDiv
    	    .append("div")
    	    .attr("class", "tnt_groupDiv");

    	// The SVG
    	svg = groupDiv
    	    .append("svg")
    	    .attr("class", "tnt_svg")
    	    .attr("width", width)
    	    .attr("height", height)
    	    .attr("pointer-events", "all");

    	svg_g = svg
    	    .append("g")
                .attr("transform", "translate(0,20)")
                .append("g")
    	    .attr("class", "tnt_g");

    	// caps
    	caps.left = svg_g
    	    .append("rect")
    	    .attr("id", "tnt_" + div_id + "_5pcap")
    	    .attr("x", 0)
    	    .attr("y", 0)
    	    .attr("width", 0)
    	    .attr("height", height)
    	    .attr("fill", "red");
    	caps.right = svg_g
    	    .append("rect")
    	    .attr("id", "tnt_" + div_id + "_3pcap")
    	    .attr("x", width-cap_width)
    	    .attr("y", 0)
    	    .attr("width", 0)
    	    .attr("height", height)
    	    .attr("fill", "red");

    	// The Zooming/Panning Pane
    	pane = svg_g
    	    .append("rect")
    	    .attr("class", "tnt_pane")
    	    .attr("id", "tnt_" + div_id + "_pane")
    	    .attr("width", width)
    	    .attr("height", height)
    	    .style("fill", bgColor);

    	// ** TODO: Wouldn't be better to have these messages by track?
    	// var tooWide_text = svg_g
    	//     .append("text")
    	//     .attr("class", "tnt_wideOK_text")
    	//     .attr("id", "tnt_" + div_id + "_tooWide")
    	//     .attr("fill", bgColor)
    	//     .text("Region too wide");

    	// TODO: I don't know if this is the best way (and portable) way
    	// of centering the text in the text area
    	// var bb = tooWide_text[0][0].getBBox();
    	// tooWide_text
    	//     .attr("x", ~~(width/2 - bb.width/2))
    	//     .attr("y", ~~(height/2 - bb.height/2));
    };

    // API
    var api = apijs (track_vis)
    	.getset (exports)
    	.getset (limits)
    	.getset (loc);

    api.transform (track_vis.extend_canvas, function (val) {
    	var prev_val = track_vis.extend_canvas();
    	val.left = val.left || prev_val.left;
    	val.right = val.right || prev_val.right;
    	return val;
    });

    // track_vis always starts on loc.from & loc.to
    api.method ('start', function () {
        // make sure that zoom_out is within the min-max range
        if ((limits.max - limits.min) < limits.zoom_out) {
            limits.zoom_out = limits.max - limits.min;
        }

        plot();

        // Reset the tracks
        for (var i=0; i<tracks.length; i++) {
            if (tracks[i].g) {
                //    tracks[i].display().reset.call(tracks[i]);
                tracks[i].g.remove();
            }
            _init_track(tracks[i]);
        }
        _place_tracks();

        // The continuation callback
        var cont = function () {

            if ((loc.to - loc.from) < limits.zoom_in) {
                if ((loc.from + limits.zoom_in) > limits.max) {
                    loc.to = limits.max;
                } else {
                    loc.to = loc.from + limits.zoom_in;
                }
            }

            for (var i=0; i<tracks.length; i++) {
                _update_track(tracks[i], loc);
            }
        };

        cont();
    });

    api.method ('update', function () {
    	for (var i=0; i<tracks.length; i++) {
    	    _update_track (tracks[i]);
    	}
    });

    var _update_track = function (track, where) {
    	if (track.data()) {
    	    var track_data = track.data();
            var data_updater = track_data;

    	    data_updater.call(track, {
                'loc' : where,
                'on_success' : function () {
                    track.display().update.call(track, where);
                }
    	    });
    	}
    };

    var plot = function() {
    	xScale = d3.scale.linear()
    	    .domain([loc.from, loc.to])
    	    .range([0, width]);

    	if (drag_allowed) {
    	    svg_g.call( zoomEventHandler
    		       .x(xScale)
    		       .scaleExtent([(loc.to-loc.from)/(limits.zoom_out-1), (loc.to-loc.from)/limits.zoom_in])
    		       .on("zoom", _move)
    		     );
    	}
    };

    var _reorder = function (new_tracks) {
        // TODO: This is defining a new height, but the global height is used to define the size of several
        // parts. We should do this dynamically

        var found_indexes = [];
        for (var j=0; j<new_tracks.length; j++) {
            var found = false;
            for (var i=0; i<tracks.length; i++) {
                if (tracks[i].id() === new_tracks[j].id()) {
                    found = true;
                    found_indexes[i] = true;
                    // tracks.splice(i,1);
                    break;
                }
            }
            if (!found) {
                _init_track(new_tracks[j]);
                _update_track(new_tracks[j], {from : loc.from, to : loc.to});
            }
        }

        for (var x=0; x<tracks.length; x++) {
            if (!found_indexes[x]) {
                tracks[x].g.remove();
            }
        }

        tracks = new_tracks;
        _place_tracks();
    };

    // right/left/zoom pans or zooms the track. These methods are exposed to allow external buttons, etc to interact with the tracks. The argument is the amount of panning/zooming (ie. 1.2 means 20% panning) With left/right only positive numbers are allowed.
    api.method ('scroll', function (factor) {
        var amount = Math.abs(factor);
    	if (factor > 0) {
    	    _manual_move(amount, 1);
    	} else if (factor < 0){
            _manual_move(amount, -1);
        }
    });

    api.method ('zoom', function (factor) {
        _manual_move(1/factor, 0);
    });

    api.method ('find_track', function (id) {
        for (var i=0; i<tracks.length; i++) {
            if (tracks[i].id() === id) {
                return tracks[i];
            }
        }
    });

    api.method ('remove_track', function (track) {
        track.g.remove();
    });

    api.method ('add_track', function (track) {
        if (track instanceof Array) {
            for (var i=0; i<track.length; i++) {
                track_vis.add_track (track[i]);
            }
            return track_vis;
        }
        tracks.push(track);
        return track_vis;
    });

    api.method('tracks', function (ts) {
        if (!arguments.length) {
            return tracks;
        }
        _reorder(ts);
        return this;
    });

    //
    api.method ('width', function (w) {
    	// TODO: Allow suffixes like "1000px"?
    	// TODO: Test wrong formats
    	if (!arguments.length) {
    	    return width;
    	}
    	// At least min-width
    	if (w < min_width) {
    	    w = min_width;
    	}

    	// We are resizing
    	if (div_id !== undefined) {
    	    d3.select("#tnt_" + div_id).select("svg").attr("width", w);
    	    // Resize the zooming/panning pane
    	    d3.select("#tnt_" + div_id).style("width", (parseInt(w) + cap_width*2) + "px");
    	    d3.select("#tnt_" + div_id + "_pane").attr("width", w);
            caps.right
                .attr("x", w-cap_width);

    	    // Replot
    	    width = w;
            xScale.range([0, width]);

    	    plot();
    	    for (var i=0; i<tracks.length; i++) {
        		tracks[i].g.select("rect").attr("width", w);
                tracks[i].display().scale(xScale);
        		tracks[i].display().reset.call(tracks[i]);
                tracks[i].display().init.call(tracks[i], w);
        		tracks[i].display().update.call(tracks[i], loc);
    	    }
    	} else {
    	    width = w;
    	}
        return track_vis;
    });

    api.method('allow_drag', function(b) {
        if (!arguments.length) {
            return drag_allowed;
        }
        drag_allowed = b;
        if (drag_allowed) {
            // When this method is called on the object before starting the simulation, we don't have defined xScale
            if (xScale !== undefined) {
                svg_g.call( zoomEventHandler.x(xScale)
                    // .xExtent([0, limits.right])
                    .scaleExtent([(loc.to-loc.from)/(limits.zoom_out-1), (loc.to-loc.from)/limits.zoom_in])
                    .on("zoom", _move) );
            }
        } else {
            // We create a new dummy scale in x to avoid dragging the previous one
            // TODO: There may be a cheaper way of doing this?
            zoomEventHandler.x(d3.scale.linear()).on("zoom", null);
        }
        return track_vis;
    });

    var _place_tracks = function () {
        var h = 0;
        for (var i=0; i<tracks.length; i++) {
            var track = tracks[i];
            if (track.g.attr("transform")) {
                track.g
                    .transition()
                    .duration(dur)
                    .attr("transform", "translate(" + exports.extend_canvas.left + "," + h + ")");
            } else {
                track.g
                    .attr("transform", "translate(" + exports.extend_canvas.left + "," + h + ")");
            }

            h += track.height();
        }

        // svg
        svg.attr("height", h + height_offset);

        // div
        d3.select("#tnt_" + div_id)
            .style("height", (h + 10 + height_offset) + "px");

        // caps
        d3.select("#tnt_" + div_id + "_5pcap")
            .attr("height", h)
            .each(function (d) {
                move_to_front(this);
            });

        d3.select("#tnt_" + div_id + "_3pcap")
            .attr("height", h)
            .each (function (d) {
                move_to_front(this);
            });

        // pane
        pane
            .attr("height", h + height_offset);

        return track_vis;
    };

    var _init_track = function (track) {
        track.g = svg.select("g").select("g")
    	    .append("g")
    	    .attr("class", "tnt_track")
    	    .attr("height", track.height());

    	// Rect for the background color
    	track.g
    	    .append("rect")
    	    .attr("x", 0)
    	    .attr("y", 0)
    	    .attr("width", track_vis.width())
    	    .attr("height", track.height())
    	    .style("fill", track.color())
    	    .style("pointer-events", "none");

    	if (track.display()) {
    	    track.display()
                .scale(xScale)
                .init.call(track, width);
    	}

    	return track_vis;
    };

    var _manual_move = function (factor, direction) {
        var oldDomain = xScale.domain();

    	var span = oldDomain[1] - oldDomain[0];
    	var offset = (span * factor) - span;

    	var newDomain;
    	switch (direction) {
            case 1 :
            newDomain = [(~~oldDomain[0] - offset), ~~(oldDomain[1] - offset)];
    	    break;
        	case -1 :
        	    newDomain = [(~~oldDomain[0] + offset), ~~(oldDomain[1] - offset)];
        	    break;
        	case 0 :
        	    newDomain = [oldDomain[0] - ~~(offset/2), oldDomain[1] + (~~offset/2)];
    	}

    	var interpolator = d3.interpolateNumber(oldDomain[0], newDomain[0]);
    	var ease = exports.ease;

    	var x = 0;
    	d3.timer(function() {
    	    var curr_start = interpolator(ease(x));
    	    var curr_end;
    	    switch (direction) {
        	    case -1 :
        		curr_end = curr_start + span;
        		break;
        	    case 1 :
        		curr_end = curr_start + span;
        		break;
        	    case 0 :
        		curr_end = oldDomain[1] + oldDomain[0] - curr_start;
        		break;
    	    }

    	    var currDomain = [curr_start, curr_end];
    	    xScale.domain(currDomain);
    	    _move(xScale);
    	    x+=0.02;
    	    return x>1;
    	});
    };


    var _move_cbak = function () {
        var currDomain = xScale.domain();
    	track_vis.from(~~currDomain[0]);
    	track_vis.to(~~currDomain[1]);

    	for (var i = 0; i < tracks.length; i++) {
    	    var track = tracks[i];
    	    _update_track(track, loc);
    	}
    };
    // The deferred_cbak is deferred at least this amount of time or re-scheduled if deferred is called before
    var _deferred = deferCancel(_move_cbak, 300);

    // api.method('update', function () {
    // 	_move();
    // });

    var _move = function (new_xScale) {
    	if (new_xScale !== undefined && drag_allowed) {
    	    zoomEventHandler.x(new_xScale);
    	}

    	// Show the red bars at the limits
    	var domain = xScale.domain();
    	if (domain[0] <= (limits.min + 5)) {
    	    d3.select("#tnt_" + div_id + "_5pcap")
    		.attr("width", cap_width)
    		.transition()
    		.duration(200)
    		.attr("width", 0);
    	}

    	if (domain[1] >= (limits.max)-5) {
    	    d3.select("#tnt_" + div_id + "_3pcap")
    		.attr("width", cap_width)
    		.transition()
    		.duration(200)
    		.attr("width", 0);
    	}


    	// Avoid moving past the limits
    	if (domain[0] < limits.min) {
    	    zoomEventHandler.translate([zoomEventHandler.translate()[0] - xScale(limits.min) + xScale.range()[0], zoomEventHandler.translate()[1]]);
    	} else if (domain[1] > limits.max) {
    	    zoomEventHandler.translate([zoomEventHandler.translate()[0] - xScale(limits.max) + xScale.range()[1], zoomEventHandler.translate()[1]]);
    	}

    	_deferred();

    	for (var i = 0; i < tracks.length; i++) {
    	    var track = tracks[i];
    	    track.display().mover.call(track);
    	}
    };

    // api.method({
    // 	allow_drag : api_allow_drag,
    // 	width      : api_width,
    // 	add_track  : api_add_track,
    // 	reorder    : api_reorder,
    // 	zoom       : api_zoom,
    // 	left       : api_left,
    // 	right      : api_right,
    // 	start      : api_start
    // });

    // Auxiliar functions
    function move_to_front (elem) {
        elem.parentNode.appendChild(elem);
    }

    return track_vis;
};

module.exports = exports = board;

},{"tnt.api":18,"tnt.utils":33}],22:[function(require,module,exports){
var apijs = require ("tnt.api");
var spinner = require ("./spinner.js")();

tnt_data = {};

tnt_data.sync = function() {
    var update_track = function(obj) {
        var track = this;
        track.data().elements(update_track.retriever().call(track, obj.loc));
        obj.on_success();
    };

    apijs (update_track)
        .getset ('elements', [])
        .getset ('retriever', function () {});

    return update_track;
};

tnt_data.async = function () {
    var update_track = function (obj) {
        var track = this;
        spinner.on.call(track);
        update_track.retriever().call(track, obj.loc)
            .then (function (resp) {
                track.data().elements(resp);
                obj.on_success();
                spinner.off.call(track);
            });
    };

    var api = apijs (update_track)
        .getset ('elements', [])
        .getset ('retriever');

    return update_track;
};


// A predefined track displaying no external data
// it is used for location and axis tracks for example
tnt_data.empty = function () {
    var updater = tnt_data.sync();

    return updater;
};

module.exports = exports = tnt_data;

},{"./spinner.js":26,"tnt.api":18}],23:[function(require,module,exports){
var apijs = require ("tnt.api");
var layout = require("./layout.js");

// FEATURE VIS
// var board = {};
// board.track = {};
var tnt_feature = function () {
    var dispatch = d3.dispatch ("click", "dblclick", "mouseover", "mouseout");

    ////// Vars exposed in the API
    var config = {
        create   : function () {throw "create_elem is not defined in the base feature object";},
        move    : function () {throw "move_elem is not defined in the base feature object";},
        distribute  : function () {},
        fixed   : function () {},
        //layout   : function () {},
        index    : undefined,
        layout   : layout.identity(),
        color : '#000',
        scale : undefined
    };


    // The returned object
    var feature = {};

    var reset = function () {
    	var track = this;
    	track.g.selectAll(".tnt_elem").remove();
        track.g.selectAll(".tnt_guider").remove();
        track.g.selectAll(".tnt_fixed").remove();
    };

    var init = function (width) {
        var track = this;

        track.g
            .append ("text")
            .attr ("class", "tnt_fixed")
            .attr ("x", 5)
            .attr ("y", 12)
            .attr ("font-size", 11)
            .attr ("fill", "grey")
            .text (track.label());

        config.fixed.call(track, width);
    };

    var plot = function (new_elems, track, xScale) {
        new_elems.on("click", function (d, i) {
            if (d3.event.defaultPrevented) {
                return;
            }
            dispatch.click.call(this, d, i);
        });
        new_elems.on("mouseover", function (d, i) {
            if (d3.event.defaultPrevented) {
                return;
            }
            dispatch.mouseover.call(this, d, i);
        });
        new_elems.on("dblclick", function (d, i) {
            if (d3.event.defaultPrevented) {
                return;
            }
            dispatch.dblclick.call(this, d, i);
        });
        new_elems.on("mouseout", function (d, i) {
            if (d3.event.defaultPrevented) {
                return;
            }
            dispatch.mouseout.call(this, d, i);
        });
        // new_elem is a g element the feature is inserted
        config.create.call(track, new_elems, xScale);
    };

    var update = function (loc, field) {
        var track = this;
        var svg_g = track.g;

        var elements = track.data().elements();

        if (field !== undefined) {
            elements = elements[field];
        }

        var data_elems = config.layout.call(track, elements);


        if (data_elems === undefined) {
            return;
        }

        var vis_sel;
        var vis_elems;
        if (field !== undefined) {
            vis_sel = svg_g.selectAll(".tnt_elem_" + field);
        } else {
            vis_sel = svg_g.selectAll(".tnt_elem");
        }

        if (config.index) { // Indexing by field
            vis_elems = vis_sel
                .data(data_elems, function (d) {
                    if (d !== undefined) {
                        return config.index(d);
                    }
                });
        } else { // Indexing by position in array
            vis_elems = vis_sel
                .data(data_elems);
        }

        config.distribute.call(track, vis_elems, config.scale);

    	var new_elem = vis_elems
    	    .enter();

    	new_elem
    	    .append("g")
    	    .attr("class", "tnt_elem")
    	    .classed("tnt_elem_" + field, field)
    	    .call(feature.plot, track, config.scale);

    	vis_elems
    	    .exit()
    	    .remove();
    };

    var mover = function (field) {
    	var track = this;
    	var svg_g = track.g;
    	var elems;
    	// TODO: Is selecting the elements to move too slow?
    	// It would be nice to profile
    	if (field !== undefined) {
    	    elems = svg_g.selectAll(".tnt_elem_" + field);
    	} else {
    	    elems = svg_g.selectAll(".tnt_elem");
    	}

    	config.move.call(this, elems);
    };

    var mtf = function (elem) {
        elem.parentNode.appendChild(elem);
    };

    var move_to_front = function (field) {
        if (field !== undefined) {
            var track = this;
            var svg_g = track.g;
            svg_g.selectAll(".tnt_elem_" + field)
                .each( function () {
                    mtf(this);
                });
        }
    };

    // API
    apijs (feature)
    	.getset (config)
    	.method ({
    	    reset  : reset,
    	    plot   : plot,
    	    update : update,
    	    mover   : mover,
    	    init   : init,
    	    move_to_front : move_to_front
    	});

    return d3.rebind(feature, dispatch, "on");
};

tnt_feature.composite = function () {
    var displays = {};
    var display_order = [];

    var features = {};

    var reset = function () {
    	var track = this;
        for (var display in displays) {
            if (displays.hasOwnProperty(display)) {
                displays[display].reset.call(track);
            }
        }
    };

    var init = function (width) {
        var track = this;
        for (var display in displays) {
            if (displays.hasOwnProperty(display)) {
                displays[display].scale(features.scale());
                displays[display].init.call(track, width);
            }
        }
    };

    var update = function () {
    	var track = this;
    	for (var i=0; i<display_order.length; i++) {
    	    displays[display_order[i]].update.call(track, undefined, display_order[i]);
    	    displays[display_order[i]].move_to_front.call(track, display_order[i]);
    	}
        // for (var display in displays) {
        //     if (displays.hasOwnProperty(display)) {
        //         displays[display].update.call(track, xScale, display);
        //     }
        // }
    };

    var mover = function () {
        var track = this;
        for (var display in displays) {
            if (displays.hasOwnProperty(display)) {
                displays[display].mover.call(track, display);
            }
        }
    };

    var add = function (key, display) {
    	displays[key] = display;
    	display_order.push(key);
    	return features;
    };

    var get_displays = function () {
    	var ds = [];
    	for (var i=0; i<display_order.length; i++) {
    	    ds.push(displays[display_order[i]]);
    	}
    	return ds;
    };

    // API
    apijs (features)
        .getset("scale")
    	.method ({
    	    reset  : reset,
    	    update : update,
    	    mover   : mover,
    	    init   : init,
    	    add    : add,
    	    displays : get_displays
    	});

    return features;
};

tnt_feature.area = function () {
    var feature = tnt_feature.line();
    var line = feature.line();

    var area = d3.svg.area()
    	.interpolate(line.interpolate())
    	.tension(feature.tension());

    var data_points;

    var line_create = feature.create(); // We 'save' line creation

    feature.create (function (points) {
    	var track = this;
        var xScale = feature.scale();

    	if (data_points !== undefined) {
    	    track.g.select("path").remove();
    	}

    	line_create.call(track, points, xScale);

    	area
    	    .x(line.x())
    	    .y1(line.y())
    	    .y0(track.height());

    	data_points = points.data();
    	points.remove();

    	track.g
    	    .append("path")
    	    .attr("class", "tnt_area")
    	    .classed("tnt_elem", true)
    	    .datum(data_points)
    	    .attr("d", area)
    	    .attr("fill", d3.rgb(feature.color()).brighter());
    });

    var line_move = feature.move();
    feature.move (function (path) {
    	var track = this;
        var xScale = feature.scale();
    	line_move.call(track, path, xScale);

    	area.x(line.x());
    	track.g
    	    .select(".tnt_area")
    	    .datum(data_points)
    	    .attr("d", area);
    });

    return feature;

};

tnt_feature.line = function () {
    var feature = tnt_feature();

    var x = function (d) {
        return d.pos;
    };
    var y = function (d) {
        return d.val;
    };
    var tension = 0.7;
    var yScale = d3.scale.linear();
    var line = d3.svg.line()
        .interpolate("basis");

    // line getter. TODO: Setter?
    feature.line = function () {
        return line;
    };

    feature.x = function (cbak) {
    	if (!arguments.length) {
    	    return x;
    	}
    	x = cbak;
    	return feature;
    };

    feature.y = function (cbak) {
    	if (!arguments.length) {
    	    return y;
    	}
    	y = cbak;
    	return feature;
    };

    feature.tension = function (t) {
    	if (!arguments.length) {
    	    return tension;
    	}
    	tension = t;
    	return feature;
    };

    var data_points;

    // For now, create is a one-off event
    // TODO: Make it work with partial paths, ie. creating and displaying only the path that is being displayed
    feature.create (function (points) {
    	var track = this;
        var xScale = feature.scale();

    	if (data_points !== undefined) {
    	    // return;
    	    track.g.select("path").remove();
    	}

    	line
    	    .tension(tension)
    	    .x(function (d) {
                return xScale(x(d));
    	    })
    	    .y(function (d) {
                return track.height() - yScale(y(d));
    	    });

    	data_points = points.data();
    	points.remove();

    	yScale
    	    .domain([0, 1])
    	    // .domain([0, d3.max(data_points, function (d) {
    	    // 	return y(d);
    	    // })])
    	    .range([0, track.height() - 2]);

    	track.g
    	    .append("path")
    	    .attr("class", "tnt_elem")
    	    .attr("d", line(data_points))
    	    .style("stroke", feature.color())
    	    .style("stroke-width", 4)
    	    .style("fill", "none");
    });

    feature.move (function (path) {
    	var track = this;
        var xScale = feature.scale();

    	line.x(function (d) {
    	    return xScale(x(d));
    	});
    	track.g.select("path")
    	    .attr("d", line(data_points));
    });

    return feature;
};

tnt_feature.conservation = function () {
        // 'Inherit' from feature.area
        var feature = tnt_feature.area();

        var area_create = feature.create(); // We 'save' area creation
        feature.create  (function (points) {
        	var track = this;
            var xScale = feature.scale();
        	area_create.call(track, d3.select(points[0][0]), xScale);
        });

    return feature;
};

tnt_feature.ensembl = function () {
    // 'Inherit' from board.track.feature
    var feature = tnt_feature();

    var color2 = "#7FFF00";
    var color3 = "#00BB00";

    feature.fixed (function (width) {
    	var track = this;
    	var height_offset = ~~(track.height() - (track.height()  * 0.8)) / 2;

    	track.g
    	    .append("line")
    	    .attr("class", "tnt_guider tnt_fixed")
    	    .attr("x1", 0)
    	    .attr("x2", width)
    	    .attr("y1", height_offset)
    	    .attr("y2", height_offset)
    	    .style("stroke", feature.color())
    	    .style("stroke-width", 1);

    	track.g
    	    .append("line")
    	    .attr("class", "tnt_guider tnt_fixed")
    	    .attr("x1", 0)
    	    .attr("x2", width)
    	    .attr("y1", track.height() - height_offset)
    	    .attr("y2", track.height() - height_offset)
    	    .style("stroke", feature.color())
    	    .style("stroke-width", 1);

    });

    feature.create (function (new_elems) {
    	var track = this;
        var xScale = feature.scale();

    	var height_offset = ~~(track.height() - (track.height()  * 0.8)) / 2;

    	new_elems
    	    .append("rect")
    	    .attr("x", function (d) {
                return xScale (d.start);
    	    })
    	    .attr("y", height_offset)
    // 	    .attr("rx", 3)
    // 	    .attr("ry", 3)
    	    .attr("width", function (d) {
                return (xScale(d.end) - xScale(d.start));
    	    })
    	    .attr("height", track.height() - ~~(height_offset * 2))
    	    .attr("fill", track.color())
    	    .transition()
    	    .duration(500)
    	    .attr("fill", function (d) {
        		if (d.type === 'high') {
        		    return d3.rgb(feature.color());
        		}
        		if (d.type === 'low') {
        		    return d3.rgb(feature.color2());
        		}
        		return d3.rgb(feature.color3());
    	    });
    });

    feature.distribute (function (blocks) {
        var xScale = feature.scale();
    	blocks
    	    .select("rect")
    	    .attr("width", function (d) {
                return (xScale(d.end) - xScale(d.start));
    	    });
    });

    feature.move (function (blocks) {
        var xScale = feature.scale();
    	blocks
    	    .select("rect")
    	    .attr("x", function (d) {
                return xScale(d.start);
    	    })
    	    .attr("width", function (d) {
                return (xScale(d.end) - xScale(d.start));
    	    });
    });

    feature.color2 = function (col) {
    	if (!arguments.length) {
    	    return color2;
    	}
    	color2 = col;
    	return feature;
    };

    feature.color3 = function (col) {
    	if (!arguments.length) {
    	    return color3;
    	}
    	color3 = col;
    	return feature;
    };

    return feature;
};

tnt_feature.vline = function () {
    // 'Inherit' from feature
    var feature = tnt_feature();

    feature.create (function (new_elems) {
        var xScale = feature.scale();
    	var track = this;
    	new_elems
    	    .append ("line")
    	    .attr("x1", function (d) {
                return xScale(feature.index()(d));
    	    })
    	    .attr("x2", function (d) {
                return xScale(feature.index()(d));
    	    })
    	    .attr("y1", 0)
    	    .attr("y2", track.height())
    	    .attr("stroke", feature.color())
    	    .attr("stroke-width", 1);
    });

    feature.move (function (vlines) {
        var xScale = feature.scale();
    	vlines
    	    .select("line")
    	    .attr("x1", function (d) {
                return xScale(feature.index()(d));
    	    })
    	    .attr("x2", function (d) {
                return xScale(feature.index()(d));
    	    });
    });

    return feature;

};

tnt_feature.pin = function () {
    // 'Inherit' from board.track.feature
    var feature = tnt_feature();

    var yScale = d3.scale.linear()
    	.domain([0,0])
    	.range([0,0]);

    var opts = {
        pos : d3.functor("pos"),
        val : d3.functor("val"),
        domain : [0,0]
    };

    var pin_ball_r = 5; // the radius of the circle in the pin

    apijs(feature)
        .getset(opts);


    feature.create (function (new_pins) {
    	var track = this;
        var xScale = feature.scale();
    	yScale
    	    .domain(feature.domain())
    	    .range([pin_ball_r, track.height()-pin_ball_r-10]); // 10 for labelling

    	// pins are composed of lines, circles and labels
    	new_pins
    	    .append("line")
    	    .attr("x1", function (d, i) {
    	    	return xScale(d[opts.pos(d, i)]);
    	    })
    	    .attr("y1", function (d) {
                return track.height();
    	    })
    	    .attr("x2", function (d,i) {
    	    	return xScale(d[opts.pos(d, i)]);
    	    })
    	    .attr("y2", function (d, i) {
    	    	return track.height() - yScale(d[opts.val(d, i)]);
    	    })
    	    .attr("stroke", function (d) {
                return d3.functor(feature.color())(d);
            });

    	new_pins
    	    .append("circle")
    	    .attr("cx", function (d, i) {
                return xScale(d[opts.pos(d, i)]);
    	    })
    	    .attr("cy", function (d, i) {
                return track.height() - yScale(d[opts.val(d, i)]);
    	    })
    	    .attr("r", pin_ball_r)
    	    .attr("fill", function (d) {
                return d3.functor(feature.color())(d);
            });

        new_pins
            .append("text")
            .attr("font-size", "13")
            .attr("x", function (d, i) {
                return xScale(d[opts.pos(d, i)]);
            })
            .attr("y", function (d, i) {
                return 10;
            })
            .style("text-anchor", "middle")
            .style("fill", function (d) {
                return d3.functor(feature.color())(d);
            })
            .text(function (d) {
                return d.label || "";
            });

    });

    feature.distribute (function (pins) {
        pins
            .select("text")
            .text(function (d) {
                return d.label || "";
            });
    });

    feature.move(function (pins) {
    	var track = this;
        var xScale = feature.scale();

    	pins
    	    //.each(position_pin_line)
    	    .select("line")
    	    .attr("x1", function (d, i) {
                return xScale(d[opts.pos(d, i)]);
    	    })
    	    .attr("y1", function (d) {
        		return track.height();
    	    })
    	    .attr("x2", function (d,i) {
        		return xScale(d[opts.pos(d, i)]);
    	    })
    	    .attr("y2", function (d, i) {
        		return track.height() - yScale(d[opts.val(d, i)]);
    	    });

    	pins
    	    .select("circle")
    	    .attr("cx", function (d, i) {
                return xScale(d[opts.pos(d, i)]);
    	    })
    	    .attr("cy", function (d, i) {
                return track.height() - yScale(d[opts.val(d, i)]);
    	    });

        pins
            .select("text")
            .attr("x", function (d, i) {
                return xScale(d[opts.pos(d, i)]);
            })
            .text(function (d) {
                return d.label || "";
            });

    });

    feature.fixed (function (width) {
        var track = this;
        track.g
            .append("line")
            .attr("class", "tnt_fixed")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", track.height())
            .attr("y2", track.height())
            .style("stroke", "black")
            .style("stroke-with", "1px");
    });

    return feature;
};

tnt_feature.block = function () {
    // 'Inherit' from board.track.feature
    var feature = tnt_feature();

    apijs(feature)
    	.getset('from', function (d) {
    	    return d.start;
    	})
    	.getset('to', function (d) {
    	    return d.end;
    	});

    feature.create(function (new_elems) {
    	var track = this;
        var xScale = feature.scale();
    	new_elems
    	    .append("rect")
    	    .attr("x", function (d, i) {
        		// TODO: start, end should be adjustable via the tracks API
        		return xScale(feature.from()(d, i));
    	    })
    	    .attr("y", 0)
    	    .attr("width", function (d, i) {
        		return (xScale(feature.to()(d, i)) - xScale(feature.from()(d, i)));
    	    })
    	    .attr("height", track.height())
    	    .attr("fill", track.color())
    	    .transition()
    	    .duration(500)
    	    .attr("fill", function (d) {
        		if (d.color === undefined) {
        		    return feature.color();
        		} else {
        		    return d.color;
        		}
    	    });
    });

    feature.distribute(function (elems) {
        var xScale = feature.scale();
    	elems
    	    .select("rect")
    	    .attr("width", function (d) {
        		return (xScale(d.end) - xScale(d.start));
    	    });
    });

    feature.move(function (blocks) {
        var xScale = feature.scale();
    	blocks
    	    .select("rect")
    	    .attr("x", function (d) {
        		return xScale(d.start);
    	    })
    	    .attr("width", function (d) {
        		return (xScale(d.end) - xScale(d.start));
    	    });
    });

    return feature;

};

tnt_feature.axis = function () {
    var xAxis;
    var orientation = "top";
    var xScale;

    // Axis doesn't inherit from feature
    var feature = {};
    feature.reset = function () {
    	xAxis = undefined;
    	var track = this;
    	track.g.selectAll(".tick").remove();
    };
    feature.plot = function () {};
    feature.mover = function () {
    	var track = this;
    	var svg_g = track.g;
    	svg_g.call(xAxis);
    };

    feature.init = function () {
        xAxis = undefined;
    };

    feature.update = function () {
    	// Create Axis if it doesn't exist
        if (xAxis === undefined) {
            xAxis = d3.svg.axis()
                .scale(xScale)
                .orient(orientation);
        }

    	var track = this;
    	var svg_g = track.g;
    	svg_g.call(xAxis);
    };

    feature.orientation = function (pos) {
    	if (!arguments.length) {
    	    return orientation;
    	}
    	orientation = pos;
    	return this;
    };

    feature.scale = function (s) {
        if (!arguments.length) {
            return xScale;
        }
        xScale = s;
        return this;
    };

    return feature;
};

tnt_feature.location = function () {
    var row;
    var xScale;

    var feature = {};
    feature.reset = function () {
        row = undefined;
    };
    feature.plot = function () {};
    feature.init = function () {
        row = undefined;
        var track = this;
        track.g.select("text").remove();
    };
    feature.mover = function() {
    	var domain = xScale.domain();
    	row.select("text")
    	    .text("Location: " + ~~domain[0] + "-" + ~~domain[1]);
    };

    feature.scale = function (sc) {
        if (!arguments.length) {
            return xScale;
        }
        xScale = sc;
        return this;
    };

    feature.update = function (loc) {
    	var track = this;
    	var svg_g = track.g;
    	var domain = xScale.domain();
    	if (row === undefined) {
    	    row = svg_g;
    	    row
        		.append("text")
        		.text("Location: " + Math.round(domain[0]) + "-" + Math.round(domain[1]));
    	}
    };

    return feature;
};

module.exports = exports = tnt_feature;

},{"./layout.js":25,"tnt.api":18}],24:[function(require,module,exports){
var board = require ("./board.js");
board.track = require ("./track");
board.track.data = require ("./data.js");
board.track.layout = require ("./layout.js");
board.track.feature = require ("./feature.js");
board.track.layout = require ("./layout.js");

module.exports = exports = board;

},{"./board.js":21,"./data.js":22,"./feature.js":23,"./layout.js":25,"./track":27}],25:[function(require,module,exports){
var apijs = require ("tnt.api");

// var board = {};
// board.track = {};
var layout = function () {

    // The returned closure / object
    var l = function (new_elems)  {
        var track = this;
        l.elements().call(track, new_elems);
        return new_elems;
    };

    var api = apijs(l)
        .getset ('elements', function () {});

    return l;
};

layout.identity = function () {
    return layout()
        .elements (function (e) {
            return e;
        });
};

module.exports = exports = layout;

},{"tnt.api":18}],26:[function(require,module,exports){
var spinner = function () {
    // var n = 0;
    var sp_elem;
    var sp = {};

    sp.on = function () {
        var track = this;
        if (!track.spinner) {
            track.spinner = 1;
        } else {
            track.spinner++;
        }
        if (track.spinner==1) {
            var container = track.g;
            var bgColor = track.color();
            sp_elem = container
                .append("svg")
                .attr("class", "tnt_spinner")
                .attr("width", "30px")
                .attr("height", "30px")
                .attr("xmls", "http://www.w3.org/2000/svg")
                .attr("viewBox", "0 0 100 100")
                .attr("preserveAspectRatio", "xMidYMid");


            sp_elem
                .append("rect")
                .attr("x", '0')
                .attr("y", '0')
                .attr("width", "100")
                .attr("height", "100")
                .attr("rx", '50')
                .attr("ry", '50')
                .attr("fill", bgColor);
                //.attr("opacity", 0.6);

            for (var i=0; i<12; i++) {
                tick(sp_elem, i, bgColor);
            }

        } else if (track.spinner>0){
            // Move the spinner to front
            var node = sp_elem.node();
            if (node.parentNode) {
                node.parentNode.appendChild(node);
            }
        }
    };

    sp.off = function () {
        var track = this;
        track.spinner--;
        if (!track.spinner) {
            var container = track.g;
            container.selectAll(".tnt_spinner")
                .remove();

        }
    };

    function tick (elem, i, bgColor) {
        elem
            .append("rect")
            .attr("x", "46.5")
            .attr("y", '40')
            .attr("width", "7")
            .attr("height", "20")
            .attr("rx", "5")
            .attr("ry", "5")
            .attr("fill", d3.rgb(bgColor).darker(2))
            .attr("transform", "rotate(" + (360/12)*i + " 50 50) translate(0 -30)")
            .append("animate")
            .attr("attributeName", "opacity")
            .attr("from", "1")
            .attr("to", "0")
            .attr("dur", "1s")
            .attr("begin", (1/12)*i + "s")
            .attr("repeatCount", "indefinite");

    }

    return sp;
};
module.exports = exports = spinner;

},{}],27:[function(require,module,exports){
var apijs = require ("tnt.api");
var iterator = require("tnt.utils").iterator;


var track = function () {
    "use strict";

    var display;

    var conf = {
    	color : d3.rgb('#CCCCCC'),
    	height           : 250,
    	// data is the object (normally a tnt.track.data object) used to retrieve and update data for the track
    	data             : track.data.empty(),
        // display          : undefined,
        label            : "",
        id               : track.id()
    };

    // The returned object / closure
    var t = {};

    // API
    var api = apijs (t)
    	.getset (conf);

    // TODO: This means that height should be defined before display
    // we shouldn't rely on this
    t.display = function (new_plotter) {
        if (!arguments.length) {
            return display;
        }

        display = new_plotter;
        if (typeof (display) === 'function') {
            display.layout && display.layout().height(conf.height);
        } else {
            for (var key in display) {
                if (display.hasOwnProperty(key)) {
                    display[key].layout && display[key].layout().height(conf.height);
                }
            }
        }

        return this;
    };

    return t;
};

track.id = iterator(1);

module.exports = exports = track;

},{"tnt.api":18,"tnt.utils":33}],28:[function(require,module,exports){
module.exports = tnt_rest = require("./src/rest.js");

},{"./src/rest.js":31}],29:[function(require,module,exports){
module.exports=require(18)
},{"./src/api.js":30}],30:[function(require,module,exports){
module.exports=require(19)
},{}],31:[function(require,module,exports){
var http = require("httpplease");
var apijs = require("tnt.api");
var promises = require('httpplease-promises');
var Promise = require('es6-promise').Promise;
var json = require("httpplease/plugins/json");
http = http.use(json).use(promises(Promise));

//var url = require("./url.js");

tnt_rest = function () {
    var config = {
        prefix: "",
        protocol: "http",
        domain: "",
        port: ""
    };
    var rest = {};
    rest.url = require("./url.js");

    var api = apijs (rest)
        .getset(config);

    api.method ('call', function (url, data) {
        var myurl;
        if (typeof(url) === "string") {
            myurl = url;
        } else { // It is a tnt.rest.url
            url
                ._prefix(config.prefix)
                ._protocol(config.protocol)
                ._domain(config.domain)
                ._port(config.port);

            myurl = url();
        }
        if (data) { // POST
            return http.post ({
                "url": myurl,
                "body": data
            });
        }
        return http.get ({
            "url": myurl
        });
    });

    return rest;
};

module.exports = exports = tnt_rest;

},{"./url.js":32,"es6-promise":3,"httpplease":7,"httpplease-promises":5,"httpplease/plugins/json":15,"tnt.api":29}],32:[function(require,module,exports){
var apijs = require("tnt.api");

var urlModule = function () {
    var paramPattern = /:\w+/g;

    var config = {
        _prefix: "",
        _protocol: "http",
        _domain: "",
        _port: "",
        endpoint: "",
        parameters: {},
        fragment: "",
        rest: undefined
    };

    // URL Method
    var url = function () {
        return getUrl();
    };

    var api = apijs (url)
        .getset(config);

    // Checks if the value is a string or an array
    // If array, recurse over all the available values
    function query1 (key) {
        var val = config.parameters[key];
        if (!Array.isArray(val)) {
            return val;
        }
        // It is an array
        var val1 = val.shift();
         if (val.length) {
            return val1 + "&" + key + "=" + query1(key);
        }
        return val1;
    }

    function queryString() {
        // We add 'content-type=application/json'
        if (config.parameters["content-type"] === undefined) {
            config.parameters["content-type"] = "application/json";
        }
        var qs = Object.keys(config.parameters).map(function (key) {
            return key + "=" + query1(key);
        }).join("&");
        return qs ? ("?" + qs) : qs;
    }

    //
    function getUrl() {
        var endpoint = config.endpoint;

        var substEndpoint = endpoint.replace(paramPattern, function (match) {
            match = match.substring(1, match.length);
            var param = config.parameters[match] || "";
            delete config.parameters[match];
            return param;
        });

        var url = config._prefix + (config._protocol ? (config._protocol + "://") : "") + config._domain + (config._port ? (":" + config._port) : "") + "/" + substEndpoint + queryString() + (config.fragment ? ("#" + config.fragment) : "");
        return url;
    }

    return url;
};

module.exports = exports = urlModule;

},{"tnt.api":29}],33:[function(require,module,exports){
module.exports = require("./src/index.js");

},{"./src/index.js":34}],34:[function(require,module,exports){
// require('fs').readdirSync(__dirname + '/').forEach(function(file) {
//     if (file.match(/.+\.js/g) !== null && file !== __filename) {
// 	var name = file.replace('.js', '');
// 	module.exports[name] = require('./' + file);
//     }
// });

// Same as
var utils = require("./utils.js");
utils.reduce = require("./reduce.js");
utils.png = require("./png.js");
module.exports = exports = utils;

},{"./png.js":35,"./reduce.js":36,"./utils.js":37}],35:[function(require,module,exports){
var png = function () {

    var doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';

    var scale_factor = 1;
    // var filename = 'image.png';

    // Restrict the css to apply to the following array (hrefs)
    // TODO: substitute this by an array of regexp
    var css; // If undefined, use all stylesheets
    // var inline_images_opt = true; // If true, inline images

    var img_cbak = function () {};

    var png_export = function (from_svg) {
        from_svg = from_svg.node();
        // var svg = div.querySelector('svg');

        var inline_images = function (cbak) {
            var images = d3.select(from_svg)
                .selectAll('image');

            var remaining = images[0].length;
            if (remaining === 0) {
                cbak();
            }

            images
                .each (function () {
                    var image = d3.select(this);
                    var img = new Image();
                    img.onload = function () {
                        var canvas = document.createElement('canvas');
                        var ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        var uri = canvas.toDataURL('image/png');
                        image.attr('href', uri);
                        remaining--;
                        if (remaining === 0) {
                            cbak();
                        }
                    };
                    img.src = image.attr('href');
            });
        };

        var move_children = function (src, dest) {
            var children = src.children || src.childNodes;
            while (children.length > 0) {
                var child = children[0];
                if (child.nodeType !== 1/*Node.ELEMENT_NODE*/) continue;
                dest.appendChild(child);
            }
            return dest;
        };

        var styling = function (dom) {
            var used = "";
            var sheets = document.styleSheets;
            // var sheets = [];
            for (var i=0; i<sheets.length; i++) {
                var href = sheets[i].href || "";
                if (css) {
                    var skip = true;
                    for (var c=0; c<css.length; c++) {
                        if (href.indexOf(css[c]) > -1) {
                            skip = false;
                            break;
                        }
                    }
                    if (skip) {
                        continue;
                    }
                }
                var rules = sheets[i].cssRules || [];
                for (var j = 0; j < rules.length; j++) {
                    var rule = rules[j];
                    if (typeof(rule.style) != "undefined") {
                        var elems = dom.querySelectorAll(rule.selectorText);
                        if (elems.length > 0) {
                            used += rule.selectorText + " { " + rule.style.cssText + " }\n";
                        }
                    }
                }
            }

            // Check if there are <defs> already
            var defs = dom.querySelector("defs") || document.createElement('defs');
            var s = document.createElement('style');
            s.setAttribute('type', 'text/css');
            s.innerHTML = "<![CDATA[\n" + used + "\n]]>";

            // var defs = document.createElement('defs');
            defs.appendChild(s);
            return defs;
        };

        inline_images (function () {
            // var svg = div.querySelector('svg');
            var outer = document.createElement("div");
            var clone = from_svg.cloneNode(true);
            var width = parseInt(clone.getAttribute('width'));
            var height = parseInt(clone.getAttribute('height'));

            clone.setAttribute("version", "1.1");
            clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
            clone.setAttribute("width", width * scale_factor);
            clone.setAttribute("height", height * scale_factor);
            var scaling = document.createElement("g");
            scaling.setAttribute("transform", "scale(" + scale_factor + ")");
            clone.appendChild(move_children(clone, scaling));
            outer.appendChild(clone);

            clone.insertBefore (styling(clone), clone.firstChild);

            var svg = doctype + outer.innerHTML;
            svg = svg.replace ("none", "block"); // In case the svg is not being displayed, it is ignored in FF
            var image = new Image();

            image.src = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svg)));
            image.onload = function() {
                var canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                var context = canvas.getContext('2d');
                context.drawImage(image, 0, 0);

                var src = canvas.toDataURL('image/png');
                img_cbak (src);
                // var a = document.createElement('a');
                // a.download = filename;
                // a.href = canvas.toDataURL('image/png');
                // document.body.appendChild(a);
                // a.click();
            };
        });

    };
    png_export.scale_factor = function (f) {
        if (!arguments.length) {
            return scale_factor;
        }
        scale_factor = f;
        return this;
    };

    png_export.callback = function (cbak) {
        if (!arguments.length) {
            return img_cbak;
        }
        img_cbak = cbak;
        return this;
    };

    png_export.stylesheets = function (restrictCss) {
        if (!arguments.length) {
            return css;
        }
        css = restrictCss;
        return this;
    };

    // png_export.filename = function (f) {
    // 	if (!arguments.length) {
    // 	    return filename;
    // 	}
    // 	filename = f;
    // 	return png_export;
    // };

    return png_export;
};

var download = function () {

    var filename = 'image.png';
    var max_size = {
        limit: Infinity,
        onError: function () {
            console.log("image too large");
        }
    };

    var png_export = png()
        .callback (function (src) {
            var a = document.createElement('a');
            a.download = filename;
            a.href = src;
            document.body.appendChild(a);

            if (a.href.length > max_size.limit) {
                a.parentNode.removeChild(a);
                max_size.onError();
            } else {
                a.click();
            }
            // setTimeout(function () {
            //     a.click();
            // }, 3000);
        });

    png_export.filename = function (fn) {
        if (!arguments.length) {
            return filename;
        }
        filename = fn;
        return png_export;
    };

    png_export.limit = function (l) {
        if (!arguments.length) {
            return max_size;
        }
        max_size = l;
        return this;
    };

    return png_export;
};

module.exports = exports = download;

},{}],36:[function(require,module,exports){
var reduce = function () {
    var smooth = 5;
    var value = 'val';
    var redundant = function (a, b) {
	if (a < b) {
	    return ((b-a) <= (b * 0.2));
	}
	return ((a-b) <= (a * 0.2));
    };
    var perform_reduce = function (arr) {return arr;};

    var reduce = function (arr) {
	if (!arr.length) {
	    return arr;
	}
	var smoothed = perform_smooth(arr);
	var reduced  = perform_reduce(smoothed);
	return reduced;
    };

    var median = function (v, arr) {
	arr.sort(function (a, b) {
	    return a[value] - b[value];
	});
	if (arr.length % 2) {
	    v[value] = arr[~~(arr.length / 2)][value];	    
	} else {
	    var n = ~~(arr.length / 2) - 1;
	    v[value] = (arr[n][value] + arr[n+1][value]) / 2;
	}

	return v;
    };

    var clone = function (source) {
	var target = {};
	for (var prop in source) {
	    if (source.hasOwnProperty(prop)) {
		target[prop] = source[prop];
	    }
	}
	return target;
    };

    var perform_smooth = function (arr) {
	if (smooth === 0) { // no smooth
	    return arr;
	}
	var smooth_arr = [];
	for (var i=0; i<arr.length; i++) {
	    var low = (i < smooth) ? 0 : (i - smooth);
	    var high = (i > (arr.length - smooth)) ? arr.length : (i + smooth);
	    smooth_arr[i] = median(clone(arr[i]), arr.slice(low,high+1));
	}
	return smooth_arr;
    };

    reduce.reducer = function (cbak) {
	if (!arguments.length) {
	    return perform_reduce;
	}
	perform_reduce = cbak;
	return reduce;
    };

    reduce.redundant = function (cbak) {
	if (!arguments.length) {
	    return redundant;
	}
	redundant = cbak;
	return reduce;
    };

    reduce.value = function (val) {
	if (!arguments.length) {
	    return value;
	}
	value = val;
	return reduce;
    };

    reduce.smooth = function (val) {
	if (!arguments.length) {
	    return smooth;
	}
	smooth = val;
	return reduce;
    };

    return reduce;
};

var block = function () {
    var red = reduce()
	.value('start');

    var value2 = 'end';

    var join = function (obj1, obj2) {
        return {
            'object' : {
                'start' : obj1.object[red.value()],
                'end'   : obj2[value2]
            },
            'value'  : obj2[value2]
        };
    };

    // var join = function (obj1, obj2) { return obj1 };

    red.reducer( function (arr) {
	var value = red.value();
	var redundant = red.redundant();
	var reduced_arr = [];
	var curr = {
	    'object' : arr[0],
	    'value'  : arr[0][value2]
	};
	for (var i=1; i<arr.length; i++) {
	    if (redundant (arr[i][value], curr.value)) {
		curr = join(curr, arr[i]);
		continue;
	    }
	    reduced_arr.push (curr.object);
	    curr.object = arr[i];
	    curr.value = arr[i].end;
	}
	reduced_arr.push(curr.object);

	// reduced_arr.push(arr[arr.length-1]);
	return reduced_arr;
    });

    reduce.join = function (cbak) {
	if (!arguments.length) {
	    return join;
	}
	join = cbak;
	return red;
    };

    reduce.value2 = function (field) {
	if (!arguments.length) {
	    return value2;
	}
	value2 = field;
	return red;
    };

    return red;
};

var line = function () {
    var red = reduce();

    red.reducer ( function (arr) {
	var redundant = red.redundant();
	var value = red.value();
	var reduced_arr = [];
	var curr = arr[0];
	for (var i=1; i<arr.length-1; i++) {
	    if (redundant (arr[i][value], curr[value])) {
		continue;
	    }
	    reduced_arr.push (curr);
	    curr = arr[i];
	}
	reduced_arr.push(curr);
	reduced_arr.push(arr[arr.length-1]);
	return reduced_arr;
    });

    return red;

};

module.exports = reduce;
module.exports.line = line;
module.exports.block = block;


},{}],37:[function(require,module,exports){

module.exports = {
    iterator : function(init_val) {
	var i = init_val || 0;
	var iter = function () {
	    return i++;
	};
	return iter;
    },

    script_path : function (script_name) { // script_name is the filename
	var script_scaped = script_name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	var script_re = new RegExp(script_scaped + '$');
	var script_re_sub = new RegExp('(.*)' + script_scaped + '$');

	// TODO: This requires phantom.js or a similar headless webkit to work (document)
	var scripts = document.getElementsByTagName('script');
	var path = "";  // Default to current path
	if(scripts !== undefined) {
            for(var i in scripts) {
		if(scripts[i].src && scripts[i].src.match(script_re)) {
                    return scripts[i].src.replace(script_re_sub, '$1');
		}
            }
	}
	return path;
    },

    defer_cancel : function (cbak, time) {
        var tick;

        var defer_cancel = function () {
            var args = Array.prototype.slice.call(arguments);
            var that = this;
            clearTimeout(tick);
            tick = setTimeout (function () {
                cbak.apply (that, args);
            }, time);
        };

        return defer_cancel;
    }
};

},{}],38:[function(require,module,exports){
var board = require("tnt.board");
var apijs = require("tnt.api");

var data_gene = function () {
    var eRest = board.track.data.genome.ensembl;

    var data = board.track.data.async()
        .retriever (function (obj) {
            var track = this;
            // var eRest = data.ensembl();
            // var scale = track.display().scale();
            var url = eRest.url()
                .endpoint("overlap/region/:species/:region")
                .parameters({
                    species : obj.species,
                    region  : (obj.chr + ":" + obj.from + "-" + obj.to),
                    feature: obj.features || ["gene"]
                });
            // var url = eRest.url.region(obj);
            return eRest.call(url)
              .then (function (resp) {
                      var genes = resp.body;
                      // Set the display_label field
                      for (var i=0; i<genes.length; i++) {
                          var gene = genes[i];
                          if (gene.strand === -1) {
                              gene.display_label = "<" + gene.external_name;
                          } else {
                              gene.display_label = gene.external_name + ">";
                          }
                      }
                      return genes;
                  }
              );
        });

    apijs(data)
        .getset('ensembl');

    return data;
};

var data_canonical = function () {
    var eRest = board.track.data.genome.ensembl;
    
    var data = board.track.data.async()
        .retriever (function (obj) {
            var url = eRest.url()
                .endpoint('overlap/region/:species/:region')
                .parameters({
                    species: obj.species,
                    region: (obj.chr + ':' + obj.from + '-' + obj.to),
                    feature: ['gene']
                });
            return eRest.call(url)
                .then (function (resp) {
                    var elems = resp.body;
                    var ensIds = elems.map(function (d) {
                        return d.id;
                    });
                    var url2 = eRest.url()
                        .endpoint('/lookup/id');
                    return eRest.call(url2, {ids:ensIds, expand:1});
                })
                .then (function (resp) {
                    var transcripts = [];
                    for (var gene in resp.body) {
                        if (resp.body.hasOwnProperty(gene)) {
                            for (var i = 0; i < resp.body[gene].Transcript.length; i++) {
                                var t = resp.body[gene].Transcript[i];
                                if (t.is_canonical) {
                                    t.gene = resp.body[gene];
                                    t.display_label = t.strand === 1 ? (t.display_name + ">") : ("<" + t.display_name);
                                    t.exons = transformExons(t);
                                    t.introns = exonsToExonsAndIntrons(t);
                                    t.key = (t.id + "_" + t.exons.length);
                                    transcripts.push(t);
                                }
                            }
                        }
                    }
                    return transcripts;
                })
        });

    return data;
};

var data_transcript = function () {
    var eRest = board.track.data.genome.ensembl;

    var data = board.track.data.async()
        .retriever (function (obj) {
            var url = eRest.url()
                .endpoint("overlap/region/:species/:region")
                .parameters({
                    species : obj.species,
                    region : (obj.chr + ":" + obj.from + "-" + obj.to),
                    feature : ["gene", "transcript", "exon", "cds"]
                });
            return eRest.call(url)
              .then (function (resp) {
                  var elems = resp.body;
                  var genes = data.region2genes(elems);
                  var transcripts = [];
                  for (var i=0; i<genes.length; i++) {
                      var g = genes[i];
                      var ts = data.gene2Transcripts(g);
                      transcripts = transcripts.concat(ts);
                  }
                  return transcripts;
              });
        });

    apijs(data)
        .method("gene2Transcripts", function (g) {
            var ts = g.Transcript;
            var transcripts = [];
            for (var j=0; j<ts.length; j++) {
                var t = ts[j];
                t.exons = transformExons(t);
                t.introns = exonsToExonsAndIntrons(t);
                //var obj = exonsToExonsAndIntrons (transformExons(t), t);
                // t.name = [{
                //     pos: t.start,
                //     name : t.display_name,
                //     strand : t.strand,
                //     transcript : t
                // }];
                t.display_label = t.strand === 1 ? (t.display_name + ">") : ("<" + t.display_name);
                t.key = (t.id + "_" + t.exons.length);
                //obj.id = t.id;
                t.gene = g;
                // obj.transcript = t;
                // obj.external_name = t.display_name;
                //obj.display_label = t.display_label;
                //obj.start = t.start;
                //obj.end = t.end;
                transcripts.push(t);
            }
            return transcripts;
        })
        .method("region2genes", function (elems) {
            var geneTranscripts = {};
            var genes = [];
            var transcripts = {};

            // transcripts
            for (var i=0; i<elems.length; i++) {
                var e = elems[i];
                if (e.feature_type == "transcript") {
                    e.display_name = e.external_name;
                    transcripts[e.id] = e;
                    if (geneTranscripts[e.Parent] === undefined) {
                        geneTranscripts[e.Parent] = [];
                    }
                    geneTranscripts[e.Parent].push(e);
                }
            }

            // exons
            for (var j=0; j<elems.length; j++) {
                var e = elems[j];
                if (e.feature_type === "exon") {
                    var t = transcripts[e.Parent];
                    if (t.Exon === undefined) {
                        t.Exon = [];
                    }
                    t.Exon.push(e);
                }
            }

            // cds
            for (var k=0; k<elems.length; k++) {
                var e = elems[k];
                if (e.feature_type === "cds") {
                    var t = transcripts[e.Parent];
                    if (t.Translation === undefined) {
                        t.Translation = e;
                    }
                    if (e.start < t.Translation.start) {
                        t.Translation.start = e.start;
                    }
                    if (e.end > t.Translation.end) {
                        t.Translation.end = e.end;
                    }
                }
            }

            // genes
            for (var h=0; h<elems.length; h++) {
                var e = elems[h];
                if (e.feature_type === "gene") {
                    e.display_name = e.external_name;
                    e.Transcript = geneTranscripts[e.id];
                    genes.push(e);
                }
            }

            return genes;
        });
    return data;
};

function exonsToExonsAndIntrons (t) {
    var exons = t.exons;
    //var obj = {};
    //obj.exons = exons;
    var introns = [];
    for (var i=0; i<exons.length-1; i++) {
        var intron = {
            start : exons[i].transcript.strand === 1 ? exons[i].end : exons[i].start,
            end   : exons[i].transcript.strand === 1 ? exons[i+1].start : exons[i+1].end,
            transcript : t
        };
        introns.push(intron);
    }
    return introns;
}


function transformExons (transcript) {
    var translationStart;
    var translationEnd;
    if (transcript.Translation !== undefined) {
        translationStart = transcript.Translation.start;
        translationEnd = transcript.Translation.end;
    }
    var exons = transcript.Exon;

    var newExons = [];
    if (exons) {
        for (var i=0; i<exons.length; i++) {
            if (transcript.Translation === undefined) { // NO coding transcript
                newExons.push({
                    start   : exons[i].start,
                    end     : exons[i].end,
                    transcript : transcript,
                    coding  : false,
                    offset  : exons[i].start - transcript.start
                });
            } else {
                if (exons[i].start < translationStart) {
                    // 5'
                    if (exons[i].end < translationStart) {
                        // Completely non coding
                        newExons.push({
                            start  : exons[i].start,
                            end    : exons[i].end,
                            transcript : transcript,
                            coding : false,
                            offset  : exons[i].start - transcript.start
                        });
                    } else {
                        // Has 5'UTR
                        var ncExon5 = {
                            start  : exons[i].start,
                            end    : translationStart,
                            transcript : transcript,
                            coding : false,
                            offset  : exons[i].start - transcript.start
                        };
                        var codingExon5 = {
                            start  : translationStart,
                            end    : exons[i].end,
                            transcript : transcript,
                            coding : true,
                            //offset  : exons[i].start - transcript.start
                            offset: translationStart - transcript.start
                        };
                        if (exons[i].strand === 1) {
                            newExons.push(ncExon5);
                            newExons.push(codingExon5);
                        } else {
                            newExons.push(codingExon5);
                            newExons.push(ncExon5);
                        }
                    }
                } else if (exons[i].end > translationEnd) {
                    // 3'
                    if (exons[i].start > translationEnd) {
                        // Completely non coding
                        newExons.push({
                            start   : exons[i].start,
                            end     : exons[i].end,
                            transcript : transcript,
                            coding  : false,
                            offset  : exons[i].start - transcript.start
                        });
                    } else {
                        // Has 3'UTR
                        var codingExon3 = {
                            start  : exons[i].start,
                            end    : translationEnd,
                            transcript : transcript,
                            coding : true,
                            offset  : exons[i].start - transcript.start
                        };
                        var ncExon3 = {
                            start  : translationEnd,
                            end    : exons[i].end,
                            transcript : transcript,
                            coding : false,
                            //offset  : exons[i].start - transcript.start
                            offset : translationEnd - transcript.start
                        };
                        if (exons[i].strand === 1) {
                            newExons.push(codingExon3);
                            newExons.push(ncExon3);
                        } else {
                            newExons.push(ncExon3);
                            newExons.push(codingExon3);
                        }
                    }
                } else {
                    // coding exon
                    newExons.push({
                        start  : exons[i].start,
                        end    : exons[i].end,
                        transcript : transcript,
                        coding : true,
                        offset  : exons[i].start - transcript.start
                    });
                }
            }
        }
    }
    return newExons;
}


var data_sequence = function () {
    var eRest = board.track.data.genome.ensembl;

    var data = board.track.data.async()
        .retriever (function (obj) {
            if ((obj.to - obj.from) < data.limit()) {
                var url = eRest.url()
                    .endpoint("/sequence/region/:species/:region")
                    .parameters({
                        "species": obj.species,
                        "region": (obj.chr + ":" + obj.from + ".." + obj.to)
                    });
                // var url = eRest.url.sequence(obj);
                return eRest.call(url)
                    .then (function (resp) {
                        var seq = resp.body;
                        var fields = seq.id.split(":");
                        var from = fields[3];
                        var nts = [];
                        for (var i=0; i<seq.seq.length; i++) {
                            nts.push({
                                pos: +from + i,
                                sequence: seq.seq[i]
                            });
                        }
                        return nts;
                    });
            } else { // Region too wide for sequence
                return new Promise (function (resolve, reject) {
                    resolve([]);
                });
            }
        });

    apijs(data)
        .getset("limit", 150);

    return data;
};

// export
var genome_data = {
    gene : data_gene,
    sequence : data_sequence,
    transcript : data_transcript,
    canonical: data_canonical,
};

module.exports = exports = genome_data;

},{"tnt.api":18,"tnt.board":20}],39:[function(require,module,exports){
var apijs = require ("tnt.api");
var layout = require("./layout.js");
var board = require("tnt.board");

var tnt_feature_transcript = function () {
    var feature = board.track.feature()
        .layout (board.track.layout.genome())
        .index (function (d) {
            return d.key;
        });

    feature.create (function (new_elems) {
        var track = this;
        var xScale = feature.scale();
        var gs = new_elems
            .append("g")
            .attr("transform", function (d) {
                return "translate(" + xScale(d.start) + "," + (feature.layout().gene_slot().slot_height * d.slot) + ")";
            });

        gs
            .append("line")
            .attr("x1", 0)
            .attr("y1", ~~(feature.layout().gene_slot().gene_height/2))
            .attr("x2", function (d) {
                return (xScale(d.end) - xScale(d.start));
            })
            .attr("y2", ~~(feature.layout().gene_slot().gene_height/2))
            .attr("fill", "none")
            .attr("stroke", track.color())
            .attr("stroke-width", 2)
            .transition()
            .duration(500)
            .attr("stroke", function (d) {
                return feature.color()(d);
            });
            //.attr("stroke", feature.color());

        // exons
        // pass the "slot" to the exons and introns
        new_elems.each (function (d) {
            if (d.exons) {
                for (var i=0; i<d.exons.length; i++) {
                    d.exons[i].slot = d.slot;
                }
            }
        });

        var exons = gs.selectAll(".exons")
            .data(function (d) {
                return d.exons || [];
            }, function (d) {
                return d.start;
            });

        exons
            .enter()
            .append("rect")
            .attr("class", "tnt_exons")
            .attr("x", function (d) {
                return (xScale(d.start + d.offset) - xScale(d.start));
            })
            .attr("y", 0)
            .attr("width", function (d) {
                return (xScale(d.end) - xScale(d.start));
            })
            .attr("height", feature.layout().gene_slot().gene_height)
            .attr("fill", track.color())
            .attr("stroke", track.color())
            .transition()
            .duration(500)
            //.attr("stroke", feature.color())
            .attr("stroke", function (d) {
                return feature.color()(d);
            })
            .attr("fill", function (d) {
                if (d.coding) {
                     return feature.color()(d);
                }
                if (d.coding === false) {
                    return track.color();
                }
                return feature.color()(d);
            });

        // labels
        gs
            .append("text")
            .attr("class", "tnt_name")
            .attr("x", 0)
            .attr("y", 25)
            .attr("fill", track.color())
            .text(function (d) {
                if (feature.layout().gene_slot().show_label) {
                    return d.display_label;
                } else {
                    return "";
                }
            })
            .style("font-weight", "normal")
            .transition()
            .duration(500)
            .attr("fill", function (d) {
                return feature.color()(d);
            });

    });

    feature.distribute (function (transcripts) {
        var track = this;
        var xScale = feature.scale();
        var gs = transcripts.select("g")
            .transition()
            .duration(200)
            .attr("transform", function (d) {
                return "translate(" + xScale(d.start) + "," + (feature.layout().gene_slot().slot_height * d.slot) + ")";
            });
        gs
            .selectAll ("rect")
            .attr("height", feature.layout().gene_slot().gene_height);
        gs
            .selectAll("line")
            .attr("x2", function (d) {
                return (xScale(d.end) - xScale(d.start));
            })
            .attr("y1", ~~(feature.layout().gene_slot().gene_height/2))
            .attr("y2", ~~(feature.layout().gene_slot().gene_height/2));
        gs
            .select ("text")
            .text (function (d) {
                if (feature.layout().gene_slot().show_label) {
                    return d.display_label;
                }
                return "";
            });
    });

    feature.move (function (transcripts) {
        var xScale = feature.scale();
        var gs = transcripts.select("g")
            .attr("transform", function (d) {
                return "translate(" + xScale(d.start) + "," + (feature.layout().gene_slot().slot_height * d.slot) + ")";
            });
        gs.selectAll("line")
            .attr("x2", function (d) {
                return (xScale(d.end) - xScale(d.start));
            })
            .attr("y1", ~~(feature.layout().gene_slot().gene_height/2))
            .attr("y2", ~~(feature.layout().gene_slot().gene_height/2));
            // .attr("width", function (d) {
            //     return (xScale(d.end) - xScale(d.start));
            // })
        gs.selectAll("rect")
            .attr("width", function (d) {
                return (xScale(d.end) - xScale(d.start));
            });
        gs.selectAll(".tnt_exons")
            .attr("x", function (d) {
                return (xScale(d.start + d.offset) - xScale(d.start));
            });

    });

    return feature;
};


var tnt_feature_sequence = function () {

    var config = {
        fontsize : 10,
        sequence : function (d) {
            return d.sequence;
        }
    };

    // 'Inherit' from tnt.track.feature
    var feature = board.track.feature()
    .index (function (d) {
        return d.pos;
    });

    var api = apijs (feature)
    .getset (config);


    feature.create (function (new_nts) {
        var track = this;
        var xScale = feature.scale();

        new_nts
            .append("text")
            .attr("fill", track.color())
            .style('font-size', config.fontsize + "px")
            .attr("x", function (d) {
                return xScale (d.pos) - (config.fontsize/2) + 1;
            })
            .attr("y", function (d) {
                return ~~(track.height() / 2) + 5;
            })
            .style("font-family", '"Lucida Console", Monaco, monospace')
            .text(config.sequence)
            .transition()
            .duration(500)
            .attr('fill', feature.color());
    });

    feature.move (function (nts) {
        var xScale = feature.scale();
        nts.select ("text")
            .attr("x", function (d) {
                return xScale(d.pos) - (config.fontsize/2) + 1;
            });
        });

    return feature;
};

var tnt_feature_gene = function () {

    // 'Inherit' from tnt.track.feature
    var feature = board.track.feature()
    	.layout(board.track.layout.genome())
    	.index(function (d) {
    	    return d.id;
    	});

    feature.create(function (new_elems) {
        var track = this;
        var xScale = feature.scale();
        new_elems
            .append("rect")
            .attr("x", function (d) {
                return xScale(d.start);
            })
            .attr("y", function (d) {
                return feature.layout().gene_slot().slot_height * d.slot;
            })
            .attr("width", function (d) {
                return (xScale(d.end) - xScale(d.start));
            })
            .attr("height", feature.layout().gene_slot().gene_height)
            .attr("fill", track.color())
            .transition()
            .duration(500)
            .attr("fill", function (d) {
                if (d.color === undefined) {
                    return feature.color();
                } else {
                    return d.color;
                }
            });

        new_elems
            .append("text")
            .attr("class", "tnt_name")
            .attr("x", function (d) {
                return xScale(d.start);
            })
            .attr("y", function (d) {
                return (feature.layout().gene_slot().slot_height * d.slot) + 25;
            })
            .attr("fill", track.color())
            .text(function (d) {
                if (feature.layout().gene_slot().show_label) {
                    return d.display_label;
                } else {
                    return "";
                }
            })
            .style("font-weight", "normal")
            .transition()
            .duration(500)
            .attr("fill", function() {
                return feature.color();
            });
    });

    feature.distribute(function (genes) {
        var track = this;
        genes
            .select("rect")
            .transition()
            .duration(500)
            .attr("y", function (d) {
                return (feature.layout().gene_slot().slot_height * d.slot);
            })
            .attr("height", feature.layout().gene_slot().gene_height);

        genes
            .select("text")
            .transition()
            .duration(500)
            .attr("y", function (d) {
                return (feature.layout().gene_slot().slot_height * d.slot) + 25;
            })
            .text(function (d) {
                if (feature.layout().gene_slot().show_label) {
                    return d.display_label;
                } else {
                    return "";
                }
            });
    });

    feature.move(function (genes) {
        var xScale = feature.scale();
        genes.select("rect")
            .attr("x", function (d) {
                return xScale(d.start);
            })
            .attr("width", function (d) {
                return (xScale(d.end) - xScale(d.start));
            });

        genes.select("text")
            .attr("x", function (d) {
                return xScale(d.start);
            });
    });

    return feature;
};

// genome location
 var tnt_feature_location = function () {
     var xScale;
     var row;
     var chr;
     var species;
     var text_cbak = function (sp, chr, from, to) {
         return sp + " " + chr + ":" + from + "-" + to;
     };

     var feature = {};
     feature.reset = function () {};
     feature.plot = function () {};
     feature.init = function () { row = undefined; };
     feature.mover = function () {
         var xScale = feature.scale();
         var domain = xScale.domain();
         row.select ("text")
            .text(text_cbak(species, chr, ~~domain[0], ~~domain[1]));
     };
     feature.update = function (where) {
         chr = where.chr;
         species = where.species;
         var track = this;
         var svg_g = track.g;
         var domain = xScale.domain();
         if (row === undefined) {
             row = svg_g;
             row
                 .append("text")
                 .text(text_cbak(species, chr, ~~domain[0], ~~domain[1]));
         }
     };

     feature.scale = function (s) {
         if (!arguments.length) {
             return xScale;
         }
         xScale = s;
         return this;
     };

     feature.text = function (cbak) {
        if (!arguments.length) {
            return text_cbak;
        }
        text_cbak = cbak;
        return this;
     };

     return feature;
 };

var genome_features = {
    gene : tnt_feature_gene,
    sequence : tnt_feature_sequence,
    transcript : tnt_feature_transcript,
    location : tnt_feature_location,
};
module.exports = exports = genome_features;

},{"./layout.js":42,"tnt.api":18,"tnt.board":20}],40:[function(require,module,exports){
// var ensembl_rest = require("tnt.ensembl")();
var apijs = require("tnt.api");
var tnt_board = require("tnt.board");
tnt_board.track.data.genome = require("./data.js");
tnt_board.track.feature.genome = require("./feature");
tnt_board.track.layout.genome = require("./layout");
tnt_board.track.data.genome.ensembl = require("tnt.rest")()
    .domain("rest.ensembl.org");

// promises
var Promise = require('es6-promise').Promise;
var minPromise = new Promise(function (res) {
    res(0);
});

tnt_board_genome = function() {
    "use strict";

    var ensembl_rest = tnt_board.track.data.genome.ensembl;

    // Private vars
    var ens_re = /^ENS\w+\d+$/;
    var chr_length;



    // Vars exposed in the API
    var conf = {
        max_coord       : undefined, // Promise that returns the max coordinate. If undef uses the length of the chromosome
        min_coord       : minPromise, // Promise that returns the min coordinate. Defaults to 0
        gene           : undefined,
        xref_search    : function () {},
        ensgene_search : function () {},
        context        : 0,
        rest           : ensembl_rest
    };
    // We "inherit" from board
    var genome_browser = tnt_board()
        .zoom_in(200)
        .zoom_out(5000000); // ensembl region limit
        // .min(0);

    var gene;

    // The location and axis track
    var location_track = tnt_board.track()
        .height(20)
        .color("white")
        .data(tnt_board.track.data.empty())
        .display(tnt_board.track.feature.genome.location());

    var axis_track = tnt_board.track()
        .height(0)
        .color("white")
        .data(tnt_board.track.data.empty())
        .display(tnt_board.track.feature.axis());

    genome_browser
	   .add_track(location_track)
       .add_track(axis_track);

    // Default location:
    genome_browser
	   .species("human")
       .chr(7)
       .from(139424940)
       .to(141784100);

    // We save the start method of the 'parent' object
    genome_browser._start = genome_browser.start;

    // We hijack parent's start method
    var start = function (where) {
        if (where !== undefined) {
            if (where.gene !== undefined) {
                get_gene(where);
                return;
            } else {
                if (where.species === undefined) {
                    where.species = genome_browser.species();
                } else {
                    genome_browser.species(where.species);
                }
                if (where.chr === undefined) {
                    where.chr = genome_browser.chr();
                } else {
                    genome_browser.chr(where.chr);
                }
                if (where.from === undefined) {
                    where.from = genome_browser.from();
                } else {
                    genome_browser.from(where.from);
                }
                if (where.to === undefined) {
                    where.to = genome_browser.to();
                } else {
                    genome_browser.to(where.to);
                }
            }
        } else { // "where" is undef so look for gene or loc
            if (genome_browser.gene() !== undefined) {
                get_gene({ species : genome_browser.species(),
                    gene    : genome_browser.gene()
                });
                return;
            } else {
                where = {};
                where.species = genome_browser.species();
                where.chr     = genome_browser.chr();
                where.from    = genome_browser.from();
                where.to      = genome_browser.to();
            }
        }

        // Min is 0 by default or use the provided promise
        conf.min_coord
            .then (function (min) {
                genome_browser.min(min);
                if (!conf.max_coord) {
                    var url = ensembl_rest.url()
                        .endpoint("info/assembly/:species/:region_name")
                        .parameters({
                            species: where.species,
                            region_name: where.chr
                        });

                    conf.max_coord = ensembl_rest.call (url)
                        .then (function (resp) {
                            return resp.body.length;
                        });
                }
                return conf.max_coord;
            })
            .then (function (max) {
                genome_browser.max(max);
                genome_browser._start();

            });
    };

    var homologues = function (ensGene, callback)  {
        var url = ensembl_rest.url.homologues ({id : ensGene});
        ensembl_rest.call(url)
            .then (function(resp) {
                var homologues = resp.body.data[0].homologies;
                if (callback !== undefined) {
                    var homologues_obj = split_homologues(homologues);
                    callback(homologues_obj);
                }
        });
    };

    var isEnsemblGene = function(term) {
        if (term.match(ens_re)) {
            return true;
        } else {
            return false;
        }
    };

    var get_gene = function (where) {
        if (isEnsemblGene(where.gene)) {
            get_ensGene(where.gene);
        } else {
            var url = ensembl_rest.url()
                .endpoint("xrefs/symbol/:species/:symbol")
                .parameters({
                    species: where.species,
                    symbol: where.gene
                });
            ensembl_rest.call(url)
                .then (function(resp) {
                    var data = resp.body;
                    data = data.filter(function(d) {
                        return !d.id.indexOf("ENS");
                    });
                    if (data[0] !== undefined) {
                        get_ensGene(data[0].id);
                    }
                    conf.xref_search(resp, where.gene, where.species);
                });
        }
    };

    var get_ensGene = function (id) {
        var url = ensembl_rest.url()
            .endpoint("/lookup/id/:id")
            .parameters({
                id: id
            });

        ensembl_rest.call(url)
            .then (function(resp) {
                var data = resp.body;
                conf.ensgene_search(data);
                var extra = ~~((data.end - data.start) * (conf.context/100));
                genome_browser
                    .species(data.species)
                    .chr(data.seq_region_name)
                    .from(data.start - extra)
                    .to(data.end + extra);

                genome_browser.start( { species : data.species,
                    chr     : data.seq_region_name,
                    from    : data.start - extra,
                    to      : data.end + extra
                } );
            });
    };

    var split_homologues = function (homologues) {
        var orthoPatt = /ortholog/;
        var paraPatt = /paralog/;

        var orthologues = homologues.filter(function(d){return d.type.match(orthoPatt);});
        var paralogues  = homologues.filter(function(d){return d.type.match(paraPatt);});

        return {
            'orthologues' : orthologues,
            'paralogues'  : paralogues
        };
    };

    var api = apijs(genome_browser)
        .getset (conf);

    api.method ({
        start      : start,
        homologues : homologues
    });

    return genome_browser;
};

module.exports = exports = tnt_board_genome;

},{"./data.js":38,"./feature":39,"./layout":42,"es6-promise":3,"tnt.api":18,"tnt.board":20,"tnt.rest":28}],41:[function(require,module,exports){
var board = require("tnt.board");
board.genome = require("./genome");

module.exports = exports = board;

},{"./genome":40,"tnt.board":20}],42:[function(require,module,exports){
var apijs = require ("tnt.api");

// The overlap detector used for genes
var gene_layout = function() {
    // Private vars
    var max_slots;

    // vars exposed in the API:
    var height = 150;

    var old_elements = [];

    var scale;

    var slot_types = {
        'expanded'   : {
            slot_height : 30,
            gene_height : 10,
            show_label  : true
        },
        'collapsed' : {
            slot_height : 10,
            gene_height : 7,
            show_label  : false
        }
    };
    var current_slot_type = 'expanded';

    // The returned closure / object
    var genes_layout = function (new_genes) {
        var track = this;
        scale = track.display().scale();

        // We make sure that the genes have name
        for (var i = 0; i < new_genes.length; i++) {
            if (new_genes[i].external_name === null) {
                new_genes[i].external_name = "";
            }
        }

        max_slots = ~~(track.height() / slot_types.expanded.slot_height);

        if (genes_layout.keep_slots()) {
            slot_keeper(new_genes, old_elements);
        }
        var needed_slots = collition_detector(new_genes);
        slot_types.collapsed.needed_slots = needed_slots;
        slot_types.expanded.needed_slots = needed_slots;
        if (genes_layout.fixed_slot_type()) {
            current_slot_type = genes_layout.fixed_slot_type();
        }
        else if (needed_slots > max_slots) {
            current_slot_type = 'collapsed';
        } else {
            current_slot_type = 'expanded';
        }

        // run the user-defined callback
        genes_layout.on_layout_run()(slot_types, current_slot_type);

        //conf_ro.elements = new_genes;
        old_elements = new_genes;
        return new_genes;
    };

    var gene_slot = function () {
        return slot_types[current_slot_type];
    };

    var collition_detector = function (genes) {
        var genes_placed = [];
        var genes_to_place = genes;
        var needed_slots = 0;
        for (var j=0; j<genes.length; j++) {
            if (genes[j].slot > needed_slots && genes[j].slot < max_slots) {
                needed_slots = genes[j].slot;
            }
        }

        for (var i=0; i<genes_to_place.length; i++) {
            var genes_by_slot = sort_genes_by_slot(genes_placed);
            var this_gene = genes_to_place[i];
            if (this_gene.slot !== undefined && this_gene.slot < max_slots) {
                if (slot_has_space(this_gene, genes_by_slot[this_gene.slot])) {
                    genes_placed.push(this_gene);
                    continue;
                }
            }
            var slot = 0;
            OUTER: while (true) {
                if (slot_has_space(this_gene, genes_by_slot[slot])) {
                    this_gene.slot = slot;
                    genes_placed.push(this_gene);
                    if (slot > needed_slots) {
                        needed_slots = slot;
                    }
                    break;
                }
                slot++;
            }
        }
        return needed_slots + 1;
    };

    var slot_has_space = function (query_gene, genes_in_this_slot) {
        if (genes_in_this_slot === undefined) {
            return true;
        }
        for (var j=0; j<genes_in_this_slot.length; j++) {
            var subj_gene = genes_in_this_slot[j];
            if (query_gene.id === subj_gene.id) {
                continue;
            }
            var y_label_end = subj_gene.display_label.length * 8 + scale(subj_gene.start); // TODO: It may be better to have a fixed font size (instead of the hardcoded value)?
            var y1  = scale(subj_gene.start);
            var y2  = scale(subj_gene.end) > y_label_end ? scale(subj_gene.end) : y_label_end;
            var x_label_end = query_gene.display_label.length * 8 + scale(query_gene.start);
            var x1 = scale(query_gene.start);
            var x2 = scale(query_gene.end) > x_label_end ? scale(query_gene.end) : x_label_end;
            if ( ((x1 <= y1) && (x2 >= y1)) ||
            ((x1 >= y1) && (x1 <= y2)) ) {
                return false;
            }
        }
        return true;
    };

    var slot_keeper = function (genes, prev_genes) {
        var prev_genes_slots = genes2slots(prev_genes);

        for (var i = 0; i < genes.length; i++) {
            if (prev_genes_slots[genes[i].id] !== undefined) {
                genes[i].slot = prev_genes_slots[genes[i].id];
            }
        }
    };

    var genes2slots = function (genes_array) {
        var hash = {};
        for (var i = 0; i < genes_array.length; i++) {
            var gene = genes_array[i];
            hash[gene.id] = gene.slot;
        }
        return hash;
    };

    var sort_genes_by_slot = function (genes) {
        var slots = [];
        for (var i = 0; i < genes.length; i++) {
            if (slots[genes[i].slot] === undefined) {
                slots[genes[i].slot] = [];
            }
            slots[genes[i].slot].push(genes[i]);
        }
        return slots;
    };

    // API
    var api = apijs (genes_layout)
        .getset ("elements", function () {})
        .getset ("on_layout_run", function () {})
        .getset ("fixed_slot_type")
        .getset ("keep_slots", true)
        .method ({
            gene_slot : gene_slot,
            // height : function () {
            //     return slot_types.expanded.needed_slots * slot_types.expanded.slot_height;
            // }
        });

    // Check that the fixed slot type is valid
    genes_layout.fixed_slot_type.check(function (val) {
            return ((val === "collapsed") || (val === "expanded"));
    });

    return genes_layout;
};

module.exports = exports = gene_layout;

},{"tnt.api":18}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL2Zha2VfOGRhZTAyZWUuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2VzNi1wcm9taXNlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UtcHJvbWlzZXMvaHR0cHBsZWFzZS1wcm9taXNlcy5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL2xpYi9lcnJvci5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL2xpYi9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL2xpYi9yZXF1ZXN0LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvbGliL3Jlc3BvbnNlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvbGliL3V0aWxzL2RlbGF5LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvbGliL3V0aWxzL29uY2UuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9saWIveGhyLWJyb3dzZXIuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9ub2RlX21vZHVsZXMveHRlbmQvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9wbHVnaW5zL2NsZWFudXJsLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvcGx1Z2lucy9qc29uLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvcGx1Z2lucy9qc29ucmVxdWVzdC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL3BsdWdpbnMvanNvbnJlc3BvbnNlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5hcGkvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmFwaS9zcmMvYXBpLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5ib2FyZC9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuYm9hcmQvc3JjL2JvYXJkLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5ib2FyZC9zcmMvZGF0YS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuYm9hcmQvc3JjL2ZlYXR1cmUuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuYm9hcmQvc3JjL2xheW91dC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuYm9hcmQvc3JjL3NwaW5uZXIuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy90cmFjay5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQucmVzdC9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQucmVzdC9zcmMvcmVzdC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQucmVzdC9zcmMvdXJsLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC51dGlscy9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQudXRpbHMvc3JjL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC51dGlscy9zcmMvcG5nLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC51dGlscy9zcmMvcmVkdWNlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC51dGlscy9zcmMvdXRpbHMuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9zcmMvZGF0YS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL3NyYy9mZWF0dXJlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvc3JjL2dlbm9tZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL3NyYy9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL3NyYy9sYXlvdXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25vQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaGlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqMkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTs7Ozs7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpZiAodHlwZW9mIHRudCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgIG1vZHVsZS5leHBvcnRzID0gdG50ID0ge307XG59XG50bnQuYm9hcmQgPSByZXF1aXJlKFwiLi9pbmRleC5qc1wiKTtcbnRudC51dGlscyA9IHJlcXVpcmUoXCJ0bnQudXRpbHNcIik7XG4iLCIvLyBpZiAodHlwZW9mIHRudCA9PT0gXCJ1bmRlZmluZWRcIikge1xuLy8gICAgIG1vZHVsZS5leHBvcnRzID0gdG50ID0ge31cbi8vIH1cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vc3JjL2luZGV4LmpzXCIpO1xuXG4iLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsKXtcbi8qIVxuICogQG92ZXJ2aWV3IGVzNi1wcm9taXNlIC0gYSB0aW55IGltcGxlbWVudGF0aW9uIG9mIFByb21pc2VzL0ErLlxuICogQGNvcHlyaWdodCBDb3B5cmlnaHQgKGMpIDIwMTQgWWVodWRhIEthdHosIFRvbSBEYWxlLCBTdGVmYW4gUGVubmVyIGFuZCBjb250cmlidXRvcnMgKENvbnZlcnNpb24gdG8gRVM2IEFQSSBieSBKYWtlIEFyY2hpYmFsZClcbiAqIEBsaWNlbnNlICAgTGljZW5zZWQgdW5kZXIgTUlUIGxpY2Vuc2VcbiAqICAgICAgICAgICAgU2VlIGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9zdGVmYW5wZW5uZXIvZXM2LXByb21pc2UvbWFzdGVyL0xJQ0VOU0VcbiAqIEB2ZXJzaW9uICAgMy4zLjFcbiAqL1xuXG4oZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuICAgIHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpIDpcbiAgICB0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoZmFjdG9yeSkgOlxuICAgIChnbG9iYWwuRVM2UHJvbWlzZSA9IGZhY3RvcnkoKSk7XG59KHRoaXMsIChmdW5jdGlvbiAoKSB7ICd1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gb2JqZWN0T3JGdW5jdGlvbih4KSB7XG4gIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2YgeCA9PT0gJ29iamVjdCcgJiYgeCAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNGdW5jdGlvbih4KSB7XG4gIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJztcbn1cblxudmFyIF9pc0FycmF5ID0gdW5kZWZpbmVkO1xuaWYgKCFBcnJheS5pc0FycmF5KSB7XG4gIF9pc0FycmF5ID0gZnVuY3Rpb24gKHgpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9O1xufSBlbHNlIHtcbiAgX2lzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xufVxuXG52YXIgaXNBcnJheSA9IF9pc0FycmF5O1xuXG52YXIgbGVuID0gMDtcbnZhciB2ZXJ0eE5leHQgPSB1bmRlZmluZWQ7XG52YXIgY3VzdG9tU2NoZWR1bGVyRm4gPSB1bmRlZmluZWQ7XG5cbnZhciBhc2FwID0gZnVuY3Rpb24gYXNhcChjYWxsYmFjaywgYXJnKSB7XG4gIHF1ZXVlW2xlbl0gPSBjYWxsYmFjaztcbiAgcXVldWVbbGVuICsgMV0gPSBhcmc7XG4gIGxlbiArPSAyO1xuICBpZiAobGVuID09PSAyKSB7XG4gICAgLy8gSWYgbGVuIGlzIDIsIHRoYXQgbWVhbnMgdGhhdCB3ZSBuZWVkIHRvIHNjaGVkdWxlIGFuIGFzeW5jIGZsdXNoLlxuICAgIC8vIElmIGFkZGl0aW9uYWwgY2FsbGJhY2tzIGFyZSBxdWV1ZWQgYmVmb3JlIHRoZSBxdWV1ZSBpcyBmbHVzaGVkLCB0aGV5XG4gICAgLy8gd2lsbCBiZSBwcm9jZXNzZWQgYnkgdGhpcyBmbHVzaCB0aGF0IHdlIGFyZSBzY2hlZHVsaW5nLlxuICAgIGlmIChjdXN0b21TY2hlZHVsZXJGbikge1xuICAgICAgY3VzdG9tU2NoZWR1bGVyRm4oZmx1c2gpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzY2hlZHVsZUZsdXNoKCk7XG4gICAgfVxuICB9XG59O1xuXG5mdW5jdGlvbiBzZXRTY2hlZHVsZXIoc2NoZWR1bGVGbikge1xuICBjdXN0b21TY2hlZHVsZXJGbiA9IHNjaGVkdWxlRm47XG59XG5cbmZ1bmN0aW9uIHNldEFzYXAoYXNhcEZuKSB7XG4gIGFzYXAgPSBhc2FwRm47XG59XG5cbnZhciBicm93c2VyV2luZG93ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB1bmRlZmluZWQ7XG52YXIgYnJvd3Nlckdsb2JhbCA9IGJyb3dzZXJXaW5kb3cgfHwge307XG52YXIgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPSBicm93c2VyR2xvYmFsLk11dGF0aW9uT2JzZXJ2ZXIgfHwgYnJvd3Nlckdsb2JhbC5XZWJLaXRNdXRhdGlvbk9ic2VydmVyO1xudmFyIGlzTm9kZSA9IHR5cGVvZiBzZWxmID09PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYgKHt9KS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXSc7XG5cbi8vIHRlc3QgZm9yIHdlYiB3b3JrZXIgYnV0IG5vdCBpbiBJRTEwXG52YXIgaXNXb3JrZXIgPSB0eXBlb2YgVWludDhDbGFtcGVkQXJyYXkgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBpbXBvcnRTY3JpcHRzICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgTWVzc2FnZUNoYW5uZWwgIT09ICd1bmRlZmluZWQnO1xuXG4vLyBub2RlXG5mdW5jdGlvbiB1c2VOZXh0VGljaygpIHtcbiAgLy8gbm9kZSB2ZXJzaW9uIDAuMTAueCBkaXNwbGF5cyBhIGRlcHJlY2F0aW9uIHdhcm5pbmcgd2hlbiBuZXh0VGljayBpcyB1c2VkIHJlY3Vyc2l2ZWx5XG4gIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vY3Vqb2pzL3doZW4vaXNzdWVzLzQxMCBmb3IgZGV0YWlsc1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBwcm9jZXNzLm5leHRUaWNrKGZsdXNoKTtcbiAgfTtcbn1cblxuLy8gdmVydHhcbmZ1bmN0aW9uIHVzZVZlcnR4VGltZXIoKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdmVydHhOZXh0KGZsdXNoKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXNlTXV0YXRpb25PYnNlcnZlcigpIHtcbiAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICB2YXIgb2JzZXJ2ZXIgPSBuZXcgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoZmx1c2gpO1xuICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgb2JzZXJ2ZXIub2JzZXJ2ZShub2RlLCB7IGNoYXJhY3RlckRhdGE6IHRydWUgfSk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICBub2RlLmRhdGEgPSBpdGVyYXRpb25zID0gKytpdGVyYXRpb25zICUgMjtcbiAgfTtcbn1cblxuLy8gd2ViIHdvcmtlclxuZnVuY3Rpb24gdXNlTWVzc2FnZUNoYW5uZWwoKSB7XG4gIHZhciBjaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gZmx1c2g7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHVzZVNldFRpbWVvdXQoKSB7XG4gIC8vIFN0b3JlIHNldFRpbWVvdXQgcmVmZXJlbmNlIHNvIGVzNi1wcm9taXNlIHdpbGwgYmUgdW5hZmZlY3RlZCBieVxuICAvLyBvdGhlciBjb2RlIG1vZGlmeWluZyBzZXRUaW1lb3V0IChsaWtlIHNpbm9uLnVzZUZha2VUaW1lcnMoKSlcbiAgdmFyIGdsb2JhbFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBnbG9iYWxTZXRUaW1lb3V0KGZsdXNoLCAxKTtcbiAgfTtcbn1cblxudmFyIHF1ZXVlID0gbmV3IEFycmF5KDEwMDApO1xuZnVuY3Rpb24gZmx1c2goKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDIpIHtcbiAgICB2YXIgY2FsbGJhY2sgPSBxdWV1ZVtpXTtcbiAgICB2YXIgYXJnID0gcXVldWVbaSArIDFdO1xuXG4gICAgY2FsbGJhY2soYXJnKTtcblxuICAgIHF1ZXVlW2ldID0gdW5kZWZpbmVkO1xuICAgIHF1ZXVlW2kgKyAxXSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGxlbiA9IDA7XG59XG5cbmZ1bmN0aW9uIGF0dGVtcHRWZXJ0eCgpIHtcbiAgdHJ5IHtcbiAgICB2YXIgciA9IHJlcXVpcmU7XG4gICAgdmFyIHZlcnR4ID0gcigndmVydHgnKTtcbiAgICB2ZXJ0eE5leHQgPSB2ZXJ0eC5ydW5Pbkxvb3AgfHwgdmVydHgucnVuT25Db250ZXh0O1xuICAgIHJldHVybiB1c2VWZXJ0eFRpbWVyKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gdXNlU2V0VGltZW91dCgpO1xuICB9XG59XG5cbnZhciBzY2hlZHVsZUZsdXNoID0gdW5kZWZpbmVkO1xuLy8gRGVjaWRlIHdoYXQgYXN5bmMgbWV0aG9kIHRvIHVzZSB0byB0cmlnZ2VyaW5nIHByb2Nlc3Npbmcgb2YgcXVldWVkIGNhbGxiYWNrczpcbmlmIChpc05vZGUpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZU5leHRUaWNrKCk7XG59IGVsc2UgaWYgKEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VNdXRhdGlvbk9ic2VydmVyKCk7XG59IGVsc2UgaWYgKGlzV29ya2VyKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VNZXNzYWdlQ2hhbm5lbCgpO1xufSBlbHNlIGlmIChicm93c2VyV2luZG93ID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIHJlcXVpcmUgPT09ICdmdW5jdGlvbicpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IGF0dGVtcHRWZXJ0eCgpO1xufSBlbHNlIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZVNldFRpbWVvdXQoKTtcbn1cblxuZnVuY3Rpb24gdGhlbihvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICB2YXIgX2FyZ3VtZW50cyA9IGFyZ3VtZW50cztcblxuICB2YXIgcGFyZW50ID0gdGhpcztcblxuICB2YXIgY2hpbGQgPSBuZXcgdGhpcy5jb25zdHJ1Y3Rvcihub29wKTtcblxuICBpZiAoY2hpbGRbUFJPTUlTRV9JRF0gPT09IHVuZGVmaW5lZCkge1xuICAgIG1ha2VQcm9taXNlKGNoaWxkKTtcbiAgfVxuXG4gIHZhciBfc3RhdGUgPSBwYXJlbnQuX3N0YXRlO1xuXG4gIGlmIChfc3RhdGUpIHtcbiAgICAoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGNhbGxiYWNrID0gX2FyZ3VtZW50c1tfc3RhdGUgLSAxXTtcbiAgICAgIGFzYXAoZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gaW52b2tlQ2FsbGJhY2soX3N0YXRlLCBjaGlsZCwgY2FsbGJhY2ssIHBhcmVudC5fcmVzdWx0KTtcbiAgICAgIH0pO1xuICAgIH0pKCk7XG4gIH0gZWxzZSB7XG4gICAgc3Vic2NyaWJlKHBhcmVudCwgY2hpbGQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKTtcbiAgfVxuXG4gIHJldHVybiBjaGlsZDtcbn1cblxuLyoqXG4gIGBQcm9taXNlLnJlc29sdmVgIHJldHVybnMgYSBwcm9taXNlIHRoYXQgd2lsbCBiZWNvbWUgcmVzb2x2ZWQgd2l0aCB0aGVcbiAgcGFzc2VkIGB2YWx1ZWAuIEl0IGlzIHNob3J0aGFuZCBmb3IgdGhlIGZvbGxvd2luZzpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICByZXNvbHZlKDEpO1xuICB9KTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIHZhbHVlID09PSAxXG4gIH0pO1xuICBgYGBcblxuICBJbnN0ZWFkIG9mIHdyaXRpbmcgdGhlIGFib3ZlLCB5b3VyIGNvZGUgbm93IHNpbXBseSBiZWNvbWVzIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgxKTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIHZhbHVlID09PSAxXG4gIH0pO1xuICBgYGBcblxuICBAbWV0aG9kIHJlc29sdmVcbiAgQHN0YXRpY1xuICBAcGFyYW0ge0FueX0gdmFsdWUgdmFsdWUgdGhhdCB0aGUgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIGJlIHJlc29sdmVkIHdpdGhcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2UgdGhhdCB3aWxsIGJlY29tZSBmdWxmaWxsZWQgd2l0aCB0aGUgZ2l2ZW5cbiAgYHZhbHVlYFxuKi9cbmZ1bmN0aW9uIHJlc29sdmUob2JqZWN0KSB7XG4gIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cbiAgaWYgKG9iamVjdCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJiBvYmplY3QuY29uc3RydWN0b3IgPT09IENvbnN0cnVjdG9yKSB7XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuXG4gIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKG5vb3ApO1xuICBfcmVzb2x2ZShwcm9taXNlLCBvYmplY3QpO1xuICByZXR1cm4gcHJvbWlzZTtcbn1cblxudmFyIFBST01JU0VfSUQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoMTYpO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxudmFyIFBFTkRJTkcgPSB2b2lkIDA7XG52YXIgRlVMRklMTEVEID0gMTtcbnZhciBSRUpFQ1RFRCA9IDI7XG5cbnZhciBHRVRfVEhFTl9FUlJPUiA9IG5ldyBFcnJvck9iamVjdCgpO1xuXG5mdW5jdGlvbiBzZWxmRnVsZmlsbG1lbnQoKSB7XG4gIHJldHVybiBuZXcgVHlwZUVycm9yKFwiWW91IGNhbm5vdCByZXNvbHZlIGEgcHJvbWlzZSB3aXRoIGl0c2VsZlwiKTtcbn1cblxuZnVuY3Rpb24gY2Fubm90UmV0dXJuT3duKCkge1xuICByZXR1cm4gbmV3IFR5cGVFcnJvcignQSBwcm9taXNlcyBjYWxsYmFjayBjYW5ub3QgcmV0dXJuIHRoYXQgc2FtZSBwcm9taXNlLicpO1xufVxuXG5mdW5jdGlvbiBnZXRUaGVuKHByb21pc2UpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gcHJvbWlzZS50aGVuO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIEdFVF9USEVOX0VSUk9SLmVycm9yID0gZXJyb3I7XG4gICAgcmV0dXJuIEdFVF9USEVOX0VSUk9SO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRyeVRoZW4odGhlbiwgdmFsdWUsIGZ1bGZpbGxtZW50SGFuZGxlciwgcmVqZWN0aW9uSGFuZGxlcikge1xuICB0cnkge1xuICAgIHRoZW4uY2FsbCh2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCB0aGVuYWJsZSwgdGhlbikge1xuICBhc2FwKGZ1bmN0aW9uIChwcm9taXNlKSB7XG4gICAgdmFyIHNlYWxlZCA9IGZhbHNlO1xuICAgIHZhciBlcnJvciA9IHRyeVRoZW4odGhlbiwgdGhlbmFibGUsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgaWYgKHNlYWxlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzZWFsZWQgPSB0cnVlO1xuICAgICAgaWYgKHRoZW5hYmxlICE9PSB2YWx1ZSkge1xuICAgICAgICBfcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICBpZiAoc2VhbGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNlYWxlZCA9IHRydWU7XG5cbiAgICAgIF9yZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICB9LCAnU2V0dGxlOiAnICsgKHByb21pc2UuX2xhYmVsIHx8ICcgdW5rbm93biBwcm9taXNlJykpO1xuXG4gICAgaWYgKCFzZWFsZWQgJiYgZXJyb3IpIHtcbiAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICBfcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICB9XG4gIH0sIHByb21pc2UpO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVPd25UaGVuYWJsZShwcm9taXNlLCB0aGVuYWJsZSkge1xuICBpZiAodGhlbmFibGUuX3N0YXRlID09PSBGVUxGSUxMRUQpIHtcbiAgICBmdWxmaWxsKHByb21pc2UsIHRoZW5hYmxlLl9yZXN1bHQpO1xuICB9IGVsc2UgaWYgKHRoZW5hYmxlLl9zdGF0ZSA9PT0gUkVKRUNURUQpIHtcbiAgICBfcmVqZWN0KHByb21pc2UsIHRoZW5hYmxlLl9yZXN1bHQpO1xuICB9IGVsc2Uge1xuICAgIHN1YnNjcmliZSh0aGVuYWJsZSwgdW5kZWZpbmVkLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiBfcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgcmV0dXJuIF9yZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUsIHRoZW4kJCkge1xuICBpZiAobWF5YmVUaGVuYWJsZS5jb25zdHJ1Y3RvciA9PT0gcHJvbWlzZS5jb25zdHJ1Y3RvciAmJiB0aGVuJCQgPT09IHRoZW4gJiYgbWF5YmVUaGVuYWJsZS5jb25zdHJ1Y3Rvci5yZXNvbHZlID09PSByZXNvbHZlKSB7XG4gICAgaGFuZGxlT3duVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHRoZW4kJCA9PT0gR0VUX1RIRU5fRVJST1IpIHtcbiAgICAgIF9yZWplY3QocHJvbWlzZSwgR0VUX1RIRU5fRVJST1IuZXJyb3IpO1xuICAgIH0gZWxzZSBpZiAodGhlbiQkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGZ1bGZpbGwocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gICAgfSBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoZW4kJCkpIHtcbiAgICAgIGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlLCB0aGVuJCQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBfcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSkge1xuICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICBfcmVqZWN0KHByb21pc2UsIHNlbGZGdWxmaWxsbWVudCgpKTtcbiAgfSBlbHNlIGlmIChvYmplY3RPckZ1bmN0aW9uKHZhbHVlKSkge1xuICAgIGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgdmFsdWUsIGdldFRoZW4odmFsdWUpKTtcbiAgfSBlbHNlIHtcbiAgICBmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwdWJsaXNoUmVqZWN0aW9uKHByb21pc2UpIHtcbiAgaWYgKHByb21pc2UuX29uZXJyb3IpIHtcbiAgICBwcm9taXNlLl9vbmVycm9yKHByb21pc2UuX3Jlc3VsdCk7XG4gIH1cblxuICBwdWJsaXNoKHByb21pc2UpO1xufVxuXG5mdW5jdGlvbiBmdWxmaWxsKHByb21pc2UsIHZhbHVlKSB7XG4gIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gUEVORElORykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHByb21pc2UuX3Jlc3VsdCA9IHZhbHVlO1xuICBwcm9taXNlLl9zdGF0ZSA9IEZVTEZJTExFRDtcblxuICBpZiAocHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoICE9PSAwKSB7XG4gICAgYXNhcChwdWJsaXNoLCBwcm9taXNlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBfcmVqZWN0KHByb21pc2UsIHJlYXNvbikge1xuICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IFBFTkRJTkcpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgcHJvbWlzZS5fc3RhdGUgPSBSRUpFQ1RFRDtcbiAgcHJvbWlzZS5fcmVzdWx0ID0gcmVhc29uO1xuXG4gIGFzYXAocHVibGlzaFJlamVjdGlvbiwgcHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICB2YXIgX3N1YnNjcmliZXJzID0gcGFyZW50Ll9zdWJzY3JpYmVycztcbiAgdmFyIGxlbmd0aCA9IF9zdWJzY3JpYmVycy5sZW5ndGg7XG5cbiAgcGFyZW50Ll9vbmVycm9yID0gbnVsbDtcblxuICBfc3Vic2NyaWJlcnNbbGVuZ3RoXSA9IGNoaWxkO1xuICBfc3Vic2NyaWJlcnNbbGVuZ3RoICsgRlVMRklMTEVEXSA9IG9uRnVsZmlsbG1lbnQ7XG4gIF9zdWJzY3JpYmVyc1tsZW5ndGggKyBSRUpFQ1RFRF0gPSBvblJlamVjdGlvbjtcblxuICBpZiAobGVuZ3RoID09PSAwICYmIHBhcmVudC5fc3RhdGUpIHtcbiAgICBhc2FwKHB1Ymxpc2gsIHBhcmVudCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHVibGlzaChwcm9taXNlKSB7XG4gIHZhciBzdWJzY3JpYmVycyA9IHByb21pc2UuX3N1YnNjcmliZXJzO1xuICB2YXIgc2V0dGxlZCA9IHByb21pc2UuX3N0YXRlO1xuXG4gIGlmIChzdWJzY3JpYmVycy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgY2hpbGQgPSB1bmRlZmluZWQsXG4gICAgICBjYWxsYmFjayA9IHVuZGVmaW5lZCxcbiAgICAgIGRldGFpbCA9IHByb21pc2UuX3Jlc3VsdDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YnNjcmliZXJzLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgY2hpbGQgPSBzdWJzY3JpYmVyc1tpXTtcbiAgICBjYWxsYmFjayA9IHN1YnNjcmliZXJzW2kgKyBzZXR0bGVkXTtcblxuICAgIGlmIChjaGlsZCkge1xuICAgICAgaW52b2tlQ2FsbGJhY2soc2V0dGxlZCwgY2hpbGQsIGNhbGxiYWNrLCBkZXRhaWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFjayhkZXRhaWwpO1xuICAgIH1cbiAgfVxuXG4gIHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCA9IDA7XG59XG5cbmZ1bmN0aW9uIEVycm9yT2JqZWN0KCkge1xuICB0aGlzLmVycm9yID0gbnVsbDtcbn1cblxudmFyIFRSWV9DQVRDSF9FUlJPUiA9IG5ldyBFcnJvck9iamVjdCgpO1xuXG5mdW5jdGlvbiB0cnlDYXRjaChjYWxsYmFjaywgZGV0YWlsKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrKGRldGFpbCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBUUllfQ0FUQ0hfRVJST1IuZXJyb3IgPSBlO1xuICAgIHJldHVybiBUUllfQ0FUQ0hfRVJST1I7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW52b2tlQ2FsbGJhY2soc2V0dGxlZCwgcHJvbWlzZSwgY2FsbGJhY2ssIGRldGFpbCkge1xuICB2YXIgaGFzQ2FsbGJhY2sgPSBpc0Z1bmN0aW9uKGNhbGxiYWNrKSxcbiAgICAgIHZhbHVlID0gdW5kZWZpbmVkLFxuICAgICAgZXJyb3IgPSB1bmRlZmluZWQsXG4gICAgICBzdWNjZWVkZWQgPSB1bmRlZmluZWQsXG4gICAgICBmYWlsZWQgPSB1bmRlZmluZWQ7XG5cbiAgaWYgKGhhc0NhbGxiYWNrKSB7XG4gICAgdmFsdWUgPSB0cnlDYXRjaChjYWxsYmFjaywgZGV0YWlsKTtcblxuICAgIGlmICh2YWx1ZSA9PT0gVFJZX0NBVENIX0VSUk9SKSB7XG4gICAgICBmYWlsZWQgPSB0cnVlO1xuICAgICAgZXJyb3IgPSB2YWx1ZS5lcnJvcjtcbiAgICAgIHZhbHVlID0gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgIF9yZWplY3QocHJvbWlzZSwgY2Fubm90UmV0dXJuT3duKCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YWx1ZSA9IGRldGFpbDtcbiAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICB9XG5cbiAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBQRU5ESU5HKSB7XG4gICAgLy8gbm9vcFxuICB9IGVsc2UgaWYgKGhhc0NhbGxiYWNrICYmIHN1Y2NlZWRlZCkge1xuICAgICAgX3Jlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgIH0gZWxzZSBpZiAoZmFpbGVkKSB7XG4gICAgICBfcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICB9IGVsc2UgaWYgKHNldHRsZWQgPT09IEZVTEZJTExFRCkge1xuICAgICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgfSBlbHNlIGlmIChzZXR0bGVkID09PSBSRUpFQ1RFRCkge1xuICAgICAgX3JlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBpbml0aWFsaXplUHJvbWlzZShwcm9taXNlLCByZXNvbHZlcikge1xuICB0cnkge1xuICAgIHJlc29sdmVyKGZ1bmN0aW9uIHJlc29sdmVQcm9taXNlKHZhbHVlKSB7XG4gICAgICBfcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgfSwgZnVuY3Rpb24gcmVqZWN0UHJvbWlzZShyZWFzb24pIHtcbiAgICAgIF9yZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIF9yZWplY3QocHJvbWlzZSwgZSk7XG4gIH1cbn1cblxudmFyIGlkID0gMDtcbmZ1bmN0aW9uIG5leHRJZCgpIHtcbiAgcmV0dXJuIGlkKys7XG59XG5cbmZ1bmN0aW9uIG1ha2VQcm9taXNlKHByb21pc2UpIHtcbiAgcHJvbWlzZVtQUk9NSVNFX0lEXSA9IGlkKys7XG4gIHByb21pc2UuX3N0YXRlID0gdW5kZWZpbmVkO1xuICBwcm9taXNlLl9yZXN1bHQgPSB1bmRlZmluZWQ7XG4gIHByb21pc2UuX3N1YnNjcmliZXJzID0gW107XG59XG5cbmZ1bmN0aW9uIEVudW1lcmF0b3IoQ29uc3RydWN0b3IsIGlucHV0KSB7XG4gIHRoaXMuX2luc3RhbmNlQ29uc3RydWN0b3IgPSBDb25zdHJ1Y3RvcjtcbiAgdGhpcy5wcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKG5vb3ApO1xuXG4gIGlmICghdGhpcy5wcm9taXNlW1BST01JU0VfSURdKSB7XG4gICAgbWFrZVByb21pc2UodGhpcy5wcm9taXNlKTtcbiAgfVxuXG4gIGlmIChpc0FycmF5KGlucHV0KSkge1xuICAgIHRoaXMuX2lucHV0ID0gaW5wdXQ7XG4gICAgdGhpcy5sZW5ndGggPSBpbnB1dC5sZW5ndGg7XG4gICAgdGhpcy5fcmVtYWluaW5nID0gaW5wdXQubGVuZ3RoO1xuXG4gICAgdGhpcy5fcmVzdWx0ID0gbmV3IEFycmF5KHRoaXMubGVuZ3RoKTtcblxuICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZnVsZmlsbCh0aGlzLnByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubGVuZ3RoID0gdGhpcy5sZW5ndGggfHwgMDtcbiAgICAgIHRoaXMuX2VudW1lcmF0ZSgpO1xuICAgICAgaWYgKHRoaXMuX3JlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICBmdWxmaWxsKHRoaXMucHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgX3JlamVjdCh0aGlzLnByb21pc2UsIHZhbGlkYXRpb25FcnJvcigpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB2YWxpZGF0aW9uRXJyb3IoKSB7XG4gIHJldHVybiBuZXcgRXJyb3IoJ0FycmF5IE1ldGhvZHMgbXVzdCBiZSBwcm92aWRlZCBhbiBBcnJheScpO1xufTtcblxuRW51bWVyYXRvci5wcm90b3R5cGUuX2VudW1lcmF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoO1xuICB2YXIgX2lucHV0ID0gdGhpcy5faW5wdXQ7XG5cbiAgZm9yICh2YXIgaSA9IDA7IHRoaXMuX3N0YXRlID09PSBQRU5ESU5HICYmIGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHRoaXMuX2VhY2hFbnRyeShfaW5wdXRbaV0sIGkpO1xuICB9XG59O1xuXG5FbnVtZXJhdG9yLnByb3RvdHlwZS5fZWFjaEVudHJ5ID0gZnVuY3Rpb24gKGVudHJ5LCBpKSB7XG4gIHZhciBjID0gdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvcjtcbiAgdmFyIHJlc29sdmUkJCA9IGMucmVzb2x2ZTtcblxuICBpZiAocmVzb2x2ZSQkID09PSByZXNvbHZlKSB7XG4gICAgdmFyIF90aGVuID0gZ2V0VGhlbihlbnRyeSk7XG5cbiAgICBpZiAoX3RoZW4gPT09IHRoZW4gJiYgZW50cnkuX3N0YXRlICE9PSBQRU5ESU5HKSB7XG4gICAgICB0aGlzLl9zZXR0bGVkQXQoZW50cnkuX3N0YXRlLCBpLCBlbnRyeS5fcmVzdWx0KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBfdGhlbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fcmVtYWluaW5nLS07XG4gICAgICB0aGlzLl9yZXN1bHRbaV0gPSBlbnRyeTtcbiAgICB9IGVsc2UgaWYgKGMgPT09IFByb21pc2UpIHtcbiAgICAgIHZhciBwcm9taXNlID0gbmV3IGMobm9vcCk7XG4gICAgICBoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIGVudHJ5LCBfdGhlbik7XG4gICAgICB0aGlzLl93aWxsU2V0dGxlQXQocHJvbWlzZSwgaSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3dpbGxTZXR0bGVBdChuZXcgYyhmdW5jdGlvbiAocmVzb2x2ZSQkKSB7XG4gICAgICAgIHJldHVybiByZXNvbHZlJCQoZW50cnkpO1xuICAgICAgfSksIGkpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aGlzLl93aWxsU2V0dGxlQXQocmVzb2x2ZSQkKGVudHJ5KSwgaSk7XG4gIH1cbn07XG5cbkVudW1lcmF0b3IucHJvdG90eXBlLl9zZXR0bGVkQXQgPSBmdW5jdGlvbiAoc3RhdGUsIGksIHZhbHVlKSB7XG4gIHZhciBwcm9taXNlID0gdGhpcy5wcm9taXNlO1xuXG4gIGlmIChwcm9taXNlLl9zdGF0ZSA9PT0gUEVORElORykge1xuICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuXG4gICAgaWYgKHN0YXRlID09PSBSRUpFQ1RFRCkge1xuICAgICAgX3JlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3Jlc3VsdFtpXSA9IHZhbHVlO1xuICAgIH1cbiAgfVxuXG4gIGlmICh0aGlzLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICBmdWxmaWxsKHByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gIH1cbn07XG5cbkVudW1lcmF0b3IucHJvdG90eXBlLl93aWxsU2V0dGxlQXQgPSBmdW5jdGlvbiAocHJvbWlzZSwgaSkge1xuICB2YXIgZW51bWVyYXRvciA9IHRoaXM7XG5cbiAgc3Vic2NyaWJlKHByb21pc2UsIHVuZGVmaW5lZCwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIGVudW1lcmF0b3IuX3NldHRsZWRBdChGVUxGSUxMRUQsIGksIHZhbHVlKTtcbiAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHJldHVybiBlbnVtZXJhdG9yLl9zZXR0bGVkQXQoUkVKRUNURUQsIGksIHJlYXNvbik7XG4gIH0pO1xufTtcblxuLyoqXG4gIGBQcm9taXNlLmFsbGAgYWNjZXB0cyBhbiBhcnJheSBvZiBwcm9taXNlcywgYW5kIHJldHVybnMgYSBuZXcgcHJvbWlzZSB3aGljaFxuICBpcyBmdWxmaWxsZWQgd2l0aCBhbiBhcnJheSBvZiBmdWxmaWxsbWVudCB2YWx1ZXMgZm9yIHRoZSBwYXNzZWQgcHJvbWlzZXMsIG9yXG4gIHJlamVjdGVkIHdpdGggdGhlIHJlYXNvbiBvZiB0aGUgZmlyc3QgcGFzc2VkIHByb21pc2UgdG8gYmUgcmVqZWN0ZWQuIEl0IGNhc3RzIGFsbFxuICBlbGVtZW50cyBvZiB0aGUgcGFzc2VkIGl0ZXJhYmxlIHRvIHByb21pc2VzIGFzIGl0IHJ1bnMgdGhpcyBhbGdvcml0aG0uXG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlMSA9IHJlc29sdmUoMSk7XG4gIGxldCBwcm9taXNlMiA9IHJlc29sdmUoMik7XG4gIGxldCBwcm9taXNlMyA9IHJlc29sdmUoMyk7XG4gIGxldCBwcm9taXNlcyA9IFsgcHJvbWlzZTEsIHByb21pc2UyLCBwcm9taXNlMyBdO1xuXG4gIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uKGFycmF5KXtcbiAgICAvLyBUaGUgYXJyYXkgaGVyZSB3b3VsZCBiZSBbIDEsIDIsIDMgXTtcbiAgfSk7XG4gIGBgYFxuXG4gIElmIGFueSBvZiB0aGUgYHByb21pc2VzYCBnaXZlbiB0byBgYWxsYCBhcmUgcmVqZWN0ZWQsIHRoZSBmaXJzdCBwcm9taXNlXG4gIHRoYXQgaXMgcmVqZWN0ZWQgd2lsbCBiZSBnaXZlbiBhcyBhbiBhcmd1bWVudCB0byB0aGUgcmV0dXJuZWQgcHJvbWlzZXMnc1xuICByZWplY3Rpb24gaGFuZGxlci4gRm9yIGV4YW1wbGU6XG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlMSA9IHJlc29sdmUoMSk7XG4gIGxldCBwcm9taXNlMiA9IHJlamVjdChuZXcgRXJyb3IoXCIyXCIpKTtcbiAgbGV0IHByb21pc2UzID0gcmVqZWN0KG5ldyBFcnJvcihcIjNcIikpO1xuICBsZXQgcHJvbWlzZXMgPSBbIHByb21pc2UxLCBwcm9taXNlMiwgcHJvbWlzZTMgXTtcblxuICBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbihhcnJheSl7XG4gICAgLy8gQ29kZSBoZXJlIG5ldmVyIHJ1bnMgYmVjYXVzZSB0aGVyZSBhcmUgcmVqZWN0ZWQgcHJvbWlzZXMhXG4gIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgLy8gZXJyb3IubWVzc2FnZSA9PT0gXCIyXCJcbiAgfSk7XG4gIGBgYFxuXG4gIEBtZXRob2QgYWxsXG4gIEBzdGF0aWNcbiAgQHBhcmFtIHtBcnJheX0gZW50cmllcyBhcnJheSBvZiBwcm9taXNlc1xuICBAcGFyYW0ge1N0cmluZ30gbGFiZWwgb3B0aW9uYWwgc3RyaW5nIGZvciBsYWJlbGluZyB0aGUgcHJvbWlzZS5cbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdoZW4gYWxsIGBwcm9taXNlc2AgaGF2ZSBiZWVuXG4gIGZ1bGZpbGxlZCwgb3IgcmVqZWN0ZWQgaWYgYW55IG9mIHRoZW0gYmVjb21lIHJlamVjdGVkLlxuICBAc3RhdGljXG4qL1xuZnVuY3Rpb24gYWxsKGVudHJpZXMpIHtcbiAgcmV0dXJuIG5ldyBFbnVtZXJhdG9yKHRoaXMsIGVudHJpZXMpLnByb21pc2U7XG59XG5cbi8qKlxuICBgUHJvbWlzZS5yYWNlYCByZXR1cm5zIGEgbmV3IHByb21pc2Ugd2hpY2ggaXMgc2V0dGxlZCBpbiB0aGUgc2FtZSB3YXkgYXMgdGhlXG4gIGZpcnN0IHBhc3NlZCBwcm9taXNlIHRvIHNldHRsZS5cblxuICBFeGFtcGxlOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UxID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZXNvbHZlKCdwcm9taXNlIDEnKTtcbiAgICB9LCAyMDApO1xuICB9KTtcblxuICBsZXQgcHJvbWlzZTIgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoJ3Byb21pc2UgMicpO1xuICAgIH0sIDEwMCk7XG4gIH0pO1xuXG4gIFByb21pc2UucmFjZShbcHJvbWlzZTEsIHByb21pc2UyXSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIHJlc3VsdCA9PT0gJ3Byb21pc2UgMicgYmVjYXVzZSBpdCB3YXMgcmVzb2x2ZWQgYmVmb3JlIHByb21pc2UxXG4gICAgLy8gd2FzIHJlc29sdmVkLlxuICB9KTtcbiAgYGBgXG5cbiAgYFByb21pc2UucmFjZWAgaXMgZGV0ZXJtaW5pc3RpYyBpbiB0aGF0IG9ubHkgdGhlIHN0YXRlIG9mIHRoZSBmaXJzdFxuICBzZXR0bGVkIHByb21pc2UgbWF0dGVycy4gRm9yIGV4YW1wbGUsIGV2ZW4gaWYgb3RoZXIgcHJvbWlzZXMgZ2l2ZW4gdG8gdGhlXG4gIGBwcm9taXNlc2AgYXJyYXkgYXJndW1lbnQgYXJlIHJlc29sdmVkLCBidXQgdGhlIGZpcnN0IHNldHRsZWQgcHJvbWlzZSBoYXNcbiAgYmVjb21lIHJlamVjdGVkIGJlZm9yZSB0aGUgb3RoZXIgcHJvbWlzZXMgYmVjYW1lIGZ1bGZpbGxlZCwgdGhlIHJldHVybmVkXG4gIHByb21pc2Ugd2lsbCBiZWNvbWUgcmVqZWN0ZWQ6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZTEgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoJ3Byb21pc2UgMScpO1xuICAgIH0sIDIwMCk7XG4gIH0pO1xuXG4gIGxldCBwcm9taXNlMiA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmVqZWN0KG5ldyBFcnJvcigncHJvbWlzZSAyJykpO1xuICAgIH0sIDEwMCk7XG4gIH0pO1xuXG4gIFByb21pc2UucmFjZShbcHJvbWlzZTEsIHByb21pc2UyXSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIENvZGUgaGVyZSBuZXZlciBydW5zXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gcmVhc29uLm1lc3NhZ2UgPT09ICdwcm9taXNlIDInIGJlY2F1c2UgcHJvbWlzZSAyIGJlY2FtZSByZWplY3RlZCBiZWZvcmVcbiAgICAvLyBwcm9taXNlIDEgYmVjYW1lIGZ1bGZpbGxlZFxuICB9KTtcbiAgYGBgXG5cbiAgQW4gZXhhbXBsZSByZWFsLXdvcmxkIHVzZSBjYXNlIGlzIGltcGxlbWVudGluZyB0aW1lb3V0czpcblxuICBgYGBqYXZhc2NyaXB0XG4gIFByb21pc2UucmFjZShbYWpheCgnZm9vLmpzb24nKSwgdGltZW91dCg1MDAwKV0pXG4gIGBgYFxuXG4gIEBtZXRob2QgcmFjZVxuICBAc3RhdGljXG4gIEBwYXJhbSB7QXJyYXl9IHByb21pc2VzIGFycmF5IG9mIHByb21pc2VzIHRvIG9ic2VydmVcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2Ugd2hpY2ggc2V0dGxlcyBpbiB0aGUgc2FtZSB3YXkgYXMgdGhlIGZpcnN0IHBhc3NlZFxuICBwcm9taXNlIHRvIHNldHRsZS5cbiovXG5mdW5jdGlvbiByYWNlKGVudHJpZXMpIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICBpZiAoIWlzQXJyYXkoZW50cmllcykpIHtcbiAgICByZXR1cm4gbmV3IENvbnN0cnVjdG9yKGZ1bmN0aW9uIChfLCByZWplY3QpIHtcbiAgICAgIHJldHVybiByZWplY3QobmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhbiBhcnJheSB0byByYWNlLicpKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IENvbnN0cnVjdG9yKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciBsZW5ndGggPSBlbnRyaWVzLmxlbmd0aDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgQ29uc3RydWN0b3IucmVzb2x2ZShlbnRyaWVzW2ldKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gIGBQcm9taXNlLnJlamVjdGAgcmV0dXJucyBhIHByb21pc2UgcmVqZWN0ZWQgd2l0aCB0aGUgcGFzc2VkIGByZWFzb25gLlxuICBJdCBpcyBzaG9ydGhhbmQgZm9yIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgcmVqZWN0KG5ldyBFcnJvcignV0hPT1BTJykpO1xuICB9KTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIENvZGUgaGVyZSBkb2Vzbid0IHJ1biBiZWNhdXNlIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICB9KTtcbiAgYGBgXG5cbiAgSW5zdGVhZCBvZiB3cml0aW5nIHRoZSBhYm92ZSwgeW91ciBjb2RlIG5vdyBzaW1wbHkgYmVjb21lcyB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UgPSBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ1dIT09QUycpKTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIENvZGUgaGVyZSBkb2Vzbid0IHJ1biBiZWNhdXNlIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCByZWplY3RcbiAgQHN0YXRpY1xuICBAcGFyYW0ge0FueX0gcmVhc29uIHZhbHVlIHRoYXQgdGhlIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZWplY3RlZCB3aXRoLlxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSByZWplY3RlZCB3aXRoIHRoZSBnaXZlbiBgcmVhc29uYC5cbiovXG5mdW5jdGlvbiByZWplY3QocmVhc29uKSB7XG4gIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG4gIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKG5vb3ApO1xuICBfcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gIHJldHVybiBwcm9taXNlO1xufVxuXG5mdW5jdGlvbiBuZWVkc1Jlc29sdmVyKCkge1xuICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGEgcmVzb2x2ZXIgZnVuY3Rpb24gYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBwcm9taXNlIGNvbnN0cnVjdG9yJyk7XG59XG5cbmZ1bmN0aW9uIG5lZWRzTmV3KCkge1xuICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRmFpbGVkIHRvIGNvbnN0cnVjdCAnUHJvbWlzZSc6IFBsZWFzZSB1c2UgdGhlICduZXcnIG9wZXJhdG9yLCB0aGlzIG9iamVjdCBjb25zdHJ1Y3RvciBjYW5ub3QgYmUgY2FsbGVkIGFzIGEgZnVuY3Rpb24uXCIpO1xufVxuXG4vKipcbiAgUHJvbWlzZSBvYmplY3RzIHJlcHJlc2VudCB0aGUgZXZlbnR1YWwgcmVzdWx0IG9mIGFuIGFzeW5jaHJvbm91cyBvcGVyYXRpb24uIFRoZVxuICBwcmltYXJ5IHdheSBvZiBpbnRlcmFjdGluZyB3aXRoIGEgcHJvbWlzZSBpcyB0aHJvdWdoIGl0cyBgdGhlbmAgbWV0aG9kLCB3aGljaFxuICByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZSdzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZSByZWFzb25cbiAgd2h5IHRoZSBwcm9taXNlIGNhbm5vdCBiZSBmdWxmaWxsZWQuXG5cbiAgVGVybWlub2xvZ3lcbiAgLS0tLS0tLS0tLS1cblxuICAtIGBwcm9taXNlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gd2l0aCBhIGB0aGVuYCBtZXRob2Qgd2hvc2UgYmVoYXZpb3IgY29uZm9ybXMgdG8gdGhpcyBzcGVjaWZpY2F0aW9uLlxuICAtIGB0aGVuYWJsZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHRoYXQgZGVmaW5lcyBhIGB0aGVuYCBtZXRob2QuXG4gIC0gYHZhbHVlYCBpcyBhbnkgbGVnYWwgSmF2YVNjcmlwdCB2YWx1ZSAoaW5jbHVkaW5nIHVuZGVmaW5lZCwgYSB0aGVuYWJsZSwgb3IgYSBwcm9taXNlKS5cbiAgLSBgZXhjZXB0aW9uYCBpcyBhIHZhbHVlIHRoYXQgaXMgdGhyb3duIHVzaW5nIHRoZSB0aHJvdyBzdGF0ZW1lbnQuXG4gIC0gYHJlYXNvbmAgaXMgYSB2YWx1ZSB0aGF0IGluZGljYXRlcyB3aHkgYSBwcm9taXNlIHdhcyByZWplY3RlZC5cbiAgLSBgc2V0dGxlZGAgdGhlIGZpbmFsIHJlc3Rpbmcgc3RhdGUgb2YgYSBwcm9taXNlLCBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuXG5cbiAgQSBwcm9taXNlIGNhbiBiZSBpbiBvbmUgb2YgdGhyZWUgc3RhdGVzOiBwZW5kaW5nLCBmdWxmaWxsZWQsIG9yIHJlamVjdGVkLlxuXG4gIFByb21pc2VzIHRoYXQgYXJlIGZ1bGZpbGxlZCBoYXZlIGEgZnVsZmlsbG1lbnQgdmFsdWUgYW5kIGFyZSBpbiB0aGUgZnVsZmlsbGVkXG4gIHN0YXRlLiAgUHJvbWlzZXMgdGhhdCBhcmUgcmVqZWN0ZWQgaGF2ZSBhIHJlamVjdGlvbiByZWFzb24gYW5kIGFyZSBpbiB0aGVcbiAgcmVqZWN0ZWQgc3RhdGUuICBBIGZ1bGZpbGxtZW50IHZhbHVlIGlzIG5ldmVyIGEgdGhlbmFibGUuXG5cbiAgUHJvbWlzZXMgY2FuIGFsc28gYmUgc2FpZCB0byAqcmVzb2x2ZSogYSB2YWx1ZS4gIElmIHRoaXMgdmFsdWUgaXMgYWxzbyBhXG4gIHByb21pc2UsIHRoZW4gdGhlIG9yaWdpbmFsIHByb21pc2UncyBzZXR0bGVkIHN0YXRlIHdpbGwgbWF0Y2ggdGhlIHZhbHVlJ3NcbiAgc2V0dGxlZCBzdGF0ZS4gIFNvIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgcmVqZWN0cyB3aWxsXG4gIGl0c2VsZiByZWplY3QsIGFuZCBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IGZ1bGZpbGxzIHdpbGxcbiAgaXRzZWxmIGZ1bGZpbGwuXG5cblxuICBCYXNpYyBVc2FnZTpcbiAgLS0tLS0tLS0tLS0tXG5cbiAgYGBganNcbiAgbGV0IHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAvLyBvbiBzdWNjZXNzXG4gICAgcmVzb2x2ZSh2YWx1ZSk7XG5cbiAgICAvLyBvbiBmYWlsdXJlXG4gICAgcmVqZWN0KHJlYXNvbik7XG4gIH0pO1xuXG4gIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgIC8vIG9uIGZ1bGZpbGxtZW50XG4gIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgIC8vIG9uIHJlamVjdGlvblxuICB9KTtcbiAgYGBgXG5cbiAgQWR2YW5jZWQgVXNhZ2U6XG4gIC0tLS0tLS0tLS0tLS0tLVxuXG4gIFByb21pc2VzIHNoaW5lIHdoZW4gYWJzdHJhY3RpbmcgYXdheSBhc3luY2hyb25vdXMgaW50ZXJhY3Rpb25zIHN1Y2ggYXNcbiAgYFhNTEh0dHBSZXF1ZXN0YHMuXG5cbiAgYGBganNcbiAgZnVuY3Rpb24gZ2V0SlNPTih1cmwpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICAgIGxldCB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgeGhyLm9wZW4oJ0dFVCcsIHVybCk7XG4gICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gaGFuZGxlcjtcbiAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnanNvbic7XG4gICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgIHhoci5zZW5kKCk7XG5cbiAgICAgIGZ1bmN0aW9uIGhhbmRsZXIoKSB7XG4gICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT09IHRoaXMuRE9ORSkge1xuICAgICAgICAgIGlmICh0aGlzLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICByZXNvbHZlKHRoaXMucmVzcG9uc2UpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdnZXRKU09OOiBgJyArIHVybCArICdgIGZhaWxlZCB3aXRoIHN0YXR1czogWycgKyB0aGlzLnN0YXR1cyArICddJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldEpTT04oJy9wb3N0cy5qc29uJykudGhlbihmdW5jdGlvbihqc29uKSB7XG4gICAgLy8gb24gZnVsZmlsbG1lbnRcbiAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgLy8gb24gcmVqZWN0aW9uXG4gIH0pO1xuICBgYGBcblxuICBVbmxpa2UgY2FsbGJhY2tzLCBwcm9taXNlcyBhcmUgZ3JlYXQgY29tcG9zYWJsZSBwcmltaXRpdmVzLlxuXG4gIGBgYGpzXG4gIFByb21pc2UuYWxsKFtcbiAgICBnZXRKU09OKCcvcG9zdHMnKSxcbiAgICBnZXRKU09OKCcvY29tbWVudHMnKVxuICBdKS50aGVuKGZ1bmN0aW9uKHZhbHVlcyl7XG4gICAgdmFsdWVzWzBdIC8vID0+IHBvc3RzSlNPTlxuICAgIHZhbHVlc1sxXSAvLyA9PiBjb21tZW50c0pTT05cblxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH0pO1xuICBgYGBcblxuICBAY2xhc3MgUHJvbWlzZVxuICBAcGFyYW0ge2Z1bmN0aW9ufSByZXNvbHZlclxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEBjb25zdHJ1Y3RvclxuKi9cbmZ1bmN0aW9uIFByb21pc2UocmVzb2x2ZXIpIHtcbiAgdGhpc1tQUk9NSVNFX0lEXSA9IG5leHRJZCgpO1xuICB0aGlzLl9yZXN1bHQgPSB0aGlzLl9zdGF0ZSA9IHVuZGVmaW5lZDtcbiAgdGhpcy5fc3Vic2NyaWJlcnMgPSBbXTtcblxuICBpZiAobm9vcCAhPT0gcmVzb2x2ZXIpIHtcbiAgICB0eXBlb2YgcmVzb2x2ZXIgIT09ICdmdW5jdGlvbicgJiYgbmVlZHNSZXNvbHZlcigpO1xuICAgIHRoaXMgaW5zdGFuY2VvZiBQcm9taXNlID8gaW5pdGlhbGl6ZVByb21pc2UodGhpcywgcmVzb2x2ZXIpIDogbmVlZHNOZXcoKTtcbiAgfVxufVxuXG5Qcm9taXNlLmFsbCA9IGFsbDtcblByb21pc2UucmFjZSA9IHJhY2U7XG5Qcm9taXNlLnJlc29sdmUgPSByZXNvbHZlO1xuUHJvbWlzZS5yZWplY3QgPSByZWplY3Q7XG5Qcm9taXNlLl9zZXRTY2hlZHVsZXIgPSBzZXRTY2hlZHVsZXI7XG5Qcm9taXNlLl9zZXRBc2FwID0gc2V0QXNhcDtcblByb21pc2UuX2FzYXAgPSBhc2FwO1xuXG5Qcm9taXNlLnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IFByb21pc2UsXG5cbiAgLyoqXG4gICAgVGhlIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsXG4gICAgd2hpY2ggcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2UncyBldmVudHVhbCB2YWx1ZSBvciB0aGVcbiAgICByZWFzb24gd2h5IHRoZSBwcm9taXNlIGNhbm5vdCBiZSBmdWxmaWxsZWQuXG4gIFxuICAgIGBgYGpzXG4gICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgLy8gdXNlciBpcyBhdmFpbGFibGVcbiAgICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgICAgLy8gdXNlciBpcyB1bmF2YWlsYWJsZSwgYW5kIHlvdSBhcmUgZ2l2ZW4gdGhlIHJlYXNvbiB3aHlcbiAgICB9KTtcbiAgICBgYGBcbiAgXG4gICAgQ2hhaW5pbmdcbiAgICAtLS0tLS0tLVxuICBcbiAgICBUaGUgcmV0dXJuIHZhbHVlIG9mIGB0aGVuYCBpcyBpdHNlbGYgYSBwcm9taXNlLiAgVGhpcyBzZWNvbmQsICdkb3duc3RyZWFtJ1xuICAgIHByb21pc2UgaXMgcmVzb2x2ZWQgd2l0aCB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmaXJzdCBwcm9taXNlJ3MgZnVsZmlsbG1lbnRcbiAgICBvciByZWplY3Rpb24gaGFuZGxlciwgb3IgcmVqZWN0ZWQgaWYgdGhlIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbi5cbiAgXG4gICAgYGBganNcbiAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgIHJldHVybiB1c2VyLm5hbWU7XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgcmV0dXJuICdkZWZhdWx0IG5hbWUnO1xuICAgIH0pLnRoZW4oZnVuY3Rpb24gKHVzZXJOYW1lKSB7XG4gICAgICAvLyBJZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHVzZXJOYW1lYCB3aWxsIGJlIHRoZSB1c2VyJ3MgbmFtZSwgb3RoZXJ3aXNlIGl0XG4gICAgICAvLyB3aWxsIGJlIGAnZGVmYXVsdCBuYW1lJ2BcbiAgICB9KTtcbiAgXG4gICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jyk7XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jyk7XG4gICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAvLyBpZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHJlYXNvbmAgd2lsbCBiZSAnRm91bmQgdXNlciwgYnV0IHN0aWxsIHVuaGFwcHknLlxuICAgICAgLy8gSWYgYGZpbmRVc2VyYCByZWplY3RlZCwgYHJlYXNvbmAgd2lsbCBiZSAnYGZpbmRVc2VyYCByZWplY3RlZCBhbmQgd2UncmUgdW5oYXBweScuXG4gICAgfSk7XG4gICAgYGBgXG4gICAgSWYgdGhlIGRvd25zdHJlYW0gcHJvbWlzZSBkb2VzIG5vdCBzcGVjaWZ5IGEgcmVqZWN0aW9uIGhhbmRsZXIsIHJlamVjdGlvbiByZWFzb25zIHdpbGwgYmUgcHJvcGFnYXRlZCBmdXJ0aGVyIGRvd25zdHJlYW0uXG4gIFxuICAgIGBgYGpzXG4gICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICB0aHJvdyBuZXcgUGVkYWdvZ2ljYWxFeGNlcHRpb24oJ1Vwc3RyZWFtIGVycm9yJyk7XG4gICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgIC8vIFRoZSBgUGVkZ2Fnb2NpYWxFeGNlcHRpb25gIGlzIHByb3BhZ2F0ZWQgYWxsIHRoZSB3YXkgZG93biB0byBoZXJlXG4gICAgfSk7XG4gICAgYGBgXG4gIFxuICAgIEFzc2ltaWxhdGlvblxuICAgIC0tLS0tLS0tLS0tLVxuICBcbiAgICBTb21ldGltZXMgdGhlIHZhbHVlIHlvdSB3YW50IHRvIHByb3BhZ2F0ZSB0byBhIGRvd25zdHJlYW0gcHJvbWlzZSBjYW4gb25seSBiZVxuICAgIHJldHJpZXZlZCBhc3luY2hyb25vdXNseS4gVGhpcyBjYW4gYmUgYWNoaWV2ZWQgYnkgcmV0dXJuaW5nIGEgcHJvbWlzZSBpbiB0aGVcbiAgICBmdWxmaWxsbWVudCBvciByZWplY3Rpb24gaGFuZGxlci4gVGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIHRoZW4gYmUgcGVuZGluZ1xuICAgIHVudGlsIHRoZSByZXR1cm5lZCBwcm9taXNlIGlzIHNldHRsZWQuIFRoaXMgaXMgY2FsbGVkICphc3NpbWlsYXRpb24qLlxuICBcbiAgICBgYGBqc1xuICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgcmV0dXJuIGZpbmRDb21tZW50c0J5QXV0aG9yKHVzZXIpO1xuICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNvbW1lbnRzKSB7XG4gICAgICAvLyBUaGUgdXNlcidzIGNvbW1lbnRzIGFyZSBub3cgYXZhaWxhYmxlXG4gICAgfSk7XG4gICAgYGBgXG4gIFxuICAgIElmIHRoZSBhc3NpbWxpYXRlZCBwcm9taXNlIHJlamVjdHMsIHRoZW4gdGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIGFsc28gcmVqZWN0LlxuICBcbiAgICBgYGBqc1xuICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgcmV0dXJuIGZpbmRDb21tZW50c0J5QXV0aG9yKHVzZXIpO1xuICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNvbW1lbnRzKSB7XG4gICAgICAvLyBJZiBgZmluZENvbW1lbnRzQnlBdXRob3JgIGZ1bGZpbGxzLCB3ZSdsbCBoYXZlIHRoZSB2YWx1ZSBoZXJlXG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgLy8gSWYgYGZpbmRDb21tZW50c0J5QXV0aG9yYCByZWplY3RzLCB3ZSdsbCBoYXZlIHRoZSByZWFzb24gaGVyZVxuICAgIH0pO1xuICAgIGBgYFxuICBcbiAgICBTaW1wbGUgRXhhbXBsZVxuICAgIC0tLS0tLS0tLS0tLS0tXG4gIFxuICAgIFN5bmNocm9ub3VzIEV4YW1wbGVcbiAgXG4gICAgYGBgamF2YXNjcmlwdFxuICAgIGxldCByZXN1bHQ7XG4gIFxuICAgIHRyeSB7XG4gICAgICByZXN1bHQgPSBmaW5kUmVzdWx0KCk7XG4gICAgICAvLyBzdWNjZXNzXG4gICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgIC8vIGZhaWx1cmVcbiAgICB9XG4gICAgYGBgXG4gIFxuICAgIEVycmJhY2sgRXhhbXBsZVxuICBcbiAgICBgYGBqc1xuICAgIGZpbmRSZXN1bHQoZnVuY3Rpb24ocmVzdWx0LCBlcnIpe1xuICAgICAgaWYgKGVycikge1xuICAgICAgICAvLyBmYWlsdXJlXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzdWNjZXNzXG4gICAgICB9XG4gICAgfSk7XG4gICAgYGBgXG4gIFxuICAgIFByb21pc2UgRXhhbXBsZTtcbiAgXG4gICAgYGBgamF2YXNjcmlwdFxuICAgIGZpbmRSZXN1bHQoKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAvLyBzdWNjZXNzXG4gICAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgIC8vIGZhaWx1cmVcbiAgICB9KTtcbiAgICBgYGBcbiAgXG4gICAgQWR2YW5jZWQgRXhhbXBsZVxuICAgIC0tLS0tLS0tLS0tLS0tXG4gIFxuICAgIFN5bmNocm9ub3VzIEV4YW1wbGVcbiAgXG4gICAgYGBgamF2YXNjcmlwdFxuICAgIGxldCBhdXRob3IsIGJvb2tzO1xuICBcbiAgICB0cnkge1xuICAgICAgYXV0aG9yID0gZmluZEF1dGhvcigpO1xuICAgICAgYm9va3MgID0gZmluZEJvb2tzQnlBdXRob3IoYXV0aG9yKTtcbiAgICAgIC8vIHN1Y2Nlc3NcbiAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgLy8gZmFpbHVyZVxuICAgIH1cbiAgICBgYGBcbiAgXG4gICAgRXJyYmFjayBFeGFtcGxlXG4gIFxuICAgIGBgYGpzXG4gIFxuICAgIGZ1bmN0aW9uIGZvdW5kQm9va3MoYm9va3MpIHtcbiAgXG4gICAgfVxuICBcbiAgICBmdW5jdGlvbiBmYWlsdXJlKHJlYXNvbikge1xuICBcbiAgICB9XG4gIFxuICAgIGZpbmRBdXRob3IoZnVuY3Rpb24oYXV0aG9yLCBlcnIpe1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICAgIC8vIGZhaWx1cmVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZmluZEJvb29rc0J5QXV0aG9yKGF1dGhvciwgZnVuY3Rpb24oYm9va3MsIGVycikge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGZvdW5kQm9va3MoYm9va3MpO1xuICAgICAgICAgICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAgICAgICAgIGZhaWx1cmUocmVhc29uKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgIH1cbiAgICB9KTtcbiAgICBgYGBcbiAgXG4gICAgUHJvbWlzZSBFeGFtcGxlO1xuICBcbiAgICBgYGBqYXZhc2NyaXB0XG4gICAgZmluZEF1dGhvcigpLlxuICAgICAgdGhlbihmaW5kQm9va3NCeUF1dGhvcikuXG4gICAgICB0aGVuKGZ1bmN0aW9uKGJvb2tzKXtcbiAgICAgICAgLy8gZm91bmQgYm9va3NcbiAgICB9KS5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICB9KTtcbiAgICBgYGBcbiAgXG4gICAgQG1ldGhvZCB0aGVuXG4gICAgQHBhcmFtIHtGdW5jdGlvbn0gb25GdWxmaWxsZWRcbiAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGVkXG4gICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgIEByZXR1cm4ge1Byb21pc2V9XG4gICovXG4gIHRoZW46IHRoZW4sXG5cbiAgLyoqXG4gICAgYGNhdGNoYCBpcyBzaW1wbHkgc3VnYXIgZm9yIGB0aGVuKHVuZGVmaW5lZCwgb25SZWplY3Rpb24pYCB3aGljaCBtYWtlcyBpdCB0aGUgc2FtZVxuICAgIGFzIHRoZSBjYXRjaCBibG9jayBvZiBhIHRyeS9jYXRjaCBzdGF0ZW1lbnQuXG4gIFxuICAgIGBgYGpzXG4gICAgZnVuY3Rpb24gZmluZEF1dGhvcigpe1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZG4ndCBmaW5kIHRoYXQgYXV0aG9yJyk7XG4gICAgfVxuICBcbiAgICAvLyBzeW5jaHJvbm91c1xuICAgIHRyeSB7XG4gICAgICBmaW5kQXV0aG9yKCk7XG4gICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgfVxuICBcbiAgICAvLyBhc3luYyB3aXRoIHByb21pc2VzXG4gICAgZmluZEF1dGhvcigpLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgIH0pO1xuICAgIGBgYFxuICBcbiAgICBAbWV0aG9kIGNhdGNoXG4gICAgQHBhcmFtIHtGdW5jdGlvbn0gb25SZWplY3Rpb25cbiAgICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gICAgQHJldHVybiB7UHJvbWlzZX1cbiAgKi9cbiAgJ2NhdGNoJzogZnVuY3Rpb24gX2NhdGNoKG9uUmVqZWN0aW9uKSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbihudWxsLCBvblJlamVjdGlvbik7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHBvbHlmaWxsKCkge1xuICAgIHZhciBsb2NhbCA9IHVuZGVmaW5lZDtcblxuICAgIGlmICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBsb2NhbCA9IGdsb2JhbDtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBsb2NhbCA9IHNlbGY7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxvY2FsID0gRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdwb2x5ZmlsbCBmYWlsZWQgYmVjYXVzZSBnbG9iYWwgb2JqZWN0IGlzIHVuYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnQnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBQID0gbG9jYWwuUHJvbWlzZTtcblxuICAgIGlmIChQKSB7XG4gICAgICAgIHZhciBwcm9taXNlVG9TdHJpbmcgPSBudWxsO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcHJvbWlzZVRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKFAucmVzb2x2ZSgpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gc2lsZW50bHkgaWdub3JlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb21pc2VUb1N0cmluZyA9PT0gJ1tvYmplY3QgUHJvbWlzZV0nICYmICFQLmNhc3QpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGxvY2FsLlByb21pc2UgPSBQcm9taXNlO1xufVxuXG5wb2x5ZmlsbCgpO1xuLy8gU3RyYW5nZSBjb21wYXQuLlxuUHJvbWlzZS5wb2x5ZmlsbCA9IHBvbHlmaWxsO1xuUHJvbWlzZS5Qcm9taXNlID0gUHJvbWlzZTtcblxucmV0dXJuIFByb21pc2U7XG5cbn0pKSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1lczYtcHJvbWlzZS5tYXBcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwibFlwb0kyXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIi8qZ2xvYmFscyBkZWZpbmUgKi9cbid1c2Ugc3RyaWN0JztcblxuXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gKHJvb3QuaHR0cHBsZWFzZXByb21pc2VzID0gZmFjdG9yeShyb290KSk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyb290KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByb290Lmh0dHBwbGVhc2Vwcm9taXNlcyA9IGZhY3Rvcnkocm9vdCk7XG4gICAgfVxufSh0aGlzLCBmdW5jdGlvbiAocm9vdCkgeyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICByZXR1cm4gZnVuY3Rpb24gKFByb21pc2UpIHtcbiAgICAgICAgUHJvbWlzZSA9IFByb21pc2UgfHwgcm9vdCAmJiByb290LlByb21pc2U7XG4gICAgICAgIGlmICghUHJvbWlzZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBQcm9taXNlIGltcGxlbWVudGF0aW9uIGZvdW5kLicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwcm9jZXNzUmVxdWVzdDogZnVuY3Rpb24gKHJlcSkge1xuICAgICAgICAgICAgICAgIHZhciByZXNvbHZlLCByZWplY3QsXG4gICAgICAgICAgICAgICAgICAgIG9sZE9ubG9hZCA9IHJlcS5vbmxvYWQsXG4gICAgICAgICAgICAgICAgICAgIG9sZE9uZXJyb3IgPSByZXEub25lcnJvcixcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlID0gYTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCA9IGI7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlcS5vbmxvYWQgPSBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvbGRPbmxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IG9sZE9ubG9hZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICBpZiAob2xkT25lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gb2xkT25lcnJvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmVxLnRoZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9taXNlLnRoZW4uYXBwbHkocHJvbWlzZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlcVsnY2F0Y2gnXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2VbJ2NhdGNoJ10uYXBwbHkocHJvbWlzZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH07XG59KSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZXNwb25zZSA9IHJlcXVpcmUoJy4vcmVzcG9uc2UnKTtcblxuZnVuY3Rpb24gUmVxdWVzdEVycm9yKG1lc3NhZ2UsIHByb3BzKSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgICBlcnIubmFtZSA9ICdSZXF1ZXN0RXJyb3InO1xuICAgIHRoaXMubmFtZSA9IGVyci5uYW1lO1xuICAgIHRoaXMubWVzc2FnZSA9IGVyci5tZXNzYWdlO1xuICAgIGlmIChlcnIuc3RhY2spIHtcbiAgICAgICAgdGhpcy5zdGFjayA9IGVyci5zdGFjaztcbiAgICB9XG5cbiAgICB0aGlzLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tZXNzYWdlO1xuICAgIH07XG5cbiAgICBmb3IgKHZhciBrIGluIHByb3BzKSB7XG4gICAgICAgIGlmIChwcm9wcy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgdGhpc1trXSA9IHByb3BzW2tdO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5SZXF1ZXN0RXJyb3IucHJvdG90eXBlID0gRXJyb3IucHJvdG90eXBlO1xuXG5SZXF1ZXN0RXJyb3IuY3JlYXRlID0gZnVuY3Rpb24gKG1lc3NhZ2UsIHJlcSwgcHJvcHMpIHtcbiAgICB2YXIgZXJyID0gbmV3IFJlcXVlc3RFcnJvcihtZXNzYWdlLCBwcm9wcyk7XG4gICAgUmVzcG9uc2UuY2FsbChlcnIsIHJlcSk7XG4gICAgcmV0dXJuIGVycjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUmVxdWVzdEVycm9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaSxcbiAgICBjbGVhblVSTCA9IHJlcXVpcmUoJy4uL3BsdWdpbnMvY2xlYW51cmwnKSxcbiAgICBYSFIgPSByZXF1aXJlKCcuL3hocicpLFxuICAgIGRlbGF5ID0gcmVxdWlyZSgnLi91dGlscy9kZWxheScpLFxuICAgIGNyZWF0ZUVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpLmNyZWF0ZSxcbiAgICBSZXNwb25zZSA9IHJlcXVpcmUoJy4vcmVzcG9uc2UnKSxcbiAgICBSZXF1ZXN0ID0gcmVxdWlyZSgnLi9yZXF1ZXN0JyksXG4gICAgZXh0ZW5kID0gcmVxdWlyZSgneHRlbmQnKSxcbiAgICBvbmNlID0gcmVxdWlyZSgnLi91dGlscy9vbmNlJyk7XG5cbmZ1bmN0aW9uIGZhY3RvcnkoZGVmYXVsdHMsIHBsdWdpbnMpIHtcbiAgICBkZWZhdWx0cyA9IGRlZmF1bHRzIHx8IHt9O1xuICAgIHBsdWdpbnMgPSBwbHVnaW5zIHx8IFtdO1xuXG4gICAgZnVuY3Rpb24gaHR0cChyZXEsIGNiKSB7XG4gICAgICAgIHZhciB4aHIsIHBsdWdpbiwgZG9uZSwgaywgdGltZW91dElkO1xuXG4gICAgICAgIHJlcSA9IG5ldyBSZXF1ZXN0KGV4dGVuZChkZWZhdWx0cywgcmVxKSk7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBsdWdpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBsdWdpbiA9IHBsdWdpbnNbaV07XG4gICAgICAgICAgICBpZiAocGx1Z2luLnByb2Nlc3NSZXF1ZXN0KSB7XG4gICAgICAgICAgICAgICAgcGx1Z2luLnByb2Nlc3NSZXF1ZXN0KHJlcSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHaXZlIHRoZSBwbHVnaW5zIGEgY2hhbmNlIHRvIGNyZWF0ZSB0aGUgWEhSIG9iamVjdFxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGx1Z2lucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcGx1Z2luID0gcGx1Z2luc1tpXTtcbiAgICAgICAgICAgIGlmIChwbHVnaW4uY3JlYXRlWEhSKSB7XG4gICAgICAgICAgICAgICAgeGhyID0gcGx1Z2luLmNyZWF0ZVhIUihyZXEpO1xuICAgICAgICAgICAgICAgIGJyZWFrOyAvLyBGaXJzdCBjb21lLCBmaXJzdCBzZXJ2ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHhociA9IHhociB8fCBuZXcgWEhSKCk7XG5cbiAgICAgICAgcmVxLnhociA9IHhocjtcblxuICAgICAgICAvLyBCZWNhdXNlIFhIUiBjYW4gYmUgYW4gWE1MSHR0cFJlcXVlc3Qgb3IgYW4gWERvbWFpblJlcXVlc3QsIHdlIGFkZFxuICAgICAgICAvLyBgb25yZWFkeXN0YXRlY2hhbmdlYCwgYG9ubG9hZGAsIGFuZCBgb25lcnJvcmAgY2FsbGJhY2tzLiBXZSB1c2UgdGhlXG4gICAgICAgIC8vIGBvbmNlYCB1dGlsIHRvIG1ha2Ugc3VyZSB0aGF0IG9ubHkgb25lIGlzIGNhbGxlZCAoYW5kIGl0J3Mgb25seSBjYWxsZWRcbiAgICAgICAgLy8gb25lIHRpbWUpLlxuICAgICAgICBkb25lID0gb25jZShkZWxheShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgICAgICAgIHhoci5vbmxvYWQgPSB4aHIub25lcnJvciA9IHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSB4aHIub250aW1lb3V0ID0geGhyLm9ucHJvZ3Jlc3MgPSBudWxsO1xuICAgICAgICAgICAgdmFyIHJlcyA9IGVyciAmJiBlcnIuaXNIdHRwRXJyb3IgPyBlcnIgOiBuZXcgUmVzcG9uc2UocmVxKTtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBwbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcGx1Z2luID0gcGx1Z2luc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAocGx1Z2luLnByb2Nlc3NSZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBwbHVnaW4ucHJvY2Vzc1Jlc3BvbnNlKHJlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChyZXEub25lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICByZXEub25lcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlcS5vbmxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVxLm9ubG9hZChyZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjYikge1xuICAgICAgICAgICAgICAgIGNiKGVyciwgcmVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuXG4gICAgICAgIC8vIFdoZW4gdGhlIHJlcXVlc3QgY29tcGxldGVzLCBjb250aW51ZS5cbiAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChyZXEudGltZWRPdXQpIHJldHVybjtcblxuICAgICAgICAgICAgaWYgKHJlcS5hYm9ydGVkKSB7XG4gICAgICAgICAgICAgICAgZG9uZShjcmVhdGVFcnJvcignUmVxdWVzdCBhYm9ydGVkJywgcmVxLCB7bmFtZTogJ0Fib3J0J30pKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IE1hdGguZmxvb3IoeGhyLnN0YXR1cyAvIDEwMCk7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGUgPT09IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoeGhyLnN0YXR1cyA9PT0gNDA0ICYmICFyZXEuZXJyb3JPbjQwNCkge1xuICAgICAgICAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtpbmQ7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQgPSAnQ2xpZW50JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgNTpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBraW5kID0gJ1NlcnZlcic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQgPSAnSFRUUCc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIG1zZyA9IGtpbmQgKyAnIEVycm9yOiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdUaGUgc2VydmVyIHJldHVybmVkIGEgc3RhdHVzIG9mICcgKyB4aHIuc3RhdHVzICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgZm9yIHRoZSByZXF1ZXN0IFwiJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXEubWV0aG9kLnRvVXBwZXJDYXNlKCkgKyAnICcgKyByZXEudXJsICsgJ1wiJztcbiAgICAgICAgICAgICAgICAgICAgZG9uZShjcmVhdGVFcnJvcihtc2csIHJlcSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBgb25sb2FkYCBpcyBvbmx5IGNhbGxlZCBvbiBzdWNjZXNzIGFuZCwgaW4gSUUsIHdpbGwgYmUgY2FsbGVkIHdpdGhvdXRcbiAgICAgICAgLy8gYHhoci5zdGF0dXNgIGhhdmluZyBiZWVuIHNldCwgc28gd2UgZG9uJ3QgY2hlY2sgaXQuXG4gICAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7IGRvbmUoKTsgfTtcblxuICAgICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRvbmUoY3JlYXRlRXJyb3IoJ0ludGVybmFsIFhIUiBFcnJvcicsIHJlcSkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIElFIHNvbWV0aW1lcyBmYWlscyBpZiB5b3UgZG9uJ3Qgc3BlY2lmeSBldmVyeSBoYW5kbGVyLlxuICAgICAgICAvLyBTZWUgaHR0cDovL3NvY2lhbC5tc2RuLm1pY3Jvc29mdC5jb20vRm9ydW1zL2llL2VuLVVTLzMwZWYzYWRkLTc2N2MtNDQzNi1iOGE5LWYxY2ExOWI0ODEyZS9pZTktcnRtLXhkb21haW5yZXF1ZXN0LWlzc3VlZC1yZXF1ZXN0cy1tYXktYWJvcnQtaWYtYWxsLWV2ZW50LWhhbmRsZXJzLW5vdC1zcGVjaWZpZWQ/Zm9ydW09aWV3ZWJkZXZlbG9wbWVudFxuICAgICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24gKCkgeyAvKiBub29wICovIH07XG4gICAgICAgIHhoci5vbnByb2dyZXNzID0gZnVuY3Rpb24gKCkgeyAvKiBub29wICovIH07XG5cbiAgICAgICAgeGhyLm9wZW4ocmVxLm1ldGhvZCwgcmVxLnVybCk7XG5cbiAgICAgICAgaWYgKHJlcS50aW1lb3V0KSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSB1c2UgdGhlIG5vcm1hbCBYSFIgdGltZW91dCBtZWNoYW5pc20gKGB4aHIudGltZW91dGAgYW5kXG4gICAgICAgICAgICAvLyBgeGhyLm9udGltZW91dGApLCBgb25yZWFkeXN0YXRlY2hhbmdlYCB3aWxsIGJlIHRyaWdnZXJlZCBiZWZvcmVcbiAgICAgICAgICAgIC8vIGBvbnRpbWVvdXRgLiBUaGVyZSdzIG5vIHdheSB0byByZWNvZ25pemUgdGhhdCBpdCB3YXMgdHJpZ2dlcmVkIGJ5XG4gICAgICAgICAgICAvLyBhIHRpbWVvdXQsIGFuZCB3ZSdkIGJlIHVuYWJsZSB0byBkaXNwYXRjaCB0aGUgcmlnaHQgZXJyb3IuXG4gICAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXEudGltZWRPdXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGRvbmUoY3JlYXRlRXJyb3IoJ1JlcXVlc3QgdGltZW91dCcsIHJlcSwge25hbWU6ICdUaW1lb3V0J30pKTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB4aHIuYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHt9XG4gICAgICAgICAgICB9LCByZXEudGltZW91dCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGsgaW4gcmVxLmhlYWRlcnMpIHtcbiAgICAgICAgICAgIGlmIChyZXEuaGVhZGVycy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGssIHJlcS5oZWFkZXJzW2tdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHhoci5zZW5kKHJlcS5ib2R5KTtcblxuICAgICAgICByZXR1cm4gcmVxO1xuICAgIH1cblxuICAgIHZhciBtZXRob2QsXG4gICAgICAgIG1ldGhvZHMgPSBbJ2dldCcsICdwb3N0JywgJ3B1dCcsICdoZWFkJywgJ3BhdGNoJywgJ2RlbGV0ZSddLFxuICAgICAgICB2ZXJiID0gZnVuY3Rpb24gKG1ldGhvZCkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChyZXEsIGNiKSB7XG4gICAgICAgICAgICAgICAgcmVxID0gbmV3IFJlcXVlc3QocmVxKTtcbiAgICAgICAgICAgICAgICByZXEubWV0aG9kID0gbWV0aG9kO1xuICAgICAgICAgICAgICAgIHJldHVybiBodHRwKHJlcSwgY2IpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbWV0aG9kcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBtZXRob2QgPSBtZXRob2RzW2ldO1xuICAgICAgICBodHRwW21ldGhvZF0gPSB2ZXJiKG1ldGhvZCk7XG4gICAgfVxuXG4gICAgaHR0cC5wbHVnaW5zID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gcGx1Z2lucztcbiAgICB9O1xuXG4gICAgaHR0cC5kZWZhdWx0cyA9IGZ1bmN0aW9uIChuZXdWYWx1ZXMpIHtcbiAgICAgICAgaWYgKG5ld1ZhbHVlcykge1xuICAgICAgICAgICAgcmV0dXJuIGZhY3RvcnkoZXh0ZW5kKGRlZmF1bHRzLCBuZXdWYWx1ZXMpLCBwbHVnaW5zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVmYXVsdHM7XG4gICAgfTtcblxuICAgIGh0dHAudXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbmV3UGx1Z2lucyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgICAgIHJldHVybiBmYWN0b3J5KGRlZmF1bHRzLCBwbHVnaW5zLmNvbmNhdChuZXdQbHVnaW5zKSk7XG4gICAgfTtcblxuICAgIGh0dHAuYmFyZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGZhY3RvcnkoKTtcbiAgICB9O1xuXG4gICAgaHR0cC5SZXF1ZXN0ID0gUmVxdWVzdDtcbiAgICBodHRwLlJlc3BvbnNlID0gUmVzcG9uc2U7XG5cbiAgICByZXR1cm4gaHR0cDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHt9LCBbY2xlYW5VUkxdKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gUmVxdWVzdChvcHRzT3JVcmwpIHtcbiAgICB2YXIgb3B0cyA9IHR5cGVvZiBvcHRzT3JVcmwgPT09ICdzdHJpbmcnID8ge3VybDogb3B0c09yVXJsfSA6IG9wdHNPclVybCB8fCB7fTtcbiAgICB0aGlzLm1ldGhvZCA9IG9wdHMubWV0aG9kID8gb3B0cy5tZXRob2QudG9VcHBlckNhc2UoKSA6ICdHRVQnO1xuICAgIHRoaXMudXJsID0gb3B0cy51cmw7XG4gICAgdGhpcy5oZWFkZXJzID0gb3B0cy5oZWFkZXJzIHx8IHt9O1xuICAgIHRoaXMuYm9keSA9IG9wdHMuYm9keTtcbiAgICB0aGlzLnRpbWVvdXQgPSBvcHRzLnRpbWVvdXQgfHwgMDtcbiAgICB0aGlzLmVycm9yT240MDQgPSBvcHRzLmVycm9yT240MDQgIT0gbnVsbCA/IG9wdHMuZXJyb3JPbjQwNCA6IHRydWU7XG4gICAgdGhpcy5vbmxvYWQgPSBvcHRzLm9ubG9hZDtcbiAgICB0aGlzLm9uZXJyb3IgPSBvcHRzLm9uZXJyb3I7XG59XG5cblJlcXVlc3QucHJvdG90eXBlLmFib3J0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmFib3J0ZWQpIHJldHVybjtcbiAgICB0aGlzLmFib3J0ZWQgPSB0cnVlO1xuICAgIHRoaXMueGhyLmFib3J0KCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5oZWFkZXIgPSBmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgICB2YXIgaztcbiAgICBmb3IgKGsgaW4gdGhpcy5oZWFkZXJzKSB7XG4gICAgICAgIGlmICh0aGlzLmhlYWRlcnMuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgIGlmIChuYW1lLnRvTG93ZXJDYXNlKCkgPT09IGsudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhlYWRlcnNba107XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuaGVhZGVyc1trXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgICB0aGlzLmhlYWRlcnNbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBSZXF1ZXN0O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVxdWVzdCA9IHJlcXVpcmUoJy4vcmVxdWVzdCcpO1xuXG5cbmZ1bmN0aW9uIFJlc3BvbnNlKHJlcSkge1xuICAgIHZhciBpLCBsaW5lcywgbSxcbiAgICAgICAgeGhyID0gcmVxLnhocjtcbiAgICB0aGlzLnJlcXVlc3QgPSByZXE7XG4gICAgdGhpcy54aHIgPSB4aHI7XG4gICAgdGhpcy5oZWFkZXJzID0ge307XG5cbiAgICAvLyBCcm93c2VycyBkb24ndCBsaWtlIHlvdSB0cnlpbmcgdG8gcmVhZCBYSFIgcHJvcGVydGllcyB3aGVuIHlvdSBhYm9ydCB0aGVcbiAgICAvLyByZXF1ZXN0LCBzbyB3ZSBkb24ndC5cbiAgICBpZiAocmVxLmFib3J0ZWQgfHwgcmVxLnRpbWVkT3V0KSByZXR1cm47XG5cbiAgICB0aGlzLnN0YXR1cyA9IHhoci5zdGF0dXMgfHwgMDtcbiAgICB0aGlzLnRleHQgPSB4aHIucmVzcG9uc2VUZXh0O1xuICAgIHRoaXMuYm9keSA9IHhoci5yZXNwb25zZSB8fCB4aHIucmVzcG9uc2VUZXh0O1xuICAgIHRoaXMuY29udGVudFR5cGUgPSB4aHIuY29udGVudFR5cGUgfHwgKHhoci5nZXRSZXNwb25zZUhlYWRlciAmJiB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ0NvbnRlbnQtVHlwZScpKTtcblxuICAgIGlmICh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKSB7XG4gICAgICAgIGxpbmVzID0geGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoKG0gPSBsaW5lc1tpXS5tYXRjaCgvXFxzKihbXlxcc10rKTpcXHMrKFteXFxzXSspLykpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oZWFkZXJzW21bMV1dID0gbVsyXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuaXNIdHRwRXJyb3IgPSB0aGlzLnN0YXR1cyA+PSA0MDA7XG59XG5cblJlc3BvbnNlLnByb3RvdHlwZS5oZWFkZXIgPSBSZXF1ZXN0LnByb3RvdHlwZS5oZWFkZXI7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBSZXNwb25zZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gV3JhcCBhIGZ1bmN0aW9uIGluIGEgYHNldFRpbWVvdXRgIGNhbGwuIFRoaXMgaXMgdXNlZCB0byBndWFyYW50ZWUgYXN5bmNcbi8vIGJlaGF2aW9yLCB3aGljaCBjYW4gYXZvaWQgdW5leHBlY3RlZCBlcnJvcnMuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyXG4gICAgICAgICAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSxcbiAgICAgICAgICAgIG5ld0Z1bmMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgc2V0VGltZW91dChuZXdGdW5jLCAwKTtcbiAgICB9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gQSBcIm9uY2VcIiB1dGlsaXR5LlxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICB2YXIgcmVzdWx0LCBjYWxsZWQgPSBmYWxzZTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIWNhbGxlZCkge1xuICAgICAgICAgICAgY2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gd2luZG93LlhNTEh0dHBSZXF1ZXN0O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxuZnVuY3Rpb24gZXh0ZW5kKCkge1xuICAgIHZhciB0YXJnZXQgPSB7fVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcHJvY2Vzc1JlcXVlc3Q6IGZ1bmN0aW9uIChyZXEpIHtcbiAgICAgICAgcmVxLnVybCA9IHJlcS51cmwucmVwbGFjZSgvW14lXSsvZywgZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgIHJldHVybiBlbmNvZGVVUkkocyk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBqc29ucmVxdWVzdCA9IHJlcXVpcmUoJy4vanNvbnJlcXVlc3QnKSxcbiAgICBqc29ucmVzcG9uc2UgPSByZXF1aXJlKCcuL2pzb25yZXNwb25zZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwcm9jZXNzUmVxdWVzdDogZnVuY3Rpb24gKHJlcSkge1xuICAgICAgICBqc29ucmVxdWVzdC5wcm9jZXNzUmVxdWVzdC5jYWxsKHRoaXMsIHJlcSk7XG4gICAgICAgIGpzb25yZXNwb25zZS5wcm9jZXNzUmVxdWVzdC5jYWxsKHRoaXMsIHJlcSk7XG4gICAgfSxcbiAgICBwcm9jZXNzUmVzcG9uc2U6IGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAganNvbnJlc3BvbnNlLnByb2Nlc3NSZXNwb25zZS5jYWxsKHRoaXMsIHJlcyk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcHJvY2Vzc1JlcXVlc3Q6IGZ1bmN0aW9uIChyZXEpIHtcbiAgICAgICAgdmFyXG4gICAgICAgICAgICBjb250ZW50VHlwZSA9IHJlcS5oZWFkZXIoJ0NvbnRlbnQtVHlwZScpLFxuICAgICAgICAgICAgaGFzSnNvbkNvbnRlbnRUeXBlID0gY29udGVudFR5cGUgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnRUeXBlLmluZGV4T2YoJ2FwcGxpY2F0aW9uL2pzb24nKSAhPT0gLTE7XG5cbiAgICAgICAgaWYgKGNvbnRlbnRUeXBlICE9IG51bGwgJiYgIWhhc0pzb25Db250ZW50VHlwZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlcS5ib2R5KSB7XG4gICAgICAgICAgICBpZiAoIWNvbnRlbnRUeXBlKSB7XG4gICAgICAgICAgICAgICAgcmVxLmhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVxLmJvZHkgPSBKU09OLnN0cmluZ2lmeShyZXEuYm9keSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwcm9jZXNzUmVxdWVzdDogZnVuY3Rpb24gKHJlcSkge1xuICAgICAgICB2YXIgYWNjZXB0ID0gcmVxLmhlYWRlcignQWNjZXB0Jyk7XG4gICAgICAgIGlmIChhY2NlcHQgPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVxLmhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcHJvY2Vzc1Jlc3BvbnNlOiBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgIC8vIENoZWNrIHRvIHNlZSBpZiB0aGUgY29udGVudHlwZSBpcyBcInNvbWV0aGluZy9qc29uXCIgb3JcbiAgICAgICAgLy8gXCJzb21ldGhpbmcvc29tZXRoaW5nZWxzZStqc29uXCJcbiAgICAgICAgaWYgKHJlcy5jb250ZW50VHlwZSAmJiAvXi4qXFwvKD86LipcXCspP2pzb24oO3wkKS9pLnRlc3QocmVzLmNvbnRlbnRUeXBlKSkge1xuICAgICAgICAgICAgdmFyIHJhdyA9IHR5cGVvZiByZXMuYm9keSA9PT0gJ3N0cmluZycgPyByZXMuYm9keSA6IHJlcy50ZXh0O1xuICAgICAgICAgICAgaWYgKHJhdykge1xuICAgICAgICAgICAgICAgIHJlcy5ib2R5ID0gSlNPTi5wYXJzZShyYXcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vc3JjL2FwaS5qc1wiKTtcbiIsInZhciBhcGkgPSBmdW5jdGlvbiAod2hvKSB7XG5cbiAgICB2YXIgX21ldGhvZHMgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBtID0gW107XG5cblx0bS5hZGRfYmF0Y2ggPSBmdW5jdGlvbiAob2JqKSB7XG5cdCAgICBtLnVuc2hpZnQob2JqKTtcblx0fTtcblxuXHRtLnVwZGF0ZSA9IGZ1bmN0aW9uIChtZXRob2QsIHZhbHVlKSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8bS5sZW5ndGg7IGkrKykge1xuXHRcdGZvciAodmFyIHAgaW4gbVtpXSkge1xuXHRcdCAgICBpZiAocCA9PT0gbWV0aG9kKSB7XG5cdFx0XHRtW2ldW3BdID0gdmFsdWU7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHQgICAgfVxuXHRcdH1cblx0ICAgIH1cblx0ICAgIHJldHVybiBmYWxzZTtcblx0fTtcblxuXHRtLmFkZCA9IGZ1bmN0aW9uIChtZXRob2QsIHZhbHVlKSB7XG5cdCAgICBpZiAobS51cGRhdGUgKG1ldGhvZCwgdmFsdWUpICkge1xuXHQgICAgfSBlbHNlIHtcblx0XHR2YXIgcmVnID0ge307XG5cdFx0cmVnW21ldGhvZF0gPSB2YWx1ZTtcblx0XHRtLmFkZF9iYXRjaCAocmVnKTtcblx0ICAgIH1cblx0fTtcblxuXHRtLmdldCA9IGZ1bmN0aW9uIChtZXRob2QpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTxtLmxlbmd0aDsgaSsrKSB7XG5cdFx0Zm9yICh2YXIgcCBpbiBtW2ldKSB7XG5cdFx0ICAgIGlmIChwID09PSBtZXRob2QpIHtcblx0XHRcdHJldHVybiBtW2ldW3BdO1xuXHRcdCAgICB9XG5cdFx0fVxuXHQgICAgfVxuXHR9O1xuXG5cdHJldHVybiBtO1xuICAgIH07XG5cbiAgICB2YXIgbWV0aG9kcyAgICA9IF9tZXRob2RzKCk7XG4gICAgdmFyIGFwaSA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gICAgYXBpLmNoZWNrID0gZnVuY3Rpb24gKG1ldGhvZCwgY2hlY2ssIG1zZykge1xuXHRpZiAobWV0aG9kIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTxtZXRob2QubGVuZ3RoOyBpKyspIHtcblx0XHRhcGkuY2hlY2sobWV0aG9kW2ldLCBjaGVjaywgbXNnKTtcblx0ICAgIH1cblx0ICAgIHJldHVybjtcblx0fVxuXG5cdGlmICh0eXBlb2YgKG1ldGhvZCkgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIG1ldGhvZC5jaGVjayhjaGVjaywgbXNnKTtcblx0fSBlbHNlIHtcblx0ICAgIHdob1ttZXRob2RdLmNoZWNrKGNoZWNrLCBtc2cpO1xuXHR9XG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIGFwaS50cmFuc2Zvcm0gPSBmdW5jdGlvbiAobWV0aG9kLCBjYmFrKSB7XG5cdGlmIChtZXRob2QgaW5zdGFuY2VvZiBBcnJheSkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPG1ldGhvZC5sZW5ndGg7IGkrKykge1xuXHRcdGFwaS50cmFuc2Zvcm0gKG1ldGhvZFtpXSwgY2Jhayk7XG5cdCAgICB9XG5cdCAgICByZXR1cm47XG5cdH1cblxuXHRpZiAodHlwZW9mIChtZXRob2QpID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICBtZXRob2QudHJhbnNmb3JtIChjYmFrKTtcblx0fSBlbHNlIHtcblx0ICAgIHdob1ttZXRob2RdLnRyYW5zZm9ybShjYmFrKTtcblx0fVxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICB2YXIgYXR0YWNoX21ldGhvZCA9IGZ1bmN0aW9uIChtZXRob2QsIG9wdHMpIHtcblx0dmFyIGNoZWNrcyA9IFtdO1xuXHR2YXIgdHJhbnNmb3JtcyA9IFtdO1xuXG5cdHZhciBnZXR0ZXIgPSBvcHRzLm9uX2dldHRlciB8fCBmdW5jdGlvbiAoKSB7XG5cdCAgICByZXR1cm4gbWV0aG9kcy5nZXQobWV0aG9kKTtcblx0fTtcblxuXHR2YXIgc2V0dGVyID0gb3B0cy5vbl9zZXR0ZXIgfHwgZnVuY3Rpb24gKHgpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTx0cmFuc2Zvcm1zLmxlbmd0aDsgaSsrKSB7XG5cdFx0eCA9IHRyYW5zZm9ybXNbaV0oeCk7XG5cdCAgICB9XG5cblx0ICAgIGZvciAodmFyIGo9MDsgajxjaGVja3MubGVuZ3RoOyBqKyspIHtcblx0XHRpZiAoIWNoZWNrc1tqXS5jaGVjayh4KSkge1xuXHRcdCAgICB2YXIgbXNnID0gY2hlY2tzW2pdLm1zZyB8fCBcblx0XHRcdChcIlZhbHVlIFwiICsgeCArIFwiIGRvZXNuJ3Qgc2VlbSB0byBiZSB2YWxpZCBmb3IgdGhpcyBtZXRob2RcIik7XG5cdFx0ICAgIHRocm93IChtc2cpO1xuXHRcdH1cblx0ICAgIH1cblx0ICAgIG1ldGhvZHMuYWRkKG1ldGhvZCwgeCk7XG5cdH07XG5cblx0dmFyIG5ld19tZXRob2QgPSBmdW5jdGlvbiAobmV3X3ZhbCkge1xuXHQgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGdldHRlcigpO1xuXHQgICAgfVxuXHQgICAgc2V0dGVyKG5ld192YWwpO1xuXHQgICAgcmV0dXJuIHdobzsgLy8gUmV0dXJuIHRoaXM/XG5cdH07XG5cdG5ld19tZXRob2QuY2hlY2sgPSBmdW5jdGlvbiAoY2JhaywgbXNnKSB7XG5cdCAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0XHRyZXR1cm4gY2hlY2tzO1xuXHQgICAgfVxuXHQgICAgY2hlY2tzLnB1c2ggKHtjaGVjayA6IGNiYWssXG5cdFx0XHQgIG1zZyAgIDogbXNnfSk7XG5cdCAgICByZXR1cm4gdGhpcztcblx0fTtcblx0bmV3X21ldGhvZC50cmFuc2Zvcm0gPSBmdW5jdGlvbiAoY2Jhaykge1xuXHQgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRyYW5zZm9ybXM7XG5cdCAgICB9XG5cdCAgICB0cmFuc2Zvcm1zLnB1c2goY2Jhayk7XG5cdCAgICByZXR1cm4gdGhpcztcblx0fTtcblxuXHR3aG9bbWV0aG9kXSA9IG5ld19tZXRob2Q7XG4gICAgfTtcblxuICAgIHZhciBnZXRzZXQgPSBmdW5jdGlvbiAocGFyYW0sIG9wdHMpIHtcblx0aWYgKHR5cGVvZiAocGFyYW0pID09PSAnb2JqZWN0Jykge1xuXHQgICAgbWV0aG9kcy5hZGRfYmF0Y2ggKHBhcmFtKTtcblx0ICAgIGZvciAodmFyIHAgaW4gcGFyYW0pIHtcblx0XHRhdHRhY2hfbWV0aG9kIChwLCBvcHRzKTtcblx0ICAgIH1cblx0fSBlbHNlIHtcblx0ICAgIG1ldGhvZHMuYWRkIChwYXJhbSwgb3B0cy5kZWZhdWx0X3ZhbHVlKTtcblx0ICAgIGF0dGFjaF9tZXRob2QgKHBhcmFtLCBvcHRzKTtcblx0fVxuICAgIH07XG5cbiAgICBhcGkuZ2V0c2V0ID0gZnVuY3Rpb24gKHBhcmFtLCBkZWYpIHtcblx0Z2V0c2V0KHBhcmFtLCB7ZGVmYXVsdF92YWx1ZSA6IGRlZn0pO1xuXG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIGFwaS5nZXQgPSBmdW5jdGlvbiAocGFyYW0sIGRlZikge1xuXHR2YXIgb25fc2V0dGVyID0gZnVuY3Rpb24gKCkge1xuXHQgICAgdGhyb3cgKFwiTWV0aG9kIGRlZmluZWQgb25seSBhcyBhIGdldHRlciAoeW91IGFyZSB0cnlpbmcgdG8gdXNlIGl0IGFzIGEgc2V0dGVyXCIpO1xuXHR9O1xuXG5cdGdldHNldChwYXJhbSwge2RlZmF1bHRfdmFsdWUgOiBkZWYsXG5cdFx0ICAgICAgIG9uX3NldHRlciA6IG9uX3NldHRlcn1cblx0ICAgICAgKTtcblxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICBhcGkuc2V0ID0gZnVuY3Rpb24gKHBhcmFtLCBkZWYpIHtcblx0dmFyIG9uX2dldHRlciA9IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRocm93IChcIk1ldGhvZCBkZWZpbmVkIG9ubHkgYXMgYSBzZXR0ZXIgKHlvdSBhcmUgdHJ5aW5nIHRvIHVzZSBpdCBhcyBhIGdldHRlclwiKTtcblx0fTtcblxuXHRnZXRzZXQocGFyYW0sIHtkZWZhdWx0X3ZhbHVlIDogZGVmLFxuXHRcdCAgICAgICBvbl9nZXR0ZXIgOiBvbl9nZXR0ZXJ9XG5cdCAgICAgICk7XG5cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgYXBpLm1ldGhvZCA9IGZ1bmN0aW9uIChuYW1lLCBjYmFrKSB7XG5cdGlmICh0eXBlb2YgKG5hbWUpID09PSAnb2JqZWN0Jykge1xuXHQgICAgZm9yICh2YXIgcCBpbiBuYW1lKSB7XG5cdFx0d2hvW3BdID0gbmFtZVtwXTtcblx0ICAgIH1cblx0fSBlbHNlIHtcblx0ICAgIHdob1tuYW1lXSA9IGNiYWs7XG5cdH1cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGFwaTtcbiAgICBcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGFwaTsiLCIvLyBpZiAodHlwZW9mIHRudCA9PT0gXCJ1bmRlZmluZWRcIikge1xuLy8gICAgIG1vZHVsZS5leHBvcnRzID0gdG50ID0ge31cbi8vIH1cbi8vIHRudC51dGlscyA9IHJlcXVpcmUoXCJ0bnQudXRpbHNcIik7XG4vLyB0bnQudG9vbHRpcCA9IHJlcXVpcmUoXCJ0bnQudG9vbHRpcFwiKTtcbi8vIHRudC5ib2FyZCA9IHJlcXVpcmUoXCIuL3NyYy9pbmRleC5qc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9zcmMvaW5kZXhcIik7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG52YXIgZGVmZXJDYW5jZWwgPSByZXF1aXJlIChcInRudC51dGlsc1wiKS5kZWZlcl9jYW5jZWw7XG5cbnZhciBib2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgLy8vLyBQcml2YXRlIHZhcnNcbiAgICB2YXIgc3ZnO1xuICAgIHZhciBkaXZfaWQ7XG4gICAgdmFyIHRyYWNrcyA9IFtdO1xuICAgIHZhciBtaW5fd2lkdGggPSA1MDtcbiAgICB2YXIgaGVpZ2h0ICAgID0gMDsgICAgLy8gVGhpcyBpcyB0aGUgZ2xvYmFsIGhlaWdodCBpbmNsdWRpbmcgYWxsIHRoZSB0cmFja3NcbiAgICB2YXIgd2lkdGggICAgID0gOTIwO1xuICAgIHZhciBoZWlnaHRfb2Zmc2V0ID0gMjA7XG4gICAgdmFyIGxvYyA9IHtcblx0c3BlY2llcyAgOiB1bmRlZmluZWQsXG5cdGNociAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICBmcm9tICAgICA6IDAsXG4gICAgICAgIHRvICAgICAgIDogNTAwXG4gICAgfTtcblxuICAgIC8vIExpbWl0IGNhcHNcbiAgICB2YXIgY2FwcyA9IHtcbiAgICAgICAgbGVmdCA6IHVuZGVmaW5lZCxcbiAgICAgICAgcmlnaHQgOiB1bmRlZmluZWRcbiAgICB9O1xuICAgIHZhciBjYXBfd2lkdGggPSAzO1xuXG5cbiAgICAvLyBUT0RPOiBXZSBoYXZlIG5vdyBiYWNrZ3JvdW5kIGNvbG9yIGluIHRoZSB0cmFja3MuIENhbiB0aGlzIGJlIHJlbW92ZWQ/XG4gICAgLy8gSXQgbG9va3MgbGlrZSBpdCBpcyB1c2VkIGluIHRoZSB0b28td2lkZSBwYW5lIGV0YywgYnV0IGl0IG1heSBub3QgYmUgbmVlZGVkIGFueW1vcmVcbiAgICB2YXIgYmdDb2xvciAgID0gZDMucmdiKCcjRjhGQkVGJyk7IC8vI0Y4RkJFRlxuICAgIHZhciBwYW5lOyAvLyBEcmFnZ2FibGUgcGFuZVxuICAgIHZhciBzdmdfZztcbiAgICB2YXIgeFNjYWxlO1xuICAgIHZhciB6b29tRXZlbnRIYW5kbGVyID0gZDMuYmVoYXZpb3Iuem9vbSgpO1xuICAgIHZhciBsaW1pdHMgPSB7XG4gICAgICAgIG1pbiA6IDAsXG4gICAgICAgIG1heCA6IDEwMDAsXG4gICAgICAgIHpvb21fb3V0IDogMTAwMCxcbiAgICAgICAgem9vbV9pbiAgOiAxMDBcbiAgICB9O1xuICAgIHZhciBkdXIgPSA1MDA7XG4gICAgdmFyIGRyYWdfYWxsb3dlZCA9IHRydWU7XG5cbiAgICB2YXIgZXhwb3J0cyA9IHtcbiAgICAgICAgZWFzZSAgICAgICAgICA6IGQzLmVhc2UoXCJjdWJpYy1pbi1vdXRcIiksXG4gICAgICAgIGV4dGVuZF9jYW52YXMgOiB7XG4gICAgICAgICAgICBsZWZ0IDogMCxcbiAgICAgICAgICAgIHJpZ2h0IDogMFxuICAgICAgICB9LFxuICAgICAgICBzaG93X2ZyYW1lIDogdHJ1ZVxuICAgICAgICAvLyBsaW1pdHMgICAgICAgIDogZnVuY3Rpb24gKCkge3Rocm93IFwiVGhlIGxpbWl0cyBtZXRob2Qgc2hvdWxkIGJlIGRlZmluZWRcIn1cbiAgICB9O1xuXG4gICAgLy8gVGhlIHJldHVybmVkIGNsb3N1cmUgLyBvYmplY3RcbiAgICB2YXIgdHJhY2tfdmlzID0gZnVuY3Rpb24oZGl2KSB7XG4gICAgXHRkaXZfaWQgPSBkMy5zZWxlY3QoZGl2KS5hdHRyKFwiaWRcIik7XG5cbiAgICBcdC8vIFRoZSBvcmlnaW5hbCBkaXYgaXMgY2xhc3NlZCB3aXRoIHRoZSB0bnQgY2xhc3NcbiAgICBcdGQzLnNlbGVjdChkaXYpXG4gICAgXHQgICAgLmNsYXNzZWQoXCJ0bnRcIiwgdHJ1ZSk7XG5cbiAgICBcdC8vIFRPRE86IE1vdmUgdGhlIHN0eWxpbmcgdG8gdGhlIHNjc3M/XG4gICAgXHR2YXIgYnJvd3NlckRpdiA9IGQzLnNlbGVjdChkaXYpXG4gICAgXHQgICAgLmFwcGVuZChcImRpdlwiKVxuICAgIFx0ICAgIC5hdHRyKFwiaWRcIiwgXCJ0bnRfXCIgKyBkaXZfaWQpXG4gICAgXHQgICAgLnN0eWxlKFwicG9zaXRpb25cIiwgXCJyZWxhdGl2ZVwiKVxuICAgIFx0ICAgIC5jbGFzc2VkKFwidG50X2ZyYW1lZFwiLCBleHBvcnRzLnNob3dfZnJhbWUgPyB0cnVlIDogZmFsc2UpXG4gICAgXHQgICAgLnN0eWxlKFwid2lkdGhcIiwgKHdpZHRoICsgY2FwX3dpZHRoKjIgKyBleHBvcnRzLmV4dGVuZF9jYW52YXMucmlnaHQgKyBleHBvcnRzLmV4dGVuZF9jYW52YXMubGVmdCkgKyBcInB4XCIpO1xuXG4gICAgXHR2YXIgZ3JvdXBEaXYgPSBicm93c2VyRGl2XG4gICAgXHQgICAgLmFwcGVuZChcImRpdlwiKVxuICAgIFx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZ3JvdXBEaXZcIik7XG5cbiAgICBcdC8vIFRoZSBTVkdcbiAgICBcdHN2ZyA9IGdyb3VwRGl2XG4gICAgXHQgICAgLmFwcGVuZChcInN2Z1wiKVxuICAgIFx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfc3ZnXCIpXG4gICAgXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aClcbiAgICBcdCAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQpXG4gICAgXHQgICAgLmF0dHIoXCJwb2ludGVyLWV2ZW50c1wiLCBcImFsbFwiKTtcblxuICAgIFx0c3ZnX2cgPSBzdmdcbiAgICBcdCAgICAuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsMjApXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZChcImdcIilcbiAgICBcdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X2dcIik7XG5cbiAgICBcdC8vIGNhcHNcbiAgICBcdGNhcHMubGVmdCA9IHN2Z19nXG4gICAgXHQgICAgLmFwcGVuZChcInJlY3RcIilcbiAgICBcdCAgICAuYXR0cihcImlkXCIsIFwidG50X1wiICsgZGl2X2lkICsgXCJfNXBjYXBcIilcbiAgICBcdCAgICAuYXR0cihcInhcIiwgMClcbiAgICBcdCAgICAuYXR0cihcInlcIiwgMClcbiAgICBcdCAgICAuYXR0cihcIndpZHRoXCIsIDApXG4gICAgXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuICAgIFx0ICAgIC5hdHRyKFwiZmlsbFwiLCBcInJlZFwiKTtcbiAgICBcdGNhcHMucmlnaHQgPSBzdmdfZ1xuICAgIFx0ICAgIC5hcHBlbmQoXCJyZWN0XCIpXG4gICAgXHQgICAgLmF0dHIoXCJpZFwiLCBcInRudF9cIiArIGRpdl9pZCArIFwiXzNwY2FwXCIpXG4gICAgXHQgICAgLmF0dHIoXCJ4XCIsIHdpZHRoLWNhcF93aWR0aClcbiAgICBcdCAgICAuYXR0cihcInlcIiwgMClcbiAgICBcdCAgICAuYXR0cihcIndpZHRoXCIsIDApXG4gICAgXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuICAgIFx0ICAgIC5hdHRyKFwiZmlsbFwiLCBcInJlZFwiKTtcblxuICAgIFx0Ly8gVGhlIFpvb21pbmcvUGFubmluZyBQYW5lXG4gICAgXHRwYW5lID0gc3ZnX2dcbiAgICBcdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuICAgIFx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfcGFuZVwiKVxuICAgIFx0ICAgIC5hdHRyKFwiaWRcIiwgXCJ0bnRfXCIgKyBkaXZfaWQgKyBcIl9wYW5lXCIpXG4gICAgXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aClcbiAgICBcdCAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQpXG4gICAgXHQgICAgLnN0eWxlKFwiZmlsbFwiLCBiZ0NvbG9yKTtcblxuICAgIFx0Ly8gKiogVE9ETzogV291bGRuJ3QgYmUgYmV0dGVyIHRvIGhhdmUgdGhlc2UgbWVzc2FnZXMgYnkgdHJhY2s/XG4gICAgXHQvLyB2YXIgdG9vV2lkZV90ZXh0ID0gc3ZnX2dcbiAgICBcdC8vICAgICAuYXBwZW5kKFwidGV4dFwiKVxuICAgIFx0Ly8gICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfd2lkZU9LX3RleHRcIilcbiAgICBcdC8vICAgICAuYXR0cihcImlkXCIsIFwidG50X1wiICsgZGl2X2lkICsgXCJfdG9vV2lkZVwiKVxuICAgIFx0Ly8gICAgIC5hdHRyKFwiZmlsbFwiLCBiZ0NvbG9yKVxuICAgIFx0Ly8gICAgIC50ZXh0KFwiUmVnaW9uIHRvbyB3aWRlXCIpO1xuXG4gICAgXHQvLyBUT0RPOiBJIGRvbid0IGtub3cgaWYgdGhpcyBpcyB0aGUgYmVzdCB3YXkgKGFuZCBwb3J0YWJsZSkgd2F5XG4gICAgXHQvLyBvZiBjZW50ZXJpbmcgdGhlIHRleHQgaW4gdGhlIHRleHQgYXJlYVxuICAgIFx0Ly8gdmFyIGJiID0gdG9vV2lkZV90ZXh0WzBdWzBdLmdldEJCb3goKTtcbiAgICBcdC8vIHRvb1dpZGVfdGV4dFxuICAgIFx0Ly8gICAgIC5hdHRyKFwieFwiLCB+fih3aWR0aC8yIC0gYmIud2lkdGgvMikpXG4gICAgXHQvLyAgICAgLmF0dHIoXCJ5XCIsIH5+KGhlaWdodC8yIC0gYmIuaGVpZ2h0LzIpKTtcbiAgICB9O1xuXG4gICAgLy8gQVBJXG4gICAgdmFyIGFwaSA9IGFwaWpzICh0cmFja192aXMpXG4gICAgXHQuZ2V0c2V0IChleHBvcnRzKVxuICAgIFx0LmdldHNldCAobGltaXRzKVxuICAgIFx0LmdldHNldCAobG9jKTtcblxuICAgIGFwaS50cmFuc2Zvcm0gKHRyYWNrX3Zpcy5leHRlbmRfY2FudmFzLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgXHR2YXIgcHJldl92YWwgPSB0cmFja192aXMuZXh0ZW5kX2NhbnZhcygpO1xuICAgIFx0dmFsLmxlZnQgPSB2YWwubGVmdCB8fCBwcmV2X3ZhbC5sZWZ0O1xuICAgIFx0dmFsLnJpZ2h0ID0gdmFsLnJpZ2h0IHx8IHByZXZfdmFsLnJpZ2h0O1xuICAgIFx0cmV0dXJuIHZhbDtcbiAgICB9KTtcblxuICAgIC8vIHRyYWNrX3ZpcyBhbHdheXMgc3RhcnRzIG9uIGxvYy5mcm9tICYgbG9jLnRvXG4gICAgYXBpLm1ldGhvZCAoJ3N0YXJ0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBtYWtlIHN1cmUgdGhhdCB6b29tX291dCBpcyB3aXRoaW4gdGhlIG1pbi1tYXggcmFuZ2VcbiAgICAgICAgaWYgKChsaW1pdHMubWF4IC0gbGltaXRzLm1pbikgPCBsaW1pdHMuem9vbV9vdXQpIHtcbiAgICAgICAgICAgIGxpbWl0cy56b29tX291dCA9IGxpbWl0cy5tYXggLSBsaW1pdHMubWluO1xuICAgICAgICB9XG5cbiAgICAgICAgcGxvdCgpO1xuXG4gICAgICAgIC8vIFJlc2V0IHRoZSB0cmFja3NcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRyYWNrc1tpXS5nKSB7XG4gICAgICAgICAgICAgICAgLy8gICAgdHJhY2tzW2ldLmRpc3BsYXkoKS5yZXNldC5jYWxsKHRyYWNrc1tpXSk7XG4gICAgICAgICAgICAgICAgdHJhY2tzW2ldLmcucmVtb3ZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfaW5pdF90cmFjayh0cmFja3NbaV0pO1xuICAgICAgICB9XG4gICAgICAgIF9wbGFjZV90cmFja3MoKTtcblxuICAgICAgICAvLyBUaGUgY29udGludWF0aW9uIGNhbGxiYWNrXG4gICAgICAgIHZhciBjb250ID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICBpZiAoKGxvYy50byAtIGxvYy5mcm9tKSA8IGxpbWl0cy56b29tX2luKSB7XG4gICAgICAgICAgICAgICAgaWYgKChsb2MuZnJvbSArIGxpbWl0cy56b29tX2luKSA+IGxpbWl0cy5tYXgpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jLnRvID0gbGltaXRzLm1heDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2MudG8gPSBsb2MuZnJvbSArIGxpbWl0cy56b29tX2luO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIF91cGRhdGVfdHJhY2sodHJhY2tzW2ldLCBsb2MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnQoKTtcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCd1cGRhdGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgXHRmb3IgKHZhciBpPTA7IGk8dHJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgXHQgICAgX3VwZGF0ZV90cmFjayAodHJhY2tzW2ldKTtcbiAgICBcdH1cbiAgICB9KTtcblxuICAgIHZhciBfdXBkYXRlX3RyYWNrID0gZnVuY3Rpb24gKHRyYWNrLCB3aGVyZSkge1xuICAgIFx0aWYgKHRyYWNrLmRhdGEoKSkge1xuICAgIFx0ICAgIHZhciB0cmFja19kYXRhID0gdHJhY2suZGF0YSgpO1xuICAgICAgICAgICAgdmFyIGRhdGFfdXBkYXRlciA9IHRyYWNrX2RhdGE7XG5cbiAgICBcdCAgICBkYXRhX3VwZGF0ZXIuY2FsbCh0cmFjaywge1xuICAgICAgICAgICAgICAgICdsb2MnIDogd2hlcmUsXG4gICAgICAgICAgICAgICAgJ29uX3N1Y2Nlc3MnIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0cmFjay5kaXNwbGF5KCkudXBkYXRlLmNhbGwodHJhY2ssIHdoZXJlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgXHQgICAgfSk7XG4gICAgXHR9XG4gICAgfTtcblxuICAgIHZhciBwbG90ID0gZnVuY3Rpb24oKSB7XG4gICAgXHR4U2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgIFx0ICAgIC5kb21haW4oW2xvYy5mcm9tLCBsb2MudG9dKVxuICAgIFx0ICAgIC5yYW5nZShbMCwgd2lkdGhdKTtcblxuICAgIFx0aWYgKGRyYWdfYWxsb3dlZCkge1xuICAgIFx0ICAgIHN2Z19nLmNhbGwoIHpvb21FdmVudEhhbmRsZXJcbiAgICBcdFx0ICAgICAgIC54KHhTY2FsZSlcbiAgICBcdFx0ICAgICAgIC5zY2FsZUV4dGVudChbKGxvYy50by1sb2MuZnJvbSkvKGxpbWl0cy56b29tX291dC0xKSwgKGxvYy50by1sb2MuZnJvbSkvbGltaXRzLnpvb21faW5dKVxuICAgIFx0XHQgICAgICAgLm9uKFwiem9vbVwiLCBfbW92ZSlcbiAgICBcdFx0ICAgICApO1xuICAgIFx0fVxuICAgIH07XG5cbiAgICB2YXIgX3Jlb3JkZXIgPSBmdW5jdGlvbiAobmV3X3RyYWNrcykge1xuICAgICAgICAvLyBUT0RPOiBUaGlzIGlzIGRlZmluaW5nIGEgbmV3IGhlaWdodCwgYnV0IHRoZSBnbG9iYWwgaGVpZ2h0IGlzIHVzZWQgdG8gZGVmaW5lIHRoZSBzaXplIG9mIHNldmVyYWxcbiAgICAgICAgLy8gcGFydHMuIFdlIHNob3VsZCBkbyB0aGlzIGR5bmFtaWNhbGx5XG5cbiAgICAgICAgdmFyIGZvdW5kX2luZGV4ZXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaj0wOyBqPG5ld190cmFja3MubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIHZhciBmb3VuZCA9IGZhbHNlO1xuICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICh0cmFja3NbaV0uaWQoKSA9PT0gbmV3X3RyYWNrc1tqXS5pZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZm91bmRfaW5kZXhlc1tpXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRyYWNrcy5zcGxpY2UoaSwxKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICAgICAgICAgIF9pbml0X3RyYWNrKG5ld190cmFja3Nbal0pO1xuICAgICAgICAgICAgICAgIF91cGRhdGVfdHJhY2sobmV3X3RyYWNrc1tqXSwge2Zyb20gOiBsb2MuZnJvbSwgdG8gOiBsb2MudG99KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIHg9MDsgeDx0cmFja3MubGVuZ3RoOyB4KyspIHtcbiAgICAgICAgICAgIGlmICghZm91bmRfaW5kZXhlc1t4XSkge1xuICAgICAgICAgICAgICAgIHRyYWNrc1t4XS5nLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdHJhY2tzID0gbmV3X3RyYWNrcztcbiAgICAgICAgX3BsYWNlX3RyYWNrcygpO1xuICAgIH07XG5cbiAgICAvLyByaWdodC9sZWZ0L3pvb20gcGFucyBvciB6b29tcyB0aGUgdHJhY2suIFRoZXNlIG1ldGhvZHMgYXJlIGV4cG9zZWQgdG8gYWxsb3cgZXh0ZXJuYWwgYnV0dG9ucywgZXRjIHRvIGludGVyYWN0IHdpdGggdGhlIHRyYWNrcy4gVGhlIGFyZ3VtZW50IGlzIHRoZSBhbW91bnQgb2YgcGFubmluZy96b29taW5nIChpZS4gMS4yIG1lYW5zIDIwJSBwYW5uaW5nKSBXaXRoIGxlZnQvcmlnaHQgb25seSBwb3NpdGl2ZSBudW1iZXJzIGFyZSBhbGxvd2VkLlxuICAgIGFwaS5tZXRob2QgKCdzY3JvbGwnLCBmdW5jdGlvbiAoZmFjdG9yKSB7XG4gICAgICAgIHZhciBhbW91bnQgPSBNYXRoLmFicyhmYWN0b3IpO1xuICAgIFx0aWYgKGZhY3RvciA+IDApIHtcbiAgICBcdCAgICBfbWFudWFsX21vdmUoYW1vdW50LCAxKTtcbiAgICBcdH0gZWxzZSBpZiAoZmFjdG9yIDwgMCl7XG4gICAgICAgICAgICBfbWFudWFsX21vdmUoYW1vdW50LCAtMSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCd6b29tJywgZnVuY3Rpb24gKGZhY3Rvcikge1xuICAgICAgICBfbWFudWFsX21vdmUoMS9mYWN0b3IsIDApO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ2ZpbmRfdHJhY2snLCBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRyYWNrc1tpXS5pZCgpID09PSBpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cmFja3NbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdyZW1vdmVfdHJhY2snLCBmdW5jdGlvbiAodHJhY2spIHtcbiAgICAgICAgdHJhY2suZy5yZW1vdmUoKTtcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QgKCdhZGRfdHJhY2snLCBmdW5jdGlvbiAodHJhY2spIHtcbiAgICAgICAgaWYgKHRyYWNrIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTx0cmFjay5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHRyYWNrX3Zpcy5hZGRfdHJhY2sgKHRyYWNrW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cmFja192aXM7XG4gICAgICAgIH1cbiAgICAgICAgdHJhY2tzLnB1c2godHJhY2spO1xuICAgICAgICByZXR1cm4gdHJhY2tfdmlzO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCgndHJhY2tzJywgZnVuY3Rpb24gKHRzKSB7XG4gICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHRyYWNrcztcbiAgICAgICAgfVxuICAgICAgICBfcmVvcmRlcih0cyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuXG4gICAgLy9cbiAgICBhcGkubWV0aG9kICgnd2lkdGgnLCBmdW5jdGlvbiAodykge1xuICAgIFx0Ly8gVE9ETzogQWxsb3cgc3VmZml4ZXMgbGlrZSBcIjEwMDBweFwiP1xuICAgIFx0Ly8gVE9ETzogVGVzdCB3cm9uZyBmb3JtYXRzXG4gICAgXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBcdCAgICByZXR1cm4gd2lkdGg7XG4gICAgXHR9XG4gICAgXHQvLyBBdCBsZWFzdCBtaW4td2lkdGhcbiAgICBcdGlmICh3IDwgbWluX3dpZHRoKSB7XG4gICAgXHQgICAgdyA9IG1pbl93aWR0aDtcbiAgICBcdH1cblxuICAgIFx0Ly8gV2UgYXJlIHJlc2l6aW5nXG4gICAgXHRpZiAoZGl2X2lkICE9PSB1bmRlZmluZWQpIHtcbiAgICBcdCAgICBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkKS5zZWxlY3QoXCJzdmdcIikuYXR0cihcIndpZHRoXCIsIHcpO1xuICAgIFx0ICAgIC8vIFJlc2l6ZSB0aGUgem9vbWluZy9wYW5uaW5nIHBhbmVcbiAgICBcdCAgICBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkKS5zdHlsZShcIndpZHRoXCIsIChwYXJzZUludCh3KSArIGNhcF93aWR0aCoyKSArIFwicHhcIik7XG4gICAgXHQgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiX3BhbmVcIikuYXR0cihcIndpZHRoXCIsIHcpO1xuICAgICAgICAgICAgY2Fwcy5yaWdodFxuICAgICAgICAgICAgICAgIC5hdHRyKFwieFwiLCB3LWNhcF93aWR0aCk7XG5cbiAgICBcdCAgICAvLyBSZXBsb3RcbiAgICBcdCAgICB3aWR0aCA9IHc7XG4gICAgICAgICAgICB4U2NhbGUucmFuZ2UoWzAsIHdpZHRoXSk7XG5cbiAgICBcdCAgICBwbG90KCk7XG4gICAgXHQgICAgZm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBcdFx0dHJhY2tzW2ldLmcuc2VsZWN0KFwicmVjdFwiKS5hdHRyKFwid2lkdGhcIiwgdyk7XG4gICAgICAgICAgICAgICAgdHJhY2tzW2ldLmRpc3BsYXkoKS5zY2FsZSh4U2NhbGUpO1xuICAgICAgICBcdFx0dHJhY2tzW2ldLmRpc3BsYXkoKS5yZXNldC5jYWxsKHRyYWNrc1tpXSk7XG4gICAgICAgICAgICAgICAgdHJhY2tzW2ldLmRpc3BsYXkoKS5pbml0LmNhbGwodHJhY2tzW2ldLCB3KTtcbiAgICAgICAgXHRcdHRyYWNrc1tpXS5kaXNwbGF5KCkudXBkYXRlLmNhbGwodHJhY2tzW2ldLCBsb2MpO1xuICAgIFx0ICAgIH1cbiAgICBcdH0gZWxzZSB7XG4gICAgXHQgICAgd2lkdGggPSB3O1xuICAgIFx0fVxuICAgICAgICByZXR1cm4gdHJhY2tfdmlzO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCgnYWxsb3dfZHJhZycsIGZ1bmN0aW9uKGIpIHtcbiAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gZHJhZ19hbGxvd2VkO1xuICAgICAgICB9XG4gICAgICAgIGRyYWdfYWxsb3dlZCA9IGI7XG4gICAgICAgIGlmIChkcmFnX2FsbG93ZWQpIHtcbiAgICAgICAgICAgIC8vIFdoZW4gdGhpcyBtZXRob2QgaXMgY2FsbGVkIG9uIHRoZSBvYmplY3QgYmVmb3JlIHN0YXJ0aW5nIHRoZSBzaW11bGF0aW9uLCB3ZSBkb24ndCBoYXZlIGRlZmluZWQgeFNjYWxlXG4gICAgICAgICAgICBpZiAoeFNjYWxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBzdmdfZy5jYWxsKCB6b29tRXZlbnRIYW5kbGVyLngoeFNjYWxlKVxuICAgICAgICAgICAgICAgICAgICAvLyAueEV4dGVudChbMCwgbGltaXRzLnJpZ2h0XSlcbiAgICAgICAgICAgICAgICAgICAgLnNjYWxlRXh0ZW50KFsobG9jLnRvLWxvYy5mcm9tKS8obGltaXRzLnpvb21fb3V0LTEpLCAobG9jLnRvLWxvYy5mcm9tKS9saW1pdHMuem9vbV9pbl0pXG4gICAgICAgICAgICAgICAgICAgIC5vbihcInpvb21cIiwgX21vdmUpICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBXZSBjcmVhdGUgYSBuZXcgZHVtbXkgc2NhbGUgaW4geCB0byBhdm9pZCBkcmFnZ2luZyB0aGUgcHJldmlvdXMgb25lXG4gICAgICAgICAgICAvLyBUT0RPOiBUaGVyZSBtYXkgYmUgYSBjaGVhcGVyIHdheSBvZiBkb2luZyB0aGlzP1xuICAgICAgICAgICAgem9vbUV2ZW50SGFuZGxlci54KGQzLnNjYWxlLmxpbmVhcigpKS5vbihcInpvb21cIiwgbnVsbCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRyYWNrX3ZpcztcbiAgICB9KTtcblxuICAgIHZhciBfcGxhY2VfdHJhY2tzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaCA9IDA7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciB0cmFjayA9IHRyYWNrc1tpXTtcbiAgICAgICAgICAgIGlmICh0cmFjay5nLmF0dHIoXCJ0cmFuc2Zvcm1cIikpIHtcbiAgICAgICAgICAgICAgICB0cmFjay5nXG4gICAgICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgICAgICAgICAgLmR1cmF0aW9uKGR1cilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBleHBvcnRzLmV4dGVuZF9jYW52YXMubGVmdCArIFwiLFwiICsgaCArIFwiKVwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdHJhY2suZ1xuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIGV4cG9ydHMuZXh0ZW5kX2NhbnZhcy5sZWZ0ICsgXCIsXCIgKyBoICsgXCIpXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBoICs9IHRyYWNrLmhlaWdodCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc3ZnXG4gICAgICAgIHN2Zy5hdHRyKFwiaGVpZ2h0XCIsIGggKyBoZWlnaHRfb2Zmc2V0KTtcblxuICAgICAgICAvLyBkaXZcbiAgICAgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZClcbiAgICAgICAgICAgIC5zdHlsZShcImhlaWdodFwiLCAoaCArIDEwICsgaGVpZ2h0X29mZnNldCkgKyBcInB4XCIpO1xuXG4gICAgICAgIC8vIGNhcHNcbiAgICAgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiXzVwY2FwXCIpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBoKVxuICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBtb3ZlX3RvX2Zyb250KHRoaXMpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiXzNwY2FwXCIpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBoKVxuICAgICAgICAgICAgLmVhY2ggKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgbW92ZV90b19mcm9udCh0aGlzKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHBhbmVcbiAgICAgICAgcGFuZVxuICAgICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaCArIGhlaWdodF9vZmZzZXQpO1xuXG4gICAgICAgIHJldHVybiB0cmFja192aXM7XG4gICAgfTtcblxuICAgIHZhciBfaW5pdF90cmFjayA9IGZ1bmN0aW9uICh0cmFjaykge1xuICAgICAgICB0cmFjay5nID0gc3ZnLnNlbGVjdChcImdcIikuc2VsZWN0KFwiZ1wiKVxuICAgIFx0ICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF90cmFja1wiKVxuICAgIFx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIHRyYWNrLmhlaWdodCgpKTtcblxuICAgIFx0Ly8gUmVjdCBmb3IgdGhlIGJhY2tncm91bmQgY29sb3JcbiAgICBcdHRyYWNrLmdcbiAgICBcdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuICAgIFx0ICAgIC5hdHRyKFwieFwiLCAwKVxuICAgIFx0ICAgIC5hdHRyKFwieVwiLCAwKVxuICAgIFx0ICAgIC5hdHRyKFwid2lkdGhcIiwgdHJhY2tfdmlzLndpZHRoKCkpXG4gICAgXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgdHJhY2suaGVpZ2h0KCkpXG4gICAgXHQgICAgLnN0eWxlKFwiZmlsbFwiLCB0cmFjay5jb2xvcigpKVxuICAgIFx0ICAgIC5zdHlsZShcInBvaW50ZXItZXZlbnRzXCIsIFwibm9uZVwiKTtcblxuICAgIFx0aWYgKHRyYWNrLmRpc3BsYXkoKSkge1xuICAgIFx0ICAgIHRyYWNrLmRpc3BsYXkoKVxuICAgICAgICAgICAgICAgIC5zY2FsZSh4U2NhbGUpXG4gICAgICAgICAgICAgICAgLmluaXQuY2FsbCh0cmFjaywgd2lkdGgpO1xuICAgIFx0fVxuXG4gICAgXHRyZXR1cm4gdHJhY2tfdmlzO1xuICAgIH07XG5cbiAgICB2YXIgX21hbnVhbF9tb3ZlID0gZnVuY3Rpb24gKGZhY3RvciwgZGlyZWN0aW9uKSB7XG4gICAgICAgIHZhciBvbGREb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG5cbiAgICBcdHZhciBzcGFuID0gb2xkRG9tYWluWzFdIC0gb2xkRG9tYWluWzBdO1xuICAgIFx0dmFyIG9mZnNldCA9IChzcGFuICogZmFjdG9yKSAtIHNwYW47XG5cbiAgICBcdHZhciBuZXdEb21haW47XG4gICAgXHRzd2l0Y2ggKGRpcmVjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAxIDpcbiAgICAgICAgICAgIG5ld0RvbWFpbiA9IFsofn5vbGREb21haW5bMF0gLSBvZmZzZXQpLCB+fihvbGREb21haW5bMV0gLSBvZmZzZXQpXTtcbiAgICBcdCAgICBicmVhaztcbiAgICAgICAgXHRjYXNlIC0xIDpcbiAgICAgICAgXHQgICAgbmV3RG9tYWluID0gWyh+fm9sZERvbWFpblswXSArIG9mZnNldCksIH5+KG9sZERvbWFpblsxXSAtIG9mZnNldCldO1xuICAgICAgICBcdCAgICBicmVhaztcbiAgICAgICAgXHRjYXNlIDAgOlxuICAgICAgICBcdCAgICBuZXdEb21haW4gPSBbb2xkRG9tYWluWzBdIC0gfn4ob2Zmc2V0LzIpLCBvbGREb21haW5bMV0gKyAofn5vZmZzZXQvMildO1xuICAgIFx0fVxuXG4gICAgXHR2YXIgaW50ZXJwb2xhdG9yID0gZDMuaW50ZXJwb2xhdGVOdW1iZXIob2xkRG9tYWluWzBdLCBuZXdEb21haW5bMF0pO1xuICAgIFx0dmFyIGVhc2UgPSBleHBvcnRzLmVhc2U7XG5cbiAgICBcdHZhciB4ID0gMDtcbiAgICBcdGQzLnRpbWVyKGZ1bmN0aW9uKCkge1xuICAgIFx0ICAgIHZhciBjdXJyX3N0YXJ0ID0gaW50ZXJwb2xhdG9yKGVhc2UoeCkpO1xuICAgIFx0ICAgIHZhciBjdXJyX2VuZDtcbiAgICBcdCAgICBzd2l0Y2ggKGRpcmVjdGlvbikge1xuICAgICAgICBcdCAgICBjYXNlIC0xIDpcbiAgICAgICAgXHRcdGN1cnJfZW5kID0gY3Vycl9zdGFydCArIHNwYW47XG4gICAgICAgIFx0XHRicmVhaztcbiAgICAgICAgXHQgICAgY2FzZSAxIDpcbiAgICAgICAgXHRcdGN1cnJfZW5kID0gY3Vycl9zdGFydCArIHNwYW47XG4gICAgICAgIFx0XHRicmVhaztcbiAgICAgICAgXHQgICAgY2FzZSAwIDpcbiAgICAgICAgXHRcdGN1cnJfZW5kID0gb2xkRG9tYWluWzFdICsgb2xkRG9tYWluWzBdIC0gY3Vycl9zdGFydDtcbiAgICAgICAgXHRcdGJyZWFrO1xuICAgIFx0ICAgIH1cblxuICAgIFx0ICAgIHZhciBjdXJyRG9tYWluID0gW2N1cnJfc3RhcnQsIGN1cnJfZW5kXTtcbiAgICBcdCAgICB4U2NhbGUuZG9tYWluKGN1cnJEb21haW4pO1xuICAgIFx0ICAgIF9tb3ZlKHhTY2FsZSk7XG4gICAgXHQgICAgeCs9MC4wMjtcbiAgICBcdCAgICByZXR1cm4geD4xO1xuICAgIFx0fSk7XG4gICAgfTtcblxuXG4gICAgdmFyIF9tb3ZlX2NiYWsgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjdXJyRG9tYWluID0geFNjYWxlLmRvbWFpbigpO1xuICAgIFx0dHJhY2tfdmlzLmZyb20ofn5jdXJyRG9tYWluWzBdKTtcbiAgICBcdHRyYWNrX3Zpcy50byh+fmN1cnJEb21haW5bMV0pO1xuXG4gICAgXHRmb3IgKHZhciBpID0gMDsgaSA8IHRyYWNrcy5sZW5ndGg7IGkrKykge1xuICAgIFx0ICAgIHZhciB0cmFjayA9IHRyYWNrc1tpXTtcbiAgICBcdCAgICBfdXBkYXRlX3RyYWNrKHRyYWNrLCBsb2MpO1xuICAgIFx0fVxuICAgIH07XG4gICAgLy8gVGhlIGRlZmVycmVkX2NiYWsgaXMgZGVmZXJyZWQgYXQgbGVhc3QgdGhpcyBhbW91bnQgb2YgdGltZSBvciByZS1zY2hlZHVsZWQgaWYgZGVmZXJyZWQgaXMgY2FsbGVkIGJlZm9yZVxuICAgIHZhciBfZGVmZXJyZWQgPSBkZWZlckNhbmNlbChfbW92ZV9jYmFrLCAzMDApO1xuXG4gICAgLy8gYXBpLm1ldGhvZCgndXBkYXRlJywgZnVuY3Rpb24gKCkge1xuICAgIC8vIFx0X21vdmUoKTtcbiAgICAvLyB9KTtcblxuICAgIHZhciBfbW92ZSA9IGZ1bmN0aW9uIChuZXdfeFNjYWxlKSB7XG4gICAgXHRpZiAobmV3X3hTY2FsZSAhPT0gdW5kZWZpbmVkICYmIGRyYWdfYWxsb3dlZCkge1xuICAgIFx0ICAgIHpvb21FdmVudEhhbmRsZXIueChuZXdfeFNjYWxlKTtcbiAgICBcdH1cblxuICAgIFx0Ly8gU2hvdyB0aGUgcmVkIGJhcnMgYXQgdGhlIGxpbWl0c1xuICAgIFx0dmFyIGRvbWFpbiA9IHhTY2FsZS5kb21haW4oKTtcbiAgICBcdGlmIChkb21haW5bMF0gPD0gKGxpbWl0cy5taW4gKyA1KSkge1xuICAgIFx0ICAgIGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQgKyBcIl81cGNhcFwiKVxuICAgIFx0XHQuYXR0cihcIndpZHRoXCIsIGNhcF93aWR0aClcbiAgICBcdFx0LnRyYW5zaXRpb24oKVxuICAgIFx0XHQuZHVyYXRpb24oMjAwKVxuICAgIFx0XHQuYXR0cihcIndpZHRoXCIsIDApO1xuICAgIFx0fVxuXG4gICAgXHRpZiAoZG9tYWluWzFdID49IChsaW1pdHMubWF4KS01KSB7XG4gICAgXHQgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiXzNwY2FwXCIpXG4gICAgXHRcdC5hdHRyKFwid2lkdGhcIiwgY2FwX3dpZHRoKVxuICAgIFx0XHQudHJhbnNpdGlvbigpXG4gICAgXHRcdC5kdXJhdGlvbigyMDApXG4gICAgXHRcdC5hdHRyKFwid2lkdGhcIiwgMCk7XG4gICAgXHR9XG5cblxuICAgIFx0Ly8gQXZvaWQgbW92aW5nIHBhc3QgdGhlIGxpbWl0c1xuICAgIFx0aWYgKGRvbWFpblswXSA8IGxpbWl0cy5taW4pIHtcbiAgICBcdCAgICB6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZShbem9vbUV2ZW50SGFuZGxlci50cmFuc2xhdGUoKVswXSAtIHhTY2FsZShsaW1pdHMubWluKSArIHhTY2FsZS5yYW5nZSgpWzBdLCB6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZSgpWzFdXSk7XG4gICAgXHR9IGVsc2UgaWYgKGRvbWFpblsxXSA+IGxpbWl0cy5tYXgpIHtcbiAgICBcdCAgICB6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZShbem9vbUV2ZW50SGFuZGxlci50cmFuc2xhdGUoKVswXSAtIHhTY2FsZShsaW1pdHMubWF4KSArIHhTY2FsZS5yYW5nZSgpWzFdLCB6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZSgpWzFdXSk7XG4gICAgXHR9XG5cbiAgICBcdF9kZWZlcnJlZCgpO1xuXG4gICAgXHRmb3IgKHZhciBpID0gMDsgaSA8IHRyYWNrcy5sZW5ndGg7IGkrKykge1xuICAgIFx0ICAgIHZhciB0cmFjayA9IHRyYWNrc1tpXTtcbiAgICBcdCAgICB0cmFjay5kaXNwbGF5KCkubW92ZXIuY2FsbCh0cmFjayk7XG4gICAgXHR9XG4gICAgfTtcblxuICAgIC8vIGFwaS5tZXRob2Qoe1xuICAgIC8vIFx0YWxsb3dfZHJhZyA6IGFwaV9hbGxvd19kcmFnLFxuICAgIC8vIFx0d2lkdGggICAgICA6IGFwaV93aWR0aCxcbiAgICAvLyBcdGFkZF90cmFjayAgOiBhcGlfYWRkX3RyYWNrLFxuICAgIC8vIFx0cmVvcmRlciAgICA6IGFwaV9yZW9yZGVyLFxuICAgIC8vIFx0em9vbSAgICAgICA6IGFwaV96b29tLFxuICAgIC8vIFx0bGVmdCAgICAgICA6IGFwaV9sZWZ0LFxuICAgIC8vIFx0cmlnaHQgICAgICA6IGFwaV9yaWdodCxcbiAgICAvLyBcdHN0YXJ0ICAgICAgOiBhcGlfc3RhcnRcbiAgICAvLyB9KTtcblxuICAgIC8vIEF1eGlsaWFyIGZ1bmN0aW9uc1xuICAgIGZ1bmN0aW9uIG1vdmVfdG9fZnJvbnQgKGVsZW0pIHtcbiAgICAgICAgZWxlbS5wYXJlbnROb2RlLmFwcGVuZENoaWxkKGVsZW0pO1xuICAgIH1cblxuICAgIHJldHVybiB0cmFja192aXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBib2FyZDtcbiIsInZhciBhcGlqcyA9IHJlcXVpcmUgKFwidG50LmFwaVwiKTtcbnZhciBzcGlubmVyID0gcmVxdWlyZSAoXCIuL3NwaW5uZXIuanNcIikoKTtcblxudG50X2RhdGEgPSB7fTtcblxudG50X2RhdGEuc3luYyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB1cGRhdGVfdHJhY2sgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgdmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgdHJhY2suZGF0YSgpLmVsZW1lbnRzKHVwZGF0ZV90cmFjay5yZXRyaWV2ZXIoKS5jYWxsKHRyYWNrLCBvYmoubG9jKSk7XG4gICAgICAgIG9iai5vbl9zdWNjZXNzKCk7XG4gICAgfTtcblxuICAgIGFwaWpzICh1cGRhdGVfdHJhY2spXG4gICAgICAgIC5nZXRzZXQgKCdlbGVtZW50cycsIFtdKVxuICAgICAgICAuZ2V0c2V0ICgncmV0cmlldmVyJywgZnVuY3Rpb24gKCkge30pO1xuXG4gICAgcmV0dXJuIHVwZGF0ZV90cmFjaztcbn07XG5cbnRudF9kYXRhLmFzeW5jID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB1cGRhdGVfdHJhY2sgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIHNwaW5uZXIub24uY2FsbCh0cmFjayk7XG4gICAgICAgIHVwZGF0ZV90cmFjay5yZXRyaWV2ZXIoKS5jYWxsKHRyYWNrLCBvYmoubG9jKVxuICAgICAgICAgICAgLnRoZW4gKGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgdHJhY2suZGF0YSgpLmVsZW1lbnRzKHJlc3ApO1xuICAgICAgICAgICAgICAgIG9iai5vbl9zdWNjZXNzKCk7XG4gICAgICAgICAgICAgICAgc3Bpbm5lci5vZmYuY2FsbCh0cmFjayk7XG4gICAgICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIGFwaSA9IGFwaWpzICh1cGRhdGVfdHJhY2spXG4gICAgICAgIC5nZXRzZXQgKCdlbGVtZW50cycsIFtdKVxuICAgICAgICAuZ2V0c2V0ICgncmV0cmlldmVyJyk7XG5cbiAgICByZXR1cm4gdXBkYXRlX3RyYWNrO1xufTtcblxuXG4vLyBBIHByZWRlZmluZWQgdHJhY2sgZGlzcGxheWluZyBubyBleHRlcm5hbCBkYXRhXG4vLyBpdCBpcyB1c2VkIGZvciBsb2NhdGlvbiBhbmQgYXhpcyB0cmFja3MgZm9yIGV4YW1wbGVcbnRudF9kYXRhLmVtcHR5ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB1cGRhdGVyID0gdG50X2RhdGEuc3luYygpO1xuXG4gICAgcmV0dXJuIHVwZGF0ZXI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB0bnRfZGF0YTtcbiIsInZhciBhcGlqcyA9IHJlcXVpcmUgKFwidG50LmFwaVwiKTtcbnZhciBsYXlvdXQgPSByZXF1aXJlKFwiLi9sYXlvdXQuanNcIik7XG5cbi8vIEZFQVRVUkUgVklTXG4vLyB2YXIgYm9hcmQgPSB7fTtcbi8vIGJvYXJkLnRyYWNrID0ge307XG52YXIgdG50X2ZlYXR1cmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRpc3BhdGNoID0gZDMuZGlzcGF0Y2ggKFwiY2xpY2tcIiwgXCJkYmxjbGlja1wiLCBcIm1vdXNlb3ZlclwiLCBcIm1vdXNlb3V0XCIpO1xuXG4gICAgLy8vLy8vIFZhcnMgZXhwb3NlZCBpbiB0aGUgQVBJXG4gICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgICAgY3JlYXRlICAgOiBmdW5jdGlvbiAoKSB7dGhyb3cgXCJjcmVhdGVfZWxlbSBpcyBub3QgZGVmaW5lZCBpbiB0aGUgYmFzZSBmZWF0dXJlIG9iamVjdFwiO30sXG4gICAgICAgIG1vdmUgICAgOiBmdW5jdGlvbiAoKSB7dGhyb3cgXCJtb3ZlX2VsZW0gaXMgbm90IGRlZmluZWQgaW4gdGhlIGJhc2UgZmVhdHVyZSBvYmplY3RcIjt9LFxuICAgICAgICBkaXN0cmlidXRlICA6IGZ1bmN0aW9uICgpIHt9LFxuICAgICAgICBmaXhlZCAgIDogZnVuY3Rpb24gKCkge30sXG4gICAgICAgIC8vbGF5b3V0ICAgOiBmdW5jdGlvbiAoKSB7fSxcbiAgICAgICAgaW5kZXggICAgOiB1bmRlZmluZWQsXG4gICAgICAgIGxheW91dCAgIDogbGF5b3V0LmlkZW50aXR5KCksXG4gICAgICAgIGNvbG9yIDogJyMwMDAnLFxuICAgICAgICBzY2FsZSA6IHVuZGVmaW5lZFxuICAgIH07XG5cblxuICAgIC8vIFRoZSByZXR1cm5lZCBvYmplY3RcbiAgICB2YXIgZmVhdHVyZSA9IHt9O1xuXG4gICAgdmFyIHJlc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICBcdHRyYWNrLmcuc2VsZWN0QWxsKFwiLnRudF9lbGVtXCIpLnJlbW92ZSgpO1xuICAgICAgICB0cmFjay5nLnNlbGVjdEFsbChcIi50bnRfZ3VpZGVyXCIpLnJlbW92ZSgpO1xuICAgICAgICB0cmFjay5nLnNlbGVjdEFsbChcIi50bnRfZml4ZWRcIikucmVtb3ZlKCk7XG4gICAgfTtcblxuICAgIHZhciBpbml0ID0gZnVuY3Rpb24gKHdpZHRoKSB7XG4gICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG5cbiAgICAgICAgdHJhY2suZ1xuICAgICAgICAgICAgLmFwcGVuZCAoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0ciAoXCJjbGFzc1wiLCBcInRudF9maXhlZFwiKVxuICAgICAgICAgICAgLmF0dHIgKFwieFwiLCA1KVxuICAgICAgICAgICAgLmF0dHIgKFwieVwiLCAxMilcbiAgICAgICAgICAgIC5hdHRyIChcImZvbnQtc2l6ZVwiLCAxMSlcbiAgICAgICAgICAgIC5hdHRyIChcImZpbGxcIiwgXCJncmV5XCIpXG4gICAgICAgICAgICAudGV4dCAodHJhY2subGFiZWwoKSk7XG5cbiAgICAgICAgY29uZmlnLmZpeGVkLmNhbGwodHJhY2ssIHdpZHRoKTtcbiAgICB9O1xuXG4gICAgdmFyIHBsb3QgPSBmdW5jdGlvbiAobmV3X2VsZW1zLCB0cmFjaywgeFNjYWxlKSB7XG4gICAgICAgIG5ld19lbGVtcy5vbihcImNsaWNrXCIsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgICAgICBpZiAoZDMuZXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpc3BhdGNoLmNsaWNrLmNhbGwodGhpcywgZCwgaSk7XG4gICAgICAgIH0pO1xuICAgICAgICBuZXdfZWxlbXMub24oXCJtb3VzZW92ZXJcIiwgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgICAgIGlmIChkMy5ldmVudC5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGlzcGF0Y2gubW91c2VvdmVyLmNhbGwodGhpcywgZCwgaSk7XG4gICAgICAgIH0pO1xuICAgICAgICBuZXdfZWxlbXMub24oXCJkYmxjbGlja1wiLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICAgICAgaWYgKGQzLmV2ZW50LmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXNwYXRjaC5kYmxjbGljay5jYWxsKHRoaXMsIGQsIGkpO1xuICAgICAgICB9KTtcbiAgICAgICAgbmV3X2VsZW1zLm9uKFwibW91c2VvdXRcIiwgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgICAgIGlmIChkMy5ldmVudC5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGlzcGF0Y2gubW91c2VvdXQuY2FsbCh0aGlzLCBkLCBpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIG5ld19lbGVtIGlzIGEgZyBlbGVtZW50IHRoZSBmZWF0dXJlIGlzIGluc2VydGVkXG4gICAgICAgIGNvbmZpZy5jcmVhdGUuY2FsbCh0cmFjaywgbmV3X2VsZW1zLCB4U2NhbGUpO1xuICAgIH07XG5cbiAgICB2YXIgdXBkYXRlID0gZnVuY3Rpb24gKGxvYywgZmllbGQpIHtcbiAgICAgICAgdmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgdmFyIHN2Z19nID0gdHJhY2suZztcblxuICAgICAgICB2YXIgZWxlbWVudHMgPSB0cmFjay5kYXRhKCkuZWxlbWVudHMoKTtcblxuICAgICAgICBpZiAoZmllbGQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZWxlbWVudHMgPSBlbGVtZW50c1tmaWVsZF07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZGF0YV9lbGVtcyA9IGNvbmZpZy5sYXlvdXQuY2FsbCh0cmFjaywgZWxlbWVudHMpO1xuXG5cbiAgICAgICAgaWYgKGRhdGFfZWxlbXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHZpc19zZWw7XG4gICAgICAgIHZhciB2aXNfZWxlbXM7XG4gICAgICAgIGlmIChmaWVsZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB2aXNfc2VsID0gc3ZnX2cuc2VsZWN0QWxsKFwiLnRudF9lbGVtX1wiICsgZmllbGQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmlzX3NlbCA9IHN2Z19nLnNlbGVjdEFsbChcIi50bnRfZWxlbVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcuaW5kZXgpIHsgLy8gSW5kZXhpbmcgYnkgZmllbGRcbiAgICAgICAgICAgIHZpc19lbGVtcyA9IHZpc19zZWxcbiAgICAgICAgICAgICAgICAuZGF0YShkYXRhX2VsZW1zLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29uZmlnLmluZGV4KGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7IC8vIEluZGV4aW5nIGJ5IHBvc2l0aW9uIGluIGFycmF5XG4gICAgICAgICAgICB2aXNfZWxlbXMgPSB2aXNfc2VsXG4gICAgICAgICAgICAgICAgLmRhdGEoZGF0YV9lbGVtcyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25maWcuZGlzdHJpYnV0ZS5jYWxsKHRyYWNrLCB2aXNfZWxlbXMsIGNvbmZpZy5zY2FsZSk7XG5cbiAgICBcdHZhciBuZXdfZWxlbSA9IHZpc19lbGVtc1xuICAgIFx0ICAgIC5lbnRlcigpO1xuXG4gICAgXHRuZXdfZWxlbVxuICAgIFx0ICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9lbGVtXCIpXG4gICAgXHQgICAgLmNsYXNzZWQoXCJ0bnRfZWxlbV9cIiArIGZpZWxkLCBmaWVsZClcbiAgICBcdCAgICAuY2FsbChmZWF0dXJlLnBsb3QsIHRyYWNrLCBjb25maWcuc2NhbGUpO1xuXG4gICAgXHR2aXNfZWxlbXNcbiAgICBcdCAgICAuZXhpdCgpXG4gICAgXHQgICAgLnJlbW92ZSgpO1xuICAgIH07XG5cbiAgICB2YXIgbW92ZXIgPSBmdW5jdGlvbiAoZmllbGQpIHtcbiAgICBcdHZhciB0cmFjayA9IHRoaXM7XG4gICAgXHR2YXIgc3ZnX2cgPSB0cmFjay5nO1xuICAgIFx0dmFyIGVsZW1zO1xuICAgIFx0Ly8gVE9ETzogSXMgc2VsZWN0aW5nIHRoZSBlbGVtZW50cyB0byBtb3ZlIHRvbyBzbG93P1xuICAgIFx0Ly8gSXQgd291bGQgYmUgbmljZSB0byBwcm9maWxlXG4gICAgXHRpZiAoZmllbGQgIT09IHVuZGVmaW5lZCkge1xuICAgIFx0ICAgIGVsZW1zID0gc3ZnX2cuc2VsZWN0QWxsKFwiLnRudF9lbGVtX1wiICsgZmllbGQpO1xuICAgIFx0fSBlbHNlIHtcbiAgICBcdCAgICBlbGVtcyA9IHN2Z19nLnNlbGVjdEFsbChcIi50bnRfZWxlbVwiKTtcbiAgICBcdH1cblxuICAgIFx0Y29uZmlnLm1vdmUuY2FsbCh0aGlzLCBlbGVtcyk7XG4gICAgfTtcblxuICAgIHZhciBtdGYgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICBlbGVtLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQoZWxlbSk7XG4gICAgfTtcblxuICAgIHZhciBtb3ZlX3RvX2Zyb250ID0gZnVuY3Rpb24gKGZpZWxkKSB7XG4gICAgICAgIGlmIChmaWVsZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB2YXIgdHJhY2sgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIHN2Z19nID0gdHJhY2suZztcbiAgICAgICAgICAgIHN2Z19nLnNlbGVjdEFsbChcIi50bnRfZWxlbV9cIiArIGZpZWxkKVxuICAgICAgICAgICAgICAgIC5lYWNoKCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIG10Zih0aGlzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBBUElcbiAgICBhcGlqcyAoZmVhdHVyZSlcbiAgICBcdC5nZXRzZXQgKGNvbmZpZylcbiAgICBcdC5tZXRob2QgKHtcbiAgICBcdCAgICByZXNldCAgOiByZXNldCxcbiAgICBcdCAgICBwbG90ICAgOiBwbG90LFxuICAgIFx0ICAgIHVwZGF0ZSA6IHVwZGF0ZSxcbiAgICBcdCAgICBtb3ZlciAgIDogbW92ZXIsXG4gICAgXHQgICAgaW5pdCAgIDogaW5pdCxcbiAgICBcdCAgICBtb3ZlX3RvX2Zyb250IDogbW92ZV90b19mcm9udFxuICAgIFx0fSk7XG5cbiAgICByZXR1cm4gZDMucmViaW5kKGZlYXR1cmUsIGRpc3BhdGNoLCBcIm9uXCIpO1xufTtcblxudG50X2ZlYXR1cmUuY29tcG9zaXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBkaXNwbGF5cyA9IHt9O1xuICAgIHZhciBkaXNwbGF5X29yZGVyID0gW107XG5cbiAgICB2YXIgZmVhdHVyZXMgPSB7fTtcblxuICAgIHZhciByZXNldCA9IGZ1bmN0aW9uICgpIHtcbiAgICBcdHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIGZvciAodmFyIGRpc3BsYXkgaW4gZGlzcGxheXMpIHtcbiAgICAgICAgICAgIGlmIChkaXNwbGF5cy5oYXNPd25Qcm9wZXJ0eShkaXNwbGF5KSkge1xuICAgICAgICAgICAgICAgIGRpc3BsYXlzW2Rpc3BsYXldLnJlc2V0LmNhbGwodHJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBpbml0ID0gZnVuY3Rpb24gKHdpZHRoKSB7XG4gICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIGZvciAodmFyIGRpc3BsYXkgaW4gZGlzcGxheXMpIHtcbiAgICAgICAgICAgIGlmIChkaXNwbGF5cy5oYXNPd25Qcm9wZXJ0eShkaXNwbGF5KSkge1xuICAgICAgICAgICAgICAgIGRpc3BsYXlzW2Rpc3BsYXldLnNjYWxlKGZlYXR1cmVzLnNjYWxlKCkpO1xuICAgICAgICAgICAgICAgIGRpc3BsYXlzW2Rpc3BsYXldLmluaXQuY2FsbCh0cmFjaywgd2lkdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciB1cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgIFx0Zm9yICh2YXIgaT0wOyBpPGRpc3BsYXlfb3JkZXIubGVuZ3RoOyBpKyspIHtcbiAgICBcdCAgICBkaXNwbGF5c1tkaXNwbGF5X29yZGVyW2ldXS51cGRhdGUuY2FsbCh0cmFjaywgdW5kZWZpbmVkLCBkaXNwbGF5X29yZGVyW2ldKTtcbiAgICBcdCAgICBkaXNwbGF5c1tkaXNwbGF5X29yZGVyW2ldXS5tb3ZlX3RvX2Zyb250LmNhbGwodHJhY2ssIGRpc3BsYXlfb3JkZXJbaV0pO1xuICAgIFx0fVxuICAgICAgICAvLyBmb3IgKHZhciBkaXNwbGF5IGluIGRpc3BsYXlzKSB7XG4gICAgICAgIC8vICAgICBpZiAoZGlzcGxheXMuaGFzT3duUHJvcGVydHkoZGlzcGxheSkpIHtcbiAgICAgICAgLy8gICAgICAgICBkaXNwbGF5c1tkaXNwbGF5XS51cGRhdGUuY2FsbCh0cmFjaywgeFNjYWxlLCBkaXNwbGF5KTtcbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy8gfVxuICAgIH07XG5cbiAgICB2YXIgbW92ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIGZvciAodmFyIGRpc3BsYXkgaW4gZGlzcGxheXMpIHtcbiAgICAgICAgICAgIGlmIChkaXNwbGF5cy5oYXNPd25Qcm9wZXJ0eShkaXNwbGF5KSkge1xuICAgICAgICAgICAgICAgIGRpc3BsYXlzW2Rpc3BsYXldLm1vdmVyLmNhbGwodHJhY2ssIGRpc3BsYXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBhZGQgPSBmdW5jdGlvbiAoa2V5LCBkaXNwbGF5KSB7XG4gICAgXHRkaXNwbGF5c1trZXldID0gZGlzcGxheTtcbiAgICBcdGRpc3BsYXlfb3JkZXIucHVzaChrZXkpO1xuICAgIFx0cmV0dXJuIGZlYXR1cmVzO1xuICAgIH07XG5cbiAgICB2YXIgZ2V0X2Rpc3BsYXlzID0gZnVuY3Rpb24gKCkge1xuICAgIFx0dmFyIGRzID0gW107XG4gICAgXHRmb3IgKHZhciBpPTA7IGk8ZGlzcGxheV9vcmRlci5sZW5ndGg7IGkrKykge1xuICAgIFx0ICAgIGRzLnB1c2goZGlzcGxheXNbZGlzcGxheV9vcmRlcltpXV0pO1xuICAgIFx0fVxuICAgIFx0cmV0dXJuIGRzO1xuICAgIH07XG5cbiAgICAvLyBBUElcbiAgICBhcGlqcyAoZmVhdHVyZXMpXG4gICAgICAgIC5nZXRzZXQoXCJzY2FsZVwiKVxuICAgIFx0Lm1ldGhvZCAoe1xuICAgIFx0ICAgIHJlc2V0ICA6IHJlc2V0LFxuICAgIFx0ICAgIHVwZGF0ZSA6IHVwZGF0ZSxcbiAgICBcdCAgICBtb3ZlciAgIDogbW92ZXIsXG4gICAgXHQgICAgaW5pdCAgIDogaW5pdCxcbiAgICBcdCAgICBhZGQgICAgOiBhZGQsXG4gICAgXHQgICAgZGlzcGxheXMgOiBnZXRfZGlzcGxheXNcbiAgICBcdH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmVzO1xufTtcblxudG50X2ZlYXR1cmUuYXJlYSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZmVhdHVyZSA9IHRudF9mZWF0dXJlLmxpbmUoKTtcbiAgICB2YXIgbGluZSA9IGZlYXR1cmUubGluZSgpO1xuXG4gICAgdmFyIGFyZWEgPSBkMy5zdmcuYXJlYSgpXG4gICAgXHQuaW50ZXJwb2xhdGUobGluZS5pbnRlcnBvbGF0ZSgpKVxuICAgIFx0LnRlbnNpb24oZmVhdHVyZS50ZW5zaW9uKCkpO1xuXG4gICAgdmFyIGRhdGFfcG9pbnRzO1xuXG4gICAgdmFyIGxpbmVfY3JlYXRlID0gZmVhdHVyZS5jcmVhdGUoKTsgLy8gV2UgJ3NhdmUnIGxpbmUgY3JlYXRpb25cblxuICAgIGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAocG9pbnRzKSB7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgICAgICB2YXIgeFNjYWxlID0gZmVhdHVyZS5zY2FsZSgpO1xuXG4gICAgXHRpZiAoZGF0YV9wb2ludHMgIT09IHVuZGVmaW5lZCkge1xuICAgIFx0ICAgIHRyYWNrLmcuc2VsZWN0KFwicGF0aFwiKS5yZW1vdmUoKTtcbiAgICBcdH1cblxuICAgIFx0bGluZV9jcmVhdGUuY2FsbCh0cmFjaywgcG9pbnRzLCB4U2NhbGUpO1xuXG4gICAgXHRhcmVhXG4gICAgXHQgICAgLngobGluZS54KCkpXG4gICAgXHQgICAgLnkxKGxpbmUueSgpKVxuICAgIFx0ICAgIC55MCh0cmFjay5oZWlnaHQoKSk7XG5cbiAgICBcdGRhdGFfcG9pbnRzID0gcG9pbnRzLmRhdGEoKTtcbiAgICBcdHBvaW50cy5yZW1vdmUoKTtcblxuICAgIFx0dHJhY2suZ1xuICAgIFx0ICAgIC5hcHBlbmQoXCJwYXRoXCIpXG4gICAgXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9hcmVhXCIpXG4gICAgXHQgICAgLmNsYXNzZWQoXCJ0bnRfZWxlbVwiLCB0cnVlKVxuICAgIFx0ICAgIC5kYXR1bShkYXRhX3BvaW50cylcbiAgICBcdCAgICAuYXR0cihcImRcIiwgYXJlYSlcbiAgICBcdCAgICAuYXR0cihcImZpbGxcIiwgZDMucmdiKGZlYXR1cmUuY29sb3IoKSkuYnJpZ2h0ZXIoKSk7XG4gICAgfSk7XG5cbiAgICB2YXIgbGluZV9tb3ZlID0gZmVhdHVyZS5tb3ZlKCk7XG4gICAgZmVhdHVyZS5tb3ZlIChmdW5jdGlvbiAocGF0aCkge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgdmFyIHhTY2FsZSA9IGZlYXR1cmUuc2NhbGUoKTtcbiAgICBcdGxpbmVfbW92ZS5jYWxsKHRyYWNrLCBwYXRoLCB4U2NhbGUpO1xuXG4gICAgXHRhcmVhLngobGluZS54KCkpO1xuICAgIFx0dHJhY2suZ1xuICAgIFx0ICAgIC5zZWxlY3QoXCIudG50X2FyZWFcIilcbiAgICBcdCAgICAuZGF0dW0oZGF0YV9wb2ludHMpXG4gICAgXHQgICAgLmF0dHIoXCJkXCIsIGFyZWEpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG5cbn07XG5cbnRudF9mZWF0dXJlLmxpbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgdmFyIHggPSBmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gZC5wb3M7XG4gICAgfTtcbiAgICB2YXIgeSA9IGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLnZhbDtcbiAgICB9O1xuICAgIHZhciB0ZW5zaW9uID0gMC43O1xuICAgIHZhciB5U2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKTtcbiAgICB2YXIgbGluZSA9IGQzLnN2Zy5saW5lKClcbiAgICAgICAgLmludGVycG9sYXRlKFwiYmFzaXNcIik7XG5cbiAgICAvLyBsaW5lIGdldHRlci4gVE9ETzogU2V0dGVyP1xuICAgIGZlYXR1cmUubGluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGxpbmU7XG4gICAgfTtcblxuICAgIGZlYXR1cmUueCA9IGZ1bmN0aW9uIChjYmFrKSB7XG4gICAgXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBcdCAgICByZXR1cm4geDtcbiAgICBcdH1cbiAgICBcdHggPSBjYmFrO1xuICAgIFx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIGZlYXR1cmUueSA9IGZ1bmN0aW9uIChjYmFrKSB7XG4gICAgXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBcdCAgICByZXR1cm4geTtcbiAgICBcdH1cbiAgICBcdHkgPSBjYmFrO1xuICAgIFx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIGZlYXR1cmUudGVuc2lvbiA9IGZ1bmN0aW9uICh0KSB7XG4gICAgXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBcdCAgICByZXR1cm4gdGVuc2lvbjtcbiAgICBcdH1cbiAgICBcdHRlbnNpb24gPSB0O1xuICAgIFx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIHZhciBkYXRhX3BvaW50cztcblxuICAgIC8vIEZvciBub3csIGNyZWF0ZSBpcyBhIG9uZS1vZmYgZXZlbnRcbiAgICAvLyBUT0RPOiBNYWtlIGl0IHdvcmsgd2l0aCBwYXJ0aWFsIHBhdGhzLCBpZS4gY3JlYXRpbmcgYW5kIGRpc3BsYXlpbmcgb25seSB0aGUgcGF0aCB0aGF0IGlzIGJlaW5nIGRpc3BsYXllZFxuICAgIGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAocG9pbnRzKSB7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgICAgICB2YXIgeFNjYWxlID0gZmVhdHVyZS5zY2FsZSgpO1xuXG4gICAgXHRpZiAoZGF0YV9wb2ludHMgIT09IHVuZGVmaW5lZCkge1xuICAgIFx0ICAgIC8vIHJldHVybjtcbiAgICBcdCAgICB0cmFjay5nLnNlbGVjdChcInBhdGhcIikucmVtb3ZlKCk7XG4gICAgXHR9XG5cbiAgICBcdGxpbmVcbiAgICBcdCAgICAudGVuc2lvbih0ZW5zaW9uKVxuICAgIFx0ICAgIC54KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhTY2FsZSh4KGQpKTtcbiAgICBcdCAgICB9KVxuICAgIFx0ICAgIC55KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRyYWNrLmhlaWdodCgpIC0geVNjYWxlKHkoZCkpO1xuICAgIFx0ICAgIH0pO1xuXG4gICAgXHRkYXRhX3BvaW50cyA9IHBvaW50cy5kYXRhKCk7XG4gICAgXHRwb2ludHMucmVtb3ZlKCk7XG5cbiAgICBcdHlTY2FsZVxuICAgIFx0ICAgIC5kb21haW4oWzAsIDFdKVxuICAgIFx0ICAgIC8vIC5kb21haW4oWzAsIGQzLm1heChkYXRhX3BvaW50cywgZnVuY3Rpb24gKGQpIHtcbiAgICBcdCAgICAvLyBcdHJldHVybiB5KGQpO1xuICAgIFx0ICAgIC8vIH0pXSlcbiAgICBcdCAgICAucmFuZ2UoWzAsIHRyYWNrLmhlaWdodCgpIC0gMl0pO1xuXG4gICAgXHR0cmFjay5nXG4gICAgXHQgICAgLmFwcGVuZChcInBhdGhcIilcbiAgICBcdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X2VsZW1cIilcbiAgICBcdCAgICAuYXR0cihcImRcIiwgbGluZShkYXRhX3BvaW50cykpXG4gICAgXHQgICAgLnN0eWxlKFwic3Ryb2tlXCIsIGZlYXR1cmUuY29sb3IoKSlcbiAgICBcdCAgICAuc3R5bGUoXCJzdHJva2Utd2lkdGhcIiwgNClcbiAgICBcdCAgICAuc3R5bGUoXCJmaWxsXCIsIFwibm9uZVwiKTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZSAoZnVuY3Rpb24gKHBhdGgpIHtcbiAgICBcdHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIHZhciB4U2NhbGUgPSBmZWF0dXJlLnNjYWxlKCk7XG5cbiAgICBcdGxpbmUueChmdW5jdGlvbiAoZCkge1xuICAgIFx0ICAgIHJldHVybiB4U2NhbGUoeChkKSk7XG4gICAgXHR9KTtcbiAgICBcdHRyYWNrLmcuc2VsZWN0KFwicGF0aFwiKVxuICAgIFx0ICAgIC5hdHRyKFwiZFwiLCBsaW5lKGRhdGFfcG9pbnRzKSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbnRudF9mZWF0dXJlLmNvbnNlcnZhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gJ0luaGVyaXQnIGZyb20gZmVhdHVyZS5hcmVhXG4gICAgICAgIHZhciBmZWF0dXJlID0gdG50X2ZlYXR1cmUuYXJlYSgpO1xuXG4gICAgICAgIHZhciBhcmVhX2NyZWF0ZSA9IGZlYXR1cmUuY3JlYXRlKCk7IC8vIFdlICdzYXZlJyBhcmVhIGNyZWF0aW9uXG4gICAgICAgIGZlYXR1cmUuY3JlYXRlICAoZnVuY3Rpb24gKHBvaW50cykge1xuICAgICAgICBcdHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgeFNjYWxlID0gZmVhdHVyZS5zY2FsZSgpO1xuICAgICAgICBcdGFyZWFfY3JlYXRlLmNhbGwodHJhY2ssIGQzLnNlbGVjdChwb2ludHNbMF1bMF0pLCB4U2NhbGUpO1xuICAgICAgICB9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xufTtcblxudG50X2ZlYXR1cmUuZW5zZW1ibCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAnSW5oZXJpdCcgZnJvbSBib2FyZC50cmFjay5mZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgdmFyIGNvbG9yMiA9IFwiIzdGRkYwMFwiO1xuICAgIHZhciBjb2xvcjMgPSBcIiMwMEJCMDBcIjtcblxuICAgIGZlYXR1cmUuZml4ZWQgKGZ1bmN0aW9uICh3aWR0aCkge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICBcdHZhciBoZWlnaHRfb2Zmc2V0ID0gfn4odHJhY2suaGVpZ2h0KCkgLSAodHJhY2suaGVpZ2h0KCkgICogMC44KSkgLyAyO1xuXG4gICAgXHR0cmFjay5nXG4gICAgXHQgICAgLmFwcGVuZChcImxpbmVcIilcbiAgICBcdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X2d1aWRlciB0bnRfZml4ZWRcIilcbiAgICBcdCAgICAuYXR0cihcIngxXCIsIDApXG4gICAgXHQgICAgLmF0dHIoXCJ4MlwiLCB3aWR0aClcbiAgICBcdCAgICAuYXR0cihcInkxXCIsIGhlaWdodF9vZmZzZXQpXG4gICAgXHQgICAgLmF0dHIoXCJ5MlwiLCBoZWlnaHRfb2Zmc2V0KVxuICAgIFx0ICAgIC5zdHlsZShcInN0cm9rZVwiLCBmZWF0dXJlLmNvbG9yKCkpXG4gICAgXHQgICAgLnN0eWxlKFwic3Ryb2tlLXdpZHRoXCIsIDEpO1xuXG4gICAgXHR0cmFjay5nXG4gICAgXHQgICAgLmFwcGVuZChcImxpbmVcIilcbiAgICBcdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X2d1aWRlciB0bnRfZml4ZWRcIilcbiAgICBcdCAgICAuYXR0cihcIngxXCIsIDApXG4gICAgXHQgICAgLmF0dHIoXCJ4MlwiLCB3aWR0aClcbiAgICBcdCAgICAuYXR0cihcInkxXCIsIHRyYWNrLmhlaWdodCgpIC0gaGVpZ2h0X29mZnNldClcbiAgICBcdCAgICAuYXR0cihcInkyXCIsIHRyYWNrLmhlaWdodCgpIC0gaGVpZ2h0X29mZnNldClcbiAgICBcdCAgICAuc3R5bGUoXCJzdHJva2VcIiwgZmVhdHVyZS5jb2xvcigpKVxuICAgIFx0ICAgIC5zdHlsZShcInN0cm9rZS13aWR0aFwiLCAxKTtcblxuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChuZXdfZWxlbXMpIHtcbiAgICBcdHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIHZhciB4U2NhbGUgPSBmZWF0dXJlLnNjYWxlKCk7XG5cbiAgICBcdHZhciBoZWlnaHRfb2Zmc2V0ID0gfn4odHJhY2suaGVpZ2h0KCkgLSAodHJhY2suaGVpZ2h0KCkgICogMC44KSkgLyAyO1xuXG4gICAgXHRuZXdfZWxlbXNcbiAgICBcdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuICAgIFx0ICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUgKGQuc3RhcnQpO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJ5XCIsIGhlaWdodF9vZmZzZXQpXG4gICAgLy8gXHQgICAgLmF0dHIoXCJyeFwiLCAzKVxuICAgIC8vIFx0ICAgIC5hdHRyKFwicnlcIiwgMylcbiAgICBcdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcbiAgICBcdCAgICB9KVxuICAgIFx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIHRyYWNrLmhlaWdodCgpIC0gfn4oaGVpZ2h0X29mZnNldCAqIDIpKVxuICAgIFx0ICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5jb2xvcigpKVxuICAgIFx0ICAgIC50cmFuc2l0aW9uKClcbiAgICBcdCAgICAuZHVyYXRpb24oNTAwKVxuICAgIFx0ICAgIC5hdHRyKFwiZmlsbFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBcdFx0aWYgKGQudHlwZSA9PT0gJ2hpZ2gnKSB7XG4gICAgICAgIFx0XHQgICAgcmV0dXJuIGQzLnJnYihmZWF0dXJlLmNvbG9yKCkpO1xuICAgICAgICBcdFx0fVxuICAgICAgICBcdFx0aWYgKGQudHlwZSA9PT0gJ2xvdycpIHtcbiAgICAgICAgXHRcdCAgICByZXR1cm4gZDMucmdiKGZlYXR1cmUuY29sb3IyKCkpO1xuICAgICAgICBcdFx0fVxuICAgICAgICBcdFx0cmV0dXJuIGQzLnJnYihmZWF0dXJlLmNvbG9yMygpKTtcbiAgICBcdCAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUuZGlzdHJpYnV0ZSAoZnVuY3Rpb24gKGJsb2Nrcykge1xuICAgICAgICB2YXIgeFNjYWxlID0gZmVhdHVyZS5zY2FsZSgpO1xuICAgIFx0YmxvY2tzXG4gICAgXHQgICAgLnNlbGVjdChcInJlY3RcIilcbiAgICBcdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcbiAgICBcdCAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZSAoZnVuY3Rpb24gKGJsb2Nrcykge1xuICAgICAgICB2YXIgeFNjYWxlID0gZmVhdHVyZS5zY2FsZSgpO1xuICAgIFx0YmxvY2tzXG4gICAgXHQgICAgLnNlbGVjdChcInJlY3RcIilcbiAgICBcdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geFNjYWxlKGQuc3RhcnQpO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoeFNjYWxlKGQuZW5kKSAtIHhTY2FsZShkLnN0YXJ0KSk7XG4gICAgXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLmNvbG9yMiA9IGZ1bmN0aW9uIChjb2wpIHtcbiAgICBcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIFx0ICAgIHJldHVybiBjb2xvcjI7XG4gICAgXHR9XG4gICAgXHRjb2xvcjIgPSBjb2w7XG4gICAgXHRyZXR1cm4gZmVhdHVyZTtcbiAgICB9O1xuXG4gICAgZmVhdHVyZS5jb2xvcjMgPSBmdW5jdGlvbiAoY29sKSB7XG4gICAgXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBcdCAgICByZXR1cm4gY29sb3IzO1xuICAgIFx0fVxuICAgIFx0Y29sb3IzID0gY29sO1xuICAgIFx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xufTtcblxudG50X2ZlYXR1cmUudmxpbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gJ0luaGVyaXQnIGZyb20gZmVhdHVyZVxuICAgIHZhciBmZWF0dXJlID0gdG50X2ZlYXR1cmUoKTtcblxuICAgIGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAobmV3X2VsZW1zKSB7XG4gICAgICAgIHZhciB4U2NhbGUgPSBmZWF0dXJlLnNjYWxlKCk7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgIFx0bmV3X2VsZW1zXG4gICAgXHQgICAgLmFwcGVuZCAoXCJsaW5lXCIpXG4gICAgXHQgICAgLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUoZmVhdHVyZS5pbmRleCgpKGQpKTtcbiAgICBcdCAgICB9KVxuICAgIFx0ICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geFNjYWxlKGZlYXR1cmUuaW5kZXgoKShkKSk7XG4gICAgXHQgICAgfSlcbiAgICBcdCAgICAuYXR0cihcInkxXCIsIDApXG4gICAgXHQgICAgLmF0dHIoXCJ5MlwiLCB0cmFjay5oZWlnaHQoKSlcbiAgICBcdCAgICAuYXR0cihcInN0cm9rZVwiLCBmZWF0dXJlLmNvbG9yKCkpXG4gICAgXHQgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwgMSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLm1vdmUgKGZ1bmN0aW9uICh2bGluZXMpIHtcbiAgICAgICAgdmFyIHhTY2FsZSA9IGZlYXR1cmUuc2NhbGUoKTtcbiAgICBcdHZsaW5lc1xuICAgIFx0ICAgIC5zZWxlY3QoXCJsaW5lXCIpXG4gICAgXHQgICAgLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUoZmVhdHVyZS5pbmRleCgpKGQpKTtcbiAgICBcdCAgICB9KVxuICAgIFx0ICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geFNjYWxlKGZlYXR1cmUuaW5kZXgoKShkKSk7XG4gICAgXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcblxufTtcblxudG50X2ZlYXR1cmUucGluID0gZnVuY3Rpb24gKCkge1xuICAgIC8vICdJbmhlcml0JyBmcm9tIGJvYXJkLnRyYWNrLmZlYXR1cmVcbiAgICB2YXIgZmVhdHVyZSA9IHRudF9mZWF0dXJlKCk7XG5cbiAgICB2YXIgeVNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICBcdC5kb21haW4oWzAsMF0pXG4gICAgXHQucmFuZ2UoWzAsMF0pO1xuXG4gICAgdmFyIG9wdHMgPSB7XG4gICAgICAgIHBvcyA6IGQzLmZ1bmN0b3IoXCJwb3NcIiksXG4gICAgICAgIHZhbCA6IGQzLmZ1bmN0b3IoXCJ2YWxcIiksXG4gICAgICAgIGRvbWFpbiA6IFswLDBdXG4gICAgfTtcblxuICAgIHZhciBwaW5fYmFsbF9yID0gNTsgLy8gdGhlIHJhZGl1cyBvZiB0aGUgY2lyY2xlIGluIHRoZSBwaW5cblxuICAgIGFwaWpzKGZlYXR1cmUpXG4gICAgICAgIC5nZXRzZXQob3B0cyk7XG5cblxuICAgIGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAobmV3X3BpbnMpIHtcbiAgICBcdHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIHZhciB4U2NhbGUgPSBmZWF0dXJlLnNjYWxlKCk7XG4gICAgXHR5U2NhbGVcbiAgICBcdCAgICAuZG9tYWluKGZlYXR1cmUuZG9tYWluKCkpXG4gICAgXHQgICAgLnJhbmdlKFtwaW5fYmFsbF9yLCB0cmFjay5oZWlnaHQoKS1waW5fYmFsbF9yLTEwXSk7IC8vIDEwIGZvciBsYWJlbGxpbmdcblxuICAgIFx0Ly8gcGlucyBhcmUgY29tcG9zZWQgb2YgbGluZXMsIGNpcmNsZXMgYW5kIGxhYmVsc1xuICAgIFx0bmV3X3BpbnNcbiAgICBcdCAgICAuYXBwZW5kKFwibGluZVwiKVxuICAgIFx0ICAgIC5hdHRyKFwieDFcIiwgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICBcdCAgICBcdHJldHVybiB4U2NhbGUoZFtvcHRzLnBvcyhkLCBpKV0pO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJ5MVwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cmFjay5oZWlnaHQoKTtcbiAgICBcdCAgICB9KVxuICAgIFx0ICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24gKGQsaSkge1xuICAgIFx0ICAgIFx0cmV0dXJuIHhTY2FsZShkW29wdHMucG9zKGQsIGkpXSk7XG4gICAgXHQgICAgfSlcbiAgICBcdCAgICAuYXR0cihcInkyXCIsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgXHQgICAgXHRyZXR1cm4gdHJhY2suaGVpZ2h0KCkgLSB5U2NhbGUoZFtvcHRzLnZhbChkLCBpKV0pO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJzdHJva2VcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZDMuZnVuY3RvcihmZWF0dXJlLmNvbG9yKCkpKGQpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICBcdG5ld19waW5zXG4gICAgXHQgICAgLmFwcGVuZChcImNpcmNsZVwiKVxuICAgIFx0ICAgIC5hdHRyKFwiY3hcIiwgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geFNjYWxlKGRbb3B0cy5wb3MoZCwgaSldKTtcbiAgICBcdCAgICB9KVxuICAgIFx0ICAgIC5hdHRyKFwiY3lcIiwgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJhY2suaGVpZ2h0KCkgLSB5U2NhbGUoZFtvcHRzLnZhbChkLCBpKV0pO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJyXCIsIHBpbl9iYWxsX3IpXG4gICAgXHQgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZ1bmN0b3IoZmVhdHVyZS5jb2xvcigpKShkKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIG5ld19waW5zXG4gICAgICAgICAgICAuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJmb250LXNpemVcIiwgXCIxM1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhTY2FsZShkW29wdHMucG9zKGQsIGkpXSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDEwO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZ1bmN0b3IoZmVhdHVyZS5jb2xvcigpKShkKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGV4dChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkLmxhYmVsIHx8IFwiXCI7XG4gICAgICAgICAgICB9KTtcblxuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5kaXN0cmlidXRlIChmdW5jdGlvbiAocGlucykge1xuICAgICAgICBwaW5zXG4gICAgICAgICAgICAuc2VsZWN0KFwidGV4dFwiKVxuICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5sYWJlbCB8fCBcIlwiO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLm1vdmUoZnVuY3Rpb24gKHBpbnMpIHtcbiAgICBcdHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIHZhciB4U2NhbGUgPSBmZWF0dXJlLnNjYWxlKCk7XG5cbiAgICBcdHBpbnNcbiAgICBcdCAgICAvLy5lYWNoKHBvc2l0aW9uX3Bpbl9saW5lKVxuICAgIFx0ICAgIC5zZWxlY3QoXCJsaW5lXCIpXG4gICAgXHQgICAgLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUoZFtvcHRzLnBvcyhkLCBpKV0pO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJ5MVwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBcdFx0cmV0dXJuIHRyYWNrLmhlaWdodCgpO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJ4MlwiLCBmdW5jdGlvbiAoZCxpKSB7XG4gICAgICAgIFx0XHRyZXR1cm4geFNjYWxlKGRbb3B0cy5wb3MoZCwgaSldKTtcbiAgICBcdCAgICB9KVxuICAgIFx0ICAgIC5hdHRyKFwieTJcIiwgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgXHRcdHJldHVybiB0cmFjay5oZWlnaHQoKSAtIHlTY2FsZShkW29wdHMudmFsKGQsIGkpXSk7XG4gICAgXHQgICAgfSk7XG5cbiAgICBcdHBpbnNcbiAgICBcdCAgICAuc2VsZWN0KFwiY2lyY2xlXCIpXG4gICAgXHQgICAgLmF0dHIoXCJjeFwiLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUoZFtvcHRzLnBvcyhkLCBpKV0pO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJjeVwiLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cmFjay5oZWlnaHQoKSAtIHlTY2FsZShkW29wdHMudmFsKGQsIGkpXSk7XG4gICAgXHQgICAgfSk7XG5cbiAgICAgICAgcGluc1xuICAgICAgICAgICAgLnNlbGVjdChcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUoZFtvcHRzLnBvcyhkLCBpKV0pO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQubGFiZWwgfHwgXCJcIjtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLmZpeGVkIChmdW5jdGlvbiAod2lkdGgpIHtcbiAgICAgICAgdmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgdHJhY2suZ1xuICAgICAgICAgICAgLmFwcGVuZChcImxpbmVcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZml4ZWRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieDFcIiwgMClcbiAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgd2lkdGgpXG4gICAgICAgICAgICAuYXR0cihcInkxXCIsIHRyYWNrLmhlaWdodCgpKVxuICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCB0cmFjay5oZWlnaHQoKSlcbiAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZVwiLCBcImJsYWNrXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJzdHJva2Utd2l0aFwiLCBcIjFweFwiKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xufTtcblxudG50X2ZlYXR1cmUuYmxvY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gJ0luaGVyaXQnIGZyb20gYm9hcmQudHJhY2suZmVhdHVyZVxuICAgIHZhciBmZWF0dXJlID0gdG50X2ZlYXR1cmUoKTtcblxuICAgIGFwaWpzKGZlYXR1cmUpXG4gICAgXHQuZ2V0c2V0KCdmcm9tJywgZnVuY3Rpb24gKGQpIHtcbiAgICBcdCAgICByZXR1cm4gZC5zdGFydDtcbiAgICBcdH0pXG4gICAgXHQuZ2V0c2V0KCd0bycsIGZ1bmN0aW9uIChkKSB7XG4gICAgXHQgICAgcmV0dXJuIGQuZW5kO1xuICAgIFx0fSk7XG5cbiAgICBmZWF0dXJlLmNyZWF0ZShmdW5jdGlvbiAobmV3X2VsZW1zKSB7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgICAgICB2YXIgeFNjYWxlID0gZmVhdHVyZS5zY2FsZSgpO1xuICAgIFx0bmV3X2VsZW1zXG4gICAgXHQgICAgLmFwcGVuZChcInJlY3RcIilcbiAgICBcdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgXHRcdC8vIFRPRE86IHN0YXJ0LCBlbmQgc2hvdWxkIGJlIGFkanVzdGFibGUgdmlhIHRoZSB0cmFja3MgQVBJXG4gICAgICAgIFx0XHRyZXR1cm4geFNjYWxlKGZlYXR1cmUuZnJvbSgpKGQsIGkpKTtcbiAgICBcdCAgICB9KVxuICAgIFx0ICAgIC5hdHRyKFwieVwiLCAwKVxuICAgIFx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgXHRcdHJldHVybiAoeFNjYWxlKGZlYXR1cmUudG8oKShkLCBpKSkgLSB4U2NhbGUoZmVhdHVyZS5mcm9tKCkoZCwgaSkpKTtcbiAgICBcdCAgICB9KVxuICAgIFx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIHRyYWNrLmhlaWdodCgpKVxuICAgIFx0ICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5jb2xvcigpKVxuICAgIFx0ICAgIC50cmFuc2l0aW9uKClcbiAgICBcdCAgICAuZHVyYXRpb24oNTAwKVxuICAgIFx0ICAgIC5hdHRyKFwiZmlsbFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBcdFx0aWYgKGQuY29sb3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBcdFx0ICAgIHJldHVybiBmZWF0dXJlLmNvbG9yKCk7XG4gICAgICAgIFx0XHR9IGVsc2Uge1xuICAgICAgICBcdFx0ICAgIHJldHVybiBkLmNvbG9yO1xuICAgICAgICBcdFx0fVxuICAgIFx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5kaXN0cmlidXRlKGZ1bmN0aW9uIChlbGVtcykge1xuICAgICAgICB2YXIgeFNjYWxlID0gZmVhdHVyZS5zY2FsZSgpO1xuICAgIFx0ZWxlbXNcbiAgICBcdCAgICAuc2VsZWN0KFwicmVjdFwiKVxuICAgIFx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgXHRcdHJldHVybiAoeFNjYWxlKGQuZW5kKSAtIHhTY2FsZShkLnN0YXJ0KSk7XG4gICAgXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLm1vdmUoZnVuY3Rpb24gKGJsb2Nrcykge1xuICAgICAgICB2YXIgeFNjYWxlID0gZmVhdHVyZS5zY2FsZSgpO1xuICAgIFx0YmxvY2tzXG4gICAgXHQgICAgLnNlbGVjdChcInJlY3RcIilcbiAgICBcdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgXHRcdHJldHVybiB4U2NhbGUoZC5zdGFydCk7XG4gICAgXHQgICAgfSlcbiAgICBcdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIFx0XHRyZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuICAgIFx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG5cbn07XG5cbnRudF9mZWF0dXJlLmF4aXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHhBeGlzO1xuICAgIHZhciBvcmllbnRhdGlvbiA9IFwidG9wXCI7XG4gICAgdmFyIHhTY2FsZTtcblxuICAgIC8vIEF4aXMgZG9lc24ndCBpbmhlcml0IGZyb20gZmVhdHVyZVxuICAgIHZhciBmZWF0dXJlID0ge307XG4gICAgZmVhdHVyZS5yZXNldCA9IGZ1bmN0aW9uICgpIHtcbiAgICBcdHhBeGlzID0gdW5kZWZpbmVkO1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICBcdHRyYWNrLmcuc2VsZWN0QWxsKFwiLnRpY2tcIikucmVtb3ZlKCk7XG4gICAgfTtcbiAgICBmZWF0dXJlLnBsb3QgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICBmZWF0dXJlLm1vdmVyID0gZnVuY3Rpb24gKCkge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICBcdHZhciBzdmdfZyA9IHRyYWNrLmc7XG4gICAgXHRzdmdfZy5jYWxsKHhBeGlzKTtcbiAgICB9O1xuXG4gICAgZmVhdHVyZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB4QXhpcyA9IHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgZmVhdHVyZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgXHQvLyBDcmVhdGUgQXhpcyBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgIGlmICh4QXhpcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB4QXhpcyA9IGQzLnN2Zy5heGlzKClcbiAgICAgICAgICAgICAgICAuc2NhbGUoeFNjYWxlKVxuICAgICAgICAgICAgICAgIC5vcmllbnQob3JpZW50YXRpb24pO1xuICAgICAgICB9XG5cbiAgICBcdHZhciB0cmFjayA9IHRoaXM7XG4gICAgXHR2YXIgc3ZnX2cgPSB0cmFjay5nO1xuICAgIFx0c3ZnX2cuY2FsbCh4QXhpcyk7XG4gICAgfTtcblxuICAgIGZlYXR1cmUub3JpZW50YXRpb24gPSBmdW5jdGlvbiAocG9zKSB7XG4gICAgXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBcdCAgICByZXR1cm4gb3JpZW50YXRpb247XG4gICAgXHR9XG4gICAgXHRvcmllbnRhdGlvbiA9IHBvcztcbiAgICBcdHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICBmZWF0dXJlLnNjYWxlID0gZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4geFNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIHhTY2FsZSA9IHM7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbnRudF9mZWF0dXJlLmxvY2F0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciByb3c7XG4gICAgdmFyIHhTY2FsZTtcblxuICAgIHZhciBmZWF0dXJlID0ge307XG4gICAgZmVhdHVyZS5yZXNldCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcm93ID0gdW5kZWZpbmVkO1xuICAgIH07XG4gICAgZmVhdHVyZS5wbG90ID0gZnVuY3Rpb24gKCkge307XG4gICAgZmVhdHVyZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByb3cgPSB1bmRlZmluZWQ7XG4gICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIHRyYWNrLmcuc2VsZWN0KFwidGV4dFwiKS5yZW1vdmUoKTtcbiAgICB9O1xuICAgIGZlYXR1cmUubW92ZXIgPSBmdW5jdGlvbigpIHtcbiAgICBcdHZhciBkb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG4gICAgXHRyb3cuc2VsZWN0KFwidGV4dFwiKVxuICAgIFx0ICAgIC50ZXh0KFwiTG9jYXRpb246IFwiICsgfn5kb21haW5bMF0gKyBcIi1cIiArIH5+ZG9tYWluWzFdKTtcbiAgICB9O1xuXG4gICAgZmVhdHVyZS5zY2FsZSA9IGZ1bmN0aW9uIChzYykge1xuICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB4U2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgeFNjYWxlID0gc2M7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICBmZWF0dXJlLnVwZGF0ZSA9IGZ1bmN0aW9uIChsb2MpIHtcbiAgICBcdHZhciB0cmFjayA9IHRoaXM7XG4gICAgXHR2YXIgc3ZnX2cgPSB0cmFjay5nO1xuICAgIFx0dmFyIGRvbWFpbiA9IHhTY2FsZS5kb21haW4oKTtcbiAgICBcdGlmIChyb3cgPT09IHVuZGVmaW5lZCkge1xuICAgIFx0ICAgIHJvdyA9IHN2Z19nO1xuICAgIFx0ICAgIHJvd1xuICAgICAgICBcdFx0LmFwcGVuZChcInRleHRcIilcbiAgICAgICAgXHRcdC50ZXh0KFwiTG9jYXRpb246IFwiICsgTWF0aC5yb3VuZChkb21haW5bMF0pICsgXCItXCIgKyBNYXRoLnJvdW5kKGRvbWFpblsxXSkpO1xuICAgIFx0fVxuICAgIH07XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRudF9mZWF0dXJlO1xuIiwidmFyIGJvYXJkID0gcmVxdWlyZSAoXCIuL2JvYXJkLmpzXCIpO1xuYm9hcmQudHJhY2sgPSByZXF1aXJlIChcIi4vdHJhY2tcIik7XG5ib2FyZC50cmFjay5kYXRhID0gcmVxdWlyZSAoXCIuL2RhdGEuanNcIik7XG5ib2FyZC50cmFjay5sYXlvdXQgPSByZXF1aXJlIChcIi4vbGF5b3V0LmpzXCIpO1xuYm9hcmQudHJhY2suZmVhdHVyZSA9IHJlcXVpcmUgKFwiLi9mZWF0dXJlLmpzXCIpO1xuYm9hcmQudHJhY2subGF5b3V0ID0gcmVxdWlyZSAoXCIuL2xheW91dC5qc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gYm9hcmQ7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG5cbi8vIHZhciBib2FyZCA9IHt9O1xuLy8gYm9hcmQudHJhY2sgPSB7fTtcbnZhciBsYXlvdXQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyBUaGUgcmV0dXJuZWQgY2xvc3VyZSAvIG9iamVjdFxuICAgIHZhciBsID0gZnVuY3Rpb24gKG5ld19lbGVtcykgIHtcbiAgICAgICAgdmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgbC5lbGVtZW50cygpLmNhbGwodHJhY2ssIG5ld19lbGVtcyk7XG4gICAgICAgIHJldHVybiBuZXdfZWxlbXM7XG4gICAgfTtcblxuICAgIHZhciBhcGkgPSBhcGlqcyhsKVxuICAgICAgICAuZ2V0c2V0ICgnZWxlbWVudHMnLCBmdW5jdGlvbiAoKSB7fSk7XG5cbiAgICByZXR1cm4gbDtcbn07XG5cbmxheW91dC5pZGVudGl0eSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbGF5b3V0KClcbiAgICAgICAgLmVsZW1lbnRzIChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIGU7XG4gICAgICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gbGF5b3V0O1xuIiwidmFyIHNwaW5uZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gdmFyIG4gPSAwO1xuICAgIHZhciBzcF9lbGVtO1xuICAgIHZhciBzcCA9IHt9O1xuXG4gICAgc3Aub24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIGlmICghdHJhY2suc3Bpbm5lcikge1xuICAgICAgICAgICAgdHJhY2suc3Bpbm5lciA9IDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cmFjay5zcGlubmVyKys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRyYWNrLnNwaW5uZXI9PTEpIHtcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSB0cmFjay5nO1xuICAgICAgICAgICAgdmFyIGJnQ29sb3IgPSB0cmFjay5jb2xvcigpO1xuICAgICAgICAgICAgc3BfZWxlbSA9IGNvbnRhaW5lclxuICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJzdmdcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3NwaW5uZXJcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIFwiMzBweFwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIFwiMzBweFwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieG1sc1wiLCBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ2aWV3Qm94XCIsIFwiMCAwIDEwMCAxMDBcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInByZXNlcnZlQXNwZWN0UmF0aW9cIiwgXCJ4TWlkWU1pZFwiKTtcblxuXG4gICAgICAgICAgICBzcF9lbGVtXG4gICAgICAgICAgICAgICAgLmFwcGVuZChcInJlY3RcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInhcIiwgJzAnKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieVwiLCAnMCcpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBcIjEwMFwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIFwiMTAwXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJyeFwiLCAnNTAnKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwicnlcIiwgJzUwJylcbiAgICAgICAgICAgICAgICAuYXR0cihcImZpbGxcIiwgYmdDb2xvcik7XG4gICAgICAgICAgICAgICAgLy8uYXR0cihcIm9wYWNpdHlcIiwgMC42KTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPDEyOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aWNrKHNwX2VsZW0sIGksIGJnQ29sb3IpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAodHJhY2suc3Bpbm5lcj4wKXtcbiAgICAgICAgICAgIC8vIE1vdmUgdGhlIHNwaW5uZXIgdG8gZnJvbnRcbiAgICAgICAgICAgIHZhciBub2RlID0gc3BfZWxlbS5ub2RlKCk7XG4gICAgICAgICAgICBpZiAobm9kZS5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5wYXJlbnROb2RlLmFwcGVuZENoaWxkKG5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHNwLm9mZiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgdHJhY2suc3Bpbm5lci0tO1xuICAgICAgICBpZiAoIXRyYWNrLnNwaW5uZXIpIHtcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSB0cmFjay5nO1xuICAgICAgICAgICAgY29udGFpbmVyLnNlbGVjdEFsbChcIi50bnRfc3Bpbm5lclwiKVxuICAgICAgICAgICAgICAgIC5yZW1vdmUoKTtcblxuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHRpY2sgKGVsZW0sIGksIGJnQ29sb3IpIHtcbiAgICAgICAgZWxlbVxuICAgICAgICAgICAgLmFwcGVuZChcInJlY3RcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCBcIjQ2LjVcIilcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCAnNDAnKVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBcIjdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIFwiMjBcIilcbiAgICAgICAgICAgIC5hdHRyKFwicnhcIiwgXCI1XCIpXG4gICAgICAgICAgICAuYXR0cihcInJ5XCIsIFwiNVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIGQzLnJnYihiZ0NvbG9yKS5kYXJrZXIoMikpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZShcIiArICgzNjAvMTIpKmkgKyBcIiA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVwiKVxuICAgICAgICAgICAgLmFwcGVuZChcImFuaW1hdGVcIilcbiAgICAgICAgICAgIC5hdHRyKFwiYXR0cmlidXRlTmFtZVwiLCBcIm9wYWNpdHlcIilcbiAgICAgICAgICAgIC5hdHRyKFwiZnJvbVwiLCBcIjFcIilcbiAgICAgICAgICAgIC5hdHRyKFwidG9cIiwgXCIwXCIpXG4gICAgICAgICAgICAuYXR0cihcImR1clwiLCBcIjFzXCIpXG4gICAgICAgICAgICAuYXR0cihcImJlZ2luXCIsICgxLzEyKSppICsgXCJzXCIpXG4gICAgICAgICAgICAuYXR0cihcInJlcGVhdENvdW50XCIsIFwiaW5kZWZpbml0ZVwiKTtcblxuICAgIH1cblxuICAgIHJldHVybiBzcDtcbn07XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBzcGlubmVyO1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xudmFyIGl0ZXJhdG9yID0gcmVxdWlyZShcInRudC51dGlsc1wiKS5pdGVyYXRvcjtcblxuXG52YXIgdHJhY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgZGlzcGxheTtcblxuICAgIHZhciBjb25mID0ge1xuICAgIFx0Y29sb3IgOiBkMy5yZ2IoJyNDQ0NDQ0MnKSxcbiAgICBcdGhlaWdodCAgICAgICAgICAgOiAyNTAsXG4gICAgXHQvLyBkYXRhIGlzIHRoZSBvYmplY3QgKG5vcm1hbGx5IGEgdG50LnRyYWNrLmRhdGEgb2JqZWN0KSB1c2VkIHRvIHJldHJpZXZlIGFuZCB1cGRhdGUgZGF0YSBmb3IgdGhlIHRyYWNrXG4gICAgXHRkYXRhICAgICAgICAgICAgIDogdHJhY2suZGF0YS5lbXB0eSgpLFxuICAgICAgICAvLyBkaXNwbGF5ICAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICBsYWJlbCAgICAgICAgICAgIDogXCJcIixcbiAgICAgICAgaWQgICAgICAgICAgICAgICA6IHRyYWNrLmlkKClcbiAgICB9O1xuXG4gICAgLy8gVGhlIHJldHVybmVkIG9iamVjdCAvIGNsb3N1cmVcbiAgICB2YXIgdCA9IHt9O1xuXG4gICAgLy8gQVBJXG4gICAgdmFyIGFwaSA9IGFwaWpzICh0KVxuICAgIFx0LmdldHNldCAoY29uZik7XG5cbiAgICAvLyBUT0RPOiBUaGlzIG1lYW5zIHRoYXQgaGVpZ2h0IHNob3VsZCBiZSBkZWZpbmVkIGJlZm9yZSBkaXNwbGF5XG4gICAgLy8gd2Ugc2hvdWxkbid0IHJlbHkgb24gdGhpc1xuICAgIHQuZGlzcGxheSA9IGZ1bmN0aW9uIChuZXdfcGxvdHRlcikge1xuICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBkaXNwbGF5O1xuICAgICAgICB9XG5cbiAgICAgICAgZGlzcGxheSA9IG5ld19wbG90dGVyO1xuICAgICAgICBpZiAodHlwZW9mIChkaXNwbGF5KSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgZGlzcGxheS5sYXlvdXQgJiYgZGlzcGxheS5sYXlvdXQoKS5oZWlnaHQoY29uZi5oZWlnaHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIGRpc3BsYXkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGlzcGxheS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlba2V5XS5sYXlvdXQgJiYgZGlzcGxheVtrZXldLmxheW91dCgpLmhlaWdodChjb25mLmhlaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHJldHVybiB0O1xufTtcblxudHJhY2suaWQgPSBpdGVyYXRvcigxKTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdHJhY2s7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRudF9yZXN0ID0gcmVxdWlyZShcIi4vc3JjL3Jlc3QuanNcIik7XG4iLCJ2YXIgaHR0cCA9IHJlcXVpcmUoXCJodHRwcGxlYXNlXCIpO1xudmFyIGFwaWpzID0gcmVxdWlyZShcInRudC5hcGlcIik7XG52YXIgcHJvbWlzZXMgPSByZXF1aXJlKCdodHRwcGxlYXNlLXByb21pc2VzJyk7XG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJ2VzNi1wcm9taXNlJykuUHJvbWlzZTtcbnZhciBqc29uID0gcmVxdWlyZShcImh0dHBwbGVhc2UvcGx1Z2lucy9qc29uXCIpO1xuaHR0cCA9IGh0dHAudXNlKGpzb24pLnVzZShwcm9taXNlcyhQcm9taXNlKSk7XG5cbi8vdmFyIHVybCA9IHJlcXVpcmUoXCIuL3VybC5qc1wiKTtcblxudG50X3Jlc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgICAgcHJlZml4OiBcIlwiLFxuICAgICAgICBwcm90b2NvbDogXCJodHRwXCIsXG4gICAgICAgIGRvbWFpbjogXCJcIixcbiAgICAgICAgcG9ydDogXCJcIlxuICAgIH07XG4gICAgdmFyIHJlc3QgPSB7fTtcbiAgICByZXN0LnVybCA9IHJlcXVpcmUoXCIuL3VybC5qc1wiKTtcblxuICAgIHZhciBhcGkgPSBhcGlqcyAocmVzdClcbiAgICAgICAgLmdldHNldChjb25maWcpO1xuXG4gICAgYXBpLm1ldGhvZCAoJ2NhbGwnLCBmdW5jdGlvbiAodXJsLCBkYXRhKSB7XG4gICAgICAgIHZhciBteXVybDtcbiAgICAgICAgaWYgKHR5cGVvZih1cmwpID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBteXVybCA9IHVybDtcbiAgICAgICAgfSBlbHNlIHsgLy8gSXQgaXMgYSB0bnQucmVzdC51cmxcbiAgICAgICAgICAgIHVybFxuICAgICAgICAgICAgICAgIC5fcHJlZml4KGNvbmZpZy5wcmVmaXgpXG4gICAgICAgICAgICAgICAgLl9wcm90b2NvbChjb25maWcucHJvdG9jb2wpXG4gICAgICAgICAgICAgICAgLl9kb21haW4oY29uZmlnLmRvbWFpbilcbiAgICAgICAgICAgICAgICAuX3BvcnQoY29uZmlnLnBvcnQpO1xuXG4gICAgICAgICAgICBteXVybCA9IHVybCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhKSB7IC8vIFBPU1RcbiAgICAgICAgICAgIHJldHVybiBodHRwLnBvc3QgKHtcbiAgICAgICAgICAgICAgICBcInVybFwiOiBteXVybCxcbiAgICAgICAgICAgICAgICBcImJvZHlcIjogZGF0YVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGh0dHAuZ2V0ICh7XG4gICAgICAgICAgICBcInVybFwiOiBteXVybFxuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdG50X3Jlc3Q7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlKFwidG50LmFwaVwiKTtcblxudmFyIHVybE1vZHVsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGFyYW1QYXR0ZXJuID0gLzpcXHcrL2c7XG5cbiAgICB2YXIgY29uZmlnID0ge1xuICAgICAgICBfcHJlZml4OiBcIlwiLFxuICAgICAgICBfcHJvdG9jb2w6IFwiaHR0cFwiLFxuICAgICAgICBfZG9tYWluOiBcIlwiLFxuICAgICAgICBfcG9ydDogXCJcIixcbiAgICAgICAgZW5kcG9pbnQ6IFwiXCIsXG4gICAgICAgIHBhcmFtZXRlcnM6IHt9LFxuICAgICAgICBmcmFnbWVudDogXCJcIixcbiAgICAgICAgcmVzdDogdW5kZWZpbmVkXG4gICAgfTtcblxuICAgIC8vIFVSTCBNZXRob2RcbiAgICB2YXIgdXJsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZ2V0VXJsKCk7XG4gICAgfTtcblxuICAgIHZhciBhcGkgPSBhcGlqcyAodXJsKVxuICAgICAgICAuZ2V0c2V0KGNvbmZpZyk7XG5cbiAgICAvLyBDaGVja3MgaWYgdGhlIHZhbHVlIGlzIGEgc3RyaW5nIG9yIGFuIGFycmF5XG4gICAgLy8gSWYgYXJyYXksIHJlY3Vyc2Ugb3ZlciBhbGwgdGhlIGF2YWlsYWJsZSB2YWx1ZXNcbiAgICBmdW5jdGlvbiBxdWVyeTEgKGtleSkge1xuICAgICAgICB2YXIgdmFsID0gY29uZmlnLnBhcmFtZXRlcnNba2V5XTtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWw7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSXQgaXMgYW4gYXJyYXlcbiAgICAgICAgdmFyIHZhbDEgPSB2YWwuc2hpZnQoKTtcbiAgICAgICAgIGlmICh2YWwubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsMSArIFwiJlwiICsga2V5ICsgXCI9XCIgKyBxdWVyeTEoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsMTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBxdWVyeVN0cmluZygpIHtcbiAgICAgICAgLy8gV2UgYWRkICdjb250ZW50LXR5cGU9YXBwbGljYXRpb24vanNvbidcbiAgICAgICAgaWYgKGNvbmZpZy5wYXJhbWV0ZXJzW1wiY29udGVudC10eXBlXCJdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbmZpZy5wYXJhbWV0ZXJzW1wiY29udGVudC10eXBlXCJdID0gXCJhcHBsaWNhdGlvbi9qc29uXCI7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHFzID0gT2JqZWN0LmtleXMoY29uZmlnLnBhcmFtZXRlcnMpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICByZXR1cm4ga2V5ICsgXCI9XCIgKyBxdWVyeTEoa2V5KTtcbiAgICAgICAgfSkuam9pbihcIiZcIik7XG4gICAgICAgIHJldHVybiBxcyA/IChcIj9cIiArIHFzKSA6IHFzO1xuICAgIH1cblxuICAgIC8vXG4gICAgZnVuY3Rpb24gZ2V0VXJsKCkge1xuICAgICAgICB2YXIgZW5kcG9pbnQgPSBjb25maWcuZW5kcG9pbnQ7XG5cbiAgICAgICAgdmFyIHN1YnN0RW5kcG9pbnQgPSBlbmRwb2ludC5yZXBsYWNlKHBhcmFtUGF0dGVybiwgZnVuY3Rpb24gKG1hdGNoKSB7XG4gICAgICAgICAgICBtYXRjaCA9IG1hdGNoLnN1YnN0cmluZygxLCBtYXRjaC5sZW5ndGgpO1xuICAgICAgICAgICAgdmFyIHBhcmFtID0gY29uZmlnLnBhcmFtZXRlcnNbbWF0Y2hdIHx8IFwiXCI7XG4gICAgICAgICAgICBkZWxldGUgY29uZmlnLnBhcmFtZXRlcnNbbWF0Y2hdO1xuICAgICAgICAgICAgcmV0dXJuIHBhcmFtO1xuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgdXJsID0gY29uZmlnLl9wcmVmaXggKyAoY29uZmlnLl9wcm90b2NvbCA/IChjb25maWcuX3Byb3RvY29sICsgXCI6Ly9cIikgOiBcIlwiKSArIGNvbmZpZy5fZG9tYWluICsgKGNvbmZpZy5fcG9ydCA/IChcIjpcIiArIGNvbmZpZy5fcG9ydCkgOiBcIlwiKSArIFwiL1wiICsgc3Vic3RFbmRwb2ludCArIHF1ZXJ5U3RyaW5nKCkgKyAoY29uZmlnLmZyYWdtZW50ID8gKFwiI1wiICsgY29uZmlnLmZyYWdtZW50KSA6IFwiXCIpO1xuICAgICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIHJldHVybiB1cmw7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB1cmxNb2R1bGU7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL3NyYy9pbmRleC5qc1wiKTtcbiIsIi8vIHJlcXVpcmUoJ2ZzJykucmVhZGRpclN5bmMoX19kaXJuYW1lICsgJy8nKS5mb3JFYWNoKGZ1bmN0aW9uKGZpbGUpIHtcbi8vICAgICBpZiAoZmlsZS5tYXRjaCgvLitcXC5qcy9nKSAhPT0gbnVsbCAmJiBmaWxlICE9PSBfX2ZpbGVuYW1lKSB7XG4vLyBcdHZhciBuYW1lID0gZmlsZS5yZXBsYWNlKCcuanMnLCAnJyk7XG4vLyBcdG1vZHVsZS5leHBvcnRzW25hbWVdID0gcmVxdWlyZSgnLi8nICsgZmlsZSk7XG4vLyAgICAgfVxuLy8gfSk7XG5cbi8vIFNhbWUgYXNcbnZhciB1dGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzLmpzXCIpO1xudXRpbHMucmVkdWNlID0gcmVxdWlyZShcIi4vcmVkdWNlLmpzXCIpO1xudXRpbHMucG5nID0gcmVxdWlyZShcIi4vcG5nLmpzXCIpO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdXRpbHM7XG4iLCJ2YXIgcG5nID0gZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGRvY3R5cGUgPSAnPD94bWwgdmVyc2lvbj1cIjEuMFwiIHN0YW5kYWxvbmU9XCJub1wiPz48IURPQ1RZUEUgc3ZnIFBVQkxJQyBcIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOXCIgXCJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGRcIj4nO1xuXG4gICAgdmFyIHNjYWxlX2ZhY3RvciA9IDE7XG4gICAgLy8gdmFyIGZpbGVuYW1lID0gJ2ltYWdlLnBuZyc7XG5cbiAgICAvLyBSZXN0cmljdCB0aGUgY3NzIHRvIGFwcGx5IHRvIHRoZSBmb2xsb3dpbmcgYXJyYXkgKGhyZWZzKVxuICAgIC8vIFRPRE86IHN1YnN0aXR1dGUgdGhpcyBieSBhbiBhcnJheSBvZiByZWdleHBcbiAgICB2YXIgY3NzOyAvLyBJZiB1bmRlZmluZWQsIHVzZSBhbGwgc3R5bGVzaGVldHNcbiAgICAvLyB2YXIgaW5saW5lX2ltYWdlc19vcHQgPSB0cnVlOyAvLyBJZiB0cnVlLCBpbmxpbmUgaW1hZ2VzXG5cbiAgICB2YXIgaW1nX2NiYWsgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgIHZhciBwbmdfZXhwb3J0ID0gZnVuY3Rpb24gKGZyb21fc3ZnKSB7XG4gICAgICAgIGZyb21fc3ZnID0gZnJvbV9zdmcubm9kZSgpO1xuICAgICAgICAvLyB2YXIgc3ZnID0gZGl2LnF1ZXJ5U2VsZWN0b3IoJ3N2ZycpO1xuXG4gICAgICAgIHZhciBpbmxpbmVfaW1hZ2VzID0gZnVuY3Rpb24gKGNiYWspIHtcbiAgICAgICAgICAgIHZhciBpbWFnZXMgPSBkMy5zZWxlY3QoZnJvbV9zdmcpXG4gICAgICAgICAgICAgICAgLnNlbGVjdEFsbCgnaW1hZ2UnKTtcblxuICAgICAgICAgICAgdmFyIHJlbWFpbmluZyA9IGltYWdlc1swXS5sZW5ndGg7XG4gICAgICAgICAgICBpZiAocmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgICAgICAgY2JhaygpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpbWFnZXNcbiAgICAgICAgICAgICAgICAuZWFjaCAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaW1hZ2UgPSBkMy5zZWxlY3QodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgaW1nLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbnZhcy53aWR0aCA9IGltZy53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbnZhcy5oZWlnaHQgPSBpbWcuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShpbWcsIDAsIDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVyaSA9IGNhbnZhcy50b0RhdGFVUkwoJ2ltYWdlL3BuZycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW1hZ2UuYXR0cignaHJlZicsIHVyaSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW1haW5pbmctLTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYmFrKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGltZy5zcmMgPSBpbWFnZS5hdHRyKCdocmVmJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgbW92ZV9jaGlsZHJlbiA9IGZ1bmN0aW9uIChzcmMsIGRlc3QpIHtcbiAgICAgICAgICAgIHZhciBjaGlsZHJlbiA9IHNyYy5jaGlsZHJlbiB8fCBzcmMuY2hpbGROb2RlcztcbiAgICAgICAgICAgIHdoaWxlIChjaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5bMF07XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkLm5vZGVUeXBlICE9PSAxLypOb2RlLkVMRU1FTlRfTk9ERSovKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBkZXN0LmFwcGVuZENoaWxkKGNoaWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBkZXN0O1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBzdHlsaW5nID0gZnVuY3Rpb24gKGRvbSkge1xuICAgICAgICAgICAgdmFyIHVzZWQgPSBcIlwiO1xuICAgICAgICAgICAgdmFyIHNoZWV0cyA9IGRvY3VtZW50LnN0eWxlU2hlZXRzO1xuICAgICAgICAgICAgLy8gdmFyIHNoZWV0cyA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPHNoZWV0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBocmVmID0gc2hlZXRzW2ldLmhyZWYgfHwgXCJcIjtcbiAgICAgICAgICAgICAgICBpZiAoY3NzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBza2lwID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgYz0wOyBjPGNzcy5sZW5ndGg7IGMrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhyZWYuaW5kZXhPZihjc3NbY10pID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBza2lwID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNraXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBydWxlcyA9IHNoZWV0c1tpXS5jc3NSdWxlcyB8fCBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHJ1bGVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBydWxlID0gcnVsZXNbal07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YocnVsZS5zdHlsZSkgIT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVsZW1zID0gZG9tLnF1ZXJ5U2VsZWN0b3JBbGwocnVsZS5zZWxlY3RvclRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VkICs9IHJ1bGUuc2VsZWN0b3JUZXh0ICsgXCIgeyBcIiArIHJ1bGUuc3R5bGUuY3NzVGV4dCArIFwiIH1cXG5cIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgYXJlIDxkZWZzPiBhbHJlYWR5XG4gICAgICAgICAgICB2YXIgZGVmcyA9IGRvbS5xdWVyeVNlbGVjdG9yKFwiZGVmc1wiKSB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkZWZzJyk7XG4gICAgICAgICAgICB2YXIgcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgICAgICAgICBzLnNldEF0dHJpYnV0ZSgndHlwZScsICd0ZXh0L2NzcycpO1xuICAgICAgICAgICAgcy5pbm5lckhUTUwgPSBcIjwhW0NEQVRBW1xcblwiICsgdXNlZCArIFwiXFxuXV0+XCI7XG5cbiAgICAgICAgICAgIC8vIHZhciBkZWZzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGVmcycpO1xuICAgICAgICAgICAgZGVmcy5hcHBlbmRDaGlsZChzKTtcbiAgICAgICAgICAgIHJldHVybiBkZWZzO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlubGluZV9pbWFnZXMgKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIHZhciBzdmcgPSBkaXYucXVlcnlTZWxlY3Rvcignc3ZnJyk7XG4gICAgICAgICAgICB2YXIgb3V0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICAgICAgdmFyIGNsb25lID0gZnJvbV9zdmcuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgICAgICAgdmFyIHdpZHRoID0gcGFyc2VJbnQoY2xvbmUuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKTtcbiAgICAgICAgICAgIHZhciBoZWlnaHQgPSBwYXJzZUludChjbG9uZS5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcblxuICAgICAgICAgICAgY2xvbmUuc2V0QXR0cmlidXRlKFwidmVyc2lvblwiLCBcIjEuMVwiKTtcbiAgICAgICAgICAgIGNsb25lLnNldEF0dHJpYnV0ZShcInhtbG5zXCIsIFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIik7XG4gICAgICAgICAgICBjbG9uZS5zZXRBdHRyaWJ1dGUoXCJ4bWxuczp4bGlua1wiLCBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIik7XG4gICAgICAgICAgICBjbG9uZS5zZXRBdHRyaWJ1dGUoXCJ3aWR0aFwiLCB3aWR0aCAqIHNjYWxlX2ZhY3Rvcik7XG4gICAgICAgICAgICBjbG9uZS5zZXRBdHRyaWJ1dGUoXCJoZWlnaHRcIiwgaGVpZ2h0ICogc2NhbGVfZmFjdG9yKTtcbiAgICAgICAgICAgIHZhciBzY2FsaW5nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImdcIik7XG4gICAgICAgICAgICBzY2FsaW5nLnNldEF0dHJpYnV0ZShcInRyYW5zZm9ybVwiLCBcInNjYWxlKFwiICsgc2NhbGVfZmFjdG9yICsgXCIpXCIpO1xuICAgICAgICAgICAgY2xvbmUuYXBwZW5kQ2hpbGQobW92ZV9jaGlsZHJlbihjbG9uZSwgc2NhbGluZykpO1xuICAgICAgICAgICAgb3V0ZXIuYXBwZW5kQ2hpbGQoY2xvbmUpO1xuXG4gICAgICAgICAgICBjbG9uZS5pbnNlcnRCZWZvcmUgKHN0eWxpbmcoY2xvbmUpLCBjbG9uZS5maXJzdENoaWxkKTtcblxuICAgICAgICAgICAgdmFyIHN2ZyA9IGRvY3R5cGUgKyBvdXRlci5pbm5lckhUTUw7XG4gICAgICAgICAgICBzdmcgPSBzdmcucmVwbGFjZSAoXCJub25lXCIsIFwiYmxvY2tcIik7IC8vIEluIGNhc2UgdGhlIHN2ZyBpcyBub3QgYmVpbmcgZGlzcGxheWVkLCBpdCBpcyBpZ25vcmVkIGluIEZGXG4gICAgICAgICAgICB2YXIgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcblxuICAgICAgICAgICAgaW1hZ2Uuc3JjID0gJ2RhdGE6aW1hZ2Uvc3ZnK3htbDtiYXNlNjQsJyArIHdpbmRvdy5idG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChzdmcpKSk7XG4gICAgICAgICAgICBpbWFnZS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgICAgICAgICAgY2FudmFzLndpZHRoID0gaW1hZ2Uud2lkdGg7XG4gICAgICAgICAgICAgICAgY2FudmFzLmhlaWdodCA9IGltYWdlLmhlaWdodDtcbiAgICAgICAgICAgICAgICB2YXIgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICAgICAgICAgIGNvbnRleHQuZHJhd0ltYWdlKGltYWdlLCAwLCAwKTtcblxuICAgICAgICAgICAgICAgIHZhciBzcmMgPSBjYW52YXMudG9EYXRhVVJMKCdpbWFnZS9wbmcnKTtcbiAgICAgICAgICAgICAgICBpbWdfY2JhayAoc3JjKTtcbiAgICAgICAgICAgICAgICAvLyB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgICAgICAgICAvLyBhLmRvd25sb2FkID0gZmlsZW5hbWU7XG4gICAgICAgICAgICAgICAgLy8gYS5ocmVmID0gY2FudmFzLnRvRGF0YVVSTCgnaW1hZ2UvcG5nJyk7XG4gICAgICAgICAgICAgICAgLy8gZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhKTtcbiAgICAgICAgICAgICAgICAvLyBhLmNsaWNrKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgIH07XG4gICAgcG5nX2V4cG9ydC5zY2FsZV9mYWN0b3IgPSBmdW5jdGlvbiAoZikge1xuICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBzY2FsZV9mYWN0b3I7XG4gICAgICAgIH1cbiAgICAgICAgc2NhbGVfZmFjdG9yID0gZjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHBuZ19leHBvcnQuY2FsbGJhY2sgPSBmdW5jdGlvbiAoY2Jhaykge1xuICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBpbWdfY2JhaztcbiAgICAgICAgfVxuICAgICAgICBpbWdfY2JhayA9IGNiYWs7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICBwbmdfZXhwb3J0LnN0eWxlc2hlZXRzID0gZnVuY3Rpb24gKHJlc3RyaWN0Q3NzKSB7XG4gICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNzcztcbiAgICAgICAgfVxuICAgICAgICBjc3MgPSByZXN0cmljdENzcztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8vIHBuZ19leHBvcnQuZmlsZW5hbWUgPSBmdW5jdGlvbiAoZikge1xuICAgIC8vIFx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgLy8gXHQgICAgcmV0dXJuIGZpbGVuYW1lO1xuICAgIC8vIFx0fVxuICAgIC8vIFx0ZmlsZW5hbWUgPSBmO1xuICAgIC8vIFx0cmV0dXJuIHBuZ19leHBvcnQ7XG4gICAgLy8gfTtcblxuICAgIHJldHVybiBwbmdfZXhwb3J0O1xufTtcblxudmFyIGRvd25sb2FkID0gZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGZpbGVuYW1lID0gJ2ltYWdlLnBuZyc7XG4gICAgdmFyIG1heF9zaXplID0ge1xuICAgICAgICBsaW1pdDogSW5maW5pdHksXG4gICAgICAgIG9uRXJyb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaW1hZ2UgdG9vIGxhcmdlXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBwbmdfZXhwb3J0ID0gcG5nKClcbiAgICAgICAgLmNhbGxiYWNrIChmdW5jdGlvbiAoc3JjKSB7XG4gICAgICAgICAgICB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgICAgIGEuZG93bmxvYWQgPSBmaWxlbmFtZTtcbiAgICAgICAgICAgIGEuaHJlZiA9IHNyYztcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYSk7XG5cbiAgICAgICAgICAgIGlmIChhLmhyZWYubGVuZ3RoID4gbWF4X3NpemUubGltaXQpIHtcbiAgICAgICAgICAgICAgICBhLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoYSk7XG4gICAgICAgICAgICAgICAgbWF4X3NpemUub25FcnJvcigpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhLmNsaWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vICAgICBhLmNsaWNrKCk7XG4gICAgICAgICAgICAvLyB9LCAzMDAwKTtcbiAgICAgICAgfSk7XG5cbiAgICBwbmdfZXhwb3J0LmZpbGVuYW1lID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGZpbGVuYW1lO1xuICAgICAgICB9XG4gICAgICAgIGZpbGVuYW1lID0gZm47XG4gICAgICAgIHJldHVybiBwbmdfZXhwb3J0O1xuICAgIH07XG5cbiAgICBwbmdfZXhwb3J0LmxpbWl0ID0gZnVuY3Rpb24gKGwpIHtcbiAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF4X3NpemU7XG4gICAgICAgIH1cbiAgICAgICAgbWF4X3NpemUgPSBsO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgcmV0dXJuIHBuZ19leHBvcnQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBkb3dubG9hZDtcbiIsInZhciByZWR1Y2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNtb290aCA9IDU7XG4gICAgdmFyIHZhbHVlID0gJ3ZhbCc7XG4gICAgdmFyIHJlZHVuZGFudCA9IGZ1bmN0aW9uIChhLCBiKSB7XG5cdGlmIChhIDwgYikge1xuXHQgICAgcmV0dXJuICgoYi1hKSA8PSAoYiAqIDAuMikpO1xuXHR9XG5cdHJldHVybiAoKGEtYikgPD0gKGEgKiAwLjIpKTtcbiAgICB9O1xuICAgIHZhciBwZXJmb3JtX3JlZHVjZSA9IGZ1bmN0aW9uIChhcnIpIHtyZXR1cm4gYXJyO307XG5cbiAgICB2YXIgcmVkdWNlID0gZnVuY3Rpb24gKGFycikge1xuXHRpZiAoIWFyci5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBhcnI7XG5cdH1cblx0dmFyIHNtb290aGVkID0gcGVyZm9ybV9zbW9vdGgoYXJyKTtcblx0dmFyIHJlZHVjZWQgID0gcGVyZm9ybV9yZWR1Y2Uoc21vb3RoZWQpO1xuXHRyZXR1cm4gcmVkdWNlZDtcbiAgICB9O1xuXG4gICAgdmFyIG1lZGlhbiA9IGZ1bmN0aW9uICh2LCBhcnIpIHtcblx0YXJyLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcblx0ICAgIHJldHVybiBhW3ZhbHVlXSAtIGJbdmFsdWVdO1xuXHR9KTtcblx0aWYgKGFyci5sZW5ndGggJSAyKSB7XG5cdCAgICB2W3ZhbHVlXSA9IGFyclt+fihhcnIubGVuZ3RoIC8gMildW3ZhbHVlXTtcdCAgICBcblx0fSBlbHNlIHtcblx0ICAgIHZhciBuID0gfn4oYXJyLmxlbmd0aCAvIDIpIC0gMTtcblx0ICAgIHZbdmFsdWVdID0gKGFycltuXVt2YWx1ZV0gKyBhcnJbbisxXVt2YWx1ZV0pIC8gMjtcblx0fVxuXG5cdHJldHVybiB2O1xuICAgIH07XG5cbiAgICB2YXIgY2xvbmUgPSBmdW5jdGlvbiAoc291cmNlKSB7XG5cdHZhciB0YXJnZXQgPSB7fTtcblx0Zm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcblx0ICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcblx0XHR0YXJnZXRbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG5cdCAgICB9XG5cdH1cblx0cmV0dXJuIHRhcmdldDtcbiAgICB9O1xuXG4gICAgdmFyIHBlcmZvcm1fc21vb3RoID0gZnVuY3Rpb24gKGFycikge1xuXHRpZiAoc21vb3RoID09PSAwKSB7IC8vIG5vIHNtb290aFxuXHQgICAgcmV0dXJuIGFycjtcblx0fVxuXHR2YXIgc21vb3RoX2FyciA9IFtdO1xuXHRmb3IgKHZhciBpPTA7IGk8YXJyLmxlbmd0aDsgaSsrKSB7XG5cdCAgICB2YXIgbG93ID0gKGkgPCBzbW9vdGgpID8gMCA6IChpIC0gc21vb3RoKTtcblx0ICAgIHZhciBoaWdoID0gKGkgPiAoYXJyLmxlbmd0aCAtIHNtb290aCkpID8gYXJyLmxlbmd0aCA6IChpICsgc21vb3RoKTtcblx0ICAgIHNtb290aF9hcnJbaV0gPSBtZWRpYW4oY2xvbmUoYXJyW2ldKSwgYXJyLnNsaWNlKGxvdyxoaWdoKzEpKTtcblx0fVxuXHRyZXR1cm4gc21vb3RoX2FycjtcbiAgICB9O1xuXG4gICAgcmVkdWNlLnJlZHVjZXIgPSBmdW5jdGlvbiAoY2Jhaykge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBwZXJmb3JtX3JlZHVjZTtcblx0fVxuXHRwZXJmb3JtX3JlZHVjZSA9IGNiYWs7XG5cdHJldHVybiByZWR1Y2U7XG4gICAgfTtcblxuICAgIHJlZHVjZS5yZWR1bmRhbnQgPSBmdW5jdGlvbiAoY2Jhaykge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiByZWR1bmRhbnQ7XG5cdH1cblx0cmVkdW5kYW50ID0gY2Jhaztcblx0cmV0dXJuIHJlZHVjZTtcbiAgICB9O1xuXG4gICAgcmVkdWNlLnZhbHVlID0gZnVuY3Rpb24gKHZhbCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiB2YWx1ZTtcblx0fVxuXHR2YWx1ZSA9IHZhbDtcblx0cmV0dXJuIHJlZHVjZTtcbiAgICB9O1xuXG4gICAgcmVkdWNlLnNtb290aCA9IGZ1bmN0aW9uICh2YWwpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gc21vb3RoO1xuXHR9XG5cdHNtb290aCA9IHZhbDtcblx0cmV0dXJuIHJlZHVjZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHJlZHVjZTtcbn07XG5cbnZhciBibG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmVkID0gcmVkdWNlKClcblx0LnZhbHVlKCdzdGFydCcpO1xuXG4gICAgdmFyIHZhbHVlMiA9ICdlbmQnO1xuXG4gICAgdmFyIGpvaW4gPSBmdW5jdGlvbiAob2JqMSwgb2JqMikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgJ29iamVjdCcgOiB7XG4gICAgICAgICAgICAgICAgJ3N0YXJ0JyA6IG9iajEub2JqZWN0W3JlZC52YWx1ZSgpXSxcbiAgICAgICAgICAgICAgICAnZW5kJyAgIDogb2JqMlt2YWx1ZTJdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3ZhbHVlJyAgOiBvYmoyW3ZhbHVlMl1cbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgLy8gdmFyIGpvaW4gPSBmdW5jdGlvbiAob2JqMSwgb2JqMikgeyByZXR1cm4gb2JqMSB9O1xuXG4gICAgcmVkLnJlZHVjZXIoIGZ1bmN0aW9uIChhcnIpIHtcblx0dmFyIHZhbHVlID0gcmVkLnZhbHVlKCk7XG5cdHZhciByZWR1bmRhbnQgPSByZWQucmVkdW5kYW50KCk7XG5cdHZhciByZWR1Y2VkX2FyciA9IFtdO1xuXHR2YXIgY3VyciA9IHtcblx0ICAgICdvYmplY3QnIDogYXJyWzBdLFxuXHQgICAgJ3ZhbHVlJyAgOiBhcnJbMF1bdmFsdWUyXVxuXHR9O1xuXHRmb3IgKHZhciBpPTE7IGk8YXJyLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAocmVkdW5kYW50IChhcnJbaV1bdmFsdWVdLCBjdXJyLnZhbHVlKSkge1xuXHRcdGN1cnIgPSBqb2luKGN1cnIsIGFycltpXSk7XG5cdFx0Y29udGludWU7XG5cdCAgICB9XG5cdCAgICByZWR1Y2VkX2Fyci5wdXNoIChjdXJyLm9iamVjdCk7XG5cdCAgICBjdXJyLm9iamVjdCA9IGFycltpXTtcblx0ICAgIGN1cnIudmFsdWUgPSBhcnJbaV0uZW5kO1xuXHR9XG5cdHJlZHVjZWRfYXJyLnB1c2goY3Vyci5vYmplY3QpO1xuXG5cdC8vIHJlZHVjZWRfYXJyLnB1c2goYXJyW2Fyci5sZW5ndGgtMV0pO1xuXHRyZXR1cm4gcmVkdWNlZF9hcnI7XG4gICAgfSk7XG5cbiAgICByZWR1Y2Uuam9pbiA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGpvaW47XG5cdH1cblx0am9pbiA9IGNiYWs7XG5cdHJldHVybiByZWQ7XG4gICAgfTtcblxuICAgIHJlZHVjZS52YWx1ZTIgPSBmdW5jdGlvbiAoZmllbGQpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gdmFsdWUyO1xuXHR9XG5cdHZhbHVlMiA9IGZpZWxkO1xuXHRyZXR1cm4gcmVkO1xuICAgIH07XG5cbiAgICByZXR1cm4gcmVkO1xufTtcblxudmFyIGxpbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJlZCA9IHJlZHVjZSgpO1xuXG4gICAgcmVkLnJlZHVjZXIgKCBmdW5jdGlvbiAoYXJyKSB7XG5cdHZhciByZWR1bmRhbnQgPSByZWQucmVkdW5kYW50KCk7XG5cdHZhciB2YWx1ZSA9IHJlZC52YWx1ZSgpO1xuXHR2YXIgcmVkdWNlZF9hcnIgPSBbXTtcblx0dmFyIGN1cnIgPSBhcnJbMF07XG5cdGZvciAodmFyIGk9MTsgaTxhcnIubGVuZ3RoLTE7IGkrKykge1xuXHQgICAgaWYgKHJlZHVuZGFudCAoYXJyW2ldW3ZhbHVlXSwgY3Vyclt2YWx1ZV0pKSB7XG5cdFx0Y29udGludWU7XG5cdCAgICB9XG5cdCAgICByZWR1Y2VkX2Fyci5wdXNoIChjdXJyKTtcblx0ICAgIGN1cnIgPSBhcnJbaV07XG5cdH1cblx0cmVkdWNlZF9hcnIucHVzaChjdXJyKTtcblx0cmVkdWNlZF9hcnIucHVzaChhcnJbYXJyLmxlbmd0aC0xXSk7XG5cdHJldHVybiByZWR1Y2VkX2FycjtcbiAgICB9KTtcblxuICAgIHJldHVybiByZWQ7XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcmVkdWNlO1xubW9kdWxlLmV4cG9ydHMubGluZSA9IGxpbmU7XG5tb2R1bGUuZXhwb3J0cy5ibG9jayA9IGJsb2NrO1xuXG4iLCJcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGl0ZXJhdG9yIDogZnVuY3Rpb24oaW5pdF92YWwpIHtcblx0dmFyIGkgPSBpbml0X3ZhbCB8fCAwO1xuXHR2YXIgaXRlciA9IGZ1bmN0aW9uICgpIHtcblx0ICAgIHJldHVybiBpKys7XG5cdH07XG5cdHJldHVybiBpdGVyO1xuICAgIH0sXG5cbiAgICBzY3JpcHRfcGF0aCA6IGZ1bmN0aW9uIChzY3JpcHRfbmFtZSkgeyAvLyBzY3JpcHRfbmFtZSBpcyB0aGUgZmlsZW5hbWVcblx0dmFyIHNjcmlwdF9zY2FwZWQgPSBzY3JpcHRfbmFtZS5yZXBsYWNlKC9bLVxcL1xcXFxeJCorPy4oKXxbXFxde31dL2csICdcXFxcJCYnKTtcblx0dmFyIHNjcmlwdF9yZSA9IG5ldyBSZWdFeHAoc2NyaXB0X3NjYXBlZCArICckJyk7XG5cdHZhciBzY3JpcHRfcmVfc3ViID0gbmV3IFJlZ0V4cCgnKC4qKScgKyBzY3JpcHRfc2NhcGVkICsgJyQnKTtcblxuXHQvLyBUT0RPOiBUaGlzIHJlcXVpcmVzIHBoYW50b20uanMgb3IgYSBzaW1pbGFyIGhlYWRsZXNzIHdlYmtpdCB0byB3b3JrIChkb2N1bWVudClcblx0dmFyIHNjcmlwdHMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0Jyk7XG5cdHZhciBwYXRoID0gXCJcIjsgIC8vIERlZmF1bHQgdG8gY3VycmVudCBwYXRoXG5cdGlmKHNjcmlwdHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZm9yKHZhciBpIGluIHNjcmlwdHMpIHtcblx0XHRpZihzY3JpcHRzW2ldLnNyYyAmJiBzY3JpcHRzW2ldLnNyYy5tYXRjaChzY3JpcHRfcmUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzY3JpcHRzW2ldLnNyYy5yZXBsYWNlKHNjcmlwdF9yZV9zdWIsICckMScpO1xuXHRcdH1cbiAgICAgICAgICAgIH1cblx0fVxuXHRyZXR1cm4gcGF0aDtcbiAgICB9LFxuXG4gICAgZGVmZXJfY2FuY2VsIDogZnVuY3Rpb24gKGNiYWssIHRpbWUpIHtcbiAgICAgICAgdmFyIHRpY2s7XG5cbiAgICAgICAgdmFyIGRlZmVyX2NhbmNlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aWNrKTtcbiAgICAgICAgICAgIHRpY2sgPSBzZXRUaW1lb3V0IChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY2Jhay5hcHBseSAodGhhdCwgYXJncyk7XG4gICAgICAgICAgICB9LCB0aW1lKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gZGVmZXJfY2FuY2VsO1xuICAgIH1cbn07XG4iLCJ2YXIgYm9hcmQgPSByZXF1aXJlKFwidG50LmJvYXJkXCIpO1xudmFyIGFwaWpzID0gcmVxdWlyZShcInRudC5hcGlcIik7XG5cbnZhciBkYXRhX2dlbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGVSZXN0ID0gYm9hcmQudHJhY2suZGF0YS5nZW5vbWUuZW5zZW1ibDtcblxuICAgIHZhciBkYXRhID0gYm9hcmQudHJhY2suZGF0YS5hc3luYygpXG4gICAgICAgIC5yZXRyaWV2ZXIgKGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgICAgICAvLyB2YXIgZVJlc3QgPSBkYXRhLmVuc2VtYmwoKTtcbiAgICAgICAgICAgIC8vIHZhciBzY2FsZSA9IHRyYWNrLmRpc3BsYXkoKS5zY2FsZSgpO1xuICAgICAgICAgICAgdmFyIHVybCA9IGVSZXN0LnVybCgpXG4gICAgICAgICAgICAgICAgLmVuZHBvaW50KFwib3ZlcmxhcC9yZWdpb24vOnNwZWNpZXMvOnJlZ2lvblwiKVxuICAgICAgICAgICAgICAgIC5wYXJhbWV0ZXJzKHtcbiAgICAgICAgICAgICAgICAgICAgc3BlY2llcyA6IG9iai5zcGVjaWVzLFxuICAgICAgICAgICAgICAgICAgICByZWdpb24gIDogKG9iai5jaHIgKyBcIjpcIiArIG9iai5mcm9tICsgXCItXCIgKyBvYmoudG8pLFxuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlOiBvYmouZmVhdHVyZXMgfHwgW1wiZ2VuZVwiXVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gdmFyIHVybCA9IGVSZXN0LnVybC5yZWdpb24ob2JqKTtcbiAgICAgICAgICAgIHJldHVybiBlUmVzdC5jYWxsKHVybClcbiAgICAgICAgICAgICAgLnRoZW4gKGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIGdlbmVzID0gcmVzcC5ib2R5O1xuICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgZGlzcGxheV9sYWJlbCBmaWVsZFxuICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxnZW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ2VuZSA9IGdlbmVzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ2VuZS5zdHJhbmQgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZW5lLmRpc3BsYXlfbGFiZWwgPSBcIjxcIiArIGdlbmUuZXh0ZXJuYWxfbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdlbmUuZGlzcGxheV9sYWJlbCA9IGdlbmUuZXh0ZXJuYWxfbmFtZSArIFwiPlwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBnZW5lcztcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgfSk7XG5cbiAgICBhcGlqcyhkYXRhKVxuICAgICAgICAuZ2V0c2V0KCdlbnNlbWJsJyk7XG5cbiAgICByZXR1cm4gZGF0YTtcbn07XG5cbnZhciBkYXRhX2Nhbm9uaWNhbCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZVJlc3QgPSBib2FyZC50cmFjay5kYXRhLmdlbm9tZS5lbnNlbWJsO1xuICAgIFxuICAgIHZhciBkYXRhID0gYm9hcmQudHJhY2suZGF0YS5hc3luYygpXG4gICAgICAgIC5yZXRyaWV2ZXIgKGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgICAgIHZhciB1cmwgPSBlUmVzdC51cmwoKVxuICAgICAgICAgICAgICAgIC5lbmRwb2ludCgnb3ZlcmxhcC9yZWdpb24vOnNwZWNpZXMvOnJlZ2lvbicpXG4gICAgICAgICAgICAgICAgLnBhcmFtZXRlcnMoe1xuICAgICAgICAgICAgICAgICAgICBzcGVjaWVzOiBvYmouc3BlY2llcyxcbiAgICAgICAgICAgICAgICAgICAgcmVnaW9uOiAob2JqLmNociArICc6JyArIG9iai5mcm9tICsgJy0nICsgb2JqLnRvKSxcbiAgICAgICAgICAgICAgICAgICAgZmVhdHVyZTogWydnZW5lJ11cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBlUmVzdC5jYWxsKHVybClcbiAgICAgICAgICAgICAgICAudGhlbiAoZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVsZW1zID0gcmVzcC5ib2R5O1xuICAgICAgICAgICAgICAgICAgICB2YXIgZW5zSWRzID0gZWxlbXMubWFwKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5pZDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1cmwyID0gZVJlc3QudXJsKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5lbmRwb2ludCgnL2xvb2t1cC9pZCcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZVJlc3QuY2FsbCh1cmwyLCB7aWRzOmVuc0lkcywgZXhwYW5kOjF9KTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC50aGVuIChmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdHJhbnNjcmlwdHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgZ2VuZSBpbiByZXNwLmJvZHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNwLmJvZHkuaGFzT3duUHJvcGVydHkoZ2VuZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc3AuYm9keVtnZW5lXS5UcmFuc2NyaXB0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0ID0gcmVzcC5ib2R5W2dlbmVdLlRyYW5zY3JpcHRbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0LmlzX2Nhbm9uaWNhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5nZW5lID0gcmVzcC5ib2R5W2dlbmVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5kaXNwbGF5X2xhYmVsID0gdC5zdHJhbmQgPT09IDEgPyAodC5kaXNwbGF5X25hbWUgKyBcIj5cIikgOiAoXCI8XCIgKyB0LmRpc3BsYXlfbmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmV4b25zID0gdHJhbnNmb3JtRXhvbnModCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmludHJvbnMgPSBleG9uc1RvRXhvbnNBbmRJbnRyb25zKHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5rZXkgPSAodC5pZCArIFwiX1wiICsgdC5leG9ucy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNjcmlwdHMucHVzaCh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJhbnNjcmlwdHM7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgfSk7XG5cbiAgICByZXR1cm4gZGF0YTtcbn07XG5cbnZhciBkYXRhX3RyYW5zY3JpcHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGVSZXN0ID0gYm9hcmQudHJhY2suZGF0YS5nZW5vbWUuZW5zZW1ibDtcblxuICAgIHZhciBkYXRhID0gYm9hcmQudHJhY2suZGF0YS5hc3luYygpXG4gICAgICAgIC5yZXRyaWV2ZXIgKGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgICAgIHZhciB1cmwgPSBlUmVzdC51cmwoKVxuICAgICAgICAgICAgICAgIC5lbmRwb2ludChcIm92ZXJsYXAvcmVnaW9uLzpzcGVjaWVzLzpyZWdpb25cIilcbiAgICAgICAgICAgICAgICAucGFyYW1ldGVycyh7XG4gICAgICAgICAgICAgICAgICAgIHNwZWNpZXMgOiBvYmouc3BlY2llcyxcbiAgICAgICAgICAgICAgICAgICAgcmVnaW9uIDogKG9iai5jaHIgKyBcIjpcIiArIG9iai5mcm9tICsgXCItXCIgKyBvYmoudG8pLFxuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlIDogW1wiZ2VuZVwiLCBcInRyYW5zY3JpcHRcIiwgXCJleG9uXCIsIFwiY2RzXCJdXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gZVJlc3QuY2FsbCh1cmwpXG4gICAgICAgICAgICAgIC50aGVuIChmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgdmFyIGVsZW1zID0gcmVzcC5ib2R5O1xuICAgICAgICAgICAgICAgICAgdmFyIGdlbmVzID0gZGF0YS5yZWdpb24yZ2VuZXMoZWxlbXMpO1xuICAgICAgICAgICAgICAgICAgdmFyIHRyYW5zY3JpcHRzID0gW107XG4gICAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8Z2VuZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgZyA9IGdlbmVzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgIHZhciB0cyA9IGRhdGEuZ2VuZTJUcmFuc2NyaXB0cyhnKTtcbiAgICAgICAgICAgICAgICAgICAgICB0cmFuc2NyaXB0cyA9IHRyYW5zY3JpcHRzLmNvbmNhdCh0cyk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHJhbnNjcmlwdHM7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgIGFwaWpzKGRhdGEpXG4gICAgICAgIC5tZXRob2QoXCJnZW5lMlRyYW5zY3JpcHRzXCIsIGZ1bmN0aW9uIChnKSB7XG4gICAgICAgICAgICB2YXIgdHMgPSBnLlRyYW5zY3JpcHQ7XG4gICAgICAgICAgICB2YXIgdHJhbnNjcmlwdHMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGo9MDsgajx0cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciB0ID0gdHNbal07XG4gICAgICAgICAgICAgICAgdC5leG9ucyA9IHRyYW5zZm9ybUV4b25zKHQpO1xuICAgICAgICAgICAgICAgIHQuaW50cm9ucyA9IGV4b25zVG9FeG9uc0FuZEludHJvbnModCk7XG4gICAgICAgICAgICAgICAgLy92YXIgb2JqID0gZXhvbnNUb0V4b25zQW5kSW50cm9ucyAodHJhbnNmb3JtRXhvbnModCksIHQpO1xuICAgICAgICAgICAgICAgIC8vIHQubmFtZSA9IFt7XG4gICAgICAgICAgICAgICAgLy8gICAgIHBvczogdC5zdGFydCxcbiAgICAgICAgICAgICAgICAvLyAgICAgbmFtZSA6IHQuZGlzcGxheV9uYW1lLFxuICAgICAgICAgICAgICAgIC8vICAgICBzdHJhbmQgOiB0LnN0cmFuZCxcbiAgICAgICAgICAgICAgICAvLyAgICAgdHJhbnNjcmlwdCA6IHRcbiAgICAgICAgICAgICAgICAvLyB9XTtcbiAgICAgICAgICAgICAgICB0LmRpc3BsYXlfbGFiZWwgPSB0LnN0cmFuZCA9PT0gMSA/ICh0LmRpc3BsYXlfbmFtZSArIFwiPlwiKSA6IChcIjxcIiArIHQuZGlzcGxheV9uYW1lKTtcbiAgICAgICAgICAgICAgICB0LmtleSA9ICh0LmlkICsgXCJfXCIgKyB0LmV4b25zLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgLy9vYmouaWQgPSB0LmlkO1xuICAgICAgICAgICAgICAgIHQuZ2VuZSA9IGc7XG4gICAgICAgICAgICAgICAgLy8gb2JqLnRyYW5zY3JpcHQgPSB0O1xuICAgICAgICAgICAgICAgIC8vIG9iai5leHRlcm5hbF9uYW1lID0gdC5kaXNwbGF5X25hbWU7XG4gICAgICAgICAgICAgICAgLy9vYmouZGlzcGxheV9sYWJlbCA9IHQuZGlzcGxheV9sYWJlbDtcbiAgICAgICAgICAgICAgICAvL29iai5zdGFydCA9IHQuc3RhcnQ7XG4gICAgICAgICAgICAgICAgLy9vYmouZW5kID0gdC5lbmQ7XG4gICAgICAgICAgICAgICAgdHJhbnNjcmlwdHMucHVzaCh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cmFuc2NyaXB0cztcbiAgICAgICAgfSlcbiAgICAgICAgLm1ldGhvZChcInJlZ2lvbjJnZW5lc1wiLCBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICAgICAgICAgIHZhciBnZW5lVHJhbnNjcmlwdHMgPSB7fTtcbiAgICAgICAgICAgIHZhciBnZW5lcyA9IFtdO1xuICAgICAgICAgICAgdmFyIHRyYW5zY3JpcHRzID0ge307XG5cbiAgICAgICAgICAgIC8vIHRyYW5zY3JpcHRzXG4gICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8ZWxlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZSA9IGVsZW1zW2ldO1xuICAgICAgICAgICAgICAgIGlmIChlLmZlYXR1cmVfdHlwZSA9PSBcInRyYW5zY3JpcHRcIikge1xuICAgICAgICAgICAgICAgICAgICBlLmRpc3BsYXlfbmFtZSA9IGUuZXh0ZXJuYWxfbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNjcmlwdHNbZS5pZF0gPSBlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ2VuZVRyYW5zY3JpcHRzW2UuUGFyZW50XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnZW5lVHJhbnNjcmlwdHNbZS5QYXJlbnRdID0gW107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZ2VuZVRyYW5zY3JpcHRzW2UuUGFyZW50XS5wdXNoKGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZXhvbnNcbiAgICAgICAgICAgIGZvciAodmFyIGo9MDsgajxlbGVtcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciBlID0gZWxlbXNbal07XG4gICAgICAgICAgICAgICAgaWYgKGUuZmVhdHVyZV90eXBlID09PSBcImV4b25cIikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdCA9IHRyYW5zY3JpcHRzW2UuUGFyZW50XTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHQuRXhvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0LkV4b24gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0LkV4b24ucHVzaChlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGNkc1xuICAgICAgICAgICAgZm9yICh2YXIgaz0wOyBrPGVsZW1zLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGUgPSBlbGVtc1trXTtcbiAgICAgICAgICAgICAgICBpZiAoZS5mZWF0dXJlX3R5cGUgPT09IFwiY2RzXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHQgPSB0cmFuc2NyaXB0c1tlLlBhcmVudF07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0LlRyYW5zbGF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHQuVHJhbnNsYXRpb24gPSBlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChlLnN0YXJ0IDwgdC5UcmFuc2xhdGlvbi5zdGFydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdC5UcmFuc2xhdGlvbi5zdGFydCA9IGUuc3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGUuZW5kID4gdC5UcmFuc2xhdGlvbi5lbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHQuVHJhbnNsYXRpb24uZW5kID0gZS5lbmQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGdlbmVzXG4gICAgICAgICAgICBmb3IgKHZhciBoPTA7IGg8ZWxlbXMubGVuZ3RoOyBoKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZSA9IGVsZW1zW2hdO1xuICAgICAgICAgICAgICAgIGlmIChlLmZlYXR1cmVfdHlwZSA9PT0gXCJnZW5lXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5kaXNwbGF5X25hbWUgPSBlLmV4dGVybmFsX25hbWU7XG4gICAgICAgICAgICAgICAgICAgIGUuVHJhbnNjcmlwdCA9IGdlbmVUcmFuc2NyaXB0c1tlLmlkXTtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXMucHVzaChlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBnZW5lcztcbiAgICAgICAgfSk7XG4gICAgcmV0dXJuIGRhdGE7XG59O1xuXG5mdW5jdGlvbiBleG9uc1RvRXhvbnNBbmRJbnRyb25zICh0KSB7XG4gICAgdmFyIGV4b25zID0gdC5leG9ucztcbiAgICAvL3ZhciBvYmogPSB7fTtcbiAgICAvL29iai5leG9ucyA9IGV4b25zO1xuICAgIHZhciBpbnRyb25zID0gW107XG4gICAgZm9yICh2YXIgaT0wOyBpPGV4b25zLmxlbmd0aC0xOyBpKyspIHtcbiAgICAgICAgdmFyIGludHJvbiA9IHtcbiAgICAgICAgICAgIHN0YXJ0IDogZXhvbnNbaV0udHJhbnNjcmlwdC5zdHJhbmQgPT09IDEgPyBleG9uc1tpXS5lbmQgOiBleG9uc1tpXS5zdGFydCxcbiAgICAgICAgICAgIGVuZCAgIDogZXhvbnNbaV0udHJhbnNjcmlwdC5zdHJhbmQgPT09IDEgPyBleG9uc1tpKzFdLnN0YXJ0IDogZXhvbnNbaSsxXS5lbmQsXG4gICAgICAgICAgICB0cmFuc2NyaXB0IDogdFxuICAgICAgICB9O1xuICAgICAgICBpbnRyb25zLnB1c2goaW50cm9uKTtcbiAgICB9XG4gICAgcmV0dXJuIGludHJvbnM7XG59XG5cblxuZnVuY3Rpb24gdHJhbnNmb3JtRXhvbnMgKHRyYW5zY3JpcHQpIHtcbiAgICB2YXIgdHJhbnNsYXRpb25TdGFydDtcbiAgICB2YXIgdHJhbnNsYXRpb25FbmQ7XG4gICAgaWYgKHRyYW5zY3JpcHQuVHJhbnNsYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0cmFuc2xhdGlvblN0YXJ0ID0gdHJhbnNjcmlwdC5UcmFuc2xhdGlvbi5zdGFydDtcbiAgICAgICAgdHJhbnNsYXRpb25FbmQgPSB0cmFuc2NyaXB0LlRyYW5zbGF0aW9uLmVuZDtcbiAgICB9XG4gICAgdmFyIGV4b25zID0gdHJhbnNjcmlwdC5FeG9uO1xuXG4gICAgdmFyIG5ld0V4b25zID0gW107XG4gICAgaWYgKGV4b25zKSB7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxleG9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRyYW5zY3JpcHQuVHJhbnNsYXRpb24gPT09IHVuZGVmaW5lZCkgeyAvLyBOTyBjb2RpbmcgdHJhbnNjcmlwdFxuICAgICAgICAgICAgICAgIG5ld0V4b25zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBzdGFydCAgIDogZXhvbnNbaV0uc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIGVuZCAgICAgOiBleG9uc1tpXS5lbmQsXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zY3JpcHQgOiB0cmFuc2NyaXB0LFxuICAgICAgICAgICAgICAgICAgICBjb2RpbmcgIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldCAgOiBleG9uc1tpXS5zdGFydCAtIHRyYW5zY3JpcHQuc3RhcnRcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGV4b25zW2ldLnN0YXJ0IDwgdHJhbnNsYXRpb25TdGFydCkge1xuICAgICAgICAgICAgICAgICAgICAvLyA1J1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXhvbnNbaV0uZW5kIDwgdHJhbnNsYXRpb25TdGFydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ29tcGxldGVseSBub24gY29kaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdFeG9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydCAgOiBleG9uc1tpXS5zdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmQgICAgOiBleG9uc1tpXS5lbmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNjcmlwdCA6IHRyYW5zY3JpcHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kaW5nIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ICA6IGV4b25zW2ldLnN0YXJ0IC0gdHJhbnNjcmlwdC5zdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIYXMgNSdVVFJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuY0V4b241ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ICA6IGV4b25zW2ldLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZCAgICA6IHRyYW5zbGF0aW9uU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNjcmlwdCA6IHRyYW5zY3JpcHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kaW5nIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ICA6IGV4b25zW2ldLnN0YXJ0IC0gdHJhbnNjcmlwdC5zdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb2RpbmdFeG9uNSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydCAgOiB0cmFuc2xhdGlvblN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZCAgICA6IGV4b25zW2ldLmVuZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2NyaXB0IDogdHJhbnNjcmlwdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RpbmcgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vb2Zmc2V0ICA6IGV4b25zW2ldLnN0YXJ0IC0gdHJhbnNjcmlwdC5zdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldDogdHJhbnNsYXRpb25TdGFydCAtIHRyYW5zY3JpcHQuc3RhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXhvbnNbaV0uc3RyYW5kID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RXhvbnMucHVzaChuY0V4b241KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdFeG9ucy5wdXNoKGNvZGluZ0V4b241KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RXhvbnMucHVzaChjb2RpbmdFeG9uNSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RXhvbnMucHVzaChuY0V4b241KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXhvbnNbaV0uZW5kID4gdHJhbnNsYXRpb25FbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gMydcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV4b25zW2ldLnN0YXJ0ID4gdHJhbnNsYXRpb25FbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENvbXBsZXRlbHkgbm9uIGNvZGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3RXhvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgICA6IGV4b25zW2ldLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZCAgICAgOiBleG9uc1tpXS5lbmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNjcmlwdCA6IHRyYW5zY3JpcHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kaW5nICA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldCAgOiBleG9uc1tpXS5zdGFydCAtIHRyYW5zY3JpcHQuc3RhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSGFzIDMnVVRSXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29kaW5nRXhvbjMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgIDogZXhvbnNbaV0uc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kICAgIDogdHJhbnNsYXRpb25FbmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNjcmlwdCA6IHRyYW5zY3JpcHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kaW5nIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQgIDogZXhvbnNbaV0uc3RhcnQgLSB0cmFuc2NyaXB0LnN0YXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5jRXhvbjMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgIDogdHJhbnNsYXRpb25FbmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kICAgIDogZXhvbnNbaV0uZW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zY3JpcHQgOiB0cmFuc2NyaXB0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGluZyA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vb2Zmc2V0ICA6IGV4b25zW2ldLnN0YXJ0IC0gdHJhbnNjcmlwdC5zdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldCA6IHRyYW5zbGF0aW9uRW5kIC0gdHJhbnNjcmlwdC5zdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChleG9uc1tpXS5zdHJhbmQgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdFeG9ucy5wdXNoKGNvZGluZ0V4b24zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdFeG9ucy5wdXNoKG5jRXhvbjMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdFeG9ucy5wdXNoKG5jRXhvbjMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0V4b25zLnB1c2goY29kaW5nRXhvbjMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY29kaW5nIGV4b25cbiAgICAgICAgICAgICAgICAgICAgbmV3RXhvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCAgOiBleG9uc1tpXS5zdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZCAgICA6IGV4b25zW2ldLmVuZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zY3JpcHQgOiB0cmFuc2NyaXB0LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kaW5nIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldCAgOiBleG9uc1tpXS5zdGFydCAtIHRyYW5zY3JpcHQuc3RhcnRcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXdFeG9ucztcbn1cblxuXG52YXIgZGF0YV9zZXF1ZW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZVJlc3QgPSBib2FyZC50cmFjay5kYXRhLmdlbm9tZS5lbnNlbWJsO1xuXG4gICAgdmFyIGRhdGEgPSBib2FyZC50cmFjay5kYXRhLmFzeW5jKClcbiAgICAgICAgLnJldHJpZXZlciAoZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAgICAgaWYgKChvYmoudG8gLSBvYmouZnJvbSkgPCBkYXRhLmxpbWl0KCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgdXJsID0gZVJlc3QudXJsKClcbiAgICAgICAgICAgICAgICAgICAgLmVuZHBvaW50KFwiL3NlcXVlbmNlL3JlZ2lvbi86c3BlY2llcy86cmVnaW9uXCIpXG4gICAgICAgICAgICAgICAgICAgIC5wYXJhbWV0ZXJzKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwic3BlY2llc1wiOiBvYmouc3BlY2llcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwicmVnaW9uXCI6IChvYmouY2hyICsgXCI6XCIgKyBvYmouZnJvbSArIFwiLi5cIiArIG9iai50bylcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gdmFyIHVybCA9IGVSZXN0LnVybC5zZXF1ZW5jZShvYmopO1xuICAgICAgICAgICAgICAgIHJldHVybiBlUmVzdC5jYWxsKHVybClcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4gKGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2VxID0gcmVzcC5ib2R5O1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHNlcS5pZC5zcGxpdChcIjpcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZnJvbSA9IGZpZWxkc1szXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBudHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxzZXEuc2VxLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbnRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3M6ICtmcm9tICsgaSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VxdWVuY2U6IHNlcS5zZXFbaV1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudHM7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHsgLy8gUmVnaW9uIHRvbyB3aWRlIGZvciBzZXF1ZW5jZVxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKFtdKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICBhcGlqcyhkYXRhKVxuICAgICAgICAuZ2V0c2V0KFwibGltaXRcIiwgMTUwKTtcblxuICAgIHJldHVybiBkYXRhO1xufTtcblxuLy8gZXhwb3J0XG52YXIgZ2Vub21lX2RhdGEgPSB7XG4gICAgZ2VuZSA6IGRhdGFfZ2VuZSxcbiAgICBzZXF1ZW5jZSA6IGRhdGFfc2VxdWVuY2UsXG4gICAgdHJhbnNjcmlwdCA6IGRhdGFfdHJhbnNjcmlwdCxcbiAgICBjYW5vbmljYWw6IGRhdGFfY2Fub25pY2FsLFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gZ2Vub21lX2RhdGE7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG52YXIgbGF5b3V0ID0gcmVxdWlyZShcIi4vbGF5b3V0LmpzXCIpO1xudmFyIGJvYXJkID0gcmVxdWlyZShcInRudC5ib2FyZFwiKTtcblxudmFyIHRudF9mZWF0dXJlX3RyYW5zY3JpcHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGZlYXR1cmUgPSBib2FyZC50cmFjay5mZWF0dXJlKClcbiAgICAgICAgLmxheW91dCAoYm9hcmQudHJhY2subGF5b3V0Lmdlbm9tZSgpKVxuICAgICAgICAuaW5kZXggKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICByZXR1cm4gZC5rZXk7XG4gICAgICAgIH0pO1xuXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChuZXdfZWxlbXMpIHtcbiAgICAgICAgdmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgdmFyIHhTY2FsZSA9IGZlYXR1cmUuc2NhbGUoKTtcbiAgICAgICAgdmFyIGdzID0gbmV3X2VsZW1zXG4gICAgICAgICAgICAuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyB4U2NhbGUoZC5zdGFydCkgKyBcIixcIiArIChmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLnNsb3RfaGVpZ2h0ICogZC5zbG90KSArIFwiKVwiO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgZ3NcbiAgICAgICAgICAgIC5hcHBlbmQoXCJsaW5lXCIpXG4gICAgICAgICAgICAuYXR0cihcIngxXCIsIDApXG4gICAgICAgICAgICAuYXR0cihcInkxXCIsIH5+KGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuZ2VuZV9oZWlnaHQvMikpXG4gICAgICAgICAgICAuYXR0cihcIngyXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcInkyXCIsIH5+KGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuZ2VuZV9oZWlnaHQvMikpXG4gICAgICAgICAgICAuYXR0cihcImZpbGxcIiwgXCJub25lXCIpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLCB0cmFjay5jb2xvcigpKVxuICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwgMilcbiAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbig1MDApXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmZWF0dXJlLmNvbG9yKCkoZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vLmF0dHIoXCJzdHJva2VcIiwgZmVhdHVyZS5jb2xvcigpKTtcblxuICAgICAgICAvLyBleG9uc1xuICAgICAgICAvLyBwYXNzIHRoZSBcInNsb3RcIiB0byB0aGUgZXhvbnMgYW5kIGludHJvbnNcbiAgICAgICAgbmV3X2VsZW1zLmVhY2ggKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICBpZiAoZC5leG9ucykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxkLmV4b25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGQuZXhvbnNbaV0uc2xvdCA9IGQuc2xvdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBleG9ucyA9IGdzLnNlbGVjdEFsbChcIi5leG9uc1wiKVxuICAgICAgICAgICAgLmRhdGEoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5leG9ucyB8fCBbXTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQuc3RhcnQ7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBleG9uc1xuICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgIC5hcHBlbmQoXCJyZWN0XCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X2V4b25zXCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHhTY2FsZShkLnN0YXJ0ICsgZC5vZmZzZXQpIC0geFNjYWxlKGQuc3RhcnQpKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgMClcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuZ2VuZV9oZWlnaHQpXG4gICAgICAgICAgICAuYXR0cihcImZpbGxcIiwgdHJhY2suY29sb3IoKSlcbiAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsIHRyYWNrLmNvbG9yKCkpXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24oNTAwKVxuICAgICAgICAgICAgLy8uYXR0cihcInN0cm9rZVwiLCBmZWF0dXJlLmNvbG9yKCkpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmZWF0dXJlLmNvbG9yKCkoZCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGQuY29kaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmVhdHVyZS5jb2xvcigpKGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZC5jb2RpbmcgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cmFjay5jb2xvcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmVhdHVyZS5jb2xvcigpKGQpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gbGFiZWxzXG4gICAgICAgIGdzXG4gICAgICAgICAgICAuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9uYW1lXCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgMClcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCAyNSlcbiAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5jb2xvcigpKVxuICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zaG93X2xhYmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkLmRpc3BsYXlfbGFiZWw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwibm9ybWFsXCIpXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24oNTAwKVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZlYXR1cmUuY29sb3IoKShkKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLmRpc3RyaWJ1dGUgKGZ1bmN0aW9uICh0cmFuc2NyaXB0cykge1xuICAgICAgICB2YXIgdHJhY2sgPSB0aGlzO1xuICAgICAgICB2YXIgeFNjYWxlID0gZmVhdHVyZS5zY2FsZSgpO1xuICAgICAgICB2YXIgZ3MgPSB0cmFuc2NyaXB0cy5zZWxlY3QoXCJnXCIpXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24oMjAwKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyB4U2NhbGUoZC5zdGFydCkgKyBcIixcIiArIChmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLnNsb3RfaGVpZ2h0ICogZC5zbG90KSArIFwiKVwiO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIGdzXG4gICAgICAgICAgICAuc2VsZWN0QWxsIChcInJlY3RcIilcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuZ2VuZV9oZWlnaHQpO1xuICAgICAgICBnc1xuICAgICAgICAgICAgLnNlbGVjdEFsbChcImxpbmVcIilcbiAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgfn4oZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5nZW5lX2hlaWdodC8yKSlcbiAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgfn4oZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5nZW5lX2hlaWdodC8yKSk7XG4gICAgICAgIGdzXG4gICAgICAgICAgICAuc2VsZWN0IChcInRleHRcIilcbiAgICAgICAgICAgIC50ZXh0IChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLnNob3dfbGFiZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQuZGlzcGxheV9sYWJlbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZSAoZnVuY3Rpb24gKHRyYW5zY3JpcHRzKSB7XG4gICAgICAgIHZhciB4U2NhbGUgPSBmZWF0dXJlLnNjYWxlKCk7XG4gICAgICAgIHZhciBncyA9IHRyYW5zY3JpcHRzLnNlbGVjdChcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwidHJhbnNsYXRlKFwiICsgeFNjYWxlKGQuc3RhcnQpICsgXCIsXCIgKyAoZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zbG90X2hlaWdodCAqIGQuc2xvdCkgKyBcIilcIjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBncy5zZWxlY3RBbGwoXCJsaW5lXCIpXG4gICAgICAgICAgICAuYXR0cihcIngyXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcInkxXCIsIH5+KGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuZ2VuZV9oZWlnaHQvMikpXG4gICAgICAgICAgICAuYXR0cihcInkyXCIsIH5+KGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuZ2VuZV9oZWlnaHQvMikpO1xuICAgICAgICAgICAgLy8gLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgLy8gICAgIHJldHVybiAoeFNjYWxlKGQuZW5kKSAtIHhTY2FsZShkLnN0YXJ0KSk7XG4gICAgICAgICAgICAvLyB9KVxuICAgICAgICBncy5zZWxlY3RBbGwoXCJyZWN0XCIpXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBncy5zZWxlY3RBbGwoXCIudG50X2V4b25zXCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHhTY2FsZShkLnN0YXJ0ICsgZC5vZmZzZXQpIC0geFNjYWxlKGQuc3RhcnQpKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cblxudmFyIHRudF9mZWF0dXJlX3NlcXVlbmNlID0gZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgICAgZm9udHNpemUgOiAxMCxcbiAgICAgICAgc2VxdWVuY2UgOiBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgcmV0dXJuIGQuc2VxdWVuY2U7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gJ0luaGVyaXQnIGZyb20gdG50LnRyYWNrLmZlYXR1cmVcbiAgICB2YXIgZmVhdHVyZSA9IGJvYXJkLnRyYWNrLmZlYXR1cmUoKVxuICAgIC5pbmRleCAoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIGQucG9zO1xuICAgIH0pO1xuXG4gICAgdmFyIGFwaSA9IGFwaWpzIChmZWF0dXJlKVxuICAgIC5nZXRzZXQgKGNvbmZpZyk7XG5cblxuICAgIGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAobmV3X250cykge1xuICAgICAgICB2YXIgdHJhY2sgPSB0aGlzO1xuICAgICAgICB2YXIgeFNjYWxlID0gZmVhdHVyZS5zY2FsZSgpO1xuXG4gICAgICAgIG5ld19udHNcbiAgICAgICAgICAgIC5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcImZpbGxcIiwgdHJhY2suY29sb3IoKSlcbiAgICAgICAgICAgIC5zdHlsZSgnZm9udC1zaXplJywgY29uZmlnLmZvbnRzaXplICsgXCJweFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhTY2FsZSAoZC5wb3MpIC0gKGNvbmZpZy5mb250c2l6ZS8yKSArIDE7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIH5+KHRyYWNrLmhlaWdodCgpIC8gMikgKyA1O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdHlsZShcImZvbnQtZmFtaWx5XCIsICdcIkx1Y2lkYSBDb25zb2xlXCIsIE1vbmFjbywgbW9ub3NwYWNlJylcbiAgICAgICAgICAgIC50ZXh0KGNvbmZpZy5zZXF1ZW5jZSlcbiAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbig1MDApXG4gICAgICAgICAgICAuYXR0cignZmlsbCcsIGZlYXR1cmUuY29sb3IoKSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLm1vdmUgKGZ1bmN0aW9uIChudHMpIHtcbiAgICAgICAgdmFyIHhTY2FsZSA9IGZlYXR1cmUuc2NhbGUoKTtcbiAgICAgICAgbnRzLnNlbGVjdCAoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geFNjYWxlKGQucG9zKSAtIChjb25maWcuZm9udHNpemUvMikgKyAxO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG52YXIgdG50X2ZlYXR1cmVfZ2VuZSA9IGZ1bmN0aW9uICgpIHtcblxuICAgIC8vICdJbmhlcml0JyBmcm9tIHRudC50cmFjay5mZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSBib2FyZC50cmFjay5mZWF0dXJlKClcbiAgICBcdC5sYXlvdXQoYm9hcmQudHJhY2subGF5b3V0Lmdlbm9tZSgpKVxuICAgIFx0LmluZGV4KGZ1bmN0aW9uIChkKSB7XG4gICAgXHQgICAgcmV0dXJuIGQuaWQ7XG4gICAgXHR9KTtcblxuICAgIGZlYXR1cmUuY3JlYXRlKGZ1bmN0aW9uIChuZXdfZWxlbXMpIHtcbiAgICAgICAgdmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgdmFyIHhTY2FsZSA9IGZlYXR1cmUuc2NhbGUoKTtcbiAgICAgICAgbmV3X2VsZW1zXG4gICAgICAgICAgICAuYXBwZW5kKFwicmVjdFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhTY2FsZShkLnN0YXJ0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zbG90X2hlaWdodCAqIGQuc2xvdDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLmdlbmVfaGVpZ2h0KVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIHRyYWNrLmNvbG9yKCkpXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24oNTAwKVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGQuY29sb3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmVhdHVyZS5jb2xvcigpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkLmNvbG9yO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIG5ld19lbGVtc1xuICAgICAgICAgICAgLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfbmFtZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhTY2FsZShkLnN0YXJ0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuc2xvdF9oZWlnaHQgKiBkLnNsb3QpICsgMjU7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIHRyYWNrLmNvbG9yKCkpXG4gICAgICAgICAgICAudGV4dChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLnNob3dfbGFiZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQuZGlzcGxheV9sYWJlbDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC13ZWlnaHRcIiwgXCJub3JtYWxcIilcbiAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbig1MDApXG4gICAgICAgICAgICAuYXR0cihcImZpbGxcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZlYXR1cmUuY29sb3IoKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5kaXN0cmlidXRlKGZ1bmN0aW9uIChnZW5lcykge1xuICAgICAgICB2YXIgdHJhY2sgPSB0aGlzO1xuICAgICAgICBnZW5lc1xuICAgICAgICAgICAgLnNlbGVjdChcInJlY3RcIilcbiAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbig1MDApXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuc2xvdF9oZWlnaHQgKiBkLnNsb3QpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuZ2VuZV9oZWlnaHQpO1xuXG4gICAgICAgIGdlbmVzXG4gICAgICAgICAgICAuc2VsZWN0KFwidGV4dFwiKVxuICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgLmR1cmF0aW9uKDUwMClcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zbG90X2hlaWdodCAqIGQuc2xvdCkgKyAyNTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGV4dChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIGlmIChmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLnNob3dfbGFiZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQuZGlzcGxheV9sYWJlbDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZShmdW5jdGlvbiAoZ2VuZXMpIHtcbiAgICAgICAgdmFyIHhTY2FsZSA9IGZlYXR1cmUuc2NhbGUoKTtcbiAgICAgICAgZ2VuZXMuc2VsZWN0KFwicmVjdFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhTY2FsZShkLnN0YXJ0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIGdlbmVzLnNlbGVjdChcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUoZC5zdGFydCk7XG4gICAgICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xufTtcblxuLy8gZ2Vub21lIGxvY2F0aW9uXG4gdmFyIHRudF9mZWF0dXJlX2xvY2F0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICB2YXIgeFNjYWxlO1xuICAgICB2YXIgcm93O1xuICAgICB2YXIgY2hyO1xuICAgICB2YXIgc3BlY2llcztcbiAgICAgdmFyIHRleHRfY2JhayA9IGZ1bmN0aW9uIChzcCwgY2hyLCBmcm9tLCB0bykge1xuICAgICAgICAgcmV0dXJuIHNwICsgXCIgXCIgKyBjaHIgKyBcIjpcIiArIGZyb20gKyBcIi1cIiArIHRvO1xuICAgICB9O1xuXG4gICAgIHZhciBmZWF0dXJlID0ge307XG4gICAgIGZlYXR1cmUucmVzZXQgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgZmVhdHVyZS5wbG90ID0gZnVuY3Rpb24gKCkge307XG4gICAgIGZlYXR1cmUuaW5pdCA9IGZ1bmN0aW9uICgpIHsgcm93ID0gdW5kZWZpbmVkOyB9O1xuICAgICBmZWF0dXJlLm1vdmVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgdmFyIHhTY2FsZSA9IGZlYXR1cmUuc2NhbGUoKTtcbiAgICAgICAgIHZhciBkb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG4gICAgICAgICByb3cuc2VsZWN0IChcInRleHRcIilcbiAgICAgICAgICAgIC50ZXh0KHRleHRfY2JhayhzcGVjaWVzLCBjaHIsIH5+ZG9tYWluWzBdLCB+fmRvbWFpblsxXSkpO1xuICAgICB9O1xuICAgICBmZWF0dXJlLnVwZGF0ZSA9IGZ1bmN0aW9uICh3aGVyZSkge1xuICAgICAgICAgY2hyID0gd2hlcmUuY2hyO1xuICAgICAgICAgc3BlY2llcyA9IHdoZXJlLnNwZWNpZXM7XG4gICAgICAgICB2YXIgdHJhY2sgPSB0aGlzO1xuICAgICAgICAgdmFyIHN2Z19nID0gdHJhY2suZztcbiAgICAgICAgIHZhciBkb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG4gICAgICAgICBpZiAocm93ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICByb3cgPSBzdmdfZztcbiAgICAgICAgICAgICByb3dcbiAgICAgICAgICAgICAgICAgLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgICAgICAgLnRleHQodGV4dF9jYmFrKHNwZWNpZXMsIGNociwgfn5kb21haW5bMF0sIH5+ZG9tYWluWzFdKSk7XG4gICAgICAgICB9XG4gICAgIH07XG5cbiAgICAgZmVhdHVyZS5zY2FsZSA9IGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICByZXR1cm4geFNjYWxlO1xuICAgICAgICAgfVxuICAgICAgICAgeFNjYWxlID0gcztcbiAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICB9O1xuXG4gICAgIGZlYXR1cmUudGV4dCA9IGZ1bmN0aW9uIChjYmFrKSB7XG4gICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHRleHRfY2JhaztcbiAgICAgICAgfVxuICAgICAgICB0ZXh0X2NiYWsgPSBjYmFrO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgfTtcblxuICAgICByZXR1cm4gZmVhdHVyZTtcbiB9O1xuXG52YXIgZ2Vub21lX2ZlYXR1cmVzID0ge1xuICAgIGdlbmUgOiB0bnRfZmVhdHVyZV9nZW5lLFxuICAgIHNlcXVlbmNlIDogdG50X2ZlYXR1cmVfc2VxdWVuY2UsXG4gICAgdHJhbnNjcmlwdCA6IHRudF9mZWF0dXJlX3RyYW5zY3JpcHQsXG4gICAgbG9jYXRpb24gOiB0bnRfZmVhdHVyZV9sb2NhdGlvbixcbn07XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBnZW5vbWVfZmVhdHVyZXM7XG4iLCIvLyB2YXIgZW5zZW1ibF9yZXN0ID0gcmVxdWlyZShcInRudC5lbnNlbWJsXCIpKCk7XG52YXIgYXBpanMgPSByZXF1aXJlKFwidG50LmFwaVwiKTtcbnZhciB0bnRfYm9hcmQgPSByZXF1aXJlKFwidG50LmJvYXJkXCIpO1xudG50X2JvYXJkLnRyYWNrLmRhdGEuZ2Vub21lID0gcmVxdWlyZShcIi4vZGF0YS5qc1wiKTtcbnRudF9ib2FyZC50cmFjay5mZWF0dXJlLmdlbm9tZSA9IHJlcXVpcmUoXCIuL2ZlYXR1cmVcIik7XG50bnRfYm9hcmQudHJhY2subGF5b3V0Lmdlbm9tZSA9IHJlcXVpcmUoXCIuL2xheW91dFwiKTtcbnRudF9ib2FyZC50cmFjay5kYXRhLmdlbm9tZS5lbnNlbWJsID0gcmVxdWlyZShcInRudC5yZXN0XCIpKClcbiAgICAuZG9tYWluKFwicmVzdC5lbnNlbWJsLm9yZ1wiKTtcblxuLy8gcHJvbWlzZXNcbnZhciBQcm9taXNlID0gcmVxdWlyZSgnZXM2LXByb21pc2UnKS5Qcm9taXNlO1xudmFyIG1pblByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzKSB7XG4gICAgcmVzKDApO1xufSk7XG5cbnRudF9ib2FyZF9nZW5vbWUgPSBmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBlbnNlbWJsX3Jlc3QgPSB0bnRfYm9hcmQudHJhY2suZGF0YS5nZW5vbWUuZW5zZW1ibDtcblxuICAgIC8vIFByaXZhdGUgdmFyc1xuICAgIHZhciBlbnNfcmUgPSAvXkVOU1xcdytcXGQrJC87XG4gICAgdmFyIGNocl9sZW5ndGg7XG5cblxuXG4gICAgLy8gVmFycyBleHBvc2VkIGluIHRoZSBBUElcbiAgICB2YXIgY29uZiA9IHtcbiAgICAgICAgbWF4X2Nvb3JkICAgICAgIDogdW5kZWZpbmVkLCAvLyBQcm9taXNlIHRoYXQgcmV0dXJucyB0aGUgbWF4IGNvb3JkaW5hdGUuIElmIHVuZGVmIHVzZXMgdGhlIGxlbmd0aCBvZiB0aGUgY2hyb21vc29tZVxuICAgICAgICBtaW5fY29vcmQgICAgICAgOiBtaW5Qcm9taXNlLCAvLyBQcm9taXNlIHRoYXQgcmV0dXJucyB0aGUgbWluIGNvb3JkaW5hdGUuIERlZmF1bHRzIHRvIDBcbiAgICAgICAgZ2VuZSAgICAgICAgICAgOiB1bmRlZmluZWQsXG4gICAgICAgIHhyZWZfc2VhcmNoICAgIDogZnVuY3Rpb24gKCkge30sXG4gICAgICAgIGVuc2dlbmVfc2VhcmNoIDogZnVuY3Rpb24gKCkge30sXG4gICAgICAgIGNvbnRleHQgICAgICAgIDogMCxcbiAgICAgICAgcmVzdCAgICAgICAgICAgOiBlbnNlbWJsX3Jlc3RcbiAgICB9O1xuICAgIC8vIFdlIFwiaW5oZXJpdFwiIGZyb20gYm9hcmRcbiAgICB2YXIgZ2Vub21lX2Jyb3dzZXIgPSB0bnRfYm9hcmQoKVxuICAgICAgICAuem9vbV9pbigyMDApXG4gICAgICAgIC56b29tX291dCg1MDAwMDAwKTsgLy8gZW5zZW1ibCByZWdpb24gbGltaXRcbiAgICAgICAgLy8gLm1pbigwKTtcblxuICAgIHZhciBnZW5lO1xuXG4gICAgLy8gVGhlIGxvY2F0aW9uIGFuZCBheGlzIHRyYWNrXG4gICAgdmFyIGxvY2F0aW9uX3RyYWNrID0gdG50X2JvYXJkLnRyYWNrKClcbiAgICAgICAgLmhlaWdodCgyMClcbiAgICAgICAgLmNvbG9yKFwid2hpdGVcIilcbiAgICAgICAgLmRhdGEodG50X2JvYXJkLnRyYWNrLmRhdGEuZW1wdHkoKSlcbiAgICAgICAgLmRpc3BsYXkodG50X2JvYXJkLnRyYWNrLmZlYXR1cmUuZ2Vub21lLmxvY2F0aW9uKCkpO1xuXG4gICAgdmFyIGF4aXNfdHJhY2sgPSB0bnRfYm9hcmQudHJhY2soKVxuICAgICAgICAuaGVpZ2h0KDApXG4gICAgICAgIC5jb2xvcihcIndoaXRlXCIpXG4gICAgICAgIC5kYXRhKHRudF9ib2FyZC50cmFjay5kYXRhLmVtcHR5KCkpXG4gICAgICAgIC5kaXNwbGF5KHRudF9ib2FyZC50cmFjay5mZWF0dXJlLmF4aXMoKSk7XG5cbiAgICBnZW5vbWVfYnJvd3NlclxuXHQgICAuYWRkX3RyYWNrKGxvY2F0aW9uX3RyYWNrKVxuICAgICAgIC5hZGRfdHJhY2soYXhpc190cmFjayk7XG5cbiAgICAvLyBEZWZhdWx0IGxvY2F0aW9uOlxuICAgIGdlbm9tZV9icm93c2VyXG5cdCAgIC5zcGVjaWVzKFwiaHVtYW5cIilcbiAgICAgICAuY2hyKDcpXG4gICAgICAgLmZyb20oMTM5NDI0OTQwKVxuICAgICAgIC50bygxNDE3ODQxMDApO1xuXG4gICAgLy8gV2Ugc2F2ZSB0aGUgc3RhcnQgbWV0aG9kIG9mIHRoZSAncGFyZW50JyBvYmplY3RcbiAgICBnZW5vbWVfYnJvd3Nlci5fc3RhcnQgPSBnZW5vbWVfYnJvd3Nlci5zdGFydDtcblxuICAgIC8vIFdlIGhpamFjayBwYXJlbnQncyBzdGFydCBtZXRob2RcbiAgICB2YXIgc3RhcnQgPSBmdW5jdGlvbiAod2hlcmUpIHtcbiAgICAgICAgaWYgKHdoZXJlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmICh3aGVyZS5nZW5lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBnZXRfZ2VuZSh3aGVyZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAod2hlcmUuc3BlY2llcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHdoZXJlLnNwZWNpZXMgPSBnZW5vbWVfYnJvd3Nlci5zcGVjaWVzKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZ2Vub21lX2Jyb3dzZXIuc3BlY2llcyh3aGVyZS5zcGVjaWVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHdoZXJlLmNociA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHdoZXJlLmNociA9IGdlbm9tZV9icm93c2VyLmNocigpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbm9tZV9icm93c2VyLmNocih3aGVyZS5jaHIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAod2hlcmUuZnJvbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHdoZXJlLmZyb20gPSBnZW5vbWVfYnJvd3Nlci5mcm9tKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZ2Vub21lX2Jyb3dzZXIuZnJvbSh3aGVyZS5mcm9tKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHdoZXJlLnRvID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgd2hlcmUudG8gPSBnZW5vbWVfYnJvd3Nlci50bygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbm9tZV9icm93c2VyLnRvKHdoZXJlLnRvKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7IC8vIFwid2hlcmVcIiBpcyB1bmRlZiBzbyBsb29rIGZvciBnZW5lIG9yIGxvY1xuICAgICAgICAgICAgaWYgKGdlbm9tZV9icm93c2VyLmdlbmUoKSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZ2V0X2dlbmUoeyBzcGVjaWVzIDogZ2Vub21lX2Jyb3dzZXIuc3BlY2llcygpLFxuICAgICAgICAgICAgICAgICAgICBnZW5lICAgIDogZ2Vub21lX2Jyb3dzZXIuZ2VuZSgpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB3aGVyZSA9IHt9O1xuICAgICAgICAgICAgICAgIHdoZXJlLnNwZWNpZXMgPSBnZW5vbWVfYnJvd3Nlci5zcGVjaWVzKCk7XG4gICAgICAgICAgICAgICAgd2hlcmUuY2hyICAgICA9IGdlbm9tZV9icm93c2VyLmNocigpO1xuICAgICAgICAgICAgICAgIHdoZXJlLmZyb20gICAgPSBnZW5vbWVfYnJvd3Nlci5mcm9tKCk7XG4gICAgICAgICAgICAgICAgd2hlcmUudG8gICAgICA9IGdlbm9tZV9icm93c2VyLnRvKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNaW4gaXMgMCBieSBkZWZhdWx0IG9yIHVzZSB0aGUgcHJvdmlkZWQgcHJvbWlzZVxuICAgICAgICBjb25mLm1pbl9jb29yZFxuICAgICAgICAgICAgLnRoZW4gKGZ1bmN0aW9uIChtaW4pIHtcbiAgICAgICAgICAgICAgICBnZW5vbWVfYnJvd3Nlci5taW4obWluKTtcbiAgICAgICAgICAgICAgICBpZiAoIWNvbmYubWF4X2Nvb3JkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1cmwgPSBlbnNlbWJsX3Jlc3QudXJsKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5lbmRwb2ludChcImluZm8vYXNzZW1ibHkvOnNwZWNpZXMvOnJlZ2lvbl9uYW1lXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAucGFyYW1ldGVycyh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3BlY2llczogd2hlcmUuc3BlY2llcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWdpb25fbmFtZTogd2hlcmUuY2hyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBjb25mLm1heF9jb29yZCA9IGVuc2VtYmxfcmVzdC5jYWxsICh1cmwpXG4gICAgICAgICAgICAgICAgICAgICAgICAudGhlbiAoZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcC5ib2R5Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY29uZi5tYXhfY29vcmQ7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRoZW4gKGZ1bmN0aW9uIChtYXgpIHtcbiAgICAgICAgICAgICAgICBnZW5vbWVfYnJvd3Nlci5tYXgobWF4KTtcbiAgICAgICAgICAgICAgICBnZW5vbWVfYnJvd3Nlci5fc3RhcnQoKTtcblxuICAgICAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciBob21vbG9ndWVzID0gZnVuY3Rpb24gKGVuc0dlbmUsIGNhbGxiYWNrKSAge1xuICAgICAgICB2YXIgdXJsID0gZW5zZW1ibF9yZXN0LnVybC5ob21vbG9ndWVzICh7aWQgOiBlbnNHZW5lfSk7XG4gICAgICAgIGVuc2VtYmxfcmVzdC5jYWxsKHVybClcbiAgICAgICAgICAgIC50aGVuIChmdW5jdGlvbihyZXNwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhvbW9sb2d1ZXMgPSByZXNwLmJvZHkuZGF0YVswXS5ob21vbG9naWVzO1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBob21vbG9ndWVzX29iaiA9IHNwbGl0X2hvbW9sb2d1ZXMoaG9tb2xvZ3Vlcyk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGhvbW9sb2d1ZXNfb2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgaXNFbnNlbWJsR2VuZSA9IGZ1bmN0aW9uKHRlcm0pIHtcbiAgICAgICAgaWYgKHRlcm0ubWF0Y2goZW5zX3JlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGdldF9nZW5lID0gZnVuY3Rpb24gKHdoZXJlKSB7XG4gICAgICAgIGlmIChpc0Vuc2VtYmxHZW5lKHdoZXJlLmdlbmUpKSB7XG4gICAgICAgICAgICBnZXRfZW5zR2VuZSh3aGVyZS5nZW5lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciB1cmwgPSBlbnNlbWJsX3Jlc3QudXJsKClcbiAgICAgICAgICAgICAgICAuZW5kcG9pbnQoXCJ4cmVmcy9zeW1ib2wvOnNwZWNpZXMvOnN5bWJvbFwiKVxuICAgICAgICAgICAgICAgIC5wYXJhbWV0ZXJzKHtcbiAgICAgICAgICAgICAgICAgICAgc3BlY2llczogd2hlcmUuc3BlY2llcyxcbiAgICAgICAgICAgICAgICAgICAgc3ltYm9sOiB3aGVyZS5nZW5lXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBlbnNlbWJsX3Jlc3QuY2FsbCh1cmwpXG4gICAgICAgICAgICAgICAgLnRoZW4gKGZ1bmN0aW9uKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGEgPSByZXNwLmJvZHk7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEgPSBkYXRhLmZpbHRlcihmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gIWQuaWQuaW5kZXhPZihcIkVOU1wiKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhWzBdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdldF9lbnNHZW5lKGRhdGFbMF0uaWQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbmYueHJlZl9zZWFyY2gocmVzcCwgd2hlcmUuZ2VuZSwgd2hlcmUuc3BlY2llcyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGdldF9lbnNHZW5lID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHZhciB1cmwgPSBlbnNlbWJsX3Jlc3QudXJsKClcbiAgICAgICAgICAgIC5lbmRwb2ludChcIi9sb29rdXAvaWQvOmlkXCIpXG4gICAgICAgICAgICAucGFyYW1ldGVycyh7XG4gICAgICAgICAgICAgICAgaWQ6IGlkXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBlbnNlbWJsX3Jlc3QuY2FsbCh1cmwpXG4gICAgICAgICAgICAudGhlbiAoZnVuY3Rpb24ocmVzcCkge1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcC5ib2R5O1xuICAgICAgICAgICAgICAgIGNvbmYuZW5zZ2VuZV9zZWFyY2goZGF0YSk7XG4gICAgICAgICAgICAgICAgdmFyIGV4dHJhID0gfn4oKGRhdGEuZW5kIC0gZGF0YS5zdGFydCkgKiAoY29uZi5jb250ZXh0LzEwMCkpO1xuICAgICAgICAgICAgICAgIGdlbm9tZV9icm93c2VyXG4gICAgICAgICAgICAgICAgICAgIC5zcGVjaWVzKGRhdGEuc3BlY2llcylcbiAgICAgICAgICAgICAgICAgICAgLmNocihkYXRhLnNlcV9yZWdpb25fbmFtZSlcbiAgICAgICAgICAgICAgICAgICAgLmZyb20oZGF0YS5zdGFydCAtIGV4dHJhKVxuICAgICAgICAgICAgICAgICAgICAudG8oZGF0YS5lbmQgKyBleHRyYSk7XG5cbiAgICAgICAgICAgICAgICBnZW5vbWVfYnJvd3Nlci5zdGFydCggeyBzcGVjaWVzIDogZGF0YS5zcGVjaWVzLFxuICAgICAgICAgICAgICAgICAgICBjaHIgICAgIDogZGF0YS5zZXFfcmVnaW9uX25hbWUsXG4gICAgICAgICAgICAgICAgICAgIGZyb20gICAgOiBkYXRhLnN0YXJ0IC0gZXh0cmEsXG4gICAgICAgICAgICAgICAgICAgIHRvICAgICAgOiBkYXRhLmVuZCArIGV4dHJhXG4gICAgICAgICAgICAgICAgfSApO1xuICAgICAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciBzcGxpdF9ob21vbG9ndWVzID0gZnVuY3Rpb24gKGhvbW9sb2d1ZXMpIHtcbiAgICAgICAgdmFyIG9ydGhvUGF0dCA9IC9vcnRob2xvZy87XG4gICAgICAgIHZhciBwYXJhUGF0dCA9IC9wYXJhbG9nLztcblxuICAgICAgICB2YXIgb3J0aG9sb2d1ZXMgPSBob21vbG9ndWVzLmZpbHRlcihmdW5jdGlvbihkKXtyZXR1cm4gZC50eXBlLm1hdGNoKG9ydGhvUGF0dCk7fSk7XG4gICAgICAgIHZhciBwYXJhbG9ndWVzICA9IGhvbW9sb2d1ZXMuZmlsdGVyKGZ1bmN0aW9uKGQpe3JldHVybiBkLnR5cGUubWF0Y2gocGFyYVBhdHQpO30pO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAnb3J0aG9sb2d1ZXMnIDogb3J0aG9sb2d1ZXMsXG4gICAgICAgICAgICAncGFyYWxvZ3VlcycgIDogcGFyYWxvZ3Vlc1xuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB2YXIgYXBpID0gYXBpanMoZ2Vub21lX2Jyb3dzZXIpXG4gICAgICAgIC5nZXRzZXQgKGNvbmYpO1xuXG4gICAgYXBpLm1ldGhvZCAoe1xuICAgICAgICBzdGFydCAgICAgIDogc3RhcnQsXG4gICAgICAgIGhvbW9sb2d1ZXMgOiBob21vbG9ndWVzXG4gICAgfSk7XG5cbiAgICByZXR1cm4gZ2Vub21lX2Jyb3dzZXI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB0bnRfYm9hcmRfZ2Vub21lO1xuIiwidmFyIGJvYXJkID0gcmVxdWlyZShcInRudC5ib2FyZFwiKTtcbmJvYXJkLmdlbm9tZSA9IHJlcXVpcmUoXCIuL2dlbm9tZVwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gYm9hcmQ7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG5cbi8vIFRoZSBvdmVybGFwIGRldGVjdG9yIHVzZWQgZm9yIGdlbmVzXG52YXIgZ2VuZV9sYXlvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBQcml2YXRlIHZhcnNcbiAgICB2YXIgbWF4X3Nsb3RzO1xuXG4gICAgLy8gdmFycyBleHBvc2VkIGluIHRoZSBBUEk6XG4gICAgdmFyIGhlaWdodCA9IDE1MDtcblxuICAgIHZhciBvbGRfZWxlbWVudHMgPSBbXTtcblxuICAgIHZhciBzY2FsZTtcblxuICAgIHZhciBzbG90X3R5cGVzID0ge1xuICAgICAgICAnZXhwYW5kZWQnICAgOiB7XG4gICAgICAgICAgICBzbG90X2hlaWdodCA6IDMwLFxuICAgICAgICAgICAgZ2VuZV9oZWlnaHQgOiAxMCxcbiAgICAgICAgICAgIHNob3dfbGFiZWwgIDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICAnY29sbGFwc2VkJyA6IHtcbiAgICAgICAgICAgIHNsb3RfaGVpZ2h0IDogMTAsXG4gICAgICAgICAgICBnZW5lX2hlaWdodCA6IDcsXG4gICAgICAgICAgICBzaG93X2xhYmVsICA6IGZhbHNlXG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBjdXJyZW50X3Nsb3RfdHlwZSA9ICdleHBhbmRlZCc7XG5cbiAgICAvLyBUaGUgcmV0dXJuZWQgY2xvc3VyZSAvIG9iamVjdFxuICAgIHZhciBnZW5lc19sYXlvdXQgPSBmdW5jdGlvbiAobmV3X2dlbmVzKSB7XG4gICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIHNjYWxlID0gdHJhY2suZGlzcGxheSgpLnNjYWxlKCk7XG5cbiAgICAgICAgLy8gV2UgbWFrZSBzdXJlIHRoYXQgdGhlIGdlbmVzIGhhdmUgbmFtZVxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5ld19nZW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKG5ld19nZW5lc1tpXS5leHRlcm5hbF9uYW1lID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgbmV3X2dlbmVzW2ldLmV4dGVybmFsX25hbWUgPSBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbWF4X3Nsb3RzID0gfn4odHJhY2suaGVpZ2h0KCkgLyBzbG90X3R5cGVzLmV4cGFuZGVkLnNsb3RfaGVpZ2h0KTtcblxuICAgICAgICBpZiAoZ2VuZXNfbGF5b3V0LmtlZXBfc2xvdHMoKSkge1xuICAgICAgICAgICAgc2xvdF9rZWVwZXIobmV3X2dlbmVzLCBvbGRfZWxlbWVudHMpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBuZWVkZWRfc2xvdHMgPSBjb2xsaXRpb25fZGV0ZWN0b3IobmV3X2dlbmVzKTtcbiAgICAgICAgc2xvdF90eXBlcy5jb2xsYXBzZWQubmVlZGVkX3Nsb3RzID0gbmVlZGVkX3Nsb3RzO1xuICAgICAgICBzbG90X3R5cGVzLmV4cGFuZGVkLm5lZWRlZF9zbG90cyA9IG5lZWRlZF9zbG90cztcbiAgICAgICAgaWYgKGdlbmVzX2xheW91dC5maXhlZF9zbG90X3R5cGUoKSkge1xuICAgICAgICAgICAgY3VycmVudF9zbG90X3R5cGUgPSBnZW5lc19sYXlvdXQuZml4ZWRfc2xvdF90eXBlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAobmVlZGVkX3Nsb3RzID4gbWF4X3Nsb3RzKSB7XG4gICAgICAgICAgICBjdXJyZW50X3Nsb3RfdHlwZSA9ICdjb2xsYXBzZWQnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY3VycmVudF9zbG90X3R5cGUgPSAnZXhwYW5kZWQnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcnVuIHRoZSB1c2VyLWRlZmluZWQgY2FsbGJhY2tcbiAgICAgICAgZ2VuZXNfbGF5b3V0Lm9uX2xheW91dF9ydW4oKShzbG90X3R5cGVzLCBjdXJyZW50X3Nsb3RfdHlwZSk7XG5cbiAgICAgICAgLy9jb25mX3JvLmVsZW1lbnRzID0gbmV3X2dlbmVzO1xuICAgICAgICBvbGRfZWxlbWVudHMgPSBuZXdfZ2VuZXM7XG4gICAgICAgIHJldHVybiBuZXdfZ2VuZXM7XG4gICAgfTtcblxuICAgIHZhciBnZW5lX3Nsb3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBzbG90X3R5cGVzW2N1cnJlbnRfc2xvdF90eXBlXTtcbiAgICB9O1xuXG4gICAgdmFyIGNvbGxpdGlvbl9kZXRlY3RvciA9IGZ1bmN0aW9uIChnZW5lcykge1xuICAgICAgICB2YXIgZ2VuZXNfcGxhY2VkID0gW107XG4gICAgICAgIHZhciBnZW5lc190b19wbGFjZSA9IGdlbmVzO1xuICAgICAgICB2YXIgbmVlZGVkX3Nsb3RzID0gMDtcbiAgICAgICAgZm9yICh2YXIgaj0wOyBqPGdlbmVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBpZiAoZ2VuZXNbal0uc2xvdCA+IG5lZWRlZF9zbG90cyAmJiBnZW5lc1tqXS5zbG90IDwgbWF4X3Nsb3RzKSB7XG4gICAgICAgICAgICAgICAgbmVlZGVkX3Nsb3RzID0gZ2VuZXNbal0uc2xvdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxnZW5lc190b19wbGFjZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGdlbmVzX2J5X3Nsb3QgPSBzb3J0X2dlbmVzX2J5X3Nsb3QoZ2VuZXNfcGxhY2VkKTtcbiAgICAgICAgICAgIHZhciB0aGlzX2dlbmUgPSBnZW5lc190b19wbGFjZVtpXTtcbiAgICAgICAgICAgIGlmICh0aGlzX2dlbmUuc2xvdCAhPT0gdW5kZWZpbmVkICYmIHRoaXNfZ2VuZS5zbG90IDwgbWF4X3Nsb3RzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNsb3RfaGFzX3NwYWNlKHRoaXNfZ2VuZSwgZ2VuZXNfYnlfc2xvdFt0aGlzX2dlbmUuc2xvdF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVzX3BsYWNlZC5wdXNoKHRoaXNfZ2VuZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBzbG90ID0gMDtcbiAgICAgICAgICAgIE9VVEVSOiB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChzbG90X2hhc19zcGFjZSh0aGlzX2dlbmUsIGdlbmVzX2J5X3Nsb3Rbc2xvdF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNfZ2VuZS5zbG90ID0gc2xvdDtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXNfcGxhY2VkLnB1c2godGhpc19nZW5lKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNsb3QgPiBuZWVkZWRfc2xvdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5lZWRlZF9zbG90cyA9IHNsb3Q7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNsb3QrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmVlZGVkX3Nsb3RzICsgMTtcbiAgICB9O1xuXG4gICAgdmFyIHNsb3RfaGFzX3NwYWNlID0gZnVuY3Rpb24gKHF1ZXJ5X2dlbmUsIGdlbmVzX2luX3RoaXNfc2xvdCkge1xuICAgICAgICBpZiAoZ2VuZXNfaW5fdGhpc19zbG90ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGo9MDsgajxnZW5lc19pbl90aGlzX3Nsb3QubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIHZhciBzdWJqX2dlbmUgPSBnZW5lc19pbl90aGlzX3Nsb3Rbal07XG4gICAgICAgICAgICBpZiAocXVlcnlfZ2VuZS5pZCA9PT0gc3Vial9nZW5lLmlkKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgeV9sYWJlbF9lbmQgPSBzdWJqX2dlbmUuZGlzcGxheV9sYWJlbC5sZW5ndGggKiA4ICsgc2NhbGUoc3Vial9nZW5lLnN0YXJ0KTsgLy8gVE9ETzogSXQgbWF5IGJlIGJldHRlciB0byBoYXZlIGEgZml4ZWQgZm9udCBzaXplIChpbnN0ZWFkIG9mIHRoZSBoYXJkY29kZWQgdmFsdWUpP1xuICAgICAgICAgICAgdmFyIHkxICA9IHNjYWxlKHN1YmpfZ2VuZS5zdGFydCk7XG4gICAgICAgICAgICB2YXIgeTIgID0gc2NhbGUoc3Vial9nZW5lLmVuZCkgPiB5X2xhYmVsX2VuZCA/IHNjYWxlKHN1YmpfZ2VuZS5lbmQpIDogeV9sYWJlbF9lbmQ7XG4gICAgICAgICAgICB2YXIgeF9sYWJlbF9lbmQgPSBxdWVyeV9nZW5lLmRpc3BsYXlfbGFiZWwubGVuZ3RoICogOCArIHNjYWxlKHF1ZXJ5X2dlbmUuc3RhcnQpO1xuICAgICAgICAgICAgdmFyIHgxID0gc2NhbGUocXVlcnlfZ2VuZS5zdGFydCk7XG4gICAgICAgICAgICB2YXIgeDIgPSBzY2FsZShxdWVyeV9nZW5lLmVuZCkgPiB4X2xhYmVsX2VuZCA/IHNjYWxlKHF1ZXJ5X2dlbmUuZW5kKSA6IHhfbGFiZWxfZW5kO1xuICAgICAgICAgICAgaWYgKCAoKHgxIDw9IHkxKSAmJiAoeDIgPj0geTEpKSB8fFxuICAgICAgICAgICAgKCh4MSA+PSB5MSkgJiYgKHgxIDw9IHkyKSkgKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICB2YXIgc2xvdF9rZWVwZXIgPSBmdW5jdGlvbiAoZ2VuZXMsIHByZXZfZ2VuZXMpIHtcbiAgICAgICAgdmFyIHByZXZfZ2VuZXNfc2xvdHMgPSBnZW5lczJzbG90cyhwcmV2X2dlbmVzKTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdlbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAocHJldl9nZW5lc19zbG90c1tnZW5lc1tpXS5pZF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGdlbmVzW2ldLnNsb3QgPSBwcmV2X2dlbmVzX3Nsb3RzW2dlbmVzW2ldLmlkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgZ2VuZXMyc2xvdHMgPSBmdW5jdGlvbiAoZ2VuZXNfYXJyYXkpIHtcbiAgICAgICAgdmFyIGhhc2ggPSB7fTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBnZW5lc19hcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGdlbmUgPSBnZW5lc19hcnJheVtpXTtcbiAgICAgICAgICAgIGhhc2hbZ2VuZS5pZF0gPSBnZW5lLnNsb3Q7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGhhc2g7XG4gICAgfTtcblxuICAgIHZhciBzb3J0X2dlbmVzX2J5X3Nsb3QgPSBmdW5jdGlvbiAoZ2VuZXMpIHtcbiAgICAgICAgdmFyIHNsb3RzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChzbG90c1tnZW5lc1tpXS5zbG90XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgc2xvdHNbZ2VuZXNbaV0uc2xvdF0gPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNsb3RzW2dlbmVzW2ldLnNsb3RdLnB1c2goZ2VuZXNbaV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzbG90cztcbiAgICB9O1xuXG4gICAgLy8gQVBJXG4gICAgdmFyIGFwaSA9IGFwaWpzIChnZW5lc19sYXlvdXQpXG4gICAgICAgIC5nZXRzZXQgKFwiZWxlbWVudHNcIiwgZnVuY3Rpb24gKCkge30pXG4gICAgICAgIC5nZXRzZXQgKFwib25fbGF5b3V0X3J1blwiLCBmdW5jdGlvbiAoKSB7fSlcbiAgICAgICAgLmdldHNldCAoXCJmaXhlZF9zbG90X3R5cGVcIilcbiAgICAgICAgLmdldHNldCAoXCJrZWVwX3Nsb3RzXCIsIHRydWUpXG4gICAgICAgIC5tZXRob2QgKHtcbiAgICAgICAgICAgIGdlbmVfc2xvdCA6IGdlbmVfc2xvdCxcbiAgICAgICAgICAgIC8vIGhlaWdodCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vICAgICByZXR1cm4gc2xvdF90eXBlcy5leHBhbmRlZC5uZWVkZWRfc2xvdHMgKiBzbG90X3R5cGVzLmV4cGFuZGVkLnNsb3RfaGVpZ2h0O1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICB9KTtcblxuICAgIC8vIENoZWNrIHRoYXQgdGhlIGZpeGVkIHNsb3QgdHlwZSBpcyB2YWxpZFxuICAgIGdlbmVzX2xheW91dC5maXhlZF9zbG90X3R5cGUuY2hlY2soZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgcmV0dXJuICgodmFsID09PSBcImNvbGxhcHNlZFwiKSB8fCAodmFsID09PSBcImV4cGFuZGVkXCIpKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBnZW5lc19sYXlvdXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBnZW5lX2xheW91dDtcbiJdfQ==
