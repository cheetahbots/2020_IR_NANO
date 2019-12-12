import asyncio
from module import dynamicInput, reactiveInput, moduleDynamic, moduleReactive

class encoderAngularPos(moduleDynamic):
    def __init__(self):
        moduleDynamic.__init__(self)
        dynamicInput.__init__(self)

    def initialize(self):
        return True

    async def work(self):
        self.log("working")
        num = 0
        while self.activated:
            await asyncio.sleep(0.5)
            num += 1
            # if num > 10:
            #     self.activated = False
            result = {"num": num}
            self.output = result