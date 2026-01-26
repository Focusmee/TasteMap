-- Seed data for diet_log (for demo)
USE `smart-softwear`;
SET NAMES utf8mb4;

-- Ensure some food_knowledge exists (idempotent)
INSERT INTO food_knowledge (name, category, calories, nutrition, allergens, tags, description, image_url, serving_size_g, serving_unit, cook_method, ingredients, risk_flags, source) VALUES
('清蒸鱼','海鲜',240, JSON_OBJECT('protein_g',32,'fat_g',10,'carb_g',2,'sodium_mg',420,'sugar_g',0), JSON_ARRAY('鱼','海鲜'), JSON_ARRAY('high_protein','low_carb'), '清淡低脂的鱼类菜品', NULL, 100, '克', '清蒸', JSON_ARRAY('鱼','葱姜'), JSON_ARRAY(), '系统估算'),
('北京烤鸭','京菜',460, JSON_OBJECT('protein_g',28,'fat_g',30,'carb_g',22,'sodium_mg',690,'sugar_g',6), JSON_ARRAY('小麦'), JSON_ARRAY('roasted','high_fat'), '经典烤制鸭肉', NULL, 100, '克', '烤制', JSON_ARRAY('鸭肉','甜面酱'), JSON_ARRAY('high_fat'), '系统估算'),
('麻婆豆腐','川菜',320, JSON_OBJECT('protein_g',18,'fat_g',26,'carb_g',14,'sodium_mg',960,'sugar_g',4), JSON_ARRAY('大豆'), JSON_ARRAY('spicy'), '麻辣风味豆腐', NULL, 100, '克', '煖', JSON_ARRAY('豆腐','豆瓣酱','牛肉末'), JSON_ARRAY('spicy'), '系统估算'),
('狮子头','淮扬',520, JSON_OBJECT('protein_g',22,'fat_g',38,'carb_g',18,'sodium_mg',780,'sugar_g',3), JSON_ARRAY('猪肉'), JSON_ARRAY('stewed','high_fat'), '肉丸类传统菜', NULL, 100, '克', '炖煮', JSON_ARRAY('猪肉','葱姜'), JSON_ARRAY('high_fat'), '系统估算'),
('肠粉','粤菜',280, JSON_OBJECT('protein_g',9,'fat_g',6,'carb_g',48,'sodium_mg',520,'sugar_g',2), JSON_ARRAY('小麦'), JSON_ARRAY('carb'), '米浆蒸制小吃', NULL, 100, '克', '蒸制', JSON_ARRAY('米浆','酱油'), JSON_ARRAY('high_carb'), '系统估算'),
('蛋挞','烘焙',260, JSON_OBJECT('protein_g',5,'fat_g',15,'carb_g',26,'sodium_mg',180,'sugar_g',12), JSON_ARRAY('蛋','奶','小麦'), JSON_ARRAY('sweet'), '甜点类烘焙食品', NULL, 100, '克', '烘焙', JSON_ARRAY('鸡蛋','奶油','面粉'), JSON_ARRAY('sweet'), '系统估算'),
('豆浆','饮品',120, JSON_OBJECT('protein_g',6,'fat_g',4,'carb_g',12,'sodium_mg',80,'sugar_g',6), JSON_ARRAY('大豆'), JSON_ARRAY('drink','vegan'), '豆制饮品', NULL, 250, '毫升', '豆制', JSON_ARRAY('黄豆','水'), JSON_ARRAY(), '系统估算'),
('绿豆糕','甜品',210, JSON_OBJECT('protein_g',4,'fat_g',6,'carb_g',36,'sodium_mg',90,'sugar_g',14), JSON_ARRAY('豆类'), JSON_ARRAY('sweet'), '传统小点心', NULL, 80, '克', '蒸制', JSON_ARRAY('绿豆','白砂糖'), JSON_ARRAY('sweet'), '系统估算'),
('蔬菜沙拉','轻食',180, JSON_OBJECT('protein_g',4,'fat_g',12,'carb_g',14,'sodium_mg',220,'sugar_g',4), JSON_ARRAY(), JSON_ARRAY('veggie','light'), '清爽蔬菜搭配', NULL, 150, '克', '冷拌', JSON_ARRAY('生菜','番茄','黄瓜'), JSON_ARRAY(), '系统估算'),
('牛肉面','主食',520, JSON_OBJECT('protein_g',22,'fat_g',18,'carb_g',62,'sodium_mg',980,'sugar_g',4), JSON_ARRAY('小麦','牛肉'), JSON_ARRAY('noodle'), '经典汤面', NULL, 300, '克', '煮', JSON_ARRAY('牛肉','面条','汤料'), JSON_ARRAY('high_sodium'), '系统估算'),
('鸡胸肉','高蛋白',190, JSON_OBJECT('protein_g',35,'fat_g',4,'carb_g',0,'sodium_mg',120,'sugar_g',0), JSON_ARRAY('禽肉'), JSON_ARRAY('high_protein','low_fat'), '健身常用食材', NULL, 120, '克', '水煮', JSON_ARRAY('鸡胸肉'), JSON_ARRAY(), '系统估算'),
('燕麦粥','早餐',220, JSON_OBJECT('protein_g',8,'fat_g',5,'carb_g',36,'sodium_mg',130,'sugar_g',5), JSON_ARRAY('燕麦'), JSON_ARRAY('breakfast','whole_grain'), '常见早餐', NULL, 250, '克', '煮', JSON_ARRAY('燕麦','水'), JSON_ARRAY(), '系统估算')
ON DUPLICATE KEY UPDATE calories=VALUES(calories), nutrition=VALUES(nutrition), allergens=VALUES(allergens), tags=VALUES(tags), description=VALUES(description), image_url=VALUES(image_url), serving_size_g=VALUES(serving_size_g), serving_unit=VALUES(serving_unit), cook_method=VALUES(cook_method), ingredients=VALUES(ingredients), risk_flags=VALUES(risk_flags), source=VALUES(source);

-- Ensure all users have a profile with calorie_target (idempotent)
INSERT INTO user_profile (user_id, profile)
SELECT u.id, JSON_OBJECT(
  'nickname', IFNULL(u.nickname, '用户'),
  'gender','unknown',
  'age',22,
  'height',170,
  'weight',60,
  'goal','balanced',
  'calorie_target',2000,
  'activity','mid',
  'allergens',JSON_ARRAY('花生'),
  'preferences',JSON_ARRAY('少油','清淡'),
  'scenes',JSON_ARRAY('外卖','食堂')
)
FROM user u
LEFT JOIN user_profile up ON up.user_id = u.id
WHERE up.id IS NULL;

-- Delete recent demo diet_log to avoid duplicates
DELETE dl FROM diet_log dl
JOIN user u ON u.id = dl.user_id
WHERE dl.log_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY);

-- Insert 14 days of diet logs: 3 meals + optional snack
INSERT INTO diet_log (user_id, log_date, meal_type, food_name, calories, nutrition, allergens, note)
SELECT
  u.id AS user_id,
  DATE_SUB(CURDATE(), INTERVAL d.n DAY) AS log_date,
  m.meal_type,
  f.name AS food_name,
  f.calories,
  f.nutrition,
  f.allergens,
  CASE WHEN m.meal_type='snack' THEN '加餐小点' ELSE '' END AS note
FROM user u
JOIN (
  SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL
  SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13
) d ON 1=1
JOIN (
  SELECT 'breakfast' AS meal_type, 1 AS pick
  UNION ALL SELECT 'lunch', 2
  UNION ALL SELECT 'dinner', 3
  UNION ALL SELECT 'snack', 4
) m ON 1=1
JOIN (
  SELECT 1 AS pick, '燕麦粥' AS name UNION ALL
  SELECT 1, '豆浆' UNION ALL
  SELECT 2, '牛肉面' UNION ALL
  SELECT 2, '麻婆豆腐' UNION ALL
  SELECT 2, '蔬菜沙拉' UNION ALL
  SELECT 3, '清蒸鱼' UNION ALL
  SELECT 3, '北京烤鸭' UNION ALL
  SELECT 3, '狮子头' UNION ALL
  SELECT 4, '蛋挞' UNION ALL
  SELECT 4, '绿豆糕'
) picklist ON picklist.pick = m.pick
JOIN food_knowledge f ON f.name = picklist.name
WHERE m.meal_type <> 'snack' OR (m.meal_type = 'snack' AND MOD(d.n, 2) = 0);
