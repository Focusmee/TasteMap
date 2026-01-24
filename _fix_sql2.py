from pathlib import Path
import re

path = Path(r"f:\TasteMap\sql_final.sql")
data = path.read_bytes()

nl = b"\r\n" if b"\r\n" in data else b"\n"
indent = b"  "

rep1_lines = [
    "FROM user u",
    "JOIN (",
    "  SELECT DATE_SUB(CURDATE(), INTERVAL 6 DAY) AS d",
    "  UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 5 DAY)",
    "  UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 4 DAY)",
    "  UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 3 DAY)",
    "  UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 2 DAY)",
    "  UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 1 DAY)",
    "  UNION ALL SELECT CURDATE()",
    " ) days ON 1=1",
    "JOIN (",
    "  SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3",
    ") seq ON 1=1",
]
rep1 = nl.join([indent + l.encode("ascii") for l in rep1_lines])
pattern1 = rb"\n\s*FROM user u\s*\n\s*JOIN days ON 1=1\s*\n\s*JOIN seq ON 1=1"
data = re.sub(pattern1, nl + rep1, data, count=1)

rep2_lines = [
    "FROM user u",
    "JOIN (",
    "  SELECT DATE_SUB(CURDATE(), INTERVAL 6 DAY) AS d",
    "  UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 5 DAY)",
    "  UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 4 DAY)",
    "  UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 3 DAY)",
    "  UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 2 DAY)",
    "  UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 1 DAY)",
    "  UNION ALL SELECT CURDATE()",
    " ) days2 ON 1=1",
]
rep2 = nl.join([indent + l.encode("ascii") for l in rep2_lines])
pattern2 = rb"\n\s*FROM user u\s*\n\s*JOIN days2 ON 1=1"
data = re.sub(pattern2, nl + rep2, data, count=1)

path.write_bytes(data)
print("Updated")
