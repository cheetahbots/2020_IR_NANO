from ..default import *


class encoderAngularPos(moduleDynamic):
    def __init__(self):
        moduleDynamic.__init__(self)

    def initialize(self):
        return True

    async def work(self):
        self.log("working")
        num = 0
        while self.activated:
            await self.sleep(0.5)
            num += 1
            # if num > 10:
            #     self.activated = False
            result = {"num": num}
            self.output = result
