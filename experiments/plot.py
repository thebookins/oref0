import os
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
from operator import add
import yaml
from datetime import datetime, timedelta

def main():
  with open('data_original.json') as data_file:
    data_original = yaml.safe_load(data_file)

  with open('data_mmhistorytools.json') as data_file:
    data_mmhistorytools = yaml.safe_load(data_file)

  with open('data_oref0.json') as data_file:
    data_oref0 = yaml.safe_load(data_file)

  sns.set(style="whitegrid", color_codes=True)
  
  ax1 = plt.subplot(211)
  ax1.set_ylabel('iob (U)')
  ax2 = plt.subplot(212, sharex=ax1)
  ax2.set_ylabel('basal rate (U/hr)')
  
  starttime = datetime.strptime(data_original[0]["t"], '%I:%M:%S %p')
  
  t = []
  iob_original = []
  iob_mmhistorytools = []
  iob_oref0 = []
  normal_basal_rate = []
  basal_rate = []
  
  for n, datapoint in enumerate(data_original):
    t.append(starttime + timedelta(seconds=n))
    iob_original.append(datapoint["basaliob"])
    normal_basal_rate.append(datapoint["normal_basal_rate"])
    basal_rate.append(datapoint["basal_rate"])

  for n, datapoint in enumerate(data_mmhistorytools):
    iob_mmhistorytools.append(datapoint["basaliob"])

  for n, datapoint in enumerate(data_oref0):
    iob_oref0.append(datapoint["basaliob"])

  ax1.plot(t, iob_original, 'b', label="original", linewidth=1)
  ax1.plot(t, iob_mmhistorytools, 'g', label="mmhistorytools", linewidth=1)
  ax1.plot(t, iob_oref0, 'r', label="oref0", linewidth=1)
  ax2.plot(t, normal_basal_rate, label="basal profile")
  ax2.fill_between(t, normal_basal_rate, basal_rate, facecolor='green', alpha=0.2)
  ax2.plot(t, basal_rate, label="basal actual")
        
  ax1.legend(loc='upper center', bbox_to_anchor=(0.5, 1.05), ncol=3, fancybox=True, shadow=True)
  
  ax2.legend(loc='upper center', bbox_to_anchor=(0.5, 1.05), ncol=3, fancybox=True, shadow=True)
  plt.savefig('plot.png')

if __name__ == '__main__':
  main()