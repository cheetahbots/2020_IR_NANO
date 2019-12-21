from src.default import *


class counter(moduleDynamic):
    def __init__(self):
        moduleDynamic.__init__(self)

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


class observer(moduleDynamic):
    def __init__(self):
        moduleDynamic.__init__(self)

    async def work(self):
        self.log("working")

        while self.activated:
            await self.sleep(1)
            inputJSON = await self.input
            print(inputJSON)
            if 'num' in inputJSON:
                num = inputJSON["num"]
                # num += 1
                result = {"num": num}
                self.output = result
                print(self.output)
            elif 'x' in inputJSON:
                x = inputJSON["x"]
                # num += 1
                result = {"x": x}
                self.output = result
                print(self.output)
            else:
                self.output = None
            # if num > 10:
            #     self.activated = False


class numberGenerator(moduleReactive):
    def __init__(self):
        moduleReactive.__init__(self)

    async def work(self):
        self.log("working")
        await self.sleep(5)
        return {'num': 1}


class numberAdder(moduleReactive):
    def __init__(self):
        moduleReactive.__init__(self)

    async def work(self):
        inputJSON = await self.input
        if 'num' in inputJSON:
            num = inputJSON['num']
            return num+1
        else:
            return 0
