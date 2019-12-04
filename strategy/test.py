import asyncio
from module import module
class counter(module):
    def __init__(self):
        module.__init__(self)

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

class observer(module):
    def __init__(self):
        module.__init__(self)

    def initialize(self):
        return True

    async def work(self):
        self.log("working")

        while self.activated:
            await asyncio.sleep(0.5)
            inputJSON = self.input
            num = inputJSON["num"]
            # num += 1
            result = {"num": num}
            self.output = result
            print(self.output)
            # if num > 10:
            #     self.activated = False