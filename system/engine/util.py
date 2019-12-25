import logging


class Loggable():
    '通过self.log方法在消息中标出当前模块信息'
    globalIdCounter = 0

    def __init__(self, scope='main'):
        self.__ID = Loggable.globalIdCounter
        self.__scope = scope
        Loggable.globalIdCounter += 1
        self.__logger = logging.getLogger(
            f"{self.__scope}.{self.__class__.__name__} [{str(self.__ID)}]")

    def log(self, msg, level=logging.INFO):
        if level is logging.INFO:
            self.__logger.info(msg)


class Activatable(Loggable):
    '能够设置模块的activated状态，继承loggable'

    def __init__(self):
        Loggable.__init__(self)
        self.__activated = False

    @property
    def activated(self):
        return self.__activated

    @activated.setter
    def activated(self, val):
        self.__activated = val
        if self.__activated:
            self.log('module activated')
        else:
            self.log('module deactivated')
