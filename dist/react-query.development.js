(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react')) :
  typeof define === 'function' && define.amd ? define(['exports', 'react'], factory) :
  (global = global || self, factory(global.ReactQuery = {}, global.React));
}(this, (function (exports, React) { 'use strict';

  React = React && Object.prototype.hasOwnProperty.call(React, 'default') ? React['default'] : React;

  function _extends() {
    _extends = Object.assign || function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];

        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }

      return target;
    };

    return _extends.apply(this, arguments);
  }

  // The tuple variants are only to infer types in the public API

  (function (QueryStatus) {
    QueryStatus["Idle"] = "idle";
    QueryStatus["Loading"] = "loading";
    QueryStatus["Error"] = "error";
    QueryStatus["Success"] = "success";
  })(exports.QueryStatus || (exports.QueryStatus = {}));

  // UTILS
  var _uid = 0;
  var uid = function uid() {
    return _uid++;
  };
  var cancelledError = {};
  var isServer = typeof window === 'undefined';
  function noop() {
    return void 0;
  }
  function identity(d) {
    return d;
  }
  var Console = console || {
    error: noop,
    warn: noop,
    log: noop
  };
  function setConsole(c) {
    Console = c;
  }
  function functionalUpdate(updater, input) {
    return typeof updater === 'function' ? updater(input) : updater;
  }

  function stableStringifyReplacer(_key, value) {
    if (typeof value === 'function') {
      throw new Error('Cannot stringify non JSON value');
    }

    if (isObject(value)) {
      return Object.keys(value).sort().reduce(function (result, key) {
        result[key] = value[key];
        return result;
      }, {});
    }

    return value;
  }

  function stableStringify(value) {
    return JSON.stringify(value, stableStringifyReplacer);
  }
  function isObject(a) {
    return a && typeof a === 'object' && !Array.isArray(a);
  }
  function deepIncludes(a, b) {
    if (a === b) {
      return true;
    }

    if (typeof a !== typeof b) {
      return false;
    }

    if (typeof a === 'object') {
      return !Object.keys(b).some(function (key) {
        return !deepIncludes(a[key], b[key]);
      });
    }

    return false;
  }
  function isDocumentVisible() {
    // document global can be unavailable in react native
    if (typeof document === 'undefined') {
      return true;
    }

    return [undefined, 'visible', 'prerender'].includes(document.visibilityState);
  }
  function isOnline() {
    return navigator.onLine === undefined || navigator.onLine;
  }
  function getQueryArgs(args) {
    var queryKey;
    var queryFn;
    var config;
    var options;

    if (isObject(args[0])) {
      queryKey = args[0].queryKey;
      queryFn = args[0].queryFn;
      config = args[0].config;
      options = args[1];
    } else if (isObject(args[1])) {
      queryKey = args[0];
      config = args[1];
      options = args[2];
    } else {
      queryKey = args[0];
      queryFn = args[1];
      config = args[2];
      options = args[3];
    }

    config = config || {};

    if (queryFn) {
      config = _extends({}, config, {
        queryFn: queryFn
      });
    }

    return [queryKey, config, options];
  }
  function deepEqual(a, b) {
    return equal(a, b, true);
  }
  function shallowEqual(a, b) {
    return equal(a, b, false);
  } // This deep-equal is directly based on https://github.com/epoberezkin/fast-deep-equal.
  // The parts for comparing any non-JSON-supported values has been removed

  function equal(a, b, deep, depth) {
    if (depth === void 0) {
      depth = 0;
    }

    if (a === b) return true;

    if ((deep || !depth) && a && b && typeof a == 'object' && typeof b == 'object') {
      var length, i;

      if (Array.isArray(a)) {
        length = a.length; // eslint-disable-next-line eqeqeq

        if (length != b.length) return false;

        for (i = length; i-- !== 0;) {
          if (!equal(a[i], b[i], deep, depth + 1)) return false;
        }

        return true;
      }

      if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
      var keys = Object.keys(a);
      length = keys.length;
      if (length !== Object.keys(b).length) return false;

      for (i = length; i-- !== 0;) {
        if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
      }

      for (i = length; i-- !== 0;) {
        var key = keys[i];
        if (!equal(a[key], b[key], deep, depth + 1)) return false;
      }

      return true;
    } // true if both NaN, false otherwise
    // eslint-disable-next-line no-self-compare


    return a !== a && b !== b;
  }

  function getStatusProps(status) {
    return {
      status: status,
      isLoading: status === exports.QueryStatus.Loading,
      isSuccess: status === exports.QueryStatus.Success,
      isError: status === exports.QueryStatus.Error,
      isIdle: status === exports.QueryStatus.Idle
    };
  }

  // CONFIG
  var defaultQueryKeySerializerFn = function defaultQueryKeySerializerFn(queryKey) {
    try {
      var arrayQueryKey = Array.isArray(queryKey) ? queryKey : [queryKey];
      var queryHash = stableStringify(arrayQueryKey);
      arrayQueryKey = JSON.parse(queryHash);
      return [queryHash, arrayQueryKey];
    } catch (_unused) {
      throw new Error('A valid query key is required!');
    }
  };
  var DEFAULT_CONFIG = {
    shared: {
      suspense: false
    },
    queries: {
      queryKeySerializerFn: defaultQueryKeySerializerFn,
      enabled: true,
      retry: 3,
      retryDelay: function retryDelay(attemptIndex) {
        return Math.min(1000 * Math.pow(2, attemptIndex), 30000);
      },
      staleTime: 0,
      cacheTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchInterval: false,
      queryFnParamsFilter: identity,
      refetchOnMount: true,
      isDataEqual: deepEqual,
      useErrorBoundary: false
    },
    mutations: {
      throwOnError: false,
      useErrorBoundary: false
    }
  };
  var defaultConfigRef = {
    current: DEFAULT_CONFIG
  };

  // CLASS
  function _empty() {}

  function _awaitIgnored(value, direct) {
    if (!direct) {
      return value && value.then ? value.then(_empty) : Promise.resolve();
    }
  }

  function _invoke(body, then) {
    var result = body();

    if (result && result.then) {
      return result.then(then);
    }

    return then(result);
  }

  function _catch(body, recover) {
    try {
      var result = body();
    } catch (e) {
      return recover(e);
    }

    if (result && result.then) {
      return result.then(void 0, recover);
    }

    return result;
  }

  function _continueIgnored(value) {
    if (value && value.then) {
      return value.then(_empty);
    }
  }

  var QueryInstance = /*#__PURE__*/function () {
    function QueryInstance(query, onStateUpdate) {
      this.id = uid();
      this.onStateUpdate = onStateUpdate;
      this.query = query;
      this.config = {};
    }

    var _proto = QueryInstance.prototype;

    _proto.clearInterval = function (_clearInterval) {
      function clearInterval() {
        return _clearInterval.apply(this, arguments);
      }

      clearInterval.toString = function () {
        return _clearInterval.toString();
      };

      return clearInterval;
    }(function () {
      if (this.refetchIntervalId) {
        clearInterval(this.refetchIntervalId);
        this.refetchIntervalId = undefined;
      }
    });

    _proto.updateConfig = function updateConfig(config) {
      var _this = this;

      var oldConfig = this.config; // Update the config

      this.config = config;

      if (!isServer) {
        if ((oldConfig == null ? void 0 : oldConfig.refetchInterval) === config.refetchInterval) {
          return;
        }

        this.query.clearIntervals();
        var minInterval = Math.min.apply(Math, this.query.instances.map(function (d) {
          return d.config.refetchInterval || Infinity;
        }));

        if (!this.refetchIntervalId && minInterval > 0 && minInterval < Infinity) {
          this.refetchIntervalId = setInterval(function () {
            if (_this.query.instances.some(function (_) {
              return _this.config.enabled;
            }) && (isDocumentVisible() || _this.query.instances.some(function (_) {
              return _this.config.refetchIntervalInBackground;
            }))) {
              _this.query.fetch();
            }
          }, minInterval);
        }
      }
    };

    _proto.run = function run() {
      try {
        var _this3 = this;

        return _continueIgnored(_catch(function () {
          // Perform the refetch for this query if necessary
          return _invoke(function () {
            if (_this3.query.config.enabled && // Don't auto refetch if disabled
            !_this3.query.wasSuspended && // Don't double refetch for suspense
            _this3.query.state.isStale && ( // Only refetch if stale
            _this3.query.config.refetchOnMount || _this3.query.instances.length === 1)) {
              return _awaitIgnored(_this3.query.fetch());
            }
          }, function () {
            _this3.query.wasSuspended = false;
          });
        }, function (error) {
          Console.error(error);
        }));
      } catch (e) {
        return Promise.reject(e);
      }
    };

    _proto.unsubscribe = function unsubscribe() {
      var _this4 = this;

      this.query.instances = this.query.instances.filter(function (d) {
        return d.id !== _this4.id;
      });

      if (!this.query.instances.length) {
        this.clearInterval();
        this.query.cancel();

        if (!isServer) {
          // Schedule garbage collection
          this.query.scheduleGarbageCollection();
        }
      }
    };

    return QueryInstance;
  }();

  function _empty$1() {}

  var ActionType;

  function _awaitIgnored$1(value, direct) {
    if (!direct) {
      return value && value.then ? value.then(_empty$1) : Promise.resolve();
    }
  }

  function _catch$1(body, recover) {
    try {
      var result = body();
    } catch (e) {
      return recover(e);
    }

    if (result && result.then) {
      return result.then(void 0, recover);
    }

    return result;
  }

  function _continueIgnored$1(value) {
    if (value && value.then) {
      return value.then(_empty$1);
    }
  }

  function _await(value, then, direct) {
    if (direct) {
      return then ? then(value) : value;
    }

    if (!value || !value.then) {
      value = Promise.resolve(value);
    }

    return then ? value.then(then) : value;
  }

  function _invoke$1(body, then) {
    var result = body();

    if (result && result.then) {
      return result.then(then);
    }

    return then(result);
  }

  function _async(f) {
    return function () {
      for (var args = [], i = 0; i < arguments.length; i++) {
        args[i] = arguments[i];
      }

      try {
        return Promise.resolve(f.apply(this, args));
      } catch (e) {
        return Promise.reject(e);
      }
    };
  }

  function _invokeIgnored(body) {
    var result = body();

    if (result && result.then) {
      return result.then(_empty$1);
    }
  }

  function _settle(pact, state, value) {
    if (!pact.s) {
      if (value instanceof _Pact) {
        if (value.s) {
          if (state & 1) {
            state = value.s;
          }

          value = value.v;
        } else {
          value.o = _settle.bind(null, pact, state);
          return;
        }
      }

      if (value && value.then) {
        value.then(_settle.bind(null, pact, state), _settle.bind(null, pact, 2));
        return;
      }

      pact.s = state;
      pact.v = value;
      var observer = pact.o;

      if (observer) {
        observer(pact);
      }
    }
  }

  var _Pact = /*#__PURE__*/function () {
    function _Pact() {}

    _Pact.prototype.then = function (onFulfilled, onRejected) {
      var result = new _Pact();
      var state = this.s;

      if (state) {
        var callback = state & 1 ? onFulfilled : onRejected;

        if (callback) {
          try {
            _settle(result, 1, callback(this.v));
          } catch (e) {
            _settle(result, 2, e);
          }

          return result;
        } else {
          return this;
        }
      }

      this.o = function (_this) {
        try {
          var value = _this.v;

          if (_this.s & 1) {
            _settle(result, 1, onFulfilled ? onFulfilled(value) : value);
          } else if (onRejected) {
            _settle(result, 1, onRejected(value));
          } else {
            _settle(result, 2, value);
          }
        } catch (e) {
          _settle(result, 2, e);
        }
      };

      return result;
    };

    return _Pact;
  }();

  function _isSettledPact(thenable) {
    return thenable instanceof _Pact && thenable.s & 1;
  }

  function _do(body, test) {
    var awaitBody;

    do {
      var result = body();

      if (result && result.then) {
        if (_isSettledPact(result)) {
          result = result.v;
        } else {
          awaitBody = true;
          break;
        }
      }

      var shouldContinue = test();

      if (_isSettledPact(shouldContinue)) {
        shouldContinue = shouldContinue.v;
      }

      if (!shouldContinue) {
        return result;
      }
    } while (!shouldContinue.then);

    var pact = new _Pact();

    var reject = _settle.bind(null, pact, 2);

    (awaitBody ? result.then(_resumeAfterBody) : shouldContinue.then(_resumeAfterTest)).then(void 0, reject);
    return pact;

    function _resumeAfterBody(value) {
      result = value;

      for (;;) {
        shouldContinue = test();

        if (_isSettledPact(shouldContinue)) {
          shouldContinue = shouldContinue.v;
        }

        if (!shouldContinue) {
          break;
        }

        if (shouldContinue.then) {
          shouldContinue.then(_resumeAfterTest).then(void 0, reject);
          return;
        }

        result = body();

        if (result && result.then) {
          if (_isSettledPact(result)) {
            result = result.v;
          } else {
            result.then(_resumeAfterBody).then(void 0, reject);
            return;
          }
        }
      }

      _settle(pact, 1, result);
    }

    function _resumeAfterTest(shouldContinue) {
      if (shouldContinue) {
        do {
          result = body();

          if (result && result.then) {
            if (_isSettledPact(result)) {
              result = result.v;
            } else {
              result.then(_resumeAfterBody).then(void 0, reject);
              return;
            }
          }

          shouldContinue = test();

          if (_isSettledPact(shouldContinue)) {
            shouldContinue = shouldContinue.v;
          }

          if (!shouldContinue) {
            _settle(pact, 1, result);

            return;
          }
        } while (!shouldContinue.then);

        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
      } else {
        _settle(pact, 1, result);
      }
    }
  }

  function _continue(value, then) {
    return value && value.then ? value.then(then) : then(value);
  }

  function _rethrow(thrown, value) {
    if (thrown) throw value;
    return value;
  }

  function _finallyRethrows(body, finalizer) {
    try {
      var result = body();
    } catch (e) {
      return finalizer(true, e);
    }

    if (result && result.then) {
      return result.then(finalizer.bind(null, false), finalizer.bind(null, true));
    }

    return finalizer(false, result);
  }

  (function (ActionType) {
    ActionType["Failed"] = "Failed";
    ActionType["MarkStale"] = "MarkStale";
    ActionType["MarkGC"] = "MarkGC";
    ActionType["Fetch"] = "Fetch";
    ActionType["Success"] = "Success";
    ActionType["Error"] = "Error";
    ActionType["SetState"] = "SetState";
  })(ActionType || (ActionType = {}));

  // CLASS
  var Query = /*#__PURE__*/function () {
    function Query(init) {
      this.config = init.config;
      this.queryCache = init.queryCache;
      this.queryKey = init.queryKey;
      this.queryHash = init.queryHash;
      this.notifyGlobalListeners = init.notifyGlobalListeners;
      this.instances = [];
      this.state = getDefaultState(init.config);

      if (init.config.infinite) {
        var infiniteConfig = init.config;
        var infiniteData = this.state.data;

        if (typeof infiniteData !== 'undefined' && typeof this.state.canFetchMore === 'undefined') {
          this.fetchMoreVariable = infiniteConfig.getFetchMore(infiniteData[infiniteData.length - 1], infiniteData);
          this.state.canFetchMore = this.fetchMoreVariable !== false;
        } // Here we seed the pageVariabes for the query


        if (!this.pageVariables) {
          this.pageVariables = [[].concat(this.queryKey)];
        }
      }
    }

    var _proto = Query.prototype;

    _proto.dispatch = function dispatch(action) {
      var _this = this;

      var newState = queryReducer(this.state, action); // Only update state if something has changed

      if (!shallowEqual(this.state, newState)) {
        this.state = newState;
        this.instances.forEach(function (d) {
          return d.onStateUpdate == null ? void 0 : d.onStateUpdate(_this.state);
        });
        this.notifyGlobalListeners(this);
      }
    };

    _proto.scheduleStaleTimeout = function scheduleStaleTimeout() {
      var _this2 = this;

      if (isServer) {
        return;
      }

      this.clearStaleTimeout();

      if (this.state.isStale) {
        return;
      }

      if (this.config.staleTime === Infinity) {
        return;
      }

      this.staleTimeout = setTimeout(function () {
        _this2.invalidate();
      }, this.config.staleTime);
    };

    _proto.invalidate = function invalidate() {
      this.clearStaleTimeout();

      if (!this.queryCache.queries[this.queryHash]) {
        return;
      }

      if (this.state.isStale) {
        return;
      }

      this.dispatch({
        type: ActionType.MarkStale
      });
    };

    _proto.scheduleGarbageCollection = function scheduleGarbageCollection() {
      var _this3 = this;

      this.clearCacheTimeout();

      if (!this.queryCache.queries[this.queryHash]) {
        return;
      }

      if (this.config.cacheTime === Infinity) {
        return;
      }

      this.dispatch({
        type: ActionType.MarkGC
      });
      this.cacheTimeout = setTimeout(function () {
        _this3.queryCache.removeQueries(function (d) {
          return d.state.markedForGarbageCollection && d.queryHash === _this3.queryHash;
        });
      }, typeof this.state.data === 'undefined' && this.state.status !== exports.QueryStatus.Error ? 0 : this.config.cacheTime);
    };

    _proto.refetch = function refetch() {
      try {
        var _this5 = this;

        return _continueIgnored$1(_catch$1(function () {
          return _awaitIgnored$1(_this5.fetch());
        }, function (error) {
          Console.error(error);
        }));
      } catch (e) {
        return Promise.reject(e);
      }
    };

    _proto.heal = function heal() {
      // Stop the query from being garbage collected
      this.clearCacheTimeout(); // Mark the query as not cancelled

      this.cancelled = null;
    };

    _proto.cancel = function cancel() {
      this.cancelled = cancelledError;

      if (this.cancelPromises) {
        this.cancelPromises();
      }

      delete this.promise;
    };

    _proto.clearIntervals = function clearIntervals() {
      this.instances.forEach(function (instance) {
        instance.clearInterval();
      });
    };

    _proto.clearStaleTimeout = function clearStaleTimeout() {
      if (this.staleTimeout) {
        clearTimeout(this.staleTimeout);
        this.staleTimeout = undefined;
      }
    };

    _proto.clearCacheTimeout = function clearCacheTimeout() {
      if (this.cacheTimeout) {
        clearTimeout(this.cacheTimeout);
        this.cacheTimeout = undefined;
      }
    };

    _proto.clearRetryTimeout = function clearRetryTimeout() {
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = undefined;
      }
    };

    _proto.setState = function setState(updater) {
      this.dispatch({
        type: ActionType.SetState,
        updater: updater
      });
    };

    _proto.setData = function setData(updater) {
      var isStale = this.config.staleTime === 0; // Set data and mark it as cached

      this.dispatch({
        type: ActionType.Success,
        updater: updater,
        isStale: isStale
      });

      if (!isStale) {
        // Schedule a fresh invalidation!
        this.scheduleStaleTimeout();
      }
    };

    _proto.clear = function clear() {
      this.clearStaleTimeout();
      this.clearCacheTimeout();
      this.clearRetryTimeout();
      this.clearIntervals();
      this.cancel();
      delete this.queryCache.queries[this.queryHash];
      this.notifyGlobalListeners(this);
    };

    _proto.subscribe = function subscribe(onStateUpdate) {
      var instance = new QueryInstance(this, onStateUpdate);
      this.instances.push(instance);
      this.heal();
      return instance;
    } // Set up the core fetcher function
    ;

    _proto.tryFetchData = function tryFetchData(fn, args) {
      try {
        var _this7 = this;

        return _catch$1(function () {
          // Perform the query
          var promiseOrValue = fn.apply(void 0, _this7.config.queryFnParamsFilter(args));

          _this7.cancelPromises = function () {
            var _ref;

            return (_ref = promiseOrValue) == null ? void 0 : _ref.cancel == null ? void 0 : _ref.cancel();
          };

          return _await(promiseOrValue, function (data) {
            delete _this7.shouldContinueRetryOnFocus;
            delete _this7.cancelPromises;
            if (_this7.cancelled) throw _this7.cancelled;
            return data;
          });
        }, function (error) {
          var _exit = false;
          delete _this7.cancelPromises;
          if (_this7.cancelled) throw _this7.cancelled; // Do we need to retry the request?

          return _invoke$1(function () {
            if (_this7.config.retry === true || _this7.state.failureCount < _this7.config.retry || typeof _this7.config.retry === 'function' && _this7.config.retry(_this7.state.failureCount, error)) {
              // If we retry, increase the failureCount
              _this7.dispatch({
                type: ActionType.Failed
              }); // Only retry if the document is visible


              if (!isDocumentVisible()) {
                // set this flag to continue retries on focus
                _this7.shouldContinueRetryOnFocus = true; // Resolve a

                _exit = true;
                return new Promise(noop);
              }

              delete _this7.shouldContinueRetryOnFocus; // Determine the retryDelay

              var delay = functionalUpdate(_this7.config.retryDelay, _this7.state.failureCount); // Return a new promise with the retry

              _exit = true;
              return _await(new Promise(function (resolve, reject) {
                // Keep track of the retry timeout
                _this7.retryTimeout = setTimeout(_async(function () {
                  return _this7.cancelled ? reject(_this7.cancelled) : _catch$1(function () {
                    return _await(_this7.tryFetchData(fn, args), function (data) {
                      if (_this7.cancelled) return reject(_this7.cancelled);
                      resolve(data);
                    });
                  }, function (error) {
                    if (_this7.cancelled) return reject(_this7.cancelled);
                    reject(error);
                  });
                }), delay);
              }));
            }
          }, function (_result) {
            if (_exit) return _result;
            throw error;
          });
        });
      } catch (e) {
        return Promise.reject(e);
      }
    };

    _proto.fetch = function fetch(options) {
      try {
        var _this9 = this;

        var queryFn = _this9.config.queryFn;

        if (!queryFn) {
          return;
        } // If we are already fetching, return current promise


        if (_this9.promise) {
          return _this9.promise;
        }

        if (_this9.config.infinite) {
          var infiniteConfig = _this9.config;
          var infiniteData = _this9.state.data;
          var fetchMore = options == null ? void 0 : options.fetchMore;
          var originalQueryFn = queryFn;
          queryFn = _async(function () {
            var _interrupt = false;
            var data = [];
            var pageVariables = _this9.pageVariables ? [].concat(_this9.pageVariables) : [];
            var rebuiltPageVariables = [];
            return _continue(_do(function () {
              var args = pageVariables.shift();
              return _invokeIgnored(function () {
                if (!data.length) {
                  var _push3 = data.push;
                  // the first page query doesn't need to be rebuilt
                  return _await(originalQueryFn.apply(void 0, args), function (_originalQueryFn) {
                    _push3.call(data, _originalQueryFn);

                    rebuiltPageVariables.push(args);
                  });
                } else {
                  // get an up-to-date cursor based on the previous data set
                  var nextCursor = infiniteConfig.getFetchMore(data[data.length - 1], data); // break early if there's no next cursor
                  // otherwise we'll start from the beginning
                  // which will cause unwanted duplication

                  if (!nextCursor) {
                    _interrupt = true;
                    return;
                  }

                  var pageArgs = [].concat(args.slice(0, -1), [nextCursor]);
                  var _push4 = data.push;
                  return _await(originalQueryFn.apply(void 0, pageArgs), function (_originalQueryFn2) {
                    _push4.call(data, _originalQueryFn2);

                    rebuiltPageVariables.push(pageArgs);
                  });
                }
              });
            }, function () {
              return !_interrupt && !!pageVariables.length;
            }), function () {
              _this9.fetchMoreVariable = infiniteConfig.getFetchMore(data[data.length - 1], data);
              _this9.state.canFetchMore = _this9.fetchMoreVariable !== false;
              _this9.pageVariables = rebuiltPageVariables;
              return data;
            });
          });

          if (fetchMore) {
            queryFn = _async(function () {
              for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
              }

              return _finallyRethrows(function () {
                var fetchMoreVariable = fetchMore.fetchMoreVariable,
                    previous = fetchMore.previous;

                _this9.setState(function (old) {
                  return _extends({}, old, {
                    isFetchingMore: previous ? 'previous' : 'next'
                  });
                });

                var newArgs = [].concat(args, [fetchMoreVariable]);

                if (_this9.pageVariables) {
                  _this9.pageVariables[previous ? 'unshift' : 'push'](newArgs);
                } else {
                  _this9.pageVariables = [newArgs];
                }

                return _await(originalQueryFn.apply(void 0, newArgs), function (newData) {
                  var data;

                  if (!infiniteData) {
                    data = [newData];
                  } else if (previous) {
                    data = [newData].concat(infiniteData);
                  } else {
                    data = [].concat(infiniteData, [newData]);
                  }

                  _this9.fetchMoreVariable = infiniteConfig.getFetchMore(newData, data);
                  _this9.state.canFetchMore = _this9.fetchMoreVariable !== false;
                  return data;
                });
              }, function (_wasThrown, _result3) {
                _this9.setState(function (old) {
                  return _extends({}, old, {
                    isFetchingMore: false
                  });
                });

                return _rethrow(_wasThrown, _result3);
              });
            });
          }
        }

        _this9.promise = _async(function () {
          // If there are any retries pending for this query, kill them
          _this9.cancelled = null;

          var getCallbackInstances = function getCallbackInstances() {
            var callbackInstances = [].concat(_this9.instances);

            if (_this9.wasSuspended && _this9.fallbackInstance) {
              callbackInstances.unshift(_this9.fallbackInstance);
            }

            return callbackInstances;
          };

          return _catch$1(function () {
            // Set up the query refreshing state
            _this9.dispatch({
              type: ActionType.Fetch
            }); // Try to get the data


            return _await(_this9.tryFetchData(queryFn, _this9.queryKey), function (data) {
              _this9.setData(function (old) {
                return _this9.config.isDataEqual(old, data) ? old : data;
              });

              getCallbackInstances().forEach(function (instance) {
                instance.config.onSuccess == null ? void 0 : instance.config.onSuccess(_this9.state.data);
              });
              getCallbackInstances().forEach(function (instance) {
                return instance.config.onSettled == null ? void 0 : instance.config.onSettled(_this9.state.data, null);
              });
              delete _this9.promise;
              return data;
            });
          }, function (error) {
            _this9.dispatch({
              type: ActionType.Error,
              cancelled: error === _this9.cancelled,
              error: error
            });

            delete _this9.promise;

            if (error !== _this9.cancelled) {
              getCallbackInstances().forEach(function (instance) {
                return instance.config.onError == null ? void 0 : instance.config.onError(error);
              });
              getCallbackInstances().forEach(function (instance) {
                return instance.config.onSettled == null ? void 0 : instance.config.onSettled(undefined, error);
              });
              throw error;
            }
          });
        })();
        return _this9.promise;
      } catch (e) {
        return Promise.reject(e);
      }
    };

    _proto.fetchMore = function fetchMore(fetchMoreVariable, options) {
      return this.fetch({
        fetchMore: {
          fetchMoreVariable: fetchMoreVariable != null ? fetchMoreVariable : this.fetchMoreVariable,
          previous: (options == null ? void 0 : options.previous) || false
        }
      });
    };

    return Query;
  }();

  function getDefaultState(config) {
    var _config$initialStale;

    var initialData = typeof config.initialData === 'function' ? config.initialData() : config.initialData;
    var hasInitialData = typeof initialData !== 'undefined';
    var isStale = !config.enabled || (typeof config.initialStale === 'function' ? config.initialStale() : (_config$initialStale = config.initialStale) != null ? _config$initialStale : !hasInitialData);
    var initialStatus = hasInitialData ? exports.QueryStatus.Success : config.enabled ? exports.QueryStatus.Loading : exports.QueryStatus.Idle;
    return _extends({}, getStatusProps(initialStatus), {
      error: null,
      isFetching: initialStatus === exports.QueryStatus.Loading,
      failureCount: 0,
      isStale: isStale,
      markedForGarbageCollection: false,
      data: initialData,
      updatedAt: hasInitialData ? Date.now() : 0
    });
  }

  function queryReducer(state, action) {
    switch (action.type) {
      case ActionType.Failed:
        return _extends({}, state, {
          failureCount: state.failureCount + 1
        });

      case ActionType.MarkStale:
        return _extends({}, state, {
          isStale: true
        });

      case ActionType.MarkGC:
        {
          return _extends({}, state, {
            markedForGarbageCollection: true
          });
        }

      case ActionType.Fetch:
        var status = typeof state.data !== 'undefined' ? exports.QueryStatus.Success : exports.QueryStatus.Loading;
        return _extends({}, state, getStatusProps(status), {
          isFetching: true,
          failureCount: 0
        });

      case ActionType.Success:
        return _extends({}, state, getStatusProps(exports.QueryStatus.Success), {
          data: functionalUpdate(action.updater, state.data),
          error: null,
          isStale: action.isStale,
          isFetching: false,
          updatedAt: Date.now(),
          failureCount: 0
        });

      case ActionType.Error:
        return _extends({}, state, {
          failureCount: state.failureCount + 1,
          isFetching: false,
          isStale: true
        }, !action.cancelled && _extends({}, getStatusProps(exports.QueryStatus.Error), {
          error: action.error,
          throwInErrorBoundary: true
        }));

      case ActionType.SetState:
        return functionalUpdate(action.updater, state);

      default:
        return state;
    }
  }

  // CLASS
  function _empty$2() {}

  function _awaitIgnored$2(value, direct) {
    if (!direct) {
      return value && value.then ? value.then(_empty$2) : Promise.resolve();
    }
  }

  function _catch$2(body, recover) {
    try {
      var result = body();
    } catch (e) {
      return recover(e);
    }

    if (result && result.then) {
      return result.then(void 0, recover);
    }

    return result;
  }

  function _invoke$2(body, then) {
    var result = body();

    if (result && result.then) {
      return result.then(then);
    }

    return then(result);
  }

  var QueryCache = /*#__PURE__*/function () {
    function QueryCache(config) {
      this.config = config || {}; // A frozen cache does not add new queries to the cache

      this.globalListeners = [];
      this.configRef = this.config.defaultConfig ? {
        current: {
          shared: _extends({}, defaultConfigRef.current.shared, this.config.defaultConfig.shared),
          queries: _extends({}, defaultConfigRef.current.queries, this.config.defaultConfig.queries),
          mutations: _extends({}, defaultConfigRef.current.mutations, this.config.defaultConfig.mutations)
        }
      } : defaultConfigRef;
      this.queries = {};
      this.isFetching = 0;
    }

    var _proto = QueryCache.prototype;

    _proto.notifyGlobalListeners = function notifyGlobalListeners(query) {
      this.isFetching = Object.values(this.queries).reduce(function (acc, query) {
        return query.state.isFetching ? acc + 1 : acc;
      }, 0);
      this.globalListeners.forEach(function (d) {
        return d(queryCache, query);
      });
    };

    _proto.subscribe = function subscribe(listener) {
      var _this = this;

      this.globalListeners.push(listener);
      return function () {
        _this.globalListeners.splice(_this.globalListeners.indexOf(listener), 1);
      };
    };

    _proto.clear = function clear(options) {
      Object.values(this.queries).forEach(function (query) {
        return query.clear();
      });
      this.queries = {};

      if (options == null ? void 0 : options.notify) {
        this.notifyGlobalListeners();
      }
    };

    _proto.getQueries = function getQueries(predicate, options) {
      if (predicate === true) {
        return Object.values(this.queries);
      }

      var predicateFn;

      if (typeof predicate === 'function') {
        predicateFn = predicate;
      } else {
        var _ref = this.configRef.current.queries.queryKeySerializerFn(predicate),
            queryHash = _ref[0],
            _queryKey = _ref[1];

        predicateFn = function predicateFn(d) {
          return (options == null ? void 0 : options.exact) ? d.queryHash === queryHash : deepIncludes(d.queryKey, _queryKey);
        };
      }

      return Object.values(this.queries).filter(predicateFn);
    };

    _proto.getQuery = function getQuery(predicate) {
      return this.getQueries(predicate, {
        exact: true
      })[0];
    };

    _proto.getQueryData = function getQueryData(predicate) {
      var _this$getQuery;

      return (_this$getQuery = this.getQuery(predicate)) == null ? void 0 : _this$getQuery.state.data;
    };

    _proto.removeQueries = function removeQueries(predicate, options) {
      this.getQueries(predicate, options).forEach(function (query) {
        return query.clear();
      });
    };

    _proto.cancelQueries = function cancelQueries(predicate, options) {
      this.getQueries(predicate, options).forEach(function (query) {
        return query.cancel();
      });
    };

    _proto.invalidateQueries = function invalidateQueries(predicate, options) {
      try {
        var _this3 = this;

        var _ref2 = options || {},
            _ref2$refetchActive = _ref2.refetchActive,
            refetchActive = _ref2$refetchActive === void 0 ? true : _ref2$refetchActive,
            _ref2$refetchInactive = _ref2.refetchInactive,
            refetchInactive = _ref2$refetchInactive === void 0 ? false : _ref2$refetchInactive,
            throwOnError = _ref2.throwOnError;

        return _catch$2(function () {
          return _awaitIgnored$2(Promise.all(_this3.getQueries(predicate, options).map(function (query) {
            if (query.instances.length) {
              if (refetchActive && query.instances.some(function (instance) {
                return instance.config.enabled;
              })) {
                return query.fetch();
              }
            } else {
              if (refetchInactive) {
                return query.fetch();
              }
            }

            return query.invalidate();
          })));
        }, function (err) {
          if (throwOnError) {
            throw err;
          }
        });
      } catch (e) {
        return Promise.reject(e);
      }
    };

    _proto.resetErrorBoundaries = function resetErrorBoundaries() {
      this.getQueries(true).forEach(function (query) {
        query.state.throwInErrorBoundary = false;
      });
    };

    _proto.buildQuery = function buildQuery(userQueryKey, queryConfig) {
      var _this4 = this;

      if (queryConfig === void 0) {
        queryConfig = {};
      }

      var config = _extends({}, this.configRef.current.shared, this.configRef.current.queries, queryConfig);

      var _ref3 = config.queryKeySerializerFn(userQueryKey),
          queryHash = _ref3[0],
          queryKey = _ref3[1];

      var query;

      if (this.queries[queryHash]) {
        query = this.queries[queryHash];
        query.config = config;
      }

      if (!query) {
        query = new Query({
          queryCache: queryCache,
          queryKey: queryKey,
          queryHash: queryHash,
          config: config,
          notifyGlobalListeners: function notifyGlobalListeners(query) {
            _this4.notifyGlobalListeners(query);
          }
        }); // If the query started with data, schedule
        // a stale timeout

        if (!isServer && query.state.data) {
          query.scheduleStaleTimeout(); // Simulate a query healing process

          query.heal(); // Schedule for garbage collection in case
          // nothing subscribes to this query

          query.scheduleGarbageCollection();
        }

        if (!this.config.frozen) {
          this.queries[queryHash] = query;

          if (isServer) {
            this.notifyGlobalListeners();
          } else {
            // Here, we setTimeout so as to not trigger
            // any setState's in parent components in the
            // middle of the render phase.
            setTimeout(function () {
              _this4.notifyGlobalListeners();
            });
          }
        }
      }

      query.fallbackInstance = {
        config: {
          onSuccess: query.config.onSuccess,
          onError: query.config.onError,
          onSettled: query.config.onSettled
        }
      };
      return query;
    } // Parameter syntax with optional prefetch options
    ;

    // Implementation
    _proto.prefetchQuery = function prefetchQuery() {
      try {
        var _this6 = this;

        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        if (isObject(args[1]) && (args[1].hasOwnProperty('throwOnError') || args[1].hasOwnProperty('force'))) {
          args[3] = args[1];
          args[1] = undefined;
          args[2] = undefined;
        }

        var _getQueryArgs = getQueryArgs(args),
            _queryKey2 = _getQueryArgs[0],
            _config = _getQueryArgs[1],
            _options = _getQueryArgs[2]; // https://github.com/tannerlinsley/react-query/issues/652


        var configWithoutRetry = _extends({
          retry: false
        }, _config);

        return _catch$2(function () {
          var query = _this6.buildQuery(_queryKey2, configWithoutRetry);

          return _invoke$2(function () {
            if ((_options == null ? void 0 : _options.force) || query.state.isStale) {
              return _awaitIgnored$2(query.fetch());
            }
          }, function () {
            return query.state.data;
          });
        }, function (err) {
          if (_options == null ? void 0 : _options.throwOnError) {
            throw err;
          }

          Console.error(err);
        });
      } catch (e) {
        return Promise.reject(e);
      }
    };

    _proto.setQueryData = function setQueryData(queryKey, updater, config) {
      if (config === void 0) {
        config = {};
      }

      var query = this.getQuery(queryKey);

      if (!query) {
        query = this.buildQuery(queryKey, config);
      }

      query.setData(updater);
    };

    return QueryCache;
  }();
  var queryCache = makeQueryCache({
    frozen: isServer
  });
  var queryCaches = [queryCache];
  function makeQueryCache(config) {
    return new QueryCache(config);
  }

  var visibilityChangeEvent = 'visibilitychange';
  var focusEvent = 'focus';

  var onWindowFocus = function onWindowFocus() {
    if (isDocumentVisible() && isOnline()) {
      queryCaches.forEach(function (queryCache) {
        return queryCache.invalidateQueries(function (query) {
          if (!query.instances.length) {
            return false;
          }

          if (!query.instances.some(function (instance) {
            return instance.config.enabled;
          })) {
            return false;
          }

          if (!query.state.isStale) {
            return false;
          }

          if (query.shouldContinueRetryOnFocus) {
            // delete promise, so refetching will create new one
            delete query.promise;
          }

          return Boolean(query.config.refetchOnWindowFocus);
        }).catch(Console.error);
      });
    }
  };

  var removePreviousHandler;
  function setFocusHandler(callback) {
    // Unsub the old watcher
    if (removePreviousHandler) {
      removePreviousHandler();
    } // Sub the new watcher


    removePreviousHandler = callback(onWindowFocus);
  }
  setFocusHandler(function (handleFocus) {
    var _window;

    // Listen to visibillitychange and focus
    if (!isServer && ((_window = window) == null ? void 0 : _window.addEventListener)) {
      window.addEventListener(visibilityChangeEvent, handleFocus, false);
      window.addEventListener(focusEvent, handleFocus, false);
      return function () {
        // Be sure to unsubscribe if a new handler is set
        window.removeEventListener(visibilityChangeEvent, handleFocus);
        window.removeEventListener(focusEvent, handleFocus);
      };
    }

    return;
  });

  var queryCacheContext = React.createContext(queryCache);
  var useQueryCache = function useQueryCache() {
    return React.useContext(queryCacheContext);
  };
  var ReactQueryCacheProvider = function ReactQueryCacheProvider(_ref) {
    var queryCache = _ref.queryCache,
        children = _ref.children;
    var resolvedQueryCache = React.useMemo(function () {
      return queryCache || makeQueryCache();
    }, [queryCache]);
    React.useEffect(function () {
      queryCaches.push(resolvedQueryCache);
      return function () {
        // remove the cache from the active list
        var i = queryCaches.indexOf(resolvedQueryCache);

        if (i > -1) {
          queryCaches.splice(i, 1);
        } // if the resolvedQueryCache was created by us, we need to tear it down


        if (queryCache == null) {
          resolvedQueryCache.clear({
            notify: false
          });
        }
      };
    }, [resolvedQueryCache, queryCache]);
    return /*#__PURE__*/React.createElement(queryCacheContext.Provider, {
      value: resolvedQueryCache
    }, children);
  };

  var configContext = React.createContext(undefined);
  function useConfigContext() {
    return React.useContext(configContext) || defaultConfigRef.current;
  }
  var ReactQueryConfigProvider = function ReactQueryConfigProvider(_ref) {
    var config = _ref.config,
        children = _ref.children;
    var configContextValueOrDefault = useConfigContext();
    var configContextValue = React.useContext(configContext);
    var newConfig = React.useMemo(function () {
      var _config$shared = config.shared,
          shared = _config$shared === void 0 ? {} : _config$shared,
          _config$queries = config.queries,
          queries = _config$queries === void 0 ? {} : _config$queries,
          _config$mutations = config.mutations,
          mutations = _config$mutations === void 0 ? {} : _config$mutations;
      var _configContextValueOr = configContextValueOrDefault.shared,
          contextShared = _configContextValueOr === void 0 ? {} : _configContextValueOr,
          _configContextValueOr2 = configContextValueOrDefault.queries,
          contextQueries = _configContextValueOr2 === void 0 ? {} : _configContextValueOr2,
          _configContextValueOr3 = configContextValueOrDefault.mutations,
          contextMutations = _configContextValueOr3 === void 0 ? {} : _configContextValueOr3;
      return {
        shared: _extends({}, contextShared, shared),
        queries: _extends({}, contextQueries, queries),
        mutations: _extends({}, contextMutations, mutations)
      };
    }, [config, configContextValueOrDefault]);
    React.useEffect(function () {
      // restore previous config on unmount
      return function () {
        defaultConfigRef.current = _extends({}, configContextValueOrDefault || DEFAULT_CONFIG);
      };
    }, [configContextValueOrDefault]); // If this is the outermost provider, overwrite the shared default config

    if (!configContextValue) {
      defaultConfigRef.current = newConfig;
    }

    return /*#__PURE__*/React.createElement(configContext.Provider, {
      value: newConfig
    }, children);
  };

  function useGetLatest(obj) {
    var ref = React.useRef(obj);
    ref.current = obj;
    return React.useCallback(function () {
      return ref.current;
    }, []);
  }
  function useMountedCallback(callback) {
    var mounted = React.useRef(false);
    React[isServer ? 'useEffect' : 'useLayoutEffect'](function () {
      mounted.current = true;
      return function () {
        mounted.current = false;
      };
    }, []);
    return React.useCallback(function () {
      return mounted.current ? callback.apply(void 0, arguments) : void 0;
    }, [callback]);
  }
  function useRerenderer() {
    var rerender = useMountedCallback(React.useState()[1]);
    return React.useCallback(function () {
      return rerender({});
    }, [rerender]);
  }
  function handleSuspense(result) {
    var error = result.error,
        query = result.query;
    var config = query.config,
        state = query.state;

    if (config.suspense || config.useErrorBoundary) {
      if (state.status === exports.QueryStatus.Error && state.throwInErrorBoundary) {
        throw error;
      }

      if (config.suspense && state.status !== exports.QueryStatus.Success && config.enabled) {
        query.wasSuspended = true;
        throw query.fetch();
      }
    }
  }

  function useIsFetching() {
    var queryCache = useQueryCache();
    var rerender = useRerenderer();
    var isFetching = queryCache.isFetching;
    var getIsFetching = useGetLatest(isFetching);
    React.useEffect(function () {
      return queryCache.subscribe(function (newCache) {
        if (getIsFetching() !== newCache.isFetching) {
          rerender();
        }
      });
    }, [getIsFetching, queryCache, rerender]);
    return isFetching;
  }

  function _await$1(value, then, direct) {
    if (direct) {
      return then ? then(value) : value;
    }

    if (!value || !value.then) {
      value = Promise.resolve(value);
    }

    return then ? value.then(then) : value;
  }

  var ActionType$1;

  function _catch$3(body, recover) {
    try {
      var result = body();
    } catch (e) {
      return recover(e);
    }

    if (result && result.then) {
      return result.then(void 0, recover);
    }

    return result;
  }

  function _async$1(f) {
    return function () {
      for (var args = [], i = 0; i < arguments.length; i++) {
        args[i] = arguments[i];
      }

      try {
        return Promise.resolve(f.apply(this, args));
      } catch (e) {
        return Promise.reject(e);
      }
    };
  }

  (function (ActionType) {
    ActionType["Reset"] = "Reset";
    ActionType["Loading"] = "Loading";
    ActionType["Resolve"] = "Resolve";
    ActionType["Reject"] = "Reject";
  })(ActionType$1 || (ActionType$1 = {}));

  // HOOK
  var getDefaultState$1 = function getDefaultState() {
    return _extends({}, getStatusProps(exports.QueryStatus.Idle), {
      data: undefined,
      error: null
    });
  };

  function mutationReducer(state, action) {
    switch (action.type) {
      case ActionType$1.Reset:
        return getDefaultState$1();

      case ActionType$1.Loading:
        return _extends({}, getStatusProps(exports.QueryStatus.Loading), {
          data: undefined,
          error: null
        });

      case ActionType$1.Resolve:
        return _extends({}, getStatusProps(exports.QueryStatus.Success), {
          data: action.data,
          error: null
        });

      case ActionType$1.Reject:
        return _extends({}, getStatusProps(exports.QueryStatus.Error), {
          data: undefined,
          error: action.error
        });

      default:
        return state;
    }
  }

  function useMutation(mutationFn, config) {
    if (config === void 0) {
      config = {};
    }

    var _React$useReducer = React.useReducer(mutationReducer, null, getDefaultState$1),
        state = _React$useReducer[0],
        unsafeDispatch = _React$useReducer[1];

    var dispatch = useMountedCallback(unsafeDispatch);
    var getMutationFn = useGetLatest(mutationFn);
    var contextConfig = useConfigContext();
    var getConfig = useGetLatest(_extends({}, contextConfig.shared, contextConfig.mutations, config));
    var latestMutationRef = React.useRef();
    var mutate = React.useCallback(_async$1(function (variables, mutateConfig) {
      if (mutateConfig === void 0) {
        mutateConfig = {};
      }

      var config = getConfig();
      var mutationId = uid();
      latestMutationRef.current = mutationId;

      var isLatest = function isLatest() {
        return latestMutationRef.current === mutationId;
      };

      var snapshotValue;
      return _catch$3(function () {
        dispatch({
          type: ActionType$1.Loading
        });
        return _await$1(config.onMutate == null ? void 0 : config.onMutate(variables), function (_config$onMutate) {
          snapshotValue = _config$onMutate;
          return _await$1(getMutationFn()(variables), function (data) {
            if (isLatest()) {
              dispatch({
                type: ActionType$1.Resolve,
                data: data
              });
            }

            return _await$1(config.onSuccess == null ? void 0 : config.onSuccess(data, variables), function () {
              return _await$1(mutateConfig.onSuccess == null ? void 0 : mutateConfig.onSuccess(data, variables), function () {
                return _await$1(config.onSettled == null ? void 0 : config.onSettled(data, null, variables), function () {
                  return _await$1(mutateConfig.onSettled == null ? void 0 : mutateConfig.onSettled(data, null, variables), function () {
                    return data;
                  });
                });
              });
            });
          });
        });
      }, function (error) {
        Console.error(error);
        return _await$1(config.onError == null ? void 0 : config.onError(error, variables, snapshotValue), function () {
          return _await$1(mutateConfig.onError == null ? void 0 : mutateConfig.onError(error, variables, snapshotValue), function () {
            return _await$1(config.onSettled == null ? void 0 : config.onSettled(undefined, error, variables, snapshotValue), function () {
              return _await$1(mutateConfig.onSettled == null ? void 0 : mutateConfig.onSettled(undefined, error, variables, snapshotValue), function () {
                var _mutateConfig$throwOn;

                if (isLatest()) {
                  dispatch({
                    type: ActionType$1.Reject,
                    error: error
                  });
                }

                if ((_mutateConfig$throwOn = mutateConfig.throwOnError) != null ? _mutateConfig$throwOn : config.throwOnError) {
                  throw error;
                }
              });
            });
          });
        });
      });
    }), [dispatch, getConfig, getMutationFn]);
    var reset = React.useCallback(function () {
      dispatch({
        type: ActionType$1.Reset
      });
    }, [dispatch]);
    React.useEffect(function () {
      var _getConfig = getConfig(),
          suspense = _getConfig.suspense,
          useErrorBoundary = _getConfig.useErrorBoundary;

      if ((useErrorBoundary != null ? useErrorBoundary : suspense) && state.error) {
        throw state.error;
      }
    }, [getConfig, state.error]);
    return [mutate, _extends({}, state, {
      reset: reset
    })];
  }

  function useBaseQuery(queryKey, config) {
    if (config === void 0) {
      config = {};
    }

    // Make a rerender function
    var rerender = useRerenderer(); // Get the query cache

    var queryCache = useQueryCache(); // Build the query for use

    var query = queryCache.buildQuery(queryKey, config);
    var state = query.state; // Create a query instance ref

    var instanceRef = React.useRef(); // Subscribe to the query when the subscribe function changes

    React.useEffect(function () {
      var instance = query.subscribe(function () {
        rerender();
      });
      instanceRef.current = instance; // Unsubscribe when things change

      return function () {
        return instance.unsubscribe();
      };
    }, [query, rerender]); // Always update the config

    React.useEffect(function () {
      var _instanceRef$current;

      (_instanceRef$current = instanceRef.current) == null ? void 0 : _instanceRef$current.updateConfig(config);
    });
    var enabledBool = Boolean(config.enabled); // Run the instance when the query or enabled change

    React.useEffect(function () {
      var _instanceRef$current2;

      (_instanceRef$current2 = instanceRef.current) == null ? void 0 : _instanceRef$current2.run();
    }, [enabledBool, query]);
    var clear = React.useMemo(function () {
      return query.clear.bind(query);
    }, [query]);
    var refetch = React.useMemo(function () {
      return query.refetch.bind(query);
    }, [query]);
    return {
      clear: clear,
      error: state.error,
      failureCount: state.failureCount,
      isError: state.isError,
      isFetching: state.isFetching,
      isIdle: state.isIdle,
      isLoading: state.isLoading,
      isStale: state.isStale,
      isSuccess: state.isSuccess,
      query: query,
      refetch: refetch,
      status: state.status,
      updatedAt: state.updatedAt
    };
  }

  function useQueryArgs(args) {
    var configContext = useConfigContext();

    var _getQueryArgs = getQueryArgs(args),
        queryKey = _getQueryArgs[0],
        config = _getQueryArgs[1],
        options = _getQueryArgs[2]; // Build the final config


    var configWithContext = _extends({}, configContext.shared, configContext.queries, config);

    return [queryKey, configWithContext, options];
  }

  // Implementation
  function useQuery() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var _useQueryArgs = useQueryArgs(args),
        queryKey = _useQueryArgs[0],
        config = _useQueryArgs[1];

    var result = useBaseQuery(queryKey, config);
    handleSuspense(result);
    return _extends({}, result, {
      data: result.query.state.data
    });
  }

  // as the query key changes, we keep the results from the
  // last query and use them as placeholder data in the next one
  // We DON'T use it as initial data though. That's important
  // TYPES

  // Implementation
  function usePaginatedQuery() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var _useQueryArgs = useQueryArgs(args),
        queryKey = _useQueryArgs[0],
        config = _useQueryArgs[1]; // Keep track of the latest data result


    var lastDataRef = React.useRef(); // If latestData is there, don't use initialData

    if (typeof lastDataRef.current !== 'undefined') {
      delete config.initialData;
    } // Make the query as normal


    var result = useBaseQuery(queryKey, config); // If the query is disabled, get rid of the latest data

    if (!result.query.config.enabled) {
      lastDataRef.current = undefined;
    } // Get the real data and status from the query


    var _result$query$state = result.query.state,
        latestData = _result$query$state.data,
        status = _result$query$state.status; // If the real query succeeds, and there is data in it,
    // update the latest data

    React.useEffect(function () {
      if (status === exports.QueryStatus.Success && typeof latestData !== 'undefined') {
        lastDataRef.current = latestData;
      }
    }, [latestData, status]); // Resolved data should be either the real data we're waiting on
    // or the latest placeholder data

    var resolvedData = latestData;

    if (typeof resolvedData === 'undefined') {
      resolvedData = lastDataRef.current;
    } // If we have any data at all from either, we
    // need to make sure the status is success, even though
    // the real query may still be loading


    if (typeof resolvedData !== 'undefined') {
      var overrides = getStatusProps(exports.QueryStatus.Success);
      Object.assign(result.query.state, overrides);
      Object.assign(result, overrides);
    }

    handleSuspense(result);
    return _extends({}, result, {
      resolvedData: resolvedData,
      latestData: latestData
    });
  }

  // Implementation
  function useInfiniteQuery() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var _useQueryArgs = useQueryArgs(args),
        queryKey = _useQueryArgs[0],
        config = _useQueryArgs[1];

    config.infinite = true;
    var result = useBaseQuery(queryKey, config);
    var query = result.query;
    var state = result.query.state;
    handleSuspense(result);
    var fetchMore = React.useMemo(function () {
      return query.fetchMore.bind(query);
    }, [query]);
    return _extends({}, result, {
      data: state.data,
      canFetchMore: state.canFetchMore,
      fetchMore: fetchMore,
      isFetching: state.isFetching,
      isFetchingMore: state.isFetchingMore
    });
  }

  exports.ReactQueryCacheProvider = ReactQueryCacheProvider;
  exports.ReactQueryConfigProvider = ReactQueryConfigProvider;
  exports.deepIncludes = deepIncludes;
  exports.makeQueryCache = makeQueryCache;
  exports.queryCache = queryCache;
  exports.queryCaches = queryCaches;
  exports.setConsole = setConsole;
  exports.setFocusHandler = setFocusHandler;
  exports.stableStringify = stableStringify;
  exports.useInfiniteQuery = useInfiniteQuery;
  exports.useIsFetching = useIsFetching;
  exports.useMutation = useMutation;
  exports.usePaginatedQuery = usePaginatedQuery;
  exports.useQuery = useQuery;
  exports.useQueryCache = useQueryCache;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=react-query.development.js.map