import unittest
from configable import Configable, ConfigableMap, ConfigableArray, setting, issetting
import inspect
from pprint import pprint

class Test(unittest.TestCase):
    def test_simple(runner):
        class C(Configable):
            a = setting()

        class D(C):
            b = setting()

        pprint(inspect.getmembers(D, predicate=issetting))

        c = C({'a': 1})
        runner.assertEqual(c.a, 1)

    def test_simple_with_callback(runner):
        class C(Configable):
            @setting()
            def a(self, value):
                self.b = value
                pass

        s = C({'a': 1})
        runner.assertTrue(s.a == 1)
        runner.assertTrue(s.b == 1)

    def test_missing_optional_attr(runner):
        class C(Configable):
            @setting()
            def a(_, value):
                runner.assertIs(value, None)

        c = C({})
        runner.assertIs(c.a, None)

    def test_missing_required_attr(runner):
        class C(Configable):
            @setting(required=True)
            def a(self, value):
                pass

        with runner.assertRaises(ValueError) as cm:
            c = C({})

    def test_choices(runner):
        class C(Configable):
            greeting = setting(choices=['hi'])

        with runner.assertRaises(ValueError) as cm:
            c = C({'greeting': 'hello'})
        c = C({'greeting': 'hi'})

    def test_multiple_attrs(runner):
        class C(Configable):
            @setting()
            def a(self, value):
                pass

            @setting()
            def b(self, value):
                pass

        c = C({'a': 1, 'b': 2})
        runner.assertEqual(c.a, 1)
        runner.assertEqual(c.b, 2)

    def test_type_cast(runner):
        class C(Configable):
            @setting(kind=bool)
            def a(self, value):
                runner.assertIsInstance(value, bool)
                runner.assertIsInstance(self.a, bool)
        
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
        runner.assertEqual(c.mighty, 'boosh')

    def test_nested_configable(runner):
        class Father(Configable):
            name = setting(required=True)

        class Mother(Configable):
            name = setting(required=True)

        class Family(Configable):
            @setting(kind=Father)
            def dad(self, dad):
                runner.assertEqual(dad.name, 'Hal')

            @setting(kind=Mother)
            def mom(self, mom):
                runner.assertEqual(mom.name, 'Lois')
                
        fam = Family({
            'dad': {'name': 'Hal'},
            'mom': {'name': 'Lois'}
        })

    def test_configable_inheritance(runner):
        class Animal(Configable):
            def goes(self):
                raise NotImplementedError

        class Cat(Animal):
            SUBTYPE = {'species': 'cat'}
            def goes(self):
                return 'mew'

        class Dog(Animal):
            SUBTYPE = {'species': 'dog'}
            def goes(self):
                return 'wuf'

        class Husky(Dog):
            SUBTYPE = {'breed': 'husky'}
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
            @setting(required=True)
            def size(self, value):
                self.dog_size = value
                pass

        class Husky(Dog):
            SUBTYPE = {'breed': 'husky'}

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
        runner.assertEqual(gracie.size, 'medium')
        runner.assertEqual(gracie.dog_size, 'medium')

        sparky = dogs['sparky']
        runner.assertIsInstance(sparky, Husky)
        runner.assertEqual(sparky.size, 'large')
        runner.assertEqual(sparky.dog_size, 'large')

    def test_configable_array(runner):
        class Dog(Configable):
            @setting(required=True)
            def name(self, value):
                self.dog_name = value

            @setting(required=True)
            def size(self, value):
                self.dog_size = value

        class Husky(Dog):
            SUBTYPE = {'breed': 'husky'}

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
        runner.assertEqual(gracie.name, 'gracie')
        runner.assertEqual(gracie.size, 'medium')
        runner.assertEqual(gracie.dog_size, 'medium')

        sparky = dogs[1]
        runner.assertIsInstance(sparky, Husky)
        runner.assertEqual(sparky.name, 'sparky')
        runner.assertEqual(sparky.size, 'large')
        runner.assertEqual(sparky.dog_size, 'large')
