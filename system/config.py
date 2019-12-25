import configparser
from typing import Optional, Tuple, Union

from .engine.util import Loggable


class __configHandler(Loggable):
    def __init__(self):
        Loggable.__init__(self)
        # 生成ConfigParser对象
        self.__config = configparser.ConfigParser()
        self.__configPerm = configparser.ConfigParser()
        # 读取配置文件
        self.__filename = 'system.conf'
        self.__config.read(self.__filename, encoding='utf-8')
        self.__configPerm.read(self.__filename, encoding='utf-8')

    def read(self, secOpt: Optional[Tuple[str, str]] = None) -> Union[dict, str]:
        'return config value for specified (sec,opt) tuple. If not specified, return a dict of all (sec,opt):value pairs.'
        if secOpt is None:
            configDict = dict()
            for secName, sec in self.__config.items():
                for opt in sec:
                    configDict[(secName, opt)] = self.__config.get(
                        secName, opt)
            return(configDict)
        else:
            sec, opt = secOpt
            return self.__config.get(sec, opt)

    def write(self, secOpt: Tuple[str, str], val, permanent: bool = False):
        'set config value for (sec,opt). If specify permanent, change will preserve after system restart.'
        sec, opt = secOpt
        val = str(val)
        self.__config.set(sec, opt, val)
        if permanent:
            self.__configPerm.set(sec, opt, val)
            with open(self.__filename, 'w') as configfile:
                self.__configPerm.write(configfile)


config = __configHandler()
