/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable no-undef */
const {
  PanelType,
  Panel,
  Icon,
  Shimmer,
  ShimmerElementType,
  Fabric,
  mergeStyles,
  initializeIcons
} = window.Fabric
const { useConstCallback } = window.FabricReactHooks

class Ping extends React.Component {
  render () {
    var color, delayText
    var reg = /^[0-9]*$/
    if (reg.test(this.props.delay)) {
      if (this.props.delay < 50) {
        color = '#107c10'
      } else if (this.props.delay < 100) {
        color = '#fce100'
      } else {
        color = '#d13438'
      }
      delayText = this.props.delay + 'ms'
    } else {
      color = '#d13438'
      delayText = 'off'
    }
    const styles = { transform: 'scale(2)', color: color }
    return (
      <div
        style={{ margin: '31.5px auto', width: 'auto', textAlign: 'center' }}
      >
        <Icon iconName="InternetSharing" style={styles} />
        <span>&nbsp;&nbsp;&nbsp;</span>
        <span style={{ fontsize: '20px', fontweight: '400' }}>{delayText}</span>
      </div>
    )
  }
}

class SettingsIcon extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      isOpen: false
    }
  }

  openPanel = () => {
    this.setState({ isOpen: true })
  }

  dismissPanel = () => {
    this.setState({ isOpen: false })
  }

  render () {
    return (
      <div style={{ margin: '31.5px auto', width: 'auto', textAlign: 'center' }}>
        <Icon iconName="Settings" style={{ transform: 'scale(2)', color: '#0078d4' }} onClick={this.openPanel.bind()} />
        <Panel isLightDismiss headerText='Settings' type={PanelType.large} isOpen={this.state.isOpen} onDismiss={this.dismissPanel.bind()} closeButtonAriaLabel='close'>
        </Panel>
      </div>
    )
  }
}

class GamePeriod extends React.Component {
  render () {
    var IconName, displayTime
    if (this.props.robot_mode === 'auto') {
      IconName = 'TriggerAuto'
    } else {
      IconName = 'Game'
    }
    if (this.props.time < 30) {
      displayTime = this.props.time
    } else {
      displayTime = this.props.time - 30
    }
    const styles = { transform: 'scale(3) translateY(-20%)', color: '#0078d4' }
    return (
      <div>
        <Icon iconName={IconName} style={styles} />
        <span>&nbsp;&nbsp;&nbsp;&nbsp;</span>
        <span style={{ fontSize: '50px' }}>{displayTime} s</span>
      </div>
    )
  }
}

const wrapperClass = mergeStyles({
  padding: 2,
  selectors: {
    '& > .ms-Shimmer-container': {
      margin: '10px 0'
    }
  }
})

class VideoBlank extends React.Component {
  render () {
    return (
      <Fabric className={wrapperClass}>
        <Shimmer
          shimmerElements={[
            { type: ShimmerElementType.line, height: 350, width: '100%' }
          ]}
        />
      </Fabric>
    )
  }
}

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

function request (purpose, content, res = true, time = Date.now(), id = Math.random()) {
  var request = JSON.stringify({ purpose, id, content, time })
  if (res) {
    pending.add(request)
  }
  return request
}

// Create WebSocket connection.
const NANOSocket = new ReconnectingWebSocket('ws://' + location.host + '/api')

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

function ping () {
  NANOSocket.send(request('ping', {}, true))
  console.log(pending)
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
