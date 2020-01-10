""" Config module instances and connection
"""
from .hardware import *
from .sensor import *
from .strategy import *
from .map.items import *
""" EXAMPLE:
    [ create instance ]
    > obs1 = Observer()

    [ set priority ]
    > obs1.priority = 2 / obs1.P(2)

    [ attach / subscribe ]
    > obs1.addInput(ct1) / obs.A(ct1) / Observer(ct1)

    [ indicate subscribed signal type ]
    > obj.signalIN(<signal>) / obj.I(<signal>)
"""
# "***EDIT BELOW!***"

ct1 = Counter()

nwtb = NetworkTableHandler()
motorController = axisControl(nwtb).I(AXIS.mainH)
nwtb.A(motorController)
