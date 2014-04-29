## Installation

```
npm install configable
```

## Example

```js
var cfg = require('configable'),
    Configable = cfg.Configable,
    setting = cfg.setting;

var Car = Configable.extend({
    fuel_efficiency: setting({
        required: true,
        parse: Number
    }),

    units: setting({
        default: 'metric',
        choices: [
            'metric',
            'english'
        ]
    }),

    mpg: function() {
        var eff = this.fuel_efficiency;
        return this.units === 'english' ? eff : 2.35214583 * eff;
    }
});

var car = new Car({
    'fuel_efficiency': 30,
    'units': 'metric'
});

console.log(car.mpg());
```

## Tutorial

### Configable

A new Configable subclass is created using the `Configable.extend` static method.
Properties of the object passed into `extend` become simple properties of the
new class' prototype unless they are declared as a [setting](#setting). Settings
are instead attached to your subclass prototype using
[javascript descriptors](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty),
so that Configable can intercept get/set operations for these properties for the
purposes of type coercion, requirement checking, value parsing, etc.

Here's a very simple example of `Configable.extend`. For introductory purposes,
the settings are specified without options. This means they are optional, and
their values are taken as is from whatever configuration object instantiates
the class.

```js
var Animal = Configable.extend({
    species: setting(),
    sound: setting(),
    speak: function() {
        console.log(this.sound);
    }
});
```

*WARNING*: Because Configable uses
[Object.defineProperty()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)
(and Object.create() for prototype chaining)
an HTML5 shim is required if you want to support older browsers.

A Configable expects a single argument in its constructor: a *configuration object*.
A *config object* is just a plain old javascript object, probably loaded from a
JSON config file. It should contain properties that correspond to the 
[settings](#setting) defined on the Configable it is instantiating.

```js
var cheetah = new Animal({
    'species': 'acinonyx jubatus',
    'sound': 'rawr'
});
```

### Inheritance

Subclasses of Configable are equipped with their own `extend` method. The
standard prototype chaining technique is used, so settings and other prototype
properties are inherited as usual.

```js
var Cheetah = Animal.extend({
    subtype: {species: 'acinonyx jubatus'},
    speak: function() {
        console.log('rawr'); // hard-coded sound
    }
});
```

The `subtype` property is special for Configable subclasses. It should be a
plain object with keys/values that correspond to settings defined on the
parent class. The purpose of the `subtype` property is to
identify matching configuration objects (passed into the parent class
constructor) as instances of
a special subtype of the parent class. In other words, we're injecting an
inheritance scheme into the inheritanceless hash table data structure.

It's way simpler by example; specifying the subtype property allows this
craziness:

```js
var cheetah = new Animal({
    'species': 'acinonyx jubatus'
});

console.log(cheetah instanceof Cheetah); // true!
cheetah.speak(); // 'rawr'
```

The Animal constructor was used to make a Cheetah instance.

So now you can have collections of animals in your config file:

```json
{
    "cheetah": {
        "species": "acinonyx jubatus"
    },
    "grizzly": {
        "species": "ursus arctos",
        "sound": "roar!"
    }
}
```

and the correct subclass will be instantiated for each. Speaking of which...


### ConfigableMap

A ConfigableMap is simply a mapping between strings and Configables. The class is
dead simple; have a look at the source if you want to see what's goin down.
Or, take it all in with this juicy example:

```js
var cfg = require('configable'),
    Configable = cfg.Configable,
    ConfigableMap = cfg.ConfigableMap,
    setting = cfg.setting;

var Dog = Configable.extend({
    breed: setting()
});
var Dogs = ConfigableMap.extend({Type: Dog});

var dogs = new Dogs({
    gracie: {breed: 'golden'},
    spot: {breed: 'terrier'}
});

console.log(dogs.gracie instanceof Dog); // true!
```

Make sure you assign a `Type` property to a Configable class in the
ConfigableMap prototype! You get all the benefits of subclass instantiation 

### ConfigableArray

Given [ConfigableMap](#configablemap), you should be satisfied with an example,

```js
var cfg = require('configable'),
    Configable = cfg.Configable,
    ConfigableArray = cfg.ConfigableArray,
    setting = cfg.setting;

var Dog = Configable.extend({
    breed: setting()
});
var Dogs = ConfigableArray.extend({Type: Dog});

var dogs = new Dogs([
    {breed: 'golden'},
    {breed: 'terrier'}
]);

console.log(dogs[0] instanceof Dog); // true!
```


### setting

This is a function defined on the module.

```js
var setting = require('configable').setting;
```

Call this function and assign the result to a property of the prototype passed
in to `Configable.extend(...)` (see numerous examples above). Generically (where
shown option values are the defaults),

```js
var Type = Configable.extend({
    setting_name: setting({
        required: false,      // Boolean
        default: undefined,   // Raw value
        choices: undefined,   // Array of type expected in config obj
        parse: undefined,     // Function (e.g. Number)
        kind: undefined,      // Function (e.g. Date); called with new
        init: undefined       // Function (called with Configable instance as 'this')
    })
});
```

The following are short explanations of the setting options.

#### required {boolean}

If set to true, instantiation of the containing Configable subclass will fail
horribly if the setting is undefined on the configuration object.

#### default {\*}

Pretty self-explanatory. You probably want [required](#required) to be `false` if
you are supplying a default setting value. The default value should be a *raw* value,
i.e. of a type expected in the configuration object (fundamental, like
integer, string, object, array, etc).
The default, if taken, will be run through all the following setting checks and ops.

#### choices {array&lt;\*&gt;}

If your settings values are restricted to a small set, list them here. Configable
instantiation will fail if the *raw* value is not in this set.

#### parse {function}

The raw value from the configuration object is run through this function; therefore,
it should accept a single value and return the transformed value or throw an
error. Parsing happens before [kind](#kind-function).

#### kind {function}

After [parsing](#parse-function), the value will be cast to this type using
`value = new kind(value)`. A common example would be `Date`.

#### init {function}

Finally, the init function is called. This is different from [parse](#parse-function)
and [kind](#kind-function) in that `this` is set to the Configable instance
inside this function. You should *not* try to access other settings from inside this
function as they may not have been loaded yet.
