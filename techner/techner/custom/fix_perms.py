import frappe

def add_permissions():
    doctypes = [
        "Child Table Notification Rule",
        "Child Notification Queue",
        "Child Notification Log"
    ]

    for dt_name in doctypes:
        doc = frappe.get_doc("DocType", dt_name)
        has_perm = any(p.role == "System Manager" for p in doc.permissions)
        if not has_perm:
            doc.append("permissions", {
                "role": "System Manager",
                "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1,
                "share": 1, "print": 1, "email": 1
            })
            doc.save(ignore_permissions=True)
            print(f"Added System Manager permission to {dt_name}")
        else:
            print(f"Permission already exists for {dt_name}")

if __name__ == "__main__":
    add_permissions()
