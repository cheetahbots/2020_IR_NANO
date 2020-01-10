__all__ = ['system']

import asyncio
from typing import Awaitable, List, Optional

import src

from system import config
from .engine import Activatable, Loggable
from .network import WebServer


def conf(opt): return config.read(('system', opt))


class ThreadHandler(Activatable):
    'initiate a thread without blocking system thread.'

    def __init__(self, futures: List[Awaitable] = list()):
        Activatable.__init__(self)
        self.activated = True

        self.futures = futures
        self.son = None
        self.occupied = False

    async def run(self):
        self.log('no thread attached, pending')
        while len(self.futures) == 0:
            if not self.activated:
                return
            await asyncio.sleep(float(conf('threadLoadCycle')))
        self.son = ThreadHandler(futures=[])
        self.occupied = True
        self.log('begin thread execution')
        tasks = list()
        tasks.append(self.son.run())
        for future in self.futures:
            tasks.append(asyncio.create_task(future))
        for task in tasks:
            await task

    async def available(self):
        while self.son is None:
            if not self.occupied:
                return self
            await asyncio.sleep(0.1)
        return self.son


class System(Loggable):
    '主控线程'

    def __init__(self, thread_handler: ThreadHandler):
        Loggable.__init__(self)
        self.__thread_handler = thread_handler
        self.__outputHooker = None
        # Init Modules
        self.__modules = src.loadedModules
        self.__modules_dynam = [
            ins for ins in self.__modules if ins.isDynamic]
        self.__modules_react = [
            ins for ins in self.__modules if not ins.isDynamic]
        self.log('system initiate')
        # Init Network
        # self.__socketHandler = socketConnection(self)
        # for ins in self.__inst_list:
        #     if ins.__class__.__name__ == "socketData":
        #         self.__socketHandler.attachDataListener(ins)
        # self.__recur_inst_list.append(self.__socketHandler)
        self.__socketHandler = WebServer(self)
        for ins in self.__modules:
            if ins.__class__.__name__ == "socketData":
                self.__socketHandler.attachDataListener(ins)
        self.__modules_dynam.append(self.__socketHandler)

    async def runHandler(self):
        await self.__thread_handler.run()

    async def run(self):
        self.log('start dynamic modules')
        await self.attachThread([m.run() for m in self.__modules_dynam])

    async def attachThread(self, futures):
        self.__thread_handler = await self.__thread_handler.available()
        self.log('begin attach thread!')
        self.__thread_handler.futures = futures

    async def shutdown(self):
        self.__thread_handler = await self.__thread_handler.available()
        self.log('system shutting down')
        self.__thread_handler.activated = False
        # self.__threadM.son.activated = False
        for inst in self.__modules:
            inst.activated = False

    def addInput(self, module):
        self.__outputHooker = module


system = System(ThreadHandler())
