import asyncio
from setup import SETUP_MODULES
from util import activatable, loggable
from config import CONFIG


def conf(opt): return CONFIG('system', opt)


class threadManager(activatable):
    'initiate a thread without blocking system thread.'

    def __init__(self, futures):
        activatable.__init__(self)
        self.activated = True
        
        self.futures = futures
        self.son = None
        self.occupied = False

    async def run(self):
        while len(self.futures) == 0:
            if not self.activated:
                return
            self.log('no thread attached, pending')
            await asyncio.sleep(int(conf('threadLoadCycle')))
        self.son = threadManager(futures=[])
        self.occupied = True
        self.log('begin thread execution')
        tasks = list()
        tasks.append(self.son.run())
        for future in self.futures:
            tasks.append(asyncio.create_task(future))
        for task in tasks:
            await task

    async def available(self):
        while self.son == None:
            if not self.occupied:
                return self
            await asyncio.sleep(0.1)
        return self.son


class system(loggable):
    '主控线程'

    def __init__(self, threadM, ID=0):
        loggable.__init__(self)
        self.__threadM = threadM
        self.__outputHooker = None
        self.__inst_list = SETUP_MODULES(self)
        self.__recur_inst_list = [
            ins for ins in self.__inst_list if ins.isDynamic]
        self.__statc_inst_list = [
            ins for ins in self.__inst_list if not ins.isDynamic]
        self.log('system initiate')

    async def run(self):
        self.log('start dynamic modules')
        await self.attachThread([m.run() for m in self.__recur_inst_list])
        self.log('start reactive modules')
        if not self.__outputHooker == None:
            # print(await self.__outputHooker.run())
            for _ in range(20):
                await asyncio.sleep(0.5)
                print(await self.__outputHooker.run())

        await self.shutdown()

    async def attachThread(self, futures):
        self.__threadM = await self.__threadM.available()
        self.log('begin attach thread!')
        self.__threadM.futures = futures

    async def shutdown(self):
        self.__threadM = await self.__threadM.available()
        self.log('system shutting down')
        self.__threadM.activated = False
        # self.__threadM.son.activated = False
        for inst in self.__inst_list:
            inst.activated = False

    def addInput(self, obj):
        self.__outputHooker = obj
