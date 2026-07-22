import frappe
from frappe.utils import nowdate, get_datetime, add_days, now_datetime

def get_recipients(rule, parent_doc, child_row):
    recipients = []
    
    # 1. User Field / Email Field
    if rule.user_field:
        user_email = parent_doc.get(rule.user_field) or child_row.get(rule.user_field)
        if user_email:
            recipients.append(user_email)
            
    if rule.email_field:
        email = parent_doc.get(rule.email_field) or child_row.get(rule.email_field)
        if email:
            recipients.append(email)
            
    # 2. Document Owner
    if rule.document_owner:
        recipients.append(parent_doc.owner)

    # 3. Role Based
    if rule.role_based:
        role_users = frappe.db.sql("""
            SELECT u.email FROM `tabUser` u
            INNER JOIN `tabHas Role` hr ON hr.parent = u.name
            WHERE hr.role = %s AND u.enabled = 1 AND u.email != ''
        """, rule.role_based, as_dict=1)
        recipients.extend([u.email for u in role_users if u.email])

    # 4. Specific Users
    for user_row in rule.specific_users:
        user = frappe.db.get_value("User", user_row.user, ["email", "enabled"], as_dict=True)
        if user and user.enabled and user.email:
            recipients.append(user.email)

    # Filter out empty or duplicate emails
    return list(set(r for r in recipients if r))

def log_already_sent(rule_name, parent_doctype, parent_name, row_name):
    return frappe.db.exists("Child Notification Log", {
        "notification_rule": rule_name,
        "parent_document_type": parent_doctype,
        "parent_document": parent_name,
        "child_row_name": row_name,
        "notification_status": ("in", ["Sent", "Pending"])
    })

def create_log(rule_name, parent_doctype, parent_name, row_name, status="Sent"):
    frappe.get_doc({
        "doctype": "Child Notification Log",
        "notification_rule": rule_name,
        "parent_document_type": parent_doctype,
        "parent_document": parent_name,
        "child_row_name": row_name,
        "notification_date": now_datetime(),
        "notification_status": status
    }).insert(ignore_permissions=True)


def send_notification(rule, parent_doc, child_row):
    recipients = get_recipients(rule, parent_doc, child_row)
    if not recipients:
        return False

    context = {"doc": parent_doc, "row": child_row, "frappe": frappe}
    subject = frappe.render_template(rule.subject or "", context)
    message = frappe.render_template(rule.message or "", context)

    # Use selected Email Account's address as sender, else fall back to default
    sender = rule.sender_email or None

    try:
        frappe.sendmail(
            recipients=recipients,
            subject=subject,
            message=message,
            sender=sender,
            reference_doctype=parent_doc.doctype,
            reference_name=parent_doc.name
        )
        return True
    except Exception as e:
        frappe.log_error(str(e), f"Child Notification Rule Send Error [{rule.name}]")
        return False
# def send_notification(rule, parent_doc, child_row):
#     recipients = get_recipients(rule, parent_doc, child_row)
#     if not recipients:
#         return False

#     context = {"doc": parent_doc, "row": child_row, "frappe": frappe}
#     subject = frappe.render_template(rule.subject or "", context)
#     message = frappe.render_template(rule.message or "", context)

#     try:
#         frappe.sendmail(
#             recipients=recipients,
#             subject=subject,
#             message=message,
#             reference_doctype=parent_doc.doctype,
#             reference_name=parent_doc.name
#         )
#         return True
#     except Exception as e:
#         frappe.log_error(str(e), f"Child Notification Rule Send Error [{rule.name}]")
#         return False

def process_rules_for_events(event_types):
    rules = frappe.get_all(
        "Child Table Notification Rule",
        filters={"enabled": 1, "event_type": ("in", event_types)},
    )

    today = get_datetime(nowdate()).date()

    for rule_row in rules:
        try:
            rule = frappe.get_doc("Child Table Notification Rule", rule_row.name)
            
            # Fetch table fieldname in the parent doc that corresponds to rule.child_doctype
            if not rule.parent_doctype or not rule.child_doctype:
                continue
            
            parent_meta = frappe.get_meta(rule.parent_doctype)
            table_fieldname = next(
                (f.fieldname for f in parent_meta.fields 
                 if f.fieldtype in ("Table", "Table MultiSelect") and f.options == rule.child_doctype),
                None
            )
            
            if not table_fieldname:
                frappe.log_error(
                    f"Could not find a table field on {rule.parent_doctype} pointing to {rule.child_doctype}",
                    "Child Table Notification Rule Setup Error"
                )
                continue

            # Fetch all parent documents
            parent_docs = frappe.get_all(rule.parent_doctype)
            
            for pd in parent_docs:
                try:
                    parent_doc = frappe.get_doc(rule.parent_doctype, pd.name)
                    child_rows = parent_doc.get(table_fieldname) or []
                    
                    for row in child_rows:
                        # Duplicate check
                        if log_already_sent(rule.name, parent_doc.doctype, parent_doc.name, row.name):
                            continue
                            
                        # Condition Eval
                        if rule.condition:
                            if not frappe.safe_eval(rule.condition, None, {"doc": parent_doc, "row": row, "frappe": frappe}):
                                continue

                        # Date Eval
                        if rule.child_table_field and rule.event_type in ["Days Before", "Days After", "On Same Date", "Daily", "Hourly"]:
                            date_val = row.get(rule.child_table_field)
                            if not date_val:
                                continue
                                
                            try:
                                row_date = get_datetime(date_val).date()
                            except Exception:
                                continue

                            match = False
                            if rule.event_type in ["On Same Date", "Daily", "Hourly"] and row_date == today:
                                match = True
                            elif rule.event_type == "Days Before":
                                target_date = get_datetime(add_days(row_date, -rule.days)).date()
                                if target_date == today:
                                    match = True
                            elif rule.event_type == "Days After":
                                target_date = get_datetime(add_days(row_date, rule.days)).date()
                                if target_date == today:
                                    match = True

                            if not match:
                                continue

                        # Send and Log
                        if send_notification(rule, parent_doc, row):
                            create_log(rule.name, parent_doc.doctype, parent_doc.name, row.name)

                except Exception as e:
                    frappe.log_error(str(e), f"Child Notification Rule Parent Error [{rule.name} | {pd.name}]")

        except Exception as e:
            frappe.log_error(str(e), f"Child Notification Rule Outer Error [{rule_row.name}]")
@frappe.whitelist(allow_guest=True)
def run_hourly():
    process_rules_for_events(["Hourly"])
@frappe.whitelist(allow_guest=True)
def run_daily():
    process_rules_for_events(["Daily","Hourly", "Days Before", "Days After", "On Same Date"])
