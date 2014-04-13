from setuptools import setup

long_desc = 'See https://github.com/bauerca/configable'
try:
    import pypandoc
    long_desc = pypandoc.convert('README.md', 'rst')
except:
    pass

setup(
    name='configable',
    version='0.1',
    packages=['configable'],
    test_suite='tests',
    author='Carl A. Bauer',
    author_email='carl.a.bauer@gmail.com',
    description=(
        'Don\'t repeat yourself, configure everything.'
    ),
    license='MIT',
    keywords='configuration',
    url='https://github.com/bauerca/configable',
    long_description=long_desc
)
