
from strategy.test import counter,observer

def __setup_func():
    'Config module instances and connection'
    setup_modules = list()
    use = lambda x:setup_modules.append(x)

    ct1 = counter()
    ct1.priority = 1
    use(ct1)

    obs1 = observer().addInput(ct1)
    obs1.priority = 2
    use(obs1)

    return setup_modules

SETUP_MODULES = __setup_func()    