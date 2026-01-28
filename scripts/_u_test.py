import codecs
u = lambda s: codecs.decode(s, "unicode_escape")
print(u("\\u5065\\u5eb7\\u6982\\u89c8"))
