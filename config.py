import configparser
# 生成ConfigParser对象
__config = configparser.ConfigParser()
# 读取配置文件
__filename = 'config.ini'
__config.read(__filename, encoding='utf-8')

CONFIG = lambda sec,opt:__config.get(sec,opt)