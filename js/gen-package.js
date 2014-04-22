var fs = require('fs');
var cfg = require('./index');
var Configable = cfg.Configable;
var setting = cfg.setting;

// Default is to required all settings.
setting.required = true;

var proto = {};
var settings = [
  'name',
  'author',
  'version',
  'description',
  'githubuser',
  'keywords',
  'license'
];
settings.forEach(function(s) {
  proto[s] = setting();
});

proto.update = function(pkg) {
  pkg.name = this.name;
  pkg.version = this.version;
  pkg.description = this.description;

  var url = "https://github.com/" + this.githubuser + "/" + this.name;
  pkg.repository = {
    type: "git",
    url: url
  };
  pkg.keywords = this.keywords;
  pkg.author = this.author;
  pkg.license = this.license;
  pkg.bugs = {
    url: url + "/issues"
  };
  pkg.homepage = url;

  return pkg;
};

var PackageUpdater = Configable.extend(proto);

// Get latest release package.json
var pkg = fs.readFileSync('./package.json');
// Save old for recovery.
fs.writeFileSync('./package.last.json', pkg);
pkg = JSON.parse(pkg);

// Get newest package info.
var gpkg = JSON.parse(fs.readFileSync('../global-pkg.json'));

// Merge new into old. Probably the only thing that changed was the
// version number.
var updater = new PackageUpdater(gpkg);
pkg = updater.update(pkg);
fs.writeFileSync(
  './package.json',
  JSON.stringify(pkg, null, 2)
);
