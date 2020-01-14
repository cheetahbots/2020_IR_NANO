import asyncio
import math
import random

from system import config
from . import Activatable


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
        loop = asyncio.get_event_loop()
        for future in [i.run() for i in self.__input]:
            tasks.append(loop.create_task(future))
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
        self.__typeInput = []

    def signalIN(self, *signals):
        "指定该模组监听的信号ID."
        if len(self.__typeInput):  # 需要match pattern
            if len(signals) <= len(self.__typeInput):  # require没传太多
                for i in range(len(signals)):
                    sig = signals[i]
                    if sig._type == self.__typeInput[i]._type:
                        self.dataRequired.append(sig)
                    else:
                        raise Exception("Types do not match")
                for i in range(len(signals), len(self.__typeInput)):
                    if sig._type == self.__typeInput[i]._type:
                        self.dataRequired.append(sig)
                    else:
                        raise Exception("Types do not match")
            else:
                raise Exception("too many requires given")
        else:
            self.dataRequired.extend(signals)
        return self

    I = signalIN

    def setInputType(self, *args):
        self.__typeInput.extend(args)
        return self

    @property
    async def input(self):
        outputs = await self.__fetchOutput()

        outputs.sort(key=lambda x: x['priority'])
        if len(self.dataRequired):
            result = list()
            for req in self.dataRequired:
                for output in outputs:
                    data = output['data']
                    if req in data:
                        result.append(data[req])
                        break
                # raise Exception(f'required data {req} not found.')
                result.append(None)
            return tuple(result)
        else:
            result = dict()
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

    A = addInput

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
        # self.__typeOutput = []
        if not hasattr(self, 'priority'):
            self.priority = 0

    # def signalOUT(self, *signals):
    #     "指定该模组输出信号的ID."
    #     if len(self.__typeInput):  # 需要match pattern
    #         if len(signals) <= len(self.__typeInput):  # require没传太多
    #             for i in range(len(signals)):
    #                 sig = signals[i]
    #                 if sig._type == self.__typeInput[i]._type:
    #                     self.dataRequired.append(sig)
    #                 else:
    #                     raise Exception("Types do not match")
    #             for i in range(len(signals), len(self.__typeInput)):
    #                 if sig._type == self.__typeInput[i]._type:
    #                     self.dataRequired.append(sig)
    #                 else:
    #                     raise Exception("Types do not match")
    #         else:
    #             raise Exception("too many requires given")
    #     self.dataRequired.extend(signals)
    #     return self

    # I = signalOUT

    # def setOutputPattern(self, *args):
    #     self.__typeOutput.extend(args)
    #     return self

    @property
    def output(self):
        return {"data": self.__outputData, "priority": self.priority}

    @output.setter
    def output(self, value):
        self.__outputData = value


class Module(moduleInput):
    '所有模块的基类.'

    def __init__(self, *args):
        moduleInput.__init__(self)
        [self.addInput(M) for M in args]
        self.priority = 0
        self.log('instance created')
        self.isModule = True

    def setPriority(self, num):
        if isinstance(num, (int, float)):
            self.priority = num
            return self
        else:
            raise Exception(
                f'invalid priority val {num} with type {num.__class__.__name__}')

    P = setPriority

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

    def __init__(self, *args):
        Module.__init__(self, *args)
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

    def __init__(self, *args):
        Module.__init__(self, args)

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
