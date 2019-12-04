## 信号优先级管理、模块占用管理

## 异常处理和稳定性
import asyncio
from setup import SETUP_MODULES
class threadManager(object):
    def __init__(self,futures):
        self.futures = futures
        self.son = None
        self.activated = True
        
    async def run(self):
        self.son = threadManager([])
        while len(self.futures)==0:
            if not self.activated: return
            await asyncio.sleep(2)
        tasks = list()
        for future in self.futures:
            tasks.append(asyncio.create_task(future))
        tasks.append(self.son.run())
        for task in tasks:
            await task
# async def hook(futures):
#     tasks = list()
#     # for future in [a.run(),b.run(),shutDownTimer(5)]:
#     for future in futures:
#         tasks.append(asyncio.create_task(future))
#     for task in tasks:
#         await task


class system(object):
    def __init__(self,threadM):
        self.__inst_list = SETUP_MODULES
        self.__threadM = threadM
    async def run(self):
        self.__threadM.futures = [m.run() for m in self.__inst_list]
        self.__threadM = self.__threadM.son
        await asyncio.sleep(10)
        self.shutdown()
    def shutdown(self):
        self.__threadM.activated = False
        # self.__threadM.son.activated = False
        for inst in self.__inst_list:
            inst.activated = False
