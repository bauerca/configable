from configable import Configable, setting
from setuptools import setup
import os
import json

class Setup(Configable):
    name = setting(required=True, kind=str)
    version = setting(required=True, kind=str)
    author = setting(required=True, kind=str)
    email = setting(required=True, kind=str)
    description = setting(required=True)
    license = setting(required=True)
    githubuser = setting(required=True)
    keywords = setting(required=True)

    def run(self):
        url = 'https://github.com/' + self.githubuser + '/' + self.name
        long_desc = 'See ' + url
        try:
            import pypandoc
            long_desc = pypandoc.convert('README.md', 'rst')
        except:
            pass
        setup(
            name=self.name,
            version=self.version,
            packages=['configable'],
            test_suite='tests',
            author=self.author,
            author_email=self.email,
            description=self.description,
            license=self.license,
            keywords=' '.join(self.keywords),
            url=url,
            long_description=long_desc
        )


def main():
    pkg_file = './global-pkg.json'
    pkg_file = os.path.abspath(
        os.path.join(os.path.dirname(__file__), pkg_file)
    )
    with open(pkg_file, 'r') as f:
        pkg = json.load(f)

    Setup(pkg).run()

if __name__ == '__main__':
    main()
