
var tz = require('timezone');

function iobCalc(treatment, time, dia) {
    var activityEndMinutes = (dia / 3.0) * 180 ;
    var x_peak = 75 / 180;
    

    if (typeof time === 'undefined') {
        time = new Date();
    }

    var results = {};

    var iobContrib = 0;
    var activityContrib = 0;

    var treatmentEndTime = new Date(tz(treatment.end_at));
    var x_end = (time-treatmentEndTime) / 1000 / 60 / activityEndMinutes;

    if (treatment.unit == "U") {
      // if it's negative iobContrib must be zero
      iobContrib = (x_end < 0) ? 0 : -treatment.amount * f1(x_end, x_peak);
      activityContrib = treatment.amount * f0(x_end, x_peak);
    }
    else if (treatment.unit == 'U/hour') {
        var treatmentStartTime = new Date(tz(treatment.start_at));
        var x_start = (time-treatmentStartTime) / 1000 / 60 / activityEndMinutes;
        // something like this???
        // need to think about units (U/hour --> U/dia?)
        iobContrib = dia * treatment.amount * (f2(x_end, x_peak) - f2(x_start, x_peak));
        activityContrib = dia * treatment.amount * (f1(x_start, x_peak) - f1(x_end, x_peak));
    }

    results = {
        iobContrib: iobContrib,
        activityContrib: activityContrib
    };
    return results;
}

// this function is the insulin activity curve for 1 U of insulin, normalized to a dia of 1
// piecewise linear with a peak at x_peak, zero for x <= 0 and x >= 1
function f0(x, x_peak) {
  // limit x to [0, 1]
  x = Math.max(x, 0);
  x = Math.min(x, 1);
  
  // transformed variables
  x1 = Math.min(x, x_peak)
  x2 = Math.min(1-x, 1-x_peak)

  var y = 2 * (x1/x_peak + x2/(1 - x_peak) - 1);
  return y;
}

// this function is the insulin appearance curve, normalized to a dia of 1
// f1 is the integral of f0
// f1 = -1 at x <= 0, zero for and x >= 1
function f1(x, x_peak) {
  // limit x to [0, 1]
  x = Math.max(x, 0);
  x = Math.min(x, 1);
  
  // transformed variables
  x1 = Math.min(x, x_peak)
  x2 = Math.min(1-x, 1-x_peak)

  var y = Math.pow(x1,2)/x_peak - Math.pow(x2,2)/(1 - x_peak) - x_peak;
  return y;
}

// this function is the integral of the iob curve f1, normalized to a dia of 1
// f2 = 0 at x = 1
function f2(x, x_peak) {
  // limit x to [0, 1]
  x = Math.max(x, 0);
  x = Math.min(x, 1);
  
  // transformed variables
  x1 = Math.min(x, x_peak)
  x2 = Math.min(1-x, 1-x_peak)

  var y = (1/3) * (Math.pow(x1,3)/x_peak + Math.pow(x2,3)/(1 - x_peak) - Math.pow(x_peak,2)) - x1 + x_peak;
  return y;
}


// function f0(x) {
  // // limit x to [0, 1]
  // x = Math.max(x, 0);
  // x = Math.min(x, 1);
  // // helper variables x1, x2 normalized over each piecewise linear segment
  // // might make more sense to have var x2 = Math.min((x - x_peak) / (1 - x_peak), 1);
  // // no great advantage having x2 march in from RHS  
  // var x1 = Math.min(x / x_peak, 1);
  // // var x2 = Math.min((1 - x) / (1 - x_peak), 1);
  // var x2 = Math.max((x - x_peak) / (1 - x_peak), 0);
  // var y = 2 * (x1 - x2);
  // return y;
// }

// function f1(x) {
  // // if (x < 0) return 0;
  // // limit x to [0, 1]
  // x = Math.max(x, 0);
  // x = Math.min(x, 1);
  // var x1 = Math.min(x / x_peak, 1);
  // var x2 = Math.max((x - x_peak) / (1 - x_peak), 0);
  // // var x2 = Math.max((1 - x) / (1 - x_peak), 0);(1/3)
  // var y = x_peak * Math.pow(x1, 2) + (1 - x_peak) * x2 * (2 - x2) - 1;
  // return y;
// }



// function f2(x) {
  // // limit x to [0, 1]
  // x = Math.max(x, 0);
  // x = Math.min(x, 1);
  // var x1 = Math.min(x / x_peak, 1);
  // var x2 = Math.max((x - x_peak) / (1 - x_peak), 0);

  // var y = x_peak * (x_peak * Math.pow(x1, 3) / 3 - x1) + Math.pow(1 - x_peak, 2) * (Math.pow(x2, 2) - x2 - Math.pow(x2, 3)/3);
  // return y;
// }


exports = module.exports = iobCalc;
