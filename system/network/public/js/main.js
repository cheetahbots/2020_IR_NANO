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

const SettingsIcon = function () {
  var _a = React.useState(false)
  var isOpen = _a[0]
  var setIsOpen = _a[1]
  var openPanel = useConstCallback(function () {
    return setIsOpen(true)
  })
  var dismissPanel = useConstCallback(function () {
    return setIsOpen(false)
  })
  return (
    <div style={{ margin: '31.5px auto', width: 'auto', textAlign: 'center' }}>
      <Icon
        iconName="Settings"
        style={{ transform: 'scale(2)', color: '#0078d4' }}
        onClick={openPanel}
      />
      <Panel
        isLightDismiss
        headerText="Settings"
        type={PanelType.large}
        isOpen={isOpen}
        onDismiss={dismissPanel}
        closeButtonAriaLabel="close"
      ></Panel>
    </div>
  )
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

// Create WebSocket connection.
const NANOSocket = new WebSocket('ws://' + location.host + '/api')

// Connection opened
NANOSocket.addEventListener('open', function (event) {
  var data = {
    purpose: 'ping',
    time: Date.now()
  }
  NANOSocket.send(JSON.stringify(data))
})

// Listen for messages
NANOSocket.addEventListener('message', function (event) {
  var data = JSON.parse(event.data)
  switch (data.purpose) {
    case 'pong':
      var delay = Date.now() - data.time
      ReactDOM.render(
        <Ping delay={delay} />,
        document.getElementById('header_time_delay')
      )
      var send
      if (delay > 100) {
        send = {
          purpose: 'ping',
          time: Date.now()
        }
        NANOSocket.send(JSON.stringify(send))
      } else {
        send = {
          purpose: 'ping',
          time: Date.now()
        }
        setTimeout(function () {
          send = {
            purpose: 'ping',
            time: Date.now()
          }
          NANOSocket.send(JSON.stringify(send))
        }, 250)
      }
      break
  }
})

window.onbeforeunload = function () {
  NANOSocket.onclose = function () {} // disable onclose handler first
  NANOSocket.close()
}

// Test only
ReactDOM.render(
  <GamePeriod time={50} robot_mode={'game'} />,
  document.getElementById('header_game_period')
)
