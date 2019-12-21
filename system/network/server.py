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


# async def echo(websocket, path):
#     message = await websocket.recv()
#     await websocket.send('From server ' + message)


class webServer(moduleDynamic):
    'host web dashboard and process HTTP/websocket requests'

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

    async def work(self):
        pass
