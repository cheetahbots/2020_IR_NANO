class Signal():
    def __init__(self, _type, _id):
        # str.__init__(self)
        self._type = _type
        self._id = _id

    def __eq__(self, signal):
        return self._type == signal._type and self._id == signal._id

    def __str__(self):
        return self._type + '_' + self._id

    def __hash__(self):
        return str.__hash__(self.__str__())

class SignalType():
    'use [] to specify unique ID or multiplie IDs. Work like an array and a dict.'

    def __init__(self, _type):
        self._type = _type

    def __getitem__(self, key):
        if isinstance(key, (int, float, str)):
            return Signal(self._type, str(key))
        elif isinstance(key, (tuple, list)):
            result = list()
            for subkey in key:
                item = self.__getitem__(subkey)
                result.extend(self.__getitem__(subkey)) if isinstance(
                    item, (tuple, list)) else result.append(item)
            return list(set(result))
        elif isinstance(key, slice):
            # key.indices()
            return [Signal(self._type, str(num)) for num in range(key.start, key.stop, key.step if key.step is not None else 1)]
        else:
            raise Exception('bad key type')
