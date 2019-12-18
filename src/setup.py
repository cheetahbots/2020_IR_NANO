
from .hardware.secondOrderSystem import springMass
from .sensor.network import networkTable, socketData
from .strategy.test import counter, numberAdder, numberGenerator, observer


def SETUP_MODULES(sys):
    """
    Config module instances and connection

     ***EXAMPLE:***

    > ct1 = counter()\\
    > ct1.priority = 1\\
    > use(ct1)

    > obs1 = observer().addInput(ct1)\\
    > obs1.priority = 2\\
    > use(obs1)"""
    setup_modules = list()
    def use(x): return setup_modules.append(x)
    #
    #
    "***EDIT BELOW!***"

    SM = springMass()
    use(SM)

    # sys.addInput(numAdd)

    return setup_modules
