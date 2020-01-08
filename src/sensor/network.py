from networktables import NetworkTables, NetworkTable
from ..default import *
from ..map import *
# DOC: https://pynetworktables.readthedocs.io/en/latest/api.html#networktables.NetworkTable.getBoolean
#! pip install pynetworktables


class NetworkTableHandler(ModuleDynamic):
    def __init__(self):
        ModuleDynamic.__init__(self)
        self.table_NANO_to_RIO: NetworkTable = None
        self.table_RIO_to_NANO: NetworkTable = None

    async def initialize(self):
        # cond = threading.Condition()
        # notified = [False]

        def connectionListener(connected, info):
            print(info, '; Connected=%s' % connected)
            # with cond:
            #     notified[0] = True
            #     cond.notify()

        NetworkTables.initialize(server='10.80.15.2')

        NetworkTables.addConnectionListener(
            connectionListener, immediateNotify=True)

        self.table_NANO_to_RIO = NetworkTables.getTable('NANO-TO-RIO')
        self.table_RIO_to_NANO = NetworkTables.getTable('RIO-TO-NANO')

        # self.sensorTable =

        return True

    async def work(self):
        while self.activated:
            await self.sleep(0)
            inputJSON = await self.input
            # print(inputJSON)
            mapped = CANMAP(inputJSON)
            for key in mapped: 
                appendData(key, mapped[key], self.table_NANO_to_RIO)

            

            # read RIO-TO-NANO and put into OUTPUT TODO
            result = dict()
            for key in self.table_RIO_to_NANO.getKeys():
                result[key] = self.table_RIO_to_NANO.getValue(key, None)
            # print(result)
            self.output = INPUTMAP(result)


def appendData(key, data, table: NetworkTable):
    key = str(key)
    if isinstance(data, (str)):
        table.putString(key, data)
        
    elif isinstance(data, (int, float)):
        table.putNumber(key, data)

    elif isinstance(data, (bool)):
        table.putBoolean(key, data)

    elif isinstance(data, (bytes)):
        table.putRaw(key, data)

    elif isinstance(data, (dict)):
        table.putString(key, data)

    else:
        table.putValue(key, data)
    return True