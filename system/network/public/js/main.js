/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable no-undef */
const {
  Stack,
  PrimaryButton,
  DefaultButton,
  CommandBar,
  ICommandBarItemProps,
  PanelType,
  Panel,
  Icon,
  Shimmer,
  ShimmerElementType,
  Fabric,
  mergeStyles,
  initializeIcons,
  Breadcrumb,
  IBreadcrumbItem,
  IDividerAsProps,
  Label,
  ILabelStyles,
  TooltipHost,
  Dialog,
  DialogType,
  DialogFooter,
  ChoiceGroup,
  Slider,
  SpinButton,
  Checkbox,
  TextField,
  Toggle 
} = window.Fabric
const { useConstCallback } = window.FabricReactHooks

class Ping extends React.Component {
  render() {
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
  constructor(props) {
    super(props)
    this.state = {
      isOpen: false,
      hideDialog: true
    }
  }

  openPanel = () => {
    this.setState({ isOpen: true })
  }

  dismissPanel = () => {
    this.setState({ isOpen: false })
  }

  _showDialog = () => {
    this.setState({ hideDialog: false });
  };

  _closeDialog = () => {
    this.setState({ hideDialog: true });
  };

  render() {
    const _items = [{
      key: 'Run',
      text: 'Run',
      iconProps: { iconName: 'Rocket' },
      onClick: this._showDialog.bind()
    },
    {
      key: 'Settings',
      text: 'Settings',
      iconProps: { iconName: 'Settings' },
      onClick: this.openPanel.bind()
    },
    {
      key: 'Dev',
      text: 'Dev',
      iconProps: { iconName: 'DeveloperTools' },
      onClick: () => {
        window.open(
          '/dev',
          '_blank' // <- This is what makes it open in a new window.
        );
      }
    },
    ]
    return (
      <div style={{ margin: '22.25px auto', width: 'auto', textAlign: 'center' }}>
        <CommandBar
          items={_items}
        />
        <Dialog
          hidden={this.state.hideDialog}
          onDismiss={this._closeDialog}
          dialogContentProps={{
            type: DialogType.largeHeader,
            title: 'LOAD robot',
            subText: 'Configurations before the game.'
          }}
          modalProps={{
            isBlocking: false,
            styles: { main: { maxWidth: 450 } }
          }}
        >
          <ChoiceGroup
            label="Pick one"
            options={[
              {
                key: 'A',
                text: 'Option A'
              },
              {
                key: 'B',
                text: 'Option B',
                checked: true
              },
              {
                key: 'C',
                text: 'Option C',
              }
            ]}
          />
          <TextField label='TEST'></TextField>
          <Slider
            label="Snapping slider example"
            min={0}
            max={50}
            step={10}
            defaultValue={20}
            showValue={true}
            onChange={(value) => console.log(value)}
            snapToStep
          />
          <SpinButton
            defaultValue="0"
            label={'Basic SpinButton:'}
            min={0}
            max={100}
            step={1}
            iconProps={{ iconName: 'IncreaseIndentLegacy' }}
            // tslint:disable:jsx-no-lambda
            onFocus={() => console.log('onFocus called')}
            onBlur={() => console.log('onBlur called')}
            incrementButtonAriaLabel={'Increase value by 1'}
            decrementButtonAriaLabel={'Decrease value by 1'}
          />
          <Toggle label="Enabled and checked" defaultChecked onText="On" offText="Off"
          />
          <Stack>
            <Checkbox label="Unchecked checkbox (uncontrolled)" />
            <Checkbox label="Checked checkbox (uncontrolled)" defaultChecked />
            <Checkbox label="Disabled checkbox" disabled />
            <Checkbox label="Disabled checked checkbox" disabled defaultChecked />
          </Stack>
          <DialogFooter>
            <PrimaryButton onClick={this._closeDialog} text="Ready to Go" />
            <DefaultButton onClick={this._closeDialog} text="Cancel" />
          </DialogFooter>
        </Dialog>
        <Panel isLightDismiss headerText='Settings' type={PanelType.large} isOpen={this.state.isOpen} onDismiss={this.dismissPanel.bind()} closeButtonAriaLabel='close'>
          <SettingContext></SettingContext>
        </Panel>
      </div>
    )
  }
}

class GamePeriod extends React.Component {
  render() {
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
  render() {
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

class SettingContext extends React.Component {
  constructor(props) {
    super(props)
    this.state = { settings: [], schema: [] }
  }

  componentDidMount() {
    fetch(`/api/config?id=DEFAULT&method=get&value=`)
      .then((response) => { return response.json() })
      .then((data) => {
        this.setState({ settings: data.data });
      });
  }

  render() {
    try {
      var settings = this.state.settings
      for (const property in settings) {
        console.log(`${property}: ${settings[property]}`);
      }
      return (
        <SettingsGroup settings={this.state.settings}></SettingsGroup>
      );
    } catch (e) {
      const wrapperClass = mergeStyles({
        padding: 2,
        selectors: {
          '& > .ms-Shimmer-container': {
            margin: '10px 0'
          }
        }
      });
      return (
        <Fabric className={wrapperClass}>
          <Shimmer
            width={'40%'}
            shimmerElements={[
              { type: ShimmerElementType.circle },
              { type: ShimmerElementType.gap, width: '2%' },
              { type: ShimmerElementType.line }
            ]}
          />
          <Shimmer
            shimmerElements={[
              { type: ShimmerElementType.gap, width: '10%' },
              { type: ShimmerElementType.circle, height: 24 },
              { type: ShimmerElementType.gap, width: '2%' },
              { type: ShimmerElementType.line, height: 16, width: '20%' },
              { type: ShimmerElementType.gap, width: '5%' },
              { type: ShimmerElementType.line, height: 16, width: '20%' },
              { type: ShimmerElementType.gap, width: '43%' },
            ]}
          />
          <Shimmer
            shimmerElements={[
              { type: ShimmerElementType.gap, width: '10%' },
              { type: ShimmerElementType.circle, height: 24 },
              { type: ShimmerElementType.gap, width: '2%' },
              { type: ShimmerElementType.line, height: 16, width: '5%' },
              { type: ShimmerElementType.gap, width: '2%' },
              { type: ShimmerElementType.line, height: 16, width: '17%' },
              { type: ShimmerElementType.gap, width: '5%' },
              { type: ShimmerElementType.line, height: 16, width: '16%' },
              { type: ShimmerElementType.gap, width: '10%' },
              { type: ShimmerElementType.line, height: 16, width: '15%' },
              { type: ShimmerElementType.gap, width: '18%' },
            ]}
          />
          <Shimmer
            width={'40%'}
            shimmerElements={[
              { type: ShimmerElementType.circle },
              { type: ShimmerElementType.gap, width: '2%' },
              { type: ShimmerElementType.line }
            ]}
          />
          <Shimmer
            shimmerElements={[
              { type: ShimmerElementType.gap, width: '10%' },
              { type: ShimmerElementType.circle, height: 24 },
              { type: ShimmerElementType.gap, width: '2%' },
              { type: ShimmerElementType.line, height: 16, width: '5%' },
              { type: ShimmerElementType.gap, width: '2%' },
              { type: ShimmerElementType.line, height: 16, width: '17%' },
              { type: ShimmerElementType.gap, width: '5%' },
              { type: ShimmerElementType.line, height: 16, width: '16%' },
              { type: ShimmerElementType.gap, width: '10%' },
              { type: ShimmerElementType.line, height: 16, width: '15%' },
              { type: ShimmerElementType.gap, width: '18%' },
            ]}
          />
          <Shimmer
            shimmerElements={[
              { type: ShimmerElementType.gap, width: '10%' },
              { type: ShimmerElementType.circle, height: 24 },
              { type: ShimmerElementType.gap, width: '2%' },
              { type: ShimmerElementType.line, height: 16, width: '20%' },
              { type: ShimmerElementType.gap, width: '5%' },
              { type: ShimmerElementType.line, height: 16, width: '20%' },
              { type: ShimmerElementType.gap, width: '43%' },
            ]}
          />
          <Shimmer
            shimmerElements={[
              { type: ShimmerElementType.gap, width: '10%' },
              { type: ShimmerElementType.circle, height: 24 },
              { type: ShimmerElementType.gap, width: '2%' },
              { type: ShimmerElementType.line, height: 16, width: '5%' },
              { type: ShimmerElementType.gap, width: '2%' },
              { type: ShimmerElementType.line, height: 16, width: '17%' },
              { type: ShimmerElementType.gap, width: '5%' },
              { type: ShimmerElementType.line, height: 16, width: '16%' },
              { type: ShimmerElementType.gap, width: '10%' },
              { type: ShimmerElementType.line, height: 16, width: '15%' },
              { type: ShimmerElementType.gap, width: '18%' },
            ]}
          />
        </Fabric>
      );
    }
  }
}

class SettingsGroup extends React.Component {

  render() {
    return (
      <div>test</div>
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