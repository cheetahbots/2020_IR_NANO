import logging
import logging.config

import asyncio
from strategy.test import counter, observer
from system import system,threadManager

##Entry File

# 入口文件
# 读取config
# 实例化所有模块


if __name__ == "__main__":
    logging.config.fileConfig('logging.conf') 
    logger = logging.getLogger('main')
    logger.info('system start')

    async def initiate():
        threadM = threadManager([])
        FRC_sys = system(threadM)

        tasks = list()
        for future in [threadM.run(),FRC_sys.run()]:
            tasks.append(asyncio.create_task(future))
        for task in tasks:
            await task

    asyncio.run(initiate())
    
    logger.info('system shut down')
    pass
