import asyncio
import json
import time as t

import websockets

import Lib.http as http
import Lib.mimetypes as mimetypes

from ..config import config
from ..engine.module import moduleDynamic
from ..engine.util import loggable


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

class requestPool(loggable):
    def __init__(self):
        loggable.__init__(self)
        self.__pool = list()

    @property
    def maxWait(self):
        'load from config max wait time in ms'
        return 1000
        
    def add(self, reqRaw):
        if type(reqRaw) is str:
            req=json.loads(reqRaw)
        elif type(reqRaw) is dict:
            req = reqRaw
        else: raise Exception('wtf, this is not a request, man.')
        
        assert 'purpose' in req
        assert 'content' in req
        assert 'time' in req
        assert 'id' in req

        self.__pool.append(req)
        
    def check(self):
        err = False
        for req in self.__pool:
            time = req['time']

            if t.time * 1000 - time > self.maxWait:
                del self.__pool[self.__pool.index(req)]
                err = True
        if err:
            raise Exception('shit, timeout')
        else:
            return True

    def fetch(self,id_):
        for req in self.__pool:
            id__ = req['id']
            if id__ == id_:
                del self.__pool[self.__pool.index(req)]
                return req
        raise Exception('UnexpectedResponse')

class webServer(moduleDynamic):
    'host web dashboard and process HTTP/websocket requests'

    def __init__(self, sys):
        moduleDynamic.__init__(self)
        self.DataListeners = list()
        self.system = sys
        self.__pool = requestPool()

    async def initialize(self):
        print('CREATE SERVER')
        start_server = websockets.serve(
            self.handler, "localhost", 80, process_request=staticFile)
        await start_server

    def attachDataListener(self, pointer):
        self.DataListeners.append(pointer)
        return self
        
    def request(self,purpose=None, content={}, id=None, res = True,**kwargs):
        content.update(kwargs)
        req = json.dumps({'purpose': purpose, 'content': content, 'id': id})
        if res: self.__pool.add(req)
        return req

    def response(self,purpose='response', content={}, id=None, res=False, **kwargs):
        return self.request(purpose, content, id, **kwargs)

    async def handler(self, websocket, path):
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
                    responseJSON = self.response( id=id_)

                elif purpose == 'data':
                    # content:{<key>:<val>,...}
                    for ins in self.DataListeners:
                        ins.output = content
                    responseJSON = self.response( id=id_)

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
        self.log("working")
        while self.activated:
            await self.sleep(0.5)
            self.__pool.check()
