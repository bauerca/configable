import unittest
from configable import Configable, ConfigableMap, ConfigableArray, setting

class Test(unittest.TestCase):
    def test_simple(runner):
        class C(Configable):
            @setting()
            def a(self, value):
                pass

        s = C({'a': 1})
        runner.assertTrue(s['a'] == 1)

    def test_missing_optional_attr(runner):
        class C(Configable):
            @setting()
            def a(_, value):
                runner.assertIs(value, None)

        c = C({})
        runner.assertIs(c.get('a'), None)

    def test_missing_required_attr(runner):
        class C(Configable):
            @setting(required=True)
            def a(self, value):
                pass

        with runner.assertRaises(ValueError) as cm:
            c = C({})

    def test_multiple_attrs(runner):
        class C(Configable):
            @setting()
            def a(self, value):
                pass

            @setting()
            def b(self, value):
                pass

        c = C({'a': 1, 'b': 2})
        runner.assertEqual(c['a'], 1)
        runner.assertEqual(c['b'], 2)

    def test_cross_ref_attr(runner):
        class C(Configable):
            @setting()
            def a(self, value):
                # b should be loaded before any handlers are called.
                self.b_from_a = self.get('b')
                pass

            @setting()
            def b(self, value):
                pass

        c = C({'a': 1, 'b': 2})
        runner.assertEqual(c['a'], 1)
        runner.assertEqual(c['b'], 2)
        runner.assertEqual(c.b_from_a, 2)

    def test_type_cast(runner):
        class C(Configable):
            @setting(kind=bool)
            def a(cls, value):
                runner.assertIsInstance(value, bool)
                runner.assertIsInstance(cls['a'], bool)
        
        c = C({'a': 1})

        # Type cast should fail and we should get a useful
        # error msg.
        def cast(value):
            raise ValueError('cast failed')
    
    def test_default(runner):
        class C(Configable):
            @setting(default='boosh')
            def mighty(self, value):
                pass

        c = C({})
        runner.assertEqual(c['mighty'], 'boosh')

    def test_nested_configable(runner):
        class Father(Configable):
            @setting(required=True)
            def name(_, value):
                # family.mom should be initialized before this handler
                # is called.
                runner.assertEqual(_.parent()['mom']['name'], 'Lois')
                pass

        class Mother(Configable):
            @setting(required=True)
            def name(_, value):
                # family.mom should be initialized before this handler
                # is called.
                runner.assertEqual(_.parent()['dad']['name'], 'Hal')
                pass

        class Family(Configable):
            @setting(kind=Father)
            def dad(_, value):
                # dad should exist and be initialized before this
                # handler is called.
                runner.assertEqual(_['dad']['name'], 'Hal')
                runner.assertEqual(_['mom']['name'], 'Lois')
                pass

        fam = Family({
            'dad': {'name': 'Hal'},
            'mom': {'name': 'Lois'}
        })

    def test_configable_inheritance(runner):
        class Animal(Configable):
            SUBTYPE_PROPERTY = 'species'
            def goes(self):
                raise NotImplementedError

        class Cat(Animal):
            def goes(self):
                return 'mew'

        class Dog(Animal):
            SUBTYPE_PROPERTY = 'breed'
            def goes(self):
                return 'wuf'

        class Husky(Dog):
            def goes(self):
                return 'owww'

        cat = Animal({
            'species': 'cat'
        })
        dog = Animal({
            'species': 'dog'
        })
        husky = Animal({
            'species': 'dog',
            'breed': 'husky'
        })

        runner.assertEqual(cat.goes(), 'mew')
        runner.assertEqual(dog.goes(), 'wuf')
        runner.assertEqual(husky.goes(), 'owww')

        husky = Dog({
            'breed': 'husky'
        })
        runner.assertEqual(husky.goes(), 'owww')

        dog = Animal({
            'breed': 'husky'
        })
        with runner.assertRaises(NotImplementedError) as cm:
            dog.goes()

    def test_configable_map(runner):
        class Dog(Configable):
            SUBTYPE_PROPERTY = 'breed'

            @setting(required=True)
            def size(self, value):
                self.dog_size = value
                pass

        class Husky(Dog):
            SUBTYPE = 'husky'

        class DogMap(ConfigableMap):
            """
            Map names to dogs.
            """
            TYPE = Dog

        dogs = DogMap({
            'gracie': {
                'breed': 'retriever',
                'size': 'medium'
            },
            'sparky': {
                'breed': 'husky',
                'size': 'large'
            }
        })

        gracie = dogs['gracie']
        runner.assertIsInstance(gracie, Dog)
        runner.assertEqual(gracie['size'], 'medium')
        runner.assertEqual(gracie.dog_size, 'medium')

        sparky = dogs['sparky']
        runner.assertIsInstance(sparky, Husky)
        runner.assertEqual(sparky['size'], 'large')
        runner.assertEqual(sparky.dog_size, 'large')

    def test_configable_array(runner):
        class Dog(Configable):
            SUBTYPE_PROPERTY = 'breed'

            @setting(required=True)
            def name(self, value):
                self.dog_name = value

            @setting(required=True)
            def size(self, value):
                self.dog_size = value

        class Husky(Dog):
            SUBTYPE = 'husky'

        class Dogs(ConfigableArray):
            TYPE = Dog

        dogs = Dogs([
            {
                'name': 'gracie',
                'breed': 'retriever',
                'size': 'medium'
            },
            {
                'name': 'sparky',
                'breed': 'husky',
                'size': 'large'
            }
        ])

        gracie = dogs[0]
        runner.assertIsInstance(gracie, Dog)
        runner.assertEqual(gracie['name'], 'gracie')
        runner.assertEqual(gracie['size'], 'medium')
        runner.assertEqual(gracie.dog_size, 'medium')

        sparky = dogs[1]
        runner.assertIsInstance(sparky, Husky)
        runner.assertEqual(sparky['name'], 'sparky')
        runner.assertEqual(sparky['size'], 'large')
        runner.assertEqual(sparky.dog_size, 'large')
