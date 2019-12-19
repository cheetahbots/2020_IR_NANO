import asyncio
import Lib.http as http
import websockets
import Lib.mimetypes as mimetypes

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
            print ('error')
            return http.HTTPStatus.NOT_FOUND, [], b'Not Found'


async def echo(websocket, path):
    async for message in websocket:
        await websocket.send('From server'+message)

web_server = websockets.serve(
    echo, "localhost", 80, process_request=static_file
)

#asyncio.get_event_loop().run_until_complete(web_server)
#asyncio.get_event_loop().run_forever()
