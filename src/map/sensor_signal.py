from system import config
from .items import *

__all__ = ['update', 'MAP']

MAP_SENSOR_SIGNAL = {
    # "[NTkeyname]": "[signalName]",
    "Joystick_0_Axis_1": AXIS.mainH,
}


def update():
    MAP_SENSOR_SIGNAL.update(config.read(('SENSORMAP', None)))


def MAP(inputDict, preserve=True):
    "[NTkeyname] -> [signalName]"
    if isinstance(inputDict, dict):
        mappedDict = dict()
        for key in inputDict:
            if key in MAP_SENSOR_SIGNAL:
                mappedDict[MAP_SENSOR_SIGNAL[key]] = inputDict[key]
            else:
                if preserve:
                    mappedDict[key] = inputDict[key]
        return mappedDict
    raise Exception(
        f'invalid input for mapping, dict required, {inputDict.__class__.__name__} supplied.')
