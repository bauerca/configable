# Configable

Configable is more paradigm than library, encouraging you to write concise,
extensible, and reusable code by inventing a declarative configuration-like
language for your app.

The tangible part of Configable strives to help you structure your code
around configuration objects using common tasks and design techniques,
including:

- Type checking
- Setting defaults
- OOP
- Inheritance


## Installation

### Python

`pip install configable`


## Motivation and philosophy

Web dev! How often do you define your data models in your backend database,
interact with them through your API layer, then consume them on the client
side, repeating the model names and attributes at each step? For example,

PostgreSQL storage

```sql
CREATE TABLE users (
    id serial PRIMARY KEY
    ...
);
```

Python Flask API server

```python
@app.route("/api/users/<id>")
def user(id):
    return User.find(id=id).json()
```

Backbone client-side models

```js
var User = Backbone.Model.extend({
    urlRoot: '/api/users',
    ...
});
```

So much repetition; notice how many times the word 'user' is written.
Where is the one source of truth about your User model?
(Note, we shouldn't confuse this with the source of truth for your user data,
which is, in fact, singular, and resides in the `users` table in
the PostgreSQL database.
We are talking more meta.) The bit of information that says "each user has an
integer id" is spread all over; it's in postgres, the flask api route, and
implied in your backbone model.

Frameworks like Meteor address this problem without the flexibility
(locking you into node.js and mongodb, for example).

Instead, it could work like this. A chunk of data somewhere, probably an
object property in a JSON file, says, at a very high level, "Here is a model
called `user`. It has an integer property called `id` that is unique to
each instance. `id` should be used in the api url to request a user instance's
data. `user.username` also exists and is a unique string of max length 16;
it should be used in the presentation url... blah blah"

Then, translators take this data and write your app. A postgres translator
writes your DDL statements, a flask translator writes and runs your api, and
a backbone translator writes your client-side models. The only thing left is
presentation... config it!

The single source of truth is now available to all your tools, and you can
start automating painful tasks, like server- and client-side validation.

If I could summarize. Your app often consists of a collection of tools.
These tools
understand different "languages" which leads to repetition when you try to coordinate
them. Rather than repeat yourself, invent a high-level language for your
app, and write translators for all your tools. I think you'll be happy you
did!


## Overview

You don't have to use this library, obviously, to hop on the configable wagon.
You can just load your config
file, read values, and start calling functions. However, you will probably end
up building or wanting the functionality provided here for serious/complicated
enough projects where OOish design starts playing a role.

Configable expects you to write high-level instructions for building/running
your app using very common data structures (hash tables, arrays, and basic types)
and well-known file formats that support them (JSON, YAML, INI, etc).

Hash tables (groupings of key/value pairs) in your config file are translated
into objects with attributes in your favorite programming language.
Configable adds candy like type checking and inheritance.

## Tutorials

### Python

Let's see what Configable actually does for you in Python (the only language
supported right now):

```python
from configable import Configable, setting

class Car(Configable):
    @setting(required=True, kind=float)
    def fuel_efficiency(self, value):
        self.mpg = value if self['units'] == 'english' else 2.35214583 * value
        self.kpl = value if self['units'] == 'metric' else 0.42514371 * value

    @setting(default='metric')
    def units(self, value):
        pass


car = Car({
    'fuel_efficiency': 30,
    'units': 'english'
})

print car.mpg
print car.kpl
```

What a delightfully pointless library. The only thing Configable is really
helping with is some requirement and type checking all wrapped up in some
fancy decorator syntax.

A Configable is a Python `dict` which is immediately populated with all of the
properties passed in at instantiation. Each function that is

It then does some validation on those


You usually don't override `__init__` in a `Configable` subclass. A
`Configable` expects to be initialized by a python dictionary, which was
probably loaded from a config file.

Here's something a little more helpful.

```python
from configable import Configable, ConfigableMap, setting

class Car(Configable):
    @setting(required=True, kind=float)
    def fuel_efficiency(self, value):
        self.mpg = value if self['units'] == 'english' else 2.35214583 * value
        self.kpl = value if self['units'] == 'metric' else 0.42514371 * value

    @setting(default='metric')
    def units(self, value):
        pass

class FamilyCars(ConfigableMap):
    TYPE = Car

cars = FamilyCars({
    dad: {
        'fuel_efficiency': 30,
        'units': 'english'
    },
    mom: {
        'fuel_efficiency': 30,
        'units': 'english'
    }
})

assert isinstance(cars['dad'], Car)
```

So Configable did some iteration and type instantiation for ya. There is
also a `ConfigableArray` class, which expects to be instantiated with a
python list of dictionaries, and expects a `TYPE` class property just like
`ConfigableMap`.

How about inheritance?

```python
from configable import Configable, ConfigableMap, setting

class Car(Configable):
    @setting(required=True, kind=float)
    def fuel_efficiency(self, value):
        self.mpg = value if self['units'] == 'english' else 2.35214583 * value
        self.kpl = value if self['units'] == 'metric' else 0.42514371 * value

    @setting(default='metric')
    def units(self, value):
        pass

class ElectricCar(Car):
    SUBTYPE = 'electric'

    @setting(required=True, kind=float)
    def fuel_efficiency(self, value):
        super(ElectricCar, self).fuel_efficiency(value)
        self.mpge = self.mpg
        self.kple = self.kpl

class FamilyCars(ConfigableMap):
    TYPE = Car

cars = FamilyCars({
    dad: {
        'fuel_efficiency': 30,
        'units': 'english'
    },
    mom: {
        'type': 'electric',
        'fuel_efficiency': Inf
    }
})

assert isinstance(cars['mom'], ElectricCar)
```

Now that's a little more helpful. Configable helps you use inheritance in your
configuration data structures. Because mom's car specified a 'type' of
'electric', an `ElectricCar` was instantiated, rather than a plain old `Car`.


