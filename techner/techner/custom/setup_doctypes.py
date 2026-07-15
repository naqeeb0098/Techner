import frappe

def create_doctypes():
    frappe.flags.in_import = True # Suppress unnecessary validations

    # 1. Create 'Notification Rule User' Child Table
    if not frappe.db.exists("DocType", "Notification Rule User"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Notification Rule User",
            "module": "Techner",
            "custom": 1,
            "istable": 1,
            "is_virtual": 0,
            "fields": [
                {
                    "fieldname": "user",
                    "label": "User",
                    "fieldtype": "Link",
                    "options": "User",
                    "reqd": 1,
                    "in_list_view": 1
                }
            ]
        })
        doc.insert(ignore_permissions=True)
        print("Created Notification Rule User")
    else:
        doc = frappe.get_doc("DocType", "Notification Rule User")
        doc.is_virtual = 0
        doc.save(ignore_permissions=True)

    # 2. Create 'Child Table Notification Rule'
    if not frappe.db.exists("DocType", "Child Table Notification Rule"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Child Table Notification Rule",
            "module": "Techner",
            "custom": 1,
            "is_virtual": 0,
            "autoname": "field:rule_name",
            "fields": [
                {"fieldname": "basic_config_tab", "label": "Basic Configuration", "fieldtype": "Tab Break"},
                {"fieldname": "rule_name", "label": "Rule Name", "fieldtype": "Data", "reqd": 1, "unique": 1},
                {"fieldname": "enabled", "label": "Enabled", "fieldtype": "Check", "default": "0"},
                {"fieldname": "column_break_basic", "fieldtype": "Column Break"},
                {"fieldname": "parent_doctype", "label": "Parent DocType", "fieldtype": "Link", "options": "DocType", "reqd": 1},
                {"fieldname": "child_table_field", "label": "Child Table Field", "fieldtype": "Select", "reqd": 1},
                {"fieldname": "child_doctype", "label": "Child DocType", "fieldtype": "Data", "read_only": 1, "reqd": 1},
                
                {"fieldname": "event_config_section", "label": "Event Configuration", "fieldtype": "Section Break"},
                {"fieldname": "event_type", "label": "Event Type", "fieldtype": "Select", "options": "\nBefore Save\nAfter Save\nSubmit\nCancel\nDaily Scheduler\nHourly Scheduler\nDate Based Reminder", "reqd": 1},
                
                {"fieldname": "date_config_section", "label": "Date Configuration", "fieldtype": "Section Break", "depends_on": "eval:doc.event_type == 'Date Based Reminder'"},
                {"fieldname": "date_field", "label": "Date Field", "fieldtype": "Select"},
                {"fieldname": "date_condition", "label": "Date Condition", "fieldtype": "Select", "options": "\nOn Exact Date\nBefore Date\nAfter Date\nDays Before\nDays After"},
                {"fieldname": "column_break_date", "fieldtype": "Column Break"},
                {"fieldname": "days", "label": "Days", "fieldtype": "Int", "depends_on": "eval:in_list(['Days Before', 'Days After'], doc.date_condition)"},
                
                {"fieldname": "conditions_section", "label": "Conditions", "fieldtype": "Section Break"},
                {"fieldname": "condition", "label": "Condition", "fieldtype": "Code", "description": "Example: <code>doc.status == 'Open'</code>. Context includes <code>doc</code> (parent) and <code>row</code> (child row)."},
                
                {"fieldname": "recipient_tab", "label": "Recipients", "fieldtype": "Tab Break"},
                {"fieldname": "document_owner", "label": "Document Owner", "fieldtype": "Check", "default": "0"},
                {"fieldname": "user_field", "label": "User Field", "fieldtype": "Data", "description": "Fieldname of user in child or parent doctype"},
                {"fieldname": "email_field", "label": "Email Field", "fieldtype": "Data", "description": "Fieldname of email in child or parent doctype"},
                {"fieldname": "column_break_recip", "fieldtype": "Column Break"},
                {"fieldname": "role_based", "label": "Role Based", "fieldtype": "Link", "options": "Role"},
                {"fieldname": "specific_users", "label": "Specific Users", "fieldtype": "Table", "options": "Notification Rule User"},
                
                {"fieldname": "template_tab", "label": "Message Template", "fieldtype": "Tab Break"},
                {"fieldname": "subject", "label": "Subject", "fieldtype": "Data", "reqd": 1},
                {"fieldname": "message", "label": "Message", "fieldtype": "Text Editor", "reqd": 1, "description": "Use Jinja. E.g. <code>{{ doc.name }} - {{ row.item_code }}</code>"}
            ]
        })
        doc.insert(ignore_permissions=True)
        print("Created Child Table Notification Rule")
    else:
        doc = frappe.get_doc("DocType", "Child Table Notification Rule")
        doc.is_virtual = 0
        doc.save(ignore_permissions=True)

    # 3. Create 'Child Notification Queue'
    if not frappe.db.exists("DocType", "Child Notification Queue"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Child Notification Queue",
            "module": "Techner",
            "custom": 1,
            "is_virtual": 0,
            "autoname": "hash",
            "fields": [
                {"fieldname": "rule", "label": "Rule", "fieldtype": "Link", "options": "Child Table Notification Rule", "in_list_view": 1},
                {"fieldname": "parent_doctype", "label": "Parent DocType", "fieldtype": "Link", "options": "DocType", "in_list_view": 1},
                {"fieldname": "parent_document", "label": "Parent Document", "fieldtype": "Dynamic Link", "options": "parent_doctype", "in_list_view": 1},
                {"fieldname": "child_row_id", "label": "Child Row ID", "fieldtype": "Data", "in_list_view": 1},
                {"fieldname": "column_break_1", "fieldtype": "Column Break"},
                {"fieldname": "status", "label": "Status", "fieldtype": "Select", "options": "Pending\nProcessing\nSent\nFailed", "default": "Pending", "in_list_view": 1},
                {"fieldname": "recipient", "label": "Recipient", "fieldtype": "Data", "in_list_view": 1},
                {"fieldname": "subject", "label": "Subject", "fieldtype": "Data"},
                {"fieldname": "section_break_msg", "fieldtype": "Section Break"},
                {"fieldname": "message", "label": "Message", "fieldtype": "Text Editor"},
                {"fieldname": "section_break_meta", "fieldtype": "Section Break", "label": "Metadata"},
                {"fieldname": "retry_count", "label": "Retry Count", "fieldtype": "Int", "default": "0"},
                {"fieldname": "error_message", "label": "Error Message", "fieldtype": "Small Text"},
                {"fieldname": "sent_time", "label": "Sent Time", "fieldtype": "Datetime"},
            ]
        })
        doc.insert(ignore_permissions=True)
        print("Created Child Notification Queue")
    else:
        doc = frappe.get_doc("DocType", "Child Notification Queue")
        doc.is_virtual = 0
        doc.save(ignore_permissions=True)

    # 4. Create 'Child Notification Log'
    if not frappe.db.exists("DocType", "Child Notification Log"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Child Notification Log",
            "module": "Techner",
            "custom": 1,
            "is_virtual": 0,
            "autoname": "hash",
            "fields": [
                {"fieldname": "notification_rule", "label": "Notification Rule", "fieldtype": "Link", "options": "Child Table Notification Rule", "in_list_view": 1},
                {"fieldname": "parent_document_type", "label": "Parent Document Type", "fieldtype": "Link", "options": "DocType", "in_list_view": 1},
                {"fieldname": "parent_document", "label": "Parent Document", "fieldtype": "Dynamic Link", "options": "parent_document_type", "in_list_view": 1},
                {"fieldname": "child_row_name", "label": "Child Row Name", "fieldtype": "Data", "in_list_view": 1},
                {"fieldname": "column_break_1", "fieldtype": "Column Break"},
                {"fieldname": "notification_date", "label": "Notification Date", "fieldtype": "Datetime", "in_list_view": 1},
                {"fieldname": "notification_status", "label": "Notification Status", "fieldtype": "Select", "options": "Sent\nSkipped\nFailed", "in_list_view": 1}
            ]
        })
        doc.insert(ignore_permissions=True)
        print("Created Child Notification Log")
    else:
        doc = frappe.get_doc("DocType", "Child Notification Log")
        doc.is_virtual = 0
        doc.save(ignore_permissions=True)

    frappe.flags.in_import = False


if __name__ == "__main__":
    create_doctypes()
