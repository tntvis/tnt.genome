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
}).call(this,require("IrXUsu"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"IrXUsu":4}],4:[function(require,module,exports){
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
module.exports = require("./src/api.js");

},{"./src/api.js":6}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
// if (typeof tnt === "undefined") {
//     module.exports = tnt = {}
// }
// tnt.utils = require("tnt.utils");
// tnt.tooltip = require("tnt.tooltip");
// tnt.board = require("./src/index.js");

module.exports = require("./src/index");

},{"./src/index":11}],8:[function(require,module,exports){
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

},{"tnt.api":5,"tnt.utils":33}],9:[function(require,module,exports){
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

},{"./spinner.js":13,"tnt.api":5}],10:[function(require,module,exports){
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
    };

    var init = function (width) {
        var track = this;

        track.g
            .append ("text")
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
    	for (var i=0; i<displays.length; i++) {
    	    displays[i].reset.call(track);
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
    	    .attr("class", "tnt_guider")
    	    .attr("x1", 0)
    	    .attr("x2", width)
    	    .attr("y1", height_offset)
    	    .attr("y2", height_offset)
    	    .style("stroke", feature.color())
    	    .style("stroke-width", 1);

    	track.g
    	    .append("line")
    	    .attr("class", "tnt_guider")
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
    	track.g.selectAll("rect").remove();
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

},{"./layout.js":12,"tnt.api":5}],11:[function(require,module,exports){
var board = require ("./board.js");
board.track = require ("./track");
board.track.data = require ("./data.js");
board.track.layout = require ("./layout.js");
board.track.feature = require ("./feature.js");
board.track.layout = require ("./layout.js");

module.exports = exports = board;

},{"./board.js":8,"./data.js":9,"./feature.js":10,"./layout.js":12,"./track":14}],12:[function(require,module,exports){
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

},{"tnt.api":5}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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

},{"tnt.api":5,"tnt.utils":33}],15:[function(require,module,exports){
module.exports = tnt_rest = require("./src/rest.js");

},{"./src/rest.js":31}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{"./response":20}],18:[function(require,module,exports){
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

},{"../plugins/cleanurl":25,"./error":17,"./request":19,"./response":20,"./utils/delay":21,"./utils/once":22,"./xhr":23,"xtend":24}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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

},{"./request":19}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
module.exports = window.XMLHttpRequest;

},{}],24:[function(require,module,exports){
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

},{}],25:[function(require,module,exports){
'use strict';

module.exports = {
    processRequest: function (req) {
        req.url = req.url.replace(/[^%]+/g, function (s) {
            return encodeURI(s);
        });
    }
};

},{}],26:[function(require,module,exports){
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

},{"./jsonrequest":27,"./jsonresponse":28}],27:[function(require,module,exports){
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

},{}],28:[function(require,module,exports){
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

},{}],29:[function(require,module,exports){
module.exports=require(5)
},{"./src/api.js":30}],30:[function(require,module,exports){
module.exports=require(6)
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

},{"./url.js":32,"es6-promise":3,"httpplease":18,"httpplease-promises":16,"httpplease/plugins/json":26,"tnt.api":29}],32:[function(require,module,exports){
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

    return data;
};

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
    transcript : data_transcript
};

module.exports = exports = genome_data;

},{"tnt.api":5,"tnt.board":7}],39:[function(require,module,exports){
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

},{"./layout.js":42,"tnt.api":5,"tnt.board":7}],40:[function(require,module,exports){
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

},{"./data.js":38,"./feature":39,"./layout":42,"es6-promise":3,"tnt.api":5,"tnt.board":7,"tnt.rest":15}],41:[function(require,module,exports){
var board = require("tnt.board");
board.genome = require("./genome");

module.exports = exports = board;

},{"./genome":40,"tnt.board":7}],42:[function(require,module,exports){
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

},{"tnt.api":5}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL2Zha2VfNzZiYjJjMTQuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2VzNi1wcm9taXNlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5hcGkvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmFwaS9zcmMvYXBpLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5ib2FyZC9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuYm9hcmQvc3JjL2JvYXJkLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5ib2FyZC9zcmMvZGF0YS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuYm9hcmQvc3JjL2ZlYXR1cmUuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuYm9hcmQvc3JjL2xheW91dC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuYm9hcmQvc3JjL3NwaW5uZXIuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy90cmFjay5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQucmVzdC9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQucmVzdC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS1wcm9taXNlcy9odHRwcGxlYXNlLXByb21pc2VzLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5yZXN0L25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL2xpYi9lcnJvci5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQucmVzdC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9saWIvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LnJlc3Qvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvbGliL3JlcXVlc3QuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LnJlc3Qvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvbGliL3Jlc3BvbnNlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5yZXN0L25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL2xpYi91dGlscy9kZWxheS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQucmVzdC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9saWIvdXRpbHMvb25jZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQucmVzdC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9saWIveGhyLWJyb3dzZXIuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LnJlc3Qvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2Uvbm9kZV9tb2R1bGVzL3h0ZW5kL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5yZXN0L25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL3BsdWdpbnMvY2xlYW51cmwuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LnJlc3Qvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvcGx1Z2lucy9qc29uLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5yZXN0L25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL3BsdWdpbnMvanNvbnJlcXVlc3QuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LnJlc3Qvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvcGx1Z2lucy9qc29ucmVzcG9uc2UuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LnJlc3Qvc3JjL3Jlc3QuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LnJlc3Qvc3JjL3VybC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQudXRpbHMvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LnV0aWxzL3NyYy9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQudXRpbHMvc3JjL3BuZy5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQudXRpbHMvc3JjL3JlZHVjZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQudXRpbHMvc3JjL3V0aWxzLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvc3JjL2RhdGEuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9zcmMvZmVhdHVyZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL3NyYy9nZW5vbWUuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9zcmMvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9zcmMvbGF5b3V0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNub0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hpQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeDFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM09BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImlmICh0eXBlb2YgdG50ID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSB0bnQgPSB7fTtcbn1cbnRudC5ib2FyZCA9IHJlcXVpcmUoXCIuL2luZGV4LmpzXCIpO1xudG50LnV0aWxzID0gcmVxdWlyZShcInRudC51dGlsc1wiKTtcbiIsIi8vIGlmICh0eXBlb2YgdG50ID09PSBcInVuZGVmaW5lZFwiKSB7XG4vLyAgICAgbW9kdWxlLmV4cG9ydHMgPSB0bnQgPSB7fVxuLy8gfVxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9zcmMvaW5kZXguanNcIik7XG5cbiIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwpe1xuLyohXG4gKiBAb3ZlcnZpZXcgZXM2LXByb21pc2UgLSBhIHRpbnkgaW1wbGVtZW50YXRpb24gb2YgUHJvbWlzZXMvQSsuXG4gKiBAY29weXJpZ2h0IENvcHlyaWdodCAoYykgMjAxNCBZZWh1ZGEgS2F0eiwgVG9tIERhbGUsIFN0ZWZhbiBQZW5uZXIgYW5kIGNvbnRyaWJ1dG9ycyAoQ29udmVyc2lvbiB0byBFUzYgQVBJIGJ5IEpha2UgQXJjaGliYWxkKVxuICogQGxpY2Vuc2UgICBMaWNlbnNlZCB1bmRlciBNSVQgbGljZW5zZVxuICogICAgICAgICAgICBTZWUgaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3N0ZWZhbnBlbm5lci9lczYtcHJvbWlzZS9tYXN0ZXIvTElDRU5TRVxuICogQHZlcnNpb24gICAzLjMuMVxuICovXG5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gICAgdHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCkgOlxuICAgIHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShmYWN0b3J5KSA6XG4gICAgKGdsb2JhbC5FUzZQcm9taXNlID0gZmFjdG9yeSgpKTtcbn0odGhpcywgKGZ1bmN0aW9uICgpIHsgJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBvYmplY3RPckZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nIHx8IHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiB4ICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xufVxuXG52YXIgX2lzQXJyYXkgPSB1bmRlZmluZWQ7XG5pZiAoIUFycmF5LmlzQXJyYXkpIHtcbiAgX2lzQXJyYXkgPSBmdW5jdGlvbiAoeCkge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG59IGVsc2Uge1xuICBfaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG59XG5cbnZhciBpc0FycmF5ID0gX2lzQXJyYXk7XG5cbnZhciBsZW4gPSAwO1xudmFyIHZlcnR4TmV4dCA9IHVuZGVmaW5lZDtcbnZhciBjdXN0b21TY2hlZHVsZXJGbiA9IHVuZGVmaW5lZDtcblxudmFyIGFzYXAgPSBmdW5jdGlvbiBhc2FwKGNhbGxiYWNrLCBhcmcpIHtcbiAgcXVldWVbbGVuXSA9IGNhbGxiYWNrO1xuICBxdWV1ZVtsZW4gKyAxXSA9IGFyZztcbiAgbGVuICs9IDI7XG4gIGlmIChsZW4gPT09IDIpIHtcbiAgICAvLyBJZiBsZW4gaXMgMiwgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gc2NoZWR1bGUgYW4gYXN5bmMgZmx1c2guXG4gICAgLy8gSWYgYWRkaXRpb25hbCBjYWxsYmFja3MgYXJlIHF1ZXVlZCBiZWZvcmUgdGhlIHF1ZXVlIGlzIGZsdXNoZWQsIHRoZXlcbiAgICAvLyB3aWxsIGJlIHByb2Nlc3NlZCBieSB0aGlzIGZsdXNoIHRoYXQgd2UgYXJlIHNjaGVkdWxpbmcuXG4gICAgaWYgKGN1c3RvbVNjaGVkdWxlckZuKSB7XG4gICAgICBjdXN0b21TY2hlZHVsZXJGbihmbHVzaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNjaGVkdWxlRmx1c2goKTtcbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHNldFNjaGVkdWxlcihzY2hlZHVsZUZuKSB7XG4gIGN1c3RvbVNjaGVkdWxlckZuID0gc2NoZWR1bGVGbjtcbn1cblxuZnVuY3Rpb24gc2V0QXNhcChhc2FwRm4pIHtcbiAgYXNhcCA9IGFzYXBGbjtcbn1cblxudmFyIGJyb3dzZXJXaW5kb3cgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHVuZGVmaW5lZDtcbnZhciBicm93c2VyR2xvYmFsID0gYnJvd3NlcldpbmRvdyB8fCB7fTtcbnZhciBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9IGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCBicm93c2VyR2xvYmFsLldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG52YXIgaXNOb2RlID0gdHlwZW9mIHNlbGYgPT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiAoe30pLnRvU3RyaW5nLmNhbGwocHJvY2VzcykgPT09ICdbb2JqZWN0IHByb2Nlc3NdJztcblxuLy8gdGVzdCBmb3Igd2ViIHdvcmtlciBidXQgbm90IGluIElFMTBcbnZhciBpc1dvcmtlciA9IHR5cGVvZiBVaW50OENsYW1wZWRBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGltcG9ydFNjcmlwdHMgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gJ3VuZGVmaW5lZCc7XG5cbi8vIG5vZGVcbmZ1bmN0aW9uIHVzZU5leHRUaWNrKCkge1xuICAvLyBub2RlIHZlcnNpb24gMC4xMC54IGRpc3BsYXlzIGEgZGVwcmVjYXRpb24gd2FybmluZyB3aGVuIG5leHRUaWNrIGlzIHVzZWQgcmVjdXJzaXZlbHlcbiAgLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9jdWpvanMvd2hlbi9pc3N1ZXMvNDEwIGZvciBkZXRhaWxzXG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MubmV4dFRpY2soZmx1c2gpO1xuICB9O1xufVxuXG4vLyB2ZXJ0eFxuZnVuY3Rpb24gdXNlVmVydHhUaW1lcigpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB2ZXJ0eE5leHQoZmx1c2gpO1xuICB9O1xufVxuXG5mdW5jdGlvbiB1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gIHZhciBvYnNlcnZlciA9IG5ldyBCcm93c2VyTXV0YXRpb25PYnNlcnZlcihmbHVzaCk7XG4gIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICBvYnNlcnZlci5vYnNlcnZlKG5vZGUsIHsgY2hhcmFjdGVyRGF0YTogdHJ1ZSB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIG5vZGUuZGF0YSA9IGl0ZXJhdGlvbnMgPSArK2l0ZXJhdGlvbnMgJSAyO1xuICB9O1xufVxuXG4vLyB3ZWIgd29ya2VyXG5mdW5jdGlvbiB1c2VNZXNzYWdlQ2hhbm5lbCgpIHtcbiAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmbHVzaDtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZSgwKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXNlU2V0VGltZW91dCgpIHtcbiAgLy8gU3RvcmUgc2V0VGltZW91dCByZWZlcmVuY2Ugc28gZXM2LXByb21pc2Ugd2lsbCBiZSB1bmFmZmVjdGVkIGJ5XG4gIC8vIG90aGVyIGNvZGUgbW9kaWZ5aW5nIHNldFRpbWVvdXQgKGxpa2Ugc2lub24udXNlRmFrZVRpbWVycygpKVxuICB2YXIgZ2xvYmFsU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGdsb2JhbFNldFRpbWVvdXQoZmx1c2gsIDEpO1xuICB9O1xufVxuXG52YXIgcXVldWUgPSBuZXcgQXJyYXkoMTAwMCk7XG5mdW5jdGlvbiBmbHVzaCgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgIHZhciBjYWxsYmFjayA9IHF1ZXVlW2ldO1xuICAgIHZhciBhcmcgPSBxdWV1ZVtpICsgMV07XG5cbiAgICBjYWxsYmFjayhhcmcpO1xuXG4gICAgcXVldWVbaV0gPSB1bmRlZmluZWQ7XG4gICAgcXVldWVbaSArIDFdID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgbGVuID0gMDtcbn1cblxuZnVuY3Rpb24gYXR0ZW1wdFZlcnR4KCkge1xuICB0cnkge1xuICAgIHZhciByID0gcmVxdWlyZTtcbiAgICB2YXIgdmVydHggPSByKCd2ZXJ0eCcpO1xuICAgIHZlcnR4TmV4dCA9IHZlcnR4LnJ1bk9uTG9vcCB8fCB2ZXJ0eC5ydW5PbkNvbnRleHQ7XG4gICAgcmV0dXJuIHVzZVZlcnR4VGltZXIoKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiB1c2VTZXRUaW1lb3V0KCk7XG4gIH1cbn1cblxudmFyIHNjaGVkdWxlRmx1c2ggPSB1bmRlZmluZWQ7XG4vLyBEZWNpZGUgd2hhdCBhc3luYyBtZXRob2QgdG8gdXNlIHRvIHRyaWdnZXJpbmcgcHJvY2Vzc2luZyBvZiBxdWV1ZWQgY2FsbGJhY2tzOlxuaWYgKGlzTm9kZSkge1xuICBzY2hlZHVsZUZsdXNoID0gdXNlTmV4dFRpY2soKTtcbn0gZWxzZSBpZiAoQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZU11dGF0aW9uT2JzZXJ2ZXIoKTtcbn0gZWxzZSBpZiAoaXNXb3JrZXIpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZU1lc3NhZ2VDaGFubmVsKCk7XG59IGVsc2UgaWYgKGJyb3dzZXJXaW5kb3cgPT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgcmVxdWlyZSA9PT0gJ2Z1bmN0aW9uJykge1xuICBzY2hlZHVsZUZsdXNoID0gYXR0ZW1wdFZlcnR4KCk7XG59IGVsc2Uge1xuICBzY2hlZHVsZUZsdXNoID0gdXNlU2V0VGltZW91dCgpO1xufVxuXG5mdW5jdGlvbiB0aGVuKG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gIHZhciBfYXJndW1lbnRzID0gYXJndW1lbnRzO1xuXG4gIHZhciBwYXJlbnQgPSB0aGlzO1xuXG4gIHZhciBjaGlsZCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKG5vb3ApO1xuXG4gIGlmIChjaGlsZFtQUk9NSVNFX0lEXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbWFrZVByb21pc2UoY2hpbGQpO1xuICB9XG5cbiAgdmFyIF9zdGF0ZSA9IHBhcmVudC5fc3RhdGU7XG5cbiAgaWYgKF9zdGF0ZSkge1xuICAgIChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgY2FsbGJhY2sgPSBfYXJndW1lbnRzW19zdGF0ZSAtIDFdO1xuICAgICAgYXNhcChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBpbnZva2VDYWxsYmFjayhfc3RhdGUsIGNoaWxkLCBjYWxsYmFjaywgcGFyZW50Ll9yZXN1bHQpO1xuICAgICAgfSk7XG4gICAgfSkoKTtcbiAgfSBlbHNlIHtcbiAgICBzdWJzY3JpYmUocGFyZW50LCBjaGlsZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICB9XG5cbiAgcmV0dXJuIGNoaWxkO1xufVxuXG4vKipcbiAgYFByb21pc2UucmVzb2x2ZWAgcmV0dXJucyBhIHByb21pc2UgdGhhdCB3aWxsIGJlY29tZSByZXNvbHZlZCB3aXRoIHRoZVxuICBwYXNzZWQgYHZhbHVlYC4gSXQgaXMgc2hvcnRoYW5kIGZvciB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHJlc29sdmUoMSk7XG4gIH0pO1xuXG4gIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSl7XG4gICAgLy8gdmFsdWUgPT09IDFcbiAgfSk7XG4gIGBgYFxuXG4gIEluc3RlYWQgb2Ygd3JpdGluZyB0aGUgYWJvdmUsIHlvdXIgY29kZSBub3cgc2ltcGx5IGJlY29tZXMgdGhlIGZvbGxvd2luZzpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKDEpO1xuXG4gIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSl7XG4gICAgLy8gdmFsdWUgPT09IDFcbiAgfSk7XG4gIGBgYFxuXG4gIEBtZXRob2QgcmVzb2x2ZVxuICBAc3RhdGljXG4gIEBwYXJhbSB7QW55fSB2YWx1ZSB2YWx1ZSB0aGF0IHRoZSByZXR1cm5lZCBwcm9taXNlIHdpbGwgYmUgcmVzb2x2ZWQgd2l0aFxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSB0aGF0IHdpbGwgYmVjb21lIGZ1bGZpbGxlZCB3aXRoIHRoZSBnaXZlblxuICBgdmFsdWVgXG4qL1xuZnVuY3Rpb24gcmVzb2x2ZShvYmplY3QpIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICBpZiAob2JqZWN0ICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnICYmIG9iamVjdC5jb25zdHJ1Y3RvciA9PT0gQ29uc3RydWN0b3IpIHtcbiAgICByZXR1cm4gb2JqZWN0O1xuICB9XG5cbiAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3Iobm9vcCk7XG4gIF9yZXNvbHZlKHByb21pc2UsIG9iamVjdCk7XG4gIHJldHVybiBwcm9taXNlO1xufVxuXG52YXIgUFJPTUlTRV9JRCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZygxNik7XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG52YXIgUEVORElORyA9IHZvaWQgMDtcbnZhciBGVUxGSUxMRUQgPSAxO1xudmFyIFJFSkVDVEVEID0gMjtcblxudmFyIEdFVF9USEVOX0VSUk9SID0gbmV3IEVycm9yT2JqZWN0KCk7XG5cbmZ1bmN0aW9uIHNlbGZGdWxmaWxsbWVudCgpIHtcbiAgcmV0dXJuIG5ldyBUeXBlRXJyb3IoXCJZb3UgY2Fubm90IHJlc29sdmUgYSBwcm9taXNlIHdpdGggaXRzZWxmXCIpO1xufVxuXG5mdW5jdGlvbiBjYW5ub3RSZXR1cm5Pd24oKSB7XG4gIHJldHVybiBuZXcgVHlwZUVycm9yKCdBIHByb21pc2VzIGNhbGxiYWNrIGNhbm5vdCByZXR1cm4gdGhhdCBzYW1lIHByb21pc2UuJyk7XG59XG5cbmZ1bmN0aW9uIGdldFRoZW4ocHJvbWlzZSkge1xuICB0cnkge1xuICAgIHJldHVybiBwcm9taXNlLnRoZW47XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgR0VUX1RIRU5fRVJST1IuZXJyb3IgPSBlcnJvcjtcbiAgICByZXR1cm4gR0VUX1RIRU5fRVJST1I7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJ5VGhlbih0aGVuLCB2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKSB7XG4gIHRyeSB7XG4gICAgdGhlbi5jYWxsKHZhbHVlLCBmdWxmaWxsbWVudEhhbmRsZXIsIHJlamVjdGlvbkhhbmRsZXIpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGU7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlLCB0aGVuKSB7XG4gIGFzYXAoZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICB2YXIgc2VhbGVkID0gZmFsc2U7XG4gICAgdmFyIGVycm9yID0gdHJ5VGhlbih0aGVuLCB0aGVuYWJsZSwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBpZiAoc2VhbGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICBpZiAodGhlbmFibGUgIT09IHZhbHVlKSB7XG4gICAgICAgIF9yZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgIGlmIChzZWFsZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgc2VhbGVkID0gdHJ1ZTtcblxuICAgICAgX3JlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgIH0sICdTZXR0bGU6ICcgKyAocHJvbWlzZS5fbGFiZWwgfHwgJyB1bmtub3duIHByb21pc2UnKSk7XG5cbiAgICBpZiAoIXNlYWxlZCAmJiBlcnJvcikge1xuICAgICAgc2VhbGVkID0gdHJ1ZTtcbiAgICAgIF9yZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgIH1cbiAgfSwgcHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlKSB7XG4gIGlmICh0aGVuYWJsZS5fc3RhdGUgPT09IEZVTEZJTExFRCkge1xuICAgIGZ1bGZpbGwocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gIH0gZWxzZSBpZiAodGhlbmFibGUuX3N0YXRlID09PSBSRUpFQ1RFRCkge1xuICAgIF9yZWplY3QocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gIH0gZWxzZSB7XG4gICAgc3Vic2NyaWJlKHRoZW5hYmxlLCB1bmRlZmluZWQsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIF9yZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICByZXR1cm4gX3JlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSwgdGhlbiQkKSB7XG4gIGlmIChtYXliZVRoZW5hYmxlLmNvbnN0cnVjdG9yID09PSBwcm9taXNlLmNvbnN0cnVjdG9yICYmIHRoZW4kJCA9PT0gdGhlbiAmJiBtYXliZVRoZW5hYmxlLmNvbnN0cnVjdG9yLnJlc29sdmUgPT09IHJlc29sdmUpIHtcbiAgICBoYW5kbGVPd25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAodGhlbiQkID09PSBHRVRfVEhFTl9FUlJPUikge1xuICAgICAgX3JlamVjdChwcm9taXNlLCBHRVRfVEhFTl9FUlJPUi5lcnJvcik7XG4gICAgfSBlbHNlIGlmICh0aGVuJCQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb24odGhlbiQkKSkge1xuICAgICAgaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUsIHRoZW4kJCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZ1bGZpbGwocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIF9yZXNvbHZlKHByb21pc2UsIHZhbHVlKSB7XG4gIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgIF9yZWplY3QocHJvbWlzZSwgc2VsZkZ1bGZpbGxtZW50KCkpO1xuICB9IGVsc2UgaWYgKG9iamVjdE9yRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSwgZ2V0VGhlbih2YWx1ZSkpO1xuICB9IGVsc2Uge1xuICAgIGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHB1Ymxpc2hSZWplY3Rpb24ocHJvbWlzZSkge1xuICBpZiAocHJvbWlzZS5fb25lcnJvcikge1xuICAgIHByb21pc2UuX29uZXJyb3IocHJvbWlzZS5fcmVzdWx0KTtcbiAgfVxuXG4gIHB1Ymxpc2gocHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpIHtcbiAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBQRU5ESU5HKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgcHJvbWlzZS5fcmVzdWx0ID0gdmFsdWU7XG4gIHByb21pc2UuX3N0YXRlID0gRlVMRklMTEVEO1xuXG4gIGlmIChwcm9taXNlLl9zdWJzY3JpYmVycy5sZW5ndGggIT09IDApIHtcbiAgICBhc2FwKHB1Ymxpc2gsIHByb21pc2UpO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9yZWplY3QocHJvbWlzZSwgcmVhc29uKSB7XG4gIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gUEVORElORykge1xuICAgIHJldHVybjtcbiAgfVxuICBwcm9taXNlLl9zdGF0ZSA9IFJFSkVDVEVEO1xuICBwcm9taXNlLl9yZXN1bHQgPSByZWFzb247XG5cbiAgYXNhcChwdWJsaXNoUmVqZWN0aW9uLCBwcm9taXNlKTtcbn1cblxuZnVuY3Rpb24gc3Vic2NyaWJlKHBhcmVudCwgY2hpbGQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gIHZhciBfc3Vic2NyaWJlcnMgPSBwYXJlbnQuX3N1YnNjcmliZXJzO1xuICB2YXIgbGVuZ3RoID0gX3N1YnNjcmliZXJzLmxlbmd0aDtcblxuICBwYXJlbnQuX29uZXJyb3IgPSBudWxsO1xuXG4gIF9zdWJzY3JpYmVyc1tsZW5ndGhdID0gY2hpbGQ7XG4gIF9zdWJzY3JpYmVyc1tsZW5ndGggKyBGVUxGSUxMRURdID0gb25GdWxmaWxsbWVudDtcbiAgX3N1YnNjcmliZXJzW2xlbmd0aCArIFJFSkVDVEVEXSA9IG9uUmVqZWN0aW9uO1xuXG4gIGlmIChsZW5ndGggPT09IDAgJiYgcGFyZW50Ll9zdGF0ZSkge1xuICAgIGFzYXAocHVibGlzaCwgcGFyZW50KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwdWJsaXNoKHByb21pc2UpIHtcbiAgdmFyIHN1YnNjcmliZXJzID0gcHJvbWlzZS5fc3Vic2NyaWJlcnM7XG4gIHZhciBzZXR0bGVkID0gcHJvbWlzZS5fc3RhdGU7XG5cbiAgaWYgKHN1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBjaGlsZCA9IHVuZGVmaW5lZCxcbiAgICAgIGNhbGxiYWNrID0gdW5kZWZpbmVkLFxuICAgICAgZGV0YWlsID0gcHJvbWlzZS5fcmVzdWx0O1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic2NyaWJlcnMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICBjaGlsZCA9IHN1YnNjcmliZXJzW2ldO1xuICAgIGNhbGxiYWNrID0gc3Vic2NyaWJlcnNbaSArIHNldHRsZWRdO1xuXG4gICAgaWYgKGNoaWxkKSB7XG4gICAgICBpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBjaGlsZCwgY2FsbGJhY2ssIGRldGFpbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgfVxuICB9XG5cbiAgcHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoID0gMDtcbn1cblxuZnVuY3Rpb24gRXJyb3JPYmplY3QoKSB7XG4gIHRoaXMuZXJyb3IgPSBudWxsO1xufVxuXG52YXIgVFJZX0NBVENIX0VSUk9SID0gbmV3IEVycm9yT2JqZWN0KCk7XG5cbmZ1bmN0aW9uIHRyeUNhdGNoKGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gY2FsbGJhY2soZGV0YWlsKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIFRSWV9DQVRDSF9FUlJPUi5lcnJvciA9IGU7XG4gICAgcmV0dXJuIFRSWV9DQVRDSF9FUlJPUjtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBwcm9taXNlLCBjYWxsYmFjaywgZGV0YWlsKSB7XG4gIHZhciBoYXNDYWxsYmFjayA9IGlzRnVuY3Rpb24oY2FsbGJhY2spLFxuICAgICAgdmFsdWUgPSB1bmRlZmluZWQsXG4gICAgICBlcnJvciA9IHVuZGVmaW5lZCxcbiAgICAgIHN1Y2NlZWRlZCA9IHVuZGVmaW5lZCxcbiAgICAgIGZhaWxlZCA9IHVuZGVmaW5lZDtcblxuICBpZiAoaGFzQ2FsbGJhY2spIHtcbiAgICB2YWx1ZSA9IHRyeUNhdGNoKGNhbGxiYWNrLCBkZXRhaWwpO1xuXG4gICAgaWYgKHZhbHVlID09PSBUUllfQ0FUQ0hfRVJST1IpIHtcbiAgICAgIGZhaWxlZCA9IHRydWU7XG4gICAgICBlcnJvciA9IHZhbHVlLmVycm9yO1xuICAgICAgdmFsdWUgPSBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgICAgX3JlamVjdChwcm9taXNlLCBjYW5ub3RSZXR1cm5Pd24oKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhbHVlID0gZGV0YWlsO1xuICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gIH1cblxuICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IFBFTkRJTkcpIHtcbiAgICAvLyBub29wXG4gIH0gZWxzZSBpZiAoaGFzQ2FsbGJhY2sgJiYgc3VjY2VlZGVkKSB7XG4gICAgICBfcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgfSBlbHNlIGlmIChmYWlsZWQpIHtcbiAgICAgIF9yZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gRlVMRklMTEVEKSB7XG4gICAgICBmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgICB9IGVsc2UgaWYgKHNldHRsZWQgPT09IFJFSkVDVEVEKSB7XG4gICAgICBfcmVqZWN0KHByb21pc2UsIHZhbHVlKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGluaXRpYWxpemVQcm9taXNlKHByb21pc2UsIHJlc29sdmVyKSB7XG4gIHRyeSB7XG4gICAgcmVzb2x2ZXIoZnVuY3Rpb24gcmVzb2x2ZVByb21pc2UodmFsdWUpIHtcbiAgICAgIF9yZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICB9LCBmdW5jdGlvbiByZWplY3RQcm9taXNlKHJlYXNvbikge1xuICAgICAgX3JlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgX3JlamVjdChwcm9taXNlLCBlKTtcbiAgfVxufVxuXG52YXIgaWQgPSAwO1xuZnVuY3Rpb24gbmV4dElkKCkge1xuICByZXR1cm4gaWQrKztcbn1cblxuZnVuY3Rpb24gbWFrZVByb21pc2UocHJvbWlzZSkge1xuICBwcm9taXNlW1BST01JU0VfSURdID0gaWQrKztcbiAgcHJvbWlzZS5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gIHByb21pc2UuX3Jlc3VsdCA9IHVuZGVmaW5lZDtcbiAgcHJvbWlzZS5fc3Vic2NyaWJlcnMgPSBbXTtcbn1cblxuZnVuY3Rpb24gRW51bWVyYXRvcihDb25zdHJ1Y3RvciwgaW5wdXQpIHtcbiAgdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuICB0aGlzLnByb21pc2UgPSBuZXcgQ29uc3RydWN0b3Iobm9vcCk7XG5cbiAgaWYgKCF0aGlzLnByb21pc2VbUFJPTUlTRV9JRF0pIHtcbiAgICBtYWtlUHJvbWlzZSh0aGlzLnByb21pc2UpO1xuICB9XG5cbiAgaWYgKGlzQXJyYXkoaW5wdXQpKSB7XG4gICAgdGhpcy5faW5wdXQgPSBpbnB1dDtcbiAgICB0aGlzLmxlbmd0aCA9IGlucHV0Lmxlbmd0aDtcbiAgICB0aGlzLl9yZW1haW5pbmcgPSBpbnB1dC5sZW5ndGg7XG5cbiAgICB0aGlzLl9yZXN1bHQgPSBuZXcgQXJyYXkodGhpcy5sZW5ndGgpO1xuXG4gICAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XG4gICAgICBmdWxmaWxsKHRoaXMucHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5sZW5ndGggPSB0aGlzLmxlbmd0aCB8fCAwO1xuICAgICAgdGhpcy5fZW51bWVyYXRlKCk7XG4gICAgICBpZiAodGhpcy5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgIGZ1bGZpbGwodGhpcy5wcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBfcmVqZWN0KHRoaXMucHJvbWlzZSwgdmFsaWRhdGlvbkVycm9yKCkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRpb25FcnJvcigpIHtcbiAgcmV0dXJuIG5ldyBFcnJvcignQXJyYXkgTWV0aG9kcyBtdXN0IGJlIHByb3ZpZGVkIGFuIEFycmF5Jyk7XG59O1xuXG5FbnVtZXJhdG9yLnByb3RvdHlwZS5fZW51bWVyYXRlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGg7XG4gIHZhciBfaW5wdXQgPSB0aGlzLl9pbnB1dDtcblxuICBmb3IgKHZhciBpID0gMDsgdGhpcy5fc3RhdGUgPT09IFBFTkRJTkcgJiYgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5fZWFjaEVudHJ5KF9pbnB1dFtpXSwgaSk7XG4gIH1cbn07XG5cbkVudW1lcmF0b3IucHJvdG90eXBlLl9lYWNoRW50cnkgPSBmdW5jdGlvbiAoZW50cnksIGkpIHtcbiAgdmFyIGMgPSB0aGlzLl9pbnN0YW5jZUNvbnN0cnVjdG9yO1xuICB2YXIgcmVzb2x2ZSQkID0gYy5yZXNvbHZlO1xuXG4gIGlmIChyZXNvbHZlJCQgPT09IHJlc29sdmUpIHtcbiAgICB2YXIgX3RoZW4gPSBnZXRUaGVuKGVudHJ5KTtcblxuICAgIGlmIChfdGhlbiA9PT0gdGhlbiAmJiBlbnRyeS5fc3RhdGUgIT09IFBFTkRJTkcpIHtcbiAgICAgIHRoaXMuX3NldHRsZWRBdChlbnRyeS5fc3RhdGUsIGksIGVudHJ5Ll9yZXN1bHQpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIF90aGVuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl9yZW1haW5pbmctLTtcbiAgICAgIHRoaXMuX3Jlc3VsdFtpXSA9IGVudHJ5O1xuICAgIH0gZWxzZSBpZiAoYyA9PT0gUHJvbWlzZSkge1xuICAgICAgdmFyIHByb21pc2UgPSBuZXcgYyhub29wKTtcbiAgICAgIGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgZW50cnksIF90aGVuKTtcbiAgICAgIHRoaXMuX3dpbGxTZXR0bGVBdChwcm9taXNlLCBpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KG5ldyBjKGZ1bmN0aW9uIChyZXNvbHZlJCQpIHtcbiAgICAgICAgcmV0dXJuIHJlc29sdmUkJChlbnRyeSk7XG4gICAgICB9KSwgaSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRoaXMuX3dpbGxTZXR0bGVBdChyZXNvbHZlJCQoZW50cnkpLCBpKTtcbiAgfVxufTtcblxuRW51bWVyYXRvci5wcm90b3R5cGUuX3NldHRsZWRBdCA9IGZ1bmN0aW9uIChzdGF0ZSwgaSwgdmFsdWUpIHtcbiAgdmFyIHByb21pc2UgPSB0aGlzLnByb21pc2U7XG5cbiAgaWYgKHByb21pc2UuX3N0YXRlID09PSBQRU5ESU5HKSB7XG4gICAgdGhpcy5fcmVtYWluaW5nLS07XG5cbiAgICBpZiAoc3RhdGUgPT09IFJFSkVDVEVEKSB7XG4gICAgICBfcmVqZWN0KHByb21pc2UsIHZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fcmVzdWx0W2ldID0gdmFsdWU7XG4gICAgfVxuICB9XG5cbiAgaWYgKHRoaXMuX3JlbWFpbmluZyA9PT0gMCkge1xuICAgIGZ1bGZpbGwocHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgfVxufTtcblxuRW51bWVyYXRvci5wcm90b3R5cGUuX3dpbGxTZXR0bGVBdCA9IGZ1bmN0aW9uIChwcm9taXNlLCBpKSB7XG4gIHZhciBlbnVtZXJhdG9yID0gdGhpcztcblxuICBzdWJzY3JpYmUocHJvbWlzZSwgdW5kZWZpbmVkLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICByZXR1cm4gZW51bWVyYXRvci5fc2V0dGxlZEF0KEZVTEZJTExFRCwgaSwgdmFsdWUpO1xuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgcmV0dXJuIGVudW1lcmF0b3IuX3NldHRsZWRBdChSRUpFQ1RFRCwgaSwgcmVhc29uKTtcbiAgfSk7XG59O1xuXG4vKipcbiAgYFByb21pc2UuYWxsYCBhY2NlcHRzIGFuIGFycmF5IG9mIHByb21pc2VzLCBhbmQgcmV0dXJucyBhIG5ldyBwcm9taXNlIHdoaWNoXG4gIGlzIGZ1bGZpbGxlZCB3aXRoIGFuIGFycmF5IG9mIGZ1bGZpbGxtZW50IHZhbHVlcyBmb3IgdGhlIHBhc3NlZCBwcm9taXNlcywgb3JcbiAgcmVqZWN0ZWQgd2l0aCB0aGUgcmVhc29uIG9mIHRoZSBmaXJzdCBwYXNzZWQgcHJvbWlzZSB0byBiZSByZWplY3RlZC4gSXQgY2FzdHMgYWxsXG4gIGVsZW1lbnRzIG9mIHRoZSBwYXNzZWQgaXRlcmFibGUgdG8gcHJvbWlzZXMgYXMgaXQgcnVucyB0aGlzIGFsZ29yaXRobS5cblxuICBFeGFtcGxlOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UxID0gcmVzb2x2ZSgxKTtcbiAgbGV0IHByb21pc2UyID0gcmVzb2x2ZSgyKTtcbiAgbGV0IHByb21pc2UzID0gcmVzb2x2ZSgzKTtcbiAgbGV0IHByb21pc2VzID0gWyBwcm9taXNlMSwgcHJvbWlzZTIsIHByb21pc2UzIF07XG5cbiAgUHJvbWlzZS5hbGwocHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24oYXJyYXkpe1xuICAgIC8vIFRoZSBhcnJheSBoZXJlIHdvdWxkIGJlIFsgMSwgMiwgMyBdO1xuICB9KTtcbiAgYGBgXG5cbiAgSWYgYW55IG9mIHRoZSBgcHJvbWlzZXNgIGdpdmVuIHRvIGBhbGxgIGFyZSByZWplY3RlZCwgdGhlIGZpcnN0IHByb21pc2VcbiAgdGhhdCBpcyByZWplY3RlZCB3aWxsIGJlIGdpdmVuIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSByZXR1cm5lZCBwcm9taXNlcydzXG4gIHJlamVjdGlvbiBoYW5kbGVyLiBGb3IgZXhhbXBsZTpcblxuICBFeGFtcGxlOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UxID0gcmVzb2x2ZSgxKTtcbiAgbGV0IHByb21pc2UyID0gcmVqZWN0KG5ldyBFcnJvcihcIjJcIikpO1xuICBsZXQgcHJvbWlzZTMgPSByZWplY3QobmV3IEVycm9yKFwiM1wiKSk7XG4gIGxldCBwcm9taXNlcyA9IFsgcHJvbWlzZTEsIHByb21pc2UyLCBwcm9taXNlMyBdO1xuXG4gIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uKGFycmF5KXtcbiAgICAvLyBDb2RlIGhlcmUgbmV2ZXIgcnVucyBiZWNhdXNlIHRoZXJlIGFyZSByZWplY3RlZCBwcm9taXNlcyFcbiAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAvLyBlcnJvci5tZXNzYWdlID09PSBcIjJcIlxuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCBhbGxcbiAgQHN0YXRpY1xuICBAcGFyYW0ge0FycmF5fSBlbnRyaWVzIGFycmF5IG9mIHByb21pc2VzXG4gIEBwYXJhbSB7U3RyaW5nfSBsYWJlbCBvcHRpb25hbCBzdHJpbmcgZm9yIGxhYmVsaW5nIHRoZSBwcm9taXNlLlxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2hlbiBhbGwgYHByb21pc2VzYCBoYXZlIGJlZW5cbiAgZnVsZmlsbGVkLCBvciByZWplY3RlZCBpZiBhbnkgb2YgdGhlbSBiZWNvbWUgcmVqZWN0ZWQuXG4gIEBzdGF0aWNcbiovXG5mdW5jdGlvbiBhbGwoZW50cmllcykge1xuICByZXR1cm4gbmV3IEVudW1lcmF0b3IodGhpcywgZW50cmllcykucHJvbWlzZTtcbn1cblxuLyoqXG4gIGBQcm9taXNlLnJhY2VgIHJldHVybnMgYSBuZXcgcHJvbWlzZSB3aGljaCBpcyBzZXR0bGVkIGluIHRoZSBzYW1lIHdheSBhcyB0aGVcbiAgZmlyc3QgcGFzc2VkIHByb21pc2UgdG8gc2V0dGxlLlxuXG4gIEV4YW1wbGU6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZTEgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoJ3Byb21pc2UgMScpO1xuICAgIH0sIDIwMCk7XG4gIH0pO1xuXG4gIGxldCBwcm9taXNlMiA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmVzb2x2ZSgncHJvbWlzZSAyJyk7XG4gICAgfSwgMTAwKTtcbiAgfSk7XG5cbiAgUHJvbWlzZS5yYWNlKFtwcm9taXNlMSwgcHJvbWlzZTJdKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgLy8gcmVzdWx0ID09PSAncHJvbWlzZSAyJyBiZWNhdXNlIGl0IHdhcyByZXNvbHZlZCBiZWZvcmUgcHJvbWlzZTFcbiAgICAvLyB3YXMgcmVzb2x2ZWQuXG4gIH0pO1xuICBgYGBcblxuICBgUHJvbWlzZS5yYWNlYCBpcyBkZXRlcm1pbmlzdGljIGluIHRoYXQgb25seSB0aGUgc3RhdGUgb2YgdGhlIGZpcnN0XG4gIHNldHRsZWQgcHJvbWlzZSBtYXR0ZXJzLiBGb3IgZXhhbXBsZSwgZXZlbiBpZiBvdGhlciBwcm9taXNlcyBnaXZlbiB0byB0aGVcbiAgYHByb21pc2VzYCBhcnJheSBhcmd1bWVudCBhcmUgcmVzb2x2ZWQsIGJ1dCB0aGUgZmlyc3Qgc2V0dGxlZCBwcm9taXNlIGhhc1xuICBiZWNvbWUgcmVqZWN0ZWQgYmVmb3JlIHRoZSBvdGhlciBwcm9taXNlcyBiZWNhbWUgZnVsZmlsbGVkLCB0aGUgcmV0dXJuZWRcbiAgcHJvbWlzZSB3aWxsIGJlY29tZSByZWplY3RlZDpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlMSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmVzb2x2ZSgncHJvbWlzZSAxJyk7XG4gICAgfSwgMjAwKTtcbiAgfSk7XG5cbiAgbGV0IHByb21pc2UyID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZWplY3QobmV3IEVycm9yKCdwcm9taXNlIDInKSk7XG4gICAgfSwgMTAwKTtcbiAgfSk7XG5cbiAgUHJvbWlzZS5yYWNlKFtwcm9taXNlMSwgcHJvbWlzZTJdKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgLy8gQ29kZSBoZXJlIG5ldmVyIHJ1bnNcbiAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyByZWFzb24ubWVzc2FnZSA9PT0gJ3Byb21pc2UgMicgYmVjYXVzZSBwcm9taXNlIDIgYmVjYW1lIHJlamVjdGVkIGJlZm9yZVxuICAgIC8vIHByb21pc2UgMSBiZWNhbWUgZnVsZmlsbGVkXG4gIH0pO1xuICBgYGBcblxuICBBbiBleGFtcGxlIHJlYWwtd29ybGQgdXNlIGNhc2UgaXMgaW1wbGVtZW50aW5nIHRpbWVvdXRzOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgUHJvbWlzZS5yYWNlKFthamF4KCdmb28uanNvbicpLCB0aW1lb3V0KDUwMDApXSlcbiAgYGBgXG5cbiAgQG1ldGhvZCByYWNlXG4gIEBzdGF0aWNcbiAgQHBhcmFtIHtBcnJheX0gcHJvbWlzZXMgYXJyYXkgb2YgcHJvbWlzZXMgdG8gb2JzZXJ2ZVxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSB3aGljaCBzZXR0bGVzIGluIHRoZSBzYW1lIHdheSBhcyB0aGUgZmlyc3QgcGFzc2VkXG4gIHByb21pc2UgdG8gc2V0dGxlLlxuKi9cbmZ1bmN0aW9uIHJhY2UoZW50cmllcykge1xuICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuXG4gIGlmICghaXNBcnJheShlbnRyaWVzKSkge1xuICAgIHJldHVybiBuZXcgQ29uc3RydWN0b3IoZnVuY3Rpb24gKF8sIHJlamVjdCkge1xuICAgICAgcmV0dXJuIHJlamVjdChuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGFuIGFycmF5IHRvIHJhY2UuJykpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgQ29uc3RydWN0b3IoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIGxlbmd0aCA9IGVudHJpZXMubGVuZ3RoO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBDb25zdHJ1Y3Rvci5yZXNvbHZlKGVudHJpZXNbaV0pLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAgYFByb21pc2UucmVqZWN0YCByZXR1cm5zIGEgcHJvbWlzZSByZWplY3RlZCB3aXRoIHRoZSBwYXNzZWQgYHJlYXNvbmAuXG4gIEl0IGlzIHNob3J0aGFuZCBmb3IgdGhlIGZvbGxvd2luZzpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICByZWplY3QobmV3IEVycm9yKCdXSE9PUFMnKSk7XG4gIH0pO1xuXG4gIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSl7XG4gICAgLy8gQ29kZSBoZXJlIGRvZXNuJ3QgcnVuIGJlY2F1c2UgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQhXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gcmVhc29uLm1lc3NhZ2UgPT09ICdXSE9PUFMnXG4gIH0pO1xuICBgYGBcblxuICBJbnN0ZWFkIG9mIHdyaXRpbmcgdGhlIGFib3ZlLCB5b3VyIGNvZGUgbm93IHNpbXBseSBiZWNvbWVzIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZSA9IFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignV0hPT1BTJykpO1xuXG4gIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSl7XG4gICAgLy8gQ29kZSBoZXJlIGRvZXNuJ3QgcnVuIGJlY2F1c2UgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQhXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gcmVhc29uLm1lc3NhZ2UgPT09ICdXSE9PUFMnXG4gIH0pO1xuICBgYGBcblxuICBAbWV0aG9kIHJlamVjdFxuICBAc3RhdGljXG4gIEBwYXJhbSB7QW55fSByZWFzb24gdmFsdWUgdGhhdCB0aGUgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIGJlIHJlamVjdGVkIHdpdGguXG4gIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHJlamVjdGVkIHdpdGggdGhlIGdpdmVuIGByZWFzb25gLlxuKi9cbmZ1bmN0aW9uIHJlamVjdChyZWFzb24pIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcbiAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3Iobm9vcCk7XG4gIF9yZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgcmV0dXJuIHByb21pc2U7XG59XG5cbmZ1bmN0aW9uIG5lZWRzUmVzb2x2ZXIoKSB7XG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYSByZXNvbHZlciBmdW5jdGlvbiBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIHByb21pc2UgY29uc3RydWN0b3InKTtcbn1cblxuZnVuY3Rpb24gbmVlZHNOZXcoKSB7XG4gIHRocm93IG5ldyBUeXBlRXJyb3IoXCJGYWlsZWQgdG8gY29uc3RydWN0ICdQcm9taXNlJzogUGxlYXNlIHVzZSB0aGUgJ25ldycgb3BlcmF0b3IsIHRoaXMgb2JqZWN0IGNvbnN0cnVjdG9yIGNhbm5vdCBiZSBjYWxsZWQgYXMgYSBmdW5jdGlvbi5cIik7XG59XG5cbi8qKlxuICBQcm9taXNlIG9iamVjdHMgcmVwcmVzZW50IHRoZSBldmVudHVhbCByZXN1bHQgb2YgYW4gYXN5bmNocm9ub3VzIG9wZXJhdGlvbi4gVGhlXG4gIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsIHdoaWNoXG4gIHJlZ2lzdGVycyBjYWxsYmFja3MgdG8gcmVjZWl2ZSBlaXRoZXIgYSBwcm9taXNlJ3MgZXZlbnR1YWwgdmFsdWUgb3IgdGhlIHJlYXNvblxuICB3aHkgdGhlIHByb21pc2UgY2Fubm90IGJlIGZ1bGZpbGxlZC5cblxuICBUZXJtaW5vbG9neVxuICAtLS0tLS0tLS0tLVxuXG4gIC0gYHByb21pc2VgIGlzIGFuIG9iamVjdCBvciBmdW5jdGlvbiB3aXRoIGEgYHRoZW5gIG1ldGhvZCB3aG9zZSBiZWhhdmlvciBjb25mb3JtcyB0byB0aGlzIHNwZWNpZmljYXRpb24uXG4gIC0gYHRoZW5hYmxlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gdGhhdCBkZWZpbmVzIGEgYHRoZW5gIG1ldGhvZC5cbiAgLSBgdmFsdWVgIGlzIGFueSBsZWdhbCBKYXZhU2NyaXB0IHZhbHVlIChpbmNsdWRpbmcgdW5kZWZpbmVkLCBhIHRoZW5hYmxlLCBvciBhIHByb21pc2UpLlxuICAtIGBleGNlcHRpb25gIGlzIGEgdmFsdWUgdGhhdCBpcyB0aHJvd24gdXNpbmcgdGhlIHRocm93IHN0YXRlbWVudC5cbiAgLSBgcmVhc29uYCBpcyBhIHZhbHVlIHRoYXQgaW5kaWNhdGVzIHdoeSBhIHByb21pc2Ugd2FzIHJlamVjdGVkLlxuICAtIGBzZXR0bGVkYCB0aGUgZmluYWwgcmVzdGluZyBzdGF0ZSBvZiBhIHByb21pc2UsIGZ1bGZpbGxlZCBvciByZWplY3RlZC5cblxuICBBIHByb21pc2UgY2FuIGJlIGluIG9uZSBvZiB0aHJlZSBzdGF0ZXM6IHBlbmRpbmcsIGZ1bGZpbGxlZCwgb3IgcmVqZWN0ZWQuXG5cbiAgUHJvbWlzZXMgdGhhdCBhcmUgZnVsZmlsbGVkIGhhdmUgYSBmdWxmaWxsbWVudCB2YWx1ZSBhbmQgYXJlIGluIHRoZSBmdWxmaWxsZWRcbiAgc3RhdGUuICBQcm9taXNlcyB0aGF0IGFyZSByZWplY3RlZCBoYXZlIGEgcmVqZWN0aW9uIHJlYXNvbiBhbmQgYXJlIGluIHRoZVxuICByZWplY3RlZCBzdGF0ZS4gIEEgZnVsZmlsbG1lbnQgdmFsdWUgaXMgbmV2ZXIgYSB0aGVuYWJsZS5cblxuICBQcm9taXNlcyBjYW4gYWxzbyBiZSBzYWlkIHRvICpyZXNvbHZlKiBhIHZhbHVlLiAgSWYgdGhpcyB2YWx1ZSBpcyBhbHNvIGFcbiAgcHJvbWlzZSwgdGhlbiB0aGUgb3JpZ2luYWwgcHJvbWlzZSdzIHNldHRsZWQgc3RhdGUgd2lsbCBtYXRjaCB0aGUgdmFsdWUnc1xuICBzZXR0bGVkIHN0YXRlLiAgU28gYSBwcm9taXNlIHRoYXQgKnJlc29sdmVzKiBhIHByb21pc2UgdGhhdCByZWplY3RzIHdpbGxcbiAgaXRzZWxmIHJlamVjdCwgYW5kIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgZnVsZmlsbHMgd2lsbFxuICBpdHNlbGYgZnVsZmlsbC5cblxuXG4gIEJhc2ljIFVzYWdlOlxuICAtLS0tLS0tLS0tLS1cblxuICBgYGBqc1xuICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgIC8vIG9uIHN1Y2Nlc3NcbiAgICByZXNvbHZlKHZhbHVlKTtcblxuICAgIC8vIG9uIGZhaWx1cmVcbiAgICByZWplY3QocmVhc29uKTtcbiAgfSk7XG5cbiAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgLy8gb24gZnVsZmlsbG1lbnRcbiAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgLy8gb24gcmVqZWN0aW9uXG4gIH0pO1xuICBgYGBcblxuICBBZHZhbmNlZCBVc2FnZTpcbiAgLS0tLS0tLS0tLS0tLS0tXG5cbiAgUHJvbWlzZXMgc2hpbmUgd2hlbiBhYnN0cmFjdGluZyBhd2F5IGFzeW5jaHJvbm91cyBpbnRlcmFjdGlvbnMgc3VjaCBhc1xuICBgWE1MSHR0cFJlcXVlc3Rgcy5cblxuICBgYGBqc1xuICBmdW5jdGlvbiBnZXRKU09OKHVybCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgICAgbGV0IHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICB4aHIub3BlbignR0VUJywgdXJsKTtcbiAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBoYW5kbGVyO1xuICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdqc29uJztcbiAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgeGhyLnNlbmQoKTtcblxuICAgICAgZnVuY3Rpb24gaGFuZGxlcigpIHtcbiAgICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PT0gdGhpcy5ET05FKSB7XG4gICAgICAgICAgaWYgKHRoaXMuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgIHJlc29sdmUodGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ2dldEpTT046IGAnICsgdXJsICsgJ2AgZmFpbGVkIHdpdGggc3RhdHVzOiBbJyArIHRoaXMuc3RhdHVzICsgJ10nKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0SlNPTignL3Bvc3RzLmpzb24nKS50aGVuKGZ1bmN0aW9uKGpzb24pIHtcbiAgICAvLyBvbiBmdWxmaWxsbWVudFxuICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAvLyBvbiByZWplY3Rpb25cbiAgfSk7XG4gIGBgYFxuXG4gIFVubGlrZSBjYWxsYmFja3MsIHByb21pc2VzIGFyZSBncmVhdCBjb21wb3NhYmxlIHByaW1pdGl2ZXMuXG5cbiAgYGBganNcbiAgUHJvbWlzZS5hbGwoW1xuICAgIGdldEpTT04oJy9wb3N0cycpLFxuICAgIGdldEpTT04oJy9jb21tZW50cycpXG4gIF0pLnRoZW4oZnVuY3Rpb24odmFsdWVzKXtcbiAgICB2YWx1ZXNbMF0gLy8gPT4gcG9zdHNKU09OXG4gICAgdmFsdWVzWzFdIC8vID0+IGNvbW1lbnRzSlNPTlxuXG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfSk7XG4gIGBgYFxuXG4gIEBjbGFzcyBQcm9taXNlXG4gIEBwYXJhbSB7ZnVuY3Rpb259IHJlc29sdmVyXG4gIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgQGNvbnN0cnVjdG9yXG4qL1xuZnVuY3Rpb24gUHJvbWlzZShyZXNvbHZlcikge1xuICB0aGlzW1BST01JU0VfSURdID0gbmV4dElkKCk7XG4gIHRoaXMuX3Jlc3VsdCA9IHRoaXMuX3N0YXRlID0gdW5kZWZpbmVkO1xuICB0aGlzLl9zdWJzY3JpYmVycyA9IFtdO1xuXG4gIGlmIChub29wICE9PSByZXNvbHZlcikge1xuICAgIHR5cGVvZiByZXNvbHZlciAhPT0gJ2Z1bmN0aW9uJyAmJiBuZWVkc1Jlc29sdmVyKCk7XG4gICAgdGhpcyBpbnN0YW5jZW9mIFByb21pc2UgPyBpbml0aWFsaXplUHJvbWlzZSh0aGlzLCByZXNvbHZlcikgOiBuZWVkc05ldygpO1xuICB9XG59XG5cblByb21pc2UuYWxsID0gYWxsO1xuUHJvbWlzZS5yYWNlID0gcmFjZTtcblByb21pc2UucmVzb2x2ZSA9IHJlc29sdmU7XG5Qcm9taXNlLnJlamVjdCA9IHJlamVjdDtcblByb21pc2UuX3NldFNjaGVkdWxlciA9IHNldFNjaGVkdWxlcjtcblByb21pc2UuX3NldEFzYXAgPSBzZXRBc2FwO1xuUHJvbWlzZS5fYXNhcCA9IGFzYXA7XG5cblByb21pc2UucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogUHJvbWlzZSxcblxuICAvKipcbiAgICBUaGUgcHJpbWFyeSB3YXkgb2YgaW50ZXJhY3Rpbmcgd2l0aCBhIHByb21pc2UgaXMgdGhyb3VnaCBpdHMgYHRoZW5gIG1ldGhvZCxcbiAgICB3aGljaCByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZSdzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZVxuICAgIHJlYXNvbiB3aHkgdGhlIHByb21pc2UgY2Fubm90IGJlIGZ1bGZpbGxlZC5cbiAgXG4gICAgYGBganNcbiAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgICAvLyB1c2VyIGlzIGF2YWlsYWJsZVxuICAgIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAvLyB1c2VyIGlzIHVuYXZhaWxhYmxlLCBhbmQgeW91IGFyZSBnaXZlbiB0aGUgcmVhc29uIHdoeVxuICAgIH0pO1xuICAgIGBgYFxuICBcbiAgICBDaGFpbmluZ1xuICAgIC0tLS0tLS0tXG4gIFxuICAgIFRoZSByZXR1cm4gdmFsdWUgb2YgYHRoZW5gIGlzIGl0c2VsZiBhIHByb21pc2UuICBUaGlzIHNlY29uZCwgJ2Rvd25zdHJlYW0nXG4gICAgcHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZpcnN0IHByb21pc2UncyBmdWxmaWxsbWVudFxuICAgIG9yIHJlamVjdGlvbiBoYW5kbGVyLCBvciByZWplY3RlZCBpZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLlxuICBcbiAgICBgYGBqc1xuICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgcmV0dXJuIHVzZXIubmFtZTtcbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICByZXR1cm4gJ2RlZmF1bHQgbmFtZSc7XG4gICAgfSkudGhlbihmdW5jdGlvbiAodXNlck5hbWUpIHtcbiAgICAgIC8vIElmIGBmaW5kVXNlcmAgZnVsZmlsbGVkLCBgdXNlck5hbWVgIHdpbGwgYmUgdGhlIHVzZXIncyBuYW1lLCBvdGhlcndpc2UgaXRcbiAgICAgIC8vIHdpbGwgYmUgYCdkZWZhdWx0IG5hbWUnYFxuICAgIH0pO1xuICBcbiAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRm91bmQgdXNlciwgYnV0IHN0aWxsIHVuaGFwcHknKTtcbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2BmaW5kVXNlcmAgcmVqZWN0ZWQgYW5kIHdlJ3JlIHVuaGFwcHknKTtcbiAgICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgIC8vIGlmIGBmaW5kVXNlcmAgZnVsZmlsbGVkLCBgcmVhc29uYCB3aWxsIGJlICdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScuXG4gICAgICAvLyBJZiBgZmluZFVzZXJgIHJlamVjdGVkLCBgcmVhc29uYCB3aWxsIGJlICdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jy5cbiAgICB9KTtcbiAgICBgYGBcbiAgICBJZiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIGRvZXMgbm90IHNwZWNpZnkgYSByZWplY3Rpb24gaGFuZGxlciwgcmVqZWN0aW9uIHJlYXNvbnMgd2lsbCBiZSBwcm9wYWdhdGVkIGZ1cnRoZXIgZG93bnN0cmVhbS5cbiAgXG4gICAgYGBganNcbiAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgIHRocm93IG5ldyBQZWRhZ29naWNhbEV4Y2VwdGlvbignVXBzdHJlYW0gZXJyb3InKTtcbiAgICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAvLyBuZXZlciByZWFjaGVkXG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgLy8gVGhlIGBQZWRnYWdvY2lhbEV4Y2VwdGlvbmAgaXMgcHJvcGFnYXRlZCBhbGwgdGhlIHdheSBkb3duIHRvIGhlcmVcbiAgICB9KTtcbiAgICBgYGBcbiAgXG4gICAgQXNzaW1pbGF0aW9uXG4gICAgLS0tLS0tLS0tLS0tXG4gIFxuICAgIFNvbWV0aW1lcyB0aGUgdmFsdWUgeW91IHdhbnQgdG8gcHJvcGFnYXRlIHRvIGEgZG93bnN0cmVhbSBwcm9taXNlIGNhbiBvbmx5IGJlXG4gICAgcmV0cmlldmVkIGFzeW5jaHJvbm91c2x5LiBUaGlzIGNhbiBiZSBhY2hpZXZlZCBieSByZXR1cm5pbmcgYSBwcm9taXNlIGluIHRoZVxuICAgIGZ1bGZpbGxtZW50IG9yIHJlamVjdGlvbiBoYW5kbGVyLiBUaGUgZG93bnN0cmVhbSBwcm9taXNlIHdpbGwgdGhlbiBiZSBwZW5kaW5nXG4gICAgdW50aWwgdGhlIHJldHVybmVkIHByb21pc2UgaXMgc2V0dGxlZC4gVGhpcyBpcyBjYWxsZWQgKmFzc2ltaWxhdGlvbiouXG4gIFxuICAgIGBgYGpzXG4gICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gICAgfSkudGhlbihmdW5jdGlvbiAoY29tbWVudHMpIHtcbiAgICAgIC8vIFRoZSB1c2VyJ3MgY29tbWVudHMgYXJlIG5vdyBhdmFpbGFibGVcbiAgICB9KTtcbiAgICBgYGBcbiAgXG4gICAgSWYgdGhlIGFzc2ltbGlhdGVkIHByb21pc2UgcmVqZWN0cywgdGhlbiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIHdpbGwgYWxzbyByZWplY3QuXG4gIFxuICAgIGBgYGpzXG4gICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gICAgfSkudGhlbihmdW5jdGlvbiAoY29tbWVudHMpIHtcbiAgICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgZnVsZmlsbHMsIHdlJ2xsIGhhdmUgdGhlIHZhbHVlIGhlcmVcbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAvLyBJZiBgZmluZENvbW1lbnRzQnlBdXRob3JgIHJlamVjdHMsIHdlJ2xsIGhhdmUgdGhlIHJlYXNvbiBoZXJlXG4gICAgfSk7XG4gICAgYGBgXG4gIFxuICAgIFNpbXBsZSBFeGFtcGxlXG4gICAgLS0tLS0tLS0tLS0tLS1cbiAgXG4gICAgU3luY2hyb25vdXMgRXhhbXBsZVxuICBcbiAgICBgYGBqYXZhc2NyaXB0XG4gICAgbGV0IHJlc3VsdDtcbiAgXG4gICAgdHJ5IHtcbiAgICAgIHJlc3VsdCA9IGZpbmRSZXN1bHQoKTtcbiAgICAgIC8vIHN1Y2Nlc3NcbiAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgLy8gZmFpbHVyZVxuICAgIH1cbiAgICBgYGBcbiAgXG4gICAgRXJyYmFjayBFeGFtcGxlXG4gIFxuICAgIGBgYGpzXG4gICAgZmluZFJlc3VsdChmdW5jdGlvbihyZXN1bHQsIGVycil7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIC8vIGZhaWx1cmVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgIH1cbiAgICB9KTtcbiAgICBgYGBcbiAgXG4gICAgUHJvbWlzZSBFeGFtcGxlO1xuICBcbiAgICBgYGBqYXZhc2NyaXB0XG4gICAgZmluZFJlc3VsdCgpLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgIC8vIHN1Y2Nlc3NcbiAgICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgICAgLy8gZmFpbHVyZVxuICAgIH0pO1xuICAgIGBgYFxuICBcbiAgICBBZHZhbmNlZCBFeGFtcGxlXG4gICAgLS0tLS0tLS0tLS0tLS1cbiAgXG4gICAgU3luY2hyb25vdXMgRXhhbXBsZVxuICBcbiAgICBgYGBqYXZhc2NyaXB0XG4gICAgbGV0IGF1dGhvciwgYm9va3M7XG4gIFxuICAgIHRyeSB7XG4gICAgICBhdXRob3IgPSBmaW5kQXV0aG9yKCk7XG4gICAgICBib29rcyAgPSBmaW5kQm9va3NCeUF1dGhvcihhdXRob3IpO1xuICAgICAgLy8gc3VjY2Vzc1xuICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAvLyBmYWlsdXJlXG4gICAgfVxuICAgIGBgYFxuICBcbiAgICBFcnJiYWNrIEV4YW1wbGVcbiAgXG4gICAgYGBganNcbiAgXG4gICAgZnVuY3Rpb24gZm91bmRCb29rcyhib29rcykge1xuICBcbiAgICB9XG4gIFxuICAgIGZ1bmN0aW9uIGZhaWx1cmUocmVhc29uKSB7XG4gIFxuICAgIH1cbiAgXG4gICAgZmluZEF1dGhvcihmdW5jdGlvbihhdXRob3IsIGVycil7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBmaW5kQm9vb2tzQnlBdXRob3IoYXV0aG9yLCBmdW5jdGlvbihib29rcywgZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZm91bmRCb29rcyhib29rcyk7XG4gICAgICAgICAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgICAgICAgICAgZmFpbHVyZShyZWFzb24pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcbiAgICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfVxuICAgIH0pO1xuICAgIGBgYFxuICBcbiAgICBQcm9taXNlIEV4YW1wbGU7XG4gIFxuICAgIGBgYGphdmFzY3JpcHRcbiAgICBmaW5kQXV0aG9yKCkuXG4gICAgICB0aGVuKGZpbmRCb29rc0J5QXV0aG9yKS5cbiAgICAgIHRoZW4oZnVuY3Rpb24oYm9va3Mpe1xuICAgICAgICAvLyBmb3VuZCBib29rc1xuICAgIH0pLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgIH0pO1xuICAgIGBgYFxuICBcbiAgICBAbWV0aG9kIHRoZW5cbiAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvbkZ1bGZpbGxlZFxuICAgIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0ZWRcbiAgICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gICAgQHJldHVybiB7UHJvbWlzZX1cbiAgKi9cbiAgdGhlbjogdGhlbixcblxuICAvKipcbiAgICBgY2F0Y2hgIGlzIHNpbXBseSBzdWdhciBmb3IgYHRoZW4odW5kZWZpbmVkLCBvblJlamVjdGlvbilgIHdoaWNoIG1ha2VzIGl0IHRoZSBzYW1lXG4gICAgYXMgdGhlIGNhdGNoIGJsb2NrIG9mIGEgdHJ5L2NhdGNoIHN0YXRlbWVudC5cbiAgXG4gICAgYGBganNcbiAgICBmdW5jdGlvbiBmaW5kQXV0aG9yKCl7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkbid0IGZpbmQgdGhhdCBhdXRob3InKTtcbiAgICB9XG4gIFxuICAgIC8vIHN5bmNocm9ub3VzXG4gICAgdHJ5IHtcbiAgICAgIGZpbmRBdXRob3IoKTtcbiAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICB9XG4gIFxuICAgIC8vIGFzeW5jIHdpdGggcHJvbWlzZXNcbiAgICBmaW5kQXV0aG9yKCkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgfSk7XG4gICAgYGBgXG4gIFxuICAgIEBtZXRob2QgY2F0Y2hcbiAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGlvblxuICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICBAcmV0dXJuIHtQcm9taXNlfVxuICAqL1xuICAnY2F0Y2gnOiBmdW5jdGlvbiBfY2F0Y2gob25SZWplY3Rpb24pIHtcbiAgICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0aW9uKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gcG9seWZpbGwoKSB7XG4gICAgdmFyIGxvY2FsID0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGxvY2FsID0gZ2xvYmFsO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGxvY2FsID0gc2VsZjtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbG9jYWwgPSBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3BvbHlmaWxsIGZhaWxlZCBiZWNhdXNlIGdsb2JhbCBvYmplY3QgaXMgdW5hdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudCcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIFAgPSBsb2NhbC5Qcm9taXNlO1xuXG4gICAgaWYgKFApIHtcbiAgICAgICAgdmFyIHByb21pc2VUb1N0cmluZyA9IG51bGw7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBwcm9taXNlVG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoUC5yZXNvbHZlKCkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBzaWxlbnRseSBpZ25vcmVkXG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJvbWlzZVRvU3RyaW5nID09PSAnW29iamVjdCBQcm9taXNlXScgJiYgIVAuY2FzdCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbG9jYWwuUHJvbWlzZSA9IFByb21pc2U7XG59XG5cbnBvbHlmaWxsKCk7XG4vLyBTdHJhbmdlIGNvbXBhdC4uXG5Qcm9taXNlLnBvbHlmaWxsID0gcG9seWZpbGw7XG5Qcm9taXNlLlByb21pc2UgPSBQcm9taXNlO1xuXG5yZXR1cm4gUHJvbWlzZTtcblxufSkpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWVzNi1wcm9taXNlLm1hcFxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJJclhVc3VcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9zcmMvYXBpLmpzXCIpO1xuIiwidmFyIGFwaSA9IGZ1bmN0aW9uICh3aG8pIHtcblxuICAgIHZhciBfbWV0aG9kcyA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIG0gPSBbXTtcblxuXHRtLmFkZF9iYXRjaCA9IGZ1bmN0aW9uIChvYmopIHtcblx0ICAgIG0udW5zaGlmdChvYmopO1xuXHR9O1xuXG5cdG0udXBkYXRlID0gZnVuY3Rpb24gKG1ldGhvZCwgdmFsdWUpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTxtLmxlbmd0aDsgaSsrKSB7XG5cdFx0Zm9yICh2YXIgcCBpbiBtW2ldKSB7XG5cdFx0ICAgIGlmIChwID09PSBtZXRob2QpIHtcblx0XHRcdG1baV1bcF0gPSB2YWx1ZTtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdCAgICB9XG5cdFx0fVxuXHQgICAgfVxuXHQgICAgcmV0dXJuIGZhbHNlO1xuXHR9O1xuXG5cdG0uYWRkID0gZnVuY3Rpb24gKG1ldGhvZCwgdmFsdWUpIHtcblx0ICAgIGlmIChtLnVwZGF0ZSAobWV0aG9kLCB2YWx1ZSkgKSB7XG5cdCAgICB9IGVsc2Uge1xuXHRcdHZhciByZWcgPSB7fTtcblx0XHRyZWdbbWV0aG9kXSA9IHZhbHVlO1xuXHRcdG0uYWRkX2JhdGNoIChyZWcpO1xuXHQgICAgfVxuXHR9O1xuXG5cdG0uZ2V0ID0gZnVuY3Rpb24gKG1ldGhvZCkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPG0ubGVuZ3RoOyBpKyspIHtcblx0XHRmb3IgKHZhciBwIGluIG1baV0pIHtcblx0XHQgICAgaWYgKHAgPT09IG1ldGhvZCkge1xuXHRcdFx0cmV0dXJuIG1baV1bcF07XG5cdFx0ICAgIH1cblx0XHR9XG5cdCAgICB9XG5cdH07XG5cblx0cmV0dXJuIG07XG4gICAgfTtcblxuICAgIHZhciBtZXRob2RzICAgID0gX21ldGhvZHMoKTtcbiAgICB2YXIgYXBpID0gZnVuY3Rpb24gKCkge307XG5cbiAgICBhcGkuY2hlY2sgPSBmdW5jdGlvbiAobWV0aG9kLCBjaGVjaywgbXNnKSB7XG5cdGlmIChtZXRob2QgaW5zdGFuY2VvZiBBcnJheSkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPG1ldGhvZC5sZW5ndGg7IGkrKykge1xuXHRcdGFwaS5jaGVjayhtZXRob2RbaV0sIGNoZWNrLCBtc2cpO1xuXHQgICAgfVxuXHQgICAgcmV0dXJuO1xuXHR9XG5cblx0aWYgKHR5cGVvZiAobWV0aG9kKSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgbWV0aG9kLmNoZWNrKGNoZWNrLCBtc2cpO1xuXHR9IGVsc2Uge1xuXHQgICAgd2hvW21ldGhvZF0uY2hlY2soY2hlY2ssIG1zZyk7XG5cdH1cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgYXBpLnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChtZXRob2QsIGNiYWspIHtcblx0aWYgKG1ldGhvZCBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8bWV0aG9kLmxlbmd0aDsgaSsrKSB7XG5cdFx0YXBpLnRyYW5zZm9ybSAobWV0aG9kW2ldLCBjYmFrKTtcblx0ICAgIH1cblx0ICAgIHJldHVybjtcblx0fVxuXG5cdGlmICh0eXBlb2YgKG1ldGhvZCkgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIG1ldGhvZC50cmFuc2Zvcm0gKGNiYWspO1xuXHR9IGVsc2Uge1xuXHQgICAgd2hvW21ldGhvZF0udHJhbnNmb3JtKGNiYWspO1xuXHR9XG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIHZhciBhdHRhY2hfbWV0aG9kID0gZnVuY3Rpb24gKG1ldGhvZCwgb3B0cykge1xuXHR2YXIgY2hlY2tzID0gW107XG5cdHZhciB0cmFuc2Zvcm1zID0gW107XG5cblx0dmFyIGdldHRlciA9IG9wdHMub25fZ2V0dGVyIHx8IGZ1bmN0aW9uICgpIHtcblx0ICAgIHJldHVybiBtZXRob2RzLmdldChtZXRob2QpO1xuXHR9O1xuXG5cdHZhciBzZXR0ZXIgPSBvcHRzLm9uX3NldHRlciB8fCBmdW5jdGlvbiAoeCkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPHRyYW5zZm9ybXMubGVuZ3RoOyBpKyspIHtcblx0XHR4ID0gdHJhbnNmb3Jtc1tpXSh4KTtcblx0ICAgIH1cblxuXHQgICAgZm9yICh2YXIgaj0wOyBqPGNoZWNrcy5sZW5ndGg7IGorKykge1xuXHRcdGlmICghY2hlY2tzW2pdLmNoZWNrKHgpKSB7XG5cdFx0ICAgIHZhciBtc2cgPSBjaGVja3Nbal0ubXNnIHx8IFxuXHRcdFx0KFwiVmFsdWUgXCIgKyB4ICsgXCIgZG9lc24ndCBzZWVtIHRvIGJlIHZhbGlkIGZvciB0aGlzIG1ldGhvZFwiKTtcblx0XHQgICAgdGhyb3cgKG1zZyk7XG5cdFx0fVxuXHQgICAgfVxuXHQgICAgbWV0aG9kcy5hZGQobWV0aG9kLCB4KTtcblx0fTtcblxuXHR2YXIgbmV3X21ldGhvZCA9IGZ1bmN0aW9uIChuZXdfdmFsKSB7XG5cdCAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0XHRyZXR1cm4gZ2V0dGVyKCk7XG5cdCAgICB9XG5cdCAgICBzZXR0ZXIobmV3X3ZhbCk7XG5cdCAgICByZXR1cm4gd2hvOyAvLyBSZXR1cm4gdGhpcz9cblx0fTtcblx0bmV3X21ldGhvZC5jaGVjayA9IGZ1bmN0aW9uIChjYmFrLCBtc2cpIHtcblx0ICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdHJldHVybiBjaGVja3M7XG5cdCAgICB9XG5cdCAgICBjaGVja3MucHVzaCAoe2NoZWNrIDogY2Jhayxcblx0XHRcdCAgbXNnICAgOiBtc2d9KTtcblx0ICAgIHJldHVybiB0aGlzO1xuXHR9O1xuXHRuZXdfbWV0aG9kLnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdCAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0XHRyZXR1cm4gdHJhbnNmb3Jtcztcblx0ICAgIH1cblx0ICAgIHRyYW5zZm9ybXMucHVzaChjYmFrKTtcblx0ICAgIHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdHdob1ttZXRob2RdID0gbmV3X21ldGhvZDtcbiAgICB9O1xuXG4gICAgdmFyIGdldHNldCA9IGZ1bmN0aW9uIChwYXJhbSwgb3B0cykge1xuXHRpZiAodHlwZW9mIChwYXJhbSkgPT09ICdvYmplY3QnKSB7XG5cdCAgICBtZXRob2RzLmFkZF9iYXRjaCAocGFyYW0pO1xuXHQgICAgZm9yICh2YXIgcCBpbiBwYXJhbSkge1xuXHRcdGF0dGFjaF9tZXRob2QgKHAsIG9wdHMpO1xuXHQgICAgfVxuXHR9IGVsc2Uge1xuXHQgICAgbWV0aG9kcy5hZGQgKHBhcmFtLCBvcHRzLmRlZmF1bHRfdmFsdWUpO1xuXHQgICAgYXR0YWNoX21ldGhvZCAocGFyYW0sIG9wdHMpO1xuXHR9XG4gICAgfTtcblxuICAgIGFwaS5nZXRzZXQgPSBmdW5jdGlvbiAocGFyYW0sIGRlZikge1xuXHRnZXRzZXQocGFyYW0sIHtkZWZhdWx0X3ZhbHVlIDogZGVmfSk7XG5cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgYXBpLmdldCA9IGZ1bmN0aW9uIChwYXJhbSwgZGVmKSB7XG5cdHZhciBvbl9zZXR0ZXIgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aHJvdyAoXCJNZXRob2QgZGVmaW5lZCBvbmx5IGFzIGEgZ2V0dGVyICh5b3UgYXJlIHRyeWluZyB0byB1c2UgaXQgYXMgYSBzZXR0ZXJcIik7XG5cdH07XG5cblx0Z2V0c2V0KHBhcmFtLCB7ZGVmYXVsdF92YWx1ZSA6IGRlZixcblx0XHQgICAgICAgb25fc2V0dGVyIDogb25fc2V0dGVyfVxuXHQgICAgICApO1xuXG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIGFwaS5zZXQgPSBmdW5jdGlvbiAocGFyYW0sIGRlZikge1xuXHR2YXIgb25fZ2V0dGVyID0gZnVuY3Rpb24gKCkge1xuXHQgICAgdGhyb3cgKFwiTWV0aG9kIGRlZmluZWQgb25seSBhcyBhIHNldHRlciAoeW91IGFyZSB0cnlpbmcgdG8gdXNlIGl0IGFzIGEgZ2V0dGVyXCIpO1xuXHR9O1xuXG5cdGdldHNldChwYXJhbSwge2RlZmF1bHRfdmFsdWUgOiBkZWYsXG5cdFx0ICAgICAgIG9uX2dldHRlciA6IG9uX2dldHRlcn1cblx0ICAgICAgKTtcblxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICBhcGkubWV0aG9kID0gZnVuY3Rpb24gKG5hbWUsIGNiYWspIHtcblx0aWYgKHR5cGVvZiAobmFtZSkgPT09ICdvYmplY3QnKSB7XG5cdCAgICBmb3IgKHZhciBwIGluIG5hbWUpIHtcblx0XHR3aG9bcF0gPSBuYW1lW3BdO1xuXHQgICAgfVxuXHR9IGVsc2Uge1xuXHQgICAgd2hvW25hbWVdID0gY2Jhaztcblx0fVxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICByZXR1cm4gYXBpO1xuICAgIFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gYXBpOyIsIi8vIGlmICh0eXBlb2YgdG50ID09PSBcInVuZGVmaW5lZFwiKSB7XG4vLyAgICAgbW9kdWxlLmV4cG9ydHMgPSB0bnQgPSB7fVxuLy8gfVxuLy8gdG50LnV0aWxzID0gcmVxdWlyZShcInRudC51dGlsc1wiKTtcbi8vIHRudC50b29sdGlwID0gcmVxdWlyZShcInRudC50b29sdGlwXCIpO1xuLy8gdG50LmJvYXJkID0gcmVxdWlyZShcIi4vc3JjL2luZGV4LmpzXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL3NyYy9pbmRleFwiKTtcbiIsInZhciBhcGlqcyA9IHJlcXVpcmUgKFwidG50LmFwaVwiKTtcbnZhciBkZWZlckNhbmNlbCA9IHJlcXVpcmUgKFwidG50LnV0aWxzXCIpLmRlZmVyX2NhbmNlbDtcblxudmFyIGJvYXJkID0gZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICAvLy8vIFByaXZhdGUgdmFyc1xuICAgIHZhciBzdmc7XG4gICAgdmFyIGRpdl9pZDtcbiAgICB2YXIgdHJhY2tzID0gW107XG4gICAgdmFyIG1pbl93aWR0aCA9IDUwO1xuICAgIHZhciBoZWlnaHQgICAgPSAwOyAgICAvLyBUaGlzIGlzIHRoZSBnbG9iYWwgaGVpZ2h0IGluY2x1ZGluZyBhbGwgdGhlIHRyYWNrc1xuICAgIHZhciB3aWR0aCAgICAgPSA5MjA7XG4gICAgdmFyIGhlaWdodF9vZmZzZXQgPSAyMDtcbiAgICB2YXIgbG9jID0ge1xuXHRzcGVjaWVzICA6IHVuZGVmaW5lZCxcblx0Y2hyICAgICAgOiB1bmRlZmluZWQsXG4gICAgICAgIGZyb20gICAgIDogMCxcbiAgICAgICAgdG8gICAgICAgOiA1MDBcbiAgICB9O1xuXG4gICAgLy8gTGltaXQgY2Fwc1xuICAgIHZhciBjYXBzID0ge1xuICAgICAgICBsZWZ0IDogdW5kZWZpbmVkLFxuICAgICAgICByaWdodCA6IHVuZGVmaW5lZFxuICAgIH07XG4gICAgdmFyIGNhcF93aWR0aCA9IDM7XG5cblxuICAgIC8vIFRPRE86IFdlIGhhdmUgbm93IGJhY2tncm91bmQgY29sb3IgaW4gdGhlIHRyYWNrcy4gQ2FuIHRoaXMgYmUgcmVtb3ZlZD9cbiAgICAvLyBJdCBsb29rcyBsaWtlIGl0IGlzIHVzZWQgaW4gdGhlIHRvby13aWRlIHBhbmUgZXRjLCBidXQgaXQgbWF5IG5vdCBiZSBuZWVkZWQgYW55bW9yZVxuICAgIHZhciBiZ0NvbG9yICAgPSBkMy5yZ2IoJyNGOEZCRUYnKTsgLy8jRjhGQkVGXG4gICAgdmFyIHBhbmU7IC8vIERyYWdnYWJsZSBwYW5lXG4gICAgdmFyIHN2Z19nO1xuICAgIHZhciB4U2NhbGU7XG4gICAgdmFyIHpvb21FdmVudEhhbmRsZXIgPSBkMy5iZWhhdmlvci56b29tKCk7XG4gICAgdmFyIGxpbWl0cyA9IHtcbiAgICAgICAgbWluIDogMCxcbiAgICAgICAgbWF4IDogMTAwMCxcbiAgICAgICAgem9vbV9vdXQgOiAxMDAwLFxuICAgICAgICB6b29tX2luICA6IDEwMFxuICAgIH07XG4gICAgdmFyIGR1ciA9IDUwMDtcbiAgICB2YXIgZHJhZ19hbGxvd2VkID0gdHJ1ZTtcblxuICAgIHZhciBleHBvcnRzID0ge1xuICAgICAgICBlYXNlICAgICAgICAgIDogZDMuZWFzZShcImN1YmljLWluLW91dFwiKSxcbiAgICAgICAgZXh0ZW5kX2NhbnZhcyA6IHtcbiAgICAgICAgICAgIGxlZnQgOiAwLFxuICAgICAgICAgICAgcmlnaHQgOiAwXG4gICAgICAgIH0sXG4gICAgICAgIHNob3dfZnJhbWUgOiB0cnVlXG4gICAgICAgIC8vIGxpbWl0cyAgICAgICAgOiBmdW5jdGlvbiAoKSB7dGhyb3cgXCJUaGUgbGltaXRzIG1ldGhvZCBzaG91bGQgYmUgZGVmaW5lZFwifVxuICAgIH07XG5cbiAgICAvLyBUaGUgcmV0dXJuZWQgY2xvc3VyZSAvIG9iamVjdFxuICAgIHZhciB0cmFja192aXMgPSBmdW5jdGlvbihkaXYpIHtcbiAgICBcdGRpdl9pZCA9IGQzLnNlbGVjdChkaXYpLmF0dHIoXCJpZFwiKTtcblxuICAgIFx0Ly8gVGhlIG9yaWdpbmFsIGRpdiBpcyBjbGFzc2VkIHdpdGggdGhlIHRudCBjbGFzc1xuICAgIFx0ZDMuc2VsZWN0KGRpdilcbiAgICBcdCAgICAuY2xhc3NlZChcInRudFwiLCB0cnVlKTtcblxuICAgIFx0Ly8gVE9ETzogTW92ZSB0aGUgc3R5bGluZyB0byB0aGUgc2Nzcz9cbiAgICBcdHZhciBicm93c2VyRGl2ID0gZDMuc2VsZWN0KGRpdilcbiAgICBcdCAgICAuYXBwZW5kKFwiZGl2XCIpXG4gICAgXHQgICAgLmF0dHIoXCJpZFwiLCBcInRudF9cIiArIGRpdl9pZClcbiAgICBcdCAgICAuc3R5bGUoXCJwb3NpdGlvblwiLCBcInJlbGF0aXZlXCIpXG4gICAgXHQgICAgLmNsYXNzZWQoXCJ0bnRfZnJhbWVkXCIsIGV4cG9ydHMuc2hvd19mcmFtZSA/IHRydWUgOiBmYWxzZSlcbiAgICBcdCAgICAuc3R5bGUoXCJ3aWR0aFwiLCAod2lkdGggKyBjYXBfd2lkdGgqMiArIGV4cG9ydHMuZXh0ZW5kX2NhbnZhcy5yaWdodCArIGV4cG9ydHMuZXh0ZW5kX2NhbnZhcy5sZWZ0KSArIFwicHhcIik7XG5cbiAgICBcdHZhciBncm91cERpdiA9IGJyb3dzZXJEaXZcbiAgICBcdCAgICAuYXBwZW5kKFwiZGl2XCIpXG4gICAgXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9ncm91cERpdlwiKTtcblxuICAgIFx0Ly8gVGhlIFNWR1xuICAgIFx0c3ZnID0gZ3JvdXBEaXZcbiAgICBcdCAgICAuYXBwZW5kKFwic3ZnXCIpXG4gICAgXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9zdmdcIilcbiAgICBcdCAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoKVxuICAgIFx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcbiAgICBcdCAgICAuYXR0cihcInBvaW50ZXItZXZlbnRzXCIsIFwiYWxsXCIpO1xuXG4gICAgXHRzdmdfZyA9IHN2Z1xuICAgIFx0ICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCwyMClcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZ1wiKVxuICAgIFx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZ1wiKTtcblxuICAgIFx0Ly8gY2Fwc1xuICAgIFx0Y2Fwcy5sZWZ0ID0gc3ZnX2dcbiAgICBcdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuICAgIFx0ICAgIC5hdHRyKFwiaWRcIiwgXCJ0bnRfXCIgKyBkaXZfaWQgKyBcIl81cGNhcFwiKVxuICAgIFx0ICAgIC5hdHRyKFwieFwiLCAwKVxuICAgIFx0ICAgIC5hdHRyKFwieVwiLCAwKVxuICAgIFx0ICAgIC5hdHRyKFwid2lkdGhcIiwgMClcbiAgICBcdCAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQpXG4gICAgXHQgICAgLmF0dHIoXCJmaWxsXCIsIFwicmVkXCIpO1xuICAgIFx0Y2Fwcy5yaWdodCA9IHN2Z19nXG4gICAgXHQgICAgLmFwcGVuZChcInJlY3RcIilcbiAgICBcdCAgICAuYXR0cihcImlkXCIsIFwidG50X1wiICsgZGl2X2lkICsgXCJfM3BjYXBcIilcbiAgICBcdCAgICAuYXR0cihcInhcIiwgd2lkdGgtY2FwX3dpZHRoKVxuICAgIFx0ICAgIC5hdHRyKFwieVwiLCAwKVxuICAgIFx0ICAgIC5hdHRyKFwid2lkdGhcIiwgMClcbiAgICBcdCAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQpXG4gICAgXHQgICAgLmF0dHIoXCJmaWxsXCIsIFwicmVkXCIpO1xuXG4gICAgXHQvLyBUaGUgWm9vbWluZy9QYW5uaW5nIFBhbmVcbiAgICBcdHBhbmUgPSBzdmdfZ1xuICAgIFx0ICAgIC5hcHBlbmQoXCJyZWN0XCIpXG4gICAgXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9wYW5lXCIpXG4gICAgXHQgICAgLmF0dHIoXCJpZFwiLCBcInRudF9cIiArIGRpdl9pZCArIFwiX3BhbmVcIilcbiAgICBcdCAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoKVxuICAgIFx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcbiAgICBcdCAgICAuc3R5bGUoXCJmaWxsXCIsIGJnQ29sb3IpO1xuXG4gICAgXHQvLyAqKiBUT0RPOiBXb3VsZG4ndCBiZSBiZXR0ZXIgdG8gaGF2ZSB0aGVzZSBtZXNzYWdlcyBieSB0cmFjaz9cbiAgICBcdC8vIHZhciB0b29XaWRlX3RleHQgPSBzdmdfZ1xuICAgIFx0Ly8gICAgIC5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgXHQvLyAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF93aWRlT0tfdGV4dFwiKVxuICAgIFx0Ly8gICAgIC5hdHRyKFwiaWRcIiwgXCJ0bnRfXCIgKyBkaXZfaWQgKyBcIl90b29XaWRlXCIpXG4gICAgXHQvLyAgICAgLmF0dHIoXCJmaWxsXCIsIGJnQ29sb3IpXG4gICAgXHQvLyAgICAgLnRleHQoXCJSZWdpb24gdG9vIHdpZGVcIik7XG5cbiAgICBcdC8vIFRPRE86IEkgZG9uJ3Qga25vdyBpZiB0aGlzIGlzIHRoZSBiZXN0IHdheSAoYW5kIHBvcnRhYmxlKSB3YXlcbiAgICBcdC8vIG9mIGNlbnRlcmluZyB0aGUgdGV4dCBpbiB0aGUgdGV4dCBhcmVhXG4gICAgXHQvLyB2YXIgYmIgPSB0b29XaWRlX3RleHRbMF1bMF0uZ2V0QkJveCgpO1xuICAgIFx0Ly8gdG9vV2lkZV90ZXh0XG4gICAgXHQvLyAgICAgLmF0dHIoXCJ4XCIsIH5+KHdpZHRoLzIgLSBiYi53aWR0aC8yKSlcbiAgICBcdC8vICAgICAuYXR0cihcInlcIiwgfn4oaGVpZ2h0LzIgLSBiYi5oZWlnaHQvMikpO1xuICAgIH07XG5cbiAgICAvLyBBUElcbiAgICB2YXIgYXBpID0gYXBpanMgKHRyYWNrX3ZpcylcbiAgICBcdC5nZXRzZXQgKGV4cG9ydHMpXG4gICAgXHQuZ2V0c2V0IChsaW1pdHMpXG4gICAgXHQuZ2V0c2V0IChsb2MpO1xuXG4gICAgYXBpLnRyYW5zZm9ybSAodHJhY2tfdmlzLmV4dGVuZF9jYW52YXMsIGZ1bmN0aW9uICh2YWwpIHtcbiAgICBcdHZhciBwcmV2X3ZhbCA9IHRyYWNrX3Zpcy5leHRlbmRfY2FudmFzKCk7XG4gICAgXHR2YWwubGVmdCA9IHZhbC5sZWZ0IHx8IHByZXZfdmFsLmxlZnQ7XG4gICAgXHR2YWwucmlnaHQgPSB2YWwucmlnaHQgfHwgcHJldl92YWwucmlnaHQ7XG4gICAgXHRyZXR1cm4gdmFsO1xuICAgIH0pO1xuXG4gICAgLy8gdHJhY2tfdmlzIGFsd2F5cyBzdGFydHMgb24gbG9jLmZyb20gJiBsb2MudG9cbiAgICBhcGkubWV0aG9kICgnc3RhcnQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIG1ha2Ugc3VyZSB0aGF0IHpvb21fb3V0IGlzIHdpdGhpbiB0aGUgbWluLW1heCByYW5nZVxuICAgICAgICBpZiAoKGxpbWl0cy5tYXggLSBsaW1pdHMubWluKSA8IGxpbWl0cy56b29tX291dCkge1xuICAgICAgICAgICAgbGltaXRzLnpvb21fb3V0ID0gbGltaXRzLm1heCAtIGxpbWl0cy5taW47XG4gICAgICAgIH1cblxuICAgICAgICBwbG90KCk7XG5cbiAgICAgICAgLy8gUmVzZXQgdGhlIHRyYWNrc1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8dHJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodHJhY2tzW2ldLmcpIHtcbiAgICAgICAgICAgICAgICAvLyAgICB0cmFja3NbaV0uZGlzcGxheSgpLnJlc2V0LmNhbGwodHJhY2tzW2ldKTtcbiAgICAgICAgICAgICAgICB0cmFja3NbaV0uZy5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF9pbml0X3RyYWNrKHRyYWNrc1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgX3BsYWNlX3RyYWNrcygpO1xuXG4gICAgICAgIC8vIFRoZSBjb250aW51YXRpb24gY2FsbGJhY2tcbiAgICAgICAgdmFyIGNvbnQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgIGlmICgobG9jLnRvIC0gbG9jLmZyb20pIDwgbGltaXRzLnpvb21faW4pIHtcbiAgICAgICAgICAgICAgICBpZiAoKGxvYy5mcm9tICsgbGltaXRzLnpvb21faW4pID4gbGltaXRzLm1heCkge1xuICAgICAgICAgICAgICAgICAgICBsb2MudG8gPSBsaW1pdHMubWF4O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxvYy50byA9IGxvYy5mcm9tICsgbGltaXRzLnpvb21faW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8dHJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgX3VwZGF0ZV90cmFjayh0cmFja3NbaV0sIGxvYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29udCgpO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3VwZGF0ZScsIGZ1bmN0aW9uICgpIHtcbiAgICBcdGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICBcdCAgICBfdXBkYXRlX3RyYWNrICh0cmFja3NbaV0pO1xuICAgIFx0fVxuICAgIH0pO1xuXG4gICAgdmFyIF91cGRhdGVfdHJhY2sgPSBmdW5jdGlvbiAodHJhY2ssIHdoZXJlKSB7XG4gICAgXHRpZiAodHJhY2suZGF0YSgpKSB7XG4gICAgXHQgICAgdmFyIHRyYWNrX2RhdGEgPSB0cmFjay5kYXRhKCk7XG4gICAgICAgICAgICB2YXIgZGF0YV91cGRhdGVyID0gdHJhY2tfZGF0YTtcblxuICAgIFx0ICAgIGRhdGFfdXBkYXRlci5jYWxsKHRyYWNrLCB7XG4gICAgICAgICAgICAgICAgJ2xvYycgOiB3aGVyZSxcbiAgICAgICAgICAgICAgICAnb25fc3VjY2VzcycgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyYWNrLmRpc3BsYXkoKS51cGRhdGUuY2FsbCh0cmFjaywgd2hlcmUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICBcdCAgICB9KTtcbiAgICBcdH1cbiAgICB9O1xuXG4gICAgdmFyIHBsb3QgPSBmdW5jdGlvbigpIHtcbiAgICBcdHhTY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgXHQgICAgLmRvbWFpbihbbG9jLmZyb20sIGxvYy50b10pXG4gICAgXHQgICAgLnJhbmdlKFswLCB3aWR0aF0pO1xuXG4gICAgXHRpZiAoZHJhZ19hbGxvd2VkKSB7XG4gICAgXHQgICAgc3ZnX2cuY2FsbCggem9vbUV2ZW50SGFuZGxlclxuICAgIFx0XHQgICAgICAgLngoeFNjYWxlKVxuICAgIFx0XHQgICAgICAgLnNjYWxlRXh0ZW50KFsobG9jLnRvLWxvYy5mcm9tKS8obGltaXRzLnpvb21fb3V0LTEpLCAobG9jLnRvLWxvYy5mcm9tKS9saW1pdHMuem9vbV9pbl0pXG4gICAgXHRcdCAgICAgICAub24oXCJ6b29tXCIsIF9tb3ZlKVxuICAgIFx0XHQgICAgICk7XG4gICAgXHR9XG4gICAgfTtcblxuICAgIHZhciBfcmVvcmRlciA9IGZ1bmN0aW9uIChuZXdfdHJhY2tzKSB7XG4gICAgICAgIC8vIFRPRE86IFRoaXMgaXMgZGVmaW5pbmcgYSBuZXcgaGVpZ2h0LCBidXQgdGhlIGdsb2JhbCBoZWlnaHQgaXMgdXNlZCB0byBkZWZpbmUgdGhlIHNpemUgb2Ygc2V2ZXJhbFxuICAgICAgICAvLyBwYXJ0cy4gV2Ugc2hvdWxkIGRvIHRoaXMgZHluYW1pY2FsbHlcblxuICAgICAgICB2YXIgZm91bmRfaW5kZXhlcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBqPTA7IGo8bmV3X3RyYWNrcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgdmFyIGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8dHJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRyYWNrc1tpXS5pZCgpID09PSBuZXdfdHJhY2tzW2pdLmlkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBmb3VuZF9pbmRleGVzW2ldID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgLy8gdHJhY2tzLnNwbGljZShpLDEpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgICAgICAgICAgX2luaXRfdHJhY2sobmV3X3RyYWNrc1tqXSk7XG4gICAgICAgICAgICAgICAgX3VwZGF0ZV90cmFjayhuZXdfdHJhY2tzW2pdLCB7ZnJvbSA6IGxvYy5mcm9tLCB0byA6IGxvYy50b30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgeD0wOyB4PHRyYWNrcy5sZW5ndGg7IHgrKykge1xuICAgICAgICAgICAgaWYgKCFmb3VuZF9pbmRleGVzW3hdKSB7XG4gICAgICAgICAgICAgICAgdHJhY2tzW3hdLmcucmVtb3ZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0cmFja3MgPSBuZXdfdHJhY2tzO1xuICAgICAgICBfcGxhY2VfdHJhY2tzKCk7XG4gICAgfTtcblxuICAgIC8vIHJpZ2h0L2xlZnQvem9vbSBwYW5zIG9yIHpvb21zIHRoZSB0cmFjay4gVGhlc2UgbWV0aG9kcyBhcmUgZXhwb3NlZCB0byBhbGxvdyBleHRlcm5hbCBidXR0b25zLCBldGMgdG8gaW50ZXJhY3Qgd2l0aCB0aGUgdHJhY2tzLiBUaGUgYXJndW1lbnQgaXMgdGhlIGFtb3VudCBvZiBwYW5uaW5nL3pvb21pbmcgKGllLiAxLjIgbWVhbnMgMjAlIHBhbm5pbmcpIFdpdGggbGVmdC9yaWdodCBvbmx5IHBvc2l0aXZlIG51bWJlcnMgYXJlIGFsbG93ZWQuXG4gICAgYXBpLm1ldGhvZCAoJ3Njcm9sbCcsIGZ1bmN0aW9uIChmYWN0b3IpIHtcbiAgICAgICAgdmFyIGFtb3VudCA9IE1hdGguYWJzKGZhY3Rvcik7XG4gICAgXHRpZiAoZmFjdG9yID4gMCkge1xuICAgIFx0ICAgIF9tYW51YWxfbW92ZShhbW91bnQsIDEpO1xuICAgIFx0fSBlbHNlIGlmIChmYWN0b3IgPCAwKXtcbiAgICAgICAgICAgIF9tYW51YWxfbW92ZShhbW91bnQsIC0xKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3pvb20nLCBmdW5jdGlvbiAoZmFjdG9yKSB7XG4gICAgICAgIF9tYW51YWxfbW92ZSgxL2ZhY3RvciwgMCk7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgnZmluZF90cmFjaycsIGZ1bmN0aW9uIChpZCkge1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8dHJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodHJhY2tzW2ldLmlkKCkgPT09IGlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRyYWNrc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3JlbW92ZV90cmFjaycsIGZ1bmN0aW9uICh0cmFjaykge1xuICAgICAgICB0cmFjay5nLnJlbW92ZSgpO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ2FkZF90cmFjaycsIGZ1bmN0aW9uICh0cmFjaykge1xuICAgICAgICBpZiAodHJhY2sgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPHRyYWNrLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdHJhY2tfdmlzLmFkZF90cmFjayAodHJhY2tbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRyYWNrX3ZpcztcbiAgICAgICAgfVxuICAgICAgICB0cmFja3MucHVzaCh0cmFjayk7XG4gICAgICAgIHJldHVybiB0cmFja192aXM7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kKCd0cmFja3MnLCBmdW5jdGlvbiAodHMpIHtcbiAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJhY2tzO1xuICAgICAgICB9XG4gICAgICAgIF9yZW9yZGVyKHRzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG5cbiAgICAvL1xuICAgIGFwaS5tZXRob2QgKCd3aWR0aCcsIGZ1bmN0aW9uICh3KSB7XG4gICAgXHQvLyBUT0RPOiBBbGxvdyBzdWZmaXhlcyBsaWtlIFwiMTAwMHB4XCI/XG4gICAgXHQvLyBUT0RPOiBUZXN0IHdyb25nIGZvcm1hdHNcbiAgICBcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIFx0ICAgIHJldHVybiB3aWR0aDtcbiAgICBcdH1cbiAgICBcdC8vIEF0IGxlYXN0IG1pbi13aWR0aFxuICAgIFx0aWYgKHcgPCBtaW5fd2lkdGgpIHtcbiAgICBcdCAgICB3ID0gbWluX3dpZHRoO1xuICAgIFx0fVxuXG4gICAgXHQvLyBXZSBhcmUgcmVzaXppbmdcbiAgICBcdGlmIChkaXZfaWQgIT09IHVuZGVmaW5lZCkge1xuICAgIFx0ICAgIGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQpLnNlbGVjdChcInN2Z1wiKS5hdHRyKFwid2lkdGhcIiwgdyk7XG4gICAgXHQgICAgLy8gUmVzaXplIHRoZSB6b29taW5nL3Bhbm5pbmcgcGFuZVxuICAgIFx0ICAgIGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQpLnN0eWxlKFwid2lkdGhcIiwgKHBhcnNlSW50KHcpICsgY2FwX3dpZHRoKjIpICsgXCJweFwiKTtcbiAgICBcdCAgICBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkICsgXCJfcGFuZVwiKS5hdHRyKFwid2lkdGhcIiwgdyk7XG4gICAgICAgICAgICBjYXBzLnJpZ2h0XG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIHctY2FwX3dpZHRoKTtcblxuICAgIFx0ICAgIC8vIFJlcGxvdFxuICAgIFx0ICAgIHdpZHRoID0gdztcbiAgICAgICAgICAgIHhTY2FsZS5yYW5nZShbMCwgd2lkdGhdKTtcblxuICAgIFx0ICAgIHBsb3QoKTtcbiAgICBcdCAgICBmb3IgKHZhciBpPTA7IGk8dHJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIFx0XHR0cmFja3NbaV0uZy5zZWxlY3QoXCJyZWN0XCIpLmF0dHIoXCJ3aWR0aFwiLCB3KTtcbiAgICAgICAgICAgICAgICB0cmFja3NbaV0uZGlzcGxheSgpLnNjYWxlKHhTY2FsZSk7XG4gICAgICAgIFx0XHR0cmFja3NbaV0uZGlzcGxheSgpLnJlc2V0LmNhbGwodHJhY2tzW2ldKTtcbiAgICAgICAgICAgICAgICB0cmFja3NbaV0uZGlzcGxheSgpLmluaXQuY2FsbCh0cmFja3NbaV0sIHcpO1xuICAgICAgICBcdFx0dHJhY2tzW2ldLmRpc3BsYXkoKS51cGRhdGUuY2FsbCh0cmFja3NbaV0sIGxvYyk7XG4gICAgXHQgICAgfVxuICAgIFx0fSBlbHNlIHtcbiAgICBcdCAgICB3aWR0aCA9IHc7XG4gICAgXHR9XG4gICAgICAgIHJldHVybiB0cmFja192aXM7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kKCdhbGxvd19kcmFnJywgZnVuY3Rpb24oYikge1xuICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBkcmFnX2FsbG93ZWQ7XG4gICAgICAgIH1cbiAgICAgICAgZHJhZ19hbGxvd2VkID0gYjtcbiAgICAgICAgaWYgKGRyYWdfYWxsb3dlZCkge1xuICAgICAgICAgICAgLy8gV2hlbiB0aGlzIG1ldGhvZCBpcyBjYWxsZWQgb24gdGhlIG9iamVjdCBiZWZvcmUgc3RhcnRpbmcgdGhlIHNpbXVsYXRpb24sIHdlIGRvbid0IGhhdmUgZGVmaW5lZCB4U2NhbGVcbiAgICAgICAgICAgIGlmICh4U2NhbGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHN2Z19nLmNhbGwoIHpvb21FdmVudEhhbmRsZXIueCh4U2NhbGUpXG4gICAgICAgICAgICAgICAgICAgIC8vIC54RXh0ZW50KFswLCBsaW1pdHMucmlnaHRdKVxuICAgICAgICAgICAgICAgICAgICAuc2NhbGVFeHRlbnQoWyhsb2MudG8tbG9jLmZyb20pLyhsaW1pdHMuem9vbV9vdXQtMSksIChsb2MudG8tbG9jLmZyb20pL2xpbWl0cy56b29tX2luXSlcbiAgICAgICAgICAgICAgICAgICAgLm9uKFwiem9vbVwiLCBfbW92ZSkgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFdlIGNyZWF0ZSBhIG5ldyBkdW1teSBzY2FsZSBpbiB4IHRvIGF2b2lkIGRyYWdnaW5nIHRoZSBwcmV2aW91cyBvbmVcbiAgICAgICAgICAgIC8vIFRPRE86IFRoZXJlIG1heSBiZSBhIGNoZWFwZXIgd2F5IG9mIGRvaW5nIHRoaXM/XG4gICAgICAgICAgICB6b29tRXZlbnRIYW5kbGVyLngoZDMuc2NhbGUubGluZWFyKCkpLm9uKFwiem9vbVwiLCBudWxsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJhY2tfdmlzO1xuICAgIH0pO1xuXG4gICAgdmFyIF9wbGFjZV90cmFja3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBoID0gMDtcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHRyYWNrID0gdHJhY2tzW2ldO1xuICAgICAgICAgICAgaWYgKHRyYWNrLmcuYXR0cihcInRyYW5zZm9ybVwiKSkge1xuICAgICAgICAgICAgICAgIHRyYWNrLmdcbiAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgICAgICAgICAuZHVyYXRpb24oZHVyKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIGV4cG9ydHMuZXh0ZW5kX2NhbnZhcy5sZWZ0ICsgXCIsXCIgKyBoICsgXCIpXCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0cmFjay5nXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgZXhwb3J0cy5leHRlbmRfY2FudmFzLmxlZnQgKyBcIixcIiArIGggKyBcIilcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGggKz0gdHJhY2suaGVpZ2h0KCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzdmdcbiAgICAgICAgc3ZnLmF0dHIoXCJoZWlnaHRcIiwgaCArIGhlaWdodF9vZmZzZXQpO1xuXG4gICAgICAgIC8vIGRpdlxuICAgICAgICBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkKVxuICAgICAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsIChoICsgMTAgKyBoZWlnaHRfb2Zmc2V0KSArIFwicHhcIik7XG5cbiAgICAgICAgLy8gY2Fwc1xuICAgICAgICBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkICsgXCJfNXBjYXBcIilcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGgpXG4gICAgICAgICAgICAuZWFjaChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIG1vdmVfdG9fZnJvbnQodGhpcyk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkICsgXCJfM3BjYXBcIilcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGgpXG4gICAgICAgICAgICAuZWFjaCAoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBtb3ZlX3RvX2Zyb250KHRoaXMpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gcGFuZVxuICAgICAgICBwYW5lXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBoICsgaGVpZ2h0X29mZnNldCk7XG5cbiAgICAgICAgcmV0dXJuIHRyYWNrX3ZpcztcbiAgICB9O1xuXG4gICAgdmFyIF9pbml0X3RyYWNrID0gZnVuY3Rpb24gKHRyYWNrKSB7XG4gICAgICAgIHRyYWNrLmcgPSBzdmcuc2VsZWN0KFwiZ1wiKS5zZWxlY3QoXCJnXCIpXG4gICAgXHQgICAgLmFwcGVuZChcImdcIilcbiAgICBcdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3RyYWNrXCIpXG4gICAgXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgdHJhY2suaGVpZ2h0KCkpO1xuXG4gICAgXHQvLyBSZWN0IGZvciB0aGUgYmFja2dyb3VuZCBjb2xvclxuICAgIFx0dHJhY2suZ1xuICAgIFx0ICAgIC5hcHBlbmQoXCJyZWN0XCIpXG4gICAgXHQgICAgLmF0dHIoXCJ4XCIsIDApXG4gICAgXHQgICAgLmF0dHIoXCJ5XCIsIDApXG4gICAgXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCB0cmFja192aXMud2lkdGgoKSlcbiAgICBcdCAgICAuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKSlcbiAgICBcdCAgICAuc3R5bGUoXCJmaWxsXCIsIHRyYWNrLmNvbG9yKCkpXG4gICAgXHQgICAgLnN0eWxlKFwicG9pbnRlci1ldmVudHNcIiwgXCJub25lXCIpO1xuXG4gICAgXHRpZiAodHJhY2suZGlzcGxheSgpKSB7XG4gICAgXHQgICAgdHJhY2suZGlzcGxheSgpXG4gICAgICAgICAgICAgICAgLnNjYWxlKHhTY2FsZSlcbiAgICAgICAgICAgICAgICAuaW5pdC5jYWxsKHRyYWNrLCB3aWR0aCk7XG4gICAgXHR9XG5cbiAgICBcdHJldHVybiB0cmFja192aXM7XG4gICAgfTtcblxuICAgIHZhciBfbWFudWFsX21vdmUgPSBmdW5jdGlvbiAoZmFjdG9yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgdmFyIG9sZERvbWFpbiA9IHhTY2FsZS5kb21haW4oKTtcblxuICAgIFx0dmFyIHNwYW4gPSBvbGREb21haW5bMV0gLSBvbGREb21haW5bMF07XG4gICAgXHR2YXIgb2Zmc2V0ID0gKHNwYW4gKiBmYWN0b3IpIC0gc3BhbjtcblxuICAgIFx0dmFyIG5ld0RvbWFpbjtcbiAgICBcdHN3aXRjaCAoZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlIDEgOlxuICAgICAgICAgICAgbmV3RG9tYWluID0gWyh+fm9sZERvbWFpblswXSAtIG9mZnNldCksIH5+KG9sZERvbWFpblsxXSAtIG9mZnNldCldO1xuICAgIFx0ICAgIGJyZWFrO1xuICAgICAgICBcdGNhc2UgLTEgOlxuICAgICAgICBcdCAgICBuZXdEb21haW4gPSBbKH5+b2xkRG9tYWluWzBdICsgb2Zmc2V0KSwgfn4ob2xkRG9tYWluWzFdIC0gb2Zmc2V0KV07XG4gICAgICAgIFx0ICAgIGJyZWFrO1xuICAgICAgICBcdGNhc2UgMCA6XG4gICAgICAgIFx0ICAgIG5ld0RvbWFpbiA9IFtvbGREb21haW5bMF0gLSB+fihvZmZzZXQvMiksIG9sZERvbWFpblsxXSArICh+fm9mZnNldC8yKV07XG4gICAgXHR9XG5cbiAgICBcdHZhciBpbnRlcnBvbGF0b3IgPSBkMy5pbnRlcnBvbGF0ZU51bWJlcihvbGREb21haW5bMF0sIG5ld0RvbWFpblswXSk7XG4gICAgXHR2YXIgZWFzZSA9IGV4cG9ydHMuZWFzZTtcblxuICAgIFx0dmFyIHggPSAwO1xuICAgIFx0ZDMudGltZXIoZnVuY3Rpb24oKSB7XG4gICAgXHQgICAgdmFyIGN1cnJfc3RhcnQgPSBpbnRlcnBvbGF0b3IoZWFzZSh4KSk7XG4gICAgXHQgICAgdmFyIGN1cnJfZW5kO1xuICAgIFx0ICAgIHN3aXRjaCAoZGlyZWN0aW9uKSB7XG4gICAgICAgIFx0ICAgIGNhc2UgLTEgOlxuICAgICAgICBcdFx0Y3Vycl9lbmQgPSBjdXJyX3N0YXJ0ICsgc3BhbjtcbiAgICAgICAgXHRcdGJyZWFrO1xuICAgICAgICBcdCAgICBjYXNlIDEgOlxuICAgICAgICBcdFx0Y3Vycl9lbmQgPSBjdXJyX3N0YXJ0ICsgc3BhbjtcbiAgICAgICAgXHRcdGJyZWFrO1xuICAgICAgICBcdCAgICBjYXNlIDAgOlxuICAgICAgICBcdFx0Y3Vycl9lbmQgPSBvbGREb21haW5bMV0gKyBvbGREb21haW5bMF0gLSBjdXJyX3N0YXJ0O1xuICAgICAgICBcdFx0YnJlYWs7XG4gICAgXHQgICAgfVxuXG4gICAgXHQgICAgdmFyIGN1cnJEb21haW4gPSBbY3Vycl9zdGFydCwgY3Vycl9lbmRdO1xuICAgIFx0ICAgIHhTY2FsZS5kb21haW4oY3VyckRvbWFpbik7XG4gICAgXHQgICAgX21vdmUoeFNjYWxlKTtcbiAgICBcdCAgICB4Kz0wLjAyO1xuICAgIFx0ICAgIHJldHVybiB4PjE7XG4gICAgXHR9KTtcbiAgICB9O1xuXG5cbiAgICB2YXIgX21vdmVfY2JhayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGN1cnJEb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG4gICAgXHR0cmFja192aXMuZnJvbSh+fmN1cnJEb21haW5bMF0pO1xuICAgIFx0dHJhY2tfdmlzLnRvKH5+Y3VyckRvbWFpblsxXSk7XG5cbiAgICBcdGZvciAodmFyIGkgPSAwOyBpIDwgdHJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgXHQgICAgdmFyIHRyYWNrID0gdHJhY2tzW2ldO1xuICAgIFx0ICAgIF91cGRhdGVfdHJhY2sodHJhY2ssIGxvYyk7XG4gICAgXHR9XG4gICAgfTtcbiAgICAvLyBUaGUgZGVmZXJyZWRfY2JhayBpcyBkZWZlcnJlZCBhdCBsZWFzdCB0aGlzIGFtb3VudCBvZiB0aW1lIG9yIHJlLXNjaGVkdWxlZCBpZiBkZWZlcnJlZCBpcyBjYWxsZWQgYmVmb3JlXG4gICAgdmFyIF9kZWZlcnJlZCA9IGRlZmVyQ2FuY2VsKF9tb3ZlX2NiYWssIDMwMCk7XG5cbiAgICAvLyBhcGkubWV0aG9kKCd1cGRhdGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgLy8gXHRfbW92ZSgpO1xuICAgIC8vIH0pO1xuXG4gICAgdmFyIF9tb3ZlID0gZnVuY3Rpb24gKG5ld194U2NhbGUpIHtcbiAgICBcdGlmIChuZXdfeFNjYWxlICE9PSB1bmRlZmluZWQgJiYgZHJhZ19hbGxvd2VkKSB7XG4gICAgXHQgICAgem9vbUV2ZW50SGFuZGxlci54KG5ld194U2NhbGUpO1xuICAgIFx0fVxuXG4gICAgXHQvLyBTaG93IHRoZSByZWQgYmFycyBhdCB0aGUgbGltaXRzXG4gICAgXHR2YXIgZG9tYWluID0geFNjYWxlLmRvbWFpbigpO1xuICAgIFx0aWYgKGRvbWFpblswXSA8PSAobGltaXRzLm1pbiArIDUpKSB7XG4gICAgXHQgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiXzVwY2FwXCIpXG4gICAgXHRcdC5hdHRyKFwid2lkdGhcIiwgY2FwX3dpZHRoKVxuICAgIFx0XHQudHJhbnNpdGlvbigpXG4gICAgXHRcdC5kdXJhdGlvbigyMDApXG4gICAgXHRcdC5hdHRyKFwid2lkdGhcIiwgMCk7XG4gICAgXHR9XG5cbiAgICBcdGlmIChkb21haW5bMV0gPj0gKGxpbWl0cy5tYXgpLTUpIHtcbiAgICBcdCAgICBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkICsgXCJfM3BjYXBcIilcbiAgICBcdFx0LmF0dHIoXCJ3aWR0aFwiLCBjYXBfd2lkdGgpXG4gICAgXHRcdC50cmFuc2l0aW9uKClcbiAgICBcdFx0LmR1cmF0aW9uKDIwMClcbiAgICBcdFx0LmF0dHIoXCJ3aWR0aFwiLCAwKTtcbiAgICBcdH1cblxuXG4gICAgXHQvLyBBdm9pZCBtb3ZpbmcgcGFzdCB0aGUgbGltaXRzXG4gICAgXHRpZiAoZG9tYWluWzBdIDwgbGltaXRzLm1pbikge1xuICAgIFx0ICAgIHpvb21FdmVudEhhbmRsZXIudHJhbnNsYXRlKFt6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZSgpWzBdIC0geFNjYWxlKGxpbWl0cy5taW4pICsgeFNjYWxlLnJhbmdlKClbMF0sIHpvb21FdmVudEhhbmRsZXIudHJhbnNsYXRlKClbMV1dKTtcbiAgICBcdH0gZWxzZSBpZiAoZG9tYWluWzFdID4gbGltaXRzLm1heCkge1xuICAgIFx0ICAgIHpvb21FdmVudEhhbmRsZXIudHJhbnNsYXRlKFt6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZSgpWzBdIC0geFNjYWxlKGxpbWl0cy5tYXgpICsgeFNjYWxlLnJhbmdlKClbMV0sIHpvb21FdmVudEhhbmRsZXIudHJhbnNsYXRlKClbMV1dKTtcbiAgICBcdH1cblxuICAgIFx0X2RlZmVycmVkKCk7XG5cbiAgICBcdGZvciAodmFyIGkgPSAwOyBpIDwgdHJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgXHQgICAgdmFyIHRyYWNrID0gdHJhY2tzW2ldO1xuICAgIFx0ICAgIHRyYWNrLmRpc3BsYXkoKS5tb3Zlci5jYWxsKHRyYWNrKTtcbiAgICBcdH1cbiAgICB9O1xuXG4gICAgLy8gYXBpLm1ldGhvZCh7XG4gICAgLy8gXHRhbGxvd19kcmFnIDogYXBpX2FsbG93X2RyYWcsXG4gICAgLy8gXHR3aWR0aCAgICAgIDogYXBpX3dpZHRoLFxuICAgIC8vIFx0YWRkX3RyYWNrICA6IGFwaV9hZGRfdHJhY2ssXG4gICAgLy8gXHRyZW9yZGVyICAgIDogYXBpX3Jlb3JkZXIsXG4gICAgLy8gXHR6b29tICAgICAgIDogYXBpX3pvb20sXG4gICAgLy8gXHRsZWZ0ICAgICAgIDogYXBpX2xlZnQsXG4gICAgLy8gXHRyaWdodCAgICAgIDogYXBpX3JpZ2h0LFxuICAgIC8vIFx0c3RhcnQgICAgICA6IGFwaV9zdGFydFxuICAgIC8vIH0pO1xuXG4gICAgLy8gQXV4aWxpYXIgZnVuY3Rpb25zXG4gICAgZnVuY3Rpb24gbW92ZV90b19mcm9udCAoZWxlbSkge1xuICAgICAgICBlbGVtLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQoZWxlbSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRyYWNrX3Zpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGJvYXJkO1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xudmFyIHNwaW5uZXIgPSByZXF1aXJlIChcIi4vc3Bpbm5lci5qc1wiKSgpO1xuXG50bnRfZGF0YSA9IHt9O1xuXG50bnRfZGF0YS5zeW5jID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHVwZGF0ZV90cmFjayA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICB2YXIgdHJhY2sgPSB0aGlzO1xuICAgICAgICB0cmFjay5kYXRhKCkuZWxlbWVudHModXBkYXRlX3RyYWNrLnJldHJpZXZlcigpLmNhbGwodHJhY2ssIG9iai5sb2MpKTtcbiAgICAgICAgb2JqLm9uX3N1Y2Nlc3MoKTtcbiAgICB9O1xuXG4gICAgYXBpanMgKHVwZGF0ZV90cmFjaylcbiAgICAgICAgLmdldHNldCAoJ2VsZW1lbnRzJywgW10pXG4gICAgICAgIC5nZXRzZXQgKCdyZXRyaWV2ZXInLCBmdW5jdGlvbiAoKSB7fSk7XG5cbiAgICByZXR1cm4gdXBkYXRlX3RyYWNrO1xufTtcblxudG50X2RhdGEuYXN5bmMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHVwZGF0ZV90cmFjayA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgc3Bpbm5lci5vbi5jYWxsKHRyYWNrKTtcbiAgICAgICAgdXBkYXRlX3RyYWNrLnJldHJpZXZlcigpLmNhbGwodHJhY2ssIG9iai5sb2MpXG4gICAgICAgICAgICAudGhlbiAoZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICB0cmFjay5kYXRhKCkuZWxlbWVudHMocmVzcCk7XG4gICAgICAgICAgICAgICAgb2JqLm9uX3N1Y2Nlc3MoKTtcbiAgICAgICAgICAgICAgICBzcGlubmVyLm9mZi5jYWxsKHRyYWNrKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgYXBpID0gYXBpanMgKHVwZGF0ZV90cmFjaylcbiAgICAgICAgLmdldHNldCAoJ2VsZW1lbnRzJywgW10pXG4gICAgICAgIC5nZXRzZXQgKCdyZXRyaWV2ZXInKTtcblxuICAgIHJldHVybiB1cGRhdGVfdHJhY2s7XG59O1xuXG5cbi8vIEEgcHJlZGVmaW5lZCB0cmFjayBkaXNwbGF5aW5nIG5vIGV4dGVybmFsIGRhdGFcbi8vIGl0IGlzIHVzZWQgZm9yIGxvY2F0aW9uIGFuZCBheGlzIHRyYWNrcyBmb3IgZXhhbXBsZVxudG50X2RhdGEuZW1wdHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHVwZGF0ZXIgPSB0bnRfZGF0YS5zeW5jKCk7XG5cbiAgICByZXR1cm4gdXBkYXRlcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRudF9kYXRhO1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xudmFyIGxheW91dCA9IHJlcXVpcmUoXCIuL2xheW91dC5qc1wiKTtcblxuLy8gRkVBVFVSRSBWSVNcbi8vIHZhciBib2FyZCA9IHt9O1xuLy8gYm9hcmQudHJhY2sgPSB7fTtcbnZhciB0bnRfZmVhdHVyZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZGlzcGF0Y2ggPSBkMy5kaXNwYXRjaCAoXCJjbGlja1wiLCBcImRibGNsaWNrXCIsIFwibW91c2VvdmVyXCIsIFwibW91c2VvdXRcIik7XG5cbiAgICAvLy8vLy8gVmFycyBleHBvc2VkIGluIHRoZSBBUElcbiAgICB2YXIgY29uZmlnID0ge1xuICAgICAgICBjcmVhdGUgICA6IGZ1bmN0aW9uICgpIHt0aHJvdyBcImNyZWF0ZV9lbGVtIGlzIG5vdCBkZWZpbmVkIGluIHRoZSBiYXNlIGZlYXR1cmUgb2JqZWN0XCI7fSxcbiAgICAgICAgbW92ZSAgICA6IGZ1bmN0aW9uICgpIHt0aHJvdyBcIm1vdmVfZWxlbSBpcyBub3QgZGVmaW5lZCBpbiB0aGUgYmFzZSBmZWF0dXJlIG9iamVjdFwiO30sXG4gICAgICAgIGRpc3RyaWJ1dGUgIDogZnVuY3Rpb24gKCkge30sXG4gICAgICAgIGZpeGVkICAgOiBmdW5jdGlvbiAoKSB7fSxcbiAgICAgICAgLy9sYXlvdXQgICA6IGZ1bmN0aW9uICgpIHt9LFxuICAgICAgICBpbmRleCAgICA6IHVuZGVmaW5lZCxcbiAgICAgICAgbGF5b3V0ICAgOiBsYXlvdXQuaWRlbnRpdHkoKSxcbiAgICAgICAgY29sb3IgOiAnIzAwMCcsXG4gICAgICAgIHNjYWxlIDogdW5kZWZpbmVkXG4gICAgfTtcblxuXG4gICAgLy8gVGhlIHJldHVybmVkIG9iamVjdFxuICAgIHZhciBmZWF0dXJlID0ge307XG5cbiAgICB2YXIgcmVzZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgIFx0dHJhY2suZy5zZWxlY3RBbGwoXCIudG50X2VsZW1cIikucmVtb3ZlKCk7XG4gICAgICAgIHRyYWNrLmcuc2VsZWN0QWxsKFwiLnRudF9ndWlkZXJcIikucmVtb3ZlKCk7XG4gICAgfTtcblxuICAgIHZhciBpbml0ID0gZnVuY3Rpb24gKHdpZHRoKSB7XG4gICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG5cbiAgICAgICAgdHJhY2suZ1xuICAgICAgICAgICAgLmFwcGVuZCAoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0ciAoXCJ4XCIsIDUpXG4gICAgICAgICAgICAuYXR0ciAoXCJ5XCIsIDEyKVxuICAgICAgICAgICAgLmF0dHIgKFwiZm9udC1zaXplXCIsIDExKVxuICAgICAgICAgICAgLmF0dHIgKFwiZmlsbFwiLCBcImdyZXlcIilcbiAgICAgICAgICAgIC50ZXh0ICh0cmFjay5sYWJlbCgpKTtcblxuICAgICAgICBjb25maWcuZml4ZWQuY2FsbCh0cmFjaywgd2lkdGgpO1xuICAgIH07XG5cbiAgICB2YXIgcGxvdCA9IGZ1bmN0aW9uIChuZXdfZWxlbXMsIHRyYWNrLCB4U2NhbGUpIHtcbiAgICAgICAgbmV3X2VsZW1zLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgICAgIGlmIChkMy5ldmVudC5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGlzcGF0Y2guY2xpY2suY2FsbCh0aGlzLCBkLCBpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIG5ld19lbGVtcy5vbihcIm1vdXNlb3ZlclwiLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICAgICAgaWYgKGQzLmV2ZW50LmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXNwYXRjaC5tb3VzZW92ZXIuY2FsbCh0aGlzLCBkLCBpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIG5ld19lbGVtcy5vbihcImRibGNsaWNrXCIsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgICAgICBpZiAoZDMuZXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpc3BhdGNoLmRibGNsaWNrLmNhbGwodGhpcywgZCwgaSk7XG4gICAgICAgIH0pO1xuICAgICAgICBuZXdfZWxlbXMub24oXCJtb3VzZW91dFwiLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICAgICAgaWYgKGQzLmV2ZW50LmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXNwYXRjaC5tb3VzZW91dC5jYWxsKHRoaXMsIGQsIGkpO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gbmV3X2VsZW0gaXMgYSBnIGVsZW1lbnQgdGhlIGZlYXR1cmUgaXMgaW5zZXJ0ZWRcbiAgICAgICAgY29uZmlnLmNyZWF0ZS5jYWxsKHRyYWNrLCBuZXdfZWxlbXMsIHhTY2FsZSk7XG4gICAgfTtcblxuICAgIHZhciB1cGRhdGUgPSBmdW5jdGlvbiAobG9jLCBmaWVsZCkge1xuICAgICAgICB2YXIgdHJhY2sgPSB0aGlzO1xuICAgICAgICB2YXIgc3ZnX2cgPSB0cmFjay5nO1xuXG4gICAgICAgIHZhciBlbGVtZW50cyA9IHRyYWNrLmRhdGEoKS5lbGVtZW50cygpO1xuXG4gICAgICAgIGlmIChmaWVsZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBlbGVtZW50cyA9IGVsZW1lbnRzW2ZpZWxkXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBkYXRhX2VsZW1zID0gY29uZmlnLmxheW91dC5jYWxsKHRyYWNrLCBlbGVtZW50cyk7XG5cblxuICAgICAgICBpZiAoZGF0YV9lbGVtcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdmlzX3NlbDtcbiAgICAgICAgdmFyIHZpc19lbGVtcztcbiAgICAgICAgaWYgKGZpZWxkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHZpc19zZWwgPSBzdmdfZy5zZWxlY3RBbGwoXCIudG50X2VsZW1fXCIgKyBmaWVsZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2aXNfc2VsID0gc3ZnX2cuc2VsZWN0QWxsKFwiLnRudF9lbGVtXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZy5pbmRleCkgeyAvLyBJbmRleGluZyBieSBmaWVsZFxuICAgICAgICAgICAgdmlzX2VsZW1zID0gdmlzX3NlbFxuICAgICAgICAgICAgICAgIC5kYXRhKGRhdGFfZWxlbXMsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb25maWcuaW5kZXgoZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHsgLy8gSW5kZXhpbmcgYnkgcG9zaXRpb24gaW4gYXJyYXlcbiAgICAgICAgICAgIHZpc19lbGVtcyA9IHZpc19zZWxcbiAgICAgICAgICAgICAgICAuZGF0YShkYXRhX2VsZW1zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbmZpZy5kaXN0cmlidXRlLmNhbGwodHJhY2ssIHZpc19lbGVtcywgY29uZmlnLnNjYWxlKTtcblxuICAgIFx0dmFyIG5ld19lbGVtID0gdmlzX2VsZW1zXG4gICAgXHQgICAgLmVudGVyKCk7XG5cbiAgICBcdG5ld19lbGVtXG4gICAgXHQgICAgLmFwcGVuZChcImdcIilcbiAgICBcdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X2VsZW1cIilcbiAgICBcdCAgICAuY2xhc3NlZChcInRudF9lbGVtX1wiICsgZmllbGQsIGZpZWxkKVxuICAgIFx0ICAgIC5jYWxsKGZlYXR1cmUucGxvdCwgdHJhY2ssIGNvbmZpZy5zY2FsZSk7XG5cbiAgICBcdHZpc19lbGVtc1xuICAgIFx0ICAgIC5leGl0KClcbiAgICBcdCAgICAucmVtb3ZlKCk7XG4gICAgfTtcblxuICAgIHZhciBtb3ZlciA9IGZ1bmN0aW9uIChmaWVsZCkge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICBcdHZhciBzdmdfZyA9IHRyYWNrLmc7XG4gICAgXHR2YXIgZWxlbXM7XG4gICAgXHQvLyBUT0RPOiBJcyBzZWxlY3RpbmcgdGhlIGVsZW1lbnRzIHRvIG1vdmUgdG9vIHNsb3c/XG4gICAgXHQvLyBJdCB3b3VsZCBiZSBuaWNlIHRvIHByb2ZpbGVcbiAgICBcdGlmIChmaWVsZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgXHQgICAgZWxlbXMgPSBzdmdfZy5zZWxlY3RBbGwoXCIudG50X2VsZW1fXCIgKyBmaWVsZCk7XG4gICAgXHR9IGVsc2Uge1xuICAgIFx0ICAgIGVsZW1zID0gc3ZnX2cuc2VsZWN0QWxsKFwiLnRudF9lbGVtXCIpO1xuICAgIFx0fVxuXG4gICAgXHRjb25maWcubW92ZS5jYWxsKHRoaXMsIGVsZW1zKTtcbiAgICB9O1xuXG4gICAgdmFyIG10ZiA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIGVsZW0ucGFyZW50Tm9kZS5hcHBlbmRDaGlsZChlbGVtKTtcbiAgICB9O1xuXG4gICAgdmFyIG1vdmVfdG9fZnJvbnQgPSBmdW5jdGlvbiAoZmllbGQpIHtcbiAgICAgICAgaWYgKGZpZWxkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgc3ZnX2cgPSB0cmFjay5nO1xuICAgICAgICAgICAgc3ZnX2cuc2VsZWN0QWxsKFwiLnRudF9lbGVtX1wiICsgZmllbGQpXG4gICAgICAgICAgICAgICAgLmVhY2goIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgbXRmKHRoaXMpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vIEFQSVxuICAgIGFwaWpzIChmZWF0dXJlKVxuICAgIFx0LmdldHNldCAoY29uZmlnKVxuICAgIFx0Lm1ldGhvZCAoe1xuICAgIFx0ICAgIHJlc2V0ICA6IHJlc2V0LFxuICAgIFx0ICAgIHBsb3QgICA6IHBsb3QsXG4gICAgXHQgICAgdXBkYXRlIDogdXBkYXRlLFxuICAgIFx0ICAgIG1vdmVyICAgOiBtb3ZlcixcbiAgICBcdCAgICBpbml0ICAgOiBpbml0LFxuICAgIFx0ICAgIG1vdmVfdG9fZnJvbnQgOiBtb3ZlX3RvX2Zyb250XG4gICAgXHR9KTtcblxuICAgIHJldHVybiBkMy5yZWJpbmQoZmVhdHVyZSwgZGlzcGF0Y2gsIFwib25cIik7XG59O1xuXG50bnRfZmVhdHVyZS5jb21wb3NpdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRpc3BsYXlzID0ge307XG4gICAgdmFyIGRpc3BsYXlfb3JkZXIgPSBbXTtcblxuICAgIHZhciBmZWF0dXJlcyA9IHt9O1xuXG4gICAgdmFyIHJlc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICBcdGZvciAodmFyIGk9MDsgaTxkaXNwbGF5cy5sZW5ndGg7IGkrKykge1xuICAgIFx0ICAgIGRpc3BsYXlzW2ldLnJlc2V0LmNhbGwodHJhY2spO1xuICAgIFx0fVxuICAgIH07XG5cbiAgICB2YXIgaW5pdCA9IGZ1bmN0aW9uICh3aWR0aCkge1xuICAgICAgICB2YXIgdHJhY2sgPSB0aGlzO1xuICAgICAgICBmb3IgKHZhciBkaXNwbGF5IGluIGRpc3BsYXlzKSB7XG4gICAgICAgICAgICBpZiAoZGlzcGxheXMuaGFzT3duUHJvcGVydHkoZGlzcGxheSkpIHtcbiAgICAgICAgICAgICAgICBkaXNwbGF5c1tkaXNwbGF5XS5zY2FsZShmZWF0dXJlcy5zY2FsZSgpKTtcbiAgICAgICAgICAgICAgICBkaXNwbGF5c1tkaXNwbGF5XS5pbml0LmNhbGwodHJhY2ssIHdpZHRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgdXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICBcdGZvciAodmFyIGk9MDsgaTxkaXNwbGF5X29yZGVyLmxlbmd0aDsgaSsrKSB7XG4gICAgXHQgICAgZGlzcGxheXNbZGlzcGxheV9vcmRlcltpXV0udXBkYXRlLmNhbGwodHJhY2ssIHVuZGVmaW5lZCwgZGlzcGxheV9vcmRlcltpXSk7XG4gICAgXHQgICAgZGlzcGxheXNbZGlzcGxheV9vcmRlcltpXV0ubW92ZV90b19mcm9udC5jYWxsKHRyYWNrLCBkaXNwbGF5X29yZGVyW2ldKTtcbiAgICBcdH1cbiAgICAgICAgLy8gZm9yICh2YXIgZGlzcGxheSBpbiBkaXNwbGF5cykge1xuICAgICAgICAvLyAgICAgaWYgKGRpc3BsYXlzLmhhc093blByb3BlcnR5KGRpc3BsYXkpKSB7XG4gICAgICAgIC8vICAgICAgICAgZGlzcGxheXNbZGlzcGxheV0udXBkYXRlLmNhbGwodHJhY2ssIHhTY2FsZSwgZGlzcGxheSk7XG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vIH1cbiAgICB9O1xuXG4gICAgdmFyIG1vdmVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdHJhY2sgPSB0aGlzO1xuICAgICAgICBmb3IgKHZhciBkaXNwbGF5IGluIGRpc3BsYXlzKSB7XG4gICAgICAgICAgICBpZiAoZGlzcGxheXMuaGFzT3duUHJvcGVydHkoZGlzcGxheSkpIHtcbiAgICAgICAgICAgICAgICBkaXNwbGF5c1tkaXNwbGF5XS5tb3Zlci5jYWxsKHRyYWNrLCBkaXNwbGF5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgYWRkID0gZnVuY3Rpb24gKGtleSwgZGlzcGxheSkge1xuICAgIFx0ZGlzcGxheXNba2V5XSA9IGRpc3BsYXk7XG4gICAgXHRkaXNwbGF5X29yZGVyLnB1c2goa2V5KTtcbiAgICBcdHJldHVybiBmZWF0dXJlcztcbiAgICB9O1xuXG4gICAgdmFyIGdldF9kaXNwbGF5cyA9IGZ1bmN0aW9uICgpIHtcbiAgICBcdHZhciBkcyA9IFtdO1xuICAgIFx0Zm9yICh2YXIgaT0wOyBpPGRpc3BsYXlfb3JkZXIubGVuZ3RoOyBpKyspIHtcbiAgICBcdCAgICBkcy5wdXNoKGRpc3BsYXlzW2Rpc3BsYXlfb3JkZXJbaV1dKTtcbiAgICBcdH1cbiAgICBcdHJldHVybiBkcztcbiAgICB9O1xuXG4gICAgLy8gQVBJXG4gICAgYXBpanMgKGZlYXR1cmVzKVxuICAgICAgICAuZ2V0c2V0KFwic2NhbGVcIilcbiAgICBcdC5tZXRob2QgKHtcbiAgICBcdCAgICByZXNldCAgOiByZXNldCxcbiAgICBcdCAgICB1cGRhdGUgOiB1cGRhdGUsXG4gICAgXHQgICAgbW92ZXIgICA6IG1vdmVyLFxuICAgIFx0ICAgIGluaXQgICA6IGluaXQsXG4gICAgXHQgICAgYWRkICAgIDogYWRkLFxuICAgIFx0ICAgIGRpc3BsYXlzIDogZ2V0X2Rpc3BsYXlzXG4gICAgXHR9KTtcblxuICAgIHJldHVybiBmZWF0dXJlcztcbn07XG5cbnRudF9mZWF0dXJlLmFyZWEgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZS5saW5lKCk7XG4gICAgdmFyIGxpbmUgPSBmZWF0dXJlLmxpbmUoKTtcblxuICAgIHZhciBhcmVhID0gZDMuc3ZnLmFyZWEoKVxuICAgIFx0LmludGVycG9sYXRlKGxpbmUuaW50ZXJwb2xhdGUoKSlcbiAgICBcdC50ZW5zaW9uKGZlYXR1cmUudGVuc2lvbigpKTtcblxuICAgIHZhciBkYXRhX3BvaW50cztcblxuICAgIHZhciBsaW5lX2NyZWF0ZSA9IGZlYXR1cmUuY3JlYXRlKCk7IC8vIFdlICdzYXZlJyBsaW5lIGNyZWF0aW9uXG5cbiAgICBmZWF0dXJlLmNyZWF0ZSAoZnVuY3Rpb24gKHBvaW50cykge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgdmFyIHhTY2FsZSA9IGZlYXR1cmUuc2NhbGUoKTtcblxuICAgIFx0aWYgKGRhdGFfcG9pbnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICBcdCAgICB0cmFjay5nLnNlbGVjdChcInBhdGhcIikucmVtb3ZlKCk7XG4gICAgXHR9XG5cbiAgICBcdGxpbmVfY3JlYXRlLmNhbGwodHJhY2ssIHBvaW50cywgeFNjYWxlKTtcblxuICAgIFx0YXJlYVxuICAgIFx0ICAgIC54KGxpbmUueCgpKVxuICAgIFx0ICAgIC55MShsaW5lLnkoKSlcbiAgICBcdCAgICAueTAodHJhY2suaGVpZ2h0KCkpO1xuXG4gICAgXHRkYXRhX3BvaW50cyA9IHBvaW50cy5kYXRhKCk7XG4gICAgXHRwb2ludHMucmVtb3ZlKCk7XG5cbiAgICBcdHRyYWNrLmdcbiAgICBcdCAgICAuYXBwZW5kKFwicGF0aFwiKVxuICAgIFx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfYXJlYVwiKVxuICAgIFx0ICAgIC5jbGFzc2VkKFwidG50X2VsZW1cIiwgdHJ1ZSlcbiAgICBcdCAgICAuZGF0dW0oZGF0YV9wb2ludHMpXG4gICAgXHQgICAgLmF0dHIoXCJkXCIsIGFyZWEpXG4gICAgXHQgICAgLmF0dHIoXCJmaWxsXCIsIGQzLnJnYihmZWF0dXJlLmNvbG9yKCkpLmJyaWdodGVyKCkpO1xuICAgIH0pO1xuXG4gICAgdmFyIGxpbmVfbW92ZSA9IGZlYXR1cmUubW92ZSgpO1xuICAgIGZlYXR1cmUubW92ZSAoZnVuY3Rpb24gKHBhdGgpIHtcbiAgICBcdHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIHZhciB4U2NhbGUgPSBmZWF0dXJlLnNjYWxlKCk7XG4gICAgXHRsaW5lX21vdmUuY2FsbCh0cmFjaywgcGF0aCwgeFNjYWxlKTtcblxuICAgIFx0YXJlYS54KGxpbmUueCgpKTtcbiAgICBcdHRyYWNrLmdcbiAgICBcdCAgICAuc2VsZWN0KFwiLnRudF9hcmVhXCIpXG4gICAgXHQgICAgLmRhdHVtKGRhdGFfcG9pbnRzKVxuICAgIFx0ICAgIC5hdHRyKFwiZFwiLCBhcmVhKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xuXG59O1xuXG50bnRfZmVhdHVyZS5saW5lID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBmZWF0dXJlID0gdG50X2ZlYXR1cmUoKTtcblxuICAgIHZhciB4ID0gZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIGQucG9zO1xuICAgIH07XG4gICAgdmFyIHkgPSBmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gZC52YWw7XG4gICAgfTtcbiAgICB2YXIgdGVuc2lvbiA9IDAuNztcbiAgICB2YXIgeVNjYWxlID0gZDMuc2NhbGUubGluZWFyKCk7XG4gICAgdmFyIGxpbmUgPSBkMy5zdmcubGluZSgpXG4gICAgICAgIC5pbnRlcnBvbGF0ZShcImJhc2lzXCIpO1xuXG4gICAgLy8gbGluZSBnZXR0ZXIuIFRPRE86IFNldHRlcj9cbiAgICBmZWF0dXJlLmxpbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBsaW5lO1xuICAgIH07XG5cbiAgICBmZWF0dXJlLnggPSBmdW5jdGlvbiAoY2Jhaykge1xuICAgIFx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgXHQgICAgcmV0dXJuIHg7XG4gICAgXHR9XG4gICAgXHR4ID0gY2JhaztcbiAgICBcdHJldHVybiBmZWF0dXJlO1xuICAgIH07XG5cbiAgICBmZWF0dXJlLnkgPSBmdW5jdGlvbiAoY2Jhaykge1xuICAgIFx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgXHQgICAgcmV0dXJuIHk7XG4gICAgXHR9XG4gICAgXHR5ID0gY2JhaztcbiAgICBcdHJldHVybiBmZWF0dXJlO1xuICAgIH07XG5cbiAgICBmZWF0dXJlLnRlbnNpb24gPSBmdW5jdGlvbiAodCkge1xuICAgIFx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgXHQgICAgcmV0dXJuIHRlbnNpb247XG4gICAgXHR9XG4gICAgXHR0ZW5zaW9uID0gdDtcbiAgICBcdHJldHVybiBmZWF0dXJlO1xuICAgIH07XG5cbiAgICB2YXIgZGF0YV9wb2ludHM7XG5cbiAgICAvLyBGb3Igbm93LCBjcmVhdGUgaXMgYSBvbmUtb2ZmIGV2ZW50XG4gICAgLy8gVE9ETzogTWFrZSBpdCB3b3JrIHdpdGggcGFydGlhbCBwYXRocywgaWUuIGNyZWF0aW5nIGFuZCBkaXNwbGF5aW5nIG9ubHkgdGhlIHBhdGggdGhhdCBpcyBiZWluZyBkaXNwbGF5ZWRcbiAgICBmZWF0dXJlLmNyZWF0ZSAoZnVuY3Rpb24gKHBvaW50cykge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgdmFyIHhTY2FsZSA9IGZlYXR1cmUuc2NhbGUoKTtcblxuICAgIFx0aWYgKGRhdGFfcG9pbnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICBcdCAgICAvLyByZXR1cm47XG4gICAgXHQgICAgdHJhY2suZy5zZWxlY3QoXCJwYXRoXCIpLnJlbW92ZSgpO1xuICAgIFx0fVxuXG4gICAgXHRsaW5lXG4gICAgXHQgICAgLnRlbnNpb24odGVuc2lvbilcbiAgICBcdCAgICAueChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUoeChkKSk7XG4gICAgXHQgICAgfSlcbiAgICBcdCAgICAueShmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cmFjay5oZWlnaHQoKSAtIHlTY2FsZSh5KGQpKTtcbiAgICBcdCAgICB9KTtcblxuICAgIFx0ZGF0YV9wb2ludHMgPSBwb2ludHMuZGF0YSgpO1xuICAgIFx0cG9pbnRzLnJlbW92ZSgpO1xuXG4gICAgXHR5U2NhbGVcbiAgICBcdCAgICAuZG9tYWluKFswLCAxXSlcbiAgICBcdCAgICAvLyAuZG9tYWluKFswLCBkMy5tYXgoZGF0YV9wb2ludHMsIGZ1bmN0aW9uIChkKSB7XG4gICAgXHQgICAgLy8gXHRyZXR1cm4geShkKTtcbiAgICBcdCAgICAvLyB9KV0pXG4gICAgXHQgICAgLnJhbmdlKFswLCB0cmFjay5oZWlnaHQoKSAtIDJdKTtcblxuICAgIFx0dHJhY2suZ1xuICAgIFx0ICAgIC5hcHBlbmQoXCJwYXRoXCIpXG4gICAgXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9lbGVtXCIpXG4gICAgXHQgICAgLmF0dHIoXCJkXCIsIGxpbmUoZGF0YV9wb2ludHMpKVxuICAgIFx0ICAgIC5zdHlsZShcInN0cm9rZVwiLCBmZWF0dXJlLmNvbG9yKCkpXG4gICAgXHQgICAgLnN0eWxlKFwic3Ryb2tlLXdpZHRoXCIsIDQpXG4gICAgXHQgICAgLnN0eWxlKFwiZmlsbFwiLCBcIm5vbmVcIik7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLm1vdmUgKGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgICAgICB2YXIgeFNjYWxlID0gZmVhdHVyZS5zY2FsZSgpO1xuXG4gICAgXHRsaW5lLngoZnVuY3Rpb24gKGQpIHtcbiAgICBcdCAgICByZXR1cm4geFNjYWxlKHgoZCkpO1xuICAgIFx0fSk7XG4gICAgXHR0cmFjay5nLnNlbGVjdChcInBhdGhcIilcbiAgICBcdCAgICAuYXR0cihcImRcIiwgbGluZShkYXRhX3BvaW50cykpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS5jb25zZXJ2YXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vICdJbmhlcml0JyBmcm9tIGZlYXR1cmUuYXJlYVxuICAgICAgICB2YXIgZmVhdHVyZSA9IHRudF9mZWF0dXJlLmFyZWEoKTtcblxuICAgICAgICB2YXIgYXJlYV9jcmVhdGUgPSBmZWF0dXJlLmNyZWF0ZSgpOyAvLyBXZSAnc2F2ZScgYXJlYSBjcmVhdGlvblxuICAgICAgICBmZWF0dXJlLmNyZWF0ZSAgKGZ1bmN0aW9uIChwb2ludHMpIHtcbiAgICAgICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIHhTY2FsZSA9IGZlYXR1cmUuc2NhbGUoKTtcbiAgICAgICAgXHRhcmVhX2NyZWF0ZS5jYWxsKHRyYWNrLCBkMy5zZWxlY3QocG9pbnRzWzBdWzBdKSwgeFNjYWxlKTtcbiAgICAgICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbnRudF9mZWF0dXJlLmVuc2VtYmwgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gJ0luaGVyaXQnIGZyb20gYm9hcmQudHJhY2suZmVhdHVyZVxuICAgIHZhciBmZWF0dXJlID0gdG50X2ZlYXR1cmUoKTtcblxuICAgIHZhciBjb2xvcjIgPSBcIiM3RkZGMDBcIjtcbiAgICB2YXIgY29sb3IzID0gXCIjMDBCQjAwXCI7XG5cbiAgICBmZWF0dXJlLmZpeGVkIChmdW5jdGlvbiAod2lkdGgpIHtcbiAgICBcdHZhciB0cmFjayA9IHRoaXM7XG4gICAgXHR2YXIgaGVpZ2h0X29mZnNldCA9IH5+KHRyYWNrLmhlaWdodCgpIC0gKHRyYWNrLmhlaWdodCgpICAqIDAuOCkpIC8gMjtcblxuICAgIFx0dHJhY2suZ1xuICAgIFx0ICAgIC5hcHBlbmQoXCJsaW5lXCIpXG4gICAgXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9ndWlkZXJcIilcbiAgICBcdCAgICAuYXR0cihcIngxXCIsIDApXG4gICAgXHQgICAgLmF0dHIoXCJ4MlwiLCB3aWR0aClcbiAgICBcdCAgICAuYXR0cihcInkxXCIsIGhlaWdodF9vZmZzZXQpXG4gICAgXHQgICAgLmF0dHIoXCJ5MlwiLCBoZWlnaHRfb2Zmc2V0KVxuICAgIFx0ICAgIC5zdHlsZShcInN0cm9rZVwiLCBmZWF0dXJlLmNvbG9yKCkpXG4gICAgXHQgICAgLnN0eWxlKFwic3Ryb2tlLXdpZHRoXCIsIDEpO1xuXG4gICAgXHR0cmFjay5nXG4gICAgXHQgICAgLmFwcGVuZChcImxpbmVcIilcbiAgICBcdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X2d1aWRlclwiKVxuICAgIFx0ICAgIC5hdHRyKFwieDFcIiwgMClcbiAgICBcdCAgICAuYXR0cihcIngyXCIsIHdpZHRoKVxuICAgIFx0ICAgIC5hdHRyKFwieTFcIiwgdHJhY2suaGVpZ2h0KCkgLSBoZWlnaHRfb2Zmc2V0KVxuICAgIFx0ICAgIC5hdHRyKFwieTJcIiwgdHJhY2suaGVpZ2h0KCkgLSBoZWlnaHRfb2Zmc2V0KVxuICAgIFx0ICAgIC5zdHlsZShcInN0cm9rZVwiLCBmZWF0dXJlLmNvbG9yKCkpXG4gICAgXHQgICAgLnN0eWxlKFwic3Ryb2tlLXdpZHRoXCIsIDEpO1xuXG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLmNyZWF0ZSAoZnVuY3Rpb24gKG5ld19lbGVtcykge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgdmFyIHhTY2FsZSA9IGZlYXR1cmUuc2NhbGUoKTtcblxuICAgIFx0dmFyIGhlaWdodF9vZmZzZXQgPSB+fih0cmFjay5oZWlnaHQoKSAtICh0cmFjay5oZWlnaHQoKSAgKiAwLjgpKSAvIDI7XG5cbiAgICBcdG5ld19lbGVtc1xuICAgIFx0ICAgIC5hcHBlbmQoXCJyZWN0XCIpXG4gICAgXHQgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhTY2FsZSAoZC5zdGFydCk7XG4gICAgXHQgICAgfSlcbiAgICBcdCAgICAuYXR0cihcInlcIiwgaGVpZ2h0X29mZnNldClcbiAgICAvLyBcdCAgICAuYXR0cihcInJ4XCIsIDMpXG4gICAgLy8gXHQgICAgLmF0dHIoXCJyeVwiLCAzKVxuICAgIFx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgdHJhY2suaGVpZ2h0KCkgLSB+fihoZWlnaHRfb2Zmc2V0ICogMikpXG4gICAgXHQgICAgLmF0dHIoXCJmaWxsXCIsIHRyYWNrLmNvbG9yKCkpXG4gICAgXHQgICAgLnRyYW5zaXRpb24oKVxuICAgIFx0ICAgIC5kdXJhdGlvbig1MDApXG4gICAgXHQgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIFx0XHRpZiAoZC50eXBlID09PSAnaGlnaCcpIHtcbiAgICAgICAgXHRcdCAgICByZXR1cm4gZDMucmdiKGZlYXR1cmUuY29sb3IoKSk7XG4gICAgICAgIFx0XHR9XG4gICAgICAgIFx0XHRpZiAoZC50eXBlID09PSAnbG93Jykge1xuICAgICAgICBcdFx0ICAgIHJldHVybiBkMy5yZ2IoZmVhdHVyZS5jb2xvcjIoKSk7XG4gICAgICAgIFx0XHR9XG4gICAgICAgIFx0XHRyZXR1cm4gZDMucmdiKGZlYXR1cmUuY29sb3IzKCkpO1xuICAgIFx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5kaXN0cmlidXRlIChmdW5jdGlvbiAoYmxvY2tzKSB7XG4gICAgICAgIHZhciB4U2NhbGUgPSBmZWF0dXJlLnNjYWxlKCk7XG4gICAgXHRibG9ja3NcbiAgICBcdCAgICAuc2VsZWN0KFwicmVjdFwiKVxuICAgIFx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuICAgIFx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5tb3ZlIChmdW5jdGlvbiAoYmxvY2tzKSB7XG4gICAgICAgIHZhciB4U2NhbGUgPSBmZWF0dXJlLnNjYWxlKCk7XG4gICAgXHRibG9ja3NcbiAgICBcdCAgICAuc2VsZWN0KFwicmVjdFwiKVxuICAgIFx0ICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUoZC5zdGFydCk7XG4gICAgXHQgICAgfSlcbiAgICBcdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcbiAgICBcdCAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUuY29sb3IyID0gZnVuY3Rpb24gKGNvbCkge1xuICAgIFx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgXHQgICAgcmV0dXJuIGNvbG9yMjtcbiAgICBcdH1cbiAgICBcdGNvbG9yMiA9IGNvbDtcbiAgICBcdHJldHVybiBmZWF0dXJlO1xuICAgIH07XG5cbiAgICBmZWF0dXJlLmNvbG9yMyA9IGZ1bmN0aW9uIChjb2wpIHtcbiAgICBcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIFx0ICAgIHJldHVybiBjb2xvcjM7XG4gICAgXHR9XG4gICAgXHRjb2xvcjMgPSBjb2w7XG4gICAgXHRyZXR1cm4gZmVhdHVyZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS52bGluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAnSW5oZXJpdCcgZnJvbSBmZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChuZXdfZWxlbXMpIHtcbiAgICAgICAgdmFyIHhTY2FsZSA9IGZlYXR1cmUuc2NhbGUoKTtcbiAgICBcdHZhciB0cmFjayA9IHRoaXM7XG4gICAgXHRuZXdfZWxlbXNcbiAgICBcdCAgICAuYXBwZW5kIChcImxpbmVcIilcbiAgICBcdCAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhTY2FsZShmZWF0dXJlLmluZGV4KCkoZCkpO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJ4MlwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUoZmVhdHVyZS5pbmRleCgpKGQpKTtcbiAgICBcdCAgICB9KVxuICAgIFx0ICAgIC5hdHRyKFwieTFcIiwgMClcbiAgICBcdCAgICAuYXR0cihcInkyXCIsIHRyYWNrLmhlaWdodCgpKVxuICAgIFx0ICAgIC5hdHRyKFwic3Ryb2tlXCIsIGZlYXR1cmUuY29sb3IoKSlcbiAgICBcdCAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLCAxKTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZSAoZnVuY3Rpb24gKHZsaW5lcykge1xuICAgICAgICB2YXIgeFNjYWxlID0gZmVhdHVyZS5zY2FsZSgpO1xuICAgIFx0dmxpbmVzXG4gICAgXHQgICAgLnNlbGVjdChcImxpbmVcIilcbiAgICBcdCAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhTY2FsZShmZWF0dXJlLmluZGV4KCkoZCkpO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJ4MlwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUoZmVhdHVyZS5pbmRleCgpKGQpKTtcbiAgICBcdCAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xuXG59O1xuXG50bnRfZmVhdHVyZS5waW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gJ0luaGVyaXQnIGZyb20gYm9hcmQudHJhY2suZmVhdHVyZVxuICAgIHZhciBmZWF0dXJlID0gdG50X2ZlYXR1cmUoKTtcblxuICAgIHZhciB5U2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgIFx0LmRvbWFpbihbMCwwXSlcbiAgICBcdC5yYW5nZShbMCwwXSk7XG5cbiAgICB2YXIgb3B0cyA9IHtcbiAgICAgICAgcG9zIDogZDMuZnVuY3RvcihcInBvc1wiKSxcbiAgICAgICAgdmFsIDogZDMuZnVuY3RvcihcInZhbFwiKSxcbiAgICAgICAgZG9tYWluIDogWzAsMF1cbiAgICB9O1xuXG4gICAgdmFyIHBpbl9iYWxsX3IgPSA1OyAvLyB0aGUgcmFkaXVzIG9mIHRoZSBjaXJjbGUgaW4gdGhlIHBpblxuXG4gICAgYXBpanMoZmVhdHVyZSlcbiAgICAgICAgLmdldHNldChvcHRzKTtcblxuXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChuZXdfcGlucykge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgdmFyIHhTY2FsZSA9IGZlYXR1cmUuc2NhbGUoKTtcbiAgICBcdHlTY2FsZVxuICAgIFx0ICAgIC5kb21haW4oZmVhdHVyZS5kb21haW4oKSlcbiAgICBcdCAgICAucmFuZ2UoW3Bpbl9iYWxsX3IsIHRyYWNrLmhlaWdodCgpLXBpbl9iYWxsX3ItMTBdKTsgLy8gMTAgZm9yIGxhYmVsbGluZ1xuXG4gICAgXHQvLyBwaW5zIGFyZSBjb21wb3NlZCBvZiBsaW5lcywgY2lyY2xlcyBhbmQgbGFiZWxzXG4gICAgXHRuZXdfcGluc1xuICAgIFx0ICAgIC5hcHBlbmQoXCJsaW5lXCIpXG4gICAgXHQgICAgLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgIFx0ICAgIFx0cmV0dXJuIHhTY2FsZShkW29wdHMucG9zKGQsIGkpXSk7XG4gICAgXHQgICAgfSlcbiAgICBcdCAgICAuYXR0cihcInkxXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRyYWNrLmhlaWdodCgpO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJ4MlwiLCBmdW5jdGlvbiAoZCxpKSB7XG4gICAgXHQgICAgXHRyZXR1cm4geFNjYWxlKGRbb3B0cy5wb3MoZCwgaSldKTtcbiAgICBcdCAgICB9KVxuICAgIFx0ICAgIC5hdHRyKFwieTJcIiwgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICBcdCAgICBcdHJldHVybiB0cmFjay5oZWlnaHQoKSAtIHlTY2FsZShkW29wdHMudmFsKGQsIGkpXSk7XG4gICAgXHQgICAgfSlcbiAgICBcdCAgICAuYXR0cihcInN0cm9rZVwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkMy5mdW5jdG9yKGZlYXR1cmUuY29sb3IoKSkoZCk7XG4gICAgICAgICAgICB9KTtcblxuICAgIFx0bmV3X3BpbnNcbiAgICBcdCAgICAuYXBwZW5kKFwiY2lyY2xlXCIpXG4gICAgXHQgICAgLmF0dHIoXCJjeFwiLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUoZFtvcHRzLnBvcyhkLCBpKV0pO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJjeVwiLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cmFjay5oZWlnaHQoKSAtIHlTY2FsZShkW29wdHMudmFsKGQsIGkpXSk7XG4gICAgXHQgICAgfSlcbiAgICBcdCAgICAuYXR0cihcInJcIiwgcGluX2JhbGxfcilcbiAgICBcdCAgICAuYXR0cihcImZpbGxcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZDMuZnVuY3RvcihmZWF0dXJlLmNvbG9yKCkpKGQpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3X3BpbnNcbiAgICAgICAgICAgIC5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcImZvbnQtc2l6ZVwiLCBcIjEzXCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geFNjYWxlKGRbb3B0cy5wb3MoZCwgaSldKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTA7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQubGFiZWwgfHwgXCJcIjtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLmRpc3RyaWJ1dGUgKGZ1bmN0aW9uIChwaW5zKSB7XG4gICAgICAgIHBpbnNcbiAgICAgICAgICAgIC5zZWxlY3QoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAudGV4dChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkLmxhYmVsIHx8IFwiXCI7XG4gICAgICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZShmdW5jdGlvbiAocGlucykge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgdmFyIHhTY2FsZSA9IGZlYXR1cmUuc2NhbGUoKTtcblxuICAgIFx0cGluc1xuICAgIFx0ICAgIC8vLmVhY2gocG9zaXRpb25fcGluX2xpbmUpXG4gICAgXHQgICAgLnNlbGVjdChcImxpbmVcIilcbiAgICBcdCAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhTY2FsZShkW29wdHMucG9zKGQsIGkpXSk7XG4gICAgXHQgICAgfSlcbiAgICBcdCAgICAuYXR0cihcInkxXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIFx0XHRyZXR1cm4gdHJhY2suaGVpZ2h0KCk7XG4gICAgXHQgICAgfSlcbiAgICBcdCAgICAuYXR0cihcIngyXCIsIGZ1bmN0aW9uIChkLGkpIHtcbiAgICAgICAgXHRcdHJldHVybiB4U2NhbGUoZFtvcHRzLnBvcyhkLCBpKV0pO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJ5MlwiLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICBcdFx0cmV0dXJuIHRyYWNrLmhlaWdodCgpIC0geVNjYWxlKGRbb3B0cy52YWwoZCwgaSldKTtcbiAgICBcdCAgICB9KTtcblxuICAgIFx0cGluc1xuICAgIFx0ICAgIC5zZWxlY3QoXCJjaXJjbGVcIilcbiAgICBcdCAgICAuYXR0cihcImN4XCIsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhTY2FsZShkW29wdHMucG9zKGQsIGkpXSk7XG4gICAgXHQgICAgfSlcbiAgICBcdCAgICAuYXR0cihcImN5XCIsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRyYWNrLmhlaWdodCgpIC0geVNjYWxlKGRbb3B0cy52YWwoZCwgaSldKTtcbiAgICBcdCAgICB9KTtcblxuICAgICAgICBwaW5zXG4gICAgICAgICAgICAuc2VsZWN0KFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhTY2FsZShkW29wdHMucG9zKGQsIGkpXSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5sYWJlbCB8fCBcIlwiO1xuICAgICAgICAgICAgfSk7XG5cbiAgICB9KTtcblxuICAgIGZlYXR1cmUuZml4ZWQgKGZ1bmN0aW9uICh3aWR0aCkge1xuICAgICAgICB2YXIgdHJhY2sgPSB0aGlzO1xuICAgICAgICB0cmFjay5nXG4gICAgICAgICAgICAuYXBwZW5kKFwibGluZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCAwKVxuICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCB3aWR0aClcbiAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgdHJhY2suaGVpZ2h0KCkpXG4gICAgICAgICAgICAuYXR0cihcInkyXCIsIHRyYWNrLmhlaWdodCgpKVxuICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlXCIsIFwiYmxhY2tcIilcbiAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZS13aXRoXCIsIFwiMXB4XCIpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS5ibG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyAnSW5oZXJpdCcgZnJvbSBib2FyZC50cmFjay5mZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgYXBpanMoZmVhdHVyZSlcbiAgICBcdC5nZXRzZXQoJ2Zyb20nLCBmdW5jdGlvbiAoZCkge1xuICAgIFx0ICAgIHJldHVybiBkLnN0YXJ0O1xuICAgIFx0fSlcbiAgICBcdC5nZXRzZXQoJ3RvJywgZnVuY3Rpb24gKGQpIHtcbiAgICBcdCAgICByZXR1cm4gZC5lbmQ7XG4gICAgXHR9KTtcblxuICAgIGZlYXR1cmUuY3JlYXRlKGZ1bmN0aW9uIChuZXdfZWxlbXMpIHtcbiAgICBcdHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIHZhciB4U2NhbGUgPSBmZWF0dXJlLnNjYWxlKCk7XG4gICAgXHRuZXdfZWxlbXNcbiAgICBcdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuICAgIFx0ICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICBcdFx0Ly8gVE9ETzogc3RhcnQsIGVuZCBzaG91bGQgYmUgYWRqdXN0YWJsZSB2aWEgdGhlIHRyYWNrcyBBUElcbiAgICAgICAgXHRcdHJldHVybiB4U2NhbGUoZmVhdHVyZS5mcm9tKCkoZCwgaSkpO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJ5XCIsIDApXG4gICAgXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICBcdFx0cmV0dXJuICh4U2NhbGUoZmVhdHVyZS50bygpKGQsIGkpKSAtIHhTY2FsZShmZWF0dXJlLmZyb20oKShkLCBpKSkpO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgdHJhY2suaGVpZ2h0KCkpXG4gICAgXHQgICAgLmF0dHIoXCJmaWxsXCIsIHRyYWNrLmNvbG9yKCkpXG4gICAgXHQgICAgLnRyYW5zaXRpb24oKVxuICAgIFx0ICAgIC5kdXJhdGlvbig1MDApXG4gICAgXHQgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIFx0XHRpZiAoZC5jb2xvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIFx0XHQgICAgcmV0dXJuIGZlYXR1cmUuY29sb3IoKTtcbiAgICAgICAgXHRcdH0gZWxzZSB7XG4gICAgICAgIFx0XHQgICAgcmV0dXJuIGQuY29sb3I7XG4gICAgICAgIFx0XHR9XG4gICAgXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLmRpc3RyaWJ1dGUoZnVuY3Rpb24gKGVsZW1zKSB7XG4gICAgICAgIHZhciB4U2NhbGUgPSBmZWF0dXJlLnNjYWxlKCk7XG4gICAgXHRlbGVtc1xuICAgIFx0ICAgIC5zZWxlY3QoXCJyZWN0XCIpXG4gICAgXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBcdFx0cmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcbiAgICBcdCAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZShmdW5jdGlvbiAoYmxvY2tzKSB7XG4gICAgICAgIHZhciB4U2NhbGUgPSBmZWF0dXJlLnNjYWxlKCk7XG4gICAgXHRibG9ja3NcbiAgICBcdCAgICAuc2VsZWN0KFwicmVjdFwiKVxuICAgIFx0ICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBcdFx0cmV0dXJuIHhTY2FsZShkLnN0YXJ0KTtcbiAgICBcdCAgICB9KVxuICAgIFx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgXHRcdHJldHVybiAoeFNjYWxlKGQuZW5kKSAtIHhTY2FsZShkLnN0YXJ0KSk7XG4gICAgXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcblxufTtcblxudG50X2ZlYXR1cmUuYXhpcyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgeEF4aXM7XG4gICAgdmFyIG9yaWVudGF0aW9uID0gXCJ0b3BcIjtcbiAgICB2YXIgeFNjYWxlO1xuXG4gICAgLy8gQXhpcyBkb2Vzbid0IGluaGVyaXQgZnJvbSBmZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSB7fTtcbiAgICBmZWF0dXJlLnJlc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIFx0eEF4aXMgPSB1bmRlZmluZWQ7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgIFx0dHJhY2suZy5zZWxlY3RBbGwoXCJyZWN0XCIpLnJlbW92ZSgpO1xuICAgIFx0dHJhY2suZy5zZWxlY3RBbGwoXCIudGlja1wiKS5yZW1vdmUoKTtcbiAgICB9O1xuICAgIGZlYXR1cmUucGxvdCA9IGZ1bmN0aW9uICgpIHt9O1xuICAgIGZlYXR1cmUubW92ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgIFx0dmFyIHN2Z19nID0gdHJhY2suZztcbiAgICBcdHN2Z19nLmNhbGwoeEF4aXMpO1xuICAgIH07XG5cbiAgICBmZWF0dXJlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHhBeGlzID0gdW5kZWZpbmVkO1xuICAgIH07XG5cbiAgICBmZWF0dXJlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBcdC8vIENyZWF0ZSBBeGlzIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgaWYgKHhBeGlzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHhBeGlzID0gZDMuc3ZnLmF4aXMoKVxuICAgICAgICAgICAgICAgIC5zY2FsZSh4U2NhbGUpXG4gICAgICAgICAgICAgICAgLm9yaWVudChvcmllbnRhdGlvbik7XG4gICAgICAgIH1cblxuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICBcdHZhciBzdmdfZyA9IHRyYWNrLmc7XG4gICAgXHRzdmdfZy5jYWxsKHhBeGlzKTtcbiAgICB9O1xuXG4gICAgZmVhdHVyZS5vcmllbnRhdGlvbiA9IGZ1bmN0aW9uIChwb3MpIHtcbiAgICBcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIFx0ICAgIHJldHVybiBvcmllbnRhdGlvbjtcbiAgICBcdH1cbiAgICBcdG9yaWVudGF0aW9uID0gcG9zO1xuICAgIFx0cmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIGZlYXR1cmUuc2NhbGUgPSBmdW5jdGlvbiAocykge1xuICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB4U2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgeFNjYWxlID0gcztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xufTtcblxudG50X2ZlYXR1cmUubG9jYXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJvdztcbiAgICB2YXIgeFNjYWxlO1xuXG4gICAgdmFyIGZlYXR1cmUgPSB7fTtcbiAgICBmZWF0dXJlLnJlc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByb3cgPSB1bmRlZmluZWQ7XG4gICAgfTtcbiAgICBmZWF0dXJlLnBsb3QgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICBmZWF0dXJlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJvdyA9IHVuZGVmaW5lZDtcbiAgICB9O1xuICAgIGZlYXR1cmUubW92ZXIgPSBmdW5jdGlvbigpIHtcbiAgICBcdHZhciBkb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG4gICAgXHRyb3cuc2VsZWN0KFwidGV4dFwiKVxuICAgIFx0ICAgIC50ZXh0KFwiTG9jYXRpb246IFwiICsgfn5kb21haW5bMF0gKyBcIi1cIiArIH5+ZG9tYWluWzFdKTtcbiAgICB9O1xuXG4gICAgZmVhdHVyZS5zY2FsZSA9IGZ1bmN0aW9uIChzYykge1xuICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB4U2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgeFNjYWxlID0gc2M7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICBmZWF0dXJlLnVwZGF0ZSA9IGZ1bmN0aW9uIChsb2MpIHtcbiAgICBcdHZhciB0cmFjayA9IHRoaXM7XG4gICAgXHR2YXIgc3ZnX2cgPSB0cmFjay5nO1xuICAgIFx0dmFyIGRvbWFpbiA9IHhTY2FsZS5kb21haW4oKTtcbiAgICBcdGlmIChyb3cgPT09IHVuZGVmaW5lZCkge1xuICAgIFx0ICAgIHJvdyA9IHN2Z19nO1xuICAgIFx0ICAgIHJvd1xuICAgICAgICBcdFx0LmFwcGVuZChcInRleHRcIilcbiAgICAgICAgXHRcdC50ZXh0KFwiTG9jYXRpb246IFwiICsgTWF0aC5yb3VuZChkb21haW5bMF0pICsgXCItXCIgKyBNYXRoLnJvdW5kKGRvbWFpblsxXSkpO1xuICAgIFx0fVxuICAgIH07XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRudF9mZWF0dXJlO1xuIiwidmFyIGJvYXJkID0gcmVxdWlyZSAoXCIuL2JvYXJkLmpzXCIpO1xuYm9hcmQudHJhY2sgPSByZXF1aXJlIChcIi4vdHJhY2tcIik7XG5ib2FyZC50cmFjay5kYXRhID0gcmVxdWlyZSAoXCIuL2RhdGEuanNcIik7XG5ib2FyZC50cmFjay5sYXlvdXQgPSByZXF1aXJlIChcIi4vbGF5b3V0LmpzXCIpO1xuYm9hcmQudHJhY2suZmVhdHVyZSA9IHJlcXVpcmUgKFwiLi9mZWF0dXJlLmpzXCIpO1xuYm9hcmQudHJhY2subGF5b3V0ID0gcmVxdWlyZSAoXCIuL2xheW91dC5qc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gYm9hcmQ7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG5cbi8vIHZhciBib2FyZCA9IHt9O1xuLy8gYm9hcmQudHJhY2sgPSB7fTtcbnZhciBsYXlvdXQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyBUaGUgcmV0dXJuZWQgY2xvc3VyZSAvIG9iamVjdFxuICAgIHZhciBsID0gZnVuY3Rpb24gKG5ld19lbGVtcykgIHtcbiAgICAgICAgdmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgbC5lbGVtZW50cygpLmNhbGwodHJhY2ssIG5ld19lbGVtcyk7XG4gICAgICAgIHJldHVybiBuZXdfZWxlbXM7XG4gICAgfTtcblxuICAgIHZhciBhcGkgPSBhcGlqcyhsKVxuICAgICAgICAuZ2V0c2V0ICgnZWxlbWVudHMnLCBmdW5jdGlvbiAoKSB7fSk7XG5cbiAgICByZXR1cm4gbDtcbn07XG5cbmxheW91dC5pZGVudGl0eSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbGF5b3V0KClcbiAgICAgICAgLmVsZW1lbnRzIChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIGU7XG4gICAgICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gbGF5b3V0O1xuIiwidmFyIHNwaW5uZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gdmFyIG4gPSAwO1xuICAgIHZhciBzcF9lbGVtO1xuICAgIHZhciBzcCA9IHt9O1xuXG4gICAgc3Aub24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIGlmICghdHJhY2suc3Bpbm5lcikge1xuICAgICAgICAgICAgdHJhY2suc3Bpbm5lciA9IDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cmFjay5zcGlubmVyKys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRyYWNrLnNwaW5uZXI9PTEpIHtcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSB0cmFjay5nO1xuICAgICAgICAgICAgdmFyIGJnQ29sb3IgPSB0cmFjay5jb2xvcigpO1xuICAgICAgICAgICAgc3BfZWxlbSA9IGNvbnRhaW5lclxuICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJzdmdcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3NwaW5uZXJcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIFwiMzBweFwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIFwiMzBweFwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieG1sc1wiLCBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ2aWV3Qm94XCIsIFwiMCAwIDEwMCAxMDBcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInByZXNlcnZlQXNwZWN0UmF0aW9cIiwgXCJ4TWlkWU1pZFwiKTtcblxuXG4gICAgICAgICAgICBzcF9lbGVtXG4gICAgICAgICAgICAgICAgLmFwcGVuZChcInJlY3RcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInhcIiwgJzAnKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieVwiLCAnMCcpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBcIjEwMFwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIFwiMTAwXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJyeFwiLCAnNTAnKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwicnlcIiwgJzUwJylcbiAgICAgICAgICAgICAgICAuYXR0cihcImZpbGxcIiwgYmdDb2xvcik7XG4gICAgICAgICAgICAgICAgLy8uYXR0cihcIm9wYWNpdHlcIiwgMC42KTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPDEyOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aWNrKHNwX2VsZW0sIGksIGJnQ29sb3IpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAodHJhY2suc3Bpbm5lcj4wKXtcbiAgICAgICAgICAgIC8vIE1vdmUgdGhlIHNwaW5uZXIgdG8gZnJvbnRcbiAgICAgICAgICAgIHZhciBub2RlID0gc3BfZWxlbS5ub2RlKCk7XG4gICAgICAgICAgICBpZiAobm9kZS5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5wYXJlbnROb2RlLmFwcGVuZENoaWxkKG5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHNwLm9mZiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgdHJhY2suc3Bpbm5lci0tO1xuICAgICAgICBpZiAoIXRyYWNrLnNwaW5uZXIpIHtcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSB0cmFjay5nO1xuICAgICAgICAgICAgY29udGFpbmVyLnNlbGVjdEFsbChcIi50bnRfc3Bpbm5lclwiKVxuICAgICAgICAgICAgICAgIC5yZW1vdmUoKTtcblxuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHRpY2sgKGVsZW0sIGksIGJnQ29sb3IpIHtcbiAgICAgICAgZWxlbVxuICAgICAgICAgICAgLmFwcGVuZChcInJlY3RcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCBcIjQ2LjVcIilcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCAnNDAnKVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBcIjdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIFwiMjBcIilcbiAgICAgICAgICAgIC5hdHRyKFwicnhcIiwgXCI1XCIpXG4gICAgICAgICAgICAuYXR0cihcInJ5XCIsIFwiNVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIGQzLnJnYihiZ0NvbG9yKS5kYXJrZXIoMikpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZShcIiArICgzNjAvMTIpKmkgKyBcIiA1MCA1MCkgdHJhbnNsYXRlKDAgLTMwKVwiKVxuICAgICAgICAgICAgLmFwcGVuZChcImFuaW1hdGVcIilcbiAgICAgICAgICAgIC5hdHRyKFwiYXR0cmlidXRlTmFtZVwiLCBcIm9wYWNpdHlcIilcbiAgICAgICAgICAgIC5hdHRyKFwiZnJvbVwiLCBcIjFcIilcbiAgICAgICAgICAgIC5hdHRyKFwidG9cIiwgXCIwXCIpXG4gICAgICAgICAgICAuYXR0cihcImR1clwiLCBcIjFzXCIpXG4gICAgICAgICAgICAuYXR0cihcImJlZ2luXCIsICgxLzEyKSppICsgXCJzXCIpXG4gICAgICAgICAgICAuYXR0cihcInJlcGVhdENvdW50XCIsIFwiaW5kZWZpbml0ZVwiKTtcblxuICAgIH1cblxuICAgIHJldHVybiBzcDtcbn07XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBzcGlubmVyO1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xudmFyIGl0ZXJhdG9yID0gcmVxdWlyZShcInRudC51dGlsc1wiKS5pdGVyYXRvcjtcblxuXG52YXIgdHJhY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgZGlzcGxheTtcblxuICAgIHZhciBjb25mID0ge1xuICAgIFx0Y29sb3IgOiBkMy5yZ2IoJyNDQ0NDQ0MnKSxcbiAgICBcdGhlaWdodCAgICAgICAgICAgOiAyNTAsXG4gICAgXHQvLyBkYXRhIGlzIHRoZSBvYmplY3QgKG5vcm1hbGx5IGEgdG50LnRyYWNrLmRhdGEgb2JqZWN0KSB1c2VkIHRvIHJldHJpZXZlIGFuZCB1cGRhdGUgZGF0YSBmb3IgdGhlIHRyYWNrXG4gICAgXHRkYXRhICAgICAgICAgICAgIDogdHJhY2suZGF0YS5lbXB0eSgpLFxuICAgICAgICAvLyBkaXNwbGF5ICAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICBsYWJlbCAgICAgICAgICAgIDogXCJcIixcbiAgICAgICAgaWQgICAgICAgICAgICAgICA6IHRyYWNrLmlkKClcbiAgICB9O1xuXG4gICAgLy8gVGhlIHJldHVybmVkIG9iamVjdCAvIGNsb3N1cmVcbiAgICB2YXIgdCA9IHt9O1xuXG4gICAgLy8gQVBJXG4gICAgdmFyIGFwaSA9IGFwaWpzICh0KVxuICAgIFx0LmdldHNldCAoY29uZik7XG5cbiAgICAvLyBUT0RPOiBUaGlzIG1lYW5zIHRoYXQgaGVpZ2h0IHNob3VsZCBiZSBkZWZpbmVkIGJlZm9yZSBkaXNwbGF5XG4gICAgLy8gd2Ugc2hvdWxkbid0IHJlbHkgb24gdGhpc1xuICAgIHQuZGlzcGxheSA9IGZ1bmN0aW9uIChuZXdfcGxvdHRlcikge1xuICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBkaXNwbGF5O1xuICAgICAgICB9XG5cbiAgICAgICAgZGlzcGxheSA9IG5ld19wbG90dGVyO1xuICAgICAgICBpZiAodHlwZW9mIChkaXNwbGF5KSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgZGlzcGxheS5sYXlvdXQgJiYgZGlzcGxheS5sYXlvdXQoKS5oZWlnaHQoY29uZi5oZWlnaHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIGRpc3BsYXkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGlzcGxheS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlba2V5XS5sYXlvdXQgJiYgZGlzcGxheVtrZXldLmxheW91dCgpLmhlaWdodChjb25mLmhlaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHJldHVybiB0O1xufTtcblxudHJhY2suaWQgPSBpdGVyYXRvcigxKTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdHJhY2s7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRudF9yZXN0ID0gcmVxdWlyZShcIi4vc3JjL3Jlc3QuanNcIik7XG4iLCIvKmdsb2JhbHMgZGVmaW5lICovXG4ndXNlIHN0cmljdCc7XG5cblxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIChyb290Lmh0dHBwbGVhc2Vwcm9taXNlcyA9IGZhY3Rvcnkocm9vdCkpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnkocm9vdCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcm9vdC5odHRwcGxlYXNlcHJvbWlzZXMgPSBmYWN0b3J5KHJvb3QpO1xuICAgIH1cbn0odGhpcywgZnVuY3Rpb24gKHJvb3QpIHsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChQcm9taXNlKSB7XG4gICAgICAgIFByb21pc2UgPSBQcm9taXNlIHx8IHJvb3QgJiYgcm9vdC5Qcm9taXNlO1xuICAgICAgICBpZiAoIVByb21pc2UpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gUHJvbWlzZSBpbXBsZW1lbnRhdGlvbiBmb3VuZC4nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcHJvY2Vzc1JlcXVlc3Q6IGZ1bmN0aW9uIChyZXEpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzb2x2ZSwgcmVqZWN0LFxuICAgICAgICAgICAgICAgICAgICBvbGRPbmxvYWQgPSByZXEub25sb2FkLFxuICAgICAgICAgICAgICAgICAgICBvbGRPbmVycm9yID0gcmVxLm9uZXJyb3IsXG4gICAgICAgICAgICAgICAgICAgIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSA9IGE7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QgPSBiO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXEub25sb2FkID0gZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICBpZiAob2xkT25sb2FkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBvbGRPbmxvYWQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXEub25lcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9sZE9uZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IG9sZE9uZXJyb3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlcS50aGVuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvbWlzZS50aGVuLmFwcGx5KHByb21pc2UsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXFbJ2NhdGNoJ10gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9taXNlWydjYXRjaCddLmFwcGx5KHByb21pc2UsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9O1xufSkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVzcG9uc2UgPSByZXF1aXJlKCcuL3Jlc3BvbnNlJyk7XG5cbmZ1bmN0aW9uIFJlcXVlc3RFcnJvcihtZXNzYWdlLCBwcm9wcykge1xuICAgIHZhciBlcnIgPSBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgZXJyLm5hbWUgPSAnUmVxdWVzdEVycm9yJztcbiAgICB0aGlzLm5hbWUgPSBlcnIubmFtZTtcbiAgICB0aGlzLm1lc3NhZ2UgPSBlcnIubWVzc2FnZTtcbiAgICBpZiAoZXJyLnN0YWNrKSB7XG4gICAgICAgIHRoaXMuc3RhY2sgPSBlcnIuc3RhY2s7XG4gICAgfVxuXG4gICAgdGhpcy50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWVzc2FnZTtcbiAgICB9O1xuXG4gICAgZm9yICh2YXIgayBpbiBwcm9wcykge1xuICAgICAgICBpZiAocHJvcHMuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgIHRoaXNba10gPSBwcm9wc1trXTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuUmVxdWVzdEVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcblxuUmVxdWVzdEVycm9yLmNyZWF0ZSA9IGZ1bmN0aW9uIChtZXNzYWdlLCByZXEsIHByb3BzKSB7XG4gICAgdmFyIGVyciA9IG5ldyBSZXF1ZXN0RXJyb3IobWVzc2FnZSwgcHJvcHMpO1xuICAgIFJlc3BvbnNlLmNhbGwoZXJyLCByZXEpO1xuICAgIHJldHVybiBlcnI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlcXVlc3RFcnJvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGksXG4gICAgY2xlYW5VUkwgPSByZXF1aXJlKCcuLi9wbHVnaW5zL2NsZWFudXJsJyksXG4gICAgWEhSID0gcmVxdWlyZSgnLi94aHInKSxcbiAgICBkZWxheSA9IHJlcXVpcmUoJy4vdXRpbHMvZGVsYXknKSxcbiAgICBjcmVhdGVFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKS5jcmVhdGUsXG4gICAgUmVzcG9uc2UgPSByZXF1aXJlKCcuL3Jlc3BvbnNlJyksXG4gICAgUmVxdWVzdCA9IHJlcXVpcmUoJy4vcmVxdWVzdCcpLFxuICAgIGV4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kJyksXG4gICAgb25jZSA9IHJlcXVpcmUoJy4vdXRpbHMvb25jZScpO1xuXG5mdW5jdGlvbiBmYWN0b3J5KGRlZmF1bHRzLCBwbHVnaW5zKSB7XG4gICAgZGVmYXVsdHMgPSBkZWZhdWx0cyB8fCB7fTtcbiAgICBwbHVnaW5zID0gcGx1Z2lucyB8fCBbXTtcblxuICAgIGZ1bmN0aW9uIGh0dHAocmVxLCBjYikge1xuICAgICAgICB2YXIgeGhyLCBwbHVnaW4sIGRvbmUsIGssIHRpbWVvdXRJZDtcblxuICAgICAgICByZXEgPSBuZXcgUmVxdWVzdChleHRlbmQoZGVmYXVsdHMsIHJlcSkpO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBwbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBwbHVnaW4gPSBwbHVnaW5zW2ldO1xuICAgICAgICAgICAgaWYgKHBsdWdpbi5wcm9jZXNzUmVxdWVzdCkge1xuICAgICAgICAgICAgICAgIHBsdWdpbi5wcm9jZXNzUmVxdWVzdChyZXEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2l2ZSB0aGUgcGx1Z2lucyBhIGNoYW5jZSB0byBjcmVhdGUgdGhlIFhIUiBvYmplY3RcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBsdWdpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBsdWdpbiA9IHBsdWdpbnNbaV07XG4gICAgICAgICAgICBpZiAocGx1Z2luLmNyZWF0ZVhIUikge1xuICAgICAgICAgICAgICAgIHhociA9IHBsdWdpbi5jcmVhdGVYSFIocmVxKTtcbiAgICAgICAgICAgICAgICBicmVhazsgLy8gRmlyc3QgY29tZSwgZmlyc3Qgc2VydmVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB4aHIgPSB4aHIgfHwgbmV3IFhIUigpO1xuXG4gICAgICAgIHJlcS54aHIgPSB4aHI7XG5cbiAgICAgICAgLy8gQmVjYXVzZSBYSFIgY2FuIGJlIGFuIFhNTEh0dHBSZXF1ZXN0IG9yIGFuIFhEb21haW5SZXF1ZXN0LCB3ZSBhZGRcbiAgICAgICAgLy8gYG9ucmVhZHlzdGF0ZWNoYW5nZWAsIGBvbmxvYWRgLCBhbmQgYG9uZXJyb3JgIGNhbGxiYWNrcy4gV2UgdXNlIHRoZVxuICAgICAgICAvLyBgb25jZWAgdXRpbCB0byBtYWtlIHN1cmUgdGhhdCBvbmx5IG9uZSBpcyBjYWxsZWQgKGFuZCBpdCdzIG9ubHkgY2FsbGVkXG4gICAgICAgIC8vIG9uZSB0aW1lKS5cbiAgICAgICAgZG9uZSA9IG9uY2UoZGVsYXkoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICAgICAgICB4aHIub25sb2FkID0geGhyLm9uZXJyb3IgPSB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0geGhyLm9udGltZW91dCA9IHhoci5vbnByb2dyZXNzID0gbnVsbDtcbiAgICAgICAgICAgIHZhciByZXMgPSBlcnIgJiYgZXJyLmlzSHR0cEVycm9yID8gZXJyIDogbmV3IFJlc3BvbnNlKHJlcSk7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGx1Z2lucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHBsdWdpbiA9IHBsdWdpbnNbaV07XG4gICAgICAgICAgICAgICAgaWYgKHBsdWdpbi5wcm9jZXNzUmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcGx1Z2luLnByb2Nlc3NSZXNwb25zZShyZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVxLm9uZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChyZXEub25sb2FkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcS5vbmxvYWQocmVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2IpIHtcbiAgICAgICAgICAgICAgICBjYihlcnIsIHJlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKTtcblxuICAgICAgICAvLyBXaGVuIHRoZSByZXF1ZXN0IGNvbXBsZXRlcywgY29udGludWUuXG4gICAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAocmVxLnRpbWVkT3V0KSByZXR1cm47XG5cbiAgICAgICAgICAgIGlmIChyZXEuYWJvcnRlZCkge1xuICAgICAgICAgICAgICAgIGRvbmUoY3JlYXRlRXJyb3IoJ1JlcXVlc3QgYWJvcnRlZCcsIHJlcSwge25hbWU6ICdBYm9ydCd9KSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHhoci5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBNYXRoLmZsb29yKHhoci5zdGF0dXMgLyAxMDApO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHhoci5zdGF0dXMgPT09IDQwNCAmJiAhcmVxLmVycm9yT240MDQpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBraW5kO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBraW5kID0gJ0NsaWVudCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDU6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2luZCA9ICdTZXJ2ZXInO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBraW5kID0gJ0hUVFAnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciBtc2cgPSBraW5kICsgJyBFcnJvcjogJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVGhlIHNlcnZlciByZXR1cm5lZCBhIHN0YXR1cyBvZiAnICsgeGhyLnN0YXR1cyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnIGZvciB0aGUgcmVxdWVzdCBcIicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxLm1ldGhvZC50b1VwcGVyQ2FzZSgpICsgJyAnICsgcmVxLnVybCArICdcIic7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUoY3JlYXRlRXJyb3IobXNnLCByZXEpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gYG9ubG9hZGAgaXMgb25seSBjYWxsZWQgb24gc3VjY2VzcyBhbmQsIGluIElFLCB3aWxsIGJlIGNhbGxlZCB3aXRob3V0XG4gICAgICAgIC8vIGB4aHIuc3RhdHVzYCBoYXZpbmcgYmVlbiBzZXQsIHNvIHdlIGRvbid0IGNoZWNrIGl0LlxuICAgICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24gKCkgeyBkb25lKCk7IH07XG5cbiAgICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkb25lKGNyZWF0ZUVycm9yKCdJbnRlcm5hbCBYSFIgRXJyb3InLCByZXEpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJRSBzb21ldGltZXMgZmFpbHMgaWYgeW91IGRvbid0IHNwZWNpZnkgZXZlcnkgaGFuZGxlci5cbiAgICAgICAgLy8gU2VlIGh0dHA6Ly9zb2NpYWwubXNkbi5taWNyb3NvZnQuY29tL0ZvcnVtcy9pZS9lbi1VUy8zMGVmM2FkZC03NjdjLTQ0MzYtYjhhOS1mMWNhMTliNDgxMmUvaWU5LXJ0bS14ZG9tYWlucmVxdWVzdC1pc3N1ZWQtcmVxdWVzdHMtbWF5LWFib3J0LWlmLWFsbC1ldmVudC1oYW5kbGVycy1ub3Qtc3BlY2lmaWVkP2ZvcnVtPWlld2ViZGV2ZWxvcG1lbnRcbiAgICAgICAgeGhyLm9udGltZW91dCA9IGZ1bmN0aW9uICgpIHsgLyogbm9vcCAqLyB9O1xuICAgICAgICB4aHIub25wcm9ncmVzcyA9IGZ1bmN0aW9uICgpIHsgLyogbm9vcCAqLyB9O1xuXG4gICAgICAgIHhoci5vcGVuKHJlcS5tZXRob2QsIHJlcS51cmwpO1xuXG4gICAgICAgIGlmIChyZXEudGltZW91dCkge1xuICAgICAgICAgICAgLy8gSWYgd2UgdXNlIHRoZSBub3JtYWwgWEhSIHRpbWVvdXQgbWVjaGFuaXNtIChgeGhyLnRpbWVvdXRgIGFuZFxuICAgICAgICAgICAgLy8gYHhoci5vbnRpbWVvdXRgKSwgYG9ucmVhZHlzdGF0ZWNoYW5nZWAgd2lsbCBiZSB0cmlnZ2VyZWQgYmVmb3JlXG4gICAgICAgICAgICAvLyBgb250aW1lb3V0YC4gVGhlcmUncyBubyB3YXkgdG8gcmVjb2duaXplIHRoYXQgaXQgd2FzIHRyaWdnZXJlZCBieVxuICAgICAgICAgICAgLy8gYSB0aW1lb3V0LCBhbmQgd2UnZCBiZSB1bmFibGUgdG8gZGlzcGF0Y2ggdGhlIHJpZ2h0IGVycm9yLlxuICAgICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVxLnRpbWVkT3V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBkb25lKGNyZWF0ZUVycm9yKCdSZXF1ZXN0IHRpbWVvdXQnLCByZXEsIHtuYW1lOiAnVGltZW91dCd9KSk7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgeGhyLmFib3J0KCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7fVxuICAgICAgICAgICAgfSwgcmVxLnRpbWVvdXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChrIGluIHJlcS5oZWFkZXJzKSB7XG4gICAgICAgICAgICBpZiAocmVxLmhlYWRlcnMuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihrLCByZXEuaGVhZGVyc1trXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB4aHIuc2VuZChyZXEuYm9keSk7XG5cbiAgICAgICAgcmV0dXJuIHJlcTtcbiAgICB9XG5cbiAgICB2YXIgbWV0aG9kLFxuICAgICAgICBtZXRob2RzID0gWydnZXQnLCAncG9zdCcsICdwdXQnLCAnaGVhZCcsICdwYXRjaCcsICdkZWxldGUnXSxcbiAgICAgICAgdmVyYiA9IGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAocmVxLCBjYikge1xuICAgICAgICAgICAgICAgIHJlcSA9IG5ldyBSZXF1ZXN0KHJlcSk7XG4gICAgICAgICAgICAgICAgcmVxLm1ldGhvZCA9IG1ldGhvZDtcbiAgICAgICAgICAgICAgICByZXR1cm4gaHR0cChyZXEsIGNiKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgZm9yIChpID0gMDsgaSA8IG1ldGhvZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbWV0aG9kID0gbWV0aG9kc1tpXTtcbiAgICAgICAgaHR0cFttZXRob2RdID0gdmVyYihtZXRob2QpO1xuICAgIH1cblxuICAgIGh0dHAucGx1Z2lucyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHBsdWdpbnM7XG4gICAgfTtcblxuICAgIGh0dHAuZGVmYXVsdHMgPSBmdW5jdGlvbiAobmV3VmFsdWVzKSB7XG4gICAgICAgIGlmIChuZXdWYWx1ZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWN0b3J5KGV4dGVuZChkZWZhdWx0cywgbmV3VmFsdWVzKSwgcGx1Z2lucyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlZmF1bHRzO1xuICAgIH07XG5cbiAgICBodHRwLnVzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5ld1BsdWdpbnMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgICAgICByZXR1cm4gZmFjdG9yeShkZWZhdWx0cywgcGx1Z2lucy5jb25jYXQobmV3UGx1Z2lucykpO1xuICAgIH07XG5cbiAgICBodHRwLmJhcmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmYWN0b3J5KCk7XG4gICAgfTtcblxuICAgIGh0dHAuUmVxdWVzdCA9IFJlcXVlc3Q7XG4gICAgaHR0cC5SZXNwb25zZSA9IFJlc3BvbnNlO1xuXG4gICAgcmV0dXJuIGh0dHA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSh7fSwgW2NsZWFuVVJMXSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFJlcXVlc3Qob3B0c09yVXJsKSB7XG4gICAgdmFyIG9wdHMgPSB0eXBlb2Ygb3B0c09yVXJsID09PSAnc3RyaW5nJyA/IHt1cmw6IG9wdHNPclVybH0gOiBvcHRzT3JVcmwgfHwge307XG4gICAgdGhpcy5tZXRob2QgPSBvcHRzLm1ldGhvZCA/IG9wdHMubWV0aG9kLnRvVXBwZXJDYXNlKCkgOiAnR0VUJztcbiAgICB0aGlzLnVybCA9IG9wdHMudXJsO1xuICAgIHRoaXMuaGVhZGVycyA9IG9wdHMuaGVhZGVycyB8fCB7fTtcbiAgICB0aGlzLmJvZHkgPSBvcHRzLmJvZHk7XG4gICAgdGhpcy50aW1lb3V0ID0gb3B0cy50aW1lb3V0IHx8IDA7XG4gICAgdGhpcy5lcnJvck9uNDA0ID0gb3B0cy5lcnJvck9uNDA0ICE9IG51bGwgPyBvcHRzLmVycm9yT240MDQgOiB0cnVlO1xuICAgIHRoaXMub25sb2FkID0gb3B0cy5vbmxvYWQ7XG4gICAgdGhpcy5vbmVycm9yID0gb3B0cy5vbmVycm9yO1xufVxuXG5SZXF1ZXN0LnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5hYm9ydGVkKSByZXR1cm47XG4gICAgdGhpcy5hYm9ydGVkID0gdHJ1ZTtcbiAgICB0aGlzLnhoci5hYm9ydCgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuUmVxdWVzdC5wcm90b3R5cGUuaGVhZGVyID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gICAgdmFyIGs7XG4gICAgZm9yIChrIGluIHRoaXMuaGVhZGVycykge1xuICAgICAgICBpZiAodGhpcy5oZWFkZXJzLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICBpZiAobmFtZS50b0xvd2VyQ2FzZSgpID09PSBrLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oZWFkZXJzW2tdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmhlYWRlcnNba107XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5oZWFkZXJzW25hbWVdID0gdmFsdWU7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gUmVxdWVzdDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFJlcXVlc3QgPSByZXF1aXJlKCcuL3JlcXVlc3QnKTtcblxuXG5mdW5jdGlvbiBSZXNwb25zZShyZXEpIHtcbiAgICB2YXIgaSwgbGluZXMsIG0sXG4gICAgICAgIHhociA9IHJlcS54aHI7XG4gICAgdGhpcy5yZXF1ZXN0ID0gcmVxO1xuICAgIHRoaXMueGhyID0geGhyO1xuICAgIHRoaXMuaGVhZGVycyA9IHt9O1xuXG4gICAgLy8gQnJvd3NlcnMgZG9uJ3QgbGlrZSB5b3UgdHJ5aW5nIHRvIHJlYWQgWEhSIHByb3BlcnRpZXMgd2hlbiB5b3UgYWJvcnQgdGhlXG4gICAgLy8gcmVxdWVzdCwgc28gd2UgZG9uJ3QuXG4gICAgaWYgKHJlcS5hYm9ydGVkIHx8IHJlcS50aW1lZE91dCkgcmV0dXJuO1xuXG4gICAgdGhpcy5zdGF0dXMgPSB4aHIuc3RhdHVzIHx8IDA7XG4gICAgdGhpcy50ZXh0ID0geGhyLnJlc3BvbnNlVGV4dDtcbiAgICB0aGlzLmJvZHkgPSB4aHIucmVzcG9uc2UgfHwgeGhyLnJlc3BvbnNlVGV4dDtcbiAgICB0aGlzLmNvbnRlbnRUeXBlID0geGhyLmNvbnRlbnRUeXBlIHx8ICh4aHIuZ2V0UmVzcG9uc2VIZWFkZXIgJiYgeGhyLmdldFJlc3BvbnNlSGVhZGVyKCdDb250ZW50LVR5cGUnKSk7XG5cbiAgICBpZiAoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycykge1xuICAgICAgICBsaW5lcyA9IHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKS5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKChtID0gbGluZXNbaV0ubWF0Y2goL1xccyooW15cXHNdKyk6XFxzKyhbXlxcc10rKS8pKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaGVhZGVyc1ttWzFdXSA9IG1bMl07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmlzSHR0cEVycm9yID0gdGhpcy5zdGF0dXMgPj0gNDAwO1xufVxuXG5SZXNwb25zZS5wcm90b3R5cGUuaGVhZGVyID0gUmVxdWVzdC5wcm90b3R5cGUuaGVhZGVyO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gUmVzcG9uc2U7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIFdyYXAgYSBmdW5jdGlvbiBpbiBhIGBzZXRUaW1lb3V0YCBjYWxsLiBUaGlzIGlzIHVzZWQgdG8gZ3VhcmFudGVlIGFzeW5jXG4vLyBiZWhhdmlvciwgd2hpY2ggY2FuIGF2b2lkIHVuZXhwZWN0ZWQgZXJyb3JzLlxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhclxuICAgICAgICAgICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCksXG4gICAgICAgICAgICBuZXdGdW5jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIHNldFRpbWVvdXQobmV3RnVuYywgMCk7XG4gICAgfTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIEEgXCJvbmNlXCIgdXRpbGl0eS5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIHJlc3VsdCwgY2FsbGVkID0gZmFsc2U7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFjYWxsZWQpIHtcbiAgICAgICAgICAgIGNhbGxlZCA9IHRydWU7XG4gICAgICAgICAgICByZXN1bHQgPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHdpbmRvdy5YTUxIdHRwUmVxdWVzdDtcbiIsIm1vZHVsZS5leHBvcnRzID0gZXh0ZW5kXG5cbmZ1bmN0aW9uIGV4dGVuZCgpIHtcbiAgICB2YXIgdGFyZ2V0ID0ge31cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV1cblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHByb2Nlc3NSZXF1ZXN0OiBmdW5jdGlvbiAocmVxKSB7XG4gICAgICAgIHJlcS51cmwgPSByZXEudXJsLnJlcGxhY2UoL1teJV0rL2csIGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICByZXR1cm4gZW5jb2RlVVJJKHMpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIganNvbnJlcXVlc3QgPSByZXF1aXJlKCcuL2pzb25yZXF1ZXN0JyksXG4gICAganNvbnJlc3BvbnNlID0gcmVxdWlyZSgnLi9qc29ucmVzcG9uc2UnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcHJvY2Vzc1JlcXVlc3Q6IGZ1bmN0aW9uIChyZXEpIHtcbiAgICAgICAganNvbnJlcXVlc3QucHJvY2Vzc1JlcXVlc3QuY2FsbCh0aGlzLCByZXEpO1xuICAgICAgICBqc29ucmVzcG9uc2UucHJvY2Vzc1JlcXVlc3QuY2FsbCh0aGlzLCByZXEpO1xuICAgIH0sXG4gICAgcHJvY2Vzc1Jlc3BvbnNlOiBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgIGpzb25yZXNwb25zZS5wcm9jZXNzUmVzcG9uc2UuY2FsbCh0aGlzLCByZXMpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHByb2Nlc3NSZXF1ZXN0OiBmdW5jdGlvbiAocmVxKSB7XG4gICAgICAgIHZhclxuICAgICAgICAgICAgY29udGVudFR5cGUgPSByZXEuaGVhZGVyKCdDb250ZW50LVR5cGUnKSxcbiAgICAgICAgICAgIGhhc0pzb25Db250ZW50VHlwZSA9IGNvbnRlbnRUeXBlICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50VHlwZS5pbmRleE9mKCdhcHBsaWNhdGlvbi9qc29uJykgIT09IC0xO1xuXG4gICAgICAgIGlmIChjb250ZW50VHlwZSAhPSBudWxsICYmICFoYXNKc29uQ29udGVudFR5cGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXEuYm9keSkge1xuICAgICAgICAgICAgaWYgKCFjb250ZW50VHlwZSkge1xuICAgICAgICAgICAgICAgIHJlcS5oZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlcS5ib2R5ID0gSlNPTi5zdHJpbmdpZnkocmVxLmJvZHkpO1xuICAgICAgICB9XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcHJvY2Vzc1JlcXVlc3Q6IGZ1bmN0aW9uIChyZXEpIHtcbiAgICAgICAgdmFyIGFjY2VwdCA9IHJlcS5oZWFkZXIoJ0FjY2VwdCcpO1xuICAgICAgICBpZiAoYWNjZXB0ID09IG51bGwpIHtcbiAgICAgICAgICAgIHJlcS5oZWFkZXIoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHByb2Nlc3NSZXNwb25zZTogZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAvLyBDaGVjayB0byBzZWUgaWYgdGhlIGNvbnRlbnR5cGUgaXMgXCJzb21ldGhpbmcvanNvblwiIG9yXG4gICAgICAgIC8vIFwic29tZXRoaW5nL3NvbWV0aGluZ2Vsc2UranNvblwiXG4gICAgICAgIGlmIChyZXMuY29udGVudFR5cGUgJiYgL14uKlxcLyg/Oi4qXFwrKT9qc29uKDt8JCkvaS50ZXN0KHJlcy5jb250ZW50VHlwZSkpIHtcbiAgICAgICAgICAgIHZhciByYXcgPSB0eXBlb2YgcmVzLmJvZHkgPT09ICdzdHJpbmcnID8gcmVzLmJvZHkgOiByZXMudGV4dDtcbiAgICAgICAgICAgIGlmIChyYXcpIHtcbiAgICAgICAgICAgICAgICByZXMuYm9keSA9IEpTT04ucGFyc2UocmF3KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG4iLCJ2YXIgaHR0cCA9IHJlcXVpcmUoXCJodHRwcGxlYXNlXCIpO1xudmFyIGFwaWpzID0gcmVxdWlyZShcInRudC5hcGlcIik7XG52YXIgcHJvbWlzZXMgPSByZXF1aXJlKCdodHRwcGxlYXNlLXByb21pc2VzJyk7XG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJ2VzNi1wcm9taXNlJykuUHJvbWlzZTtcbnZhciBqc29uID0gcmVxdWlyZShcImh0dHBwbGVhc2UvcGx1Z2lucy9qc29uXCIpO1xuaHR0cCA9IGh0dHAudXNlKGpzb24pLnVzZShwcm9taXNlcyhQcm9taXNlKSk7XG5cbi8vdmFyIHVybCA9IHJlcXVpcmUoXCIuL3VybC5qc1wiKTtcblxudG50X3Jlc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgICAgcHJlZml4OiBcIlwiLFxuICAgICAgICBwcm90b2NvbDogXCJodHRwXCIsXG4gICAgICAgIGRvbWFpbjogXCJcIixcbiAgICAgICAgcG9ydDogXCJcIlxuICAgIH07XG4gICAgdmFyIHJlc3QgPSB7fTtcbiAgICByZXN0LnVybCA9IHJlcXVpcmUoXCIuL3VybC5qc1wiKTtcblxuICAgIHZhciBhcGkgPSBhcGlqcyAocmVzdClcbiAgICAgICAgLmdldHNldChjb25maWcpO1xuXG4gICAgYXBpLm1ldGhvZCAoJ2NhbGwnLCBmdW5jdGlvbiAodXJsLCBkYXRhKSB7XG4gICAgICAgIHZhciBteXVybDtcbiAgICAgICAgaWYgKHR5cGVvZih1cmwpID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBteXVybCA9IHVybDtcbiAgICAgICAgfSBlbHNlIHsgLy8gSXQgaXMgYSB0bnQucmVzdC51cmxcbiAgICAgICAgICAgIHVybFxuICAgICAgICAgICAgICAgIC5fcHJlZml4KGNvbmZpZy5wcmVmaXgpXG4gICAgICAgICAgICAgICAgLl9wcm90b2NvbChjb25maWcucHJvdG9jb2wpXG4gICAgICAgICAgICAgICAgLl9kb21haW4oY29uZmlnLmRvbWFpbilcbiAgICAgICAgICAgICAgICAuX3BvcnQoY29uZmlnLnBvcnQpO1xuXG4gICAgICAgICAgICBteXVybCA9IHVybCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhKSB7IC8vIFBPU1RcbiAgICAgICAgICAgIHJldHVybiBodHRwLnBvc3QgKHtcbiAgICAgICAgICAgICAgICBcInVybFwiOiBteXVybCxcbiAgICAgICAgICAgICAgICBcImJvZHlcIjogZGF0YVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGh0dHAuZ2V0ICh7XG4gICAgICAgICAgICBcInVybFwiOiBteXVybFxuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdG50X3Jlc3Q7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlKFwidG50LmFwaVwiKTtcblxudmFyIHVybE1vZHVsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGFyYW1QYXR0ZXJuID0gLzpcXHcrL2c7XG5cbiAgICB2YXIgY29uZmlnID0ge1xuICAgICAgICBfcHJlZml4OiBcIlwiLFxuICAgICAgICBfcHJvdG9jb2w6IFwiaHR0cFwiLFxuICAgICAgICBfZG9tYWluOiBcIlwiLFxuICAgICAgICBfcG9ydDogXCJcIixcbiAgICAgICAgZW5kcG9pbnQ6IFwiXCIsXG4gICAgICAgIHBhcmFtZXRlcnM6IHt9LFxuICAgICAgICBmcmFnbWVudDogXCJcIixcbiAgICAgICAgcmVzdDogdW5kZWZpbmVkXG4gICAgfTtcblxuICAgIC8vIFVSTCBNZXRob2RcbiAgICB2YXIgdXJsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZ2V0VXJsKCk7XG4gICAgfTtcblxuICAgIHZhciBhcGkgPSBhcGlqcyAodXJsKVxuICAgICAgICAuZ2V0c2V0KGNvbmZpZyk7XG5cbiAgICAvLyBDaGVja3MgaWYgdGhlIHZhbHVlIGlzIGEgc3RyaW5nIG9yIGFuIGFycmF5XG4gICAgLy8gSWYgYXJyYXksIHJlY3Vyc2Ugb3ZlciBhbGwgdGhlIGF2YWlsYWJsZSB2YWx1ZXNcbiAgICBmdW5jdGlvbiBxdWVyeTEgKGtleSkge1xuICAgICAgICB2YXIgdmFsID0gY29uZmlnLnBhcmFtZXRlcnNba2V5XTtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWw7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSXQgaXMgYW4gYXJyYXlcbiAgICAgICAgdmFyIHZhbDEgPSB2YWwuc2hpZnQoKTtcbiAgICAgICAgIGlmICh2YWwubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsMSArIFwiJlwiICsga2V5ICsgXCI9XCIgKyBxdWVyeTEoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsMTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBxdWVyeVN0cmluZygpIHtcbiAgICAgICAgLy8gV2UgYWRkICdjb250ZW50LXR5cGU9YXBwbGljYXRpb24vanNvbidcbiAgICAgICAgaWYgKGNvbmZpZy5wYXJhbWV0ZXJzW1wiY29udGVudC10eXBlXCJdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbmZpZy5wYXJhbWV0ZXJzW1wiY29udGVudC10eXBlXCJdID0gXCJhcHBsaWNhdGlvbi9qc29uXCI7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHFzID0gT2JqZWN0LmtleXMoY29uZmlnLnBhcmFtZXRlcnMpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICByZXR1cm4ga2V5ICsgXCI9XCIgKyBxdWVyeTEoa2V5KTtcbiAgICAgICAgfSkuam9pbihcIiZcIik7XG4gICAgICAgIHJldHVybiBxcyA/IChcIj9cIiArIHFzKSA6IHFzO1xuICAgIH1cblxuICAgIC8vXG4gICAgZnVuY3Rpb24gZ2V0VXJsKCkge1xuICAgICAgICB2YXIgZW5kcG9pbnQgPSBjb25maWcuZW5kcG9pbnQ7XG5cbiAgICAgICAgdmFyIHN1YnN0RW5kcG9pbnQgPSBlbmRwb2ludC5yZXBsYWNlKHBhcmFtUGF0dGVybiwgZnVuY3Rpb24gKG1hdGNoKSB7XG4gICAgICAgICAgICBtYXRjaCA9IG1hdGNoLnN1YnN0cmluZygxLCBtYXRjaC5sZW5ndGgpO1xuICAgICAgICAgICAgdmFyIHBhcmFtID0gY29uZmlnLnBhcmFtZXRlcnNbbWF0Y2hdIHx8IFwiXCI7XG4gICAgICAgICAgICBkZWxldGUgY29uZmlnLnBhcmFtZXRlcnNbbWF0Y2hdO1xuICAgICAgICAgICAgcmV0dXJuIHBhcmFtO1xuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgdXJsID0gY29uZmlnLl9wcmVmaXggKyAoY29uZmlnLl9wcm90b2NvbCA/IChjb25maWcuX3Byb3RvY29sICsgXCI6Ly9cIikgOiBcIlwiKSArIGNvbmZpZy5fZG9tYWluICsgKGNvbmZpZy5fcG9ydCA/IChcIjpcIiArIGNvbmZpZy5fcG9ydCkgOiBcIlwiKSArIFwiL1wiICsgc3Vic3RFbmRwb2ludCArIHF1ZXJ5U3RyaW5nKCkgKyAoY29uZmlnLmZyYWdtZW50ID8gKFwiI1wiICsgY29uZmlnLmZyYWdtZW50KSA6IFwiXCIpO1xuICAgICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIHJldHVybiB1cmw7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB1cmxNb2R1bGU7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL3NyYy9pbmRleC5qc1wiKTtcbiIsIi8vIHJlcXVpcmUoJ2ZzJykucmVhZGRpclN5bmMoX19kaXJuYW1lICsgJy8nKS5mb3JFYWNoKGZ1bmN0aW9uKGZpbGUpIHtcbi8vICAgICBpZiAoZmlsZS5tYXRjaCgvLitcXC5qcy9nKSAhPT0gbnVsbCAmJiBmaWxlICE9PSBfX2ZpbGVuYW1lKSB7XG4vLyBcdHZhciBuYW1lID0gZmlsZS5yZXBsYWNlKCcuanMnLCAnJyk7XG4vLyBcdG1vZHVsZS5leHBvcnRzW25hbWVdID0gcmVxdWlyZSgnLi8nICsgZmlsZSk7XG4vLyAgICAgfVxuLy8gfSk7XG5cbi8vIFNhbWUgYXNcbnZhciB1dGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzLmpzXCIpO1xudXRpbHMucmVkdWNlID0gcmVxdWlyZShcIi4vcmVkdWNlLmpzXCIpO1xudXRpbHMucG5nID0gcmVxdWlyZShcIi4vcG5nLmpzXCIpO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdXRpbHM7XG4iLCJ2YXIgcG5nID0gZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGRvY3R5cGUgPSAnPD94bWwgdmVyc2lvbj1cIjEuMFwiIHN0YW5kYWxvbmU9XCJub1wiPz48IURPQ1RZUEUgc3ZnIFBVQkxJQyBcIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOXCIgXCJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGRcIj4nO1xuXG4gICAgdmFyIHNjYWxlX2ZhY3RvciA9IDE7XG4gICAgLy8gdmFyIGZpbGVuYW1lID0gJ2ltYWdlLnBuZyc7XG5cbiAgICAvLyBSZXN0cmljdCB0aGUgY3NzIHRvIGFwcGx5IHRvIHRoZSBmb2xsb3dpbmcgYXJyYXkgKGhyZWZzKVxuICAgIC8vIFRPRE86IHN1YnN0aXR1dGUgdGhpcyBieSBhbiBhcnJheSBvZiByZWdleHBcbiAgICB2YXIgY3NzOyAvLyBJZiB1bmRlZmluZWQsIHVzZSBhbGwgc3R5bGVzaGVldHNcbiAgICAvLyB2YXIgaW5saW5lX2ltYWdlc19vcHQgPSB0cnVlOyAvLyBJZiB0cnVlLCBpbmxpbmUgaW1hZ2VzXG5cbiAgICB2YXIgaW1nX2NiYWsgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgIHZhciBwbmdfZXhwb3J0ID0gZnVuY3Rpb24gKGZyb21fc3ZnKSB7XG4gICAgICAgIGZyb21fc3ZnID0gZnJvbV9zdmcubm9kZSgpO1xuICAgICAgICAvLyB2YXIgc3ZnID0gZGl2LnF1ZXJ5U2VsZWN0b3IoJ3N2ZycpO1xuXG4gICAgICAgIHZhciBpbmxpbmVfaW1hZ2VzID0gZnVuY3Rpb24gKGNiYWspIHtcbiAgICAgICAgICAgIHZhciBpbWFnZXMgPSBkMy5zZWxlY3QoZnJvbV9zdmcpXG4gICAgICAgICAgICAgICAgLnNlbGVjdEFsbCgnaW1hZ2UnKTtcblxuICAgICAgICAgICAgdmFyIHJlbWFpbmluZyA9IGltYWdlc1swXS5sZW5ndGg7XG4gICAgICAgICAgICBpZiAocmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgICAgICAgY2JhaygpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpbWFnZXNcbiAgICAgICAgICAgICAgICAuZWFjaCAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaW1hZ2UgPSBkMy5zZWxlY3QodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgaW1nLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbnZhcy53aWR0aCA9IGltZy53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbnZhcy5oZWlnaHQgPSBpbWcuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShpbWcsIDAsIDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVyaSA9IGNhbnZhcy50b0RhdGFVUkwoJ2ltYWdlL3BuZycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW1hZ2UuYXR0cignaHJlZicsIHVyaSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW1haW5pbmctLTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYmFrKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGltZy5zcmMgPSBpbWFnZS5hdHRyKCdocmVmJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgbW92ZV9jaGlsZHJlbiA9IGZ1bmN0aW9uIChzcmMsIGRlc3QpIHtcbiAgICAgICAgICAgIHZhciBjaGlsZHJlbiA9IHNyYy5jaGlsZHJlbiB8fCBzcmMuY2hpbGROb2RlcztcbiAgICAgICAgICAgIHdoaWxlIChjaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5bMF07XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkLm5vZGVUeXBlICE9PSAxLypOb2RlLkVMRU1FTlRfTk9ERSovKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBkZXN0LmFwcGVuZENoaWxkKGNoaWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBkZXN0O1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBzdHlsaW5nID0gZnVuY3Rpb24gKGRvbSkge1xuICAgICAgICAgICAgdmFyIHVzZWQgPSBcIlwiO1xuICAgICAgICAgICAgdmFyIHNoZWV0cyA9IGRvY3VtZW50LnN0eWxlU2hlZXRzO1xuICAgICAgICAgICAgLy8gdmFyIHNoZWV0cyA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPHNoZWV0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBocmVmID0gc2hlZXRzW2ldLmhyZWYgfHwgXCJcIjtcbiAgICAgICAgICAgICAgICBpZiAoY3NzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBza2lwID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgYz0wOyBjPGNzcy5sZW5ndGg7IGMrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhyZWYuaW5kZXhPZihjc3NbY10pID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBza2lwID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNraXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBydWxlcyA9IHNoZWV0c1tpXS5jc3NSdWxlcyB8fCBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHJ1bGVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBydWxlID0gcnVsZXNbal07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YocnVsZS5zdHlsZSkgIT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVsZW1zID0gZG9tLnF1ZXJ5U2VsZWN0b3JBbGwocnVsZS5zZWxlY3RvclRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VkICs9IHJ1bGUuc2VsZWN0b3JUZXh0ICsgXCIgeyBcIiArIHJ1bGUuc3R5bGUuY3NzVGV4dCArIFwiIH1cXG5cIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgYXJlIDxkZWZzPiBhbHJlYWR5XG4gICAgICAgICAgICB2YXIgZGVmcyA9IGRvbS5xdWVyeVNlbGVjdG9yKFwiZGVmc1wiKSB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkZWZzJyk7XG4gICAgICAgICAgICB2YXIgcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgICAgICAgICBzLnNldEF0dHJpYnV0ZSgndHlwZScsICd0ZXh0L2NzcycpO1xuICAgICAgICAgICAgcy5pbm5lckhUTUwgPSBcIjwhW0NEQVRBW1xcblwiICsgdXNlZCArIFwiXFxuXV0+XCI7XG5cbiAgICAgICAgICAgIC8vIHZhciBkZWZzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGVmcycpO1xuICAgICAgICAgICAgZGVmcy5hcHBlbmRDaGlsZChzKTtcbiAgICAgICAgICAgIHJldHVybiBkZWZzO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlubGluZV9pbWFnZXMgKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIHZhciBzdmcgPSBkaXYucXVlcnlTZWxlY3Rvcignc3ZnJyk7XG4gICAgICAgICAgICB2YXIgb3V0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICAgICAgdmFyIGNsb25lID0gZnJvbV9zdmcuY2xvbmVOb2RlKHRydWUpO1xuICAgICAgICAgICAgdmFyIHdpZHRoID0gcGFyc2VJbnQoY2xvbmUuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKTtcbiAgICAgICAgICAgIHZhciBoZWlnaHQgPSBwYXJzZUludChjbG9uZS5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcblxuICAgICAgICAgICAgY2xvbmUuc2V0QXR0cmlidXRlKFwidmVyc2lvblwiLCBcIjEuMVwiKTtcbiAgICAgICAgICAgIGNsb25lLnNldEF0dHJpYnV0ZShcInhtbG5zXCIsIFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIik7XG4gICAgICAgICAgICBjbG9uZS5zZXRBdHRyaWJ1dGUoXCJ4bWxuczp4bGlua1wiLCBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIik7XG4gICAgICAgICAgICBjbG9uZS5zZXRBdHRyaWJ1dGUoXCJ3aWR0aFwiLCB3aWR0aCAqIHNjYWxlX2ZhY3Rvcik7XG4gICAgICAgICAgICBjbG9uZS5zZXRBdHRyaWJ1dGUoXCJoZWlnaHRcIiwgaGVpZ2h0ICogc2NhbGVfZmFjdG9yKTtcbiAgICAgICAgICAgIHZhciBzY2FsaW5nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImdcIik7XG4gICAgICAgICAgICBzY2FsaW5nLnNldEF0dHJpYnV0ZShcInRyYW5zZm9ybVwiLCBcInNjYWxlKFwiICsgc2NhbGVfZmFjdG9yICsgXCIpXCIpO1xuICAgICAgICAgICAgY2xvbmUuYXBwZW5kQ2hpbGQobW92ZV9jaGlsZHJlbihjbG9uZSwgc2NhbGluZykpO1xuICAgICAgICAgICAgb3V0ZXIuYXBwZW5kQ2hpbGQoY2xvbmUpO1xuXG4gICAgICAgICAgICBjbG9uZS5pbnNlcnRCZWZvcmUgKHN0eWxpbmcoY2xvbmUpLCBjbG9uZS5maXJzdENoaWxkKTtcblxuICAgICAgICAgICAgdmFyIHN2ZyA9IGRvY3R5cGUgKyBvdXRlci5pbm5lckhUTUw7XG4gICAgICAgICAgICBzdmcgPSBzdmcucmVwbGFjZSAoXCJub25lXCIsIFwiYmxvY2tcIik7IC8vIEluIGNhc2UgdGhlIHN2ZyBpcyBub3QgYmVpbmcgZGlzcGxheWVkLCBpdCBpcyBpZ25vcmVkIGluIEZGXG4gICAgICAgICAgICB2YXIgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcblxuICAgICAgICAgICAgaW1hZ2Uuc3JjID0gJ2RhdGE6aW1hZ2Uvc3ZnK3htbDtiYXNlNjQsJyArIHdpbmRvdy5idG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChzdmcpKSk7XG4gICAgICAgICAgICBpbWFnZS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgICAgICAgICAgY2FudmFzLndpZHRoID0gaW1hZ2Uud2lkdGg7XG4gICAgICAgICAgICAgICAgY2FudmFzLmhlaWdodCA9IGltYWdlLmhlaWdodDtcbiAgICAgICAgICAgICAgICB2YXIgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICAgICAgICAgIGNvbnRleHQuZHJhd0ltYWdlKGltYWdlLCAwLCAwKTtcblxuICAgICAgICAgICAgICAgIHZhciBzcmMgPSBjYW52YXMudG9EYXRhVVJMKCdpbWFnZS9wbmcnKTtcbiAgICAgICAgICAgICAgICBpbWdfY2JhayAoc3JjKTtcbiAgICAgICAgICAgICAgICAvLyB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgICAgICAgICAvLyBhLmRvd25sb2FkID0gZmlsZW5hbWU7XG4gICAgICAgICAgICAgICAgLy8gYS5ocmVmID0gY2FudmFzLnRvRGF0YVVSTCgnaW1hZ2UvcG5nJyk7XG4gICAgICAgICAgICAgICAgLy8gZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhKTtcbiAgICAgICAgICAgICAgICAvLyBhLmNsaWNrKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgIH07XG4gICAgcG5nX2V4cG9ydC5zY2FsZV9mYWN0b3IgPSBmdW5jdGlvbiAoZikge1xuICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBzY2FsZV9mYWN0b3I7XG4gICAgICAgIH1cbiAgICAgICAgc2NhbGVfZmFjdG9yID0gZjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHBuZ19leHBvcnQuY2FsbGJhY2sgPSBmdW5jdGlvbiAoY2Jhaykge1xuICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBpbWdfY2JhaztcbiAgICAgICAgfVxuICAgICAgICBpbWdfY2JhayA9IGNiYWs7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICBwbmdfZXhwb3J0LnN0eWxlc2hlZXRzID0gZnVuY3Rpb24gKHJlc3RyaWN0Q3NzKSB7XG4gICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNzcztcbiAgICAgICAgfVxuICAgICAgICBjc3MgPSByZXN0cmljdENzcztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8vIHBuZ19leHBvcnQuZmlsZW5hbWUgPSBmdW5jdGlvbiAoZikge1xuICAgIC8vIFx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgLy8gXHQgICAgcmV0dXJuIGZpbGVuYW1lO1xuICAgIC8vIFx0fVxuICAgIC8vIFx0ZmlsZW5hbWUgPSBmO1xuICAgIC8vIFx0cmV0dXJuIHBuZ19leHBvcnQ7XG4gICAgLy8gfTtcblxuICAgIHJldHVybiBwbmdfZXhwb3J0O1xufTtcblxudmFyIGRvd25sb2FkID0gZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGZpbGVuYW1lID0gJ2ltYWdlLnBuZyc7XG4gICAgdmFyIG1heF9zaXplID0ge1xuICAgICAgICBsaW1pdDogSW5maW5pdHksXG4gICAgICAgIG9uRXJyb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaW1hZ2UgdG9vIGxhcmdlXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBwbmdfZXhwb3J0ID0gcG5nKClcbiAgICAgICAgLmNhbGxiYWNrIChmdW5jdGlvbiAoc3JjKSB7XG4gICAgICAgICAgICB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgICAgIGEuZG93bmxvYWQgPSBmaWxlbmFtZTtcbiAgICAgICAgICAgIGEuaHJlZiA9IHNyYztcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYSk7XG5cbiAgICAgICAgICAgIGlmIChhLmhyZWYubGVuZ3RoID4gbWF4X3NpemUubGltaXQpIHtcbiAgICAgICAgICAgICAgICBhLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoYSk7XG4gICAgICAgICAgICAgICAgbWF4X3NpemUub25FcnJvcigpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhLmNsaWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vICAgICBhLmNsaWNrKCk7XG4gICAgICAgICAgICAvLyB9LCAzMDAwKTtcbiAgICAgICAgfSk7XG5cbiAgICBwbmdfZXhwb3J0LmZpbGVuYW1lID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGZpbGVuYW1lO1xuICAgICAgICB9XG4gICAgICAgIGZpbGVuYW1lID0gZm47XG4gICAgICAgIHJldHVybiBwbmdfZXhwb3J0O1xuICAgIH07XG5cbiAgICBwbmdfZXhwb3J0LmxpbWl0ID0gZnVuY3Rpb24gKGwpIHtcbiAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF4X3NpemU7XG4gICAgICAgIH1cbiAgICAgICAgbWF4X3NpemUgPSBsO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgcmV0dXJuIHBuZ19leHBvcnQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBkb3dubG9hZDtcbiIsInZhciByZWR1Y2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNtb290aCA9IDU7XG4gICAgdmFyIHZhbHVlID0gJ3ZhbCc7XG4gICAgdmFyIHJlZHVuZGFudCA9IGZ1bmN0aW9uIChhLCBiKSB7XG5cdGlmIChhIDwgYikge1xuXHQgICAgcmV0dXJuICgoYi1hKSA8PSAoYiAqIDAuMikpO1xuXHR9XG5cdHJldHVybiAoKGEtYikgPD0gKGEgKiAwLjIpKTtcbiAgICB9O1xuICAgIHZhciBwZXJmb3JtX3JlZHVjZSA9IGZ1bmN0aW9uIChhcnIpIHtyZXR1cm4gYXJyO307XG5cbiAgICB2YXIgcmVkdWNlID0gZnVuY3Rpb24gKGFycikge1xuXHRpZiAoIWFyci5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBhcnI7XG5cdH1cblx0dmFyIHNtb290aGVkID0gcGVyZm9ybV9zbW9vdGgoYXJyKTtcblx0dmFyIHJlZHVjZWQgID0gcGVyZm9ybV9yZWR1Y2Uoc21vb3RoZWQpO1xuXHRyZXR1cm4gcmVkdWNlZDtcbiAgICB9O1xuXG4gICAgdmFyIG1lZGlhbiA9IGZ1bmN0aW9uICh2LCBhcnIpIHtcblx0YXJyLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcblx0ICAgIHJldHVybiBhW3ZhbHVlXSAtIGJbdmFsdWVdO1xuXHR9KTtcblx0aWYgKGFyci5sZW5ndGggJSAyKSB7XG5cdCAgICB2W3ZhbHVlXSA9IGFyclt+fihhcnIubGVuZ3RoIC8gMildW3ZhbHVlXTtcdCAgICBcblx0fSBlbHNlIHtcblx0ICAgIHZhciBuID0gfn4oYXJyLmxlbmd0aCAvIDIpIC0gMTtcblx0ICAgIHZbdmFsdWVdID0gKGFycltuXVt2YWx1ZV0gKyBhcnJbbisxXVt2YWx1ZV0pIC8gMjtcblx0fVxuXG5cdHJldHVybiB2O1xuICAgIH07XG5cbiAgICB2YXIgY2xvbmUgPSBmdW5jdGlvbiAoc291cmNlKSB7XG5cdHZhciB0YXJnZXQgPSB7fTtcblx0Zm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcblx0ICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcblx0XHR0YXJnZXRbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG5cdCAgICB9XG5cdH1cblx0cmV0dXJuIHRhcmdldDtcbiAgICB9O1xuXG4gICAgdmFyIHBlcmZvcm1fc21vb3RoID0gZnVuY3Rpb24gKGFycikge1xuXHRpZiAoc21vb3RoID09PSAwKSB7IC8vIG5vIHNtb290aFxuXHQgICAgcmV0dXJuIGFycjtcblx0fVxuXHR2YXIgc21vb3RoX2FyciA9IFtdO1xuXHRmb3IgKHZhciBpPTA7IGk8YXJyLmxlbmd0aDsgaSsrKSB7XG5cdCAgICB2YXIgbG93ID0gKGkgPCBzbW9vdGgpID8gMCA6IChpIC0gc21vb3RoKTtcblx0ICAgIHZhciBoaWdoID0gKGkgPiAoYXJyLmxlbmd0aCAtIHNtb290aCkpID8gYXJyLmxlbmd0aCA6IChpICsgc21vb3RoKTtcblx0ICAgIHNtb290aF9hcnJbaV0gPSBtZWRpYW4oY2xvbmUoYXJyW2ldKSwgYXJyLnNsaWNlKGxvdyxoaWdoKzEpKTtcblx0fVxuXHRyZXR1cm4gc21vb3RoX2FycjtcbiAgICB9O1xuXG4gICAgcmVkdWNlLnJlZHVjZXIgPSBmdW5jdGlvbiAoY2Jhaykge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBwZXJmb3JtX3JlZHVjZTtcblx0fVxuXHRwZXJmb3JtX3JlZHVjZSA9IGNiYWs7XG5cdHJldHVybiByZWR1Y2U7XG4gICAgfTtcblxuICAgIHJlZHVjZS5yZWR1bmRhbnQgPSBmdW5jdGlvbiAoY2Jhaykge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiByZWR1bmRhbnQ7XG5cdH1cblx0cmVkdW5kYW50ID0gY2Jhaztcblx0cmV0dXJuIHJlZHVjZTtcbiAgICB9O1xuXG4gICAgcmVkdWNlLnZhbHVlID0gZnVuY3Rpb24gKHZhbCkge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiB2YWx1ZTtcblx0fVxuXHR2YWx1ZSA9IHZhbDtcblx0cmV0dXJuIHJlZHVjZTtcbiAgICB9O1xuXG4gICAgcmVkdWNlLnNtb290aCA9IGZ1bmN0aW9uICh2YWwpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gc21vb3RoO1xuXHR9XG5cdHNtb290aCA9IHZhbDtcblx0cmV0dXJuIHJlZHVjZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHJlZHVjZTtcbn07XG5cbnZhciBibG9jayA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmVkID0gcmVkdWNlKClcblx0LnZhbHVlKCdzdGFydCcpO1xuXG4gICAgdmFyIHZhbHVlMiA9ICdlbmQnO1xuXG4gICAgdmFyIGpvaW4gPSBmdW5jdGlvbiAob2JqMSwgb2JqMikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgJ29iamVjdCcgOiB7XG4gICAgICAgICAgICAgICAgJ3N0YXJ0JyA6IG9iajEub2JqZWN0W3JlZC52YWx1ZSgpXSxcbiAgICAgICAgICAgICAgICAnZW5kJyAgIDogb2JqMlt2YWx1ZTJdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3ZhbHVlJyAgOiBvYmoyW3ZhbHVlMl1cbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgLy8gdmFyIGpvaW4gPSBmdW5jdGlvbiAob2JqMSwgb2JqMikgeyByZXR1cm4gb2JqMSB9O1xuXG4gICAgcmVkLnJlZHVjZXIoIGZ1bmN0aW9uIChhcnIpIHtcblx0dmFyIHZhbHVlID0gcmVkLnZhbHVlKCk7XG5cdHZhciByZWR1bmRhbnQgPSByZWQucmVkdW5kYW50KCk7XG5cdHZhciByZWR1Y2VkX2FyciA9IFtdO1xuXHR2YXIgY3VyciA9IHtcblx0ICAgICdvYmplY3QnIDogYXJyWzBdLFxuXHQgICAgJ3ZhbHVlJyAgOiBhcnJbMF1bdmFsdWUyXVxuXHR9O1xuXHRmb3IgKHZhciBpPTE7IGk8YXJyLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAocmVkdW5kYW50IChhcnJbaV1bdmFsdWVdLCBjdXJyLnZhbHVlKSkge1xuXHRcdGN1cnIgPSBqb2luKGN1cnIsIGFycltpXSk7XG5cdFx0Y29udGludWU7XG5cdCAgICB9XG5cdCAgICByZWR1Y2VkX2Fyci5wdXNoIChjdXJyLm9iamVjdCk7XG5cdCAgICBjdXJyLm9iamVjdCA9IGFycltpXTtcblx0ICAgIGN1cnIudmFsdWUgPSBhcnJbaV0uZW5kO1xuXHR9XG5cdHJlZHVjZWRfYXJyLnB1c2goY3Vyci5vYmplY3QpO1xuXG5cdC8vIHJlZHVjZWRfYXJyLnB1c2goYXJyW2Fyci5sZW5ndGgtMV0pO1xuXHRyZXR1cm4gcmVkdWNlZF9hcnI7XG4gICAgfSk7XG5cbiAgICByZWR1Y2Uuam9pbiA9IGZ1bmN0aW9uIChjYmFrKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIGpvaW47XG5cdH1cblx0am9pbiA9IGNiYWs7XG5cdHJldHVybiByZWQ7XG4gICAgfTtcblxuICAgIHJlZHVjZS52YWx1ZTIgPSBmdW5jdGlvbiAoZmllbGQpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gdmFsdWUyO1xuXHR9XG5cdHZhbHVlMiA9IGZpZWxkO1xuXHRyZXR1cm4gcmVkO1xuICAgIH07XG5cbiAgICByZXR1cm4gcmVkO1xufTtcblxudmFyIGxpbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJlZCA9IHJlZHVjZSgpO1xuXG4gICAgcmVkLnJlZHVjZXIgKCBmdW5jdGlvbiAoYXJyKSB7XG5cdHZhciByZWR1bmRhbnQgPSByZWQucmVkdW5kYW50KCk7XG5cdHZhciB2YWx1ZSA9IHJlZC52YWx1ZSgpO1xuXHR2YXIgcmVkdWNlZF9hcnIgPSBbXTtcblx0dmFyIGN1cnIgPSBhcnJbMF07XG5cdGZvciAodmFyIGk9MTsgaTxhcnIubGVuZ3RoLTE7IGkrKykge1xuXHQgICAgaWYgKHJlZHVuZGFudCAoYXJyW2ldW3ZhbHVlXSwgY3Vyclt2YWx1ZV0pKSB7XG5cdFx0Y29udGludWU7XG5cdCAgICB9XG5cdCAgICByZWR1Y2VkX2Fyci5wdXNoIChjdXJyKTtcblx0ICAgIGN1cnIgPSBhcnJbaV07XG5cdH1cblx0cmVkdWNlZF9hcnIucHVzaChjdXJyKTtcblx0cmVkdWNlZF9hcnIucHVzaChhcnJbYXJyLmxlbmd0aC0xXSk7XG5cdHJldHVybiByZWR1Y2VkX2FycjtcbiAgICB9KTtcblxuICAgIHJldHVybiByZWQ7XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcmVkdWNlO1xubW9kdWxlLmV4cG9ydHMubGluZSA9IGxpbmU7XG5tb2R1bGUuZXhwb3J0cy5ibG9jayA9IGJsb2NrO1xuXG4iLCJcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGl0ZXJhdG9yIDogZnVuY3Rpb24oaW5pdF92YWwpIHtcblx0dmFyIGkgPSBpbml0X3ZhbCB8fCAwO1xuXHR2YXIgaXRlciA9IGZ1bmN0aW9uICgpIHtcblx0ICAgIHJldHVybiBpKys7XG5cdH07XG5cdHJldHVybiBpdGVyO1xuICAgIH0sXG5cbiAgICBzY3JpcHRfcGF0aCA6IGZ1bmN0aW9uIChzY3JpcHRfbmFtZSkgeyAvLyBzY3JpcHRfbmFtZSBpcyB0aGUgZmlsZW5hbWVcblx0dmFyIHNjcmlwdF9zY2FwZWQgPSBzY3JpcHRfbmFtZS5yZXBsYWNlKC9bLVxcL1xcXFxeJCorPy4oKXxbXFxde31dL2csICdcXFxcJCYnKTtcblx0dmFyIHNjcmlwdF9yZSA9IG5ldyBSZWdFeHAoc2NyaXB0X3NjYXBlZCArICckJyk7XG5cdHZhciBzY3JpcHRfcmVfc3ViID0gbmV3IFJlZ0V4cCgnKC4qKScgKyBzY3JpcHRfc2NhcGVkICsgJyQnKTtcblxuXHQvLyBUT0RPOiBUaGlzIHJlcXVpcmVzIHBoYW50b20uanMgb3IgYSBzaW1pbGFyIGhlYWRsZXNzIHdlYmtpdCB0byB3b3JrIChkb2N1bWVudClcblx0dmFyIHNjcmlwdHMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0Jyk7XG5cdHZhciBwYXRoID0gXCJcIjsgIC8vIERlZmF1bHQgdG8gY3VycmVudCBwYXRoXG5cdGlmKHNjcmlwdHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZm9yKHZhciBpIGluIHNjcmlwdHMpIHtcblx0XHRpZihzY3JpcHRzW2ldLnNyYyAmJiBzY3JpcHRzW2ldLnNyYy5tYXRjaChzY3JpcHRfcmUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzY3JpcHRzW2ldLnNyYy5yZXBsYWNlKHNjcmlwdF9yZV9zdWIsICckMScpO1xuXHRcdH1cbiAgICAgICAgICAgIH1cblx0fVxuXHRyZXR1cm4gcGF0aDtcbiAgICB9LFxuXG4gICAgZGVmZXJfY2FuY2VsIDogZnVuY3Rpb24gKGNiYWssIHRpbWUpIHtcbiAgICAgICAgdmFyIHRpY2s7XG5cbiAgICAgICAgdmFyIGRlZmVyX2NhbmNlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aWNrKTtcbiAgICAgICAgICAgIHRpY2sgPSBzZXRUaW1lb3V0IChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY2Jhay5hcHBseSAodGhhdCwgYXJncyk7XG4gICAgICAgICAgICB9LCB0aW1lKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gZGVmZXJfY2FuY2VsO1xuICAgIH1cbn07XG4iLCJ2YXIgYm9hcmQgPSByZXF1aXJlKFwidG50LmJvYXJkXCIpO1xudmFyIGFwaWpzID0gcmVxdWlyZShcInRudC5hcGlcIik7XG5cbnZhciBkYXRhX2dlbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGVSZXN0ID0gYm9hcmQudHJhY2suZGF0YS5nZW5vbWUuZW5zZW1ibDtcblxuICAgIHZhciBkYXRhID0gYm9hcmQudHJhY2suZGF0YS5hc3luYygpXG4gICAgICAgIC5yZXRyaWV2ZXIgKGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgICAgICAvLyB2YXIgZVJlc3QgPSBkYXRhLmVuc2VtYmwoKTtcbiAgICAgICAgICAgIC8vIHZhciBzY2FsZSA9IHRyYWNrLmRpc3BsYXkoKS5zY2FsZSgpO1xuICAgICAgICAgICAgdmFyIHVybCA9IGVSZXN0LnVybCgpXG4gICAgICAgICAgICAgICAgLmVuZHBvaW50KFwib3ZlcmxhcC9yZWdpb24vOnNwZWNpZXMvOnJlZ2lvblwiKVxuICAgICAgICAgICAgICAgIC5wYXJhbWV0ZXJzKHtcbiAgICAgICAgICAgICAgICAgICAgc3BlY2llcyA6IG9iai5zcGVjaWVzLFxuICAgICAgICAgICAgICAgICAgICByZWdpb24gIDogKG9iai5jaHIgKyBcIjpcIiArIG9iai5mcm9tICsgXCItXCIgKyBvYmoudG8pLFxuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlOiBvYmouZmVhdHVyZXMgfHwgW1wiZ2VuZVwiXVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gdmFyIHVybCA9IGVSZXN0LnVybC5yZWdpb24ob2JqKTtcbiAgICAgICAgICAgIHJldHVybiBlUmVzdC5jYWxsKHVybClcbiAgICAgICAgICAgICAgLnRoZW4gKGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIGdlbmVzID0gcmVzcC5ib2R5O1xuICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgZGlzcGxheV9sYWJlbCBmaWVsZFxuICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxnZW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ2VuZSA9IGdlbmVzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ2VuZS5zdHJhbmQgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZW5lLmRpc3BsYXlfbGFiZWwgPSBcIjxcIiArIGdlbmUuZXh0ZXJuYWxfbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdlbmUuZGlzcGxheV9sYWJlbCA9IGdlbmUuZXh0ZXJuYWxfbmFtZSArIFwiPlwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBnZW5lcztcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgfSk7XG5cbiAgICBhcGlqcyhkYXRhKVxuICAgICAgICAuZ2V0c2V0KCdlbnNlbWJsJyk7XG5cbiAgICByZXR1cm4gZGF0YTtcbn07XG5cbnZhciBkYXRhX3RyYW5zY3JpcHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGVSZXN0ID0gYm9hcmQudHJhY2suZGF0YS5nZW5vbWUuZW5zZW1ibDtcblxuICAgIHZhciBkYXRhID0gYm9hcmQudHJhY2suZGF0YS5hc3luYygpXG4gICAgICAgIC5yZXRyaWV2ZXIgKGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgICAgIHZhciB1cmwgPSBlUmVzdC51cmwoKVxuICAgICAgICAgICAgICAgIC5lbmRwb2ludChcIm92ZXJsYXAvcmVnaW9uLzpzcGVjaWVzLzpyZWdpb25cIilcbiAgICAgICAgICAgICAgICAucGFyYW1ldGVycyh7XG4gICAgICAgICAgICAgICAgICAgIHNwZWNpZXMgOiBvYmouc3BlY2llcyxcbiAgICAgICAgICAgICAgICAgICAgcmVnaW9uIDogKG9iai5jaHIgKyBcIjpcIiArIG9iai5mcm9tICsgXCItXCIgKyBvYmoudG8pLFxuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlIDogW1wiZ2VuZVwiLCBcInRyYW5zY3JpcHRcIiwgXCJleG9uXCIsIFwiY2RzXCJdXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gZVJlc3QuY2FsbCh1cmwpXG4gICAgICAgICAgICAgIC50aGVuIChmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgdmFyIGVsZW1zID0gcmVzcC5ib2R5O1xuICAgICAgICAgICAgICAgICAgdmFyIGdlbmVzID0gZGF0YS5yZWdpb24yZ2VuZXMoZWxlbXMpO1xuICAgICAgICAgICAgICAgICAgdmFyIHRyYW5zY3JpcHRzID0gW107XG4gICAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8Z2VuZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgZyA9IGdlbmVzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgIHZhciB0cyA9IGRhdGEuZ2VuZTJUcmFuc2NyaXB0cyhnKTtcbiAgICAgICAgICAgICAgICAgICAgICB0cmFuc2NyaXB0cyA9IHRyYW5zY3JpcHRzLmNvbmNhdCh0cyk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHJhbnNjcmlwdHM7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgIGFwaWpzKGRhdGEpXG4gICAgICAgIC5tZXRob2QoXCJnZW5lMlRyYW5zY3JpcHRzXCIsIGZ1bmN0aW9uIChnKSB7XG4gICAgICAgICAgICB2YXIgdHMgPSBnLlRyYW5zY3JpcHQ7XG4gICAgICAgICAgICB2YXIgdHJhbnNjcmlwdHMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGo9MDsgajx0cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciB0ID0gdHNbal07XG4gICAgICAgICAgICAgICAgdC5leG9ucyA9IHRyYW5zZm9ybUV4b25zKHQpO1xuICAgICAgICAgICAgICAgIHQuaW50cm9ucyA9IGV4b25zVG9FeG9uc0FuZEludHJvbnModCk7XG4gICAgICAgICAgICAgICAgLy92YXIgb2JqID0gZXhvbnNUb0V4b25zQW5kSW50cm9ucyAodHJhbnNmb3JtRXhvbnModCksIHQpO1xuICAgICAgICAgICAgICAgIC8vIHQubmFtZSA9IFt7XG4gICAgICAgICAgICAgICAgLy8gICAgIHBvczogdC5zdGFydCxcbiAgICAgICAgICAgICAgICAvLyAgICAgbmFtZSA6IHQuZGlzcGxheV9uYW1lLFxuICAgICAgICAgICAgICAgIC8vICAgICBzdHJhbmQgOiB0LnN0cmFuZCxcbiAgICAgICAgICAgICAgICAvLyAgICAgdHJhbnNjcmlwdCA6IHRcbiAgICAgICAgICAgICAgICAvLyB9XTtcbiAgICAgICAgICAgICAgICB0LmRpc3BsYXlfbGFiZWwgPSB0LnN0cmFuZCA9PT0gMSA/ICh0LmRpc3BsYXlfbmFtZSArIFwiPlwiKSA6IChcIjxcIiArIHQuZGlzcGxheV9uYW1lKTtcbiAgICAgICAgICAgICAgICB0LmtleSA9ICh0LmlkICsgXCJfXCIgKyB0LmV4b25zLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgLy9vYmouaWQgPSB0LmlkO1xuICAgICAgICAgICAgICAgIHQuZ2VuZSA9IGc7XG4gICAgICAgICAgICAgICAgLy8gb2JqLnRyYW5zY3JpcHQgPSB0O1xuICAgICAgICAgICAgICAgIC8vIG9iai5leHRlcm5hbF9uYW1lID0gdC5kaXNwbGF5X25hbWU7XG4gICAgICAgICAgICAgICAgLy9vYmouZGlzcGxheV9sYWJlbCA9IHQuZGlzcGxheV9sYWJlbDtcbiAgICAgICAgICAgICAgICAvL29iai5zdGFydCA9IHQuc3RhcnQ7XG4gICAgICAgICAgICAgICAgLy9vYmouZW5kID0gdC5lbmQ7XG4gICAgICAgICAgICAgICAgdHJhbnNjcmlwdHMucHVzaCh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cmFuc2NyaXB0cztcbiAgICAgICAgfSlcbiAgICAgICAgLm1ldGhvZChcInJlZ2lvbjJnZW5lc1wiLCBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICAgICAgICAgIHZhciBnZW5lVHJhbnNjcmlwdHMgPSB7fTtcbiAgICAgICAgICAgIHZhciBnZW5lcyA9IFtdO1xuICAgICAgICAgICAgdmFyIHRyYW5zY3JpcHRzID0ge307XG5cbiAgICAgICAgICAgIC8vIHRyYW5zY3JpcHRzXG4gICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8ZWxlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZSA9IGVsZW1zW2ldO1xuICAgICAgICAgICAgICAgIGlmIChlLmZlYXR1cmVfdHlwZSA9PSBcInRyYW5zY3JpcHRcIikge1xuICAgICAgICAgICAgICAgICAgICBlLmRpc3BsYXlfbmFtZSA9IGUuZXh0ZXJuYWxfbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNjcmlwdHNbZS5pZF0gPSBlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ2VuZVRyYW5zY3JpcHRzW2UuUGFyZW50XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnZW5lVHJhbnNjcmlwdHNbZS5QYXJlbnRdID0gW107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZ2VuZVRyYW5zY3JpcHRzW2UuUGFyZW50XS5wdXNoKGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZXhvbnNcbiAgICAgICAgICAgIGZvciAodmFyIGo9MDsgajxlbGVtcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciBlID0gZWxlbXNbal07XG4gICAgICAgICAgICAgICAgaWYgKGUuZmVhdHVyZV90eXBlID09PSBcImV4b25cIikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdCA9IHRyYW5zY3JpcHRzW2UuUGFyZW50XTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHQuRXhvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0LkV4b24gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0LkV4b24ucHVzaChlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGNkc1xuICAgICAgICAgICAgZm9yICh2YXIgaz0wOyBrPGVsZW1zLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGUgPSBlbGVtc1trXTtcbiAgICAgICAgICAgICAgICBpZiAoZS5mZWF0dXJlX3R5cGUgPT09IFwiY2RzXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHQgPSB0cmFuc2NyaXB0c1tlLlBhcmVudF07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0LlRyYW5zbGF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHQuVHJhbnNsYXRpb24gPSBlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChlLnN0YXJ0IDwgdC5UcmFuc2xhdGlvbi5zdGFydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdC5UcmFuc2xhdGlvbi5zdGFydCA9IGUuc3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGUuZW5kID4gdC5UcmFuc2xhdGlvbi5lbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHQuVHJhbnNsYXRpb24uZW5kID0gZS5lbmQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGdlbmVzXG4gICAgICAgICAgICBmb3IgKHZhciBoPTA7IGg8ZWxlbXMubGVuZ3RoOyBoKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZSA9IGVsZW1zW2hdO1xuICAgICAgICAgICAgICAgIGlmIChlLmZlYXR1cmVfdHlwZSA9PT0gXCJnZW5lXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5kaXNwbGF5X25hbWUgPSBlLmV4dGVybmFsX25hbWU7XG4gICAgICAgICAgICAgICAgICAgIGUuVHJhbnNjcmlwdCA9IGdlbmVUcmFuc2NyaXB0c1tlLmlkXTtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXMucHVzaChlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBnZW5lcztcbiAgICAgICAgfSk7XG5cblxuICAgIGZ1bmN0aW9uIGV4b25zVG9FeG9uc0FuZEludHJvbnMgKHQpIHtcbiAgICAgICAgdmFyIGV4b25zID0gdC5leG9ucztcbiAgICAgICAgLy92YXIgb2JqID0ge307XG4gICAgICAgIC8vb2JqLmV4b25zID0gZXhvbnM7XG4gICAgICAgIHZhciBpbnRyb25zID0gW107XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxleG9ucy5sZW5ndGgtMTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgaW50cm9uID0ge1xuICAgICAgICAgICAgICAgIHN0YXJ0IDogZXhvbnNbaV0udHJhbnNjcmlwdC5zdHJhbmQgPT09IDEgPyBleG9uc1tpXS5lbmQgOiBleG9uc1tpXS5zdGFydCxcbiAgICAgICAgICAgICAgICBlbmQgICA6IGV4b25zW2ldLnRyYW5zY3JpcHQuc3RyYW5kID09PSAxID8gZXhvbnNbaSsxXS5zdGFydCA6IGV4b25zW2krMV0uZW5kLFxuICAgICAgICAgICAgICAgIHRyYW5zY3JpcHQgOiB0XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaW50cm9ucy5wdXNoKGludHJvbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGludHJvbnM7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiB0cmFuc2Zvcm1FeG9ucyAodHJhbnNjcmlwdCkge1xuICAgICAgICB2YXIgdHJhbnNsYXRpb25TdGFydDtcbiAgICAgICAgdmFyIHRyYW5zbGF0aW9uRW5kO1xuICAgICAgICBpZiAodHJhbnNjcmlwdC5UcmFuc2xhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0cmFuc2xhdGlvblN0YXJ0ID0gdHJhbnNjcmlwdC5UcmFuc2xhdGlvbi5zdGFydDtcbiAgICAgICAgICAgIHRyYW5zbGF0aW9uRW5kID0gdHJhbnNjcmlwdC5UcmFuc2xhdGlvbi5lbmQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGV4b25zID0gdHJhbnNjcmlwdC5FeG9uO1xuXG4gICAgICAgIHZhciBuZXdFeG9ucyA9IFtdO1xuICAgICAgICBpZiAoZXhvbnMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxleG9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICh0cmFuc2NyaXB0LlRyYW5zbGF0aW9uID09PSB1bmRlZmluZWQpIHsgLy8gTk8gY29kaW5nIHRyYW5zY3JpcHRcbiAgICAgICAgICAgICAgICAgICAgbmV3RXhvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCAgIDogZXhvbnNbaV0uc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmQgICAgIDogZXhvbnNbaV0uZW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNjcmlwdCA6IHRyYW5zY3JpcHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RpbmcgIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQgIDogZXhvbnNbaV0uc3RhcnQgLSB0cmFuc2NyaXB0LnN0YXJ0XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChleG9uc1tpXS5zdGFydCA8IHRyYW5zbGF0aW9uU3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIDUnXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXhvbnNbaV0uZW5kIDwgdHJhbnNsYXRpb25TdGFydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENvbXBsZXRlbHkgbm9uIGNvZGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0V4b25zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydCAgOiBleG9uc1tpXS5zdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kICAgIDogZXhvbnNbaV0uZW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2NyaXB0IDogdHJhbnNjcmlwdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kaW5nIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldCAgOiBleG9uc1tpXS5zdGFydCAtIHRyYW5zY3JpcHQuc3RhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSGFzIDUnVVRSXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5jRXhvbjUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ICA6IGV4b25zW2ldLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmQgICAgOiB0cmFuc2xhdGlvblN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2NyaXB0IDogdHJhbnNjcmlwdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kaW5nIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldCAgOiBleG9uc1tpXS5zdGFydCAtIHRyYW5zY3JpcHQuc3RhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb2RpbmdFeG9uNSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgIDogdHJhbnNsYXRpb25TdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kICAgIDogZXhvbnNbaV0uZW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2NyaXB0IDogdHJhbnNjcmlwdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kaW5nIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9vZmZzZXQgIDogZXhvbnNbaV0uc3RhcnQgLSB0cmFuc2NyaXB0LnN0YXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldDogdHJhbnNsYXRpb25TdGFydCAtIHRyYW5zY3JpcHQuc3RhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChleG9uc1tpXS5zdHJhbmQgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RXhvbnMucHVzaChuY0V4b241KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RXhvbnMucHVzaChjb2RpbmdFeG9uNSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RXhvbnMucHVzaChjb2RpbmdFeG9uNSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0V4b25zLnB1c2gobmNFeG9uNSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGV4b25zW2ldLmVuZCA+IHRyYW5zbGF0aW9uRW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4b25zW2ldLnN0YXJ0ID4gdHJhbnNsYXRpb25FbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDb21wbGV0ZWx5IG5vbiBjb2RpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdFeG9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgICA6IGV4b25zW2ldLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmQgICAgIDogZXhvbnNbaV0uZW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2NyaXB0IDogdHJhbnNjcmlwdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kaW5nICA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQgIDogZXhvbnNbaV0uc3RhcnQgLSB0cmFuc2NyaXB0LnN0YXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhhcyAzJ1VUUlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb2RpbmdFeG9uMyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgIDogZXhvbnNbaV0uc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZCAgICA6IHRyYW5zbGF0aW9uRW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2NyaXB0IDogdHJhbnNjcmlwdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kaW5nIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ICA6IGV4b25zW2ldLnN0YXJ0IC0gdHJhbnNjcmlwdC5zdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5jRXhvbjMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ICA6IHRyYW5zbGF0aW9uRW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmQgICAgOiBleG9uc1tpXS5lbmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zY3JpcHQgOiB0cmFuc2NyaXB0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RpbmcgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9vZmZzZXQgIDogZXhvbnNbaV0uc3RhcnQgLSB0cmFuc2NyaXB0LnN0YXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldCA6IHRyYW5zbGF0aW9uRW5kIC0gdHJhbnNjcmlwdC5zdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4b25zW2ldLnN0cmFuZCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdFeG9ucy5wdXNoKGNvZGluZ0V4b24zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RXhvbnMucHVzaChuY0V4b24zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdFeG9ucy5wdXNoKG5jRXhvbjMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdFeG9ucy5wdXNoKGNvZGluZ0V4b24zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb2RpbmcgZXhvblxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3RXhvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgIDogZXhvbnNbaV0uc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kICAgIDogZXhvbnNbaV0uZW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zY3JpcHQgOiB0cmFuc2NyaXB0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGluZyA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ICA6IGV4b25zW2ldLnN0YXJ0IC0gdHJhbnNjcmlwdC5zdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ld0V4b25zO1xuICAgIH1cblxuICAgIHJldHVybiBkYXRhO1xufTtcblxudmFyIGRhdGFfc2VxdWVuY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGVSZXN0ID0gYm9hcmQudHJhY2suZGF0YS5nZW5vbWUuZW5zZW1ibDtcblxuICAgIHZhciBkYXRhID0gYm9hcmQudHJhY2suZGF0YS5hc3luYygpXG4gICAgICAgIC5yZXRyaWV2ZXIgKGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgICAgIGlmICgob2JqLnRvIC0gb2JqLmZyb20pIDwgZGF0YS5saW1pdCgpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHVybCA9IGVSZXN0LnVybCgpXG4gICAgICAgICAgICAgICAgICAgIC5lbmRwb2ludChcIi9zZXF1ZW5jZS9yZWdpb24vOnNwZWNpZXMvOnJlZ2lvblwiKVxuICAgICAgICAgICAgICAgICAgICAucGFyYW1ldGVycyh7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInNwZWNpZXNcIjogb2JqLnNwZWNpZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInJlZ2lvblwiOiAob2JqLmNociArIFwiOlwiICsgb2JqLmZyb20gKyBcIi4uXCIgKyBvYmoudG8pXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIHZhciB1cmwgPSBlUmVzdC51cmwuc2VxdWVuY2Uob2JqKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZVJlc3QuY2FsbCh1cmwpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuIChmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNlcSA9IHJlc3AuYm9keTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmaWVsZHMgPSBzZXEuaWQuc3BsaXQoXCI6XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZyb20gPSBmaWVsZHNbM107XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbnRzID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8c2VxLnNlcS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG50cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiArZnJvbSArIGksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcXVlbmNlOiBzZXEuc2VxW2ldXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnRzO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7IC8vIFJlZ2lvbiB0b28gd2lkZSBmb3Igc2VxdWVuY2VcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShbXSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgYXBpanMoZGF0YSlcbiAgICAgICAgLmdldHNldChcImxpbWl0XCIsIDE1MCk7XG5cbiAgICByZXR1cm4gZGF0YTtcbn07XG5cbi8vIGV4cG9ydFxudmFyIGdlbm9tZV9kYXRhID0ge1xuICAgIGdlbmUgOiBkYXRhX2dlbmUsXG4gICAgc2VxdWVuY2UgOiBkYXRhX3NlcXVlbmNlLFxuICAgIHRyYW5zY3JpcHQgOiBkYXRhX3RyYW5zY3JpcHRcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGdlbm9tZV9kYXRhO1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xudmFyIGxheW91dCA9IHJlcXVpcmUoXCIuL2xheW91dC5qc1wiKTtcbnZhciBib2FyZCA9IHJlcXVpcmUoXCJ0bnQuYm9hcmRcIik7XG5cbnZhciB0bnRfZmVhdHVyZV90cmFuc2NyaXB0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBmZWF0dXJlID0gYm9hcmQudHJhY2suZmVhdHVyZSgpXG4gICAgICAgIC5sYXlvdXQgKGJvYXJkLnRyYWNrLmxheW91dC5nZW5vbWUoKSlcbiAgICAgICAgLmluZGV4IChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgcmV0dXJuIGQua2V5O1xuICAgICAgICB9KTtcblxuICAgIGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAobmV3X2VsZW1zKSB7XG4gICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIHZhciB4U2NhbGUgPSBmZWF0dXJlLnNjYWxlKCk7XG4gICAgICAgIHZhciBncyA9IG5ld19lbGVtc1xuICAgICAgICAgICAgLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwidHJhbnNsYXRlKFwiICsgeFNjYWxlKGQuc3RhcnQpICsgXCIsXCIgKyAoZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zbG90X2hlaWdodCAqIGQuc2xvdCkgKyBcIilcIjtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIGdzXG4gICAgICAgICAgICAuYXBwZW5kKFwibGluZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCAwKVxuICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCB+fihmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLmdlbmVfaGVpZ2h0LzIpKVxuICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoeFNjYWxlKGQuZW5kKSAtIHhTY2FsZShkLnN0YXJ0KSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCB+fihmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLmdlbmVfaGVpZ2h0LzIpKVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIFwibm9uZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIiwgdHJhY2suY29sb3IoKSlcbiAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsIDIpXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24oNTAwKVxuICAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmVhdHVyZS5jb2xvcigpKGQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLy5hdHRyKFwic3Ryb2tlXCIsIGZlYXR1cmUuY29sb3IoKSk7XG5cbiAgICAgICAgLy8gZXhvbnNcbiAgICAgICAgLy8gcGFzcyB0aGUgXCJzbG90XCIgdG8gdGhlIGV4b25zIGFuZCBpbnRyb25zXG4gICAgICAgIG5ld19lbGVtcy5lYWNoIChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgaWYgKGQuZXhvbnMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8ZC5leG9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBkLmV4b25zW2ldLnNsb3QgPSBkLnNsb3Q7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgZXhvbnMgPSBncy5zZWxlY3RBbGwoXCIuZXhvbnNcIilcbiAgICAgICAgICAgIC5kYXRhKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQuZXhvbnMgfHwgW107XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkLnN0YXJ0O1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgZXhvbnNcbiAgICAgICAgICAgIC5lbnRlcigpXG4gICAgICAgICAgICAuYXBwZW5kKFwicmVjdFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9leG9uc1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICh4U2NhbGUoZC5zdGFydCArIGQub2Zmc2V0KSAtIHhTY2FsZShkLnN0YXJ0KSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIDApXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLmdlbmVfaGVpZ2h0KVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIHRyYWNrLmNvbG9yKCkpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLCB0cmFjay5jb2xvcigpKVxuICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgLmR1cmF0aW9uKDUwMClcbiAgICAgICAgICAgIC8vLmF0dHIoXCJzdHJva2VcIiwgZmVhdHVyZS5jb2xvcigpKVxuICAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmVhdHVyZS5jb2xvcigpKGQpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIGlmIChkLmNvZGluZykge1xuICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZlYXR1cmUuY29sb3IoKShkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGQuY29kaW5nID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJhY2suY29sb3IoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZlYXR1cmUuY29sb3IoKShkKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGxhYmVsc1xuICAgICAgICBnc1xuICAgICAgICAgICAgLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfbmFtZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIDApXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgMjUpXG4gICAgICAgICAgICAuYXR0cihcImZpbGxcIiwgdHJhY2suY29sb3IoKSlcbiAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuc2hvd19sYWJlbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5kaXNwbGF5X2xhYmVsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3R5bGUoXCJmb250LXdlaWdodFwiLCBcIm5vcm1hbFwiKVxuICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgLmR1cmF0aW9uKDUwMClcbiAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmZWF0dXJlLmNvbG9yKCkoZCk7XG4gICAgICAgICAgICB9KTtcblxuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5kaXN0cmlidXRlIChmdW5jdGlvbiAodHJhbnNjcmlwdHMpIHtcbiAgICAgICAgdmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgdmFyIHhTY2FsZSA9IGZlYXR1cmUuc2NhbGUoKTtcbiAgICAgICAgdmFyIGdzID0gdHJhbnNjcmlwdHMuc2VsZWN0KFwiZ1wiKVxuICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgLmR1cmF0aW9uKDIwMClcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwidHJhbnNsYXRlKFwiICsgeFNjYWxlKGQuc3RhcnQpICsgXCIsXCIgKyAoZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zbG90X2hlaWdodCAqIGQuc2xvdCkgKyBcIilcIjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBnc1xuICAgICAgICAgICAgLnNlbGVjdEFsbCAoXCJyZWN0XCIpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLmdlbmVfaGVpZ2h0KTtcbiAgICAgICAgZ3NcbiAgICAgICAgICAgIC5zZWxlY3RBbGwoXCJsaW5lXCIpXG4gICAgICAgICAgICAuYXR0cihcIngyXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcInkxXCIsIH5+KGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuZ2VuZV9oZWlnaHQvMikpXG4gICAgICAgICAgICAuYXR0cihcInkyXCIsIH5+KGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuZ2VuZV9oZWlnaHQvMikpO1xuICAgICAgICBnc1xuICAgICAgICAgICAgLnNlbGVjdCAoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAudGV4dCAoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zaG93X2xhYmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkLmRpc3BsYXlfbGFiZWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLm1vdmUgKGZ1bmN0aW9uICh0cmFuc2NyaXB0cykge1xuICAgICAgICB2YXIgeFNjYWxlID0gZmVhdHVyZS5zY2FsZSgpO1xuICAgICAgICB2YXIgZ3MgPSB0cmFuc2NyaXB0cy5zZWxlY3QoXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcInRyYW5zbGF0ZShcIiArIHhTY2FsZShkLnN0YXJ0KSArIFwiLFwiICsgKGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuc2xvdF9oZWlnaHQgKiBkLnNsb3QpICsgXCIpXCI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgZ3Muc2VsZWN0QWxsKFwibGluZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoeFNjYWxlKGQuZW5kKSAtIHhTY2FsZShkLnN0YXJ0KSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCB+fihmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLmdlbmVfaGVpZ2h0LzIpKVxuICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCB+fihmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLmdlbmVfaGVpZ2h0LzIpKTtcbiAgICAgICAgICAgIC8vIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgIC8vICAgICByZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuICAgICAgICAgICAgLy8gfSlcbiAgICAgICAgZ3Muc2VsZWN0QWxsKFwicmVjdFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoeFNjYWxlKGQuZW5kKSAtIHhTY2FsZShkLnN0YXJ0KSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgZ3Muc2VsZWN0QWxsKFwiLnRudF9leG9uc1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICh4U2NhbGUoZC5zdGFydCArIGQub2Zmc2V0KSAtIHhTY2FsZShkLnN0YXJ0KSk7XG4gICAgICAgICAgICB9KTtcblxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG5cbnZhciB0bnRfZmVhdHVyZV9zZXF1ZW5jZSA9IGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBjb25maWcgPSB7XG4gICAgICAgIGZvbnRzaXplIDogMTAsXG4gICAgICAgIHNlcXVlbmNlIDogZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBkLnNlcXVlbmNlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vICdJbmhlcml0JyBmcm9tIHRudC50cmFjay5mZWF0dXJlXG4gICAgdmFyIGZlYXR1cmUgPSBib2FyZC50cmFjay5mZWF0dXJlKClcbiAgICAuaW5kZXggKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLnBvcztcbiAgICB9KTtcblxuICAgIHZhciBhcGkgPSBhcGlqcyAoZmVhdHVyZSlcbiAgICAuZ2V0c2V0IChjb25maWcpO1xuXG5cbiAgICBmZWF0dXJlLmNyZWF0ZSAoZnVuY3Rpb24gKG5ld19udHMpIHtcbiAgICAgICAgdmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgdmFyIHhTY2FsZSA9IGZlYXR1cmUuc2NhbGUoKTtcblxuICAgICAgICBuZXdfbnRzXG4gICAgICAgICAgICAuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIHRyYWNrLmNvbG9yKCkpXG4gICAgICAgICAgICAuc3R5bGUoJ2ZvbnQtc2l6ZScsIGNvbmZpZy5mb250c2l6ZSArIFwicHhcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUgKGQucG9zKSAtIChjb25maWcuZm9udHNpemUvMikgKyAxO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB+fih0cmFjay5oZWlnaHQoKSAvIDIpICsgNTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3R5bGUoXCJmb250LWZhbWlseVwiLCAnXCJMdWNpZGEgQ29uc29sZVwiLCBNb25hY28sIG1vbm9zcGFjZScpXG4gICAgICAgICAgICAudGV4dChjb25maWcuc2VxdWVuY2UpXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24oNTAwKVxuICAgICAgICAgICAgLmF0dHIoJ2ZpbGwnLCBmZWF0dXJlLmNvbG9yKCkpO1xuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5tb3ZlIChmdW5jdGlvbiAobnRzKSB7XG4gICAgICAgIHZhciB4U2NhbGUgPSBmZWF0dXJlLnNjYWxlKCk7XG4gICAgICAgIG50cy5zZWxlY3QgKFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhTY2FsZShkLnBvcykgLSAoY29uZmlnLmZvbnRzaXplLzIpICsgMTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xufTtcblxudmFyIHRudF9mZWF0dXJlX2dlbmUgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyAnSW5oZXJpdCcgZnJvbSB0bnQudHJhY2suZmVhdHVyZVxuICAgIHZhciBmZWF0dXJlID0gYm9hcmQudHJhY2suZmVhdHVyZSgpXG4gICAgXHQubGF5b3V0KGJvYXJkLnRyYWNrLmxheW91dC5nZW5vbWUoKSlcbiAgICBcdC5pbmRleChmdW5jdGlvbiAoZCkge1xuICAgIFx0ICAgIHJldHVybiBkLmlkO1xuICAgIFx0fSk7XG5cbiAgICBmZWF0dXJlLmNyZWF0ZShmdW5jdGlvbiAobmV3X2VsZW1zKSB7XG4gICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIHZhciB4U2NhbGUgPSBmZWF0dXJlLnNjYWxlKCk7XG4gICAgICAgIG5ld19lbGVtc1xuICAgICAgICAgICAgLmFwcGVuZChcInJlY3RcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUoZC5zdGFydCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuc2xvdF9oZWlnaHQgKiBkLnNsb3Q7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoeFNjYWxlKGQuZW5kKSAtIHhTY2FsZShkLnN0YXJ0KSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5nZW5lX2hlaWdodClcbiAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5jb2xvcigpKVxuICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgLmR1cmF0aW9uKDUwMClcbiAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIGlmIChkLmNvbG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZlYXR1cmUuY29sb3IoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5jb2xvcjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBuZXdfZWxlbXNcbiAgICAgICAgICAgIC5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X25hbWVcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUoZC5zdGFydCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLnNsb3RfaGVpZ2h0ICogZC5zbG90KSArIDI1O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5jb2xvcigpKVxuICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zaG93X2xhYmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkLmRpc3BsYXlfbGFiZWw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwibm9ybWFsXCIpXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24oNTAwKVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmZWF0dXJlLmNvbG9yKCk7XG4gICAgICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUuZGlzdHJpYnV0ZShmdW5jdGlvbiAoZ2VuZXMpIHtcbiAgICAgICAgdmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgZ2VuZXNcbiAgICAgICAgICAgIC5zZWxlY3QoXCJyZWN0XCIpXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24oNTAwKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLnNsb3RfaGVpZ2h0ICogZC5zbG90KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLmdlbmVfaGVpZ2h0KTtcblxuICAgICAgICBnZW5lc1xuICAgICAgICAgICAgLnNlbGVjdChcInRleHRcIilcbiAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbig1MDApXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuc2xvdF9oZWlnaHQgKiBkLnNsb3QpICsgMjU7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zaG93X2xhYmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkLmRpc3BsYXlfbGFiZWw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLm1vdmUoZnVuY3Rpb24gKGdlbmVzKSB7XG4gICAgICAgIHZhciB4U2NhbGUgPSBmZWF0dXJlLnNjYWxlKCk7XG4gICAgICAgIGdlbmVzLnNlbGVjdChcInJlY3RcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUoZC5zdGFydCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoeFNjYWxlKGQuZW5kKSAtIHhTY2FsZShkLnN0YXJ0KSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBnZW5lcy5zZWxlY3QoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geFNjYWxlKGQuc3RhcnQpO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbi8vIGdlbm9tZSBsb2NhdGlvblxuIHZhciB0bnRfZmVhdHVyZV9sb2NhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgdmFyIHhTY2FsZTtcbiAgICAgdmFyIHJvdztcbiAgICAgdmFyIGNocjtcbiAgICAgdmFyIHNwZWNpZXM7XG4gICAgIHZhciB0ZXh0X2NiYWsgPSBmdW5jdGlvbiAoc3AsIGNociwgZnJvbSwgdG8pIHtcbiAgICAgICAgIHJldHVybiBzcCArIFwiIFwiICsgY2hyICsgXCI6XCIgKyBmcm9tICsgXCItXCIgKyB0bztcbiAgICAgfTtcblxuICAgICB2YXIgZmVhdHVyZSA9IHt9O1xuICAgICBmZWF0dXJlLnJlc2V0ID0gZnVuY3Rpb24gKCkge307XG4gICAgIGZlYXR1cmUucGxvdCA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICBmZWF0dXJlLmluaXQgPSBmdW5jdGlvbiAoKSB7IHJvdyA9IHVuZGVmaW5lZDsgfTtcbiAgICAgZmVhdHVyZS5tb3ZlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgIHZhciB4U2NhbGUgPSBmZWF0dXJlLnNjYWxlKCk7XG4gICAgICAgICB2YXIgZG9tYWluID0geFNjYWxlLmRvbWFpbigpO1xuICAgICAgICAgcm93LnNlbGVjdCAoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAudGV4dCh0ZXh0X2NiYWsoc3BlY2llcywgY2hyLCB+fmRvbWFpblswXSwgfn5kb21haW5bMV0pKTtcbiAgICAgfTtcbiAgICAgZmVhdHVyZS51cGRhdGUgPSBmdW5jdGlvbiAod2hlcmUpIHtcbiAgICAgICAgIGNociA9IHdoZXJlLmNocjtcbiAgICAgICAgIHNwZWNpZXMgPSB3aGVyZS5zcGVjaWVzO1xuICAgICAgICAgdmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgIHZhciBzdmdfZyA9IHRyYWNrLmc7XG4gICAgICAgICB2YXIgZG9tYWluID0geFNjYWxlLmRvbWFpbigpO1xuICAgICAgICAgaWYgKHJvdyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgcm93ID0gc3ZnX2c7XG4gICAgICAgICAgICAgcm93XG4gICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAgICAgIC50ZXh0KHRleHRfY2JhayhzcGVjaWVzLCBjaHIsIH5+ZG9tYWluWzBdLCB+fmRvbWFpblsxXSkpO1xuICAgICAgICAgfVxuICAgICB9O1xuXG4gICAgIGZlYXR1cmUuc2NhbGUgPSBmdW5jdGlvbiAocykge1xuICAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgcmV0dXJuIHhTY2FsZTtcbiAgICAgICAgIH1cbiAgICAgICAgIHhTY2FsZSA9IHM7XG4gICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgfTtcblxuICAgICBmZWF0dXJlLnRleHQgPSBmdW5jdGlvbiAoY2Jhaykge1xuICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB0ZXh0X2NiYWs7XG4gICAgICAgIH1cbiAgICAgICAgdGV4dF9jYmFrID0gY2JhaztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgIH07XG5cbiAgICAgcmV0dXJuIGZlYXR1cmU7XG4gfTtcblxudmFyIGdlbm9tZV9mZWF0dXJlcyA9IHtcbiAgICBnZW5lIDogdG50X2ZlYXR1cmVfZ2VuZSxcbiAgICBzZXF1ZW5jZSA6IHRudF9mZWF0dXJlX3NlcXVlbmNlLFxuICAgIHRyYW5zY3JpcHQgOiB0bnRfZmVhdHVyZV90cmFuc2NyaXB0LFxuICAgIGxvY2F0aW9uIDogdG50X2ZlYXR1cmVfbG9jYXRpb24sXG59O1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gZ2Vub21lX2ZlYXR1cmVzO1xuIiwiLy8gdmFyIGVuc2VtYmxfcmVzdCA9IHJlcXVpcmUoXCJ0bnQuZW5zZW1ibFwiKSgpO1xudmFyIGFwaWpzID0gcmVxdWlyZShcInRudC5hcGlcIik7XG52YXIgdG50X2JvYXJkID0gcmVxdWlyZShcInRudC5ib2FyZFwiKTtcbnRudF9ib2FyZC50cmFjay5kYXRhLmdlbm9tZSA9IHJlcXVpcmUoXCIuL2RhdGEuanNcIik7XG50bnRfYm9hcmQudHJhY2suZmVhdHVyZS5nZW5vbWUgPSByZXF1aXJlKFwiLi9mZWF0dXJlXCIpO1xudG50X2JvYXJkLnRyYWNrLmxheW91dC5nZW5vbWUgPSByZXF1aXJlKFwiLi9sYXlvdXRcIik7XG50bnRfYm9hcmQudHJhY2suZGF0YS5nZW5vbWUuZW5zZW1ibCA9IHJlcXVpcmUoXCJ0bnQucmVzdFwiKSgpXG4gICAgLmRvbWFpbihcInJlc3QuZW5zZW1ibC5vcmdcIik7XG5cbi8vIHByb21pc2VzXG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJ2VzNi1wcm9taXNlJykuUHJvbWlzZTtcbnZhciBtaW5Qcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlcykge1xuICAgIHJlcygwKTtcbn0pO1xuXG50bnRfYm9hcmRfZ2Vub21lID0gZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgZW5zZW1ibF9yZXN0ID0gdG50X2JvYXJkLnRyYWNrLmRhdGEuZ2Vub21lLmVuc2VtYmw7XG5cbiAgICAvLyBQcml2YXRlIHZhcnNcbiAgICB2YXIgZW5zX3JlID0gL15FTlNcXHcrXFxkKyQvO1xuICAgIHZhciBjaHJfbGVuZ3RoO1xuXG5cblxuICAgIC8vIFZhcnMgZXhwb3NlZCBpbiB0aGUgQVBJXG4gICAgdmFyIGNvbmYgPSB7XG4gICAgICAgIG1heF9jb29yZCAgICAgICA6IHVuZGVmaW5lZCwgLy8gUHJvbWlzZSB0aGF0IHJldHVybnMgdGhlIG1heCBjb29yZGluYXRlLiBJZiB1bmRlZiB1c2VzIHRoZSBsZW5ndGggb2YgdGhlIGNocm9tb3NvbWVcbiAgICAgICAgbWluX2Nvb3JkICAgICAgIDogbWluUHJvbWlzZSwgLy8gUHJvbWlzZSB0aGF0IHJldHVybnMgdGhlIG1pbiBjb29yZGluYXRlLiBEZWZhdWx0cyB0byAwXG4gICAgICAgIGdlbmUgICAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICB4cmVmX3NlYXJjaCAgICA6IGZ1bmN0aW9uICgpIHt9LFxuICAgICAgICBlbnNnZW5lX3NlYXJjaCA6IGZ1bmN0aW9uICgpIHt9LFxuICAgICAgICBjb250ZXh0ICAgICAgICA6IDAsXG4gICAgICAgIHJlc3QgICAgICAgICAgIDogZW5zZW1ibF9yZXN0XG4gICAgfTtcbiAgICAvLyBXZSBcImluaGVyaXRcIiBmcm9tIGJvYXJkXG4gICAgdmFyIGdlbm9tZV9icm93c2VyID0gdG50X2JvYXJkKClcbiAgICAgICAgLnpvb21faW4oMjAwKVxuICAgICAgICAuem9vbV9vdXQoNTAwMDAwMCk7IC8vIGVuc2VtYmwgcmVnaW9uIGxpbWl0XG4gICAgICAgIC8vIC5taW4oMCk7XG5cbiAgICB2YXIgZ2VuZTtcblxuICAgIC8vIFRoZSBsb2NhdGlvbiBhbmQgYXhpcyB0cmFja1xuICAgIHZhciBsb2NhdGlvbl90cmFjayA9IHRudF9ib2FyZC50cmFjaygpXG4gICAgICAgIC5oZWlnaHQoMjApXG4gICAgICAgIC5jb2xvcihcIndoaXRlXCIpXG4gICAgICAgIC5kYXRhKHRudF9ib2FyZC50cmFjay5kYXRhLmVtcHR5KCkpXG4gICAgICAgIC5kaXNwbGF5KHRudF9ib2FyZC50cmFjay5mZWF0dXJlLmdlbm9tZS5sb2NhdGlvbigpKTtcblxuICAgIHZhciBheGlzX3RyYWNrID0gdG50X2JvYXJkLnRyYWNrKClcbiAgICAgICAgLmhlaWdodCgwKVxuICAgICAgICAuY29sb3IoXCJ3aGl0ZVwiKVxuICAgICAgICAuZGF0YSh0bnRfYm9hcmQudHJhY2suZGF0YS5lbXB0eSgpKVxuICAgICAgICAuZGlzcGxheSh0bnRfYm9hcmQudHJhY2suZmVhdHVyZS5heGlzKCkpO1xuXG4gICAgZ2Vub21lX2Jyb3dzZXJcblx0ICAgLmFkZF90cmFjayhsb2NhdGlvbl90cmFjaylcbiAgICAgICAuYWRkX3RyYWNrKGF4aXNfdHJhY2spO1xuXG4gICAgLy8gRGVmYXVsdCBsb2NhdGlvbjpcbiAgICBnZW5vbWVfYnJvd3NlclxuXHQgICAuc3BlY2llcyhcImh1bWFuXCIpXG4gICAgICAgLmNocig3KVxuICAgICAgIC5mcm9tKDEzOTQyNDk0MClcbiAgICAgICAudG8oMTQxNzg0MTAwKTtcblxuICAgIC8vIFdlIHNhdmUgdGhlIHN0YXJ0IG1ldGhvZCBvZiB0aGUgJ3BhcmVudCcgb2JqZWN0XG4gICAgZ2Vub21lX2Jyb3dzZXIuX3N0YXJ0ID0gZ2Vub21lX2Jyb3dzZXIuc3RhcnQ7XG5cbiAgICAvLyBXZSBoaWphY2sgcGFyZW50J3Mgc3RhcnQgbWV0aG9kXG4gICAgdmFyIHN0YXJ0ID0gZnVuY3Rpb24gKHdoZXJlKSB7XG4gICAgICAgIGlmICh3aGVyZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAod2hlcmUuZ2VuZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZ2V0X2dlbmUod2hlcmUpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHdoZXJlLnNwZWNpZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB3aGVyZS5zcGVjaWVzID0gZ2Vub21lX2Jyb3dzZXIuc3BlY2llcygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbm9tZV9icm93c2VyLnNwZWNpZXMod2hlcmUuc3BlY2llcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh3aGVyZS5jaHIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB3aGVyZS5jaHIgPSBnZW5vbWVfYnJvd3Nlci5jaHIoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBnZW5vbWVfYnJvd3Nlci5jaHIod2hlcmUuY2hyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHdoZXJlLmZyb20gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB3aGVyZS5mcm9tID0gZ2Vub21lX2Jyb3dzZXIuZnJvbSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbm9tZV9icm93c2VyLmZyb20od2hlcmUuZnJvbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh3aGVyZS50byA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHdoZXJlLnRvID0gZ2Vub21lX2Jyb3dzZXIudG8oKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBnZW5vbWVfYnJvd3Nlci50byh3aGVyZS50byk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgeyAvLyBcIndoZXJlXCIgaXMgdW5kZWYgc28gbG9vayBmb3IgZ2VuZSBvciBsb2NcbiAgICAgICAgICAgIGlmIChnZW5vbWVfYnJvd3Nlci5nZW5lKCkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGdldF9nZW5lKHsgc3BlY2llcyA6IGdlbm9tZV9icm93c2VyLnNwZWNpZXMoKSxcbiAgICAgICAgICAgICAgICAgICAgZ2VuZSAgICA6IGdlbm9tZV9icm93c2VyLmdlbmUoKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgd2hlcmUgPSB7fTtcbiAgICAgICAgICAgICAgICB3aGVyZS5zcGVjaWVzID0gZ2Vub21lX2Jyb3dzZXIuc3BlY2llcygpO1xuICAgICAgICAgICAgICAgIHdoZXJlLmNociAgICAgPSBnZW5vbWVfYnJvd3Nlci5jaHIoKTtcbiAgICAgICAgICAgICAgICB3aGVyZS5mcm9tICAgID0gZ2Vub21lX2Jyb3dzZXIuZnJvbSgpO1xuICAgICAgICAgICAgICAgIHdoZXJlLnRvICAgICAgPSBnZW5vbWVfYnJvd3Nlci50bygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWluIGlzIDAgYnkgZGVmYXVsdCBvciB1c2UgdGhlIHByb3ZpZGVkIHByb21pc2VcbiAgICAgICAgY29uZi5taW5fY29vcmRcbiAgICAgICAgICAgIC50aGVuIChmdW5jdGlvbiAobWluKSB7XG4gICAgICAgICAgICAgICAgZ2Vub21lX2Jyb3dzZXIubWluKG1pbik7XG4gICAgICAgICAgICAgICAgaWYgKCFjb25mLm1heF9jb29yZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdXJsID0gZW5zZW1ibF9yZXN0LnVybCgpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZW5kcG9pbnQoXCJpbmZvL2Fzc2VtYmx5LzpzcGVjaWVzLzpyZWdpb25fbmFtZVwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnBhcmFtZXRlcnMoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwZWNpZXM6IHdoZXJlLnNwZWNpZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVnaW9uX25hbWU6IHdoZXJlLmNoclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uZi5tYXhfY29vcmQgPSBlbnNlbWJsX3Jlc3QuY2FsbCAodXJsKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4gKGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3AuYm9keS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbmYubWF4X2Nvb3JkO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuIChmdW5jdGlvbiAobWF4KSB7XG4gICAgICAgICAgICAgICAgZ2Vub21lX2Jyb3dzZXIubWF4KG1heCk7XG4gICAgICAgICAgICAgICAgZ2Vub21lX2Jyb3dzZXIuX3N0YXJ0KCk7XG5cbiAgICAgICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgaG9tb2xvZ3VlcyA9IGZ1bmN0aW9uIChlbnNHZW5lLCBjYWxsYmFjaykgIHtcbiAgICAgICAgdmFyIHVybCA9IGVuc2VtYmxfcmVzdC51cmwuaG9tb2xvZ3VlcyAoe2lkIDogZW5zR2VuZX0pO1xuICAgICAgICBlbnNlbWJsX3Jlc3QuY2FsbCh1cmwpXG4gICAgICAgICAgICAudGhlbiAoZnVuY3Rpb24ocmVzcCkge1xuICAgICAgICAgICAgICAgIHZhciBob21vbG9ndWVzID0gcmVzcC5ib2R5LmRhdGFbMF0uaG9tb2xvZ2llcztcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaG9tb2xvZ3Vlc19vYmogPSBzcGxpdF9ob21vbG9ndWVzKGhvbW9sb2d1ZXMpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhob21vbG9ndWVzX29iaik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIGlzRW5zZW1ibEdlbmUgPSBmdW5jdGlvbih0ZXJtKSB7XG4gICAgICAgIGlmICh0ZXJtLm1hdGNoKGVuc19yZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBnZXRfZ2VuZSA9IGZ1bmN0aW9uICh3aGVyZSkge1xuICAgICAgICBpZiAoaXNFbnNlbWJsR2VuZSh3aGVyZS5nZW5lKSkge1xuICAgICAgICAgICAgZ2V0X2Vuc0dlbmUod2hlcmUuZ2VuZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgdXJsID0gZW5zZW1ibF9yZXN0LnVybCgpXG4gICAgICAgICAgICAgICAgLmVuZHBvaW50KFwieHJlZnMvc3ltYm9sLzpzcGVjaWVzLzpzeW1ib2xcIilcbiAgICAgICAgICAgICAgICAucGFyYW1ldGVycyh7XG4gICAgICAgICAgICAgICAgICAgIHNwZWNpZXM6IHdoZXJlLnNwZWNpZXMsXG4gICAgICAgICAgICAgICAgICAgIHN5bWJvbDogd2hlcmUuZ2VuZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZW5zZW1ibF9yZXN0LmNhbGwodXJsKVxuICAgICAgICAgICAgICAgIC50aGVuIChmdW5jdGlvbihyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcC5ib2R5O1xuICAgICAgICAgICAgICAgICAgICBkYXRhID0gZGF0YS5maWx0ZXIoZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICFkLmlkLmluZGV4T2YoXCJFTlNcIik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVswXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRfZW5zR2VuZShkYXRhWzBdLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25mLnhyZWZfc2VhcmNoKHJlc3AsIHdoZXJlLmdlbmUsIHdoZXJlLnNwZWNpZXMpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBnZXRfZW5zR2VuZSA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICB2YXIgdXJsID0gZW5zZW1ibF9yZXN0LnVybCgpXG4gICAgICAgICAgICAuZW5kcG9pbnQoXCIvbG9va3VwL2lkLzppZFwiKVxuICAgICAgICAgICAgLnBhcmFtZXRlcnMoe1xuICAgICAgICAgICAgICAgIGlkOiBpZFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgZW5zZW1ibF9yZXN0LmNhbGwodXJsKVxuICAgICAgICAgICAgLnRoZW4gKGZ1bmN0aW9uKHJlc3ApIHtcbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3AuYm9keTtcbiAgICAgICAgICAgICAgICBjb25mLmVuc2dlbmVfc2VhcmNoKGRhdGEpO1xuICAgICAgICAgICAgICAgIHZhciBleHRyYSA9IH5+KChkYXRhLmVuZCAtIGRhdGEuc3RhcnQpICogKGNvbmYuY29udGV4dC8xMDApKTtcbiAgICAgICAgICAgICAgICBnZW5vbWVfYnJvd3NlclxuICAgICAgICAgICAgICAgICAgICAuc3BlY2llcyhkYXRhLnNwZWNpZXMpXG4gICAgICAgICAgICAgICAgICAgIC5jaHIoZGF0YS5zZXFfcmVnaW9uX25hbWUpXG4gICAgICAgICAgICAgICAgICAgIC5mcm9tKGRhdGEuc3RhcnQgLSBleHRyYSlcbiAgICAgICAgICAgICAgICAgICAgLnRvKGRhdGEuZW5kICsgZXh0cmEpO1xuXG4gICAgICAgICAgICAgICAgZ2Vub21lX2Jyb3dzZXIuc3RhcnQoIHsgc3BlY2llcyA6IGRhdGEuc3BlY2llcyxcbiAgICAgICAgICAgICAgICAgICAgY2hyICAgICA6IGRhdGEuc2VxX3JlZ2lvbl9uYW1lLFxuICAgICAgICAgICAgICAgICAgICBmcm9tICAgIDogZGF0YS5zdGFydCAtIGV4dHJhLFxuICAgICAgICAgICAgICAgICAgICB0byAgICAgIDogZGF0YS5lbmQgKyBleHRyYVxuICAgICAgICAgICAgICAgIH0gKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgc3BsaXRfaG9tb2xvZ3VlcyA9IGZ1bmN0aW9uIChob21vbG9ndWVzKSB7XG4gICAgICAgIHZhciBvcnRob1BhdHQgPSAvb3J0aG9sb2cvO1xuICAgICAgICB2YXIgcGFyYVBhdHQgPSAvcGFyYWxvZy87XG5cbiAgICAgICAgdmFyIG9ydGhvbG9ndWVzID0gaG9tb2xvZ3Vlcy5maWx0ZXIoZnVuY3Rpb24oZCl7cmV0dXJuIGQudHlwZS5tYXRjaChvcnRob1BhdHQpO30pO1xuICAgICAgICB2YXIgcGFyYWxvZ3VlcyAgPSBob21vbG9ndWVzLmZpbHRlcihmdW5jdGlvbihkKXtyZXR1cm4gZC50eXBlLm1hdGNoKHBhcmFQYXR0KTt9KTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgJ29ydGhvbG9ndWVzJyA6IG9ydGhvbG9ndWVzLFxuICAgICAgICAgICAgJ3BhcmFsb2d1ZXMnICA6IHBhcmFsb2d1ZXNcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgdmFyIGFwaSA9IGFwaWpzKGdlbm9tZV9icm93c2VyKVxuICAgICAgICAuZ2V0c2V0IChjb25mKTtcblxuICAgIGFwaS5tZXRob2QgKHtcbiAgICAgICAgc3RhcnQgICAgICA6IHN0YXJ0LFxuICAgICAgICBob21vbG9ndWVzIDogaG9tb2xvZ3Vlc1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGdlbm9tZV9icm93c2VyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdG50X2JvYXJkX2dlbm9tZTtcbiIsInZhciBib2FyZCA9IHJlcXVpcmUoXCJ0bnQuYm9hcmRcIik7XG5ib2FyZC5nZW5vbWUgPSByZXF1aXJlKFwiLi9nZW5vbWVcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGJvYXJkO1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xuXG4vLyBUaGUgb3ZlcmxhcCBkZXRlY3RvciB1c2VkIGZvciBnZW5lc1xudmFyIGdlbmVfbGF5b3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gUHJpdmF0ZSB2YXJzXG4gICAgdmFyIG1heF9zbG90cztcblxuICAgIC8vIHZhcnMgZXhwb3NlZCBpbiB0aGUgQVBJOlxuICAgIHZhciBoZWlnaHQgPSAxNTA7XG5cbiAgICB2YXIgb2xkX2VsZW1lbnRzID0gW107XG5cbiAgICB2YXIgc2NhbGU7XG5cbiAgICB2YXIgc2xvdF90eXBlcyA9IHtcbiAgICAgICAgJ2V4cGFuZGVkJyAgIDoge1xuICAgICAgICAgICAgc2xvdF9oZWlnaHQgOiAzMCxcbiAgICAgICAgICAgIGdlbmVfaGVpZ2h0IDogMTAsXG4gICAgICAgICAgICBzaG93X2xhYmVsICA6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgJ2NvbGxhcHNlZCcgOiB7XG4gICAgICAgICAgICBzbG90X2hlaWdodCA6IDEwLFxuICAgICAgICAgICAgZ2VuZV9oZWlnaHQgOiA3LFxuICAgICAgICAgICAgc2hvd19sYWJlbCAgOiBmYWxzZVxuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgY3VycmVudF9zbG90X3R5cGUgPSAnZXhwYW5kZWQnO1xuXG4gICAgLy8gVGhlIHJldHVybmVkIGNsb3N1cmUgLyBvYmplY3RcbiAgICB2YXIgZ2VuZXNfbGF5b3V0ID0gZnVuY3Rpb24gKG5ld19nZW5lcykge1xuICAgICAgICB2YXIgdHJhY2sgPSB0aGlzO1xuICAgICAgICBzY2FsZSA9IHRyYWNrLmRpc3BsYXkoKS5zY2FsZSgpO1xuXG4gICAgICAgIC8vIFdlIG1ha2Ugc3VyZSB0aGF0IHRoZSBnZW5lcyBoYXZlIG5hbWVcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuZXdfZ2VuZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChuZXdfZ2VuZXNbaV0uZXh0ZXJuYWxfbmFtZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIG5ld19nZW5lc1tpXS5leHRlcm5hbF9uYW1lID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIG1heF9zbG90cyA9IH5+KHRyYWNrLmhlaWdodCgpIC8gc2xvdF90eXBlcy5leHBhbmRlZC5zbG90X2hlaWdodCk7XG5cbiAgICAgICAgaWYgKGdlbmVzX2xheW91dC5rZWVwX3Nsb3RzKCkpIHtcbiAgICAgICAgICAgIHNsb3Rfa2VlcGVyKG5ld19nZW5lcywgb2xkX2VsZW1lbnRzKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbmVlZGVkX3Nsb3RzID0gY29sbGl0aW9uX2RldGVjdG9yKG5ld19nZW5lcyk7XG4gICAgICAgIHNsb3RfdHlwZXMuY29sbGFwc2VkLm5lZWRlZF9zbG90cyA9IG5lZWRlZF9zbG90cztcbiAgICAgICAgc2xvdF90eXBlcy5leHBhbmRlZC5uZWVkZWRfc2xvdHMgPSBuZWVkZWRfc2xvdHM7XG4gICAgICAgIGlmIChnZW5lc19sYXlvdXQuZml4ZWRfc2xvdF90eXBlKCkpIHtcbiAgICAgICAgICAgIGN1cnJlbnRfc2xvdF90eXBlID0gZ2VuZXNfbGF5b3V0LmZpeGVkX3Nsb3RfdHlwZSgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG5lZWRlZF9zbG90cyA+IG1heF9zbG90cykge1xuICAgICAgICAgICAgY3VycmVudF9zbG90X3R5cGUgPSAnY29sbGFwc2VkJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGN1cnJlbnRfc2xvdF90eXBlID0gJ2V4cGFuZGVkJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJ1biB0aGUgdXNlci1kZWZpbmVkIGNhbGxiYWNrXG4gICAgICAgIGdlbmVzX2xheW91dC5vbl9sYXlvdXRfcnVuKCkoc2xvdF90eXBlcywgY3VycmVudF9zbG90X3R5cGUpO1xuXG4gICAgICAgIC8vY29uZl9yby5lbGVtZW50cyA9IG5ld19nZW5lcztcbiAgICAgICAgb2xkX2VsZW1lbnRzID0gbmV3X2dlbmVzO1xuICAgICAgICByZXR1cm4gbmV3X2dlbmVzO1xuICAgIH07XG5cbiAgICB2YXIgZ2VuZV9zbG90ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gc2xvdF90eXBlc1tjdXJyZW50X3Nsb3RfdHlwZV07XG4gICAgfTtcblxuICAgIHZhciBjb2xsaXRpb25fZGV0ZWN0b3IgPSBmdW5jdGlvbiAoZ2VuZXMpIHtcbiAgICAgICAgdmFyIGdlbmVzX3BsYWNlZCA9IFtdO1xuICAgICAgICB2YXIgZ2VuZXNfdG9fcGxhY2UgPSBnZW5lcztcbiAgICAgICAgdmFyIG5lZWRlZF9zbG90cyA9IDA7XG4gICAgICAgIGZvciAodmFyIGo9MDsgajxnZW5lcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgaWYgKGdlbmVzW2pdLnNsb3QgPiBuZWVkZWRfc2xvdHMgJiYgZ2VuZXNbal0uc2xvdCA8IG1heF9zbG90cykge1xuICAgICAgICAgICAgICAgIG5lZWRlZF9zbG90cyA9IGdlbmVzW2pdLnNsb3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBpPTA7IGk8Z2VuZXNfdG9fcGxhY2UubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBnZW5lc19ieV9zbG90ID0gc29ydF9nZW5lc19ieV9zbG90KGdlbmVzX3BsYWNlZCk7XG4gICAgICAgICAgICB2YXIgdGhpc19nZW5lID0gZ2VuZXNfdG9fcGxhY2VbaV07XG4gICAgICAgICAgICBpZiAodGhpc19nZW5lLnNsb3QgIT09IHVuZGVmaW5lZCAmJiB0aGlzX2dlbmUuc2xvdCA8IG1heF9zbG90cykge1xuICAgICAgICAgICAgICAgIGlmIChzbG90X2hhc19zcGFjZSh0aGlzX2dlbmUsIGdlbmVzX2J5X3Nsb3RbdGhpc19nZW5lLnNsb3RdKSkge1xuICAgICAgICAgICAgICAgICAgICBnZW5lc19wbGFjZWQucHVzaCh0aGlzX2dlbmUpO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgc2xvdCA9IDA7XG4gICAgICAgICAgICBPVVRFUjogd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2xvdF9oYXNfc3BhY2UodGhpc19nZW5lLCBnZW5lc19ieV9zbG90W3Nsb3RdKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzX2dlbmUuc2xvdCA9IHNsb3Q7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVzX3BsYWNlZC5wdXNoKHRoaXNfZ2VuZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzbG90ID4gbmVlZGVkX3Nsb3RzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZWVkZWRfc2xvdHMgPSBzbG90O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzbG90Kys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5lZWRlZF9zbG90cyArIDE7XG4gICAgfTtcblxuICAgIHZhciBzbG90X2hhc19zcGFjZSA9IGZ1bmN0aW9uIChxdWVyeV9nZW5lLCBnZW5lc19pbl90aGlzX3Nsb3QpIHtcbiAgICAgICAgaWYgKGdlbmVzX2luX3RoaXNfc2xvdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBqPTA7IGo8Z2VuZXNfaW5fdGhpc19zbG90Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICB2YXIgc3Vial9nZW5lID0gZ2VuZXNfaW5fdGhpc19zbG90W2pdO1xuICAgICAgICAgICAgaWYgKHF1ZXJ5X2dlbmUuaWQgPT09IHN1YmpfZ2VuZS5pZCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHlfbGFiZWxfZW5kID0gc3Vial9nZW5lLmRpc3BsYXlfbGFiZWwubGVuZ3RoICogOCArIHNjYWxlKHN1YmpfZ2VuZS5zdGFydCk7IC8vIFRPRE86IEl0IG1heSBiZSBiZXR0ZXIgdG8gaGF2ZSBhIGZpeGVkIGZvbnQgc2l6ZSAoaW5zdGVhZCBvZiB0aGUgaGFyZGNvZGVkIHZhbHVlKT9cbiAgICAgICAgICAgIHZhciB5MSAgPSBzY2FsZShzdWJqX2dlbmUuc3RhcnQpO1xuICAgICAgICAgICAgdmFyIHkyICA9IHNjYWxlKHN1YmpfZ2VuZS5lbmQpID4geV9sYWJlbF9lbmQgPyBzY2FsZShzdWJqX2dlbmUuZW5kKSA6IHlfbGFiZWxfZW5kO1xuICAgICAgICAgICAgdmFyIHhfbGFiZWxfZW5kID0gcXVlcnlfZ2VuZS5kaXNwbGF5X2xhYmVsLmxlbmd0aCAqIDggKyBzY2FsZShxdWVyeV9nZW5lLnN0YXJ0KTtcbiAgICAgICAgICAgIHZhciB4MSA9IHNjYWxlKHF1ZXJ5X2dlbmUuc3RhcnQpO1xuICAgICAgICAgICAgdmFyIHgyID0gc2NhbGUocXVlcnlfZ2VuZS5lbmQpID4geF9sYWJlbF9lbmQgPyBzY2FsZShxdWVyeV9nZW5lLmVuZCkgOiB4X2xhYmVsX2VuZDtcbiAgICAgICAgICAgIGlmICggKCh4MSA8PSB5MSkgJiYgKHgyID49IHkxKSkgfHxcbiAgICAgICAgICAgICgoeDEgPj0geTEpICYmICh4MSA8PSB5MikpICkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgdmFyIHNsb3Rfa2VlcGVyID0gZnVuY3Rpb24gKGdlbmVzLCBwcmV2X2dlbmVzKSB7XG4gICAgICAgIHZhciBwcmV2X2dlbmVzX3Nsb3RzID0gZ2VuZXMyc2xvdHMocHJldl9nZW5lcyk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBnZW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHByZXZfZ2VuZXNfc2xvdHNbZ2VuZXNbaV0uaWRdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBnZW5lc1tpXS5zbG90ID0gcHJldl9nZW5lc19zbG90c1tnZW5lc1tpXS5pZF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGdlbmVzMnNsb3RzID0gZnVuY3Rpb24gKGdlbmVzX2FycmF5KSB7XG4gICAgICAgIHZhciBoYXNoID0ge307XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZXNfYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBnZW5lID0gZ2VuZXNfYXJyYXlbaV07XG4gICAgICAgICAgICBoYXNoW2dlbmUuaWRdID0gZ2VuZS5zbG90O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBoYXNoO1xuICAgIH07XG5cbiAgICB2YXIgc29ydF9nZW5lc19ieV9zbG90ID0gZnVuY3Rpb24gKGdlbmVzKSB7XG4gICAgICAgIHZhciBzbG90cyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdlbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoc2xvdHNbZ2VuZXNbaV0uc2xvdF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHNsb3RzW2dlbmVzW2ldLnNsb3RdID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzbG90c1tnZW5lc1tpXS5zbG90XS5wdXNoKGdlbmVzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2xvdHM7XG4gICAgfTtcblxuICAgIC8vIEFQSVxuICAgIHZhciBhcGkgPSBhcGlqcyAoZ2VuZXNfbGF5b3V0KVxuICAgICAgICAuZ2V0c2V0IChcImVsZW1lbnRzXCIsIGZ1bmN0aW9uICgpIHt9KVxuICAgICAgICAuZ2V0c2V0IChcIm9uX2xheW91dF9ydW5cIiwgZnVuY3Rpb24gKCkge30pXG4gICAgICAgIC5nZXRzZXQgKFwiZml4ZWRfc2xvdF90eXBlXCIpXG4gICAgICAgIC5nZXRzZXQgKFwia2VlcF9zbG90c1wiLCB0cnVlKVxuICAgICAgICAubWV0aG9kICh7XG4gICAgICAgICAgICBnZW5lX3Nsb3QgOiBnZW5lX3Nsb3QsXG4gICAgICAgICAgICAvLyBoZWlnaHQgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyAgICAgcmV0dXJuIHNsb3RfdHlwZXMuZXhwYW5kZWQubmVlZGVkX3Nsb3RzICogc2xvdF90eXBlcy5leHBhbmRlZC5zbG90X2hlaWdodDtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgfSk7XG5cbiAgICAvLyBDaGVjayB0aGF0IHRoZSBmaXhlZCBzbG90IHR5cGUgaXMgdmFsaWRcbiAgICBnZW5lc19sYXlvdXQuZml4ZWRfc2xvdF90eXBlLmNoZWNrKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiAoKHZhbCA9PT0gXCJjb2xsYXBzZWRcIikgfHwgKHZhbCA9PT0gXCJleHBhbmRlZFwiKSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZ2VuZXNfbGF5b3V0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gZ2VuZV9sYXlvdXQ7XG4iXX0=
