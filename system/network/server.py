import asyncio
import Lib.http as http
import websockets
import Lib.mimetypes as mimetypes
from src.default import *
import json

async def static_file(path, request_headers):
    if path != "/api":  # 非websocket接口，全部静态文件处理
        if path == '/':
            path = '/index.html'
        try:
            f = open('./system/network/public'+path, 'rb')
            body = bytes(f.read())
            f.close()
            return http.HTTPStatus.OK, [('content-type', mimetypes.MimeTypes().guess_type(path)[0])], body
        except:
            print(path)
            return http.HTTPStatus.NOT_FOUND, [], b'Not Found'


# async def echo(websocket, path):
#     message = await websocket.recv()
#     await websocket.send('From server ' + message)
async def receive_message(websocket, path):
    async for message in websocket:
        try:
            messageJSON = json.loads(message)
            responseJSON = json.loads('{"purpose":"null"}')
            if 'purpose' in messageJSON:
                purpose = messageJSON['purpose']
                if purpose == 'ping':
                    responseJSON["purpose"] = 'pong'
                    responseJSON["time"] = messageJSON['time']
                elif purpose == 'data':
                    del messageJSON['purpose']
                    for ins in self.DataListeners:
                        ins.output = messageJSON
                elif purpose == 'loadConfig':
                    'loadConfig'
                elif purpose == 'shutdown':
                    await self.system.shutdown()
        except:
            pass
        finally:
            await websocket.send(json.dumps(responseJSON))


class webServer(moduleDynamic):
    def __init__(self, sys):
        moduleDynamic.__init__(self)
        self.DataListeners = list()
        self.system = sys

    def attachDataListener(self, pointer):
        self.DataListeners.append(pointer)
        return self

    async def work(self):
        print('CREATE SERVER')
        start_server = websockets.serve(
            receive_message, "localhost", 80, process_request=static_file)
        await start_server
