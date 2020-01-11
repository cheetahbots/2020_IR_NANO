__all__ = ['config']

import configparser
import json
from typing import Tuple, Union

from .lib.schema import And, Optional, Schema, Use, Literal, Or

class configHandler():
    def __init__(self):
        # Loggable.__init__(self)
        # 生成ConfigParser对象
        self.__config = configparser.ConfigParser()
        self.__configPerm = configparser.ConfigParser()
        # 读取配置文件
        self.__filename = 'system.conf'
        self.__config.read(self.__filename, encoding='utf-8')
        self.__configPerm.read(self.__filename, encoding='utf-8')
        #self.__schema = {'DEFAULT': {}, 'ingame': {'start_position': ('A','B','C')}, 'environment': {'team': int, 'password': str}, 'system': {'threadloadcycle': str, 'production': str, 'enablebenchmarking': str}, 'module': {}, 'user': {}, 'pref': {}, 'debug': {}, 'SENSORMAP': {}, 'SIGNALMAP': {}, 'MOTOR_TYPES': {}}
        self.__schema = {'ingame': {'start_position': Or("A", "B","C", only_one=True)}, 'environment': {'team': int, 'password': str}, 'system': {'threadloadcycle': float, 'production': bool, 'enablebenchmarking': bool}}

    def read(self, secOpt: Tuple = None) -> Union[dict, str]:
        'return config value for specified (sec,opt) tuple. If not specified, return a dict of all (sec,opt):value pairs.'
        if secOpt is not None and len(secOpt) == 2:
            sec, opt = secOpt
            if sec is None:  # query all
                pass
            elif opt is None:  # query sec
                if self.__config.has_section(sec):
                    secDict = dict()
                    for opt in self.__config.options(sec):
                        secDict[opt] = self.__config.get(
                            sec, opt)
                    return secDict
                raise Exception('configQueryError')
            else:  # query opt
                if self.__config.has_option(sec, opt):
                    return self.__config.get(sec, opt)
                raise Exception('configQueryError')
        # query all as dict
        configDict = dict()
        for secName, sec in self.__config.items():
            secDict = dict()
            for opt in sec:
                secDict[opt] = self.__config.get(
                    secName, opt)
            configDict[secName] = secDict
        return configDict

    def read_json_schema(self):
        # print(self.__schema)
        s = Schema(self.__schema, description="8015 Definitions")
        json_schema = json.dumps(s.json_schema("https://example.com/my-schema.json"))
        return json_schema

    def write(self, secOpt: Tuple[str, str], val, permanent: bool = False):
        'set config value for (sec,opt). If specify permanent, change will preserve after system restart.'
        sec, opt = secOpt
        val = str(val)
        if self.__config.has_option(sec, opt):
            __config_ = self.__config
            __config_.set(sec, opt, val)
            if Schema(self.__schema).is_valid(self.__config_): 
                self.__config.set(sec, opt, val) 
                if permanent:
                    self.__configPerm.set(sec, opt, val)
                    with open(self.__filename, 'w') as configfile:
                        self.__configPerm.write(configfile)
                return True
            else:
                raise Exception('configSchemaError')
        raise Exception('configQueryError')


config = configHandler()
