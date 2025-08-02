# Demo unit test (illustrative)

def add(a, b):
    return a + b

def test_addition():
    assert add(2, 3) == 5

def test_addition_negative():
    assert add(-1, 1) == 0
