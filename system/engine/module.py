import asyncio
import math
import random

from ..config import config
from .util import Activatable


class dynamicInput():
    '订阅dynamic模块，拉取其output属性作为模块输入.'

    def __init__(self):
        self.__input = list()

    def fetchOutput(self):
        'fetch outputs from all subscribed nodes, and put into one dict. Higher priority overwrite lower ones. Return <dict>'
        return [pointer.output for pointer in self.__input]

    def addInput(self, pointer):
        'subscribe to a dynamic node whose output to be read'
        if not pointer.isDynamic:
            raise Exception(
                'input subscription must be subclass of moduleDynamic')
        self.__input.append(pointer)
        return self


class reactiveInput():
    '订阅reactive模块，向其发送异步请求以获取模块输入.'

    def __init__(self):
        self.__input = list()

    async def fetchOutput(self):
        'fetch outputs from all subscribed nodes, and put into one dict. Higher priority overwrite lower ones. Return <dict>'
        outputs = list()
        # 向每一个上级节点请求数据
        tasks = list()
        for future in [i.run() for i in self.__input]:
            tasks.append(asyncio.create_task(future))
        for task in tasks:
            outputs.append(await task)
        return outputs

    def addInput(self, pointer):
        'subscribe to a reactive node whose output to be read'
        if pointer.isDynamic:
            raise Exception(
                'input subscription must be subclass of moduleDynamic')
        self.__input.append(pointer)
        return self


class moduleInput(Activatable):
    def __init__(self):
        Activatable.__init__(self)
        self.dynamHandler = None
        self.reactHandler = None
        self.dataRequired = []

    def require(self,*args):
        self.dataRequired.extend(list(args))

    @property
    async def input(self):
        result = dict()
        outputs = await self.__fetchOutput()

        for name in self.dataRequired:
            if name not in outputs:
                if name not in outputs:
                    # raise Exception(f'fuck, required data key {name} not provided')
                    pass

        outputs.sort(key=lambda x: x['priority'])
        for output in outputs:
            data = output['data']
            for key in data:
                if key not in result:
                    result[key] = data[key]
        return result

    async def __fetchOutput(self):
        outputs = list()
        if self.dynamHandler != None:
            outputs.extend(self.dynamHandler.fetchOutput())
        if self.reactHandler != None:
            outputs.extend(await self.reactHandler.fetchOutput())
        return outputs

    def addInput(self, module):
        '根据连接的模块自动惰性加载DynamicInput或ReactiveInput'
        if not hasattr(module, 'isDynamic'):
            raise Exception('input subscription must be a module')
        else:
            if module.isDynamic:
                self.__addDynamInput(module)
            else:
                self.__addReactInput(module)
        return self

    def __addDynamInput(self, pointer):
        if self.dynamHandler is None:
            self.dynamHandler = dynamicInput()
        self.dynamHandler.addInput(pointer)

    def __addReactInput(self, pointer):
        if self.reactHandler is None:
            self.reactHandler = reactiveInput()
        self.reactHandler.addInput(pointer)


class moduleOutput():
    '在模块上建立output属性供其他模块读取.'

    def __init__(self):
        self.__outputData = dict()
        if not hasattr(self, 'priority'):
            self.priority = 0

    @property
    def output(self):
        return {"data": self.__outputData, "priority": self.priority}

    @output.setter
    def output(self, value):
        self.__outputData = value


class Module(moduleInput):
    '所有模块的基类.'

    def __init__(self):
        moduleInput.__init__(self)
        self.priority = 0
        self.log('instance created')

    async def run(self):
        raise NotImplementedError

    # def addInput(self,item):
    #     moduleInput.__init__(self)
    #     self.addInput(moduleInput)

    async def initialize(self):
        return True

    async def work(self):
        raise NotImplementedError

    async def sleep(self, t):
        await asyncio.sleep(t)


class ModuleDynamic(Module, moduleOutput):
    'dynamic模块中的worker方法是单独的线程，循环执行以更新output.'

    def __init__(self):
        Module.__init__(self)
        moduleOutput.__init__(self)

    async def run(self) -> 'Running Thread':
        try:
            self.log('initialize...')
            await self.initialize()
            self.log('initialize success')
            self.activated = True

        except:
            self.log('initialize fail')
            self.activated = False

        if self.activated:
            self.log('work...')
            await self.work()
            self.log('stop work')

    @property
    def isDynamic(self):
        return True


class ModuleReactive(Module):
    'reactive模块中的worker方法返回异步结果.'

    def __init__(self):
        Module.__init__(self)

    async def run(self) -> 'Running Thread':
        if not self.activated:
            try:
                self.log('initialize...')
                await self.initialize()
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
