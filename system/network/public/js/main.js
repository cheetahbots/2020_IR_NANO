const { PanelType, Panel, Icon, Shimmer, ShimmerElementType, Fabric, mergeStyles, initializeIcons } = window.Fabric;
const { useConstCallback } = window.FabricReactHooks;

class Ping extends React.Component {
    render() {
        var color
        if (this.props.delay < 50) {
            color = '#107c10'
        } else if (this.props.delay < 100) {
            color = '#fce100'
        } else {
            color = '#d13438'
        }
        const styles = { transform: 'scale(2)', color: color }
        return (
            <div style={{ margin: '31.5px auto', width: 'auto', textAlign: 'center' }}>
                <Icon iconName="InternetSharing" style={styles} />
                <span>&nbsp;&nbsp;&nbsp;</span>
                <span style={{ fontsize: '20px', fontweight: '400' }}>{this.props.delay}ms</span>
            </div>
        )
    }
};

const SettingsIcon = function () {
    var _a = React.useState(false), isOpen = _a[0], setIsOpen = _a[1];
    var openPanel = useConstCallback(function () { return setIsOpen(true); });
    var dismissPanel = useConstCallback(function () { return setIsOpen(false); });
    return (
        <div style={{ margin: '31.5px auto', width: 'auto', textAlign: 'center' }}>
            <Icon iconName="Settings" style={{ transform: 'scale(2)', color: '#0078d4' }} onClick={openPanel} />
            <Panel isLightDismiss headerText='Settings' type={PanelType.large} isOpen={isOpen} onDismiss={dismissPanel} closeButtonAriaLabel='close'>
            </Panel>
        </div>
    )
};

class GamePeriod extends React.Component {
    render() {
        var Icon_Name, display_time
        if (this.props.robot_mode == 'auto') {
            Icon_Name = 'TriggerAuto'
        } else {
            Icon_Name = 'Game'
        }
        if (this.props.time < 30) {
            display_time = this.props.time
        } else {
            display_time = this.props.time - 30
        }
        const styles = { transform: 'scale(3) translateY(-20%)', color: '#0078d4' }
        return (
            <div>
                <Icon iconName={Icon_Name} style={styles} />
                <span>&nbsp;&nbsp;&nbsp;&nbsp;</span>
                <span style={{ fontSize: '50px' }}>{display_time} s</span>
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
});

class VideoBlank extends React.Component {
    render() {
        return (
            <Fabric className={wrapperClass}>
                <Shimmer
                    shimmerElements={[
                        { type: ShimmerElementType.line, height: 350, width: '100%' },
                    ]}
                />
            </Fabric>
        )
    }
};

ReactDOM.render(<SettingsIcon />, document.getElementById('settings'))
ReactDOM.render(<VideoBlank />, document.getElementById('video1'))
ReactDOM.render(<VideoBlank />, document.getElementById('video2'))
ReactDOM.render(<VideoBlank />, document.getElementById('robot'))

// Create WebSocket connection.
const NANO_socket = new WebSocket('ws://' + location.host + '/api');

// Connection opened
NANO_socket.addEventListener('open', function (event) {
    var data = {
        "purpose": "ping",
        "time": Date.now()
    }
    NANO_socket.send(JSON.stringify(data));
});

// Listen for messages
NANO_socket.addEventListener('message', function (event) {
    var data = JSON.parse(event.data);
    switch (data['purpose']) {
        case 'pong':
            var delay = Date.now() - data.time
            ReactDOM.render(<Ping delay={delay} />, document.getElementById('header_time_delay'))
            if (delay > 100) {
                var send = {
                    "purpose": "ping",
                    "time": Date.now()
                }
                NANO_socket.send(JSON.stringify(send));
            } else {
                var send = {
                    "purpose": "ping",
                    "time": Date.now()
                }
                setTimeout(function () {
                    var send = {
                        "purpose": "ping",
                        "time": Date.now()
                    }
                    NANO_socket.send(JSON.stringify(send))
                }, 250);
            }
            break;
    }
});

window.onbeforeunload = function () {
    NANO_socket.onclose = function () { }; // disable onclose handler first
    NANO_socket.close()
};

//Test only
ReactDOM.render(<GamePeriod time={50} robot_mode={'game'} />, document.getElementById('header_game_period'))