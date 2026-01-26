-- =========================================================
-- smart-softwear: schema + 7-day demo data (recognition + travel_plan)
-- 说明：
-- 1) 本脚本会创建数据库/表（若不存在）
-- 2) 会为“所有已存在的用户”插入近7天的演示数据（确保你用哪个账号登录，看板都有数据）
-- 3) 为避免重复，插入前会删除近7天内的旧数据（按 create_time 范围）
-- =========================================================

CREATE DATABASE IF NOT EXISTS `smart-softwear`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE `smart-softwear`;
SET NAMES utf8mb4;

-- ----------------
-- Tables (IF NOT EXISTS)
-- ----------------
CREATE TABLE IF NOT EXISTS food_destination_recommendation
(
    id                       int auto_increment comment '推荐规则ID'
        primary key,
    food_name                varchar(100)                          not null comment '菜品名称',
    food_category            varchar(50)                           not null comment '菜品类别（川菜、粤菜、湘菜等）',
    recommended_destinations json                                  not null comment '推荐目的地列表（JSON格式：目的地、理由、推荐餐厅）',
    calorie_range            varchar(50) default ''                not null comment '卡路里范围（如"300-500大卡"）',
    create_time              datetime    default CURRENT_TIMESTAMP not null comment '创建时间',
    update_time              datetime    default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间'
)
    comment '菜品目的地推荐规则表' charset = utf8mb4;

CREATE TABLE IF NOT EXISTS token_blacklist
(
    id          int auto_increment comment '黑名单ID'
        primary key,
    token       varchar(500)                       not null comment '失效的Token',
    user_id     int                                not null comment '用户ID',
    expire_time datetime                           not null comment 'Token过期时间',
    create_time datetime default CURRENT_TIMESTAMP null comment '加入黑名单时间'
)
    comment 'Token黑名单表' charset = utf8mb4;

CREATE TABLE IF NOT EXISTS user
(
    id          int auto_increment comment '用户唯一ID（自增）'
        primary key,
    phone       varchar(11)                                       not null comment '用户手机号（登录账号，唯一）',
    password    varchar(64)                                       not null comment '密码（bcrypt加密存储，不存明文）',
    nickname    varchar(20)  default 'user'                   not null comment '用户昵称',
    avatar      varchar(255) default '/static/default-avatar.png' not null comment '用户头像（服务器静态目录路径）',
    create_time datetime     default CURRENT_TIMESTAMP            not null comment '注册时间',
    update_time datetime     default CURRENT_TIMESTAMP            not null on update CURRENT_TIMESTAMP comment '信息更新时间',
    constraint uk_phone
        unique (phone)
)
    comment '用户基础信息表' charset = utf8mb4;

-- 演示账号（用于展示看板/趋势图）：手机号 13800000000，密码 123456
-- 注意：后端已做兼容处理，演示数据允许明文密码（正式环境请通过注册接口生成 bcrypt 密码）
INSERT INTO user (id, phone, password, nickname, avatar) VALUES
(1, '13800000000', '123456', '演示用户', '/static/default-avatar.png')
ON DUPLICATE KEY UPDATE phone=VALUES(phone);

CREATE TABLE IF NOT EXISTS collection
(
    id          int auto_increment comment '收藏记录唯一ID'
        primary key,
    user_id     int                                not null comment '关联用户ID',
    coll_type   varchar(10)                        not null comment '收藏类型（rec：识别记录；travel：出行规划）',
    target_id   int                                not null comment '关联目标ID（recognition.id 或 travel_plan.id）',
    create_time datetime default CURRENT_TIMESTAMP not null comment '收藏时间',
    constraint uk_user_coll_target
        unique (user_id, coll_type, target_id),
    constraint fk_collection_user
        foreign key (user_id) references user (id)
            on delete cascade
)
    comment '用户收藏表' charset = utf8mb4;

CREATE TABLE IF NOT EXISTS recognition
(
    id          int auto_increment comment '识别记录唯一ID'
        primary key,
    user_id     int                                not null comment '关联用户ID',
    img_url     varchar(255)                       not null comment '识别图片路径（服务器静态目录，如/uploads/rec_123.jpg）',
    rec_result  json                               not null comment '识别结果（JSON格式：菜品名、成分、过敏原、热量）',
    create_time datetime default CURRENT_TIMESTAMP not null comment '识别时间',
    constraint fk_recognition_user
        foreign key (user_id) references user (id)
            on delete cascade
)
    comment '食物识别记录表' charset = utf8mb4;

CREATE TABLE IF NOT EXISTS travel_plan
(
    id                      int auto_increment comment '出行规划唯一ID'
        primary key,
    user_id                 int                                      not null comment '关联用户ID',
    rec_id                  int                                      null comment '关联识别记录ID（允许为NULL，支持单独创建出行规划）',
    destination             varchar(50)                              not null comment '目的地（如“市动物园”）',
    destination_location    varchar(100)   default ''                not null comment '目的地位置（经纬度）',
    origin_location         varchar(100)   default ''                not null comment '起点位置（经纬度或地址）',
    plan_name               varchar(100)   default ''                not null comment '出行计划名称（如"周末美食之旅"）',
    weather_info            json                                     not null comment '天气数据（JSON格式：温度、提示、预警）',
    route_info              json                                     not null comment '路线数据（JSON格式：交通方式、路线详情）',
    recommended_restaurants json                                     null comment '推荐餐厅列表（JSON格式：餐厅名、地址、菜品推荐、人均消费）',
    daily_budget            decimal(10, 2) default 0.00              not null comment '每日预算（元）',
    total_calories          int            default 0                 not null comment '总卡路里（大卡）',
    plan_days               int            default 1                 not null comment '计划天数',
    attractions             json                                     null comment '推荐景点列表（JSON格式：景点名、地址、门票、开放时间）',
    plan_summary            text                                     null comment '出行计划摘要',
    status                  varchar(20)    default 'draft'           not null comment '状态（draft：草稿；completed：已完成；cancelled：已取消）',
    route_type              varchar(20)    default 'driving'         not null comment '路线类型（driving/walking/bicycling/transit）',
    ticket_url              varchar(255)   default ''                not null comment '景点票务预约链接（无则为空）',
    start_time              datetime                                  null comment '行程开始时间',
    end_time                datetime                                  null comment '行程结束时间',
    create_time             datetime       default CURRENT_TIMESTAMP not null comment '规划创建时间',
    update_time             datetime       default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint fk_travel_recognition
        foreign key (rec_id) references recognition (id)
            on delete cascade,
    constraint fk_travel_user
        foreign key (user_id) references user (id)
            on delete cascade
)
    comment '出行规划表' charset = utf8mb4;

SET @s := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE travel_plan ADD COLUMN start_time datetime NULL COMMENT \"行程开始时间\"',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'travel_plan'
    AND column_name = 'start_time'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE travel_plan ADD COLUMN end_time datetime NULL COMMENT \"行程结束时间\"',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'travel_plan'
    AND column_name = 'end_time'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------
-- Indexes (drop then create, to avoid "already exists" errors)
-- ----------------
SET @s := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_category ON food_destination_recommendation (food_category)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'food_destination_recommendation'
    AND index_name = 'idx_category'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_food_name ON food_destination_recommendation (food_name)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'food_destination_recommendation'
    AND index_name = 'idx_food_name'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_expire_time ON token_blacklist (expire_time)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'token_blacklist'
    AND index_name = 'idx_expire_time'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_token ON token_blacklist (token)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'token_blacklist'
    AND index_name = 'idx_token'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_user_id ON token_blacklist (user_id)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'token_blacklist'
    AND index_name = 'idx_user_id'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_user_coll ON collection (user_id, coll_type)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'collection'
    AND index_name = 'idx_user_coll'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_user_id ON recognition (user_id)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'recognition'
    AND index_name = 'idx_user_id'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_rec_user_time ON recognition (user_id, create_time)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'recognition'
    AND index_name = 'idx_rec_user_time'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_rec_id ON travel_plan (rec_id)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'travel_plan'
    AND index_name = 'idx_rec_id'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_user_rec ON travel_plan (user_id, rec_id)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'travel_plan'
    AND index_name = 'idx_user_rec'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_user_status ON travel_plan (user_id, status)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'travel_plan'
    AND index_name = 'idx_user_status'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @s := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_travel_user_time ON travel_plan (user_id, create_time)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'travel_plan'
    AND index_name = 'idx_travel_user_time'
);
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =========================================================
-- 7-day demo data for ALL existing users
-- =========================================================

-- 如果你数据库里还没有用户，请先在前端注册一个账号再执行本脚本
SELECT COUNT(*) AS user_count FROM user;

-- 删除近7天数据（避免重复刷脚本导致看板翻倍）
DELETE FROM travel_plan
WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY);

DELETE FROM recognition
WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY);

-- 生成近7天日期表
INSERT INTO recognition (user_id, img_url, rec_result, create_time)
SELECT
  u.id AS user_id,
  CONCAT('/uploads/mock/u', u.id, '_', DATE_FORMAT(days.d, '%Y%m%d'), '_', seq.n, '.jpg') AS img_url,
  JSON_OBJECT(
    'food_name',
      (CASE FLOOR(RAND()*7)
        WHEN 0 THEN '狮子头'
        WHEN 1 THEN '麻婆豆腐'
        WHEN 2 THEN '北京烤鸭'
        WHEN 3 THEN '肠粉'
        WHEN 4 THEN '蛋挞'
        WHEN 5 THEN '豆浆'
        ELSE '绿豆糕'
      END),
    'confidence', ROUND(0.65 + RAND()*0.30, 2),
    'topk', JSON_ARRAY(
      JSON_OBJECT('name','狮子头','score', ROUND(3.5 + RAND()*2.8, 2)),
      JSON_OBJECT('name','麻婆豆腐','score', ROUND(3.0 + RAND()*2.6, 2)),
      JSON_OBJECT('name','北京烤鸭','score', ROUND(2.8 + RAND()*2.4, 2)),
      JSON_OBJECT('name','肠粉','score', ROUND(2.5 + RAND()*2.2, 2)),
      JSON_OBJECT('name','蛋挞','score', ROUND(2.2 + RAND()*2.0, 2))
    ),
    'nutrition', JSON_OBJECT(
      'calorie_kcal', FLOOR(120 + RAND()*520),
      'protein_g', ROUND(3 + RAND()*30, 1),
      'fat_g', ROUND(2 + RAND()*40, 1),
      'carb_g', ROUND(8 + RAND()*70, 1),
      'sodium_mg', FLOOR(80 + RAND()*1200)
    ),
    'allergens',
      (CASE FLOOR(RAND()*5)
        WHEN 0 THEN JSON_ARRAY('蛋')
        WHEN 1 THEN JSON_ARRAY('大豆')
        WHEN 2 THEN JSON_ARRAY('奶','小麦')
        WHEN 3 THEN JSON_ARRAY('小麦')
        ELSE JSON_ARRAY()
      END),
    'health_tips',
      JSON_ARRAY(
        '建议搭配蔬菜，均衡饮食',
        '注意控制油盐糖摄入',
        '适量运动有助于健康'
      )
  ) AS rec_result,
  TIMESTAMP(days.d, MAKETIME(9 + FLOOR(RAND()*12), FLOOR(RAND()*60), 0)) AS create_time
  FROM user u
  JOIN (
    SELECT DATE_SUB(CURDATE(), INTERVAL 6 DAY) AS d
    UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 5 DAY)
    UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 4 DAY)
    UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 3 DAY)
    UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 2 DAY)
    UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 1 DAY)
    UNION ALL SELECT CURDATE()
   ) days ON 1=1
  JOIN (
    SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3
  ) seq ON 1=1
WHERE seq.n <= (1 + FLOOR(RAND()*3));

-- 插入 7 天出行数据：每天每个用户 1 条
INSERT INTO travel_plan
(user_id, destination, plan_name, weather_info, route_info, status, route_type, create_time, update_time)
SELECT
  u.id AS user_id,
  (CASE FLOOR(RAND()*7)
    WHEN 0 THEN '湖南大学'
    WHEN 1 THEN '橘子洲'
    WHEN 2 THEN '岳麓山'
    WHEN 3 THEN 'IFS国金中心'
    WHEN 4 THEN '五一广场'
    WHEN 5 THEN '梅溪湖'
    ELSE '太平街'
  END) AS destination,
  CONCAT('近7天-出行-', DATE_FORMAT(days2.d, '%m%d')) AS plan_name,
  JSON_OBJECT(
    'temp', FLOOR(6 + RAND()*12),
    'desc', (CASE FLOOR(RAND()*4) WHEN 0 THEN '晴' WHEN 1 THEN '多云' WHEN 2 THEN '阴' ELSE '小雨' END)
  ) AS weather_info,
  JSON_OBJECT(
    'mode', (CASE FLOOR(RAND()*4) WHEN 0 THEN 'driving' WHEN 1 THEN 'transit' WHEN 2 THEN 'walking' ELSE 'bicycling' END),
    'distance_km', ROUND(1 + RAND()*15, 1),
    'duration_min', FLOOR(10 + RAND()*70)
  ) AS route_info,
  'completed' AS status,
  (CASE FLOOR(RAND()*4) WHEN 0 THEN 'driving' WHEN 1 THEN 'transit' WHEN 2 THEN 'walking' ELSE 'bicycling' END) AS route_type,
  TIMESTAMP(days2.d, MAKETIME(8 + FLOOR(RAND()*12), FLOOR(RAND()*60), 0)) AS create_time,
  TIMESTAMP(days2.d, MAKETIME(8 + FLOOR(RAND()*12), FLOOR(RAND()*60), 0)) AS update_time
  FROM user u
  JOIN (
    SELECT DATE_SUB(CURDATE(), INTERVAL 6 DAY) AS d
    UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 5 DAY)
    UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 4 DAY)
    UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 3 DAY)
    UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 2 DAY)
    UNION ALL SELECT DATE_SUB(CURDATE(), INTERVAL 1 DAY)
    UNION ALL SELECT CURDATE()
   ) days2 ON 1=1;

-- 验证：近7天各日数量
SELECT DATE(create_time) d, COUNT(*) c FROM recognition GROUP BY d ORDER BY d;
SELECT DATE(create_time) d, COUNT(*) c FROM travel_plan GROUP BY d ORDER BY d;

-- =========================
-- 新增：健康画像 / 饮食记录 / 知识库 / 聊天
-- =========================

DROP TABLE IF EXISTS user_profile;
CREATE TABLE user_profile (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  profile JSON NOT NULL,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_profile_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_profile_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS diet_log;
CREATE TABLE diet_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  log_date DATE NOT NULL,
  meal_type VARCHAR(16) NOT NULL,
  food_name VARCHAR(128) NOT NULL,
  calories INT DEFAULT 0,
  nutrition JSON NULL,
  allergens JSON NULL,
  portion_num DECIMAL(5,2) DEFAULT 1,
  portion_unit VARCHAR(16) DEFAULT '份',
  note VARCHAR(255) NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_diet_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  INDEX idx_diet_user_date (user_id, log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS food_knowledge;
CREATE TABLE food_knowledge (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  category VARCHAR(64) NULL,
  calories INT DEFAULT 0,
  nutrition JSON NULL,
  allergens JSON NULL,
  tags JSON NULL,
  description TEXT NULL,
  image_url VARCHAR(255) NULL,
  serving_size_g INT DEFAULT 100,
  serving_unit VARCHAR(16) DEFAULT '克',
  cook_method VARCHAR(32) NULL,
  ingredients JSON NULL,
  risk_flags JSON NULL,
  source VARCHAR(64) NULL,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_food_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS chat_message;
DROP TABLE IF EXISTS chat_session;
CREATE TABLE chat_session (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(64) NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_s_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS chat_message;
CREATE TABLE chat_message (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  role VARCHAR(16) NOT NULL,
  content TEXT NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_m_session FOREIGN KEY (session_id) REFERENCES chat_session(id) ON DELETE CASCADE,
  INDEX idx_chat_session_time (session_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================

-- 演示数据（7 天随机识别/出行/饮食/知识库）
-- 说明：为了让你一启动就能看到看板趋势，提供一份“对所有用户都生效”的演示数据。
-- 你可以：
-- 1) 直接用演示账号登录（13800000000 / 123456）；
-- 2) 或者你自己注册新账号后，再执行一次本脚本的“演示数据”部分，会自动给你账号也插入数据。
-- =========================

-- 用户画像（若已有则覆盖）
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
ON DUPLICATE KEY UPDATE profile=VALUES(profile);

-- 知识库（可自行扩充）

-- 7天识别数据（rec_result 包含 food_name/nutrition/allergens），为所有用户写入
DELETE r FROM recognition r
JOIN user u ON u.id = r.user_id
WHERE r.create_time >= DATE_SUB(NOW(), INTERVAL 10 DAY);

INSERT INTO recognition (user_id, img_url, rec_result, create_time)
SELECT u.id,
       CONCAT('/uploads/demo/', u.id, '_', DATE_FORMAT(DATE_SUB(NOW(), INTERVAL d.n DAY), '%Y%m%d'), '_', s.n, '.jpg') AS img_url,
       JSON_OBJECT(
          'food_name', s.food,
          'confidence', s.conf,
          'allergens', s.allergens,
          'nutrition', s.nutrition
       ) AS rec_result,
       DATE_SUB(NOW(), INTERVAL d.n DAY) AS create_time
FROM user u
CROSS JOIN (
  SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
) d
CROSS JOIN (
  SELECT 1 AS n, '狮子头' AS food, 0.92 AS conf, JSON_ARRAY('小麦') AS allergens, JSON_OBJECT('calorie_kcal',520,'protein_g',22,'fat_g',38,'carb_g',18,'sodium_mg',780) AS nutrition
  UNION ALL SELECT 2, '北京烤鸭',0.88, JSON_ARRAY('小麦'), JSON_OBJECT('calorie_kcal',460,'protein_g',28,'fat_g',30,'carb_g',22,'sodium_mg',690)
  UNION ALL SELECT 3, '清蒸鱼',0.90, JSON_ARRAY('海鲜'), JSON_OBJECT('calorie_kcal',240,'protein_g',32,'fat_g',10,'carb_g',2,'sodium_mg',420)
) s;

-- 7天出行数据：每个用户每天一条（travel_plan 结构较复杂，这里填充 route_info/plan_summary 便于展示）
DELETE t FROM travel_plan t
JOIN user u ON u.id = t.user_id
WHERE t.create_time >= DATE_SUB(NOW(), INTERVAL 10 DAY);

INSERT INTO travel_plan (
  user_id, destination, destination_location, origin_location, plan_name,
  weather_info, route_info, recommended_restaurants, daily_budget, total_calories,
  plan_days, attractions, plan_summary, status, start_time, end_time, create_time
)
SELECT u.id,
       CASE d.n WHEN 0 THEN '食堂' WHEN 1 THEN '图书馆' WHEN 2 THEN '超市' WHEN 3 THEN '教学楼' WHEN 4 THEN '健身房' WHEN 5 THEN '操场' ELSE '宿舍' END AS destination,
       JSON_OBJECT('lng', 116.397 + d.n*0.001, 'lat', 39.908 + d.n*0.001) AS destination_location,
       JSON_OBJECT('lng', 116.394, 'lat', 39.907) AS origin_location,
       CONCAT('日常出行 - 第', d.n+1, '天') AS plan_name,
       JSON_OBJECT('temperature','26℃','weather','多云','tip','记得补水') AS weather_info,
       JSON_OBJECT('distance_km', ROUND(0.8 + d.n*0.25, 2), 'duration_min', 12 + d.n*2, 'mode', CASE WHEN d.n%2=0 THEN 'walk' ELSE 'bike' END) AS route_info,
       JSON_ARRAY(JSON_OBJECT('name','清淡食堂窗口','reason','低油少盐'), JSON_OBJECT('name','水果酸奶','reason','补充蛋白质')) AS recommended_restaurants,
       35 + d.n*3 AS daily_budget,
       1800 + d.n*30 AS total_calories,
       1 AS plan_days,
       JSON_ARRAY('校内步行街','运动角') AS attractions,
       CONCAT('路线：出发点→', CASE d.n WHEN 0 THEN '食堂' WHEN 1 THEN '图书馆' WHEN 2 THEN '超市' WHEN 3 THEN '教学楼' WHEN 4 THEN '健身房' WHEN 5 THEN '操场' ELSE '宿舍' END,
              '。建议：', CASE WHEN d.n%2=0 THEN '步行热身，强度适中。' ELSE '骑行注意安全，戴头盔。' END) AS plan_summary,
       'completed' AS status,
       DATE_SUB(NOW(), INTERVAL d.n DAY) AS start_time,
       DATE_SUB(NOW(), INTERVAL d.n DAY) AS end_time,
       DATE_SUB(NOW(), INTERVAL d.n DAY) AS create_time
FROM user u
CROSS JOIN (
  SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
) d;

-- 7天饮食记录：每个用户每天两餐
DELETE dl FROM diet_log dl
JOIN user u ON u.id = dl.user_id
WHERE dl.log_date >= DATE_SUB(CURDATE(), INTERVAL 10 DAY);

INSERT INTO diet_log (user_id, log_date, meal_type, food_name, calories, nutrition, allergens, note)
SELECT u.id,
       DATE_SUB(CURDATE(), INTERVAL d.n DAY) AS log_date,
       'lunch' AS meal_type,
       '清蒸鱼' AS food_name,
       240,
       JSON_OBJECT('protein_g',32,'fat_g',10,'carb_g',2,'sodium_mg',420),
       JSON_ARRAY('海鲜'),
       '高蛋白低脂'
FROM user u
CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) d;

INSERT INTO diet_log (user_id, log_date, meal_type, food_name, calories, nutrition, allergens, note)
SELECT u.id,
       DATE_SUB(CURDATE(), INTERVAL d.n DAY) AS log_date,
       'dinner' AS meal_type,
       CASE WHEN d.n%3=0 THEN '北京烤鸭' WHEN d.n%3=1 THEN '麻婆豆腐' ELSE '狮子头' END AS food_name,
       CASE WHEN d.n%3=0 THEN 460 WHEN d.n%3=1 THEN 380 ELSE 520 END AS calories,
       CASE WHEN d.n%3=0 THEN JSON_OBJECT('protein_g',28,'fat_g',30,'carb_g',22,'sodium_mg',690)
            WHEN d.n%3=1 THEN JSON_OBJECT('protein_g',18,'fat_g',26,'carb_g',14,'sodium_mg',960)
            ELSE JSON_OBJECT('protein_g',22,'fat_g',38,'carb_g',18,'sodium_mg',780) END AS nutrition,
       CASE WHEN d.n%3=1 THEN JSON_ARRAY('大豆') ELSE JSON_ARRAY('小麦') END AS allergens,
       NULL AS note
FROM user u
CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) d;


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

