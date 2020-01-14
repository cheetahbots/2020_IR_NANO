#!/bin/bash
### BEGIN INIT INFO
# Provides:          FRC-NANO
# Required-Start:    $local_fs $network
# Required-Stop:     $local_fs
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: PythonFRC-NANO service
# Description:       PythonFRC-NANO service
### END INIT INFO

filepath="/home/cheetah/FRC/2020_IR_NANO/main.py"

start(){
    nohup python3 $filepath>/dev/null 2>&1 &
    echo 'FRC-NANO service OK'
}


stop(){
    serverpid=`ps -aux|grep "$filepath"|grep -v grep|awk '{print $2}'`
    kill -9 $serverpid
    echo 'FRC-NANO stop OK'
}


restart(){
    stop
    echo 'FRC-NANO stop OK'
    start
    echo 'FRC-NANO service OK'
}


case $1 in
    start)
    start
    ;;
    stop)
    stop
    ;;
    restart)
    restart
    ;;
    *)
    start
esac