from ..default import *
from ..map.signalTypes import MOTOR_VOL, AXIS
from ..map.items import MOTORS


class axisControl(ModuleDynamic):
    """Generate control signal from joystick axis input
    """

    def __init__(self, *attachModules):
        ModuleDynamic.__init__(self, *attachModules)
        self.setInputType(AXIS, AXIS)

    async def initialize(self):
        return True

    async def work(self):
        self.log("working")

        while self.activated:
            await self.sleep(0)
            A1, A2 = await self.input
            result = dict()

            print(result)
            if A1 is not None:
                result[MOTORS.left] = A1
                self.output = result


class Counter(ModuleDynamic):
    def __init__(self):
        ModuleDynamic.__init__(self)

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


class Observer(ModuleDynamic):
    def __init__(self):
        ModuleDynamic.__init__(self)

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


class numberGenerator(ModuleReactive):
    def __init__(self):
        ModuleReactive.__init__(self)

    async def work(self):
        self.log("working")
        await self.sleep(5)
        return {'num': 1}


class numberAdder(ModuleReactive):
    def __init__(self, *args):
        ModuleReactive.__init__(self, args)

    async def work(self):
        inputJSON = await self.input
        if 'num' in inputJSON:
            num = inputJSON['num']
            return num+1
        else:
            return 0
