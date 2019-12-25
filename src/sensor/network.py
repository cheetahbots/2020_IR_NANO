from ..default import *


class NetworkTable(ModuleDynamic):
    def __init__(self):
        ModuleDynamic.__init__(self)

    def initialize(self):
        return True

    async def work(self):
        while self.activated:
            await self.sleep(0.5)

            # query network table

            self.output = None


class SocketData(ModuleReactive):
    def __init__(self):
        ModuleDynamic.__init__(self)
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
