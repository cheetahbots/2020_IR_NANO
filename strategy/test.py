import asyncio
from module import dynamicInput, reactiveInput, moduleDynamic, moduleReactive


class counter(moduleDynamic):
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


class observer(moduleDynamic, dynamicInput):
    def __init__(self):
        moduleDynamic.__init__(self)
        dynamicInput.__init__(self)

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


class numberGenerator(moduleReactive):
    def __init__(self):
        moduleReactive.__init__(self)
        reactiveInput.__init__(self)

    async def work(self):
        self.log("working")
        await asyncio.sleep(5)
        return {'num': 1}


class numberAdder(moduleReactive, dynamicInput):
    def __init__(self):
        moduleReactive.__init__(self)
        dynamicInput.__init__(self)

    async def work(self):
        inputJSON = await self.input
        if 'num' in inputJSON:
            num = inputJSON['num']
            return num+1
        else:
            return 0
