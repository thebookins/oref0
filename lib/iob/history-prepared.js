
var tz = require('timezone');

function calcTempTreatments (inputs) {
    var pumpHistory = inputs.history;
    var profile_data = inputs.profile;
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
            // test for percent basal: '%' character in description
            // NOTE: this will fail if the description string is ever changed
            // better to strip out percent type temp basals as part of the normalize command
            if (current.description.indexOf('%') !== -1) {
                return;
            }
            var normalizedRate = current.amount;
            var temp = {};
            temp.normalizedRate = normalizedRate;
            temp.timestamp = current.start_at;
            temp.started_at = new Date(tz(temp.timestamp));
            temp.date = temp.started_at.getTime();
            var end_at = new Date(tz(current.end_at));
            temp.duration = (end_at.getTime() - temp.date)/60/1000;            
            tempHistory.push(temp);
        }
    });
    var tempBolusSize;
    for (var i=0; i < tempHistory.length; i++) {
        if (tempHistory[i].duration > 0) {
            var netBasalRate = tempHistory[i].normalizedRate;
            if (netBasalRate < 0) { tempBolusSize = -0.05; }
            else { tempBolusSize = 0.05; }
            var netBasalAmount = Math.round(netBasalRate*tempHistory[i].duration*10/6)/100
            var tempBolusCount = Math.round(netBasalAmount / tempBolusSize);
            var tempBolusSpacing = tempHistory[i].duration / tempBolusCount;
            for (var j=0; j < tempBolusCount; j++) {
                var tempBolus = {};
                tempBolus.insulin = tempBolusSize;
                tempBolus.date = tempHistory[i].date + j * tempBolusSpacing*60*1000;
                tempBolus.created_at = new Date(tempBolus.date);
                tempBoluses.push(tempBolus);
            }
        }
    }
    var all_data =  [ ].concat(tempBoluses).concat(tempHistory);
    all_data.sort(function (a, b) { return a.date - b.date });
    return all_data;
}
exports = module.exports = calcTempTreatments;
