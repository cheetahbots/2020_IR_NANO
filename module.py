import asyncio
import logging
import random,math
from config import CONFIG

# logger = logging.getLogger('main.module')
# mm = lambda obj,x:logger.info(message(x).setSenderInfo(obj.__class__.__name__,obj.ID).say())
# 基类定义
conf = lambda opt:CONFIG('module',opt)
class module(object):
    'definition of modules'
    def __init__(self):
        self.priority = 0
        self.__activated = False
        self.__input = list()
        self.__output_data = dict()
        self.__ID = str(random.random())[-int(conf('module_id_length'))-1:-1]
        self.__logger = logging.getLogger('module.'+self.__class__.__name__+self.__ID)
        # logger = logging.getLogger('')
        self.log('instance created')

    @property
    def input(self):
        'fetch outputs from all subscribed nodes, and put into one dict. Higher priority overwrite lower ones. Return <list>'
        result = dict()
        
        for pointer in self.__input:
            data=pointer.output['data']
            for key in data:
                if key not in result:
                    result[key]=data[key]
 
        return result

    @input.setter
    def input(self, value):
        self.__input = value

    def addInput(self, pointer):
        'subscribe to a node whose output to be read'
        self.__input.append(pointer)
        self.__input.sort(key=lambda x:x.output['priority'])
        return self

    @property
    def output(self):
        return {"data":self.__output_data,"priority":self.priority}

    @output.setter
    def output(self, value):
        self.__output_data = value

    @property
    def activated(self):
        return self.__activated
    @activated.setter
    def activated(self,val):
        self.__activated = val
        if self.activated:
            self.log('module activated')
        else:
            self.log('module deactivated')

    async def run(self):
        try:
            self.initialize()
            self.log('initialize success')
            self.activated = True

        except:
            self.log('initialize fail')
            self.activated = False

        finally:
            if self.activated:
                await self.work()

    def initialize(self):
        raise NotImplementedError

    def work(self):
        raise NotImplementedError

    def repair(self):
        raise NotImplementedError

    def log(self,msg,level = logging.INFO):
        if level is logging.INFO:
            self.__logger.info(msg)


# control子类定义
class control(module):
    def __init__(self):
        pass

# strategy子类定义


class strategy(module):
    def __init__(self):
        pass

# hardware子类定义


class hardware(module):
    def __init__(self):
        pass

# I/O组件

# sensor

## controller / joystick

# output
