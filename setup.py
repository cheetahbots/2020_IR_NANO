
from strategy.test import counter, observer, numberGenerator, numberAdder


def SETUP_MODULES(sys):
    'Config module instances and connection'
    setup_modules = list()
    def use(x): return setup_modules.append(x)

    ct1 = counter()
    ct1.priority = 1
    use(ct1)

    # obs1 = observer().addInput(ct1)
    # obs1.priority = 2
    # use(obs1)

    # numGen = numberGenerator()
    # use(numGen)

    numAdd = numberAdder()
    numAdd.priority = 2
    numAdd.addInput(ct1)
    use(numAdd)

    sys.addInput(numAdd)

    return setup_modules
