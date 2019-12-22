# Log folder

## Gernal Format
```
Timestamp - Module name [Track ID] - Log level - Log information
```
The log file is located in `./log/tst.log`

<br/>

* Timestamp

Format: `Year-month-day hour:minute:second` local time

Example: `2019-12-22 11:21:16`

<br/>

* Module name

Format: `Sensor.Module`

Example: `main.system`

<br/>

* Track ID

Format: `Number`

Example: `[1]`

Note: This is allocated by system

<br/>

* Log level

Format: Log identifier

Options:

1. INFO

2.  ERROR

<br/>

* Log Information

Format: `String`