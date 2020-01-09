import asyncio
import logging
import logging.config

from system import system

if __name__ == "__main__":
    logging.config.fileConfig('logging.conf')
    logger = logging.getLogger('main')
    logger.info('system start')

    async def initiate():

        tasks = list()
        for future in [system.runHandler(), system.run()]:
            tasks.append(asyncio.create_task(future))
        for task in tasks:
            await task

    asyncio.run(initiate())

    logger.info('system shut down')
    pass
