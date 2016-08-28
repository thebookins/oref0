## Experiments

This directory has some scripts to calculate and plot a 12-hour iob history for a given pump history.

The intention is to run these experiments against branches with differences in the iob calculation.

The scripts are not written to run fully automatically.

### Description
The script experiment.js steps through the 12-hour period of `pump-history.json` in 1 second increments and calculates the iob that oref0 would have determined at that point in time. The results are output in a json file for later plotting.

(The 1 second increment may be excessive, but 5 minute increments are too coarse to resolve the real basal periods.)

The script `plot.py` uses the output of `experiment.js` (or several outputs, from different oref0 branches) and plots the iob against basals.

### Installation
The script plot.py uses some python libraries that may need to be installed using pip.

### Example usage

1. `node experiment > data_original.json`
2. Checkout a different oref0 branch
3. `node experiment > data_new.json`
4. Edit plot.py to point to the data files you just created.
5. `python plot.py`
6. The result will be in `plot.png`