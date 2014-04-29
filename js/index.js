'use strict';

function err(msg) {
  throw new Error(msg);
}

function isFunction(thing) {
  return typeof thing === 'function';
}

function isKind(thing, kind) {
  return Object.prototype.toString.call(thing) === '[object ' + kind + ']';
}  

function isObject(thing) {
  return isKind(thing, 'Object');
}

function isArray(thing) {
  return isKind(thing, 'Array');
}

function mergeInto(target, src) {
  for (var property in src) {
    if (src.hasOwnProperty(property)) {
      target[property] = src[property];
    }
  }
  return target;
}


/**
 *  Generic subclass generator. Assign this as a static property (on
 *  the constructor) or call it from your own `extend` function like
 *  `var Constructor = extend.call(this)` where `this` is your parent
 *  class constructor.
 */
function extend(props) {
  var Parent = this;
  function Constructor() {
    return Parent.apply(this, arguments);
  }
  var proto = Constructor.prototype = Object.create(
    Parent.prototype
  );
  props && mergeInto(proto, props);
  proto.constructor = Constructor;
  Constructor.extend = Parent.extend;
  return Constructor;
}


/**
 *  Does the config object imply an instance of the given Subclass?
 *
 *  @private
 */
function impliesSubclass(config, Subclass) {
  var subtype = Subclass.prototype.subtype;
  if (isObject(subtype)) {
    for (var name in subtype) {
      //console.log('name: ' + name + ' config[name]=' + config[name] + ' subtype[name]=' + subtype[name]);
      if (!config.hasOwnProperty(name) || config[name] !== subtype[name]) {
        subtype = false;
        break;
      }
    }
    return !!subtype;
  } else if (subtype !== undefined) {
    err('Weird object for subtype property.');
  }
  return false;
}


/**
 *  @example
 *  var Region = Configable.extend({
 *    lat: setting({required: true, parse: Number}),
 *    lng: setting({required: true, parse: Number})
 *  });
 *  var Animal = Configable.extend({
 *    species: setting({required: true}),
 *
 *    leg_count: setting({required: true, default: 4, parse: Number}),
 *
 *    region: setting({
 *      kind: Region,
 *      init: 'initRegion'
 *    }),
 *
 *    initRegion: function(region) {
 *      this.updateProximity();
 *    },
 *
 *    updateProximity: function() {
 *      navigator.geolocation.getCurrentPosition(function(position) {
 *        this.region.lat = 
 *
 *    }
 *  });
 *
 *  @class
 *
 *  @param {Object} config The configuration object, probably loaded from a config
 *    file.
 */
function Configable(config) {
  var Class = this.constructor;

  config = config || {};

  // Determine if we should instantiate a subclass.
  if (Class.__Subclasses__) {
    var Subclasses = Class.__Subclasses__,
        Subclass;
    for (var i = 0; i < Subclasses.length; i++) {
      Subclass = Subclasses[i];
      if (impliesSubclass(config, Subclass)) {
        //console.log('found match with config: ' + JSON.stringify(config) + ' and subtype: ' + JSON.stringify(Subclass.prototype.subtype));
        return new Subclass(config);
      }
    }
  }

  this._config = config;
  for (var name in this._settings) {
    if (this._settings.hasOwnProperty(name)) {
      this[name] = config[name];
    }
  }
}


/**
 *  @typedef {Object} SettingOptions
 *
 *  @description
 *  Settings are the core of a Configable. While a {@link Configable#settings}
 *  property is not required to load values from a configuration object into a
 *  Configable instance, it gives you a framework for processing your settings
 *  separate from one another, possibly leading to a more organized class.
 *
 *  You define a setting property on your {@link Configable#settings} when you want
 *  to perform actions on the value before it is loaded into your Configable object.
 *  These are actions like type coercion, setting a default value, requiring a value,
 *  and processing that value.
 *
 *  A setting object accepts the following properties, all of which are optional.
 *
 *  @example
 *  Configable.extend({
 *    settings: {
 *      name: {required: true},  // Required setting
 *      height: {},              // Optional.
 *      age: {parse: Number},    // Converts the setting into a number. 
 *    }
 *  });
 *
 *  @property {boolean} required If true, will cause {@link Configable} to
 *    throw an error if the value is undefined.
 *  @property {*} default The default value for this setting if undefined
 *    on the configuration object.
 *  @property {array<*>} choices If your setting is an enumerable, list all the
 *    possible values here.
 *  @property {function} parse A function that receives the raw value and returns
 *    the parsed value (or throw an error). For example, `Number` may be a common choice
 *    here, since it tries to .The returned instance will replace the raw value
 *    on the {@link Configable} instance.
 *  @property {function} kind A class function that will be instantiated with the
 *    parsed value; called internally like
 *    <code>value = new kind(value);</code>
 *    The returned instance will
 *    replace the parsed value on the {@link Configable} instance.
 *  @property {settingInitializer} init A function that takes the value (after
 *    processing with the above options). Inside this function, 'this' refers
 *    to the {@link Configable} instance.
 *
 */


/**
 *  A collection of [Settings]{@link Setting} expected
 *  in the configuration object that instantiates a Configable. The name of
 *  each setting in this object is the name expected in the configuration object.
 *
 *  When you subclass Configable
 *  with {@link Configable.extend}, the given settings will
 *  override (rather than replace) the previous settings. This means
 *  actions specified on a parent class setting will run if that setting
 *  is not overridden in a subclass.
 *
 *  @type {Object.<String, Setting>}
 *
 */
Configable.settings = {};

/**
 *  The return value is ignored.
 *
 *  @callback settingInitializer
 *  @param {*} value The value after type checking and whatnot.
 *  @param {Configable} configable The instance. The value should exist on configable.
 */

Configable.prototype = {
  constructor: Configable,

  _settings: {}
};

/**
 *
 *  Use this method to construct a Configable subclass.
 *
 *  @example
 *  var Person = Configable.extend({
 *    name: setting({required: true}),
 *    height: setting({required: true, parse: Number}),
 *    greet: function() {
 *      return 'Hi, my name is ' + this.name + '.';
 *    }
 *  });
 *
 *  @param {object} spec Define your settings and regular prototype
 *    properties on this object.
 */
Configable.extend = function(spec) {
  var Parent = this;

  var Constructor = extend.call(this);
  var proto = Constructor.prototype;

  proto._settings = mergeInto({}, Parent.prototype._settings);

  var name, property;
  for (name in spec) {
    if (spec.hasOwnProperty(name)) {
      property = spec[name];
      if (isObject(property) && property.__setting__) {
        proto._settings[name] = property;
        defineSetting(proto, name);
      } else {
        proto[name] = property;
      }
    }
  }

  // Store all subclasses in Parent.
  if (Parent.__Subclasses__) {
    Parent.__Subclasses__.push(Constructor);
  } else {
    Parent.__Subclasses__ = [Constructor];
  }

  return Constructor;
};


/**
 *  Turn a setting into a property descriptor on the prototype of the
 *  Configable subclass. This assumes the setting options have been placed
 *  in proto._settings[name]. See {@link Configable.extend}.
 *
 *  @param {object} proto The prototype of the Configable subclass.
 *  @param {string} name The name of the setting property.
 */
function defineSetting(proto, name) {
  var valueName = '_' + name;

  Object.defineProperty(proto, name, {
    set: function(value) {
      var setting = this._settings[name];
      if (value === undefined) {
        if (setting.required) {
          err('Setting ' + name + ' is required.');
        } else if (setting.default !== undefined) {
          value = setting.default;
        }
      }
      var choices = setting.choices;
      if (isArray(choices) && choices.indexOf(value) < 0) {
        err('Setting ' + name + ' must be one of ' + choices.toString());
      }
      var parse = setting.parse;
      if (parse) {
        if (!isFunction(parse)) {
          err('parse must be a function');
        }
        value = parse(value);
      }
      var kind = setting.kind; 
      if (kind) {
        if (!isFunction(kind)) {
          err('kind must be a function');
        }
        value = new kind(value);
      }
      if (setting.init) {
        var init = setting.init;
        if (typeof init === 'string') {
          this[setting.init](value);
        } else if (isFunction(init)) {
          init.call(this, value);
        }
      }
      this[valueName] = value;
    },

    get: function() {
      return this[valueName];
    }

  });
}





/**
 *  Use this function to define the settings your Configable subclass expects
 *  to receive from a configuration object.
 *
 *  @param {SettingOptions} [options] Several common actions can be specified
 *    in this object. See {@link SettingOptions}.
 *
 *  @example
 *  Configable.extend({
 *    name: setting({required: true}),  // Required setting
 *    height: setting(),                // Optional.
 *    age: setting({parse: Number})     // Converts the setting into a number;
 *                                      // could also use parseInt.
 *  });
 */
function setting(options) {
  options = options || {};
  options.required = (
    options.required === undefined ?
    setting.required : options.required
  );
  options.__setting__ = true;
  return options;
}

setting.required = false;


function makeCollectionExtender(name) {
  return function(props) {
    if (!props.Type) {
      err('Need to specify a "Type" property on a ' + name);
    }
    return extend.call(this, props);
  };
}
  

/**
 *  @class
 *
 *  @param {object.<string, object>} config
 */
function ConfigableMap(config) {
  var Type = this.Type;
  for (var name in config) {
    if (config.hasOwnProperty(name)) {
      this[name] = new Type(config[name]);
    }
  }
}

/**
 *  Create a subclass of ConfigableMap. The passed in prototype should have
 *  a 'type' property which points to a {@link Configable} subclass. An instance
 *  of this subclass will be created for every property on the configuration
 *  object passed in to the {@link ConfigableMap} constructor.
 *
 *  WARNING: This is not a Configable. Defining [settings]{@link setting} on
 *  the prototype will not do what you expect.
 *
 *  @function
 *
 *  @param {object} spec Make sure to include a 'type' property that points
 *    to a {@link Configable} class.
 *
 *  @returns {ConfigableMap}
 */
ConfigableMap.extend = makeCollectionExtender('ConfigableMap');

/**
 *  @class
 *
 *  Subclasses of this are not actually arrays. They are objects with
 *  integer keys and a length property. The length will be correct as
 *  long as you don't add/remove elements (which is not easy anyway considering
 *  the lack of push/pop methods).
 *
 *  @param {array<object>} config
 */
function ConfigableArray(config) {
  var Type = this.Type;
  for (var i = 0; i < config.length; i++) {
    this[i] = new Type(config[i]);
  }
  this.length = config.length;
}

/**
 *  Create a subclass of ConfigableArray. The passed in prototype should have
 *  a 'Type' property which points to a {@link Configable} subclass. An instance
 *  of this subclass will be created for every property on the configuration
 *  object passed in to the {@link ConfigableMap} constructor.
 *
 *  WARNING: This is not a Configable. Defining [settings]{@link setting} on
 *  the prototype will not do what you expect.
 *
 *  @function
 *
 *  @param {object} spec Make sure to include a 'Type' property that points
 *    to a {@link Configable} class.
 *
 *  @returns {ConfigableArray} The class, not an instance.
 */
ConfigableArray.extend = makeCollectionExtender('ConfigableArray');

module.exports = {
  Configable: Configable,
  ConfigableMap: ConfigableMap,
  ConfigableArray: ConfigableArray,
  setting: setting
};
