import asyncio
import json
import time as t
from typing import Optional, Union
import Lib.re as re
import Lib.configparser as cookieparser

import websockets

import Lib.http as http
import Lib.mimetypes as mimetypes

from ..config import config
from ..engine.module import ModuleDynamic
from ..engine.util import Loggable


async def process_request(path: str, request_headers):
    'process HTTP requests'
    def Authorize():
        cookies = cookieparser.ConfigParser()
        try:
            cookies.read_string('[cookie]\n' + request_headers['Cookie'].replace('; ', '\n'))
            if cookies['cookie']['FedAuth'] == 'CJSNB':
                return True
            else:
                return False
        except:
            return False
    
    if Authorize():
        # 认证有权限
        if path == "/api/ws": # websocket 接口
            return None
        elif (re.search("/api/.*", path)):
            ### API CURD 接口处###
            return http.HTTPStatus.OK, [('content-type', mimetypes.MimeTypes().guess_type(path)[0])], b'api/pool'
        elif path == '/':
            # 根目录手动重写
            path = '/index.html'
        elif path =='/dev':
            #  dev 文件手动重写
            path = '/dev.html'
    else:
        if path == '/' or path == '/dev' or re.search("/api/.*", path):
            # 认证无权限 => 验证页面
            f = open('./system/network/public/authorize.html', 'rb')
            body = bytes(f.read())
            f.close()
            return http.HTTPStatus.UNAUTHORIZED, [('content-type', 'text/html')], body
    if path == '/team' :
        ### team id  来自 config ###
        return http.HTTPStatus.OK, [], b'9118'
    try:
        # 尝试打开文件，HTTP serve 200
        f = open('./system/network/public'+path, 'rb')
        body = bytes(f.read())
        f.close()
        return http.HTTPStatus.OK, [('content-type', mimetypes.MimeTypes().guess_type(path)[0])], body
    except:
        # 尝试打开文件失败，HTTP serve 404
        f = open('./system/network/public/error/404.html', 'rb')
        body = bytes(f.read())
        f.close()
        return http.HTTPStatus.NOT_FOUND, [('content-type', 'text/html')], body


class RequestPool(Loggable):
    def __init__(self):
        Loggable.__init__(self)
        self.__pool = list()

    @property
    def maxWait(self):
        'load from config max wait time in ms'
        return 1000

    def push(self, request: dict) -> None:

        assert 'purpose' in request
        assert 'content' in request
        assert 'time' in request
        assert 'id' in request

        self.__pool.append(request)

    def check(self):
        err = False
        for req in self.__pool:
            time = req['time']

            if t.time() * 1000 - time > self.maxWait:
                del self.__pool[self.__pool.index(req)]
                err = True
        if err:
            raise Exception('shit, timeout')
        else:
            return True

    def fetch(self, id_):
        for req in self.__pool:
            id__ = req['id']
            if id__ == id_:
                del self.__pool[self.__pool.index(req)]
                return req
        raise Exception('UnexpectedResponse')


class WebServer(ModuleDynamic):
    'host web dashboard and process HTTP/websocket requests'

    def __init__(self, sys):
        ModuleDynamic.__init__(self)
        self.DataListeners = list()
        self.system = sys
        self.__pool = RequestPool()

    async def initialize(self):
        print('CREATE SERVER')
        start_server = websockets.serve(
            self.handler, "localhost", 8765, process_request=process_request)
        await start_server

    def attachDataListener(self, module):
        self.DataListeners.append(module)
        return self

    def request(self, purpose: str, content: dict = dict(), id: Union[int, float, str] = None, res: bool = True, time=t.time(), **kwargs):
        content.update(kwargs)
        req = {'purpose': purpose, 'content': content, 'id': id, 'time': time}
        if res:
            self.__pool.push(req)
        return json.dumps(req)

    def response(self, purpose='response', content: dict = dict(), id: Union[int, float, str] = None, res: bool = False, **kwargs):
        return self.request(purpose, content, id, res, **kwargs)

    async def consumer_handler(self, websocket, path):
        'process websocket requests'
        async for message in websocket:
            try:
                messageJSON = json.loads(message)
                assert 'purpose' in messageJSON
                assert 'content' in messageJSON
                assert 'time' in messageJSON
                assert 'id' in messageJSON
                purpose = messageJSON['purpose']
                id_ = messageJSON['id']
                time = messageJSON['time']
                content = messageJSON['content']

                if purpose == 'response':
                    request = json.loads(self.__pool.fetch(id_))
                    assert 'purpose' in request
                    assert 'content' in request
                    assert 'time' in request
                    assert 'id' in request
                    reqPurpose = request['purpose']
                    # ID is the same.
                    reqTime = request['time']
                    reqContent = request['content']

                    if reqPurpose == 'TEST':
                        print('hia hia hia!')

                elif purpose == 'ping':
                    # content:{time}
                    responseJSON = self.response(id=id_)

                elif purpose == 'data':
                    # content:{<key>:<val>,...}
                    for ins in self.DataListeners:
                        ins.output = content
                    responseJSON = self.response(id=id_)

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
                    responseJSON = self.response(
                        id=id_, content=configDict)

                elif purpose == 'writeConfigTemp':
                    # content:{(<sec>,<opt>):<val>,...}
                    for secOpt in content:
                        assert len(secOpt) == 2
                        config.write(secOpt, content[secOpt])
                    responseJSON = self.response(
                        id=id_, state='success')

                elif purpose == 'writeConfigPerm':
                    # content:{(<sec>,<opt>):<val>,...}
                    for secOpt in content:
                        assert len(secOpt) == 2
                        config.write(secOpt, content[secOpt], permanent=True)
                    responseJSON = self.response(
                        id=id_, state='success')

                elif purpose == 'shutdown':
                    responseJSON = self.response(
                        id=id_, state='success')
                    await websocket.send(responseJSON)
                    await self.system.shutdown()

                # print(responseJSON)
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
        while True:
            await self.sleep(0)
            # message = await producer()
            # await websocket.send(message)

    async def handler(self, websocket: websockets.WebSocketServerProtocol, path: str):
        consumer_task = asyncio.ensure_future(
            self.consumer_handler(websocket, path))
        producer_task = asyncio.ensure_future(
            self.producer_handler(websocket, path))
        _, pending = await asyncio.wait(
            [consumer_task, producer_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()

    async def work(self):
        self.log("working")
        while self.activated:
            await self.sleep(0.5)
            self.__pool.check()
