import inspect


class ConfigableBase(object):
    pass


class Configable(ConfigableBase):
    """
    A Configable is subclass aware (with a little help)! Given

        class Animal(Configable):
            pass

        class Dog(Animal):
            SUBTYPE = {'species': 'dog'}

    The following config will produce a Dog instance:

        dog = Animal({'species': 'dog'})

    Scary, right? If 'species' property does not exist in the configuration,
    an instance of Animal will be returned. You probably shouldn't use this
    technique in python code; if you want a dog, you should call Dog(...)
    without the 'species' property. But when you're using config files, how
    else do you specify subtypes?
    
    The inheritance can go on...

        class Husky(Dog):
            SUBTYPE = {'breed': 'husky'}

        husky = Animal({
            'species': 'dog',
            'breed': 'husky'
        })
    """

    def __new__(cls, config, *args, **kwargs):
        if not isinstance(config, dict):
            raise ValueError(
                'Instantiating %s: config must be a dict. Got type %s with value %s.' %
                (cls.__name__, type(config), str(config))
            )

        for subcls in cls.__subclasses__():
            subtype = getattr(subcls, 'SUBTYPE', None)
            if isinstance(subtype, dict):
                match = True
                for name, value in subtype.iteritems():
                    config_value = config.get(name)
                    if value != config_value:
                        match = False
                        break
                if match:
                    # The following should call this __new__ again with
                    # cls == subcls.
                    return subcls(config, *args, **kwargs)

        return super(Configable, cls).__new__(
            cls, config, *args, **kwargs
        )

    def __init__(self, config):
        self._settings = inspect.getmembers(self.__class__, predicate=issetting)
        for name, setting in self._settings:
            setting.name = name
            setattr(self, name, config.get(name))

    def issetting(self, name):
        return name in self._settings


class ConfigableCollection(ConfigableBase):
    def _init_configables(self):
        if not hasattr(self, 'TYPE'):
            raise ValueError(
                'You must define TYPE on your ConfigableCollection '
                'subclass, %s.' % self.__class__.__name__
            )
        if not issubclass(self.TYPE, Configable):
            raise TypeError(
                '%s.TYPE must be a subclass of Configable' %
                self.__class__.__name__
            )

        for name, value in self.iterator():
            # Prepare settings on each configable, but do not
            # run handlers.
            self[name] = self.TYPE(value)

    def iterator(self):
        raise NotImplementedError


class ConfigableMap(dict, ConfigableCollection):
    """
    Map strings to Configable instances.
    """

    def __init__(self, config):
        super(ConfigableMap, self).__init__(config)
        self._init_configables()

    def iterator(self):
        return self.iteritems()

class ConfigableArray(list, ConfigableCollection):
    """
    Array of Configables of a given type.
    """

    def __init__(self, config, _is_root=True):
        super(ConfigableArray, self).__init__(config)
        self._init_configables()

    def iterator(self):
        return enumerate(self)

class setting(object):
    """
    A decorator that tags methods of a Config subclass that handle
    config values.
    """
    def __init__(self, required=False, kind=None, default=None, choices=None):
        self.required = required
        self.kind = kind
        self.default = default
        self.choices = choices
        self.init = None
        self.name = str(id(self))
        self.decorator = False

    def __set__(self, obj, value):
        if value is None and self.required:
            raise ValueError(
                'Setting "%s" is required' % self.name
            )
        if self.choices is not None:
            if value not in self.choices:
                raise ValueError(
                    'Setting "%s" must be one of %s' %
                    (self.name, self.choices)
                )
        # Cast value to expected type
        if value is not None and self.kind is not None:
            value = self.kind(value)
        setattr(obj, '_' + self.name, value)
        if self.init is not None:
            self.init(obj, value)

    def __get__(self, obj, objtype=None):
        if obj is None:
            # This allows access to the setting object as a member of
            # the class (not instance; accessing the setting on an instance
            # will get/set the value of the setting):
            return self
        value = getattr(obj, '_' + self.name, None)
        if value is None:
            return self.default
        return value

    def __call__(self, initOrObj, value=None):
        if self.decorator:
            self.init(initOrObj, value)
            return
        self.name = initOrObj.__name__
        self.init = initOrObj
        self.decorator = True
        return self


def issetting(thing):
    return isinstance(thing, setting)
