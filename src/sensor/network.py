# DOC: https://pynetworktables.readthedocs.io/en/latest/api.html#networktables.NetworkTable.getBoolean
#! pip install pynetworktables
from ..default import *
from networktables import NetworkTables
import threading

class NetworkTable(ModuleDynamic):
    def __init__(self):
        ModuleDynamic.__init__(self)
        self.table = None

    def initialize(self):
        cond = threading.Condition()
        notified = [False]


        def connectionListener(connected, info):
            print(info, '; Connected=%s' % connected)
            with cond:
                notified[0] = True
                cond.notify()


        NetworkTables.initialize(server='10.80.15.2')
        NetworkTables.addConnectionListener(connectionListener, immediateNotify=True)

        with cond:
            print("Waiting")
            if not notified[0]:
                cond.wait()

        print("Connected!")
        self.table = NetworkTables.getTable('datatable')
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
