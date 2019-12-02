import time
import asyncio
## 基类定义
class moduleInput:
    def __init__(self,inputs = []):
        self.lib = {}
        for name,pointer in inputs:
            self.lib[name] = pointer
    def addItem(self,key,pointer):
        self.lib[key]=pointer
    def get(self):
        return self.lib
        
        

class module(object):
    def __init__(self):
        self.priority = 0
        self.input = moduleInput()
        self.output = {}
        self.activated = False
        print('initialize module')
    
    async def run(self):
        print('start run')
        try:
            self.initialize()
            self.activated = True
            print('initialized, OK')
            
        except:
            self.activated = False
            print('initialize fail')

        finally:
            if self.activated:
                await self.work()

    def initialize(self):
        raise NotImplementedError
    def work(self):
        raise NotImplementedError
    def repair(self):
        raise NotImplementedError

class counter(module):
    def __init__(self):
        module.__init__(self)
        pass
    def initialize(self):
        return True
    async def work(self):
        print("working")
        inputJSON = self.input.get()

        num = inputJSON["num"]

        while self.activated:
            await asyncio.sleep(0.5)
            num +=1
            result={"num":num}
            self.output = result
            if num>10:
                self.activated=False



async def main():

    a = counter()
    a.input.addItem('num',0)

    async def component_thread():
        print('thread1 start')
        await a.run()

    async def observer():
        print('observer start')
        while True:
            print(a.output)
            await asyncio.sleep(0.5)

    component_thread = asyncio.create_task(
        component_thread())
    observer_thread = asyncio.create_task(
        observer())

    await component_thread
    await observer_thread
    
asyncio.run(main())


        

## control子类定义
class control(module):
    def __init__(self):
        pass

## strategy子类定义
class strategy(module):
    def __init__(self):
        pass

## hardware子类定义
class hardware(module):
    def __init__(self):
        pass

# I/O组件

## sensor

## controller / joystick

## output