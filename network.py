import asyncio
import copy
import json
import random

import websockets

from module import moduleDynamic, moduleReactive


class socketConnection(moduleDynamic):
    def __init__(self,sys):
        moduleDynamic.__init__(self)
        self.DataListeners = list()
        self.system = sys
    def attachDataListener(self,pointer):
        self.DataListeners.append(pointer)
        return self
        
    async def work(self):
        async def echo(websocket, path):
            async for message in websocket:
                try:
                    messageJSON = json.loads(message)
                    if 'purpose' in messageJSON:
                        purpose = messageJSON['purpose']
                        if purpose=='data':
                            del messageJSON['purpose']
                            for ins in self.DataListeners:
                                ins.output = messageJSON
                        elif purpose=='loadConfig':
                            'loadConfig'
                        elif purpose=='shutdown':
                            await self.system.shutdown()                                
                except:
                    pass
                finally:
                    # print(message)
                    # await websocket.send('fuck no!')
                    await websocket.send(message)
        start_server = websockets.serve(echo, "localhost", 8765)
        await start_server


        # asyncio.get_event_loop().run_forever()
