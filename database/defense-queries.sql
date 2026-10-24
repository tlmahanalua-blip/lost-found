-- Read-only queries suitable for demonstrating the database in DB Browser.
SELECT COUNT(*) AS users_count FROM users;
SELECT COUNT(*) AS categories_count FROM categories;
SELECT COUNT(*) AS reports_count FROM items;
SELECT items.item_id, users.display_name, categories.category_name,
       items.title, items.report_type, items.status, items.event_date
FROM items
JOIN users ON users.user_id = items.user_id
JOIN categories ON categories.category_id = items.category_id;
SELECT categories.category_name, COUNT(items.item_id) AS report_count
FROM categories LEFT JOIN items ON items.category_id = categories.category_id
GROUP BY categories.category_id, categories.category_name;
SELECT report_type, COUNT(*) AS report_count FROM items GROUP BY report_type;
PRAGMA foreign_key_list(items);
PRAGMA foreign_key_check;
