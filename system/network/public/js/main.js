const { Icon, Shimmer, ShimmerElementType, Fabric, mergeStyles, initializeIcons } = window.Fabric;

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
            <div style={{ margin: '31.5px auto', width: 'auto', textalign: 'center' }}>
                <Icon iconName="InternetSharing" style={styles} />
                <span>&nbsp;&nbsp;&nbsp;</span>
                <span style={{ fontsize: '20px', fontweight: '400' }}>{this.props.delay}ms</span>
            </div>
        )
    }
};

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
                        { type: ShimmerElementType.circle, height: 100 },
                        { type: ShimmerElementType.gap, width: '10%' },
                        { type: ShimmerElementType.line, height: 100 },
                        { type: ShimmerElementType.gap, width: '10%' },
                        { type: ShimmerElementType.circle, height: 100 },
                    ]}
                />
                <Shimmer
                    shimmerElements={[
                        { type: ShimmerElementType.line, height: 16, width: '100%' },
                    ]}
                />
                <Shimmer
                    shimmerElements={[
                        { type: ShimmerElementType.circle, height: 100 },
                        { type: ShimmerElementType.gap, width: '10%' },
                        { type: ShimmerElementType.line, height: 100 },
                        { type: ShimmerElementType.gap, width: '10%' },
                        { type: ShimmerElementType.circle, height: 100 },
                    ]}
                />
            </Fabric>
        )
    }
};

ReactDOM.render(<VideoBlank />, document.getElementById('video1'))
ReactDOM.render(<VideoBlank />, document.getElementById('video2'))
ReactDOM.render(<VideoBlank />, document.getElementById('robot'))

// Create WebSocket connection.
const socket = new WebSocket('ws://localhost:80/api');

// Connection opened
socket.addEventListener('open', function (event) {
    var data = {
        "purpose": "ping",
        "time": Date.now()
    }
    socket.send(JSON.stringify(data));
});

// Listen for messages
socket.addEventListener('message', function (event) {
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
                socket.send(JSON.stringify(send));
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
                    socket.send(JSON.stringify(send))
                }, 250);
            }
            break;
    }

});

window.onbeforeunload = function () {
    socket.onclose = function () { }; // disable onclose handler first
    socket.close()
};