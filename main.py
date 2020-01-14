import asyncio
import logging
import logging.config

from system import system

if __name__ == "__main__":
    logging.config.fileConfig('logging.conf')
    logger = logging.getLogger('main')
    logger.info('system start')
    loop = asyncio.get_event_loop()

    async def initiate():

        tasks = list()
        for future in [system.runHandler(), system.run()]:
            tasks.append(loop.create_task(future))
        for task in tasks:
            await task

    # asyncio.run(initiate())
    loop.run_until_complete(initiate())


    logger.info('system shut down')
    pass
