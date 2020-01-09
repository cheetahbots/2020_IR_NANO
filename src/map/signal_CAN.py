from system import config
from .items import *

__all__ = ['update', 'MAP']

MAP_SIGNAL_CAN = {
    # "[signalName]": "[CANID]",
    AXIS.mainH: 1
}


def update():
    MAP_SIGNAL_CAN.update(config.read(('SIGNALMAP', None)))


def MAP(inputDict):
    "[signalName] -> [CANID]"
    if isinstance(inputDict, dict):
        mappedDict = dict()
        for key in inputDict:
            if key in MAP_SIGNAL_CAN:
                mappedDict[MAP_SIGNAL_CAN[key]] = inputDict[key]
            else:
                mappedDict[key] = inputDict[key]
        return mappedDict
    raise Exception(
        f'invalid input for mapping, dict required, {inputDict.__class__.__name__} supplied.')
