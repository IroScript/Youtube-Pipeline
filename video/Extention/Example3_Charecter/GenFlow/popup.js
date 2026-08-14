// Guard against React + page-translation crashes. Translator extensions (Google Translate,
// Immersive Translate, etc.) mutate/replace text nodes, desyncing them from React's virtual DOM;
// React then throws "Failed to execute 'removeChild'/'insertBefore' … not a child" and the whole
// popup goes blank. Make these two DOM ops no-throw when the node has moved out from under React.
(function () {
  try {
    if (typeof Node === "function" && Node.prototype) {
      var _rc = Node.prototype.removeChild;
      Node.prototype.removeChild = function (child) {
        if (child && child.parentNode !== this) return child;
        return _rc.apply(this, arguments);
      };
      var _ib = Node.prototype.insertBefore;
      Node.prototype.insertBefore = function (newNode, referenceNode) {
        if (referenceNode && referenceNode.parentNode !== this) return newNode;
        return _ib.apply(this, arguments);
      };
    }
  } catch (e) {}
})();
var Fd = Object.defineProperty;
var $d = (e, t, n) =>
  t in e
    ? Fd(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
    : (e[t] = n);
var Mi = (e, t, n) => $d(e, typeof t != "symbol" ? t + "" : t, n);
(function () {
  const t = document.createElement("link").relList;
  if (t && t.supports && t.supports("modulepreload")) return;
  for (const l of document.querySelectorAll('link[rel="modulepreload"]')) r(l);
  new MutationObserver((l) => {
    for (const s of l)
      if (s.type === "childList")
        for (const i of s.addedNodes)
          i.tagName === "LINK" && i.rel === "modulepreload" && r(i);
  }).observe(document, { childList: !0, subtree: !0 });
  function n(l) {
    const s = {};
    return (
      l.integrity && (s.integrity = l.integrity),
      l.referrerPolicy && (s.referrerPolicy = l.referrerPolicy),
      l.crossOrigin === "use-credentials"
        ? (s.credentials = "include")
        : l.crossOrigin === "anonymous"
          ? (s.credentials = "omit")
          : (s.credentials = "same-origin"),
      s
    );
  }
  function r(l) {
    if (l.ep) return;
    l.ep = !0;
    const s = n(l);
    fetch(l.href, s);
  }
})();
function nu(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default")
    ? e.default
    : e;
}
var ru = { exports: {} },
  Fl = {},
  lu = { exports: {} },
  H = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var Tr = Symbol.for("react.element"),
  Vd = Symbol.for("react.portal"),
  Wd = Symbol.for("react.fragment"),
  Bd = Symbol.for("react.strict_mode"),
  Hd = Symbol.for("react.profiler"),
  Gd = Symbol.for("react.provider"),
  Qd = Symbol.for("react.context"),
  Kd = Symbol.for("react.forward_ref"),
  Yd = Symbol.for("react.suspense"),
  Xd = Symbol.for("react.memo"),
  qd = Symbol.for("react.lazy"),
  zi = Symbol.iterator;
function Zd(e) {
  return e === null || typeof e != "object"
    ? null
    : ((e = (zi && e[zi]) || e["@@iterator"]),
      typeof e == "function" ? e : null);
}
var su = {
    isMounted: function () {
      return !1;
    },
    enqueueForceUpdate: function () {},
    enqueueReplaceState: function () {},
    enqueueSetState: function () {},
  },
  ou = Object.assign,
  iu = {};
function An(e, t, n) {
  ((this.props = e),
    (this.context = t),
    (this.refs = iu),
    (this.updater = n || su));
}
An.prototype.isReactComponent = {};
An.prototype.setState = function (e, t) {
  if (typeof e != "object" && typeof e != "function" && e != null)
    throw Error(
      "setState(...): takes an object of state variables to update or a function which returns an object of state variables.",
    );
  this.updater.enqueueSetState(this, e, t, "setState");
};
An.prototype.forceUpdate = function (e) {
  this.updater.enqueueForceUpdate(this, e, "forceUpdate");
};
function au() {}
au.prototype = An.prototype;
function Uo(e, t, n) {
  ((this.props = e),
    (this.context = t),
    (this.refs = iu),
    (this.updater = n || su));
}
var Oo = (Uo.prototype = new au());
Oo.constructor = Uo;
ou(Oo, An.prototype);
Oo.isPureReactComponent = !0;
var Ui = Array.isArray,
  uu = Object.prototype.hasOwnProperty,
  Ao = { current: null },
  cu = { key: !0, ref: !0, __self: !0, __source: !0 };
function du(e, t, n) {
  var r,
    l = {},
    s = null,
    i = null;
  if (t != null)
    for (r in (t.ref !== void 0 && (i = t.ref),
    t.key !== void 0 && (s = "" + t.key),
    t))
      uu.call(t, r) && !cu.hasOwnProperty(r) && (l[r] = t[r]);
  var a = arguments.length - 2;
  if (a === 1) l.children = n;
  else if (1 < a) {
    for (var u = Array(a), c = 0; c < a; c++) u[c] = arguments[c + 2];
    l.children = u;
  }
  if (e && e.defaultProps)
    for (r in ((a = e.defaultProps), a)) l[r] === void 0 && (l[r] = a[r]);
  return {
    $$typeof: Tr,
    type: e,
    key: s,
    ref: i,
    props: l,
    _owner: Ao.current,
  };
}
function Jd(e, t) {
  return {
    $$typeof: Tr,
    type: e.type,
    key: t,
    ref: e.ref,
    props: e.props,
    _owner: e._owner,
  };
}
function Do(e) {
  return typeof e == "object" && e !== null && e.$$typeof === Tr;
}
function ef(e) {
  var t = { "=": "=0", ":": "=2" };
  return (
    "$" +
    e.replace(/[=:]/g, function (n) {
      return t[n];
    })
  );
}
var Oi = /\/+/g;
function ss(e, t) {
  return typeof e == "object" && e !== null && e.key != null
    ? ef("" + e.key)
    : t.toString(36);
}
function tl(e, t, n, r, l) {
  var s = typeof e;
  (s === "undefined" || s === "boolean") && (e = null);
  var i = !1;
  if (e === null) i = !0;
  else
    switch (s) {
      case "string":
      case "number":
        i = !0;
        break;
      case "object":
        switch (e.$$typeof) {
          case Tr:
          case Vd:
            i = !0;
        }
    }
  if (i)
    return (
      (i = e),
      (l = l(i)),
      (e = r === "" ? "." + ss(i, 0) : r),
      Ui(l)
        ? ((n = ""),
          e != null && (n = e.replace(Oi, "$&/") + "/"),
          tl(l, t, n, "", function (c) {
            return c;
          }))
        : l != null &&
          (Do(l) &&
            (l = Jd(
              l,
              n +
                (!l.key || (i && i.key === l.key)
                  ? ""
                  : ("" + l.key).replace(Oi, "$&/") + "/") +
                e,
            )),
          t.push(l)),
      1
    );
  if (((i = 0), (r = r === "" ? "." : r + ":"), Ui(e)))
    for (var a = 0; a < e.length; a++) {
      s = e[a];
      var u = r + ss(s, a);
      i += tl(s, t, n, u, l);
    }
  else if (((u = Zd(e)), typeof u == "function"))
    for (e = u.call(e), a = 0; !(s = e.next()).done; )
      ((s = s.value), (u = r + ss(s, a++)), (i += tl(s, t, n, u, l)));
  else if (s === "object")
    throw (
      (t = String(e)),
      Error(
        "Objects are not valid as a React child (found: " +
          (t === "[object Object]"
            ? "object with keys {" + Object.keys(e).join(", ") + "}"
            : t) +
          "). If you meant to render a collection of children, use an array instead.",
      )
    );
  return i;
}
function Ar(e, t, n) {
  if (e == null) return e;
  var r = [],
    l = 0;
  return (
    tl(e, r, "", "", function (s) {
      return t.call(n, s, l++);
    }),
    r
  );
}
function tf(e) {
  if (e._status === -1) {
    var t = e._result;
    ((t = t()),
      t.then(
        function (n) {
          (e._status === 0 || e._status === -1) &&
            ((e._status = 1), (e._result = n));
        },
        function (n) {
          (e._status === 0 || e._status === -1) &&
            ((e._status = 2), (e._result = n));
        },
      ),
      e._status === -1 && ((e._status = 0), (e._result = t)));
  }
  if (e._status === 1) return e._result.default;
  throw e._result;
}
var Ee = { current: null },
  nl = { transition: null },
  nf = {
    ReactCurrentDispatcher: Ee,
    ReactCurrentBatchConfig: nl,
    ReactCurrentOwner: Ao,
  };
function fu() {
  throw Error("act(...) is not supported in production builds of React.");
}
H.Children = {
  map: Ar,
  forEach: function (e, t, n) {
    Ar(
      e,
      function () {
        t.apply(this, arguments);
      },
      n,
    );
  },
  count: function (e) {
    var t = 0;
    return (
      Ar(e, function () {
        t++;
      }),
      t
    );
  },
  toArray: function (e) {
    return (
      Ar(e, function (t) {
        return t;
      }) || []
    );
  },
  only: function (e) {
    if (!Do(e))
      throw Error(
        "React.Children.only expected to receive a single React element child.",
      );
    return e;
  },
};
H.Component = An;
H.Fragment = Wd;
H.Profiler = Hd;
H.PureComponent = Uo;
H.StrictMode = Bd;
H.Suspense = Yd;
H.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = nf;
H.act = fu;
H.cloneElement = function (e, t, n) {
  if (e == null)
    throw Error(
      "React.cloneElement(...): The argument must be a React element, but you passed " +
        e +
        ".",
    );
  var r = ou({}, e.props),
    l = e.key,
    s = e.ref,
    i = e._owner;
  if (t != null) {
    if (
      (t.ref !== void 0 && ((s = t.ref), (i = Ao.current)),
      t.key !== void 0 && (l = "" + t.key),
      e.type && e.type.defaultProps)
    )
      var a = e.type.defaultProps;
    for (u in t)
      uu.call(t, u) &&
        !cu.hasOwnProperty(u) &&
        (r[u] = t[u] === void 0 && a !== void 0 ? a[u] : t[u]);
  }
  var u = arguments.length - 2;
  if (u === 1) r.children = n;
  else if (1 < u) {
    a = Array(u);
    for (var c = 0; c < u; c++) a[c] = arguments[c + 2];
    r.children = a;
  }
  return { $$typeof: Tr, type: e.type, key: l, ref: s, props: r, _owner: i };
};
H.createContext = function (e) {
  return (
    (e = {
      $$typeof: Qd,
      _currentValue: e,
      _currentValue2: e,
      _threadCount: 0,
      Provider: null,
      Consumer: null,
      _defaultValue: null,
      _globalName: null,
    }),
    (e.Provider = { $$typeof: Gd, _context: e }),
    (e.Consumer = e)
  );
};
H.createElement = du;
H.createFactory = function (e) {
  var t = du.bind(null, e);
  return ((t.type = e), t);
};
H.createRef = function () {
  return { current: null };
};
H.forwardRef = function (e) {
  return { $$typeof: Kd, render: e };
};
H.isValidElement = Do;
H.lazy = function (e) {
  return { $$typeof: qd, _payload: { _status: -1, _result: e }, _init: tf };
};
H.memo = function (e, t) {
  return { $$typeof: Xd, type: e, compare: t === void 0 ? null : t };
};
H.startTransition = function (e) {
  var t = nl.transition;
  nl.transition = {};
  try {
    e();
  } finally {
    nl.transition = t;
  }
};
H.unstable_act = fu;
H.useCallback = function (e, t) {
  return Ee.current.useCallback(e, t);
};
H.useContext = function (e) {
  return Ee.current.useContext(e);
};
H.useDebugValue = function () {};
H.useDeferredValue = function (e) {
  return Ee.current.useDeferredValue(e);
};
H.useEffect = function (e, t) {
  return Ee.current.useEffect(e, t);
};
H.useId = function () {
  return Ee.current.useId();
};
H.useImperativeHandle = function (e, t, n) {
  return Ee.current.useImperativeHandle(e, t, n);
};
H.useInsertionEffect = function (e, t) {
  return Ee.current.useInsertionEffect(e, t);
};
H.useLayoutEffect = function (e, t) {
  return Ee.current.useLayoutEffect(e, t);
};
H.useMemo = function (e, t) {
  return Ee.current.useMemo(e, t);
};
H.useReducer = function (e, t, n) {
  return Ee.current.useReducer(e, t, n);
};
H.useRef = function (e) {
  return Ee.current.useRef(e);
};
H.useState = function (e) {
  return Ee.current.useState(e);
};
H.useSyncExternalStore = function (e, t, n) {
  return Ee.current.useSyncExternalStore(e, t, n);
};
H.useTransition = function () {
  return Ee.current.useTransition();
};
H.version = "18.3.1";
lu.exports = H;
var z = lu.exports;
const pu = nu(z);
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var rf = z,
  lf = Symbol.for("react.element"),
  sf = Symbol.for("react.fragment"),
  of = Object.prototype.hasOwnProperty,
  af = rf.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,
  uf = { key: !0, ref: !0, __self: !0, __source: !0 };
function mu(e, t, n) {
  var r,
    l = {},
    s = null,
    i = null;
  (n !== void 0 && (s = "" + n),
    t.key !== void 0 && (s = "" + t.key),
    t.ref !== void 0 && (i = t.ref));
  for (r in t) of.call(t, r) && !uf.hasOwnProperty(r) && (l[r] = t[r]);
  if (e && e.defaultProps)
    for (r in ((t = e.defaultProps), t)) l[r] === void 0 && (l[r] = t[r]);
  return {
    $$typeof: lf,
    type: e,
    key: s,
    ref: i,
    props: l,
    _owner: af.current,
  };
}
Fl.Fragment = sf;
Fl.jsx = mu;
Fl.jsxs = mu;
ru.exports = Fl;
var o = ru.exports,
  As = {},
  hu = { exports: {} },
  Ae = {},
  gu = { exports: {} },
  xu = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ (function (e) {
  function t(I, O) {
    var $ = I.length;
    I.push(O);
    e: for (; 0 < $; ) {
      var G = ($ - 1) >>> 1,
        B = I[G];
      if (0 < l(B, O)) ((I[G] = O), (I[$] = B), ($ = G));
      else break e;
    }
  }
  function n(I) {
    return I.length === 0 ? null : I[0];
  }
  function r(I) {
    if (I.length === 0) return null;
    var O = I[0],
      $ = I.pop();
    if ($ !== O) {
      I[0] = $;
      e: for (var G = 0, B = I.length, ie = B >>> 1; G < ie; ) {
        var ye = 2 * (G + 1) - 1,
          Fe = I[ye],
          rt = ye + 1,
          un = I[rt];
        if (0 > l(Fe, $))
          rt < B && 0 > l(un, Fe)
            ? ((I[G] = un), (I[rt] = $), (G = rt))
            : ((I[G] = Fe), (I[ye] = $), (G = ye));
        else if (rt < B && 0 > l(un, $)) ((I[G] = un), (I[rt] = $), (G = rt));
        else break e;
      }
    }
    return O;
  }
  function l(I, O) {
    var $ = I.sortIndex - O.sortIndex;
    return $ !== 0 ? $ : I.id - O.id;
  }
  if (typeof performance == "object" && typeof performance.now == "function") {
    var s = performance;
    e.unstable_now = function () {
      return s.now();
    };
  } else {
    var i = Date,
      a = i.now();
    e.unstable_now = function () {
      return i.now() - a;
    };
  }
  var u = [],
    c = [],
    h = 1,
    x = null,
    m = 3,
    v = !1,
    w = !1,
    y = !1,
    j = typeof setTimeout == "function" ? setTimeout : null,
    f = typeof clearTimeout == "function" ? clearTimeout : null,
    d = typeof setImmediate < "u" ? setImmediate : null;
  typeof navigator < "u" &&
    navigator.scheduling !== void 0 &&
    navigator.scheduling.isInputPending !== void 0 &&
    navigator.scheduling.isInputPending.bind(navigator.scheduling);
  function p(I) {
    for (var O = n(c); O !== null; ) {
      if (O.callback === null) r(c);
      else if (O.startTime <= I)
        (r(c), (O.sortIndex = O.expirationTime), t(u, O));
      else break;
      O = n(c);
    }
  }
  function g(I) {
    if (((y = !1), p(I), !w))
      if (n(u) !== null) ((w = !0), Te(N));
      else {
        var O = n(c);
        O !== null && Ke(g, O.startTime - I);
      }
  }
  function N(I, O) {
    ((w = !1), y && ((y = !1), f(S), (S = -1)), (v = !0));
    var $ = m;
    try {
      for (
        p(O), x = n(u);
        x !== null && (!(x.expirationTime > O) || (I && !T()));
      ) {
        var G = x.callback;
        if (typeof G == "function") {
          ((x.callback = null), (m = x.priorityLevel));
          var B = G(x.expirationTime <= O);
          ((O = e.unstable_now()),
            typeof B == "function" ? (x.callback = B) : x === n(u) && r(u),
            p(O));
        } else r(u);
        x = n(u);
      }
      if (x !== null) var ie = !0;
      else {
        var ye = n(c);
        (ye !== null && Ke(g, ye.startTime - O), (ie = !1));
      }
      return ie;
    } finally {
      ((x = null), (m = $), (v = !1));
    }
  }
  var R = !1,
    E = null,
    S = -1,
    b = 5,
    L = -1;
  function T() {
    return !(e.unstable_now() - L < b);
  }
  function D() {
    if (E !== null) {
      var I = e.unstable_now();
      L = I;
      var O = !0;
      try {
        O = E(!0, I);
      } finally {
        O ? oe() : ((R = !1), (E = null));
      }
    } else R = !1;
  }
  var oe;
  if (typeof d == "function")
    oe = function () {
      d(D);
    };
  else if (typeof MessageChannel < "u") {
    var fe = new MessageChannel(),
      ut = fe.port2;
    ((fe.port1.onmessage = D),
      (oe = function () {
        ut.postMessage(null);
      }));
  } else
    oe = function () {
      j(D, 0);
    };
  function Te(I) {
    ((E = I), R || ((R = !0), oe()));
  }
  function Ke(I, O) {
    S = j(function () {
      I(e.unstable_now());
    }, O);
  }
  ((e.unstable_IdlePriority = 5),
    (e.unstable_ImmediatePriority = 1),
    (e.unstable_LowPriority = 4),
    (e.unstable_NormalPriority = 3),
    (e.unstable_Profiling = null),
    (e.unstable_UserBlockingPriority = 2),
    (e.unstable_cancelCallback = function (I) {
      I.callback = null;
    }),
    (e.unstable_continueExecution = function () {
      w || v || ((w = !0), Te(N));
    }),
    (e.unstable_forceFrameRate = function (I) {
      0 > I || 125 < I
        ? console.error(
            "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported",
          )
        : (b = 0 < I ? Math.floor(1e3 / I) : 5);
    }),
    (e.unstable_getCurrentPriorityLevel = function () {
      return m;
    }),
    (e.unstable_getFirstCallbackNode = function () {
      return n(u);
    }),
    (e.unstable_next = function (I) {
      switch (m) {
        case 1:
        case 2:
        case 3:
          var O = 3;
          break;
        default:
          O = m;
      }
      var $ = m;
      m = O;
      try {
        return I();
      } finally {
        m = $;
      }
    }),
    (e.unstable_pauseExecution = function () {}),
    (e.unstable_requestPaint = function () {}),
    (e.unstable_runWithPriority = function (I, O) {
      switch (I) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          I = 3;
      }
      var $ = m;
      m = I;
      try {
        return O();
      } finally {
        m = $;
      }
    }),
    (e.unstable_scheduleCallback = function (I, O, $) {
      var G = e.unstable_now();
      switch (
        (typeof $ == "object" && $ !== null
          ? (($ = $.delay), ($ = typeof $ == "number" && 0 < $ ? G + $ : G))
          : ($ = G),
        I)
      ) {
        case 1:
          var B = -1;
          break;
        case 2:
          B = 250;
          break;
        case 5:
          B = 1073741823;
          break;
        case 4:
          B = 1e4;
          break;
        default:
          B = 5e3;
      }
      return (
        (B = $ + B),
        (I = {
          id: h++,
          callback: O,
          priorityLevel: I,
          startTime: $,
          expirationTime: B,
          sortIndex: -1,
        }),
        $ > G
          ? ((I.sortIndex = $),
            t(c, I),
            n(u) === null &&
              I === n(c) &&
              (y ? (f(S), (S = -1)) : (y = !0), Ke(g, $ - G)))
          : ((I.sortIndex = B), t(u, I), w || v || ((w = !0), Te(N))),
        I
      );
    }),
    (e.unstable_shouldYield = T),
    (e.unstable_wrapCallback = function (I) {
      var O = m;
      return function () {
        var $ = m;
        m = O;
        try {
          return I.apply(this, arguments);
        } finally {
          m = $;
        }
      };
    }));
})(xu);
gu.exports = xu;
var cf = gu.exports;
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var df = z,
  Oe = cf;
function P(e) {
  for (
    var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, n = 1;
    n < arguments.length;
    n++
  )
    t += "&args[]=" + encodeURIComponent(arguments[n]);
  return (
    "Minified React error #" +
    e +
    "; visit " +
    t +
    " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
  );
}
var yu = new Set(),
  mr = {};
function on(e, t) {
  (Rn(e, t), Rn(e + "Capture", t));
}
function Rn(e, t) {
  for (mr[e] = t, e = 0; e < t.length; e++) yu.add(t[e]);
}
var xt = !(
    typeof window > "u" ||
    typeof window.document > "u" ||
    typeof window.document.createElement > "u"
  ),
  Ds = Object.prototype.hasOwnProperty,
  ff =
    /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,
  Ai = {},
  Di = {};
function pf(e) {
  return Ds.call(Di, e)
    ? !0
    : Ds.call(Ai, e)
      ? !1
      : ff.test(e)
        ? (Di[e] = !0)
        : ((Ai[e] = !0), !1);
}
function mf(e, t, n, r) {
  if (n !== null && n.type === 0) return !1;
  switch (typeof t) {
    case "function":
    case "symbol":
      return !0;
    case "boolean":
      return r
        ? !1
        : n !== null
          ? !n.acceptsBooleans
          : ((e = e.toLowerCase().slice(0, 5)), e !== "data-" && e !== "aria-");
    default:
      return !1;
  }
}
function hf(e, t, n, r) {
  if (t === null || typeof t > "u" || mf(e, t, n, r)) return !0;
  if (r) return !1;
  if (n !== null)
    switch (n.type) {
      case 3:
        return !t;
      case 4:
        return t === !1;
      case 5:
        return isNaN(t);
      case 6:
        return isNaN(t) || 1 > t;
    }
  return !1;
}
function be(e, t, n, r, l, s, i) {
  ((this.acceptsBooleans = t === 2 || t === 3 || t === 4),
    (this.attributeName = r),
    (this.attributeNamespace = l),
    (this.mustUseProperty = n),
    (this.propertyName = e),
    (this.type = t),
    (this.sanitizeURL = s),
    (this.removeEmptyString = i));
}
var xe = {};
"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style"
  .split(" ")
  .forEach(function (e) {
    xe[e] = new be(e, 0, !1, e, null, !1, !1);
  });
[
  ["acceptCharset", "accept-charset"],
  ["className", "class"],
  ["htmlFor", "for"],
  ["httpEquiv", "http-equiv"],
].forEach(function (e) {
  var t = e[0];
  xe[t] = new be(t, 1, !1, e[1], null, !1, !1);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function (e) {
  xe[e] = new be(e, 2, !1, e.toLowerCase(), null, !1, !1);
});
[
  "autoReverse",
  "externalResourcesRequired",
  "focusable",
  "preserveAlpha",
].forEach(function (e) {
  xe[e] = new be(e, 2, !1, e, null, !1, !1);
});
"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope"
  .split(" ")
  .forEach(function (e) {
    xe[e] = new be(e, 3, !1, e.toLowerCase(), null, !1, !1);
  });
["checked", "multiple", "muted", "selected"].forEach(function (e) {
  xe[e] = new be(e, 3, !0, e, null, !1, !1);
});
["capture", "download"].forEach(function (e) {
  xe[e] = new be(e, 4, !1, e, null, !1, !1);
});
["cols", "rows", "size", "span"].forEach(function (e) {
  xe[e] = new be(e, 6, !1, e, null, !1, !1);
});
["rowSpan", "start"].forEach(function (e) {
  xe[e] = new be(e, 5, !1, e.toLowerCase(), null, !1, !1);
});
var Fo = /[\-:]([a-z])/g;
function $o(e) {
  return e[1].toUpperCase();
}
"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height"
  .split(" ")
  .forEach(function (e) {
    var t = e.replace(Fo, $o);
    xe[t] = new be(t, 1, !1, e, null, !1, !1);
  });
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type"
  .split(" ")
  .forEach(function (e) {
    var t = e.replace(Fo, $o);
    xe[t] = new be(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
  });
["xml:base", "xml:lang", "xml:space"].forEach(function (e) {
  var t = e.replace(Fo, $o);
  xe[t] = new be(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1);
});
["tabIndex", "crossOrigin"].forEach(function (e) {
  xe[e] = new be(e, 1, !1, e.toLowerCase(), null, !1, !1);
});
xe.xlinkHref = new be(
  "xlinkHref",
  1,
  !1,
  "xlink:href",
  "http://www.w3.org/1999/xlink",
  !0,
  !1,
);
["src", "href", "action", "formAction"].forEach(function (e) {
  xe[e] = new be(e, 1, !1, e.toLowerCase(), null, !0, !0);
});
function Vo(e, t, n, r) {
  var l = xe.hasOwnProperty(t) ? xe[t] : null;
  (l !== null
    ? l.type !== 0
    : r ||
      !(2 < t.length) ||
      (t[0] !== "o" && t[0] !== "O") ||
      (t[1] !== "n" && t[1] !== "N")) &&
    (hf(t, n, l, r) && (n = null),
    r || l === null
      ? pf(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n))
      : l.mustUseProperty
        ? (e[l.propertyName] = n === null ? (l.type === 3 ? !1 : "") : n)
        : ((t = l.attributeName),
          (r = l.attributeNamespace),
          n === null
            ? e.removeAttribute(t)
            : ((l = l.type),
              (n = l === 3 || (l === 4 && n === !0) ? "" : "" + n),
              r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
}
var kt = df.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
  Dr = Symbol.for("react.element"),
  dn = Symbol.for("react.portal"),
  fn = Symbol.for("react.fragment"),
  Wo = Symbol.for("react.strict_mode"),
  Fs = Symbol.for("react.profiler"),
  vu = Symbol.for("react.provider"),
  wu = Symbol.for("react.context"),
  Bo = Symbol.for("react.forward_ref"),
  $s = Symbol.for("react.suspense"),
  Vs = Symbol.for("react.suspense_list"),
  Ho = Symbol.for("react.memo"),
  bt = Symbol.for("react.lazy"),
  ku = Symbol.for("react.offscreen"),
  Fi = Symbol.iterator;
function Vn(e) {
  return e === null || typeof e != "object"
    ? null
    : ((e = (Fi && e[Fi]) || e["@@iterator"]),
      typeof e == "function" ? e : null);
}
var le = Object.assign,
  os;
function Jn(e) {
  if (os === void 0)
    try {
      throw Error();
    } catch (n) {
      var t = n.stack.trim().match(/\n( *(at )?)/);
      os = (t && t[1]) || "";
    }
  return (
    `
` +
    os +
    e
  );
}
var is = !1;
function as(e, t) {
  if (!e || is) return "";
  is = !0;
  var n = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    if (t)
      if (
        ((t = function () {
          throw Error();
        }),
        Object.defineProperty(t.prototype, "props", {
          set: function () {
            throw Error();
          },
        }),
        typeof Reflect == "object" && Reflect.construct)
      ) {
        try {
          Reflect.construct(t, []);
        } catch (c) {
          var r = c;
        }
        Reflect.construct(e, [], t);
      } else {
        try {
          t.call();
        } catch (c) {
          r = c;
        }
        e.call(t.prototype);
      }
    else {
      try {
        throw Error();
      } catch (c) {
        r = c;
      }
      e();
    }
  } catch (c) {
    if (c && r && typeof c.stack == "string") {
      for (
        var l = c.stack.split(`
`),
          s = r.stack.split(`
`),
          i = l.length - 1,
          a = s.length - 1;
        1 <= i && 0 <= a && l[i] !== s[a];
      )
        a--;
      for (; 1 <= i && 0 <= a; i--, a--)
        if (l[i] !== s[a]) {
          if (i !== 1 || a !== 1)
            do
              if ((i--, a--, 0 > a || l[i] !== s[a])) {
                var u =
                  `
` + l[i].replace(" at new ", " at ");
                return (
                  e.displayName &&
                    u.includes("<anonymous>") &&
                    (u = u.replace("<anonymous>", e.displayName)),
                  u
                );
              }
            while (1 <= i && 0 <= a);
          break;
        }
    }
  } finally {
    ((is = !1), (Error.prepareStackTrace = n));
  }
  return (e = e ? e.displayName || e.name : "") ? Jn(e) : "";
}
function gf(e) {
  switch (e.tag) {
    case 5:
      return Jn(e.type);
    case 16:
      return Jn("Lazy");
    case 13:
      return Jn("Suspense");
    case 19:
      return Jn("SuspenseList");
    case 0:
    case 2:
    case 15:
      return ((e = as(e.type, !1)), e);
    case 11:
      return ((e = as(e.type.render, !1)), e);
    case 1:
      return ((e = as(e.type, !0)), e);
    default:
      return "";
  }
}
function Ws(e) {
  if (e == null) return null;
  if (typeof e == "function") return e.displayName || e.name || null;
  if (typeof e == "string") return e;
  switch (e) {
    case fn:
      return "Fragment";
    case dn:
      return "Portal";
    case Fs:
      return "Profiler";
    case Wo:
      return "StrictMode";
    case $s:
      return "Suspense";
    case Vs:
      return "SuspenseList";
  }
  if (typeof e == "object")
    switch (e.$$typeof) {
      case wu:
        return (e.displayName || "Context") + ".Consumer";
      case vu:
        return (e._context.displayName || "Context") + ".Provider";
      case Bo:
        var t = e.render;
        return (
          (e = e.displayName),
          e ||
            ((e = t.displayName || t.name || ""),
            (e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef")),
          e
        );
      case Ho:
        return (
          (t = e.displayName || null),
          t !== null ? t : Ws(e.type) || "Memo"
        );
      case bt:
        ((t = e._payload), (e = e._init));
        try {
          return Ws(e(t));
        } catch {}
    }
  return null;
}
function xf(e) {
  var t = e.type;
  switch (e.tag) {
    case 24:
      return "Cache";
    case 9:
      return (t.displayName || "Context") + ".Consumer";
    case 10:
      return (t._context.displayName || "Context") + ".Provider";
    case 18:
      return "DehydratedFragment";
    case 11:
      return (
        (e = t.render),
        (e = e.displayName || e.name || ""),
        t.displayName || (e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef")
      );
    case 7:
      return "Fragment";
    case 5:
      return t;
    case 4:
      return "Portal";
    case 3:
      return "Root";
    case 6:
      return "Text";
    case 16:
      return Ws(t);
    case 8:
      return t === Wo ? "StrictMode" : "Mode";
    case 22:
      return "Offscreen";
    case 12:
      return "Profiler";
    case 21:
      return "Scope";
    case 13:
      return "Suspense";
    case 19:
      return "SuspenseList";
    case 25:
      return "TracingMarker";
    case 1:
    case 0:
    case 17:
    case 2:
    case 14:
    case 15:
      if (typeof t == "function") return t.displayName || t.name || null;
      if (typeof t == "string") return t;
  }
  return null;
}
function $t(e) {
  switch (typeof e) {
    case "boolean":
    case "number":
    case "string":
    case "undefined":
      return e;
    case "object":
      return e;
    default:
      return "";
  }
}
function ju(e) {
  var t = e.type;
  return (
    (e = e.nodeName) &&
    e.toLowerCase() === "input" &&
    (t === "checkbox" || t === "radio")
  );
}
function yf(e) {
  var t = ju(e) ? "checked" : "value",
    n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t),
    r = "" + e[t];
  if (
    !e.hasOwnProperty(t) &&
    typeof n < "u" &&
    typeof n.get == "function" &&
    typeof n.set == "function"
  ) {
    var l = n.get,
      s = n.set;
    return (
      Object.defineProperty(e, t, {
        configurable: !0,
        get: function () {
          return l.call(this);
        },
        set: function (i) {
          ((r = "" + i), s.call(this, i));
        },
      }),
      Object.defineProperty(e, t, { enumerable: n.enumerable }),
      {
        getValue: function () {
          return r;
        },
        setValue: function (i) {
          r = "" + i;
        },
        stopTracking: function () {
          ((e._valueTracker = null), delete e[t]);
        },
      }
    );
  }
}
function Fr(e) {
  e._valueTracker || (e._valueTracker = yf(e));
}
function Nu(e) {
  if (!e) return !1;
  var t = e._valueTracker;
  if (!t) return !0;
  var n = t.getValue(),
    r = "";
  return (
    e && (r = ju(e) ? (e.checked ? "true" : "false") : e.value),
    (e = r),
    e !== n ? (t.setValue(e), !0) : !1
  );
}
function ml(e) {
  if (((e = e || (typeof document < "u" ? document : void 0)), typeof e > "u"))
    return null;
  try {
    return e.activeElement || e.body;
  } catch {
    return e.body;
  }
}
function Bs(e, t) {
  var n = t.checked;
  return le({}, t, {
    defaultChecked: void 0,
    defaultValue: void 0,
    value: void 0,
    checked: n ?? e._wrapperState.initialChecked,
  });
}
function $i(e, t) {
  var n = t.defaultValue == null ? "" : t.defaultValue,
    r = t.checked != null ? t.checked : t.defaultChecked;
  ((n = $t(t.value != null ? t.value : n)),
    (e._wrapperState = {
      initialChecked: r,
      initialValue: n,
      controlled:
        t.type === "checkbox" || t.type === "radio"
          ? t.checked != null
          : t.value != null,
    }));
}
function Su(e, t) {
  ((t = t.checked), t != null && Vo(e, "checked", t, !1));
}
function Hs(e, t) {
  Su(e, t);
  var n = $t(t.value),
    r = t.type;
  if (n != null)
    r === "number"
      ? ((n === 0 && e.value === "") || e.value != n) && (e.value = "" + n)
      : e.value !== "" + n && (e.value = "" + n);
  else if (r === "submit" || r === "reset") {
    e.removeAttribute("value");
    return;
  }
  (t.hasOwnProperty("value")
    ? Gs(e, t.type, n)
    : t.hasOwnProperty("defaultValue") && Gs(e, t.type, $t(t.defaultValue)),
    t.checked == null &&
      t.defaultChecked != null &&
      (e.defaultChecked = !!t.defaultChecked));
}
function Vi(e, t, n) {
  if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
    var r = t.type;
    if (
      !(
        (r !== "submit" && r !== "reset") ||
        (t.value !== void 0 && t.value !== null)
      )
    )
      return;
    ((t = "" + e._wrapperState.initialValue),
      n || t === e.value || (e.value = t),
      (e.defaultValue = t));
  }
  ((n = e.name),
    n !== "" && (e.name = ""),
    (e.defaultChecked = !!e._wrapperState.initialChecked),
    n !== "" && (e.name = n));
}
function Gs(e, t, n) {
  (t !== "number" || ml(e.ownerDocument) !== e) &&
    (n == null
      ? (e.defaultValue = "" + e._wrapperState.initialValue)
      : e.defaultValue !== "" + n && (e.defaultValue = "" + n));
}
var er = Array.isArray;
function Nn(e, t, n, r) {
  if (((e = e.options), t)) {
    t = {};
    for (var l = 0; l < n.length; l++) t["$" + n[l]] = !0;
    for (n = 0; n < e.length; n++)
      ((l = t.hasOwnProperty("$" + e[n].value)),
        e[n].selected !== l && (e[n].selected = l),
        l && r && (e[n].defaultSelected = !0));
  } else {
    for (n = "" + $t(n), t = null, l = 0; l < e.length; l++) {
      if (e[l].value === n) {
        ((e[l].selected = !0), r && (e[l].defaultSelected = !0));
        return;
      }
      t !== null || e[l].disabled || (t = e[l]);
    }
    t !== null && (t.selected = !0);
  }
}
function Qs(e, t) {
  if (t.dangerouslySetInnerHTML != null) throw Error(P(91));
  return le({}, t, {
    value: void 0,
    defaultValue: void 0,
    children: "" + e._wrapperState.initialValue,
  });
}
function Wi(e, t) {
  var n = t.value;
  if (n == null) {
    if (((n = t.children), (t = t.defaultValue), n != null)) {
      if (t != null) throw Error(P(92));
      if (er(n)) {
        if (1 < n.length) throw Error(P(93));
        n = n[0];
      }
      t = n;
    }
    (t == null && (t = ""), (n = t));
  }
  e._wrapperState = { initialValue: $t(n) };
}
function Cu(e, t) {
  var n = $t(t.value),
    r = $t(t.defaultValue);
  (n != null &&
    ((n = "" + n),
    n !== e.value && (e.value = n),
    t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)),
    r != null && (e.defaultValue = "" + r));
}
function Bi(e) {
  var t = e.textContent;
  t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
}
function Eu(e) {
  switch (e) {
    case "svg":
      return "http://www.w3.org/2000/svg";
    case "math":
      return "http://www.w3.org/1998/Math/MathML";
    default:
      return "http://www.w3.org/1999/xhtml";
  }
}
function Ks(e, t) {
  return e == null || e === "http://www.w3.org/1999/xhtml"
    ? Eu(t)
    : e === "http://www.w3.org/2000/svg" && t === "foreignObject"
      ? "http://www.w3.org/1999/xhtml"
      : e;
}
var $r,
  bu = (function (e) {
    return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction
      ? function (t, n, r, l) {
          MSApp.execUnsafeLocalFunction(function () {
            return e(t, n, r, l);
          });
        }
      : e;
  })(function (e, t) {
    if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in e)
      e.innerHTML = t;
    else {
      for (
        $r = $r || document.createElement("div"),
          $r.innerHTML = "<svg>" + t.valueOf().toString() + "</svg>",
          t = $r.firstChild;
        e.firstChild;
      )
        e.removeChild(e.firstChild);
      for (; t.firstChild; ) e.appendChild(t.firstChild);
    }
  });
function hr(e, t) {
  if (t) {
    var n = e.firstChild;
    if (n && n === e.lastChild && n.nodeType === 3) {
      n.nodeValue = t;
      return;
    }
  }
  e.textContent = t;
}
var rr = {
    animationIterationCount: !0,
    aspectRatio: !0,
    borderImageOutset: !0,
    borderImageSlice: !0,
    borderImageWidth: !0,
    boxFlex: !0,
    boxFlexGroup: !0,
    boxOrdinalGroup: !0,
    columnCount: !0,
    columns: !0,
    flex: !0,
    flexGrow: !0,
    flexPositive: !0,
    flexShrink: !0,
    flexNegative: !0,
    flexOrder: !0,
    gridArea: !0,
    gridRow: !0,
    gridRowEnd: !0,
    gridRowSpan: !0,
    gridRowStart: !0,
    gridColumn: !0,
    gridColumnEnd: !0,
    gridColumnSpan: !0,
    gridColumnStart: !0,
    fontWeight: !0,
    lineClamp: !0,
    lineHeight: !0,
    opacity: !0,
    order: !0,
    orphans: !0,
    tabSize: !0,
    widows: !0,
    zIndex: !0,
    zoom: !0,
    fillOpacity: !0,
    floodOpacity: !0,
    stopOpacity: !0,
    strokeDasharray: !0,
    strokeDashoffset: !0,
    strokeMiterlimit: !0,
    strokeOpacity: !0,
    strokeWidth: !0,
  },
  vf = ["Webkit", "ms", "Moz", "O"];
Object.keys(rr).forEach(function (e) {
  vf.forEach(function (t) {
    ((t = t + e.charAt(0).toUpperCase() + e.substring(1)), (rr[t] = rr[e]));
  });
});
function Pu(e, t, n) {
  return t == null || typeof t == "boolean" || t === ""
    ? ""
    : n || typeof t != "number" || t === 0 || (rr.hasOwnProperty(e) && rr[e])
      ? ("" + t).trim()
      : t + "px";
}
function _u(e, t) {
  e = e.style;
  for (var n in t)
    if (t.hasOwnProperty(n)) {
      var r = n.indexOf("--") === 0,
        l = Pu(n, t[n], r);
      (n === "float" && (n = "cssFloat"), r ? e.setProperty(n, l) : (e[n] = l));
    }
}
var wf = le(
  { menuitem: !0 },
  {
    area: !0,
    base: !0,
    br: !0,
    col: !0,
    embed: !0,
    hr: !0,
    img: !0,
    input: !0,
    keygen: !0,
    link: !0,
    meta: !0,
    param: !0,
    source: !0,
    track: !0,
    wbr: !0,
  },
);
function Ys(e, t) {
  if (t) {
    if (wf[e] && (t.children != null || t.dangerouslySetInnerHTML != null))
      throw Error(P(137, e));
    if (t.dangerouslySetInnerHTML != null) {
      if (t.children != null) throw Error(P(60));
      if (
        typeof t.dangerouslySetInnerHTML != "object" ||
        !("__html" in t.dangerouslySetInnerHTML)
      )
        throw Error(P(61));
    }
    if (t.style != null && typeof t.style != "object") throw Error(P(62));
  }
}
function Xs(e, t) {
  if (e.indexOf("-") === -1) return typeof t.is == "string";
  switch (e) {
    case "annotation-xml":
    case "color-profile":
    case "font-face":
    case "font-face-src":
    case "font-face-uri":
    case "font-face-format":
    case "font-face-name":
    case "missing-glyph":
      return !1;
    default:
      return !0;
  }
}
var qs = null;
function Go(e) {
  return (
    (e = e.target || e.srcElement || window),
    e.correspondingUseElement && (e = e.correspondingUseElement),
    e.nodeType === 3 ? e.parentNode : e
  );
}
var Zs = null,
  Sn = null,
  Cn = null;
function Hi(e) {
  if ((e = Ur(e))) {
    if (typeof Zs != "function") throw Error(P(280));
    var t = e.stateNode;
    t && ((t = Hl(t)), Zs(e.stateNode, e.type, t));
  }
}
function Ru(e) {
  Sn ? (Cn ? Cn.push(e) : (Cn = [e])) : (Sn = e);
}
function Iu() {
  if (Sn) {
    var e = Sn,
      t = Cn;
    if (((Cn = Sn = null), Hi(e), t)) for (e = 0; e < t.length; e++) Hi(t[e]);
  }
}
function Lu(e, t) {
  return e(t);
}
function Tu() {}
var us = !1;
function Mu(e, t, n) {
  if (us) return e(t, n);
  us = !0;
  try {
    return Lu(e, t, n);
  } finally {
    ((us = !1), (Sn !== null || Cn !== null) && (Tu(), Iu()));
  }
}
function gr(e, t) {
  var n = e.stateNode;
  if (n === null) return null;
  var r = Hl(n);
  if (r === null) return null;
  n = r[t];
  e: switch (t) {
    case "onClick":
    case "onClickCapture":
    case "onDoubleClick":
    case "onDoubleClickCapture":
    case "onMouseDown":
    case "onMouseDownCapture":
    case "onMouseMove":
    case "onMouseMoveCapture":
    case "onMouseUp":
    case "onMouseUpCapture":
    case "onMouseEnter":
      ((r = !r.disabled) ||
        ((e = e.type),
        (r = !(
          e === "button" ||
          e === "input" ||
          e === "select" ||
          e === "textarea"
        ))),
        (e = !r));
      break e;
    default:
      e = !1;
  }
  if (e) return null;
  if (n && typeof n != "function") throw Error(P(231, t, typeof n));
  return n;
}
var Js = !1;
if (xt)
  try {
    var Wn = {};
    (Object.defineProperty(Wn, "passive", {
      get: function () {
        Js = !0;
      },
    }),
      window.addEventListener("test", Wn, Wn),
      window.removeEventListener("test", Wn, Wn));
  } catch {
    Js = !1;
  }
function kf(e, t, n, r, l, s, i, a, u) {
  var c = Array.prototype.slice.call(arguments, 3);
  try {
    t.apply(n, c);
  } catch (h) {
    this.onError(h);
  }
}
var lr = !1,
  hl = null,
  gl = !1,
  eo = null,
  jf = {
    onError: function (e) {
      ((lr = !0), (hl = e));
    },
  };
function Nf(e, t, n, r, l, s, i, a, u) {
  ((lr = !1), (hl = null), kf.apply(jf, arguments));
}
function Sf(e, t, n, r, l, s, i, a, u) {
  if ((Nf.apply(this, arguments), lr)) {
    if (lr) {
      var c = hl;
      ((lr = !1), (hl = null));
    } else throw Error(P(198));
    gl || ((gl = !0), (eo = c));
  }
}
function an(e) {
  var t = e,
    n = e;
  if (e.alternate) for (; t.return; ) t = t.return;
  else {
    e = t;
    do ((t = e), t.flags & 4098 && (n = t.return), (e = t.return));
    while (e);
  }
  return t.tag === 3 ? n : null;
}
function zu(e) {
  if (e.tag === 13) {
    var t = e.memoizedState;
    if (
      (t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)),
      t !== null)
    )
      return t.dehydrated;
  }
  return null;
}
function Gi(e) {
  if (an(e) !== e) throw Error(P(188));
}
function Cf(e) {
  var t = e.alternate;
  if (!t) {
    if (((t = an(e)), t === null)) throw Error(P(188));
    return t !== e ? null : e;
  }
  for (var n = e, r = t; ; ) {
    var l = n.return;
    if (l === null) break;
    var s = l.alternate;
    if (s === null) {
      if (((r = l.return), r !== null)) {
        n = r;
        continue;
      }
      break;
    }
    if (l.child === s.child) {
      for (s = l.child; s; ) {
        if (s === n) return (Gi(l), e);
        if (s === r) return (Gi(l), t);
        s = s.sibling;
      }
      throw Error(P(188));
    }
    if (n.return !== r.return) ((n = l), (r = s));
    else {
      for (var i = !1, a = l.child; a; ) {
        if (a === n) {
          ((i = !0), (n = l), (r = s));
          break;
        }
        if (a === r) {
          ((i = !0), (r = l), (n = s));
          break;
        }
        a = a.sibling;
      }
      if (!i) {
        for (a = s.child; a; ) {
          if (a === n) {
            ((i = !0), (n = s), (r = l));
            break;
          }
          if (a === r) {
            ((i = !0), (r = s), (n = l));
            break;
          }
          a = a.sibling;
        }
        if (!i) throw Error(P(189));
      }
    }
    if (n.alternate !== r) throw Error(P(190));
  }
  if (n.tag !== 3) throw Error(P(188));
  return n.stateNode.current === n ? e : t;
}
function Uu(e) {
  return ((e = Cf(e)), e !== null ? Ou(e) : null);
}
function Ou(e) {
  if (e.tag === 5 || e.tag === 6) return e;
  for (e = e.child; e !== null; ) {
    var t = Ou(e);
    if (t !== null) return t;
    e = e.sibling;
  }
  return null;
}
var Au = Oe.unstable_scheduleCallback,
  Qi = Oe.unstable_cancelCallback,
  Ef = Oe.unstable_shouldYield,
  bf = Oe.unstable_requestPaint,
  ae = Oe.unstable_now,
  Pf = Oe.unstable_getCurrentPriorityLevel,
  Qo = Oe.unstable_ImmediatePriority,
  Du = Oe.unstable_UserBlockingPriority,
  xl = Oe.unstable_NormalPriority,
  _f = Oe.unstable_LowPriority,
  Fu = Oe.unstable_IdlePriority,
  $l = null,
  it = null;
function Rf(e) {
  if (it && typeof it.onCommitFiberRoot == "function")
    try {
      it.onCommitFiberRoot($l, e, void 0, (e.current.flags & 128) === 128);
    } catch {}
}
var Je = Math.clz32 ? Math.clz32 : Tf,
  If = Math.log,
  Lf = Math.LN2;
function Tf(e) {
  return ((e >>>= 0), e === 0 ? 32 : (31 - ((If(e) / Lf) | 0)) | 0);
}
var Vr = 64,
  Wr = 4194304;
function tr(e) {
  switch (e & -e) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 4:
      return 4;
    case 8:
      return 8;
    case 16:
      return 16;
    case 32:
      return 32;
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return e & 4194240;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return e & 130023424;
    case 134217728:
      return 134217728;
    case 268435456:
      return 268435456;
    case 536870912:
      return 536870912;
    case 1073741824:
      return 1073741824;
    default:
      return e;
  }
}
function yl(e, t) {
  var n = e.pendingLanes;
  if (n === 0) return 0;
  var r = 0,
    l = e.suspendedLanes,
    s = e.pingedLanes,
    i = n & 268435455;
  if (i !== 0) {
    var a = i & ~l;
    a !== 0 ? (r = tr(a)) : ((s &= i), s !== 0 && (r = tr(s)));
  } else ((i = n & ~l), i !== 0 ? (r = tr(i)) : s !== 0 && (r = tr(s)));
  if (r === 0) return 0;
  if (
    t !== 0 &&
    t !== r &&
    !(t & l) &&
    ((l = r & -r), (s = t & -t), l >= s || (l === 16 && (s & 4194240) !== 0))
  )
    return t;
  if ((r & 4 && (r |= n & 16), (t = e.entangledLanes), t !== 0))
    for (e = e.entanglements, t &= r; 0 < t; )
      ((n = 31 - Je(t)), (l = 1 << n), (r |= e[n]), (t &= ~l));
  return r;
}
function Mf(e, t) {
  switch (e) {
    case 1:
    case 2:
    case 4:
      return t + 250;
    case 8:
    case 16:
    case 32:
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return t + 5e3;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return -1;
    case 134217728:
    case 268435456:
    case 536870912:
    case 1073741824:
      return -1;
    default:
      return -1;
  }
}
function zf(e, t) {
  for (
    var n = e.suspendedLanes,
      r = e.pingedLanes,
      l = e.expirationTimes,
      s = e.pendingLanes;
    0 < s;
  ) {
    var i = 31 - Je(s),
      a = 1 << i,
      u = l[i];
    (u === -1
      ? (!(a & n) || a & r) && (l[i] = Mf(a, t))
      : u <= t && (e.expiredLanes |= a),
      (s &= ~a));
  }
}
function to(e) {
  return (
    (e = e.pendingLanes & -1073741825),
    e !== 0 ? e : e & 1073741824 ? 1073741824 : 0
  );
}
function $u() {
  var e = Vr;
  return ((Vr <<= 1), !(Vr & 4194240) && (Vr = 64), e);
}
function cs(e) {
  for (var t = [], n = 0; 31 > n; n++) t.push(e);
  return t;
}
function Mr(e, t, n) {
  ((e.pendingLanes |= t),
    t !== 536870912 && ((e.suspendedLanes = 0), (e.pingedLanes = 0)),
    (e = e.eventTimes),
    (t = 31 - Je(t)),
    (e[t] = n));
}
function Uf(e, t) {
  var n = e.pendingLanes & ~t;
  ((e.pendingLanes = t),
    (e.suspendedLanes = 0),
    (e.pingedLanes = 0),
    (e.expiredLanes &= t),
    (e.mutableReadLanes &= t),
    (e.entangledLanes &= t),
    (t = e.entanglements));
  var r = e.eventTimes;
  for (e = e.expirationTimes; 0 < n; ) {
    var l = 31 - Je(n),
      s = 1 << l;
    ((t[l] = 0), (r[l] = -1), (e[l] = -1), (n &= ~s));
  }
}
function Ko(e, t) {
  var n = (e.entangledLanes |= t);
  for (e = e.entanglements; n; ) {
    var r = 31 - Je(n),
      l = 1 << r;
    ((l & t) | (e[r] & t) && (e[r] |= t), (n &= ~l));
  }
}
var Y = 0;
function Vu(e) {
  return (
    (e &= -e),
    1 < e ? (4 < e ? (e & 268435455 ? 16 : 536870912) : 4) : 1
  );
}
var Wu,
  Yo,
  Bu,
  Hu,
  Gu,
  no = !1,
  Br = [],
  Tt = null,
  Mt = null,
  zt = null,
  xr = new Map(),
  yr = new Map(),
  _t = [],
  Of =
    "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(
      " ",
    );
function Ki(e, t) {
  switch (e) {
    case "focusin":
    case "focusout":
      Tt = null;
      break;
    case "dragenter":
    case "dragleave":
      Mt = null;
      break;
    case "mouseover":
    case "mouseout":
      zt = null;
      break;
    case "pointerover":
    case "pointerout":
      xr.delete(t.pointerId);
      break;
    case "gotpointercapture":
    case "lostpointercapture":
      yr.delete(t.pointerId);
  }
}
function Bn(e, t, n, r, l, s) {
  return e === null || e.nativeEvent !== s
    ? ((e = {
        blockedOn: t,
        domEventName: n,
        eventSystemFlags: r,
        nativeEvent: s,
        targetContainers: [l],
      }),
      t !== null && ((t = Ur(t)), t !== null && Yo(t)),
      e)
    : ((e.eventSystemFlags |= r),
      (t = e.targetContainers),
      l !== null && t.indexOf(l) === -1 && t.push(l),
      e);
}
function Af(e, t, n, r, l) {
  switch (t) {
    case "focusin":
      return ((Tt = Bn(Tt, e, t, n, r, l)), !0);
    case "dragenter":
      return ((Mt = Bn(Mt, e, t, n, r, l)), !0);
    case "mouseover":
      return ((zt = Bn(zt, e, t, n, r, l)), !0);
    case "pointerover":
      var s = l.pointerId;
      return (xr.set(s, Bn(xr.get(s) || null, e, t, n, r, l)), !0);
    case "gotpointercapture":
      return (
        (s = l.pointerId),
        yr.set(s, Bn(yr.get(s) || null, e, t, n, r, l)),
        !0
      );
  }
  return !1;
}
function Qu(e) {
  var t = Yt(e.target);
  if (t !== null) {
    var n = an(t);
    if (n !== null) {
      if (((t = n.tag), t === 13)) {
        if (((t = zu(n)), t !== null)) {
          ((e.blockedOn = t),
            Gu(e.priority, function () {
              Bu(n);
            }));
          return;
        }
      } else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
        e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
        return;
      }
    }
  }
  e.blockedOn = null;
}
function rl(e) {
  if (e.blockedOn !== null) return !1;
  for (var t = e.targetContainers; 0 < t.length; ) {
    var n = ro(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
    if (n === null) {
      n = e.nativeEvent;
      var r = new n.constructor(n.type, n);
      ((qs = r), n.target.dispatchEvent(r), (qs = null));
    } else return ((t = Ur(n)), t !== null && Yo(t), (e.blockedOn = n), !1);
    t.shift();
  }
  return !0;
}
function Yi(e, t, n) {
  rl(e) && n.delete(t);
}
function Df() {
  ((no = !1),
    Tt !== null && rl(Tt) && (Tt = null),
    Mt !== null && rl(Mt) && (Mt = null),
    zt !== null && rl(zt) && (zt = null),
    xr.forEach(Yi),
    yr.forEach(Yi));
}
function Hn(e, t) {
  e.blockedOn === t &&
    ((e.blockedOn = null),
    no ||
      ((no = !0),
      Oe.unstable_scheduleCallback(Oe.unstable_NormalPriority, Df)));
}
function vr(e) {
  function t(l) {
    return Hn(l, e);
  }
  if (0 < Br.length) {
    Hn(Br[0], e);
    for (var n = 1; n < Br.length; n++) {
      var r = Br[n];
      r.blockedOn === e && (r.blockedOn = null);
    }
  }
  for (
    Tt !== null && Hn(Tt, e),
      Mt !== null && Hn(Mt, e),
      zt !== null && Hn(zt, e),
      xr.forEach(t),
      yr.forEach(t),
      n = 0;
    n < _t.length;
    n++
  )
    ((r = _t[n]), r.blockedOn === e && (r.blockedOn = null));
  for (; 0 < _t.length && ((n = _t[0]), n.blockedOn === null); )
    (Qu(n), n.blockedOn === null && _t.shift());
}
var En = kt.ReactCurrentBatchConfig,
  vl = !0;
function Ff(e, t, n, r) {
  var l = Y,
    s = En.transition;
  En.transition = null;
  try {
    ((Y = 1), Xo(e, t, n, r));
  } finally {
    ((Y = l), (En.transition = s));
  }
}
function $f(e, t, n, r) {
  var l = Y,
    s = En.transition;
  En.transition = null;
  try {
    ((Y = 4), Xo(e, t, n, r));
  } finally {
    ((Y = l), (En.transition = s));
  }
}
function Xo(e, t, n, r) {
  if (vl) {
    var l = ro(e, t, n, r);
    if (l === null) (ws(e, t, r, wl, n), Ki(e, r));
    else if (Af(l, e, t, n, r)) r.stopPropagation();
    else if ((Ki(e, r), t & 4 && -1 < Of.indexOf(e))) {
      for (; l !== null; ) {
        var s = Ur(l);
        if (
          (s !== null && Wu(s),
          (s = ro(e, t, n, r)),
          s === null && ws(e, t, r, wl, n),
          s === l)
        )
          break;
        l = s;
      }
      l !== null && r.stopPropagation();
    } else ws(e, t, r, null, n);
  }
}
var wl = null;
function ro(e, t, n, r) {
  if (((wl = null), (e = Go(r)), (e = Yt(e)), e !== null))
    if (((t = an(e)), t === null)) e = null;
    else if (((n = t.tag), n === 13)) {
      if (((e = zu(t)), e !== null)) return e;
      e = null;
    } else if (n === 3) {
      if (t.stateNode.current.memoizedState.isDehydrated)
        return t.tag === 3 ? t.stateNode.containerInfo : null;
      e = null;
    } else t !== e && (e = null);
  return ((wl = e), null);
}
function Ku(e) {
  switch (e) {
    case "cancel":
    case "click":
    case "close":
    case "contextmenu":
    case "copy":
    case "cut":
    case "auxclick":
    case "dblclick":
    case "dragend":
    case "dragstart":
    case "drop":
    case "focusin":
    case "focusout":
    case "input":
    case "invalid":
    case "keydown":
    case "keypress":
    case "keyup":
    case "mousedown":
    case "mouseup":
    case "paste":
    case "pause":
    case "play":
    case "pointercancel":
    case "pointerdown":
    case "pointerup":
    case "ratechange":
    case "reset":
    case "resize":
    case "seeked":
    case "submit":
    case "touchcancel":
    case "touchend":
    case "touchstart":
    case "volumechange":
    case "change":
    case "selectionchange":
    case "textInput":
    case "compositionstart":
    case "compositionend":
    case "compositionupdate":
    case "beforeblur":
    case "afterblur":
    case "beforeinput":
    case "blur":
    case "fullscreenchange":
    case "focus":
    case "hashchange":
    case "popstate":
    case "select":
    case "selectstart":
      return 1;
    case "drag":
    case "dragenter":
    case "dragexit":
    case "dragleave":
    case "dragover":
    case "mousemove":
    case "mouseout":
    case "mouseover":
    case "pointermove":
    case "pointerout":
    case "pointerover":
    case "scroll":
    case "toggle":
    case "touchmove":
    case "wheel":
    case "mouseenter":
    case "mouseleave":
    case "pointerenter":
    case "pointerleave":
      return 4;
    case "message":
      switch (Pf()) {
        case Qo:
          return 1;
        case Du:
          return 4;
        case xl:
        case _f:
          return 16;
        case Fu:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var It = null,
  qo = null,
  ll = null;
function Yu() {
  if (ll) return ll;
  var e,
    t = qo,
    n = t.length,
    r,
    l = "value" in It ? It.value : It.textContent,
    s = l.length;
  for (e = 0; e < n && t[e] === l[e]; e++);
  var i = n - e;
  for (r = 1; r <= i && t[n - r] === l[s - r]; r++);
  return (ll = l.slice(e, 1 < r ? 1 - r : void 0));
}
function sl(e) {
  var t = e.keyCode;
  return (
    "charCode" in e
      ? ((e = e.charCode), e === 0 && t === 13 && (e = 13))
      : (e = t),
    e === 10 && (e = 13),
    32 <= e || e === 13 ? e : 0
  );
}
function Hr() {
  return !0;
}
function Xi() {
  return !1;
}
function De(e) {
  function t(n, r, l, s, i) {
    ((this._reactName = n),
      (this._targetInst = l),
      (this.type = r),
      (this.nativeEvent = s),
      (this.target = i),
      (this.currentTarget = null));
    for (var a in e)
      e.hasOwnProperty(a) && ((n = e[a]), (this[a] = n ? n(s) : s[a]));
    return (
      (this.isDefaultPrevented = (
        s.defaultPrevented != null ? s.defaultPrevented : s.returnValue === !1
      )
        ? Hr
        : Xi),
      (this.isPropagationStopped = Xi),
      this
    );
  }
  return (
    le(t.prototype, {
      preventDefault: function () {
        this.defaultPrevented = !0;
        var n = this.nativeEvent;
        n &&
          (n.preventDefault
            ? n.preventDefault()
            : typeof n.returnValue != "unknown" && (n.returnValue = !1),
          (this.isDefaultPrevented = Hr));
      },
      stopPropagation: function () {
        var n = this.nativeEvent;
        n &&
          (n.stopPropagation
            ? n.stopPropagation()
            : typeof n.cancelBubble != "unknown" && (n.cancelBubble = !0),
          (this.isPropagationStopped = Hr));
      },
      persist: function () {},
      isPersistent: Hr,
    }),
    t
  );
}
var Dn = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function (e) {
      return e.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0,
  },
  Zo = De(Dn),
  zr = le({}, Dn, { view: 0, detail: 0 }),
  Vf = De(zr),
  ds,
  fs,
  Gn,
  Vl = le({}, zr, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: Jo,
    button: 0,
    buttons: 0,
    relatedTarget: function (e) {
      return e.relatedTarget === void 0
        ? e.fromElement === e.srcElement
          ? e.toElement
          : e.fromElement
        : e.relatedTarget;
    },
    movementX: function (e) {
      return "movementX" in e
        ? e.movementX
        : (e !== Gn &&
            (Gn && e.type === "mousemove"
              ? ((ds = e.screenX - Gn.screenX), (fs = e.screenY - Gn.screenY))
              : (fs = ds = 0),
            (Gn = e)),
          ds);
    },
    movementY: function (e) {
      return "movementY" in e ? e.movementY : fs;
    },
  }),
  qi = De(Vl),
  Wf = le({}, Vl, { dataTransfer: 0 }),
  Bf = De(Wf),
  Hf = le({}, zr, { relatedTarget: 0 }),
  ps = De(Hf),
  Gf = le({}, Dn, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }),
  Qf = De(Gf),
  Kf = le({}, Dn, {
    clipboardData: function (e) {
      return "clipboardData" in e ? e.clipboardData : window.clipboardData;
    },
  }),
  Yf = De(Kf),
  Xf = le({}, Dn, { data: 0 }),
  Zi = De(Xf),
  qf = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified",
  },
  Zf = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta",
  },
  Jf = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey",
  };
function ep(e) {
  var t = this.nativeEvent;
  return t.getModifierState ? t.getModifierState(e) : (e = Jf[e]) ? !!t[e] : !1;
}
function Jo() {
  return ep;
}
var tp = le({}, zr, {
    key: function (e) {
      if (e.key) {
        var t = qf[e.key] || e.key;
        if (t !== "Unidentified") return t;
      }
      return e.type === "keypress"
        ? ((e = sl(e)), e === 13 ? "Enter" : String.fromCharCode(e))
        : e.type === "keydown" || e.type === "keyup"
          ? Zf[e.keyCode] || "Unidentified"
          : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: Jo,
    charCode: function (e) {
      return e.type === "keypress" ? sl(e) : 0;
    },
    keyCode: function (e) {
      return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
    },
    which: function (e) {
      return e.type === "keypress"
        ? sl(e)
        : e.type === "keydown" || e.type === "keyup"
          ? e.keyCode
          : 0;
    },
  }),
  np = De(tp),
  rp = le({}, Vl, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0,
  }),
  Ji = De(rp),
  lp = le({}, zr, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: Jo,
  }),
  sp = De(lp),
  op = le({}, Dn, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }),
  ip = De(op),
  ap = le({}, Vl, {
    deltaX: function (e) {
      return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
    },
    deltaY: function (e) {
      return "deltaY" in e
        ? e.deltaY
        : "wheelDeltaY" in e
          ? -e.wheelDeltaY
          : "wheelDelta" in e
            ? -e.wheelDelta
            : 0;
    },
    deltaZ: 0,
    deltaMode: 0,
  }),
  up = De(ap),
  cp = [9, 13, 27, 32],
  ei = xt && "CompositionEvent" in window,
  sr = null;
xt && "documentMode" in document && (sr = document.documentMode);
var dp = xt && "TextEvent" in window && !sr,
  Xu = xt && (!ei || (sr && 8 < sr && 11 >= sr)),
  ea = " ",
  ta = !1;
function qu(e, t) {
  switch (e) {
    case "keyup":
      return cp.indexOf(t.keyCode) !== -1;
    case "keydown":
      return t.keyCode !== 229;
    case "keypress":
    case "mousedown":
    case "focusout":
      return !0;
    default:
      return !1;
  }
}
function Zu(e) {
  return ((e = e.detail), typeof e == "object" && "data" in e ? e.data : null);
}
var pn = !1;
function fp(e, t) {
  switch (e) {
    case "compositionend":
      return Zu(t);
    case "keypress":
      return t.which !== 32 ? null : ((ta = !0), ea);
    case "textInput":
      return ((e = t.data), e === ea && ta ? null : e);
    default:
      return null;
  }
}
function pp(e, t) {
  if (pn)
    return e === "compositionend" || (!ei && qu(e, t))
      ? ((e = Yu()), (ll = qo = It = null), (pn = !1), e)
      : null;
  switch (e) {
    case "paste":
      return null;
    case "keypress":
      if (!(t.ctrlKey || t.altKey || t.metaKey) || (t.ctrlKey && t.altKey)) {
        if (t.char && 1 < t.char.length) return t.char;
        if (t.which) return String.fromCharCode(t.which);
      }
      return null;
    case "compositionend":
      return Xu && t.locale !== "ko" ? null : t.data;
    default:
      return null;
  }
}
var mp = {
  color: !0,
  date: !0,
  datetime: !0,
  "datetime-local": !0,
  email: !0,
  month: !0,
  number: !0,
  password: !0,
  range: !0,
  search: !0,
  tel: !0,
  text: !0,
  time: !0,
  url: !0,
  week: !0,
};
function na(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t === "input" ? !!mp[e.type] : t === "textarea";
}
function Ju(e, t, n, r) {
  (Ru(r),
    (t = kl(t, "onChange")),
    0 < t.length &&
      ((n = new Zo("onChange", "change", null, n, r)),
      e.push({ event: n, listeners: t })));
}
var or = null,
  wr = null;
function hp(e) {
  cc(e, 0);
}
function Wl(e) {
  var t = gn(e);
  if (Nu(t)) return e;
}
function gp(e, t) {
  if (e === "change") return t;
}
var ec = !1;
if (xt) {
  var ms;
  if (xt) {
    var hs = "oninput" in document;
    if (!hs) {
      var ra = document.createElement("div");
      (ra.setAttribute("oninput", "return;"),
        (hs = typeof ra.oninput == "function"));
    }
    ms = hs;
  } else ms = !1;
  ec = ms && (!document.documentMode || 9 < document.documentMode);
}
function la() {
  or && (or.detachEvent("onpropertychange", tc), (wr = or = null));
}
function tc(e) {
  if (e.propertyName === "value" && Wl(wr)) {
    var t = [];
    (Ju(t, wr, e, Go(e)), Mu(hp, t));
  }
}
function xp(e, t, n) {
  e === "focusin"
    ? (la(), (or = t), (wr = n), or.attachEvent("onpropertychange", tc))
    : e === "focusout" && la();
}
function yp(e) {
  if (e === "selectionchange" || e === "keyup" || e === "keydown")
    return Wl(wr);
}
function vp(e, t) {
  if (e === "click") return Wl(t);
}
function wp(e, t) {
  if (e === "input" || e === "change") return Wl(t);
}
function kp(e, t) {
  return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t);
}
var tt = typeof Object.is == "function" ? Object.is : kp;
function kr(e, t) {
  if (tt(e, t)) return !0;
  if (typeof e != "object" || e === null || typeof t != "object" || t === null)
    return !1;
  var n = Object.keys(e),
    r = Object.keys(t);
  if (n.length !== r.length) return !1;
  for (r = 0; r < n.length; r++) {
    var l = n[r];
    if (!Ds.call(t, l) || !tt(e[l], t[l])) return !1;
  }
  return !0;
}
function sa(e) {
  for (; e && e.firstChild; ) e = e.firstChild;
  return e;
}
function oa(e, t) {
  var n = sa(e);
  e = 0;
  for (var r; n; ) {
    if (n.nodeType === 3) {
      if (((r = e + n.textContent.length), e <= t && r >= t))
        return { node: n, offset: t - e };
      e = r;
    }
    e: {
      for (; n; ) {
        if (n.nextSibling) {
          n = n.nextSibling;
          break e;
        }
        n = n.parentNode;
      }
      n = void 0;
    }
    n = sa(n);
  }
}
function nc(e, t) {
  return e && t
    ? e === t
      ? !0
      : e && e.nodeType === 3
        ? !1
        : t && t.nodeType === 3
          ? nc(e, t.parentNode)
          : "contains" in e
            ? e.contains(t)
            : e.compareDocumentPosition
              ? !!(e.compareDocumentPosition(t) & 16)
              : !1
    : !1;
}
function rc() {
  for (var e = window, t = ml(); t instanceof e.HTMLIFrameElement; ) {
    try {
      var n = typeof t.contentWindow.location.href == "string";
    } catch {
      n = !1;
    }
    if (n) e = t.contentWindow;
    else break;
    t = ml(e.document);
  }
  return t;
}
function ti(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return (
    t &&
    ((t === "input" &&
      (e.type === "text" ||
        e.type === "search" ||
        e.type === "tel" ||
        e.type === "url" ||
        e.type === "password")) ||
      t === "textarea" ||
      e.contentEditable === "true")
  );
}
function jp(e) {
  var t = rc(),
    n = e.focusedElem,
    r = e.selectionRange;
  if (
    t !== n &&
    n &&
    n.ownerDocument &&
    nc(n.ownerDocument.documentElement, n)
  ) {
    if (r !== null && ti(n)) {
      if (
        ((t = r.start),
        (e = r.end),
        e === void 0 && (e = t),
        "selectionStart" in n)
      )
        ((n.selectionStart = t),
          (n.selectionEnd = Math.min(e, n.value.length)));
      else if (
        ((e = ((t = n.ownerDocument || document) && t.defaultView) || window),
        e.getSelection)
      ) {
        e = e.getSelection();
        var l = n.textContent.length,
          s = Math.min(r.start, l);
        ((r = r.end === void 0 ? s : Math.min(r.end, l)),
          !e.extend && s > r && ((l = r), (r = s), (s = l)),
          (l = oa(n, s)));
        var i = oa(n, r);
        l &&
          i &&
          (e.rangeCount !== 1 ||
            e.anchorNode !== l.node ||
            e.anchorOffset !== l.offset ||
            e.focusNode !== i.node ||
            e.focusOffset !== i.offset) &&
          ((t = t.createRange()),
          t.setStart(l.node, l.offset),
          e.removeAllRanges(),
          s > r
            ? (e.addRange(t), e.extend(i.node, i.offset))
            : (t.setEnd(i.node, i.offset), e.addRange(t)));
      }
    }
    for (t = [], e = n; (e = e.parentNode); )
      e.nodeType === 1 &&
        t.push({ element: e, left: e.scrollLeft, top: e.scrollTop });
    for (typeof n.focus == "function" && n.focus(), n = 0; n < t.length; n++)
      ((e = t[n]),
        (e.element.scrollLeft = e.left),
        (e.element.scrollTop = e.top));
  }
}
var Np = xt && "documentMode" in document && 11 >= document.documentMode,
  mn = null,
  lo = null,
  ir = null,
  so = !1;
function ia(e, t, n) {
  var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
  so ||
    mn == null ||
    mn !== ml(r) ||
    ((r = mn),
    "selectionStart" in r && ti(r)
      ? (r = { start: r.selectionStart, end: r.selectionEnd })
      : ((r = (
          (r.ownerDocument && r.ownerDocument.defaultView) ||
          window
        ).getSelection()),
        (r = {
          anchorNode: r.anchorNode,
          anchorOffset: r.anchorOffset,
          focusNode: r.focusNode,
          focusOffset: r.focusOffset,
        })),
    (ir && kr(ir, r)) ||
      ((ir = r),
      (r = kl(lo, "onSelect")),
      0 < r.length &&
        ((t = new Zo("onSelect", "select", null, t, n)),
        e.push({ event: t, listeners: r }),
        (t.target = mn))));
}
function Gr(e, t) {
  var n = {};
  return (
    (n[e.toLowerCase()] = t.toLowerCase()),
    (n["Webkit" + e] = "webkit" + t),
    (n["Moz" + e] = "moz" + t),
    n
  );
}
var hn = {
    animationend: Gr("Animation", "AnimationEnd"),
    animationiteration: Gr("Animation", "AnimationIteration"),
    animationstart: Gr("Animation", "AnimationStart"),
    transitionend: Gr("Transition", "TransitionEnd"),
  },
  gs = {},
  lc = {};
xt &&
  ((lc = document.createElement("div").style),
  "AnimationEvent" in window ||
    (delete hn.animationend.animation,
    delete hn.animationiteration.animation,
    delete hn.animationstart.animation),
  "TransitionEvent" in window || delete hn.transitionend.transition);
function Bl(e) {
  if (gs[e]) return gs[e];
  if (!hn[e]) return e;
  var t = hn[e],
    n;
  for (n in t) if (t.hasOwnProperty(n) && n in lc) return (gs[e] = t[n]);
  return e;
}
var sc = Bl("animationend"),
  oc = Bl("animationiteration"),
  ic = Bl("animationstart"),
  ac = Bl("transitionend"),
  uc = new Map(),
  aa =
    "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
      " ",
    );
function Wt(e, t) {
  (uc.set(e, t), on(t, [e]));
}
for (var xs = 0; xs < aa.length; xs++) {
  var ys = aa[xs],
    Sp = ys.toLowerCase(),
    Cp = ys[0].toUpperCase() + ys.slice(1);
  Wt(Sp, "on" + Cp);
}
Wt(sc, "onAnimationEnd");
Wt(oc, "onAnimationIteration");
Wt(ic, "onAnimationStart");
Wt("dblclick", "onDoubleClick");
Wt("focusin", "onFocus");
Wt("focusout", "onBlur");
Wt(ac, "onTransitionEnd");
Rn("onMouseEnter", ["mouseout", "mouseover"]);
Rn("onMouseLeave", ["mouseout", "mouseover"]);
Rn("onPointerEnter", ["pointerout", "pointerover"]);
Rn("onPointerLeave", ["pointerout", "pointerover"]);
on(
  "onChange",
  "change click focusin focusout input keydown keyup selectionchange".split(
    " ",
  ),
);
on(
  "onSelect",
  "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
    " ",
  ),
);
on("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
on(
  "onCompositionEnd",
  "compositionend focusout keydown keypress keyup mousedown".split(" "),
);
on(
  "onCompositionStart",
  "compositionstart focusout keydown keypress keyup mousedown".split(" "),
);
on(
  "onCompositionUpdate",
  "compositionupdate focusout keydown keypress keyup mousedown".split(" "),
);
var nr =
    "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
      " ",
    ),
  Ep = new Set("cancel close invalid load scroll toggle".split(" ").concat(nr));
function ua(e, t, n) {
  var r = e.type || "unknown-event";
  ((e.currentTarget = n), Sf(r, t, void 0, e), (e.currentTarget = null));
}
function cc(e, t) {
  t = (t & 4) !== 0;
  for (var n = 0; n < e.length; n++) {
    var r = e[n],
      l = r.event;
    r = r.listeners;
    e: {
      var s = void 0;
      if (t)
        for (var i = r.length - 1; 0 <= i; i--) {
          var a = r[i],
            u = a.instance,
            c = a.currentTarget;
          if (((a = a.listener), u !== s && l.isPropagationStopped())) break e;
          (ua(l, a, c), (s = u));
        }
      else
        for (i = 0; i < r.length; i++) {
          if (
            ((a = r[i]),
            (u = a.instance),
            (c = a.currentTarget),
            (a = a.listener),
            u !== s && l.isPropagationStopped())
          )
            break e;
          (ua(l, a, c), (s = u));
        }
    }
  }
  if (gl) throw ((e = eo), (gl = !1), (eo = null), e);
}
function Z(e, t) {
  var n = t[co];
  n === void 0 && (n = t[co] = new Set());
  var r = e + "__bubble";
  n.has(r) || (dc(t, e, 2, !1), n.add(r));
}
function vs(e, t, n) {
  var r = 0;
  (t && (r |= 4), dc(n, e, r, t));
}
var Qr = "_reactListening" + Math.random().toString(36).slice(2);
function jr(e) {
  if (!e[Qr]) {
    ((e[Qr] = !0),
      yu.forEach(function (n) {
        n !== "selectionchange" && (Ep.has(n) || vs(n, !1, e), vs(n, !0, e));
      }));
    var t = e.nodeType === 9 ? e : e.ownerDocument;
    t === null || t[Qr] || ((t[Qr] = !0), vs("selectionchange", !1, t));
  }
}
function dc(e, t, n, r) {
  switch (Ku(t)) {
    case 1:
      var l = Ff;
      break;
    case 4:
      l = $f;
      break;
    default:
      l = Xo;
  }
  ((n = l.bind(null, t, n, e)),
    (l = void 0),
    !Js ||
      (t !== "touchstart" && t !== "touchmove" && t !== "wheel") ||
      (l = !0),
    r
      ? l !== void 0
        ? e.addEventListener(t, n, { capture: !0, passive: l })
        : e.addEventListener(t, n, !0)
      : l !== void 0
        ? e.addEventListener(t, n, { passive: l })
        : e.addEventListener(t, n, !1));
}
function ws(e, t, n, r, l) {
  var s = r;
  if (!(t & 1) && !(t & 2) && r !== null)
    e: for (;;) {
      if (r === null) return;
      var i = r.tag;
      if (i === 3 || i === 4) {
        var a = r.stateNode.containerInfo;
        if (a === l || (a.nodeType === 8 && a.parentNode === l)) break;
        if (i === 4)
          for (i = r.return; i !== null; ) {
            var u = i.tag;
            if (
              (u === 3 || u === 4) &&
              ((u = i.stateNode.containerInfo),
              u === l || (u.nodeType === 8 && u.parentNode === l))
            )
              return;
            i = i.return;
          }
        for (; a !== null; ) {
          if (((i = Yt(a)), i === null)) return;
          if (((u = i.tag), u === 5 || u === 6)) {
            r = s = i;
            continue e;
          }
          a = a.parentNode;
        }
      }
      r = r.return;
    }
  Mu(function () {
    var c = s,
      h = Go(n),
      x = [];
    e: {
      var m = uc.get(e);
      if (m !== void 0) {
        var v = Zo,
          w = e;
        switch (e) {
          case "keypress":
            if (sl(n) === 0) break e;
          case "keydown":
          case "keyup":
            v = np;
            break;
          case "focusin":
            ((w = "focus"), (v = ps));
            break;
          case "focusout":
            ((w = "blur"), (v = ps));
            break;
          case "beforeblur":
          case "afterblur":
            v = ps;
            break;
          case "click":
            if (n.button === 2) break e;
          case "auxclick":
          case "dblclick":
          case "mousedown":
          case "mousemove":
          case "mouseup":
          case "mouseout":
          case "mouseover":
          case "contextmenu":
            v = qi;
            break;
          case "drag":
          case "dragend":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "dragstart":
          case "drop":
            v = Bf;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            v = sp;
            break;
          case sc:
          case oc:
          case ic:
            v = Qf;
            break;
          case ac:
            v = ip;
            break;
          case "scroll":
            v = Vf;
            break;
          case "wheel":
            v = up;
            break;
          case "copy":
          case "cut":
          case "paste":
            v = Yf;
            break;
          case "gotpointercapture":
          case "lostpointercapture":
          case "pointercancel":
          case "pointerdown":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "pointerup":
            v = Ji;
        }
        var y = (t & 4) !== 0,
          j = !y && e === "scroll",
          f = y ? (m !== null ? m + "Capture" : null) : m;
        y = [];
        for (var d = c, p; d !== null; ) {
          p = d;
          var g = p.stateNode;
          if (
            (p.tag === 5 &&
              g !== null &&
              ((p = g),
              f !== null && ((g = gr(d, f)), g != null && y.push(Nr(d, g, p)))),
            j)
          )
            break;
          d = d.return;
        }
        0 < y.length &&
          ((m = new v(m, w, null, n, h)), x.push({ event: m, listeners: y }));
      }
    }
    if (!(t & 7)) {
      e: {
        if (
          ((m = e === "mouseover" || e === "pointerover"),
          (v = e === "mouseout" || e === "pointerout"),
          m &&
            n !== qs &&
            (w = n.relatedTarget || n.fromElement) &&
            (Yt(w) || w[yt]))
        )
          break e;
        if (
          (v || m) &&
          ((m =
            h.window === h
              ? h
              : (m = h.ownerDocument)
                ? m.defaultView || m.parentWindow
                : window),
          v
            ? ((w = n.relatedTarget || n.toElement),
              (v = c),
              (w = w ? Yt(w) : null),
              w !== null &&
                ((j = an(w)), w !== j || (w.tag !== 5 && w.tag !== 6)) &&
                (w = null))
            : ((v = null), (w = c)),
          v !== w)
        ) {
          if (
            ((y = qi),
            (g = "onMouseLeave"),
            (f = "onMouseEnter"),
            (d = "mouse"),
            (e === "pointerout" || e === "pointerover") &&
              ((y = Ji),
              (g = "onPointerLeave"),
              (f = "onPointerEnter"),
              (d = "pointer")),
            (j = v == null ? m : gn(v)),
            (p = w == null ? m : gn(w)),
            (m = new y(g, d + "leave", v, n, h)),
            (m.target = j),
            (m.relatedTarget = p),
            (g = null),
            Yt(h) === c &&
              ((y = new y(f, d + "enter", w, n, h)),
              (y.target = p),
              (y.relatedTarget = j),
              (g = y)),
            (j = g),
            v && w)
          )
            t: {
              for (y = v, f = w, d = 0, p = y; p; p = cn(p)) d++;
              for (p = 0, g = f; g; g = cn(g)) p++;
              for (; 0 < d - p; ) ((y = cn(y)), d--);
              for (; 0 < p - d; ) ((f = cn(f)), p--);
              for (; d--; ) {
                if (y === f || (f !== null && y === f.alternate)) break t;
                ((y = cn(y)), (f = cn(f)));
              }
              y = null;
            }
          else y = null;
          (v !== null && ca(x, m, v, y, !1),
            w !== null && j !== null && ca(x, j, w, y, !0));
        }
      }
      e: {
        if (
          ((m = c ? gn(c) : window),
          (v = m.nodeName && m.nodeName.toLowerCase()),
          v === "select" || (v === "input" && m.type === "file"))
        )
          var N = gp;
        else if (na(m))
          if (ec) N = wp;
          else {
            N = yp;
            var R = xp;
          }
        else
          (v = m.nodeName) &&
            v.toLowerCase() === "input" &&
            (m.type === "checkbox" || m.type === "radio") &&
            (N = vp);
        if (N && (N = N(e, c))) {
          Ju(x, N, n, h);
          break e;
        }
        (R && R(e, m, c),
          e === "focusout" &&
            (R = m._wrapperState) &&
            R.controlled &&
            m.type === "number" &&
            Gs(m, "number", m.value));
      }
      switch (((R = c ? gn(c) : window), e)) {
        case "focusin":
          (na(R) || R.contentEditable === "true") &&
            ((mn = R), (lo = c), (ir = null));
          break;
        case "focusout":
          ir = lo = mn = null;
          break;
        case "mousedown":
          so = !0;
          break;
        case "contextmenu":
        case "mouseup":
        case "dragend":
          ((so = !1), ia(x, n, h));
          break;
        case "selectionchange":
          if (Np) break;
        case "keydown":
        case "keyup":
          ia(x, n, h);
      }
      var E;
      if (ei)
        e: {
          switch (e) {
            case "compositionstart":
              var S = "onCompositionStart";
              break e;
            case "compositionend":
              S = "onCompositionEnd";
              break e;
            case "compositionupdate":
              S = "onCompositionUpdate";
              break e;
          }
          S = void 0;
        }
      else
        pn
          ? qu(e, n) && (S = "onCompositionEnd")
          : e === "keydown" && n.keyCode === 229 && (S = "onCompositionStart");
      (S &&
        (Xu &&
          n.locale !== "ko" &&
          (pn || S !== "onCompositionStart"
            ? S === "onCompositionEnd" && pn && (E = Yu())
            : ((It = h),
              (qo = "value" in It ? It.value : It.textContent),
              (pn = !0))),
        (R = kl(c, S)),
        0 < R.length &&
          ((S = new Zi(S, e, null, n, h)),
          x.push({ event: S, listeners: R }),
          E ? (S.data = E) : ((E = Zu(n)), E !== null && (S.data = E)))),
        (E = dp ? fp(e, n) : pp(e, n)) &&
          ((c = kl(c, "onBeforeInput")),
          0 < c.length &&
            ((h = new Zi("onBeforeInput", "beforeinput", null, n, h)),
            x.push({ event: h, listeners: c }),
            (h.data = E))));
    }
    cc(x, t);
  });
}
function Nr(e, t, n) {
  return { instance: e, listener: t, currentTarget: n };
}
function kl(e, t) {
  for (var n = t + "Capture", r = []; e !== null; ) {
    var l = e,
      s = l.stateNode;
    (l.tag === 5 &&
      s !== null &&
      ((l = s),
      (s = gr(e, n)),
      s != null && r.unshift(Nr(e, s, l)),
      (s = gr(e, t)),
      s != null && r.push(Nr(e, s, l))),
      (e = e.return));
  }
  return r;
}
function cn(e) {
  if (e === null) return null;
  do e = e.return;
  while (e && e.tag !== 5);
  return e || null;
}
function ca(e, t, n, r, l) {
  for (var s = t._reactName, i = []; n !== null && n !== r; ) {
    var a = n,
      u = a.alternate,
      c = a.stateNode;
    if (u !== null && u === r) break;
    (a.tag === 5 &&
      c !== null &&
      ((a = c),
      l
        ? ((u = gr(n, s)), u != null && i.unshift(Nr(n, u, a)))
        : l || ((u = gr(n, s)), u != null && i.push(Nr(n, u, a)))),
      (n = n.return));
  }
  i.length !== 0 && e.push({ event: t, listeners: i });
}
var bp = /\r\n?/g,
  Pp = /\u0000|\uFFFD/g;
function da(e) {
  return (typeof e == "string" ? e : "" + e)
    .replace(
      bp,
      `
`,
    )
    .replace(Pp, "");
}
function Kr(e, t, n) {
  if (((t = da(t)), da(e) !== t && n)) throw Error(P(425));
}
function jl() {}
var oo = null,
  io = null;
function ao(e, t) {
  return (
    e === "textarea" ||
    e === "noscript" ||
    typeof t.children == "string" ||
    typeof t.children == "number" ||
    (typeof t.dangerouslySetInnerHTML == "object" &&
      t.dangerouslySetInnerHTML !== null &&
      t.dangerouslySetInnerHTML.__html != null)
  );
}
var uo = typeof setTimeout == "function" ? setTimeout : void 0,
  _p = typeof clearTimeout == "function" ? clearTimeout : void 0,
  fa = typeof Promise == "function" ? Promise : void 0,
  Rp =
    typeof queueMicrotask == "function"
      ? queueMicrotask
      : typeof fa < "u"
        ? function (e) {
            return fa.resolve(null).then(e).catch(Ip);
          }
        : uo;
function Ip(e) {
  setTimeout(function () {
    throw e;
  });
}
function ks(e, t) {
  var n = t,
    r = 0;
  do {
    var l = n.nextSibling;
    if ((e.removeChild(n), l && l.nodeType === 8))
      if (((n = l.data), n === "/$")) {
        if (r === 0) {
          (e.removeChild(l), vr(t));
          return;
        }
        r--;
      } else (n !== "$" && n !== "$?" && n !== "$!") || r++;
    n = l;
  } while (n);
  vr(t);
}
function Ut(e) {
  for (; e != null; e = e.nextSibling) {
    var t = e.nodeType;
    if (t === 1 || t === 3) break;
    if (t === 8) {
      if (((t = e.data), t === "$" || t === "$!" || t === "$?")) break;
      if (t === "/$") return null;
    }
  }
  return e;
}
function pa(e) {
  e = e.previousSibling;
  for (var t = 0; e; ) {
    if (e.nodeType === 8) {
      var n = e.data;
      if (n === "$" || n === "$!" || n === "$?") {
        if (t === 0) return e;
        t--;
      } else n === "/$" && t++;
    }
    e = e.previousSibling;
  }
  return null;
}
var Fn = Math.random().toString(36).slice(2),
  ot = "__reactFiber$" + Fn,
  Sr = "__reactProps$" + Fn,
  yt = "__reactContainer$" + Fn,
  co = "__reactEvents$" + Fn,
  Lp = "__reactListeners$" + Fn,
  Tp = "__reactHandles$" + Fn;
function Yt(e) {
  var t = e[ot];
  if (t) return t;
  for (var n = e.parentNode; n; ) {
    if ((t = n[yt] || n[ot])) {
      if (
        ((n = t.alternate),
        t.child !== null || (n !== null && n.child !== null))
      )
        for (e = pa(e); e !== null; ) {
          if ((n = e[ot])) return n;
          e = pa(e);
        }
      return t;
    }
    ((e = n), (n = e.parentNode));
  }
  return null;
}
function Ur(e) {
  return (
    (e = e[ot] || e[yt]),
    !e || (e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3) ? null : e
  );
}
function gn(e) {
  if (e.tag === 5 || e.tag === 6) return e.stateNode;
  throw Error(P(33));
}
function Hl(e) {
  return e[Sr] || null;
}
var fo = [],
  xn = -1;
function Bt(e) {
  return { current: e };
}
function ee(e) {
  0 > xn || ((e.current = fo[xn]), (fo[xn] = null), xn--);
}
function X(e, t) {
  (xn++, (fo[xn] = e.current), (e.current = t));
}
var Vt = {},
  je = Bt(Vt),
  Re = Bt(!1),
  tn = Vt;
function In(e, t) {
  var n = e.type.contextTypes;
  if (!n) return Vt;
  var r = e.stateNode;
  if (r && r.__reactInternalMemoizedUnmaskedChildContext === t)
    return r.__reactInternalMemoizedMaskedChildContext;
  var l = {},
    s;
  for (s in n) l[s] = t[s];
  return (
    r &&
      ((e = e.stateNode),
      (e.__reactInternalMemoizedUnmaskedChildContext = t),
      (e.__reactInternalMemoizedMaskedChildContext = l)),
    l
  );
}
function Ie(e) {
  return ((e = e.childContextTypes), e != null);
}
function Nl() {
  (ee(Re), ee(je));
}
function ma(e, t, n) {
  if (je.current !== Vt) throw Error(P(168));
  (X(je, t), X(Re, n));
}
function fc(e, t, n) {
  var r = e.stateNode;
  if (((t = t.childContextTypes), typeof r.getChildContext != "function"))
    return n;
  r = r.getChildContext();
  for (var l in r) if (!(l in t)) throw Error(P(108, xf(e) || "Unknown", l));
  return le({}, n, r);
}
function Sl(e) {
  return (
    (e =
      ((e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext) || Vt),
    (tn = je.current),
    X(je, e),
    X(Re, Re.current),
    !0
  );
}
function ha(e, t, n) {
  var r = e.stateNode;
  if (!r) throw Error(P(169));
  (n
    ? ((e = fc(e, t, tn)),
      (r.__reactInternalMemoizedMergedChildContext = e),
      ee(Re),
      ee(je),
      X(je, e))
    : ee(Re),
    X(Re, n));
}
var pt = null,
  Gl = !1,
  js = !1;
function pc(e) {
  pt === null ? (pt = [e]) : pt.push(e);
}
function Mp(e) {
  ((Gl = !0), pc(e));
}
function Ht() {
  if (!js && pt !== null) {
    js = !0;
    var e = 0,
      t = Y;
    try {
      var n = pt;
      for (Y = 1; e < n.length; e++) {
        var r = n[e];
        do r = r(!0);
        while (r !== null);
      }
      ((pt = null), (Gl = !1));
    } catch (l) {
      throw (pt !== null && (pt = pt.slice(e + 1)), Au(Qo, Ht), l);
    } finally {
      ((Y = t), (js = !1));
    }
  }
  return null;
}
var yn = [],
  vn = 0,
  Cl = null,
  El = 0,
  Ve = [],
  We = 0,
  nn = null,
  mt = 1,
  ht = "";
function Qt(e, t) {
  ((yn[vn++] = El), (yn[vn++] = Cl), (Cl = e), (El = t));
}
function mc(e, t, n) {
  ((Ve[We++] = mt), (Ve[We++] = ht), (Ve[We++] = nn), (nn = e));
  var r = mt;
  e = ht;
  var l = 32 - Je(r) - 1;
  ((r &= ~(1 << l)), (n += 1));
  var s = 32 - Je(t) + l;
  if (30 < s) {
    var i = l - (l % 5);
    ((s = (r & ((1 << i) - 1)).toString(32)),
      (r >>= i),
      (l -= i),
      (mt = (1 << (32 - Je(t) + l)) | (n << l) | r),
      (ht = s + e));
  } else ((mt = (1 << s) | (n << l) | r), (ht = e));
}
function ni(e) {
  e.return !== null && (Qt(e, 1), mc(e, 1, 0));
}
function ri(e) {
  for (; e === Cl; )
    ((Cl = yn[--vn]), (yn[vn] = null), (El = yn[--vn]), (yn[vn] = null));
  for (; e === nn; )
    ((nn = Ve[--We]),
      (Ve[We] = null),
      (ht = Ve[--We]),
      (Ve[We] = null),
      (mt = Ve[--We]),
      (Ve[We] = null));
}
var Ue = null,
  ze = null,
  te = !1,
  Ze = null;
function hc(e, t) {
  var n = Be(5, null, null, 0);
  ((n.elementType = "DELETED"),
    (n.stateNode = t),
    (n.return = e),
    (t = e.deletions),
    t === null ? ((e.deletions = [n]), (e.flags |= 16)) : t.push(n));
}
function ga(e, t) {
  switch (e.tag) {
    case 5:
      var n = e.type;
      return (
        (t =
          t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase()
            ? null
            : t),
        t !== null
          ? ((e.stateNode = t), (Ue = e), (ze = Ut(t.firstChild)), !0)
          : !1
      );
    case 6:
      return (
        (t = e.pendingProps === "" || t.nodeType !== 3 ? null : t),
        t !== null ? ((e.stateNode = t), (Ue = e), (ze = null), !0) : !1
      );
    case 13:
      return (
        (t = t.nodeType !== 8 ? null : t),
        t !== null
          ? ((n = nn !== null ? { id: mt, overflow: ht } : null),
            (e.memoizedState = {
              dehydrated: t,
              treeContext: n,
              retryLane: 1073741824,
            }),
            (n = Be(18, null, null, 0)),
            (n.stateNode = t),
            (n.return = e),
            (e.child = n),
            (Ue = e),
            (ze = null),
            !0)
          : !1
      );
    default:
      return !1;
  }
}
function po(e) {
  return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
}
function mo(e) {
  if (te) {
    var t = ze;
    if (t) {
      var n = t;
      if (!ga(e, t)) {
        if (po(e)) throw Error(P(418));
        t = Ut(n.nextSibling);
        var r = Ue;
        t && ga(e, t)
          ? hc(r, n)
          : ((e.flags = (e.flags & -4097) | 2), (te = !1), (Ue = e));
      }
    } else {
      if (po(e)) throw Error(P(418));
      ((e.flags = (e.flags & -4097) | 2), (te = !1), (Ue = e));
    }
  }
}
function xa(e) {
  for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; )
    e = e.return;
  Ue = e;
}
function Yr(e) {
  if (e !== Ue) return !1;
  if (!te) return (xa(e), (te = !0), !1);
  var t;
  if (
    ((t = e.tag !== 3) &&
      !(t = e.tag !== 5) &&
      ((t = e.type),
      (t = t !== "head" && t !== "body" && !ao(e.type, e.memoizedProps))),
    t && (t = ze))
  ) {
    if (po(e)) throw (gc(), Error(P(418)));
    for (; t; ) (hc(e, t), (t = Ut(t.nextSibling)));
  }
  if ((xa(e), e.tag === 13)) {
    if (((e = e.memoizedState), (e = e !== null ? e.dehydrated : null), !e))
      throw Error(P(317));
    e: {
      for (e = e.nextSibling, t = 0; e; ) {
        if (e.nodeType === 8) {
          var n = e.data;
          if (n === "/$") {
            if (t === 0) {
              ze = Ut(e.nextSibling);
              break e;
            }
            t--;
          } else (n !== "$" && n !== "$!" && n !== "$?") || t++;
        }
        e = e.nextSibling;
      }
      ze = null;
    }
  } else ze = Ue ? Ut(e.stateNode.nextSibling) : null;
  return !0;
}
function gc() {
  for (var e = ze; e; ) e = Ut(e.nextSibling);
}
function Ln() {
  ((ze = Ue = null), (te = !1));
}
function li(e) {
  Ze === null ? (Ze = [e]) : Ze.push(e);
}
var zp = kt.ReactCurrentBatchConfig;
function Qn(e, t, n) {
  if (
    ((e = n.ref), e !== null && typeof e != "function" && typeof e != "object")
  ) {
    if (n._owner) {
      if (((n = n._owner), n)) {
        if (n.tag !== 1) throw Error(P(309));
        var r = n.stateNode;
      }
      if (!r) throw Error(P(147, e));
      var l = r,
        s = "" + e;
      return t !== null &&
        t.ref !== null &&
        typeof t.ref == "function" &&
        t.ref._stringRef === s
        ? t.ref
        : ((t = function (i) {
            var a = l.refs;
            i === null ? delete a[s] : (a[s] = i);
          }),
          (t._stringRef = s),
          t);
    }
    if (typeof e != "string") throw Error(P(284));
    if (!n._owner) throw Error(P(290, e));
  }
  return e;
}
function Xr(e, t) {
  throw (
    (e = Object.prototype.toString.call(t)),
    Error(
      P(
        31,
        e === "[object Object]"
          ? "object with keys {" + Object.keys(t).join(", ") + "}"
          : e,
      ),
    )
  );
}
function ya(e) {
  var t = e._init;
  return t(e._payload);
}
function xc(e) {
  function t(f, d) {
    if (e) {
      var p = f.deletions;
      p === null ? ((f.deletions = [d]), (f.flags |= 16)) : p.push(d);
    }
  }
  function n(f, d) {
    if (!e) return null;
    for (; d !== null; ) (t(f, d), (d = d.sibling));
    return null;
  }
  function r(f, d) {
    for (f = new Map(); d !== null; )
      (d.key !== null ? f.set(d.key, d) : f.set(d.index, d), (d = d.sibling));
    return f;
  }
  function l(f, d) {
    return ((f = Ft(f, d)), (f.index = 0), (f.sibling = null), f);
  }
  function s(f, d, p) {
    return (
      (f.index = p),
      e
        ? ((p = f.alternate),
          p !== null
            ? ((p = p.index), p < d ? ((f.flags |= 2), d) : p)
            : ((f.flags |= 2), d))
        : ((f.flags |= 1048576), d)
    );
  }
  function i(f) {
    return (e && f.alternate === null && (f.flags |= 2), f);
  }
  function a(f, d, p, g) {
    return d === null || d.tag !== 6
      ? ((d = _s(p, f.mode, g)), (d.return = f), d)
      : ((d = l(d, p)), (d.return = f), d);
  }
  function u(f, d, p, g) {
    var N = p.type;
    return N === fn
      ? h(f, d, p.props.children, g, p.key)
      : d !== null &&
          (d.elementType === N ||
            (typeof N == "object" &&
              N !== null &&
              N.$$typeof === bt &&
              ya(N) === d.type))
        ? ((g = l(d, p.props)), (g.ref = Qn(f, d, p)), (g.return = f), g)
        : ((g = fl(p.type, p.key, p.props, null, f.mode, g)),
          (g.ref = Qn(f, d, p)),
          (g.return = f),
          g);
  }
  function c(f, d, p, g) {
    return d === null ||
      d.tag !== 4 ||
      d.stateNode.containerInfo !== p.containerInfo ||
      d.stateNode.implementation !== p.implementation
      ? ((d = Rs(p, f.mode, g)), (d.return = f), d)
      : ((d = l(d, p.children || [])), (d.return = f), d);
  }
  function h(f, d, p, g, N) {
    return d === null || d.tag !== 7
      ? ((d = Jt(p, f.mode, g, N)), (d.return = f), d)
      : ((d = l(d, p)), (d.return = f), d);
  }
  function x(f, d, p) {
    if ((typeof d == "string" && d !== "") || typeof d == "number")
      return ((d = _s("" + d, f.mode, p)), (d.return = f), d);
    if (typeof d == "object" && d !== null) {
      switch (d.$$typeof) {
        case Dr:
          return (
            (p = fl(d.type, d.key, d.props, null, f.mode, p)),
            (p.ref = Qn(f, null, d)),
            (p.return = f),
            p
          );
        case dn:
          return ((d = Rs(d, f.mode, p)), (d.return = f), d);
        case bt:
          var g = d._init;
          return x(f, g(d._payload), p);
      }
      if (er(d) || Vn(d))
        return ((d = Jt(d, f.mode, p, null)), (d.return = f), d);
      Xr(f, d);
    }
    return null;
  }
  function m(f, d, p, g) {
    var N = d !== null ? d.key : null;
    if ((typeof p == "string" && p !== "") || typeof p == "number")
      return N !== null ? null : a(f, d, "" + p, g);
    if (typeof p == "object" && p !== null) {
      switch (p.$$typeof) {
        case Dr:
          return p.key === N ? u(f, d, p, g) : null;
        case dn:
          return p.key === N ? c(f, d, p, g) : null;
        case bt:
          return ((N = p._init), m(f, d, N(p._payload), g));
      }
      if (er(p) || Vn(p)) return N !== null ? null : h(f, d, p, g, null);
      Xr(f, p);
    }
    return null;
  }
  function v(f, d, p, g, N) {
    if ((typeof g == "string" && g !== "") || typeof g == "number")
      return ((f = f.get(p) || null), a(d, f, "" + g, N));
    if (typeof g == "object" && g !== null) {
      switch (g.$$typeof) {
        case Dr:
          return (
            (f = f.get(g.key === null ? p : g.key) || null),
            u(d, f, g, N)
          );
        case dn:
          return (
            (f = f.get(g.key === null ? p : g.key) || null),
            c(d, f, g, N)
          );
        case bt:
          var R = g._init;
          return v(f, d, p, R(g._payload), N);
      }
      if (er(g) || Vn(g)) return ((f = f.get(p) || null), h(d, f, g, N, null));
      Xr(d, g);
    }
    return null;
  }
  function w(f, d, p, g) {
    for (
      var N = null, R = null, E = d, S = (d = 0), b = null;
      E !== null && S < p.length;
      S++
    ) {
      E.index > S ? ((b = E), (E = null)) : (b = E.sibling);
      var L = m(f, E, p[S], g);
      if (L === null) {
        E === null && (E = b);
        break;
      }
      (e && E && L.alternate === null && t(f, E),
        (d = s(L, d, S)),
        R === null ? (N = L) : (R.sibling = L),
        (R = L),
        (E = b));
    }
    if (S === p.length) return (n(f, E), te && Qt(f, S), N);
    if (E === null) {
      for (; S < p.length; S++)
        ((E = x(f, p[S], g)),
          E !== null &&
            ((d = s(E, d, S)),
            R === null ? (N = E) : (R.sibling = E),
            (R = E)));
      return (te && Qt(f, S), N);
    }
    for (E = r(f, E); S < p.length; S++)
      ((b = v(E, f, S, p[S], g)),
        b !== null &&
          (e && b.alternate !== null && E.delete(b.key === null ? S : b.key),
          (d = s(b, d, S)),
          R === null ? (N = b) : (R.sibling = b),
          (R = b)));
    return (
      e &&
        E.forEach(function (T) {
          return t(f, T);
        }),
      te && Qt(f, S),
      N
    );
  }
  function y(f, d, p, g) {
    var N = Vn(p);
    if (typeof N != "function") throw Error(P(150));
    if (((p = N.call(p)), p == null)) throw Error(P(151));
    for (
      var R = (N = null), E = d, S = (d = 0), b = null, L = p.next();
      E !== null && !L.done;
      S++, L = p.next()
    ) {
      E.index > S ? ((b = E), (E = null)) : (b = E.sibling);
      var T = m(f, E, L.value, g);
      if (T === null) {
        E === null && (E = b);
        break;
      }
      (e && E && T.alternate === null && t(f, E),
        (d = s(T, d, S)),
        R === null ? (N = T) : (R.sibling = T),
        (R = T),
        (E = b));
    }
    if (L.done) return (n(f, E), te && Qt(f, S), N);
    if (E === null) {
      for (; !L.done; S++, L = p.next())
        ((L = x(f, L.value, g)),
          L !== null &&
            ((d = s(L, d, S)),
            R === null ? (N = L) : (R.sibling = L),
            (R = L)));
      return (te && Qt(f, S), N);
    }
    for (E = r(f, E); !L.done; S++, L = p.next())
      ((L = v(E, f, S, L.value, g)),
        L !== null &&
          (e && L.alternate !== null && E.delete(L.key === null ? S : L.key),
          (d = s(L, d, S)),
          R === null ? (N = L) : (R.sibling = L),
          (R = L)));
    return (
      e &&
        E.forEach(function (D) {
          return t(f, D);
        }),
      te && Qt(f, S),
      N
    );
  }
  function j(f, d, p, g) {
    if (
      (typeof p == "object" &&
        p !== null &&
        p.type === fn &&
        p.key === null &&
        (p = p.props.children),
      typeof p == "object" && p !== null)
    ) {
      switch (p.$$typeof) {
        case Dr:
          e: {
            for (var N = p.key, R = d; R !== null; ) {
              if (R.key === N) {
                if (((N = p.type), N === fn)) {
                  if (R.tag === 7) {
                    (n(f, R.sibling),
                      (d = l(R, p.props.children)),
                      (d.return = f),
                      (f = d));
                    break e;
                  }
                } else if (
                  R.elementType === N ||
                  (typeof N == "object" &&
                    N !== null &&
                    N.$$typeof === bt &&
                    ya(N) === R.type)
                ) {
                  (n(f, R.sibling),
                    (d = l(R, p.props)),
                    (d.ref = Qn(f, R, p)),
                    (d.return = f),
                    (f = d));
                  break e;
                }
                n(f, R);
                break;
              } else t(f, R);
              R = R.sibling;
            }
            p.type === fn
              ? ((d = Jt(p.props.children, f.mode, g, p.key)),
                (d.return = f),
                (f = d))
              : ((g = fl(p.type, p.key, p.props, null, f.mode, g)),
                (g.ref = Qn(f, d, p)),
                (g.return = f),
                (f = g));
          }
          return i(f);
        case dn:
          e: {
            for (R = p.key; d !== null; ) {
              if (d.key === R)
                if (
                  d.tag === 4 &&
                  d.stateNode.containerInfo === p.containerInfo &&
                  d.stateNode.implementation === p.implementation
                ) {
                  (n(f, d.sibling),
                    (d = l(d, p.children || [])),
                    (d.return = f),
                    (f = d));
                  break e;
                } else {
                  n(f, d);
                  break;
                }
              else t(f, d);
              d = d.sibling;
            }
            ((d = Rs(p, f.mode, g)), (d.return = f), (f = d));
          }
          return i(f);
        case bt:
          return ((R = p._init), j(f, d, R(p._payload), g));
      }
      if (er(p)) return w(f, d, p, g);
      if (Vn(p)) return y(f, d, p, g);
      Xr(f, p);
    }
    return (typeof p == "string" && p !== "") || typeof p == "number"
      ? ((p = "" + p),
        d !== null && d.tag === 6
          ? (n(f, d.sibling), (d = l(d, p)), (d.return = f), (f = d))
          : (n(f, d), (d = _s(p, f.mode, g)), (d.return = f), (f = d)),
        i(f))
      : n(f, d);
  }
  return j;
}
var Tn = xc(!0),
  yc = xc(!1),
  bl = Bt(null),
  Pl = null,
  wn = null,
  si = null;
function oi() {
  si = wn = Pl = null;
}
function ii(e) {
  var t = bl.current;
  (ee(bl), (e._currentValue = t));
}
function ho(e, t, n) {
  for (; e !== null; ) {
    var r = e.alternate;
    if (
      ((e.childLanes & t) !== t
        ? ((e.childLanes |= t), r !== null && (r.childLanes |= t))
        : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t),
      e === n)
    )
      break;
    e = e.return;
  }
}
function bn(e, t) {
  ((Pl = e),
    (si = wn = null),
    (e = e.dependencies),
    e !== null &&
      e.firstContext !== null &&
      (e.lanes & t && (_e = !0), (e.firstContext = null)));
}
function Ge(e) {
  var t = e._currentValue;
  if (si !== e)
    if (((e = { context: e, memoizedValue: t, next: null }), wn === null)) {
      if (Pl === null) throw Error(P(308));
      ((wn = e), (Pl.dependencies = { lanes: 0, firstContext: e }));
    } else wn = wn.next = e;
  return t;
}
var Xt = null;
function ai(e) {
  Xt === null ? (Xt = [e]) : Xt.push(e);
}
function vc(e, t, n, r) {
  var l = t.interleaved;
  return (
    l === null ? ((n.next = n), ai(t)) : ((n.next = l.next), (l.next = n)),
    (t.interleaved = n),
    vt(e, r)
  );
}
function vt(e, t) {
  e.lanes |= t;
  var n = e.alternate;
  for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; )
    ((e.childLanes |= t),
      (n = e.alternate),
      n !== null && (n.childLanes |= t),
      (n = e),
      (e = e.return));
  return n.tag === 3 ? n.stateNode : null;
}
var Pt = !1;
function ui(e) {
  e.updateQueue = {
    baseState: e.memoizedState,
    firstBaseUpdate: null,
    lastBaseUpdate: null,
    shared: { pending: null, interleaved: null, lanes: 0 },
    effects: null,
  };
}
function wc(e, t) {
  ((e = e.updateQueue),
    t.updateQueue === e &&
      (t.updateQueue = {
        baseState: e.baseState,
        firstBaseUpdate: e.firstBaseUpdate,
        lastBaseUpdate: e.lastBaseUpdate,
        shared: e.shared,
        effects: e.effects,
      }));
}
function gt(e, t) {
  return {
    eventTime: e,
    lane: t,
    tag: 0,
    payload: null,
    callback: null,
    next: null,
  };
}
function Ot(e, t, n) {
  var r = e.updateQueue;
  if (r === null) return null;
  if (((r = r.shared), K & 2)) {
    var l = r.pending;
    return (
      l === null ? (t.next = t) : ((t.next = l.next), (l.next = t)),
      (r.pending = t),
      vt(e, n)
    );
  }
  return (
    (l = r.interleaved),
    l === null ? ((t.next = t), ai(r)) : ((t.next = l.next), (l.next = t)),
    (r.interleaved = t),
    vt(e, n)
  );
}
function ol(e, t, n) {
  if (
    ((t = t.updateQueue), t !== null && ((t = t.shared), (n & 4194240) !== 0))
  ) {
    var r = t.lanes;
    ((r &= e.pendingLanes), (n |= r), (t.lanes = n), Ko(e, n));
  }
}
function va(e, t) {
  var n = e.updateQueue,
    r = e.alternate;
  if (r !== null && ((r = r.updateQueue), n === r)) {
    var l = null,
      s = null;
    if (((n = n.firstBaseUpdate), n !== null)) {
      do {
        var i = {
          eventTime: n.eventTime,
          lane: n.lane,
          tag: n.tag,
          payload: n.payload,
          callback: n.callback,
          next: null,
        };
        (s === null ? (l = s = i) : (s = s.next = i), (n = n.next));
      } while (n !== null);
      s === null ? (l = s = t) : (s = s.next = t);
    } else l = s = t;
    ((n = {
      baseState: r.baseState,
      firstBaseUpdate: l,
      lastBaseUpdate: s,
      shared: r.shared,
      effects: r.effects,
    }),
      (e.updateQueue = n));
    return;
  }
  ((e = n.lastBaseUpdate),
    e === null ? (n.firstBaseUpdate = t) : (e.next = t),
    (n.lastBaseUpdate = t));
}
function _l(e, t, n, r) {
  var l = e.updateQueue;
  Pt = !1;
  var s = l.firstBaseUpdate,
    i = l.lastBaseUpdate,
    a = l.shared.pending;
  if (a !== null) {
    l.shared.pending = null;
    var u = a,
      c = u.next;
    ((u.next = null), i === null ? (s = c) : (i.next = c), (i = u));
    var h = e.alternate;
    h !== null &&
      ((h = h.updateQueue),
      (a = h.lastBaseUpdate),
      a !== i &&
        (a === null ? (h.firstBaseUpdate = c) : (a.next = c),
        (h.lastBaseUpdate = u)));
  }
  if (s !== null) {
    var x = l.baseState;
    ((i = 0), (h = c = u = null), (a = s));
    do {
      var m = a.lane,
        v = a.eventTime;
      if ((r & m) === m) {
        h !== null &&
          (h = h.next =
            {
              eventTime: v,
              lane: 0,
              tag: a.tag,
              payload: a.payload,
              callback: a.callback,
              next: null,
            });
        e: {
          var w = e,
            y = a;
          switch (((m = t), (v = n), y.tag)) {
            case 1:
              if (((w = y.payload), typeof w == "function")) {
                x = w.call(v, x, m);
                break e;
              }
              x = w;
              break e;
            case 3:
              w.flags = (w.flags & -65537) | 128;
            case 0:
              if (
                ((w = y.payload),
                (m = typeof w == "function" ? w.call(v, x, m) : w),
                m == null)
              )
                break e;
              x = le({}, x, m);
              break e;
            case 2:
              Pt = !0;
          }
        }
        a.callback !== null &&
          a.lane !== 0 &&
          ((e.flags |= 64),
          (m = l.effects),
          m === null ? (l.effects = [a]) : m.push(a));
      } else
        ((v = {
          eventTime: v,
          lane: m,
          tag: a.tag,
          payload: a.payload,
          callback: a.callback,
          next: null,
        }),
          h === null ? ((c = h = v), (u = x)) : (h = h.next = v),
          (i |= m));
      if (((a = a.next), a === null)) {
        if (((a = l.shared.pending), a === null)) break;
        ((m = a),
          (a = m.next),
          (m.next = null),
          (l.lastBaseUpdate = m),
          (l.shared.pending = null));
      }
    } while (!0);
    if (
      (h === null && (u = x),
      (l.baseState = u),
      (l.firstBaseUpdate = c),
      (l.lastBaseUpdate = h),
      (t = l.shared.interleaved),
      t !== null)
    ) {
      l = t;
      do ((i |= l.lane), (l = l.next));
      while (l !== t);
    } else s === null && (l.shared.lanes = 0);
    ((ln |= i), (e.lanes = i), (e.memoizedState = x));
  }
}
function wa(e, t, n) {
  if (((e = t.effects), (t.effects = null), e !== null))
    for (t = 0; t < e.length; t++) {
      var r = e[t],
        l = r.callback;
      if (l !== null) {
        if (((r.callback = null), (r = n), typeof l != "function"))
          throw Error(P(191, l));
        l.call(r);
      }
    }
}
var Or = {},
  at = Bt(Or),
  Cr = Bt(Or),
  Er = Bt(Or);
function qt(e) {
  if (e === Or) throw Error(P(174));
  return e;
}
function ci(e, t) {
  switch ((X(Er, t), X(Cr, e), X(at, Or), (e = t.nodeType), e)) {
    case 9:
    case 11:
      t = (t = t.documentElement) ? t.namespaceURI : Ks(null, "");
      break;
    default:
      ((e = e === 8 ? t.parentNode : t),
        (t = e.namespaceURI || null),
        (e = e.tagName),
        (t = Ks(t, e)));
  }
  (ee(at), X(at, t));
}
function Mn() {
  (ee(at), ee(Cr), ee(Er));
}
function kc(e) {
  qt(Er.current);
  var t = qt(at.current),
    n = Ks(t, e.type);
  t !== n && (X(Cr, e), X(at, n));
}
function di(e) {
  Cr.current === e && (ee(at), ee(Cr));
}
var ne = Bt(0);
function Rl(e) {
  for (var t = e; t !== null; ) {
    if (t.tag === 13) {
      var n = t.memoizedState;
      if (
        n !== null &&
        ((n = n.dehydrated), n === null || n.data === "$?" || n.data === "$!")
      )
        return t;
    } else if (t.tag === 19 && t.memoizedProps.revealOrder !== void 0) {
      if (t.flags & 128) return t;
    } else if (t.child !== null) {
      ((t.child.return = t), (t = t.child));
      continue;
    }
    if (t === e) break;
    for (; t.sibling === null; ) {
      if (t.return === null || t.return === e) return null;
      t = t.return;
    }
    ((t.sibling.return = t.return), (t = t.sibling));
  }
  return null;
}
var Ns = [];
function fi() {
  for (var e = 0; e < Ns.length; e++)
    Ns[e]._workInProgressVersionPrimary = null;
  Ns.length = 0;
}
var il = kt.ReactCurrentDispatcher,
  Ss = kt.ReactCurrentBatchConfig,
  rn = 0,
  re = null,
  ce = null,
  pe = null,
  Il = !1,
  ar = !1,
  br = 0,
  Up = 0;
function ve() {
  throw Error(P(321));
}
function pi(e, t) {
  if (t === null) return !1;
  for (var n = 0; n < t.length && n < e.length; n++)
    if (!tt(e[n], t[n])) return !1;
  return !0;
}
function mi(e, t, n, r, l, s) {
  if (
    ((rn = s),
    (re = t),
    (t.memoizedState = null),
    (t.updateQueue = null),
    (t.lanes = 0),
    (il.current = e === null || e.memoizedState === null ? Fp : $p),
    (e = n(r, l)),
    ar)
  ) {
    s = 0;
    do {
      if (((ar = !1), (br = 0), 25 <= s)) throw Error(P(301));
      ((s += 1),
        (pe = ce = null),
        (t.updateQueue = null),
        (il.current = Vp),
        (e = n(r, l)));
    } while (ar);
  }
  if (
    ((il.current = Ll),
    (t = ce !== null && ce.next !== null),
    (rn = 0),
    (pe = ce = re = null),
    (Il = !1),
    t)
  )
    throw Error(P(300));
  return e;
}
function hi() {
  var e = br !== 0;
  return ((br = 0), e);
}
function st() {
  var e = {
    memoizedState: null,
    baseState: null,
    baseQueue: null,
    queue: null,
    next: null,
  };
  return (pe === null ? (re.memoizedState = pe = e) : (pe = pe.next = e), pe);
}
function Qe() {
  if (ce === null) {
    var e = re.alternate;
    e = e !== null ? e.memoizedState : null;
  } else e = ce.next;
  var t = pe === null ? re.memoizedState : pe.next;
  if (t !== null) ((pe = t), (ce = e));
  else {
    if (e === null) throw Error(P(310));
    ((ce = e),
      (e = {
        memoizedState: ce.memoizedState,
        baseState: ce.baseState,
        baseQueue: ce.baseQueue,
        queue: ce.queue,
        next: null,
      }),
      pe === null ? (re.memoizedState = pe = e) : (pe = pe.next = e));
  }
  return pe;
}
function Pr(e, t) {
  return typeof t == "function" ? t(e) : t;
}
function Cs(e) {
  var t = Qe(),
    n = t.queue;
  if (n === null) throw Error(P(311));
  n.lastRenderedReducer = e;
  var r = ce,
    l = r.baseQueue,
    s = n.pending;
  if (s !== null) {
    if (l !== null) {
      var i = l.next;
      ((l.next = s.next), (s.next = i));
    }
    ((r.baseQueue = l = s), (n.pending = null));
  }
  if (l !== null) {
    ((s = l.next), (r = r.baseState));
    var a = (i = null),
      u = null,
      c = s;
    do {
      var h = c.lane;
      if ((rn & h) === h)
        (u !== null &&
          (u = u.next =
            {
              lane: 0,
              action: c.action,
              hasEagerState: c.hasEagerState,
              eagerState: c.eagerState,
              next: null,
            }),
          (r = c.hasEagerState ? c.eagerState : e(r, c.action)));
      else {
        var x = {
          lane: h,
          action: c.action,
          hasEagerState: c.hasEagerState,
          eagerState: c.eagerState,
          next: null,
        };
        (u === null ? ((a = u = x), (i = r)) : (u = u.next = x),
          (re.lanes |= h),
          (ln |= h));
      }
      c = c.next;
    } while (c !== null && c !== s);
    (u === null ? (i = r) : (u.next = a),
      tt(r, t.memoizedState) || (_e = !0),
      (t.memoizedState = r),
      (t.baseState = i),
      (t.baseQueue = u),
      (n.lastRenderedState = r));
  }
  if (((e = n.interleaved), e !== null)) {
    l = e;
    do ((s = l.lane), (re.lanes |= s), (ln |= s), (l = l.next));
    while (l !== e);
  } else l === null && (n.lanes = 0);
  return [t.memoizedState, n.dispatch];
}
function Es(e) {
  var t = Qe(),
    n = t.queue;
  if (n === null) throw Error(P(311));
  n.lastRenderedReducer = e;
  var r = n.dispatch,
    l = n.pending,
    s = t.memoizedState;
  if (l !== null) {
    n.pending = null;
    var i = (l = l.next);
    do ((s = e(s, i.action)), (i = i.next));
    while (i !== l);
    (tt(s, t.memoizedState) || (_e = !0),
      (t.memoizedState = s),
      t.baseQueue === null && (t.baseState = s),
      (n.lastRenderedState = s));
  }
  return [s, r];
}
function jc() {}
function Nc(e, t) {
  var n = re,
    r = Qe(),
    l = t(),
    s = !tt(r.memoizedState, l);
  if (
    (s && ((r.memoizedState = l), (_e = !0)),
    (r = r.queue),
    gi(Ec.bind(null, n, r, e), [e]),
    r.getSnapshot !== t || s || (pe !== null && pe.memoizedState.tag & 1))
  ) {
    if (
      ((n.flags |= 2048),
      _r(9, Cc.bind(null, n, r, l, t), void 0, null),
      me === null)
    )
      throw Error(P(349));
    rn & 30 || Sc(n, t, l);
  }
  return l;
}
function Sc(e, t, n) {
  ((e.flags |= 16384),
    (e = { getSnapshot: t, value: n }),
    (t = re.updateQueue),
    t === null
      ? ((t = { lastEffect: null, stores: null }),
        (re.updateQueue = t),
        (t.stores = [e]))
      : ((n = t.stores), n === null ? (t.stores = [e]) : n.push(e)));
}
function Cc(e, t, n, r) {
  ((t.value = n), (t.getSnapshot = r), bc(t) && Pc(e));
}
function Ec(e, t, n) {
  return n(function () {
    bc(t) && Pc(e);
  });
}
function bc(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !tt(e, n);
  } catch {
    return !0;
  }
}
function Pc(e) {
  var t = vt(e, 1);
  t !== null && et(t, e, 1, -1);
}
function ka(e) {
  var t = st();
  return (
    typeof e == "function" && (e = e()),
    (t.memoizedState = t.baseState = e),
    (e = {
      pending: null,
      interleaved: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: Pr,
      lastRenderedState: e,
    }),
    (t.queue = e),
    (e = e.dispatch = Dp.bind(null, re, e)),
    [t.memoizedState, e]
  );
}
function _r(e, t, n, r) {
  return (
    (e = { tag: e, create: t, destroy: n, deps: r, next: null }),
    (t = re.updateQueue),
    t === null
      ? ((t = { lastEffect: null, stores: null }),
        (re.updateQueue = t),
        (t.lastEffect = e.next = e))
      : ((n = t.lastEffect),
        n === null
          ? (t.lastEffect = e.next = e)
          : ((r = n.next), (n.next = e), (e.next = r), (t.lastEffect = e))),
    e
  );
}
function _c() {
  return Qe().memoizedState;
}
function al(e, t, n, r) {
  var l = st();
  ((re.flags |= e),
    (l.memoizedState = _r(1 | t, n, void 0, r === void 0 ? null : r)));
}
function Ql(e, t, n, r) {
  var l = Qe();
  r = r === void 0 ? null : r;
  var s = void 0;
  if (ce !== null) {
    var i = ce.memoizedState;
    if (((s = i.destroy), r !== null && pi(r, i.deps))) {
      l.memoizedState = _r(t, n, s, r);
      return;
    }
  }
  ((re.flags |= e), (l.memoizedState = _r(1 | t, n, s, r)));
}
function ja(e, t) {
  return al(8390656, 8, e, t);
}
function gi(e, t) {
  return Ql(2048, 8, e, t);
}
function Rc(e, t) {
  return Ql(4, 2, e, t);
}
function Ic(e, t) {
  return Ql(4, 4, e, t);
}
function Lc(e, t) {
  if (typeof t == "function")
    return (
      (e = e()),
      t(e),
      function () {
        t(null);
      }
    );
  if (t != null)
    return (
      (e = e()),
      (t.current = e),
      function () {
        t.current = null;
      }
    );
}
function Tc(e, t, n) {
  return (
    (n = n != null ? n.concat([e]) : null),
    Ql(4, 4, Lc.bind(null, t, e), n)
  );
}
function xi() {}
function Mc(e, t) {
  var n = Qe();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && pi(t, r[1])
    ? r[0]
    : ((n.memoizedState = [e, t]), e);
}
function zc(e, t) {
  var n = Qe();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && pi(t, r[1])
    ? r[0]
    : ((e = e()), (n.memoizedState = [e, t]), e);
}
function Uc(e, t, n) {
  return rn & 21
    ? (tt(n, t) || ((n = $u()), (re.lanes |= n), (ln |= n), (e.baseState = !0)),
      t)
    : (e.baseState && ((e.baseState = !1), (_e = !0)), (e.memoizedState = n));
}
function Op(e, t) {
  var n = Y;
  ((Y = n !== 0 && 4 > n ? n : 4), e(!0));
  var r = Ss.transition;
  Ss.transition = {};
  try {
    (e(!1), t());
  } finally {
    ((Y = n), (Ss.transition = r));
  }
}
function Oc() {
  return Qe().memoizedState;
}
function Ap(e, t, n) {
  var r = Dt(e);
  if (
    ((n = {
      lane: r,
      action: n,
      hasEagerState: !1,
      eagerState: null,
      next: null,
    }),
    Ac(e))
  )
    Dc(t, n);
  else if (((n = vc(e, t, n, r)), n !== null)) {
    var l = Ce();
    (et(n, e, r, l), Fc(n, t, r));
  }
}
function Dp(e, t, n) {
  var r = Dt(e),
    l = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null };
  if (Ac(e)) Dc(t, l);
  else {
    var s = e.alternate;
    if (
      e.lanes === 0 &&
      (s === null || s.lanes === 0) &&
      ((s = t.lastRenderedReducer), s !== null)
    )
      try {
        var i = t.lastRenderedState,
          a = s(i, n);
        if (((l.hasEagerState = !0), (l.eagerState = a), tt(a, i))) {
          var u = t.interleaved;
          (u === null
            ? ((l.next = l), ai(t))
            : ((l.next = u.next), (u.next = l)),
            (t.interleaved = l));
          return;
        }
      } catch {
      } finally {
      }
    ((n = vc(e, t, l, r)),
      n !== null && ((l = Ce()), et(n, e, r, l), Fc(n, t, r)));
  }
}
function Ac(e) {
  var t = e.alternate;
  return e === re || (t !== null && t === re);
}
function Dc(e, t) {
  ar = Il = !0;
  var n = e.pending;
  (n === null ? (t.next = t) : ((t.next = n.next), (n.next = t)),
    (e.pending = t));
}
function Fc(e, t, n) {
  if (n & 4194240) {
    var r = t.lanes;
    ((r &= e.pendingLanes), (n |= r), (t.lanes = n), Ko(e, n));
  }
}
var Ll = {
    readContext: Ge,
    useCallback: ve,
    useContext: ve,
    useEffect: ve,
    useImperativeHandle: ve,
    useInsertionEffect: ve,
    useLayoutEffect: ve,
    useMemo: ve,
    useReducer: ve,
    useRef: ve,
    useState: ve,
    useDebugValue: ve,
    useDeferredValue: ve,
    useTransition: ve,
    useMutableSource: ve,
    useSyncExternalStore: ve,
    useId: ve,
    unstable_isNewReconciler: !1,
  },
  Fp = {
    readContext: Ge,
    useCallback: function (e, t) {
      return ((st().memoizedState = [e, t === void 0 ? null : t]), e);
    },
    useContext: Ge,
    useEffect: ja,
    useImperativeHandle: function (e, t, n) {
      return (
        (n = n != null ? n.concat([e]) : null),
        al(4194308, 4, Lc.bind(null, t, e), n)
      );
    },
    useLayoutEffect: function (e, t) {
      return al(4194308, 4, e, t);
    },
    useInsertionEffect: function (e, t) {
      return al(4, 2, e, t);
    },
    useMemo: function (e, t) {
      var n = st();
      return (
        (t = t === void 0 ? null : t),
        (e = e()),
        (n.memoizedState = [e, t]),
        e
      );
    },
    useReducer: function (e, t, n) {
      var r = st();
      return (
        (t = n !== void 0 ? n(t) : t),
        (r.memoizedState = r.baseState = t),
        (e = {
          pending: null,
          interleaved: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: e,
          lastRenderedState: t,
        }),
        (r.queue = e),
        (e = e.dispatch = Ap.bind(null, re, e)),
        [r.memoizedState, e]
      );
    },
    useRef: function (e) {
      var t = st();
      return ((e = { current: e }), (t.memoizedState = e));
    },
    useState: ka,
    useDebugValue: xi,
    useDeferredValue: function (e) {
      return (st().memoizedState = e);
    },
    useTransition: function () {
      var e = ka(!1),
        t = e[0];
      return ((e = Op.bind(null, e[1])), (st().memoizedState = e), [t, e]);
    },
    useMutableSource: function () {},
    useSyncExternalStore: function (e, t, n) {
      var r = re,
        l = st();
      if (te) {
        if (n === void 0) throw Error(P(407));
        n = n();
      } else {
        if (((n = t()), me === null)) throw Error(P(349));
        rn & 30 || Sc(r, t, n);
      }
      l.memoizedState = n;
      var s = { value: n, getSnapshot: t };
      return (
        (l.queue = s),
        ja(Ec.bind(null, r, s, e), [e]),
        (r.flags |= 2048),
        _r(9, Cc.bind(null, r, s, n, t), void 0, null),
        n
      );
    },
    useId: function () {
      var e = st(),
        t = me.identifierPrefix;
      if (te) {
        var n = ht,
          r = mt;
        ((n = (r & ~(1 << (32 - Je(r) - 1))).toString(32) + n),
          (t = ":" + t + "R" + n),
          (n = br++),
          0 < n && (t += "H" + n.toString(32)),
          (t += ":"));
      } else ((n = Up++), (t = ":" + t + "r" + n.toString(32) + ":"));
      return (e.memoizedState = t);
    },
    unstable_isNewReconciler: !1,
  },
  $p = {
    readContext: Ge,
    useCallback: Mc,
    useContext: Ge,
    useEffect: gi,
    useImperativeHandle: Tc,
    useInsertionEffect: Rc,
    useLayoutEffect: Ic,
    useMemo: zc,
    useReducer: Cs,
    useRef: _c,
    useState: function () {
      return Cs(Pr);
    },
    useDebugValue: xi,
    useDeferredValue: function (e) {
      var t = Qe();
      return Uc(t, ce.memoizedState, e);
    },
    useTransition: function () {
      var e = Cs(Pr)[0],
        t = Qe().memoizedState;
      return [e, t];
    },
    useMutableSource: jc,
    useSyncExternalStore: Nc,
    useId: Oc,
    unstable_isNewReconciler: !1,
  },
  Vp = {
    readContext: Ge,
    useCallback: Mc,
    useContext: Ge,
    useEffect: gi,
    useImperativeHandle: Tc,
    useInsertionEffect: Rc,
    useLayoutEffect: Ic,
    useMemo: zc,
    useReducer: Es,
    useRef: _c,
    useState: function () {
      return Es(Pr);
    },
    useDebugValue: xi,
    useDeferredValue: function (e) {
      var t = Qe();
      return ce === null ? (t.memoizedState = e) : Uc(t, ce.memoizedState, e);
    },
    useTransition: function () {
      var e = Es(Pr)[0],
        t = Qe().memoizedState;
      return [e, t];
    },
    useMutableSource: jc,
    useSyncExternalStore: Nc,
    useId: Oc,
    unstable_isNewReconciler: !1,
  };
function Xe(e, t) {
  if (e && e.defaultProps) {
    ((t = le({}, t)), (e = e.defaultProps));
    for (var n in e) t[n] === void 0 && (t[n] = e[n]);
    return t;
  }
  return t;
}
function go(e, t, n, r) {
  ((t = e.memoizedState),
    (n = n(r, t)),
    (n = n == null ? t : le({}, t, n)),
    (e.memoizedState = n),
    e.lanes === 0 && (e.updateQueue.baseState = n));
}
var Kl = {
  isMounted: function (e) {
    return (e = e._reactInternals) ? an(e) === e : !1;
  },
  enqueueSetState: function (e, t, n) {
    e = e._reactInternals;
    var r = Ce(),
      l = Dt(e),
      s = gt(r, l);
    ((s.payload = t),
      n != null && (s.callback = n),
      (t = Ot(e, s, l)),
      t !== null && (et(t, e, l, r), ol(t, e, l)));
  },
  enqueueReplaceState: function (e, t, n) {
    e = e._reactInternals;
    var r = Ce(),
      l = Dt(e),
      s = gt(r, l);
    ((s.tag = 1),
      (s.payload = t),
      n != null && (s.callback = n),
      (t = Ot(e, s, l)),
      t !== null && (et(t, e, l, r), ol(t, e, l)));
  },
  enqueueForceUpdate: function (e, t) {
    e = e._reactInternals;
    var n = Ce(),
      r = Dt(e),
      l = gt(n, r);
    ((l.tag = 2),
      t != null && (l.callback = t),
      (t = Ot(e, l, r)),
      t !== null && (et(t, e, r, n), ol(t, e, r)));
  },
};
function Na(e, t, n, r, l, s, i) {
  return (
    (e = e.stateNode),
    typeof e.shouldComponentUpdate == "function"
      ? e.shouldComponentUpdate(r, s, i)
      : t.prototype && t.prototype.isPureReactComponent
        ? !kr(n, r) || !kr(l, s)
        : !0
  );
}
function $c(e, t, n) {
  var r = !1,
    l = Vt,
    s = t.contextType;
  return (
    typeof s == "object" && s !== null
      ? (s = Ge(s))
      : ((l = Ie(t) ? tn : je.current),
        (r = t.contextTypes),
        (s = (r = r != null) ? In(e, l) : Vt)),
    (t = new t(n, s)),
    (e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null),
    (t.updater = Kl),
    (e.stateNode = t),
    (t._reactInternals = e),
    r &&
      ((e = e.stateNode),
      (e.__reactInternalMemoizedUnmaskedChildContext = l),
      (e.__reactInternalMemoizedMaskedChildContext = s)),
    t
  );
}
function Sa(e, t, n, r) {
  ((e = t.state),
    typeof t.componentWillReceiveProps == "function" &&
      t.componentWillReceiveProps(n, r),
    typeof t.UNSAFE_componentWillReceiveProps == "function" &&
      t.UNSAFE_componentWillReceiveProps(n, r),
    t.state !== e && Kl.enqueueReplaceState(t, t.state, null));
}
function xo(e, t, n, r) {
  var l = e.stateNode;
  ((l.props = n), (l.state = e.memoizedState), (l.refs = {}), ui(e));
  var s = t.contextType;
  (typeof s == "object" && s !== null
    ? (l.context = Ge(s))
    : ((s = Ie(t) ? tn : je.current), (l.context = In(e, s))),
    (l.state = e.memoizedState),
    (s = t.getDerivedStateFromProps),
    typeof s == "function" && (go(e, t, s, n), (l.state = e.memoizedState)),
    typeof t.getDerivedStateFromProps == "function" ||
      typeof l.getSnapshotBeforeUpdate == "function" ||
      (typeof l.UNSAFE_componentWillMount != "function" &&
        typeof l.componentWillMount != "function") ||
      ((t = l.state),
      typeof l.componentWillMount == "function" && l.componentWillMount(),
      typeof l.UNSAFE_componentWillMount == "function" &&
        l.UNSAFE_componentWillMount(),
      t !== l.state && Kl.enqueueReplaceState(l, l.state, null),
      _l(e, n, l, r),
      (l.state = e.memoizedState)),
    typeof l.componentDidMount == "function" && (e.flags |= 4194308));
}
function zn(e, t) {
  try {
    var n = "",
      r = t;
    do ((n += gf(r)), (r = r.return));
    while (r);
    var l = n;
  } catch (s) {
    l =
      `
Error generating stack: ` +
      s.message +
      `
` +
      s.stack;
  }
  return { value: e, source: t, stack: l, digest: null };
}
function bs(e, t, n) {
  return { value: e, source: null, stack: n ?? null, digest: t ?? null };
}
function yo(e, t) {
  try {
    console.error(t.value);
  } catch (n) {
    setTimeout(function () {
      throw n;
    });
  }
}
var Wp = typeof WeakMap == "function" ? WeakMap : Map;
function Vc(e, t, n) {
  ((n = gt(-1, n)), (n.tag = 3), (n.payload = { element: null }));
  var r = t.value;
  return (
    (n.callback = function () {
      (Ml || ((Ml = !0), (Po = r)), yo(e, t));
    }),
    n
  );
}
function Wc(e, t, n) {
  ((n = gt(-1, n)), (n.tag = 3));
  var r = e.type.getDerivedStateFromError;
  if (typeof r == "function") {
    var l = t.value;
    ((n.payload = function () {
      return r(l);
    }),
      (n.callback = function () {
        yo(e, t);
      }));
  }
  var s = e.stateNode;
  return (
    s !== null &&
      typeof s.componentDidCatch == "function" &&
      (n.callback = function () {
        (yo(e, t),
          typeof r != "function" &&
            (At === null ? (At = new Set([this])) : At.add(this)));
        var i = t.stack;
        this.componentDidCatch(t.value, {
          componentStack: i !== null ? i : "",
        });
      }),
    n
  );
}
function Ca(e, t, n) {
  var r = e.pingCache;
  if (r === null) {
    r = e.pingCache = new Wp();
    var l = new Set();
    r.set(t, l);
  } else ((l = r.get(t)), l === void 0 && ((l = new Set()), r.set(t, l)));
  l.has(n) || (l.add(n), (e = rm.bind(null, e, t, n)), t.then(e, e));
}
function Ea(e) {
  do {
    var t;
    if (
      ((t = e.tag === 13) &&
        ((t = e.memoizedState), (t = t !== null ? t.dehydrated !== null : !0)),
      t)
    )
      return e;
    e = e.return;
  } while (e !== null);
  return null;
}
function ba(e, t, n, r, l) {
  return e.mode & 1
    ? ((e.flags |= 65536), (e.lanes = l), e)
    : (e === t
        ? (e.flags |= 65536)
        : ((e.flags |= 128),
          (n.flags |= 131072),
          (n.flags &= -52805),
          n.tag === 1 &&
            (n.alternate === null
              ? (n.tag = 17)
              : ((t = gt(-1, 1)), (t.tag = 2), Ot(n, t, 1))),
          (n.lanes |= 1)),
      e);
}
var Bp = kt.ReactCurrentOwner,
  _e = !1;
function Ne(e, t, n, r) {
  t.child = e === null ? yc(t, null, n, r) : Tn(t, e.child, n, r);
}
function Pa(e, t, n, r, l) {
  n = n.render;
  var s = t.ref;
  return (
    bn(t, l),
    (r = mi(e, t, n, r, s, l)),
    (n = hi()),
    e !== null && !_e
      ? ((t.updateQueue = e.updateQueue),
        (t.flags &= -2053),
        (e.lanes &= ~l),
        wt(e, t, l))
      : (te && n && ni(t), (t.flags |= 1), Ne(e, t, r, l), t.child)
  );
}
function _a(e, t, n, r, l) {
  if (e === null) {
    var s = n.type;
    return typeof s == "function" &&
      !Ci(s) &&
      s.defaultProps === void 0 &&
      n.compare === null &&
      n.defaultProps === void 0
      ? ((t.tag = 15), (t.type = s), Bc(e, t, s, r, l))
      : ((e = fl(n.type, null, r, t, t.mode, l)),
        (e.ref = t.ref),
        (e.return = t),
        (t.child = e));
  }
  if (((s = e.child), !(e.lanes & l))) {
    var i = s.memoizedProps;
    if (
      ((n = n.compare), (n = n !== null ? n : kr), n(i, r) && e.ref === t.ref)
    )
      return wt(e, t, l);
  }
  return (
    (t.flags |= 1),
    (e = Ft(s, r)),
    (e.ref = t.ref),
    (e.return = t),
    (t.child = e)
  );
}
function Bc(e, t, n, r, l) {
  if (e !== null) {
    var s = e.memoizedProps;
    if (kr(s, r) && e.ref === t.ref)
      if (((_e = !1), (t.pendingProps = r = s), (e.lanes & l) !== 0))
        e.flags & 131072 && (_e = !0);
      else return ((t.lanes = e.lanes), wt(e, t, l));
  }
  return vo(e, t, n, r, l);
}
function Hc(e, t, n) {
  var r = t.pendingProps,
    l = r.children,
    s = e !== null ? e.memoizedState : null;
  if (r.mode === "hidden")
    if (!(t.mode & 1))
      ((t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }),
        X(jn, Me),
        (Me |= n));
    else {
      if (!(n & 1073741824))
        return (
          (e = s !== null ? s.baseLanes | n : n),
          (t.lanes = t.childLanes = 1073741824),
          (t.memoizedState = {
            baseLanes: e,
            cachePool: null,
            transitions: null,
          }),
          (t.updateQueue = null),
          X(jn, Me),
          (Me |= e),
          null
        );
      ((t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }),
        (r = s !== null ? s.baseLanes : n),
        X(jn, Me),
        (Me |= r));
    }
  else
    (s !== null ? ((r = s.baseLanes | n), (t.memoizedState = null)) : (r = n),
      X(jn, Me),
      (Me |= r));
  return (Ne(e, t, l, n), t.child);
}
function Gc(e, t) {
  var n = t.ref;
  ((e === null && n !== null) || (e !== null && e.ref !== n)) &&
    ((t.flags |= 512), (t.flags |= 2097152));
}
function vo(e, t, n, r, l) {
  var s = Ie(n) ? tn : je.current;
  return (
    (s = In(t, s)),
    bn(t, l),
    (n = mi(e, t, n, r, s, l)),
    (r = hi()),
    e !== null && !_e
      ? ((t.updateQueue = e.updateQueue),
        (t.flags &= -2053),
        (e.lanes &= ~l),
        wt(e, t, l))
      : (te && r && ni(t), (t.flags |= 1), Ne(e, t, n, l), t.child)
  );
}
function Ra(e, t, n, r, l) {
  if (Ie(n)) {
    var s = !0;
    Sl(t);
  } else s = !1;
  if ((bn(t, l), t.stateNode === null))
    (ul(e, t), $c(t, n, r), xo(t, n, r, l), (r = !0));
  else if (e === null) {
    var i = t.stateNode,
      a = t.memoizedProps;
    i.props = a;
    var u = i.context,
      c = n.contextType;
    typeof c == "object" && c !== null
      ? (c = Ge(c))
      : ((c = Ie(n) ? tn : je.current), (c = In(t, c)));
    var h = n.getDerivedStateFromProps,
      x =
        typeof h == "function" ||
        typeof i.getSnapshotBeforeUpdate == "function";
    (x ||
      (typeof i.UNSAFE_componentWillReceiveProps != "function" &&
        typeof i.componentWillReceiveProps != "function") ||
      ((a !== r || u !== c) && Sa(t, i, r, c)),
      (Pt = !1));
    var m = t.memoizedState;
    ((i.state = m),
      _l(t, r, i, l),
      (u = t.memoizedState),
      a !== r || m !== u || Re.current || Pt
        ? (typeof h == "function" && (go(t, n, h, r), (u = t.memoizedState)),
          (a = Pt || Na(t, n, a, r, m, u, c))
            ? (x ||
                (typeof i.UNSAFE_componentWillMount != "function" &&
                  typeof i.componentWillMount != "function") ||
                (typeof i.componentWillMount == "function" &&
                  i.componentWillMount(),
                typeof i.UNSAFE_componentWillMount == "function" &&
                  i.UNSAFE_componentWillMount()),
              typeof i.componentDidMount == "function" && (t.flags |= 4194308))
            : (typeof i.componentDidMount == "function" && (t.flags |= 4194308),
              (t.memoizedProps = r),
              (t.memoizedState = u)),
          (i.props = r),
          (i.state = u),
          (i.context = c),
          (r = a))
        : (typeof i.componentDidMount == "function" && (t.flags |= 4194308),
          (r = !1)));
  } else {
    ((i = t.stateNode),
      wc(e, t),
      (a = t.memoizedProps),
      (c = t.type === t.elementType ? a : Xe(t.type, a)),
      (i.props = c),
      (x = t.pendingProps),
      (m = i.context),
      (u = n.contextType),
      typeof u == "object" && u !== null
        ? (u = Ge(u))
        : ((u = Ie(n) ? tn : je.current), (u = In(t, u))));
    var v = n.getDerivedStateFromProps;
    ((h =
      typeof v == "function" ||
      typeof i.getSnapshotBeforeUpdate == "function") ||
      (typeof i.UNSAFE_componentWillReceiveProps != "function" &&
        typeof i.componentWillReceiveProps != "function") ||
      ((a !== x || m !== u) && Sa(t, i, r, u)),
      (Pt = !1),
      (m = t.memoizedState),
      (i.state = m),
      _l(t, r, i, l));
    var w = t.memoizedState;
    a !== x || m !== w || Re.current || Pt
      ? (typeof v == "function" && (go(t, n, v, r), (w = t.memoizedState)),
        (c = Pt || Na(t, n, c, r, m, w, u) || !1)
          ? (h ||
              (typeof i.UNSAFE_componentWillUpdate != "function" &&
                typeof i.componentWillUpdate != "function") ||
              (typeof i.componentWillUpdate == "function" &&
                i.componentWillUpdate(r, w, u),
              typeof i.UNSAFE_componentWillUpdate == "function" &&
                i.UNSAFE_componentWillUpdate(r, w, u)),
            typeof i.componentDidUpdate == "function" && (t.flags |= 4),
            typeof i.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024))
          : (typeof i.componentDidUpdate != "function" ||
              (a === e.memoizedProps && m === e.memoizedState) ||
              (t.flags |= 4),
            typeof i.getSnapshotBeforeUpdate != "function" ||
              (a === e.memoizedProps && m === e.memoizedState) ||
              (t.flags |= 1024),
            (t.memoizedProps = r),
            (t.memoizedState = w)),
        (i.props = r),
        (i.state = w),
        (i.context = u),
        (r = c))
      : (typeof i.componentDidUpdate != "function" ||
          (a === e.memoizedProps && m === e.memoizedState) ||
          (t.flags |= 4),
        typeof i.getSnapshotBeforeUpdate != "function" ||
          (a === e.memoizedProps && m === e.memoizedState) ||
          (t.flags |= 1024),
        (r = !1));
  }
  return wo(e, t, n, r, s, l);
}
function wo(e, t, n, r, l, s) {
  Gc(e, t);
  var i = (t.flags & 128) !== 0;
  if (!r && !i) return (l && ha(t, n, !1), wt(e, t, s));
  ((r = t.stateNode), (Bp.current = t));
  var a =
    i && typeof n.getDerivedStateFromError != "function" ? null : r.render();
  return (
    (t.flags |= 1),
    e !== null && i
      ? ((t.child = Tn(t, e.child, null, s)), (t.child = Tn(t, null, a, s)))
      : Ne(e, t, a, s),
    (t.memoizedState = r.state),
    l && ha(t, n, !0),
    t.child
  );
}
function Qc(e) {
  var t = e.stateNode;
  (t.pendingContext
    ? ma(e, t.pendingContext, t.pendingContext !== t.context)
    : t.context && ma(e, t.context, !1),
    ci(e, t.containerInfo));
}
function Ia(e, t, n, r, l) {
  return (Ln(), li(l), (t.flags |= 256), Ne(e, t, n, r), t.child);
}
var ko = { dehydrated: null, treeContext: null, retryLane: 0 };
function jo(e) {
  return { baseLanes: e, cachePool: null, transitions: null };
}
function Kc(e, t, n) {
  var r = t.pendingProps,
    l = ne.current,
    s = !1,
    i = (t.flags & 128) !== 0,
    a;
  if (
    ((a = i) ||
      (a = e !== null && e.memoizedState === null ? !1 : (l & 2) !== 0),
    a
      ? ((s = !0), (t.flags &= -129))
      : (e === null || e.memoizedState !== null) && (l |= 1),
    X(ne, l & 1),
    e === null)
  )
    return (
      mo(t),
      (e = t.memoizedState),
      e !== null && ((e = e.dehydrated), e !== null)
        ? (t.mode & 1
            ? e.data === "$!"
              ? (t.lanes = 8)
              : (t.lanes = 1073741824)
            : (t.lanes = 1),
          null)
        : ((i = r.children),
          (e = r.fallback),
          s
            ? ((r = t.mode),
              (s = t.child),
              (i = { mode: "hidden", children: i }),
              !(r & 1) && s !== null
                ? ((s.childLanes = 0), (s.pendingProps = i))
                : (s = ql(i, r, 0, null)),
              (e = Jt(e, r, n, null)),
              (s.return = t),
              (e.return = t),
              (s.sibling = e),
              (t.child = s),
              (t.child.memoizedState = jo(n)),
              (t.memoizedState = ko),
              e)
            : yi(t, i))
    );
  if (((l = e.memoizedState), l !== null && ((a = l.dehydrated), a !== null)))
    return Hp(e, t, i, r, a, l, n);
  if (s) {
    ((s = r.fallback), (i = t.mode), (l = e.child), (a = l.sibling));
    var u = { mode: "hidden", children: r.children };
    return (
      !(i & 1) && t.child !== l
        ? ((r = t.child),
          (r.childLanes = 0),
          (r.pendingProps = u),
          (t.deletions = null))
        : ((r = Ft(l, u)), (r.subtreeFlags = l.subtreeFlags & 14680064)),
      a !== null ? (s = Ft(a, s)) : ((s = Jt(s, i, n, null)), (s.flags |= 2)),
      (s.return = t),
      (r.return = t),
      (r.sibling = s),
      (t.child = r),
      (r = s),
      (s = t.child),
      (i = e.child.memoizedState),
      (i =
        i === null
          ? jo(n)
          : {
              baseLanes: i.baseLanes | n,
              cachePool: null,
              transitions: i.transitions,
            }),
      (s.memoizedState = i),
      (s.childLanes = e.childLanes & ~n),
      (t.memoizedState = ko),
      r
    );
  }
  return (
    (s = e.child),
    (e = s.sibling),
    (r = Ft(s, { mode: "visible", children: r.children })),
    !(t.mode & 1) && (r.lanes = n),
    (r.return = t),
    (r.sibling = null),
    e !== null &&
      ((n = t.deletions),
      n === null ? ((t.deletions = [e]), (t.flags |= 16)) : n.push(e)),
    (t.child = r),
    (t.memoizedState = null),
    r
  );
}
function yi(e, t) {
  return (
    (t = ql({ mode: "visible", children: t }, e.mode, 0, null)),
    (t.return = e),
    (e.child = t)
  );
}
function qr(e, t, n, r) {
  return (
    r !== null && li(r),
    Tn(t, e.child, null, n),
    (e = yi(t, t.pendingProps.children)),
    (e.flags |= 2),
    (t.memoizedState = null),
    e
  );
}
function Hp(e, t, n, r, l, s, i) {
  if (n)
    return t.flags & 256
      ? ((t.flags &= -257), (r = bs(Error(P(422)))), qr(e, t, i, r))
      : t.memoizedState !== null
        ? ((t.child = e.child), (t.flags |= 128), null)
        : ((s = r.fallback),
          (l = t.mode),
          (r = ql({ mode: "visible", children: r.children }, l, 0, null)),
          (s = Jt(s, l, i, null)),
          (s.flags |= 2),
          (r.return = t),
          (s.return = t),
          (r.sibling = s),
          (t.child = r),
          t.mode & 1 && Tn(t, e.child, null, i),
          (t.child.memoizedState = jo(i)),
          (t.memoizedState = ko),
          s);
  if (!(t.mode & 1)) return qr(e, t, i, null);
  if (l.data === "$!") {
    if (((r = l.nextSibling && l.nextSibling.dataset), r)) var a = r.dgst;
    return (
      (r = a),
      (s = Error(P(419))),
      (r = bs(s, r, void 0)),
      qr(e, t, i, r)
    );
  }
  if (((a = (i & e.childLanes) !== 0), _e || a)) {
    if (((r = me), r !== null)) {
      switch (i & -i) {
        case 4:
          l = 2;
          break;
        case 16:
          l = 8;
          break;
        case 64:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
        case 67108864:
          l = 32;
          break;
        case 536870912:
          l = 268435456;
          break;
        default:
          l = 0;
      }
      ((l = l & (r.suspendedLanes | i) ? 0 : l),
        l !== 0 &&
          l !== s.retryLane &&
          ((s.retryLane = l), vt(e, l), et(r, e, l, -1)));
    }
    return (Si(), (r = bs(Error(P(421)))), qr(e, t, i, r));
  }
  return l.data === "$?"
    ? ((t.flags |= 128),
      (t.child = e.child),
      (t = lm.bind(null, e)),
      (l._reactRetry = t),
      null)
    : ((e = s.treeContext),
      (ze = Ut(l.nextSibling)),
      (Ue = t),
      (te = !0),
      (Ze = null),
      e !== null &&
        ((Ve[We++] = mt),
        (Ve[We++] = ht),
        (Ve[We++] = nn),
        (mt = e.id),
        (ht = e.overflow),
        (nn = t)),
      (t = yi(t, r.children)),
      (t.flags |= 4096),
      t);
}
function La(e, t, n) {
  e.lanes |= t;
  var r = e.alternate;
  (r !== null && (r.lanes |= t), ho(e.return, t, n));
}
function Ps(e, t, n, r, l) {
  var s = e.memoizedState;
  s === null
    ? (e.memoizedState = {
        isBackwards: t,
        rendering: null,
        renderingStartTime: 0,
        last: r,
        tail: n,
        tailMode: l,
      })
    : ((s.isBackwards = t),
      (s.rendering = null),
      (s.renderingStartTime = 0),
      (s.last = r),
      (s.tail = n),
      (s.tailMode = l));
}
function Yc(e, t, n) {
  var r = t.pendingProps,
    l = r.revealOrder,
    s = r.tail;
  if ((Ne(e, t, r.children, n), (r = ne.current), r & 2))
    ((r = (r & 1) | 2), (t.flags |= 128));
  else {
    if (e !== null && e.flags & 128)
      e: for (e = t.child; e !== null; ) {
        if (e.tag === 13) e.memoizedState !== null && La(e, n, t);
        else if (e.tag === 19) La(e, n, t);
        else if (e.child !== null) {
          ((e.child.return = e), (e = e.child));
          continue;
        }
        if (e === t) break e;
        for (; e.sibling === null; ) {
          if (e.return === null || e.return === t) break e;
          e = e.return;
        }
        ((e.sibling.return = e.return), (e = e.sibling));
      }
    r &= 1;
  }
  if ((X(ne, r), !(t.mode & 1))) t.memoizedState = null;
  else
    switch (l) {
      case "forwards":
        for (n = t.child, l = null; n !== null; )
          ((e = n.alternate),
            e !== null && Rl(e) === null && (l = n),
            (n = n.sibling));
        ((n = l),
          n === null
            ? ((l = t.child), (t.child = null))
            : ((l = n.sibling), (n.sibling = null)),
          Ps(t, !1, l, n, s));
        break;
      case "backwards":
        for (n = null, l = t.child, t.child = null; l !== null; ) {
          if (((e = l.alternate), e !== null && Rl(e) === null)) {
            t.child = l;
            break;
          }
          ((e = l.sibling), (l.sibling = n), (n = l), (l = e));
        }
        Ps(t, !0, n, null, s);
        break;
      case "together":
        Ps(t, !1, null, null, void 0);
        break;
      default:
        t.memoizedState = null;
    }
  return t.child;
}
function ul(e, t) {
  !(t.mode & 1) &&
    e !== null &&
    ((e.alternate = null), (t.alternate = null), (t.flags |= 2));
}
function wt(e, t, n) {
  if (
    (e !== null && (t.dependencies = e.dependencies),
    (ln |= t.lanes),
    !(n & t.childLanes))
  )
    return null;
  if (e !== null && t.child !== e.child) throw Error(P(153));
  if (t.child !== null) {
    for (
      e = t.child, n = Ft(e, e.pendingProps), t.child = n, n.return = t;
      e.sibling !== null;
    )
      ((e = e.sibling),
        (n = n.sibling = Ft(e, e.pendingProps)),
        (n.return = t));
    n.sibling = null;
  }
  return t.child;
}
function Gp(e, t, n) {
  switch (t.tag) {
    case 3:
      (Qc(t), Ln());
      break;
    case 5:
      kc(t);
      break;
    case 1:
      Ie(t.type) && Sl(t);
      break;
    case 4:
      ci(t, t.stateNode.containerInfo);
      break;
    case 10:
      var r = t.type._context,
        l = t.memoizedProps.value;
      (X(bl, r._currentValue), (r._currentValue = l));
      break;
    case 13:
      if (((r = t.memoizedState), r !== null))
        return r.dehydrated !== null
          ? (X(ne, ne.current & 1), (t.flags |= 128), null)
          : n & t.child.childLanes
            ? Kc(e, t, n)
            : (X(ne, ne.current & 1),
              (e = wt(e, t, n)),
              e !== null ? e.sibling : null);
      X(ne, ne.current & 1);
      break;
    case 19:
      if (((r = (n & t.childLanes) !== 0), e.flags & 128)) {
        if (r) return Yc(e, t, n);
        t.flags |= 128;
      }
      if (
        ((l = t.memoizedState),
        l !== null &&
          ((l.rendering = null), (l.tail = null), (l.lastEffect = null)),
        X(ne, ne.current),
        r)
      )
        break;
      return null;
    case 22:
    case 23:
      return ((t.lanes = 0), Hc(e, t, n));
  }
  return wt(e, t, n);
}
var Xc, No, qc, Zc;
Xc = function (e, t) {
  for (var n = t.child; n !== null; ) {
    if (n.tag === 5 || n.tag === 6) e.appendChild(n.stateNode);
    else if (n.tag !== 4 && n.child !== null) {
      ((n.child.return = n), (n = n.child));
      continue;
    }
    if (n === t) break;
    for (; n.sibling === null; ) {
      if (n.return === null || n.return === t) return;
      n = n.return;
    }
    ((n.sibling.return = n.return), (n = n.sibling));
  }
};
No = function () {};
qc = function (e, t, n, r) {
  var l = e.memoizedProps;
  if (l !== r) {
    ((e = t.stateNode), qt(at.current));
    var s = null;
    switch (n) {
      case "input":
        ((l = Bs(e, l)), (r = Bs(e, r)), (s = []));
        break;
      case "select":
        ((l = le({}, l, { value: void 0 })),
          (r = le({}, r, { value: void 0 })),
          (s = []));
        break;
      case "textarea":
        ((l = Qs(e, l)), (r = Qs(e, r)), (s = []));
        break;
      default:
        typeof l.onClick != "function" &&
          typeof r.onClick == "function" &&
          (e.onclick = jl);
    }
    Ys(n, r);
    var i;
    n = null;
    for (c in l)
      if (!r.hasOwnProperty(c) && l.hasOwnProperty(c) && l[c] != null)
        if (c === "style") {
          var a = l[c];
          for (i in a) a.hasOwnProperty(i) && (n || (n = {}), (n[i] = ""));
        } else
          c !== "dangerouslySetInnerHTML" &&
            c !== "children" &&
            c !== "suppressContentEditableWarning" &&
            c !== "suppressHydrationWarning" &&
            c !== "autoFocus" &&
            (mr.hasOwnProperty(c)
              ? s || (s = [])
              : (s = s || []).push(c, null));
    for (c in r) {
      var u = r[c];
      if (
        ((a = l != null ? l[c] : void 0),
        r.hasOwnProperty(c) && u !== a && (u != null || a != null))
      )
        if (c === "style")
          if (a) {
            for (i in a)
              !a.hasOwnProperty(i) ||
                (u && u.hasOwnProperty(i)) ||
                (n || (n = {}), (n[i] = ""));
            for (i in u)
              u.hasOwnProperty(i) &&
                a[i] !== u[i] &&
                (n || (n = {}), (n[i] = u[i]));
          } else (n || (s || (s = []), s.push(c, n)), (n = u));
        else
          c === "dangerouslySetInnerHTML"
            ? ((u = u ? u.__html : void 0),
              (a = a ? a.__html : void 0),
              u != null && a !== u && (s = s || []).push(c, u))
            : c === "children"
              ? (typeof u != "string" && typeof u != "number") ||
                (s = s || []).push(c, "" + u)
              : c !== "suppressContentEditableWarning" &&
                c !== "suppressHydrationWarning" &&
                (mr.hasOwnProperty(c)
                  ? (u != null && c === "onScroll" && Z("scroll", e),
                    s || a === u || (s = []))
                  : (s = s || []).push(c, u));
    }
    n && (s = s || []).push("style", n);
    var c = s;
    (t.updateQueue = c) && (t.flags |= 4);
  }
};
Zc = function (e, t, n, r) {
  n !== r && (t.flags |= 4);
};
function Kn(e, t) {
  if (!te)
    switch (e.tailMode) {
      case "hidden":
        t = e.tail;
        for (var n = null; t !== null; )
          (t.alternate !== null && (n = t), (t = t.sibling));
        n === null ? (e.tail = null) : (n.sibling = null);
        break;
      case "collapsed":
        n = e.tail;
        for (var r = null; n !== null; )
          (n.alternate !== null && (r = n), (n = n.sibling));
        r === null
          ? t || e.tail === null
            ? (e.tail = null)
            : (e.tail.sibling = null)
          : (r.sibling = null);
    }
}
function we(e) {
  var t = e.alternate !== null && e.alternate.child === e.child,
    n = 0,
    r = 0;
  if (t)
    for (var l = e.child; l !== null; )
      ((n |= l.lanes | l.childLanes),
        (r |= l.subtreeFlags & 14680064),
        (r |= l.flags & 14680064),
        (l.return = e),
        (l = l.sibling));
  else
    for (l = e.child; l !== null; )
      ((n |= l.lanes | l.childLanes),
        (r |= l.subtreeFlags),
        (r |= l.flags),
        (l.return = e),
        (l = l.sibling));
  return ((e.subtreeFlags |= r), (e.childLanes = n), t);
}
function Qp(e, t, n) {
  var r = t.pendingProps;
  switch ((ri(t), t.tag)) {
    case 2:
    case 16:
    case 15:
    case 0:
    case 11:
    case 7:
    case 8:
    case 12:
    case 9:
    case 14:
      return (we(t), null);
    case 1:
      return (Ie(t.type) && Nl(), we(t), null);
    case 3:
      return (
        (r = t.stateNode),
        Mn(),
        ee(Re),
        ee(je),
        fi(),
        r.pendingContext &&
          ((r.context = r.pendingContext), (r.pendingContext = null)),
        (e === null || e.child === null) &&
          (Yr(t)
            ? (t.flags |= 4)
            : e === null ||
              (e.memoizedState.isDehydrated && !(t.flags & 256)) ||
              ((t.flags |= 1024), Ze !== null && (Io(Ze), (Ze = null)))),
        No(e, t),
        we(t),
        null
      );
    case 5:
      di(t);
      var l = qt(Er.current);
      if (((n = t.type), e !== null && t.stateNode != null))
        (qc(e, t, n, r, l),
          e.ref !== t.ref && ((t.flags |= 512), (t.flags |= 2097152)));
      else {
        if (!r) {
          if (t.stateNode === null) throw Error(P(166));
          return (we(t), null);
        }
        if (((e = qt(at.current)), Yr(t))) {
          ((r = t.stateNode), (n = t.type));
          var s = t.memoizedProps;
          switch (((r[ot] = t), (r[Sr] = s), (e = (t.mode & 1) !== 0), n)) {
            case "dialog":
              (Z("cancel", r), Z("close", r));
              break;
            case "iframe":
            case "object":
            case "embed":
              Z("load", r);
              break;
            case "video":
            case "audio":
              for (l = 0; l < nr.length; l++) Z(nr[l], r);
              break;
            case "source":
              Z("error", r);
              break;
            case "img":
            case "image":
            case "link":
              (Z("error", r), Z("load", r));
              break;
            case "details":
              Z("toggle", r);
              break;
            case "input":
              ($i(r, s), Z("invalid", r));
              break;
            case "select":
              ((r._wrapperState = { wasMultiple: !!s.multiple }),
                Z("invalid", r));
              break;
            case "textarea":
              (Wi(r, s), Z("invalid", r));
          }
          (Ys(n, s), (l = null));
          for (var i in s)
            if (s.hasOwnProperty(i)) {
              var a = s[i];
              i === "children"
                ? typeof a == "string"
                  ? r.textContent !== a &&
                    (s.suppressHydrationWarning !== !0 &&
                      Kr(r.textContent, a, e),
                    (l = ["children", a]))
                  : typeof a == "number" &&
                    r.textContent !== "" + a &&
                    (s.suppressHydrationWarning !== !0 &&
                      Kr(r.textContent, a, e),
                    (l = ["children", "" + a]))
                : mr.hasOwnProperty(i) &&
                  a != null &&
                  i === "onScroll" &&
                  Z("scroll", r);
            }
          switch (n) {
            case "input":
              (Fr(r), Vi(r, s, !0));
              break;
            case "textarea":
              (Fr(r), Bi(r));
              break;
            case "select":
            case "option":
              break;
            default:
              typeof s.onClick == "function" && (r.onclick = jl);
          }
          ((r = l), (t.updateQueue = r), r !== null && (t.flags |= 4));
        } else {
          ((i = l.nodeType === 9 ? l : l.ownerDocument),
            e === "http://www.w3.org/1999/xhtml" && (e = Eu(n)),
            e === "http://www.w3.org/1999/xhtml"
              ? n === "script"
                ? ((e = i.createElement("div")),
                  (e.innerHTML = "<script><\/script>"),
                  (e = e.removeChild(e.firstChild)))
                : typeof r.is == "string"
                  ? (e = i.createElement(n, { is: r.is }))
                  : ((e = i.createElement(n)),
                    n === "select" &&
                      ((i = e),
                      r.multiple
                        ? (i.multiple = !0)
                        : r.size && (i.size = r.size)))
              : (e = i.createElementNS(e, n)),
            (e[ot] = t),
            (e[Sr] = r),
            Xc(e, t, !1, !1),
            (t.stateNode = e));
          e: {
            switch (((i = Xs(n, r)), n)) {
              case "dialog":
                (Z("cancel", e), Z("close", e), (l = r));
                break;
              case "iframe":
              case "object":
              case "embed":
                (Z("load", e), (l = r));
                break;
              case "video":
              case "audio":
                for (l = 0; l < nr.length; l++) Z(nr[l], e);
                l = r;
                break;
              case "source":
                (Z("error", e), (l = r));
                break;
              case "img":
              case "image":
              case "link":
                (Z("error", e), Z("load", e), (l = r));
                break;
              case "details":
                (Z("toggle", e), (l = r));
                break;
              case "input":
                ($i(e, r), (l = Bs(e, r)), Z("invalid", e));
                break;
              case "option":
                l = r;
                break;
              case "select":
                ((e._wrapperState = { wasMultiple: !!r.multiple }),
                  (l = le({}, r, { value: void 0 })),
                  Z("invalid", e));
                break;
              case "textarea":
                (Wi(e, r), (l = Qs(e, r)), Z("invalid", e));
                break;
              default:
                l = r;
            }
            (Ys(n, l), (a = l));
            for (s in a)
              if (a.hasOwnProperty(s)) {
                var u = a[s];
                s === "style"
                  ? _u(e, u)
                  : s === "dangerouslySetInnerHTML"
                    ? ((u = u ? u.__html : void 0), u != null && bu(e, u))
                    : s === "children"
                      ? typeof u == "string"
                        ? (n !== "textarea" || u !== "") && hr(e, u)
                        : typeof u == "number" && hr(e, "" + u)
                      : s !== "suppressContentEditableWarning" &&
                        s !== "suppressHydrationWarning" &&
                        s !== "autoFocus" &&
                        (mr.hasOwnProperty(s)
                          ? u != null && s === "onScroll" && Z("scroll", e)
                          : u != null && Vo(e, s, u, i));
              }
            switch (n) {
              case "input":
                (Fr(e), Vi(e, r, !1));
                break;
              case "textarea":
                (Fr(e), Bi(e));
                break;
              case "option":
                r.value != null && e.setAttribute("value", "" + $t(r.value));
                break;
              case "select":
                ((e.multiple = !!r.multiple),
                  (s = r.value),
                  s != null
                    ? Nn(e, !!r.multiple, s, !1)
                    : r.defaultValue != null &&
                      Nn(e, !!r.multiple, r.defaultValue, !0));
                break;
              default:
                typeof l.onClick == "function" && (e.onclick = jl);
            }
            switch (n) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                r = !!r.autoFocus;
                break e;
              case "img":
                r = !0;
                break e;
              default:
                r = !1;
            }
          }
          r && (t.flags |= 4);
        }
        t.ref !== null && ((t.flags |= 512), (t.flags |= 2097152));
      }
      return (we(t), null);
    case 6:
      if (e && t.stateNode != null) Zc(e, t, e.memoizedProps, r);
      else {
        if (typeof r != "string" && t.stateNode === null) throw Error(P(166));
        if (((n = qt(Er.current)), qt(at.current), Yr(t))) {
          if (
            ((r = t.stateNode),
            (n = t.memoizedProps),
            (r[ot] = t),
            (s = r.nodeValue !== n) && ((e = Ue), e !== null))
          )
            switch (e.tag) {
              case 3:
                Kr(r.nodeValue, n, (e.mode & 1) !== 0);
                break;
              case 5:
                e.memoizedProps.suppressHydrationWarning !== !0 &&
                  Kr(r.nodeValue, n, (e.mode & 1) !== 0);
            }
          s && (t.flags |= 4);
        } else
          ((r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r)),
            (r[ot] = t),
            (t.stateNode = r));
      }
      return (we(t), null);
    case 13:
      if (
        (ee(ne),
        (r = t.memoizedState),
        e === null ||
          (e.memoizedState !== null && e.memoizedState.dehydrated !== null))
      ) {
        if (te && ze !== null && t.mode & 1 && !(t.flags & 128))
          (gc(), Ln(), (t.flags |= 98560), (s = !1));
        else if (((s = Yr(t)), r !== null && r.dehydrated !== null)) {
          if (e === null) {
            if (!s) throw Error(P(318));
            if (
              ((s = t.memoizedState),
              (s = s !== null ? s.dehydrated : null),
              !s)
            )
              throw Error(P(317));
            s[ot] = t;
          } else
            (Ln(),
              !(t.flags & 128) && (t.memoizedState = null),
              (t.flags |= 4));
          (we(t), (s = !1));
        } else (Ze !== null && (Io(Ze), (Ze = null)), (s = !0));
        if (!s) return t.flags & 65536 ? t : null;
      }
      return t.flags & 128
        ? ((t.lanes = n), t)
        : ((r = r !== null),
          r !== (e !== null && e.memoizedState !== null) &&
            r &&
            ((t.child.flags |= 8192),
            t.mode & 1 &&
              (e === null || ne.current & 1 ? de === 0 && (de = 3) : Si())),
          t.updateQueue !== null && (t.flags |= 4),
          we(t),
          null);
    case 4:
      return (
        Mn(),
        No(e, t),
        e === null && jr(t.stateNode.containerInfo),
        we(t),
        null
      );
    case 10:
      return (ii(t.type._context), we(t), null);
    case 17:
      return (Ie(t.type) && Nl(), we(t), null);
    case 19:
      if ((ee(ne), (s = t.memoizedState), s === null)) return (we(t), null);
      if (((r = (t.flags & 128) !== 0), (i = s.rendering), i === null))
        if (r) Kn(s, !1);
        else {
          if (de !== 0 || (e !== null && e.flags & 128))
            for (e = t.child; e !== null; ) {
              if (((i = Rl(e)), i !== null)) {
                for (
                  t.flags |= 128,
                    Kn(s, !1),
                    r = i.updateQueue,
                    r !== null && ((t.updateQueue = r), (t.flags |= 4)),
                    t.subtreeFlags = 0,
                    r = n,
                    n = t.child;
                  n !== null;
                )
                  ((s = n),
                    (e = r),
                    (s.flags &= 14680066),
                    (i = s.alternate),
                    i === null
                      ? ((s.childLanes = 0),
                        (s.lanes = e),
                        (s.child = null),
                        (s.subtreeFlags = 0),
                        (s.memoizedProps = null),
                        (s.memoizedState = null),
                        (s.updateQueue = null),
                        (s.dependencies = null),
                        (s.stateNode = null))
                      : ((s.childLanes = i.childLanes),
                        (s.lanes = i.lanes),
                        (s.child = i.child),
                        (s.subtreeFlags = 0),
                        (s.deletions = null),
                        (s.memoizedProps = i.memoizedProps),
                        (s.memoizedState = i.memoizedState),
                        (s.updateQueue = i.updateQueue),
                        (s.type = i.type),
                        (e = i.dependencies),
                        (s.dependencies =
                          e === null
                            ? null
                            : {
                                lanes: e.lanes,
                                firstContext: e.firstContext,
                              })),
                    (n = n.sibling));
                return (X(ne, (ne.current & 1) | 2), t.child);
              }
              e = e.sibling;
            }
          s.tail !== null &&
            ae() > Un &&
            ((t.flags |= 128), (r = !0), Kn(s, !1), (t.lanes = 4194304));
        }
      else {
        if (!r)
          if (((e = Rl(i)), e !== null)) {
            if (
              ((t.flags |= 128),
              (r = !0),
              (n = e.updateQueue),
              n !== null && ((t.updateQueue = n), (t.flags |= 4)),
              Kn(s, !0),
              s.tail === null && s.tailMode === "hidden" && !i.alternate && !te)
            )
              return (we(t), null);
          } else
            2 * ae() - s.renderingStartTime > Un &&
              n !== 1073741824 &&
              ((t.flags |= 128), (r = !0), Kn(s, !1), (t.lanes = 4194304));
        s.isBackwards
          ? ((i.sibling = t.child), (t.child = i))
          : ((n = s.last),
            n !== null ? (n.sibling = i) : (t.child = i),
            (s.last = i));
      }
      return s.tail !== null
        ? ((t = s.tail),
          (s.rendering = t),
          (s.tail = t.sibling),
          (s.renderingStartTime = ae()),
          (t.sibling = null),
          (n = ne.current),
          X(ne, r ? (n & 1) | 2 : n & 1),
          t)
        : (we(t), null);
    case 22:
    case 23:
      return (
        Ni(),
        (r = t.memoizedState !== null),
        e !== null && (e.memoizedState !== null) !== r && (t.flags |= 8192),
        r && t.mode & 1
          ? Me & 1073741824 && (we(t), t.subtreeFlags & 6 && (t.flags |= 8192))
          : we(t),
        null
      );
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(P(156, t.tag));
}
function Kp(e, t) {
  switch ((ri(t), t.tag)) {
    case 1:
      return (
        Ie(t.type) && Nl(),
        (e = t.flags),
        e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
      );
    case 3:
      return (
        Mn(),
        ee(Re),
        ee(je),
        fi(),
        (e = t.flags),
        e & 65536 && !(e & 128) ? ((t.flags = (e & -65537) | 128), t) : null
      );
    case 5:
      return (di(t), null);
    case 13:
      if (
        (ee(ne), (e = t.memoizedState), e !== null && e.dehydrated !== null)
      ) {
        if (t.alternate === null) throw Error(P(340));
        Ln();
      }
      return (
        (e = t.flags),
        e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
      );
    case 19:
      return (ee(ne), null);
    case 4:
      return (Mn(), null);
    case 10:
      return (ii(t.type._context), null);
    case 22:
    case 23:
      return (Ni(), null);
    case 24:
      return null;
    default:
      return null;
  }
}
var Zr = !1,
  ke = !1,
  Yp = typeof WeakSet == "function" ? WeakSet : Set,
  M = null;
function kn(e, t) {
  var n = e.ref;
  if (n !== null)
    if (typeof n == "function")
      try {
        n(null);
      } catch (r) {
        se(e, t, r);
      }
    else n.current = null;
}
function So(e, t, n) {
  try {
    n();
  } catch (r) {
    se(e, t, r);
  }
}
var Ta = !1;
function Xp(e, t) {
  if (((oo = vl), (e = rc()), ti(e))) {
    if ("selectionStart" in e)
      var n = { start: e.selectionStart, end: e.selectionEnd };
    else
      e: {
        n = ((n = e.ownerDocument) && n.defaultView) || window;
        var r = n.getSelection && n.getSelection();
        if (r && r.rangeCount !== 0) {
          n = r.anchorNode;
          var l = r.anchorOffset,
            s = r.focusNode;
          r = r.focusOffset;
          try {
            (n.nodeType, s.nodeType);
          } catch {
            n = null;
            break e;
          }
          var i = 0,
            a = -1,
            u = -1,
            c = 0,
            h = 0,
            x = e,
            m = null;
          t: for (;;) {
            for (
              var v;
              x !== n || (l !== 0 && x.nodeType !== 3) || (a = i + l),
                x !== s || (r !== 0 && x.nodeType !== 3) || (u = i + r),
                x.nodeType === 3 && (i += x.nodeValue.length),
                (v = x.firstChild) !== null;
            )
              ((m = x), (x = v));
            for (;;) {
              if (x === e) break t;
              if (
                (m === n && ++c === l && (a = i),
                m === s && ++h === r && (u = i),
                (v = x.nextSibling) !== null)
              )
                break;
              ((x = m), (m = x.parentNode));
            }
            x = v;
          }
          n = a === -1 || u === -1 ? null : { start: a, end: u };
        } else n = null;
      }
    n = n || { start: 0, end: 0 };
  } else n = null;
  for (io = { focusedElem: e, selectionRange: n }, vl = !1, M = t; M !== null; )
    if (((t = M), (e = t.child), (t.subtreeFlags & 1028) !== 0 && e !== null))
      ((e.return = t), (M = e));
    else
      for (; M !== null; ) {
        t = M;
        try {
          var w = t.alternate;
          if (t.flags & 1024)
            switch (t.tag) {
              case 0:
              case 11:
              case 15:
                break;
              case 1:
                if (w !== null) {
                  var y = w.memoizedProps,
                    j = w.memoizedState,
                    f = t.stateNode,
                    d = f.getSnapshotBeforeUpdate(
                      t.elementType === t.type ? y : Xe(t.type, y),
                      j,
                    );
                  f.__reactInternalSnapshotBeforeUpdate = d;
                }
                break;
              case 3:
                var p = t.stateNode.containerInfo;
                p.nodeType === 1
                  ? (p.textContent = "")
                  : p.nodeType === 9 &&
                    p.documentElement &&
                    p.removeChild(p.documentElement);
                break;
              case 5:
              case 6:
              case 4:
              case 17:
                break;
              default:
                throw Error(P(163));
            }
        } catch (g) {
          se(t, t.return, g);
        }
        if (((e = t.sibling), e !== null)) {
          ((e.return = t.return), (M = e));
          break;
        }
        M = t.return;
      }
  return ((w = Ta), (Ta = !1), w);
}
function ur(e, t, n) {
  var r = t.updateQueue;
  if (((r = r !== null ? r.lastEffect : null), r !== null)) {
    var l = (r = r.next);
    do {
      if ((l.tag & e) === e) {
        var s = l.destroy;
        ((l.destroy = void 0), s !== void 0 && So(t, n, s));
      }
      l = l.next;
    } while (l !== r);
  }
}
function Yl(e, t) {
  if (
    ((t = t.updateQueue), (t = t !== null ? t.lastEffect : null), t !== null)
  ) {
    var n = (t = t.next);
    do {
      if ((n.tag & e) === e) {
        var r = n.create;
        n.destroy = r();
      }
      n = n.next;
    } while (n !== t);
  }
}
function Co(e) {
  var t = e.ref;
  if (t !== null) {
    var n = e.stateNode;
    switch (e.tag) {
      case 5:
        e = n;
        break;
      default:
        e = n;
    }
    typeof t == "function" ? t(e) : (t.current = e);
  }
}
function Jc(e) {
  var t = e.alternate;
  (t !== null && ((e.alternate = null), Jc(t)),
    (e.child = null),
    (e.deletions = null),
    (e.sibling = null),
    e.tag === 5 &&
      ((t = e.stateNode),
      t !== null &&
        (delete t[ot], delete t[Sr], delete t[co], delete t[Lp], delete t[Tp])),
    (e.stateNode = null),
    (e.return = null),
    (e.dependencies = null),
    (e.memoizedProps = null),
    (e.memoizedState = null),
    (e.pendingProps = null),
    (e.stateNode = null),
    (e.updateQueue = null));
}
function ed(e) {
  return e.tag === 5 || e.tag === 3 || e.tag === 4;
}
function Ma(e) {
  e: for (;;) {
    for (; e.sibling === null; ) {
      if (e.return === null || ed(e.return)) return null;
      e = e.return;
    }
    for (
      e.sibling.return = e.return, e = e.sibling;
      e.tag !== 5 && e.tag !== 6 && e.tag !== 18;
    ) {
      if (e.flags & 2 || e.child === null || e.tag === 4) continue e;
      ((e.child.return = e), (e = e.child));
    }
    if (!(e.flags & 2)) return e.stateNode;
  }
}
function Eo(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6)
    ((e = e.stateNode),
      t
        ? n.nodeType === 8
          ? n.parentNode.insertBefore(e, t)
          : n.insertBefore(e, t)
        : (n.nodeType === 8
            ? ((t = n.parentNode), t.insertBefore(e, n))
            : ((t = n), t.appendChild(e)),
          (n = n._reactRootContainer),
          n != null || t.onclick !== null || (t.onclick = jl)));
  else if (r !== 4 && ((e = e.child), e !== null))
    for (Eo(e, t, n), e = e.sibling; e !== null; )
      (Eo(e, t, n), (e = e.sibling));
}
function bo(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6)
    ((e = e.stateNode), t ? n.insertBefore(e, t) : n.appendChild(e));
  else if (r !== 4 && ((e = e.child), e !== null))
    for (bo(e, t, n), e = e.sibling; e !== null; )
      (bo(e, t, n), (e = e.sibling));
}
var he = null,
  qe = !1;
function St(e, t, n) {
  for (n = n.child; n !== null; ) (td(e, t, n), (n = n.sibling));
}
function td(e, t, n) {
  if (it && typeof it.onCommitFiberUnmount == "function")
    try {
      it.onCommitFiberUnmount($l, n);
    } catch {}
  switch (n.tag) {
    case 5:
      ke || kn(n, t);
    case 6:
      var r = he,
        l = qe;
      ((he = null),
        St(e, t, n),
        (he = r),
        (qe = l),
        he !== null &&
          (qe
            ? ((e = he),
              (n = n.stateNode),
              e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n))
            : he.removeChild(n.stateNode)));
      break;
    case 18:
      he !== null &&
        (qe
          ? ((e = he),
            (n = n.stateNode),
            e.nodeType === 8
              ? ks(e.parentNode, n)
              : e.nodeType === 1 && ks(e, n),
            vr(e))
          : ks(he, n.stateNode));
      break;
    case 4:
      ((r = he),
        (l = qe),
        (he = n.stateNode.containerInfo),
        (qe = !0),
        St(e, t, n),
        (he = r),
        (qe = l));
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (
        !ke &&
        ((r = n.updateQueue), r !== null && ((r = r.lastEffect), r !== null))
      ) {
        l = r = r.next;
        do {
          var s = l,
            i = s.destroy;
          ((s = s.tag),
            i !== void 0 && (s & 2 || s & 4) && So(n, t, i),
            (l = l.next));
        } while (l !== r);
      }
      St(e, t, n);
      break;
    case 1:
      if (
        !ke &&
        (kn(n, t),
        (r = n.stateNode),
        typeof r.componentWillUnmount == "function")
      )
        try {
          ((r.props = n.memoizedProps),
            (r.state = n.memoizedState),
            r.componentWillUnmount());
        } catch (a) {
          se(n, t, a);
        }
      St(e, t, n);
      break;
    case 21:
      St(e, t, n);
      break;
    case 22:
      n.mode & 1
        ? ((ke = (r = ke) || n.memoizedState !== null), St(e, t, n), (ke = r))
        : St(e, t, n);
      break;
    default:
      St(e, t, n);
  }
}
function za(e) {
  var t = e.updateQueue;
  if (t !== null) {
    e.updateQueue = null;
    var n = e.stateNode;
    (n === null && (n = e.stateNode = new Yp()),
      t.forEach(function (r) {
        var l = sm.bind(null, e, r);
        n.has(r) || (n.add(r), r.then(l, l));
      }));
  }
}
function Ye(e, t) {
  var n = t.deletions;
  if (n !== null)
    for (var r = 0; r < n.length; r++) {
      var l = n[r];
      try {
        var s = e,
          i = t,
          a = i;
        e: for (; a !== null; ) {
          switch (a.tag) {
            case 5:
              ((he = a.stateNode), (qe = !1));
              break e;
            case 3:
              ((he = a.stateNode.containerInfo), (qe = !0));
              break e;
            case 4:
              ((he = a.stateNode.containerInfo), (qe = !0));
              break e;
          }
          a = a.return;
        }
        if (he === null) throw Error(P(160));
        (td(s, i, l), (he = null), (qe = !1));
        var u = l.alternate;
        (u !== null && (u.return = null), (l.return = null));
      } catch (c) {
        se(l, t, c);
      }
    }
  if (t.subtreeFlags & 12854)
    for (t = t.child; t !== null; ) (nd(t, e), (t = t.sibling));
}
function nd(e, t) {
  var n = e.alternate,
    r = e.flags;
  switch (e.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      if ((Ye(t, e), lt(e), r & 4)) {
        try {
          (ur(3, e, e.return), Yl(3, e));
        } catch (y) {
          se(e, e.return, y);
        }
        try {
          ur(5, e, e.return);
        } catch (y) {
          se(e, e.return, y);
        }
      }
      break;
    case 1:
      (Ye(t, e), lt(e), r & 512 && n !== null && kn(n, n.return));
      break;
    case 5:
      if (
        (Ye(t, e),
        lt(e),
        r & 512 && n !== null && kn(n, n.return),
        e.flags & 32)
      ) {
        var l = e.stateNode;
        try {
          hr(l, "");
        } catch (y) {
          se(e, e.return, y);
        }
      }
      if (r & 4 && ((l = e.stateNode), l != null)) {
        var s = e.memoizedProps,
          i = n !== null ? n.memoizedProps : s,
          a = e.type,
          u = e.updateQueue;
        if (((e.updateQueue = null), u !== null))
          try {
            (a === "input" && s.type === "radio" && s.name != null && Su(l, s),
              Xs(a, i));
            var c = Xs(a, s);
            for (i = 0; i < u.length; i += 2) {
              var h = u[i],
                x = u[i + 1];
              h === "style"
                ? _u(l, x)
                : h === "dangerouslySetInnerHTML"
                  ? bu(l, x)
                  : h === "children"
                    ? hr(l, x)
                    : Vo(l, h, x, c);
            }
            switch (a) {
              case "input":
                Hs(l, s);
                break;
              case "textarea":
                Cu(l, s);
                break;
              case "select":
                var m = l._wrapperState.wasMultiple;
                l._wrapperState.wasMultiple = !!s.multiple;
                var v = s.value;
                v != null
                  ? Nn(l, !!s.multiple, v, !1)
                  : m !== !!s.multiple &&
                    (s.defaultValue != null
                      ? Nn(l, !!s.multiple, s.defaultValue, !0)
                      : Nn(l, !!s.multiple, s.multiple ? [] : "", !1));
            }
            l[Sr] = s;
          } catch (y) {
            se(e, e.return, y);
          }
      }
      break;
    case 6:
      if ((Ye(t, e), lt(e), r & 4)) {
        if (e.stateNode === null) throw Error(P(162));
        ((l = e.stateNode), (s = e.memoizedProps));
        try {
          l.nodeValue = s;
        } catch (y) {
          se(e, e.return, y);
        }
      }
      break;
    case 3:
      if (
        (Ye(t, e), lt(e), r & 4 && n !== null && n.memoizedState.isDehydrated)
      )
        try {
          vr(t.containerInfo);
        } catch (y) {
          se(e, e.return, y);
        }
      break;
    case 4:
      (Ye(t, e), lt(e));
      break;
    case 13:
      (Ye(t, e),
        lt(e),
        (l = e.child),
        l.flags & 8192 &&
          ((s = l.memoizedState !== null),
          (l.stateNode.isHidden = s),
          !s ||
            (l.alternate !== null && l.alternate.memoizedState !== null) ||
            (ki = ae())),
        r & 4 && za(e));
      break;
    case 22:
      if (
        ((h = n !== null && n.memoizedState !== null),
        e.mode & 1 ? ((ke = (c = ke) || h), Ye(t, e), (ke = c)) : Ye(t, e),
        lt(e),
        r & 8192)
      ) {
        if (
          ((c = e.memoizedState !== null),
          (e.stateNode.isHidden = c) && !h && e.mode & 1)
        )
          for (M = e, h = e.child; h !== null; ) {
            for (x = M = h; M !== null; ) {
              switch (((m = M), (v = m.child), m.tag)) {
                case 0:
                case 11:
                case 14:
                case 15:
                  ur(4, m, m.return);
                  break;
                case 1:
                  kn(m, m.return);
                  var w = m.stateNode;
                  if (typeof w.componentWillUnmount == "function") {
                    ((r = m), (n = m.return));
                    try {
                      ((t = r),
                        (w.props = t.memoizedProps),
                        (w.state = t.memoizedState),
                        w.componentWillUnmount());
                    } catch (y) {
                      se(r, n, y);
                    }
                  }
                  break;
                case 5:
                  kn(m, m.return);
                  break;
                case 22:
                  if (m.memoizedState !== null) {
                    Oa(x);
                    continue;
                  }
              }
              v !== null ? ((v.return = m), (M = v)) : Oa(x);
            }
            h = h.sibling;
          }
        e: for (h = null, x = e; ; ) {
          if (x.tag === 5) {
            if (h === null) {
              h = x;
              try {
                ((l = x.stateNode),
                  c
                    ? ((s = l.style),
                      typeof s.setProperty == "function"
                        ? s.setProperty("display", "none", "important")
                        : (s.display = "none"))
                    : ((a = x.stateNode),
                      (u = x.memoizedProps.style),
                      (i =
                        u != null && u.hasOwnProperty("display")
                          ? u.display
                          : null),
                      (a.style.display = Pu("display", i))));
              } catch (y) {
                se(e, e.return, y);
              }
            }
          } else if (x.tag === 6) {
            if (h === null)
              try {
                x.stateNode.nodeValue = c ? "" : x.memoizedProps;
              } catch (y) {
                se(e, e.return, y);
              }
          } else if (
            ((x.tag !== 22 && x.tag !== 23) ||
              x.memoizedState === null ||
              x === e) &&
            x.child !== null
          ) {
            ((x.child.return = x), (x = x.child));
            continue;
          }
          if (x === e) break e;
          for (; x.sibling === null; ) {
            if (x.return === null || x.return === e) break e;
            (h === x && (h = null), (x = x.return));
          }
          (h === x && (h = null),
            (x.sibling.return = x.return),
            (x = x.sibling));
        }
      }
      break;
    case 19:
      (Ye(t, e), lt(e), r & 4 && za(e));
      break;
    case 21:
      break;
    default:
      (Ye(t, e), lt(e));
  }
}
function lt(e) {
  var t = e.flags;
  if (t & 2) {
    try {
      e: {
        for (var n = e.return; n !== null; ) {
          if (ed(n)) {
            var r = n;
            break e;
          }
          n = n.return;
        }
        throw Error(P(160));
      }
      switch (r.tag) {
        case 5:
          var l = r.stateNode;
          r.flags & 32 && (hr(l, ""), (r.flags &= -33));
          var s = Ma(e);
          bo(e, s, l);
          break;
        case 3:
        case 4:
          var i = r.stateNode.containerInfo,
            a = Ma(e);
          Eo(e, a, i);
          break;
        default:
          throw Error(P(161));
      }
    } catch (u) {
      se(e, e.return, u);
    }
    e.flags &= -3;
  }
  t & 4096 && (e.flags &= -4097);
}
function qp(e, t, n) {
  ((M = e), rd(e));
}
function rd(e, t, n) {
  for (var r = (e.mode & 1) !== 0; M !== null; ) {
    var l = M,
      s = l.child;
    if (l.tag === 22 && r) {
      var i = l.memoizedState !== null || Zr;
      if (!i) {
        var a = l.alternate,
          u = (a !== null && a.memoizedState !== null) || ke;
        a = Zr;
        var c = ke;
        if (((Zr = i), (ke = u) && !c))
          for (M = l; M !== null; )
            ((i = M),
              (u = i.child),
              i.tag === 22 && i.memoizedState !== null
                ? Aa(l)
                : u !== null
                  ? ((u.return = i), (M = u))
                  : Aa(l));
        for (; s !== null; ) ((M = s), rd(s), (s = s.sibling));
        ((M = l), (Zr = a), (ke = c));
      }
      Ua(e);
    } else
      l.subtreeFlags & 8772 && s !== null ? ((s.return = l), (M = s)) : Ua(e);
  }
}
function Ua(e) {
  for (; M !== null; ) {
    var t = M;
    if (t.flags & 8772) {
      var n = t.alternate;
      try {
        if (t.flags & 8772)
          switch (t.tag) {
            case 0:
            case 11:
            case 15:
              ke || Yl(5, t);
              break;
            case 1:
              var r = t.stateNode;
              if (t.flags & 4 && !ke)
                if (n === null) r.componentDidMount();
                else {
                  var l =
                    t.elementType === t.type
                      ? n.memoizedProps
                      : Xe(t.type, n.memoizedProps);
                  r.componentDidUpdate(
                    l,
                    n.memoizedState,
                    r.__reactInternalSnapshotBeforeUpdate,
                  );
                }
              var s = t.updateQueue;
              s !== null && wa(t, s, r);
              break;
            case 3:
              var i = t.updateQueue;
              if (i !== null) {
                if (((n = null), t.child !== null))
                  switch (t.child.tag) {
                    case 5:
                      n = t.child.stateNode;
                      break;
                    case 1:
                      n = t.child.stateNode;
                  }
                wa(t, i, n);
              }
              break;
            case 5:
              var a = t.stateNode;
              if (n === null && t.flags & 4) {
                n = a;
                var u = t.memoizedProps;
                switch (t.type) {
                  case "button":
                  case "input":
                  case "select":
                  case "textarea":
                    u.autoFocus && n.focus();
                    break;
                  case "img":
                    u.src && (n.src = u.src);
                }
              }
              break;
            case 6:
              break;
            case 4:
              break;
            case 12:
              break;
            case 13:
              if (t.memoizedState === null) {
                var c = t.alternate;
                if (c !== null) {
                  var h = c.memoizedState;
                  if (h !== null) {
                    var x = h.dehydrated;
                    x !== null && vr(x);
                  }
                }
              }
              break;
            case 19:
            case 17:
            case 21:
            case 22:
            case 23:
            case 25:
              break;
            default:
              throw Error(P(163));
          }
        ke || (t.flags & 512 && Co(t));
      } catch (m) {
        se(t, t.return, m);
      }
    }
    if (t === e) {
      M = null;
      break;
    }
    if (((n = t.sibling), n !== null)) {
      ((n.return = t.return), (M = n));
      break;
    }
    M = t.return;
  }
}
function Oa(e) {
  for (; M !== null; ) {
    var t = M;
    if (t === e) {
      M = null;
      break;
    }
    var n = t.sibling;
    if (n !== null) {
      ((n.return = t.return), (M = n));
      break;
    }
    M = t.return;
  }
}
function Aa(e) {
  for (; M !== null; ) {
    var t = M;
    try {
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          var n = t.return;
          try {
            Yl(4, t);
          } catch (u) {
            se(t, n, u);
          }
          break;
        case 1:
          var r = t.stateNode;
          if (typeof r.componentDidMount == "function") {
            var l = t.return;
            try {
              r.componentDidMount();
            } catch (u) {
              se(t, l, u);
            }
          }
          var s = t.return;
          try {
            Co(t);
          } catch (u) {
            se(t, s, u);
          }
          break;
        case 5:
          var i = t.return;
          try {
            Co(t);
          } catch (u) {
            se(t, i, u);
          }
      }
    } catch (u) {
      se(t, t.return, u);
    }
    if (t === e) {
      M = null;
      break;
    }
    var a = t.sibling;
    if (a !== null) {
      ((a.return = t.return), (M = a));
      break;
    }
    M = t.return;
  }
}
var Zp = Math.ceil,
  Tl = kt.ReactCurrentDispatcher,
  vi = kt.ReactCurrentOwner,
  He = kt.ReactCurrentBatchConfig,
  K = 0,
  me = null,
  ue = null,
  ge = 0,
  Me = 0,
  jn = Bt(0),
  de = 0,
  Rr = null,
  ln = 0,
  Xl = 0,
  wi = 0,
  cr = null,
  Pe = null,
  ki = 0,
  Un = 1 / 0,
  ft = null,
  Ml = !1,
  Po = null,
  At = null,
  Jr = !1,
  Lt = null,
  zl = 0,
  dr = 0,
  _o = null,
  cl = -1,
  dl = 0;
function Ce() {
  return K & 6 ? ae() : cl !== -1 ? cl : (cl = ae());
}
function Dt(e) {
  return e.mode & 1
    ? K & 2 && ge !== 0
      ? ge & -ge
      : zp.transition !== null
        ? (dl === 0 && (dl = $u()), dl)
        : ((e = Y),
          e !== 0 || ((e = window.event), (e = e === void 0 ? 16 : Ku(e.type))),
          e)
    : 1;
}
function et(e, t, n, r) {
  if (50 < dr) throw ((dr = 0), (_o = null), Error(P(185)));
  (Mr(e, n, r),
    (!(K & 2) || e !== me) &&
      (e === me && (!(K & 2) && (Xl |= n), de === 4 && Rt(e, ge)),
      Le(e, r),
      n === 1 && K === 0 && !(t.mode & 1) && ((Un = ae() + 500), Gl && Ht())));
}
function Le(e, t) {
  var n = e.callbackNode;
  zf(e, t);
  var r = yl(e, e === me ? ge : 0);
  if (r === 0)
    (n !== null && Qi(n), (e.callbackNode = null), (e.callbackPriority = 0));
  else if (((t = r & -r), e.callbackPriority !== t)) {
    if ((n != null && Qi(n), t === 1))
      (e.tag === 0 ? Mp(Da.bind(null, e)) : pc(Da.bind(null, e)),
        Rp(function () {
          !(K & 6) && Ht();
        }),
        (n = null));
    else {
      switch (Vu(r)) {
        case 1:
          n = Qo;
          break;
        case 4:
          n = Du;
          break;
        case 16:
          n = xl;
          break;
        case 536870912:
          n = Fu;
          break;
        default:
          n = xl;
      }
      n = dd(n, ld.bind(null, e));
    }
    ((e.callbackPriority = t), (e.callbackNode = n));
  }
}
function ld(e, t) {
  if (((cl = -1), (dl = 0), K & 6)) throw Error(P(327));
  var n = e.callbackNode;
  if (Pn() && e.callbackNode !== n) return null;
  var r = yl(e, e === me ? ge : 0);
  if (r === 0) return null;
  if (r & 30 || r & e.expiredLanes || t) t = Ul(e, r);
  else {
    t = r;
    var l = K;
    K |= 2;
    var s = od();
    (me !== e || ge !== t) && ((ft = null), (Un = ae() + 500), Zt(e, t));
    do
      try {
        tm();
        break;
      } catch (a) {
        sd(e, a);
      }
    while (!0);
    (oi(),
      (Tl.current = s),
      (K = l),
      ue !== null ? (t = 0) : ((me = null), (ge = 0), (t = de)));
  }
  if (t !== 0) {
    if (
      (t === 2 && ((l = to(e)), l !== 0 && ((r = l), (t = Ro(e, l)))), t === 1)
    )
      throw ((n = Rr), Zt(e, 0), Rt(e, r), Le(e, ae()), n);
    if (t === 6) Rt(e, r);
    else {
      if (
        ((l = e.current.alternate),
        !(r & 30) &&
          !Jp(l) &&
          ((t = Ul(e, r)),
          t === 2 && ((s = to(e)), s !== 0 && ((r = s), (t = Ro(e, s)))),
          t === 1))
      )
        throw ((n = Rr), Zt(e, 0), Rt(e, r), Le(e, ae()), n);
      switch (((e.finishedWork = l), (e.finishedLanes = r), t)) {
        case 0:
        case 1:
          throw Error(P(345));
        case 2:
          Kt(e, Pe, ft);
          break;
        case 3:
          if (
            (Rt(e, r), (r & 130023424) === r && ((t = ki + 500 - ae()), 10 < t))
          ) {
            if (yl(e, 0) !== 0) break;
            if (((l = e.suspendedLanes), (l & r) !== r)) {
              (Ce(), (e.pingedLanes |= e.suspendedLanes & l));
              break;
            }
            e.timeoutHandle = uo(Kt.bind(null, e, Pe, ft), t);
            break;
          }
          Kt(e, Pe, ft);
          break;
        case 4:
          if ((Rt(e, r), (r & 4194240) === r)) break;
          for (t = e.eventTimes, l = -1; 0 < r; ) {
            var i = 31 - Je(r);
            ((s = 1 << i), (i = t[i]), i > l && (l = i), (r &= ~s));
          }
          if (
            ((r = l),
            (r = ae() - r),
            (r =
              (120 > r
                ? 120
                : 480 > r
                  ? 480
                  : 1080 > r
                    ? 1080
                    : 1920 > r
                      ? 1920
                      : 3e3 > r
                        ? 3e3
                        : 4320 > r
                          ? 4320
                          : 1960 * Zp(r / 1960)) - r),
            10 < r)
          ) {
            e.timeoutHandle = uo(Kt.bind(null, e, Pe, ft), r);
            break;
          }
          Kt(e, Pe, ft);
          break;
        case 5:
          Kt(e, Pe, ft);
          break;
        default:
          throw Error(P(329));
      }
    }
  }
  return (Le(e, ae()), e.callbackNode === n ? ld.bind(null, e) : null);
}
function Ro(e, t) {
  var n = cr;
  return (
    e.current.memoizedState.isDehydrated && (Zt(e, t).flags |= 256),
    (e = Ul(e, t)),
    e !== 2 && ((t = Pe), (Pe = n), t !== null && Io(t)),
    e
  );
}
function Io(e) {
  Pe === null ? (Pe = e) : Pe.push.apply(Pe, e);
}
function Jp(e) {
  for (var t = e; ; ) {
    if (t.flags & 16384) {
      var n = t.updateQueue;
      if (n !== null && ((n = n.stores), n !== null))
        for (var r = 0; r < n.length; r++) {
          var l = n[r],
            s = l.getSnapshot;
          l = l.value;
          try {
            if (!tt(s(), l)) return !1;
          } catch {
            return !1;
          }
        }
    }
    if (((n = t.child), t.subtreeFlags & 16384 && n !== null))
      ((n.return = t), (t = n));
    else {
      if (t === e) break;
      for (; t.sibling === null; ) {
        if (t.return === null || t.return === e) return !0;
        t = t.return;
      }
      ((t.sibling.return = t.return), (t = t.sibling));
    }
  }
  return !0;
}
function Rt(e, t) {
  for (
    t &= ~wi,
      t &= ~Xl,
      e.suspendedLanes |= t,
      e.pingedLanes &= ~t,
      e = e.expirationTimes;
    0 < t;
  ) {
    var n = 31 - Je(t),
      r = 1 << n;
    ((e[n] = -1), (t &= ~r));
  }
}
function Da(e) {
  if (K & 6) throw Error(P(327));
  Pn();
  var t = yl(e, 0);
  if (!(t & 1)) return (Le(e, ae()), null);
  var n = Ul(e, t);
  if (e.tag !== 0 && n === 2) {
    var r = to(e);
    r !== 0 && ((t = r), (n = Ro(e, r)));
  }
  if (n === 1) throw ((n = Rr), Zt(e, 0), Rt(e, t), Le(e, ae()), n);
  if (n === 6) throw Error(P(345));
  return (
    (e.finishedWork = e.current.alternate),
    (e.finishedLanes = t),
    Kt(e, Pe, ft),
    Le(e, ae()),
    null
  );
}
function ji(e, t) {
  var n = K;
  K |= 1;
  try {
    return e(t);
  } finally {
    ((K = n), K === 0 && ((Un = ae() + 500), Gl && Ht()));
  }
}
function sn(e) {
  Lt !== null && Lt.tag === 0 && !(K & 6) && Pn();
  var t = K;
  K |= 1;
  var n = He.transition,
    r = Y;
  try {
    if (((He.transition = null), (Y = 1), e)) return e();
  } finally {
    ((Y = r), (He.transition = n), (K = t), !(K & 6) && Ht());
  }
}
function Ni() {
  ((Me = jn.current), ee(jn));
}
function Zt(e, t) {
  ((e.finishedWork = null), (e.finishedLanes = 0));
  var n = e.timeoutHandle;
  if ((n !== -1 && ((e.timeoutHandle = -1), _p(n)), ue !== null))
    for (n = ue.return; n !== null; ) {
      var r = n;
      switch ((ri(r), r.tag)) {
        case 1:
          ((r = r.type.childContextTypes), r != null && Nl());
          break;
        case 3:
          (Mn(), ee(Re), ee(je), fi());
          break;
        case 5:
          di(r);
          break;
        case 4:
          Mn();
          break;
        case 13:
          ee(ne);
          break;
        case 19:
          ee(ne);
          break;
        case 10:
          ii(r.type._context);
          break;
        case 22:
        case 23:
          Ni();
      }
      n = n.return;
    }
  if (
    ((me = e),
    (ue = e = Ft(e.current, null)),
    (ge = Me = t),
    (de = 0),
    (Rr = null),
    (wi = Xl = ln = 0),
    (Pe = cr = null),
    Xt !== null)
  ) {
    for (t = 0; t < Xt.length; t++)
      if (((n = Xt[t]), (r = n.interleaved), r !== null)) {
        n.interleaved = null;
        var l = r.next,
          s = n.pending;
        if (s !== null) {
          var i = s.next;
          ((s.next = l), (r.next = i));
        }
        n.pending = r;
      }
    Xt = null;
  }
  return e;
}
function sd(e, t) {
  do {
    var n = ue;
    try {
      if ((oi(), (il.current = Ll), Il)) {
        for (var r = re.memoizedState; r !== null; ) {
          var l = r.queue;
          (l !== null && (l.pending = null), (r = r.next));
        }
        Il = !1;
      }
      if (
        ((rn = 0),
        (pe = ce = re = null),
        (ar = !1),
        (br = 0),
        (vi.current = null),
        n === null || n.return === null)
      ) {
        ((de = 1), (Rr = t), (ue = null));
        break;
      }
      e: {
        var s = e,
          i = n.return,
          a = n,
          u = t;
        if (
          ((t = ge),
          (a.flags |= 32768),
          u !== null && typeof u == "object" && typeof u.then == "function")
        ) {
          var c = u,
            h = a,
            x = h.tag;
          if (!(h.mode & 1) && (x === 0 || x === 11 || x === 15)) {
            var m = h.alternate;
            m
              ? ((h.updateQueue = m.updateQueue),
                (h.memoizedState = m.memoizedState),
                (h.lanes = m.lanes))
              : ((h.updateQueue = null), (h.memoizedState = null));
          }
          var v = Ea(i);
          if (v !== null) {
            ((v.flags &= -257),
              ba(v, i, a, s, t),
              v.mode & 1 && Ca(s, c, t),
              (t = v),
              (u = c));
            var w = t.updateQueue;
            if (w === null) {
              var y = new Set();
              (y.add(u), (t.updateQueue = y));
            } else w.add(u);
            break e;
          } else {
            if (!(t & 1)) {
              (Ca(s, c, t), Si());
              break e;
            }
            u = Error(P(426));
          }
        } else if (te && a.mode & 1) {
          var j = Ea(i);
          if (j !== null) {
            (!(j.flags & 65536) && (j.flags |= 256),
              ba(j, i, a, s, t),
              li(zn(u, a)));
            break e;
          }
        }
        ((s = u = zn(u, a)),
          de !== 4 && (de = 2),
          cr === null ? (cr = [s]) : cr.push(s),
          (s = i));
        do {
          switch (s.tag) {
            case 3:
              ((s.flags |= 65536), (t &= -t), (s.lanes |= t));
              var f = Vc(s, u, t);
              va(s, f);
              break e;
            case 1:
              a = u;
              var d = s.type,
                p = s.stateNode;
              if (
                !(s.flags & 128) &&
                (typeof d.getDerivedStateFromError == "function" ||
                  (p !== null &&
                    typeof p.componentDidCatch == "function" &&
                    (At === null || !At.has(p))))
              ) {
                ((s.flags |= 65536), (t &= -t), (s.lanes |= t));
                var g = Wc(s, a, t);
                va(s, g);
                break e;
              }
          }
          s = s.return;
        } while (s !== null);
      }
      ad(n);
    } catch (N) {
      ((t = N), ue === n && n !== null && (ue = n = n.return));
      continue;
    }
    break;
  } while (!0);
}
function od() {
  var e = Tl.current;
  return ((Tl.current = Ll), e === null ? Ll : e);
}
function Si() {
  ((de === 0 || de === 3 || de === 2) && (de = 4),
    me === null || (!(ln & 268435455) && !(Xl & 268435455)) || Rt(me, ge));
}
function Ul(e, t) {
  var n = K;
  K |= 2;
  var r = od();
  (me !== e || ge !== t) && ((ft = null), Zt(e, t));
  do
    try {
      em();
      break;
    } catch (l) {
      sd(e, l);
    }
  while (!0);
  if ((oi(), (K = n), (Tl.current = r), ue !== null)) throw Error(P(261));
  return ((me = null), (ge = 0), de);
}
function em() {
  for (; ue !== null; ) id(ue);
}
function tm() {
  for (; ue !== null && !Ef(); ) id(ue);
}
function id(e) {
  var t = cd(e.alternate, e, Me);
  ((e.memoizedProps = e.pendingProps),
    t === null ? ad(e) : (ue = t),
    (vi.current = null));
}
function ad(e) {
  var t = e;
  do {
    var n = t.alternate;
    if (((e = t.return), t.flags & 32768)) {
      if (((n = Kp(n, t)), n !== null)) {
        ((n.flags &= 32767), (ue = n));
        return;
      }
      if (e !== null)
        ((e.flags |= 32768), (e.subtreeFlags = 0), (e.deletions = null));
      else {
        ((de = 6), (ue = null));
        return;
      }
    } else if (((n = Qp(n, t, Me)), n !== null)) {
      ue = n;
      return;
    }
    if (((t = t.sibling), t !== null)) {
      ue = t;
      return;
    }
    ue = t = e;
  } while (t !== null);
  de === 0 && (de = 5);
}
function Kt(e, t, n) {
  var r = Y,
    l = He.transition;
  try {
    ((He.transition = null), (Y = 1), nm(e, t, n, r));
  } finally {
    ((He.transition = l), (Y = r));
  }
  return null;
}
function nm(e, t, n, r) {
  do Pn();
  while (Lt !== null);
  if (K & 6) throw Error(P(327));
  n = e.finishedWork;
  var l = e.finishedLanes;
  if (n === null) return null;
  if (((e.finishedWork = null), (e.finishedLanes = 0), n === e.current))
    throw Error(P(177));
  ((e.callbackNode = null), (e.callbackPriority = 0));
  var s = n.lanes | n.childLanes;
  if (
    (Uf(e, s),
    e === me && ((ue = me = null), (ge = 0)),
    (!(n.subtreeFlags & 2064) && !(n.flags & 2064)) ||
      Jr ||
      ((Jr = !0),
      dd(xl, function () {
        return (Pn(), null);
      })),
    (s = (n.flags & 15990) !== 0),
    n.subtreeFlags & 15990 || s)
  ) {
    ((s = He.transition), (He.transition = null));
    var i = Y;
    Y = 1;
    var a = K;
    ((K |= 4),
      (vi.current = null),
      Xp(e, n),
      nd(n, e),
      jp(io),
      (vl = !!oo),
      (io = oo = null),
      (e.current = n),
      qp(n),
      bf(),
      (K = a),
      (Y = i),
      (He.transition = s));
  } else e.current = n;
  if (
    (Jr && ((Jr = !1), (Lt = e), (zl = l)),
    (s = e.pendingLanes),
    s === 0 && (At = null),
    Rf(n.stateNode),
    Le(e, ae()),
    t !== null)
  )
    for (r = e.onRecoverableError, n = 0; n < t.length; n++)
      ((l = t[n]), r(l.value, { componentStack: l.stack, digest: l.digest }));
  if (Ml) throw ((Ml = !1), (e = Po), (Po = null), e);
  return (
    zl & 1 && e.tag !== 0 && Pn(),
    (s = e.pendingLanes),
    s & 1 ? (e === _o ? dr++ : ((dr = 0), (_o = e))) : (dr = 0),
    Ht(),
    null
  );
}
function Pn() {
  if (Lt !== null) {
    var e = Vu(zl),
      t = He.transition,
      n = Y;
    try {
      if (((He.transition = null), (Y = 16 > e ? 16 : e), Lt === null))
        var r = !1;
      else {
        if (((e = Lt), (Lt = null), (zl = 0), K & 6)) throw Error(P(331));
        var l = K;
        for (K |= 4, M = e.current; M !== null; ) {
          var s = M,
            i = s.child;
          if (M.flags & 16) {
            var a = s.deletions;
            if (a !== null) {
              for (var u = 0; u < a.length; u++) {
                var c = a[u];
                for (M = c; M !== null; ) {
                  var h = M;
                  switch (h.tag) {
                    case 0:
                    case 11:
                    case 15:
                      ur(8, h, s);
                  }
                  var x = h.child;
                  if (x !== null) ((x.return = h), (M = x));
                  else
                    for (; M !== null; ) {
                      h = M;
                      var m = h.sibling,
                        v = h.return;
                      if ((Jc(h), h === c)) {
                        M = null;
                        break;
                      }
                      if (m !== null) {
                        ((m.return = v), (M = m));
                        break;
                      }
                      M = v;
                    }
                }
              }
              var w = s.alternate;
              if (w !== null) {
                var y = w.child;
                if (y !== null) {
                  w.child = null;
                  do {
                    var j = y.sibling;
                    ((y.sibling = null), (y = j));
                  } while (y !== null);
                }
              }
              M = s;
            }
          }
          if (s.subtreeFlags & 2064 && i !== null) ((i.return = s), (M = i));
          else
            e: for (; M !== null; ) {
              if (((s = M), s.flags & 2048))
                switch (s.tag) {
                  case 0:
                  case 11:
                  case 15:
                    ur(9, s, s.return);
                }
              var f = s.sibling;
              if (f !== null) {
                ((f.return = s.return), (M = f));
                break e;
              }
              M = s.return;
            }
        }
        var d = e.current;
        for (M = d; M !== null; ) {
          i = M;
          var p = i.child;
          if (i.subtreeFlags & 2064 && p !== null) ((p.return = i), (M = p));
          else
            e: for (i = d; M !== null; ) {
              if (((a = M), a.flags & 2048))
                try {
                  switch (a.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Yl(9, a);
                  }
                } catch (N) {
                  se(a, a.return, N);
                }
              if (a === i) {
                M = null;
                break e;
              }
              var g = a.sibling;
              if (g !== null) {
                ((g.return = a.return), (M = g));
                break e;
              }
              M = a.return;
            }
        }
        if (
          ((K = l), Ht(), it && typeof it.onPostCommitFiberRoot == "function")
        )
          try {
            it.onPostCommitFiberRoot($l, e);
          } catch {}
        r = !0;
      }
      return r;
    } finally {
      ((Y = n), (He.transition = t));
    }
  }
  return !1;
}
function Fa(e, t, n) {
  ((t = zn(n, t)),
    (t = Vc(e, t, 1)),
    (e = Ot(e, t, 1)),
    (t = Ce()),
    e !== null && (Mr(e, 1, t), Le(e, t)));
}
function se(e, t, n) {
  if (e.tag === 3) Fa(e, e, n);
  else
    for (; t !== null; ) {
      if (t.tag === 3) {
        Fa(t, e, n);
        break;
      } else if (t.tag === 1) {
        var r = t.stateNode;
        if (
          typeof t.type.getDerivedStateFromError == "function" ||
          (typeof r.componentDidCatch == "function" &&
            (At === null || !At.has(r)))
        ) {
          ((e = zn(n, e)),
            (e = Wc(t, e, 1)),
            (t = Ot(t, e, 1)),
            (e = Ce()),
            t !== null && (Mr(t, 1, e), Le(t, e)));
          break;
        }
      }
      t = t.return;
    }
}
function rm(e, t, n) {
  var r = e.pingCache;
  (r !== null && r.delete(t),
    (t = Ce()),
    (e.pingedLanes |= e.suspendedLanes & n),
    me === e &&
      (ge & n) === n &&
      (de === 4 || (de === 3 && (ge & 130023424) === ge && 500 > ae() - ki)
        ? Zt(e, 0)
        : (wi |= n)),
    Le(e, t));
}
function ud(e, t) {
  t === 0 &&
    (e.mode & 1
      ? ((t = Wr), (Wr <<= 1), !(Wr & 130023424) && (Wr = 4194304))
      : (t = 1));
  var n = Ce();
  ((e = vt(e, t)), e !== null && (Mr(e, t, n), Le(e, n)));
}
function lm(e) {
  var t = e.memoizedState,
    n = 0;
  (t !== null && (n = t.retryLane), ud(e, n));
}
function sm(e, t) {
  var n = 0;
  switch (e.tag) {
    case 13:
      var r = e.stateNode,
        l = e.memoizedState;
      l !== null && (n = l.retryLane);
      break;
    case 19:
      r = e.stateNode;
      break;
    default:
      throw Error(P(314));
  }
  (r !== null && r.delete(t), ud(e, n));
}
var cd;
cd = function (e, t, n) {
  if (e !== null)
    if (e.memoizedProps !== t.pendingProps || Re.current) _e = !0;
    else {
      if (!(e.lanes & n) && !(t.flags & 128)) return ((_e = !1), Gp(e, t, n));
      _e = !!(e.flags & 131072);
    }
  else ((_e = !1), te && t.flags & 1048576 && mc(t, El, t.index));
  switch (((t.lanes = 0), t.tag)) {
    case 2:
      var r = t.type;
      (ul(e, t), (e = t.pendingProps));
      var l = In(t, je.current);
      (bn(t, n), (l = mi(null, t, r, e, l, n)));
      var s = hi();
      return (
        (t.flags |= 1),
        typeof l == "object" &&
        l !== null &&
        typeof l.render == "function" &&
        l.$$typeof === void 0
          ? ((t.tag = 1),
            (t.memoizedState = null),
            (t.updateQueue = null),
            Ie(r) ? ((s = !0), Sl(t)) : (s = !1),
            (t.memoizedState =
              l.state !== null && l.state !== void 0 ? l.state : null),
            ui(t),
            (l.updater = Kl),
            (t.stateNode = l),
            (l._reactInternals = t),
            xo(t, r, e, n),
            (t = wo(null, t, r, !0, s, n)))
          : ((t.tag = 0), te && s && ni(t), Ne(null, t, l, n), (t = t.child)),
        t
      );
    case 16:
      r = t.elementType;
      e: {
        switch (
          (ul(e, t),
          (e = t.pendingProps),
          (l = r._init),
          (r = l(r._payload)),
          (t.type = r),
          (l = t.tag = im(r)),
          (e = Xe(r, e)),
          l)
        ) {
          case 0:
            t = vo(null, t, r, e, n);
            break e;
          case 1:
            t = Ra(null, t, r, e, n);
            break e;
          case 11:
            t = Pa(null, t, r, e, n);
            break e;
          case 14:
            t = _a(null, t, r, Xe(r.type, e), n);
            break e;
        }
        throw Error(P(306, r, ""));
      }
      return t;
    case 0:
      return (
        (r = t.type),
        (l = t.pendingProps),
        (l = t.elementType === r ? l : Xe(r, l)),
        vo(e, t, r, l, n)
      );
    case 1:
      return (
        (r = t.type),
        (l = t.pendingProps),
        (l = t.elementType === r ? l : Xe(r, l)),
        Ra(e, t, r, l, n)
      );
    case 3:
      e: {
        if ((Qc(t), e === null)) throw Error(P(387));
        ((r = t.pendingProps),
          (s = t.memoizedState),
          (l = s.element),
          wc(e, t),
          _l(t, r, null, n));
        var i = t.memoizedState;
        if (((r = i.element), s.isDehydrated))
          if (
            ((s = {
              element: r,
              isDehydrated: !1,
              cache: i.cache,
              pendingSuspenseBoundaries: i.pendingSuspenseBoundaries,
              transitions: i.transitions,
            }),
            (t.updateQueue.baseState = s),
            (t.memoizedState = s),
            t.flags & 256)
          ) {
            ((l = zn(Error(P(423)), t)), (t = Ia(e, t, r, n, l)));
            break e;
          } else if (r !== l) {
            ((l = zn(Error(P(424)), t)), (t = Ia(e, t, r, n, l)));
            break e;
          } else
            for (
              ze = Ut(t.stateNode.containerInfo.firstChild),
                Ue = t,
                te = !0,
                Ze = null,
                n = yc(t, null, r, n),
                t.child = n;
              n;
            )
              ((n.flags = (n.flags & -3) | 4096), (n = n.sibling));
        else {
          if ((Ln(), r === l)) {
            t = wt(e, t, n);
            break e;
          }
          Ne(e, t, r, n);
        }
        t = t.child;
      }
      return t;
    case 5:
      return (
        kc(t),
        e === null && mo(t),
        (r = t.type),
        (l = t.pendingProps),
        (s = e !== null ? e.memoizedProps : null),
        (i = l.children),
        ao(r, l) ? (i = null) : s !== null && ao(r, s) && (t.flags |= 32),
        Gc(e, t),
        Ne(e, t, i, n),
        t.child
      );
    case 6:
      return (e === null && mo(t), null);
    case 13:
      return Kc(e, t, n);
    case 4:
      return (
        ci(t, t.stateNode.containerInfo),
        (r = t.pendingProps),
        e === null ? (t.child = Tn(t, null, r, n)) : Ne(e, t, r, n),
        t.child
      );
    case 11:
      return (
        (r = t.type),
        (l = t.pendingProps),
        (l = t.elementType === r ? l : Xe(r, l)),
        Pa(e, t, r, l, n)
      );
    case 7:
      return (Ne(e, t, t.pendingProps, n), t.child);
    case 8:
      return (Ne(e, t, t.pendingProps.children, n), t.child);
    case 12:
      return (Ne(e, t, t.pendingProps.children, n), t.child);
    case 10:
      e: {
        if (
          ((r = t.type._context),
          (l = t.pendingProps),
          (s = t.memoizedProps),
          (i = l.value),
          X(bl, r._currentValue),
          (r._currentValue = i),
          s !== null)
        )
          if (tt(s.value, i)) {
            if (s.children === l.children && !Re.current) {
              t = wt(e, t, n);
              break e;
            }
          } else
            for (s = t.child, s !== null && (s.return = t); s !== null; ) {
              var a = s.dependencies;
              if (a !== null) {
                i = s.child;
                for (var u = a.firstContext; u !== null; ) {
                  if (u.context === r) {
                    if (s.tag === 1) {
                      ((u = gt(-1, n & -n)), (u.tag = 2));
                      var c = s.updateQueue;
                      if (c !== null) {
                        c = c.shared;
                        var h = c.pending;
                        (h === null
                          ? (u.next = u)
                          : ((u.next = h.next), (h.next = u)),
                          (c.pending = u));
                      }
                    }
                    ((s.lanes |= n),
                      (u = s.alternate),
                      u !== null && (u.lanes |= n),
                      ho(s.return, n, t),
                      (a.lanes |= n));
                    break;
                  }
                  u = u.next;
                }
              } else if (s.tag === 10) i = s.type === t.type ? null : s.child;
              else if (s.tag === 18) {
                if (((i = s.return), i === null)) throw Error(P(341));
                ((i.lanes |= n),
                  (a = i.alternate),
                  a !== null && (a.lanes |= n),
                  ho(i, n, t),
                  (i = s.sibling));
              } else i = s.child;
              if (i !== null) i.return = s;
              else
                for (i = s; i !== null; ) {
                  if (i === t) {
                    i = null;
                    break;
                  }
                  if (((s = i.sibling), s !== null)) {
                    ((s.return = i.return), (i = s));
                    break;
                  }
                  i = i.return;
                }
              s = i;
            }
        (Ne(e, t, l.children, n), (t = t.child));
      }
      return t;
    case 9:
      return (
        (l = t.type),
        (r = t.pendingProps.children),
        bn(t, n),
        (l = Ge(l)),
        (r = r(l)),
        (t.flags |= 1),
        Ne(e, t, r, n),
        t.child
      );
    case 14:
      return (
        (r = t.type),
        (l = Xe(r, t.pendingProps)),
        (l = Xe(r.type, l)),
        _a(e, t, r, l, n)
      );
    case 15:
      return Bc(e, t, t.type, t.pendingProps, n);
    case 17:
      return (
        (r = t.type),
        (l = t.pendingProps),
        (l = t.elementType === r ? l : Xe(r, l)),
        ul(e, t),
        (t.tag = 1),
        Ie(r) ? ((e = !0), Sl(t)) : (e = !1),
        bn(t, n),
        $c(t, r, l),
        xo(t, r, l, n),
        wo(null, t, r, !0, e, n)
      );
    case 19:
      return Yc(e, t, n);
    case 22:
      return Hc(e, t, n);
  }
  throw Error(P(156, t.tag));
};
function dd(e, t) {
  return Au(e, t);
}
function om(e, t, n, r) {
  ((this.tag = e),
    (this.key = n),
    (this.sibling =
      this.child =
      this.return =
      this.stateNode =
      this.type =
      this.elementType =
        null),
    (this.index = 0),
    (this.ref = null),
    (this.pendingProps = t),
    (this.dependencies =
      this.memoizedState =
      this.updateQueue =
      this.memoizedProps =
        null),
    (this.mode = r),
    (this.subtreeFlags = this.flags = 0),
    (this.deletions = null),
    (this.childLanes = this.lanes = 0),
    (this.alternate = null));
}
function Be(e, t, n, r) {
  return new om(e, t, n, r);
}
function Ci(e) {
  return ((e = e.prototype), !(!e || !e.isReactComponent));
}
function im(e) {
  if (typeof e == "function") return Ci(e) ? 1 : 0;
  if (e != null) {
    if (((e = e.$$typeof), e === Bo)) return 11;
    if (e === Ho) return 14;
  }
  return 2;
}
function Ft(e, t) {
  var n = e.alternate;
  return (
    n === null
      ? ((n = Be(e.tag, t, e.key, e.mode)),
        (n.elementType = e.elementType),
        (n.type = e.type),
        (n.stateNode = e.stateNode),
        (n.alternate = e),
        (e.alternate = n))
      : ((n.pendingProps = t),
        (n.type = e.type),
        (n.flags = 0),
        (n.subtreeFlags = 0),
        (n.deletions = null)),
    (n.flags = e.flags & 14680064),
    (n.childLanes = e.childLanes),
    (n.lanes = e.lanes),
    (n.child = e.child),
    (n.memoizedProps = e.memoizedProps),
    (n.memoizedState = e.memoizedState),
    (n.updateQueue = e.updateQueue),
    (t = e.dependencies),
    (n.dependencies =
      t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }),
    (n.sibling = e.sibling),
    (n.index = e.index),
    (n.ref = e.ref),
    n
  );
}
function fl(e, t, n, r, l, s) {
  var i = 2;
  if (((r = e), typeof e == "function")) Ci(e) && (i = 1);
  else if (typeof e == "string") i = 5;
  else
    e: switch (e) {
      case fn:
        return Jt(n.children, l, s, t);
      case Wo:
        ((i = 8), (l |= 8));
        break;
      case Fs:
        return (
          (e = Be(12, n, t, l | 2)),
          (e.elementType = Fs),
          (e.lanes = s),
          e
        );
      case $s:
        return ((e = Be(13, n, t, l)), (e.elementType = $s), (e.lanes = s), e);
      case Vs:
        return ((e = Be(19, n, t, l)), (e.elementType = Vs), (e.lanes = s), e);
      case ku:
        return ql(n, l, s, t);
      default:
        if (typeof e == "object" && e !== null)
          switch (e.$$typeof) {
            case vu:
              i = 10;
              break e;
            case wu:
              i = 9;
              break e;
            case Bo:
              i = 11;
              break e;
            case Ho:
              i = 14;
              break e;
            case bt:
              ((i = 16), (r = null));
              break e;
          }
        throw Error(P(130, e == null ? e : typeof e, ""));
    }
  return (
    (t = Be(i, n, t, l)),
    (t.elementType = e),
    (t.type = r),
    (t.lanes = s),
    t
  );
}
function Jt(e, t, n, r) {
  return ((e = Be(7, e, r, t)), (e.lanes = n), e);
}
function ql(e, t, n, r) {
  return (
    (e = Be(22, e, r, t)),
    (e.elementType = ku),
    (e.lanes = n),
    (e.stateNode = { isHidden: !1 }),
    e
  );
}
function _s(e, t, n) {
  return ((e = Be(6, e, null, t)), (e.lanes = n), e);
}
function Rs(e, t, n) {
  return (
    (t = Be(4, e.children !== null ? e.children : [], e.key, t)),
    (t.lanes = n),
    (t.stateNode = {
      containerInfo: e.containerInfo,
      pendingChildren: null,
      implementation: e.implementation,
    }),
    t
  );
}
function am(e, t, n, r, l) {
  ((this.tag = t),
    (this.containerInfo = e),
    (this.finishedWork =
      this.pingCache =
      this.current =
      this.pendingChildren =
        null),
    (this.timeoutHandle = -1),
    (this.callbackNode = this.pendingContext = this.context = null),
    (this.callbackPriority = 0),
    (this.eventTimes = cs(0)),
    (this.expirationTimes = cs(-1)),
    (this.entangledLanes =
      this.finishedLanes =
      this.mutableReadLanes =
      this.expiredLanes =
      this.pingedLanes =
      this.suspendedLanes =
      this.pendingLanes =
        0),
    (this.entanglements = cs(0)),
    (this.identifierPrefix = r),
    (this.onRecoverableError = l),
    (this.mutableSourceEagerHydrationData = null));
}
function Ei(e, t, n, r, l, s, i, a, u) {
  return (
    (e = new am(e, t, n, a, u)),
    t === 1 ? ((t = 1), s === !0 && (t |= 8)) : (t = 0),
    (s = Be(3, null, null, t)),
    (e.current = s),
    (s.stateNode = e),
    (s.memoizedState = {
      element: r,
      isDehydrated: n,
      cache: null,
      transitions: null,
      pendingSuspenseBoundaries: null,
    }),
    ui(s),
    e
  );
}
function um(e, t, n) {
  var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
  return {
    $$typeof: dn,
    key: r == null ? null : "" + r,
    children: e,
    containerInfo: t,
    implementation: n,
  };
}
function fd(e) {
  if (!e) return Vt;
  e = e._reactInternals;
  e: {
    if (an(e) !== e || e.tag !== 1) throw Error(P(170));
    var t = e;
    do {
      switch (t.tag) {
        case 3:
          t = t.stateNode.context;
          break e;
        case 1:
          if (Ie(t.type)) {
            t = t.stateNode.__reactInternalMemoizedMergedChildContext;
            break e;
          }
      }
      t = t.return;
    } while (t !== null);
    throw Error(P(171));
  }
  if (e.tag === 1) {
    var n = e.type;
    if (Ie(n)) return fc(e, n, t);
  }
  return t;
}
function pd(e, t, n, r, l, s, i, a, u) {
  return (
    (e = Ei(n, r, !0, e, l, s, i, a, u)),
    (e.context = fd(null)),
    (n = e.current),
    (r = Ce()),
    (l = Dt(n)),
    (s = gt(r, l)),
    (s.callback = t ?? null),
    Ot(n, s, l),
    (e.current.lanes = l),
    Mr(e, l, r),
    Le(e, r),
    e
  );
}
function Zl(e, t, n, r) {
  var l = t.current,
    s = Ce(),
    i = Dt(l);
  return (
    (n = fd(n)),
    t.context === null ? (t.context = n) : (t.pendingContext = n),
    (t = gt(s, i)),
    (t.payload = { element: e }),
    (r = r === void 0 ? null : r),
    r !== null && (t.callback = r),
    (e = Ot(l, t, i)),
    e !== null && (et(e, l, i, s), ol(e, l, i)),
    i
  );
}
function Ol(e) {
  if (((e = e.current), !e.child)) return null;
  switch (e.child.tag) {
    case 5:
      return e.child.stateNode;
    default:
      return e.child.stateNode;
  }
}
function $a(e, t) {
  if (((e = e.memoizedState), e !== null && e.dehydrated !== null)) {
    var n = e.retryLane;
    e.retryLane = n !== 0 && n < t ? n : t;
  }
}
function bi(e, t) {
  ($a(e, t), (e = e.alternate) && $a(e, t));
}
function cm() {
  return null;
}
var md =
  typeof reportError == "function"
    ? reportError
    : function (e) {
        console.error(e);
      };
function Pi(e) {
  this._internalRoot = e;
}
Jl.prototype.render = Pi.prototype.render = function (e) {
  var t = this._internalRoot;
  if (t === null) throw Error(P(409));
  Zl(e, t, null, null);
};
Jl.prototype.unmount = Pi.prototype.unmount = function () {
  var e = this._internalRoot;
  if (e !== null) {
    this._internalRoot = null;
    var t = e.containerInfo;
    (sn(function () {
      Zl(null, e, null, null);
    }),
      (t[yt] = null));
  }
};
function Jl(e) {
  this._internalRoot = e;
}
Jl.prototype.unstable_scheduleHydration = function (e) {
  if (e) {
    var t = Hu();
    e = { blockedOn: null, target: e, priority: t };
    for (var n = 0; n < _t.length && t !== 0 && t < _t[n].priority; n++);
    (_t.splice(n, 0, e), n === 0 && Qu(e));
  }
};
function _i(e) {
  return !(!e || (e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11));
}
function es(e) {
  return !(
    !e ||
    (e.nodeType !== 1 &&
      e.nodeType !== 9 &&
      e.nodeType !== 11 &&
      (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "))
  );
}
function Va() {}
function dm(e, t, n, r, l) {
  if (l) {
    if (typeof r == "function") {
      var s = r;
      r = function () {
        var c = Ol(i);
        s.call(c);
      };
    }
    var i = pd(t, r, e, 0, null, !1, !1, "", Va);
    return (
      (e._reactRootContainer = i),
      (e[yt] = i.current),
      jr(e.nodeType === 8 ? e.parentNode : e),
      sn(),
      i
    );
  }
  for (; (l = e.lastChild); ) e.removeChild(l);
  if (typeof r == "function") {
    var a = r;
    r = function () {
      var c = Ol(u);
      a.call(c);
    };
  }
  var u = Ei(e, 0, !1, null, null, !1, !1, "", Va);
  return (
    (e._reactRootContainer = u),
    (e[yt] = u.current),
    jr(e.nodeType === 8 ? e.parentNode : e),
    sn(function () {
      Zl(t, u, n, r);
    }),
    u
  );
}
function ts(e, t, n, r, l) {
  var s = n._reactRootContainer;
  if (s) {
    var i = s;
    if (typeof l == "function") {
      var a = l;
      l = function () {
        var u = Ol(i);
        a.call(u);
      };
    }
    Zl(t, i, e, l);
  } else i = dm(n, t, e, l, r);
  return Ol(i);
}
Wu = function (e) {
  switch (e.tag) {
    case 3:
      var t = e.stateNode;
      if (t.current.memoizedState.isDehydrated) {
        var n = tr(t.pendingLanes);
        n !== 0 &&
          (Ko(t, n | 1), Le(t, ae()), !(K & 6) && ((Un = ae() + 500), Ht()));
      }
      break;
    case 13:
      (sn(function () {
        var r = vt(e, 1);
        if (r !== null) {
          var l = Ce();
          et(r, e, 1, l);
        }
      }),
        bi(e, 1));
  }
};
Yo = function (e) {
  if (e.tag === 13) {
    var t = vt(e, 134217728);
    if (t !== null) {
      var n = Ce();
      et(t, e, 134217728, n);
    }
    bi(e, 134217728);
  }
};
Bu = function (e) {
  if (e.tag === 13) {
    var t = Dt(e),
      n = vt(e, t);
    if (n !== null) {
      var r = Ce();
      et(n, e, t, r);
    }
    bi(e, t);
  }
};
Hu = function () {
  return Y;
};
Gu = function (e, t) {
  var n = Y;
  try {
    return ((Y = e), t());
  } finally {
    Y = n;
  }
};
Zs = function (e, t, n) {
  switch (t) {
    case "input":
      if ((Hs(e, n), (t = n.name), n.type === "radio" && t != null)) {
        for (n = e; n.parentNode; ) n = n.parentNode;
        for (
          n = n.querySelectorAll(
            "input[name=" + JSON.stringify("" + t) + '][type="radio"]',
          ),
            t = 0;
          t < n.length;
          t++
        ) {
          var r = n[t];
          if (r !== e && r.form === e.form) {
            var l = Hl(r);
            if (!l) throw Error(P(90));
            (Nu(r), Hs(r, l));
          }
        }
      }
      break;
    case "textarea":
      Cu(e, n);
      break;
    case "select":
      ((t = n.value), t != null && Nn(e, !!n.multiple, t, !1));
  }
};
Lu = ji;
Tu = sn;
var fm = { usingClientEntryPoint: !1, Events: [Ur, gn, Hl, Ru, Iu, ji] },
  Yn = {
    findFiberByHostInstance: Yt,
    bundleType: 0,
    version: "18.3.1",
    rendererPackageName: "react-dom",
  },
  pm = {
    bundleType: Yn.bundleType,
    version: Yn.version,
    rendererPackageName: Yn.rendererPackageName,
    rendererConfig: Yn.rendererConfig,
    overrideHookState: null,
    overrideHookStateDeletePath: null,
    overrideHookStateRenamePath: null,
    overrideProps: null,
    overridePropsDeletePath: null,
    overridePropsRenamePath: null,
    setErrorHandler: null,
    setSuspenseHandler: null,
    scheduleUpdate: null,
    currentDispatcherRef: kt.ReactCurrentDispatcher,
    findHostInstanceByFiber: function (e) {
      return ((e = Uu(e)), e === null ? null : e.stateNode);
    },
    findFiberByHostInstance: Yn.findFiberByHostInstance || cm,
    findHostInstancesForRefresh: null,
    scheduleRefresh: null,
    scheduleRoot: null,
    setRefreshHandler: null,
    getCurrentFiber: null,
    reconcilerVersion: "18.3.1-next-f1338f8080-20240426",
  };
if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
  var el = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!el.isDisabled && el.supportsFiber)
    try {
      (($l = el.inject(pm)), (it = el));
    } catch {}
}
Ae.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = fm;
Ae.createPortal = function (e, t) {
  var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
  if (!_i(t)) throw Error(P(200));
  return um(e, t, null, n);
};
Ae.createRoot = function (e, t) {
  if (!_i(e)) throw Error(P(299));
  var n = !1,
    r = "",
    l = md;
  return (
    t != null &&
      (t.unstable_strictMode === !0 && (n = !0),
      t.identifierPrefix !== void 0 && (r = t.identifierPrefix),
      t.onRecoverableError !== void 0 && (l = t.onRecoverableError)),
    (t = Ei(e, 1, !1, null, null, n, !1, r, l)),
    (e[yt] = t.current),
    jr(e.nodeType === 8 ? e.parentNode : e),
    new Pi(t)
  );
};
Ae.findDOMNode = function (e) {
  if (e == null) return null;
  if (e.nodeType === 1) return e;
  var t = e._reactInternals;
  if (t === void 0)
    throw typeof e.render == "function"
      ? Error(P(188))
      : ((e = Object.keys(e).join(",")), Error(P(268, e)));
  return ((e = Uu(t)), (e = e === null ? null : e.stateNode), e);
};
Ae.flushSync = function (e) {
  return sn(e);
};
Ae.hydrate = function (e, t, n) {
  if (!es(t)) throw Error(P(200));
  return ts(null, e, t, !0, n);
};
Ae.hydrateRoot = function (e, t, n) {
  if (!_i(e)) throw Error(P(405));
  var r = (n != null && n.hydratedSources) || null,
    l = !1,
    s = "",
    i = md;
  if (
    (n != null &&
      (n.unstable_strictMode === !0 && (l = !0),
      n.identifierPrefix !== void 0 && (s = n.identifierPrefix),
      n.onRecoverableError !== void 0 && (i = n.onRecoverableError)),
    (t = pd(t, null, e, 1, n ?? null, l, !1, s, i)),
    (e[yt] = t.current),
    jr(e),
    r)
  )
    for (e = 0; e < r.length; e++)
      ((n = r[e]),
        (l = n._getVersion),
        (l = l(n._source)),
        t.mutableSourceEagerHydrationData == null
          ? (t.mutableSourceEagerHydrationData = [n, l])
          : t.mutableSourceEagerHydrationData.push(n, l));
  return new Jl(t);
};
Ae.render = function (e, t, n) {
  if (!es(t)) throw Error(P(200));
  return ts(null, e, t, !1, n);
};
Ae.unmountComponentAtNode = function (e) {
  if (!es(e)) throw Error(P(40));
  return e._reactRootContainer
    ? (sn(function () {
        ts(null, null, e, !1, function () {
          ((e._reactRootContainer = null), (e[yt] = null));
        });
      }),
      !0)
    : !1;
};
Ae.unstable_batchedUpdates = ji;
Ae.unstable_renderSubtreeIntoContainer = function (e, t, n, r) {
  if (!es(n)) throw Error(P(200));
  if (e == null || e._reactInternals === void 0) throw Error(P(38));
  return ts(e, t, n, !1, r);
};
Ae.version = "18.3.1-next-f1338f8080-20240426";
function hd() {
  if (
    !(
      typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" ||
      typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"
    )
  )
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(hd);
    } catch (e) {
      console.error(e);
    }
}
(hd(), (hu.exports = Ae));
var mm = hu.exports,
  Wa = mm;
((As.createRoot = Wa.createRoot), (As.hydrateRoot = Wa.hydrateRoot));
const hm = {},
  Ba = (e) => {
    let t;
    const n = new Set(),
      r = (h, x) => {
        const m = typeof h == "function" ? h(t) : h;
        if (!Object.is(m, t)) {
          const v = t;
          ((t =
            (x ?? (typeof m != "object" || m === null))
              ? m
              : Object.assign({}, t, m)),
            n.forEach((w) => w(t, v)));
        }
      },
      l = () => t,
      u = {
        setState: r,
        getState: l,
        getInitialState: () => c,
        subscribe: (h) => (n.add(h), () => n.delete(h)),
        destroy: () => {
          ((hm ? "production" : void 0) !== "production" &&
            console.warn(
              "[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected.",
            ),
            n.clear());
        },
      },
      c = (t = e(r, l, u));
    return u;
  },
  gm = (e) => (e ? Ba(e) : Ba);
var gd = { exports: {} },
  xd = {},
  yd = { exports: {} },
  vd = {};
/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var On = z;
function xm(e, t) {
  return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t);
}
var ym = typeof Object.is == "function" ? Object.is : xm,
  vm = On.useState,
  wm = On.useEffect,
  km = On.useLayoutEffect,
  jm = On.useDebugValue;
function Nm(e, t) {
  var n = t(),
    r = vm({ inst: { value: n, getSnapshot: t } }),
    l = r[0].inst,
    s = r[1];
  return (
    km(
      function () {
        ((l.value = n), (l.getSnapshot = t), Is(l) && s({ inst: l }));
      },
      [e, n, t],
    ),
    wm(
      function () {
        return (
          Is(l) && s({ inst: l }),
          e(function () {
            Is(l) && s({ inst: l });
          })
        );
      },
      [e],
    ),
    jm(n),
    n
  );
}
function Is(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !ym(e, n);
  } catch {
    return !0;
  }
}
function Sm(e, t) {
  return t();
}
var Cm =
  typeof window > "u" ||
  typeof window.document > "u" ||
  typeof window.document.createElement > "u"
    ? Sm
    : Nm;
vd.useSyncExternalStore =
  On.useSyncExternalStore !== void 0 ? On.useSyncExternalStore : Cm;
yd.exports = vd;
var Em = yd.exports;
/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var ns = z,
  bm = Em;
function Pm(e, t) {
  return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t);
}
var _m = typeof Object.is == "function" ? Object.is : Pm,
  Rm = bm.useSyncExternalStore,
  Im = ns.useRef,
  Lm = ns.useEffect,
  Tm = ns.useMemo,
  Mm = ns.useDebugValue;
xd.useSyncExternalStoreWithSelector = function (e, t, n, r, l) {
  var s = Im(null);
  if (s.current === null) {
    var i = { hasValue: !1, value: null };
    s.current = i;
  } else i = s.current;
  s = Tm(
    function () {
      function u(v) {
        if (!c) {
          if (((c = !0), (h = v), (v = r(v)), l !== void 0 && i.hasValue)) {
            var w = i.value;
            if (l(w, v)) return (x = w);
          }
          return (x = v);
        }
        if (((w = x), _m(h, v))) return w;
        var y = r(v);
        return l !== void 0 && l(w, y) ? ((h = v), w) : ((h = v), (x = y));
      }
      var c = !1,
        h,
        x,
        m = n === void 0 ? null : n;
      return [
        function () {
          return u(t());
        },
        m === null
          ? void 0
          : function () {
              return u(m());
            },
      ];
    },
    [t, n, r, l],
  );
  var a = Rm(e, s[0], s[1]);
  return (
    Lm(
      function () {
        ((i.hasValue = !0), (i.value = a));
      },
      [a],
    ),
    Mm(a),
    a
  );
};
gd.exports = xd;
var zm = gd.exports;
const Um = nu(zm),
  wd = {},
  { useDebugValue: Om } = pu,
  { useSyncExternalStoreWithSelector: Am } = Um;
let Ha = !1;
const Dm = (e) => e;
function Fm(e, t = Dm, n) {
  (wd ? "production" : void 0) !== "production" &&
    n &&
    !Ha &&
    (console.warn(
      "[DEPRECATED] Use `createWithEqualityFn` instead of `create` or use `useStoreWithEqualityFn` instead of `useStore`. They can be imported from 'zustand/traditional'. https://github.com/pmndrs/zustand/discussions/1937",
    ),
    (Ha = !0));
  const r = Am(
    e.subscribe,
    e.getState,
    e.getServerState || e.getInitialState,
    t,
    n,
  );
  return (Om(r), r);
}
const $m = (e) => {
    (wd ? "production" : void 0) !== "production" &&
      typeof e != "function" &&
      console.warn(
        "[DEPRECATED] Passing a vanilla store will be unsupported in a future version. Instead use `import { useStore } from 'zustand'`.",
      );
    const t = typeof e == "function" ? gm(e) : e,
      n = (r, l) => Fm(t, r, l);
    return (Object.assign(n, t), n);
  },
  Vm = (e) => $m,
  Wm = {};
function Bm(e, t) {
  let n;
  try {
    n = e();
  } catch {
    return;
  }
  return {
    getItem: (l) => {
      var s;
      const i = (u) => (u === null ? null : JSON.parse(u, void 0)),
        a = (s = n.getItem(l)) != null ? s : null;
      return a instanceof Promise ? a.then(i) : i(a);
    },
    setItem: (l, s) => n.setItem(l, JSON.stringify(s, void 0)),
    removeItem: (l) => n.removeItem(l),
  };
}
const Ir = (e) => (t) => {
    try {
      const n = e(t);
      return n instanceof Promise
        ? n
        : {
            then(r) {
              return Ir(r)(n);
            },
            catch(r) {
              return this;
            },
          };
    } catch (n) {
      return {
        then(r) {
          return this;
        },
        catch(r) {
          return Ir(r)(n);
        },
      };
    }
  },
  Hm = (e, t) => (n, r, l) => {
    let s = {
        getStorage: () => localStorage,
        serialize: JSON.stringify,
        deserialize: JSON.parse,
        partialize: (j) => j,
        version: 0,
        merge: (j, f) => ({ ...f, ...j }),
        ...t,
      },
      i = !1;
    const a = new Set(),
      u = new Set();
    let c;
    try {
      c = s.getStorage();
    } catch {}
    if (!c)
      return e(
        (...j) => {
          (console.warn(
            `[zustand persist middleware] Unable to update item '${s.name}', the given storage is currently unavailable.`,
          ),
            n(...j));
        },
        r,
        l,
      );
    const h = Ir(s.serialize),
      x = () => {
        const j = s.partialize({ ...r() });
        let f;
        const d = h({ state: j, version: s.version })
          .then((p) => c.setItem(s.name, p))
          .catch((p) => {
            f = p;
          });
        if (f) throw f;
        return d;
      },
      m = l.setState;
    l.setState = (j, f) => {
      (m(j, f), x());
    };
    const v = e(
      (...j) => {
        (n(...j), x());
      },
      r,
      l,
    );
    let w;
    const y = () => {
      var j;
      if (!c) return;
      ((i = !1), a.forEach((d) => d(r())));
      const f =
        ((j = s.onRehydrateStorage) == null ? void 0 : j.call(s, r())) ||
        void 0;
      return Ir(c.getItem.bind(c))(s.name)
        .then((d) => {
          if (d) return s.deserialize(d);
        })
        .then((d) => {
          if (d)
            if (typeof d.version == "number" && d.version !== s.version) {
              if (s.migrate) return s.migrate(d.state, d.version);
              console.error(
                "State loaded from storage couldn't be migrated since no migrate function was provided",
              );
            } else return d.state;
        })
        .then((d) => {
          var p;
          return ((w = s.merge(d, (p = r()) != null ? p : v)), n(w, !0), x());
        })
        .then(() => {
          (f == null || f(w, void 0), (i = !0), u.forEach((d) => d(w)));
        })
        .catch((d) => {
          f == null || f(void 0, d);
        });
    };
    return (
      (l.persist = {
        setOptions: (j) => {
          ((s = { ...s, ...j }), j.getStorage && (c = j.getStorage()));
        },
        clearStorage: () => {
          c == null || c.removeItem(s.name);
        },
        getOptions: () => s,
        rehydrate: () => y(),
        hasHydrated: () => i,
        onHydrate: (j) => (
          a.add(j),
          () => {
            a.delete(j);
          }
        ),
        onFinishHydration: (j) => (
          u.add(j),
          () => {
            u.delete(j);
          }
        ),
      }),
      y(),
      w || v
    );
  },
  Gm = (e, t) => (n, r, l) => {
    let s = {
        storage: Bm(() => localStorage),
        partialize: (y) => y,
        version: 0,
        merge: (y, j) => ({ ...j, ...y }),
        ...t,
      },
      i = !1;
    const a = new Set(),
      u = new Set();
    let c = s.storage;
    if (!c)
      return e(
        (...y) => {
          (console.warn(
            `[zustand persist middleware] Unable to update item '${s.name}', the given storage is currently unavailable.`,
          ),
            n(...y));
        },
        r,
        l,
      );
    const h = () => {
        const y = s.partialize({ ...r() });
        return c.setItem(s.name, { state: y, version: s.version });
      },
      x = l.setState;
    l.setState = (y, j) => {
      (x(y, j), h());
    };
    const m = e(
      (...y) => {
        (n(...y), h());
      },
      r,
      l,
    );
    l.getInitialState = () => m;
    let v;
    const w = () => {
      var y, j;
      if (!c) return;
      ((i = !1),
        a.forEach((d) => {
          var p;
          return d((p = r()) != null ? p : m);
        }));
      const f =
        ((j = s.onRehydrateStorage) == null
          ? void 0
          : j.call(s, (y = r()) != null ? y : m)) || void 0;
      return Ir(c.getItem.bind(c))(s.name)
        .then((d) => {
          if (d)
            if (typeof d.version == "number" && d.version !== s.version) {
              if (s.migrate) return [!0, s.migrate(d.state, d.version)];
              console.error(
                "State loaded from storage couldn't be migrated since no migrate function was provided",
              );
            } else return [!1, d.state];
          return [!1, void 0];
        })
        .then((d) => {
          var p;
          const [g, N] = d;
          if (((v = s.merge(N, (p = r()) != null ? p : m)), n(v, !0), g))
            return h();
        })
        .then(() => {
          (f == null || f(v, void 0),
            (v = r()),
            (i = !0),
            u.forEach((d) => d(v)));
        })
        .catch((d) => {
          f == null || f(void 0, d);
        });
    };
    return (
      (l.persist = {
        setOptions: (y) => {
          ((s = { ...s, ...y }), y.storage && (c = y.storage));
        },
        clearStorage: () => {
          c == null || c.removeItem(s.name);
        },
        getOptions: () => s,
        rehydrate: () => w(),
        hasHydrated: () => i,
        onHydrate: (y) => (
          a.add(y),
          () => {
            a.delete(y);
          }
        ),
        onFinishHydration: (y) => (
          u.add(y),
          () => {
            u.delete(y);
          }
        ),
      }),
      s.skipHydration || w(),
      v || m
    );
  },
  Qm = (e, t) =>
    "getStorage" in t || "serialize" in t || "deserialize" in t
      ? ((Wm ? "production" : void 0) !== "production" &&
          console.warn(
            "[DEPRECATED] `getStorage`, `serialize` and `deserialize` options are deprecated. Use `storage` option instead.",
          ),
        Hm(e, t))
      : Gm(e, t),
  Km = Qm,
  Ym = {
    service: "veo3",
    generationType: "text-to-video",
    model: "veo3.1-fast",
    imageModel: "nano-banana",
    imageQuality: "1k",
    quality: "720p",
    aspectRatio: "16:9",
    videoDuration: "8s",
    generationsPerPrompt: 1,
    language: "en",
    startFromPrompt: 1,
    timingBetweenPrompts: 5,
    minWaitTime: 3,
    maxWaitTime: 8,
    maxVideoThreads: 6,
    maxImageThreads: 6,
    maxAttempts: 2,
    rateLimitPauseSec: 20,
    suspiciousLimit: 2,
    stopAfterErrors: 3,
    flowResetHint: 3,
    autoDownload: !0,
    apiDownload: !0,
    downloadFolder: "",
    inputMethod: "synth",
    outputMethod: "code",
    editorEndpoint: "http://127.0.0.1:5050/upload",
    filenamePrefix: "",
    autoRetryFailed: !0,
    maxRetries: 1,
    downloadMode: "immediate",
    usePromptNumberInFilename: !1,
    grokVideoDuration: "6s",
    grokAspectRatio: "16:9",
    grokQuality: "480p",
  },
  nt = Vm()(
    Km(
      (e, t) => ({
        activeTab: "video",
        activeService: "veo3",
        generationMode: "single",
        settings: Ym,
        updateSettings: (n) =>
          e((r) => ({ settings: { ...r.settings, ...n } })),
        prompts: [],
        addPrompts: (n) => e((r) => ({ prompts: [...r.prompts, ...n] })),
        setPrompts: (n) => e({ prompts: n }),
        updatePrompt: (n, r) =>
          e((l) => ({
            prompts: l.prompts.map((s) => (s.id === n ? { ...s, ...r } : s)),
          })),
        clearPrompts: () => e({ prompts: [] }),
        removePrompt: (n) =>
          e((r) => ({ prompts: r.prompts.filter((l) => l.id !== n) })),
        isRunning: !1,
        isPaused: !1,
        activeSlots: 0,
        isDownloadingAll: !1,
        stopReason: "",
        setStopReason: (n) => e({ stopReason: n }),
        setRunning: (n) => e({ isRunning: n }),
        setPaused: (n) => e({ isPaused: n }),
        setActiveSlots: (n) => e({ activeSlots: n }),
        setDownloadingAll: (n) => e({ isDownloadingAll: n }),
        logs: [],
        addLog: (n) =>
          e((r) => ({
            logs: [
              { ...n, id: crypto.randomUUID(), timestamp: Date.now() },
              ...r.logs,
            ].slice(0, 100),
          })),
        clearLogs: () => e({ logs: [] }),
        showLogs: !1,
        setShowLogs: (n) => e({ showLogs: n }),
        whiskContext: { objects: [], characters: [], locations: [] },
        updateWhiskContext: (n) =>
          e((r) => ({ whiskContext: { ...r.whiskContext, ...n } })),
        showSettings: !1,
        setShowSettings: (n) => e({ showSettings: n, showLogs: !1 }),
        setActiveTab: (n) => {
          const r = n === "video" ? "veo3" : "banana",
            l = "single";
          e((s) => ({
            activeTab: n,
            activeService: r,
            generationMode: l,
            showLogs: !1,
            showSettings: !1,
            gfRefVideo: !1,
            settings: { ...s.settings, service: r },
          }));
        },
        setActiveService: (n) =>
          e((r) => {
            const l =
                n === "grok" ? "image-to-video" : r.settings.generationType,
              s = n === "grok" ? "single" : r.generationMode;
            return {
              activeService: n,
              generationMode: s,
              showLogs: !1,
              settings: { ...r.settings, service: n, generationType: l },
            };
          }),
        setGenerationMode: (n) => e({ generationMode: n, showLogs: !1, showSettings: !1, gfRefVideo: !1 }),
        gfCharacters: [],
        setGfCharacters: (n) =>
          e((r) => ({ gfCharacters: typeof n === "function" ? n(r.gfCharacters) : n })),
        gfRefVideo: !1,
        setGfRefVideo: (n) => e({ gfRefVideo: n }),
        gfObjects: [],
        setGfObjects: (n) =>
          e((r) => ({ gfObjects: typeof n === "function" ? n(r.gfObjects) : n })),
        gfApplyRefs: !0,
        setGfApplyRefs: (n) => e({ gfApplyRefs: n }),
        fsStreams: [{ id: crypto.randomUUID(), frames: [{ id: crypto.randomUUID(), text: "" }], startImage: null }],
        setFsStreams: (n) => e((r) => ({ fsStreams: typeof n === "function" ? n(r.fsStreams) : n })),
        selectorsLoaded: false,
        setSelectorsLoaded: (n) => e({ selectorsLoaded: n }),
        updateRequired: false,
        setUpdateRequired: (n) => e({ updateRequired: n }),
        minVersion: "",
        setMinVersion: (n) => e({ minVersion: n }),
        videoBulk: "",
        setVideoBulk: (n) => e({ videoBulk: n }),
        imageSingleBulk: "",
        setImageSingleBulk: (n) => e({ imageSingleBulk: n }),
        imageFilmBulk: "",
        setImageFilmBulk: (n) => e({ imageFilmBulk: n }),
        promptRows: null,
        setPromptRows: (n) => e((r) => ({ promptRows: typeof n === "function" ? n(r.promptRows) : n })),
        promptStash: {},
        setPromptStash: (n) => e((r) => ({ promptStash: typeof n === "function" ? n(r.promptStash) : n })),
      }),
      {
        name: "genflow-storage",
        partialize: (e) => ({
          settings: e.settings,
          whiskContext: e.whiskContext,
          activeService: e.activeService,
          activeTab: e.activeTab,
          generationMode: e.generationMode,
          gfApplyRefs: e.gfApplyRefs,
        }),
        onRehydrateStorage: () => (e) => {
          e &&
            e.activeService !== e.settings.service &&
            (e.settings = { ...e.settings, service: e.activeService });
        },
      },
    ),
  );
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var Xm = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const qm = (e) =>
    e
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .toLowerCase()
      .trim(),
  V = (e, t) => {
    const n = z.forwardRef(
      (
        {
          color: r = "currentColor",
          size: l = 24,
          strokeWidth: s = 2,
          absoluteStrokeWidth: i,
          className: a = "",
          children: u,
          ...c
        },
        h,
      ) =>
        z.createElement(
          "svg",
          {
            ref: h,
            ...Xm,
            width: l,
            height: l,
            stroke: r,
            strokeWidth: i ? (Number(s) * 24) / Number(l) : s,
            className: ["lucide", `lucide-${qm(e)}`, a].join(" "),
            ...c,
          },
          [
            ...t.map(([x, m]) => z.createElement(x, m)),
            ...(Array.isArray(u) ? u : [u]),
          ],
        ),
    );
    return ((n.displayName = `${e}`), n);
  };
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Lo = V("AlertCircle", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["line", { x1: "12", x2: "12", y1: "8", y2: "12", key: "1pkeuh" }],
  ["line", { x1: "12", x2: "12.01", y1: "16", y2: "16", key: "4dfq90" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Zm = V("AlertTriangle", [
  [
    "path",
    {
      d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z",
      key: "c3ski4",
    },
  ],
  ["path", { d: "M12 9v4", key: "juzpu7" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const kd = V("ArrowRight", [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Jm = V("Calendar", [
  [
    "rect",
    {
      width: "18",
      height: "18",
      x: "3",
      y: "4",
      rx: "2",
      ry: "2",
      key: "eu3xkr",
    },
  ],
  ["line", { x1: "16", x2: "16", y1: "2", y2: "6", key: "m3sa8f" }],
  ["line", { x1: "8", x2: "8", y1: "2", y2: "6", key: "18kwsl" }],
  ["line", { x1: "3", x2: "21", y1: "10", y2: "10", key: "xt86sb" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const fr = V("CheckCircle", [
  ["path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14", key: "g774vq" }],
  ["path", { d: "m9 11 3 3L22 4", key: "1pflzl" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Ga = V("CheckSquare", [
  ["path", { d: "m9 11 3 3L22 4", key: "1pflzl" }],
  [
    "path",
    {
      d: "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
      key: "1jnkn4",
    },
  ],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const eh = V("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const th = V("ChevronDown", [
  ["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const nh = V("ChevronUp", [
  ["path", { d: "m18 15-6-6-6 6", key: "153udz" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const rh = V("ClipboardCheck", [
  [
    "rect",
    {
      width: "8",
      height: "4",
      x: "8",
      y: "2",
      rx: "1",
      ry: "1",
      key: "tgr4d6",
    },
  ],
  [
    "path",
    {
      d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
      key: "116196",
    },
  ],
  ["path", { d: "m9 14 2 2 4-4", key: "df797q" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const jd = V("Clock", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Nd = V("Copy", [
  [
    "rect",
    {
      width: "14",
      height: "14",
      x: "8",
      y: "8",
      rx: "2",
      ry: "2",
      key: "17jyea",
    },
  ],
  [
    "path",
    {
      d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
      key: "zix9uf",
    },
  ],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const pr = V("Crown", [
  ["path", { d: "m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14", key: "zkxr6b" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Sd = V("Download", [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["polyline", { points: "7 10 12 15 17 10", key: "2ggqvy" }],
  ["line", { x1: "12", x2: "12", y1: "15", y2: "3", key: "1vk2je" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const lh = V("ExternalLink", [
  ["path", { d: "M15 3h6v6", key: "1q9fwt" }],
  ["path", { d: "M10 14 21 3", key: "gplh6r" }],
  [
    "path",
    {
      d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
      key: "a6xqqp",
    },
  ],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const sh = V("EyeOff", [
  ["path", { d: "M9.88 9.88a3 3 0 1 0 4.24 4.24", key: "1jxqfv" }],
  [
    "path",
    {
      d: "M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68",
      key: "9wicm4",
    },
  ],
  [
    "path",
    {
      d: "M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61",
      key: "1jreej",
    },
  ],
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22", key: "a6p6uj" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const oh = V("Eye", [
  [
    "path",
    { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z", key: "rwhkz3" },
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const ih = V("FileSpreadsheet", [
  [
    "path",
    {
      d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",
      key: "1rqfz7",
    },
  ],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M8 13h2", key: "yr2amv" }],
  ["path", { d: "M14 13h2", key: "un5t4a" }],
  ["path", { d: "M8 17h2", key: "2yhykz" }],
  ["path", { d: "M14 17h2", key: "10kma7" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const ah = V("FileText", [
  [
    "path",
    {
      d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",
      key: "1rqfz7",
    },
  ],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Qa = V("FileUp", [
  [
    "path",
    {
      d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",
      key: "1rqfz7",
    },
  ],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M12 12v6", key: "3ahymv" }],
  ["path", { d: "m15 15-3-3-3 3", key: "15xj92" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const uh = V("Gift", [
  ["rect", { x: "3", y: "8", width: "18", height: "4", rx: "1", key: "bkv52" }],
  ["path", { d: "M12 8v13", key: "1c76mn" }],
  ["path", { d: "M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7", key: "6wjy6b" }],
  [
    "path",
    {
      d: "M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5",
      key: "1ihvrl",
    },
  ],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const ch = V("Image", [
  [
    "rect",
    {
      width: "18",
      height: "18",
      x: "3",
      y: "3",
      rx: "2",
      ry: "2",
      key: "1m3agn",
    },
  ],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const dh = V("Layers", [
  [
    "path",
    {
      d: "m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",
      key: "8b97xw",
    },
  ],
  [
    "path",
    { d: "m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65", key: "dd6zsq" },
  ],
  [
    "path",
    { d: "m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65", key: "ep9fru" },
  ],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Al = V("Loader2", [
  ["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Cd = V("Lock", [
  [
    "rect",
    {
      width: "18",
      height: "11",
      x: "3",
      y: "11",
      rx: "2",
      ry: "2",
      key: "1w4ew1",
    },
  ],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const fh = V("LogOut", [
  ["path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", key: "1uf3rs" }],
  ["polyline", { points: "16 17 21 12 16 7", key: "1gabdz" }],
  ["line", { x1: "21", x2: "9", y1: "12", y2: "12", key: "1uyos4" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const ph = V("Mail", [
  [
    "rect",
    { width: "20", height: "16", x: "2", y: "4", rx: "2", key: "18n3k1" },
  ],
  ["path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7", key: "1ocrg3" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const mh = V("MessageCircle", [
  ["path", { d: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z", key: "vv11sd" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const hh = V("Pause", [
  ["rect", { width: "4", height: "16", x: "6", y: "4", key: "iffhe4" }],
  ["rect", { width: "4", height: "16", x: "14", y: "4", key: "sjin7j" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Ka = V("Play", [
  ["polygon", { points: "5 3 19 12 5 21 5 3", key: "191637" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Xn = V("Plus", [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const gh = V("RefreshCw", [
  [
    "path",
    { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", key: "v9h5vc" },
  ],
  ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
  [
    "path",
    { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", key: "3uifl3" },
  ],
  ["path", { d: "M8 16H3v5", key: "1cv678" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const xh = V("Settings", [
  [
    "path",
    {
      d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
      key: "1qme2f",
    },
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Ri = V("Sparkles", [
  [
    "path",
    {
      d: "m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z",
      key: "17u4zn",
    },
  ],
  ["path", { d: "M5 3v4", key: "bklmnn" }],
  ["path", { d: "M19 17v4", key: "iiml17" }],
  ["path", { d: "M3 5h4", key: "nem4j1" }],
  ["path", { d: "M17 19h4", key: "lbex7p" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const To = V("Square", [
  [
    "rect",
    { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" },
  ],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const en = V("Trash2", [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const pl = V("Upload", [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["polyline", { points: "17 8 12 3 7 8", key: "t8dd8p" }],
  ["line", { x1: "12", x2: "12", y1: "3", y2: "15", key: "widbto" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Ed = V("User", [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
  ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const yh = V("Video", [
  ["path", { d: "m22 8-6 4 6 4V8Z", key: "50v9me" }],
  [
    "rect",
    {
      width: "14",
      height: "12",
      x: "2",
      y: "6",
      rx: "2",
      ry: "2",
      key: "1rqjg6",
    },
  ],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const vh = V("WifiOff", [
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22", key: "a6p6uj" }],
  ["path", { d: "M8.5 16.5a5 5 0 0 1 7 0", key: "sej527" }],
  ["path", { d: "M2 8.82a15 15 0 0 1 4.17-2.65", key: "11utq1" }],
  ["path", { d: "M10.66 5c4.01-.36 8.14.9 11.34 3.76", key: "hxefdu" }],
  ["path", { d: "M16.85 11.25a10 10 0 0 1 2.22 1.68", key: "q734kn" }],
  ["path", { d: "M5 13a10 10 0 0 1 5.24-2.76", key: "piq4yl" }],
  ["line", { x1: "12", x2: "12.01", y1: "20", y2: "20", key: "of4bc4" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const wh = V("Wifi", [
  ["path", { d: "M5 13a10 10 0 0 1 14 0", key: "6v8j51" }],
  ["path", { d: "M8.5 16.5a5 5 0 0 1 7 0", key: "sej527" }],
  ["path", { d: "M2 8.82a15 15 0 0 1 20 0", key: "dnpr2z" }],
  ["line", { x1: "12", x2: "12.01", y1: "20", y2: "20", key: "of4bc4" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Lr = V("X", [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }],
]);
/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const rs = V("Zap", [
  [
    "polygon",
    { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2", key: "45s27k" },
  ],
]);
function bd(e) {
  var t,
    n,
    r = "";
  if (typeof e == "string" || typeof e == "number") r += e;
  else if (typeof e == "object")
    if (Array.isArray(e)) {
      var l = e.length;
      for (t = 0; t < l; t++)
        e[t] && (n = bd(e[t])) && (r && (r += " "), (r += n));
    } else for (n in e) e[n] && (r && (r += " "), (r += n));
  return r;
}
function kh() {
  for (var e, t, n = 0, r = "", l = arguments.length; n < l; n++)
    (e = arguments[n]) && (t = bd(e)) && (r && (r += " "), (r += t));
  return r;
}
const Ii = "-",
  jh = (e) => {
    const t = Sh(e),
      { conflictingClassGroups: n, conflictingClassGroupModifiers: r } = e;
    return {
      getClassGroupId: (i) => {
        const a = i.split(Ii);
        return (a[0] === "" && a.length !== 1 && a.shift(), Pd(a, t) || Nh(i));
      },
      getConflictingClassGroupIds: (i, a) => {
        const u = n[i] || [];
        return a && r[i] ? [...u, ...r[i]] : u;
      },
    };
  },
  Pd = (e, t) => {
    var i;
    if (e.length === 0) return t.classGroupId;
    const n = e[0],
      r = t.nextPart.get(n),
      l = r ? Pd(e.slice(1), r) : void 0;
    if (l) return l;
    if (t.validators.length === 0) return;
    const s = e.join(Ii);
    return (i = t.validators.find(({ validator: a }) => a(s))) == null
      ? void 0
      : i.classGroupId;
  },
  Ya = /^\[(.+)\]$/,
  Nh = (e) => {
    if (Ya.test(e)) {
      const t = Ya.exec(e)[1],
        n = t == null ? void 0 : t.substring(0, t.indexOf(":"));
      if (n) return "arbitrary.." + n;
    }
  },
  Sh = (e) => {
    const { theme: t, prefix: n } = e,
      r = { nextPart: new Map(), validators: [] };
    return (
      Eh(Object.entries(e.classGroups), n).forEach(([s, i]) => {
        Mo(i, r, s, t);
      }),
      r
    );
  },
  Mo = (e, t, n, r) => {
    e.forEach((l) => {
      if (typeof l == "string") {
        const s = l === "" ? t : Xa(t, l);
        s.classGroupId = n;
        return;
      }
      if (typeof l == "function") {
        if (Ch(l)) {
          Mo(l(r), t, n, r);
          return;
        }
        t.validators.push({ validator: l, classGroupId: n });
        return;
      }
      Object.entries(l).forEach(([s, i]) => {
        Mo(i, Xa(t, s), n, r);
      });
    });
  },
  Xa = (e, t) => {
    let n = e;
    return (
      t.split(Ii).forEach((r) => {
        (n.nextPart.has(r) ||
          n.nextPart.set(r, { nextPart: new Map(), validators: [] }),
          (n = n.nextPart.get(r)));
      }),
      n
    );
  },
  Ch = (e) => e.isThemeGetter,
  Eh = (e, t) =>
    t
      ? e.map(([n, r]) => {
          const l = r.map((s) =>
            typeof s == "string"
              ? t + s
              : typeof s == "object"
                ? Object.fromEntries(
                    Object.entries(s).map(([i, a]) => [t + i, a]),
                  )
                : s,
          );
          return [n, l];
        })
      : e,
  bh = (e) => {
    if (e < 1) return { get: () => {}, set: () => {} };
    let t = 0,
      n = new Map(),
      r = new Map();
    const l = (s, i) => {
      (n.set(s, i), t++, t > e && ((t = 0), (r = n), (n = new Map())));
    };
    return {
      get(s) {
        let i = n.get(s);
        if (i !== void 0) return i;
        if ((i = r.get(s)) !== void 0) return (l(s, i), i);
      },
      set(s, i) {
        n.has(s) ? n.set(s, i) : l(s, i);
      },
    };
  },
  _d = "!",
  Ph = (e) => {
    const { separator: t, experimentalParseClassName: n } = e,
      r = t.length === 1,
      l = t[0],
      s = t.length,
      i = (a) => {
        const u = [];
        let c = 0,
          h = 0,
          x;
        for (let j = 0; j < a.length; j++) {
          let f = a[j];
          if (c === 0) {
            if (f === l && (r || a.slice(j, j + s) === t)) {
              (u.push(a.slice(h, j)), (h = j + s));
              continue;
            }
            if (f === "/") {
              x = j;
              continue;
            }
          }
          f === "[" ? c++ : f === "]" && c--;
        }
        const m = u.length === 0 ? a : a.substring(h),
          v = m.startsWith(_d),
          w = v ? m.substring(1) : m,
          y = x && x > h ? x - h : void 0;
        return {
          modifiers: u,
          hasImportantModifier: v,
          baseClassName: w,
          maybePostfixModifierPosition: y,
        };
      };
    return n ? (a) => n({ className: a, parseClassName: i }) : i;
  },
  _h = (e) => {
    if (e.length <= 1) return e;
    const t = [];
    let n = [];
    return (
      e.forEach((r) => {
        r[0] === "[" ? (t.push(...n.sort(), r), (n = [])) : n.push(r);
      }),
      t.push(...n.sort()),
      t
    );
  },
  Rh = (e) => ({ cache: bh(e.cacheSize), parseClassName: Ph(e), ...jh(e) }),
  Ih = /\s+/,
  Lh = (e, t) => {
    const {
        parseClassName: n,
        getClassGroupId: r,
        getConflictingClassGroupIds: l,
      } = t,
      s = [],
      i = e.trim().split(Ih);
    let a = "";
    for (let u = i.length - 1; u >= 0; u -= 1) {
      const c = i[u],
        {
          modifiers: h,
          hasImportantModifier: x,
          baseClassName: m,
          maybePostfixModifierPosition: v,
        } = n(c);
      let w = !!v,
        y = r(w ? m.substring(0, v) : m);
      if (!y) {
        if (!w) {
          a = c + (a.length > 0 ? " " + a : a);
          continue;
        }
        if (((y = r(m)), !y)) {
          a = c + (a.length > 0 ? " " + a : a);
          continue;
        }
        w = !1;
      }
      const j = _h(h).join(":"),
        f = x ? j + _d : j,
        d = f + y;
      if (s.includes(d)) continue;
      s.push(d);
      const p = l(y, w);
      for (let g = 0; g < p.length; ++g) {
        const N = p[g];
        s.push(f + N);
      }
      a = c + (a.length > 0 ? " " + a : a);
    }
    return a;
  };
function Th() {
  let e = 0,
    t,
    n,
    r = "";
  for (; e < arguments.length; )
    (t = arguments[e++]) && (n = Rd(t)) && (r && (r += " "), (r += n));
  return r;
}
const Rd = (e) => {
  if (typeof e == "string") return e;
  let t,
    n = "";
  for (let r = 0; r < e.length; r++)
    e[r] && (t = Rd(e[r])) && (n && (n += " "), (n += t));
  return n;
};
function Mh(e, ...t) {
  let n,
    r,
    l,
    s = i;
  function i(u) {
    const c = t.reduce((h, x) => x(h), e());
    return ((n = Rh(c)), (r = n.cache.get), (l = n.cache.set), (s = a), a(u));
  }
  function a(u) {
    const c = r(u);
    if (c) return c;
    const h = Lh(u, n);
    return (l(u, h), h);
  }
  return function () {
    return s(Th.apply(null, arguments));
  };
}
const q = (e) => {
    const t = (n) => n[e] || [];
    return ((t.isThemeGetter = !0), t);
  },
  Id = /^\[(?:([a-z-]+):)?(.+)\]$/i,
  zh = /^\d+\/\d+$/,
  Uh = new Set(["px", "full", "screen"]),
  Oh = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/,
  Ah =
    /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/,
  Dh = /^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/,
  Fh = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/,
  $h =
    /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/,
  dt = (e) => _n(e) || Uh.has(e) || zh.test(e),
  Ct = (e) => $n(e, "length", Yh),
  _n = (e) => !!e && !Number.isNaN(Number(e)),
  Ls = (e) => $n(e, "number", _n),
  qn = (e) => !!e && Number.isInteger(Number(e)),
  Vh = (e) => e.endsWith("%") && _n(e.slice(0, -1)),
  W = (e) => Id.test(e),
  Et = (e) => Oh.test(e),
  Wh = new Set(["length", "size", "percentage"]),
  Bh = (e) => $n(e, Wh, Ld),
  Hh = (e) => $n(e, "position", Ld),
  Gh = new Set(["image", "url"]),
  Qh = (e) => $n(e, Gh, qh),
  Kh = (e) => $n(e, "", Xh),
  Zn = () => !0,
  $n = (e, t, n) => {
    const r = Id.exec(e);
    return r
      ? r[1]
        ? typeof t == "string"
          ? r[1] === t
          : t.has(r[1])
        : n(r[2])
      : !1;
  },
  Yh = (e) => Ah.test(e) && !Dh.test(e),
  Ld = () => !1,
  Xh = (e) => Fh.test(e),
  qh = (e) => $h.test(e),
  Zh = () => {
    const e = q("colors"),
      t = q("spacing"),
      n = q("blur"),
      r = q("brightness"),
      l = q("borderColor"),
      s = q("borderRadius"),
      i = q("borderSpacing"),
      a = q("borderWidth"),
      u = q("contrast"),
      c = q("grayscale"),
      h = q("hueRotate"),
      x = q("invert"),
      m = q("gap"),
      v = q("gradientColorStops"),
      w = q("gradientColorStopPositions"),
      y = q("inset"),
      j = q("margin"),
      f = q("opacity"),
      d = q("padding"),
      p = q("saturate"),
      g = q("scale"),
      N = q("sepia"),
      R = q("skew"),
      E = q("space"),
      S = q("translate"),
      b = () => ["auto", "contain", "none"],
      L = () => ["auto", "hidden", "clip", "visible", "scroll"],
      T = () => ["auto", W, t],
      D = () => [W, t],
      oe = () => ["", dt, Ct],
      fe = () => ["auto", _n, W],
      ut = () => [
        "bottom",
        "center",
        "left",
        "left-bottom",
        "left-top",
        "right",
        "right-bottom",
        "right-top",
        "top",
      ],
      Te = () => ["solid", "dashed", "dotted", "double", "none"],
      Ke = () => [
        "normal",
        "multiply",
        "screen",
        "overlay",
        "darken",
        "lighten",
        "color-dodge",
        "color-burn",
        "hard-light",
        "soft-light",
        "difference",
        "exclusion",
        "hue",
        "saturation",
        "color",
        "luminosity",
      ],
      I = () => [
        "start",
        "end",
        "center",
        "between",
        "around",
        "evenly",
        "stretch",
      ],
      O = () => ["", "0", W],
      $ = () => [
        "auto",
        "avoid",
        "all",
        "avoid-page",
        "page",
        "left",
        "right",
        "column",
      ],
      G = () => [_n, W];
    return {
      cacheSize: 500,
      separator: ":",
      theme: {
        colors: [Zn],
        spacing: [dt, Ct],
        blur: ["none", "", Et, W],
        brightness: G(),
        borderColor: [e],
        borderRadius: ["none", "", "full", Et, W],
        borderSpacing: D(),
        borderWidth: oe(),
        contrast: G(),
        grayscale: O(),
        hueRotate: G(),
        invert: O(),
        gap: D(),
        gradientColorStops: [e],
        gradientColorStopPositions: [Vh, Ct],
        inset: T(),
        margin: T(),
        opacity: G(),
        padding: D(),
        saturate: G(),
        scale: G(),
        sepia: O(),
        skew: G(),
        space: D(),
        translate: D(),
      },
      classGroups: {
        aspect: [{ aspect: ["auto", "square", "video", W] }],
        container: ["container"],
        columns: [{ columns: [Et] }],
        "break-after": [{ "break-after": $() }],
        "break-before": [{ "break-before": $() }],
        "break-inside": [
          { "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"] },
        ],
        "box-decoration": [{ "box-decoration": ["slice", "clone"] }],
        box: [{ box: ["border", "content"] }],
        display: [
          "block",
          "inline-block",
          "inline",
          "flex",
          "inline-flex",
          "table",
          "inline-table",
          "table-caption",
          "table-cell",
          "table-column",
          "table-column-group",
          "table-footer-group",
          "table-header-group",
          "table-row-group",
          "table-row",
          "flow-root",
          "grid",
          "inline-grid",
          "contents",
          "list-item",
          "hidden",
        ],
        float: [{ float: ["right", "left", "none", "start", "end"] }],
        clear: [{ clear: ["left", "right", "both", "none", "start", "end"] }],
        isolation: ["isolate", "isolation-auto"],
        "object-fit": [
          { object: ["contain", "cover", "fill", "none", "scale-down"] },
        ],
        "object-position": [{ object: [...ut(), W] }],
        overflow: [{ overflow: L() }],
        "overflow-x": [{ "overflow-x": L() }],
        "overflow-y": [{ "overflow-y": L() }],
        overscroll: [{ overscroll: b() }],
        "overscroll-x": [{ "overscroll-x": b() }],
        "overscroll-y": [{ "overscroll-y": b() }],
        position: ["static", "fixed", "absolute", "relative", "sticky"],
        inset: [{ inset: [y] }],
        "inset-x": [{ "inset-x": [y] }],
        "inset-y": [{ "inset-y": [y] }],
        start: [{ start: [y] }],
        end: [{ end: [y] }],
        top: [{ top: [y] }],
        right: [{ right: [y] }],
        bottom: [{ bottom: [y] }],
        left: [{ left: [y] }],
        visibility: ["visible", "invisible", "collapse"],
        z: [{ z: ["auto", qn, W] }],
        basis: [{ basis: T() }],
        "flex-direction": [
          { flex: ["row", "row-reverse", "col", "col-reverse"] },
        ],
        "flex-wrap": [{ flex: ["wrap", "wrap-reverse", "nowrap"] }],
        flex: [{ flex: ["1", "auto", "initial", "none", W] }],
        grow: [{ grow: O() }],
        shrink: [{ shrink: O() }],
        order: [{ order: ["first", "last", "none", qn, W] }],
        "grid-cols": [{ "grid-cols": [Zn] }],
        "col-start-end": [{ col: ["auto", { span: ["full", qn, W] }, W] }],
        "col-start": [{ "col-start": fe() }],
        "col-end": [{ "col-end": fe() }],
        "grid-rows": [{ "grid-rows": [Zn] }],
        "row-start-end": [{ row: ["auto", { span: [qn, W] }, W] }],
        "row-start": [{ "row-start": fe() }],
        "row-end": [{ "row-end": fe() }],
        "grid-flow": [
          { "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"] },
        ],
        "auto-cols": [{ "auto-cols": ["auto", "min", "max", "fr", W] }],
        "auto-rows": [{ "auto-rows": ["auto", "min", "max", "fr", W] }],
        gap: [{ gap: [m] }],
        "gap-x": [{ "gap-x": [m] }],
        "gap-y": [{ "gap-y": [m] }],
        "justify-content": [{ justify: ["normal", ...I()] }],
        "justify-items": [
          { "justify-items": ["start", "end", "center", "stretch"] },
        ],
        "justify-self": [
          { "justify-self": ["auto", "start", "end", "center", "stretch"] },
        ],
        "align-content": [{ content: ["normal", ...I(), "baseline"] }],
        "align-items": [
          { items: ["start", "end", "center", "baseline", "stretch"] },
        ],
        "align-self": [
          { self: ["auto", "start", "end", "center", "stretch", "baseline"] },
        ],
        "place-content": [{ "place-content": [...I(), "baseline"] }],
        "place-items": [
          { "place-items": ["start", "end", "center", "baseline", "stretch"] },
        ],
        "place-self": [
          { "place-self": ["auto", "start", "end", "center", "stretch"] },
        ],
        p: [{ p: [d] }],
        px: [{ px: [d] }],
        py: [{ py: [d] }],
        ps: [{ ps: [d] }],
        pe: [{ pe: [d] }],
        pt: [{ pt: [d] }],
        pr: [{ pr: [d] }],
        pb: [{ pb: [d] }],
        pl: [{ pl: [d] }],
        m: [{ m: [j] }],
        mx: [{ mx: [j] }],
        my: [{ my: [j] }],
        ms: [{ ms: [j] }],
        me: [{ me: [j] }],
        mt: [{ mt: [j] }],
        mr: [{ mr: [j] }],
        mb: [{ mb: [j] }],
        ml: [{ ml: [j] }],
        "space-x": [{ "space-x": [E] }],
        "space-x-reverse": ["space-x-reverse"],
        "space-y": [{ "space-y": [E] }],
        "space-y-reverse": ["space-y-reverse"],
        w: [{ w: ["auto", "min", "max", "fit", "svw", "lvw", "dvw", W, t] }],
        "min-w": [{ "min-w": [W, t, "min", "max", "fit"] }],
        "max-w": [
          {
            "max-w": [
              W,
              t,
              "none",
              "full",
              "min",
              "max",
              "fit",
              "prose",
              { screen: [Et] },
              Et,
            ],
          },
        ],
        h: [{ h: [W, t, "auto", "min", "max", "fit", "svh", "lvh", "dvh"] }],
        "min-h": [
          { "min-h": [W, t, "min", "max", "fit", "svh", "lvh", "dvh"] },
        ],
        "max-h": [
          { "max-h": [W, t, "min", "max", "fit", "svh", "lvh", "dvh"] },
        ],
        size: [{ size: [W, t, "auto", "min", "max", "fit"] }],
        "font-size": [{ text: ["base", Et, Ct] }],
        "font-smoothing": ["antialiased", "subpixel-antialiased"],
        "font-style": ["italic", "not-italic"],
        "font-weight": [
          {
            font: [
              "thin",
              "extralight",
              "light",
              "normal",
              "medium",
              "semibold",
              "bold",
              "extrabold",
              "black",
              Ls,
            ],
          },
        ],
        "font-family": [{ font: [Zn] }],
        "fvn-normal": ["normal-nums"],
        "fvn-ordinal": ["ordinal"],
        "fvn-slashed-zero": ["slashed-zero"],
        "fvn-figure": ["lining-nums", "oldstyle-nums"],
        "fvn-spacing": ["proportional-nums", "tabular-nums"],
        "fvn-fraction": ["diagonal-fractions", "stacked-fractions"],
        tracking: [
          {
            tracking: [
              "tighter",
              "tight",
              "normal",
              "wide",
              "wider",
              "widest",
              W,
            ],
          },
        ],
        "line-clamp": [{ "line-clamp": ["none", _n, Ls] }],
        leading: [
          {
            leading: [
              "none",
              "tight",
              "snug",
              "normal",
              "relaxed",
              "loose",
              dt,
              W,
            ],
          },
        ],
        "list-image": [{ "list-image": ["none", W] }],
        "list-style-type": [{ list: ["none", "disc", "decimal", W] }],
        "list-style-position": [{ list: ["inside", "outside"] }],
        "placeholder-color": [{ placeholder: [e] }],
        "placeholder-opacity": [{ "placeholder-opacity": [f] }],
        "text-alignment": [
          { text: ["left", "center", "right", "justify", "start", "end"] },
        ],
        "text-color": [{ text: [e] }],
        "text-opacity": [{ "text-opacity": [f] }],
        "text-decoration": [
          "underline",
          "overline",
          "line-through",
          "no-underline",
        ],
        "text-decoration-style": [{ decoration: [...Te(), "wavy"] }],
        "text-decoration-thickness": [
          { decoration: ["auto", "from-font", dt, Ct] },
        ],
        "underline-offset": [{ "underline-offset": ["auto", dt, W] }],
        "text-decoration-color": [{ decoration: [e] }],
        "text-transform": [
          "uppercase",
          "lowercase",
          "capitalize",
          "normal-case",
        ],
        "text-overflow": ["truncate", "text-ellipsis", "text-clip"],
        "text-wrap": [{ text: ["wrap", "nowrap", "balance", "pretty"] }],
        indent: [{ indent: D() }],
        "vertical-align": [
          {
            align: [
              "baseline",
              "top",
              "middle",
              "bottom",
              "text-top",
              "text-bottom",
              "sub",
              "super",
              W,
            ],
          },
        ],
        whitespace: [
          {
            whitespace: [
              "normal",
              "nowrap",
              "pre",
              "pre-line",
              "pre-wrap",
              "break-spaces",
            ],
          },
        ],
        break: [{ break: ["normal", "words", "all", "keep"] }],
        hyphens: [{ hyphens: ["none", "manual", "auto"] }],
        content: [{ content: ["none", W] }],
        "bg-attachment": [{ bg: ["fixed", "local", "scroll"] }],
        "bg-clip": [{ "bg-clip": ["border", "padding", "content", "text"] }],
        "bg-opacity": [{ "bg-opacity": [f] }],
        "bg-origin": [{ "bg-origin": ["border", "padding", "content"] }],
        "bg-position": [{ bg: [...ut(), Hh] }],
        "bg-repeat": [
          { bg: ["no-repeat", { repeat: ["", "x", "y", "round", "space"] }] },
        ],
        "bg-size": [{ bg: ["auto", "cover", "contain", Bh] }],
        "bg-image": [
          {
            bg: [
              "none",
              { "gradient-to": ["t", "tr", "r", "br", "b", "bl", "l", "tl"] },
              Qh,
            ],
          },
        ],
        "bg-color": [{ bg: [e] }],
        "gradient-from-pos": [{ from: [w] }],
        "gradient-via-pos": [{ via: [w] }],
        "gradient-to-pos": [{ to: [w] }],
        "gradient-from": [{ from: [v] }],
        "gradient-via": [{ via: [v] }],
        "gradient-to": [{ to: [v] }],
        rounded: [{ rounded: [s] }],
        "rounded-s": [{ "rounded-s": [s] }],
        "rounded-e": [{ "rounded-e": [s] }],
        "rounded-t": [{ "rounded-t": [s] }],
        "rounded-r": [{ "rounded-r": [s] }],
        "rounded-b": [{ "rounded-b": [s] }],
        "rounded-l": [{ "rounded-l": [s] }],
        "rounded-ss": [{ "rounded-ss": [s] }],
        "rounded-se": [{ "rounded-se": [s] }],
        "rounded-ee": [{ "rounded-ee": [s] }],
        "rounded-es": [{ "rounded-es": [s] }],
        "rounded-tl": [{ "rounded-tl": [s] }],
        "rounded-tr": [{ "rounded-tr": [s] }],
        "rounded-br": [{ "rounded-br": [s] }],
        "rounded-bl": [{ "rounded-bl": [s] }],
        "border-w": [{ border: [a] }],
        "border-w-x": [{ "border-x": [a] }],
        "border-w-y": [{ "border-y": [a] }],
        "border-w-s": [{ "border-s": [a] }],
        "border-w-e": [{ "border-e": [a] }],
        "border-w-t": [{ "border-t": [a] }],
        "border-w-r": [{ "border-r": [a] }],
        "border-w-b": [{ "border-b": [a] }],
        "border-w-l": [{ "border-l": [a] }],
        "border-opacity": [{ "border-opacity": [f] }],
        "border-style": [{ border: [...Te(), "hidden"] }],
        "divide-x": [{ "divide-x": [a] }],
        "divide-x-reverse": ["divide-x-reverse"],
        "divide-y": [{ "divide-y": [a] }],
        "divide-y-reverse": ["divide-y-reverse"],
        "divide-opacity": [{ "divide-opacity": [f] }],
        "divide-style": [{ divide: Te() }],
        "border-color": [{ border: [l] }],
        "border-color-x": [{ "border-x": [l] }],
        "border-color-y": [{ "border-y": [l] }],
        "border-color-s": [{ "border-s": [l] }],
        "border-color-e": [{ "border-e": [l] }],
        "border-color-t": [{ "border-t": [l] }],
        "border-color-r": [{ "border-r": [l] }],
        "border-color-b": [{ "border-b": [l] }],
        "border-color-l": [{ "border-l": [l] }],
        "divide-color": [{ divide: [l] }],
        "outline-style": [{ outline: ["", ...Te()] }],
        "outline-offset": [{ "outline-offset": [dt, W] }],
        "outline-w": [{ outline: [dt, Ct] }],
        "outline-color": [{ outline: [e] }],
        "ring-w": [{ ring: oe() }],
        "ring-w-inset": ["ring-inset"],
        "ring-color": [{ ring: [e] }],
        "ring-opacity": [{ "ring-opacity": [f] }],
        "ring-offset-w": [{ "ring-offset": [dt, Ct] }],
        "ring-offset-color": [{ "ring-offset": [e] }],
        shadow: [{ shadow: ["", "inner", "none", Et, Kh] }],
        "shadow-color": [{ shadow: [Zn] }],
        opacity: [{ opacity: [f] }],
        "mix-blend": [
          { "mix-blend": [...Ke(), "plus-lighter", "plus-darker"] },
        ],
        "bg-blend": [{ "bg-blend": Ke() }],
        filter: [{ filter: ["", "none"] }],
        blur: [{ blur: [n] }],
        brightness: [{ brightness: [r] }],
        contrast: [{ contrast: [u] }],
        "drop-shadow": [{ "drop-shadow": ["", "none", Et, W] }],
        grayscale: [{ grayscale: [c] }],
        "hue-rotate": [{ "hue-rotate": [h] }],
        invert: [{ invert: [x] }],
        saturate: [{ saturate: [p] }],
        sepia: [{ sepia: [N] }],
        "backdrop-filter": [{ "backdrop-filter": ["", "none"] }],
        "backdrop-blur": [{ "backdrop-blur": [n] }],
        "backdrop-brightness": [{ "backdrop-brightness": [r] }],
        "backdrop-contrast": [{ "backdrop-contrast": [u] }],
        "backdrop-grayscale": [{ "backdrop-grayscale": [c] }],
        "backdrop-hue-rotate": [{ "backdrop-hue-rotate": [h] }],
        "backdrop-invert": [{ "backdrop-invert": [x] }],
        "backdrop-opacity": [{ "backdrop-opacity": [f] }],
        "backdrop-saturate": [{ "backdrop-saturate": [p] }],
        "backdrop-sepia": [{ "backdrop-sepia": [N] }],
        "border-collapse": [{ border: ["collapse", "separate"] }],
        "border-spacing": [{ "border-spacing": [i] }],
        "border-spacing-x": [{ "border-spacing-x": [i] }],
        "border-spacing-y": [{ "border-spacing-y": [i] }],
        "table-layout": [{ table: ["auto", "fixed"] }],
        caption: [{ caption: ["top", "bottom"] }],
        transition: [
          {
            transition: [
              "none",
              "all",
              "",
              "colors",
              "opacity",
              "shadow",
              "transform",
              W,
            ],
          },
        ],
        duration: [{ duration: G() }],
        ease: [{ ease: ["linear", "in", "out", "in-out", W] }],
        delay: [{ delay: G() }],
        animate: [{ animate: ["none", "spin", "ping", "pulse", "bounce", W] }],
        transform: [{ transform: ["", "gpu", "none"] }],
        scale: [{ scale: [g] }],
        "scale-x": [{ "scale-x": [g] }],
        "scale-y": [{ "scale-y": [g] }],
        rotate: [{ rotate: [qn, W] }],
        "translate-x": [{ "translate-x": [S] }],
        "translate-y": [{ "translate-y": [S] }],
        "skew-x": [{ "skew-x": [R] }],
        "skew-y": [{ "skew-y": [R] }],
        "transform-origin": [
          {
            origin: [
              "center",
              "top",
              "top-right",
              "right",
              "bottom-right",
              "bottom",
              "bottom-left",
              "left",
              "top-left",
              W,
            ],
          },
        ],
        accent: [{ accent: ["auto", e] }],
        appearance: [{ appearance: ["none", "auto"] }],
        cursor: [
          {
            cursor: [
              "auto",
              "default",
              "pointer",
              "wait",
              "text",
              "move",
              "help",
              "not-allowed",
              "none",
              "context-menu",
              "progress",
              "cell",
              "crosshair",
              "vertical-text",
              "alias",
              "copy",
              "no-drop",
              "grab",
              "grabbing",
              "all-scroll",
              "col-resize",
              "row-resize",
              "n-resize",
              "e-resize",
              "s-resize",
              "w-resize",
              "ne-resize",
              "nw-resize",
              "se-resize",
              "sw-resize",
              "ew-resize",
              "ns-resize",
              "nesw-resize",
              "nwse-resize",
              "zoom-in",
              "zoom-out",
              W,
            ],
          },
        ],
        "caret-color": [{ caret: [e] }],
        "pointer-events": [{ "pointer-events": ["none", "auto"] }],
        resize: [{ resize: ["none", "y", "x", ""] }],
        "scroll-behavior": [{ scroll: ["auto", "smooth"] }],
        "scroll-m": [{ "scroll-m": D() }],
        "scroll-mx": [{ "scroll-mx": D() }],
        "scroll-my": [{ "scroll-my": D() }],
        "scroll-ms": [{ "scroll-ms": D() }],
        "scroll-me": [{ "scroll-me": D() }],
        "scroll-mt": [{ "scroll-mt": D() }],
        "scroll-mr": [{ "scroll-mr": D() }],
        "scroll-mb": [{ "scroll-mb": D() }],
        "scroll-ml": [{ "scroll-ml": D() }],
        "scroll-p": [{ "scroll-p": D() }],
        "scroll-px": [{ "scroll-px": D() }],
        "scroll-py": [{ "scroll-py": D() }],
        "scroll-ps": [{ "scroll-ps": D() }],
        "scroll-pe": [{ "scroll-pe": D() }],
        "scroll-pt": [{ "scroll-pt": D() }],
        "scroll-pr": [{ "scroll-pr": D() }],
        "scroll-pb": [{ "scroll-pb": D() }],
        "scroll-pl": [{ "scroll-pl": D() }],
        "snap-align": [{ snap: ["start", "end", "center", "align-none"] }],
        "snap-stop": [{ snap: ["normal", "always"] }],
        "snap-type": [{ snap: ["none", "x", "y", "both"] }],
        "snap-strictness": [{ snap: ["mandatory", "proximity"] }],
        touch: [{ touch: ["auto", "none", "manipulation"] }],
        "touch-x": [{ "touch-pan": ["x", "left", "right"] }],
        "touch-y": [{ "touch-pan": ["y", "up", "down"] }],
        "touch-pz": ["touch-pinch-zoom"],
        select: [{ select: ["none", "text", "all", "auto"] }],
        "will-change": [
          { "will-change": ["auto", "scroll", "contents", "transform", W] },
        ],
        fill: [{ fill: [e, "none"] }],
        "stroke-w": [{ stroke: [dt, Ct, Ls] }],
        stroke: [{ stroke: [e, "none"] }],
        sr: ["sr-only", "not-sr-only"],
        "forced-color-adjust": [{ "forced-color-adjust": ["auto", "none"] }],
      },
      conflictingClassGroups: {
        overflow: ["overflow-x", "overflow-y"],
        overscroll: ["overscroll-x", "overscroll-y"],
        inset: [
          "inset-x",
          "inset-y",
          "start",
          "end",
          "top",
          "right",
          "bottom",
          "left",
        ],
        "inset-x": ["right", "left"],
        "inset-y": ["top", "bottom"],
        flex: ["basis", "grow", "shrink"],
        gap: ["gap-x", "gap-y"],
        p: ["px", "py", "ps", "pe", "pt", "pr", "pb", "pl"],
        px: ["pr", "pl"],
        py: ["pt", "pb"],
        m: ["mx", "my", "ms", "me", "mt", "mr", "mb", "ml"],
        mx: ["mr", "ml"],
        my: ["mt", "mb"],
        size: ["w", "h"],
        "font-size": ["leading"],
        "fvn-normal": [
          "fvn-ordinal",
          "fvn-slashed-zero",
          "fvn-figure",
          "fvn-spacing",
          "fvn-fraction",
        ],
        "fvn-ordinal": ["fvn-normal"],
        "fvn-slashed-zero": ["fvn-normal"],
        "fvn-figure": ["fvn-normal"],
        "fvn-spacing": ["fvn-normal"],
        "fvn-fraction": ["fvn-normal"],
        "line-clamp": ["display", "overflow"],
        rounded: [
          "rounded-s",
          "rounded-e",
          "rounded-t",
          "rounded-r",
          "rounded-b",
          "rounded-l",
          "rounded-ss",
          "rounded-se",
          "rounded-ee",
          "rounded-es",
          "rounded-tl",
          "rounded-tr",
          "rounded-br",
          "rounded-bl",
        ],
        "rounded-s": ["rounded-ss", "rounded-es"],
        "rounded-e": ["rounded-se", "rounded-ee"],
        "rounded-t": ["rounded-tl", "rounded-tr"],
        "rounded-r": ["rounded-tr", "rounded-br"],
        "rounded-b": ["rounded-br", "rounded-bl"],
        "rounded-l": ["rounded-tl", "rounded-bl"],
        "border-spacing": ["border-spacing-x", "border-spacing-y"],
        "border-w": [
          "border-w-s",
          "border-w-e",
          "border-w-t",
          "border-w-r",
          "border-w-b",
          "border-w-l",
        ],
        "border-w-x": ["border-w-r", "border-w-l"],
        "border-w-y": ["border-w-t", "border-w-b"],
        "border-color": [
          "border-color-s",
          "border-color-e",
          "border-color-t",
          "border-color-r",
          "border-color-b",
          "border-color-l",
        ],
        "border-color-x": ["border-color-r", "border-color-l"],
        "border-color-y": ["border-color-t", "border-color-b"],
        "scroll-m": [
          "scroll-mx",
          "scroll-my",
          "scroll-ms",
          "scroll-me",
          "scroll-mt",
          "scroll-mr",
          "scroll-mb",
          "scroll-ml",
        ],
        "scroll-mx": ["scroll-mr", "scroll-ml"],
        "scroll-my": ["scroll-mt", "scroll-mb"],
        "scroll-p": [
          "scroll-px",
          "scroll-py",
          "scroll-ps",
          "scroll-pe",
          "scroll-pt",
          "scroll-pr",
          "scroll-pb",
          "scroll-pl",
        ],
        "scroll-px": ["scroll-pr", "scroll-pl"],
        "scroll-py": ["scroll-pt", "scroll-pb"],
        touch: ["touch-x", "touch-y", "touch-pz"],
        "touch-x": ["touch"],
        "touch-y": ["touch"],
        "touch-pz": ["touch"],
      },
      conflictingClassGroupModifiers: { "font-size": ["leading"] },
    };
  },
  Jh = Mh(Zh);
function J(...e) {
  return Jh(kh(e));
}
const e0 = "https://grovex.space";
function t0(e) {
  return e.replace(/\/+$/, "");
}
const n0 = "".trim(),
  Td = t0(n0 || e0),
  Dl = `${Td}/api`,
  r0 = !1;
class l0 {
  constructor() {
    Mi(this, "accessToken", null);
  }
  async init() {
    const t = await chrome.storage.local.get(["accessToken"]);
    this.accessToken = t.accessToken || null;
  }
  setToken(t) {
    ((this.accessToken = t), chrome.storage.local.set({ accessToken: t }));
  }
  clearToken() {
    ((this.accessToken = null),
      chrome.storage.local.remove(["accessToken", "user"]));
  }
  async request(t, n = {}) {
    const { method: r = "GET", body: l, headers: s = {} } = n,
      i = { "Content-Type": "application/json", ...s };
    this.accessToken && (i.Authorization = `Bearer ${this.accessToken}`);
    const a = await fetch(`${Dl}${t}`, {
      method: r,
      headers: i,
      body: l ? JSON.stringify(l) : void 0,
    });
    if (!a.ok) {
      const u = await a.json().catch(() => ({ detail: "Unknown error" }));
      if (a.status === 401) _gf401(u.detail);
      throw new Error(u.detail || `HTTP ${a.status}`);
    }
    return a.json();
  }
  async register(t, n, r) {
    const l = await this.request("/auth/register", {
      method: "POST",
      body: { email: t, password: n, name: r },
    });
    this.setToken(l.access_token);
    const s = { ...l.user, daily_generations: 0, daily_limit: 10 };
    return (await chrome.storage.local.set({ user: s }), { ...l, user: s });
  }
  async login(t, n) {
    const r = await this.request("/auth/login", {
      method: "POST",
      body: { email: t, password: n },
    });
    return (
      this.setToken(r.access_token),
      chrome.storage.local.set({ user: r.user }),
      r
    );
  }
  async loginWithGoogle(t) {
    const n = await this.request("/auth/google", {
      method: "POST",
      body: { token: t },
    });
    return (
      this.setToken(n.access_token),
      chrome.storage.local.set({ user: n.user }),
      n
    );
  }
  async getHardwareId() {
    const t = await chrome.storage.local.get(["hardwareId"]);
    if (t.hardwareId) return t.hardwareId;
    const n = crypto.randomUUID();
    return (await chrome.storage.local.set({ hardwareId: n }), n);
  }
  async getCurrentUser() {
    const c = await chrome.storage.local.get([
      "accessToken",
      "hardwareId",
      "user",
      "banned",
    ]);
    if (!c.accessToken)
      return {
        email: "",
        name: "Connect Telegram",
        subscription_type: "none",
        daily_limit: 10,
        daily_generations: 0,
        remaining: 0,
        subscription_expires: null,
        authed: false,
        banned: false,
      };
    let l = c.user || {};
    let banned = !!c.banned;
    // Re-validate against the server: a banned/revoked account still holds a cached token, but
    // check-tg no longer returns a user (it replies "pending"). Treat that as BANNED. A valid user
    // self-heals the flag back to false (covers un-banning). 4s timeout so a slow server can't hang.
    try {
      const _ctl = new AbortController();
      const _to = setTimeout(() => _ctl.abort(), 4000);
      const b = await fetch(
        "https://grovex.space/api/v1/auth/check-tg?uuid=" + c.hardwareId,
        { signal: _ctl.signal },
      );
      clearTimeout(_to);
      if (b.ok) {
        const j = await b.json();
        if (j && j.user) {
          l = j.user;
          banned = false;
          chrome.storage.local.set({ user: j.user, banned: false });
        } else if (j && (j.status === "pending" || j.blocked || j.is_blocked)) {
          banned = true;
          chrome.storage.local.set({ banned: true });
        }
      }
    } catch (e) {}
    const used = l.daily_generations || 0,
      limit = l.daily_limit || 10,
      remaining = banned
        ? 0
        : typeof l.remaining === "number"
          ? l.remaining
          : Math.max(0, limit - used),
      plan = banned ? "banned" : l.subscription_type || "free";
    return {
      email: l.email || "telegram_user",
      name: l.name || l.email || "Telegram User",
      subscription_type: plan,
      daily_limit: limit,
      daily_generations: used,
      remaining: remaining,
      subscription_expires: banned ? null : l.subscription_expires || null,
      authed: true,
      banned: banned,
    };
  }
  async logout() {
    this.clearToken();
  }
  async getUsageStatus() {
    try {
      const { accessToken } = await chrome.storage.local.get(["accessToken"]);
      const r = await fetch(`${Td}/api/v1/usage/status`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (r.status === 401) {
        const _j = await r.json().catch(() => ({}));
        // Real ban -> BANNED; expired/invalid token -> logout (_gf401 handles both). Either way deny.
        _gf401(_j.detail);
        return { can_generate: false, remaining: 0, used: 0, daily_limit: 0, blocked: _j.detail === "Account is blocked" };
      }
      if (r.ok) return await r.json();
    } catch (e) {}
    // Server unreachable/errored: do NOT fail open to unlimited (blocking the server would
    // otherwise hand out infinite generations). Fall back to the LAST KNOWN server values cached
    // on the user — a paid user with remaining>0 keeps working through a blip; a free user gets
    // only their cached count, never infinity. If even the cache read fails, fail closed.
    try {
      const { user } = await chrome.storage.local.get(["user"]);
      const lim = (user && user.daily_limit) || 10;
      const used = (user && user.daily_generations) || 0;
      const rem = (user && typeof user.remaining === "number") ? user.remaining : Math.max(0, lim - used);
      return { can_generate: rem > 0, remaining: rem, used, daily_limit: lim, _stale: true };
    } catch (e2) {
      return { can_generate: false, remaining: 0, used: 0, daily_limit: 10, _stale: true };
    }
  }
  async trackGeneration(t, n = 1) {
    return this.request("/usage/track", {
      method: "POST",
      body: { service: t, prompt_count: n },
    });
  }
  async activatePromo(t) {
    return this.request("/promo/activate", {
      method: "POST",
      body: { code: t },
    });
  }
  async getPromoStatus() {
    return this.request("/promo/status");
  }
  async createPayment(t, n, r = "RUB") {
    return this.request("/payments/create", {
      method: "POST",
      body: { plan: t, provider: n, currency: r },
    });
  }
  async getPaymentStatus(t) {
    return this.request(`/payments/status/${t}`);
  }
  async createCryptoPayment(t) {
    return this.request("/payments/crypto/create", {
      method: "POST",
      body: { plan: t },
    });
  }
  async getPrices() {
    const t = await fetch(`${Dl}/settings/prices`);
    if (!t.ok) throw new Error("Failed to load prices");
    return t.json();
  }
  async healthCheck() {
    try {
      return (await fetch(`${Td}/health`), !0);
    } catch {
      return !1;
    }
  }
}
const Se = new l0();
Se.init();
// TG mirror preference: when t.me is blocked and the user picks a mirror (telegram.me / in-app),
// remember it and route EVERY bot link (login, pay, upgrade, limit) through it. Default = t.me.
let _gfTgMirror = "tme";
try { chrome.storage.local.get(["tgMirror"], (o) => { if (o && (o.tgMirror === "telegramme" || o.tgMirror === "tgapp" || o.tgMirror === "tme")) _gfTgMirror = o.tgMirror; }); } catch (e) {}
function gfSetTgMirror(m) { if (m === "telegramme" || m === "tgapp" || m === "tme") { _gfTgMirror = m; try { chrome.storage.local.set({ tgMirror: m }); } catch (e) {} } }
// Send each distinct reference photo ONCE instead of copying it into every prompt.
// A queue where every prompt has a character carried N copies of the same multi-MB image
// in a single runtime message; past ~20-28 prompts that exceeded Chrome's hard 64MiB limit,
// sendMessage threw, and generation silently never started. Photos move to payload.refPool
// keyed by a short id; background restores them (gfUnpackRefPool) before anything else runs.
function gfPackRefPool(prompts) {
  try {
    const list = Array.isArray(prompts) ? prompts : [];
    const pool = {};
    const seen = new Map();
    let n = 0;
    const keyFor = (u) => {
      if (typeof u !== "string" || u.indexOf("data:") !== 0) return u; // only heavy data URLs
      if (seen.has(u)) return seen.get(u);
      const k = "gfref" + (n++);
      seen.set(u, k);
      pool[k] = u;
      return k;
    };
    const packed = list.map((p) => {
      if (!p) return p;
      const q = { ...p };
      for (const f of ["referenceImageUrls", "objectImageUrls"]) {
        if (Array.isArray(q[f]) && q[f].length) q[f] = q[f].map(keyFor);
      }
      for (const f of ["imageUrl", "endImageUrl", "previewUrl"]) {
        if (typeof q[f] === "string") q[f] = keyFor(q[f]);
      }
      return q;
    });
    if (!n) return { prompts: list };            // nothing heavy -> send as-is
    return { prompts: packed, refPool: pool };
  } catch (e) {
    return { prompts: prompts };                  // never block a start because of packing
  }
}
// Guard every prompt dispatch: if the message still cannot be sent (e.g. dozens of DIFFERENT
// photos), tell the user instead of failing silently — that silence was the whole bug.
function gfSendPrompts(msg, onError) {
  try {
    chrome.runtime.sendMessage(msg, () => {
      const err = chrome.runtime.lastError;
      if (err && onError) onError(err.message || String(err));
    });
  } catch (e) {
    const m = (e && e.message) || String(e);
    if (onError) onError(/exceed|size/i.test(m) ? "Слишком много данных в очереди — запустите партиями или уменьшите фото референсов" : m);
  }
}
function gfBotUrl(payload, mirror) {
  const m = mirror || _gfTgMirror || "tme";
  const bot = "genflow_veo_bot";
  const p = payload ? String(payload) : "";
  if (m === "telegramme") return "https://telegram.me/" + bot + (p ? "?start=" + p : "");
  if (m === "tgapp") return "tg://resolve?domain=" + bot + (p ? "&start=" + p : "");
  return "https://t.me/" + bot + (p ? "?start=" + p : "");
}
function gfOpenBot(payload, mirror) {
  const url = gfBotUrl(payload, mirror);
  try { const _p = chrome.tabs.create({ url }); if (_p && typeof _p.catch === "function") _p.catch(() => {}); } catch (e) {}
  return url;
}
// Open ANY telegram username (chat/channel) through the user's chosen mirror —
// same routing as the bot links, so a blocked t.me doesn't dead-end the button.
function gfOpenTg(username) {
  const m = _gfTgMirror || "tme";
  const u = String(username || "").replace(/^@/, "");
  const url = m === "telegramme" ? "https://telegram.me/" + u : m === "tgapp" ? "tg://resolve?domain=" + u : "https://t.me/" + u;
  try { const _p = chrome.tabs.create({ url }); if (_p && typeof _p.catch === "function") _p.catch(() => {}); } catch (e) {}
  return url;
}
// After opening the bot for LOGIN, poll the server so the login completes (the Md modal polls on its
// own; the dropdown mirror row used to open the bot but never polled -> auth never picked up).
let _gfAuthPollIv = null;
function gfStartAuthPoll(hwId) {
  if (!hwId) return;
  if (_gfAuthPollIv) clearInterval(_gfAuthPollIv);
  const _stopAt = Date.now() + 180000;
  _gfAuthPollIv = setInterval(async () => {
    if (Date.now() > _stopAt) { clearInterval(_gfAuthPollIv); _gfAuthPollIv = null; return; }
    try {
      const r = await fetch(`https://grovex.space/api/v1/auth/check-tg?uuid=${hwId}`);
      if (!r.ok) return;
      const d = await r.json();
      if (d && d.status === "success" && d.token) {
        clearInterval(_gfAuthPollIv); _gfAuthPollIv = null;
        try { Se.setToken(d.token); } catch (e) {}
        try { await chrome.storage.local.set({ user: d.user, banned: false }); } catch (e) {}
        setTimeout(() => { try { window.location.reload(); } catch (e) {} }, 600);
      }
    } catch (e) {}
  }, 2000);
}
// Guard modal: shown when the user presses Start but no Flow PROJECT page is open. Vanilla DOM
// (no React state), localized (17 langs), with a close X + "Open Flow" button.
function gfShowFlowGate(lang) {
  const L = lang || "en";
  const TITLE = { en: "You're not on a Flow project page", ru: "Вы не на странице проекта Flow", es: "No estás en una página de proyecto de Flow", fr: "Vous n'êtes pas sur une page de projet Flow", de: "Du bist nicht auf einer Flow-Projektseite", pt: "Você não está numa página de projeto do Flow", it: "Non sei su una pagina di progetto Flow", ja: "Flowのプロジェクトページにいません", ko: "Flow 프로젝트 페이지에 있지 않습니다", zh: "您不在 Flow 项目页面", hi: "आप Flow प्रोजेक्ट पेज पर नहीं हैं", ar: "أنت لست في صفحة مشروع Flow", id: "Anda tidak berada di halaman proyek Flow", ms: "Anda tiada di halaman projek Flow", vi: "Bạn không ở trang dự án Flow", th: "คุณไม่ได้อยู่ในหน้าโปรเจกต์ Flow", tr: "Flow proje sayfasında değilsiniz" };
  const BODY = { en: "The automation works only on a Flow project page. Open a project, then press Start again.", ru: "Автоматизация работает только на странице проекта Flow. Откройте проект и снова нажмите Старт.", es: "La automatización solo funciona en una página de proyecto de Flow. Abre un proyecto y pulsa Iniciar de nuevo.", fr: "L'automatisation ne fonctionne que sur une page de projet Flow. Ouvrez un projet, puis appuyez de nouveau sur Démarrer.", de: "Die Automatisierung funktioniert nur auf einer Flow-Projektseite. Öffne ein Projekt und drücke erneut auf Start.", pt: "A automação só funciona numa página de projeto do Flow. Abra um projeto e pressione Iniciar novamente.", it: "L'automazione funziona solo su una pagina di progetto Flow. Apri un progetto e premi di nuovo Avvia.", ja: "自動化はFlowのプロジェクトページでのみ動作します。プロジェクトを開いてから、もう一度スタートを押してください。", ko: "자동화는 Flow 프로젝트 페이지에서만 작동합니다. 프로젝트를 연 후 다시 시작을 누르세요.", zh: "自动化仅在 Flow 项目页面上有效。请打开一个项目，然后再次点击开始。", hi: "ऑटोमेशन केवल Flow प्रोजेक्ट पेज पर काम करता है। एक प्रोजेक्ट खोलें और फिर से Start दबाएँ।", ar: "تعمل الأتمتة فقط في صفحة مشروع Flow. افتح مشروعًا ثم اضغط على بدء مرة أخرى.", id: "Otomatisasi hanya bekerja di halaman proyek Flow. Buka proyek, lalu tekan Mulai lagi.", ms: "Automasi hanya berfungsi di halaman projek Flow. Buka projek, kemudian tekan Mula semula.", vi: "Tự động hóa chỉ hoạt động trên trang dự án Flow. Mở một dự án rồi nhấn Bắt đầu lại.", th: "ระบบอัตโนมัติทำงานเฉพาะในหน้าโปรเจกต์ Flow เท่านั้น เปิดโปรเจกต์แล้วกดเริ่มอีกครั้ง", tr: "Otomasyon yalnızca Flow proje sayfasında çalışır. Bir proje açın ve tekrar Başlat'a basın." };
  const BTN = { en: "Open Flow", ru: "Перейти в Flow", es: "Abrir Flow", fr: "Ouvrir Flow", de: "Flow öffnen", pt: "Abrir Flow", it: "Apri Flow", ja: "Flowを開く", ko: "Flow 열기", zh: "打开 Flow", hi: "Flow खोलें", ar: "افتح Flow", id: "Buka Flow", ms: "Buka Flow", vi: "Mở Flow", th: "เปิด Flow", tr: "Flow'u aç" };
  const g = (M) => M[L] || M.en;
  try { const ex = document.getElementById("gf-flow-gate"); if (ex) ex.remove(); } catch (e) {}
  const ov = document.createElement("div");
  ov.id = "gf-flow-gate";
  ov.style.cssText = "position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.62);backdrop-filter:blur(3px);font-family:system-ui,-apple-system,sans-serif";
  const card = document.createElement("div");
  card.style.cssText = "position:relative;max-width:330px;margin:0 18px;background:#15151f;border:1px solid rgba(234,179,8,.35);border-radius:16px;padding:26px 22px 22px;box-shadow:0 24px 70px rgba(0,0,0,.55);text-align:center";
  const x = document.createElement("button");
  x.textContent = "✕";
  x.setAttribute("aria-label", "Close");
  x.style.cssText = "position:absolute;top:9px;right:12px;background:none;border:none;color:#8b8b98;font-size:15px;cursor:pointer;line-height:1;padding:4px";
  x.onclick = () => { try { ov.remove(); } catch (e) {} };
  const ic = document.createElement("div"); ic.textContent = "⚠️"; ic.style.cssText = "font-size:26px;margin-bottom:10px";
  const tt = document.createElement("div"); tt.textContent = g(TITLE); tt.style.cssText = "color:#fff;font-weight:700;font-size:15px;margin-bottom:9px;line-height:1.35";
  const bd = document.createElement("div"); bd.textContent = g(BODY); bd.style.cssText = "color:#c3ccd8;font-size:12.5px;line-height:1.55;margin-bottom:18px";
  const bt = document.createElement("button"); bt.textContent = g(BTN); bt.style.cssText = "background:linear-gradient(135deg,#15803d,#22c55e);color:#fff;border:none;border-radius:11px;padding:11px 20px;font-weight:600;font-size:13px;cursor:pointer;box-shadow:0 6px 18px rgba(34,197,94,.28)";
  bt.onclick = () => { try { chrome.tabs.create({ url: "https://labs.google/fx/tools/flow" }); } catch (e) {} try { ov.remove(); } catch (e) {} };
  card.appendChild(x); card.appendChild(ic); card.appendChild(tt); card.appendChild(bd); card.appendChild(bt);
  ov.appendChild(card);
  ov.onclick = (e) => { if (e.target === ov) { try { ov.remove(); } catch (er) {} } };
  try { (document.body || document.documentElement).appendChild(ov); } catch (e) {}
}
// Session-stale hint modal: after N stalls (Veo timeouts / character library didn't load) the background
// fires GF_FLOW_STALE_HINT; this offers a one-click Flow-state reset (reuses CLEAR_FLOW_COOKIES). 17 langs.
function gfShowSessionResetModal(lang) {
  const L = lang || "en";
  const TITLE = { en: "Flow session may be stuck", ru: "Похоже, сессия Flow подвисла", es: "La sesión de Flow parece atascada", fr: "La session Flow semble bloquée", de: "Flow-Sitzung hängt möglicherweise", pt: "A sessão do Flow parece travada", it: "La sessione Flow sembra bloccata", ja: "Flowのセッションが不安定なようです", ko: "Flow 세션이 멈춘 것 같습니다", zh: "Flow 会话可能卡住了", hi: "Flow सत्र अटका हो सकता है", ar: "قد تكون جلسة Flow معلّقة", id: "Sesi Flow mungkin macet", ms: "Sesi Flow mungkin tersekat", vi: "Phiên Flow có thể bị treo", th: "เซสชัน Flow อาจค้าง", tr: "Flow oturumu takılmış olabilir" };
  const BODY = { en: "Veo generations are timing out and library characters aren't attaching. Resetting Flow state usually fixes it.", ru: "Veo-генерации висят по таймауту, а персонажи из библиотеки не подставляются. Обычно это чинит сброс состояния Flow.", es: "Las generaciones de Veo expiran y los personajes de la biblioteca no se adjuntan. Restablecer el estado de Flow suele solucionarlo.", fr: "Les générations Veo expirent et les personnages de la bibliothèque ne s'attachent pas. Réinitialiser l'état de Flow corrige généralement le problème.", de: "Veo-Generierungen laufen ins Timeout und Bibliothek-Charaktere werden nicht angehängt. Ein Zurücksetzen des Flow-Status behebt das meist.", pt: "As gerações do Veo expiram e os personagens da biblioteca não são anexados. Redefinir o estado do Flow costuma resolver.", it: "Le generazioni Veo vanno in timeout e i personaggi della libreria non vengono allegati. Reimpostare lo stato di Flow di solito risolve.", ja: "Veoの生成がタイムアウトし、ライブラリのキャラクターが添付されません。Flowの状態をリセットすると通常は直ります。", ko: "Veo 생성이 시간 초과되고 라이브러리 캐릭터가 첨부되지 않습니다. Flow 상태를 초기화하면 대개 해결됩니다.", zh: "Veo 生成超时，图库角色也无法附加。重置 Flow 状态通常可以解决。", hi: "Veo जनरेशन टाइम आउट हो रहे हैं और लाइब्रेरी कैरेक्टर नहीं जुड़ रहे। Flow स्टेट रीसेट करने से आमतौर पर ठीक हो जाता है।", ar: "تنتهي مهلة عمليات Veo ولا تُرفق شخصيات المكتبة. عادةً ما تؤدي إعادة تعيين حالة Flow إلى إصلاح ذلك.", id: "Pembuatan Veo kehabisan waktu dan karakter pustaka tidak terpasang. Mengatur ulang status Flow biasanya memperbaikinya.", ms: "Penjanaan Veo tamat masa dan watak pustaka tidak terpasang. Menetapkan semula keadaan Flow biasanya membetulkannya.", vi: "Các lần tạo Veo bị hết thời gian và nhân vật thư viện không được đính kèm. Đặt lại trạng thái Flow thường khắc phục được.", th: "การสร้าง Veo หมดเวลาและตัวละครจากไลบรารีไม่ถูกแนบ การรีเซ็ตสถานะ Flow มักแก้ได้", tr: "Veo üretimleri zaman aşımına uğruyor ve kitaplık karakterleri eklenmiyor. Flow durumunu sıfırlamak genelde bunu düzeltir." };
  const BTN = { en: "Reset Flow state", ru: "Сбросить состояние Flow", es: "Restablecer estado de Flow", fr: "Réinitialiser Flow", de: "Flow zurücksetzen", pt: "Redefinir estado do Flow", it: "Reimposta stato Flow", ja: "Flowの状態をリセット", ko: "Flow 상태 초기화", zh: "重置 Flow 状态", hi: "Flow स्टेट रीसेट करें", ar: "إعادة تعيين حالة Flow", id: "Atur ulang status Flow", ms: "Set semula keadaan Flow", vi: "Đặt lại trạng thái Flow", th: "รีเซ็ตสถานะ Flow", tr: "Flow durumunu sıfırla" };
  const LATER = { en: "Later", ru: "Позже", es: "Más tarde", fr: "Plus tard", de: "Später", pt: "Mais tarde", it: "Più tardi", ja: "後で", ko: "나중에", zh: "稍后", hi: "बाद में", ar: "لاحقًا", id: "Nanti", ms: "Kemudian", vi: "Để sau", th: "ภายหลัง", tr: "Sonra" };
  const NOTE = { en: "Clears only labs.google cookies and reloads the Flow tab.", ru: "Чистит только куки labs.google и перезагружает вкладку Flow.", es: "Solo borra las cookies de labs.google y recarga la pestaña de Flow.", fr: "Efface uniquement les cookies labs.google et recharge l'onglet Flow.", de: "Löscht nur labs.google-Cookies und lädt den Flow-Tab neu.", pt: "Limpa apenas os cookies do labs.google e recarrega a aba do Flow.", it: "Cancella solo i cookie di labs.google e ricarica la scheda Flow.", ja: "labs.googleのCookieのみ削除し、Flowタブを再読み込みします。", ko: "labs.google 쿠키만 지우고 Flow 탭을 새로고침합니다.", zh: "仅清除 labs.google 的 Cookie 并重新加载 Flow 标签页。", hi: "केवल labs.google कुकीज़ साफ़ करता है और Flow टैब रीलोड करता है।", ar: "يمسح فقط ملفات تعريف الارتباط الخاصة بـ labs.google ويعيد تحميل علامة تبويب Flow.", id: "Hanya menghapus cookie labs.google dan memuat ulang tab Flow.", ms: "Hanya membersihkan kuki labs.google dan memuat semula tab Flow.", vi: "Chỉ xóa cookie labs.google và tải lại tab Flow.", th: "ล้างเฉพาะคุกกี้ labs.google และโหลดแท็บ Flow ใหม่", tr: "Yalnızca labs.google çerezlerini temizler ve Flow sekmesini yeniler." };
  const g = (M) => M[L] || M.en;
  const done = () => { try { chrome.storage.local.remove("gfFlowStaleHint"); } catch (e) {} };
  try { const ex = document.getElementById("gf-session-reset"); if (ex) ex.remove(); } catch (e) {}
  const ov = document.createElement("div");
  ov.id = "gf-session-reset";
  ov.style.cssText = "position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.62);backdrop-filter:blur(3px);font-family:system-ui,-apple-system,sans-serif";
  const card = document.createElement("div");
  card.style.cssText = "position:relative;max-width:340px;margin:0 18px;background:#15151f;border:1px solid rgba(234,179,8,.35);border-radius:16px;padding:26px 22px 18px;box-shadow:0 24px 70px rgba(0,0,0,.55);text-align:center";
  const x = document.createElement("button"); x.textContent = "✕"; x.setAttribute("aria-label", "Close");
  x.style.cssText = "position:absolute;top:9px;right:12px;background:none;border:none;color:#8b8b98;font-size:15px;cursor:pointer;line-height:1;padding:4px";
  x.onclick = () => { done(); try { ov.remove(); } catch (e) {} };
  const ic = document.createElement("div"); ic.textContent = "⚠️"; ic.style.cssText = "font-size:26px;margin-bottom:10px";
  const tt = document.createElement("div"); tt.textContent = g(TITLE); tt.style.cssText = "color:#fff;font-weight:700;font-size:15px;margin-bottom:9px;line-height:1.35";
  const bd = document.createElement("div"); bd.textContent = g(BODY); bd.style.cssText = "color:#c3ccd8;font-size:12.5px;line-height:1.55;margin-bottom:16px";
  const bt = document.createElement("button"); bt.textContent = g(BTN); bt.style.cssText = "width:100%;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;border:none;border-radius:11px;padding:11px 18px;font-weight:600;font-size:13px;cursor:pointer;box-shadow:0 6px 18px rgba(59,130,246,.28)";
  bt.onclick = () => { try { chrome.runtime.sendMessage({ type: "CLEAR_FLOW_COOKIES" }); } catch (e) {} done(); try { ov.remove(); } catch (e) {} };
  const lt = document.createElement("button"); lt.textContent = g(LATER); lt.style.cssText = "margin-top:11px;background:none;border:none;color:#8b8b98;font-size:12.5px;cursor:pointer";
  lt.onclick = () => { done(); try { ov.remove(); } catch (e) {} };
  const nt2 = document.createElement("div"); nt2.textContent = g(NOTE); nt2.style.cssText = "margin-top:13px;padding-top:11px;border-top:1px solid rgba(255,255,255,.08);color:#7c7c8a;font-size:10.5px;line-height:1.5";
  card.appendChild(x); card.appendChild(ic); card.appendChild(tt); card.appendChild(bd); card.appendChild(bt); card.appendChild(lt); card.appendChild(nt2);
  ov.appendChild(card);
  ov.onclick = (e) => { if (e.target === ov) { done(); try { ov.remove(); } catch (er) {} } };
  try { (document.body || document.documentElement).appendChild(ov); } catch (e) {}
}
// Server 401 ("Account is blocked") or a revoked token -> flag the account as BANNED. The dropdown
// then shows a red BANNED badge and generation is denied. We KEEP the token so the banned state
// stays visible; getCurrentUser re-validates via check-tg and self-heals the flag if un-banned.
function _gfMarkBanned() {
  try { chrome.storage.local.set({ banned: true }); } catch (e) {}
  try { chrome.runtime.sendMessage({ type: "STOP_GENERATION" }); } catch (e) {}
}
// 401 router: the server returns 401 for BOTH a real ban and a merely expired/invalid token.
// Only a ban carries detail "Account is blocked" -> BANNED. Anything else ("Invalid token" /
// "Not authenticated") is just a stale token -> log out and return to the auth screen, NOT a ban.
let _gfExpiredHandled = false;
function _gf401(detail) {
  if (detail === "Account is blocked") { _gfMarkBanned(); return; }
  // Expired/invalid token -> log out. ONLY if we actually hold a token: an unauthed request has no
  // token and the server replies 401 "Not authenticated" — reacting to THAT would reload-loop the
  // unauthed UI (and close the dropdown before the user can click Connect Telegram).
  if (!Se.accessToken) return;
  if (_gfExpiredHandled) return;
  _gfExpiredHandled = true;
  try { Se.clearToken(); } catch (e) {}
  try { chrome.runtime.sendMessage({ type: "STOP_GENERATION" }); } catch (e) {}
  setTimeout(() => { try { window.location.reload(); } catch (e) {} }, 400);
}
function Md({ isOpen: e, onClose: t }) {
  const { addLog: n } = nt();
  const [isWaiting, setIsWaiting] = z.useState(!1);
  const [errorMsg, setErrorMsg] = z.useState("");
  const [hwId, setHwId] = z.useState("");
  const [linkCode, setLinkCode] = z.useState(null);

  z.useEffect(() => {
    if (e) {
      Se.getHardwareId().then((id) => setHwId(id));
    }
  }, [e]);

  // Fetch a short-lived, single-use connect code and refresh it while the login screen is
  // open, so the QR/link carries a code that dies in ~2 min (or on first use) instead of
  // the permanent install id. Falls back to hwId if the request fails — the bot accepts both.
  z.useEffect(() => {
    if (!e || !hwId) return;
    let active = true;
    const fetchCode = async () => {
      try {
        // No token here: the login screen runs BEFORE the user is authed, so the install
        // identifies itself by its own hardware_id. Only the short-lived code hits the link.
        const res = await fetch("https://grovex.space/api/v1/auth/link-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hardware_id: hwId }),
        });
        if (!res.ok) return;
        const r = await res.json();
        if (active && r && r.code) setLinkCode(r.code);
      } catch (_e) {}
    };
    fetchCode();
    const iv = setInterval(fetchCode, 9e4);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [e, hwId]);

  z.useEffect(() => {
    // Poll for the link the whole time the login screen is open (not only after the
    // button): the QR path never clicks the button, so gating on isWaiting meant a QR
    // scan was never detected. hwId present == login screen shown -> keep polling.
    if (!hwId) return;
    let active = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `https://grovex.space/api/v1/auth/check-tg?uuid=${hwId}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "success" && data.token) {
          if (active) {
            clearInterval(interval);
            Se.setToken(data.token);
            await chrome.storage.local.set({ user: data.user });
            n({ type: "success", message: "Signed in successfully!" });
            setTimeout(() => {
              t();
              window.location.reload();
            }, 800);
          }
        }
      } catch (e) {
        console.error("Checking auth status error:", e);
      }
    }, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isWaiting, hwId]);

  if (!e) return null;

  const handleLoginClick = () => {
    if (!hwId) return;
    gfOpenBot("auth_" + (linkCode || hwId));
    setIsWaiting(!0);
  };

  return o.jsxs("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center",
    children: [
      o.jsx("div", {
        className: "absolute inset-0 bg-black/60 backdrop-blur-sm",
        onClick: t,
      }),
      o.jsx("div", {
        className:
          "relative w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-200",
        children: o.jsxs("div", {
          className:
            "glass-panel p-6 rounded-2xl border border-surface-700/50 shadow-2xl",
          children: [
            o.jsx("button", {
              onClick: t,
              className:
                "absolute top-4 right-4 p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700/50 transition-colors",
              children: o.jsx(Lr, { className: "w-5 h-5" }),
            }),
            o.jsxs("div", {
              className: "text-center mb-6",
              children: [
                o.jsx("div", {
                  className:
                    "w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25",
                  children: o.jsx(Ri, { className: "w-8 h-8 text-white" }),
                }),
                o.jsx("h2", {
                  className: "text-xl font-bold text-white",
                  children: "Sign in with Telegram",
                }),
                o.jsx("p", {
                  className: "text-sm text-surface-400 mt-1",
                  children:
                    "Your subscription activates automatically after you sign in to the bot",
                }),
              ],
            }),
            isWaiting
              ? o.jsxs("div", {
                  className: "text-center py-6 space-y-4",
                  children: [
                    o.jsx(Al, {
                      className:
                        "w-8 h-8 animate-spin mx-auto text-primary-500",
                    }),
                    o.jsx("p", {
                      className: "text-white font-medium text-sm animate-pulse",
                      children: "Waiting for confirmation in Telegram\u2026",
                    }),
                    o.jsx("p", {
                      className: "text-xs text-surface-400",
                      children:
                        "Please open the Telegram bot and tap Start",
                    }),
                    o.jsx("button", {
                      onClick: () => setIsWaiting(!1),
                      className: "text-xs text-primary-400 hover:underline",
                      children: "Cancel",
                    }),
                  ],
                })
              : o.jsxs("div", {
                  className: "space-y-4",
                  children: [
                    errorMsg &&
                      o.jsx("div", {
                        className:
                          "p-3 rounded-lg bg-red-500/10 border border-red-500/20",
                        children: o.jsx("p", {
                          className: "text-sm text-red-400",
                          children: errorMsg,
                        }),
                      }),
                    o.jsx("div", {
                      className: "text-sm font-semibold text-surface-200 text-center flex items-center justify-center gap-1.5",
                      children: "\ud83d\udcbb Telegram Desktop",
                    }),
                    o.jsxs("button", {
                      onClick: handleLoginClick,
                      className:
                        "w-full py-3 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40",
                      children: [
                        o.jsx("span", { children: "Continue with Telegram" }),
                        o.jsx(kd, { className: "w-4 h-4" }),
                      ],
                    }),
                    o.jsx("div", {
                      className: "text-xs text-surface-400 text-center px-2 -mt-1",
                      children: "\u26a0\ufe0f The button above works only if Telegram Desktop is installed",
                    }),
                    o.jsx("a", {
                      href: "https://desktop.telegram.org/",
                      target: "_blank",
                      rel: "noopener noreferrer",
                      className: "block text-center text-xs text-primary-400 hover:underline font-medium",
                      children: "Install Telegram Desktop",
                    }),
                    o.jsx("div", {
                      className: "text-sm font-semibold text-surface-200 text-center flex items-center justify-center gap-1.5 pt-2 mt-2 border-t border-surface-700/50",
                      children: "\ud83d\udcf1 From your phone",
                    }),
                    hwId &&
                      o.jsxs("div", {
                        className: "flex flex-col items-center gap-2",
                        children: [
                          linkCode
                            ? o.jsx("img", {
                                src:
                                  "https://grovex.space/api/v1/qr?data=" +
                                  encodeURIComponent(
                                    // Respect the Telegram mirror so a blocked t.me doesn't dead-end
                                    // the QR. A phone camera can't use tg://, so force a WEB mirror:
                                    // telegram.me when that's the working one, else t.me.
                                    gfBotUrl(
                                      "auth_" + linkCode,
                                      _gfTgMirror === "telegramme" ? "telegramme" : "tme"
                                    )
                                  ),
                                alt: "QR",
                                className: "w-40 h-40 rounded-lg bg-white p-2 shadow-lg",
                              })
                            : o.jsx("div", {
                                className:
                                  "w-40 h-40 rounded-lg bg-surface-800 flex items-center justify-center text-xs text-surface-400",
                                children: "Preparing code\u2026",
                              }),
                          o.jsx("p", {
                            className: "text-xs text-surface-400 text-center px-2 leading-relaxed",
                            children:
                              "Point your phone camera (a normal one, not Telegram) at the code \u2192 the bot opens \u2192 tap Start. No app is needed on your PC.",
                          }),
                        ],
                      }),
                  ],
                }),
          ],
        }),
      }),
    ],
  });
}
function s0({ onOpenUpgrade: e }) {
  const {
      showSettings: t,
      setShowSettings: n,
      addLog: r,
      settings: _S,
      updateSettings: _US,
      setSelectorsLoaded: setSelectorsLoaded,
      setUpdateRequired: setUpdateRequired,
      setMinVersion: setMinVersion,
    } = nt(),
    [l, s] = z.useState(!1),
    [i, a] = z.useState(!1),
    [u, c] = z.useState({ daily_limit: 10, daily_generations: 0 }),
    [h, x] = z.useState(null),
    [m, v] = z.useState(""),
    [w, y] = z.useState(!1),
    [j, f] = z.useState(null),
    [_pmsg, _setPmsg] = z.useState(null),
    d = z.useRef(null);
  (z.useEffect(() => {
    var Te, Ke, I, O, $, G;
    (Ke = (Te = chrome.storage) == null ? void 0 : Te.local) == null ||
      Ke.get(["user"], (B) => {
        B.user && c(B.user);
      });
    const T = async () => {
      try {
        const hwId = await Se.getHardwareId();
        const _tok2 = Se.accessToken || ((await chrome.storage.local.get(["accessToken"])).accessToken);
        const res = await fetch(`${Td}/api/v1/config/flow`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(_tok2 ? { Authorization: `Bearer ${_tok2}` } : {}) },
          body: JSON.stringify({ hardware_id: hwId }),
        });
        if (res.status === 401) { const _j = await res.json().catch(() => ({})); _gf401(_j.detail); return; }
        x(true);
        if (res.ok) {
          const data = await res.json();
          if (data && data.selectors) {
            await chrome.runtime.sendMessage({
              type: "SET_FLOW_SELECTORS",
              selectors: data.selectors,
            });
            setSelectorsLoaded(true);
            const currentVer = chrome.runtime.getManifest().version;
            const minVer = data.minVersion || "1.0.0";
            const parseVer = (val) => val.split(".").map(Number);
            const curParts = parseVer(currentVer);
            const minParts = parseVer(minVer);
            let updateReq = false;
            for (
              let idx = 0;
              idx < Math.max(curParts.length, minParts.length);
              idx++
            ) {
              const cv = curParts[idx] || 0;
              const mv = minParts[idx] || 0;
              if (cv < mv) {
                updateReq = true;
                break;
              }
              if (cv > mv) {
                break;
              }
            }
            if (updateReq) {
              setUpdateRequired(true);
              setMinVersion(minVer);
            } else {
              setUpdateRequired(false);
            }
            x(true);
            return;
          }
        }
      } catch (err) {
        console.error("Selectors fetch error:", err);
        x(false);
      }
      setSelectorsLoaded(false);
    };
    (T(),
      (async () => {
        try {
          const B = await fetch(`${Dl}/settings/public`);
          if (B.ok) {
            const ie = await B.json();
            ie.telegram_link && f(ie.telegram_link);
          }
        } catch {}
      })());
    const oe = setInterval(T, 3e4),
      fe = (B) => {
        B.user && c(B.user.newValue || null);
      };
    (O = (I = chrome.storage) == null ? void 0 : I.onChanged) == null ||
      O.addListener(fe);
    const ut = (B) => {
      var ie, ye;
      B.type === "USAGE_UPDATED" &&
        B.payload &&
        ((ye = (ie = chrome.storage) == null ? void 0 : ie.local) == null ||
          ye.get(["user"], (Fe) => {
            Fe.user && c(Fe.user);
          }));
    };
    return (
      (G = ($ = chrome.runtime) == null ? void 0 : $.onMessage) == null ||
        G.addListener(ut),
      () => {
        var B, ie, ye, Fe;
        (clearInterval(oe),
          (ie = (B = chrome.storage) == null ? void 0 : B.onChanged) == null ||
            ie.removeListener(fe),
          (Fe = (ye = chrome.runtime) == null ? void 0 : ye.onMessage) ==
            null || Fe.removeListener(ut));
      }
    );
  }, []),
    z.useEffect(() => {
      const T = (D) => {
        d.current && !d.current.contains(D.target) && s(!1);
      };
      return (
        l &&
          setTimeout(() => {
            document.addEventListener("mousedown", T);
          }, 0),
        () => {
          document.removeEventListener("mousedown", T);
        }
      );
    }, [l]));
  const p = async () => {
      var T, D;
      (await ((D = (T = chrome.storage) == null ? void 0 : T.local) == null
        ? void 0
        : D.remove(["accessToken", "user", "banned", "hardwareId"])),
        c(null),
        s(!1),
        r({ type: "info", message: "Signed out successfully" }),
        setTimeout(() => window.location.reload(), 400));
    },
    g = async () => {
      if (m.trim()) {
        y(!0);
        try {
          const { accessToken: T } = await chrome.storage.local.get([
            "accessToken",
          ]);
          if (!T) {
            r({ type: "error", message: "Please sign in to apply promo code" });
            return;
          }
          const D = await fetch(`${Dl}/promo/apply`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${T}`,
              "Accept-Language": (_S && _S.language) || "en",
            },
            body: JSON.stringify({ code: m.trim(), language: (_S && _S.language) || "en" }),
          });
          if (D.ok) {
            const oe = await D.json();
            _setPmsg({ ok: true, msg: oe.message || "Promo code applied!" });
            (r({
              type: "success",
              message: oe.message || "Promo code applied!",
            }),
              v(""));
            const fe = await Se.getCurrentUser();
            (c(fe), chrome.storage.local.set({ user: fe }));
            setTimeout(() => window.location.reload(), 1800);
          } else {
            const oe = await D.json();
            _setPmsg({ ok: false, msg: oe.detail || "Invalid promo code" });
            r({ type: "error", message: oe.detail || "Invalid promo code" });
          }
        } catch {
          r({ type: "error", message: "Failed to apply promo code" });
        } finally {
          y(!1);
        }
      }
    },
    N = (T) => {
      if (!T) return null;
      try {
        return new Date(T).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      } catch {
        return null;
      }
    },
    R =
      (u == null ? void 0 : u.subscription_type) === "premium" ||
      (u == null ? void 0 : u.subscription_type) === "unlimited",
    E = (u == null ? void 0 : u.daily_limit) ?? 10,
    S = (u == null ? void 0 : u.daily_generations) ?? 0,
    b = u && typeof u.remaining === "number" ? u.remaining : Math.max(0, E - S),
    L = (T, D) =>
      T
        ? T.split(" ")
            .map((oe) => oe[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : D
          ? D[0].toUpperCase()
          : "U";
  return o.jsxs(o.Fragment, {
    children: [
      o.jsxs("header", {
        className:
          "flex items-center justify-between px-4 py-3 border-b border-surface-700/50",
        children: [
          o.jsxs("div", {
            className: "flex items-center gap-2",
            children: [
              o.jsx("img", {
                src: "assets/icon128.png",
                alt: "GenFlow",
                className: "w-8 h-8 rounded-xl shadow-glow",
              }),
              o.jsxs("div", {
                children: [
                  o.jsx("h1", {
                    className: "text-lg font-bold text-gradient",
                    children: "GenFlow",
                  }),
                  o.jsx("p", {
                    className: "text-[10px] text-surface-400 -mt-0.5",
                    children: "AI Automation",
                  }),
                ],
              }),
              o.jsx("button", {
                onClick: function () {
                  window.__gfModes && window.__gfModes.open();
                },
                title: "Modes & features guide (EN / RU)",
                className:
                  "h-9 px-2.5 rounded-lg text-xs font-medium text-surface-200 bg-surface-800 hover:bg-surface-700 border border-surface-700/50 transition-colors flex items-center gap-1 shrink-0",
                children: "📖 Guide",
              }),
            ],
          }),
          o.jsxs("div", {
            className: "flex items-center gap-2",
            children: [
              o.jsx("div", {
                className: `h-9 flex items-center justify-center rounded-xl ${h === null ? "bg-surface-800 text-surface-500" : h ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`,
                style: { width: "36px", height: "36px" },
                title:
                  h === null
                    ? "Checking server..."
                    : h
                      ? "Server online"
                      : "Server offline",
                children:
                  h === !1
                    ? o.jsx(vh, { className: "w-3.5 h-3.5" })
                    : o.jsx(wh, { className: "w-3.5 h-3.5" }),
              }),
              u &&
                o.jsxs("div", {
                  className:
                    "h-9 px-2.5 rounded-lg bg-surface-800 border border-surface-700/50 flex items-center gap-1.5",
                  children: [
                    R
                      ? o.jsx(Jm, { className: "w-3 h-3 text-accent-400" })
                      : o.jsx(rs, { className: "w-3 h-3 text-accent-400" }),
                    o.jsxs("span", {
                      className: "text-[10px] text-surface-300 font-medium",
                      children: [
                        (function () {
                          var L = (_S && _S.language) || "en";
                          var PAY = {
                            en: "Pay",
                            ru: "Оплатить",
                            es: "Pagar",
                            fr: "Payer",
                            de: "Bezahlen",
                            pt: "Pagar",
                            it: "Paga",
                            ja: "支払う",
                            ko: "결제하기",
                            zh: "去支付",
                            hi: "भुगतान करें",
                            ar: "ادفع",
                            id: "Bayar",
                            ms: "Bayar",
                            vi: "Thanh toán",
                            th: "ชำระเงิน",
                            tr: "Öde",
                          };
                          var UNTIL = {
                            en: "Active until",
                            ru: "Действует до",
                            es: "Válido hasta",
                            fr: "Valable jusqu'au",
                            de: "Gültig bis",
                            pt: "Válido até",
                            it: "Valido fino al",
                            ja: "有効期限",
                            ko: "유효기간",
                            zh: "有效期至",
                            hi: "मान्य तक",
                            ar: "ساري حتى",
                            id: "Berlaku hingga",
                            ms: "Sah hingga",
                            vi: "Có hiệu lực đến",
                            th: "ใช้ได้ถึง",
                            tr: "Geçerli",
                          };
                          var LIFE = {
                            en: "Lifetime",
                            ru: "Навсегда",
                            es: "De por vida",
                            fr: "À vie",
                            de: "Lebenslang",
                            pt: "Vitalício",
                            it: "A vita",
                            ja: "無期限",
                            ko: "평생",
                            zh: "永久",
                            hi: "आजीवन",
                            ar: "مدى الحياة",
                            id: "Seumur hidup",
                            ms: "Seumur hidup",
                            vi: "Trọn đời",
                            th: "ตลอดชีพ",
                            tr: "Ömür boyu",
                          };
                          function g(M) {
                            return M[L] || M.en;
                          }
                          var CHAT = {
                            en: "Chat",
                            ru: "Чат",
                            es: "Chat",
                            fr: "Chat",
                            de: "Chat",
                            pt: "Chat",
                            it: "Chat",
                            ja: "チャット",
                            ko: "채팅",
                            zh: "群聊",
                            hi: "चैट",
                            ar: "دردشة",
                            id: "Chat",
                            ms: "Chat",
                            vi: "Chat",
                            th: "แชท",
                            tr: "Sohbet",
                          };
                          var pay = o.jsx("a", {
                            href: gfBotUrl(""),
                            target: "_blank",
                            rel: "noreferrer",
                            onClick: function (ev) { try { ev.preventDefault(); } catch (e) {} gfOpenBot(""); },
                            style: {
                              color: "#60a5fa",
                              textDecoration: "underline",
                              cursor: "pointer",
                            },
                            children: g(PAY),
                          });
                          // Support/community chat — routed through the TG mirror choice
                          // like every other telegram link (blocked t.me must not dead-end).
                          var chat = o.jsx("a", {
                            href: "https://t.me/GenFlow_chat",
                            target: "_blank",
                            rel: "noreferrer",
                            onClick: function (ev) { try { ev.preventDefault(); } catch (e) {} gfOpenTg("GenFlow_chat"); },
                            style: {
                              color: "#60a5fa",
                              textDecoration: "underline",
                              cursor: "pointer",
                            },
                            children: g(CHAT),
                          });
                          var payRow = o.jsxs("span", {
                            style: { display: "inline-flex", gap: "5px", alignItems: "center" },
                            children: [pay, o.jsx("span", { style: { color: "#64748b" }, children: "·" }), chat],
                          });
                          if (R) {
                            if (u.subscription_expires) {
                              var d = new Date(u.subscription_expires);
                              var ds =
                                ("0" + d.getDate()).slice(-2) +
                                "." +
                                ("0" + (d.getMonth() + 1)).slice(-2) +
                                "." +
                                d.getFullYear();
                              return o.jsxs("span", {
                                className: "flex flex-col leading-tight",
                                children: [
                                  o.jsx("span", {
                                    children: g(UNTIL) + " " + ds,
                                  }),
                                  payRow,
                                ],
                              });
                            }
                            return o.jsxs("span", {
                              className: "flex flex-col leading-tight",
                              children: [o.jsx("span", { children: g(LIFE) }), chat],
                            });
                          }
                          return o.jsxs("span", {
                            className: "flex flex-col leading-tight",
                            children: [
                              o.jsxs("span", {
                                children: [
                                  o.jsx("span", {
                                    className: "text-accent-400 font-medium",
                                    children: b > 100 ? "∞" : b,
                                  }),
                                  o.jsx("span", {
                                    className: "text-surface-500",
                                    children: b > 100 ? "" : "/10",
                                  }),
                                ],
                              }),
                              payRow,
                            ],
                          });
                        })(),
                      ],
                    }),
                  ],
                }),
              o.jsx("select", {
                value: (_S && _S.language) || "en",
                onChange: (a) => _US({ language: a.target.value }),
                title: "Interface language",
                className:
                  "bg-surface-800 text-surface-300 text-xs rounded-xl px-2 h-9 border border-surface-700 hover:text-white cursor-pointer",
                children: [
                  ["en", "EN"],
                  ["ru", "RU"],
                  ["es", "ES"],
                  ["fr", "FR"],
                  ["de", "DE"],
                  ["pt", "PT"],
                  ["it", "IT"],
                  ["ja", "JA"],
                  ["ko", "KO"],
                  ["zh", "ZH"],
                  ["hi", "HI"],
                  ["ar", "AR"],
                  ["id", "ID"],
                  ["ms", "MS"],
                  ["vi", "VI"],
                  ["th", "TH"],
                  ["tr", "TR"],
                ].map((_l) =>
                  o.jsx("option", { value: _l[0], children: _l[1] }, _l[0]),
                ),
              }),
              o.jsx("button", {
                onClick: () => n(!t),
                className: `p-2 rounded-xl transition-all duration-200 ${t ? "bg-primary-600 text-white shadow-glow" : "bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700"}`,
                title: "Settings",
                children: o.jsx(xh, { className: "w-5 h-5" }),
              }),
              o.jsxs("div", {
                className: "relative",
                ref: d,
                children: [
                  o.jsx("button", {
                    onClick: () => (u ? s(!l) : a(!0)),
                    className: `p-2 rounded-xl transition-all duration-200 ${u ? "bg-accent-600/20 text-accent-400 border border-accent-500/30" : "bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-glow hover:shadow-lg"}`,
                    title: u ? u.email : "Sign in",
                    children:
                      u != null && u.avatar_url
                        ? o.jsx("img", {
                            src: u.avatar_url,
                            alt: "",
                            className: "w-5 h-5 rounded-full",
                          })
                        : u
                          ? o.jsx("div", {
                              className:
                                "w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center text-[10px] font-bold text-white",
                              children: L(u.name, u.email),
                            })
                          : R
                            ? o.jsx(pr, { className: "w-5 h-5" })
                            : o.jsx(Ed, { className: "w-5 h-5" }),
                  }),
                  l &&
                    u &&
                    o.jsxs("div", {
                      className:
                        "absolute right-0 top-full mt-2 w-72 glass-panel p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200",
                      children: [
                        o.jsxs("div", {
                          className:
                            "flex items-center gap-3 px-3 py-3 border-b border-surface-700/50 mb-2",
                          children: [
                            u.avatar_url
                              ? o.jsx("img", {
                                  src: u.avatar_url,
                                  alt: "",
                                  className: "w-10 h-10 rounded-full",
                                })
                              : o.jsx("div", {
                                  className:
                                    "w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-sm font-bold text-white",
                                  children: L(u.name, u.email),
                                }),
                            o.jsxs("div", {
                              className: "flex-1 min-w-0",
                              children: [
                                o.jsx("p", {
                                  className:
                                    "text-sm font-medium text-white truncate",
                                  children:
                                    u.name ||
                                    (u.subscription_type ? "User" : "Connect Telegram"),
                                }),
                                o.jsx("p", {
                                  className:
                                    "text-[11px] text-surface-400 truncate",
                                  children: u.email,
                                }),
                                o.jsxs("div", {
                                  className: "flex items-center gap-2 mt-1",
                                  children: [
                                    (!u.name && !u.subscription_type)
                                      ? o.jsx("span", {
                                          className:
                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 text-[10px] font-semibold",
                                          children: "🔌 Connect Telegram",
                                        })
                                      : (u.subscription_type === "banned" || u.banned)
                                      ? o.jsx("span", {
                                          className:
                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-semibold",
                                          children: "🚫 BANNED",
                                        })
                                      : R
                                      ? o.jsxs("span", {
                                          className:
                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-400 text-[10px]",
                                          children: [
                                            o.jsx(pr, { className: "w-3 h-3" }),
                                            "Premium",
                                          ],
                                        })
                                      : o.jsx("span", {
                                          className:
                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-700 text-surface-300 text-[10px]",
                                          children: u.subscription_expires
                                            ? "Premium"
                                            : "Free Plan",
                                        }),
                                    !(u.subscription_type === "banned" || u.banned) &&
                                    u.subscription_expires &&
                                      o.jsxs("span", {
                                        className:
                                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-700 text-surface-400 text-[9px]",
                                        children: [
                                          o.jsx(Jm, {
                                            className: "w-2.5 h-2.5",
                                          }),
                                          "до ",
                                          N(u.subscription_expires),
                                        ],
                                      }),
                                  ],
                                }),
                              ],
                            }),
                          ],
                        }),
                        (u.name || u.subscription_type) &&
                          o.jsxs("div", {
                          className: "px-3 py-2 mb-2",
                          children: [o.jsxs("div", {
                            className: "flex gap-2",
                            children: [
                              o.jsxs("div", {
                                className: "flex-1 relative",
                                children: [
                                  o.jsx(uh, {
                                    className:
                                      "w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-500",
                                  }),
                                  o.jsx("input", {
                                    type: "text",
                                    value: m,
                                    onChange: (T) => (v(T.target.value), _setPmsg(null)),
                                    onKeyDown: (T) => T.key === "Enter" && g(),
                                    placeholder: "Promo code",
                                    className:
                                      "w-full pl-8 pr-3 py-1.5 bg-surface-800 border border-surface-600 rounded-lg text-xs text-white placeholder-surface-500 focus:outline-none focus:border-primary-500",
                                  }),
                                ],
                              }),
                              o.jsx("button", {
                                onClick: g,
                                disabled: w || !m.trim(),
                                className:
                                  "px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                                children: w ? "..." : "Apply",
                              }),
                            ],
                          }),
                          _pmsg &&
                            o.jsx("div", {
                              className: _pmsg.ok
                                ? "mt-1.5 text-[11px] text-green-400"
                                : "mt-1.5 text-[11px] text-red-400",
                              children: _pmsg.msg,
                            }),
                          ],
                        }),
                        (u.name || u.subscription_type) && !R &&
                          o.jsxs("button", {
                            onClick: () => {
                              gfOpenBot("");
                              s(!1);
                              e == null || e();
                            },
                            className:
                              "w-full flex items-center justify-center gap-2 px-3 py-2 mb-2 rounded-lg bg-gradient-to-r from-accent-600 to-accent-500 text-white text-sm font-medium hover:from-accent-500 hover:to-accent-400 transition-all",
                            children: [
                              o.jsx(pr, { className: "w-4 h-4" }),
                              "Upgrade to Premium",
                            ],
                          }),
                        j &&
                          o.jsxs("a", {
                            href: j,
                            target: "_blank",
                            rel: "noopener noreferrer",
                            className:
                              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-blue-400 hover:bg-blue-500/10 transition-colors",
                            children: [
                              o.jsx(mh, { className: "w-4 h-4" }),
                              "Telegram Community",
                            ],
                          }),
                        (u.name || u.subscription_type) &&
                          o.jsxs("div", {
                          className: "flex items-center gap-2 mb-2",
                          children: [
                            o.jsx("button", {
                              onClick: function (e) {
                                var b = e.currentTarget;
                                try {
                                  chrome.storage.local
                                    .get(["accessToken"])
                                    .then(function (d) {
                                      if (d && d.accessToken) {
                                        navigator.clipboard.writeText(
                                          d.accessToken,
                                        );
                                        b.textContent = "✓ API key copied";
                                        setTimeout(function () {
                                          b.textContent = "🔑 Copy API Key";
                                        }, 1600);
                                      } else {
                                        b.textContent = "⚠ Not signed in";
                                        setTimeout(function () {
                                          b.textContent = "🔑 Copy API Key";
                                        }, 1600);
                                      }
                                    });
                                } catch (_) {}
                              },
                              className:
                                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-surface-200 bg-surface-800 hover:bg-surface-700 transition-colors",
                              title:
                                "Copy your API key (access token) for external automation",
                              children: "🔑 Copy API Key",
                            }),
                            o.jsx("button", {
                              onClick: function () {
                                _US({
                                  apiDownload: !(_S.apiDownload !== false),
                                });
                              },
                              title:
                                "Send generated media to your app (on/off)",
                              className: J(
                                "toggle-switch",
                                _S.apiDownload !== false && "active",
                              ),
                              children: o.jsx("span", {
                                className: J(
                                  "toggle-switch-knob",
                                  _S.apiDownload !== false
                                    ? "translate-x-5"
                                    : "translate-x-1",
                                ),
                              }),
                            }),
                          ],
                        }),
                        o.jsx("button", {
                          onClick: function () {
                            window.__gfDocs && window.__gfDocs.open();
                          },
                          title: "How to connect your app to GenFlow",
                          className:
                            "w-full flex items-center justify-center gap-2 px-3 py-2 mb-2 rounded-lg text-sm text-surface-200 bg-surface-800 hover:bg-surface-700 transition-colors",
                          children: "📄 Integration guide",
                        }),
                        !(u.name || u.subscription_type) &&
                        (function () {
                          var L = (_S && _S.language) || "en";
                          var MIR = { en: "Can't open tg? Mirrors:", ru: "Не открывается tg? Зеркала:", es: "¿No abre tg? Espejos:", fr: "tg ne s'ouvre pas ? Miroirs :", de: "tg öffnet nicht? Spiegel:", pt: "tg não abre? Espelhos:", it: "tg non si apre? Mirror:", ja: "tgが開かない？ミラー：", ko: "tg가 안 열리나요? 미러:", zh: "打不开 tg？镜像：", hi: "tg नहीं खुल रहा? मिरर:", ar: "لا يفتح tg؟ المرايا:", id: "tg tidak bisa dibuka? Mirror:", ms: "tg tak boleh buka? Cermin:", vi: "Không mở được tg? Máy chủ gương:", th: "เปิด tg ไม่ได้? มิเรอร์:", tr: "tg açılmıyor mu? Aynalar:" };
                          var INAPP = { en: "in the app", ru: "в приложении", es: "en la app", fr: "dans l'app", de: "in der App", pt: "no app", it: "nell'app", ja: "アプリで", ko: "앱에서", zh: "在应用中", hi: "ऐप में", ar: "في التطبيق", id: "di aplikasi", ms: "dalam apl", vi: "trong ứng dụng", th: "ในแอป", tr: "uygulamada" };
                          var gg = function (M) { return M[L] || M.en; };
                          var authed = !!(u && (u.name || u.subscription_type));
                          var openM = function (method) {
                            gfSetTgMirror(method);  // remember this mirror -> ALL bot links (login, pay, upgrade) now use it
                            if (authed) gfOpenBot("", method);
                            else Se.getHardwareId().then(function (hw) { gfOpenBot("auth_" + hw, method); gfStartAuthPoll(hw); }).catch(function () {});
                          };
                          return o.jsxs("div", {
                            className: "px-3 pt-1 pb-2 flex flex-col gap-1 text-[11px] text-surface-400",
                            children: [
                              o.jsx("span", { children: gg(MIR) }),
                              o.jsx("button", { onClick: function () { openM("telegramme"); }, className: "text-left text-primary-400 hover:underline", children: "1. telegram.me" }),
                              o.jsxs("button", { onClick: function () { openM("tgapp"); }, className: "text-left text-primary-400 hover:underline", children: ["2. ", gg(INAPP)] }),
                            ],
                          });
                        })(),
                        (u.name || u.subscription_type) &&
                          o.jsxs("button", {
                            onClick: p,
                            className:
                              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors",
                            children: [
                              o.jsx(fh, { className: "w-4 h-4" }),
                              "Sign out",
                            ],
                          }),
                        !(u.name || u.subscription_type) &&
                          o.jsx("button", {
                            onClick: () => a(!0),
                            className:
                              "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 transition-all",
                            children: "🔌 Connect Telegram",
                          }),
                      ],
                    }),
                ],
              }),
            ],
          }),
        ],
      }),
      o.jsx(Md, { isOpen: i, onClose: () => a(!1) }),
    ],
  });
}
function o0() {
  const { activeTab: e, setActiveTab: t, setShowSettings: n } = nt(),
    r = (l) => {
      (t(l), n(!1));
    };
  return o.jsxs("div", {
    className: "flex gap-2 p-1 bg-surface-800/50 rounded-xl",
    children: [
      o.jsxs("button", {
        onClick: () => r("video"),
        className: J(
          "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all duration-200",
          e === "video"
            ? "bg-gradient-primary text-white shadow-glow"
            : "text-surface-400 hover:text-white hover:bg-surface-700/50",
        ),
        children: [
          o.jsx(yh, { className: "w-4 h-4" }),
          o.jsx("span", { children: "VIDEO" }),
        ],
      }),
      o.jsxs("button", {
        onClick: () => r("image"),
        className: J(
          "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all duration-200",
          e === "image"
            ? "bg-gradient-primary text-white shadow-glow"
            : "text-surface-400 hover:text-white hover:bg-surface-700/50",
        ),
        children: [
          o.jsx(ch, { className: "w-4 h-4" }),
          o.jsx("span", { children: "IMAGE" }),
        ],
      }),
    ],
  });
}
const i0 = [{ id: "veo3", label: "Veo 3" }],
  a0 = [{ id: "banana", label: "Banana" }],
  qa = [
    { id: "text-to-video", label: "Text to Video" },
    { id: "image-to-video", label: "Image to Video" },
  ];
function u0({ failedPrompts = [], onOpenErrors, onCloseErrors, showErrors }) {
  const {
      activeTab: e,
      activeService: t,
      setActiveService: n,
      updateSettings: r,
      generationMode: l,
      setGenerationMode: s,
      settings: i,
      gfRefVideo: gfRV,
      setGfRefVideo: setGfRV,
      gfApplyRefs: gfApplyRefs,
      setGfApplyRefs: setGfApplyRefs,
      showLogs: _showLogs,
      showSettings: _showSettings,
    } = nt(),
    a = e === "video" ? i0 : a0,
    u = (f) => {
      (n(f),
        r({ service: f }),
        f === "grok" && (r({ generationType: "image-to-video" }), s("single")),
        onCloseErrors && onCloseErrors());
    },
    c = (f) => {
      (r({ generationType: f }),
        f === "text-to-video" && (l === "multi" || l === "film") && s("single"),
        f === "image-to-video" && setGfRV(!1),
        onCloseErrors && onCloseErrors());
    },
    h = (f) => {
      // Image "Film" (episodes) runs ONLY via the API: entering it forces Input=Code
      // (remembering the previous choice); leaving it restores what the user had.
      try {
        if (f === "film_streams") {
          if (((i && i.inputMethod) || "synth") !== "code") {
            window.__gfPrevInput = (i && i.inputMethod) || "synth";
            r({ inputMethod: "code", outputMethod: "code" });
          }
        } else if (l === "film_streams" && window.__gfPrevInput) {
          if (window.__gfPrevInput !== "code") r({ inputMethod: window.__gfPrevInput });
          window.__gfPrevInput = void 0;
        }
      } catch (e2) {}
      (s(f), onCloseErrors && onCloseErrors());
    },
    v =
      e === "video"
        ? i.generationType === "text-to-video"
          ? [{ id: "single", label: "Single" }]
          : t === "grok"
            ? [{ id: "single", label: "Single" }]
            : [
                { id: "single", label: "Single" },
                { id: "multi", label: "Multi" },
                { id: "film", label: "Flow" },
              ]
        : [
            { id: "single", label: "Single" },
            { id: "film_streams", label: "Film" },
          ],
    w = t === "grok" ? qa.filter((f) => f.id === "image-to-video") : qa;
  const hasErrors = failedPrompts.length > 0;
  return o.jsxs("div", {
    className: "flex flex-col gap-2",
    children: [
      o.jsxs("div", {
        className: "flex items-center justify-between gap-2 w-full",
        children: [
          o.jsx("div", {
            className:
              "flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1",
            children: o.jsxs("div", {
              className: "flex gap-1 items-center",
              children: [
                a.map((f) =>
                  o.jsx(
                    "button",
                    {
                      onClick: () => u(f.id),
                      className: J(
                        "px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-200",
                        t === f.id
                          ? "bg-accent-500/20 text-accent-400 border border-accent-500/30"
                          : "text-surface-400 hover:text-white hover:bg-surface-700/50",
                      ),
                      children: f.label,
                    },
                    f.id,
                  ),
                ),
                o.jsx("div", { className: "w-px bg-surface-700 mx-1 h-4" }),
                v.map((f) =>
                  o.jsx(
                    "button",
                    {
                      onClick: () => h(f.id),
                      className: J(
                        "px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-200",
                        (f.id === (l === "reference" ? (window.__gfRefReturn || "single") : l))
                          ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                          : "text-surface-400 hover:text-white hover:bg-surface-700/50",
                      ),
                      children: f.label,
                    },
                    f.id,
                  ),
                ),
              ],
            }),
          }),
          ((e !== "video" && (l === "single" || l === "reference" || l === "film_streams")) ||
            (e === "video" && l === "single" && i.generationType !== "image-to-video")) &&
            o.jsxs("div", {
              className: "shrink-0",
              style: { position: "relative" },
              children: [
                o.jsxs("button", {
                  onClick: () => {
                    // Reference, Log and Failed are mutually exclusive views, so
                    // opening Reference must close the other two (otherwise their
                    // buttons stay highlighted). Video path reads LIVE state from
                    // the store (closure value can be stale → first click no-ops).
                    nt.getState().setShowLogs(!1);
                    onCloseErrors && onCloseErrors();
                    if (e === "video") setGfRV(!nt.getState().gfRefVideo);
                    else {
                      const _lm = nt.getState().generationMode;
                      if (_lm === "reference") h(window.__gfRefReturn || "single");
                      else { window.__gfRefReturn = _lm; h("reference"); }
                    }
                  },
                  title: "Reference / Characters",
                  className: J(
                    "px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-200 flex items-center gap-1 border",
                    !_showLogs && !showErrors && !_showSettings && (e === "video" ? gfRV : l === "reference")
                      ? "bg-accent-500/20 text-accent-400 border-accent-500/30"
                      : "bg-surface-800/50 text-surface-400 border-surface-700 hover:text-white hover:bg-surface-700/50",
                  ),
                  style: gfApplyRefs ? { boxShadow: "0 0 8px 1px rgba(34,211,238,0.55)" } : void 0,
                  children: [
                    o.jsx("span", { children: "🎭" }),
                    o.jsx("span", { children: "Reference" }),
                  ],
                }),
                o.jsxs("button", {
                  type: "button",
                  onClick: () => setGfApplyRefs(!nt.getState().gfApplyRefs),
                  title: "Apply characters / objects to prompts",
                  className: "gap-1.5",
                  style: { position: "absolute", top: "calc(100% + 4px)", left: "0", paddingTop: "8px", whiteSpace: "nowrap", display: "flex", alignItems: "flex-end", zIndex: 30 },
                  children: [
                    o.jsx("span", {
                      style: { position: "relative", display: "inline-block", width: "28px", height: "16px", borderRadius: "9999px", background: gfApplyRefs ? "#22d3ee" : "#475569", transition: "background .15s" },
                      children: o.jsx("span", { style: { position: "absolute", top: "2px", left: gfApplyRefs ? "14px" : "2px", width: "12px", height: "12px", borderRadius: "9999px", background: "#fff", transition: "left .15s" } }),
                    }),
                    o.jsx("span", { className: "text-[9px] text-surface-400 whitespace-nowrap", children: "Apply mode" }),
                  ],
                }),
              ],
            }),
          o.jsx(GfLogPanel, {}),
          o.jsxs("button", {
            onClick: onOpenErrors,
            className: J(
              "shrink-0 px-2 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1 transition-all duration-200 whitespace-nowrap",
              showErrors
                ? "bg-red-600 text-white shadow-glow border-red-500"
                : hasErrors
                  ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30 hover:shadow-red-500/10 hover:shadow-glow"
                  : "bg-surface-800/50 text-surface-400 border-surface-700 hover:text-white hover:bg-surface-700/50",
            ),
            children: [
              o.jsx("span", { children: "⚠️" }),
              o.jsxs("span", {
                children: ["Failed (", failedPrompts.length, ")"],
              }),
            ],
          }),
        ],
      }),
        o.jsxs("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            position: "relative",
          },
          children: [
            o.jsx("div", {
              style: { flex: 1, minWidth: 0 },
              children:
                e === "video" && !gfRV ?
                o.jsxs("div", {
                  className: "flex gap-1 flex-wrap",
                  children: [
                    w.map((f) =>
                      o.jsx(
                        "button",
                        {
                          onClick: () => c(f.id),
                          className: J(
                            "px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-200",
                            i.generationType === f.id
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "text-surface-400 hover:text-white hover:bg-surface-700/50",
                          ),
                          children: f.label,
                        },
                        f.id,
                      ),
                    ),
                    o.jsx("div", { className: "w-px bg-surface-700 mx-1" }),
                    y().map((f) =>
                      o.jsx(
                        "button",
                        {
                          onClick: () => j(f.id),
                          className: J(
                            "px-2 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-200",
                            i.videoDuration === f.id
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                              : "text-surface-400 hover:text-white hover:bg-surface-700/50",
                          ),
                          children: f.label,
                        },
                        f.id,
                      ),
                    ),
                  ],
                })
                  : (l === "reference" || (e === "video" && gfRV)) && !_showLogs && !showErrors && !_showSettings
                  ? o.jsxs("div", {
                      style: { fontSize: "9px", lineHeight: "1.25", color: "#94a3b8" },
                      children: [
                        o.jsx("div", { children: (GFLIMITS[(i && i.language) || "en"] || GFLIMITS.en)[0] }),
                        o.jsx("div", { children: (GFLIMITS[(i && i.language) || "en"] || GFLIMITS.en)[1] }),
                        o.jsx("div", {
                          style: { marginTop: "2px" },
                          children: (GFLIMITS[(i && i.language) || "en"] || GFLIMITS.en)[2]
                        }),
                      ],
                    })
                  : null,
            }),
            o.jsx(GfModeToggles, {}),
          ],
        }),
    ],
  });
  function y() {
    return t === "grok"
      ? [
          { id: "6s", label: "6 sec" },
          { id: "10s", label: "10 sec" },
        ]
      : [{ id: "8s", label: "8 sec" }];
  }
  function j(f) {
    r({ videoDuration: f });
  }
}
const c0 = "modulepreload",
  d0 = function (e) {
    return "/" + e;
  },
  Za = {},
  f0 = function (t, n, r) {
    let l = Promise.resolve();
    if (n && n.length > 0) {
      document.getElementsByTagName("link");
      const i = document.querySelector("meta[property=csp-nonce]"),
        a =
          (i == null ? void 0 : i.nonce) ||
          (i == null ? void 0 : i.getAttribute("nonce"));
      l = Promise.allSettled(
        n.map((u) => {
          if (((u = d0(u)), u in Za)) return;
          Za[u] = !0;
          const c = u.endsWith(".css"),
            h = c ? '[rel="stylesheet"]' : "";
          if (document.querySelector(`link[href="${u}"]${h}`)) return;
          const x = document.createElement("link");
          if (
            ((x.rel = c ? "stylesheet" : c0),
            c || (x.as = "script"),
            (x.crossOrigin = ""),
            (x.href = u),
            a && x.setAttribute("nonce", a),
            document.head.appendChild(x),
            c)
          )
            return new Promise((m, v) => {
              (x.addEventListener("load", m),
                x.addEventListener("error", () =>
                  v(new Error(`Unable to preload CSS for ${u}`)),
                ));
            });
        }),
      );
    }
    function s(i) {
      const a = new Event("vite:preloadError", { cancelable: !0 });
      if (((a.payload = i), window.dispatchEvent(a), !a.defaultPrevented))
        throw i;
    }
    return l.then((i) => {
      for (const a of i || []) a.status === "rejected" && s(a.reason);
      return t().catch(s);
    });
  };
function Ts(e) {
  if (!e || !e.trim()) return [];
  let t;
  const n = e.includes("---"),
    r = e.includes(`

`),
    l = /^(P\d+|#\d+|\d+[\.\)\:])/m.test(e);
  n
    ? (t = e.split(/---+/).filter((a) => a.trim()))
    : l && !r
      ? (t = e
          .split(/\n(?=(?:P\d+|#\d+|\d+[\.\)\:]))/i)
          .filter((a) => a.trim()))
      : r
        ? (t = e.split(/\n\n+/).filter((a) => a.trim()))
        : (t = e.split(/\n/).filter((a) => a.trim()));
  const s = [];
  let i =
    (parseInt(localStorage.getItem("gfPromptCounter") || "0", 10) || 0) + 1;
  for (const a of t) {
    const u = a
      .split(
        `
`,
      )
      .map((v) => v.trim())
      .filter(Boolean)
      .join(" ")
      .trim();
    if (!u) continue;
    const c = u.substring(0, 20),
      h =
        c.match(/^(?:P|#|prompt|промт|промпт|promт)\s*(\d+)/i) ||
        c.match(/^(\d+)\s*[\.\)\:\-]/);
    let x = i;
    let m = u
      .replace(
        /^(?:P|#|prompt|промт|промпт|promт)\s*[#№\[\]]?\s*\d*\s*[:\-\.\)]\s*/i,
        "",
      )
      .replace(/^\d+\s*[:\-\.\)]\s*/, "")
      .trim();
    (m || (m = u),
      s.push({
        id: crypto.randomUUID(),
        number: x,
        text: m,
        status: "pending",
        retryCount: 0,
        createdAt: Date.now(),
      }),
      i++);
  }
  localStorage.setItem("gfPromptCounter", String(i - 1));
  return s;
}
function p0() {
  const {
      prompts: e,
      addPrompts: t,
      clearPrompts: n,
      isRunning: isRunning,
      settings: settings,
      generationMode: generationMode,
      setPrompts: setPrompts,
      gfCharacters: gfCharacters,
      gfObjects: gfObjects,
      gfApplyRefs: gfApplyRefs,
      addLog: _fsLog,
      fsStreams: _fsStreams,
      setFsStreams: _setFsStreams,
      activeTab: activeTab,
      videoBulk: videoBulk,
      setVideoBulk: setVideoBulk,
      imageSingleBulk: imageSingleBulk,
      setImageSingleBulk: setImageSingleBulk,
      imageFilmBulk: imageFilmBulk,
      setImageFilmBulk: setImageFilmBulk,
    } = nt(),
    r = activeTab === "video" ? videoBulk : imageSingleBulk,
    l = activeTab === "video" ? setVideoBulk : setImageSingleBulk,
    _fsBulk = imageFilmBulk,
    _setFsBulk = setImageFilmBulk,
    s = z.useRef(null),
    i = z.useRef(null),
    _fsFileRef = z.useRef(null),
    _fsPromptFileRef = z.useRef(null),
    [_fsUploadTarget, _setFsUploadTarget] = z.useState(null);
  const gfFileToUrl = (file) =>
    new Promise((res) => {
      try {
        const rd = new FileReader();
        rd.onload = () => res(rd.result);
        rd.onerror = () => res(null);
        rd.readAsDataURL(file);
      } catch (e) {
        res(null);
      }
    });
  // Single-mode reference application: if characters/objects are defined, match
  // their names in each prompt's text and attach (characters -> native entity via
  // banana.js prepared-check, objects -> photo). Guarded: no defs / no match / not
  // single => prompts unchanged.
  const gfEnrich = async (A) => {
    try {
      if (!Array.isArray(A) || !gfApplyRefs) return A;
      // Apply mode is ON: tag every prompt so reference-by-name works EVERYWHERE —
      // clicks (banana/veo), AND code mode (background resolveCharacters/Objects).
      // Tag regardless of mode (the flag just means "apply mode on"); the table
      // matching below is single-image only.
      A = A.map((p) => (p && typeof p === "object" ? { ...p, gfApplyChars: !0 } : p));
      if (generationMode !== "single") return A;
      const pool = [...(gfCharacters || [])].filter(
        (F) => F && F.name && F.name.trim() && F.image && F.image.file,
      );
      const _objPool = [...(gfObjects || [])].filter(
        (F) => F && F.name && F.name.trim() && F.image && F.image.file,
      );
      if (!pool.length && !_objPool.length) return A;
      const refs = (
        await Promise.all(
          pool.map(async (F) => ({ id: F.id, name: F.name.trim(), imageDataUrl: await gfFileToUrl(F.image.file) })),
        )
      ).filter((x) => x.imageDataUrl);
      const _objRefs = (
        await Promise.all(
          _objPool.map(async (F) => ({ id: F.id, name: F.name.trim(), imageDataUrl: await gfFileToUrl(F.image.file) })),
        )
      ).filter((x) => x.imageDataUrl);
      if (!refs.length && !_objRefs.length) return A;
      return A.map((p) => {
        try {
          const txt = (p && (p.text || p.prompt)) || "";
          const m = (M0(txt, refs) || []).slice(0, zs);
          const _om = (M0(txt, _objRefs) || []).slice(0, Gt - m.length);
          if (!m.length && !_om.length) return p;
          return { ...p, referenceImageUrls: m.length > 0 ? m.map((x) => x.imageDataUrl) : void 0, referenceDisplayNames: m.map((x) => x.name), objectImageUrls: _om.length > 0 ? _om.map((x) => x.imageDataUrl) : void 0, objectDisplayNames: _om.length > 0 ? _om.map((x) => x.name) : void 0 };
        } catch (e) {
          return p;
        }
      });
    } catch (e) {
      return A;
    }
  };
  const addPromptList = async (A) => {
    A = await gfEnrich(A);
    if (isRunning) {
      if (generationMode === "code" || (settings && settings.inputMethod === "code")) {
        t(A);
        gfSendPrompts(
          { type: "APPEND_API_PROMPTS", payload: gfPackRefPool(A) },
          (em) => _fsLog({ type: "error", message: "Не удалось добавить в очередь: " + em }),
        );
      } else {
        gfSendPrompts(
          {
            type: "START_GENERATION",
            payload: {
              ...gfPackRefPool(A),
              settings: { ...settings, gfApplyRefs },
              generationMode: generationMode,
            },
          },
          (em) => _fsLog({ type: "error", message: "Не удалось запустить: " + em }),
        );
      }
    } else {
      t(A);
    }
  };
  const a = (y) => {
      l(y.target.value);
    },
    u = () => {
      if (!r.trim()) return;
      const y = Ts(r);
      (addPromptList(y), l(""));
    },
    c = (y) => {
      var d;
      const j = (d = y.target.files) == null ? void 0 : d[0];
      if (!j) return;
      const f = new FileReader();
      ((f.onload = (p) => {
        var R;
        const g = (R = p.target) == null ? void 0 : R.result,
          N = Ts(g);
        addPromptList(N);
      }),
        f.readAsText(j),
        s.current && (s.current.value = ""));
    },
    h = async (y) => {
      var f;
      const j = (f = y.target.files) == null ? void 0 : f[0];
      if (j) {
        try {
          const d = await f0(() => import("./chunks/xlsx-D_0l8YDs.js"), []),
            p = await j.arrayBuffer(),
            g = d.read(p, { type: "array" }),
            N = g.Sheets[g.SheetNames[0]],
            R = d.utils.sheet_to_json(N, { header: 1 }),
            E = [];
          for (const S of R) {
            if (!S || S.length === 0) continue;
            const b = String(S[0] ?? "").trim();
            b && E.push(b);
          }
          if (E.length > 0) {
            const S = Ts(E.join(`\n`));
            addPromptList(S);
          }
        } catch (d) {
          console.error("[GenFlow] XLSX parse error:", d);
        }
        i.current && (i.current.value = "");
      }
    },
    x = e.filter((y) => y.status === "pending").length,
    m = e.filter((y) => y.status === "processing").length,
    v = e.filter((y) => y.status === "completed").length,
    w = e.filter((y) => y.status === "failed").length;
  // === Film Streams (parallel episodes) editor — image mode "film_streams". Edits _fsStreams
  // and dispatches RUN_FILM_STREAMS directly (episodes don't go through the flat prompt queue). ===
  if (generationMode === "film_streams") {
    const _fsT = (m) => m[(settings && settings.language) || "en"] || m.en;
    const _fsPlaceholder = _fsT({
      en: "One prompt per line — a blank line starts a new episode",
      ru: "Один промт на строку, пустая строка = новый эпизод",
      es: "Un prompt por línea; una línea en blanco inicia un nuevo episodio",
      fr: "Un prompt par ligne ; une ligne vide commence un nouvel épisode",
      de: "Ein Prompt pro Zeile; eine Leerzeile beginnt eine neue Episode",
      pt: "Um prompt por linha; uma linha em branco inicia um novo episódio",
      it: "Un prompt per riga; una riga vuota inizia un nuovo episodio",
      ja: "1行に1プロンプト。空行で新しいエピソード",
      ko: "한 줄에 프롬프트 하나, 빈 줄은 새 에피소드",
      zh: "每行一个提示词，空行开始新剧集",
      hi: "हर पंक्ति में एक प्रॉम्प्ट; खाली पंक्ति से नया एपिसोड",
      ar: "موجّه واحد لكل سطر؛ سطر فارغ يبدأ حلقة جديدة",
      id: "Satu prompt per baris; baris kosong memulai episode baru",
      ms: "Satu prompt setiap baris; baris kosong memulakan episod baru",
      vi: "Mỗi dòng một câu lệnh; dòng trống bắt đầu tập mới",
      th: "หนึ่งพรอมต์ต่อบรรทัด บรรทัดว่างเริ่มตอนใหม่",
      tr: "Satır başına bir istem; boş satır yeni bölüm başlatır",
    });
    const _fsHint = _fsT({
      en: "Each episode is a separate stream: the first prompt creates a frame, the rest continue from it. A start frame is optional — characters and objects can come from the text. Episodes are generated in parallel.",
      ru: "Каждый эпизод — отдельный поток: первый промт создаёт кадр, следующие продолжают его. Старт-кадр необязателен — можно по персонажам/объектам из текста. Эпизоды генерируются параллельно.",
      es: "Cada episodio es un flujo independiente: el primer prompt crea un fotograma y los siguientes lo continúan. El fotograma inicial es opcional: los personajes y objetos pueden venir del texto. Los episodios se generan en paralelo.",
      fr: "Chaque épisode est un flux distinct : le premier prompt crée une image, les suivants la prolongent. L'image de départ est facultative — les personnages et objets peuvent venir du texte. Les épisodes sont générés en parallèle.",
      de: "Jede Episode ist ein eigener Stream: Der erste Prompt erzeugt ein Bild, die folgenden setzen es fort. Ein Startbild ist optional — Charaktere und Objekte können aus dem Text kommen. Episoden werden parallel generiert.",
      pt: "Cada episódio é um fluxo separado: o primeiro prompt cria um quadro e os seguintes o continuam. O quadro inicial é opcional — personagens e objetos podem vir do texto. Os episódios são gerados em paralelo.",
      it: "Ogni episodio è un flusso separato: il primo prompt crea un fotogramma, i successivi lo proseguono. Il fotogramma iniziale è facoltativo — personaggi e oggetti possono venire dal testo. Gli episodi vengono generati in parallelo.",
      ja: "各エピソードは独立したストリームです。最初のプロンプトがフレームを作成し、続くプロンプトがそれを引き継ぎます。開始フレームは任意で、キャラクターやオブジェクトはテキストから指定できます。エピソードは並行して生成されます。",
      ko: "각 에피소드는 별도의 스트림입니다. 첫 프롬프트가 프레임을 만들고 이후 프롬프트가 이어갑니다. 시작 프레임은 선택 사항이며 캐릭터와 오브젝트는 텍스트로 지정할 수 있습니다. 에피소드는 병렬로 생성됩니다.",
      zh: "每个剧集都是独立的流：第一个提示词生成一帧，后续提示词在其基础上延续。起始帧可选——角色和物体可来自文本。剧集并行生成。",
      hi: "हर एपिसोड एक अलग स्ट्रीम है: पहला प्रॉम्प्ट एक फ़्रेम बनाता है, बाकी उसे जारी रखते हैं। शुरुआती फ़्रेम वैकल्पिक है — किरदार और ऑब्जेक्ट टेक्स्ट से लिए जा सकते हैं। एपिसोड समानांतर में बनते हैं।",
      ar: "كل حلقة تدفّق منفصل: الموجّه الأول ينشئ إطارًا، والباقي يكمله. الإطار الأول اختياري — يمكن أخذ الشخصيات والعناصر من النص. تُولَّد الحلقات بالتوازي.",
      id: "Setiap episode adalah aliran terpisah: prompt pertama membuat bingkai, sisanya melanjutkannya. Bingkai awal opsional — karakter dan objek bisa berasal dari teks. Episode dibuat secara paralel.",
      ms: "Setiap episod ialah aliran berasingan: prompt pertama mencipta bingkai, selebihnya menyambungnya. Bingkai mula adalah pilihan — watak dan objek boleh datang daripada teks. Episod dijana secara selari.",
      vi: "Mỗi tập là một luồng riêng: câu lệnh đầu tạo khung hình, các câu sau tiếp nối. Khung hình mở đầu là tùy chọn — nhân vật và vật thể có thể lấy từ văn bản. Các tập được tạo song song.",
      th: "แต่ละตอนเป็นสตรีมแยกกัน: พรอมต์แรกสร้างเฟรม ส่วนที่เหลือต่อจากเฟรมนั้น เฟรมเริ่มต้นไม่บังคับ — ตัวละครและวัตถุมาจากข้อความได้ ตอนต่าง ๆ ถูกสร้างแบบขนาน",
      tr: "Her bölüm ayrı bir akıştır: ilk istem bir kare oluşturur, sonrakiler onu sürdürür. Başlangıç karesi isteğe bağlıdır — karakterler ve nesneler metinden gelebilir. Bölümler paralel olarak üretilir.",
    });
    const _onFrameFile = async (ev) => {
      const files = Array.from(ev.target.files || []);
      ev.target.value = "";
      if (!files.length || !_fsUploadTarget) return;
      if (_fsUploadTarget === "__bulk__") {
        // Bulk: assign images to episodes in order (1→ep1, 2→ep2…); extras create new episodes.
        const urls = [];
        for (const f of files) urls.push(await gfFileToUrl(f));
        _setFsStreams((L) => {
          const next = L.map((ep) => ({ ...ep }));
          for (let k = 0; k < urls.length; k++) {
            if (!urls[k]) continue;
            if (k < next.length) next[k] = { ...next[k], startImage: urls[k] };
            else next.push({ id: crypto.randomUUID(), startImage: urls[k], frames: [{ id: crypto.randomUUID(), text: "" }] });
          }
          return next;
        });
        _fsLog && _fsLog({ type: "info", message: `${_fsT({ en: "Frames assigned", ru: "Кадры назначены" })}: ${urls.filter(Boolean).length}` });
      } else {
        const url = await gfFileToUrl(files[0]);
        if (url) _setFsStreams((L) => L.map((ep) => ep.id === _fsUploadTarget ? { ...ep, startImage: url } : ep));
      }
      _setFsUploadTarget(null);
    };
    const _addEpisode = () => _setFsStreams((L) => [...L, { id: crypto.randomUUID(), frames: [{ id: crypto.randomUUID(), text: "" }], startImage: null }]);
    const _removeEpisode = (epId) => _setFsStreams((L) => L.length > 1 ? L.filter((ep) => ep.id !== epId) : L);
    const _addPrompt = (epId) => _setFsStreams((L) => L.map((ep) => ep.id === epId ? { ...ep, frames: [...ep.frames, { id: crypto.randomUUID(), text: "" }] } : ep));
    const _removePrompt = (epId, frId) => _setFsStreams((L) => L.map((ep) => {
      if (ep.id !== epId) return ep;
      if (ep.frames.length > 1) return { ...ep, frames: ep.frames.filter((fr) => fr.id !== frId) };
      return { ...ep, frames: ep.frames.map((fr) => fr.id === frId ? { ...fr, text: "" } : fr) }; // last row: clear its text
    }));
    const _setPrompt = (epId, frId, text) => _setFsStreams((L) => L.map((ep) => ep.id === epId ? { ...ep, frames: ep.frames.map((fr) => fr.id === frId ? { ...fr, text } : fr) } : ep));
    const _pickFrame = (epId) => { _setFsUploadTarget(epId); _fsFileRef.current && _fsFileRef.current.click(); };
    const _pickBulkFrames = () => { _setFsUploadTarget("__bulk__"); _fsFileRef.current && _fsFileRef.current.click(); };
    const _clearFrame = (epId) => _setFsStreams((L) => L.map((ep) => ep.id === epId ? { ...ep, startImage: null } : ep));
    const _newEp = () => ({ id: crypto.randomUUID(), frames: [{ id: crypto.randomUUID(), text: "" }], startImage: null });
    const _selectedCount = _fsStreams.filter((ep) => ep.selected).length;
    const _allSelected = _fsStreams.length > 0 && _fsStreams.every((ep) => ep.selected);
    const _toggleEp = (epId) => _setFsStreams((L) => L.map((ep) => ep.id === epId ? { ...ep, selected: !ep.selected } : ep));
    const _toggleAll = () => _setFsStreams((L) => L.map((ep) => ({ ...ep, selected: !_allSelected })));
    const _deleteSelected = () => _setFsStreams((L) => { const rest = L.filter((ep) => !ep.selected); return rest.length ? rest : [_newEp()]; });
    const _clearAll = () => _setFsStreams([_newEp()]);
    // Bulk import: blank line separates EPISODES, each non-empty line is one prompt (frame).
    const _applyBulkText = (text) => {
      const blocks = (text || "").split(/\r?\n\s*\r?\n/).map((b) => b.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)).filter((b) => b.length);
      if (!blocks.length) { _fsLog && _fsLog({ type: "warning", message: _fsT({ en: "No prompts: line = prompt, empty line = new episode", ru: "Нет промтов: строка = промт, пустая строка = новый эпизод" }) }); return; }
      _setFsStreams(blocks.map((lines) => ({ id: crypto.randomUUID(), startImage: null, frames: lines.map((t) => ({ id: crypto.randomUUID(), text: t })) })));
      _setFsBulk("");
      _fsLog && _fsLog({ type: "info", message: _fsT({
        en: `Loaded: ${blocks.length} episode(s), ${blocks.reduce((s2, b) => s2 + b.length, 0)} prompt(s)`,
        ru: `Загружено: ${blocks.length} эпизод(ов), ${blocks.reduce((s2, b) => s2 + b.length, 0)} промт(ов)`
      }) });
    };
    const _onPromptFile = async (ev) => {
      const file = ev.target.files && ev.target.files[0];
      ev.target.value = "";
      if (!file) return;
      try {
        const text = await file.text();
        _setFsBulk(text);
      } catch (e) {
        _fsLog && _fsLog({ type: "error", message: _fsT({ en: "Failed to read file", ru: "Не удалось прочитать файл" }) });
      }
    };
    // "Import Prompts": open a .txt/.csv/.text file.
    const _importPrompts = () => { _fsPromptFileRef.current && _fsPromptFileRef.current.click(); };
    return o.jsxs("div", {
      className: "glass-card p-3 flex flex-col gap-2 flex-shrink-0 overflow-y-auto [scrollbar-gutter:stable]",
      style: { maxHeight: "60vh" },
      children: [
        o.jsx("input", { type: "file", accept: "image/*", multiple: true, ref: _fsFileRef, onChange: _onFrameFile, className: "hidden" }),
        o.jsx("input", { type: "file", accept: ".txt,.csv,.text", ref: _fsPromptFileRef, onChange: _onPromptFile, className: "hidden" }),
        o.jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
          o.jsxs("button", { onClick: _pickBulkFrames, className: "btn-secondary text-[10px] px-2 py-1 flex items-center gap-1", children: [o.jsx(pl, { className: "w-3 h-3" }), "Import Images"] }),
          o.jsxs("button", { onClick: _importPrompts, className: "btn-secondary text-[10px] px-2 py-1 flex items-center gap-1", children: [o.jsx(Qa, { className: "w-3 h-3" }), "Import Prompts"] }),
          o.jsx("div", { className: "flex-1" }),
          o.jsxs("button", {
            onClick: () => _applyBulkText(_fsBulk),
            disabled: !(_fsBulk || "").trim(),
            className: "px-2 py-0.5 text-[10px] font-semibold rounded bg-[#6d28d9] hover:bg-[#7c3aed] text-white transition-colors disabled:opacity-35 disabled:pointer-events-none cursor-pointer flex items-center gap-1",
            children: [o.jsx(ah, { className: "w-3 h-3" }), _fsT({ en: "Load", ru: "Загрузить" })],
          }),
        ] }),
        o.jsx("textarea", { value: _fsBulk, onChange: (ev) => _setFsBulk(ev.target.value), placeholder: _fsPlaceholder, className: "input-field min-h-[80px] resize-none text-sm rounded-none shrink-0", rows: 5 }),
        ..._fsStreams.map((ep, i2) => o.jsxs("div", {
          key: ep.id,
          className: "rounded-none border border-surface-700 p-2 flex flex-col gap-1.5 shrink-0",
          children: [
            o.jsxs("div", { className: "flex items-center justify-between", children: [
              o.jsxs("div", { className: "flex items-center gap-2", children: [
                o.jsx("button", { onClick: () => _toggleEp(ep.id), title: _fsT({ en: "Select episode", ru: "Выделить эпизод" }), className: "flex items-center justify-center shrink-0", children: o.jsx(ep.selected ? Ga : To, { className: "w-3.5 h-3.5 " + (ep.selected ? "text-primary-400" : "text-surface-500") }) }),
                o.jsx("span", { className: "text-[11px] font-semibold text-surface-200", children: `${_fsT({ en: "Episode", ru: "Эпизод" })} ${i2 + 1}` }),
              ] }),
              _fsStreams.length > 1 && o.jsx("button", { onClick: () => _removeEpisode(ep.id), className: "text-[10px] px-1.5 py-0.5 rounded-none bg-red-900/40 hover:bg-red-900/60 text-red-300", children: _fsT({ en: "Delete", ru: "Удалить" }) }),
            ] }),
            o.jsxs("div", { className: "flex gap-2", children: [
              ep.startImage
                ? o.jsxs("div", { className: "relative shrink-0 w-12 h-9", children: [
                    o.jsx("img", { src: ep.startImage, className: "w-12 h-9 rounded-none object-cover border border-surface-600" }),
                    o.jsx("button", { onClick: () => _clearFrame(ep.id), className: "absolute -top-1 -right-1 w-4 h-4 rounded-full bg-surface-900 border border-surface-600 text-surface-300 text-[9px] leading-none flex items-center justify-center", children: "✕" }),
                  ] })
                : o.jsx("button", { onClick: () => _pickFrame(ep.id), title: _fsT({ en: "Start frame (optional)", ru: "Старт-кадр (необязательно)" }), className: "shrink-0 w-12 h-9 rounded-none border border-dashed border-surface-600 hover:border-primary-500 text-surface-500 flex items-center justify-center transition-colors", children: o.jsx(Xn, { className: "w-3 h-3" }) }),
              o.jsxs("div", { className: "flex-1 min-w-0 flex flex-col gap-1", children: [
                ...ep.frames.map((fr, fi) => o.jsxs("div", {
                  key: fr.id,
                  className: "flex items-center gap-1.5",
                  children: [
                    o.jsx("span", { className: "text-[10px] text-surface-400 w-4 text-center shrink-0", children: String(fi + 1) }),
                    o.jsx("input", { type: "text", value: fr.text, onChange: (ev) => _setPrompt(ep.id, fr.id, ev.target.value), placeholder: "Enter prompt...", className: "flex-1 min-w-0 bg-surface-900/50 text-[10px] text-surface-300 px-2 py-1.5 rounded-none border border-surface-700 outline-none focus:border-primary-500" }),
                    o.jsx("span", { className: (fr.text || "").trim() ? "text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 shrink-0 w-[42px] text-center" : "text-[9px] px-1.5 py-0.5 rounded bg-surface-600 text-surface-400 shrink-0 w-[42px] text-center", children: (fr.text || "").trim() ? "Ready" : "Empty" }),
                    o.jsx("button", { onClick: () => _removePrompt(ep.id, fr.id), className: "p-1 text-surface-500 hover:text-red-400 transition-colors shrink-0", title: ep.frames.length > 1 ? _fsT({ en: "Delete prompt", ru: "Удалить промт" }) : _fsT({ en: "Clear", ru: "Очистить" }), children: o.jsx(Lr, { className: "w-3 h-3" }) }),
                  ],
                })),
                o.jsxs("div", { className: "flex items-center gap-1.5", children: [
                  o.jsx("span", { className: "text-[10px] w-4 text-center shrink-0", style: { visibility: "hidden" }, children: "0" }),
                  o.jsxs("button", { onClick: () => _addPrompt(ep.id), className: "flex-1 min-w-0 text-[10px] bg-surface-700 hover:bg-surface-600 text-surface-300 flex items-center justify-center gap-1 py-1.5 rounded-none", children: [o.jsx(Xn, { className: "w-3 h-3" }), _fsT({ en: "Prompt", ru: "Промт" })] }),
                  o.jsx("span", { className: "text-[9px] px-1.5 py-0.5 rounded shrink-0 w-[42px] text-center", style: { visibility: "hidden" }, children: "Empty" }),
                  o.jsx("button", { tabIndex: -1, className: "p-1 shrink-0", style: { visibility: "hidden" }, children: o.jsx(Lr, { className: "w-3 h-3" }) }),
                ] }),
              ] }),
            ] }),
          ],
        })),
        o.jsxs("div", { className: "flex items-center gap-3 pt-2 border-t border-surface-700 shrink-0", children: [
          o.jsxs("button", { onClick: _addEpisode, className: "text-[10px] px-3 py-1.5 rounded-none text-white bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:from-[#7c7ff5] hover:to-[#9d6ff7] flex items-center gap-1 transition-colors", children: [o.jsx(Xn, { className: "w-3 h-3" }), _fsT({ en: "Episode", ru: "Эпизод" })] }),
          _selectedCount > 0 && o.jsxs("button", { onClick: _deleteSelected, className: "text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1", children: [o.jsx(en, { className: "w-3 h-3" }), `Delete Selected (${_selectedCount})`] }),
          o.jsxs("button", { onClick: _clearAll, className: "text-[10px] text-surface-400 hover:text-red-400 flex items-center gap-1", children: [o.jsx(en, { className: "w-3 h-3" }), "Clear All"] }),
        ] }),
        o.jsx("p", { className: "text-[10px] text-surface-500 leading-snug shrink-0", children: _fsHint }),
      ],
    });
  }
  return o.jsxs("div", {
    className: "glass-card p-3 space-y-2 flex-shrink-0",
    children: [
      o.jsxs("div", {
        className: "flex items-center justify-between",
        children: [
          o.jsx("span", {
            className: "text-xs font-medium text-surface-300",
            children: "Prompts",
          }),
          o.jsx("div", {
            className: "flex items-center gap-2",
            children:
              e.length > 0 &&
              o.jsxs("div", {
                className: "flex items-center gap-1.5 text-[10px]",
                children: [
                  o.jsxs("span", {
                    className: "badge badge-info",
                    children: [x, " pending"],
                  }),
                  m > 0 &&
                    o.jsxs("span", {
                      className: "badge badge-warning",
                      children: [m, " active"],
                    }),
                  v > 0 &&
                    o.jsxs("span", {
                      className: "badge badge-success",
                      children: [v, " done"],
                    }),
                  w > 0 &&
                    o.jsxs("span", {
                      className: "badge badge-error",
                      children: [w, " failed"],
                    }),
                ],
              }),
          }),
        ],
      }),
      o.jsx("div", {
        className: "relative",
        children: o.jsx("textarea", {
          value: r,
          onChange: a,
          placeholder:
            "Enter prompts (one per line, or separated by a blank line)",
          className: "input-field min-h-[100px] resize-none text-sm",
          rows: 4,
        }),
      }),
      o.jsxs("div", {
        className: "flex gap-2",
        children: [
          o.jsxs("button", {
            onClick: u,
            disabled: !r.trim(),
            className:
              "btn-primary flex-1 flex items-center justify-center gap-2 text-sm",
            children: [o.jsx(ah, { className: "w-4 h-4" }), "Add Prompts"],
          }),
          o.jsx("input", {
            ref: s,
            type: "file",
            accept: ".txt,.csv",
            onChange: c,
            className: "hidden",
          }),
          o.jsx("input", {
            ref: i,
            type: "file",
            accept: ".xlsx,.xls",
            onChange: h,
            className: "hidden",
          }),
          o.jsx("button", {
            onClick: () => {
              var y;
              return (y = s.current) == null ? void 0 : y.click();
            },
            className: "btn-secondary px-3",
            title: "Upload .txt / .csv",
            children: o.jsx(pl, { className: "w-4 h-4" }),
          }),
          o.jsx("button", {
            onClick: () => {
              var y;
              return (y = i.current) == null ? void 0 : y.click();
            },
            className: "btn-secondary px-3",
            title: "Import from Excel (.xlsx)",
            children: o.jsx(ih, { className: "w-4 h-4" }),
          }),
        ],
      }),
      false &&
        o.jsxs("div", {
          className:
            "max-h-[80px] overflow-y-auto space-y-1 pt-2 border-t border-surface-700/50",
          children: [
            e
              .filter((y) => y.status === "pending")
              .slice(0, 5)
              .map((y) =>
                o.jsxs(
                  "div",
                  {
                    className:
                      "flex items-center gap-2 text-xs p-1.5 rounded-lg bg-surface-800/50",
                    children: [
                      o.jsxs("span", {
                        className: "text-primary-400 font-medium min-w-[24px]",
                        children: ["#", y.number],
                      }),
                      o.jsx("span", {
                        className: "text-surface-300 truncate flex-1",
                        children: y.text,
                      }),
                      o.jsx("span", {
                        className: `w-2 h-2 rounded-full ${y.status === "completed" ? "bg-green-500" : y.status === "processing" ? "bg-yellow-500 animate-pulse" : y.status === "failed" ? "bg-red-500" : "bg-surface-500"}`,
                      }),
                    ],
                  },
                  y.id,
                ),
              ),
            e.filter((y) => y.status === "pending").length > 5 &&
              o.jsxs("div", {
                className: "text-[10px] text-surface-500 text-center py-1",
                children: [
                  "+",
                  e.filter((y) => y.status === "pending").length - 5,
                  " more prompts",
                ],
              }),
          ],
        }),
    ],
  });
}
const m0 = [
    { value: "veo3.1-fast", label: "Veo 3.1 Fast" },
    { value: "veo3.1-quality", label: "Veo 3.1 Quality" },
    { value: "veo3.1-lite", label: "Veo 3.1 Lite" },
    { value: "veo3.1-lite-lower-priority", label: "Veo 3.1 Lite (lower priority)" },
  ],
  h0 = [
    { value: "nano-banana-pro", label: "Nano Banana Pro" },
    { value: "nano-banana", label: "Nano Banana 2" },
    { value: "nano-banana-2-lite", label: "Nano Banana 2 Lite" },
  ],
  g0 = [
    { value: "1k", label: "1K (Default)" },
    { value: "2k", label: "2K" },
    { value: "4k", label: "4K (Ultra)" },
  ],
  x0 = [
    { value: "720p", label: "720p" },
    { value: "1080p", label: "1080p (Ultra/Pro)" },
    { value: "4k", label: "4K (Ultra/Pro)" },
  ],
  y0 = [
    { value: "16:9", label: "Landscape (16:9)" },
    { value: "9:16", label: "Portrait (9:16)" },
  ],
  v0 = [
    { value: "480p", label: "480p" },
    { value: "720p", label: "720p" },
  ],
  w0 = [
    { value: "2:3", label: "2:3" },
    { value: "3:2", label: "3:2" },
    { value: "1:1", label: "1:1" },
    { value: "9:16", label: "9:16" },
    { value: "16:9", label: "16:9" },
  ];
function k0() {
  const {
    settings: e,
    updateSettings: t,
    activeTab: n,
    activeService: r,
    isDownloadingAll: isDownloadingAll,
    isRunning: isRunning,
    isPaused: isPaused,
  } = nt();
  const [viewCat, setViewCat] = z.useState(n);
  z.useEffect(() => {
    setViewCat(n);
  }, [n]);
  const l = viewCat === "video",
    s = r === "grok",
    i = s ? 20 : 6;
  return o.jsxs("div", {
    className: "glass-card p-3 flex-1 overflow-y-auto space-y-4",
    children: [
      o.jsxs("div", {
        className: "flex items-start gap-1.5 text-[11px] text-surface-400 leading-snug",
        children: [
          o.jsx("span", { className: "text-primary-400 shrink-0 font-semibold", children: "ⓘ" }),
          o.jsx("span", { children: (function () { var L = (e && e.language) || "en"; var M = { en: "Keep the Flow tab open — you can minimize the browser, generation runs in the background.", ru: "Не закрывайте вкладку Flow — браузер можно свернуть, генерация идёт в фоновом режиме.", es: "No cierres la pestaña de Flow — puedes minimizar el navegador, la generación se ejecuta en segundo plano.", fr: "Ne fermez pas l'onglet Flow — vous pouvez réduire le navigateur, la génération s'exécute en arrière-plan.", de: "Lass den Flow-Tab geöffnet — du kannst den Browser minimieren, die Generierung läuft im Hintergrund.", pt: "Não feche a aba do Flow — você pode minimizar o navegador, a geração é executada em segundo plano.", it: "Non chiudere la scheda Flow — puoi ridurre a icona il browser, la generazione viene eseguita in background.", ja: "Flowのタブは閉じないでください — ブラウザは最小化してもかまいません。生成はバックグラウンドで実行されます。", ko: "Flow 탭을 닫지 마세요 — 브라우저는 최소화해도 됩니다. 생성은 백그라운드에서 실행됩니다.", zh: "请勿关闭 Flow 标签页 — 可以最小化浏览器，生成会在后台运行。", hi: "Flow टैब खुला रखें — ब्राउज़र को मिनिमाइज़ कर सकते हैं, जनरेशन बैकग्राउंड में चलती है।", ar: "أبقِ علامة تبويب Flow مفتوحة — يمكنك تصغير المتصفح، وتعمل عملية الإنشاء في الخلفية.", id: "Biarkan tab Flow terbuka — Anda dapat meminimalkan browser, pembuatan berjalan di latar belakang.", ms: "Biarkan tab Flow terbuka — anda boleh minimumkan pelayar, penjanaan berjalan di latar belakang.", vi: "Giữ tab Flow mở — bạn có thể thu nhỏ trình duyệt, quá trình tạo chạy ở chế độ nền.", th: "อย่าปิดแท็บ Flow — ย่อเบราว์เซอร์ได้ การสร้างทำงานในเบื้องหลัง", tr: "Flow sekmesini açık tutun — tarayıcıyı simge durumuna küçültebilirsiniz, üretim arka planda çalışır." }; return M[L] || M.en; })() }),
        ],
      }),
      o.jsxs("div", {
        className: "grid grid-cols-2 gap-3",
        children: [
          o.jsxs("div", {
            className: "space-y-1.5",
            children: [
              o.jsx("label", {
                className: "text-xs text-surface-400",
                children: "Video Model",
              }),
              o.jsx("select", {
                value: e.model || "veo3.1-fast",
                onChange: (a) => t({ model: a.target.value }),
                className: "select-field text-sm",
                children: m0.map((a) =>
                  o.jsx(
                    "option",
                    { value: a.value, children: a.label },
                    a.value,
                  ),
                ),
              }),
            ],
          }),
          o.jsxs("div", {
            className: "space-y-1.5",
            children: [
              o.jsx("label", {
                className: "text-xs text-surface-400",
                children: "Image Model",
              }),
              o.jsx("select", {
                value: e.imageModel || "nano-banana-pro",
                onChange: (a) => { t({ imageModel: a.target.value }); try { chrome.runtime.sendMessage({ type: "UPDATE_SETTINGS", payload: { imageModel: a.target.value } }).catch(() => {}); } catch (er) {} },
                className: "select-field text-sm",
                children: h0.map((a) =>
                  o.jsx(
                    "option",
                    { value: a.value, children: a.label },
                    a.value,
                  ),
                ),
              }),
            ],
          }),
        ],
      }),
      o.jsxs("div", {
        className: "grid grid-cols-2 gap-3",
        children: [
          o.jsxs("div", {
            className: "space-y-1.5",
            children: [
              o.jsx("label", {
                className: "text-xs text-surface-400",
                children: "Video Threads (1–6)",
              }),
              o.jsx("input", {
                type: "number",
                min: 1,
                max: 6,
                value: Math.min(6, e.maxVideoThreads ?? 6),
                onChange: (a) => {
                  const u = parseInt(a.target.value, 10),
                    c = Number.isNaN(u) ? 1 : Math.max(1, Math.min(6, u));
                  t({ maxVideoThreads: c });
                },
                className: "input-field text-sm w-full",
              }),
            ],
          }),
          o.jsxs("div", {
            className: "space-y-1.5",
            children: [
              o.jsxs("label", {
                className: "text-xs text-surface-400",
                children: [
                  "Photo Threads ",
                  e.inputMethod === "code" || e.imageQuality === "2k" || e.imageQuality === "4k"
                    ? "(1–4)"
                    : "(1–6)",
                ],
              }),
              o.jsx("input", {
                type: "number",
                min: 1,
                max:
                  e.inputMethod === "code" || e.imageQuality === "2k" || e.imageQuality === "4k"
                    ? 4
                    : 6,
                value: Math.min(
                  e.inputMethod === "code" || e.imageQuality === "2k" || e.imageQuality === "4k"
                    ? 4
                    : 6,
                  e.maxImageThreads ?? 2,
                ),
                onChange: (a) => {
                  const u = parseInt(a.target.value, 10),
                    _m = e.inputMethod === "code" || e.imageQuality === "2k" || e.imageQuality === "4k" ? 4 : 6,
                    c = Number.isNaN(u) ? 1 : Math.max(1, Math.min(_m, u));
                  t({ maxImageThreads: c });
                },
                className: "input-field text-sm w-full",
              }),
            ],
          }),
          o.jsxs("div", {
            className: "space-y-1.5",
            children: [
              o.jsx("label", {
                className: "text-xs text-surface-400",
                children: "Pause on limit (s)",
              }),
              o.jsx("input", {
                type: "number",
                min: 0,
                max: 600,
                value: e.rateLimitPauseSec ?? 10,
                onChange: (a) => {
                  const u = parseInt(a.target.value, 10),
                    c = Number.isNaN(u) ? 10 : Math.max(0, Math.min(600, u));
                  t({ rateLimitPauseSec: c });
                },
                className: "input-field text-sm w-full",
              }),
            ],
          }),
          o.jsxs("div", {
            className: "space-y-1.5",
            children: [
              o.jsx("label", {
                className: "text-xs text-surface-400",
                children: "Stop on suspicious × (0=off)",
              }),
              o.jsx("input", {
                type: "number",
                min: 0,
                max: 20,
                value: e.suspiciousLimit ?? 2,
                onChange: (a) => {
                  const u = parseInt(a.target.value, 10),
                    c = Number.isNaN(u) ? 0 : Math.max(0, Math.min(20, u));
                  t({ suspiciousLimit: c });
                },
                className: "input-field text-sm w-full",
              }),
            ],
          }),
          o.jsxs("div", {
            className: "space-y-1.5",
            children: [
              o.jsx("label", {
                className: "text-xs text-surface-400",
                children: "Stop after errors × in a row (0=off)",
              }),
              o.jsx("input", {
                type: "number",
                min: 0,
                max: 50,
                value: e.stopAfterErrors ?? 3,
                onChange: (a) => {
                  const u = parseInt(a.target.value, 10),
                    c = Number.isNaN(u) ? 0 : Math.max(0, Math.min(50, u));
                  t({ stopAfterErrors: c });
                },
                className: "input-field text-sm w-full",
              }),
            ],
          }),
          o.jsxs("div", {
            className: "space-y-1.5",
            children: [
              o.jsx("label", {
                className: "text-xs text-surface-400",
                children: "Max retries",
              }),
              o.jsx("input", {
                type: "number",
                min: 1,
                max: 6,
                value: Math.min(6, e.maxAttempts ?? 2),
                onChange: (a) => {
                  const u = parseInt(a.target.value, 10),
                    c = Number.isNaN(u) ? 1 : Math.max(1, Math.min(6, u));
                  t({ maxAttempts: c });
                },
                className: "input-field text-sm w-full",
              }),
            ],
          }),
          o.jsxs("div", {
            className: "space-y-1.5",
            children: [
              o.jsx("label", {
                className: "text-xs text-surface-400",
                children: "Aspect Ratio",
              }),
              o.jsx("select", {
                value: s ? e.grokAspectRatio || "16:9" : e.aspectRatio,
                onChange: (a) =>
                  t(
                    s
                      ? { grokAspectRatio: a.target.value }
                      : { aspectRatio: a.target.value },
                  ),
                className: "select-field text-sm",
                children: (s ? w0 : y0).map((a) =>
                  o.jsx(
                    "option",
                    { value: a.value, children: a.label },
                    a.value,
                  ),
                ),
              }),
            ],
          }),
          o.jsxs("div", {
            className: "space-y-1.5",
            children: [
              o.jsx("label", {
                className: "text-xs text-surface-400",
                children: (function () { var L = (e && e.language) || "en"; var M = { en: "Suggest Flow reset after × stalls (0=off)", ru: "Сброс Flow после × подвисаний (0=выкл)", es: "Sugerir reinicio de Flow tras × cuelgues (0=off)", fr: "Réinit. Flow après × blocages (0=off)", de: "Flow-Reset nach × Hängern (0=aus)", pt: "Sugerir reset do Flow após × travamentos (0=off)", it: "Reset Flow dopo × blocchi (0=off)", ja: "× 回の停止で Flow リセットを提案 (0=オフ)", ko: "× 회 멈춤 후 Flow 초기화 제안 (0=끄기)", zh: "卡住 × 次后建议重置 Flow (0=关)", hi: "× बार अटकने पर Flow रीसेट सुझाएँ (0=बंद)", ar: "اقتراح إعادة تعيين Flow بعد × تعليق (0=إيقاف)", id: "Sarankan reset Flow setelah × macet (0=off)", ms: "Cadang set semula Flow selepas × tersekat (0=off)", vi: "Gợi ý đặt lại Flow sau × lần treo (0=tắt)", th: "แนะนำรีเซ็ต Flow หลังค้าง × ครั้ง (0=ปิด)", tr: "× takılmadan sonra Flow sıfırlama öner (0=kapalı)" }; return M[L] || M.en; })(),
              }),
              o.jsx("input", {
                type: "number",
                min: 0,
                max: 50,
                value: e.flowResetHint ?? 3,
                onChange: (a) => {
                  const u = parseInt(a.target.value, 10),
                    c = Number.isNaN(u) ? 0 : Math.max(0, Math.min(50, u));
                  t({ flowResetHint: c });
                },
                className: "input-field text-sm w-full",
              }),
            ],
          }),
        ],
      }),
      s &&
        o.jsxs("div", {
          className: "space-y-1.5",
          children: [
            o.jsx("label", {
              className: "text-xs text-surface-400",
              children: "Video Duration",
            }),
            o.jsx("div", {
              className: "grid grid-cols-2 gap-2",
              children: ["6s", "10s"].map((a) =>
                o.jsx(
                  "button",
                  {
                    onClick: () => t({ grokVideoDuration: a }),
                    className: J(
                      "px-3 py-2 rounded-lg text-xs font-medium transition-all",
                      (e.grokVideoDuration || "6s") === a
                        ? "bg-primary-600 text-white"
                        : "bg-surface-800 text-surface-400 hover:text-white",
                    ),
                    children: a,
                  },
                  a,
                ),
              ),
            }),
          ],
        }),
      o.jsxs("div", {
        className: "space-y-1.5",
        children: [
          o.jsxs("label", {
            className: "text-xs text-surface-400",
            children: ["Outputs per Prompt: ", e.generationsPerPrompt || 1],
          }),
          o.jsx("input", {
            type: "range",
            min: 1,
            max: 4,
            value: e.generationsPerPrompt || 1,
            onChange: (a) => {
              const _v = parseInt(a.target.value);
              t({ generationsPerPrompt: _v, imagesPerPrompt: _v });
            },
            className:
              "w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500",
          }),
          o.jsxs("div", {
            className: "flex justify-between text-[10px] text-surface-500",
            children: [
              o.jsx("span", { children: "1" }),
              o.jsx("span", { children: "2" }),
              o.jsx("span", { children: "3" }),
              o.jsx("span", { children: "4" }),
            ],
          }),
        ],
      }),
      o.jsxs("div", {
        className: "space-y-1.5",
        children: [
          o.jsxs("label", {
            className: "text-xs text-surface-400",
            children: [
              "Wait between prompts: ",
              e.minWaitTime ?? 3,
              "s — ",
              e.maxWaitTime ?? 8,
              "s",
            ],
          }),
          o.jsxs("div", {
            className: "grid grid-cols-2 gap-2",
            children: [
              o.jsxs("div", {
                children: [
                  o.jsx("span", {
                    className: "text-[10px] text-surface-500 block mb-1",
                    children: "Min",
                  }),
                  o.jsx("input", {
                    type: "range",
                    min: 1,
                    max: 60,
                    value: e.minWaitTime ?? 3,
                    onChange: (a) => {
                      const u = parseInt(a.target.value),
                        c = { minWaitTime: u, timingBetweenPrompts: u };
                      (u > (e.maxWaitTime ?? 8) && (c.maxWaitTime = u), t(c));
                    },
                    className:
                      "w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500",
                  }),
                ],
              }),
              o.jsxs("div", {
                children: [
                  o.jsx("span", {
                    className: "text-[10px] text-surface-500 block mb-1",
                    children: "Max",
                  }),
                  o.jsx("input", {
                    type: "range",
                    min: 1,
                    max: 120,
                    value: e.maxWaitTime ?? 8,
                    onChange: (a) => {
                      const u = parseInt(a.target.value),
                        c = { maxWaitTime: u };
                      (u < (e.minWaitTime ?? 3) &&
                        ((c.minWaitTime = u), (c.timingBetweenPrompts = u)),
                        t(c));
                    },
                    className:
                      "w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500",
                  }),
                ],
              }),
            ],
          }),
          o.jsxs("div", {
            className: "flex justify-between text-[10px] text-surface-500",
            children: [
              o.jsx("span", { children: "1s" }),
              o.jsx("span", { children: "60s" }),
              o.jsx("span", { children: "120s" }),
            ],
          }),
        ],
      }),
      o.jsxs("div", {
        className: "space-y-1.5",
        children: [
          o.jsx("label", {
            className: "text-xs text-surface-400",
            children: "Start from Prompt #",
          }),
          o.jsx("input", {
            type: "number",
            min: 1,
            value: e.startFromPrompt,
            onChange: (a) =>
              t({ startFromPrompt: parseInt(a.target.value) || 1 }),
            className: "input-field text-sm",
          }),
        ],
      }),
      o.jsxs("div", {
        className: "space-y-1.5",
        children: [
          o.jsx("label", {
            className: "text-xs text-surface-400",
            children: "Filename Prefix",
          }),
          o.jsx("input", {
            type: "text",
            value: e.filenamePrefix,
            onChange: (a) => t({ filenamePrefix: a.target.value }),
            placeholder: "e.g., PO",
            className: "input-field text-sm",
          }),
          o.jsxs("p", {
            className: "text-[10px] text-surface-500",
            children: [
              "Result: ",
              e.filenamePrefix && e.filenamePrefix.trim()
                ? e.filenamePrefix
                : "Promt",
              "_1_",
              l ? "Video" : "Photo",
              "_1_",
              l
                ? e.quality === "4k"
                  ? "4K"
                  : e.quality || "1080p"
                : e.imageQuality === "2k"
                  ? "2K"
                  : e.imageQuality === "4k"
                    ? "4K"
                    : "1K",
              l ? ".mp4" : ".jpg",
            ],
          }),
        ],
      }),
      o.jsxs("div", {
        className: "flex items-center justify-between",
        children: [
          o.jsxs("div", {
            children: [
              o.jsx("span", {
                className: "text-xs text-surface-300",
                children: "Use Prompt Number from Text",
              }),
              o.jsx("p", {
                className: "text-[10px] text-surface-500",
                children: "Extract #N from prompt text for filename",
              }),
            ],
          }),
          o.jsx("button", {
            onClick: () =>
              t({ usePromptNumberInFilename: !e.usePromptNumberInFilename }),
            className: J(
              "toggle-switch",
              e.usePromptNumberInFilename && "active",
            ),
            children: o.jsx("span", {
              className: J(
                "toggle-switch-knob",
                e.usePromptNumberInFilename ? "translate-x-5" : "translate-x-1",
              ),
            }),
          }),
        ],
      }),
      o.jsxs("div", {
        className: "flex items-center justify-between",
        children: [
          o.jsxs("div", {
            children: [
              o.jsx("span", {
                className: "text-xs text-surface-300",
                children: "Add prompt words to filename",
              }),
              o.jsx("p", {
                className: "text-[10px] text-surface-500",
                children: "First words of the prompt in the filename",
              }),
            ],
          }),
          o.jsx("button", {
            onClick: () =>
              t({
                includePromptWordsInFilename: !e.includePromptWordsInFilename,
              }),
            className: J(
              "toggle-switch",
              e.includePromptWordsInFilename && "active",
            ),
            children: o.jsx("span", {
              className: J(
                "toggle-switch-knob",
                e.includePromptWordsInFilename
                  ? "translate-x-5"
                  : "translate-x-1",
              ),
            }),
          }),
        ],
      }),
      s &&
        o.jsxs("div", {
          className: "space-y-1.5",
          children: [
            o.jsxs("div", {
              className: "flex items-center justify-between",
              children: [
                o.jsx("span", {
                  className: "text-xs text-surface-300",
                  children: "Close Grok tabs after",
                }),
                o.jsx("button", {
                  onClick: () =>
                    t({ closeGrokTabsAfter: !e.closeGrokTabsAfter }),
                  className: J(
                    "toggle-switch",
                    e.closeGrokTabsAfter && "active",
                  ),
                  children: o.jsx("span", {
                    className: J(
                      "toggle-switch-knob",
                      e.closeGrokTabsAfter ? "translate-x-5" : "translate-x-1",
                    ),
                  }),
                }),
              ],
            }),
            o.jsx("p", {
              className: "text-[10px] text-surface-500",
              children: "Closes extra Grok tabs after all prompts are done",
            }),
          ],
        }),
      o.jsxs("div", {
        className: "space-y-3 pt-2 border-t border-surface-700/50",
        children: [
          o.jsxs("div", {
            className: "flex items-center justify-between",
            children: [
              o.jsx("span", {
                className: "text-xs text-surface-300",
                children: "Auto Download",
              }),
              o.jsx("button", {
                onClick: () => t({ autoDownload: !e.autoDownload }),
                className: J("toggle-switch", e.autoDownload && "active"),
                children: o.jsx("span", {
                  className: J(
                    "toggle-switch-knob",
                    e.autoDownload ? "translate-x-5" : "translate-x-1",
                  ),
                }),
              }),
            ],
          }),
          o.jsxs("div", {
            className: "flex items-center justify-between",
            children: [
              o.jsx("span", {
                className: "text-xs text-surface-300",
                children: "Auto-retry failed",
              }),
              o.jsx("input", {
                type: "number",
                min: 0,
                max: 5,
                value: e.autoRetryFailed ? (e.maxRetries ?? 1) : 0,
                onChange: (a) => {
                  const u = parseInt(a.target.value, 10),
                    c = Number.isNaN(u) ? 0 : Math.max(0, Math.min(5, u));
                  t({ maxRetries: c > 0 ? c : (e.maxRetries ?? 1), autoRetryFailed: c > 0 });
                },
                title: "Retry passes for each failed item (0 = off)",
                style: { width: "3.5rem", flexShrink: 0, textAlign: "center" },
                className: "input-field text-sm",
              }),
            ],
          }),
          o.jsxs("div", {
            className: "grid grid-cols-2 gap-3",
            children: [
              o.jsxs("div", {
                className: "space-y-1.5",
                children: [
                  o.jsx("label", {
                    className: "text-xs text-surface-400",
                    children: "Download quality (Video)",
                  }),
                  o.jsx("select", {
                    value: s ? e.grokQuality || "480p" : e.quality || "1080p",
                    onChange: (a) =>
                      t(
                        s
                          ? { grokQuality: a.target.value }
                          : { quality: a.target.value },
                      ),
                    disabled: isRunning && !isPaused,
                    className: "select-field text-sm",
                    children: (s ? v0 : x0).map((a) =>
                      o.jsx(
                        "option",
                        { value: a.value, children: a.label },
                        a.value,
                      ),
                    ),
                  }),
                ],
              }),
              o.jsxs("div", {
                className: "space-y-1.5",
                children: [
                  o.jsx("label", {
                    className: "text-xs text-surface-400",
                    children: "Download quality (Image)",
                  }),
                  o.jsx("select", {
                    value: e.imageQuality || "1k",
                    onChange: (a) => t({ imageQuality: a.target.value }),
                    disabled: isRunning && !isPaused,
                    className: "select-field text-sm",
                    children: g0.map((a) =>
                      o.jsx(
                        "option",
                        { value: a.value, children: a.label },
                        a.value,
                      ),
                    ),
                  }),
                ],
              }),
            ],
          }),
          o.jsxs("div", {
            className: "space-y-1.5",
            children: [
              o.jsx("label", {
                className: "text-xs text-surface-400",
                children: "📁 Save to folder",
              }),
              o.jsx("input", {
                type: "text",
                value:
                  e.downloadFolder !== void 0 ? e.downloadFolder : "",
                onChange: (a) => t({ downloadFolder: a.target.value }),
                placeholder: "Subfolder (optional)",
                className: "select-field text-sm",
                style: { width: "100%" },
              }),
              o.jsx("div", {
                className: "text-xs text-surface-500",
                children:
                  e.downloadFolder && String(e.downloadFolder).trim()
                    ? `Files go to Downloads / ${String(e.downloadFolder).trim()} /`
                    : "Files go straight to Downloads",
              }),
            ],
          }),
          o.jsx("div", { className: "border-t border-surface-700/50 my-1" }),
          o.jsx(GfDownloadAll, {}),
        ],
      }),
    ],
  });
}
function Ms() {
  const {
      prompts: e,
      addLog: t,
      removePrompt: n,
      clearPrompts: r,
      logs: l,
      isRunning: s,
      setPrompts: setPrompts,
      settings: _S,
      activeService: _AS,
      stopReason: _stopReason,
    } = nt(),
    [i, a] = z.useState(!0),
    [u, c] = z.useState(!1),
    [_now, _setNow] = z.useState(Date.now()),
    h = e.filter((g) => g.status === "failed"),
    x = e.filter((g) => g.status === "pending"),
    m = e.filter((g) => g.status === "processing"),
    v = e.filter((g) => g.status === "completed"),
    w = z.useMemo(() => {
      if (!s || m.length === 0) return null;
      const g = l.find(
        (N) =>
          N.type === "warning" &&
          N.message.includes("still processing (~") &&
          N.message.includes("If Veo already shows"),
      );
      return (g == null ? void 0 : g.message) ?? null;
    }, [s, m.length, l]),
    y = () => {
      (chrome.runtime.sendMessage({ type: "RETRY_FAILED" }),
        t({ type: "info", message: "Retrying failed prompts..." }));
    },
    j = () => {
      if (h.length === 0) return;
      const g = h.map((N) => N.text).join(`

`);
      navigator.clipboard.writeText(g).then(() => {
        (c(!0),
          setTimeout(() => c(!1), 2e3),
          t({
            type: "info",
            message: `Copied ${h.length} failed prompts to clipboard`,
          }));
      });
    },
    f = () => {
      const g = v.map((b) => ({
          number: b.number,
          prompt: b.text,
          resultUrl: b.resultUrl,
          completedAt: b.completedAt
            ? new Date(b.completedAt).toISOString()
            : null,
        })),
        N = JSON.stringify(g, null, 2),
        R = new Blob([N], { type: "application/json" }),
        E = URL.createObjectURL(R),
        S = document.createElement("a");
      ((S.href = E),
        (S.download = `genflow_results_${new Date().toISOString().slice(0, 10)}.json`),
        S.click(),
        URL.revokeObjectURL(E),
        t({ type: "info", message: `Downloaded ${v.length} results` }));
    },
    d = (g) => {
      n(g);
      const _rem = e.filter((p) => p.id !== g).map((p) => p.number);
      const _mx = _rem.length ? Math.max.apply(null, _rem) : 0;
      localStorage.setItem("gfPromptCounter", String(_mx));
      chrome.runtime
        .sendMessage({ type: "REMOVE_PROMPT", payload: { promptId: g } })
        .catch(() => {});
    },
    p = () => {
      const _done = e
        .filter((x) => x.status === "completed" || x.status === "processing")
        .map((x) => x.number);
      const _mx = _done.length ? Math.max.apply(null, _done) : 0;
      r();
      chrome.runtime.sendMessage({ type: "CLEAR_ALL_PROMPTS" }).catch(() => {});
      localStorage.setItem("gfPromptCounter", String(_mx));
    };
  z.useEffect(() => {
    const _iv = setInterval(() => _setNow(Date.now()), 1000);
    return () => clearInterval(_iv);
  }, []);
  // Approx time left: rate of completions (avg gap between completedAt) * remaining items, counting down.
  const _eta = (() => {
    if (!s) return null;
    const rem = m.length + x.length;
    if (rem <= 0) return null;
    const _ct = v.map((p) => p.completedAt).filter(Boolean);
    if (_ct.length < 2) return null;
    const _mn = Math.min.apply(null, _ct), _mx = Math.max.apply(null, _ct);
    const _avg = (_mx - _mn) / (_ct.length - 1);
    let _ms = rem * _avg - (_now - _mx);
    if (_ms < 0) _ms = 0;
    const _tot = Math.round(_ms / 1000);
    return String(Math.floor(_tot / 60)).padStart(2, "0") + ":" + String(_tot % 60).padStart(2, "0");
  })();
  return o.jsxs("div", {
    className: i ? "flex flex-col gap-2 flex-shrink-0" : "flex flex-col gap-2 overflow-hidden flex-shrink-0",
    children: [
      w &&
        o.jsx("div", {
          className:
            "text-[11px] text-amber-200 bg-amber-500/15 border border-amber-500/30 rounded-md px-2 py-1.5 shrink-0",
          role: "status",
          children: w,
        }),
      !s && _stopReason === "suspicious" &&
        o.jsx("div", {
          className:
            "text-[11px] text-red-200 bg-red-500/15 border border-red-500/30 rounded-md px-2 py-1.5 shrink-0 text-center",
          role: "status",
          children:
            "Stopped: repeated suspicious activity. Lower threads or wait, then press Start.",
        }),
      o.jsxs("div", {
        className: i ? "glass-card flex flex-col" : "glass-card",
        children: [
          o.jsxs("button", {
            onClick: () => a(!i),
            className:
              "flex items-center justify-between w-full p-2 hover:bg-surface-700/30 transition-colors",
            children: [
              o.jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  o.jsx("span", {
                    className: "text-xs font-medium text-surface-300",
                    children: "Queue",
                  }),
                  e.length > 0 &&
                    o.jsxs("span", {
                      className: "text-[10px] text-surface-500",
                      children: [
                        m.length > 0 &&
                          o.jsxs("span", {
                            className: "text-primary-400",
                            children: [m.length, " active"],
                          }),
                        x.length > 0 &&
                          o.jsxs("span", {
                            className: "text-yellow-400 ml-1",
                            children: [x.length, " pending"],
                          }),
                        v.length > 0 &&
                          o.jsxs("span", {
                            className: "text-green-400 ml-1",
                            children: [v.length, " done"],
                          }),
                      ],
                    }),
                  _eta &&
                    o.jsx("span", {
                      className: "text-[10px] text-cyan-300 ml-1 font-medium",
                      children: "~" + _eta + " left",
                    }),
                ],
              }),
              o.jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  o.jsx("button", {
                    onClick: (g) => {
                      g.stopPropagation();
                      if (s) {
                        localStorage.setItem("gfPromptCounter", "0");
                        return;
                      }
                      const rn = e.map((p, idx) => ({ ...p, number: idx + 1 }));
                      setPrompts(rn);
                      localStorage.setItem(
                        "gfPromptCounter",
                        String(rn.length),
                      );
                    },
                    className: "transition-colors gf-reset-btn",
                    style: {
                      cursor: "pointer",
                      border: "1px solid #8b8fb0",
                      color: "#ffffff",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "10px",
                      fontWeight: 600,
                      lineHeight: "1.2",
                      whiteSpace: "nowrap",
                    },
                    title: "Reset prompt numbering to #1",
                    children: "Reset numbers",
                  }),
                  // Start-from-N: when a user re-generates one image, the counter shifts and
                  // every later batch is numbered +1 off from the real file order. Typing the
                  // desired number here makes the NEXT loaded batch start exactly at it.
                  o.jsx("input", {
                    type: "number",
                    min: 1,
                    placeholder: String((parseInt(localStorage.getItem("gfPromptCounter") || "0", 10) || 0) + 1),
                    title: "Начать нумерацию с этого номера (перенумерует очередь) / Start numbering here (renumbers the queue)",
                    onClick: (g) => g.stopPropagation(),
                    onChange: (g) => {
                      g.stopPropagation();
                      const v = parseInt(g.target.value, 10);
                      if (!(v > 0)) return;
                      // Renumber the CURRENT queue from v and park the counter after it, so the
                      // result is visible immediately and the next batch continues from there.
                      // (Setting the counter alone was invisible and got silently overwritten by
                      // "Reset numbers" / a later add — the user then saw 1,2,3 again.)
                      try {
                        if (Array.isArray(e) && e.length && typeof setPrompts === "function") {
                          setPrompts(e.map((p, idx) => ({ ...p, number: v + idx })));
                          localStorage.setItem("gfPromptCounter", String(v + e.length - 1));
                          return;
                        }
                      } catch (e2) {}
                      localStorage.setItem("gfPromptCounter", String(v - 1));
                    },
                    className: "gf-startnum",
                    style: {
                      width: "52px", padding: "2px 6px", borderRadius: "6px",
                      border: "1px solid #8b8fb0", background: "rgba(30,41,59,0.5)",
                      color: "#fff", fontSize: "10px", fontWeight: 600, lineHeight: "1.2",
                    },
                  }),
                  h.length > 0 &&
                    o.jsxs(o.Fragment, {
                      children: [
                        o.jsx("button", {
                          onClick: (g) => {
                            (g.stopPropagation(), j());
                          },
                          className:
                            "p-1 text-surface-500 hover:text-blue-400 transition-colors",
                          title: "Copy failed prompts",
                          children: u
                            ? o.jsx(rh, { className: "w-3 h-3 text-green-400" })
                            : o.jsx(Nd, { className: "w-3 h-3" }),
                        }),
                        o.jsx("button", {
                          onClick: (g) => {
                            (g.stopPropagation(), y());
                          },
                          className:
                            "p-1 text-surface-500 hover:text-yellow-400 transition-colors",
                          title: "Retry failed prompts",
                          children: o.jsx(gh, { className: "w-3 h-3" }),
                        }),
                      ],
                    }),
                  v.length > 0 &&
                    o.jsx("button", {
                      onClick: (g) => {
                        (g.stopPropagation(), f());
                      },
                      className:
                        "p-1 text-surface-500 hover:text-green-400 transition-colors",
                      title: "Download all results",
                      children: o.jsx(Sd, { className: "w-3 h-3" }),
                    }),
                  e.length > 0 &&
                    o.jsx("button", {
                      onClick: (g) => {
                        (g.stopPropagation(), p());
                      },
                      className:
                        "p-1 text-surface-500 hover:text-red-400 transition-colors",
                      title: "Clear queue",
                      children: o.jsx(en, { className: "w-3 h-3" }),
                    }),
                  i
                    ? o.jsx(nh, { className: "w-4 h-4 text-surface-500" })
                    : o.jsx(th, { className: "w-4 h-4 text-surface-500" }),
                ],
              }),
            ],
          }),
          i &&
            o.jsx("div", {
              className: "px-2 pb-2 flex-1 overflow-y-auto",
              style: { maxHeight: "200px" },
              children:
                e.length === 0
                  ? o.jsx("div", {
                      className:
                        "text-[10px] text-surface-500 text-center py-2",
                      children: "Queue is empty - add prompts to start",
                    })
                  : o.jsx("div", {
                      className: "space-y-1",
                      children: e.map((g) => {
                        const _isVid = _AS === "veo3" || _AS === "grok",
                          _perPrompt = _isVid
                            ? (_S && _S.generationsPerPrompt) || 1
                            : (_S && _S.imagesPerPrompt) || 1,
                          _members = _isVid
                            ? e.filter((p) => p.number === g.number)
                            : [g];
                        if (_isVid && _members[0] && _members[0].id !== g.id)
                          return null;
                        const _gdone = _members.filter(
                            (m) => m.status === "completed",
                          ).length,
                          _gfail = _members.filter(
                            (m) => m.status === "failed",
                          ).length,
                          _st = _isVid
                            ? _members.some((m) => m.status === "processing")
                              ? "processing"
                              : _members.some((m) => m.status === "pending")
                                ? "pending"
                                : _gdone === _members.length
                                  ? "completed"
                                  : _gfail > 0
                                    ? "failed"
                                    : g.status
                            : g.status === "downloading"
                              ? "processing"
                              : g.status,
                          _pp = _isVid
                            ? _gfail > 0 && _gdone > 0
                            : g.partial &&
                              g.partial.failed > 0 &&
                              g.partial.failed < (g.partial.expected || 0),
                          _chips = _isVid
                            ? Math.max(_members.length, _perPrompt)
                            : (g.partial && g.partial.expected) || _perPrompt;
                        return o.jsxs(
                          "div",
                          {
                            className: J(
                              "flex items-center gap-2 text-[10px] p-1.5 rounded-lg",
                              _st === "processing" && "bg-primary-500/10",
                              _st === "pending" && "bg-surface-800/50",
                              _st === "completed" && "bg-green-500/10",
                              _pp && "bg-yellow-500/10",
                              _st === "failed" && !_pp && "bg-red-500/10",
                            ),
                            children: [
                              _st === "processing" &&
                                o.jsx(Al, {
                                  className:
                                    "w-3 h-3 text-primary-400 animate-spin",
                                }),
                              _st === "pending" &&
                                o.jsx(jd, {
                                  className: "w-3 h-3 text-yellow-400",
                                }),
                              _st === "completed" &&
                                o.jsx(fr, {
                                  className: "w-3 h-3 text-green-400",
                                }),
                              _st === "failed" &&
                                o.jsx(Lo, {
                                  className: _pp
                                    ? "w-3 h-3 text-yellow-400"
                                    : "w-3 h-3 text-red-400",
                                }),
                              o.jsxs("span", {
                                className: "font-medium text-surface-400",
                                children: ["#", g.number],
                              }),
                              o.jsxs("span", {
                                className: "text-surface-300 truncate flex-1",
                                title: g.text,
                                children: [
                                  g.text.slice(0, 40),
                                  g.text.length > 40 ? "..." : "",
                                ],
                              }),
                              g.info &&
                                o.jsx("span", {
                                  className: "text-[10px] font-medium px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 animate-pulse whitespace-nowrap",
                                  children: g.info,
                                }),
                              _chips > 1 &&
                                o.jsx("div", {
                                  className: "flex items-center gap-0.5",
                                  title: _isVid
                                    ? "videos per prompt"
                                    : "images per prompt",
                                  children: Array.from({ length: _chips }).map(
                                    (_x, _k) => {
                                      const _exp =
                                          (g.partial && g.partial.expected) ||
                                          _perPrompt,
                                        _fail =
                                          (g.partial && g.partial.failed) || 0,
                                        _mem = _members[_k],
                                        _c = _isVid
                                          ? !_mem
                                            ? "n"
                                            : _mem.status === "completed"
                                              ? "g"
                                              : _mem.status === "failed"
                                                ? "r"
                                                : _mem.status === "processing"
                                                  ? "y"
                                                  : "n"
                                          : g.partial
                                            ? _k < _exp - _fail
                                              ? "g"
                                              : "r"
                                            : g.status === "completed"
                                              ? "g"
                                              : g.status === "failed"
                                                ? "r"
                                                : g.status === "processing"
                                                  ? "y"
                                                  : "n",
                                        _m = {
                                          g: [
                                            "rgba(34,197,94,0.25)",
                                            "#86efac",
                                          ],
                                          r: [
                                            "rgba(239,68,68,0.25)",
                                            "#fca5a5",
                                          ],
                                          y: [
                                            "rgba(234,179,8,0.25)",
                                            "#fde047",
                                          ],
                                          n: [
                                            "rgba(148,163,184,0.18)",
                                            "#cbd5e1",
                                          ],
                                        }[_c];
                                      return o.jsx(
                                        "span",
                                        {
                                          style: {
                                            background: _m[0],
                                            color: _m[1],
                                            minWidth: "13px",
                                            height: "13px",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: "0 2px",
                                            borderRadius: "3px",
                                            fontSize: "9px",
                                            fontWeight: 600,
                                            lineHeight: 1,
                                          },
                                          children: _k + 1,
                                        },
                                        _k,
                                      );
                                    },
                                  ),
                                }),
                              g.imageUrl &&
                                o.jsx("span", {
                                  className:
                                    "text-[9px] px-1 py-0.5 bg-surface-700 rounded text-surface-400",
                                  children: "IMG",
                                }),
                              (_st === "pending" || _st === "failed") &&
                                o.jsx("button", {
                                  onClick: () =>
                                    _members.forEach((m) => d(m.id)),
                                  className:
                                    "p-0.5 text-surface-500 hover:text-red-400 transition-colors",
                                  title:
                                    _st === "failed"
                                      ? "Remove from list"
                                      : "Remove from queue",
                                  children: o.jsx(Lr, { className: "w-3 h-3" }),
                                }),
                            ],
                          },
                          g.id,
                        );
                      }),
                    }),
            }),
        ],
      }),
    ],
  });
}
function GfDownloadAll() {
  var st = nt();
  var e = st && st.settings;
  var t = st && st.updateSettings;
  var isDl = st && st.isDownloadingAll;
  var md = z.useState((e && e.dlMode) || "clicks");
  var mode = md[0],
    setMode = md[1];
  var vr = z.useState((e && e.dlVideoRes) || "720p");
  var vRes = vr[0],
    setVRes = vr[1];
  var ir = z.useState((e && e.dlImageRes) || "1k");
  var iRes = ir[0],
    setIRes = ir[1];
  // Live progress for "Download All": codeDownloadAll emits API_PREVIEW_RESET (all slots queued)
  // then API_PREVIEW_UPDATE per item. We count done/failed vs total so the header can show a
  // moving N/M + spinner — the preview grid (GfPreview) is hidden unless generation input=code,
  // so for manual code-download this is the only "it's alive, not stuck" signal.
  var pgs = z.useState({ done: 0, total: 0 });
  var prog = pgs[0],
    setProg = pgs[1];
  z.useEffect(function () {
    var h = function (m) {
      if (!m) return;
      if (m.type === "API_PREVIEW_RESET") { setProg({ done: 0, total: ((m.payload && m.payload.slots) || []).length }); return; }
      if (m.type === "API_PREVIEW_UPDATE" && m.payload && (m.payload.status === "done" || m.payload.status === "failed")) { setProg(function (p) { return { done: p.done + 1, total: p.total }; }); return; }
      if (m.type === "API_PREVIEW_CLEAR") { setProg({ done: 0, total: 0 }); return; }
    };
    chrome.runtime.onMessage.addListener(h);
    return function () { try { chrome.runtime.onMessage.removeListener(h); } catch (e) {} };
  }, []);
  if (!e || !t) return null;
  var scope = e.downloadAllFilter || "all";
  var fbtn = function (m, sc, label) {
    var active = mode === m && scope === sc;
    return o.jsx("button", {
      onClick: function () {
        setMode(m);
        t({ downloadAllFilter: sc, dlMode: m });
      },
      disabled: isDl,
      className: J(
        "flex-1 py-1 rounded-lg text-[10px] font-medium transition-all",
        active
          ? "bg-primary-600 text-white"
          : "bg-surface-800 text-surface-400 hover:text-white",
      ),
      children: label,
    });
  };
  var lbl = function (txt) {
    return o.jsx("div", {
      style: {
        fontSize: "10px",
        fontWeight: 800,
        color: "#cbd5e1",
        minWidth: "42px",
        letterSpacing: "0.4px",
      },
      children: txt,
    });
  };
  var selSty = {
    fontSize: "9px",
    borderRadius: "5px",
    background: "#0f172a",
    color: "#cbd5e1",
    border: "1px solid #334155",
    padding: "1px",
    cursor: "pointer",
  };
  var opt = function (v, l) {
    return o.jsx("option", { value: v, children: l }, v);
  };
  var withSel = function (btn, sel) {
    return o.jsxs("div", {
      style: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: "3px",
        minWidth: 0,
      },
      children: [btn, sel],
    });
  };
  var vsel = o.jsxs("select", {
    value: vRes,
    onChange: function (a) {
      setVRes(a.target.value);
      t({ dlVideoRes: a.target.value });
    },
    disabled: isDl,
    style: selSty,
    children: [opt("720p", "720p"), opt("1080p", "1080p"), opt("4k", "4K")],
  });
  var isel = o.jsxs("select", {
    value: iRes,
    onChange: function (a) {
      setIRes(a.target.value);
      t({ dlImageRes: a.target.value });
    },
    disabled: isDl,
    style: selSty,
    children: [opt("1k", "1K"), opt("2k", "2K"), opt("4k", "4K")],
  });
  var go = function () {
    chrome.runtime.sendMessage({
      type: "DOWNLOAD_ALL_PROJECT_MEDIA",
      payload: {
        download: { mode: mode, scope: scope, imageRes: iRes, videoRes: vRes },
      },
    });
  };
  var L = (e && e.language) || "en";
  var HDR = {
    en: "Manual download",
    ru: "Ручное скачивание",
    es: "Descarga manual",
    fr: "Téléchargement manuel",
    de: "Manueller Download",
    pt: "Download manual",
    it: "Download manuale",
    ja: "手動ダウンロード",
    ko: "수동 다운로드",
    zh: "手动下载",
    hi: "मैनुअल डाउनलोड",
    ar: "تنزيل يدوي",
    id: "Unduh manual",
    ms: "Muat turun manual",
    vi: "Tải xuống thủ công",
    th: "ดาวน์โหลดด้วยตนเอง",
    tr: "Manuel indirme",
  };
  var hdrEl = o.jsxs("div", {
    style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1px" },
    children: [
      o.jsx("span", {
        style: { fontSize: "9px", fontWeight: 800, letterSpacing: "0.6px", textTransform: "uppercase", color: "#64748b" },
        children: HDR[L] || HDR.en,
      }),
      isDl
        ? o.jsxs("span", {
            style: { display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", fontWeight: 700, color: "#a78bfa" },
            children: [
              o.jsx("span", {
                className: "animate-spin",
                style: { width: "10px", height: "10px", border: "2px solid #7c3aed", borderTopColor: "transparent", borderRadius: "9999px", display: "inline-block" },
              }),
              prog.total ? prog.done + "/" + prog.total : "…",
            ],
          })
        : null,
    ],
  });
  return o.jsxs("div", {
    style: { display: "flex", flexDirection: "column", gap: "5px" },
    children: [
      hdrEl,
      o.jsxs("div", {
        className: "flex gap-1 items-center",
        children: [
          lbl("CLICKS"),
          fbtn("clicks", "all", "All"),
          fbtn("clicks", "video", "Video 720p"),
          fbtn("clicks", "photo", "Image 1080p"),
        ],
      }),
      o.jsxs("div", {
        className: "flex gap-1 items-center",
        children: [
          lbl("CODE"),
          fbtn("code", "all", "All"),
          withSel(fbtn("code", "video", "Video"), vsel),
          withSel(fbtn("code", "photo", "Image"), isel),
        ],
      }),
      isDl
        ? o.jsx("button", {
            onClick: function () {
              chrome.runtime.sendMessage({
                type: "CANCEL_DOWNLOAD_ALL",
                payload: { settings: e },
              });
            },
            className:
              "w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-primary hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-glow animate-pulse",
            style: { cursor: "pointer" },
            children: "Cancel Downloading",
          })
        : o.jsx("button", {
            onClick: go,
            className:
              "w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-primary hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-glow",
            style: { cursor: "pointer" },
            children: "Download All Media",
          }),
      o.jsx("div", {
        className: "border-t border-surface-700/50 pt-2 mt-1",
        children: o.jsxs("div", {
          className: "grid grid-cols-2 gap-2",
          children: [
            o.jsx("button", {
              onClick: function () {
                if (nt.getState().isRunning) return;
                chrome.runtime.sendMessage({ type: "CLEAR_CACHE" });
              },
              className: "btn-secondary text-xs py-2 w-full",
              title: (e && e.language) === "ru" ? "Очистить кэш расширения" : "Clear extension cache",
              children: (e && e.language) === "ru" ? "Очистить кэш" : "Clear cache",
            }),
            o.jsx("button", {
              onClick: function () {
                if (nt.getState().isRunning) return;
                chrome.runtime.sendMessage({ type: "CLEAR_FLOW_COOKIES" });
              },
              className: "btn-secondary text-xs py-2 w-full",
              title:
                (e && e.language) === "ru"
                  ? "Сбросить состояние Flow (куки labs.google) и перезагрузить вкладку"
                  : "Reset Flow state (labs.google cookies) and reload the tab",
              children: (e && e.language) === "ru" ? "Очистить куки" : "Clear cookies",
            }),
          ],
        }),
      }),
    ],
  });
}
function GfLogPanel() {
  const st = nt();
  const logs = (st && st.logs) || [];
  const showLogs = !!(st && st.showLogs);
  const setShowLogs = st && st.setShowLogs;
  const errN = logs.filter(function (l) {
    return l.type === "error";
  }).length;
  return o.jsxs("button", {
    onClick: function () {
      if (setShowLogs) setShowLogs(!showLogs);
    },
    title: "Logs",
    className: "shrink-0",
    style: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "6px 10px",
      fontSize: "12px",
      fontWeight: 600,
      borderRadius: "8px",
      border: "1px solid " + (showLogs ? "#6d28d9" : "#374151"),
      background: showLogs ? "#6d28d9" : "rgba(30,41,59,0.5)",
      color: showLogs ? "#fff" : "#cbd5e1",
      cursor: "pointer",
      whiteSpace: "nowrap",
    },
    children: [
      "Log",
      errN ? o.jsx("span", { children: "(" + errN + ")" }) : null,
    ],
  });
}
function GfBigLog() {
  const st = nt();
  const logs = (st && st.logs) || [];
  const clear = st && st.clearLogs;
  const color = function (t) {
    return t === "error"
      ? "#f87171"
      : t === "warning"
        ? "#fbbf24"
        : t === "success"
          ? "#4ade80"
          : "#94a3b8";
  };
  return o.jsxs("div", {
    className: "rounded-xl border border-surface-700",
    style: {
      background: "rgba(15,23,42,0.4)",
      padding: "8px",
      height: "calc(100vh - 215px)",
      minHeight: "360px",
      overflowY: "auto",
    },
    children: [
      logs.length > 0
        ? o.jsx("div", {
            style: {
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "2px",
            },
            children: o.jsx("button", {
              onClick: function () {
                if (clear) clear();
              },
              title: "Clear logs",
              style: {
                display: "flex",
                alignItems: "center",
                color: "#64748b",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              },
              children: o.jsxs("svg", {
                width: 14,
                height: 14,
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: 2,
                strokeLinecap: "round",
                strokeLinejoin: "round",
                children: [
                  o.jsx("path", { d: "M3 6h18" }),
                  o.jsx("path", { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" }),
                  o.jsx("path", { d: "M10 11v6" }),
                  o.jsx("path", { d: "M14 11v6" }),
                  o.jsx("path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }),
                ],
              }),
            }),
          })
        : null,
      logs.length === 0
        ? o.jsx("div", {
            style: {
              fontSize: "13px",
              color: "#64748b",
              textAlign: "center",
              padding: "48px 0",
            },
            children: "No logs yet",
          })
        : logs.map(function (l) {
            return o.jsxs(
              "div",
              {
                style: {
                  fontSize: "11px",
                  lineHeight: "1.5",
                  color: color(l.type),
                  padding: "3px 4px",
                  borderBottom: "1px solid rgba(30,41,59,0.5)",
                  wordBreak: "break-word",
                  fontFamily: "monospace",
                },
                children: [
                  o.jsx("span", {
                    style: { opacity: 0.45, marginRight: "6px" },
                    children: l.timestamp
                      ? new Date(l.timestamp).toLocaleTimeString()
                      : "",
                  }),
                  l.message,
                ],
              },
              l.id,
            );
          }),
    ],
  });
}
function GfModeToggles() {
  const st = nt();
  const s = st && st.settings;
  const t = st && st.updateSettings;
  const [_io, _setIo] = z.useState(!1);
  if (!s || !t) return null;
  const _IO = {
    en: {
      title: "Input / Output modes",
      intro: "Generation (Input) and downloading (Output) can each work two ways:",
      clicks: "Clicks — the extension drives the Flow site like a human: it clicks the buttons in the interface.",
      code: "Code — the extension talks to Flow directly, without UI clicks. More stable at scale.",
      output: "For Output, Code is preferable — it downloads faster.",
      susp: "If Flow shows “suspicious activity”, switch Input to Code. Code keeps working even when the Clicks mode is already blocked by it.",
      limits: "About limits (Code mode): sometimes Flow answers with a captcha (reCAPTCHA) or rate-limits requests — errors 403 / 429. This is normal: the extension pauses and retries automatically. To trigger them less often:",
      tips: ["keep 5–10 sec between actions", "don’t push the thread count (photo in Code: max 4)"],
      speedHead: "Approximate speed",
      speeds: ["🎬 Video 720p — up to 300 clips/hour", "🎬 Video 1080p — up to 150 clips/hour", "🖼️ Photo 1K — up to 600 photos/hour", "🖼️ Photo 2K/4K — up to 300 photos/hour"],
    },
    ru: {
      title: "Режимы Input / Output",
      intro: "Генерация (Input) и скачивание (Output) могут работать двумя способами:",
      clicks: "Clicks — расширение управляет сайтом Flow как человек: само нажимает кнопки в интерфейсе.",
      code: "Code — расширение обращается к Flow напрямую, без кликов. Стабильнее на объёме.",
      output: "Для Output предпочтительнее Code — качает быстрее.",
      susp: "Если Flow показывает «подозрительную активность» (suspicious activity) — переключите Input на Code. Code продолжает работать даже тогда, когда режим Clicks уже упирается в эту блокировку.",
      limits: "Про лимиты (режим Code): иногда Flow отвечает капчей (reCAPTCHA) или ограничением частоты запросов — ошибки 403 / 429. Это штатно: расширение само ставит паузу и повторяет попытку. Чтобы ловить их реже:",
      tips: ["держите интервал между действиями 5–10 сек", "не задирайте число потоков (для фото в Code максимум — 4)"],
      speedHead: "Ориентировочная скорость",
      speeds: ["🎬 Видео 720p — до 300 клипов/час", "🎬 Видео 1080p — до 150 клипов/час", "🖼️ Фото 1K — до 600 фото/час", "🖼️ Фото 2K/4K — до 300 фото/час"],
    },
    es: {
      title: "Modos Input / Output",
      intro: "La generación (Input) y la descarga (Output) pueden funcionar de dos formas:",
      clicks: "Clicks — la extensión maneja el sitio de Flow como una persona: pulsa los botones de la interfaz.",
      code: "Code — la extensión se comunica con Flow directamente, sin clics. Más estable en volumen.",
      output: "Para Output es preferible Code — descarga más rápido.",
      susp: "Si Flow muestra “actividad sospechosa” (suspicious activity), cambia Input a Code. Code sigue funcionando incluso cuando el modo Clicks ya queda bloqueado por ello.",
      limits: "Sobre los límites (modo Code): a veces Flow responde con un captcha (reCAPTCHA) o limita la frecuencia de peticiones — errores 403 / 429. Es normal: la extensión hace una pausa y reintenta automáticamente. Para que ocurra menos a menudo:",
      tips: ["deja 5–10 seg entre acciones", "no subas demasiado el número de hilos (foto en Code: máximo 4)"],
      speedHead: "Velocidad aproximada",
      speeds: ["🎬 Vídeo 720p — hasta 300 clips/hora", "🎬 Vídeo 1080p — hasta 150 clips/hora", "🖼️ Foto 1K — hasta 600 fotos/hora", "🖼️ Foto 2K/4K — hasta 300 fotos/hora"],
    },
    fr: {
      title: "Modes Input / Output",
      intro: "La génération (Input) et le téléchargement (Output) peuvent fonctionner de deux façons :",
      clicks: "Clicks — l’extension pilote le site Flow comme un humain : elle clique sur les boutons de l’interface.",
      code: "Code — l’extension communique directement avec Flow, sans clics. Plus stable à grande échelle.",
      output: "Pour Output, Code est préférable — il télécharge plus vite.",
      susp: "Si Flow affiche une « activité suspecte » (suspicious activity), passez Input sur Code. Code continue de fonctionner même quand le mode Clicks est déjà bloqué par cela.",
      limits: "À propos des limites (mode Code) : parfois Flow renvoie un captcha (reCAPTCHA) ou limite la fréquence des requêtes — erreurs 403 / 429. C’est normal : l’extension met en pause et réessaie automatiquement. Pour les déclencher moins souvent :",
      tips: ["laissez 5–10 s entre les actions", "n’augmentez pas trop le nombre de threads (photo en Code : max 4)"],
      speedHead: "Vitesse approximative",
      speeds: ["🎬 Vidéo 720p — jusqu’à 300 clips/heure", "🎬 Vidéo 1080p — jusqu’à 150 clips/heure", "🖼️ Photo 1K — jusqu’à 600 photos/heure", "🖼️ Photo 2K/4K — jusqu’à 300 photos/heure"],
    },
    de: {
      title: "Input- / Output-Modi",
      intro: "Generierung (Input) und Download (Output) können auf zwei Arten arbeiten:",
      clicks: "Clicks — die Erweiterung bedient die Flow-Seite wie ein Mensch: Sie klickt die Buttons in der Oberfläche.",
      code: "Code — die Erweiterung spricht direkt mit Flow, ohne Klicks. Stabiler bei großen Mengen.",
      output: "Für Output ist Code zu bevorzugen — es lädt schneller herunter.",
      susp: "Wenn Flow „verdächtige Aktivität“ (suspicious activity) anzeigt, schalte Input auf Code. Code funktioniert weiter, selbst wenn der Clicks-Modus dadurch bereits blockiert ist.",
      limits: "Zu den Limits (Code-Modus): Manchmal antwortet Flow mit einem Captcha (reCAPTCHA) oder begrenzt die Anfragerate — Fehler 403 / 429. Das ist normal: Die Erweiterung pausiert und versucht es automatisch erneut. Damit es seltener passiert:",
      tips: ["halte 5–10 Sek. zwischen den Aktionen", "übertreibe es nicht mit der Thread-Anzahl (Foto im Code: max. 4)"],
      speedHead: "Ungefähre Geschwindigkeit",
      speeds: ["🎬 Video 720p — bis zu 300 Clips/Stunde", "🎬 Video 1080p — bis zu 150 Clips/Stunde", "🖼️ Foto 1K — bis zu 600 Fotos/Stunde", "🖼️ Foto 2K/4K — bis zu 300 Fotos/Stunde"],
    },
    pt: {
      title: "Modos Input / Output",
      intro: "A geração (Input) e o download (Output) podem funcionar de duas formas:",
      clicks: "Clicks — a extensão controla o site do Flow como uma pessoa: clica nos botões da interface.",
      code: "Code — a extensão fala diretamente com o Flow, sem cliques. Mais estável em volume.",
      output: "Para Output, o Code é preferível — baixa mais rápido.",
      susp: "Se o Flow mostrar “atividade suspeita” (suspicious activity), mude o Input para Code. O Code continua funcionando mesmo quando o modo Clicks já está bloqueado por isso.",
      limits: "Sobre os limites (modo Code): às vezes o Flow responde com um captcha (reCAPTCHA) ou limita a frequência das requisições — erros 403 / 429. Isso é normal: a extensão pausa e tenta novamente automaticamente. Para que aconteça com menos frequência:",
      tips: ["mantenha 5–10 seg entre as ações", "não exagere no número de threads (foto no Code: máx. 4)"],
      speedHead: "Velocidade aproximada",
      speeds: ["🎬 Vídeo 720p — até 300 clipes/hora", "🎬 Vídeo 1080p — até 150 clipes/hora", "🖼️ Foto 1K — até 600 fotos/hora", "🖼️ Foto 2K/4K — até 300 fotos/hora"],
    },
    it: {
      title: "Modalità Input / Output",
      intro: "La generazione (Input) e il download (Output) possono funzionare in due modi:",
      clicks: "Clicks — l’estensione usa il sito Flow come una persona: clicca i pulsanti dell’interfaccia.",
      code: "Code — l’estensione comunica direttamente con Flow, senza clic. Più stabile sui grandi volumi.",
      output: "Per Output è preferibile Code — scarica più velocemente.",
      susp: "Se Flow mostra “attività sospetta” (suspicious activity), passa Input su Code. Code continua a funzionare anche quando la modalità Clicks è già bloccata da questo.",
      limits: "Sui limiti (modalità Code): a volte Flow risponde con un captcha (reCAPTCHA) o limita la frequenza delle richieste — errori 403 / 429. È normale: l’estensione mette in pausa e riprova automaticamente. Per farli scattare meno spesso:",
      tips: ["lascia 5–10 sec tra le azioni", "non esagerare con il numero di thread (foto in Code: max 4)"],
      speedHead: "Velocità approssimativa",
      speeds: ["🎬 Video 720p — fino a 300 clip/ora", "🎬 Video 1080p — fino a 150 clip/ora", "🖼️ Foto 1K — fino a 600 foto/ora", "🖼️ Foto 2K/4K — fino a 300 foto/ora"],
    },
    ja: {
      title: "Input / Output モード",
      intro: "生成（Input）とダウンロード（Output）は、それぞれ2つの方法で動作します：",
      clicks: "Clicks — 拡張機能が人間のようにFlowのサイトを操作し、画面のボタンをクリックします。",
      code: "Code — 拡張機能がクリックを使わず、Flowと直接やり取りします。大量処理でより安定します。",
      output: "Output には Code がおすすめです — ダウンロードが速くなります。",
      susp: "Flowが「不審なアクティビティ（suspicious activity）」を表示したら、Input を Code に切り替えてください。Clicks モードがそれでブロックされても、Code は動き続けます。",
      limits: "制限について（Code モード）：Flowがキャプチャ（reCAPTCHA）を返したり、リクエスト頻度を制限したりすることがあります — エラー 403 / 429。これは正常で、拡張機能が自動的に一時停止して再試行します。発生を減らすには：",
      tips: ["操作の間隔を5〜10秒あける", "スレッド数を上げすぎない（Code の写真は最大4）"],
      speedHead: "おおよその速度",
      speeds: ["🎬 動画 720p — 最大 300 クリップ/時", "🎬 動画 1080p — 最大 150 クリップ/時", "🖼️ 写真 1K — 最大 600 枚/時", "🖼️ 写真 2K/4K — 最大 300 枚/時"],
    },
    ko: {
      title: "Input / Output 모드",
      intro: "생성(Input)과 다운로드(Output)는 각각 두 가지 방식으로 작동할 수 있습니다:",
      clicks: "Clicks — 확장 프로그램이 사람처럼 Flow 사이트를 조작하여 인터페이스의 버튼을 클릭합니다.",
      code: "Code — 확장 프로그램이 클릭 없이 Flow와 직접 통신합니다. 대량 작업에서 더 안정적입니다.",
      output: "Output에는 Code가 더 좋습니다 — 더 빠르게 다운로드합니다.",
      susp: "Flow가 ‘의심스러운 활동(suspicious activity)’을 표시하면 Input을 Code로 전환하세요. Clicks 모드가 이미 차단된 상황에서도 Code는 계속 작동합니다.",
      limits: "제한에 대해(Code 모드): 때때로 Flow가 캡차(reCAPTCHA)를 반환하거나 요청 빈도를 제한합니다 — 오류 403 / 429. 정상이며, 확장 프로그램이 자동으로 일시 정지 후 재시도합니다. 덜 발생하게 하려면:",
      tips: ["동작 사이에 5–10초 간격을 두세요", "스레드 수를 너무 높이지 마세요 (Code의 사진은 최대 4)"],
      speedHead: "대략적인 속도",
      speeds: ["🎬 동영상 720p — 시간당 최대 300클립", "🎬 동영상 1080p — 시간당 최대 150클립", "🖼️ 사진 1K — 시간당 최대 600장", "🖼️ 사진 2K/4K — 시간당 최대 300장"],
    },
    zh: {
      title: "Input / Output 模式",
      intro: "生成（Input）和下载（Output）各有两种工作方式：",
      clicks: "Clicks — 扩展像真人一样操作 Flow 网站，点击界面上的按钮。",
      code: "Code — 扩展直接与 Flow 通信，不点击界面。大批量时更稳定。",
      output: "Output 推荐使用 Code — 下载更快。",
      susp: "如果 Flow 提示「可疑活动（suspicious activity）」，请将 Input 切换为 Code。即使 Clicks 模式已被此拦截，Code 仍可继续工作。",
      limits: "关于限制（Code 模式）：Flow 有时会返回验证码（reCAPTCHA）或限制请求频率 — 错误 403 / 429。这是正常现象：扩展会自动暂停并重试。要减少触发：",
      tips: ["每个操作之间间隔 5–10 秒", "不要把线程数调太高（Code 下照片最多 4）"],
      speedHead: "大致速度",
      speeds: ["🎬 视频 720p — 每小时最多 300 个片段", "🎬 视频 1080p — 每小时最多 150 个片段", "🖼️ 照片 1K — 每小时最多 600 张", "🖼️ 照片 2K/4K — 每小时最多 300 张"],
    },
    hi: {
      title: "Input / Output मोड",
      intro: "जनरेशन (Input) और डाउनलोड (Output) दो तरीकों से काम कर सकते हैं:",
      clicks: "Clicks — एक्सटेंशन इंसान की तरह Flow साइट चलाता है: इंटरफ़ेस के बटन पर क्लिक करता है।",
      code: "Code — एक्सटेंशन बिना क्लिक किए सीधे Flow से बात करता है। बड़े वॉल्यूम पर ज़्यादा स्थिर।",
      output: "Output के लिए Code बेहतर है — यह तेज़ी से डाउनलोड करता है।",
      susp: "अगर Flow ‘suspicious activity’ (संदिग्ध गतिविधि) दिखाए, तो Input को Code पर स्विच करें। जब Clicks मोड इससे ब्लॉक हो जाए, तब भी Code काम करता रहता है।",
      limits: "लिमिट के बारे में (Code मोड): कभी-कभी Flow कैप्चा (reCAPTCHA) देता है या रिक्वेस्ट दर सीमित करता है — एरर 403 / 429। यह सामान्य है: एक्सटेंशन अपने आप रुककर फिर कोशिश करता है। इन्हें कम करने के लिए:",
      tips: ["क्रियाओं के बीच 5–10 सेकंड रखें", "थ्रेड्स की संख्या ज़्यादा न बढ़ाएँ (Code में फ़ोटो: अधिकतम 4)"],
      speedHead: "अनुमानित गति",
      speeds: ["🎬 वीडियो 720p — प्रति घंटा 300 क्लिप तक", "🎬 वीडियो 1080p — प्रति घंटा 150 क्लिप तक", "🖼️ फ़ोटो 1K — प्रति घंटा 600 फ़ोटो तक", "🖼️ फ़ोटो 2K/4K — प्रति घंटा 300 फ़ोटो तक"],
    },
    ar: {
      title: "وضعا Input / Output",
      intro: "يمكن أن يعمل التوليد (Input) والتنزيل (Output) بطريقتين:",
      clicks: "Clicks — تتحكم الإضافة في موقع Flow كإنسان: تنقر الأزرار في الواجهة.",
      code: "Code — تتواصل الإضافة مع Flow مباشرةً، دون نقرات. أكثر استقرارًا مع الكميات الكبيرة.",
      output: "بالنسبة إلى Output يُفضَّل Code — فهو ينزّل أسرع.",
      susp: "إذا أظهر Flow «نشاطًا مريبًا» (suspicious activity)، بدّل Input إلى Code. يستمر Code في العمل حتى عندما يكون وضع Clicks محظورًا بسبب ذلك.",
      limits: "حول الحدود (وضع Code): أحيانًا يرد Flow بكابتشا (reCAPTCHA) أو يحدّ من معدل الطلبات — أخطاء 403 / 429. هذا طبيعي: تتوقف الإضافة مؤقتًا وتعيد المحاولة تلقائيًا. لتقليل حدوثها:",
      tips: ["اترك 5–10 ثوانٍ بين الإجراءات", "لا تبالغ في عدد الخيوط (الصور في Code: 4 كحد أقصى)"],
      speedHead: "السرعة التقريبية",
      speeds: ["🎬 فيديو 720p — حتى 300 مقطع/ساعة", "🎬 فيديو 1080p — حتى 150 مقطع/ساعة", "🖼️ صورة 1K — حتى 600 صورة/ساعة", "🖼️ صورة 2K/4K — حتى 300 صورة/ساعة"],
    },
    id: {
      title: "Mode Input / Output",
      intro: "Pembuatan (Input) dan pengunduhan (Output) bisa bekerja dengan dua cara:",
      clicks: "Clicks — ekstensi mengoperasikan situs Flow seperti manusia: mengklik tombol di antarmuka.",
      code: "Code — ekstensi berkomunikasi langsung dengan Flow, tanpa klik. Lebih stabil untuk volume besar.",
      output: "Untuk Output, Code lebih disarankan — mengunduh lebih cepat.",
      susp: "Jika Flow menampilkan “aktivitas mencurigakan” (suspicious activity), alihkan Input ke Code. Code tetap bekerja bahkan saat mode Clicks sudah diblokir olehnya.",
      limits: "Tentang batas (mode Code): kadang Flow merespons dengan captcha (reCAPTCHA) atau membatasi frekuensi permintaan — error 403 / 429. Ini normal: ekstensi otomatis menjeda dan mencoba lagi. Agar lebih jarang terjadi:",
      tips: ["beri jeda 5–10 detik antar tindakan", "jangan menaikkan jumlah thread terlalu tinggi (foto di Code: maks 4)"],
      speedHead: "Kecepatan perkiraan",
      speeds: ["🎬 Video 720p — hingga 300 klip/jam", "🎬 Video 1080p — hingga 150 klip/jam", "🖼️ Foto 1K — hingga 600 foto/jam", "🖼️ Foto 2K/4K — hingga 300 foto/jam"],
    },
    ms: {
      title: "Mod Input / Output",
      intro: "Penjanaan (Input) dan muat turun (Output) boleh berfungsi dengan dua cara:",
      clicks: "Clicks — sambungan mengendalikan laman Flow seperti manusia: mengklik butang pada antara muka.",
      code: "Code — sambungan berkomunikasi terus dengan Flow, tanpa klik. Lebih stabil pada volum besar.",
      output: "Untuk Output, Code lebih digalakkan — memuat turun lebih pantas.",
      susp: "Jika Flow menunjukkan “aktiviti mencurigakan” (suspicious activity), tukar Input kepada Code. Code terus berfungsi walaupun mod Clicks sudah disekat olehnya.",
      limits: "Tentang had (mod Code): kadangkala Flow membalas dengan captcha (reCAPTCHA) atau mengehadkan kekerapan permintaan — ralat 403 / 429. Ini biasa: sambungan akan jeda dan mencuba semula secara automatik. Untuk menguranginya:",
      tips: ["beri jeda 5–10 saat antara tindakan", "jangan tetapkan bilangan thread terlalu tinggi (foto dalam Code: maks 4)"],
      speedHead: "Kelajuan anggaran",
      speeds: ["🎬 Video 720p — sehingga 300 klip/jam", "🎬 Video 1080p — sehingga 150 klip/jam", "🖼️ Foto 1K — sehingga 600 foto/jam", "🖼️ Foto 2K/4K — sehingga 300 foto/jam"],
    },
    vi: {
      title: "Chế độ Input / Output",
      intro: "Việc tạo (Input) và tải xuống (Output) có thể hoạt động theo hai cách:",
      clicks: "Clicks — tiện ích điều khiển trang Flow như con người: nhấp các nút trên giao diện.",
      code: "Code — tiện ích giao tiếp trực tiếp với Flow, không cần nhấp. Ổn định hơn khi xử lý số lượng lớn.",
      output: "Với Output, nên dùng Code — tải xuống nhanh hơn.",
      susp: "Nếu Flow hiển thị “hoạt động đáng ngờ” (suspicious activity), hãy chuyển Input sang Code. Code vẫn hoạt động ngay cả khi chế độ Clicks đã bị chặn bởi điều đó.",
      limits: "Về giới hạn (chế độ Code): đôi khi Flow trả về captcha (reCAPTCHA) hoặc giới hạn tần suất yêu cầu — lỗi 403 / 429. Đây là điều bình thường: tiện ích tự động tạm dừng và thử lại. Để ít gặp hơn:",
      tips: ["giữ khoảng 5–10 giây giữa các thao tác", "đừng tăng số luồng quá cao (ảnh ở Code: tối đa 4)"],
      speedHead: "Tốc độ ước tính",
      speeds: ["🎬 Video 720p — tối đa 300 clip/giờ", "🎬 Video 1080p — tối đa 150 clip/giờ", "🖼️ Ảnh 1K — tối đa 600 ảnh/giờ", "🖼️ Ảnh 2K/4K — tối đa 300 ảnh/giờ"],
    },
    th: {
      title: "โหมด Input / Output",
      intro: "การสร้าง (Input) และการดาวน์โหลด (Output) ทำงานได้สองแบบ:",
      clicks: "Clicks — ส่วนขยายควบคุมเว็บไซต์ Flow เหมือนมนุษย์: คลิกปุ่มต่าง ๆ บนหน้าจอ",
      code: "Code — ส่วนขยายสื่อสารกับ Flow โดยตรงโดยไม่ต้องคลิก เสถียรกว่าเมื่อทำงานปริมาณมาก",
      output: "สำหรับ Output แนะนำ Code — ดาวน์โหลดเร็วกว่า",
      susp: "หาก Flow แสดง “กิจกรรมที่น่าสงสัย” (suspicious activity) ให้สลับ Input เป็น Code โดย Code ยังทำงานต่อได้แม้โหมด Clicks จะถูกบล็อกไปแล้ว",
      limits: "เกี่ยวกับข้อจำกัด (โหมด Code): บางครั้ง Flow ตอบกลับด้วยแคปต์ชา (reCAPTCHA) หรือจำกัดความถี่คำขอ — ข้อผิดพลาด 403 / 429 ถือเป็นเรื่องปกติ: ส่วนขยายจะหยุดชั่วคราวและลองใหม่อัตโนมัติ เพื่อให้เกิดน้อยลง:",
      tips: ["เว้นระยะ 5–10 วินาทีระหว่างการกระทำ", "อย่าตั้งจำนวนเธรดสูงเกินไป (รูปภาพในโหมด Code: สูงสุด 4)"],
      speedHead: "ความเร็วโดยประมาณ",
      speeds: ["🎬 วิดีโอ 720p — สูงสุด 300 คลิป/ชม.", "🎬 วิดีโอ 1080p — สูงสุด 150 คลิป/ชม.", "🖼️ รูปภาพ 1K — สูงสุด 600 รูป/ชม.", "🖼️ รูปภาพ 2K/4K — สูงสุด 300 รูป/ชม."],
    },
    tr: {
      title: "Input / Output modları",
      intro: "Üretim (Input) ve indirme (Output) iki şekilde çalışabilir:",
      clicks: "Clicks — uzantı Flow sitesini bir insan gibi kullanır: arayüzdeki düğmelere tıklar.",
      code: "Code — uzantı Flow ile doğrudan, tıklama olmadan iletişim kurar. Yüksek hacimde daha kararlı.",
      output: "Output için Code tercih edilir — daha hızlı indirir.",
      susp: "Flow “şüpheli etkinlik” (suspicious activity) gösterirse Input’u Code’a geçir. Clicks modu bununla engellenmiş olsa bile Code çalışmaya devam eder.",
      limits: "Limitler hakkında (Code modu): Flow bazen captcha (reCAPTCHA) döndürür veya istek sıklığını sınırlar — 403 / 429 hataları. Bu normaldir: uzantı otomatik olarak duraklatır ve yeniden dener. Daha az tetiklemek için:",
      tips: ["işlemler arasında 5–10 sn bırak", "iş parçacığı sayısını fazla artırma (Code’da fotoğraf: en fazla 4)"],
      speedHead: "Yaklaşık hız",
      speeds: ["🎬 Video 720p — saatte 300 klibe kadar", "🎬 Video 1080p — saatte 150 klibe kadar", "🖼️ Fotoğraf 1K — saatte 600 fotoğrafa kadar", "🖼️ Fotoğraf 2K/4K — saatte 300 fotoğrafa kadar"],
    },
  };
  const _g = _IO[s.language] || _IO.en;
  var seg = function (label, value, opts) {
    return o.jsxs("div", {
      style: { display: "flex", alignItems: "center", gap: "5px" },
      children: [
        o.jsx("span", {
          style: {
            fontSize: "10px",
            color: "#94a3b8",
            fontWeight: 600,
            minWidth: "40px",
            textAlign: "right",
          },
          children: label,
        }),
        o.jsx("div", {
          style: {
            display: "flex",
            background: "rgba(15,23,42,0.7)",
            borderRadius: "5px",
            padding: "2px",
          },
          children: opts.map(function (op) {
            var active = value === op.v;
            return o.jsx(
              "button",
              {
                onClick: op.onClick,
                disabled: !!op.disabled,
                style: {
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "4px",
                  border: "none",
                  cursor: op.disabled ? "not-allowed" : "pointer",
                  opacity: op.disabled ? 0.35 : 1,
                  background: active
                    ? op.v === "code"
                      ? "#6d28d9"
                      : "#0891b2"
                    : "transparent",
                  color: active ? "#fff" : "#94a3b8",
                },
                children: op.label,
              },
              op.v,
            );
          }),
        }),
      ],
    });
  };
  return o.jsxs("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      alignItems: "flex-end",
      flexShrink: 0,
      position: "relative",
    },
    children: [
      o.jsx("button", {
        onClick: function () { _setIo(!_io); },
        title: _g.title,
        style: {
          position: "absolute",
          right: "118px",
          top: "1px",
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          border: "1px solid #475569",
          background: _io ? "#6d28d9" : "transparent",
          color: _io ? "#fff" : "#94a3b8",
          fontSize: "11px",
          fontWeight: 700,
          lineHeight: "1",
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
        },
        children: "?",
      }),
      _io &&
        o.jsx("div", {
          onClick: function () { _setIo(!1); },
          style: { position: "fixed", inset: 0, zIndex: 40 },
        }),
      _io &&
        o.jsxs("div", {
          style: {
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: "300px",
            maxHeight: "60vh",
            overflowY: "auto",
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "12px",
            zIndex: 50,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            fontSize: "11px",
            lineHeight: "1.45",
            color: "#cbd5e1",
            textAlign: s.language === "ar" ? "right" : "left",
            direction: s.language === "ar" ? "rtl" : "ltr",
            cursor: "default",
            whiteSpace: "normal",
          },
          children: [
            o.jsx("div", { style: { fontWeight: 700, fontSize: "13px", marginBottom: "6px", color: "#fff" }, children: _g.title }),
            o.jsx("div", { children: _g.intro }),
            o.jsx("div", { style: { marginTop: "5px" }, children: _g.clicks }),
            o.jsx("div", { style: { marginTop: "5px" }, children: _g.code }),
            o.jsx("div", { style: { marginTop: "5px", color: "#a78bfa" }, children: _g.output }),
            o.jsx("div", { style: { marginTop: "7px" }, children: _g.susp }),
            o.jsx("div", { style: { marginTop: "7px" }, children: _g.limits }),
            o.jsx("ul", { style: { margin: "4px 0 0", paddingInlineStart: "16px" }, children: _g.tips.map(function (x, k) { return o.jsx("li", { children: x }, k); }) }),
            o.jsx("div", { style: { marginTop: "7px", fontWeight: 600, color: "#fff" }, children: _g.speedHead }),
            o.jsx("ul", { style: { margin: "4px 0 0", paddingInlineStart: "16px" }, children: _g.speeds.map(function (x, k) { return o.jsx("li", { children: x }, k); }) }),
          ],
        }),
      seg("Input", s.inputMethod === "code" ? "code" : "synth", [
        {
          v: "synth",
          label: "Clicks",
          // Image "Film" (episodes) physically runs ONLY through the API — Clicks
          // input does not exist for it, so the button is inert on that tab.
          disabled: !!(st && st.isRunning) || st.generationMode === "film_streams",
          onClick: function () {
            if (nt.getState().isRunning) return;
            if (nt.getState().generationMode === "film_streams") return;
            t({ inputMethod: "synth" });
          },
        },
        {
          v: "code",
          label: "Code",
          disabled: !!(st && st.isRunning),
          onClick: function () {
            if (nt.getState().isRunning) return;
            t({ inputMethod: "code", outputMethod: "code" });
          },
        },
      ]),
      seg("Output", s.outputMethod === "code" ? "code" : "synth", [
        {
          v: "synth",
          label: "Clicks",
          disabled: !!(st && st.isRunning) || s.inputMethod === "code",
          onClick: function () {
            if (nt.getState().isRunning) return;
            if (s.inputMethod !== "code") t({ outputMethod: "synth" });
          },
        },
        {
          v: "code",
          label: "Code",
          disabled: !!(st && st.isRunning),
          onClick: function () {
            if (nt.getState().isRunning) return;
            t({ outputMethod: "code" });
          },
        },
      ]),
    ],
  });
}
function GfPreview(props) {
  const st = nt();
  const s = st && st.settings;
  const _gp = st && st.prompts;
  const _gsp = st && st.setPrompts;
  const [slots, setSlots] = z.useState([]);
  const [now, setNow] = z.useState(Date.now());
  const [pcol, setPcol] = z.useState(!1);
  z.useEffect(function () {
    if (!document.getElementById("gfpulse-kf")) {
      var stl = document.createElement("style");
      stl.id = "gfpulse-kf";
      stl.textContent = "@keyframes gfpulse{0%,100%{opacity:1}50%{opacity:.4}}";
      document.head.appendChild(stl);
    }
    var iv = setInterval(function () {
      setNow(Date.now());
    }, 1000);
    var h = function (m) {
      if (!m) return;
      if (m.type === "API_PREVIEW_RESET") {
        setSlots((m.payload && m.payload.slots) || []);
        return;
      }
      if (m.type === "API_PREVIEW_UPDATE" && m.payload) {
        var pl = m.payload;
        setSlots(function (prev) {
          return prev.map(function (x) {
            if (x.number !== pl.number) return x;
            var merged = Object.assign({}, x, pl);
            if (pl.status === "generating") {
              if (x.status !== "generating" || !x.startedAt)
                merged.startedAt = Date.now();
            } else {
              merged.startedAt = undefined;
            }
            return merged;
          });
        });
        return;
      }
      if (m.type === "API_PREVIEW_CLEAR") {
        setSlots([]);
        return;
      }
      if (m.type === "API_PREVIEW_ADD" && m.payload && m.payload.slots) {
        setSlots(function (prev) { return prev.concat(m.payload.slots); });
        return;
      }
    };
    chrome.runtime.onMessage.addListener(h);
    return function () {
      clearInterval(iv);
      try {
        chrome.runtime.onMessage.removeListener(h);
      } catch (e) {}
    };
  }, []);
  if ((props && props.hidden) || !s || s.inputMethod !== "code" || st.showSettings) return null;
  var ar = (function () {
    var a = (s && s.aspectRatio) || "16:9";
    var mm = String(a).split(":");
    return mm.length === 2 && parseFloat(mm[0]) && parseFloat(mm[1])
      ? mm[0] + "/" + mm[1]
      : "16/9";
  })();
  var words = function (t) {
    return (t || "").split(/\s+/).filter(Boolean).slice(0, 3).join(" ");
  };
  var box = {
    position: "relative",
    height: "86px",
    aspectRatio: ar,
    flexShrink: 0,
    borderRadius: "6px",
    overflow: "hidden",
    border: "1px solid #334155",
    background: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  var cap = {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(2,6,23,0.72)",
    color: "#e2e8f0",
    fontSize: "8px",
    lineHeight: "1.25",
    padding: "1px 3px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  var capEl = function (it, kind) {
    var w = words(it.prompt);
    return o.jsx("div", {
      style: cap,
      children:
        "#" + it.number + (kind ? " " + kind : "") + (w ? " - " + w : ""),
    });
  };
  var tiles = [];
  slots.forEach(function (it) {
    if (
      it.status === "done" &&
      it.type === "image" &&
      it.urls &&
      it.urls.length
    ) {
      it.urls.forEach(function (u, jj) {
        tiles.push(
          o.jsxs(
            "div",
            {
              style: box,
              children: [
                o.jsx("img", {
                  src: u,
                  style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  },
                }),
                it.urls.length > 1
                  ? o.jsx("div", {
                      style: {
                        position: "absolute",
                        top: "2px",
                        right: "3px",
                        background: "rgba(2,6,23,0.7)",
                        color: "#cbd5e1",
                        fontSize: "8px",
                        padding: "0 3px",
                        borderRadius: "3px",
                      },
                      children: "v" + (jj + 1),
                    })
                  : null,
                capEl(it, "IMG"),
              ],
            },
            "i" + it.number + "_" + jj,
          ),
        );
      });
    } else if (it.status === "done" && it.type === "video") {
      tiles.push(
        o.jsxs(
          "div",
          {
            style: box,
            children: [
              o.jsx("div", {
                style: { color: "#cbd5e1", fontSize: "16px" },
                children: ">",
              }),
              capEl(it, "VID"),
            ],
          },
          "v" + it.number,
        ),
      );
    } else if (it.status === "failed") {
      tiles.push(
        o.jsxs(
          "div",
          {
            style: Object.assign({}, box, { borderColor: "#7f1d1d" }),
            children: [
              o.jsx("div", {
                style: { color: "#f87171", fontSize: "10px" },
                children: "fail",
              }),
              capEl(it, ""),
            ],
          },
          "f" + it.number,
        ),
      );
    } else if (it.status === "generating") {
      var k = s && s.service === "veo3" ? "VID" : "IMG";
      var el = it.startedAt
        ? Math.max(0, Math.round((now - it.startedAt) / 1000))
        : 0;
      var lbl = (it.info ? it.info + " " : "") + el + "s";
      tiles.push(
        o.jsxs(
          "div",
          {
            style: Object.assign({}, box, {
              animation: "gfpulse 1.1s ease-in-out infinite",
              borderColor: "#6d28d9",
            }),
            children: [
              o.jsx("div", {
                style: { color: "#c4b5fd", fontSize: "9px" },
                children: lbl,
              }),
              capEl(it, k),
            ],
          },
          "g" + it.number,
        ),
      );
    } else {
      tiles.push(
        o.jsxs(
          "div",
          {
            style: Object.assign({}, box, { opacity: 0.6 }),
            children: [
              o.jsx("div", {
                style: { color: "#64748b", fontSize: "10px" },
                children: "#" + it.number,
              }),
              capEl(it, ""),
            ],
          },
          "q" + it.number,
        ),
      );
    }
  });
  return o.jsxs("div", {
    style: {
      background: "rgba(30,41,59,0.4)",
      border: "1px solid rgba(51,65,85,0.5)",
      borderRadius: "8px",
      padding: "10px",
      marginTop: "12px",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
    },
    children: [
      o.jsxs("div", {
        onClick: () => setPcol(!pcol),
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          marginBottom: !pcol && slots.length > 0 ? "8px" : 0,
        },
        children: [
          o.jsx("div", {
            style: { fontSize: "11px", color: "#94a3b8", fontWeight: 600 },
            children: "Preview" + (slots.length ? " (" + slots.length + ")" : ""),
          }),
          o.jsxs("div", {
            style: { display: "flex", alignItems: "center", gap: "8px" },
            children: [
              o.jsx("button", {
                onClick: (g) => {
                  g.stopPropagation();
                  if (st && st.isRunning) {
                    localStorage.setItem("gfPromptCounter", "0");
                    return;
                  }
                  if (_gp && _gsp) {
                    const rn = _gp.map((p, i) => ({ ...p, number: i + 1 }));
                    _gsp(rn);
                    localStorage.setItem("gfPromptCounter", String(rn.length));
                  }
                },
                className: "transition-colors gf-reset-btn",
                style: {
                  cursor: "pointer",
                  border: "1px solid #8b8fb0",
                  color: "#ffffff",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  fontSize: "10px",
                  fontWeight: 600,
                  lineHeight: "1.2",
                  whiteSpace: "nowrap",
                },
                title: "Reset prompt numbering to #1",
                children: "Reset numbers",
              }),
              // Start-from-N (see the queue header): sets where the NEXT loaded batch begins,
              // so a re-generated image doesn't shift every following file number by one.
              o.jsx("input", {
                type: "number",
                min: 1,
                placeholder: String((parseInt(localStorage.getItem("gfPromptCounter") || "0", 10) || 0) + 1),
                title: "Начать нумерацию с этого номера (перенумерует список) / Start numbering here (renumbers the list)",
                onClick: (g) => g.stopPropagation(),
                onChange: (g) => {
                  g.stopPropagation();
                  const v = parseInt(g.target.value, 10);
                  if (!(v > 0)) return;
                  // Same as the queue header: renumber what's already listed, then park the
                  // counter after it (invisible counter-only changes were being overwritten).
                  try {
                    if (Array.isArray(_gp) && _gp.length && typeof _gsp === "function") {
                      _gsp(_gp.map((p, idx) => ({ ...p, number: v + idx })));
                      localStorage.setItem("gfPromptCounter", String(v + _gp.length - 1));
                      return;
                    }
                  } catch (e2) {}
                  localStorage.setItem("gfPromptCounter", String(v - 1));
                },
                className: "gf-startnum",
                style: {
                  width: "52px", padding: "2px 6px", borderRadius: "6px",
                  border: "1px solid #8b8fb0", background: "rgba(30,41,59,0.5)",
                  color: "#fff", fontSize: "10px", fontWeight: 600, lineHeight: "1.2",
                },
              }),
              o.jsx("button", {
                onClick: (g) => {
                  g.stopPropagation();
                  setSlots([]);
                },
                className: "p-1 text-surface-500 hover:text-red-400 transition-colors",
                title: "Clear preview",
                children: o.jsx(en, { className: "w-3 h-3" }),
              }),
              o.jsx("button", {
                onClick: (g) => {
                  g.stopPropagation();
                  setPcol(!pcol);
                },
                className: "p-1 text-surface-500 hover:text-surface-300 transition-colors",
                title: pcol ? "Expand" : "Collapse",
                children: pcol
                  ? o.jsx(th, { className: "w-4 h-4 text-surface-500" })
                  : o.jsx(nh, { className: "w-4 h-4 text-surface-500" }),
              }),
            ],
          }),
        ],
      }),
      !pcol &&
        slots.length > 0 &&
        o.jsx("div", {
          style: {
            display: "flex",
            flexWrap: "wrap",
            alignContent: "flex-start",
            gap: "6px",
            maxHeight: "120px",
            overflowY: "auto",
          },
          children: tiles,
        }),
    ],
  });
}
function j0({ onLimitReached: e }) {
  const {
      isRunning: t,
      isPaused: n,
      prompts: r,
      setRunning: l,
      setPaused: s,
      addLog: i,
      settings: a,
      generationMode: u,
      selectorsLoaded: selectorsLoaded,
      activeTab: gfActiveTab,
      gfRefVideo: gfRefVideo,
      gfApplyRefs: gfApplyRefs,
    } = nt(),
    [c, h] = z.useState(!0),
    [x, m] = z.useState(null),
    [_na, _setNa] = z.useState(false),
    [_allBusy, _setAllBusy] = z.useState(!1),
    [_allDone, _setAllDone] = z.useState(0),
    [_allTotal, _setAllTotal] = z.useState(0),
    v = r.filter((T) => T.status === "pending"),
    w = r.filter((T) => T.status === "completed");
  const _gfIsRef = u === "reference" || (gfActiveTab === "video" && gfRefVideo);
  const _gfLoadAll = async () => {
    try {
      const _st = nt.getState();
      const chars = (_st.gfCharacters || []).filter((C) => C && C.name && C.name.trim());
      const objs = (_st.gfObjects || []).filter((O) => O && O.name && O.name.trim() && O.image && O.image.file);
      if (!chars.length && !objs.length) {
        i({ type: "warning", message: "No characters or objects to load" });
        return;
      }
      const _toUrl = (file) =>
        new Promise((res) => {
          const rd = new FileReader();
          rd.onload = () => res(rd.result);
          rd.onerror = () => res(null);
          rd.readAsDataURL(file);
        });
      const _send = (msg) =>
        new Promise((res) => {
          try { chrome.runtime.sendMessage(msg, (resp) => res(resp)); } catch (e) { res(null); }
        });
      let _cd = 0, _od = 0;
      _setAllTotal(chars.length + objs.length);
      _setAllDone(0);
      _setAllBusy(!0);
      const _onProg = (m) => {
        if (!m || !m.payload) return;
        if (m.type === "CHAR_PREP_PROGRESS") _cd = m.payload.done || 0;
        else if (m.type === "OBJ_UPLOAD_PROGRESS") _od = m.payload.done || 0;
        else return;
        _setAllDone(_cd + _od);
      };
      chrome.runtime.onMessage.addListener(_onProg);
      try {
        // Sequential + skipReload: running both in parallel let UPLOAD_OBJECTS reload the
        // Flow tab mid-PATCH, so the character displayName never stuck ("Untitled").
        if (chars.length) {
          const _pc = await Promise.all(
            chars.map(async (C) => ({
              name: C.name.trim(),
              temperament: (C.temperament || "").trim(),
              voice: C.voice || "",
              photoDataUrl: C.image && C.image.file ? await _toUrl(C.image.file) : null,
            })),
          );
          // skipReload only when objects follow: the LAST operation must keep its reload,
          // because the background handler waits (polls the Flow inventory) until everything
          // is really committed before reloading. A blind reload here raced that commit and
          // left the last character/object empty ("Untitled") on slower links.
          const resp = await _send({ type: "PREPARE_CHARACTERS", payload: { characters: _pc, skipReload: objs.length > 0 } });
          if (resp && resp.success) i({ type: "info", message: "Characters loaded: " + resp.prepared });
          else if (resp && resp.error) i({ type: "error", message: "Characters: " + resp.error });
        }
        if (objs.length) {
          const _po = await Promise.all(objs.map(async (O) => ({ name: O.name.trim(), imageDataUrl: await _toUrl(O.image.file) })));
          const resp = await _send({ type: "UPLOAD_OBJECTS", payload: { objects: _po } });
          if (resp && resp.success) i({ type: "info", message: "Images loaded: " + resp.uploaded });
          else if (resp && resp.error) i({ type: "error", message: "Images: " + resp.error });
        }
      } finally {
        try { chrome.runtime.onMessage.removeListener(_onProg); } catch (e) {}
        _setAllBusy(!1);
      }
    } catch (e) {
      _setAllBusy(!1);
      i({ type: "error", message: "Load All Media failed: " + ((e && e.message) || e) });
    }
  };
  z.useEffect(() => {
    y();
  }, [r]);
  const y = async () => {
      try {
        const _tk = await new Promise((res) =>
          chrome.storage.local.get(["accessToken"], (o) => res(o && o.accessToken)),
        );
        _setNa(!_tk);
        const T = await Se.getUsageStatus();
        (h(T.can_generate), m(T.remaining));
        if (typeof T.used === "number" && !T._stale) {
          chrome.storage.local.get(["user"], (o) => {
            if (o && o.user)
              chrome.storage.local.set({
                user: {
                  ...o.user,
                  daily_generations: T.used,
                  daily_limit: T.daily_limit || o.user.daily_limit,
                  remaining: T.remaining,
                },
              });
          });
        }
      } catch {
        h(!0);
      }
    },
    _ct = async () => {
      // Not authed -> open the Telegram auth deep-link (binds THIS install via hardware id) and poll
      // for completion so login finishes automatically. No prompts required to connect.
      const _hw = await Se.getHardwareId();
      i({ type: "info", message: "Opening Telegram to connect…" });
      gfOpenBot("auth_" + _hw);
      const _iv = setInterval(async () => {
        try {
          const _r = await fetch(`https://grovex.space/api/v1/auth/check-tg?uuid=${_hw}`);
          if (!_r.ok) return;
          const _d = await _r.json();
          if (_d.status === "success" && _d.token) {
            clearInterval(_iv);
            Se.setToken(_d.token);
            await chrome.storage.local.set({ user: _d.user, banned: false });
            setTimeout(() => window.location.reload(), 600);
          }
        } catch (e) {}
      }, 2000);
      setTimeout(() => clearInterval(_iv), 120000);
    },
    j = async () => {
      if (u === "film_streams") {
        // Film (parallel episodes): build streams from the shared store and run via the engine.
        const _eps = nt.getState().fsStreams || [];
        const _apply = !!nt.getState().gfApplyRefs;
        const streams = [];
        _eps.forEach((ep, idx) => {
          const frames = (ep.frames || []).map((fr) => ({ text: (fr.text || "").trim(), gfApplyChars: _apply })).filter((fr) => fr.text);
          if (frames.length) streams.push({ streamId: idx + 1, startImageDataUrl: ep.startImage || void 0, frames });
        });
        const _lang = (a && a.language) || "en";
        if (!streams.length) { i({ type: "warning", message: _lang === "ru" ? "Film: добавьте промты в эпизоды" : "Film: add prompts to episodes" }); return; }
        const _tokFs = await new Promise((r) => chrome.storage.local.get(["accessToken"], (x) => r(x && x.accessToken)));
        if (!_tokFs) { _ct(); return; }
        (l(!0), s(!1), i({ type: "info", message: _lang === "ru" ? `Film: запуск ${streams.length} эпизод(ов)…` : `Film: launching ${streams.length} episode(s)…` }),
          // Episodes carry one start frame each, so many episodes with heavy unique photos can
          // still exceed Chrome's 64MiB message limit. Report it instead of failing silently
          // (a silent throw here looked exactly like "pressed Start, nothing happened").
          gfSendPrompts(
            { type: "RUN_FILM_STREAMS", payload: { streams, settings: { ...a, gfApplyRefs } } },
            (em) => { try { l(!1); } catch (e) {} i({ type: "error", message: /exceed|size|данных/i.test(em) ? (_lang === "ru" ? "Film: слишком много данных — запустите меньше эпизодов за раз (или используйте фото полегче)" : "Film: payload too large — run fewer episodes at once (or use lighter photos)") : (_lang === "ru" ? "Film: не удалось запустить — " : "Film: failed to start — ") + em }); },
          ));
        return;
      }
      if (v.length === 0) {
        i({ type: "warning", message: "No prompts to process" });
        return;
      }
      const _tok = await new Promise((r) =>
        chrome.storage.local.get(["accessToken"], (x) => r(x && x.accessToken)),
      );
      if (!_tok) {
        // Soft gate: the whole UI stays accessible, but generating needs a Telegram link. Open the
        // CORRECT auth deep-link (with the hardware id so the bot can bind THIS install) and poll for
        // completion so login finishes automatically — no manual popup reopen.
        const _hw = await Se.getHardwareId();
        i({ type: "info", message: "Connect Telegram to start — opening the bot…" });
        gfOpenBot("auth_" + _hw);
        const _iv = setInterval(async () => {
          try {
            const _r = await fetch(`https://grovex.space/api/v1/auth/check-tg?uuid=${_hw}`);
            if (!_r.ok) return;
            const _d = await _r.json();
            if (_d.status === "success" && _d.token) {
              clearInterval(_iv);
              Se.setToken(_d.token);
              await chrome.storage.local.set({ user: _d.user });
              i({ type: "success", message: "Connected! Press Start to begin." });
              setTimeout(() => window.location.reload(), 800);
            }
          } catch (e) {}
        }, 2000);
        setTimeout(() => clearInterval(_iv), 120000);
        return;
      }
      try {
        const T = await Se.getUsageStatus();
        if (!T.can_generate) {
          (i({
            type: "error",
            message: T.blocked ? "Account is blocked." : `Daily limit reached (${T.used}/${T.daily_limit}). Upgrade to Premium!`,
          }),
            h(!1),
            e == null || e());
          return;
        }
        T.remaining < v.length &&
          i({
            type: "warning",
            message: `Only ${T.remaining} generations left. Processing ${Math.min(v.length, T.remaining)} prompts.`,
          });
      } catch {}
      // Guard: automation needs a Flow PROJECT page open — else every prompt fails on
      // ensureFlowProjectPage AND still burns a credit. Show a modal instead of starting.
      if (a.service !== "grok") {
        const _flowTabs = await new Promise((r) => chrome.tabs.query({ url: ["*://labs.google/*"] }, (t) => r(t || [])));
        if (!_flowTabs.some((t) => /\/project\/[a-f0-9-]+/i.test(t.url || ""))) { gfShowFlowGate((a && a.language) || "en"); return; }
      }
      (l(!0),
        s(!1),
        i({
          type: "info",
          message: `Starting generation of ${v.length} prompts...`,
        }),
        gfSendPrompts(
          {
            type:
              a.inputMethod === "code"
                ? "RUN_FLOW_API_BATCH"
                : "START_GENERATION",
            payload: { ...gfPackRefPool(v), settings: { ...a, gfApplyRefs }, generationMode: u },
          },
          (em) => i({ type: "error", message: "Не удалось запустить: " + em }),
        ));
    },
    f = () => {
      (s(!0),
        i({ type: "info", message: "Generation paused" }),
        chrome.runtime.sendMessage({ type: "PAUSE_GENERATION" }));
    },
    d = () => {
      (s(!1),
        i({ type: "info", message: "Generation resumed" }),
        chrome.runtime.sendMessage({ type: "RESUME_GENERATION" }));
    },
    p = () => {
      (l(!1),
        s(!1),
        i({ type: "info", message: "Generation stopped" }),
        chrome.runtime.sendMessage({ type: "STOP_GENERATION" }));
    },
    g = () => {
      if (w.length === 0) {
        i({ type: "warning", message: "No completed generations to download" });
        return;
      }
      (i({ type: "info", message: `Downloading ${w.length} files...` }),
        chrome.runtime.sendMessage({
          type: "DOWNLOAD_ALL",
          payload: { prompts: w },
        }));
    },
    N = r.filter((T) => T.status === "failed"),
    R = r.filter((T) => T.status === "processing"),
    E = r.length,
    S = w.length + N.length,
    b = E > 0 ? Math.round((S / E) * 100) : 0,
    L =
      E > 0 &&
      R.length === 0 &&
      r.filter((T) => T.status === "pending").length === 0;
  var CC = {
    en: "Clear cache", ru: "Очистить кэш", uk: "Очистити кеш", es: "Borrar caché",
    pt: "Limpar cache", fr: "Vider le cache", de: "Cache leeren", it: "Svuota cache",
    tr: "Önbelleği temizle", pl: "Wyczyść pamięć podręczną", vi: "Xóa bộ nhớ đệm",
    id: "Hapus cache", th: "ล้างแคช", hi: "कैश साफ़ करें", ar: "مسح ذاكرة التخزين المؤقت",
    zh: "清除缓存", ja: "キャッシュをクリア", ko: "캐시 지우기",
  };
  var ccLabel = CC[(a && a.language) || "en"] || CC.en;
  var clearCache = function () {
    if (t) return; // never wipe state mid-run
    chrome.runtime.sendMessage({ type: "CLEAR_CACHE" });
    i({ type: "info", message: ccLabel + " ✓" });
  };
  return o.jsxs("div", {
    className: "glass-card p-2 space-y-2 flex-shrink-0",
    children: [
      E > 0 &&
        o.jsxs("div", {
          className: "space-y-1",
          children: [
            o.jsxs("div", {
              className: "flex items-center justify-between text-[10px]",
              children: [
                o.jsxs("span", {
                  className: "text-surface-400",
                  children: [
                    w.length,
                    " done",
                    N.length > 0 &&
                      o.jsxs("span", {
                        className: "text-red-400 ml-1",
                        children: ["/ ", N.length, " failed"],
                      }),
                    R.length > 0 &&
                      o.jsxs("span", {
                        className: "text-primary-400 ml-1",
                        children: ["/ ", R.length, " active"],
                      }),
                  ],
                }),
                o.jsxs("span", {
                  className: "text-surface-500",
                  children: [S, "/", E, " (", b, "%)"],
                }),
              ],
            }),
            o.jsx("div", {
              className:
                "w-full h-1.5 bg-surface-800 rounded-full overflow-hidden",
              children: o.jsx("div", {
                className:
                  "h-full rounded-full transition-all duration-500 ease-out",
                style: {
                  width: `${b}%`,
                  background:
                    N.length > 0
                      ? "linear-gradient(90deg, #22c55e, #22c55e " +
                        Math.round((w.length / Math.max(S, 1)) * 100) +
                        "%, #ef4444 " +
                        Math.round((w.length / Math.max(S, 1)) * 100) +
                        "%)"
                      : "linear-gradient(90deg, #6366f1, #8b5cf6)",
                },
              }),
            }),
          ],
        }),
      o.jsxs("div", {
        className: "flex items-center gap-2",
        children: [
          t
            ? o.jsxs(o.Fragment, {
                children: [
                  n
                    ? o.jsxs("button", {
                        onClick: d,
                        className:
                          "btn-accent flex-1 flex items-center justify-center gap-2",
                        children: [
                          o.jsx(Ka, { className: "w-4 h-4" }),
                          o.jsx("span", { children: "Resume" }),
                        ],
                      })
                    : o.jsxs("button", {
                        onClick: f,
                        className:
                          "btn-secondary flex-1 flex items-center justify-center gap-2",
                        children: [
                          o.jsx(hh, { className: "w-4 h-4" }),
                          o.jsx("span", { children: "Pause" }),
                        ],
                      }),
                  o.jsx("button", {
                    onClick: p,
                    className:
                      "btn-secondary px-4 text-red-400 hover:text-red-300",
                    children: o.jsx(To, { className: "w-4 h-4" }),
                  }),
                ],
              })
            : _gfIsRef
            ? o.jsxs("button", {
                onClick: _gfLoadAll,
                disabled: _allBusy,
                className: "btn-accent flex-1 flex items-center justify-center gap-2",
                children: _allBusy
                  ? [
                      o.jsx("span", {
                        className: "animate-spin",
                        style: { width: "14px", height: "14px", border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "9999px", display: "inline-block" },
                      }),
                      o.jsx("span", { children: "Loading " + _allDone + "/" + _allTotal }),
                    ]
                  : [o.jsx(Ka, { className: "w-4 h-4" }), o.jsx("span", { children: "Load All Media" })],
              })
            : o.jsx("button", {
                onClick: _na ? _ct : j,
                disabled: _na ? false : (u === "film_streams" ? !c : (v.length === 0 || !c)),
                className: J(
                  "flex-1 flex items-center justify-center gap-2",
                  _na || c
                    ? "btn-primary"
                    : "bg-red-500/20 border border-red-500/30 text-red-400 cursor-not-allowed rounded-xl py-2.5 px-4",
                ),
                children: _na
                  ? o.jsxs(o.Fragment, {
                      children: [
                        o.jsx(Ka, { className: "w-4 h-4" }),
                        o.jsx("span", { children: "Connect Telegram to start" }),
                      ],
                    })
                  : c
                  ? o.jsxs(o.Fragment, {
                      children: [
                        o.jsx(Ka, { className: "w-4 h-4" }),
                        o.jsxs("span", {
                          children: [
                            u === "film_streams" ? "Start" : "Start (" + v.length + ")",
                            a.startFromPrompt >= 2
                              ? " · starting from " + a.startFromPrompt
                              : "",
                          ],
                        }),
                      ],
                    })
                  : o.jsxs(o.Fragment, {
                      children: [
                        o.jsx(Zm, { className: "w-4 h-4" }),
                        o.jsx("span", { children: "Limit Reached" }),
                      ],
                    }),
              }),
        ],
      }),
    ],
  });
}
function N0() {
  const {
      isRunning: e,
      isPaused: t,
      activeSlots: n,
      prompts: r,
      settings: l,
      activeTab: s,
    } = nt(),
    i = r.filter((h) => h.status === "completed").length,
    a = r.length,
    u = a > 0 ? (i / a) * 100 : 0,
    c = s === "video" ? l.maxVideoThreads : l.maxImageThreads;
  return o.jsxs("footer", {
    className: "px-4 py-2 border-t border-surface-700/50 bg-surface-900/50",
    children: [
      a > 0 &&
        o.jsxs("div", {
          className: "mb-2",
          children: [
            o.jsx("div", {
              className: "progress-bar",
              children: o.jsx("div", {
                className: "progress-bar-fill",
                style: { width: `${u}%` },
              }),
            }),
            o.jsxs("div", {
              className:
                "flex justify-between text-[10px] text-surface-500 mt-0.5",
              children: [
                o.jsxs("span", { children: [i, " / ", a, " completed"] }),
                o.jsxs("span", { children: [Math.round(u), "%"] }),
              ],
            }),
          ],
        }),
      o.jsxs("div", {
        className: "flex items-center justify-between text-[10px]",
        children: [
          o.jsxs("div", {
            className: "flex items-center gap-3",
            children: [
              o.jsxs("div", {
                className: "flex items-center gap-1.5",
                children: [
                  o.jsx("div", {
                    className: `w-2 h-2 rounded-full ${e ? (t ? "bg-yellow-500" : "bg-green-500 animate-pulse") : "bg-surface-500"}`,
                  }),
                  o.jsx("span", {
                    className: "text-surface-400",
                    children: e ? (t ? "Paused" : "Running") : "Idle",
                  }),
                ],
              }),
              o.jsxs("div", {
                className: "flex items-center gap-1 text-surface-400",
                children: [
                  o.jsx(dh, { className: "w-3 h-3" }),
                  o.jsxs("span", { children: [n, "/", c] }),
                ],
              }),
              o.jsxs("div", {
                className: "flex items-center gap-1 text-surface-400",
                children: [
                  o.jsx(jd, { className: "w-3 h-3" }),
                  o.jsxs("span", {
                    children: [
                      l.minWaitTime ?? 3,
                      "-",
                      l.maxWaitTime ?? 8,
                      "s",
                    ],
                  }),
                ],
              }),
              o.jsx("span", {
                className: "text-surface-600",
                title: "Extension version",
                children: "v" + chrome.runtime.getManifest().version,
              }),
            ],
          }),
          o.jsxs("div", {
            className: "flex items-center gap-1 text-primary-400",
            children: [
              o.jsx(rs, { className: "w-3 h-3" }),
              o.jsx("span", {
                children:
                  s === "video"
                    ? l.model === "veo3.1-fast"
                      ? "Fast"
                      : l.model === "veo3.1-quality"
                        ? "Quality"
                        : l.model === "veo3.1-lite-lower-priority"
                          ? "Lite (LP)"
                          : l.model && l.model.indexOf("lite") >= 0
                            ? "Lite"
                            : "Quality"
                    : l.imageModel === "nano-banana"
                      ? "Nano Banana 2"
                      : l.imageModel === "nano-banana-2-lite"
                        ? "Nano Banana 2 Lite"
                        : "Nano Banana Pro",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
function S0(e) {
  return e.normalize("NFC").trim().replace(/\s+/g, " ");
}
function zd(e) {
  return S0(e).toLowerCase();
}
function C0(e) {
  return e.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}
function E0(e) {
  return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function zo(e, t) {
  var l;
  if (!t) return -1;
  const r = new RegExp(
    `(^|[^\\p{L}\\p{N}])${E0(t)}([^\\p{L}\\p{N}]|$)`,
    "u",
  ).exec(e);
  return !r || r.index === void 0
    ? -1
    : r.index + (((l = r[1]) == null ? void 0 : l.length) ?? 0);
}
function b0(e, t) {
  if (!t) return -1;
  const n = e.indexOf(t);
  return n >= 0 ? n : -1;
}
function Ja(e) {
  return Li(e).reduce((n, r) => Math.max(n, r.length), 0);
}
function Li(e) {
  var l, s;
  const t = [];
  if (
    ((l = e.name) != null && l.trim() && t.push(e.name.trim()),
    (s = e.aliases) != null && s.length)
  )
    for (const i of e.aliases) {
      const a = i.trim();
      a && t.push(a);
    }
  const n = new Set(),
    r = [];
  for (const i of t) {
    const a = zd(i);
    !a || n.has(a) || (n.add(a), r.push(a));
  }
  return r.sort((i, a) => a.length - i.length);
}
function P0(e, t) {
  const n = Math.min(e.length, t.length);
  let r = 0;
  for (; r < n && e[r] === t[r]; ) r++;
  return r;
}
function _0(e, t, n) {
  if (n.length < 3) return null;
  const r = n.length >= 4 ? Math.max(3, n.length - 1) : n.length;
  for (const l of t) {
    if (l === n || P0(n, l) < r || l.length < Math.min(n.length, r)) continue;
    const i = zo(e, l);
    if (i >= 0) return { pos: i, end: i + l.length, rule: "inflect" };
  }
  return null;
}
function R0(e, t) {
  return !(e[1] <= t[0] || e[0] >= t[1]);
}
function I0(e, t) {
  return t.some((n) => R0(e, n));
}
function L0(e, t, n) {
  // Whole-word match ONLY. A reference name must appear as its own word/phrase (bounded by a
  // non-letter/digit on both sides). The old substring/prefix/inflection rules wrongly fired a
  // short reference inside a longer DIFFERENT word — ref "макс" matched "максим". The user types
  // the name they mean, so only an exact word match counts.
  const s = zo(e, n);
  if (s >= 0) return { pos: s, end: s + n.length, rule: "exact" };
  return null;
}
function T0(e, t, n, r) {
  const l = Li(e);
  let s = null;
  const i = { exact: 0, substring: 1, prefix: 2, inflect: 3 };
  for (const a of l) {
    const u = L0(t, n, a);
    !u ||
      I0([u.pos, u.end], r) ||
      ((!s || u.pos < s.pos || (u.pos === s.pos && i[u.rule] < i[s.rule])) &&
        (s = u));
  }
  return s;
}
function M0(e, t) {
  const n = zd(e);
  if (!n) return [];
  const r = C0(n),
    l = [...t].sort((u, c) => {
      const h = Ja(c) - Ja(u);
      return h !== 0 ? h : u.id.localeCompare(c.id);
    }),
    s = [],
    i = new Set(),
    a = [];
  for (const u of l) {
    if (i.has(u.id) || !Li(u).length) continue;
    const c = T0(u, n, r, a);
    c &&
      (a.push([c.pos, c.end]),
      s.push({ char: u, pos: c.pos, rule: c.rule }),
      i.add(u.id));
  }
  return (
    s.sort((u, c) => {
      if (u.pos !== c.pos) return u.pos - c.pos;
      const h = { exact: 0, substring: 1, prefix: 2, inflect: 3 },
        x = h[u.rule] - h[c.rule];
      return x !== 0 ? x : u.char.id.localeCompare(c.char.id);
    }),
    s.map((u) => u.char)
  );
}
const zs = 4,
  Gt = 10;
const GFLIMITS = {
  en: ["Photo: up to 10 characters per prompt", "Video: up to 3 (Veo 3.1 Fast only) per prompt", "If a character's voice is changed, only 1 character is allowed in a prompt in text-to-video mode"],
  ru: ["Фото: до 10 персонажей в одном промпте", "Видео: до 3 (только Veo 3.1 Fast) в промпте", "Если у персонажа изменен голос то разрешается вставить только 1 героя в промт в режиме text to video"],
  uk: ["Фото: до 10 персонажів у промпті", "Відео: до 3 (тільки Veo 3.1 Fast) у промпті", "Якщо у персонажа змінено голос, дозволяється вставити лише 1 героя в промпт у режимі text to video"],
  es: ["Foto: hasta 10 personajes por prompt", "Vídeo: hasta 3 (solo Veo 3.1 Fast) por prompt", "Si se cambia la voz de un personaje, solo se permite 1 personaje en el prompt en el modo text to video"],
  pt: ["Foto: até 10 personagens por prompt", "Vídeo: até 3 (apenas Veo 3.1 Fast) por prompt", "Se a voz de um personagem for alterada, apenas 1 personagem é permitido no prompt no modo text to video"],
  fr: ["Photo : jusqu'à 10 personnages par prompt", "Vidéo : jusqu'à 3 (Veo 3.1 Fast uniquement) par prompt", "Si la voix d'un personnage est modifiée, seul 1 personnage est autorisé par prompt en mode text to video"],
  de: ["Foto: bis zu 10 Charaktere pro Prompt", "Video: bis zu 3 (nur Veo 3.1 Fast) pro Prompt", "Wenn die Stimme eines Charakters geändert wird, ist im text-to-video-Modus nur 1 Charakter pro Prompt erlaubt"],
  it: ["Foto: fino a 10 personaggi per prompt", "Video: fino a 3 (solo Veo 3.1 Fast) per prompt", "Se la voce di un personaggio viene modificata, è consentito solo 1 personaggio nel prompt in modalità text to video"],
  tr: ["Fotoğraf: istem başına en fazla 10 karakter", "Video: istem başına en fazla 3 (yalnızca Veo 3.1 Fast)", "Karakterin sesi değiştirilirse, metinden videoya modunda istem başına yalnızca 1 karaktere izin verilir"],
  pl: ["Zdjęcie: do 10 postaci na prompt", "Wideo: do 3 (tylko Veo 3.1 Fast) na prompt", "Jeśli głos postaci zostanie zmieniony, w trybie text to video dozwolona jest tylko 1 postać w prompcie"],
  vi: ["Ảnh: tối đa 10 nhân vật mỗi prompt", "Video: tối đa 3 (chỉ Veo 3.1 Fast) mỗi prompt", "Nếu giọng nói của nhân vật bị thay đổi, chỉ cho phép 1 nhân vật trong prompt ở chế độ text to video"],
  id: ["Foto: maks 10 karakter per prompt", "Video: maks 3 (hanya Veo 3.1 Fast) per prompt", "Jika suara karakter diubah, hanya 1 karakter yang diperbolehkan dalam prompt pada mode text to video"],
  th: ["ภาพ: สูงสุด 10 ตัวละครต่อพรอมต์", "วิดีโอ: สูงสุด 3 (เฉพาะ Veo 3.1 Fast) ต่อพรอมต์", "หากเปลี่ยนเสียงของตัวละคร จะอนุญาตให้มีตัวละครได้เพียง 1 ตัวเท่านั้นในพรอมต์ในโหมด text to video"],
  hi: ["फ़ोटो: प्रति प्रॉम्प्ट 10 कैरेक्टर तक", "वीडियो: प्रति प्रॉम्प्ट केवल 3 तक (Veo 3.1 Fast)", "यदि किसी कैреक्टर की आवाज़ बदली जाती है, तो text to video मोड में केवल 1 कैреक्टर की अनुमति है"],
  ar: ["صورة: حتى 10 شخصيات لكل برومبت", "فيديو: حتى 3 (Veo 3.1 Fast فقط) لكل برومبت", "إذا تم تغيير صوت الشخصية، يُسمح بشخصية واحدة فقط في البرومبت في وضع text to video"],
  zh: ["图片：每个提示最多 10 个角色", "视频：每个提示最多 3 个（仅 Veo 3.1 Fast）", "如果角色的声音被更改，则在 text to video 模式下每个提示只允许 1 个角色"],
  ja: ["画像: 1プロンプトにつき最大10キャラ", "動画: 1プロンプトにつき最大3 (Veo 3.1 Fast のみ)", "キャラクターの音声が変更された場合、text to videoモードのプロンプトでは1キャラクターのみ許可されます"],
  ko: ["사진: 프롬프트당 최대 10명", "동영상: 프롬프트당 최대 3명 (Veo 3.1 Fast만)", "캐릭터의 목소리가 변경된 경우, text to video 모드의 프롬프트에는 1명의 캐릭터만 허용됩니다"],
};
function eu(e) {
  return e
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}
function Us(e) {
  const t = e.trim();
  return t ? t.replace(/\.[^./\\]+$/u, "").trim() || t : "";
}
function GfObjects() {
  const { gfObjects: items, setGfObjects: setItems, addLog: addLog } = nt();
  const fileRef = z.useRef(null),
    bulkRef = z.useRef(null),
    pendRef = z.useRef(null);
  const [_objBusy, _setObjBusy] = z.useState(!1),
    [_objDone, _setObjDone] = z.useState(0),
    [_objTotal, _setObjTotal] = z.useState(0);
  const add = () => setItems((p) => [...p, { id: crypto.randomUUID(), name: "", image: null }]);
  const upd = (id, k, v) => setItems((p) => p.map((o2) => (o2.id === id ? { ...o2, [k]: v } : o2)));
  const del = (id) => setItems((p) => p.filter((o2) => o2.id !== id));
  const pick = (id) => {
    pendRef.current = id;
    fileRef.current && fileRef.current.click();
  };
  const onOne = (ev) => {
    const f = ev.target.files && ev.target.files[0],
      id = pendRef.current;
    if (f && id) upd(id, "image", { file: f, url: URL.createObjectURL(f) });
    ev.target.value = "";
  };
  const onBulk = (ev) => {
    const fs = Array.from(ev.target.files || []);
    if (fs.length)
      setItems((p) =>
        [
          ...p,
          ...fs.map((f) => ({
            id: crypto.randomUUID(),
            name: f.name.replace(/\.[^.]+$/, ""),
            image: { file: f, url: URL.createObjectURL(f) },
          })),
        ],
      );
    ev.target.value = "";
  };
  // Load Images: upload the object photos to the Flow library (so they're available
  // by name). Objects also auto-upload at generation time, so this is a convenience.
  const gfLoadImages = async () => {
    const withImg = items.filter((o2) => o2.name && o2.name.trim() && o2.image && o2.image.file);
    if (!withImg.length) return;
    const toUrl = (file) =>
      new Promise((res) => {
        const rd = new FileReader();
        rd.onload = () => res(rd.result);
        rd.onerror = () => res(null);
        rd.readAsDataURL(file);
      });
    const objects = (
      await Promise.all(withImg.map(async (o2) => ({ name: o2.name.trim(), imageDataUrl: await toUrl(o2.image.file) })))
    ).filter((x) => x.imageDataUrl);
    if (!objects.length) return;
    _setObjTotal(objects.length);
    _setObjDone(0);
    _setObjBusy(!0);
    const _onProg = (m) => {
      if (m && m.type === "OBJ_UPLOAD_PROGRESS" && m.payload) {
        _setObjDone(m.payload.done || 0);
        if (m.payload.total) _setObjTotal(m.payload.total);
      }
    };
    chrome.runtime.onMessage.addListener(_onProg);
    try {
      chrome.runtime.sendMessage({ type: "UPLOAD_OBJECTS", payload: { objects } }, (resp) => {
        try { chrome.runtime.onMessage.removeListener(_onProg); } catch (e) {}
        _setObjBusy(!1);
        if (chrome.runtime.lastError) {
          addLog && addLog({ type: "error", message: "Load Images: " + chrome.runtime.lastError.message });
          return;
        }
        if (resp && resp.success)
          addLog && addLog({ type: "info", message: "Loaded " + resp.uploaded + " image(s) to library" });
        else addLog && addLog({ type: "error", message: "Load Images failed: " + ((resp && resp.error) || "unknown") });
      });
    } catch (e) {
      try { chrome.runtime.onMessage.removeListener(_onProg); } catch (e2) {}
      _setObjBusy(!1);
    }
  };
  return o.jsxs("div", {
    className: "flex-1 min-h-0 flex flex-col gap-2 mt-2 min-w-0",
    children: [
      o.jsx("input", { ref: fileRef, type: "file", accept: "image/*", className: "hidden", onChange: onOne }),
      o.jsx("input", { ref: bulkRef, type: "file", accept: "image/*", multiple: !0, className: "hidden", onChange: onBulk }),
      o.jsxs("div", {
        className: "flex-shrink-0 flex items-center gap-2 flex-wrap",
        children: [
          o.jsx("button", {
            type: "button",
            onClick: () => bulkRef.current && bulkRef.current.click(),
            className: "btn-secondary text-[10px] px-2 py-1 flex items-center gap-1",
            children: "Import images",
          }),
          o.jsx("button", {
            type: "button",
            onClick: gfLoadImages,
            className: "btn-accent text-[10px] px-3 py-1 rounded-lg font-semibold flex items-center gap-1",
            children: "Load Images",
          }),
          _objBusy &&
            o.jsxs("span", {
              className: "text-[10px] text-accent-400 flex items-center gap-1 whitespace-nowrap",
              children: [
                o.jsx("span", {
                  className: "animate-spin",
                  style: { width: "9px", height: "9px", border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "9999px", display: "inline-block" },
                }),
                _objTotal ? `${_objDone}/${_objTotal}` : "…",
              ],
            }),
        ],
      }),
      o.jsxs("div", {
        className:
          "flex-1 min-h-[6rem] min-w-0 overflow-y-auto overflow-x-hidden rounded-lg border border-surface-700/40 bg-surface-900/20 px-1",
        children: [
          o.jsxs("div", {
            className:
              "flex items-center justify-between mb-1 sticky top-0 z-[1] bg-surface-900/95 backdrop-blur-sm py-1 -mx-1 px-2 border-b border-surface-700/30",
            children: [
              o.jsxs("span", {
                className: "text-[10px] font-medium text-surface-400",
                children: ["Locations / Objects (", items.length, ")"],
              }),
              o.jsx("button", {
                type: "button",
                onClick: add,
                className: "text-[10px] flex items-center gap-1 text-primary-400 hover:text-primary-300",
                children: "+ Add objects",
              }),
            ],
          }),
          items.length === 0
            ? o.jsx("p", {
                className: "text-[9px] text-surface-500 px-2 py-2",
                children: 'No objects — plain reference photos, used by name in prompts (e.g. "moscow").',
              })
            : o.jsx("div", {
                className: "space-y-1 pb-1",
                children: items.map((it, idx) =>
                  o.jsxs(
                    "div",
                    {
                      className: "grid items-center gap-2 px-1",
                      style: { gridTemplateColumns: "16px 50px 1fr 16px" },
                      children: [
                        o.jsx("span", { className: "text-[10px] text-surface-400 text-center", children: idx + 1 }),
                        o.jsx("button", {
                          type: "button",
                          className: J(
                            "w-12 h-9 rounded border border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-colors",
                            it.image ? "border-primary-500/50 hover:border-primary-400" : "border-surface-600 hover:border-primary-500",
                          ),
                          onClick: () => pick(it.id),
                          title: it.image ? "Replace image" : "Add image",
                          children: it.image
                            ? o.jsx("img", { src: it.image.url, alt: "", className: "w-full h-full object-cover" })
                            : o.jsx(Xn, { className: "w-3 h-3 text-surface-500" }),
                        }),
                        o.jsx("input", {
                          type: "text",
                          value: it.name,
                          onChange: (e) => upd(it.id, "name", e.target.value),
                          placeholder: "Name",
                          className:
                            "bg-surface-900/50 text-[10px] text-surface-300 px-1.5 py-1.5 rounded border border-surface-700 outline-none focus:border-primary-500 min-w-0",
                        }),
                        o.jsx("button", {
                          type: "button",
                          onClick: () => del(it.id),
                          className: "p-1 text-surface-500 hover:text-red-400 transition-colors",
                          title: "Remove",
                          children: o.jsx(Lr, { className: "w-3 h-3" }),
                        }),
                      ],
                    },
                    it.id,
                  ),
                ),
              }),
        ],
      }),
    ],
  });
}
function tu({ charOnly } = {}) {
  const {
      addPrompts: e,
      addLog: t,
      generationMode: n,
      isRunning: isRunning,
      settings: settings,
      gfCharacters: s,
      setGfCharacters: i,
      gfObjects: gfObjs,
      gfApplyRefs: gfApplyRefs,
      promptRows: promptRows,
      setPromptRows: setPromptRows,
      promptStash: promptStash,
      setPromptStash: setPromptStash,
    } = nt(),
    r = promptRows || [f()],
    l = setPromptRows,
    [a, u] = z.useState(""),
    c = z.useRef(null),
    h = z.useRef(null),
    x = z.useRef(null),
    m = z.useRef(!1),
    [v, w] = z.useState(null),
    [y, j] = z.useState(null),
    [_prepBusy, _setPrepBusy] = z.useState(!1),
    [_prepDone, _setPrepDone] = z.useState(0),
    [_prepTotal, _setPrepTotal] = z.useState(0),
    // --- Film Streams state ---
    [_fsStreams, _setFsStreams] = z.useState([{ id: crypto.randomUUID(), frames: [{ id: crypto.randomUUID(), text: "" }], startImage: null }]),
    _fsFileRef = z.useRef(null),
    [_fsUploadTarget, _setFsUploadTarget] = z.useState(null),
    [playingCharId, setPlayingCharId] = z.useState(null),
    playingAudioRef = z.useRef(null);
  z.useEffect(() => {
    return () => {
      if (playingAudioRef.current) {
        playingAudioRef.current.pause();
        playingAudioRef.current = null;
      }
    };
  }, []);
  const _prevN = z.useRef(n);
  z.useEffect(() => {
    if (_prevN.current === n) return;
    setPromptStash((prevStash) => ({ ...prevStash, [_prevN.current]: r }));
    const _sv = promptStash[n];
    l(_sv && _sv.length ? _sv : [f()]);
    _prevN.current = n;
  }, [n, r, promptStash, setPromptStash, l]);
  function f() {
    return {
      id: crypto.randomUUID(),
      prompt: "",
      status: "empty",
      selected: !1,
    };
  }
  function d() {
    return { id: crypto.randomUUID(), name: "", temperament: "", voice: "" };
  }
  const p = (k) =>
      n === "single"
        ? k.prompt.trim()
          ? "ready"
          : "needs_prompt"
        : !k.startImage || !k.endImage
          ? "empty"
          : k.prompt.trim()
            ? "ready"
            : "needs_prompt",
    g = (k, _) => {
      var C, U;
      (w({ rowId: k, type: _ }),
        _ === "start"
          ? (C = c.current) == null || C.click()
          : (U = h.current) == null || U.click());
    },
    N = (k, _) => {
      var F;
      const C = (F = k.target.files) == null ? void 0 : F[0];
      if (!C || !v) return;
      const U = r.map((A) => {
        if (A.id === v.rowId) {
          (_ === "start" &&
            A.startImage &&
            URL.revokeObjectURL(A.startImage.preview),
            _ === "end" &&
              A.endImage &&
              URL.revokeObjectURL(A.endImage.preview));
          const Q = {
            ...A,
            [_ === "start" ? "startImage" : "endImage"]: {
              file: C,
              preview: URL.createObjectURL(C),
            },
          };
          return ((Q.status = p(Q)), Q);
        }
        return A;
      });
      if (n === "film" && _ === "end") {
        const A = U.findIndex((Q) => Q.id === v.rowId);
        if (A >= 0 && A < U.length - 1) {
          const Q = U[A];
          Q.endImage &&
            !U[A + 1].startImage &&
            ((U[A + 1] = { ...U[A + 1], startImage: { ...Q.endImage } }),
            (U[A + 1].status = p(U[A + 1])));
        }
      }
      (l(U),
        w(null),
        _ === "start" && c.current && (c.current.value = ""),
        _ === "end" && h.current && (h.current.value = ""));
    },
    R = (k) => {
      let _ = 0;
      (i((C) => {
        const U = [...C];
        let F = 0;
        const A = Gt;
        for (let Q = 0; Q < U.length && F < k.length; Q++)
          if (!U[Q].image) {
            const $e = k[F++];
            U[Q] = {
              ...U[Q],
              name: Us($e.name),
              image: { file: $e, preview: URL.createObjectURL($e) },
            };
          }
        for (; F < k.length && U.length < A; ) {
          const Q = k[F++];
          U.push({
            id: crypto.randomUUID(),
            name: Us(Q.name),
            image: { file: Q, preview: URL.createObjectURL(Q) },
          });
        }
        return ((_ = k.length - F), U);
      }),
        _ > 0 &&
          t({
            type: "warning",
            message: `${_} image(s) not imported (max ${Gt} characters)`,
          }));
    },
    E = (k) => {
      var C;
      const _ = (C = k.target.files) == null ? void 0 : C[0];
      !_ ||
        !y ||
        (i((U) =>
          U.map((F) =>
            F.id !== y
              ? F
              : (F.image && URL.revokeObjectURL(F.image.preview),
                {
                  ...F,
                  name: Us(_.name),
                  image: { file: _, preview: URL.createObjectURL(_) },
                }),
          ),
        ),
        j(null),
        x.current && (x.current.value = ""));
    },
    S = (k, _) => {
      const C = Array.from(k.target.files || []);
      if (C.length === 0) return;
      if ((n === "reference" || charOnly) && _ === "start") {
        (R(C), c.current && (c.current.value = ""));
        return;
      }
      if (n === "multi" && _ === "start") {
        (b(C), c.current && (c.current.value = ""));
        return;
      }
      if (n === "film" && _ === "start") {
        (L(C), c.current && (c.current.value = ""));
        return;
      }
      const U = [...r];
      let F = 0;
      for (let A = 0; A < U.length && F < C.length; A++) {
        const Q = U[A];
        if (!(_ === "start" ? Q.startImage : Q.endImage)) {
          const ct = C[F];
          ((U[A] = {
            ...Q,
            [_ === "start" ? "startImage" : "endImage"]: {
              file: ct,
              preview: URL.createObjectURL(ct),
            },
          }),
            (U[A].status = p(U[A])),
            F++);
        }
      }
      for (; F < C.length; ) {
        const A = C[F],
          Q = f();
        ((Q[_ === "start" ? "startImage" : "endImage"] = {
          file: A,
          preview: URL.createObjectURL(A),
        }),
          (Q.status = p(Q)),
          U.push(Q),
          F++);
      }
      (l(U),
        _ === "start" && c.current && (c.current.value = ""),
        _ === "end" && h.current && (h.current.value = ""));
    },
    b = (k) => {
      const _ = [];
      for (let C = 0; C < k.length; C += 2) {
        const U = k[C],
          F = k[C + 1],
          A = f();
        ((A.startImage = { file: U, preview: URL.createObjectURL(U) }),
          F && (A.endImage = { file: F, preview: URL.createObjectURL(F) }),
          (A.status = p(A)),
          _.push(A));
      }
      (r.forEach((C) => {
        (C.startImage && URL.revokeObjectURL(C.startImage.preview),
          C.endImage && URL.revokeObjectURL(C.endImage.preview));
      }),
        l(_.length > 0 ? _ : [f()]));
    },
    L = (k) => {
      if (k.length < 2) {
        b(k);
        return;
      }
      const _ = [];
      for (let C = 0; C < k.length - 1; C++) {
        const U = k[C],
          F = k[C + 1],
          A = f();
        ((A.startImage = { file: U, preview: URL.createObjectURL(U) }),
          (A.endImage = { file: F, preview: URL.createObjectURL(F) }),
          (A.status = p(A)),
          _.push(A));
      }
      (r.forEach((C) => {
        (C.startImage && URL.revokeObjectURL(C.startImage.preview),
          C.endImage && URL.revokeObjectURL(C.endImage.preview));
      }),
        l(_.length > 0 ? _ : [f()]));
    },
    T = (k, _) => {
      l(
        r.map((C) => {
          if (C.id === k) {
            const U = { ...C, prompt: _ };
            return ((U.status = p(U)), U);
          }
          return C;
        }),
      );
    },
    D = (k) => {
      l(r.map((_) => (_.id === k ? { ..._, selected: !_.selected } : _)));
    },
    oe = () => {
      const k = r.every((_) => _.selected);
      l(r.map((_) => ({ ..._, selected: !k })));
    },
    fe = () => {
      const k = [...r, f()];
      if (n === "film" && r.length > 0) {
        const _ = r[r.length - 1];
        _.endImage &&
          ((k[k.length - 1].startImage = { ..._.endImage }),
          (k[k.length - 1].status = p(k[k.length - 1])));
      }
      l(k);
    },
    ut = (k) => {
      l(
        r.map((_) =>
          _.id === k
            ? (_.startImage && URL.revokeObjectURL(_.startImage.preview),
              _.endImage && URL.revokeObjectURL(_.endImage.preview),
              f())
            : _,
        ),
      );
    },
    Te = (k) => {
      if (r.length <= 1) {
        ut(k);
        return;
      }
      const _ = r.find((C) => C.id === k);
      (_ != null && _.startImage && URL.revokeObjectURL(_.startImage.preview),
        _ != null && _.endImage && URL.revokeObjectURL(_.endImage.preview),
        l(r.filter((C) => C.id !== k)));
    },
    Ke = () => {
      const k = r.filter((C) => C.selected);
      if (k.length === 0) return;
      k.forEach((C) => {
        (C.startImage && URL.revokeObjectURL(C.startImage.preview),
          C.endImage && URL.revokeObjectURL(C.endImage.preview));
      });
      const _ = r.filter((C) => !C.selected);
      l(_.length > 0 ? _ : [f()]);
    },
    I = () => {
      (r.forEach((k) => {
        (k.startImage && URL.revokeObjectURL(k.startImage.preview),
          k.endImage && URL.revokeObjectURL(k.endImage.preview));
      }),
        l([f()]));
    },
    O = async () => {
      const k = document.createElement("input");
      ((k.type = "file"),
        (k.accept = ".txt"),
        (k.onchange = async (_) => {
          var Q;
          const C = (Q = _.target.files) == null ? void 0 : Q[0];
          if (!C) return;
          const F = (await C.text())
            .split(
              `
`,
            )
            .filter(($e) => $e.trim());
          if (n === "reference") {
            (u(await C.text()),
              t({ type: "info", message: "Imported prompts from file" }));
            return;
          }
          const A = [...r];
          (F.forEach(($e, ct) => {
            if (ct < A.length)
              ((A[ct].prompt = $e.trim()), (A[ct].status = p(A[ct])));
            else {
              const Nt = f();
              ((Nt.prompt = $e.trim()), (Nt.status = p(Nt)), A.push(Nt));
            }
          }),
            l(A),
            t({ type: "info", message: `Imported ${F.length} prompts` }));
        }),
        k.click());
    },
    $ = (k) =>
      new Promise((_) => {
        const C = new FileReader();
        ((C.onload = (U) => {
          var F;
          return _((F = U.target) == null ? void 0 : F.result);
        }),
          C.readAsDataURL(k));
      }),
    GF_PREP_LABEL = { en: "Load Characters", ru: "Загрузить персонажей", uk: "Завантажити персонажів", es: "Cargar personajes", pt: "Carregar personagens", fr: "Charger les personnages", de: "Charaktere laden", it: "Carica personaggi", tr: "Karakterleri yükle", pl: "Wczytaj postacie", vi: "Tải nhân vật", id: "Muat karakter", th: "โหลดตัวละคร", hi: "कैरेक्टर लोड करें", ar: "تحميل الشخصيات", zh: "加载角色", ja: "キャラクターを読み込む", ko: "캐릭터 불러오기" },
    GF_LIMIT_HINT = {
      en: ["Photo: up to 10 characters per prompt", "Video: up to 3 (Veo 3.1 Fast only)", "If a character's voice is changed, only 1 character is allowed in a prompt in text-to-video mode"],
      ru: ["Фото: до 10 персонажей в одном промпте", "Видео: до 3 (только Veo 3.1 Fast)", "Если у персонажа изменен голос то разрешается вставить только 1 героя в промт в режиме text to video"],
      uk: ["Фото: до 10 персонажів у промпті", "Відео: до 3 (тільки Veo 3.1 Fast)", "Якщо у персонажа змінено голос, дозволяється вставити лише 1 героя в промпт у режимі text to video"],
      es: ["Foto: hasta 10 personajes por prompt", "Vídeo: hasta 3 (solo Veo 3.1 Fast)", "Si se cambia la voz de un personaje, solo se permite 1 personaje en el prompt en el modo text to video"],
      pt: ["Foto: até 10 personagens por prompt", "Vídeo: até 3 (apenas Veo 3.1 Fast)", "Se a voz de um personagem for alterada, apenas 1 personagem é permitido no prompt no modo text to video"],
      fr: ["Photo : jusqu'à 10 personnages par prompt", "Vidéo : jusqu'à 3 (Veo 3.1 Fast uniquement)", "Si la voix d'un personnage est modifiée, seul 1 personnage est autorisé par prompt en mode text to video"],
      de: ["Foto: bis zu 10 Charaktere pro Prompt", "Video: bis zu 3 (nur Veo 3.1 Fast)", "Wenn die Stimme eines Charakters geändert wird, ist im text-to-video-Modus nur 1 Charakter pro Prompt erlaubt"],
      it: ["Foto: fino a 10 personaggi per prompt", "Video: fino a 3 (solo Veo 3.1 Fast)", "Se la voce di un personaggio viene modificata, è consentito solo 1 personaggio nel prompt in modalità text to video"],
      tr: ["Fotoğraf: istem başına en fazla 10 karakter", "Video: en fazla 3 (yalnızca Veo 3.1 Fast)", "Karakterin sesi değiştirilirse, metinden videoya modunda istem başına yalnızca 1 karaktere izin verilir"],
      pl: ["Zdjęcie: do 10 postaci na prompt", "Wideo: do 3 (tylko Veo 3.1 Fast)", "Jeśli głos postaci zostanie zmieniony, w trybie text to video dozwolona jest tylko 1 postać w prompcie"],
      vi: ["Ảnh: tối đa 10 nhân vật mỗi prompt", "Video: tối đa 3 (chỉ Veo 3.1 Fast)", "Nếu giọng nói của nhân vật bị thay đổi, chỉ cho phép 1 nhân vật trong prompt ở chế độ text to video"],
      id: ["Foto: maks 10 karakter per prompt", "Video: maks 3 (hanya Veo 3.1 Fast)", "Jika suara karakter diubah, hanya 1 karakter yang diperbolehkan dalam prompt pada mode text to video"],
      th: ["ภาพ: สูงสุด 10 ตัวละครต่อพรอมต์", "วิดีโอ: สูงสุด 3 (เฉพาะ Veo 3.1 Fast)", "หากเปลี่ยนเสียงของตัวละคร จะอนุญาตให้มีตัวละครได้เพียง 1 ตัวเท่านั้นในพรอมต์ในโหมด text to video"],
      hi: ["फ़ोटो: प्रति प्रॉम्प्ट 10 कैरेक्टर तक", "वीडियो: केवल 3 तक (Veo 3.1 Fast)", "यदि किसी कैреक्टर की आवाज़ बदली जाती है, तो text to video मोड में केवल 1 कैреक्टर की अनुमति है"],
      ar: ["صورة: حتى 10 شخصيات لكل برومبت", "فيديو: حتى 3 (Veo 3.1 Fast فقط)", "إذا تم تغيير صوت الشخصية، يُسمح بشخصية واحدة فقط في البرومبت في وضع text to video"],
      zh: ["图片：每个提示最多 10 个角色", "视频：最多 3 个（仅 Veo 3.1 Fast）", "如果角色的声音被更改，则在 text to video 模式下每个提示只允许 1 个角色"],
      ja: ["画像: 1プロンプトにつき最大10キャラ", "動画: 最大3 (Veo 3.1 Fast のみ)", "キャラクターの音声が変更された場合、text to videoモードのプロンプトでは1キャラクターのみ許可されます"],
      ko: ["사진: 프롬프트당 최대 10명", "동영상: 최대 3명 (Veo 3.1 Fast만)", "캐릭터의 목声이 변경된 경우, text to video 모드의 프롬프트에는 1명의 캐릭터만 허용됩니다"],
    },
    GF_LIMIT_TXT = GF_LIMIT_HINT[(settings && settings.language) || "en"] || GF_LIMIT_HINT.en,
    Pd = async () => {
      const named = s.filter((F) => F.name.trim());
      if (named.length === 0) { t({ type: "warning", message: "Add at least one character with a name first" }); return; }
      const chars = await Promise.all(named.map(async (F) => ({
        name: F.name.trim(),
        temperament: (F.temperament || "").trim(),
        voice: F.voice || "",
        photoDataUrl: F.image ? await $(F.image.file) : null,
      })));
      _setPrepTotal(chars.length); _setPrepDone(0); _setPrepBusy(!0);
      const _onProg = (m) => { if (m && m.type === "CHAR_PREP_PROGRESS" && m.payload) { _setPrepDone(m.payload.done || 0); if (m.payload.total) _setPrepTotal(m.payload.total); } };
      chrome.runtime.onMessage.addListener(_onProg);
      chrome.runtime.sendMessage({ type: "PREPARE_CHARACTERS", payload: { characters: chars } }, (resp) => {
        try { chrome.runtime.onMessage.removeListener(_onProg); } catch (e) {}
        _setPrepBusy(!1);
        if (chrome.runtime.lastError) { t({ type: "error", message: "Prepare failed: " + chrome.runtime.lastError.message }); return; }
        if (resp && resp.success) t({ type: "info", message: `Characters ready: ${resp.prepared}/${chars.length}` + (resp.reused ? ` (${resp.reused} reused)` : "") });
        else t({ type: "error", message: "Prepare failed: " + ((resp && resp.error) || "unknown") });
      });
    },
    G = async () => {
      const k = eu(a);
      if (k.length === 0) {
        t({ type: "warning", message: "No prompts with text to add to queue" });
        return;
      }
      const _ = await Promise.all(
          [...s]
            .filter((F) => F.name.trim() && F.image)
            .map(async (F) => ({
              id: F.id,
              name: F.name.trim(),
              imageDataUrl: await $(F.image.file),
            })),
        ),
        _gfObjPool = await Promise.all(
          [...(gfObjs || [])]
            .filter((F) => F.name.trim() && F.image)
            .map(async (F) => ({
              id: F.id,
              name: F.name.trim(),
              imageDataUrl: await $(F.image.file),
            })),
        ),
        C = [];
      let U = parseInt(localStorage.getItem("gfPromptCounter") || "0", 10) || 0;
      for (const F of k) {
        U += 1;
        const A = M0(F, _),
          Q = A.slice(0, zs);
        A.length > zs &&
          t({
            type: "warning",
            message: `Prompt #${U}: only first ${zs} matched characters used as references`,
          });
        const _objA = M0(F, _gfObjPool),
          _objQ = _objA.slice(0, Gt - Q.length);
        const $e = Q.map((Nt) => Nt.imageDataUrl),
          ct = Q.map((Nt) => Nt.name.trim());
        const _objUrls = _objQ.map((Nt) => Nt.imageDataUrl),
          _objNames = _objQ.map((Nt) => Nt.name.trim());
        C.push({
          id: crypto.randomUUID(),
          number: U,
          text: F,
          status: "pending",
          retryCount: 0,
          createdAt: Date.now(),
          referenceImageUrls: $e.length > 0 ? $e : void 0,
          referenceDisplayNames: ct,
          objectImageUrls: _objUrls.length > 0 ? _objUrls : void 0,
          objectDisplayNames: _objNames.length > 0 ? _objNames : void 0,
        });
      }
      localStorage.setItem("gfPromptCounter", String(U));
      if (isRunning) {
        if (n === "code" || (settings && settings.inputMethod === "code")) {
          e(C);
          gfSendPrompts({ type: "APPEND_API_PROMPTS", payload: gfPackRefPool(C) },
            (em) => t({ type: "error", message: "Не удалось добавить в очередь: " + em }));
        } else {
          gfSendPrompts({
            type: "START_GENERATION",
            payload: { ...gfPackRefPool(C), settings: { ...settings, gfApplyRefs }, generationMode: n },
          }, (em) => t({ type: "error", message: "Не удалось запустить: " + em }));
        }
      } else {
        e(C);
      }
      // Keep the characters/references after queueing — they belong to the user and persist until
      // THEY delete them. (Was: revoke all preview URLs + i([]) to wipe the list every run.)
      (t({ type: "info", message: `Added ${C.length} tasks to queue` }),
        u(""));
    },
    B = async () => {
      if (n === "reference") {
        await G();
        return;
      }
      const k = r.filter((C) => C.status === "ready");
      if (k.length === 0) {
        t({ type: "warning", message: "No ready rows to add to queue" });
        return;
      }
      const _BASE =
        parseInt(localStorage.getItem("gfPromptCounter") || "0", 10) || 0;
      const _ = await Promise.all(
        k.map(async (C, U) => {
          const F = C.startImage ? await $(C.startImage.file) : void 0,
            A = C.endImage ? await $(C.endImage.file) : void 0;
          return {
            id: C.id,
            number: _BASE + U + 1,
            text: C.prompt,
            imageUrl: F,
            endImageUrl: A,
            status: "pending",
            retryCount: 0,
            createdAt: Date.now(),
          };
        }),
      );
      localStorage.setItem("gfPromptCounter", String(_BASE + k.length));
      if (isRunning) {
        if (n === "code" || (settings && settings.inputMethod === "code")) {
          e(_);
          gfSendPrompts({ type: "APPEND_API_PROMPTS", payload: gfPackRefPool(_) },
            (em) => t({ type: "error", message: "Не удалось добавить в очередь: " + em }));
        } else {
          gfSendPrompts({
            type: "START_GENERATION",
            payload: { ...gfPackRefPool(_), settings: { ...settings, gfApplyRefs }, generationMode: n },
          }, (em) => t({ type: "error", message: "Не удалось запустить: " + em }));
        }
      } else {
        e(_);
      }
      (t({ type: "info", message: `Added ${_.length} tasks to queue` }),
        r.forEach((C) => {
          (C.startImage && URL.revokeObjectURL(C.startImage.preview),
            C.endImage && URL.revokeObjectURL(C.endImage.preview));
        }),
        l([f()]));
    },
    ie =
      n === "reference"
        ? eu(a).length
        : r.filter((k) => k.status === "ready").length,
    ye =
      n === "reference"
        ? 0
        : r.filter((k) => k.status === "needs_prompt").length,
    Fe = n === "reference" ? 0 : r.filter((k) => k.status === "empty").length,
    rt = r.filter((k) => k.selected).length,
    un = () => {
      (s.forEach((k) => {
        k.image && URL.revokeObjectURL(k.image.preview);
      }),
        i([]),
        u(""));
    },
    Ud = () => {
      if (s.length >= Gt) {
        t({ type: "warning", message: `Maximum ${Gt} characters` });
        return;
      }
      i((k) => [...k, d()]);
    },
    ls = s.length >= Gt,
    Od = (k) => {
      i((_) => {
        const C = _.find((U) => U.id === k);
        return (
          C != null && C.image && URL.revokeObjectURL(C.image.preview),
          _.filter((U) => U.id !== k)
        );
      });
    },
    Ad = (k, _) => {
      i((C) => C.map((U) => (U.id === k ? { ...U, name: _ } : U)));
    },
    AdTemp = (k, _) => {
      i((C) => C.map((U) => (U.id === k ? { ...U, temperament: _ } : U)));
    },
    AdVoice = (k, _) => {
      i((C) => C.map((U) => (U.id === k ? { ...U, voice: _ } : U)));
    },
    GF_VOICES = ["Achernar","Achird","Algenib","Algieba","Alnilam","Aoede","Autonoe","Callirrhoe","Charon","Despina","Enceladus","Erinome","Fenrir","Gacrux","Iapetus","Kore","Laomedeia","Leda","Orus","Puck","Pulcherrima","Rasalgethi","Sadachbia","Sadaltager","Schedar","Sulafat","Umbriel","Vindemiatrix","Zephyr","Zubenelgenubi"],
    GF_VOICES_GENDER = {
      achernar: "F",
      achird: "M",
      algenib: "M",
      algieba: "M",
      alnilam: "M",
      aoede: "F",
      autonoe: "F",
      callirrhoe: "F",
      charon: "M",
      despina: "F",
      enceladus: "M",
      erinome: "F",
      fenrir: "M",
      gacrux: "F",
      iapetus: "M",
      kore: "F",
      laomedeia: "F",
      leda: "F",
      orus: "M",
      puck: "M",
      pulcherrima: "N",
      rasalgethi: "M",
      sadachbia: "M",
      sadaltager: "M",
      schedar: "M",
      sulafat: "F",
      umbriel: "M",
      vindemiatrix: "F",
      zephyr: "F",
      zubenelgenubi: "M"
    },
    Dd = (k) => {
      switch (k) {
        case "ready":
          return o.jsx("span", {
            className:
              "text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400",
            children: "Ready",
          });
        case "needs_prompt":
          return o.jsx("span", {
            className:
              "text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400",
            children: "Needs prompt",
          });
        default:
          return o.jsx("span", {
            className:
              "text-[9px] px-1.5 py-0.5 rounded bg-surface-600 text-surface-400",
            children: "Empty",
          });
      }
    },
    Ti = () => {
      switch (n) {
        case "single":
          return "Single Image Mode";
        case "reference":
          return "Reference Image Mode";
        case "multi":
          return "Multi Image Mode";
        case "film":
          return "Film Mode";
        case "film_streams":
          return "Film Streams Mode";
        default:
          return "Image Mode";
      }
    },
    jt = n === "multi" || n === "film" || n === "film_streams";
  return n === "reference" || charOnly
    ? o.jsxs("div", {
        className: charOnly
          ? "glass-card p-3 flex-1 min-h-0 flex flex-col overflow-hidden gap-2"
          : "glass-card p-3 flex-shrink-0 flex flex-col overflow-y-auto overflow-x-hidden gap-2 [scrollbar-gutter:stable]",
        style: charOnly ? {} : { maxHeight: "55vh" },
        children: [
          !charOnly && o.jsxs("div", {
            className: "flex-shrink-0 flex items-center justify-between",
            children: [
              o.jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  o.jsx("span", {
                    className: "text-xs font-semibold text-surface-300",
                    children: "Image Prompt Editor",
                  }),
                  o.jsx("span", {
                    className:
                      "text-[10px] px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400",
                    children: Ti(),
                  }),
                ],
              }),
              o.jsx("div", {
                className: "flex items-center gap-2 text-[10px]",
                children: o.jsxs("span", {
                  className: "text-green-400",
                  children: [ie, " prompt", ie !== 1 ? "s" : ""],
                }),
              }),
            ],
          }),
          o.jsxs("div", {
            className: "flex-shrink-0 flex items-center gap-2 flex-wrap",
            children: [
              o.jsxs("button", {
                type: "button",
                onClick: () => {
                  var k;
                  (w(null),
                    (m.current = !0),
                    (k = c.current) == null || k.click());
                },
                className:
                  "btn-secondary text-[10px] px-2 py-1 flex items-center gap-1",
                title:
                  "Import images into empty slots or new rows (max 10 characters)",
                children: [
                  o.jsx(pl, { className: "w-3 h-3" }),
                  "Import character images",
                ],
              }),
              o.jsx("button", {
                type: "button",
                onClick: Pd,
                disabled: _prepBusy || !s.some((F) => F.name.trim()),
                title:
                  "Create these characters natively in Flow (reusable by name in prompts)",
                className: J(
                  "btn-accent text-[10px] px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5",
                  _prepBusy
                    ? "cursor-wait opacity-90"
                    : s.some((F) => F.name.trim())
                      ? ""
                      : "opacity-50 cursor-not-allowed",
                ),
                children: GF_PREP_LABEL[(settings && settings.language) || "en"] || GF_PREP_LABEL.en,
              }),
              _prepBusy &&
                o.jsxs("span", {
                  className: "text-[10px] text-accent-400 flex items-center gap-1 whitespace-nowrap",
                  children: [
                    o.jsx("span", {
                      className: "animate-spin",
                      style: { width: "9px", height: "9px", border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "9999px", display: "inline-block" },
                    }),
                    _prepTotal ? `${_prepDone}/${_prepTotal}` : "…",
                  ],
                }),
              o.jsx("div", { className: "flex-1" }),
              !charOnly && o.jsxs("button", {
                type: "button",
                onClick: O,
                className:
                  "btn-secondary text-[10px] px-2 py-1 flex items-center gap-1",
                children: [
                  o.jsx(Qa, { className: "w-3 h-3" }),
                  "Import Prompts",
                ],
              }),
            ],
          }),
          o.jsx("input", {
            ref: x,
            type: "file",
            accept: "image/*",
            className: "hidden",
            onChange: E,
          }),
          o.jsx("input", {
            ref: c,
            type: "file",
            accept: "image/*",
            multiple: !0,
            onChange: (k) => {
              if (m.current) {
                ((m.current = !1), S(k, "start"));
                return;
              }
              S(k, "start");
            },
            className: "hidden",
          }),
          o.jsxs("div", {
            className:
              "flex-1 min-h-[6rem] min-w-0 overflow-y-auto overflow-x-hidden rounded-lg border border-surface-700/40 bg-surface-900/20 px-1",
            children: [
              o.jsxs("div", {
                className:
                  "flex items-center justify-between mb-1 sticky top-0 z-[1] bg-surface-900/95 backdrop-blur-sm py-1 -mx-1 px-2 border-b border-surface-700/30",
                children: [
                  o.jsxs("span", {
                    className: "text-[10px] font-medium text-surface-400",
                    children: ["Characters (", s.length, ")"],
                  }),
                  o.jsx("div", {
                    className: "flex gap-2",
                    children: o.jsxs("button", {
                      type: "button",
                      onClick: Ud,
                      disabled: ls,
                      title: ls
                        ? `Maximum ${Gt} characters`
                        : "Add character row",
                      className: J(
                        "text-[10px] flex items-center gap-1",
                        ls
                          ? "text-surface-600 cursor-not-allowed"
                          : "text-primary-400 hover:text-primary-300",
                      ),
                      children: [
                        o.jsx(Xn, { className: "w-3 h-3" }),
                        "Add character",
                      ],
                    }),
                  }),
                ],
              }),
              s.length === 0
                ? o.jsx("p", {
                    className: "text-[9px] text-surface-500 px-2 py-2",
                    children: "No characters — prompts run as text-only.",
                  })
                : o.jsxs("div", {
                    className: "space-y-1 pb-1",
                    children: [
                      o.jsxs("div", {
                        className:
                          "grid gap-1 text-[9px] text-surface-500 font-medium px-2",
                        style: { gridTemplateColumns: "16px 45px 1fr 1fr 68px 18px 16px" },
                        children: [
                          o.jsx("span", { children: "№" }),
                          o.jsx("span", { children: "IMG" }),
                          o.jsx("span", { children: "NAME" }),
                          o.jsx("span", { children: "TEMPERAMENT" }),
                          o.jsx("span", { children: "VOICE" }),
                          o.jsx("span", {}),
                          o.jsx("span", {}),
                        ],
                      }),
                      s.map((k, _) =>
                        o.jsxs(
                          "div",
                          {
                            className:
                              "grid gap-1 items-center p-1.5 rounded-lg bg-surface-800/50",
                            style: { gridTemplateColumns: "16px 45px 1fr 1fr 68px 18px 16px" },
                            children: [
                              o.jsx("span", {
                                className:
                                  "text-[10px] text-surface-400 text-center",
                                children: _ + 1,
                              }),
                              o.jsx("button", {
                                type: "button",
                                className: J(
                                  "w-10 h-8 rounded border border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-colors",
                                  k.image
                                    ? "border-primary-500/50 hover:border-primary-400"
                                    : "border-surface-600 hover:border-primary-500",
                                ),
                                onClick: () => {
                                  var C;
                                  (j(k.id),
                                    (C = x.current) == null || C.click());
                                },
                                title: k.image ? "Replace image" : "Add image",
                                children: k.image
                                  ? o.jsx("img", {
                                      src: k.image.preview,
                                      alt: "",
                                      className: "w-full h-full object-cover",
                                    })
                                  : o.jsx(Xn, {
                                      className: "w-3 h-3 text-surface-500",
                                    }),
                              }),
                              o.jsx("input", {
                                type: "text",
                                value: k.name,
                                onChange: (C) => Ad(k.id, C.target.value),
                                placeholder: "Name",
                                className:
                                  "bg-surface-900/50 text-[10px] text-surface-300 px-1.5 py-1.5 rounded border border-surface-700 outline-none focus:border-primary-500 min-w-0",
                              }),
                              o.jsx("input", {
                                type: "text",
                                value: k.temperament || "",
                                onChange: (C) => AdTemp(k.id, C.target.value),
                                placeholder: "—",
                                title: "Temperament (optional)",
                                className:
                                  "bg-surface-900/50 text-[10px] text-surface-300 px-1.5 py-1.5 rounded border border-surface-700 outline-none focus:border-primary-500 min-w-0",
                              }),
                              o.jsxs("select", {
                                value: k.voice || "",
                                onChange: (C) => {
                                  AdVoice(k.id, C.target.value);
                                  if (playingCharId === k.id) {
                                    if (playingAudioRef.current) {
                                      playingAudioRef.current.pause();
                                      playingAudioRef.current = null;
                                    }
                                    setPlayingCharId(null);
                                  }
                                },
                                title: "Voice (optional — Flow auto-picks if empty)",
                                style: { backgroundColor: "#0f172a", color: "#cbd5e1" },
                                className:
                                  "text-[9px] px-0.5 py-1.5 rounded border border-surface-700 outline-none focus:border-primary-500 min-w-0",
                                children: [
                                  o.jsx("option", { value: "", style: { backgroundColor: "#0f172a", color: "#e2e8f0" }, children: "Авто" }),
                                  ...GF_VOICES.map((vn) => {
                                    const g = GF_VOICES_GENDER[vn.toLowerCase()] || "?";
                                    return o.jsx("option", { value: vn.toLowerCase(), style: { backgroundColor: "#0f172a", color: "#e2e8f0" }, children: `${vn} (${g})` }, vn);
                                  }),
                                ],
                              }),
                              o.jsx("button", {
                                type: "button",
                                disabled: !k.voice,
                                onClick: () => {
                                  if (!k.voice) return;
                                  if (playingCharId === k.id) {
                                    if (playingAudioRef.current) {
                                      playingAudioRef.current.pause();
                                      playingAudioRef.current = null;
                                    }
                                    setPlayingCharId(null);
                                  } else {
                                    if (playingAudioRef.current) {
                                      playingAudioRef.current.pause();
                                    }
                                    const realVoice = GF_VOICES.find(v => v.toLowerCase() === k.voice.toLowerCase()) || k.voice;
                                    const url = `https://gstatic.com/aitestkitchen/voices/samples/${realVoice}.wav`;
                                    const aud = new Audio(url);
                                    playingAudioRef.current = aud;
                                    setPlayingCharId(k.id);
                                    aud.play().catch((err) => {
                                      console.warn("Audio play failed:", err);
                                      setPlayingCharId(null);
                                      playingAudioRef.current = null;
                                    });
                                    aud.onended = () => {
                                      setPlayingCharId(null);
                                      playingAudioRef.current = null;
                                    };
                                  }
                                },
                                className: `p-1 transition-colors flex items-center justify-center ${
                                  !k.voice
                                    ? "text-surface-600 opacity-20 cursor-not-allowed"
                                    : playingCharId === k.id
                                      ? "text-accent-400 hover:text-accent-300 animate-pulse"
                                      : "text-accent-500 hover:text-accent-400"
                                }`,
                                title: !k.voice ? "Select a voice first" : playingCharId === k.id ? "Pause voice preview" : "Play voice preview",
                                children: o.jsx(playingCharId === k.id ? hh : Ka, { className: "w-3 h-3" }),
                              }),
                              o.jsx("button", {
                                type: "button",
                                onClick: () => Od(k.id),
                                className:
                                  "p-1 text-surface-500 hover:text-red-400 transition-colors",
                                title: "Remove character",
                                children: o.jsx(Lr, { className: "w-3 h-3" }),
                              }),
                            ],
                          },
                          k.id,
                        ),
                      ),
                    ],
                  }),
            ],
          }),
          o.jsx(GfObjects, {}),
          !charOnly && o.jsxs("div", {
            className:
              "flex-shrink-0 pt-2 border-t border-surface-700 space-y-1 min-w-0 max-w-full",
            children: [
              o.jsx("div", {
                className: "text-[10px] font-medium text-surface-400 px-1",
                children: "Prompts",
              }),
              o.jsx("textarea", {
                value: a,
                onChange: (k) => u(k.target.value),
                placeholder:
                  "Enter prompts (one per line, or separated by a blank line)",
                className:
                  "input-field min-h-[3.25rem] max-h-[5.25rem] resize-y text-[11px] w-full min-w-0 max-w-full box-border",
                rows: 3,
              }),
            ],
          }),
          !charOnly && o.jsxs("div", {
            className:
              "flex-shrink-0 flex items-center justify-between pt-2 pb-0.5 border-t border-surface-700",
            children: [
              o.jsx("div", {
                className: "flex items-center gap-2",
                children: o.jsxs("button", {
                  type: "button",
                  onClick: un,
                  className:
                    "text-[10px] text-surface-400 hover:text-red-400 flex items-center gap-1",
                  children: [o.jsx(en, { className: "w-3 h-3" }), "Clear All"],
                }),
              }),
              o.jsxs("button", {
                type: "button",
                onClick: B,
                disabled: ie === 0,
                className: "btn-accent text-[10px] px-3 py-1.5",
                children: ["Save and Close (", ie, ")"],
              }),
            ],
          }),
        ],
      })
    : o.jsxs("div", {
        className: "glass-card p-3 space-y-3 flex-shrink-0 flex flex-col",
        children: [
          o.jsxs("div", {
            className: "flex items-center justify-between",
            children: [
              o.jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  o.jsx("span", {
                    className: "text-xs font-semibold text-surface-300",
                    children: "Image Prompt Editor",
                  }),
                  o.jsx("span", {
                    className:
                      "text-[10px] px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400",
                    children: Ti(),
                  }),
                ],
              }),
              o.jsxs("div", {
                className: "flex items-center gap-2 text-[10px]",
                children: [
                  o.jsxs("span", {
                    className: "text-green-400",
                    children: [ie, " ready"],
                  }),
                  ye > 0 &&
                    o.jsxs("span", {
                      className: "text-yellow-400",
                      children: [ye, " needs"],
                    }),
                  Fe > 0 &&
                    o.jsxs("span", {
                      className: "text-surface-500",
                      children: [Fe, " empty"],
                    }),
                ],
              }),
            ],
          }),
          o.jsxs("div", {
            className: "flex items-center gap-2 flex-wrap",
            children: [
              jt &&
                o.jsxs("button", {
                  onClick: () => {
                    var k;
                    (w(null), (k = c.current) == null || k.click());
                  },
                  className:
                    "btn-primary text-[10px] px-2 py-1 flex items-center gap-1",
                  title:
                    n === "multi"
                      ? "Select images - will be paired as 1-2, 3-4, 5-6..."
                      : "Select images - will be chained as 1-2, 2-3, 3-4...",
                  children: [
                    o.jsx(pl, { className: "w-3 h-3" }),
                    "Import All (",
                    n === "multi" ? "pairs" : "chain",
                    ")",
                  ],
                }),
              !jt &&
                o.jsxs("button", {
                  onClick: () => {
                    var k;
                    (w(null),
                      (m.current = !0),
                      (k = c.current) == null || k.click());
                  },
                  className:
                    "btn-secondary text-[10px] px-2 py-1 flex items-center gap-1",
                  children: [
                    o.jsx(pl, { className: "w-3 h-3" }),
                    "Import Images",
                  ],
                }),
              o.jsx("div", { className: "flex-1" }),
              o.jsxs("button", {
                onClick: O,
                className:
                  "btn-secondary text-[10px] px-2 py-1 flex items-center gap-1",
                children: [
                  o.jsx(Qa, { className: "w-3 h-3" }),
                  "Import Prompts",
                ],
              }),
            ],
          }),
          jt &&
            o.jsx("div", {
              className: "text-[9px] text-surface-500 px-1",
              children:
                n === "multi"
                  ? "💡 Multi: 6 files → 3 rows (1+2, 3+4, 5+6) - independent pairs"
                  : "💡 Film: 4 files → 3 rows (1→2, 2→3, 3→4) - end becomes next start",
            }),
          o.jsx("input", {
            ref: c,
            type: "file",
            accept: "image/*",
            multiple: !0,
            onChange: (k) => {
              if (m.current) {
                ((m.current = !1), S(k, "start"));
                return;
              }
              v ? N(k, "start") : S(k, "start");
            },
            className: "hidden",
          }),
          o.jsx("input", {
            ref: h,
            type: "file",
            accept: "image/*",
            multiple: !v,
            onChange: (k) => (v ? N(k, "end") : S(k, "end")),
            className: "hidden",
          }),
          o.jsxs("div", {
            className: "overflow-y-auto space-y-1 flex-shrink-0",
            style: { maxHeight: "180px" },
            children: [
              o.jsxs("div", {
                className: J(
                  "grid gap-2 text-[9px] text-surface-500 font-medium px-2",
                  jt
                    ? "grid-cols-[20px_24px_56px_56px_1fr_60px_24px]"
                    : "grid-cols-[20px_24px_56px_1fr_60px_24px]",
                ),
                children: [
                  o.jsx("button", {
                    onClick: oe,
                    className: "flex items-center justify-center",
                    children: r.every((k) => k.selected)
                      ? o.jsx(Ga, { className: "w-3 h-3 text-primary-400" })
                      : o.jsx(To, { className: "w-3 h-3 text-surface-500" }),
                  }),
                  o.jsx("span", { children: "№" }),
                  o.jsx("span", { children: jt ? "START" : "IMAGE" }),
                  jt && o.jsx("span", { children: "END" }),
                  o.jsx("span", { children: "PROMPT" }),
                  o.jsx("span", { children: "STATUS" }),
                  o.jsx("span", {}),
                ],
              }),
              r.map((k, _) =>
                o.jsxs(
                  "div",
                  {
                    className: J(
                      "grid gap-2 items-center p-1.5 rounded-lg",
                      k.selected
                        ? "bg-primary-500/10 border border-primary-500/30"
                        : "bg-surface-800/50",
                      jt
                        ? "grid-cols-[20px_24px_56px_56px_1fr_60px_24px]"
                        : "grid-cols-[20px_24px_56px_1fr_60px_24px]",
                    ),
                    children: [
                      o.jsx("button", {
                        onClick: () => D(k.id),
                        className: "flex items-center justify-center",
                        children: k.selected
                          ? o.jsx(Ga, {
                              className: "w-3.5 h-3.5 text-primary-400",
                            })
                          : o.jsx(To, {
                              className:
                                "w-3.5 h-3.5 text-surface-500 hover:text-surface-300",
                            }),
                      }),
                      o.jsx("span", {
                        className: "text-[10px] text-surface-400 text-center",
                        children: _ + 1,
                      }),
                      o.jsx("div", {
                        className: J(
                          "w-12 h-9 rounded border border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-colors",
                          k.startImage
                            ? "border-primary-500/50 hover:border-primary-400"
                            : "border-surface-600 hover:border-primary-500",
                        ),
                        onClick: () => g(k.id, "start"),
                        title: k.startImage
                          ? "Click to replace image"
                          : "Click to add image",
                        children: k.startImage
                          ? o.jsx("img", {
                              src: k.startImage.preview,
                              alt: "Start",
                              className: "w-full h-full object-cover",
                            })
                          : o.jsx(Xn, {
                              className: "w-3 h-3 text-surface-500",
                            }),
                      }),
                      jt &&
                        o.jsx("div", {
                          className: J(
                            "w-12 h-9 rounded border border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-colors",
                            k.endImage
                              ? "border-accent-500/50 hover:border-accent-400"
                              : "border-surface-600 hover:border-accent-500",
                          ),
                          onClick: () => g(k.id, "end"),
                          title: k.endImage
                            ? "Click to replace image"
                            : "Click to add image",
                          children: k.endImage
                            ? o.jsx("img", {
                                src: k.endImage.preview,
                                alt: "End",
                                className: "w-full h-full object-cover",
                              })
                            : o.jsx(Xn, {
                                className: "w-3 h-3 text-surface-500",
                              }),
                        }),
                      o.jsx("input", {
                        type: "text",
                        value: k.prompt,
                        onChange: (C) => T(k.id, C.target.value),
                        placeholder: "Enter prompt...",
                        className:
                          "bg-surface-900/50 text-[10px] text-surface-300 px-2 py-1.5 rounded border border-surface-700 outline-none focus:border-primary-500 min-w-0",
                      }),
                      Dd(k.status),
                      o.jsx("button", {
                        onClick: () => Te(k.id),
                        className:
                          "p-1 text-surface-500 hover:text-red-400 transition-colors",
                        title: r.length <= 1 ? "Clear row" : "Remove row",
                        children: o.jsx(Lr, { className: "w-3 h-3" }),
                      }),
                    ],
                  },
                  k.id,
                ),
              ),
            ],
          }),
          o.jsxs("div", {
            className:
              "flex items-center justify-between pt-2 border-t border-surface-700",
            children: [
              o.jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                  o.jsxs("button", {
                    onClick: fe,
                    className:
                      "text-[10px] text-surface-400 hover:text-white flex items-center gap-1",
                    children: [o.jsx(Xn, { className: "w-3 h-3" }), "Add Row"],
                  }),
                  rt > 0 &&
                    o.jsxs("button", {
                      onClick: Ke,
                      className:
                        "text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1",
                      children: [
                        o.jsx(en, { className: "w-3 h-3" }),
                        "Delete Selected (",
                        rt,
                        ")",
                      ],
                    }),
                  o.jsxs("button", {
                    onClick: I,
                    className:
                      "text-[10px] text-surface-400 hover:text-red-400 flex items-center gap-1",
                    children: [
                      o.jsx(en, { className: "w-3 h-3" }),
                      "Clear All",
                    ],
                  }),
                ],
              }),
              o.jsxs("button", {
                onClick: B,
                disabled: ie === 0,
                className: "btn-accent text-[10px] px-3 py-1.5",
                children: ["Save and Close (", ie, ")"],
              }),
            ],
          }),
        ],
      });
}
function z0() {
  const [e, t] = z.useState(!1);
  return o.jsxs(o.Fragment, {
    children: [
      o.jsxs("div", {
        className:
          "min-h-[500px] flex flex-col items-center justify-center p-6 text-center",
        children: [
          o.jsx("div", {
            className:
              "w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-2xl shadow-primary-500/30 mb-6",
            children: o.jsx(Ri, { className: "w-10 h-10 text-white" }),
          }),
          o.jsx("h1", {
            className: "text-2xl font-bold text-white mb-2",
            children: "Welcome to GenFlow",
          }),
          o.jsx("p", {
            className: "text-surface-400 mb-8 max-w-xs",
            children:
              "AI-powered video & image automation for Veo 3, Grok, Banana and more",
          }),
          o.jsxs("div", {
            className: "w-full max-w-xs space-y-3 mb-8",
            children: [
              o.jsxs("div", {
                className:
                  "flex items-center gap-3 p-3 rounded-xl bg-surface-800/50 border border-surface-700/50",
                children: [
                  o.jsx("div", {
                    className:
                      "w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center",
                    children: o.jsx(rs, {
                      className: "w-5 h-5 text-primary-400",
                    }),
                  }),
                  o.jsxs("div", {
                    className: "text-left",
                    children: [
                      o.jsx("p", {
                        className: "text-sm font-medium text-white",
                        children: "10 Free Generations",
                      }),
                      o.jsx("p", {
                        className: "text-xs text-surface-400",
                        children: "Every day, no credit card",
                      }),
                    ],
                  }),
                ],
              }),
              o.jsxs("div", {
                className:
                  "flex items-center gap-3 p-3 rounded-xl bg-surface-800/50 border border-surface-700/50",
                children: [
                  o.jsx("div", {
                    className:
                      "w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center",
                    children: o.jsx(Cd, {
                      className: "w-5 h-5 text-accent-400",
                    }),
                  }),
                  o.jsxs("div", {
                    className: "text-left",
                    children: [
                      o.jsx("p", {
                        className: "text-sm font-medium text-white",
                        children: "Secure & Private",
                      }),
                      o.jsx("p", {
                        className: "text-xs text-surface-400",
                        children: "Your prompts stay yours",
                      }),
                    ],
                  }),
                ],
              }),
              o.jsxs("div", {
                className:
                  "flex items-center gap-3 p-3 rounded-xl bg-surface-800/50 border border-surface-700/50",
                children: [
                  o.jsx("div", {
                    className:
                      "w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center",
                    children: o.jsx(pr, {
                      className: "w-5 h-5 text-green-400",
                    }),
                  }),
                  o.jsxs("div", {
                    className: "text-left",
                    children: [
                      o.jsx("p", {
                        className: "text-sm font-medium text-white",
                        children: "Premium Available",
                      }),
                      o.jsx("p", {
                        className: "text-xs text-surface-400",
                        children: "Unlimited with crypto payment",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          o.jsxs("button", {
            onClick: () => t(!0),
            className:
              "w-full max-w-xs py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all flex items-center justify-center gap-2",
            children: ["Get Started", o.jsx(kd, { className: "w-5 h-5" })],
          }),
          o.jsx("p", {
            className: "text-xs text-surface-500 mt-4",
            children: "Free account • No credit card required",
          }),
        ],
      }),
      o.jsx(Md, { isOpen: e, onClose: () => t(!1) }),
    ],
  });
}
const U0 = [
  {
    id: "week",
    name: "Weekly",
    price: 5,
    currency: "USDT",
    generations: 500,
    days: 7,
    popular: !1,
  },
  {
    id: "month",
    name: "Monthly",
    price: 15,
    currency: "USDT",
    generations: "Unlimited",
    days: 30,
    popular: !0,
  },
  {
    id: "year",
    name: "Yearly",
    price: 99,
    currency: "USDT",
    generations: "Unlimited",
    days: 365,
    popular: !1,
    save: "45%",
  },
];
function O0({ isOpen: e, onClose: t, remainingGenerations: n = 0 }) {
  const [r, l] = z.useState(U0),
    [s, i] = z.useState("month"),
    [a, u] = z.useState(!1),
    [c, h] = z.useState(null),
    [x, m] = z.useState(!1),
    [v, w] = z.useState(null),
    [y, j] = z.useState(""),
    [f, d] = z.useState(!1),
    [p, g] = z.useState(null);
  if (
    (z.useEffect(() => {
      e &&
        Se.getPrices()
          .then((b) => {
            l([
              {
                id: "week",
                name: "Weekly",
                price: b.week.price,
                currency: "USDT",
                generations:
                  b.week.generations === -1 ? "Unlimited" : b.week.generations,
                days: b.week.days,
                popular: !1,
              },
              {
                id: "month",
                name: "Monthly",
                price: b.month.price,
                currency: "USDT",
                generations:
                  b.month.generations === -1
                    ? "Unlimited"
                    : b.month.generations,
                days: b.month.days,
                popular: !0,
              },
              {
                id: "year",
                name: "Yearly",
                price: b.year.price,
                currency: "USDT",
                generations:
                  b.year.generations === -1 ? "Unlimited" : b.year.generations,
                days: b.year.days,
                popular: !1,
                save: "45%",
              },
            ]);
          })
          .catch(() => {});
    }, [e]),
    !e)
  )
    return null;
  const N = async () => {
      (w(null), u(!0));
      try {
        await Se.init();
        const b = await Se.createCryptoPayment(s);
        b.pay_url
          ? (h(b.pay_url), window.open(b.pay_url, "_blank"))
          : w("Could not create payment link");
      } catch (b) {
        const L = b instanceof Error ? b.message : "Payment failed";
        (w(L), console.error("Payment error:", b));
      } finally {
        u(!1);
      }
    },
    R = () => {
      c &&
        (navigator.clipboard.writeText(c), m(!0), setTimeout(() => m(!1), 2e3));
    },
    E = async () => {
      if (y.trim()) {
        (d(!0), w(null), g(null));
        try {
          await Se.init();
          const b = await Se.activatePromo(y.trim());
          if (b.success) {
            (g(b.message), j(""));
            const L = await Se.getCurrentUser();
            (chrome.storage.local.set({ user: L }),
              setTimeout(() => {
                (t(), window.location.reload());
              }, 2e3));
          }
        } catch (b) {
          const L = b instanceof Error ? b.message : "Invalid promo code";
          w(L);
        } finally {
          d(!1);
        }
      }
    },
    S = r.find((b) => b.id === s) ?? r[1];
  return o.jsxs("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center",
    children: [
      o.jsx("div", {
        className: "absolute inset-0 bg-black/70 backdrop-blur-sm",
        onClick: t,
      }),
      o.jsx("div", {
        className:
          "relative w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200",
        children: o.jsxs("div", {
          className:
            "glass-panel p-6 rounded-2xl border border-surface-700/50 shadow-2xl",
          children: [
            o.jsx("button", {
              onClick: t,
              className:
                "absolute top-4 right-4 p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700/50 transition-colors",
              children: o.jsx(Lr, { className: "w-5 h-5" }),
            }),
            o.jsxs("div", {
              className: "text-center mb-6",
              children: [
                o.jsx("div", {
                  className:
                    "w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-accent-500/25",
                  children: o.jsx(pr, { className: "w-8 h-8 text-white" }),
                }),
                n === 0
                  ? o.jsxs(o.Fragment, {
                      children: [
                        o.jsx("h2", {
                          className: "text-xl font-bold text-white",
                          children: "Daily Limit Reached",
                        }),
                        o.jsx("p", {
                          className: "text-sm text-surface-400 mt-1",
                          children:
                            "Upgrade to Premium for unlimited generations",
                        }),
                      ],
                    })
                  : o.jsxs(o.Fragment, {
                      children: [
                        o.jsx("h2", {
                          className: "text-xl font-bold text-white",
                          children: "Upgrade to Premium",
                        }),
                        o.jsx("p", {
                          className: "text-sm text-surface-400 mt-1",
                          children: "Get unlimited AI generations",
                        }),
                      ],
                    }),
              ],
            }),
            o.jsx("div", {
              className: "space-y-3 mb-6",
              children: r.map((b) =>
                o.jsxs(
                  "button",
                  {
                    onClick: () => i(b.id),
                    className: J(
                      "w-full p-4 rounded-xl border-2 transition-all text-left relative",
                      s === b.id
                        ? "border-accent-500 bg-accent-500/10"
                        : "border-surface-700 bg-surface-800/50 hover:border-surface-600",
                    ),
                    children: [
                      b.popular &&
                        o.jsx("span", {
                          className:
                            "absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-accent-500 text-[10px] font-bold text-white",
                          children: "POPULAR",
                        }),
                      b.save &&
                        o.jsxs("span", {
                          className:
                            "absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-green-500 text-[10px] font-bold text-white",
                          children: ["SAVE ", b.save],
                        }),
                      o.jsxs("div", {
                        className: "flex items-center justify-between",
                        children: [
                          o.jsxs("div", {
                            children: [
                              o.jsx("p", {
                                className: "font-semibold text-white",
                                children: b.name,
                              }),
                              o.jsx("p", {
                                className: "text-xs text-surface-400",
                                children:
                                  b.generations === "Unlimited"
                                    ? "Unlimited"
                                    : `${b.generations} generations`,
                              }),
                            ],
                          }),
                          o.jsxs("div", {
                            className: "text-right",
                            children: [
                              o.jsxs("p", {
                                className: "text-lg font-bold text-white",
                                children: ["$", b.price],
                              }),
                              o.jsx("p", {
                                className: "text-xs text-surface-400",
                                children: b.currency,
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  },
                  b.id,
                ),
              ),
            }),
            o.jsxs("div", {
              className: "p-4 rounded-xl bg-surface-800/30 mb-6",
              children: [
                o.jsx("p", {
                  className: "text-xs font-medium text-surface-300 mb-3",
                  children: "Premium includes:",
                }),
                o.jsx("div", {
                  className: "grid grid-cols-2 gap-2 text-xs",
                  children: [
                    "Unlimited generations",
                    "Priority queue",
                    "All AI models",
                    "4K quality",
                    "Faster processing",
                    "No daily limits",
                  ].map((b) =>
                    o.jsxs(
                      "div",
                      {
                        className: "flex items-center gap-1.5 text-surface-400",
                        children: [
                          o.jsx(eh, { className: "w-3 h-3 text-green-400" }),
                          b,
                        ],
                      },
                      b,
                    ),
                  ),
                }),
              ],
            }),
            o.jsxs("div", {
              className:
                "mb-4 p-4 rounded-xl bg-surface-800/50 border border-surface-700",
              children: [
                o.jsx("p", {
                  className: "text-xs font-medium text-surface-300 mb-2",
                  children: "Have a promo code?",
                }),
                o.jsxs("div", {
                  className: "flex gap-2",
                  children: [
                    o.jsx("input", {
                      type: "text",
                      value: y,
                      onChange: (b) => j(b.target.value.toUpperCase()),
                      placeholder: "Enter code",
                      className:
                        "flex-1 px-3 py-2 rounded-lg bg-surface-900 border border-surface-700 text-white text-sm placeholder-surface-500 focus:outline-none focus:border-primary-500",
                      disabled: f,
                    }),
                    o.jsx("button", {
                      onClick: E,
                      disabled: f || !y.trim(),
                      className:
                        "px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                      children: f
                        ? o.jsx(Al, { className: "w-4 h-4 animate-spin" })
                        : "Apply",
                    }),
                  ],
                }),
                p &&
                  o.jsxs("div", {
                    className:
                      "mt-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2",
                    children: [
                      o.jsx(fr, {
                        className: "w-4 h-4 text-green-400 shrink-0",
                      }),
                      o.jsx("p", {
                        className: "text-xs text-green-400",
                        children: p,
                      }),
                    ],
                  }),
              ],
            }),
            v &&
              o.jsxs("div", {
                className:
                  "mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2",
                children: [
                  o.jsx(Lo, { className: "w-4 h-4 text-red-400 shrink-0" }),
                  o.jsx("p", {
                    className: "text-sm text-red-400",
                    children: v,
                  }),
                ],
              }),
            c
              ? o.jsxs("div", {
                  className: "space-y-3",
                  children: [
                    o.jsx("div", {
                      className:
                        "p-3 rounded-xl bg-green-500/10 border border-green-500/20",
                      children: o.jsxs("p", {
                        className:
                          "text-sm text-green-400 font-medium flex items-center gap-2",
                        children: [
                          o.jsx(fr, { className: "w-4 h-4" }),
                          "Payment link created!",
                        ],
                      }),
                    }),
                    o.jsxs("div", {
                      className: "flex gap-2",
                      children: [
                        o.jsxs("button", {
                          onClick: () => window.open(c, "_blank"),
                          className:
                            "flex-1 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-accent-600 to-accent-500 hover:from-accent-500 hover:to-accent-400 transition-all flex items-center justify-center gap-2",
                          children: [
                            o.jsx(lh, { className: "w-4 h-4" }),
                            "Open Payment",
                          ],
                        }),
                        o.jsx("button", {
                          onClick: R,
                          className:
                            "px-4 py-3 rounded-xl bg-surface-700 hover:bg-surface-600 transition-colors",
                          children: x
                            ? o.jsx(fr, { className: "w-5 h-5 text-green-400" })
                            : o.jsx(Nd, {
                                className: "w-5 h-5 text-surface-300",
                              }),
                        }),
                      ],
                    }),
                    o.jsx("p", {
                      className: "text-xs text-surface-500 text-center",
                      children: "Pay with USDT, TON, BTC or other crypto",
                    }),
                  ],
                })
              : o.jsx("button", {
                  onClick: N,
                  disabled: a,
                  className:
                    "w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-accent-600 to-yellow-500 hover:from-accent-500 hover:to-yellow-400 shadow-lg shadow-accent-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50",
                  children: a
                    ? o.jsx(Al, { className: "w-5 h-5 animate-spin" })
                    : o.jsxs(o.Fragment, {
                        children: [
                          o.jsx(rs, { className: "w-5 h-5" }),
                          "Pay $",
                          S.price,
                          " with Crypto",
                        ],
                      }),
                }),
            o.jsx("p", {
              className: "text-[10px] text-surface-500 text-center mt-4",
              children: "Secure payment via CryptoBot • Instant activation",
            }),
          ],
        }),
      }),
    ],
  });
}
function Os({ failedPrompts: e }) {
  if (e.length === 0) return null;
  const t = () => {
      chrome.runtime.sendMessage({ type: "RETRY_FAILED" });
    },
    n = (l) => {
      chrome.runtime.sendMessage({
        type: "RETRY_SINGLE_FAILED",
        payload: { promptId: l },
      });
    },
    r = (l) => {
      chrome.runtime
        .sendMessage({ type: "REMOVE_PROMPT", payload: { promptId: l } })
        .catch(() => {});
    };
  return o.jsxs("div", {
    className: "glass-card p-3 space-y-2",
    children: [
      o.jsxs("div", {
        className: "flex items-center justify-between",
        children: [
          o.jsxs("h4", {
            className:
              "text-xs font-semibold text-red-400 flex items-center gap-1.5",
            children: [
              o.jsx("span", {
                className: "w-2 h-2 rounded-full bg-red-500 animate-pulse",
              }),
              "Failed Prompts (",
              e.length,
              ")",
            ],
          }),
          o.jsx("button", {
            onClick: t,
            className:
              "px-2 py-1 text-[10px] font-medium rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors",
            children: "Retry All",
          }),
        ],
      }),
      o.jsx("div", {
        className: "space-y-1.5 max-h-32 overflow-y-auto",
        children: e.map((l) =>
          o.jsxs(
            "div",
            {
              className:
                "flex items-start gap-2 p-2 rounded-lg bg-surface-800/50 border border-red-500/10",
              children: [
                o.jsxs("div", {
                  className: "flex-1 min-w-0",
                  children: [
                    o.jsxs("p", {
                      className: "text-[11px] text-surface-300 truncate",
                      children: [
                        "#",
                        l.prompt.number,
                        ": ",
                        l.prompt.text.slice(0, 60),
                        l.prompt.text.length > 60 ? "..." : "",
                      ],
                    }),
                    o.jsx("p", {
                      className: "text-[10px] text-red-400/70 mt-0.5 truncate",
                      children: l.error,
                    }),
                  ],
                }),
                o.jsxs("div", {
                  className: "flex items-center gap-1 flex-shrink-0",
                  children: [
                    o.jsx("button", {
                      onClick: () => r(l.prompt.id),
                      className:
                        "p-0.5 text-surface-500 hover:text-red-400 transition-colors",
                      title: "Remove from list",
                      children: o.jsx(en, { className: "w-3 h-3" }),
                    }),
                    o.jsx("button", {
                      onClick: () => n(l.prompt.id),
                      className:
                        "px-1.5 py-0.5 text-[10px] rounded bg-surface-700 text-surface-300 hover:bg-surface-600 transition-colors",
                      title: "Retry this prompt",
                      children: "Retry",
                    }),
                  ],
                }),
              ],
            },
            l.prompt.id,
          ),
        ),
      }),
    ],
  });
}
function ErrorsPanel({ failedPrompts, onClose }) {
  const [activeTab, setActiveTab] = z.useState("download");
  const [expandedPromptId, setExpandedPromptId] = z.useState(null);
  const [editingTexts, setEditingTexts] = z.useState({});
  const [retryClicked, setRetryClicked] = z.useState({});
  const { activeTab: globalActiveTab, prompts: _livePrompts } = nt();
  const _isRetrying = (it) => { const lp = _livePrompts && it && it.prompt && _livePrompts.find((p) => p.id === it.prompt.id); return !!lp && (lp.status === "processing" || lp.status === "pending"); };
  const downloadErrors = failedPrompts.filter(
    (item) =>
      item.errorType === "UPSCALE_FAILED" ||
      item.prompt.errorType === "UPSCALE_FAILED",
  );
  const generationErrors = failedPrompts.filter(
    (item) =>
      item.errorType !== "UPSCALE_FAILED" &&
      item.prompt.errorType !== "UPSCALE_FAILED",
  );
  const handleTextChange = (promptId, val) => {
    setEditingTexts((prev) => ({ ...prev, [promptId]: val }));
    chrome.runtime.sendMessage({
      type: "UPDATE_FAILED_PROMPT_TEXT",
      payload: { promptId, text: val },
    });
  };
  const handleRetryUpscale = (promptId, text) => {
    if (retryClicked[promptId]) return;
    setRetryClicked((prev) => ({ ...prev, [promptId]: true }));
    setTimeout(
      () =>
        setRetryClicked((prev) => {
          const n = { ...prev };
          delete n[promptId];
          return n;
        }),
      3000,
    );
    chrome.runtime.sendMessage({
      type: "RETRY_UPSCALE",
      payload: { promptId, newText: text },
    });
  };
  const handleRetryGen = (promptId, text) => {
    if (retryClicked[promptId]) return;
    setRetryClicked((prev) => ({ ...prev, [promptId]: true }));
    setTimeout(
      () =>
        setRetryClicked((prev) => {
          const n = { ...prev };
          delete n[promptId];
          return n;
        }),
      3000,
    );
    chrome.runtime.sendMessage({
      type: "RETRY_SINGLE_FAILED",
      payload: { promptId, newText: text },
    });
  };
  const handleRemove = (promptId) => {
    chrome.runtime
      .sendMessage({
        type: "REMOVE_PROMPT",
        payload: { promptId },
      })
      .catch(() => {});
  };
  const currentList =
    activeTab === "download" ? downloadErrors : generationErrors;
  const _grouped = (() => {
    const _m = new Map();
    for (const _it of currentList) {
      const _k = _it.prompt.number;
      if (!_m.has(_k)) _m.set(_k, []);
      _m.get(_k).push(_it);
    }
    return Array.from(_m.values()).map((_arr) =>
      Object.assign({}, _arr[0], { _group: _arr }),
    );
  })();
  return o.jsxs("div", {
    className:
      "flex-1 min-h-0 flex flex-col gap-2 overflow-hidden text-white font-sans",
    children: [
      o.jsxs("div", {
        className:
          "flex gap-2 p-1 bg-surface-800/50 rounded-xl items-center justify-between shrink-0",
        children: [
          o.jsxs("button", {
            onClick: () => {
              setActiveTab("download");
              setExpandedPromptId(null);
            },
            className: J(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-medium text-xs transition-all duration-200",
              activeTab === "download"
                ? "bg-gradient-primary text-white shadow-glow"
                : "text-surface-400 hover:text-white hover:bg-surface-700/50",
            ),
            style: { cursor: "pointer" },
            children: ["Failed (download) [", downloadErrors.length, "]"],
          }),
          o.jsxs("button", {
            onClick: () => {
              setActiveTab("generation");
              setExpandedPromptId(null);
            },
            className: J(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-medium text-xs transition-all duration-200",
              activeTab === "generation"
                ? "bg-gradient-primary text-white shadow-glow"
                : "text-surface-400 hover:text-white hover:bg-surface-700/50",
            ),
            style: { cursor: "pointer" },
            children: ["Failed (generation) [", generationErrors.length, "]"],
          }),
        ],
      }),
      o.jsxs("div", {
        className:
          "glass-card p-3 flex-1 min-h-0 flex flex-col overflow-hidden border border-surface-700/50 rounded-2xl bg-surface-900/20",
        children: [
          o.jsx("div", {
            className: "flex-1 overflow-y-auto overflow-x-hidden pr-1 min-h-0",
            children:
              currentList.length === 0
                ? o.jsx("div", {
                    className:
                      "flex flex-col items-center justify-center h-48 text-surface-500 text-xs",
                    children: "No errors in this category",
                  })
                : o.jsxs("table", {
                    className: "w-full text-left border-collapse",
                    style: { tableLayout: "fixed" },
                    children: [
                      o.jsx("thead", {
                        children: o.jsxs("tr", {
                          className:
                            "border-b border-surface-800 text-[10px] text-surface-400 font-bold uppercase tracking-wider",
                          style: { borderBottomColor: "#1f1a3a" },
                          children: [
                            o.jsx("th", {
                              className: "pb-2",
                              style: { width: "2.25rem" },
                              children: "No",
                            }),
                            o.jsx("th", {
                              className: "pb-2",
                              style: { width: "auto" },
                              children: "Prompt",
                            }),
                            o.jsx("th", {
                              className: "pb-2",
                              style: { width: "4.5rem", textAlign: "center" },
                              children: o.jsx("button", {
                                onClick: () => {
                                  chrome.runtime.sendMessage({
                                    type: "CLEAR_ALL_FAILED",
                                  });
                                },
                                className:
                                  "text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer font-medium normal-case",
                                style: { cursor: "pointer" },
                                children: "Clear All",
                              }),
                            }),
                            o.jsx("th", {
                              className: "pb-2",
                              style: { width: "4rem", textAlign: "right" },
                              children: "Action",
                            }),
                          ].filter(Boolean),
                        }),
                      }),
                      o.jsx("tbody", {
                        children: _grouped.map((item, idx) => {
                          const promptText =
                            editingTexts[item.prompt.id] !== undefined
                              ? editingTexts[item.prompt.id]
                              : item.prompt.text;
                          const isExpanded =
                            expandedPromptId === item.prompt.id;
                          const rawUrls = (
                            item.previewUrl ||
                            item.prompt.previewUrl ||
                            item.resultUrl
                              ? (
                                  item.previewUrl ||
                                  item.prompt.previewUrl ||
                                  item.resultUrl
                                ).split(",")
                              : []
                          )
                            .map((url) => (url || "").trim())
                            .filter((url) => {
                              if (!url) return false;
                              if (url === "undefined" || url === "null")
                                return false;
                              if (url.startsWith("blob:")) return false;
                              return (
                                url.startsWith("data:") ||
                                url.startsWith("http:") ||
                                url.startsWith("https:") ||
                                url.startsWith("/")
                              );
                            });
                          const urls = Array.from(new Set(rawUrls));
                          return o.jsxs(
                            o.Fragment,
                            {
                              children: [
                                o.jsxs("tr", {
                                  className: J(
                                    "border-b border-surface-900/50 text-[11px] align-middle",
                                    !isExpanded && "hover:bg-surface-800/20",
                                  ),
                                  style: {
                                    borderBottomColor: "#191430",
                                    backgroundColor: isExpanded
                                      ? "rgba(31, 26, 58, 0.2)"
                                      : "transparent",
                                  },
                                  children: [
                                    o.jsx("td", {
                                      className:
                                        "py-2.5 text-surface-400 font-mono",
                                      children:
                                        (item.prompt.number != null
                                          ? item.prompt.number
                                          : idx + 1) +
                                        (item._group && item._group.length > 1
                                          ? " ×" + item._group.length
                                          : ""),
                                    }),
                                    o.jsx("td", {
                                      className: "py-2.5 pr-2",
                                      children: o.jsxs("div", {
                                        className:
                                          "flex items-center gap-1.5 w-full",
                                        style: {
                                          display: "flex",
                                          alignItems: "center",
                                          width: "100%",
                                          gap: "6px",
                                        },
                                        children: [
                                          o.jsx("span", {
                                            className:
                                              "truncate flex-1 text-surface-300",
                                            style: {
                                              flex: "1 1 auto",
                                              minWidth: 0,
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                            },
                                            title: promptText,
                                            children: promptText,
                                          }),
                                          o.jsx("button", {
                                            onClick: () =>
                                              setExpandedPromptId(
                                                isExpanded
                                                  ? null
                                                  : item.prompt.id,
                                              ),
                                            className:
                                              "p-0.5 rounded hover:bg-surface-800 text-surface-400 hover:text-white transition-colors flex-shrink-0",
                                            style: {
                                              cursor: "pointer",
                                              flexShrink: 0,
                                            },
                                            children: isExpanded ? "▲" : "▼",
                                          }),
                                        ],
                                      }),
                                    }),
                                    o.jsx("td", {
                                      className: "py-2.5",
                                      style: {
                                        textAlign: "center",
                                        width: "5rem",
                                      },
                                      children: o.jsx("button", {
                                        onClick: () => {
                                          if (!item.isRetrying)
                                            (item._group || [item]).forEach(
                                              (_m) =>
                                                handleRemove(_m.prompt.id),
                                            );
                                        },
                                        className: J(
                                          "p-1 rounded text-surface-500 hover:text-red-400 transition-colors",
                                          item.isRetrying &&
                                            "opacity-40 pointer-events-none",
                                        ),
                                        disabled: item.isRetrying,
                                        style: {
                                          cursor: item.isRetrying
                                            ? "default"
                                            : "pointer",
                                        },
                                        title: "Delete",
                                        children: o.jsx("svg", {
                                          className: "w-3.5 h-3.5",
                                          fill: "none",
                                          viewBox: "0 0 24 24",
                                          stroke: "currentColor",
                                          strokeWidth: "2",
                                          style: {
                                            display: "inline-block",
                                            width: "14px",
                                            height: "14px",
                                          },
                                          children: o.jsx("path", {
                                            strokeLinecap: "round",
                                            strokeLinejoin: "round",
                                            d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
                                          }),
                                        }),
                                      }),
                                    }),
                                    o.jsx("td", {
                                      className: "py-2.5 whitespace-nowrap",
                                      style: {
                                        textAlign: "right",
                                        width: "5rem",
                                      },
                                      children: item.isRetrying
                                        ? o.jsxs("span", {
                                            className:
                                              "text-[10px] text-surface-400 font-semibold",
                                            style: {
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: "4px",
                                            },
                                            children: [
                                              o.jsx(Al, {
                                                className:
                                                  "w-3 h-3 animate-spin text-accent-400",
                                              }),
                                              "Retrying...",
                                            ],
                                          })
                                        : activeTab === "download"
                                          ? o.jsx("button", {
                                              onClick: () =>
                                                (item._group || [item]).forEach(
                                                  (_m) =>
                                                    handleRetryUpscale(
                                                      _m.prompt.id,
                                                      promptText,
                                                    ),
                                                ),
                                              disabled:
                                                item.isRetrying ||
                                                retryClicked[item.prompt.id] ||
                                                _isRetrying(item),
                                              className: J(
                                                "px-2 py-0.5 text-[10px] font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors",
                                                (item.isRetrying ||
                                                  retryClicked[
                                                    item.prompt.id
                                                  ] ||
                                                  _isRetrying(item)) &&
                                                  "opacity-50 pointer-events-none",
                                              ),
                                              style: { cursor: "pointer" },
                                              children: _isRetrying(item) ? "Retrying…" : "Retry",
                                            })
                                          : o.jsx("button", {
                                              onClick: () =>
                                                (item._group || [item]).forEach(
                                                  (_m) =>
                                                    handleRetryGen(
                                                      _m.prompt.id,
                                                      promptText,
                                                    ),
                                                ),
                                              disabled:
                                                item.isRetrying ||
                                                retryClicked[item.prompt.id] ||
                                                _isRetrying(item),
                                              className: J(
                                                "px-2 py-0.5 text-[10px] font-semibold rounded bg-green-600 hover:bg-green-500 text-white transition-colors",
                                                (item.isRetrying ||
                                                  retryClicked[
                                                    item.prompt.id
                                                  ] ||
                                                  _isRetrying(item)) &&
                                                  "opacity-50 pointer-events-none",
                                              ),
                                              style: { cursor: "pointer" },
                                              children: _isRetrying(item) ? "Retrying…" : "Retry",
                                            }),
                                    }),
                                  ],
                                }),
                                isExpanded &&
                                  o.jsx("tr", {
                                    children: o.jsx("td", {
                                      colSpan: 4,
                                      className: "pb-2.5 pt-0.5 px-2",
                                      style: {
                                        backgroundColor:
                                          "rgba(31, 26, 58, 0.15)",
                                        borderBottom: "1px solid #1c1835",
                                      },
                                      children: o.jsxs("div", {
                                        className: "flex flex-col gap-1",
                                        children: [
                                          o.jsx("span", {
                                            className:
                                              "text-[9px] text-surface-500",
                                            children: "Edit prompt text:",
                                          }),
                                          o.jsx("textarea", {
                                            value: promptText,
                                            onChange: (e) =>
                                              handleTextChange(
                                                item.prompt.id,
                                                e.target.value,
                                              ),
                                            disabled: item.isRetrying,
                                            className: J(
                                              "w-full min-h-[45px] p-1.5 text-xs rounded border text-surface-100 resize-y focus:outline-none",
                                              item.isRetrying &&
                                                "opacity-50 cursor-not-allowed",
                                            ),
                                            style: {
                                              backgroundColor: item.isRetrying
                                                ? "#110e22"
                                                : "#0d0a1b",
                                              borderColor: "#2d2450",
                                              color: item.isRetrying
                                                ? "#a0aec0"
                                                : "#e2e8f0",
                                            },
                                            placeholder: "Enter prompt text...",
                                          }),
                                          item.error &&
                                            o.jsxs("div", {
                                              className:
                                                "text-[9px] rounded p-1 mt-1 border",
                                              style: {
                                                backgroundColor:
                                                  "rgba(239, 68, 68, 0.08)",
                                                borderColor:
                                                  "rgba(239, 68, 68, 0.2)",
                                                color: "#fca5a5",
                                              },
                                              children: [
                                                o.jsx("span", {
                                                  className: "font-semibold",
                                                  children: "Error: ",
                                                }),
                                                item.error,
                                              ],
                                            }),
                                        ],
                                      }),
                                    }),
                                  }),
                              ],
                            },
                            item.prompt.id,
                          );
                        }),
                      }),
                    ],
                  }),
          }),
        ],
      }),
      o.jsx("div", {
        className: "border-t border-surface-800 pt-2 shrink-0",
        style: { borderTopColor: "#1d1836" },
        children:
          activeTab === "download"
            ? o.jsx("button", {
                onClick: () => {
                  chrome.runtime.sendMessage({ type: "RETRY_ALL_UPSCALES" });
                  onClose();
                },
                disabled: downloadErrors.length === 0,
                className:
                  "w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-primary hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shadow-glow",
                style: { cursor: "pointer" },
                children: "Retry All Downloads",
              })
            : o.jsx("button", {
                onClick: () => {
                  chrome.runtime.sendMessage({ type: "RETRY_ALL_GENERATIONS" });
                  onClose();
                },
                disabled: generationErrors.length === 0,
                className:
                  "w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-primary hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shadow-glow",
                style: { cursor: "pointer" },
                children: "Retry All Generations",
              }),
      }),
    ],
  });
}
function A0() {
  const {
      showSettings: e,
      setShowSettings: setShowSettings,
      generationMode: t,
      activeTab: n,
      activeService: r,
      settings: l,
      setPrompts: s,
      setRunning: i,
      setPaused: a,
      setActiveSlots: u,
      setStopReason: setStopReason,
      addLog: c,
      setDownloadingAll: setDownloadingAll,
      updateRequired: updateRequired,
      minVersion: minVersion,
      gfRefVideo: gfRefVideo,
    } = nt(),
    [h, x] = z.useState(!0),
    [m, v] = z.useState({ daily_limit: 10, daily_generations: 0 }),
    [w, y] = z.useState(!1),
    [j, f] = z.useState(999999),
    [d, p] = z.useState([]),
    [showErrors, setShowErrors] = z.useState(!1);
  const _SL = nt((s) => s.showLogs);
  z.useEffect(() => {
    if (e) {
      setShowErrors(!1);
    }
  }, [e]);
  z.useEffect(() => {
    if (showErrors) {
      setShowSettings(!1);
    }
  }, [showErrors, setShowSettings]);
  z.useEffect(() => {
    if (_SL) setShowErrors(!1);
  }, [_SL]);
  z.useEffect(() => {
    setShowErrors(!1);
  }, [n, t, r]);
  (z.useEffect(() => {
    const E = (S) => {
      var b;
      if (S.type === "STATE_UPDATE" && S.payload) {
        const {
          isRunning: L,
          isPaused: T,
          activeSlots: D,
          prompts: oe,
          failedPromptsList: fe,
          isDownloadingAll: DL,
          stopReason: SR,
        } = S.payload;
        (typeof L == "boolean" && i(L),
          typeof T == "boolean" && a(T),
          typeof D == "number" && u(D),
          Array.isArray(oe) && (L || oe.length > 0) && s(oe),
          Array.isArray(fe) && p(fe),
          typeof DL == "boolean" && setDownloadingAll(DL),
          typeof SR == "string" && setStopReason(SR));
      }
      if (S.type === "LOG_MESSAGE" && (b = S.payload) != null && b.message) {
        const L = S.payload.type;
        c({
          type:
            L === "success" || L === "warning" || L === "error" ? L : "info",
          message: String(S.payload.message),
        });
      }
    };
    return (
      chrome.runtime.onMessage.addListener(E),
      chrome.runtime
        .sendMessage({ type: "GET_STATE" })
        .then((S) => {
          S != null &&
            S.payload &&
            E({ type: "STATE_UPDATE", payload: S.payload });
        })
        .catch(() => {}),
      () => {
        chrome.runtime.onMessage.removeListener(E);
      }
    );
  }, [s, i, a, u, c]),
    z.useEffect(() => {
      g();
      const _vh = () => {
        if (document.visibilityState === "visible") g();
      };
      document.addEventListener("visibilitychange", _vh);
      window.addEventListener("focus", _vh);
      return () => {
        document.removeEventListener("visibilitychange", _vh);
        window.removeEventListener("focus", _vh);
      };
    }, []));
  const g = async () => {
    try {
      const E = await chrome.storage.local.get(["user", "accessToken"]);
      if (E.user && E.accessToken) {
        v(E.user);
        try {
          await Se.init();
          const S = await Se.getCurrentUser();
          v(S);
          const U = await Se.getUsageStatus();
          const _rok = U && typeof U.remaining === "number" && !U._stale;
          f(
            r0
              ? 999
              : _rok
                ? U.remaining
                : (S.daily_limit ?? 10) - (S.daily_generations ?? 0),
          );
          chrome.storage.local.set({
            user: _rok
              ? {
                  ...S,
                  remaining: U.remaining,
                  daily_limit: U.daily_limit ?? S.daily_limit,
                  daily_generations:
                    typeof U.used === "number" ? U.used : S.daily_generations,
                }
              : S,
          });
        } catch {
          f(10);
        }
      }
    } catch (E) {
      console.error("Auth check failed:", E);
    } finally {
      x(!1);
    }
  };
  if (
    (z.useEffect(() => {
      var S, b;
      const E = (L) => {
        if (L.user && (v(L.user.newValue || null), L.user.newValue)) {
          const T = L.user.newValue;
          f(
            typeof T.remaining === "number"
              ? T.remaining
              : (T.daily_limit || 10) - (T.daily_generations || 0),
          );
        }
      };
      return (
        (b = (S = chrome.storage) == null ? void 0 : S.onChanged) == null ||
          b.addListener(E),
        () => {
          var L, T;
          return (T = (L = chrome.storage) == null ? void 0 : L.onChanged) ==
            null
            ? void 0
            : T.removeListener(E);
        }
      );
    }, []),
    h)
  )
    return o.jsx("div", {
      className:
        "flex flex-col h-full min-h-[500px] w-full min-w-[360px] max-w-[600px] bg-surface-950 items-center justify-center",
      children: o.jsx("div", {
        className:
          "w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center animate-pulse",
        children: o.jsxs("svg", {
          className: "w-6 h-6 text-white animate-spin",
          fill: "none",
          viewBox: "0 0 24 24",
          children: [
            o.jsx("circle", {
              className: "opacity-25",
              cx: "12",
              cy: "12",
              r: "10",
              stroke: "currentColor",
              strokeWidth: "4",
            }),
            o.jsx("path", {
              className: "opacity-75",
              fill: "currentColor",
              d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z",
            }),
          ],
        }),
      }),
    });
  if (updateRequired)
    return o.jsxs("div", {
      className:
        "flex flex-col h-full min-h-[500px] w-full min-w-[360px] max-w-[600px] bg-surface-950 items-center justify-center relative overflow-hidden px-6 text-center",
      children: [
        o.jsx("div", { className: "noise-overlay" }),
        o.jsx("div", {
          className:
            "absolute inset-0 bg-gradient-to-br from-red-900/30 via-surface-950 to-orange-900/20 pointer-events-none",
        }),
        o.jsx("div", {
          className:
            "absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow",
        }),
        o.jsxs("div", {
          className:
            "relative z-10 flex flex-col items-center max-w-sm glass-panel p-8 rounded-2xl border border-red-500/20 shadow-2xl shadow-red-500/10",
          children: [
            o.jsx("div", {
              className:
                "w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20",
              children: o.jsx("span", {
                className: "text-3xl text-white",
                children: "🚨",
              }),
            }),
            o.jsx("h2", {
              className: "text-xl font-bold text-white mb-2",
              children: "Update Required",
            }),
            o.jsxs("p", {
              className: "text-sm text-surface-400 mb-6 leading-relaxed",
              children: [
                "Your GenFlow extension version is outdated. Please update to at least version ",
                o.jsx("span", {
                  className: "text-accent-400 font-semibold",
                  children: minVersion,
                }),
                " to continue using the application.",
              ],
            }),
            o.jsx("a", {
              href: "https://grovex.space",
              target: "_blank",
              rel: "noopener noreferrer",
              className:
                "w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 cursor-pointer",
              children: "Download Update",
            }),
          ],
        }),
      ],
    });
  // Welcome/onboarding screen (z0) removed: never block on it. When the user state is empty
  // (fresh install OR after Sign out) render the normal UI — the soft gate ("Connect Telegram to
  // start" + the dropdown's Connect button) handles auth. N is null-safe so an empty m won't crash.
  const N =
      !!m && (m.subscription_type === "premium" || m.subscription_type === "unlimited"),
    R = () =>
      o.jsxs(o.Fragment, {
        children: [
          o.jsx("div", {
            style: { display: e ? "flex" : "none" },
            className: "flex-1 min-h-0 flex flex-col overflow-hidden",
            children: o.jsx(k0, {}),
          }),
          o.jsxs("div", {
            style: {
              display:
                !e && n === "video" && l.generationType === "image-to-video" && !gfRefVideo
                  ? "flex"
                  : "none",
            },
            className: "flex flex-col gap-2 flex-shrink-0",
            children: [o.jsx(tu, {}), o.jsx(Ms, {})],
          }),
          o.jsxs("div", {
            style: {
              display:
                !e && n === "image" && r === "banana" && t === "reference"
                  ? "flex"
                  : "none",
            },
            className: "flex flex-col gap-2 flex-1 min-h-0",
            children: [
              o.jsx("div", {
                className: "flex-1 min-h-0 flex flex-col overflow-hidden",
                children: o.jsx(tu, { charOnly: !0 }),
              }),
            ],
          }),
          o.jsx("div", {
            style: {
              display: !e && n === "video" && gfRefVideo ? "flex" : "none",
            },
            className: "flex flex-col gap-2 flex-1 min-h-0",
            children: o.jsx(tu, { charOnly: !0 }),
          }),
          o.jsxs("div", {
            style: {
              display:
                !e &&
                !(
                  (n === "video" && l.generationType === "image-to-video") ||
                  (n === "image" && r === "banana" && t === "reference") ||
                  (n === "video" && gfRefVideo)
                )
                  ? "flex"
                  : "none",
            },
            className: "flex flex-col gap-2 flex-shrink-0",
            children: [o.jsx(p0, {}), o.jsx(Ms, {})],
          }),
        ],
      });
  return o.jsxs("div", {
    className:
      "flex flex-col h-full w-full min-w-[360px] max-w-[600px] bg-surface-950 relative overflow-y-auto",
    children: [
      o.jsx("div", { className: "noise-overlay" }),
      o.jsx("div", {
        className:
          "absolute inset-0 bg-gradient-to-br from-primary-900/30 via-surface-950 to-accent-900/20 pointer-events-none",
      }),
      o.jsx("div", {
        className:
          "absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow",
      }),
      o.jsxs("div", {
        className: "relative z-10 flex flex-col flex-1",
        style: { minHeight: "700px" },
        children: [
          o.jsx(s0, {
            onOpenUpgrade: () =>
              gfOpenBot(""),
          }),
          !N &&
            j <= 3 &&
            j > 0 &&
            o.jsx("div", {
              className:
                "mx-4 mt-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 cursor-pointer hover:bg-yellow-500/20 transition-colors",
              onClick: () =>
                gfOpenBot(""),
              children: o.jsxs("p", {
                className: "text-xs text-yellow-400 text-center",
                children: [
                  "Only ",
                  j,
                  " generations left today. ",
                  o.jsx("span", {
                    className: "underline",
                    children: "Upgrade now",
                  }),
                ],
              }),
            }),
          !N &&
            j <= 0 &&
            o.jsx("div", {
              className:
                "mx-4 mt-2 p-4 rounded-xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 cursor-pointer hover:from-red-500/30 hover:to-orange-500/30 transition-all",
              onClick: () =>
                gfOpenBot(""),
              children: o.jsxs("div", {
                className: "flex items-center justify-center gap-3",
                children: [
                  o.jsx("div", {
                    className:
                      "w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center",
                    children: o.jsx("span", {
                      className: "text-xl",
                      children: "🔒",
                    }),
                  }),
                  o.jsxs("div", {
                    className: "text-left",
                    children: [
                      o.jsx("p", {
                        className: "text-sm text-red-300 font-semibold",
                        children: "Daily Limit Reached",
                      }),
                      o.jsx("p", {
                        className: "text-xs text-red-400/80",
                        children: "Click here to upgrade or enter promo code",
                      }),
                    ],
                  }),
                ],
              }),
            }),
          o.jsxs("div", {
            className:
              "flex-1 overflow-y-auto flex flex-col px-4 pb-4 space-y-3",
            children: [
              o.jsx(o0, {}),
              o.jsx(u0, {
                failedPrompts: d,
                onOpenErrors: () => {
                  setShowErrors(!showErrors);
                  nt.getState().setShowLogs(!1);
                },
                onCloseErrors: () => setShowErrors(!1),
                showErrors: showErrors,
              }),
              _SL
                ? o.jsx(GfBigLog, {})
                : showErrors
                  ? o.jsx(ErrorsPanel, {
                      failedPrompts: d,
                      onClose: () => setShowErrors(!1),
                    })
                  : R(),
              o.jsx(GfPreview, { hidden: showErrors || _SL || t === "reference" || (n === "video" && gfRefVideo) }),
              !showErrors && !_SL && !e && !(t === "reference" || (n === "video" && gfRefVideo)) && o.jsx("div", { className: "flex-1 min-h-0" }),
              !showErrors &&
                !_SL &&
                o.jsx(j0, {
                  onLimitReached: () =>
                    gfOpenBot(""),
                }),
            ],
          }),
          o.jsx(N0, {}),
        ],
      }),
      o.jsx(O0, { isOpen: w, onClose: () => y(!1), remainingGenerations: j }),
    ],
  });
}
As.createRoot(document.getElementById("root")).render(
  o.jsx(pu.StrictMode, { children: o.jsx(A0, {}) }),
);

(function () {
  try {
    if (window.__gfCooldownBar) return;
    window.__gfCooldownBar = true;
    var until = 0,
      reason = "";
    var bar = document.createElement("div");
    bar.id = "gf-cooldown-bar";
    bar.style.cssText =
      "position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#7f1d1d;color:#fff;font:600 12px/1.3 system-ui,sans-serif;padding:6px 12px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.4);display:none;pointer-events:none;white-space:nowrap";
    function mount() {
      if (!bar.isConnected && document.body) document.body.appendChild(bar);
    }
    function tick() {
      mount();
      var rem = until - Date.now();
      if (rem > 0) {
        bar.textContent =
          "\u23F8 " +
          (reason || "Rate limit") +
          " \u2014 resuming in " +
          Math.ceil(rem / 1000) +
          "s";
        bar.style.display = "block";
      } else {
        bar.style.display = "none";
      }
    }
    function ingest(p) {
      if (!p) return;
      if (typeof p.cooldownUntil === "number") until = p.cooldownUntil;
      if (typeof p.cooldownReason === "string") reason = p.cooldownReason;
      tick();
    }
    try {
      chrome.runtime.onMessage.addListener(function (m) {
        if (m && m.type === "STATE_UPDATE") ingest(m.payload);
      });
    } catch (e) {}
    try {
      chrome.runtime
        .sendMessage({ type: "GET_STATE" })
        .then(function (r) {
          if (r) ingest(r.payload);
        })
        .catch(function () {});
    } catch (e) {}
    setInterval(tick, 500);
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", tick);
    else tick();
  } catch (e) {
    console.warn("[GenFlow] cooldown bar err", e);
  }
})();

(function () {
  try {
    if (window.__gfStaleHint) return;
    window.__gfStaleHint = true;
    var curLang = function () {
      try { var s = [].slice.call(document.querySelectorAll("select")).find(function (x) { return x.options && x.options.length > 10 && [].some.call(x.options, function (o) { return o.value === "ru"; }); }); return (s && s.value) || "en"; } catch (e) { return "en"; }
    };
    var show = function () { try { gfShowSessionResetModal(curLang()); } catch (e) {} };
    try { chrome.runtime.onMessage.addListener(function (m) { if (m && m.type === "GF_FLOW_STALE_HINT") show(); }); } catch (e) {}
    try { chrome.storage.local.get(["gfFlowStaleHint"], function (o) { if (o && o.gfFlowStaleHint) setTimeout(show, 700); }); } catch (e) {}
  } catch (e) {}
})();

(function () {
  try {
    if (window.__gfI18n) return;
    window.__gfI18n = true;
    var DICT = {
      "Sign in with Telegram": {
        ru: "Вход через Telegram",
        es: "Iniciar sesión con Telegram",
        fr: "Se connecter avec Telegram",
        de: "Mit Telegram anmelden",
        pt: "Entrar com o Telegram",
        it: "Accedi con Telegram",
        ja: "Telegramでサインイン",
        ko: "Telegram으로 로그인",
        zh: "使用 Telegram 登录",
        hi: "Telegram से साइन इन करें",
        ar: "تسجيل الدخول عبر Telegram",
        id: "Masuk dengan Telegram",
        ms: "Log masuk dengan Telegram",
        vi: "Đăng nhập bằng Telegram",
        th: "เข้าสู่ระบบด้วย Telegram",
        tr: "Telegram ile giriş yap",
      },
      "Your subscription activates automatically after you sign in to the bot": {
        ru: "Подписка активируется автоматически после входа в бот",
        es: "Tu suscripción se activa automáticamente tras iniciar sesión en el bot",
        fr: "Votre abonnement s'active automatiquement après votre connexion au bot",
        de: "Dein Abo wird nach der Anmeldung im Bot automatisch aktiviert",
        pt: "Sua assinatura é ativada automaticamente após você entrar no bot",
        it: "L'abbonamento si attiva automaticamente dopo l'accesso al bot",
        ja: "ボットにサインインすると、サブスクリプションが自動的に有効になります",
        ko: "봇에 로그인하면 구독이 자동으로 활성화됩니다",
        zh: "登录机器人后，订阅将自动激活",
        hi: "बॉट में साइन इन करने के बाद आपकी सदस्यता स्वचालित रूप से सक्रिय हो जाती है",
        ar: "يتم تفعيل اشتراكك تلقائيًا بعد تسجيل الدخول إلى البوت",
        id: "Langganan Anda aktif otomatis setelah Anda masuk ke bot",
        ms: "Langganan anda diaktifkan secara automatik selepas anda log masuk ke bot",
        vi: "Gói đăng ký của bạn sẽ tự động kích hoạt sau khi bạn đăng nhập vào bot",
        th: "การสมัครสมาชิกจะเปิดใช้งานอัตโนมัติหลังจากคุณเข้าสู่ระบบบอท",
        tr: "Bota giriş yaptıktan sonra aboneliğiniz otomatik olarak etkinleşir",
      },
      "Waiting for confirmation in Telegram…": {
        ru: "Ожидание подтверждения в Telegram…",
        es: "Esperando confirmación en Telegram…",
        fr: "En attente de confirmation dans Telegram…",
        de: "Warte auf Bestätigung in Telegram…",
        pt: "Aguardando confirmação no Telegram…",
        it: "In attesa di conferma su Telegram…",
        ja: "Telegramでの確認を待っています…",
        ko: "Telegram에서 확인을 기다리는 중…",
        zh: "正在等待 Telegram 中的确认…",
        hi: "Telegram में पुष्टि की प्रतीक्षा…",
        ar: "في انتظار التأكيد في Telegram…",
        id: "Menunggu konfirmasi di Telegram…",
        ms: "Menunggu pengesahan dalam Telegram…",
        vi: "Đang chờ xác nhận trong Telegram…",
        th: "กำลังรอการยืนยันใน Telegram…",
        tr: "Telegram'da onay bekleniyor…",
      },
      "Please open the Telegram bot and tap Start": {
        ru: "Пожалуйста, откройте бота в Telegram и нажмите «Запустить»",
        es: "Abre el bot de Telegram y pulsa Iniciar",
        fr: "Ouvrez le bot Telegram et appuyez sur Démarrer",
        de: "Öffne den Telegram-Bot und tippe auf Start",
        pt: "Abra o bot do Telegram e toque em Iniciar",
        it: "Apri il bot di Telegram e tocca Avvia",
        ja: "Telegramボットを開いて「開始」をタップしてください",
        ko: "Telegram 봇을 열고 시작을 누르세요",
        zh: "请打开 Telegram 机器人并点击「开始」",
        hi: "कृपया Telegram बॉट खोलें और Start दबाएँ",
        ar: "افتح بوت Telegram واضغط على «ابدأ»",
        id: "Buka bot Telegram dan ketuk Mulai",
        ms: "Buka bot Telegram dan ketik Mula",
        vi: "Vui lòng mở bot Telegram và nhấn Bắt đầu",
        th: "โปรดเปิดบอท Telegram แล้วแตะเริ่ม",
        tr: "Telegram botunu açın ve Başlat'a dokunun",
      },
      "Cancel": {
        ru: "Отмена",
        es: "Cancelar",
        fr: "Annuler",
        de: "Abbrechen",
        pt: "Cancelar",
        it: "Annulla",
        ja: "キャンセル",
        ko: "취소",
        zh: "取消",
        hi: "रद्द करें",
        ar: "إلغاء",
        id: "Batal",
        ms: "Batal",
        vi: "Hủy",
        th: "ยกเลิก",
        tr: "İptal",
      },
      "Continue with Telegram": {
        ru: "Войти через Telegram",
        es: "Continuar con Telegram",
        fr: "Continuer avec Telegram",
        de: "Mit Telegram fortfahren",
        pt: "Continuar com o Telegram",
        it: "Continua con Telegram",
        ja: "Telegramで続ける",
        ko: "Telegram으로 계속하기",
        zh: "使用 Telegram 继续",
        hi: "Telegram के साथ जारी रखें",
        ar: "المتابعة عبر Telegram",
        id: "Lanjutkan dengan Telegram",
        ms: "Teruskan dengan Telegram",
        vi: "Tiếp tục với Telegram",
        th: "ดำเนินการต่อด้วย Telegram",
        tr: "Telegram ile devam et",
      },
      "⚠️ The button above works only if Telegram Desktop is installed": {
        ru: "⚠️ Кнопка выше работает только с установленным Telegram Desktop",
        es: "⚠️ El botón de arriba funciona solo con Telegram Desktop instalado",
        fr: "⚠️ Le bouton ci-dessus ne fonctionne qu'avec Telegram Desktop installé",
        de: "⚠️ Die Schaltfläche oben funktioniert nur mit installiertem Telegram Desktop",
        pt: "⚠️ O botão acima funciona apenas com o Telegram Desktop instalado",
        it: "⚠️ Il pulsante sopra funziona solo con Telegram Desktop installato",
        ja: "⚠️ 上のボタンはTelegram Desktopがインストールされている場合のみ機能します",
        ko: "⚠️ 위 버튼은 Telegram Desktop이 설치된 경우에만 작동합니다",
        zh: "⚠️ 上面的按钮仅在安装了 Telegram Desktop 时有效",
        hi: "⚠️ ऊपर वाला बटन केवल Telegram Desktop इंस्टॉल होने पर काम करता है",
        ar: "⚠️ الزر أعلاه يعمل فقط عند تثبيت Telegram Desktop",
        id: "⚠️ Tombol di atas hanya berfungsi jika Telegram Desktop terpasang",
        ms: "⚠️ Butang di atas hanya berfungsi jika Telegram Desktop dipasang",
        vi: "⚠️ Nút phía trên chỉ hoạt động khi đã cài Telegram Desktop",
        th: "⚠️ ปุ่มด้านบนใช้ได้เฉพาะเมื่อติดตั้ง Telegram Desktop แล้ว",
        tr: "⚠️ Yukarıdaki düğme yalnızca Telegram Desktop yüklüyse çalışır",
      },
      "Install Telegram Desktop": {
        ru: "Установить Telegram Desktop",
        es: "Instalar Telegram Desktop",
        fr: "Installer Telegram Desktop",
        de: "Telegram Desktop installieren",
        pt: "Instalar o Telegram Desktop",
        it: "Installa Telegram Desktop",
        ja: "Telegram Desktopをインストール",
        ko: "Telegram Desktop 설치",
        zh: "安装 Telegram Desktop",
        hi: "Telegram Desktop इंस्टॉल करें",
        ar: "تثبيت Telegram Desktop",
        id: "Pasang Telegram Desktop",
        ms: "Pasang Telegram Desktop",
        vi: "Cài đặt Telegram Desktop",
        th: "ติดตั้ง Telegram Desktop",
        tr: "Telegram Desktop'ı yükle",
      },
      "📱 From your phone": {
        ru: "📱 С телефона",
        es: "📱 Desde tu teléfono",
        fr: "📱 Depuis votre téléphone",
        de: "📱 Von deinem Telefon",
        pt: "📱 Pelo seu telefone",
        it: "📱 Dal tuo telefono",
        ja: "📱 スマホから",
        ko: "📱 휴대폰으로",
        zh: "📱 使用手机",
        hi: "📱 अपने फ़ोन से",
        ar: "📱 من هاتفك",
        id: "📱 Dari ponsel Anda",
        ms: "📱 Dari telefon anda",
        vi: "📱 Từ điện thoại của bạn",
        th: "📱 จากโทรศัพท์ของคุณ",
        tr: "📱 Telefonunuzdan",
      },
      "Preparing code…": {
        ru: "Готовим код…",
        es: "Preparando el código…",
        fr: "Préparation du code…",
        de: "Code wird vorbereitet…",
        pt: "Preparando o código…",
        it: "Preparazione del codice…",
        ja: "コードを準備中…",
        ko: "코드 준비 중…",
        zh: "正在准备代码…",
        hi: "कोड तैयार हो रहा है…",
        ar: "جارٍ تحضير الرمز…",
        id: "Menyiapkan kode…",
        ms: "Menyediakan kod…",
        vi: "Đang chuẩn bị mã…",
        th: "กำลังเตรียมโค้ด…",
        tr: "Kod hazırlanıyor…",
      },
      "Point your phone camera (a normal one, not Telegram) at the code → the bot opens → tap Start. No app is needed on your PC.": {
        ru: "Наведите камеру телефона (обычную, не Telegram) на код → откроется бот → нажмите «Запустить». Приложение на ПК не нужно.",
        es: "Apunta la cámara normal de tu teléfono (no Telegram) al código → se abre el bot → pulsa Iniciar. No hace falta ninguna app en el PC.",
        fr: "Pointez l'appareil photo normal de votre téléphone (pas Telegram) sur le code → le bot s'ouvre → appuyez sur Démarrer. Aucune application requise sur le PC.",
        de: "Richte die normale Kamera deines Telefons (nicht Telegram) auf den Code → der Bot öffnet sich → tippe auf Start. Auf dem PC ist keine App nötig.",
        pt: "Aponte a câmera normal do seu telefone (não o Telegram) para o código → o bot abre → toque em Iniciar. Nenhum app é necessário no PC.",
        it: "Inquadra il codice con la fotocamera normale del telefono (non Telegram) → si apre il bot → tocca Avvia. Nessuna app necessaria sul PC.",
        ja: "スマホの通常カメラ（Telegramではなく）でコードを読み取る → ボットが開く → 「開始」をタップ。PCにアプリは不要です。",
        ko: "휴대폰의 일반 카메라(Telegram 아님)로 코드를 비추세요 → 봇이 열립니다 → 시작을 누르세요. PC에 앱이 필요 없습니다.",
        zh: "用手机的普通相机（不是 Telegram）对准代码 → 机器人会打开 → 点击「开始」。电脑上无需任何应用。",
        hi: "अपने फ़ोन के सामान्य कैमरे (Telegram नहीं) को कोड पर इंगित करें → बॉट खुलेगा → Start दबाएँ। PC पर किसी ऐप की ज़रूरत नहीं।",
        ar: "وجّه كاميرا هاتفك العادية (وليس Telegram) نحو الرمز → سيفتح البوت → اضغط «ابدأ». لا حاجة لأي تطبيق على الكمبيوتر.",
        id: "Arahkan kamera biasa ponsel Anda (bukan Telegram) ke kode → bot terbuka → ketuk Mulai. Tidak perlu aplikasi di PC.",
        ms: "Halakan kamera biasa telefon anda (bukan Telegram) ke kod → bot dibuka → ketik Mula. Tiada apl diperlukan pada PC.",
        vi: "Hướng camera thường của điện thoại (không phải Telegram) vào mã → bot mở ra → nhấn Bắt đầu. Không cần ứng dụng trên PC.",
        th: "เล็งกล้องปกติของโทรศัพท์ (ไม่ใช่ Telegram) ไปที่โค้ด → บอทจะเปิดขึ้น → แตะเริ่ม ไม่ต้องใช้แอปบนพีซี",
        tr: "Telefonunuzun normal kamerasını (Telegram değil) koda doğrultun → bot açılır → Başlat'a dokunun. Bilgisayarda uygulama gerekmez.",
      },
      "Signed in successfully!": {
        ru: "Вход выполнен успешно!",
        es: "¡Sesión iniciada correctamente!",
        fr: "Connexion réussie !",
        de: "Erfolgreich angemeldet!",
        pt: "Login realizado com sucesso!",
        it: "Accesso effettuato!",
        ja: "サインインに成功しました！",
        ko: "로그인되었습니다!",
        zh: "登录成功！",
        hi: "सफलतापूर्वक साइन इन हो गए!",
        ar: "تم تسجيل الدخول بنجاح!",
        id: "Berhasil masuk!",
        ms: "Berjaya log masuk!",
        vi: "Đăng nhập thành công!",
        th: "เข้าสู่ระบบสำเร็จ!",
        tr: "Başarıyla giriş yapıldı!",
      },

      "Stopped: repeated suspicious activity. Lower threads or wait, then press Start.": {
        ru: "Остановлено: повторная подозрительная активность. Снизьте число потоков или подождите, затем нажмите «Старт».",
        es: "Detenido: actividad sospechosa repetida. Reduce los hilos o espera y luego pulsa Iniciar.",
        fr: "Arrêté : activité suspecte répétée. Réduisez les threads ou attendez, puis appuyez sur Démarrer.",
        de: "Gestoppt: wiederholte verdächtige Aktivität. Threads reduzieren oder warten, dann auf Start drücken.",
        pt: "Parado: atividade suspeita repetida. Reduza as threads ou aguarde e clique em Iniciar.",
        it: "Interrotto: attività sospetta ripetuta. Riduci i thread o attendi, poi premi Avvia.",
        ja: "停止しました：不審なアクティビティが繰り返されました。スレッド数を減らすか待ってから「開始」を押してください。",
        ko: "중지됨: 의심스러운 활동이 반복되었습니다. 스레드를 줄이거나 기다린 후 시작을 누르세요.",
        zh: "已停止：反复出现可疑活动。请减少线程数或稍候，然后点击“开始”。",
        hi: "रुक गया: बार-बार संदिग्ध गतिविधि। थ्रेड्स कम करें या प्रतीक्षा करें, फिर Start दबाएँ।",
        ar: "تم الإيقاف: نشاط مشبوه متكرر. قلّل عدد الخيوط أو انتظر ثم اضغط على «بدء».",
        id: "Dihentikan: aktivitas mencurigakan berulang. Kurangi thread atau tunggu, lalu tekan Mulai.",
        ms: "Dihentikan: aktiviti mencurigakan berulang. Kurangkan thread atau tunggu, kemudian tekan Mula.",
        vi: "Đã dừng: hoạt động đáng ngờ lặp lại. Giảm số luồng hoặc chờ, rồi nhấn Bắt đầu.",
        th: "หยุดแล้ว: พบกิจกรรมที่น่าสงสัยซ้ำ ๆ ลดจำนวนเธรดหรือรอสักครู่ แล้วกดเริ่ม",
        tr: "Durduruldu: tekrarlanan şüpheli etkinlik. İş parçacıklarını azaltın veya bekleyin, sonra Başlat'a basın.",
      },
      "AI Automation": {
        ru: "ИИ-автоматизация",
        es: "Automatización con IA",
        fr: "Automatisation IA",
        de: "KI-Automatisierung",
        pt: "Automação com IA",
        it: "Automazione IA",
        ja: "AI自動化",
        ko: "AI 자동화",
        zh: "AI 自动化",
        hi: "एआई स्वचालन",
        ar: "أتمتة الذكاء الاصطناعي",
        id: "Otomatisasi AI",
        ms: "Automasi AI",
        vi: "Tự động hóa AI",
        th: "ระบบอัตโนมัติ AI",
        tr: "Yapay Zeka Otomasyonu",
      },
      VIDEO: {
        ru: "ВИДЕО",
        es: "VÍDEO",
        fr: "VIDÉO",
        de: "VIDEO",
        pt: "VÍDEO",
        it: "VIDEO",
        ja: "動画",
        ko: "동영상",
        zh: "视频",
        hi: "वीडियो",
        ar: "فيديو",
        id: "VIDEO",
        ms: "VIDEO",
        vi: "VIDEO",
        th: "วิดีโอ",
        tr: "VİDEO",
      },
      IMAGE: {
        ru: "ФОТО",
        es: "IMAGEN",
        fr: "IMAGE",
        de: "BILD",
        pt: "IMAGEM",
        it: "IMMAGINE",
        ja: "画像",
        ko: "이미지",
        zh: "图片",
        hi: "छवि",
        ar: "صورة",
        id: "GAMBAR",
        ms: "IMEJ",
        vi: "ẢNH",
        th: "รูปภาพ",
        tr: "GÖRSEL",
      },
      Single: {
        ru: "Одиночный",
        es: "Único",
        fr: "Unique",
        de: "Einzeln",
        pt: "Único",
        it: "Singolo",
        ja: "シングル",
        ko: "단일",
        zh: "单个",
        hi: "एकल",
        ar: "مفرد",
        id: "Tunggal",
        ms: "Tunggal",
        vi: "Đơn",
        th: "เดี่ยว",
        tr: "Tekli",
      },
      Reference: {
        ru: "Референс",
        es: "Referencia",
        fr: "Référence",
        de: "Referenz",
        pt: "Referência",
        it: "Riferimento",
        ja: "参照",
        ko: "참조",
        zh: "参考",
        hi: "संदर्भ",
        ar: "مرجع",
        id: "Referensi",
        ms: "Rujukan",
        vi: "Tham chiếu",
        th: "อ้างอิง",
        tr: "Referans",
      },
      Film: {
        ru: "Фильм",
        es: "Película",
        fr: "Film",
        de: "Film",
        pt: "Filme",
        it: "Film",
        ja: "フィルム",
        ko: "필름",
        zh: "影片",
        hi: "फ़िल्म",
        ar: "فيلم",
        id: "Film",
        ms: "Filem",
        vi: "Phim",
        th: "ฟิล์ม",
        tr: "Film",
      },
      Multi: {
        ru: "Мульти",
        es: "Múltiple",
        fr: "Multi",
        de: "Multi",
        pt: "Múltiplo",
        it: "Multi",
        ja: "マルチ",
        ko: "멀티",
        zh: "多个",
        hi: "मल्टी",
        ar: "متعدد",
        id: "Multi",
        ms: "Multi",
        vi: "Đa",
        th: "หลายรายการ",
        tr: "Çoklu",
      },
      "Text to Video": {
        ru: "Текст → видео",
        es: "Texto a vídeo",
        fr: "Texte en vidéo",
        de: "Text zu Video",
        pt: "Texto para vídeo",
        it: "Testo in video",
        ja: "テキスト→動画",
        ko: "텍스트→동영상",
        zh: "文本转视频",
        hi: "टेक्स्ट से वीडियो",
        ar: "نص إلى فيديو",
        id: "Teks ke Video",
        ms: "Teks ke Video",
        vi: "Văn bản → video",
        th: "ข้อความเป็นวิดีโอ",
        tr: "Metinden Videoya",
      },
      "Image to Video": {
        ru: "Фото → видео",
        es: "Imagen a vídeo",
        fr: "Image en vidéo",
        de: "Bild zu Video",
        pt: "Imagem para vídeo",
        it: "Immagine in video",
        ja: "画像→動画",
        ko: "이미지→동영상",
        zh: "图片转视频",
        hi: "छवि से वीडियो",
        ar: "صورة إلى فيديو",
        id: "Gambar ke Video",
        ms: "Imej ke Video",
        vi: "Ảnh → video",
        th: "รูปภาพเป็นวิดีโอ",
        tr: "Görselden Videoya",
      },
      "Video Model": {
        ru: "Видео-модель",
        es: "Modelo de vídeo",
        fr: "Modèle vidéo",
        de: "Videomodell",
        pt: "Modelo de vídeo",
        it: "Modello video",
        ja: "動画モデル",
        ko: "동영상 모델",
        zh: "视频模型",
        hi: "वीडियो मॉडल",
        ar: "نموذج الفيديو",
        id: "Model Video",
        ms: "Model Video",
        vi: "Mô hình video",
        th: "โมเดลวิดีโอ",
        tr: "Video Modeli",
      },
      "Image Model": {
        ru: "Модель фото",
        es: "Modelo de imagen",
        fr: "Modèle d'image",
        de: "Bildmodell",
        pt: "Modelo de imagem",
        it: "Modello immagine",
        ja: "画像モデル",
        ko: "이미지 모델",
        zh: "图片模型",
        hi: "छवि मॉडल",
        ar: "نموذج الصورة",
        id: "Model Gambar",
        ms: "Model Imej",
        vi: "Mô hình ảnh",
        th: "โมเดลรูปภาพ",
        tr: "Görsel Modeli",
      },
      Model: {
        ru: "Модель",
        es: "Modelo",
        fr: "Modèle",
        de: "Modell",
        pt: "Modelo",
        it: "Modello",
        ja: "モデル",
        ko: "모델",
        zh: "模型",
        hi: "मॉडल",
        ar: "النموذج",
        id: "Model",
        ms: "Model",
        vi: "Mô hình",
        th: "โมเดล",
        tr: "Model",
      },
      "Max Retries": {
        ru: "Макс. попыток",
        es: "Reintentos máx.",
        fr: "Relances max",
        de: "Max. Versuche",
        pt: "Tentativas máx.",
        it: "Tentativi max",
        ja: "最大試行回数",
        ko: "최대 시도",
        zh: "最大尝试次数",
        hi: "अधिकतम प्रयास",
        ar: "أقصى عدد المحاولات",
        id: "Maks. percobaan",
        ms: "Maks. cubaan",
        vi: "Số lần thử tối đa",
        th: "จำนวนครั้งสูงสุด",
        tr: "Maks. deneme",
      },
      "Aspect Ratio": {
        ru: "Соотношение сторон",
        es: "Relación de aspecto",
        fr: "Format d'image",
        de: "Seitenverhältnis",
        pt: "Proporção",
        it: "Proporzioni",
        ja: "アスペクト比",
        ko: "화면 비율",
        zh: "宽高比",
        hi: "पहलू अनुपात",
        ar: "نسبة العرض",
        id: "Rasio aspek",
        ms: "Nisbah aspek",
        vi: "Tỷ lệ khung hình",
        th: "อัตราส่วนภาพ",
        tr: "En boy oranı",
      },
      "Landscape (16:9)": {
        ru: "Альбом (16:9)",
        es: "Horizontal (16:9)",
        fr: "Paysage (16:9)",
        de: "Querformat (16:9)",
        pt: "Paisagem (16:9)",
        it: "Orizzontale (16:9)",
        ja: "横向き (16:9)",
        ko: "가로 (16:9)",
        zh: "横向 (16:9)",
        hi: "लैंडस्केप (16:9)",
        ar: "أفقي (16:9)",
        id: "Lanskap (16:9)",
        ms: "Landskap (16:9)",
        vi: "Ngang (16:9)",
        th: "แนวนอน (16:9)",
        tr: "Yatay (16:9)",
      },
      "Portrait (9:16)": {
        ru: "Портрет (9:16)",
        es: "Vertical (9:16)",
        fr: "Portrait (9:16)",
        de: "Hochformat (9:16)",
        pt: "Retrato (9:16)",
        it: "Verticale (9:16)",
        ja: "縦向き (9:16)",
        ko: "세로 (9:16)",
        zh: "竖向 (9:16)",
        hi: "पोर्ट्रेट (9:16)",
        ar: "رأسي (9:16)",
        id: "Potret (9:16)",
        ms: "Potret (9:16)",
        vi: "Dọc (9:16)",
        th: "แนวตั้ง (9:16)",
        tr: "Dikey (9:16)",
      },
      "Auto Download": {
        ru: "Авто-скачивание",
        es: "Descarga automática",
        fr: "Téléchargement auto",
        de: "Auto-Download",
        pt: "Download automático",
        it: "Download automatico",
        ja: "自動ダウンロード",
        ko: "자동 다운로드",
        zh: "自动下载",
        hi: "स्वतः डाउनलोड",
        ar: "تنزيل تلقائي",
        id: "Unduh otomatis",
        ms: "Muat turun auto",
        vi: "Tự động tải",
        th: "ดาวน์โหลดอัตโนมัติ",
        tr: "Otomatik indirme",
      },
      "Auto-retry failed": {
        ru: "Авто-повтор неудач",
        es: "Reintentar fallidos",
        fr: "Réessai auto des échecs",
        de: "Fehlversuche autom. wiederholen",
        pt: "Repetir falhas auto",
        it: "Ritenta falliti auto",
        ja: "失敗を自動再試行",
        ko: "실패 자동 재시도",
        zh: "自动重试失败项",
        hi: "विफल को स्वतः पुनः प्रयास",
        ar: "إعادة المحاولة تلقائيًا للفاشلة",
        id: "Coba ulang gagal otomatis",
        ms: "Cuba semula gagal auto",
        vi: "Tự thử lại lỗi",
        th: "ลองใหม่อัตโนมัติเมื่อล้มเหลว",
        tr: "Başarısızları otomatik yinele",
      },
      "Video quality": {
        ru: "Качество видео",
        es: "Calidad de vídeo",
        fr: "Qualité vidéo",
        de: "Videoqualität",
        pt: "Qualidade do vídeo",
        it: "Qualità video",
        ja: "動画品質",
        ko: "동영상 화질",
        zh: "视频质量",
        hi: "वीडियो गुणवत्ता",
        ar: "جودة الفيديو",
        id: "Kualitas video",
        ms: "Kualiti video",
        vi: "Chất lượng video",
        th: "คุณภาพวิดีโอ",
        tr: "Video kalitesi",
      },
      "Image quality": {
        ru: "Качество фото",
        es: "Calidad de imagen",
        fr: "Qualité d'image",
        de: "Bildqualität",
        pt: "Qualidade da imagem",
        it: "Qualità immagine",
        ja: "画像品質",
        ko: "이미지 화질",
        zh: "图片质量",
        hi: "छवि गुणवत्ता",
        ar: "جودة الصورة",
        id: "Kualitas gambar",
        ms: "Kualiti imej",
        vi: "Chất lượng ảnh",
        th: "คุณภาพรูปภาพ",
        tr: "Görsel kalitesi",
      },
      Quality: {
        ru: "Качество",
        es: "Calidad",
        fr: "Qualité",
        de: "Qualität",
        pt: "Qualidade",
        it: "Qualità",
        ja: "品質",
        ko: "화질",
        zh: "质量",
        hi: "गुणवत्ता",
        ar: "الجودة",
        id: "Kualitas",
        ms: "Kualiti",
        vi: "Chất lượng",
        th: "คุณภาพ",
        tr: "Kalite",
      },
      "Reset numbers": {
        ru: "Сбросить номера",
        es: "Restablecer números",
        fr: "Réinitialiser les numéros",
        de: "Nummern zurücksetzen",
        pt: "Redefinir números",
        it: "Reimposta numeri",
        ja: "番号をリセット",
        ko: "번호 재설정",
        zh: "重置编号",
        hi: "नंबर रीसेट करें",
        ar: "إعادة تعيين الأرقام",
        id: "Atur ulang nomor",
        ms: "Set semula nombor",
        vi: "Đặt lại số",
        th: "รีเซ็ตหมายเลข",
        tr: "Numaraları sıfırla",
      },
      Queue: {
        ru: "Очередь",
        es: "Cola",
        fr: "File d'attente",
        de: "Warteschlange",
        pt: "Fila",
        it: "Coda",
        ja: "キュー",
        ko: "대기열",
        zh: "队列",
        hi: "कतार",
        ar: "قائمة الانتظار",
        id: "Antrean",
        ms: "Baris gilir",
        vi: "Hàng đợi",
        th: "คิว",
        tr: "Kuyruk",
      },
      Settings: {
        ru: "Настройки",
        es: "Ajustes",
        fr: "Paramètres",
        de: "Einstellungen",
        pt: "Configurações",
        it: "Impostazioni",
        ja: "設定",
        ko: "설정",
        zh: "设置",
        hi: "सेटिंग्स",
        ar: "الإعدادات",
        id: "Pengaturan",
        ms: "Tetapan",
        vi: "Cài đặt",
        th: "การตั้งค่า",
        tr: "Ayarlar",
      },
      Prompts: {
        ru: "Промты",
        es: "Prompts",
        fr: "Prompts",
        de: "Prompts",
        pt: "Prompts",
        it: "Prompt",
        ja: "プロンプト",
        ko: "프롬프트",
        zh: "提示词",
        hi: "प्रॉम्प्ट",
        ar: "الموجهات",
        id: "Prompt",
        ms: "Prompt",
        vi: "Câu lệnh",
        th: "พรอมต์",
        tr: "İstemler",
      },
      "Add Prompts": {
        ru: "Добавить промты",
        es: "Añadir prompts",
        fr: "Ajouter des prompts",
        de: "Prompts hinzufügen",
        pt: "Adicionar prompts",
        it: "Aggiungi prompt",
        ja: "プロンプトを追加",
        ko: "프롬프트 추가",
        zh: "添加提示词",
        hi: "प्रॉम्प्ट जोड़ें",
        ar: "إضافة موجهات",
        id: "Tambah prompt",
        ms: "Tambah prompt",
        vi: "Thêm câu lệnh",
        th: "เพิ่มพรอมต์",
        tr: "İstem ekle",
      },
      Logs: {
        ru: "Логи",
        es: "Registros",
        fr: "Journaux",
        de: "Protokolle",
        pt: "Registros",
        it: "Log",
        ja: "ログ",
        ko: "로그",
        zh: "日志",
        hi: "लॉग",
        ar: "السجلات",
        id: "Log",
        ms: "Log",
        vi: "Nhật ký",
        th: "บันทึก",
        tr: "Günlükler",
      },
      Clear: {
        ru: "Очистить",
        es: "Borrar",
        fr: "Effacer",
        de: "Leeren",
        pt: "Limpar",
        it: "Cancella",
        ja: "クリア",
        ko: "지우기",
        zh: "清除",
        hi: "साफ़ करें",
        ar: "مسح",
        id: "Hapus",
        ms: "Kosongkan",
        vi: "Xóa",
        th: "ล้าง",
        tr: "Temizle",
      },
      "Clear All": {
        ru: "Очистить всё",
        es: "Borrar todo",
        fr: "Tout effacer",
        de: "Alle löschen",
        pt: "Limpar tudo",
        it: "Cancella tutto",
        ja: "すべてクリア",
        ko: "모두 지우기",
        zh: "全部清除",
        hi: "सभी साफ़ करें",
        ar: "مسح الكل",
        id: "Hapus semua",
        ms: "Kosongkan semua",
        vi: "Xóa tất cả",
        th: "ล้างทั้งหมด",
        tr: "Tümünü temizle",
      },
      Start: {
        ru: "Старт",
        es: "Iniciar",
        fr: "Démarrer",
        de: "Start",
        pt: "Iniciar",
        it: "Avvia",
        ja: "開始",
        ko: "시작",
        zh: "开始",
        hi: "शुरू",
        ar: "بدء",
        id: "Mulai",
        ms: "Mula",
        vi: "Bắt đầu",
        th: "เริ่ม",
        tr: "Başlat",
      },
      "Start Generation": {
        ru: "Запустить",
        es: "Iniciar generación",
        fr: "Lancer la génération",
        de: "Generierung starten",
        pt: "Iniciar geração",
        it: "Avvia generazione",
        ja: "生成を開始",
        ko: "생성 시작",
        zh: "开始生成",
        hi: "जनरेशन शुरू करें",
        ar: "بدء التوليد",
        id: "Mulai generasi",
        ms: "Mula penjanaan",
        vi: "Bắt đầu tạo",
        th: "เริ่มสร้าง",
        tr: "Üretimi başlat",
      },
      Pause: {
        ru: "Пауза",
        es: "Pausar",
        fr: "Pause",
        de: "Pause",
        pt: "Pausar",
        it: "Pausa",
        ja: "一時停止",
        ko: "일시정지",
        zh: "暂停",
        hi: "रोकें",
        ar: "إيقاف مؤقت",
        id: "Jeda",
        ms: "Jeda",
        vi: "Tạm dừng",
        th: "หยุดชั่วคราว",
        tr: "Duraklat",
      },
      Resume: {
        ru: "Продолжить",
        es: "Reanudar",
        fr: "Reprendre",
        de: "Fortsetzen",
        pt: "Retomar",
        it: "Riprendi",
        ja: "再開",
        ko: "재개",
        zh: "继续",
        hi: "फिर शुरू करें",
        ar: "استئناف",
        id: "Lanjutkan",
        ms: "Sambung",
        vi: "Tiếp tục",
        th: "ดำเนินต่อ",
        tr: "Devam et",
      },
      Stop: {
        ru: "Стоп",
        es: "Detener",
        fr: "Arrêter",
        de: "Stopp",
        pt: "Parar",
        it: "Ferma",
        ja: "停止",
        ko: "중지",
        zh: "停止",
        hi: "रोकें",
        ar: "إيقاف",
        id: "Hentikan",
        ms: "Henti",
        vi: "Dừng",
        th: "หยุด",
        tr: "Durdur",
      },
      Retry: {
        ru: "Повтор",
        es: "Reintentar",
        fr: "Réessayer",
        de: "Wiederholen",
        pt: "Repetir",
        it: "Riprova",
        ja: "再試行",
        ko: "재시도",
        zh: "重试",
        hi: "पुनः प्रयास",
        ar: "إعادة المحاولة",
        id: "Coba lagi",
        ms: "Cuba semula",
        vi: "Thử lại",
        th: "ลองใหม่",
        tr: "Yeniden dene",
      },
      "Retry All": {
        ru: "Повторить все",
        es: "Reintentar todo",
        fr: "Tout réessayer",
        de: "Alle wiederholen",
        pt: "Repetir tudo",
        it: "Riprova tutto",
        ja: "すべて再試行",
        ko: "모두 재시도",
        zh: "全部重试",
        hi: "सभी पुनः प्रयास",
        ar: "إعادة محاولة الكل",
        id: "Coba lagi semua",
        ms: "Cuba semula semua",
        vi: "Thử lại tất cả",
        th: "ลองใหม่ทั้งหมด",
        tr: "Tümünü yeniden dene",
      },
      "Download All": {
        ru: "Скачать всё",
        es: "Descargar todo",
        fr: "Tout télécharger",
        de: "Alle herunterladen",
        pt: "Baixar tudo",
        it: "Scarica tutto",
        ja: "すべてダウンロード",
        ko: "모두 다운로드",
        zh: "全部下载",
        hi: "सभी डाउनलोड करें",
        ar: "تنزيل الكل",
        id: "Unduh semua",
        ms: "Muat turun semua",
        vi: "Tải tất cả",
        th: "ดาวน์โหลดทั้งหมด",
        tr: "Tümünü indir",
      },
      Import: {
        ru: "Импорт",
        es: "Importar",
        fr: "Importer",
        de: "Importieren",
        pt: "Importar",
        it: "Importa",
        ja: "インポート",
        ko: "가져오기",
        zh: "导入",
        hi: "आयात",
        ar: "استيراد",
        id: "Impor",
        ms: "Import",
        vi: "Nhập",
        th: "นำเข้า",
        tr: "İçe aktar",
      },
      Lifetime: {
        ru: "Навсегда",
        es: "De por vida",
        fr: "À vie",
        de: "Lebenslang",
        pt: "Vitalício",
        it: "A vita",
        ja: "無期限",
        ko: "평생",
        zh: "终身",
        hi: "आजीवन",
        ar: "مدى الحياة",
        id: "Seumur hidup",
        ms: "Seumur hidup",
        vi: "Trọn đời",
        th: "ตลอดชีพ",
        tr: "Ömür boyu",
      },
      "Remove from list": {
        ru: "Убрать из списка",
        es: "Quitar de la lista",
        fr: "Retirer de la liste",
        de: "Aus Liste entfernen",
        pt: "Remover da lista",
        it: "Rimuovi dalla lista",
        ja: "リストから削除",
        ko: "목록에서 제거",
        zh: "从列表移除",
        hi: "सूची से हटाएं",
        ar: "إزالة من القائمة",
        id: "Hapus dari daftar",
        ms: "Buang dari senarai",
        vi: "Xóa khỏi danh sách",
        th: "นำออกจากรายการ",
        tr: "Listeden kaldır",
      },
      "Remove from queue": {
        ru: "Убрать из очереди",
        es: "Quitar de la cola",
        fr: "Retirer de la file",
        de: "Aus Warteschlange entfernen",
        pt: "Remover da fila",
        it: "Rimuovi dalla coda",
        ja: "キューから削除",
        ko: "대기열에서 제거",
        zh: "从队列移除",
        hi: "कतार से हटाएं",
        ar: "إزالة من قائمة الانتظار",
        id: "Hapus dari antrean",
        ms: "Buang dari baris gilir",
        vi: "Xóa khỏi hàng đợi",
        th: "นำออกจากคิว",
        tr: "Kuyruktan kaldır",
      },
      Aspect: {
        ru: "Формат",
        es: "Aspecto",
        fr: "Format",
        de: "Format",
        pt: "Proporção",
        it: "Formato",
        ja: "比率",
        ko: "비율",
        zh: "比例",
        hi: "पहलू",
        ar: "النسبة",
        id: "Aspek",
        ms: "Aspek",
        vi: "Khung hình",
        th: "สัดส่วน",
        tr: "Oran",
      },
      Duration: {
        ru: "Длительность",
        es: "Duración",
        fr: "Durée",
        de: "Dauer",
        pt: "Duração",
        it: "Durata",
        ja: "長さ",
        ko: "길이",
        zh: "时长",
        hi: "अवधि",
        ar: "المدة",
        id: "Durasi",
        ms: "Tempoh",
        vi: "Thời lượng",
        th: "ระยะเวลา",
        tr: "Süre",
      },
      "Video Duration": {
        ru: "Длительность видео",
        es: "Duración del vídeo",
        fr: "Durée de la vidéo",
        de: "Videodauer",
        pt: "Duração do vídeo",
        it: "Durata video",
        ja: "動画の長さ",
        ko: "동영상 길이",
        zh: "视频时长",
        hi: "वीडियो अवधि",
        ar: "مدة الفيديو",
        id: "Durasi video",
        ms: "Tempoh video",
        vi: "Thời lượng video",
        th: "ระยะเวลาวิดีโอ",
        tr: "Video süresi",
      },
      "Start from Prompt #": {
        ru: "Начать с промта #",
        es: "Empezar desde el prompt #",
        fr: "Commencer au prompt n°",
        de: "Ab Prompt # starten",
        pt: "Começar do prompt #",
        it: "Inizia dal prompt #",
        ja: "プロンプト#から開始",
        ko: "프롬프트 #부터 시작",
        zh: "从提示词 # 开始",
        hi: "प्रॉम्प्ट # से शुरू करें",
        ar: "ابدأ من الموجه #",
        id: "Mulai dari prompt #",
        ms: "Mula dari prompt #",
        vi: "Bắt đầu từ câu lệnh #",
        th: "เริ่มจากพรอมต์ #",
        tr: "# numaralı istemden başla",
      },
      "Filename Prefix": {
        ru: "Префикс имени файла",
        es: "Prefijo del nombre",
        fr: "Préfixe du nom de fichier",
        de: "Dateinamen-Präfix",
        pt: "Prefixo do arquivo",
        it: "Prefisso nome file",
        ja: "ファイル名の接頭辞",
        ko: "파일명 접두사",
        zh: "文件名前缀",
        hi: "फ़ाइल नाम उपसर्ग",
        ar: "بادئة اسم الملف",
        id: "Awalan nama file",
        ms: "Awalan nama fail",
        vi: "Tiền tố tên tệp",
        th: "คำนำหน้าชื่อไฟล์",
        tr: "Dosya adı öneki",
      },
      "Use Prompt Number from Text": {
        ru: "Брать номер промта из текста",
        es: "Usar el número del prompt del texto",
        fr: "Utiliser le n° de prompt du texte",
        de: "Prompt-Nummer aus Text verwenden",
        pt: "Usar número do prompt do texto",
        it: "Usa numero del prompt dal testo",
        ja: "テキストのプロンプト番号を使用",
        ko: "텍스트의 프롬프트 번호 사용",
        zh: "使用文本中的提示词编号",
        hi: "टेक्स्ट से प्रॉम्प्ट नंबर लें",
        ar: "استخدام رقم الموجه من النص",
        id: "Gunakan nomor prompt dari teks",
        ms: "Guna nombor prompt dari teks",
        vi: "Dùng số câu lệnh từ văn bản",
        th: "ใช้หมายเลขพรอมต์จากข้อความ",
        tr: "İstem numarasını metinden al",
      },
      "Extract #N from prompt text for filename": {
        ru: "Извлекать #N из текста для имени",
        es: "Extraer #N del texto para el nombre",
        fr: "Extraire #N du texte pour le nom",
        de: "#N aus Text für Dateinamen extrahieren",
        pt: "Extrair #N do texto para o nome",
        it: "Estrai #N dal testo per il nome",
        ja: "テキストから#Nを抽出してファイル名に",
        ko: "파일명용으로 텍스트에서 #N 추출",
        zh: "从文本提取 #N 用作文件名",
        hi: "फ़ाइल नाम के लिए टेक्स्ट से #N निकालें",
        ar: "استخراج #N من النص لاسم الملف",
        id: "Ambil #N dari teks untuk nama file",
        ms: "Ekstrak #N dari teks untuk nama fail",
        vi: "Lấy #N từ văn bản cho tên tệp",
        th: "ดึง #N จากข้อความเป็นชื่อไฟล์",
        tr: "Dosya adı için metinden #N çıkar",
      },
      "Add prompt words to filename": {
        ru: "Добавлять слова промта в имя",
        es: "Añadir palabras del prompt al nombre",
        fr: "Ajouter des mots du prompt au nom",
        de: "Prompt-Wörter zum Dateinamen hinzufügen",
        pt: "Adicionar palavras do prompt ao nome",
        it: "Aggiungi parole del prompt al nome",
        ja: "プロンプトの単語をファイル名に追加",
        ko: "프롬프트 단어를 파일명에 추가",
        zh: "将提示词加入文件名",
        hi: "फ़ाइल नाम में प्रॉम्प्ट शब्द जोड़ें",
        ar: "إضافة كلمات الموجه إلى الاسم",
        id: "Tambah kata prompt ke nama file",
        ms: "Tambah perkataan prompt ke nama fail",
        vi: "Thêm từ của câu lệnh vào tên tệp",
        th: "เพิ่มคำของพรอมต์ในชื่อไฟล์",
        tr: "İstem kelimelerini dosya adına ekle",
      },
      "First words of the prompt in the filename": {
        ru: "Первые слова промта в имени файла",
        es: "Primeras palabras del prompt en el nombre",
        fr: "Premiers mots du prompt dans le nom",
        de: "Erste Wörter des Prompts im Dateinamen",
        pt: "Primeiras palavras do prompt no nome",
        it: "Prime parole del prompt nel nome",
        ja: "プロンプトの最初の単語をファイル名に",
        ko: "프롬프트의 첫 단어를 파일명에",
        zh: "文件名中包含提示词的首词",
        hi: "फ़ाइल नाम में प्रॉम्प्ट के पहले शब्द",
        ar: "أول كلمات الموجه في اسم الملف",
        id: "Kata pertama prompt di nama file",
        ms: "Perkataan pertama prompt dalam nama fail",
        vi: "Những từ đầu của câu lệnh trong tên tệp",
        th: "คำแรกของพรอมต์ในชื่อไฟล์",
        tr: "İstemin ilk kelimeleri dosya adında",
      },
      Min: {
        ru: "Мин",
        es: "Mín",
        fr: "Min",
        de: "Min",
        pt: "Mín",
        it: "Min",
        ja: "最小",
        ko: "최소",
        zh: "最小",
        hi: "न्यूनतम",
        ar: "الأدنى",
        id: "Min",
        ms: "Min",
        vi: "Tối thiểu",
        th: "ต่ำสุด",
        tr: "Min",
      },
      Max: {
        ru: "Макс",
        es: "Máx",
        fr: "Max",
        de: "Max",
        pt: "Máx",
        it: "Max",
        ja: "最大",
        ko: "최대",
        zh: "最大",
        hi: "अधिकतम",
        ar: "الأقصى",
        id: "Maks",
        ms: "Maks",
        vi: "Tối đa",
        th: "สูงสุด",
        tr: "Maks",
      },
      "Download All saves videos in 720p and images in 1080p (native). Quality selectors apply to generation only.":
        {
          ru: "«Скачать всё» сохраняет видео в 720p и изображения в 1080p (исходный размер). Селекторы качества влияют только на генерацию.",
          es: "«Descargar todo» guarda los vídeos en 720p y las imágenes en 1080p (nativo). Los selectores de calidad solo afectan a la generación.",
          fr: "« Tout télécharger » enregistre les vidéos en 720p et les images en 1080p (natif). Les sélecteurs de qualité ne s'appliquent qu'à la génération.",
          de: "„Alle herunterladen“ speichert Videos in 720p und Bilder in 1080p (nativ). Die Qualitätsauswahl gilt nur für die Generierung.",
          pt: "«Baixar tudo» salva vídeos em 720p e imagens em 1080p (nativo). Os seletores de qualidade aplicam-se apenas à geração.",
          it: "«Scarica tutto» salva i video in 720p e le immagini in 1080p (nativo). I selettori di qualità valgono solo per la generazione.",
          ja: "「すべてダウンロード」は動画を720p、画像を1080p（ネイティブ）で保存します。品質セレクターは生成のみに適用されます。",
          ko: "'모두 다운로드'는 동영상을 720p, 이미지를 1080p(원본)로 저장합니다. 화질 선택은 생성에만 적용됩니다.",
          zh: "“全部下载”将视频保存为 720p，图片保存为 1080p（原生）。质量选择器仅适用于生成。",
          hi: "«सभी डाउनलोड करें» वीडियो को 720p और छवियों को 1080p (मूल) में सहेजता है। गुणवत्ता चयनकर्ता केवल जनरेशन पर लागू होते हैं।",
          ar: "«تنزيل الكل» يحفظ الفيديو بدقة 720p والصور بدقة 1080p (الأصلية). محددات الجودة تنطبق على التوليد فقط.",
          id: "«Unduh semua» menyimpan video dalam 720p dan gambar dalam 1080p (asli). Pemilih kualitas hanya berlaku untuk generasi.",
          ms: "«Muat turun semua» menyimpan video dalam 720p dan imej dalam 1080p (asli). Pemilih kualiti hanya untuk penjanaan.",
          vi: "«Tải tất cả» lưu video ở 720p và ảnh ở 1080p (gốc). Bộ chọn chất lượng chỉ áp dụng cho việc tạo.",
          th: "«ดาวน์โหลดทั้งหมด» บันทึกวิดีโอที่ 720p และรูปภาพที่ 1080p (ต้นฉบับ) ตัวเลือกคุณภาพมีผลกับการสร้างเท่านั้น",
          tr: "«Tümünü indir» videoları 720p, görselleri 1080p (yerel) kaydeder. Kalite seçicileri yalnızca üretime uygulanır.",
        },
      "Enter prompts (one per line, or separated by a blank line)": {
        ru: "Введите промпты (каждый с новой строки или через пустую строку)",
        es: "Introduce prompts (uno por línea o separados por una línea en blanco)",
        fr: "Saisissez des prompts (un par ligne ou séparés par une ligne vide)",
        de: "Prompts eingeben (einer pro Zeile oder durch Leerzeile getrennt)",
        pt: "Insira prompts (um por linha ou separados por uma linha em branco)",
        it: "Inserisci i prompt (uno per riga o separati da una riga vuota)",
        ja: "プロンプトを入力（1行に1つ、または空行で区切る）",
        ko: "프롬프트 입력 (한 줄에 하나 또는 빈 줄로 구분)",
        zh: "输入提示词（每行一个，或用空行分隔）",
        hi: "प्रॉम्प्ट दर्ज करें (हर एक नई पंक्ति में या खाली पंक्ति से अलग)",
        ar: "أدخل الموجهات (كل واحد في سطر أو مفصولة بسطر فارغ)",
        id: "Masukkan prompt (satu per baris atau dipisah baris kosong)",
        ms: "Masukkan prompt (satu setiap baris atau dipisah baris kosong)",
        vi: "Nhập câu lệnh (mỗi dòng một câu hoặc cách nhau bằng dòng trống)",
        th: "ป้อนพรอมต์ (บรรทัดละหนึ่งรายการ หรือคั่นด้วยบรรทัดว่าง)",
        tr: "İstemleri girin (her satıra bir tane veya boş satırla ayırın)",
      },
    };
    var PREFIX = [
      [
        "Outputs per Prompt: ",
        {
          ru: "Генерации на промт: ",
          es: "Salidas por prompt: ",
          fr: "Sorties par prompt : ",
          de: "Ausgaben pro Prompt: ",
          pt: "Saídas por prompt: ",
          it: "Output per prompt: ",
          ja: "プロンプトあたりの生成数: ",
          ko: "프롬프트당 출력: ",
          zh: "每个提示词的输出: ",
          hi: "प्रति प्रॉम्प्ट आउटपुट: ",
          ar: "المخرجات لكل موجه: ",
          id: "Output per prompt: ",
          ms: "Output per prompt: ",
          vi: "Số đầu ra mỗi câu lệnh: ",
          th: "ผลลัพธ์ต่อพรอมต์: ",
          tr: "İstem başına çıktı: ",
        },
      ],
      [
        "Generations per Prompt: ",
        {
          ru: "Генераций на промт: ",
          es: "Generaciones por prompt: ",
          fr: "Générations par prompt : ",
          de: "Generierungen pro Prompt: ",
          pt: "Gerações por prompt: ",
          it: "Generazioni per prompt: ",
          ja: "プロンプトあたりの生成回数: ",
          ko: "프롬프트당 생성: ",
          zh: "每个提示词的生成数: ",
          hi: "प्रति प्रॉम्प्ट जनरेशन: ",
          ar: "التوليدات لكل موجه: ",
          id: "Generasi per prompt: ",
          ms: "Penjanaan per prompt: ",
          vi: "Số lần tạo mỗi câu lệnh: ",
          th: "การสร้างต่อพรอมต์: ",
          tr: "İstem başına üretim: ",
        },
      ],
      [
        "Images per Prompt: ",
        {
          ru: "Изображений на промт: ",
          es: "Imágenes por prompt: ",
          fr: "Images par prompt : ",
          de: "Bilder pro Prompt: ",
          pt: "Imagens por prompt: ",
          it: "Immagini per prompt: ",
          ja: "プロンプトあたりの画像数: ",
          ko: "프롬프트당 이미지: ",
          zh: "每个提示词的图片数: ",
          hi: "प्रति प्रॉम्प्ट छवियाँ: ",
          ar: "الصور لكل موجه: ",
          id: "Gambar per prompt: ",
          ms: "Imej per prompt: ",
          vi: "Số ảnh mỗi câu lệnh: ",
          th: "รูปภาพต่อพรอมต์: ",
          tr: "İstem başına görsel: ",
        },
      ],
      [
        "Max Threads ",
        {
          ru: "Макс. потоков ",
          es: "Hilos máx. ",
          fr: "Threads max ",
          de: "Max. Threads ",
          pt: "Threads máx. ",
          it: "Thread max ",
          ja: "最大スレッド数 ",
          ko: "최대 스레드 ",
          zh: "最大线程数 ",
          hi: "अधिकतम थ्रेड ",
          ar: "أقصى عدد الخيوط ",
          id: "Maks. thread ",
          ms: "Maks. thread ",
          vi: "Số luồng tối đa ",
          th: "เธรดสูงสุด ",
          tr: "Maks. iş parçacığı ",
        },
      ],
      [
        "Wait between prompts: ",
        {
          ru: "Пауза между промтами: ",
          es: "Espera entre prompts: ",
          fr: "Attente entre les prompts : ",
          de: "Wartezeit zwischen Prompts: ",
          pt: "Espera entre prompts: ",
          it: "Attesa tra i prompt: ",
          ja: "プロンプト間の待機: ",
          ko: "프롬프트 간 대기: ",
          zh: "提示词之间的等待: ",
          hi: "प्रॉम्प्ट के बीच प्रतीक्षा: ",
          ar: "الانتظار بين الموجهات: ",
          id: "Jeda antar prompt: ",
          ms: "Tunggu antara prompt: ",
          vi: "Chờ giữa các câu lệnh: ",
          th: "รอระหว่างพรอมต์: ",
          tr: "İstemler arası bekleme: ",
        },
      ],
      [
        "Result: ",
        {
          ru: "Результат: ",
          es: "Resultado: ",
          fr: "Résultat : ",
          de: "Ergebnis: ",
          pt: "Resultado: ",
          it: "Risultato: ",
          ja: "結果: ",
          ko: "결과: ",
          zh: "结果: ",
          hi: "परिणाम: ",
          ar: "النتيجة: ",
          id: "Hasil: ",
          ms: "Hasil: ",
          vi: "Kết quả: ",
          th: "ผลลัพธ์: ",
          tr: "Sonuç: ",
        },
      ],
      [
        "Failed (",
        {
          ru: "Неудачные (",
          es: "Fallidos (",
          fr: "Échecs (",
          de: "Fehlgeschlagen (",
          pt: "Falhas (",
          it: "Falliti (",
          ja: "失敗 (",
          ko: "실패 (",
          zh: "失败 (",
          hi: "विफल (",
          ar: "فشل (",
          id: "Gagal (",
          ms: "Gagal (",
          vi: "Lỗi (",
          th: "ล้มเหลว (",
          tr: "Başarısız (",
        },
      ],
      [
        "Pause on limit",
        {
          ru: "Пауза при лимите",
          es: "Pausa al alcanzar el límite",
          fr: "Pause à la limite",
          de: "Pause bei Limit",
          pt: "Pausar no limite",
          it: "Pausa al limite",
          ja: "上限で一時停止",
          ko: "한도 도달 시 일시정지",
          zh: "达到限制时暂停",
          hi: "सीमा पर रुकें",
          ar: "إيقاف عند الحد",
          id: "Jeda saat batas",
          ms: "Jeda pada had",
          vi: "Tạm dừng khi đạt giới hạn",
          th: "หยุดเมื่อถึงขีดจำกัด",
          tr: "Limitte duraklat",
        },
      ],
    ];
    var RE = [
      [
        /^(\d+)\s+pending$/,
        {
          ru: "$1 в очереди",
          es: "$1 en espera",
          fr: "$1 en attente",
          de: "$1 ausstehend",
          pt: "$1 pendentes",
          it: "$1 in attesa",
          ja: "$1 件待機中",
          ko: "$1개 대기 중",
          zh: "$1 个等待中",
          hi: "$1 लंबित",
          ar: "$1 قيد الانتظار",
          id: "$1 menunggu",
          ms: "$1 menunggu",
          vi: "$1 đang chờ",
          th: "$1 รอดำเนินการ",
          tr: "$1 beklemede",
        },
      ],
      [
        /^(\d+)\s+active$/,
        {
          ru: "$1 активн.",
          es: "$1 activos",
          fr: "$1 actifs",
          de: "$1 aktiv",
          pt: "$1 ativos",
          it: "$1 attivi",
          ja: "$1 件実行中",
          ko: "$1개 진행 중",
          zh: "$1 个进行中",
          hi: "$1 सक्रिय",
          ar: "$1 نشط",
          id: "$1 aktif",
          ms: "$1 aktif",
          vi: "$1 đang chạy",
          th: "$1 กำลังทำงาน",
          tr: "$1 etkin",
        },
      ],
      [
        /^(\d+)\s+completed$/,
        {
          ru: "$1 готово",
          es: "$1 completados",
          fr: "$1 terminés",
          de: "$1 abgeschlossen",
          pt: "$1 concluídos",
          it: "$1 completati",
          ja: "$1 件完了",
          ko: "$1개 완료",
          zh: "$1 个已完成",
          hi: "$1 पूर्ण",
          ar: "$1 مكتمل",
          id: "$1 selesai",
          ms: "$1 selesai",
          vi: "$1 hoàn tất",
          th: "$1 เสร็จสิ้น",
          tr: "$1 tamamlandı",
        },
      ],
    ];
    function lang() {
      var s = document.querySelector('select[title="Interface language"]');
      return s ? s.value : "en";
    }
    function look(t, l) {
      var e = DICT[t];
      if (e && e[l]) return e[l];
      for (var i = 0; i < PREFIX.length; i++) {
        var p = PREFIX[i];
        if (t.indexOf(p[0]) === 0 && p[1][l])
          return p[1][l] + t.slice(p[0].length);
      }
      for (var j = 0; j < RE.length; j++) {
        if (RE[j][0].test(t) && RE[j][1][l])
          return t.replace(RE[j][0], RE[j][1][l]);
      }
      return null;
    }
    function apply() {
      try {
        var l = lang();
        var els = document.body.querySelectorAll(
          "span,button,p,label,a,h1,h2,h3,th,td,div",
        );
        for (var i = 0; i < els.length; i++) {
          var el = els[i];
          if (el.childElementCount !== 0 || el.tagName === "OPTION") continue;
          var o = el.getAttribute("data-i18n0"),
            c = el.textContent;
          if (o == null) {
            if (l === "en") continue;
            var t = look(c.trim(), l);
            if (t == null) continue;
            el.setAttribute("data-i18n0", c);
            if (el.textContent !== t) el.textContent = t;
          } else {
            if (l === "en") {
              if (el.textContent !== o) el.textContent = o;
              continue;
            }
            var t2 = look(o.trim(), l) || o;
            if (el.textContent !== t2) el.textContent = t2;
          }
        }
        var ins = document.body.querySelectorAll("input,textarea");
        for (var k = 0; k < ins.length; k++) {
          var p = ins[k],
            po = p.getAttribute("data-i18np"),
            pc = p.getAttribute("placeholder");
          if (pc == null) continue;
          if (po == null) {
            if (l === "en") continue;
            var pt = look(pc.trim(), l);
            if (pt == null) continue;
            p.setAttribute("data-i18np", pc);
            p.setAttribute("placeholder", pt);
          } else {
            if (l === "en") {
              p.setAttribute("placeholder", po);
              continue;
            }
            p.setAttribute("placeholder", look(po.trim(), l) || po);
          }
        }
      } catch (e) {}
    }
    var T;
    try {
      var obs = new MutationObserver(function () {
        clearTimeout(T);
        T = setTimeout(apply, 150);
      });
      obs.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    } catch (e) {}
    document.addEventListener("change", function (e) {
      if (
        e.target &&
        e.target.matches &&
        e.target.matches('select[title="Interface language"]')
      )
        setTimeout(apply, 30);
    });
    setTimeout(apply, 600);
    setTimeout(apply, 1500);
  } catch (e) {}
})();
(function () {
  try {
    if (window.__gfDocs) return;
    var EP = "http://127.0.0.1:5050/upload";
    var BODY = [
      "{",
      '  "url": "data:video/mp4;base64,<base64 data>",',
      '  "name": "Promt_1_Photo_1.jpg",',
      '  "type": "video"',
      "}",
    ].join("\n");
    var PY = [
      "from flask import Flask, request",
      "import base64, re",
      "",
      "app = Flask(__name__)",
      "",
      '@app.post("/upload")',
      "def upload():",
      "    d = request.get_json(force=True)",
      '    mime, b64 = re.match(r"data:(.*?);base64,(.*)", d["url"], re.S).groups()',
      '    with open(d["name"], "wb") as f:',
      "        f.write(base64.b64decode(b64))",
      '    return "", 200',
      "",
      'app.run("127.0.0.1", 5050)',
    ].join("\n");
    var INTRO =
      "GenFlow sends every finished image and video to a local HTTP endpoint. Run a small server on it and you receive the files automatically.";
    var FIELDS = [
      "url   full base64 data URL, the file is inside it (no extra download)",
      "name  suggested file name (multiple outputs are indexed _1, _2)",
      'type  "video" or "photo"',
    ].join("\n");
    var RESP = [
      "Return HTTP 200 once you accept the file. The body is ignored.",
      "If your server is off, GenFlow skips the push and does not fail the job.",
    ].join("\n");
    var SETT = [
      'Toggle next to "Copy API Key": ON = send media to your app, OFF = do not send.',
      "Endpoint: Settings > editorEndpoint (default http://127.0.0.1:5050/upload).",
    ].join("\n");
    var ALL = [
      "GenFlow Integration",
      "",
      INTRO,
      "",
      "Endpoint:",
      "POST " + EP,
      "Content-Type: application/json",
      "",
      "Request body:",
      BODY,
      "",
      "Fields:",
      FIELDS,
      "",
      "Response:",
      RESP,
      "",
      "Receiver example (Python):",
      PY,
      "",
      "Settings:",
      SETT,
    ].join("\n");

    var CBTN =
      "font-size:10px;padding:1px 8px;border:0;border-radius:5px;background:#3a3560;color:#cfc8ff;cursor:pointer;flex:0 0 auto";
    var PRE =
      "background:#0f0c1f;padding:7px 9px;border-radius:6px;font-family:Consolas,monospace;font-size:11px;white-space:pre;overflow-x:auto;margin:4px 0 0;line-height:1.45;color:#d7d2f0";

    function copy(txt, btn) {
      try {
        navigator.clipboard.writeText(txt);
      } catch (_) {}
      var o = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(function () {
        btn.textContent = o;
      }, 1200);
    }
    function mkBtn(label, txt) {
      var b = document.createElement("button");
      b.textContent = label;
      b.style.cssText = CBTN;
      b.onclick = function () {
        copy(txt, b);
      };
      return b;
    }
    function row(title, copyTxt) {
      var h = document.createElement("div");
      h.style.cssText =
        "font-weight:600;margin:11px 0 0;display:flex;justify-content:space-between;align-items:center;gap:8px";
      var t = document.createElement("span");
      t.textContent = title;
      h.appendChild(t);
      if (copyTxt != null) h.appendChild(mkBtn("Copy", copyTxt));
      return h;
    }
    function code(txt) {
      var p = document.createElement("pre");
      p.textContent = txt;
      p.style.cssText = PRE;
      return p;
    }
    function note(txt) {
      var p = document.createElement("div");
      p.textContent = txt;
      p.style.cssText =
        "margin:4px 0 0;opacity:.85;white-space:pre-wrap;line-height:1.5";
      return p;
    }

    var P = document.createElement("div");
    P.id = "gf-docs-panel";
    P.style.cssText =
      "position:fixed;top:48px;left:48px;width:410px;max-height:82vh;z-index:2147483647;display:none;flex-direction:column;background:#1a1530;border:1px solid #3a3560;border-radius:10px;box-shadow:0 14px 44px rgba(0,0,0,.6);color:#e2e0f0;font-family:system-ui,Segoe UI,sans-serif;font-size:12px;overflow:hidden";

    var head = document.createElement("div");
    head.id = "gf-docs-head";
    head.style.cssText =
      "cursor:move;padding:9px 11px;background:#241d40;display:flex;justify-content:space-between;align-items:center;gap:8px;user-select:none;flex:0 0 auto";
    var ht = document.createElement("b");
    ht.textContent = "GenFlow Integration";
    var hr = document.createElement("div");
    hr.style.cssText = "display:flex;align-items:center;gap:8px";
    hr.appendChild(mkBtn("Copy all", ALL));
    var x = document.createElement("span");
    x.id = "gf-docs-x";
    x.textContent = "×";
    x.style.cssText =
      "cursor:pointer;font-size:18px;line-height:1;opacity:.7;padding:0 2px";
    x.onclick = function () {
      P.style.display = "none";
    };
    hr.appendChild(x);
    head.appendChild(ht);
    head.appendChild(hr);

    var body = document.createElement("div");
    body.style.cssText = "padding:11px;overflow-y:auto";
    body.appendChild(note(INTRO));
    body.appendChild(row("Endpoint", "POST " + EP));
    body.appendChild(code("POST " + EP + "\nContent-Type: application/json"));
    body.appendChild(row("Request body (JSON)", BODY));
    body.appendChild(code(BODY));
    body.appendChild(row("Fields", null));
    body.appendChild(note(FIELDS));
    body.appendChild(row("Response", null));
    body.appendChild(note(RESP));
    body.appendChild(row("Receiver example (Python)", PY));
    body.appendChild(code(PY));
    body.appendChild(row("Settings", null));
    body.appendChild(note(SETT));

    P.appendChild(head);
    P.appendChild(body);
    document.body.appendChild(P);

    head.onmousedown = function (ev) {
      if (ev.target.tagName === "BUTTON" || ev.target.id === "gf-docs-x")
        return;
      var sx = ev.clientX,
        sy = ev.clientY,
        r = P.getBoundingClientRect(),
        ox = r.left,
        oy = r.top;
      function mv(e) {
        P.style.left = Math.max(0, ox + e.clientX - sx) + "px";
        P.style.top = Math.max(0, oy + e.clientY - sy) + "px";
      }
      function up() {
        document.removeEventListener("mousemove", mv);
        document.removeEventListener("mouseup", up);
      }
      document.addEventListener("mousemove", mv);
      document.addEventListener("mouseup", up);
      ev.preventDefault();
    };

    window.__gfDocs = {
      open: function () {
        P.style.display = "flex";
      },
    };
  } catch (e) {}
})();
(function () {
  try {
    if (window.__gfModes) return;

    var T = {
      en: {
        intro:
          "GenFlow runs Google Flow for you: pick an engine and a mode, paste your prompts, and it generates and downloads them in batches.",
        h_video: "Veo 3 — video",
        t2v_p: "Prompt in, video out. No input image.",
        i2v_p: "Animate your images. Three ways to chain them:",
        single_b: "one image, one prompt.",
        multi_b: "independent segments from image pairs:",
        multi_p:
          "Each pair is its own clip. For several separate transitions in one run.",
        film_b: "one continuous scene, chained frame to frame:",
        film_p:
          "Each shot continues the previous one — long, seamless scenes in a single take; one character's story without cuts.",
        h_photo: "Banana — images",
        psingle_b: "text to image.",
        ref_b:
          "add a photo and give it a name. When that name appears in a prompt, GenFlow inserts the photo as the reference. Keep the same character and context across an endless stream of prompts.",
        pfilm_b:
          "Each episode is a separate stream: the first prompt creates a frame, the rest continue from it. A start frame is optional — characters and objects can come from the text. Episodes are generated in parallel.",
        h_shared: "Shared",
        q: "Batch queue: many prompts at once — one per line, or blocks split by a blank line.",
        dl: "Auto-download: finished files save themselves, named and grouped per prompt.",
        retry:
          "Auto-retry: optional; retries insertion and download failures up to 2 times. «Suspicious activity» is never retried.",
        threads: "Parallel threads: up to 6 generations at once.",
        rescue:
          "Partial rescue (x2): if one of two images fails, the good one is still saved. Green = done, yellow = in progress, red = failed; retry the failed one from its card.",
        langs:
          "Languages: the selector at the top translates the whole interface.",
        h_send: "Send to your app",
        send_p:
          "GenFlow can push every finished file to a local endpoint. Turn it on with the toggle next to Copy API Key; the full contract is behind the Integration guide button.",
        note: "GenFlow only works while the extension stays visible. Do not cover it with full-screen windows — if it goes out of view, generation stops.",
      },
      ru: {
        intro:
          "GenFlow управляет Google Flow за тебя: выбираешь движок и режим, вставляешь промты — он генерирует и скачивает их пачками.",
        h_video: "Veo 3 — видео",
        t2v_p: "Промт на входе — видео на выходе. Без картинки.",
        i2v_p: "Оживляешь свои картинки. Три способа их связать:",
        single_b: "одна картинка, один промт.",
        multi_b: "независимые сегменты из пар кадров:",
        multi_p:
          "Каждая пара — свой ролик. Для нескольких отдельных переходов за прогон.",
        film_b: "одна непрерывная сцена, кадр цепляется за кадр:",
        film_p:
          "Каждый кадр продолжает предыдущий — длинные бесшовные сцены одним дублем; история одного персонажа без склеек.",
        h_photo: "Banana — фото",
        psingle_b: "текст → изображение.",
        ref_b:
          "добавь фото и дай ему имя. Когда имя есть в промте — GenFlow подставляет это фото в референс. Один и тот же персонаж и контекст держатся через бесконечный поток промтов.",
        pfilm_b:
          "Каждый эпизод — отдельный поток: первый промт создаёт кадр, следующие продолжают его. Старт-кадр необязателен — можно по персонажам/объектам из текста. Эпизоды генерируются параллельно.",
        h_shared: "Общее",
        q: "Батч-очередь: много промтов сразу — строка = промт, или блоки через пустую строку.",
        dl: "Авто-скачивание: готовые файлы сохраняются сами, имена сгруппированы по промту.",
        retry:
          "Авто-ретрай: опционально; повторяет падения вставки и скачивания до 2 раз. «Подозрительная активность» не повторяется.",
        threads: "Потоки: до 6 генераций одновременно.",
        rescue:
          "Спасение частичного (x2): если одна из двух картинок упала — удачная сохраняется. Зелёный = готово, жёлтый = в процессе, красный = ошибка; повтор с карточки.",
        langs: "Языки: селектор сверху переводит весь интерфейс.",
        h_send: "Отправка в своё приложение",
        send_p:
          "GenFlow может слать каждый готовый файл на локальный эндпоинт. Включи тумблером рядом с Copy API Key; полный контракт — по кнопке Integration guide.",
        note: "GenFlow работает только пока расширение на виду. Не перекрывай его полноэкранными окнами — если оно уходит из зоны видимости, генерация останавливается.",
      },
      es: {
        intro:
          "GenFlow maneja Google Flow por ti: elige un motor y un modo, pega tus prompts, y los genera y descarga por lotes.",
        h_video: "Veo 3 — vídeo",
        t2v_p: "Prompt de entrada, vídeo de salida. Sin imagen inicial.",
        i2v_p: "Anima tus imágenes. Tres formas de encadenarlas:",
        single_b: "una imagen, un prompt.",
        multi_b: "segmentos independientes a partir de pares de imágenes:",
        multi_p:
          "Cada par es su propio clip. Para varias transiciones separadas en una sola tanda.",
        film_b: "una escena continua, encadenada fotograma a fotograma:",
        film_p:
          "Cada toma continúa la anterior — escenas largas y sin cortes en una sola toma; la historia de un personaje sin cortes.",
        h_photo: "Banana — imágenes",
        psingle_b: "texto a imagen.",
        ref_b:
          "añade una foto y ponle un nombre. Cuando ese nombre aparece en un prompt, GenFlow inserta la foto como referencia. Mantén el mismo personaje y contexto a lo largo de un flujo infinito de prompts.",
        pfilm_b:
          "Cada episodio es un flujo independiente: el primer prompt crea un fotograma y los siguientes lo continúan. El fotograma inicial es opcional: los personajes y objetos pueden venir del texto. Los episodios se generan en paralelo.",
        h_shared: "Común",
        q: "Cola por lotes: muchos prompts a la vez — uno por línea, o bloques separados por una línea en blanco.",
        dl: "Descarga automática: los archivos terminados se guardan solos, nombrados y agrupados por prompt.",
        retry:
          "Reintento automático: opcional; reintenta fallos de inserción y descarga hasta 2 veces. La «actividad sospechosa» nunca se reintenta.",
        threads: "Hilos paralelos: hasta 6 generaciones a la vez.",
        rescue:
          "Rescate parcial (x2): si una de dos imágenes falla, la buena se guarda igual. Verde = listo, amarillo = en curso, rojo = fallo; reintenta la fallida desde su tarjeta.",
        langs: "Idiomas: el selector de arriba traduce toda la interfaz.",
        h_send: "Enviar a tu aplicación",
        send_p:
          "GenFlow puede enviar cada archivo terminado a un endpoint local. Actívalo con el interruptor junto a Copy API Key; el contrato completo está tras el botón Integration guide.",
        note: "GenFlow solo funciona mientras la extensión está visible. No la cubras con ventanas a pantalla completa — si queda fuera de vista, la generación se detiene.",
      },
      fr: {
        intro:
          "GenFlow pilote Google Flow pour vous : choisissez un moteur et un mode, collez vos prompts, et il les génère et les télécharge par lots.",
        h_video: "Veo 3 — vidéo",
        t2v_p:
          "Un prompt en entrée, une vidéo en sortie. Sans image de départ.",
        i2v_p: "Animez vos images. Trois façons de les enchaîner :",
        single_b: "une image, un prompt.",
        multi_b: "des segments indépendants à partir de paires d'images :",
        multi_p:
          "Chaque paire est son propre clip. Pour plusieurs transitions distinctes en une seule fois.",
        film_b: "une scène continue, enchaînée image par image :",
        film_p:
          "Chaque plan continue le précédent — de longues scènes fluides en une seule prise ; l'histoire d'un personnage sans coupures.",
        h_photo: "Banana — images",
        psingle_b: "texte vers image.",
        ref_b:
          "ajoutez une photo et donnez-lui un nom. Quand ce nom apparaît dans un prompt, GenFlow insère la photo comme référence. Gardez le même personnage et le même contexte sur un flux infini de prompts.",
        pfilm_b:
          "Chaque épisode est un flux distinct : le premier prompt crée une image, les suivants la prolongent. L'image de départ est facultative — les personnages et objets peuvent venir du texte. Les épisodes sont générés en parallèle.",
        h_shared: "Commun",
        q: "File par lots : beaucoup de prompts à la fois — un par ligne, ou des blocs séparés par une ligne vide.",
        dl: "Téléchargement auto : les fichiers terminés s'enregistrent seuls, nommés et regroupés par prompt.",
        retry:
          "Relance auto : optionnel ; relance les échecs d'insertion et de téléchargement jusqu'à 2 fois. L'« activité suspecte » n'est jamais relancée.",
        threads: "Threads parallèles : jusqu'à 6 générations à la fois.",
        rescue:
          "Sauvetage partiel (x2) : si une des deux images échoue, la bonne est quand même gardée. Vert = terminé, jaune = en cours, rouge = échec ; relancez l'échec depuis sa carte.",
        langs: "Langues : le sélecteur en haut traduit toute l'interface.",
        h_send: "Envoyer vers votre application",
        send_p:
          "GenFlow peut envoyer chaque fichier terminé vers un endpoint local. Activez-le avec l'interrupteur à côté de Copy API Key ; le contrat complet est derrière le bouton Integration guide.",
        note: "GenFlow ne fonctionne que tant que l'extension reste visible. Ne la couvrez pas avec des fenêtres plein écran — si elle sort de la vue, la génération s'arrête.",
      },
      de: {
        intro:
          "GenFlow steuert Google Flow für dich: Wähle eine Engine und einen Modus, füge deine Prompts ein, und es generiert und lädt sie im Batch herunter.",
        h_video: "Veo 3 — Video",
        t2v_p: "Prompt rein, Video raus. Ohne Eingabebild.",
        i2v_p: "Animiere deine Bilder. Drei Wege, sie zu verketten:",
        single_b: "ein Bild, ein Prompt.",
        multi_b: "unabhängige Segmente aus Bildpaaren:",
        multi_p:
          "Jedes Paar ist ein eigener Clip. Für mehrere getrennte Übergänge in einem Durchlauf.",
        film_b: "eine durchgehende Szene, Bild für Bild verkettet:",
        film_p:
          "Jede Einstellung setzt die vorige fort — lange, nahtlose Szenen in einem Take; die Geschichte einer Figur ohne Schnitte.",
        h_photo: "Banana — Bilder",
        psingle_b: "Text zu Bild.",
        ref_b:
          "füge ein Foto hinzu und gib ihm einen Namen. Wenn dieser Name in einem Prompt vorkommt, fügt GenFlow das Foto als Referenz ein. Behalte dieselbe Figur und denselben Kontext über einen endlosen Strom von Prompts.",
        pfilm_b:
          "Jede Episode ist ein eigener Stream: Der erste Prompt erzeugt ein Bild, die folgenden setzen es fort. Ein Startbild ist optional — Charaktere und Objekte können aus dem Text kommen. Episoden werden parallel generiert.",
        h_shared: "Allgemein",
        q: "Batch-Warteschlange: viele Prompts auf einmal — einer pro Zeile oder Blöcke durch eine Leerzeile getrennt.",
        dl: "Auto-Download: fertige Dateien speichern sich selbst, benannt und pro Prompt gruppiert.",
        retry:
          "Auto-Wiederholung: optional; wiederholt Einfüge- und Download-Fehler bis zu 2 Mal. «Verdächtige Aktivität» wird nie wiederholt.",
        threads: "Parallele Threads: bis zu 6 Generierungen gleichzeitig.",
        rescue:
          "Teil-Rettung (x2): Wenn eines von zwei Bildern fehlschlägt, wird das gute trotzdem gespeichert. Grün = fertig, gelb = läuft, rot = Fehler; wiederhole das fehlgeschlagene über seine Karte.",
        langs: "Sprachen: der Selektor oben übersetzt die gesamte Oberfläche.",
        h_send: "An deine App senden",
        send_p:
          "GenFlow kann jede fertige Datei an einen lokalen Endpunkt senden. Aktiviere es mit dem Schalter neben Copy API Key; der vollständige Vertrag steht hinter dem Button Integration guide.",
        note: "GenFlow läuft nur, solange die Erweiterung sichtbar bleibt. Verdecke sie nicht mit Vollbildfenstern — gerät sie außer Sicht, stoppt die Generierung.",
      },
      pt: {
        intro:
          "O GenFlow opera o Google Flow por você: escolha um motor e um modo, cole seus prompts, e ele gera e baixa em lotes.",
        h_video: "Veo 3 — vídeo",
        t2v_p: "Prompt na entrada, vídeo na saída. Sem imagem inicial.",
        i2v_p: "Anime suas imagens. Três formas de encadeá-las:",
        single_b: "uma imagem, um prompt.",
        multi_b: "segmentos independentes a partir de pares de imagens:",
        multi_p:
          "Cada par é um clipe próprio. Para várias transições separadas numa só rodada.",
        film_b: "uma cena contínua, encadeada quadro a quadro:",
        film_p:
          "Cada tomada continua a anterior — cenas longas e sem cortes numa única tomada; a história de um personagem sem cortes.",
        h_photo: "Banana — imagens",
        psingle_b: "texto para imagem.",
        ref_b:
          "adicione uma foto e dê um nome a ela. Quando esse nome aparece num prompt, o GenFlow insere a foto como referência. Mantenha o mesmo personagem e contexto por um fluxo infinito de prompts.",
        pfilm_b:
          "Cada episódio é um fluxo separado: o primeiro prompt cria um quadro e os seguintes o continuam. O quadro inicial é opcional — personagens e objetos podem vir do texto. Os episódios são gerados em paralelo.",
        h_shared: "Comum",
        q: "Fila em lote: muitos prompts de uma vez — um por linha, ou blocos separados por uma linha em branco.",
        dl: "Download automático: arquivos prontos se salvam sozinhos, nomeados e agrupados por prompt.",
        retry:
          "Repetição automática: opcional; repete falhas de inserção e download até 2 vezes. «Atividade suspeita» nunca é repetida.",
        threads: "Threads paralelos: até 6 gerações ao mesmo tempo.",
        rescue:
          "Resgate parcial (x2): se uma de duas imagens falhar, a boa ainda é salva. Verde = pronto, amarelo = em andamento, vermelho = falha; repita a que falhou pelo cartão dela.",
        langs: "Idiomas: o seletor no topo traduz toda a interface.",
        h_send: "Enviar para seu app",
        send_p:
          "O GenFlow pode enviar cada arquivo pronto para um endpoint local. Ative com o botão ao lado de Copy API Key; o contrato completo está atrás do botão Integration guide.",
        note: "O GenFlow só funciona enquanto a extensão fica visível. Não a cubra com janelas em tela cheia — se sair de vista, a geração para.",
      },
      it: {
        intro:
          "GenFlow guida Google Flow per te: scegli un motore e una modalità, incolla i tuoi prompt, e li genera e scarica in batch.",
        h_video: "Veo 3 — video",
        t2v_p: "Prompt in entrata, video in uscita. Senza immagine iniziale.",
        i2v_p: "Anima le tue immagini. Tre modi per concatenarle:",
        single_b: "un'immagine, un prompt.",
        multi_b: "segmenti indipendenti da coppie di immagini:",
        multi_p:
          "Ogni coppia è una clip a sé. Per più transizioni separate in un'unica esecuzione.",
        film_b: "una scena continua, concatenata fotogramma per fotogramma:",
        film_p:
          "Ogni inquadratura continua la precedente — scene lunghe e senza tagli in un'unica ripresa; la storia di un personaggio senza stacchi.",
        h_photo: "Banana — immagini",
        psingle_b: "testo in immagine.",
        ref_b:
          "aggiungi una foto e dalle un nome. Quando quel nome compare in un prompt, GenFlow inserisce la foto come riferimento. Mantieni lo stesso personaggio e contesto su un flusso infinito di prompt.",
        pfilm_b:
          "Ogni episodio è un flusso separato: il primo prompt crea un fotogramma, i successivi lo proseguono. Il fotogramma iniziale è facoltativo — personaggi e oggetti possono venire dal testo. Gli episodi vengono generati in parallelo.",
        h_shared: "Comune",
        q: "Coda in batch: molti prompt insieme — uno per riga, o blocchi separati da una riga vuota.",
        dl: "Download automatico: i file finiti si salvano da soli, nominati e raggruppati per prompt.",
        retry:
          "Ritentativo automatico: opzionale; ritenta gli errori di inserimento e download fino a 2 volte. L'«attività sospetta» non viene mai ritentata.",
        threads: "Thread paralleli: fino a 6 generazioni insieme.",
        rescue:
          "Recupero parziale (x2): se una di due immagini fallisce, quella buona viene comunque salvata. Verde = fatto, giallo = in corso, rosso = errore; ritenta quella fallita dalla sua scheda.",
        langs: "Lingue: il selettore in alto traduce tutta l'interfaccia.",
        h_send: "Invia alla tua app",
        send_p:
          "GenFlow può inviare ogni file finito a un endpoint locale. Attivalo con l'interruttore accanto a Copy API Key; il contratto completo è dietro il pulsante Integration guide.",
        note: "GenFlow funziona solo finché l'estensione resta visibile. Non coprirla con finestre a schermo intero — se esce dalla vista, la generazione si ferma.",
      },
      ja: {
        intro:
          "GenFlow があなたの代わりに Google Flow を操作します。エンジンとモードを選び、プロンプトを貼り付けると、まとめて生成・ダウンロードします。",
        h_video: "Veo 3 — 動画",
        t2v_p: "プロンプトを入力すると動画ができます。入力画像は不要です。",
        i2v_p: "自分の画像を動かします。つなげ方は3通り：",
        single_b: "画像1枚、プロンプト1つ。",
        multi_b: "画像のペアから独立したセグメントを作成：",
        multi_p:
          "各ペアが独立したクリップになります。1回で複数の別々の遷移を作るのに便利。",
        film_b: "1つの連続したシーン、フレームごとに連結：",
        film_p:
          "各ショットが前のショットを引き継ぎ、長くつなぎ目のないシーンを一発撮りで。1人のキャラクターの物語をカットなしで。",
        h_photo: "Banana — 画像",
        psingle_b: "テキストから画像。",
        ref_b:
          "写真を追加して名前を付けます。その名前がプロンプトに含まれると、GenFlow がその写真を参照として挿入します。無限のプロンプト全体で同じキャラクターと文脈を保てます。",
        pfilm_b:
          "各エピソードは独立したストリームです。最初のプロンプトがフレームを作成し、続くプロンプトがそれを引き継ぎます。開始フレームは任意で、キャラクターやオブジェクトはテキストから指定できます。エピソードは並行して生成されます。",
        h_shared: "共通",
        q: "バッチキュー：一度に多数のプロンプト。1行に1つ、または空行で区切ったブロック。",
        dl: "自動ダウンロード：完成ファイルは自動保存され、プロンプトごとに名前付け・グループ化されます。",
        retry:
          "自動リトライ：任意。挿入・ダウンロードの失敗を最大2回まで再試行。「不審なアクティビティ」は再試行しません。",
        threads: "並列スレッド：最大6件を同時に生成。",
        rescue:
          "部分救済（x2）：2枚のうち1枚が失敗しても、成功した方は保存されます。緑=完了、黄=進行中、赤=失敗。失敗分はカードから再試行。",
        langs: "言語：上部のセレクターがUI全体を翻訳します。",
        h_send: "自分のアプリに送信",
        send_p:
          "GenFlow は完成した各ファイルをローカルのエンドポイントに送信できます。Copy API Key の隣のトグルでオンにします。完全な仕様は Integration guide ボタンの中にあります。",
        note: "GenFlow は拡張機能が見えている間だけ動作します。全画面ウィンドウで覆わないでください。表示外になると生成が停止します。",
      },
      ko: {
        intro:
          "GenFlow가 대신 Google Flow를 조작합니다. 엔진과 모드를 고르고 프롬프트를 붙여넣으면 일괄로 생성하고 다운로드합니다.",
        h_video: "Veo 3 — 비디오",
        t2v_p: "프롬프트를 넣으면 비디오가 나옵니다. 입력 이미지 불필요.",
        i2v_p: "내 이미지를 움직입니다. 연결 방법 3가지:",
        single_b: "이미지 1장, 프롬프트 1개.",
        multi_b: "이미지 쌍에서 독립적인 구간 생성:",
        multi_p:
          "각 쌍이 별도 클립이 됩니다. 한 번에 여러 개의 개별 전환을 만들 때.",
        film_b: "하나의 연속 장면, 프레임 단위로 연결:",
        film_p:
          "각 샷이 이전 샷을 이어받아 길고 이음매 없는 장면을 한 번에. 한 캐릭터의 이야기를 컷 없이.",
        h_photo: "Banana — 이미지",
        psingle_b: "텍스트에서 이미지로.",
        ref_b:
          "사진을 추가하고 이름을 지정하세요. 그 이름이 프롬프트에 나오면 GenFlow가 그 사진을 참조로 삽입합니다. 끝없는 프롬프트 흐름에서 같은 캐릭터와 맥락을 유지하세요.",
        pfilm_b:
          "각 에피소드는 별도의 스트림입니다. 첫 프롬프트가 프레임을 만들고 이후 프롬프트가 이어갑니다. 시작 프레임은 선택 사항이며 캐릭터와 오브젝트는 텍스트로 지정할 수 있습니다. 에피소드는 병렬로 생성됩니다.",
        h_shared: "공통",
        q: "배치 큐: 여러 프롬프트를 한 번에 — 한 줄에 하나, 또는 빈 줄로 구분한 블록.",
        dl: "자동 다운로드: 완료된 파일이 스스로 저장되고 프롬프트별로 이름·그룹화됩니다.",
        retry:
          "자동 재시도: 선택 사항. 삽입·다운로드 실패를 최대 2회 재시도. «의심스러운 활동»은 재시도하지 않습니다.",
        threads: "병렬 스레드: 최대 6개 동시 생성.",
        rescue:
          "부분 구제(x2): 두 이미지 중 하나가 실패해도 성공한 것은 저장됩니다. 초록=완료, 노랑=진행 중, 빨강=실패. 실패한 것은 카드에서 재시도.",
        langs: "언어: 상단 선택기가 전체 UI를 번역합니다.",
        h_send: "내 앱으로 보내기",
        send_p:
          "GenFlow는 완료된 각 파일을 로컬 엔드포인트로 보낼 수 있습니다. Copy API Key 옆 토글로 켜세요. 전체 규격은 Integration guide 버튼 안에 있습니다.",
        note: "GenFlow는 확장이 보이는 동안에만 작동합니다. 전체 화면 창으로 가리지 마세요. 화면에서 벗어나면 생성이 멈춥니다.",
      },
      zh: {
        intro:
          "GenFlow 替你操作 Google Flow：选择引擎和模式，粘贴提示词，它会批量生成并下载。",
        h_video: "Veo 3 — 视频",
        t2v_p: "输入提示词，输出视频。无需输入图片。",
        i2v_p: "让你的图片动起来。三种串联方式：",
        single_b: "一张图，一个提示词。",
        multi_b: "由图片成对生成独立片段：",
        multi_p: "每一对是各自的片段。适合一次生成多个独立转场。",
        film_b: "一个连续场景，逐帧串联：",
        film_p:
          "每个镜头承接上一个——一镜到底的长而无缝的场景；无切换地讲述一个角色的故事。",
        h_photo: "Banana — 图片",
        psingle_b: "文字生成图片。",
        ref_b:
          "添加一张照片并给它命名。当该名称出现在提示词中时，GenFlow 会把这张照片作为参考插入。在无限的提示词流中保持同一角色和情境。",
        pfilm_b: "每个剧集都是独立的流：第一个提示词生成一帧，后续提示词在其基础上延续。起始帧可选——角色和物体可来自文本。剧集并行生成。",
        h_shared: "通用",
        q: "批量队列：一次多个提示词——每行一个，或用空行分隔成块。",
        dl: "自动下载：完成的文件自动保存，按提示词命名并分组。",
        retry:
          "自动重试：可选；对插入和下载失败最多重试 2 次。「可疑活动」绝不重试。",
        threads: "并行线程：最多同时 6 个生成。",
        rescue:
          "部分挽救（x2）：两张图中有一张失败时，好的那张仍会保存。绿=完成，黄=进行中，红=失败；从卡片重试失败的那张。",
        langs: "语言：顶部的选择器翻译整个界面。",
        h_send: "发送到你的应用",
        send_p:
          "GenFlow 可将每个完成的文件推送到本地端点。用 Copy API Key 旁的开关启用；完整说明在 Integration guide 按钮里。",
        note: "GenFlow 仅在扩展可见时工作。不要用全屏窗口遮挡它——一旦离开视野，生成就会停止。",
      },
      hi: {
        intro:
          "GenFlow आपके लिए Google Flow चलाता है: एक इंजन और मोड चुनें, अपने प्रॉम्प्ट पेस्ट करें, और यह उन्हें बैच में जनरेट और डाउनलोड करता है।",
        h_video: "Veo 3 — वीडियो",
        t2v_p: "प्रॉम्प्ट दें, वीडियो पाएं। कोई इनपुट इमेज नहीं।",
        i2v_p: "अपनी इमेज को एनिमेट करें। उन्हें जोड़ने के तीन तरीके:",
        single_b: "एक इमेज, एक प्रॉम्प्ट।",
        multi_b: "इमेज जोड़ियों से स्वतंत्र सेगमेंट:",
        multi_p:
          "हर जोड़ी अपनी अलग क्लिप है। एक ही बार में कई अलग ट्रांज़िशन के लिए।",
        film_b: "एक सतत दृश्य, फ्रेम-दर-फ्रेम जुड़ा हुआ:",
        film_p:
          "हर शॉट पिछले को आगे बढ़ाता है — एक ही टेक में लंबे, बिना जोड़ वाले दृश्य; बिना कट के एक किरदार की कहानी।",
        h_photo: "Banana — इमेज",
        psingle_b: "टेक्स्ट से इमेज।",
        ref_b:
          "एक फोटो जोड़ें और उसे नाम दें। जब वह नाम किसी प्रॉम्प्ट में आता है, GenFlow उस फोटो को रेफरेंस के रूप में डालता है। अनगिनत प्रॉम्प्ट में वही किरदार और संदर्भ बनाए रखें।",
        pfilm_b:
          "हर एपिसोड एक अलग स्ट्रीम है: पहला प्रॉम्प्ट एक फ़्रेम बनाता है, बाकी उसे जारी रखते हैं। शुरुआती फ़्रेम वैकल्पिक है — किरदार और ऑब्जेक्ट टेक्स्ट से लिए जा सकते हैं। एपिसोड समानांतर में बनते हैं।",
        h_shared: "सामान्य",
        q: "बैच क्यू: एक साथ कई प्रॉम्प्ट — हर लाइन पर एक, या खाली लाइन से अलग किए ब्लॉक।",
        dl: "ऑटो-डाउनलोड: पूरे हुए फाइल खुद सेव होते हैं, प्रॉम्प्ट के हिसाब से नाम और समूह।",
        retry:
          "ऑटो-रिट्राई: वैकल्पिक; इंसर्ट और डाउनलोड की विफलता को 2 बार तक दोहराता है। «संदिग्ध गतिविधि» कभी नहीं दोहराई जाती।",
        threads: "समानांतर थ्रेड: एक साथ 6 तक जनरेशन।",
        rescue:
          "आंशिक बचाव (x2): दो में से एक इमेज विफल हो तो अच्छी वाली फिर भी सेव होती है। हरा = पूर्ण, पीला = चल रहा, लाल = विफल; विफल को उसके कार्ड से दोहराएं।",
        langs: "भाषाएं: ऊपर का सेलेक्टर पूरा इंटरफेस अनुवाद करता है।",
        h_send: "अपने ऐप को भेजें",
        send_p:
          "GenFlow हर पूर्ण फाइल को एक लोकल एंडपॉइंट पर भेज सकता है। Copy API Key के पास के टॉगल से चालू करें; पूरा कॉन्ट्रैक्ट Integration guide बटन में है।",
        note: "GenFlow तभी काम करता है जब एक्सटेंशन दिखता रहे। इसे फुल-स्क्रीन विंडो से न ढकें — नज़र से हटते ही जनरेशन रुक जाता है।",
      },
      ar: {
        intro:
          "يشغّل GenFlow خدمة Google Flow نيابةً عنك: اختر محركًا ووضعًا، الصق مطالباتك، فيقوم بإنشائها وتنزيلها على دفعات.",
        h_video: "Veo 3 — فيديو",
        t2v_p: "مطالبة في الدخل، فيديو في الخرج. بدون صورة مدخلة.",
        i2v_p: "حرّك صورك. ثلاث طرق لربطها:",
        single_b: "صورة واحدة، مطالبة واحدة.",
        multi_b: "مقاطع مستقلة من أزواج الصور:",
        multi_p: "كل زوج مقطع مستقل. لعدة انتقالات منفصلة في تشغيل واحد.",
        film_b: "مشهد واحد متصل، مرتبط إطارًا بإطار:",
        film_p:
          "كل لقطة تكمل السابقة — مشاهد طويلة بلا قطع في لقطة واحدة؛ قصة شخصية واحدة دون قطع.",
        h_photo: "Banana — صور",
        psingle_b: "من نص إلى صورة.",
        ref_b:
          "أضف صورة وأعطها اسمًا. عندما يظهر هذا الاسم في مطالبة، يُدرج GenFlow الصورة كمرجع. حافظ على نفس الشخصية والسياق عبر تدفق لا نهائي من المطالبات.",
        pfilm_b: "كل حلقة تدفّق منفصل: الموجّه الأول ينشئ إطارًا، والباقي يكمله. الإطار الأول اختياري — يمكن أخذ الشخصيات والعناصر من النص. تُولَّد الحلقات بالتوازي.",
        h_shared: "عام",
        q: "قائمة الدُفعات: مطالبات كثيرة دفعة واحدة — واحدة لكل سطر، أو كتل يفصلها سطر فارغ.",
        dl: "تنزيل تلقائي: الملفات الجاهزة تُحفظ تلقائيًا، مسمّاة ومجمّعة حسب المطالبة.",
        retry:
          "إعادة محاولة تلقائية: اختيارية؛ تعيد محاولة فشل الإدراج والتنزيل حتى مرتين. «النشاط المشبوه» لا يُعاد أبدًا.",
        threads: "خيوط متوازية: حتى 6 عمليات إنشاء في وقت واحد.",
        rescue:
          "إنقاذ جزئي (x2): إذا فشلت إحدى صورتين، تُحفظ الجيدة على أي حال. أخضر = تم، أصفر = جارٍ، أحمر = فشل؛ أعد الفاشلة من بطاقتها.",
        langs: "اللغات: المُحدِّد في الأعلى يترجم الواجهة كاملة.",
        h_send: "أرسل إلى تطبيقك",
        send_p:
          "يمكن لـ GenFlow إرسال كل ملف جاهز إلى نقطة نهاية محلية. فعّله بالمفتاح بجوار Copy API Key؛ العقد الكامل خلف زر Integration guide.",
        note: "يعمل GenFlow فقط طالما الإضافة ظاهرة. لا تغطّها بنوافذ ملء الشاشة — إذا خرجت عن النظر يتوقف الإنشاء.",
      },
      id: {
        intro:
          "GenFlow menjalankan Google Flow untukmu: pilih mesin dan mode, tempel prompt-mu, lalu ia membuat dan mengunduhnya secara batch.",
        h_video: "Veo 3 — video",
        t2v_p: "Prompt masuk, video keluar. Tanpa gambar masukan.",
        i2v_p: "Animasikan gambarmu. Tiga cara merangkainya:",
        single_b: "satu gambar, satu prompt.",
        multi_b: "segmen independen dari pasangan gambar:",
        multi_p:
          "Setiap pasangan jadi klip sendiri. Untuk beberapa transisi terpisah dalam sekali jalan.",
        film_b: "satu adegan berkelanjutan, dirangkai bingkai demi bingkai:",
        film_p:
          "Tiap bidikan melanjutkan yang sebelumnya — adegan panjang tanpa sambungan dalam sekali ambil; kisah satu karakter tanpa potongan.",
        h_photo: "Banana — gambar",
        psingle_b: "teks ke gambar.",
        ref_b:
          "tambahkan foto dan beri nama. Saat nama itu muncul dalam prompt, GenFlow menyisipkan foto itu sebagai referensi. Pertahankan karakter dan konteks yang sama di aliran prompt tanpa batas.",
        pfilm_b:
          "Setiap episode adalah aliran terpisah: prompt pertama membuat bingkai, sisanya melanjutkannya. Bingkai awal opsional — karakter dan objek bisa berasal dari teks. Episode dibuat secara paralel.",
        h_shared: "Umum",
        q: "Antrean batch: banyak prompt sekaligus — satu per baris, atau blok dipisah baris kosong.",
        dl: "Unduh otomatis: file selesai tersimpan sendiri, dinamai dan dikelompokkan per prompt.",
        retry:
          "Coba ulang otomatis: opsional; mengulang kegagalan penyisipan dan unduhan hingga 2 kali. «Aktivitas mencurigakan» tidak pernah diulang.",
        threads: "Thread paralel: hingga 6 generasi sekaligus.",
        rescue:
          "Penyelamatan sebagian (x2): jika satu dari dua gambar gagal, yang baik tetap disimpan. Hijau = selesai, kuning = berjalan, merah = gagal; ulangi yang gagal dari kartunya.",
        langs: "Bahasa: pemilih di atas menerjemahkan seluruh antarmuka.",
        h_send: "Kirim ke aplikasimu",
        send_p:
          "GenFlow dapat mengirim setiap file selesai ke endpoint lokal. Aktifkan dengan sakelar di samping Copy API Key; kontrak lengkap ada di balik tombol Integration guide.",
        note: "GenFlow hanya bekerja selama ekstensi terlihat. Jangan tutupi dengan jendela layar penuh — jika keluar dari pandangan, generasi berhenti.",
      },
      ms: {
        intro:
          "GenFlow mengendalikan Google Flow untuk anda: pilih enjin dan mod, tampal prompt anda, dan ia menjana serta memuat turunnya secara kelompok.",
        h_video: "Veo 3 — video",
        t2v_p: "Prompt masuk, video keluar. Tiada imej input.",
        i2v_p: "Animasikan imej anda. Tiga cara merangkainya:",
        single_b: "satu imej, satu prompt.",
        multi_b: "segmen bebas daripada pasangan imej:",
        multi_p:
          "Setiap pasangan jadi klip sendiri. Untuk beberapa peralihan berasingan dalam satu larian.",
        film_b: "satu babak berterusan, dirangkai bingkai demi bingkai:",
        film_p:
          "Setiap syot menyambung yang sebelumnya — babak panjang tanpa sambungan dalam satu ambilan; kisah satu watak tanpa potongan.",
        h_photo: "Banana — imej",
        psingle_b: "teks ke imej.",
        ref_b:
          "tambah foto dan beri nama. Apabila nama itu muncul dalam prompt, GenFlow menyisip foto itu sebagai rujukan. Kekalkan watak dan konteks yang sama merentas aliran prompt tanpa had.",
        pfilm_b:
          "Setiap episod ialah aliran berasingan: prompt pertama mencipta bingkai, selebihnya menyambungnya. Bingkai mula adalah pilihan — watak dan objek boleh datang daripada teks. Episod dijana secara selari.",
        h_shared: "Umum",
        q: "Baris gilir kelompok: banyak prompt sekali gus — satu setiap baris, atau blok dipisah baris kosong.",
        dl: "Muat turun automatik: fail siap disimpan sendiri, dinamakan dan dikumpul mengikut prompt.",
        retry:
          "Cuba semula automatik: pilihan; mengulang kegagalan sisipan dan muat turun sehingga 2 kali. «Aktiviti mencurigakan» tidak pernah diulang.",
        threads: "Bebenang selari: sehingga 6 penjanaan serentak.",
        rescue:
          "Penyelamatan separa (x2): jika satu daripada dua imej gagal, yang baik tetap disimpan. Hijau = siap, kuning = berjalan, merah = gagal; ulang yang gagal dari kadnya.",
        langs: "Bahasa: pemilih di atas menterjemah seluruh antara muka.",
        h_send: "Hantar ke aplikasi anda",
        send_p:
          "GenFlow boleh menghantar setiap fail siap ke titik akhir tempatan. Hidupkan dengan togol di sebelah Copy API Key; kontrak penuh di sebalik butang Integration guide.",
        note: "GenFlow hanya berfungsi selagi sambungan kelihatan. Jangan tutup dengan tetingkap skrin penuh — jika hilang dari pandangan, penjanaan berhenti.",
      },
      vi: {
        intro:
          "GenFlow vận hành Google Flow thay bạn: chọn engine và chế độ, dán prompt, rồi nó tạo và tải về theo lô.",
        h_video: "Veo 3 — video",
        t2v_p: "Nhập prompt, ra video. Không cần ảnh đầu vào.",
        i2v_p: "Làm động ảnh của bạn. Ba cách nối chúng:",
        single_b: "một ảnh, một prompt.",
        multi_b: "các đoạn độc lập từ các cặp ảnh:",
        multi_p:
          "Mỗi cặp là một clip riêng. Dùng cho nhiều chuyển cảnh riêng biệt trong một lần chạy.",
        film_b: "một cảnh liên tục, nối khung hình với khung hình:",
        film_p:
          "Mỗi cảnh quay tiếp nối cảnh trước — những cảnh dài liền mạch trong một lần quay; câu chuyện một nhân vật không cắt.",
        h_photo: "Banana — hình ảnh",
        psingle_b: "văn bản thành hình ảnh.",
        ref_b:
          "thêm một ảnh và đặt tên cho nó. Khi tên đó xuất hiện trong prompt, GenFlow chèn ảnh đó làm tham chiếu. Giữ cùng một nhân vật và bối cảnh xuyên suốt dòng prompt vô tận.",
        pfilm_b:
          "Mỗi tập là một luồng riêng: câu lệnh đầu tạo khung hình, các câu sau tiếp nối. Khung hình mở đầu là tùy chọn — nhân vật và vật thể có thể lấy từ văn bản. Các tập được tạo song song.",
        h_shared: "Chung",
        q: "Hàng đợi theo lô: nhiều prompt cùng lúc — mỗi dòng một prompt, hoặc các khối ngăn bởi dòng trống.",
        dl: "Tự động tải về: tệp hoàn tất tự lưu, được đặt tên và nhóm theo prompt.",
        retry:
          "Tự động thử lại: tùy chọn; thử lại lỗi chèn và tải về tối đa 2 lần. «Hoạt động đáng ngờ» không bao giờ thử lại.",
        threads: "Luồng song song: tối đa 6 lần tạo cùng lúc.",
        rescue:
          "Cứu một phần (x2): nếu một trong hai ảnh lỗi, ảnh tốt vẫn được lưu. Xanh = xong, vàng = đang chạy, đỏ = lỗi; thử lại ảnh lỗi từ thẻ của nó.",
        langs: "Ngôn ngữ: bộ chọn ở trên dịch toàn bộ giao diện.",
        h_send: "Gửi đến ứng dụng của bạn",
        send_p:
          "GenFlow có thể đẩy mỗi tệp hoàn tất đến một endpoint cục bộ. Bật bằng công tắc cạnh Copy API Key; hợp đồng đầy đủ nằm sau nút Integration guide.",
        note: "GenFlow chỉ hoạt động khi tiện ích còn hiển thị. Đừng che nó bằng cửa sổ toàn màn hình — nếu khuất tầm nhìn, việc tạo sẽ dừng.",
      },
      th: {
        intro:
          "GenFlow ควบคุม Google Flow แทนคุณ: เลือกเอนจินและโหมด วางพรอมต์ของคุณ แล้วมันจะสร้างและดาวน์โหลดเป็นชุด",
        h_video: "Veo 3 — วิดีโอ",
        t2v_p: "ใส่พรอมต์ ได้วิดีโอ ไม่ต้องมีภาพนำเข้า",
        i2v_p: "ทำให้ภาพของคุณเคลื่อนไหว มีสามวิธีในการร้อยเรียง:",
        single_b: "หนึ่งภาพ หนึ่งพรอมต์",
        multi_b: "ส่วนแยกอิสระจากคู่ภาพ:",
        multi_p:
          "แต่ละคู่เป็นคลิปของตัวเอง เหมาะกับการเปลี่ยนฉากแยกหลายอันในรอบเดียว",
        film_b: "ฉากต่อเนื่องเดียว ร้อยเฟรมต่อเฟรม:",
        film_p:
          "แต่ละช็อตต่อจากช็อตก่อนหน้า — ฉากยาวไร้รอยต่อในเทคเดียว เล่าเรื่องของตัวละครเดียวโดยไม่ตัด",
        h_photo: "Banana — ภาพ",
        psingle_b: "ข้อความเป็นภาพ",
        ref_b:
          "เพิ่มรูปและตั้งชื่อให้มัน เมื่อชื่อนั้นปรากฏในพรอมต์ GenFlow จะแทรกรูปนั้นเป็นการอ้างอิง คงตัวละครและบริบทเดิมไว้ตลอดสายพรอมต์ที่ไม่สิ้นสุด",
        pfilm_b: "แต่ละตอนเป็นสตรีมแยกกัน: พรอมต์แรกสร้างเฟรม ส่วนที่เหลือต่อจากเฟรมนั้น เฟรมเริ่มต้นไม่บังคับ — ตัวละครและวัตถุมาจากข้อความได้ ตอนต่าง ๆ ถูกสร้างแบบขนาน",
        h_shared: "ทั่วไป",
        q: "คิวแบบชุด: พรอมต์จำนวนมากในครั้งเดียว — บรรทัดละหนึ่ง หรือบล็อกที่คั่นด้วยบรรทัดว่าง",
        dl: "ดาวน์โหลดอัตโนมัติ: ไฟล์ที่เสร็จจะบันทึกเอง ตั้งชื่อและจัดกลุ่มตามพรอมต์",
        retry:
          "ลองใหม่อัตโนมัติ: เป็นตัวเลือก; ลองใหม่เมื่อการแทรกและการดาวน์โหลดล้มเหลวสูงสุด 2 ครั้ง «กิจกรรมที่น่าสงสัย» จะไม่ถูกลองใหม่",
        threads: "เธรดขนาน: สร้างพร้อมกันสูงสุด 6 รายการ",
        rescue:
          "การกู้บางส่วน (x2): หากภาพหนึ่งในสองล้มเหลว ภาพที่ดียังถูกบันทึก เขียว = เสร็จ เหลือง = กำลังทำ แดง = ล้มเหลว; ลองภาพที่ล้มเหลวใหม่จากการ์ดของมัน",
        langs: "ภาษา: ตัวเลือกด้านบนแปลทั้งอินเทอร์เฟซ",
        h_send: "ส่งไปยังแอปของคุณ",
        send_p:
          "GenFlow สามารถส่งไฟล์ที่เสร็จทุกไฟล์ไปยัง endpoint ในเครื่อง เปิดด้วยสวิตช์ข้าง Copy API Key; ข้อกำหนดเต็มอยู่หลังปุ่ม Integration guide",
        note: "GenFlow ทำงานเฉพาะตอนที่ส่วนขยายยังมองเห็นได้ อย่าบังด้วยหน้าต่างเต็มจอ — ถ้ามันพ้นสายตา การสร้างจะหยุด",
      },
      tr: {
        intro:
          "GenFlow, Google Flow'u senin yerine çalıştırır: bir motor ve mod seç, prompt'larını yapıştır, o da toplu olarak üretip indirir.",
        h_video: "Veo 3 — video",
        t2v_p: "Prompt gir, video çıkar. Girdi görseli gerekmez.",
        i2v_p: "Kendi görsellerini canlandır. Onları zincirlemenin üç yolu:",
        single_b: "bir görsel, bir prompt.",
        multi_b: "görsel çiftlerinden bağımsız bölümler:",
        multi_p: "Her çift kendi klibidir. Tek seferde birkaç ayrı geçiş için.",
        film_b: "tek bir sürekli sahne, kare kareye zincirlenir:",
        film_p:
          "Her çekim öncekini sürdürür — tek çekimde uzun, kesintisiz sahneler; tek bir karakterin hikâyesi kesintisiz.",
        h_photo: "Banana — görseller",
        psingle_b: "metinden görsele.",
        ref_b:
          "bir fotoğraf ekle ve ona bir ad ver. O ad bir prompt'ta geçtiğinde GenFlow fotoğrafı referans olarak ekler. Sonsuz bir prompt akışı boyunca aynı karakteri ve bağlamı koru.",
        pfilm_b:
          "Her bölüm ayrı bir akıştır: ilk istem bir kare oluşturur, sonrakiler onu sürdürür. Başlangıç karesi isteğe bağlıdır — karakterler ve nesneler metinden gelebilir. Bölümler paralel olarak üretilir.",
        h_shared: "Ortak",
        q: "Toplu kuyruk: aynı anda çok prompt — her satıra bir, ya da boş satırla ayrılmış bloklar.",
        dl: "Otomatik indirme: biten dosyalar kendi kaydedilir, prompt'a göre adlandırılır ve gruplanır.",
        retry:
          "Otomatik yeniden deneme: isteğe bağlı; ekleme ve indirme hatalarını 2 kez yeniden dener. «Şüpheli etkinlik» asla yeniden denenmez.",
        threads: "Paralel iş parçacıkları: aynı anda 6 üretime kadar.",
        rescue:
          "Kısmi kurtarma (x2): iki görselden biri başarısız olursa iyi olan yine de kaydedilir. Yeşil = bitti, sarı = sürüyor, kırmızı = başarısız; başarısız olanı kartından yeniden dene.",
        langs: "Diller: üstteki seçici tüm arayüzü çevirir.",
        h_send: "Kendi uygulamana gönder",
        send_p:
          "GenFlow her biten dosyayı yerel bir uç noktaya gönderebilir. Copy API Key yanındaki anahtarla aç; tam sözleşme Integration guide düğmesinin arkasında.",
        note: "GenFlow yalnızca uzantı görünür kaldığı sürece çalışır. Onu tam ekran pencerelerle kapatma — görüş alanından çıkarsa üretim durur.",
      },
    };

    var STRUCT = [
      { p: "intro" },
      { hr: 1 },
      { h2: "h_video" },
      { h3lit: "Text to Video" },
      { p: "t2v_p" },
      { h3lit: "Image to Video" },
      { p: "i2v_p" },
      { lead: "Single", li: "single_b" },
      { lead: "Multi", li: "multi_b" },
      { code: "1-2\n3-4\n5-6" },
      { p: "multi_p" },
      { lead: "Flow", li: "film_b" },
      { code: "1-2\n2-3\n3-4" },
      { p: "film_p" },
      { hr: 1 },
      { h2: "h_photo" },
      { lead: "Single", li: "psingle_b" },
      { lead: "Film", li: "pfilm_b" },
      { hr: 1 },
      { lead: "Reference", li: "ref_b" },
      { hr: 1 },
      { h2: "h_shared" },
      { li: "q" },
      { li: "dl" },
      { li: "retry" },
      { li: "threads" },
      { li: "rescue" },
      { li: "langs" },
      { hr: 1 },
      { h2: "h_send" },
      { p: "send_p" },
      { hr: 1 },
      { p: "note" },
    ];

    var PRE =
      "background:#0f0c1f;padding:7px 9px;border-radius:6px;font-family:Consolas,monospace;font-size:12px;white-space:pre;overflow-x:auto;margin:5px 0;line-height:1.5;color:#ffffff";
    var CBTN =
      "font-size:10px;padding:2px 9px;border:0;border-radius:5px;background:#3a3560;color:#cfc8ff;cursor:pointer";
    var lang = "en";
    function tr(k) {
      var o = T[lang] && T[lang][k];
      return o != null ? o : T.en[k] || k;
    }
    function curLang() {
      try {
        var sel = document.querySelector('select[title="Interface language"]');
        var v = sel && sel.value;
        return v && T[v] ? v : "en";
      } catch (_) {
        return "en";
      }
    }

    var P = document.createElement("div");
    P.id = "gf-modes-panel";
    P.style.cssText =
      "position:fixed;top:46px;left:46px;width:440px;max-height:84vh;z-index:2147483647;display:none;flex-direction:column;background:#1a1530;border:1px solid #3a3560;border-radius:10px;box-shadow:0 14px 44px rgba(0,0,0,.6);color:#ffffff;font-family:system-ui,Segoe UI,sans-serif;font-size:12px;overflow:hidden";
    var head = document.createElement("div");
    head.id = "gf-modes-head";
    head.style.cssText =
      "cursor:move;padding:9px 11px;background:#241d40;display:flex;justify-content:space-between;align-items:center;gap:8px;user-select:none;flex:0 0 auto";
    var ht = document.createElement("b");
    ht.textContent = "GenFlow — Guide";
    var hr = document.createElement("div");
    hr.style.cssText = "display:flex;align-items:center;gap:6px";
    var cpBtn = document.createElement("button");
    cpBtn.textContent = "Copy";
    cpBtn.style.cssText = CBTN;
    var x = document.createElement("span");
    x.id = "gf-modes-x";
    x.textContent = "×";
    x.style.cssText =
      "cursor:pointer;font-size:18px;line-height:1;opacity:.7;padding:0 2px";
    x.onclick = function () {
      P.style.display = "none";
    };
    hr.appendChild(cpBtn);
    hr.appendChild(x);
    head.appendChild(ht);
    head.appendChild(hr);

    var body = document.createElement("div");
    body.style.cssText = "padding:11px 13px;overflow-y:auto;color:#ffffff";

    function render() {
      body.innerHTML = "";
      STRUCT.forEach(function (b) {
        var e;
        if (b.hr) {
          e = document.createElement("div");
          e.style.cssText = "border-top:1px solid #3a3560;margin:13px 0";
        } else if (b.h2) {
          e = document.createElement("div");
          e.textContent = tr(b.h2);
          e.style.cssText =
            "font-weight:700;font-size:13px;margin:14px 0 5px;color:#ffffff";
        } else if (b.h3lit) {
          e = document.createElement("div");
          e.textContent = b.h3lit;
          e.style.cssText = "font-weight:600;margin:9px 0 2px;color:#ffffff";
        } else if (b.code) {
          e = document.createElement("pre");
          e.textContent = b.code;
          e.style.cssText = PRE;
        } else if (b.lead) {
          e = document.createElement("div");
          e.style.cssText = "margin:4px 0;line-height:1.55;color:#ffffff";
          var bb = document.createElement("b");
          bb.style.color = "#ffffff";
          bb.textContent = b.lead + " — ";
          e.appendChild(bb);
          e.appendChild(document.createTextNode(tr(b.li)));
        } else if (b.li) {
          e = document.createElement("div");
          e.style.cssText = "margin:4px 0;line-height:1.55;color:#ffffff";
          e.textContent = "• " + tr(b.li);
        } else {
          e = document.createElement("div");
          e.textContent = tr(b.p);
          e.style.cssText = "margin:5px 0;line-height:1.55;color:#ffffff";
        }
        body.appendChild(e);
      });
    }
    function toText() {
      return STRUCT.map(function (b) {
        if (b.hr) return "———";
        if (b.h2) return "\n## " + tr(b.h2);
        if (b.h3lit) return "\n" + b.h3lit;
        if (b.code) return b.code;
        if (b.lead) return "• " + b.lead + " — " + tr(b.li);
        if (b.li) return "• " + tr(b.li);
        return tr(b.p);
      }).join("\n");
    }
    function sync() {
      lang = curLang();
      render();
    }

    cpBtn.onclick = function () {
      try {
        navigator.clipboard.writeText(toText());
      } catch (_) {}
      var o = cpBtn.textContent;
      cpBtn.textContent = "✓";
      setTimeout(function () {
        cpBtn.textContent = o;
      }, 1200);
    };
    document.addEventListener("change", function (e) {
      var t = e.target;
      if (t && t.matches && t.matches('select[title="Interface language"]')) {
        sync();
      }
    });

    P.appendChild(head);
    P.appendChild(body);
    document.body.appendChild(P);
    sync();

    head.onmousedown = function (ev) {
      if (ev.target.tagName === "BUTTON" || ev.target.id === "gf-modes-x")
        return;
      var sx = ev.clientX,
        sy = ev.clientY,
        r = P.getBoundingClientRect(),
        ox = r.left,
        oy = r.top;
      function mv(e) {
        P.style.left = Math.max(0, ox + e.clientX - sx) + "px";
        P.style.top = Math.max(0, oy + e.clientY - sy) + "px";
      }
      function up() {
        document.removeEventListener("mousemove", mv);
        document.removeEventListener("mouseup", up);
      }
      document.addEventListener("mousemove", mv);
      document.addEventListener("mouseup", up);
      ev.preventDefault();
    };

    window.__gfModes = {
      open: function () {
        sync();
        P.style.display = "flex";
      },
    };
  } catch (e) {}
})();
