## Installation

```
pip install configable
```

## Example

```python
from configable import Configable, setting

class Car(Configable):
    fuel_efficiency = setting(
        required=true,
        kind=float
    )

    units = setting(
        default='metric',
        choices=[
            'metric',
            'english'
        ]
    )

    def mpg(self):
        eff = self.fuel_efficiency
        return eff if self.units == 'english' else 2.35214583 * eff

car = Car({
    'fuel_efficiency': 30,
    'units': 'metric'
})

print car.mpg()
```

## Tutorial

### Configable

Create configable classes by subclassing Configable and adding [settings](#setting).
Here's a very simple example. For introductory purposes,
the settings are specified without options; this means they are optional, and
their values are taken as is from whatever configuration object instantiates
the class.

```python
class Animal(Configable):
    species = setting()
    sound = setting()
    def speak(self):
        print self.sound
```

A Configable expects a single argument in its constructor: a *configuration object*.
A *config object* is just a plain old python dictionary, probably loaded from a
JSON/YAML/etc config file. It should contain properties that correspond to the 
[settings](#setting) defined on the Configable it is instantiating.

```python
cheetah = Animal({
    'species': 'acinonyx jubatus',
    'sound': 'rawr'
})
```

### Inheritance

When we subclass a subclass of Configable, we are doing some sort of
specialization of the parent class.
This usually means there is a value for a setting (or settings) defined on the
parent class that implies the specialization. Such special values are
specified using the `SUBTYPE` property. For example,

```python
class Cheetah(Animal):
    SUBTYPE = {'species': 'acinonyx jubatus'}
    def speak(self):
        print 'rawr' # hard-coded sound
```

`SUBTYPE` should be a dictionary
with keys/values that correspond to settings defined on the
parent class. The purpose of the `SUBTYPE` property is to
identify matching configuration objects (passed into the parent class
constructor) as instances of
a special subtype of the parent class. In other words, we're injecting an
inheritance scheme into the inheritanceless hash table data structure.

It's way simpler by example; specifying the `SUBTYPE` property allows this
craziness:

```python
cheetah = Animal({
    'species': 'acinonyx jubatus'
})

print isinstance(cheetah, Cheetah) // True!
cheetah.speak() // 'rawr'
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

```python
from configable import Configable, ConfigableMap, setting

class Dog(Configable):
    breed = setting()

class Dogs(ConfigableMap):
    TYPE = Dog

dogs = Dogs({
    'gracie': {'breed': 'golden'},
    'spot': {'breed': 'terrier'}
})

print isinstance(dogs.gracie, Dog) // True!
```

Make sure you assign a `Type` property to a Configable class in the
ConfigableMap prototype! You get all the benefits of subclass instantiation 

### ConfigableArray

Given [ConfigableMap](#configablemap), you should be satisfied with an example,

```python
from configable import Configable, ConfigableArray, setting

class Dog(Configable):
    breed = setting()

class Dogs(ConfigableArray):
    TYPE = Dog

dogs = Dogs([
    {'breed': 'golden'},
    {'breed': 'terrier'}
])

print isinstance(dogs[0], Dog) // True!
```


### setting

Call this and assign the result to a property on your Configable subclass
(see numerous examples above). Generically (where
shown option values are the defaults),

```python
class Type(Configable):
    setting_name = setting(
        required=False, # Boolean
        default=None,   # Instance of expected type (see 'kind' below)
        choices=None,   # List of type expected in config obj
        kind=None       # Callable
    )
```

Additionally, you can use `setting` as a decorator.

```python
class Type(Configable):
    @setting(
        required=False, # Boolean
        default=None,   # Instance of expected type (see 'kind' below)
        choices=None,   # List of type expected in config obj
        kind=None       # Callable
    )
    def setting_name(self, value):
        # Do something with value
```

The decorated function will be called immediately before the value is
set on the instance (after [kind](#kind-callable) is called).
You should *not* try to access other settings from inside this
function as they may not have been loaded yet.

The following are short explanations of the setting options.

#### required {bool}

If set to true, instantiation of the containing Configable subclass will fail
horribly if the setting is undefined on the configuration object.

#### default {\*}

Pretty self-explanatory. You probably want [required](#required) to be `false` if
you are supplying a default setting value. The type of the default value should be
the type expected as a result of applying all setting options. This means
your default value should be the same type as that returned by application of the
[parse](#parse-function) or [kind](#kind-function) function, if specified.

#### choices {iterable&lt;\*&gt;}

If your settings values are restricted to a small set, list them here. Configable
instantiation will fail if the *raw* value is not in this set.

#### kind {callable}

The raw value from the configuration object is run through this function; therefore,
it should accept a single value and return the transformed value or throw an
error. This is often set as a class, especially when you want nested Configables.
