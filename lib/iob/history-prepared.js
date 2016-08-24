
var tz = require('timezone');

function calcTempTreatments (inputs) {
    var pumpHistory = inputs.history;
    // var profile_data = inputs.profile;
    var tempHistory = [];
    var tempBoluses = [];
    pumpHistory.forEach(function(current) {
        if (current.type == "Bolus") {
            var temp = {};
            temp.timestamp = current.start_at;
            temp.started_at = new Date(tz(current.start_at));
            temp.date = temp.started_at.getTime();
            temp.insulin = current.amount;
            tempBoluses.push(temp);
        } else if (current.type == "TempBasal") {
            var temp = {};
            temp.normalizedRate = current.amount;
            temp.timestamp = current.start_at;
            temp.started_at = new Date(tz(temp.timestamp));
            temp.date = temp.started_at.getTime();
            var end_at = new Date(tz(current.end_at));
            temp.duration = (end_at.getTime() - temp.date)/60/1000;            
            tempHistory.push(temp);
        }
    });
    var tempBolusSize;
    tempHistory.forEach(function(current) {
        if (current.duration > 0) {
            var netBasalRate = current.normalizedRate;
            if (netBasalRate < 0) { tempBolusSize = -0.05; }
            else { tempBolusSize = 0.05; }
            var netBasalAmount = Math.round(netBasalRate*current.duration*10/6)/100
            var tempBolusCount = Math.round(netBasalAmount / tempBolusSize);
            var tempBolusSpacing = current.duration / tempBolusCount;
            for (var j=0; j < tempBolusCount; j++) {
                var tempBolus = {};
                tempBolus.insulin = tempBolusSize;
                tempBolus.date = current.date + j * tempBolusSpacing*60*1000;
                tempBolus.created_at = new Date(tempBolus.date);
                tempBoluses.push(tempBolus);
            }
        }
    }
    var all_data =  [ ].concat(tempBoluses).concat(tempHistory);
    // To sort numbers the compare function can simply subtract b from a
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
    all_data.sort(function (a, b) { return a.date - b.date });
    return all_data;
}
exports = module.exports = calcTempTreatments;
