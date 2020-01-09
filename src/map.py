__all__ = ['CAM', 'PIN', 'BUTTON', 'AXIS',
           'update_MAP_SENSOR_SIGNAL', 'update_MAP_SIGNAL_CAN',
           'CANMAP', 'INPUTMAP']
from system import config


class SignalMapper():
    'use [] to specify unique ID or multiplie IDs. Work like an array and a dict.'

    def __init__(self, name):
        self.name = name

    def __getitem__(self, key):
        if isinstance(key, (int, float, str)):
            return self.name + str(key)
        elif isinstance(key, (tuple, list)):
            result = list()
            for subkey in key:
                item = self.__getitem__(subkey)
                result.extend(self.__getitem__(subkey)) if isinstance(
                    item, (tuple, list)) else result.append(item)
            return list(set(result))
        elif isinstance(key, slice):
            # key.indices()
            return [self.name + str(num) for num in range(key.start, key.stop, key.step if key.step is not None else 1)]
        else:
            raise Exception('bad key type')


CAM = SignalMapper('CAM')
PIN = SignalMapper('PIN')
BUTTON = SignalMapper('BTN')
AXIS = SignalMapper('AXIS')

MAP_SIGNAL_CAN = {
    # "[signalName]": "[CANID]",
    AXIS[1]: 1
}

MAP_SENSOR_SIGNAL = {
    # "[NTkeyname]": "[signalName]",
    "Joystick_0_Axis_1": AXIS[1],
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
