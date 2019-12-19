import asyncio
import logging
import logging.config

from system.engine.system import system, threadManager
from system.network.server import web_server

if __name__ == "__main__":
    logging.config.fileConfig('logging.conf')
    logger = logging.getLogger('main')
    logger.info('system start')

    async def initiate():
        threadM = threadManager([])
        FRC_sys = system(threadM)

        tasks = list()
        for future in [threadM.run(), FRC_sys.run()]:
            tasks.append(asyncio.create_task(future))
        for task in tasks:
            await task

    asyncio.get_event_loop().run_until_complete(web_server)
    asyncio.get_event_loop().run_forever()
    asyncio.run(initiate())

    logger.info('system shut down')
    pass
