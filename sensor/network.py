import asyncio
from module import moduleDynamic, moduleReactive

class networkTable(moduleDynamic):
    def __init__(self):
        moduleDynamic.__init__(self)

    def initialize(self):
        return True

    async def work(self):
        while self.activated:
            await asyncio.sleep(0.5)


            # query network table
            
            self.output = None
    
class socketData(moduleReactive):
    def __init__(self):
        moduleDynamic.__init__(self)
        # self.__output = None
        self.__outputData = dict()
        if not hasattr(self, 'priority'):
            self.priority = 0

    @property
    def output(self):
        return {"data": self.__outputData, "priority": self.priority}

    @output.setter
    def output(self, value):
        
        self.__outputData = value

    async def work(self):
        return self.output