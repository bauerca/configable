
Let's get started with an example.

```js
var configable = require('configable'),
    Configable = configable.Configable,
    setting = configable.setting;

var Car = Configable.extend({
    fuel_efficiency: setting({
        required: true,
        parse: Number
    }),

    initFuelEff: function(value) {
        this.mpg = this.units === 'english' ? value : 2.35214583 * value;
        this.kpl = this.units === 'metric' ? value : 0.42514371 * value;
    },

    units: setting({
        default: 'metric',
        choices: [
            'metric',
            'english'
        ]
    })

    mpg: function() {
        var eff = this.fuel_efficiency;
        return this.units === 'english' ? eff : 2.35214583 * eff;
    }
});

var car = new Car({
    'fuel_efficiency': 30,
    'units': 'metric'
});

console.log(car.mpg);
console.log(car.kpl);
```

A Configable subclass is your standard javascript "class" with a few quirks.

## Configable

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

console.log(cheetah instanceof Acinonyx); // true!
cheetah.speak(); // 'rawr'
```

The Animal constructor was used to make an Acinonyx instance.

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

and the correct subclass will be instantiated for each.


## setting

A setting is registered with your Configable subclass by assigning `setting({...})`
