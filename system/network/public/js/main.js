/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable no-undef */
ReactDOM.render(<SettingsIcon />, document.getElementById('settings'))
ReactDOM.render(<VideoBlank />, document.getElementById('video1'))
ReactDOM.render(<VideoBlank />, document.getElementById('video2'))
ReactDOM.render(<VideoBlank />, document.getElementById('robot'))

var pending = Object()
pending.pool = []
pending.fetch = function (id) {
  for (let i = 0; i < pending.pool.length; i++) {
    const req = JSON.parse(pending.pool[i])
    if (req.id === id) {
      pending.pool.splice(i, 1)
      return req
    }
  }
  throw Error('UnexpectedResponse')
}
pending.add = function (req) {
  pending.pool.push(req)
  return true
}
pending.check = function () {
  const maxWait = 1000 // (ms) response delayed more than this is considered error.
  var err = false
  for (let i = pending.pool.length - 1; i >= 0; i--) {
    const reqRaw = pending.pool[i]
    const req = JSON.parse(reqRaw)
    if (Date.now() - req.time > maxWait) {
      pending.pool.splice(i, 1)
      err = true
    }
  }
  if (err) {
    var delay = 404
    ReactDOM.render(
      <Ping delay={delay} />,
      document.getElementById('header_time_delay')
    )
    throw Error('timeout error')
  } else { return true }
}

function request(purpose, content, res = true, time = Date.now(), id = Math.random()) {
  var request = JSON.stringify({ purpose, id, content, time })
  if (res) {
    pending.add(request)
  }
  return request
}

// Create WebSocket connection.
const NANOSocket = new ReconnectingWebSocket('ws://' + location.host + '/api/ws')

// Connection opened
NANOSocket.addEventListener('open', function (event) {
  ping()
})

// Listen for messages
NANOSocket.addEventListener('message', function (event) {
  var data = JSON.parse(event.data)
  switch (data.purpose) {
    case 'response':
      var request = pending.fetch(data.id)
      switch (request.purpose) {
        case 'ping':
          var delay = Date.now() - request.time
          ReactDOM.render(
            <Ping delay={delay} />,
            document.getElementById('header_time_delay')
          )
          break

        case 'readConfig':
          console.log(request.content)
          break
        case 'writeConfigTemp': // left blank intentionally
        case 'writeConfigPerm':
          if (request.content.state === 'success') {
            console.log('yeah')
          } else {
            console.log('damn, handle this shit')
          }

          break
        default:
          break
      }

      break

    default:
      break
  }
})

function ping() {
  NANOSocket.send(request('ping', {}, true))
  //console.log(pending)
}

window.onbeforeunload = function () {
  NANOSocket.onclose = function () { } // disable onclose handler first
  NANOSocket.close()
}

// Test only
ReactDOM.render(
  <GamePeriod time={50} robot_mode={'game'} />,
  document.getElementById('header_game_period')
)

setInterval(ping, 500)
setInterval(pending.check, 500)

function load_config() {
  NANOSocket.send(request('loadConfig', {}, true))
}