import asyncio
import json

import websockets

import Lib.http as http
import Lib.mimetypes as mimetypes


from ..engine.module import moduleDynamic


def response(purpose=None, content={}, id=None, **kwargs):
    content.update(kwargs)
    return json.dumps({'purpose': purpose, 'content': content, 'id': id})


async def staticFile(path, request_headers):
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


class webServer(moduleDynamic):
    def __init__(self, sys):
        moduleDynamic.__init__(self)
        self.DataListeners = list()
        self.system = sys

    async def initialize(self):
        print('CREATE SERVER')
        start_server = websockets.serve(
            self.receiveMessage, "localhost", 80, process_request=staticFile)
        await start_server

    def attachDataListener(self, pointer):
        self.DataListeners.append(pointer)
        return self

    async def receiveMessage(self, websocket, path):
        async for message in websocket:
            try:
                messageJSON = json.loads(message)
                assert 'purpose' in messageJSON and 'content' in messageJSON and 'id' in messageJSON
                purpose = messageJSON['purpose']
                id_ = messageJSON['id']
                content = messageJSON['content']

                if purpose == 'ping':
                    responseJSON = response(purpose='response', id=id_)

                elif purpose == 'data':
                    for ins in self.DataListeners:
                        ins.output = content
                    responseJSON = response(purpose='response', id=id_)

                elif purpose == 'loadConfig':
                    'loadConfig'

                elif purpose == 'shutdown':
                    await self.system.shutdown()

                await websocket.send(responseJSON)

            except AssertionError:
                self.log('request structure invalid. ignore.')
            except json.JSONDecodeError:
                self.log('JSON format invalid. ignore.')
            except Exception as e:
                self.log('unexpected: ' + e.__class__.__name__)
            finally:
                pass

    async def work(self):
        pass
