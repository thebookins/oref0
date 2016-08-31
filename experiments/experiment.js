'use strict';

var prepared = false;

var tz = require('timezone');

var generate_iob = require('../lib/iob');
var find_insulin = (prepared) ? require('../lib/iob/history-prepared') : require('../lib/iob/history');
var basal = require('../lib/profile/basal');


var clock_data = require('./clock.json')
var clock = new Date(tz(formatLocalDate(clock_data)));

var history = (prepared) ? require('./pump-history-prepared.json') : require('./pump-history.json');

var timeStrings = ["start_at", "end_at", "timestamp"];
history.forEach(function(entry) {
  timeStrings.forEach(function(string) {
    if (entry.hasOwnProperty(string)) {
      entry[string] = formatLocalDate(entry[string]);
    }
  });
});

var profile = require('./profile.json');
var basals = require('./selected-basal-profile.json');

var data = [];

var inputs = {history, profile: {current_basal: 0}};
var treatments = find_insulin(inputs);


for (var i=12*60*60; i>=0; i--) {  
  var t = new Date(clock.getTime() - i*1000);
  var current_basal = basal.basalLookup(basals, t);
  var basal_rate = current_basal;
  treatments.forEach(function(treatment) {
    if (treatment.hasOwnProperty('rate')) {
      if ((t >= treatment.date) && (t < treatment.date + treatment.duration*60*1000)) {
        basal_rate = treatment.rate;
        return;
      }
    }
  });
  
  var inputs = {
    history,
    profile: {
      dia: profile.dia,
      basalprofile: profile.basalprofile,
      current_basal: current_basal
    },
    clock: t.toISOString(),
    prepared
  };
  
  var iob = generate_iob(inputs)[0];
  
  data.push({
    iob: iob.iob,
    basaliob: iob.basaliob,
    t: t.toLocaleTimeString(),
    normal_basal_rate: current_basal,
    basal_rate
  });
}

function formatLocalDate(dateString) {
    var now = new Date(),
        tzo = -now.getTimezoneOffset(),
        dif = tzo >= 0 ? '+' : '-',
        pad = function(num) {
            var norm = Math.abs(Math.floor(num));
            return (norm < 10 ? '0' : '') + norm;
        };
        return dateString
        + dif + pad(tzo / 60) 
        + ':' + pad(tzo % 60);
}

console.log(JSON.stringify(data));
