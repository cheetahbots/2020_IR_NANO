import asyncio
from module import dynamicInput, reactiveInput, moduleDynamic, moduleReactive,dynamicInput

class networkTable(moduleDynamic):
    def __init__(self):
        moduleDynamic.__init__(self)
        dynamicInput.__init__(self)

    def initialize(self):
        return True

    async def work(self):
        while self.activated:
            await asyncio.sleep(0.5)


            # query network table
            
            self.output = None
    
class socketConnection(moduleDynamic):
    def __init__(self):
        moduleDynamic.__init__(self)
        dynamicInput.__init__(self)

    def initialize(self):
        # Build WebSocket Connection
        return True

    async def work(self):
        while self.activated:
            await asyncio.sleep(0.5)

            # scan for incoming data
            
            self.output = None