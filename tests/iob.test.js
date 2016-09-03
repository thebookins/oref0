'use strict';

require('should');

describe('IOB', function ( ) {

  it('should calculate IOB', function() {

    var now = Date.now()
      , timestamp = new Date(now).toISOString()
      , profile = {
        dia: 3
        , bolussnooze_dia_divisor: 2
      }
      , inputsDefault = {
        clock: timestamp
        , history: [{
          _type: 'Bolus'
          , amount: 1
          , timestamp: timestamp
        }]
        , profile: profile
      }
      , inputsPrepared = {
        clock: timestamp
        , history: [{
          type: 'Bolus'
          , amount: 1
          , start_at: timestamp
          , end_at: timestamp
          , unit: "U"
        }]
        , profile: profile
      };
      
    runTest(require('../lib/iob'), inputsDefault);
    runTest(require('../lib/iob-prepared'), inputsPrepared);

    function runTest(generate, inputs) {
      var rightAfterBolus = generate(inputs)[0];
      rightAfterBolus.iob.should.equal(1);
      rightAfterBolus.bolussnooze.should.equal(1);
      rightAfterBolus.activity.should.equal(0);

      var hourLaterInputs = inputs;
      hourLaterInputs.clock = new Date(now + (60 * 60 * 1000)).toISOString();
      var hourLater = generate(hourLaterInputs)[0];
      hourLater.iob.should.be.lessThan(1);
      hourLater.bolussnooze.should.be.lessThan(.5);
      hourLater.iob.should.be.greaterThan(0);
      hourLater.activity.should.be.greaterThan(0);

      var afterDIAInputs = inputs;
      afterDIAInputs.clock = new Date(now + (3 * 60 * 60 * 1000)).toISOString();
      var afterDIA = generate(afterDIAInputs)[0];

      afterDIA.iob.should.equal(0);
      afterDIA.bolussnooze.should.equal(0);
      afterDIA.activity.should.equal(0);
    }
  });

  it('should snooze fast if bolussnooze_dia_divisor is high', function() {

    var now = Date.now()
      , timestamp = new Date(now).toISOString()
      , profile = {
        dia: 3
        , bolussnooze_dia_divisor: 10
      }
      , inputsDefault = {
        clock: timestamp
        , history: [{
          _type: 'Bolus'
          , amount: 1
          , timestamp: timestamp
        }]
        , profile: profile
      }
      , inputsPrepared = {
        clock: timestamp
        , history: [{
          type: 'Bolus'
          , amount: 1
          , start_at: timestamp
          , end_at: timestamp
          , unit: "U"
        }]
        , profile: profile
      };

    runTest(require('../lib/iob'), inputsDefault);
    runTest(require('../lib/iob-prepared'), inputsPrepared);
      
    function runTest(generate, inputs) {
      var rightAfterBolus = generate(inputs)[0];
      rightAfterBolus.bolussnooze.should.equal(1);
      var snoozeInputs = inputs;
      snoozeInputs.clock = new Date(now + (20 * 60 * 1000)).toISOString();
      var snooze = generate(snoozeInputs)[0];
      snooze.bolussnooze.should.equal(0);
    }
  });

  it('should calculate IOB with Temp Basals', function() {

    var now = Date.now()
      , timestamp = new Date(now).toISOString()
      , timestampEarly = new Date(now - (30 * 60 * 1000)).toISOString()
      , profile = { dia: 3, current_basal: 1, bolussnooze_dia_divisor: 2}
      , inputsDefault = {
        clock: timestamp
        , history: [
          {_type: 'TempBasalDuration','duration (min)': 30, date: timestampEarly}
          , {_type: 'TempBasal', rate: 2, date: timestampEarly, timestamp: timestampEarly}
          , {_type: 'TempBasal', rate: 2, date: timestamp, timestamp: timestamp}
          , {_type: 'TempBasalDuration','duration (min)': 30, date: timestamp}
        ]
        , profile: profile
      }
      , inputsPrepared = {
        clock: timestamp
        , history: [{
          type: 'TempBasal'
          , start_at: timestampEarly
          , end_at: timestamp
          , amount: 1
          , unit: "U/hour"
        }]
        , profile: profile
      };

    runTest(require('../lib/iob'), inputsDefault);
    runTest(require('../lib/iob-prepared'), inputsPrepared);
      
    function runTest(generate, inputs) {
      var hourLaterInputs = inputs;
      hourLaterInputs.clock = new Date(now + (60 * 60 * 1000)).toISOString();
      var hourLater = generate(hourLaterInputs)[0];
      
      hourLater.iob.should.be.lessThan(1);
      hourLater.iob.should.be.greaterThan(0);
      hourLater.activity.should.be.greaterThan(0);
    }
  });

  it('should calculate IOB with Temp Basal events that overlap', function() {

    var now = Date.now()
      , timestamp = new Date(now).toISOString()
      , timestampEarly = new Date(now - 1).toISOString()
      , inputs = {clock: timestamp,
        history: [{_type: 'TempBasalDuration','duration (min)': 30, date: timestampEarly}
        ,{_type: 'TempBasal', rate: 2, date: timestampEarly, timestamp: timestampEarly}
        ,{_type: 'TempBasal', rate: 2, date: timestamp, timestamp: timestamp}
		,{_type: 'TempBasalDuration','duration (min)': 30, date: timestamp}]
		, profile: { dia: 3, current_basal: 1}
      };

    var hourLaterInputs = inputs;
    hourLaterInputs.clock = new Date(now + (60 * 60 * 1000)).toISOString();
    var hourLater = require('../lib/iob')(hourLaterInputs)[0];
    
    hourLater.iob.should.be.lessThan(1);
    hourLater.iob.should.be.greaterThan(0);
    
  });

  it('should calculate IOB with Temp Basals that are lower than base rate', function() {

    var now = Date.now()
      , timestamp = new Date(now).toISOString()
      , timestampEarly = new Date(now - (30 * 60 * 1000)).toISOString()
      , profile = { dia: 3, current_basal: 2, bolussnooze_dia_divisor: 2}
      , inputsDefault = {
        clock: timestamp
        , history: [
          {_type: 'TempBasalDuration','duration (min)': 30, date: timestampEarly}
          , {_type: 'TempBasal', rate: 1, date: timestampEarly, timestamp: timestampEarly}
          , {_type: 'TempBasal', rate: 1, date: timestamp, timestamp: timestamp}
          , {_type: 'TempBasalDuration','duration (min)': 30, date: timestamp}
        ]
        , profile: profile
      }
      , inputsPrepared = {
        clock: timestamp
        , history: [{
          type: 'TempBasal'
          , start_at: timestampEarly
          , end_at: timestamp
          , amount: -1
          , unit: "U/hour"
        }]
        , profile: profile
      };

    runTest(require('../lib/iob'), inputsDefault);
    runTest(require('../lib/iob-prepared'), inputsPrepared);
      
    function runTest(generate, inputs) {
      var hourLaterInputs = inputs;
      hourLaterInputs.clock = new Date(now + (60 * 60 * 1000)).toISOString();
      var hourLater = generate(hourLaterInputs)[0];
      
      hourLater.iob.should.be.lessThan(0);
      hourLater.iob.should.be.greaterThan(-1);
      hourLater.activity.should.be.lessThan(0);
    }
  });

  it('should show 0 IOB with Temp Basals if duration is not found', function() {

    var now = Date.now()
      , timestamp = new Date(now).toISOString()
      , timestampEarly = new Date(now - (60 * 60 * 1000)).toISOString()
      , inputs = {
        clock: timestamp
        , history: [{_type: 'TempBasal', rate: 2, date: timestamp, timestamp: timestamp}]
        , profile: {dia: 3, current_basal: 1, bolussnooze_dia_divisor: 2}
      };

    var hourLaterInputs = inputs;
    hourLaterInputs.clock = new Date(now + (60 * 60 * 1000)).toISOString();
    var hourLater = require('../lib/iob')(hourLaterInputs)[0];
    
    hourLater.iob.should.equal(0);
  });

  it('should show 0 IOB with Temp Basals if basal is percentage based', function() {

    var now = Date.now()
      , timestamp = new Date(now).toISOString()
      , timestampEarly = new Date(now - (60 * 60 * 1000)).toISOString()
      , profile = {dia: 3,current_basal: 1, bolussnooze_dia_divisor: 2}
      , inputs = {
        clock: timestamp
        , history: [
          {_type: 'TempBasal', temp: 'percent', rate: 2, date: timestamp, timestamp: timestamp},
          {_type: 'TempBasalDuration','duration (min)': 30, date: timestamp}
        ]
        , profile: profile
      };

    var hourLaterInputs = inputs;
    hourLaterInputs.clock = new Date(now + (60 * 60 * 1000)).toISOString();
    var hourLater = require('../lib/iob')(hourLaterInputs)[0];    
    hourLater.iob.should.equal(0);
  });


  it('should calculate IOB using a 4 hour duration', function() {

    var now = Date.now()
      , timestamp = new Date(now).toISOString()
      , profile = {
        dia: 4
        , bolussnooze_dia_divisor: 2
      }
      , inputsDefault = {
        clock: timestamp
        , history: [{
          _type: 'Bolus'
          , amount: 1
          , timestamp: timestamp
        }]
        , profile: profile
      }
      , inputsPrepared = {
        clock: timestamp
        , history: [{
          type: 'Bolus'
          , amount: 1
          , start_at: timestamp
          , end_at: timestamp
          , unit: "U"
        }]
        , profile: profile
      };

    runTest(require('../lib/iob'), inputsDefault);
    runTest(require('../lib/iob-prepared'), inputsPrepared);

    function runTest(generate, inputs) {
      var rightAfterBolus = generate(inputs)[0];
      //console.log(rightAfterBolus);
      rightAfterBolus.iob.should.equal(1);
      rightAfterBolus.bolussnooze.should.equal(1);
      rightAfterBolus.activity.should.equal(0);

      var hourLaterInputs = inputs;
      hourLaterInputs.clock = new Date(now + (60 * 60 * 1000)).toISOString();
      var hourLater = generate(hourLaterInputs)[0];
      hourLater.iob.should.be.lessThan(1);
      hourLater.bolussnooze.should.be.lessThan(.5);
      hourLater.iob.should.be.greaterThan(0);
      hourLater.activity.should.be.greaterThan(0);

      var after3hInputs = inputs;
      after3hInputs.clock = new Date(now + (3 * 60 * 60 * 1000)).toISOString();
      var after3h = generate(after3hInputs)[0];
      after3h.iob.should.be.greaterThan(0);
      after3h.activity.should.be.greaterThan(0);

      var after4hInputs = inputs;
      after4hInputs.clock = new Date(now + (4 * 60 * 60 * 1000)).toISOString();
      var after4h = generate(after4hInputs)[0];
      after4h.iob.should.equal(0);
      after4h.activity.should.equal(0);
    }
  });

  it('should calculate IOB with Square Boluses', function() {
    
    // we should make sure cancelled square boluses are handled correctly
    // we should make sure square boluses in progress are handled correctly
    // we should make sure suspend/resumes are handled correctly

    var now = Date.now()
      , timestamp = new Date(now).toISOString()
      , timestampEarly = new Date(now - (30 * 60 * 1000)).toISOString()
      , profile = { dia: 3, bolussnooze_dia_divisor: 2}
      , inputsDefault = {
        clock: timestamp
        , history: [{
          _type: 'Bolus'
          , type: 'square'
          , duration: 30
          , amount: 1
          , timestamp: timestamp
        }]
        , profile: profile
      }
      , inputsPrepared = {
        clock: timestamp
        , history: [{
          amount: 2
          , start_at: timestampEarly
          , description: "Square bolus: 1.0U over 30min"
          , type: 'Bolus'
          , unit: "U/hour"
          , end_at: timestamp
        }]
        , profile: profile
      };

    runTest(require('../lib/iob'), inputsDefault);
    runTest(require('../lib/iob-prepared'), inputsPrepared);
      
    function runTest(generate, inputs) {
      var rightAfterBolus = generate(inputs)[0];
      rightAfterBolus.iob.should.be.lessThan(1);
      rightAfterBolus.bolussnooze.should.be.lessThan(1);
      rightAfterBolus.activity.should.be.greaterThan(0);

      var hourLaterInputs = inputs;
      hourLaterInputs.clock = new Date(now + (60 * 60 * 1000)).toISOString();
      var hourLater = generate(hourLaterInputs)[0];
      hourLater.iob.should.be.lessThan(rightAfterBolus.iob);
      hourLater.bolussnooze.should.be.lessThan(.5 * rightAfterBolus.bolussnooze);
      hourLater.iob.should.be.greaterThan(0);
      hourLater.activity.should.be.greaterThan(0);

      var afterDIAInputs = inputs;
      afterDIAInputs.clock = new Date(now + (3 * 60 * 60 * 1000)).toISOString();
      var afterDIA = generate(afterDIAInputs)[0];

      afterDIA.iob.should.equal(0);
      afterDIA.bolussnooze.should.equal(0);
      afterDIA.activity.should.equal(0);     
    }
  });
});
