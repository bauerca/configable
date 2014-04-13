import inspect


class ConfigableBase(object):
    pass


class Configable(dict, ConfigableBase):
    """
    A Configable is subclass aware (with a little help)! Given

        class Animal(Configable):
            SUBTYPE_PROPERTY = 'species'

        class Dog(Animal):
            SUBTYPE = 'dog' # unnecessary b/c Configable automatically
                            # checks for 'Dog'.lower() if SUBTYPE is not
                            # defined. Should probably set this to
                            # 'canis lupus familiaris' anyway... ~@~
            SUBTYPE_PROPERTY = 'breed'

    The following config will produce a Dog instance:

        dog = Animal({'species': 'dog'})

    Scary, right? If 'species' property does not exist in the configuration,
    an instance of Animal will be returned. You probably shouldn't use this
    technique in python code; if you want a dog, you should call Dog(...)
    without the 'species' property. But when you're using config files, how
    else do you specify subtypes?
    
    The inheritance can go on...

        class Husky(Dog):
            SUBTYPE = 'husky'

        husky = Animal({
            'species': 'dog',
            'breed': 'husky'
        })
    """

    def __new__(cls, config, _is_root=True):
        """
        """
        # Check if this Configable expects there to be subtypes
        subtype_property = getattr(cls, 'SUBTYPE_PROPERTY', None)

        if subtype_property is not None and subtype_property in config:
            config_subtype = config[subtype_property]
            for subcls in cls.__subclasses__():
                subtype = getattr(subcls, 'SUBTYPE', subcls.__name__.lower())
                if subtype == config_subtype:
                    # The following should call this __new__ again with
                    # cls == subcls.
                    return subcls(config, _is_root=_is_root)

        return super(Configable, cls).__new__(
            cls, config, _is_root=_is_root
        )

    def __init__(self, config, _is_root=True): #, path=None, required=False):
        super(Configable, self).__init__(config)
        self._parent = None
        self._prepare_settings()
        if _is_root:
            self._handle_settings()

    def _prepare_settings(self):
        # Check for existence and do typecasting before calling any
        # handlers
        self._handlers = []
        methods = inspect.getmembers(self, predicate=inspect.ismethod)
        for name, func in methods:
            if hasattr(func, '__prepare_setting__'):
                value = func.__prepare_setting__(self.get(name))
                self[name] = value
                self._handlers.append((func, value))

    def _handle_settings(self):
        for handler, value in self._handlers:
            handler(value)

    def parent(self):
        return self._parent


class ConfigableCollection(ConfigableBase):
    def _init_configables(self, _is_root):
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
            self[name] = self.TYPE(value, _is_root=False)

        if _is_root:
            # Run handlers on each configable
            for _, value in self.iterator():
                value._handle_settings()

    def iterator(self):
        raise NotImplementedError


class ConfigableMap(dict, ConfigableCollection):
    """
    Map strings to Configable instances.
    """

    def __init__(self, config, _is_root=True):
        """
        Subclasses 
        """
        #if not isinstance(config, dict):
        #    raise TypeError(
        #        'A ConfigableMap expects a dictionary as its configuration'
        #    )
        super(ConfigableMap, self).__init__(config)
        self._init_configables(_is_root)

    def iterator(self):
        return self.iteritems()


class ConfigableArray(list, ConfigableCollection):
    """
    Array of Configables of a given type.
    """

    def __init__(self, config, _is_root=True):
        """
        Subclasses 
        """
        #if not isinstance(config, list):
        #    raise TypeError(
        #        'A ConfigableArray expects a list as its configuration'
        #    )
        super(ConfigableArray, self).__init__(config)
        self._init_configables(_is_root)

    def iterator(self):
        return enumerate(self)


class setting(object):
    """
    A decorator that tags methods of a Config subclass that handle
    config values.
    """
    def __init__(self, required=False, kind=None, default=None):
        self.required = required
        self.kind = kind
        self.default = default

    def prepare(self, value):
        if value is None:
            if self.required:
                raise ValueError(
                    'Setting "%s" is required' % self.name
                )
            elif self.default is not None:
                value = self.default

        # Cast value to expected type
        if value is not None:
            kind = self.kind
            if kind is not None:
                if inspect.isclass(kind) and issubclass(kind, ConfigableBase):
                    # Special case when kind is a Configable; postpone
                    # calling its setting handlers until the handler
                    # for this setting is called.
                    value = kind(value, _is_root=False)
                else:
                    value = kind(value)

        return value

    def __call__(self, handler):
        self.name = handler.__name__
        wrapper = None
        kind = self.kind
        if inspect.isclass(kind) and issubclass(kind, ConfigableBase):
            def wrapper(configable, value):
                value._parent = configable
                value._handle_settings()
                handler(configable, value)
        else:
            wrapper = handler
        wrapper.__prepare_setting__ = self.prepare
        return wrapper
