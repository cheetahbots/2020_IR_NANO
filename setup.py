
from strategy.test import counter, observer, numberGenerator, numberAdder
from sensor.network import networkTable,socketData
from hardware.secondOrderSystem import springMass
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
    
    # data = socketData()
    # data.priority = 5
    # use(data)

    SM = springMass()
    use(SM)
    

    # obs1 = observer().addInput(SM)
    # obs1.priority = 2
    # use(obs1)

    # numGen = numberGenerator()
    # use(numGen)

    # numAdd = numberAdder()
    # numAdd.priority = 2
    # numAdd.addInput(ct1)
    # use(numAdd)

    # NW = networkTable()
    # use(NW)


    # sys.addInput(numAdd)

    return setup_modules
