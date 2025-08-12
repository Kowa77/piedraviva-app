import {
  DataSnapshot,
  OnDisconnect,
  QueryConstraint,
  QueryImpl,
  QueryParams,
  ReferenceImpl,
  TransactionResult,
  _initStandalone,
  child,
  connectDatabaseEmulator,
  enableLogging,
  endAt,
  endBefore,
  equalTo,
  forceLongPolling,
  forceRestClient,
  forceWebSockets,
  get,
  getDatabase,
  goOffline,
  goOnline,
  hijackHash,
  increment,
  limitToFirst,
  limitToLast,
  off,
  onChildAdded,
  onChildChanged,
  onChildMoved,
  onChildRemoved,
  onDisconnect,
  onValue,
  orderByChild,
  orderByKey,
  orderByPriority,
  orderByValue,
  push,
  query,
  ref,
  refFromURL,
  remove,
  repoManagerDatabaseFromApp,
  runTransaction,
  serverTimestamp,
  set,
  setPriority,
  setSDKVersion,
  setWithPriority,
  startAfter,
  startAt,
  update,
  validatePathString,
  validateWritablePath
} from "./chunk-7OZLQYCG.js";
import {
  AppCheckInstances,
  AuthInstances
} from "./chunk-APUEZESS.js";
import {
  FirebaseApp,
  FirebaseApps,
  VERSION,
  ɵAngularFireSchedulers,
  ɵgetAllInstancesOf,
  ɵgetDefaultInstanceOf,
  ɵzoneWrap
} from "./chunk-M4KDBJBD.js";
import {
  registerVersion
} from "./chunk-E3OWJBZP.js";
import "./chunk-ZANZ7DTA.js";
import "./chunk-MMHDUA4G.js";
import {
  InjectionToken,
  Injector,
  NgModule,
  NgZone,
  Optional,
  makeEnvironmentProviders,
  setClassMetadata,
  ɵɵdefineInjector,
  ɵɵdefineNgModule
} from "./chunk-VATHRAA2.js";
import "./chunk-6TFLOFM6.js";
import {
  merge
} from "./chunk-WZNZC5VP.js";
import {
  Observable,
  concatMap,
  delay,
  distinct,
  distinctUntilChanged,
  from,
  map,
  of,
  scan,
  skipWhile,
  switchMap,
  timer,
  withLatestFrom
} from "./chunk-23I5VS4R.js";
import "./chunk-5K356HEJ.js";

// node_modules/rxfire/database/index.esm.js
var _a;
var ListenEvent;
(function(ListenEvent2) {
  ListenEvent2["added"] = "child_added";
  ListenEvent2["removed"] = "child_removed";
  ListenEvent2["changed"] = "child_changed";
  ListenEvent2["moved"] = "child_moved";
  ListenEvent2["value"] = "value";
})(ListenEvent || (ListenEvent = {}));
var ListenerMethods = Object.freeze((_a = {}, _a[ListenEvent.added] = onChildAdded, _a[ListenEvent.removed] = onChildRemoved, _a[ListenEvent.changed] = onChildChanged, _a[ListenEvent.moved] = onChildMoved, _a[ListenEvent.value] = onValue, _a));
function fromRef(ref3, event) {
  return new Observable(function(subscriber) {
    var fn = ListenerMethods[event](ref3, function(snapshot, prevKey) {
      subscriber.next({ snapshot, prevKey, event });
    }, subscriber.error.bind(subscriber));
    return {
      unsubscribe: function() {
        off(ref3, event, fn);
      }
    };
  }).pipe(
    // Ensures subscribe on observable is async. This handles
    // a quirk in the SDK where on/once callbacks can happen
    // synchronously.
    delay(0)
  );
}
var __assign = function() {
  __assign = Object.assign || function __assign2(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
function __spreadArray(to, from2, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from2.length, ar; i < l; i++) {
    if (ar || !(i in from2)) {
      if (!ar) ar = Array.prototype.slice.call(from2, 0, i);
      ar[i] = from2[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from2));
}
function validateEventsArray(events) {
  if (events == null || events.length === 0) {
    events = [
      ListenEvent.added,
      ListenEvent.removed,
      ListenEvent.changed,
      ListenEvent.moved
    ];
  }
  return events;
}
function object(query3) {
  return fromRef(query3, ListenEvent.value);
}
function objectVal(query3, options) {
  if (options === void 0) {
    options = {};
  }
  return fromRef(query3, ListenEvent.value).pipe(map(function(change) {
    return changeToData(change, options);
  }));
}
function changeToData(change, options) {
  var _a2;
  if (options === void 0) {
    options = {};
  }
  var val = change.snapshot.val();
  if (!change.snapshot.exists()) {
    return val;
  }
  if (typeof val !== "object") {
    return val;
  }
  return __assign(__assign({}, val), options.keyField ? (_a2 = {}, _a2[options.keyField] = change.snapshot.key, _a2) : null);
}
function stateChanges(query3, options) {
  if (options === void 0) {
    options = {};
  }
  var events = validateEventsArray(options.events);
  var childEvent$ = events.map(function(event) {
    return fromRef(query3, event);
  });
  return merge.apply(void 0, childEvent$);
}
function get2(query3) {
  return from(get(query3)).pipe(map(function(snapshot) {
    var event = ListenEvent.value;
    return { snapshot, prevKey: null, event };
  }));
}
function list(query3, options) {
  if (options === void 0) {
    options = {};
  }
  var events = validateEventsArray(options.events);
  return get2(query3).pipe(switchMap(function(change) {
    var childEvent$ = [of(change)];
    events.forEach(function(event) {
      childEvent$.push(fromRef(query3, event));
    });
    return merge.apply(void 0, childEvent$).pipe(scan(buildView, []));
  }), distinctUntilChanged());
}
function listVal(query3, options) {
  if (options === void 0) {
    options = {};
  }
  return list(query3).pipe(map(function(arr) {
    return arr.map(function(change) {
      return changeToData(change, options);
    });
  }));
}
function positionFor(changes, key) {
  var len = changes.length;
  for (var i = 0; i < len; i++) {
    if (changes[i].snapshot.key === key) {
      return i;
    }
  }
  return -1;
}
function positionAfter(changes, prevKey) {
  if (prevKey == null) {
    return 0;
  } else {
    var i = positionFor(changes, prevKey);
    if (i === -1) {
      return changes.length;
    } else {
      return i + 1;
    }
  }
}
function buildView(current, change) {
  var snapshot = change.snapshot, prevKey = change.prevKey, event = change.event;
  var key = snapshot.key;
  var currentKeyPosition = positionFor(current, key);
  var afterPreviousKeyPosition = positionAfter(current, prevKey || void 0);
  switch (event) {
    case ListenEvent.value:
      if (change.snapshot && change.snapshot.exists()) {
        var prevKey_1 = null;
        change.snapshot.forEach(function(snapshot2) {
          var action = {
            snapshot: snapshot2,
            event: ListenEvent.value,
            prevKey: prevKey_1
          };
          prevKey_1 = snapshot2.key;
          current = __spreadArray(__spreadArray([], current, true), [action], false);
          return false;
        });
      }
      return current;
    case ListenEvent.added:
      if (currentKeyPosition > -1) {
        var previous = current[currentKeyPosition - 1];
        if ((previous && previous.snapshot.key || null) !== prevKey) {
          current = current.filter(function(x) {
            return x.snapshot.key !== snapshot.key;
          });
          current.splice(afterPreviousKeyPosition, 0, change);
        }
      } else if (prevKey == null) {
        return __spreadArray([change], current, true);
      } else {
        current = current.slice();
        current.splice(afterPreviousKeyPosition, 0, change);
      }
      return current;
    case ListenEvent.removed:
      return current.filter(function(x) {
        return x.snapshot.key !== snapshot.key;
      });
    case ListenEvent.changed:
      return current.map(function(x) {
        return x.snapshot.key === key ? change : x;
      });
    case ListenEvent.moved:
      if (currentKeyPosition > -1) {
        var data = current.splice(currentKeyPosition, 1)[0];
        current = current.slice();
        current.splice(afterPreviousKeyPosition, 0, data);
        return current;
      }
      return current;
    // default will also remove null results
    default:
      return current;
  }
}
function auditTrail(query3, options) {
  if (options === void 0) {
    options = {};
  }
  var auditTrail$ = stateChanges(query3, options).pipe(scan(function(current, changes) {
    return __spreadArray(__spreadArray([], current, true), [changes], false);
  }, []));
  return waitForLoaded(query3, auditTrail$);
}
function loadedData(query3) {
  return fromRef(query3, ListenEvent.value).pipe(map(function(data) {
    var lastKeyToLoad;
    data.snapshot.forEach(function(child3) {
      lastKeyToLoad = child3.key;
      return false;
    });
    return { data, lastKeyToLoad };
  }));
}
function waitForLoaded(query3, snap$) {
  var loaded$ = loadedData(query3);
  return loaded$.pipe(
    withLatestFrom(snap$),
    // Get the latest values from the "loaded" and "child" datasets
    // We can use both datasets to form an array of the latest values.
    map(function(_a2) {
      var loaded = _a2[0], changes = _a2[1];
      var lastKeyToLoad = loaded.lastKeyToLoad;
      var loadedKeys = changes.map(function(change) {
        return change.snapshot.key;
      });
      return { changes, lastKeyToLoad, loadedKeys };
    }),
    // This is the magical part, only emit when the last load key
    // in the dataset has been loaded by a child event. At this point
    // we can assume the dataset is "whole".
    skipWhile(function(meta) {
      return meta.loadedKeys.indexOf(meta.lastKeyToLoad) === -1;
    }),
    // Pluck off the meta data because the user only cares
    // to iterate through the snapshots
    map(function(meta) {
      return meta.changes;
    })
  );
}

// node_modules/@angular/fire/fesm2022/angular-fire-database.mjs
var Database = class {
  constructor(database) {
    return database;
  }
};
var DATABASE_PROVIDER_NAME = "database";
var DatabaseInstances = class {
  constructor() {
    return ɵgetAllInstancesOf(DATABASE_PROVIDER_NAME);
  }
};
var databaseInstance$ = timer(0, 300).pipe(concatMap(() => from(ɵgetAllInstancesOf(DATABASE_PROVIDER_NAME))), distinct());
var PROVIDED_DATABASE_INSTANCES = new InjectionToken("angularfire2.database-instances");
function defaultDatabaseInstanceFactory(provided, defaultApp) {
  const defaultDatabase = ɵgetDefaultInstanceOf(DATABASE_PROVIDER_NAME, provided, defaultApp);
  return defaultDatabase && new Database(defaultDatabase);
}
function databaseInstanceFactory(fn) {
  return (zone, injector) => {
    const database = zone.runOutsideAngular(() => fn(injector));
    return new Database(database);
  };
}
var DATABASE_INSTANCES_PROVIDER = {
  provide: DatabaseInstances,
  deps: [[new Optional(), PROVIDED_DATABASE_INSTANCES]]
};
var DEFAULT_DATABASE_INSTANCE_PROVIDER = {
  provide: Database,
  useFactory: defaultDatabaseInstanceFactory,
  deps: [[new Optional(), PROVIDED_DATABASE_INSTANCES], FirebaseApp]
};
var DatabaseModule = class _DatabaseModule {
  constructor() {
    registerVersion("angularfire", VERSION.full, "rtdb");
  }
  static ɵfac = function DatabaseModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _DatabaseModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _DatabaseModule
  });
  static ɵinj = ɵɵdefineInjector({
    providers: [DEFAULT_DATABASE_INSTANCE_PROVIDER, DATABASE_INSTANCES_PROVIDER]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(DatabaseModule, [{
    type: NgModule,
    args: [{
      providers: [DEFAULT_DATABASE_INSTANCE_PROVIDER, DATABASE_INSTANCES_PROVIDER]
    }]
  }], () => [], null);
})();
function provideDatabase(fn, ...deps) {
  registerVersion("angularfire", VERSION.full, "rtdb");
  return makeEnvironmentProviders([DEFAULT_DATABASE_INSTANCE_PROVIDER, DATABASE_INSTANCES_PROVIDER, {
    provide: PROVIDED_DATABASE_INSTANCES,
    useFactory: databaseInstanceFactory(fn),
    multi: true,
    deps: [
      NgZone,
      Injector,
      ɵAngularFireSchedulers,
      FirebaseApps,
      // Database+Auth work better if Auth is loaded first
      [new Optional(), AuthInstances],
      [new Optional(), AppCheckInstances],
      ...deps
    ]
  }]);
}
var auditTrail2 = ɵzoneWrap(auditTrail, true);
var changeToData2 = ɵzoneWrap(changeToData, true);
var fromRef2 = ɵzoneWrap(fromRef, true);
var list2 = ɵzoneWrap(list, true);
var listVal2 = ɵzoneWrap(listVal, true);
var object2 = ɵzoneWrap(object, true);
var objectVal2 = ɵzoneWrap(objectVal, true);
var stateChanges2 = ɵzoneWrap(stateChanges, true);
var child2 = ɵzoneWrap(child, true, 2);
var connectDatabaseEmulator2 = ɵzoneWrap(connectDatabaseEmulator, true);
var enableLogging2 = ɵzoneWrap(enableLogging, true);
var endAt2 = ɵzoneWrap(endAt, true, 2);
var endBefore2 = ɵzoneWrap(endBefore, true, 2);
var equalTo2 = ɵzoneWrap(equalTo, true, 2);
var forceLongPolling2 = ɵzoneWrap(forceLongPolling, true);
var forceWebSockets2 = ɵzoneWrap(forceWebSockets, true);
var get3 = ɵzoneWrap(get, true);
var getDatabase2 = ɵzoneWrap(getDatabase, true);
var goOffline2 = ɵzoneWrap(goOffline, true);
var goOnline2 = ɵzoneWrap(goOnline, true);
var increment2 = ɵzoneWrap(increment, true, 2);
var limitToFirst2 = ɵzoneWrap(limitToFirst, true, 2);
var limitToLast2 = ɵzoneWrap(limitToLast, true, 2);
var off2 = ɵzoneWrap(off, true);
var onChildAdded2 = ɵzoneWrap(onChildAdded, true);
var onChildChanged2 = ɵzoneWrap(onChildChanged, true);
var onChildMoved2 = ɵzoneWrap(onChildMoved, true);
var onChildRemoved2 = ɵzoneWrap(onChildRemoved, true);
var onDisconnect2 = ɵzoneWrap(onDisconnect, true);
var onValue2 = ɵzoneWrap(onValue, true);
var orderByChild2 = ɵzoneWrap(orderByChild, true, 2);
var orderByKey2 = ɵzoneWrap(orderByKey, true, 2);
var orderByPriority2 = ɵzoneWrap(orderByPriority, true, 2);
var orderByValue2 = ɵzoneWrap(orderByValue, true, 2);
var push2 = ɵzoneWrap(push, true, 2);
var query2 = ɵzoneWrap(query, true, 2);
var ref2 = ɵzoneWrap(ref, true, 2);
var refFromURL2 = ɵzoneWrap(refFromURL, true, 2);
var remove2 = ɵzoneWrap(remove, true, 2);
var runTransaction2 = ɵzoneWrap(runTransaction, true);
var set2 = ɵzoneWrap(set, true, 2);
var setPriority2 = ɵzoneWrap(setPriority, true, 2);
var setWithPriority2 = ɵzoneWrap(setWithPriority, true, 2);
var startAfter2 = ɵzoneWrap(startAfter, true, 2);
var startAt2 = ɵzoneWrap(startAt, true, 2);
var update2 = ɵzoneWrap(update, true, 2);
export {
  DataSnapshot,
  Database,
  DatabaseInstances,
  DatabaseModule,
  ListenEvent,
  ListenerMethods,
  OnDisconnect,
  QueryConstraint,
  TransactionResult,
  QueryImpl as _QueryImpl,
  QueryParams as _QueryParams,
  ReferenceImpl as _ReferenceImpl,
  forceRestClient as _TEST_ACCESS_forceRestClient,
  hijackHash as _TEST_ACCESS_hijackHash,
  _initStandalone,
  repoManagerDatabaseFromApp as _repoManagerDatabaseFromApp,
  setSDKVersion as _setSDKVersion,
  validatePathString as _validatePathString,
  validateWritablePath as _validateWritablePath,
  auditTrail2 as auditTrail,
  changeToData2 as changeToData,
  child2 as child,
  connectDatabaseEmulator2 as connectDatabaseEmulator,
  databaseInstance$,
  enableLogging2 as enableLogging,
  endAt2 as endAt,
  endBefore2 as endBefore,
  equalTo2 as equalTo,
  forceLongPolling2 as forceLongPolling,
  forceWebSockets2 as forceWebSockets,
  fromRef2 as fromRef,
  get3 as get,
  getDatabase2 as getDatabase,
  goOffline2 as goOffline,
  goOnline2 as goOnline,
  increment2 as increment,
  limitToFirst2 as limitToFirst,
  limitToLast2 as limitToLast,
  list2 as list,
  listVal2 as listVal,
  object2 as object,
  objectVal2 as objectVal,
  off2 as off,
  onChildAdded2 as onChildAdded,
  onChildChanged2 as onChildChanged,
  onChildMoved2 as onChildMoved,
  onChildRemoved2 as onChildRemoved,
  onDisconnect2 as onDisconnect,
  onValue2 as onValue,
  orderByChild2 as orderByChild,
  orderByKey2 as orderByKey,
  orderByPriority2 as orderByPriority,
  orderByValue2 as orderByValue,
  provideDatabase,
  push2 as push,
  query2 as query,
  ref2 as ref,
  refFromURL2 as refFromURL,
  remove2 as remove,
  runTransaction2 as runTransaction,
  serverTimestamp,
  set2 as set,
  setPriority2 as setPriority,
  setWithPriority2 as setWithPriority,
  startAfter2 as startAfter,
  startAt2 as startAt,
  stateChanges2 as stateChanges,
  update2 as update
};
/*! Bundled license information:

rxfire/database/index.esm.js:
rxfire/database/index.esm.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
*/
//# sourceMappingURL=@angular_fire_database.js.map
