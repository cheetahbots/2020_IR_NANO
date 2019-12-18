import configparser
# 生成ConfigParser对象
__config = configparser.ConfigParser()
# 读取配置文件
__filename = 'system.conf'
__config.read(__filename, encoding='utf-8')


def CONFIG(sec, opt): return __config.get(sec, opt)
