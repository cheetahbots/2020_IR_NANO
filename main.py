import logging
import logging.config

import asyncio
from module import counter, observer

##Entry File

# 入口文件
# 读取config
# 实例化所有模块
async def testfun():
    async def shutDownTimer(sec):
        await asyncio.sleep(sec)
        b.activated=False
    a = counter()
    b = observer().addInput(a)

    task1 = asyncio.create_task(a.run())
    task2 = asyncio.create_task(b.run()) 
    task3 = asyncio.create_task(shutDownTimer(5))
    await task1
    await task2
    await task3




if __name__ == "__main__":
    logging.config.fileConfig('logging.conf') 
    logger = logging.getLogger('main')
    logger.info('system start')

    asyncio.run(testfun())
    
    logger.info('system shut down')
    pass
