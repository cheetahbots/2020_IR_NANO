from src.default import *


class PID(moduleReactive):
    def __init__(self):
        moduleReactive.__init__(self)
        self.__lastVal = 0
        self.__lastTime = time.time
        self.__config = {
            'KP': 1,
            'KI': 1,
            'KD': 1,
            'key': 'testSignal',
            'ref': 0
        }
        self.__I = 0

    async def work(self):
        self.log("working")
        inputJSON = await self.input
        ctrlKey = self.__config['key']
        if ctrlKey not in inputJSON:
            raise Exception(f'ctrl key is {ctrlKey} but signal not found')
        else:

            newVal = inputJSON[ctrlKey]
            err = self.__config['ref']-newVal

            timeStep = time.time-self.__lastTime
            self.__I += timeStep * err
            self.__lastTime = time.time

            errPri = (err - self.__lastVal)/timeStep
            self.__lastVal = err

            result = 0
            result += float(self.__config['P'])*(err)
            result += float(self.__config['I'])*(self.__I)
            result += float(self.__config['D'])*(errPri)

        return result
