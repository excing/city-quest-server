-- Callers: manual Neon/psql after migrate. Synthetic Dali POIs (GCJ-02).
-- Schema: encyclopedias fixed UUIDs, status published, empty images.
-- User: 阅读 @docs , 然后选择合适的agents或skills, 开始进行开发.

INSERT INTO encyclopedias (
  id, name, type_key, lng, lat, intro, address, business_hours, avg_price, phone, status, images, tags
) VALUES
(
  '11111111-1111-1111-1111-111111111101',
  '喜洲粑粑',
  'food',
  100.1308,
  25.8521,
  '喜洲古镇招牌小吃，外酥里糯，可配玫瑰糖或火腿。',
  '大理市喜洲镇',
  '08:00-20:00',
  '¥15',
  NULL,
  'published',
  '[]'::jsonb,
  '["小吃","喜洲"]'::jsonb
),
(
  '11111111-1111-1111-1111-111111111102',
  '洱海公园',
  'scenic',
  100.2345,
  25.6789,
  '临近洱海南岸的城市公园，适合傍晚散步看湖光山色。',
  '大理市下关镇',
  NULL,
  NULL,
  NULL,
  'published',
  '[]'::jsonb,
  '["洱海","散步"]'::jsonb
),
(
  '11111111-1111-1111-1111-111111111103',
  '大理扎染工坊',
  'goods',
  100.1987,
  25.7012,
  '体验白族扎染工艺，可带走一块自己染的手帕或围巾。',
  '大理古城附近',
  '09:30-18:00',
  '¥80',
  NULL,
  'published',
  '[]'::jsonb,
  '["手作","白族"]'::jsonb
),
(
  '11111111-1111-1111-1111-111111111104',
  '洋人街咖啡',
  'food',
  100.1612,
  25.6934,
  '古城洋人街上一间安静小店，适合歇脚看人。',
  '大理古城人民路',
  '10:00-22:00',
  '¥40',
  NULL,
  'published',
  '[]'::jsonb,
  '["咖啡","古城"]'::jsonb
),
(
  '11111111-1111-1111-1111-111111111105',
  '崇圣寺三塔',
  'scenic',
  100.1456,
  25.7089,
  '大理标志性景观，三塔倒影与苍山背景值得一看。',
  '大理市大理镇',
  '08:00-18:00',
  '¥75',
  NULL,
  'published',
  '[]'::jsonb,
  '["地标","古迹"]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
