from pathlib import Path
import re

path = Path(r"f:\TasteMap\sql_final.sql")
data = path.read_bytes()

nl = b"\r\n" if b"\r\n" in data else b"\n"

# Remove CTE blocks and replace joins with inline day tables.
data = re.sub(rb"\nWITH RECURSIVE days AS \(.*?\n\)\nINSERT INTO recognition", b"\nINSERT INTO recognition", data, flags=re.S)
data = re.sub(rb"\nWITH RECURSIVE days2 AS \(.*?\n\)\nINSERT INTO travel_plan", b"\nINSERT INTO travel_plan", data, flags=re.S)

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
rep1 = nl.join([l.encode("ascii") for l in rep1_lines])
old1 = b"FROM user u" + nl + b"JOIN days ON 1=1" + nl + b"JOIN seq ON 1=1"
data = data.replace(old1, rep1)

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
rep2 = nl.join([l.encode("ascii") for l in rep2_lines])
old2 = b"FROM user u" + nl + b"JOIN days2 ON 1=1"
data = data.replace(old2, rep2)

path.write_bytes(data)
print("Updated")
