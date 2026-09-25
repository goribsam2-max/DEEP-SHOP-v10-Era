import re

with open("pages/Messages.tsx", "r") as f:
    content = f.read()

bad = """                              )}
                          </div>
                      )
                    )}
                  </div>"""
good = """                              )}
                          </div>
                      )}
                  </div>"""

content = content.replace(bad, good)

with open("pages/Messages.tsx", "w") as f:
    f.write(content)
