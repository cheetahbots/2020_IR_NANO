__all__ = ['CAM', 'PIN', 'BTN', 'AXIS',
           'update_MAP_SENSOR_SIGNAL', 'update_MAP_SIGNAL_CAN',
           'CANMAP', 'INPUTMAP']

from system import config


def CAM(i):
    'custom item id'
    return f'CAM{i}'


def PIN(i):
    'custom item id'
    return f'PIN{i}'


def BTN(i):
    'custom item id'
    return f'BTN{i}'


def AXIS(i):
    'custom item id'
    return f'AXIS{i}'


MAP_SIGNAL_CAN = {
    # "[signalName]": "[CANID]",
    AXIS(1): 1
}

MAP_SENSOR_SIGNAL = {
    # "[NTkeyname]": "[signalName]",
    "Joystick_0_Axis_1": AXIS(1),
}


def update_MAP_SENSOR_SIGNAL():
    MAP_SENSOR_SIGNAL.update(config.read(('SENSORMAP', None)))


def update_MAP_SIGNAL_CAN():
    MAP_SIGNAL_CAN.update(config.read(('SIGNALMAP', None)))


def CANMAP(inputDict):
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


def INPUTMAP(inputDict, preserve=True):
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
