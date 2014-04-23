test:
	cd python/ && nosetests && cd ..
	cd js/ && mocha -C && cd ..

VERSION.txt: global-pkg.json
	grep "version" $? | sed -e 's/.*"\([^"]*\)",$$/\1/' > $@
	echo "Version is `cat $@`"

release-js:
	echo "release javascript"
	cd js/ && node gen-package.js && npm publish && cd ..

release-py: global-pkg.json
	echo "release python"
	cp $? python/
	cd python/ && python setup.py sdist upload && cd ..

release-git:
	git commit -a -m "Release `cat VERSION.txt`"
	git tag "v`cat VERSION.txt`"
	git push --tags origin master

release: VERSION.txt release-js release-py release-git
	echo "Releasing v`cat VERSION.txt`"

.PHONY: all test release-js release-py release-git release
