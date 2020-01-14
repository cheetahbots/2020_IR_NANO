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
const toPath = window._
// const JSONSchemaForm = JSONSchemaForm.default;

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
            hideDialog: true,
            schema: {
                title: "8015 Definitions",
                type: "object",
            },
            config: {},
            ingame_schema: {
                title: "8015 Definitions",
                type: "object",
            },
            ingame_config: {}
        }

    }

    componentDidMount() {
        fetch(`/api/config?id=DEFAULT&method=get&value=`)
            .then((response) => { return response.json() })
            .then((data) => {
                this.setState({ config: data.data });
            });
        fetch(`/api/schema?id=DEFAULT`)
            .then((response) => { return response.json() })
            .then((data) => {
                this.setState({ schema: data.data });
            });
        fetch(`/api/config?id=ingame&method=get&value=`)
            .then((response) => { return response.json() })
            .then((data) => {
                this.setState({ ingame_config: data.data });
            });
        fetch(`/api/schema?id=ingame`)
            .then((response) => { return response.json() })
            .then((data) => {
                this.setState({ ingame_schema: data.data });
            });
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

    JSONflatter = (jsonData, parent) => {
        let options = []
        function parseJsonRec(jsonData, parent, options) {
            if (parent === null) {
                parent = ''
            } else {
                parent = parent + '.'
            }
            if (Object.keys(jsonData).length > 0) {
                Object.keys(jsonData).map(subKey => {
                    if (typeof jsonData[subKey] == 'object') {
                        parseJsonRec(jsonData[subKey], parent + subKey, options)
                    } else {
                        options.push({ 'key': parent + subKey, 'value': jsonData[subKey] })
                    }
                });
            }
        }
        parseJsonRec(jsonData, parent, options)
        return options
    }

    configSync = (JSONflatted) => {
        JSONflatted.map(item => {
            fetch(`/api/config?id=${item.key}&method=update&value=${item.value}`)
        })
    }

    config_onChange = ({ formData }, e) => {
        this.configSync(this.JSONflatter(formData, null))
    };

    ingame_onChange = ({ formData }, e) => {
        this.configSync(this.JSONflatter(formData, 'ingame'))
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
                        styles: { main: { maxWidth: 500 } }
                    }}
                >
                    <JsonSchemaForm schema={this.state.ingame_schema} formData={this.state.ingame_config} onChange={this.ingame_onChange.bind()}>
                        <div></div>
                    </JsonSchemaForm>
                    <DialogFooter>
                        <DefaultButton onClick={this._closeDialog} text="Cancel" />
                        <PrimaryButton onClick={this._closeDialog} text="Ready to Go" />
                    </DialogFooter>
                </Dialog>
                <Panel isLightDismiss headerText='Settings' type={PanelType.large} isOpen={this.state.isOpen} onDismiss={this.dismissPanel.bind()} closeButtonAriaLabel='close'>
                    <JsonSchemaForm schema={this.state.schema} formData={this.state.config} onChange={this.config_onChange.bind()}>
                        <div></div>
                    </JsonSchemaForm>
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

