'use strict';

require('should');

describe('IOB', function ( ) {
  
  var now = Date.now()
    , timestamp = new Date(now).toISOString()
    , timestampEarly = new Date(now - (30 * 60 * 1000)).toISOString();

  // define each test abstractly so that each type of history (raw MDT or
  // mmhistorytools-prepared) can be tested separately
  var testIOB = function (generate, history) {
    return function () {
      var inputs = {
        clock: timestamp
        , history: history
        , profile: {
          dia: 3
          , bolussnooze_dia_divisor: 2
        }
      };        

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
    };
  };
  
  var testBolusSnooze = function (generate, history) {
    return function () {
      var inputs = {
        clock: timestamp
        , history: history
        , profile: {
          dia: 3
          , bolussnooze_dia_divisor: 10
        }
      };
        
      var snoozeInputs = inputs;
      snoozeInputs.clock = new Date(now + (20 * 60 * 1000)).toISOString();
      var snooze = generate(snoozeInputs)[0];
      snooze.bolussnooze.should.equal(0);
    };
  };

  var testTempBasals = function (generate, history) {    
    return function () {
      var inputs = {clock: timestamp,
        history: history
        , profile: { dia: 3, current_basal: 1, bolussnooze_dia_divisor: 2}
        , basalprofile: [{'i': 0, 'start': '00:00:00', 'rate': 1, 'minutes': 0}] 
      };
      
      var hourLaterInputs = inputs;
      hourLaterInputs.clock = new Date(now + (60 * 60 * 1000)).toISOString();
      var hourLater = generate(hourLaterInputs)[0];
      
      hourLater.iob.should.be.lessThan(1);
      hourLater.iob.should.be.greaterThan(0);
      hourLater.activity.should.be.greaterThan(0);
    };
  };

  var testLowTempBasals = function(generate, history) {
    return function() {
      var inputs = {clock: timestamp
        , history: history
        , profile: { dia: 3, current_basal: 2, bolussnooze_dia_divisor: 2}
      };

      var hourLaterInputs = inputs;
      hourLaterInputs.clock = new Date(now + (60 * 60 * 1000)).toISOString();
      var hourLater = generate(hourLaterInputs)[0];
      
      hourLater.iob.should.be.lessThan(0);
      hourLater.iob.should.be.greaterThan(-1);
      hourLater.activity.should.be.lessThan(0);
    };
  };
  
  // TO DO:
  // make sure cancelled square boluses are handled correctly
  // make sure square boluses in progress are handled correctly
  // make sure suspend/resumes are handled correctly
  var testSquareBoluses = function(generate, history) {
    return function () {
      var inputs = {clock: timestamp
        , history: history
        , profile: { dia: 3, bolussnooze_dia_divisor: 2}
      };

      var rightAfterBolus = generate(inputs)[0];
      rightAfterBolus.iob.should.be.lessThan(1);
      rightAfterBolus.bolussnooze.should.be.lessThan(1);
      rightAfterBolus.activity.should.be.greaterThan(0);

      var hourLaterInputs = inputs;
      hourLaterInputs.clock = new Date(now + (60 * 60 * 1000)).toISOString();
      var hourLater = generate(hourLaterInputs)[0];
      hourLater.iob.should.be.lessThan(rightAfterBolus.iob);
      hourLater.bolussnooze.should.be.lessThan(rightAfterBolus.bolussnooze);
      hourLater.iob.should.be.greaterThan(0);
      hourLater.activity.should.be.greaterThan(0);

      var withinDIAInputs = inputs;
      withinDIAInputs.clock = new Date(now + (2.5 * 60 * 60 * 1000)).toISOString();
      var withinDIA = generate(withinDIAInputs)[0];

      withinDIA.iob.should.be.greaterThan(0);
      withinDIA.activity.should.be.greaterThan(0);     

      var afterDIAInputs = inputs;
      afterDIAInputs.clock = new Date(now + (3 * 60 * 60 * 1000)).toISOString();
      var afterDIA = generate(afterDIAInputs)[0];

      afterDIA.iob.should.equal(0);
      afterDIA.bolussnooze.should.equal(0);
      afterDIA.activity.should.equal(0);     
    };
  };

  // test with raw history
  describe('with raw history', function() {
    it('should calculate IOB', testIOB(
      require('../lib/iob'),
      [{
        _type: 'Bolus',
        amount: 1,
        timestamp: timestamp
      }]    
    ));  

    it('should snooze fast if bolussnooze_dia_divisor is high', testBolusSnooze(
      require('../lib/iob'),
      [{
        _type: 'Bolus',
        amount: 1,
        timestamp: timestamp
      }]        
    ));

    it('should calculate IOB with Temp Basals', testTempBasals(
      require('../lib/iob'),
      [
        {_type: 'TempBasalDuration','duration (min)': 30, date: timestampEarly}
        , {_type: 'TempBasal', rate: 2, date: timestampEarly, timestamp: timestampEarly}
        , {_type: 'TempBasal', rate: 2, date: timestamp, timestamp: timestamp}
        , {_type: 'TempBasalDuration','duration (min)': 30, date: timestamp}
      ]    
    ));

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


    it('should calculate IOB with Temp Basals that are lower than base rate', testLowTempBasals(
      require('../lib/iob'),
      [
        {_type: 'TempBasalDuration','duration (min)': 30, date: timestampEarly}
        , {_type: 'TempBasal', rate: 1, date: timestampEarly, timestamp: timestampEarly}
        , {_type: 'TempBasal', rate: 1, date: timestamp, timestamp: timestamp}
        , {_type: 'TempBasalDuration','duration (min)': 30, date: timestamp}
      ]    
    ));
      
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


    it('should calculate IOB using a 4 hour duration', testIOB4hourDIA(
      require('../lib/iob'),
      [{
        _type: 'Bolus'
        , amount: 1
        , timestamp: timestamp
      }]
    ));
          

    it('should calculate IOB with Square Boluses', testSquareBoluses(
      require('../lib/iob'),
      [{
        _type: 'Bolus'
        , type: 'square'
        , duration: 30
        , amount: 1
        // should  be timestampEarly???
        // , timestamp: timestamp
        , timestamp: timestampEarly
      }]
    ));
  });
  
  // test with history prepared using mmhistorytools
  describe('with prepared history', function() {
    it('should calculate IOB', testIOB(
      require('../lib/iob-prepared'),
      [{
        type: 'Bolus',
        amount: 1,
        start_at: timestamp,
        end_at: timestamp,
        unit: "U"
      }]
    ));  

    it('should snooze fast if bolussnooze_dia_divisor is high', testBolusSnooze(
      require('../lib/iob-prepared'),
      [{
        type: 'Bolus',
        amount: 1,
        start_at: timestamp,
        end_at: timestamp,
        unit: "U"
      }]
    ));
  
    it('should calculate IOB with Temp Basals', testTempBasals(
      require('../lib/iob-prepared'),
      [{
        type: 'TempBasal'
        , start_at: timestampEarly
        , end_at: timestamp
        , amount: 1
        , unit: "U/hour"
      }]
    ));

    it('should calculate IOB with Temp Basals that are lower than base rate', testLowTempBasals(
      require('../lib/iob-prepared'),
      [{
        type: 'TempBasal'
        , start_at: timestampEarly
        , end_at: timestamp
        , amount: -1
        , unit: "U/hour"
      }]
    ));

    it('should calculate IOB using a 4 hour duration', testIOB4hourDIA(
      require('../lib/iob-prepared'),
      [{
        type: 'Bolus'
        , amount: 1
        , start_at: timestamp
        , end_at: timestamp
        , unit: "U"
      }]
    ));

    it('should calculate IOB with Square Boluses', testSquareBoluses(
      require('../lib/iob-prepared'),
      [{
        amount: 2
        , start_at: timestampEarly
        , description: "Square bolus: 1.0U over 30min"
        , type: 'Bolus'
        , unit: "U/hour"
        , end_at: timestamp
      }]
    ));
  });
});
