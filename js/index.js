'use strict';

function isFunction(thing) {
  return typeof thing === 'function';
}

function isObject(thing) {
  return Object.prototype.toString.call(thing) === '[object Object]';
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
    throw new Error('Weird object for subtype property.');
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

  _settings: {},

  /**
   *  This method is called when all settings have been loaded, checked, and
   *  initialized.
   *
   *  @function
   *  
   */
  postInit: null
};



function defineSetting(proto, name) {
  var valueName = '_' + name;

  Object.defineProperty(proto, name, {
    set: function(value) {
      var setting = this._settings[name];
      if (value === undefined) {
        if (setting.required) {
          throw new Error('Setting ' + name + ' is required.');
        }
        if (setting.default !== undefined) {
          value = setting.default;
        }
      }
      var parse = setting.parse;
      if (parse) {
        if (!isFunction(parse)) {
          throw new Error('parse must be a function');
        }
        value = parse(value);
      }
      var kind = setting.kind; 
      if (kind) {
        if (!isFunction(kind)) {
          throw new Error('kind must be a function');
        }
        // In case this setting is a Configable, make sure it knows it
        // is not the root.
        value = (
          kind.prototype instanceof Configable ?
          new kind(value, false) :
          new kind(value)
        );
      }
      if (setting.init) {
        this[setting.init](value);
      }
      this[valueName] = value;
    },

    get: function() {
      return this[valueName];
    }

  });
}




function extend(spec) {
  var Parent = this;

  function Constructor() {
    return Parent.apply(this, arguments);
  }

  var proto = Constructor.prototype = Object.create(
    Parent.prototype
  );

  mergeInto(proto, {
    constructor: Constructor,
    _settings: mergeInto({}, Parent.prototype._settings)
  });

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

  Constructor.extend = extend;
  return Constructor;
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

/**
 *
 *  When constructing your Configable subclass, 
 *
 *  When a setting is read from a configuration object, it is first
 *  set as a property on the instance, second checked against the conditions
 *  specified in the options argument of this function, and third passed
 *  to the handler callback.
 *
 *  @function
 *
 *  @param {Object} spec Specify some common actions for a
 *    setting, like requiring it, setting a default value, and
 *    casting the value to a type of your choosing. Possible options
 *    are:
 */
Configable.extend = extend;


module.exports = {
  Configable: Configable,
  setting: setting
};
