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
            config: {}
        }

    }

    componentDidMount() {
        fetch(`/api/config?id=DEFAULT&method=get&value=`)
            .then((response) => { return response.json() })
            .then((data) => {
                this.setState({ config: data.data });
            });
        fetch(`/api/schema`)
            .then((response) => { return response.json() })
            .then((data) => {
                this.setState({ schema: data.data });
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

    onSubmit = ({formData}, e) => console.log("Data submitted: ",  formData);

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
                    <JsonSchemaForm schema={this.state.schema} formData={this.state.config} onSubmit={this.onSubmit.bind()}>
                        {/* <div>
                        </div> */}
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

