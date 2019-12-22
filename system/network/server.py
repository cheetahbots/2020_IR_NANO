import asyncio
import json

import websockets

import Lib.http as http
import Lib.mimetypes as mimetypes


from ..engine.module import moduleDynamic
from ..config import config


def response(purpose=None, content={}, id=None, **kwargs):
    content.update(kwargs)
    return json.dumps({'purpose': purpose, 'content': content, 'id': id})


async def staticFile(path, request_headers):
    'process HTTP requests'
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

class webServer(moduleDynamic):
    'host web dashboard and process HTTP/websocket requests'

    def __init__(self, sys):
        moduleDynamic.__init__(self)
        self.DataListeners = list()
        self.system = sys

    async def initialize(self):
        print('CREATE SERVER')
        start_server = websockets.serve(
            self.handler, "localhost", 80, process_request=staticFile)
        await start_server

    def attachDataListener(self, pointer):
        self.DataListeners.append(pointer)
        return self

    async def consumer_handler(self, websocket, path):
        # print(websocket.request_header)
        'process websocket requests'
        async for message in websocket:
            try:
                messageJSON = json.loads(message)
                assert 'purpose' in messageJSON and 'content' in messageJSON and 'time' in messageJSON and 'id' in messageJSON
                purpose = messageJSON['purpose']
                id_ = messageJSON['id']
                time = messageJSON['time']
                content = messageJSON['content']

                if purpose == 'ping':
                    # content:{time}
                    await asyncio.sleep(0)
                    responseJSON = response(purpose='response', id=id_)

                elif purpose == 'data':
                    # content:{<key>:<val>,...}
                    for ins in self.DataListeners:
                        ins.output = content
                    responseJSON = response(purpose='response', id=id_)

                elif purpose == 'loadConfig':
                    # content:{?keys:[(<sec>,<opt>),...]}
                    if 'keys' in content:
                        configDict = dict()
                        for secOpt in content['keys']:
                            assert len(secOpt) == 2
                            sec, opt = secOpt
                            configDict[(sec, opt)] = config.read((sec, opt))
                    else:
                        configDict = config.read()
                    responseJSON = response(
                        purpose='response', id=id_, content=configDict)

                elif purpose == 'writeConfigTemp':
                    # content:{(<sec>,<opt>):<val>,...}
                    for secOpt in content:
                        assert len(secOpt) == 2
                        config.write(secOpt, content[secOpt])
                    responseJSON = response(
                        purpose='response', id=id_, state='success')

                elif purpose == 'writeConfigPerm':
                    # content:{(<sec>,<opt>):<val>,...}
                    for secOpt in content:
                        assert len(secOpt) == 2
                        config.write(secOpt, content[secOpt], permanent=True)
                    responseJSON = response(
                        purpose='response', id=id_, state='success')

                elif purpose == 'shutdown':
                    responseJSON = response(
                        purpose='response', id=id_, state='success')
                    await websocket.send(responseJSON)
                    await self.system.shutdown()

                print(responseJSON)
                await websocket.send(responseJSON)

            except AssertionError:
                self.log('request structure invalid. ignore.')
            except json.JSONDecodeError:
                self.log('JSON format invalid. ignore.')
            except Exception as e:
                self.log('unexpected: ' + e.__class__.__name__)
            finally:
                pass

    async def producer_handler(self, websocket, path):
        # 此处应当使用dist() 建立需要发送字典
        # 如果purpose相同则覆盖
        # websocket 发送
        # while True:
        message = 'TEST'
        await websocket.send(message)

    async def handler(self, websocket, path):
        handlers = list()
        for future in [self.consumer_handler(websocket, path), self.producer_handler(websocket, path)]:
            handlers.append(asyncio.create_task(future))
        for handler in handlers:
            await handler

    async def work(self):
        pass
