## 信号优先级管理、模块占用管理

## 异常处理和稳定性
import asyncio
import logging
from setup import SETUP_MODULES

class threadManager(object):
    def __init__(self,futures,ID=0):
        self.futures = futures
        self.son = None
        self.activated = True
        self.__ID = ID
        self.__logger = logging.getLogger('main.'+self.__class__.__name__+str(self.__ID))
        
    async def run(self):
        self.son = threadManager(futures=[],ID=self.__ID+1)
        while len(self.futures)==0:
            if not self.activated: return
            self.log('no thread attached, pending')
            await asyncio.sleep(2)
        self.log('begin thread execution')
        tasks = list()
        tasks.append(self.son.run())
        for future in self.futures:
            tasks.append(asyncio.create_task(future))
        for task in tasks:
            await task

    async def available(self):
        while self.son==None:
            await asyncio.sleep(0.1)
        return True

    def log(self,msg,level = logging.INFO):
        if level is logging.INFO:
            self.__logger.info(msg)
# async def hook(futures):
#     tasks = list()
#     # for future in [a.run(),b.run(),shutDownTimer(5)]:
#     for future in futures:
#         tasks.append(asyncio.create_task(future))
#     for task in tasks:
#         await task


class system(object):
    def __init__(self,threadM,ID=0):
        self.__inst_list = SETUP_MODULES
        self.__threadM = threadM
        self.__ID = ID
        self.__logger = logging.getLogger('main.'+self.__class__.__name__+str(self.__ID))
        self.log('system initiate')

    async def run(self):
        for future in [m.run() for m in self.__inst_list]:
            await self.attachThread([future])
        self.log('attach all threads')
        await asyncio.sleep(10)
        self.shutdown()
    async def attachThread(self,futures):
        await self.__threadM.available()
        self.log('begin attach thread!')
        self.__threadM.futures = futures
        self.__threadM = self.__threadM.son
    def shutdown(self):
        self.log('system shutting down')
        self.__threadM.activated = False
        # self.__threadM.son.activated = False
        for inst in self.__inst_list:
            inst.activated = False
    
    def log(self,msg,level = logging.INFO):
        if level is logging.INFO:
            self.__logger.info(msg)
