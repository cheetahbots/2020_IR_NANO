from ..default import *


class springMass(moduleDynamic):
    " m a + b v + k x = u "

    def __init__(self):
        moduleDynamic.__init__(self)
        self.state = (0, 50)
        self.lastTime = None
        self.m = 1
        self.b = 0.05
        self.k = 0.1

    def initialize(self):
        return True

    def step(self, u):
        if self.lastTime == None:
            self.lastTime = time.time()
            return
        thisTime = time.time()
        timeStep = thisTime - self.lastTime
        self.lastTime = thisTime

        x1, x = self.state
        m = self.m
        b = self.b
        k = self.k

        x1p = (u-b*x1-k*x)/m
        xp = x1

        nx1 = x1+x1p*timeStep
        nx = x + xp * timeStep

        self.state = (nx1, nx)
        return self.state

    async def work(self):
        self.log("working")

        while self.activated:
            await self.sleep(0)
            inputJSON = await self.input
            if 'u' in inputJSON:
                u = inputJSON["u"]
            else:
                u = 0
            self.step(u)
            xp, x = self.state
            print((math.trunc(100*x)/100, math.trunc(100*xp)/100))
            # num = (math.trunc(10*x)+50)//5
            # print('\n\n\n\n\n')
            # print('|'*num)
            result = {"x": x}

            self.output = result
