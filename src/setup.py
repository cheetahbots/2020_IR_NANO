
from .hardware.secondOrderSystem import springMass
from .sensor.network import NetworkTableHandler
from .strategy.test import Counter, numberAdder, numberGenerator, Observer, axisControl


def SETUP_MODULES(sys):
    """
    Config module instances and connection

     ***EXAMPLE:***

    > ct1 = Counter()\\
    > ct1.priority = 1\\
    > use(ct1)

    > obs1 = Observer().addInput(ct1)\\
    > obs1.priority = 2\\
    > use(obs1)"""
    setup_modules = list()
    def use(x): return setup_modules.append(x)
    #
    #
    "***EDIT BELOW!***"
    ct1 = Counter()
    use(ct1)
    # SM = springMass()
    # use(SM)

    # obs1 = Observer().addInput(ct1)
    # use(obs1)

    nwtb = NetworkTableHandler()

    motorController = axisControl().addInput(nwtb)

    nwtb.addInput(motorController)
    use(nwtb)
    use(motorController)    

    # sys.addInput(numAdd)

    return setup_modules
