import frappe

def check_doctypes():
    names = [
        "Child Table Notification Rule",
        "Child Notification Queue",
        "Child Notification Log",
        "Notification Rule User"
    ]
    for name in names:
        exists = frappe.db.exists("DocType", name)
        print(f"{name}: {'EXISTS' if exists else 'NOT FOUND'}")

    # Also check if the DB tables exist
    tables = frappe.db.sql("SHOW TABLES LIKE '%Notification%'", as_list=True)
    print("\nMatching DB tables:")
    for t in tables:
        print(f"  {t[0]}")
