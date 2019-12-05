import asyncio
from util import activiable
import random
import math
from config import CONFIG

# logger = logging.getLogger('main.module')
# mm = lambda obj,x:logger.info(message(x).setSenderInfo(obj.__class__.__name__,obj.ID).say())
# 基类定义


def conf(opt): return CONFIG('module', opt)


class module(activiable):
    '所有模块的基类.'

    def __init__(self):
        activiable.__init__(self)
        self.priority = 0
        self.log('instance created')
        # self.isDynamic = False

    def run(self):
        raise NotImplementedError

    def initialize(self):
        return True

    def work(self):
        raise NotImplementedError


class dynamicInput(object):
    '订阅dynamic模块，拉取其output属性作为模块输入.'

    def __init__(self):
        self.__input = list()

    @property
    async def input(self):
        'fetch outputs from all subscribed nodes, and put into one dict. Higher priority overwrite lower ones. Return <dict>'
        result = dict()

        for pointer in self.__input:
            data = pointer.output['data']
            for key in data:
                if key not in result:
                    result[key] = data[key]

        return result

    def addInput(self, pointer):
        'subscribe to a dynamic node whose output to be read'
        if not pointer.isDynamic:
            raise Exception(
                'input subscription must be subclass of moduleDynamic')
        self.__input.append(pointer)
        self.__input.sort(key=lambda x: x.output['priority'])
        return self


class reactiveInput(object):
    '订阅reactive模块，向其发送异步请求以获取模块输入.'

    def __init__(self):
        self.__input = list()

    @property
    async def input(self):
        'fetch outputs from all subscribed nodes, and put into one dict. Higher priority overwrite lower ones. Return <dict>'
        result = dict()
        tasks = list()
        datas = list()
        # 向每一个上级节点请求数据
        for future in [i.run() for i in self.__input]:
            tasks.append(asyncio.create_task(future))
        for task in tasks:
            datas.append(await task)
        # 整理所有数据
        datas.sort(key=lambda x: x['priority'])
        for data in [d['data'] for d in datas]:
            for key in data:
                if key not in result:
                    result[key] = data[key]
        return result

    def addInput(self, pointer):
        'subscribe to a reactive node whose output to be read'
        # TODO 类型检查
        self.__input.append(pointer)
        return self


class moduleOutput(object):
    '在模块上建立output属性供其他模块读取.'

    def __init__(self):
        self.__output_data = dict()
        if not hasattr(self, 'priority'):
            self.priority = 0

    @property
    def output(self):
        return {"data": self.__output_data, "priority": self.priority}

    @output.setter
    def output(self, value):
        self.__output_data = value


class moduleDynamic(module, moduleOutput):
    'dynamic模块中的worker方法是单独的线程，循环执行以更新output.'
    # dynamic模块必须有output，input可以是任何类别，甚至可以不挂载input。

    def __init__(self):
        module.__init__(self)
        moduleOutput.__init__(self)
        # self.isDynamic = True

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

    @property
    def isDynamic(self):
        return True


class moduleReactive(module):
    'reactive模块中的worker方法返回异步结果.'
    # reactive模块不需要output，input也可以是任何类别，甚至可以不挂载input。

    def __init__(self):
        module.__init__(self)

    async def run(self):
        if not self.activated:
            try:
                self.initialize()
                self.log('initialize success')
                self.activated = True

            except:
                self.log('initialize fail')
                self.activated = False

        if self.activated:
            result = await self.work()
            output = {'data': result, 'priority': self.priority}
            return output

    @property
    def isDynamic(self):
        return False
