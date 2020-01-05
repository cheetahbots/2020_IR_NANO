const {
    TextField,
    PrimaryButton,
    Stack
} = window.Fabric

class AuthField extends React.Component {
    _onChange = (ev, newValue) => {
        this.setState({ FedAuth: newValue || '' });
    }
    login = () => {
        setCookie("FedAuth", this.state.FedAuth, 365)
        location.href = '/'
    }
    render() {
        return (
            <Stack tokens={{ childrenGap: 15 }} styles={{ width: 300 }}>
                <img src="/logo.png" width="100px" height="100px" style={{ margin: 'auto',borderRadius:'5px'}}></img>
                <TextField label='Password' onChange={this._onChange.bind()} type="password"></TextField>
                <PrimaryButton text="LOGIN" onClick={this.login.bind()} />
            </Stack>
        )
    }
}

function setCookie(c_name, value, expiredays) {
    var exdate = new Date()
    exdate.setDate(exdate.getDate() + expiredays)
    document.cookie = c_name + "=" + escape(value) +
        ((expiredays === null) ? "" : ";expires=" + exdate.toGMTString()) + ";path=/"
}

ReactDOM.render(
    <AuthField />,
    document.getElementById('login')
)