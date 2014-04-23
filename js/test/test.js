var expect = require('expect.js');
var cfg = require('..');
var Configable = cfg.Configable;
var ConfigableMap = cfg.ConfigableMap;
var ConfigableArray = cfg.ConfigableArray;
var setting = cfg.setting;

describe('Configable', function() {
  afterEach(function() {
    setting.required = false;
  });

  it('should set properties', function() {
    var Animal = Configable.extend({
      name: setting({required: true}),
      random: setting({cast: Number})
    });

    var lion = new Animal({
      name: 'Lion',
      random: 1
    });
    expect(lion.name).to.be('Lion');
    expect(lion.random.valueOf()).to.be(1);
  });

  it('should throw an error when required setting absent', function() {
    var Team = Configable.extend({
      name: setting({required: true})
    });

    expect(function() {
      new Team({});
    }).to.throwException(/required/);
  });

  it('should use the global required flag', function() {
    setting.required = true;
    var Face = Configable.extend({
      nose: setting()
    });
    expect(function() {
      new Face({});
    }).to.throwException(/required/);
  });

  it('should respect choices', function() {
    var Person = Configable.extend({
      gender: setting({choices: ['male', 'female']})
    });
    expect(function() {
      new Person({gender: 'mail'});
    }).to.throwException(/one of/);
    expect(function() {
      new Person({gender: 'female'});
    }).not.to.throwException();
  });

  it('should instantiate a subclass', function() {
    var Animal = Configable.extend({
      name: setting({
        required: true,
        init: 'initName'
      }),

      initName: function(name) {
        this.named = true;
      }
    });
    var Lion = Animal.extend({
      subtype: {
        name: 'Lion'
      },

      goes: function() {
        return 'rawr';
      }
    });

    var lion = new Animal({name: 'Lion'});
    expect(lion.name).to.be('Lion');
    expect(lion).to.be.a(Lion);
    expect(lion).to.be.an(Animal);
    expect(lion.goes()).to.be('rawr');

    var monkey = new Animal({name: 'Monkey'});
    expect(monkey).to.be.an(Animal);
    expect(monkey).not.to.be.a(Lion);
  });

  it('should instantiate a subsubclass', function() {
    var Animal = Configable.extend({});
    var Acinonyx = Animal.extend({subtype: {'genus': 'acinonyx'}});
    var Cheetah = Acinonyx.extend({subtype: {'species': 'jubatus'}});

    var cheetah = new Animal({
      'genus': 'acinonyx',
      'species': 'jubatus'
    });
    expect(cheetah).to.be.a(Cheetah);
    var acinonyx = new Animal({
      'genus': 'acinonyx'
    });
    expect(acinonyx).to.be.an(Acinonyx);
    expect(acinonyx).not.to.be.a(Cheetah);
  });
});

describe('ConfigableMap', function() {
  it('should instantiate types', function() {
    var Dog = Configable.extend({
      breed: setting()
    });
    var Dogs = ConfigableMap.extend({
      Type: Dog
    });
    var dogs = new Dogs({
      gracie: {breed: 'golden'},
      spot: {breed: 'terrier'}
    });
    expect(dogs.gracie).to.be.a(Dog);
    expect(dogs.gracie.breed).to.be('golden');
    expect(dogs.spot).to.be.a(Dog);
    expect(dogs.spot.breed).to.be('terrier');
  });

  it('should fail if no Type property', function() {
    expect(function() {
      ConfigableMap.extend({});
    }).to.throwException(/ConfigableMap/);
  });
});

describe('ConfigableArray', function() {
  it('should instantiate types', function() {
    var Dog = Configable.extend({
      breed: setting()
    });
    var Dogs = ConfigableArray.extend({
      Type: Dog
    });
    var dogs = new Dogs([
      {breed: 'golden'},
      {breed: 'terrier'}
    ]);
    expect(dogs[0]).to.be.a(Dog);
    expect(dogs[0].breed).to.be('golden');
    expect(dogs[1]).to.be.a(Dog);
    expect(dogs[1].breed).to.be('terrier');
  });

  it('should fail if no Type property', function() {
    expect(function() {
      ConfigableArray.extend({});
    }).to.throwException(/ConfigableArray/);
  });
});
